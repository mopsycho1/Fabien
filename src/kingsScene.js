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
import { getHitChance, getDamage, distance, hasClearShot } from './combat.js';
import { canBeCaught, startEngagement, startDuel, endDuel, isStanceDuel, shiftMomentum } from './engagement.js';
import { applyOffBalance, clearOffBalance, isOffBalance, applyBuff, buffOf, applyExposed, applyDisoriented, startCooldown, cooldownOf, canAfford, moveRules, moveOf } from './status.js';
import { TURN_COST } from './turnOrder.js';
import { KING_RULES, otherGrip, gripAttackName, maskFull, feedMask, singularityTiles, singularityCatch, canSwap, swapVerses, verseSkillsNow, giveShield, soakShield, fromEcho, verseSkillPower, isAttuned, echoOf } from './kings.js';
import { sfxHas, sfxAt, sfxLoop, crownOver, aegisDome, sfxInfo } from './spellArt.js';
import { play } from './audio.js';
import { floorLight, lightNearby } from './fxLayers.js';
import { screenShake } from './effects.js';
import terrain from './data/terrain.json';
import conditions from './data/conditions.json';

const G = KING_RULES.gadara;
const A = KING_RULES.alagara;
// the skill kinds this file plays (castSpell hands them here)
export const KING_KINDS = ['grip', 'swap', 'hook', 'sunder', 'cleave', 'singularity', 'drawn', 'claim', 'mantle', 'gale', 'rending', 'shield', 'rift'];
// skills cast on himself: tap the skill again (or his own tile) to use it
export const KING_SELF_KINDS = ['singularity', 'mantle', 'shield'];
const isKingSkill = (id) => !!spells[id] && KING_KINDS.includes(spells[id].kind);
const foeOf = (a, b) => b && a && b.alive && !b.isDecoy && b.side !== a.side;
const hasBlessing = (u) => !!(u && ((u.status && ((u.status.buff && spells[u.status.buff.id] && spells[u.status.buff.id].kind === 'buff') || u.status.enchant)) || u.fury > 0)); // a Verse, an Enchanted weapon or Bloodied stacks (10.41)
const straight = (a, b) => a.col === b.col || a.row === b.row;
const sfxFrameMs = (name) => (sfxInfo(name) && sfxInfo(name).frameMs) || 140;
const ORB_BURST_FRAME = 6.5; // the frame of his orb GIF where it bursts (6.91; frames 0 to 6 the orb forms and cracks)

// The Gale Cut GIF for Alagara's form now: Fury's flame cut, Swiftness's wind cut, else the gold one (no Stone art yet).
export function galeFx(scene, unit) {
  const verse = unit.status && unit.status.buff ? unit.status.buff.id : null;
  if (verse === 'fury' && sfxHas(scene, 'gale_fury')) return 'gale_fury';
  if (verse === 'swiftness' && sfxHas(scene, 'gale_swift')) return 'gale_swift';
  return 'gale';
}

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
      case 'shield':
        return [unit];
      case 'hook':
        return seen.filter((t) => foeOf(unit, t) && straight(unit, t) && distance(unit, t) >= 1 && distance(unit, t) <= spell.range && this.hookLineClear(unit, t));
      case 'sunder':
        return seen.filter((t) => foeOf(unit, t) && distance(unit, t) === 1 && hasBlessing(t));
      case 'claim':
        return seen.filter((t) => t !== unit && !t.isDecoy && distance(unit, t) === 1 && hasBlessing(t));
      case 'gale':
        return seen.filter((t) => foeOf(unit, t) && straight(unit, t) && this.galePlan(unit, t).hits.includes(t));
      case 'rift': // Radiant Rift (10.52): a foe up to its range away in a clear line
        return seen.filter((t) => foeOf(unit, t) && distance(unit, t) <= spell.range && hasClearShot(unit, t));
      default: // cleave, drawn, rending: the foe next to him
        return seen.filter((t) => foeOf(unit, t) && distance(unit, t) <= (spell.range || 1));
    }
  },

  // The tiles Singularity would pull from, or Mantle would reach (for the lit area when he picks it).
  kingAreaTiles(unit, id) {
    if (id !== 'mantle' && id !== 'bulwarkShield') return singularityTiles(unit, GRID_SIZE);
    const r = spells[id].range, out = [];
    for (let c = unit.col - r; c <= unit.col + r; c++) for (let w = unit.row - r; w <= unit.row + r; w++) {
      if (c < 0 || w < 0 || c >= GRID_SIZE || w >= GRID_SIZE) continue;
      const d = Math.abs(c - unit.col) + Math.abs(w - unit.row);
      if (d >= 1 && d <= r) out.push({ col: c, row: w });
    }
    return out;
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
      case 'shield': return this.castBulwarkShield(caster, spell, onDone, verseSkillPower(caster, id));
      case 'rift': return this.castRadiantRift(caster, target, spell, onDone);
      default: return onDone();
    }
  },

  // ---------- Alagara: Radiant Rift (10.52, Suleiman 22 Nov) ----------
  // The magic buffs he would spend now: his Active Verse and a claimed Enchant. Returns their names (empty: none).
  riftFuel(unit) {
    const st = unit.status || {};
    const out = [];
    if (st.buff && spells[st.buff.id] && spells[st.buff.id].kind === 'buff') out.push(spells[st.buff.id].button);
    if (st.enchant) out.push('Enchant');
    return out;
  },
  // How much Radiant Rift would do to a target now (for the AI and the preview): magic, against magic defense.
  riftDamage(unit, target, spell = spells.radiantRift) {
    const power = this.riftFuel(unit).length ? unit.attack + spell.spentBonus : spell.unbuffedPower;
    return Math.max(1, power - (target.magicDefense || 0));
  },
  // A slash of light: he gathers it (his Arcane Charging Spiral), swings (the Prismatic Energy Slash round the blade, the same
  // frame the strike picture shows) and the crescent flies to the target. It spends his Active Verse (his Echo takes over, as
  // when a buff is stripped) and a claimed Enchant for spentBonus more power; with no magic buff the power is unbuffedPower.
  castRadiantRift(caster, target, spell, onDone) {
    const fuel = this.riftFuel(caster);
    const power = fuel.length ? caster.attack + spell.spentBonus : spell.unbuffedPower;
    const st = caster.status;
    if (fuel.length) {
      if (st.buff && spells[st.buff.id] && spells[st.buff.id].kind === 'buff') {
        st.buff = null;
        if (caster.attune && caster.attune.echo) { st.buff = caster.attune.echo; caster.attune.echo = null; } // his Echo takes over
      }
      st.enchant = null;
    }
    const mage = { ...caster, attackType: 'magic', magicAttack: power, attackEffect: 'slash', status: st };
    const result = this.kingStrike(mage, target);
    const dx = target.view.x - caster.view.x;
    this.faceToward(caster, dx, target.view.y - caster.view.y);
    if (this.hasPose(caster, 'windup')) this.showPose(caster, 'windup', dx);
    const body = () => ({ x: caster.view.x, y: caster.view.y - (caster.centerY || 40) });
    sfxAt(this, 'arcane_charge', caster.view.x, caster.view.y + 6, { size: 1.15, depth: caster.view.depth + 0.5 }); // the gathering
    if (fuel.length) this.floatText(caster, fuel.join(' + ') + ' spent', spell.color, { rise: 40 });
    const CHARGE = 520, FLY = 230;
    this.time.delayedCall(CHARGE, () => {
      play('whoosh');
      this.showPose(caster, 'attack', dx);
      const p = body();
      sfxAt(this, 'rift', p.x, p.y, { flip: dx < 0, size: 1.5, depth: caster.view.depth + 0.6 }); // round the swing (photo 1814)
      const crescent = sfxAt(this, 'rift', p.x, p.y, { flip: dx < 0, size: 0.9, depth: 90 });
      const end = this.centerOf(target);
      if (crescent) this.tweens.add({ targets: crescent, x: end.x, y: end.y, duration: FLY, ease: 'Quad.easeIn' });
    });
    this.time.delayedCall(CHARGE + FLY, () => {
      this.showImpact(mage, target, result, dx, target.hp === 0);
      if (result.hit && target.alive) this.floatText(target, 'Rift!', spell.color, { rise: 46 });
      this.refreshStatusTags();
    });
    this.time.delayedCall(CHARGE + FLY + 600, () => caster.alive && this.showStanding(caster));
    this.kingFinish(onDone, CHARGE + FLY + 900);
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
      if (strike === 'attack' || !strike) this.swingArc(unit, dx); // a blade swing: his arc lands with it (22 Nov)
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
      this.soakFall(loser, fall); // Aegis takes Singularity's slam too (10.46)
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
      // 1.80 (Suleiman 21 Nov: "Singularity should do damage, the pay off needs to be worth the wait"): every foe that
      // is still standing when the pull ends takes a blow that cannot miss (the pull is no attack roll), kings.json
      // singularity.damageShare times a normal blow, on top of any slam or fall
      const blow = f.alive ? this.kingStrike(caster, f, { share: G.singularity.damageShare, sure: true }) : null;
      pulls.push({ f, pulled, blow });
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
      for (const { f, pulled, blow } of pulls) {
        if (pulled.path.length || pulled.fall) this.knockBack(f, pulled, caster.view.x - f.view.x, { text: pulled.fall && pulled.fall.slam ? 'Crushed in!' : 'Pulled!', color: '#c9a8ff' });
        // the blow lands as the foe arrives (1.80)
        // 6.91 (22 Nov, his Dark Magic Orb Explosion): a dark orb forms at the foe's feet where the pull ends and bursts as the
        // blow lands. The GIF bursts at frame ORB_BURST_FRAME, so it starts that long before the blow (the blow waits for it).
        let at = pulled.path.length || pulled.fall ? 700 : 150;
        if (blow && blow.hit && sfxHas(this, 'orb_burst')) {
          const lead = Math.round(ORB_BURST_FRAME * sfxFrameMs('orb_burst'));
          const end = pulled.path.length ? pulled.path[pulled.path.length - 1] : { col: f.col, row: f.row };
          const p = tileToScreen(end.col, end.row);
          at = Math.max(at, lead);
          this.time.delayedCall(at - lead, () => sfxAt(this, 'orb_burst', p.x, p.y + 6, { size: 1.25, depth: depthFor(end.col, end.row) + 2 }));
        }
        if (blow && blow.hit) this.time.delayedCall(at, () => this.showImpact(caster, f, blow, f.view.x - caster.view.x, f.hp === 0));
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
    let freed = null;
    if (result.hit && target.alive && rending) {
      pushed = this.pushLoser(target, caster, spell.push);
      if (target.engagedWith && distance(target, target.engagedWith) > 1) endDuel(target);
    } else if (result.hit && target.alive && canBeCaught(target) && !caster.engagedWith && (!target.engagedWith || this.drawnFrees(caster, target))) {
      // 10.49 (Suleiman 21 Nov): Drawn Blade can free an ally from a clash. The foe was locked with one of his: that
      // clash ends, the ally is free, and Alagara takes the foe on himself (like Sudeen's Shield Charge).
      if (target.engagedWith) {
        freed = target.engagedWith;
        endDuel(target);
      }
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
        if (freed && freed.alive) {
          this.time.delayedCall(300, () => freed.alive && this.floatText(freed, 'Free!', '#9fd4ff', { pop: true }));
          this.faceNearestOpponent(freed);
          this.showStanding(freed);
        }
        this.refreshEngagementMarks();
      }
      if (pushed && (pushed.path.length || pushed.fall)) this.time.delayedCall(140, () => this.knockBack(target, pushed, dx, { text: 'Rent!', color: spell.color }));
    }, { lead: 300 });
    // 10.39 (Suleiman 20 Nov: "whenever they're engaging with the kings nothing comes up"): a clash that Drawn Blade locks
    // used to show only the words "Locked in!", while a clash started with Engage opens with the two banners (and
    // Gaha's and the Bull's GIF). Now the same opening plays once the blow has landed.
    if (locked && target.alive) {
      this.time.delayedCall(1000, () => {
        if (this.battleOver || !caster.alive || !target.alive || caster.engagedWith !== target) return this.kingFinish(onDone, 300);
        this.beginCinematic();
        play('drum');
        this.clashBanner(caster, target, () => {
          this.endCinematic();
          this.kingFinish(onDone, 400);
        });
      });
    } else this.kingFinish(onDone, 1300);
  },

  // Would Drawn Blade on this foe free an ally of his from a clash (10.49)? The foe is locked with someone on his side.
  drawnFrees(caster, target) {
    const other = target && target.engagedWith;
    return !!(other && other !== caster && other.alive && other.side === caster.side);
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
    } else if (target.fury > 0) {
      // 10.41 (Suleiman 21 Nov): Claim also takes what makes another fighter special. Bloodied stacks (the Bull's pain
      // that toughens him) leave the foe and are Alagara's for 2 turns: while he has them every hit on him is cut by
      // a point per stack (signature.js takeHit, "borrowedFury"), in a clash or not, and they show on his card.
      taken = 'bloodied';
      caster.fury = Math.max(caster.fury || 0, target.fury);
      caster.borrowedFury = spell.turns;
      target.fury = 0;
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
      const name = taken === 'enchant' ? 'Enchant' : taken === 'bloodied' ? 'Bloodied' : taken ? spells[taken].effect || spells[taken].button : null;
      this.floatText(caster, name ? 'Claimed: ' + name : 'Nothing to claim', spell.color, { pop: true });
      this.refreshStatusTags();
      this.showStanding(target);
    });
    this.time.delayedCall(1300, () => caster.alive && this.showStanding(caster));
    this.kingFinish(onDone, 1500);
  },

  // ---------- Alagara: Mantle ----------
  // Shares his Active Verse with every ally within spells.mantle.range (3 since 1.81; it was 1, "next to him") at half
  // strength, for their next turn.
  mantleAllies(caster) {
    return this.units.filter((u) => u.alive && u !== caster && u.side === caster.side && !u.isDecoy && distance(u, caster) <= spells.mantle.range && !(u.status && u.status.buff));
  },
  castMantle(caster, spell, onDone) {
    const verse = caster.status.buff ? caster.status.buff.id : null;
    const allies = verse ? this.mantleAllies(caster) : []; // (no Verse: nothing to share; kingBlock stops it first)
    if (verse) for (const a of allies) applyBuff(a, verse, spell.power);
    if (this.hasPose(caster, 'chant')) this.showPose(caster, 'chant', 1);
    play('spell');
    this.time.delayedCall(420, () => {
      if (this.hasPose(caster, 'cast')) this.showPose(caster, 'cast', 1);
      for (const a of allies) {
        // his crown floats over the head of each ally it helps, for as long as the shared Verse lasts (6.84)
        if (a.mantleCrown) a.mantleCrown.destroy();
        a.mantleCrown = crownOver(this, a); a.mantleVerse = verse;
        this.floatText(a, 'Mantle: ' + (spells[verse].effect || spells[verse].button), spell.color, { rise: 46 });
        if (!a.engagedWith) this.showStanding(a);
      }
      if (!allies.length) this.floatText(caster, 'No ally in reach', '#e8d5a8');
      this.refreshStatusTags();
    });
    this.time.delayedCall(1300, () => caster.alive && this.showStanding(caster));
    this.kingFinish(onDone, 1500);
  },

  // ---------- Alagara: Aegis (10.46, Suleiman 21 Nov) ----------
  // Under Earth's Bulwark (Stone Active, or in the Echo at 75 percent) he raises a shield on himself and every ally
  // within 2 tiles: it soaks damage up to 20 percent of each one's own max health, for 2 of their turns. It is the
  // answer to an area attack like Gadara's Singularity: the pull's slam and its sure blow both land on the shield
  // first (landHit and soakFall). Numbers in spells.json bulwarkShield (share, turns, range).
  shieldAllies(caster) {
    return this.units.filter((u) => u.alive && !u.isDecoy && u.side === caster.side && (u === caster || distance(u, caster) <= spells.bulwarkShield.range));
  },
  castBulwarkShield(caster, spell, onDone, power = 1) {
    const who = this.shieldAllies(caster);
    const given = who.map((u) => ({ u, hp: giveShield(u, spell.share, spell.turns, power) }));
    if (this.hasPose(caster, 'chant')) this.showPose(caster, 'chant', 1);
    play('spell');
    floorLight(this, caster.view.x, caster.view.y, Phaser.Display.Color.HexStringToColor(spell.color).color, { size: 2.2, peak: 0.7, ms: 700 });
    this.time.delayedCall(380, () => {
      if (this.hasPose(caster, 'cast')) this.showPose(caster, 'cast', 1);
      screenShake(this, 0.003, 160);
      for (const { u, hp } of given) {
        if (!u.alive) continue;
        this.syncShieldDome(u, true);
        this.floatText(u, 'Shield ' + hp, spell.color, { rise: 46 });
      }
      this.refreshStatusTags();
    });
    this.time.delayedCall(1300, () => caster.alive && this.showStanding(caster));
    this.kingFinish(onDone, 1500);
  },

  // A slam or a fall lands on the shield first (Singularity's 2-point slam, a push into a wall, a drop).
  soakFall(unit, fall) {
    if (!unit.shield || !fall) return;
    const slam = soakShield(unit, fall.slam || 0);
    if (fall.slam) fall.slam = slam.damage;
    const drop = soakShield(unit, fall.damage || 0);
    fall.damage = drop.damage;
    if (slam.soaked + drop.soaked > 0) {
      this.shieldFlash(unit);
      this.time.delayedCall(300, () => unit.alive && this.floatText(unit, 'Shield -' + (slam.soaked + drop.soaked), spells.bulwarkShield.color, { rise: 52 }));
    }
  },

  // The dome: a pale gold half-bubble round the fighter, drawn at (0,0) inside his view so it moves with him.
  // Made when a shield is raised, removed when it breaks or fades (refreshStatusTags calls this every time).
  syncShieldDome(unit, pop = false) {
    const on = unit.alive && unit.shield && unit.shield.hp > 0 && unit.view;
    if (!on) {
      if (unit.shieldDome) { unit.shieldDome.destroy(); unit.shieldDome = null; }
      return;
    }
    if (unit.shieldDome && unit.shieldDome.active) return;
    // Suleiman's Aegis GIF when it is loaded (1.98); the drawn dome below otherwise
    const gif = aegisDome(this, unit);
    if (gif) { unit.shieldDome = gif; return; }
    const h = (unit.topY || 60) + 10, w = Math.max(30, h * 0.62);
    const g = this.add.graphics();
    const gold = 0xe8c87a;
    g.fillStyle(gold, 0.10);
    g.fillEllipse(0, -h * 0.45, w * 1.1, h * 1.05);
    g.lineStyle(2, gold, 0.55);
    g.strokeEllipse(0, -h * 0.45, w * 1.1, h * 1.05);
    g.lineStyle(1, 0xfff1c4, 0.35);
    g.strokeEllipse(0, 2, w * 1.1, w * 0.36); // the ring on the floor
    g.setBlendMode(Phaser.BlendModes.ADD);
    unit.view.add(g);
    unit.shieldDome = g;
    if (pop) { g.setScale(0.4); this.tweens.add({ targets: g, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' }); }
    this.tweens.add({ targets: g, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  // A hit on the shield: the dome flashes bright for a moment.
  shieldFlash(unit) {
    const g = unit.shieldDome;
    if (!g || !g.active) return;
    this.tweens.add({ targets: g, scaleX: 1.12, scaleY: 1.12, duration: 90, yoyo: true });
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

  // Gale Cut's extra damage: his steps left now times bonusPerStep (10.48).
  galeBonus(unit) {
    return Math.max(0, this.stepsLeft(unit)) * (spells.galeCut.bonusPerStep || 0);
  },

  // Gale Cut (10.34, Suleiman 20 Nov): in every form, not only under Swiftness. A slash across a distance: he dashes
  // along the line and cuts every foe on it. The Gale Cut GIF of his form (Fury's flame, Swift's wind, else the
  // gold one; Stone has no art yet) is laid on every tile of the path, each one as he passes it.
  castGaleCut(caster, target, spell, onDone, power) {
    const plan = this.galePlan(caster, target);
    if (!plan.land) return onDone();
    // 10.48 (Suleiman 21 Nov): the movement he has left when he cuts adds damage, like Gaha's Lunge: +1 a step
    // (spells.json galeCut bonusPerStep). Walking first makes the cut weaker.
    const bonus = this.galeBonus(caster);
    const results = plan.hits.map((f) => ({ f, r: this.kingStrike(caster, f, { share: spell.damageShare * power, bonus }) }));
    if (bonus > 0) this.floatText(caster, 'Gale +' + bonus, spell.color, { rise: 46 });
    const from = { col: caster.col, row: caster.row };
    const start = { x: caster.view.x, y: caster.view.y };
    caster.col = plan.land.col;
    caster.row = plan.land.row;
    caster.hasMoved = true;
    caster.stepsUsed = Infinity; // the dash is his move
    const end = tileToScreen(plan.land.col, plan.land.row);
    const dx = end.x - start.x, dy = end.y - start.y;
    this.faceToward(caster, dx, dy);
    if (this.hasPose(caster, 'gale')) this.showPose(caster, 'gale', dx); // his form's Gale Cut picture (art.json buffPoses)
    const fx = galeFx(this, caster);
    const rotation = dx < 0 ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
    play('whoosh');
    const n = plan.tiles.length;
    const dash = 120 + 70 * n;
    // one slash per tile of the path, from the tile he left to the tile he lands on, timed as he passes it
    const tiles = [from, ...plan.tiles];
    for (let i = 1; i < tiles.length; i++) {
      const a = tileToScreen(tiles[i - 1].col, tiles[i - 1].row), b = tileToScreen(tiles[i].col, tiles[i].row);
      const at = dash * Math.cbrt(i / n); // (the dash eases in: Cubic.easeIn reaches i/n at the cube root of the time)
      this.time.delayedCall(Math.max(0, at - 60), () => {
        sfxAt(this, fx, (a.x + b.x) / 2, (a.y + b.y) / 2 - caster.centerY * 0.6, { rotation, flip: dx < 0, depth: 90 });
      });
    }
    // each foe on the line is cut as he goes through it
    const hitAt = (f) => dash * Math.cbrt(Math.max(1, plan.tiles.findIndex((t) => t.col === f.col && t.row === f.row) + 1) / n);
    results.forEach(({ f, r }) => this.time.delayedCall(hitAt(f), () => this.showImpact(caster, f, r, dx, f.hp === 0)));
    this.tweens.add({
      targets: caster.view, x: end.x, y: end.y, duration: dash, ease: 'Cubic.easeIn',
      onUpdate: () => this.afterimage(caster),
      onComplete: () => {
        caster.view.setDepth(depthFor(caster.col, caster.row) + 1);
        this.time.delayedCall(700, () => caster.alive && this.showStanding(caster));
      },
    });
    this.kingFinish(onDone, Math.max(1500, dash + 900));
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
      const charging = this.units.some((g) => g.alive && g.side !== unit.side && g.channel && g.channel.spellId === 'singularity');
      const want = charging ? 'stone' : near.length ? 'fury' : 'swiftness';
      if (echo === want && active !== want) this.useFreeKingAction(unit, 'verseSwap');
    }
    // Aegis (10.46): always when a foe charges Singularity and someone of his is in its reach; otherwise
    // when he and an ally would both get it with a foe within 3 tiles of him
    if (this.aiReady(unit, 'bulwarkShield')) {
      const mine = this.shieldAllies(unit).filter((u) => !u.shield);
      const charging = this.units.some((g) => g.alive && g.side !== unit.side && g.channel && g.channel.spellId === 'singularity'
        && this.shieldAllies(unit).some((u) => distance(u, g) <= G.singularity.radius));
      const threat = seen.some((t) => distance(unit, t) <= 3);
      if ((charging && mine.length) || (mine.length >= 2 && threat)) return this.aiCast(unit, unit, 'bulwarkShield', finish);
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
    // Mantle: his Verse on allies in reach (3 tiles)
    if (this.aiReady(unit, 'mantle') && this.mantleAllies(unit).length) {
      return this.aiCast(unit, unit, 'mantle', finish);
    }
    // Drawn Blade to free an ally from a clash (10.49): the weakest ally first
    if (near.length && this.aiReady(unit, 'drawnBlade') && !unit.engagedWith) {
      const rescue = near.filter((t) => canBeCaught(t) && this.drawnFrees(unit, t)).sort((a, b) => a.engagedWith.hp / a.engagedWith.maxHp - b.engagedWith.hp / b.engagedWith.maxHp)[0];
      if (rescue) return this.aiCast(unit, rescue, 'drawnBlade', finish);
    }
    // Radiant Rift (10.52): with a magic buff to spend, at a foe he cannot reach with his blade this turn, or one it would finish
    if (this.aiReady(unit, 'radiantRift') && this.riftFuel(unit).length) {
      const rifts = this.kingTargets(unit, 'radiantRift').sort((a, b) => a.hp - b.hp);
      const killable = rifts.find((t) => this.riftDamage(unit, t) >= t.hp);
      const pick = killable || (!near.length ? rifts[0] : null);
      if (pick) return this.aiCast(unit, pick, 'radiantRift', finish);
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
