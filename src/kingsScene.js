// The two kings on the battlefield (Phase 10): their skills, Singularity's charge-up, Unmoved, and how the AI
// plays them. These are methods of the battle scene (BattleScene.js adds them with Object.assign), so "this" is
// the battle. The rules themselves (Fork and Blade, the Mask Gauge, Dominion, Attunement) are in src/kings.js;
// the numbers in src/data/kings.json and spells.json.
//
// Gadara the Greater: Reverse Grip, Fork Strike or Blade Strike, Snare Hook, Sunder Boon, Heavy Cleave, Singularity.
// King Alagara: Swap Verse, Drawn Blade, Claim, Mantle, Gale Cut (Swiftness), Rending Draw (Fury), Unmoved (Stone).
import Phaser from 'phaser';
import spells from './data/spells.json';
import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from './config.js';
import { tileToScreen, isInsideGrid, getHeight, depthFor } from './grid.js';
import { getHitChance, getDamage, distance } from './combat.js';
import { canBeCaught, startEngagement, startDuel, endDuel, isStanceDuel, shiftMomentum } from './engagement.js';
import { applyOffBalance, clearOffBalance, isOffBalance, applyBuff, buffOf, applyExposed, applyDisoriented, startCooldown, cooldownOf, canAfford, moveRules, moveOf } from './status.js';
import { TURN_COST } from './turnOrder.js';
import { KING_RULES, otherGrip, gripAttackName, maskFull, feedMask, singularityTiles, singularityCatch, canSwap, swapVerses, verseSkillsNow, fromEcho, verseSkillPower, isAttuned, echoOf } from './kings.js';
import { sfxHas, sfxAt, sfxLoop } from './spellArt.js';
import { play } from './audio.js';
import { floorLight, lightNearby } from './fxLayers.js';
import { screenShake } from './effects.js';
import terrain from './data/terrain.json';
import conditions from './data/conditions.json';

const G = KING_RULES.gadara;
const A = KING_RULES.alagara;
// the skill kinds this file plays (castSpell hands them here)
export const KING_KINDS = ['grip', 'swap', 'hook', 'sunder', 'cleave', 'singularity', 'drawn', 'claim', 'mantle', 'gale', 'rending'];
// skills cast on himself: tap the skill again (or his own tile) to use it
export const KING_SELF_KINDS = ['singularity', 'mantle'];
const isKingSkill = (id) => !!spells[id] && KING_KINDS.includes(spells[id].kind);
const foeOf = (a, b) => b && a && b.alive && !b.isDecoy && b.side !== a.side;
const hasBlessing = (u) => !!(u && u.status && ((u.status.buff && spells[u.status.buff.id] && spells[u.status.buff.id].kind === 'buff') || u.status.enchant));
const straight = (a, b) => a.col === b.col || a.row === b.row;

export const kingMethods = {
  // ---------- Can this skill be used now? ----------
  // Returns null when it can, or a short reason (shown on the button and when tapped).
  kingBlock(unit, id) {
    const spell = spells[id];
    if (!spell || !isKingSkill(id)) return null;
    if (spell.kind === 'grip') return unit.gripSwitched ? 'once a turn' : null;
    if (spell.kind === 'swap') return canSwap(unit) ? null : unit.attune && unit.attune.swapped ? 'once a turn' : 'needs two Verses';
    if (spell.grip && unit.grip !== spell.grip) return spell.grip === 'fork' ? 'Fork end' : 'Blade end';
    if (spell.kind === 'singularity') {
      if (unit.singularityUsed) return 'used';
      if (!maskFull(unit)) return 'Mask ' + (unit.mask || 0) + '/6';
      if (unit.engagedWith) return 'in a clash';
    }
    if (spell.verseSkill && !verseSkillsNow(unit).some((s) => s.id === id)) return 'needs ' + spells[spell.verseSkill].button;
    if (spell.kind === 'mantle' && !(unit.status && unit.status.buff)) return 'needs a Verse';
    if (spell.kind === 'gale' && this.stepsLeft(unit) < 1) return 'no steps left';
    return null;
  },

  // The units this skill can be aimed at now (for the lit tiles and the AI).
  kingTargets(unit, id) {
    const spell = spells[id];
    const seen = this.units.filter((u) => u.alive && this.canSee(unit, u));
    switch (spell.kind) {
      case 'singularity':
      case 'mantle':
        return [unit];
      case 'hook':
        return seen.filter((t) => foeOf(unit, t) && straight(unit, t) && distance(unit, t) >= 1 && distance(unit, t) <= spell.range && this.hookLineClear(unit, t));
      case 'sunder':
        return seen.filter((t) => foeOf(unit, t) && distance(unit, t) === 1 && hasBlessing(t));
      case 'claim':
        return seen.filter((t) => t !== unit && !t.isDecoy && distance(unit, t) === 1 && hasBlessing(t));
      case 'gale':
        return seen.filter((t) => foeOf(unit, t) && straight(unit, t) && this.galePlan(unit, t).hits.includes(t));
      default: // cleave, drawn, rending: the foe next to him
        return seen.filter((t) => foeOf(unit, t) && distance(unit, t) <= (spell.range || 1));
    }
  },

  // The tiles Singularity would pull from (for the lit area when he picks it).
  kingAreaTiles(unit) {
    return singularityTiles(unit, GRID_SIZE);
  },

  // Snare Hook reaches over an empty tile only (nobody standing between him and the target).
  hookLineClear(unit, t) {
    if (distance(unit, t) <= 1) return true;
    const mid = { col: unit.col + Math.sign(t.col - unit.col), row: unit.row + Math.sign(t.row - unit.row) };
    return !this.getUnitAt(mid.col, mid.row) && !this.spikeAt(mid.col, mid.row) && !this.potAt(mid.col, mid.row);
  },

  // ---------- Free actions: Reverse Grip and Swap Verse ----------
  useFreeKingAction(unit, id) {
    const spell = spells[id];
    if (this.kingBlock(unit, id)) return false;
    if (spell.kind === 'grip') {
      unit.grip = otherGrip(unit);
      unit.gripSwitched = true;
      unit.attackName = gripAttackName(unit);
      play('whoosh');
      this.floatText(unit, unit.grip === 'blade' ? 'Blade end' : 'Fork end', spell.color);
      if (sfxHas(this, 'buff_blade_loop_0')) { /* the aura is kept by refreshStatusTags */ }
    } else if (spell.kind === 'swap') {
      const now = swapVerses(unit);
      if (!now) return false;
      play('spell');
      this.kingSurge(unit, now);
    }
    this.showStanding(unit);
    this.refreshStatusTags();
    this.refreshButtons();
    this.refreshStatus();
    return true;
  },

  // The Surge of the Verse that came in on a swap (10.18).
  kingSurge(unit, verseId) {
    const s = A.surge[verseId];
    const color = spells[verseId] ? spells[verseId].color : '#ffd27a';
    if (verseId === 'swiftness') unit.stepsUsed = Math.max(0, (Number.isFinite(unit.stepsUsed) ? unit.stepsUsed || 0 : moveOf(unit)) - s.steps); // one step back
    if (verseId === 'fury') unit.surgePress = (unit.surgePress || 0) + s.pressSteps;
    if (verseId === 'stone') {
      if (isOffBalance(unit)) clearOffBalance(unit);
      unit.surgeStone = true;
    }
    this.floatText(unit, 'Surge: ' + (spells[verseId] ? spells[verseId].effect || spells[verseId].button : verseId), color, { pop: true });
    floorLight(this, unit.view.x, unit.view.y, Phaser.Display.Color.HexStringToColor(color).color, { size: 1.2, peak: 0.6, ms: 600 });
  },

  // ---------- One blow (shared by the skills) ----------
  // Rolls one strike and takes the health off. share: part of a normal blow; ignoreDefense: defense it goes past.
  kingStrike(attacker, target, { share = 1, ignoreDefense = 0, bonus = 0, sure = false } = {}) {
    const foe = ignoreDefense ? { ...target, defense: target.defense - ignoreDefense } : target;
    const hit = sure || Math.random() * 100 < getHitChance(attacker, target);
    let damage = hit ? Math.max(1, Math.round(getDamage(attacker, foe) * share) + bonus) : 0;
    let note = null;
    if (hit) {
      const landed = this.landHit(target, damage);
      damage = landed.damage;
      note = landed.note;
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) this.defeat(target);
    }
    return { hit, damage, note };
  },

  // Ends a skill: checks the battle, waits, then carries on (or shows the result).
  kingFinish(onDone, wait = 900) {
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();
    this.refreshStatusTags();
    this.time.delayedCall(wait, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  },

  // ---------- castSpell hands the kings' skills here ----------
  castKingSkill(caster, target, id, onDone) {
    const spell = spells[id];
    // from Alagara's Echo: one more turn before it is ready again (10.18)
    if (spell.verseSkill && fromEcho(caster, id)) caster.status.cooldowns[id] = (caster.status.cooldowns[id] || 0) + A.echoCooldownExtra;
    switch (spell.kind) {
      case 'hook': return this.castSnareHook(caster, target, spell, onDone);
      case 'sunder': return this.castSunderBoon(caster, target, spell, onDone);
      case 'cleave': return this.castHeavyCleave(caster, target, spell, onDone);
      case 'singularity': return this.castSingularity(caster, spell, onDone);
      case 'drawn': return this.castDrawnBlade(caster, target, spell, onDone, 1, false);
      case 'rending': return this.castDrawnBlade(caster, target, spell, onDone, verseSkillPower(caster, id), true);
      case 'claim': return this.castClaim(caster, target, spell, onDone);
      case 'mantle': return this.castMantle(caster, spell, onDone);
      case 'gale': return this.castGaleCut(caster, target, spell, onDone, verseSkillPower(caster, id));
      default: return onDone();
    }
  },

  // A two-step move: the wind-up picture, then the strike picture, then fn() at the moment it lands.
  kingSwing(unit, target, windup, strike, fn, { lead = 260 } = {}) {
    const dx = target.view.x - unit.view.x;
    this.faceToward(unit, dx, target.view.y - unit.view.y);
    if (windup && this.hasPose(unit, windup)) this.showPose(unit, windup, dx);
    play('whoosh');
    this.time.delayedCall(lead, () => {
      if (strike && this.hasPose(unit, strike)) this.showPose(unit, strike, dx);
      else this.showPose(unit, 'attack', dx);
      fn(dx);
    });
    this.time.delayedCall(lead + 700, () => unit.alive && !unit.engagedWith && this.showStanding(unit));
  },

  // ---------- Gadara: Snare Hook ----------
  // Fork end, a foe up to 2 tiles away in a straight line: half damage, pulled 1 tile toward him.
  castSnareHook(caster, target, spell, onDone) {
    const done = this.collectRelays(onDone); // a pulled foe next to his allies: Relay Strikes
    const result = this.kingStrike(caster, target, { share: spell.damageShare });
    const pulled = result.hit && target.alive ? this.pullLoser(target, caster, spell.pull) : null;
    if (target.engagedWith && distance(target, target.engagedWith) > 1) {
      endDuel(target);
      this.refreshEngagementMarks();
    }
    this.kingSwing(caster, target, 'hookReach', 'hookReach', (dx) => {
      this.showImpact(caster, target, result, dx, target.hp === 0);
      if (pulled && (pulled.path.length || pulled.fall)) {
        this.time.delayedCall(160, () => {
          if (this.hasPose(caster, 'hookPull')) this.showPose(caster, 'hookPull', dx);
          this.knockBack(target, pulled, caster.view.x - target.view.x, { text: 'Hooked!', color: spell.color });
        });
      } else if (result.hit && target.alive) this.floatText(target, 'Hooked!', spell.color, { rise: 46 });
    });
    this.kingFinish(done, 1300);
  },

  // A pull: the reverse of a push (pushLoser), toward the puller, in a straight line. A unit stopped by a wall,
  // a higher level or another unit before the pull is used up slams into it; stopping because it has reached
  // the puller is not a slam. Returns { from, path, fall } like pushLoser.
  pullLoser(loser, puller, steps, { exposeNear = false } = {}) {
    if (this.unmovedCatch(loser, puller)) return { from: { col: loser.col, row: loser.row }, path: [], fall: null, held: true };
    const phantom = { col: 2 * loser.col - puller.col, row: 2 * loser.row - puller.row };
    const plan = this.pushPlan(loser, phantom, steps);
    if (plan.held) {
      if (plan.rooted) this.time.delayedCall(420, () => loser.alive && this.floatText(loser, 'Rooted!', '#d9b77a', { rise: 46 }));
      return { from: { col: loser.col, row: loser.row }, path: [], fall: null, held: true };
    }
    const from = { col: loser.col, row: loser.row };
    const { path, levels } = plan;
    const end = path.length ? path[path.length - 1] : from;
    const dc = Math.sign(puller.col - loser.col), dr = Math.sign(puller.row - loser.row);
    const next = { col: end.col + dc, row: end.row + dr };
    const reached = next.col === puller.col && next.row === puller.row;
    if (path.length) {
      loser.col = end.col;
      loser.row = end.row;
    }
    let fall = levels > 0 ? { levels, damage: levels * terrain.fallDamagePerLevel } : null;
    const slam = plan.slam && !reached && (!plan.held);
    if (slam) {
      const toward = tileToScreen(next.col, next.row);
      const here = tileToScreen(loser.col, loser.row);
      fall = { ...(fall || { levels: 0, damage: 0 }), slam: exposeNear ? G.singularity.collisionDamage : conditions.disoriented.impactDamage, toward: { x: toward.x - here.x, y: toward.y - here.y } };
      applyDisoriented(loser, this.activeUnit === loser);
    }
    if (fall) {
      loser.hp = Math.max(0, loser.hp - fall.damage - (fall.slam || 0));
      if (loser.hp === 0) this.defeat(loser);
      else {
        this.interrupt(loser);
        if (fall.slam || fall.levels) this.breakChannel(loser, 'Slammed');
      }
    }
    if (this.relayQueue && (path.length > 0 || (fall && fall.slam)) && loser.hp > 0) this.relayQueue.push({ unit: loser, by: puller });
    if (path.length > 0 || fall) { loser.knockPending = true; loser.pushedFrom = from; } // drawn on its old tile until the pull is drawn (1.68)
    return { from, path, fall };
  },

  // ---------- Gadara: Sunder Boon ----------
  // Fork end, the foe next to him: tears one blessing off (a Verse, or an Enchanted weapon). No damage. Mask +2.
  castSunderBoon(caster, target, spell, onDone) {
    let torn = null;
    if (target.status.buff && spells[target.status.buff.id] && spells[target.status.buff.id].kind === 'buff') {
      torn = spells[target.status.buff.id].effect || spells[target.status.buff.id].button;
      target.status.buff = null;
      if (target.attune && target.attune.echo) { target.status.buff = target.attune.echo; target.attune.echo = null; } // Alagara's Echo takes over
    } else if (target.status.enchant) {
      torn = 'Enchant';
      target.status.enchant = null;
    }
    const fed = torn ? feedMask(caster, G.mask.strip) : 0;
    this.kingSwing(caster, target, 'sunderWindup', 'sunder', () => {
      const p = this.centerOf(target);
      sfxAt(this, 'sunder_slash', p.x, p.y + 10, { flip: target.view.x < caster.view.x, depth: target.view.depth + 2 });
      play('slash');
      this.time.delayedCall(240, () => {
        sfxAt(this, 'buff_strip', p.x, p.y, { depth: target.view.depth + 3 });
        if (torn) this.floatText(target, torn + ' torn away', spell.color, { pop: true });
        else this.floatText(target, 'Nothing to take', '#e8d5a8');
        if (fed) this.floatText(caster, 'Mask +' + fed, '#c9a8ff', { rise: 40 });
        this.showStanding(target);
        this.refreshStatusTags();
      });
    }, { lead: 320 });
    this.kingFinish(onDone, 1300);
  },

  // ---------- Gadara: Heavy Cleave ----------
  // Blade end, the foe next to him: one and a half times the damage, ignoring 2 defense; a slow overhead blow.
  castHeavyCleave(caster, target, spell, onDone) {
    const result = this.kingStrike(caster, target, { share: spell.damageTimes, ignoreDefense: spell.ignoreDefense });
    this.kingSwing(caster, target, 'cleaveWindup', 'cleave', (dx) => {
      sfxAt(this, 'cleave_impact', target.view.x, target.view.y + 6, { flip: dx < 0, depth: target.view.depth + 2 });
      screenShake(this, 0.008, 180);
      this.cameraPunch(2);
      play('crash');
      this.showImpact(caster, target, result, dx, target.hp === 0);
    }, { lead: 480 }); // slow: he rears the staff up first
    this.kingFinish(onDone, 1500);
  },

  // ---------- Gadara: Singularity ----------
  // Part 1: he dons the mask. It takes his whole turn; the area is marked until it resolves.
  castSingularity(caster, spell, onDone) {
    caster.channel = { spellId: 'singularity' };
    // A fixed charge, like a spell's charge time in FFT (20 Nov): his next turn comes after chargeTicks ticks of the
    // turn clock (about one turn for each other fighter), whatever his speed. "His next turn" at speed 6 used to be
    // 13 turns away, and Singularity was nearly always broken, or its foes gone, before it went off.
    caster.ct = Math.max(caster.ct, TURN_COST - caster.speed * G.singularity.chargeTicks);
    caster.hasMoved = true;
    caster.stepsUsed = Infinity;
    play('spell');
    this.showStanding(caster); // the mask on (art.json "buffed.masked")
    this.floatText(caster, 'The mask goes on', spell.color, { pop: true });
    this.drawTelegraph(caster);
    this.refreshStatusTags();
    this.refreshTurnStrip(); // he comes round sooner: the strip shows it
    this.refreshButtons();
    this.time.delayedCall(1000, () => {
      onDone();
      if (caster.side === 'hero' && this.activeUnit === caster && !this.battleOver) this.endTurn();
    });
  },

  // The marked area round him (the telegraph): pale violet tiles that pulse until it resolves or breaks.
  drawTelegraph(caster) {
    this.clearTelegraph(caster);
    const objects = [];
    for (const t of singularityTiles(caster, GRID_SIZE)) {
      const { x, y } = tileToScreen(t.col, t.row);
      const hw = TILE_WIDTH / 2 - 4, hh = TILE_HEIGHT / 2 - 3;
      const pts = [{ x, y: y - hh }, { x: x + hw, y }, { x, y: y + hh }, { x: x - hw, y }];
      const g = this.add.graphics().setDepth(depthFor(t.col, t.row) + 0.45);
      g.fillStyle(0x6a3cc8, 0.22).fillPoints(pts, true);
      g.lineStyle(2, 0xb48cff, 0.75).strokePoints(pts, true, true);
      objects.push(g);
    }
    const tweens = objects.length ? [this.tweens.add({ targets: objects, alpha: 0.45, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })] : [];
    const orb = sfxLoop(this, 'umbra_orb', 0, -caster.centerY - 30, { size: 0.9 });
    if (orb) caster.view.add(orb);
    caster.telegraph = { objects: orb ? [...objects, orb] : objects, tweens };
  },
  clearTelegraph(unit) {
    if (!unit.telegraph) return;
    for (const t of unit.telegraph.tweens) t.remove();
    for (const o of unit.telegraph.objects) o.destroy();
    unit.telegraph = null;
  },
  // The camera turned: the marked tiles are drawn again where they now are.
  redrawTelegraphs() {
    for (const u of this.units || []) if (u.channel && u.alive) this.drawTelegraph(u);
  },

  // A Stun, a fall or a slam on him while it charges breaks it: the mask is knocked off, the gauge empties.
  breakChannel(unit, why = 'Broken') {
    if (!unit || !unit.channel) return;
    unit.channel = null;
    unit.mask = 0;
    if (unit.status && unit.status.used && unit.status.used.singularity) unit.status.used.singularity -= 1; // the once-a-battle use is kept
    this.clearTelegraph(unit);
    this.time.delayedCall(560, () => {
      if (!unit.alive) return;
      this.floatText(unit, 'Singularity broken', '#e8d5a8', { rise: 52 });
      this.refreshStatusTags();
      if (!this.inCinematic && !unit.engagedWith) this.showStanding(unit);
    });
  },

  // Part 2, at the start of his next turn: every foe within 3 tiles is pulled up to 3 tiles toward him.
  resolveSingularity(caster, onDone) {
    const done = this.collectRelays(onDone);
    caster.channel = null;
    this.clearTelegraph(caster);
    const foes = singularityCatch(caster, this.units).sort((a, b) => distance(a, caster) - distance(b, caster));
    // the nearest first, so the ones behind pile up against them (and slam)
    const pulls = [];
    for (const f of foes) {
      if (!f.alive) continue;
      const before = { col: f.col, row: f.row };
      const pulled = distance(f, caster) > 1 ? this.pullLoser(f, caster, G.singularity.pull, { exposeNear: true }) : { from: before, path: [], fall: null };
      if (f.engagedWith && distance(f, f.engagedWith) > 1) endDuel(f);
      if (f.alive && distance(f, caster) === 1) applyOffBalance(f);
      pulls.push({ f, pulled });
    }
    caster.mask = 0;
    caster.singularityUsed = true;
    applyExposed(caster, G.singularity.exposed);
    this.refreshEngagementMarks();
    // the pictures: the staff raised, the vortex on him, the foes dragged in
    this.showPose(caster, 'unleash', 1);
    play('spell');
    const vortex = sfxAt(this, 'umbra_vortex', caster.view.x, caster.view.y + 10, { depth: caster.view.depth + 3 });
    if (!vortex) floorLight(this, caster.view.x, caster.view.y, 0x8b5cff, { size: 3, peak: 0.8, ms: 1200 });
    lightNearby(this, caster.view.x, caster.view.y - caster.centerY, 0x8b5cff, { radius: 260, peak: 0.7, ms: 1100 });
    screenShake(this, 0.01, 420);
    this.floatText(caster, 'Singularity', spells.singularity.color, { pop: true });
    this.time.delayedCall(420, () => {
      for (const { f, pulled } of pulls) {
        if (pulled.path.length || pulled.fall) this.knockBack(f, pulled, caster.view.x - f.view.x, { text: pulled.fall && pulled.fall.slam ? 'Crushed in!' : 'Pulled!', color: '#c9a8ff' });
        if (f.alive && isOffBalance(f)) this.time.delayedCall(500, () => f.alive && this.floatText(f, 'Off-Balance', '#ff6b5a', { rise: 60 }));
      }
    });
    this.time.delayedCall(1300, () => {
      if (caster.alive) {
        this.floatText(caster, 'Exposed', '#ff9a7a', { rise: 40 });
        this.showStanding(caster);
      }
      this.refreshStatusTags();
    });
    this.kingFinish(done, 1900);
  },

  // ---------- Alagara: Drawn Blade and Rending Draw ----------
  // Drawn Blade: a full blow from the sheath; a hit locks them in a clash with the momentum one step his way.
  // Rending Draw (Fury): ignores 2 defense and throws the foe 2 tiles back. power: 0.75 from the Echo.
  castDrawnBlade(caster, target, spell, onDone, power, rending) {
    const result = this.kingStrike(caster, target, { share: (spell.damageShare || 1) * power, ignoreDefense: spell.ignoreDefense || 0 });
    let pushed = null;
    let locked = false;
    if (result.hit && target.alive && rending) {
      pushed = this.pushLoser(target, caster, spell.push);
      if (target.engagedWith && distance(target, target.engagedWith) > 1) endDuel(target);
    } else if (result.hit && target.alive && canBeCaught(target) && !caster.engagedWith && !target.engagedWith) {
      if (isStanceDuel()) {
        startDuel(caster, target);
        shiftMomentum(caster, spell.momentum || 1); // the free Press step
      } else startEngagement(caster, target);
      locked = true;
    }
    this.kingSwing(caster, target, 'drawn', rending ? 'attack' : 'attack', (dx) => {
      this.afterimage(caster);
      this.showImpact(caster, target, result, dx, target.hp === 0);
      if (locked && target.alive) {
        play('clash');
        this.floatText(target, 'Locked in!', '#ffb35c', { rise: 46 });
        this.refreshEngagementMarks();
      }
      if (pushed && (pushed.path.length || pushed.fall)) this.time.delayedCall(140, () => this.knockBack(target, pushed, dx, { text: 'Rent!', color: spell.color }));
    }, { lead: 300 });
    this.kingFinish(onDone, 1300);
  },

  // ---------- Alagara: Claim ----------
  // Takes one blessing from the unit next to him (ally or foe): it leaves them and is his for 2 turns.
  castClaim(caster, target, spell, onDone) {
    let taken = null;
    if (target.status.buff && spells[target.status.buff.id] && spells[target.status.buff.id].kind === 'buff') {
      const b = target.status.buff;
      taken = b.id;
      target.status.buff = null;
      if (target.attune && target.attune.echo) { target.status.buff = target.attune.echo; target.attune.echo = null; }
      applyBuff(caster, b.id, b.power || 1);
      caster.status.buff.turnsLeft = spell.turns;
    } else if (target.status.enchant) {
      taken = 'enchant';
      caster.status.enchant = { ...target.status.enchant, turnsLeft: spell.turns };
      target.status.enchant = null;
    }
    const dx = target.view.x - caster.view.x;
    this.faceToward(caster, dx, target.view.y - caster.view.y);
    if (this.hasPose(caster, 'claimReach')) this.showPose(caster, 'claimReach', dx);
    play('select');
    const t = this.centerOf(target), c = this.centerOf(caster);
    sfxAt(this, 'claim_take', t.x, t.y, { depth: target.view.depth + 2 });
    this.time.delayedCall(380, () => { if (this.hasPose(caster, 'claimSnatch')) this.showPose(caster, 'claimSnatch', dx); });
    this.time.delayedCall(700, () => {
      if (this.hasPose(caster, 'claimStore')) this.showPose(caster, 'claimStore', dx);
      sfxAt(this, 'claim_absorb', c.x, c.y, { depth: caster.view.depth + 2 });
      play('spell');
      const name = taken === 'enchant' ? 'Enchant' : taken ? spells[taken].effect || spells[taken].button : null;
      this.floatText(caster, name ? 'Claimed: ' + name : 'Nothing to claim', spell.color, { pop: true });
      this.refreshStatusTags();
      this.showStanding(target);
    });
    this.time.delayedCall(1300, () => caster.alive && this.showStanding(caster));
    this.kingFinish(onDone, 1500);
  },

  // ---------- Alagara: Mantle ----------
  // Shares his Active Verse with every ally next to him at half strength, for their next turn.
  castMantle(caster, spell, onDone) {
    const verse = caster.status.buff ? caster.status.buff.id : null;
    const allies = this.units.filter((u) => u.alive && u !== caster && u.side === caster.side && !u.isDecoy && distance(u, caster) === 1 && !(u.status && u.status.buff));
    if (verse) for (const a of allies) applyBuff(a, verse, spell.power);
    if (this.hasPose(caster, 'chant')) this.showPose(caster, 'chant', 1);
    play('spell');
    this.time.delayedCall(420, () => {
      if (this.hasPose(caster, 'cast')) this.showPose(caster, 'cast', 1);
      sfxAt(this, 'mantle', caster.view.x, caster.view.y + 8, { depth: caster.view.depth + 2 });
      for (const a of allies) {
        sfxAt(this, 'mantle', a.view.x, a.view.y + 8, { depth: a.view.depth + 2, size: 0.8 });
        this.floatText(a, 'Mantle: ' + (spells[verse].effect || spells[verse].button), spell.color, { rise: 46 });
        if (!a.engagedWith) this.showStanding(a);
      }
      if (!allies.length) this.floatText(caster, 'No ally beside him', '#e8d5a8');
      this.refreshStatusTags();
    });
    this.time.delayedCall(1300, () => caster.alive && this.showStanding(caster));
    this.kingFinish(onDone, 1500);
  },

  // ---------- Alagara: Gale Cut ----------
  // The dash: from his tile in a straight line toward "toward", as far as his steps left, through every foe;
  // he lands on the last free tile he reaches. Returns { tiles, hits, land }.
  galePlan(unit, toward) {
    const dc = Math.sign(toward.col - unit.col), dr = Math.sign(toward.row - unit.row);
    const out = { tiles: [], hits: [], land: null };
    if ((dc && dr) || (!dc && !dr)) return out;
    const steps = this.stepsLeft(unit);
    const rules = moveRules(unit);
    let prev = { col: unit.col, row: unit.row };
    const passed = [];
    for (let i = 1; i <= steps; i++) {
      const t = { col: unit.col + dc * i, row: unit.row + dr * i };
      if (!isInsideGrid(t.col, t.row) || this.spikeAt(t.col, t.row) || this.potAt(t.col, t.row)) break;
      if (getHeight(t.col, t.row) - getHeight(prev.col, prev.row) > (rules.climb === undefined ? Infinity : rules.climb)) break;
      out.tiles.push(t);
      const who = this.getUnitAt(t.col, t.row);
      passed.push({ t, who });
      prev = t;
    }
    // land on the furthest free tile; foes before it are cut
    let landAt = -1;
    for (let i = passed.length - 1; i >= 0; i--) if (!passed[i].who && !this.isBlocked(passed[i].t.col, passed[i].t.row)) { landAt = i; break; }
    if (landAt < 0) return { tiles: [], hits: [], land: null };
    out.land = passed[landAt].t;
    out.hits = passed.slice(0, landAt).map((p) => p.who).filter((w) => w && foeOf(unit, w));
    out.tiles = out.tiles.slice(0, landAt + 1);
    return out;
  },

  castGaleCut(caster, target, spell, onDone, power) {
    const plan = this.galePlan(caster, target);
    if (!plan.land) return onDone();
    const results = plan.hits.map((f) => ({ f, r: this.kingStrike(caster, f, { share: spell.damageShare * power }) }));
    const start = { x: caster.view.x, y: caster.view.y };
    caster.col = plan.land.col;
    caster.row = plan.land.row;
    caster.hasMoved = true;
    caster.stepsUsed = Infinity; // the dash is his move
    const end = tileToScreen(plan.land.col, plan.land.row);
    const dx = end.x - start.x, dy = end.y - start.y;
    this.faceToward(caster, dx, dy);
    if (this.hasPose(caster, 'gale')) this.showPose(caster, 'gale', dx);
    const verse = caster.status.buff ? caster.status.buff.id : null;
    const fx = verse === 'fury' && sfxHas(this, 'gale_fury') ? 'gale_fury' : verse === 'swiftness' && sfxHas(this, 'gale_swift') ? 'gale_swift' : 'gale';
    play('whoosh');
    this.tweens.add({
      targets: caster.view, x: end.x, y: end.y, duration: 120 + 70 * plan.tiles.length, ease: 'Cubic.easeIn',
      onUpdate: () => this.afterimage(caster),
      onComplete: () => {
        caster.view.setDepth(depthFor(caster.col, caster.row) + 1);
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - caster.centerY * 0.6 };
        sfxAt(this, fx, mid.x, mid.y, { rotation: dx < 0 ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx), flip: dx < 0, depth: 90, size: Math.max(1, plan.tiles.length / 2) });
        results.forEach(({ f, r }, i) => this.time.delayedCall(60 * i, () => this.showImpact(caster, f, r, dx, f.hp === 0)));
        this.time.delayedCall(700, () => caster.alive && this.showStanding(caster));
      },
    });
    this.kingFinish(onDone, 1500);
  },

  // ---------- Alagara: Unmoved (Stone, a reaction) ----------
  // The first push or pull on him while Stone is Active (or in the Echo, at 75 percent) is cancelled, and he
  // answers the one who moved him with a half-strength counter if they stand next to him. The Stone Surge
  // cancels the next push this turn too. Returns true when the push is cancelled.
  unmovedCatch(loser, by) {
    if (!isAttuned(loser) || !loser.alive) return false;
    if (loser.surgeStone) {
      loser.surgeStone = false;
      this.time.delayedCall(380, () => loser.alive && this.floatText(loser, 'Unmoved (Surge)', '#d9b77a', { rise: 46 }));
      return true;
    }
    const ready = verseSkillsNow(loser).some((s) => s.id === 'unmoved') && cooldownOf(loser, 'unmoved') === 0;
    if (!ready) return false;
    const power = verseSkillPower(loser, 'unmoved');
    startCooldown(loser, 'unmoved');
    if (fromEcho(loser, 'unmoved')) loser.status.cooldowns.unmoved += A.echoCooldownExtra;
    let counter = null;
    if (by && by.alive && by.side !== loser.side && distance(loser, by) === 1) counter = this.kingStrike(loser, by, { share: spells.unmoved.counterShare * power, sure: true });
    this.time.delayedCall(380, () => {
      if (!loser.alive) return;
      this.floatText(loser, 'Unmoved!', spells.unmoved.color, { pop: true });
      if (counter && by.view) {
        const dx = by.view.x - loser.view.x;
        this.showPose(loser, 'attack', dx);
        this.time.delayedCall(160, () => this.showImpact(loser, by, counter, dx, by.hp === 0));
        this.time.delayedCall(700, () => loser.alive && !loser.engagedWith && this.showStanding(loser));
      }
    });
    return true;
  },

  // ---------- The AI (an enemy king, or a hero king played by the test player) ----------
  // Called at the start of enemyAttack (after the walk). Returns true if it acted (then finish() runs).
  kingAiAct(unit, finish) {
    if (unit.grip) return this.gadaraAi(unit, finish);
    if (isAttuned(unit)) return this.alagaraAi(unit, finish);
    return false;
  },

  aiCast(unit, target, id, finish) {
    this.busy = true;
    startCooldown(unit, id);
    unit.hasActed = true;
    this.castKingSkill(unit, target, id, finish);
    return true;
  },
  aiSetGrip(unit, want) {
    if (unit.grip !== want && !unit.gripSwitched) this.useFreeKingAction(unit, 'reverseGrip');
    return unit.grip === want;
  },
  aiReady(unit, id) {
    return unit.spells.includes(id) && canAfford(unit, id) && !this.kingBlockIgnoringGrip(unit, id);
  },
  // (the grip is free to change once a turn, so the AI asks about the rest)
  kingBlockIgnoringGrip(unit, id) {
    const g = unit.grip;
    if (spells[id].grip && !unit.gripSwitched) unit.grip = spells[id].grip;
    const why = this.kingBlock(unit, id);
    unit.grip = g;
    return why;
  },

  gadaraAi(unit, finish) {
    const seen = this.enemyEyes().filter((t) => foeOf(unit, t));
    // Singularity: saved for a good cluster (kings.json "ai"): 3 or more foes within 3 tiles, or 2 when at least
    // one of them is not next to him yet (it gets dragged in)
    if (this.aiReady(unit, 'singularity')) {
      const caught = singularityCatch(unit, seen);
      const far = caught.filter((f) => distance(f, unit) > 1).length;
      if (caught.length >= G.ai.clusterAlways || (caught.length >= G.ai.clusterMin && far >= 1)) return this.aiCast(unit, unit, 'singularity', finish);
    }
    const near = seen.filter((t) => distance(unit, t) === 1);
    // Sunder Boon: a blessed foe next to him (feeds the gauge)
    if (this.aiReady(unit, 'sunderBoon')) {
      const blessed = near.filter((t) => hasBlessing(t)).sort((a, b) => b.attack - a.attack);
      if (blessed.length && this.aiSetGrip(unit, 'fork')) return this.aiCast(unit, blessed[0], 'sunderBoon', finish);
    }
    // Fork Strike through two in a line beats everything else when it is there
    const lined = near.filter((t) => this.forkPreview(unit, t));
    // Snare Hook: nobody next to him, a foe 2 tiles away in a line (a caster first, then the weakest)
    if (!near.length && this.aiReady(unit, 'snareHook')) {
      const g = unit.grip; unit.grip = 'fork';
      const marks = this.kingTargets(unit, 'snareHook').filter((t) => distance(unit, t) === 2).sort((a, b) => (b.range > 1) - (a.range > 1) || a.hp - b.hp);
      unit.grip = g;
      if (marks.length && this.aiSetGrip(unit, 'fork')) return this.aiCast(unit, marks[0], 'snareHook', finish);
    }
    // Heavy Cleave: a foe next to him and no line to fork through
    if (near.length && !lined.length && this.aiReady(unit, 'heavyCleave')) {
      const t = [...near].sort((a, b) => a.hp - b.hp)[0];
      if (this.aiSetGrip(unit, 'blade')) return this.aiCast(unit, t, 'heavyCleave', finish);
    }
    // The plain blow: Fork through a line, otherwise the Blade's extra 2
    if (near.length) {
      const t = lined.length ? lined[0] : [...near].sort((a, b) => (isOffBalance(b) - isOffBalance(a)) || a.hp - b.hp)[0];
      this.aiSetGrip(unit, lined.length ? 'fork' : 'blade');
      this.busy = true;
      this.performAttack(unit, t, finish);
      return true;
    }
    return false;
  },

  // Would a Fork Strike on this foe also catch one behind it?
  forkPreview(unit, t) {
    const dc = Math.sign(t.col - unit.col), dr = Math.sign(t.row - unit.row);
    if (dc && dr) return false;
    for (let i = 1; i <= G.fork.lineDepth; i++) {
      const u = this.getUnitAt(t.col + dc * i, t.row + dr * i);
      if (!u) return false;
      if (u.side !== unit.side) return true;
    }
    return false;
  },

  alagaraAi(unit, finish) {
    const seen = this.enemyEyes().filter((t) => foeOf(unit, t));
    const near = seen.filter((t) => distance(unit, t) === 1);
    // Swap: Fury in front when a foe is next to him, Swiftness when the way is open (a free action)
    if (canSwap(unit)) {
      const echo = echoOf(unit).id, active = unit.status.buff.id;
      const want = near.length ? 'fury' : 'swiftness';
      if (echo === want && active !== want) this.useFreeKingAction(unit, 'verseSwap');
    }
    // Gale Cut through two or more, or one when nobody is next to him
    if (this.aiReady(unit, 'galeCut')) {
      let best = null;
      for (const t of this.kingTargets(unit, 'galeCut')) {
        const n = this.galePlan(unit, t).hits.length;
        if (!best || n > best.n) best = { t, n };
      }
      if (best && (best.n >= 2 || !near.length)) return this.aiCast(unit, best.t, 'galeCut', finish);
    }
    // Claim a blessing: a foe's first; an ally's only when he has no Verse of his own
    if (this.aiReady(unit, 'claim')) {
      const marks = this.kingTargets(unit, 'claim').filter((t) => t.side !== unit.side || !(unit.status && unit.status.buff));
      marks.sort((a, b) => (a.side === unit.side) - (b.side === unit.side));
      if (marks.length) return this.aiCast(unit, marks[0], 'claim', finish);
    }
    // Mantle: his Verse on allies beside him
    if (this.aiReady(unit, 'mantle') && this.units.some((u) => u.alive && u !== unit && u.side === unit.side && distance(u, unit) === 1 && !(u.status && u.status.buff))) {
      return this.aiCast(unit, unit, 'mantle', finish);
    }
    if (near.length) {
      const t = [...near].sort((a, b) => (isOffBalance(b) - isOffBalance(a)) || a.hp - b.hp)[0];
      if (this.aiReady(unit, 'rendingDraw')) return this.aiCast(unit, t, 'rendingDraw', finish);
      if (this.aiReady(unit, 'drawnBlade') && !unit.engagedWith && canBeCaught(t) && !t.engagedWith) return this.aiCast(unit, t, 'drawnBlade', finish);
      this.busy = true;
      this.performAttack(unit, t, finish);
      return true;
    }
    return false;
  },
};
