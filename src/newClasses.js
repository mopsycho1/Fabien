// Leol the Slinger (roadmap 19.1) and the Thief (19.2), built 22 Nov. Their numbers are in jobs.json and spells.json (every one
// picked by Claude where Suleiman's class framework gave none). These methods are mixed into BattleScene, like the kings' (Phase 10).
//
// LEOL: a sling (2 to 4 tiles) and a hammer (the next tile), the archer's free weapon switch (once a turn, never a second attack).
//   Smoke Pellet    a smoke cloud on himself or an ally up to 4 tiles away: Hidden until their next turn, foes next to them Blinded
//   Suppressive Fire Rabdul's ward at sling range ("mode": "sling" in spells.json; see BattleScene.wardTrigger)
//   Concussive Shot a full blow, 2 to 4 tiles; a hit breaks a prepared action (Singularity, an aim, a ward, a meditation)
//   Hammer Strike   a full blow and a 1 tile push; a push that moves the foe readies Prepared Defender (+15 to his next sling shot)
//   Barricade       stakes on an empty tile next to him; a wooden wall rises there at the start of his next turn (walls and shots
//                   stop at it) for 3 of his turns, or until foes break it (12 points)
// THIEF: Hide (end a turn without acting: Hidden until he attacks, uses Ambush, is hit or is spotted), Hidden Movement (+2 move)
//   Ambush (Hidden) 1.5 times a blow, defense -2, Bleeding (2 a turn for 3 turns; a healing item stops it); always reveals him
//   Trap (Hidden)   an explosive on an empty tile next to him; a foe that walks in takes 6 and is thrown 2 tiles; 2 at most
//   Detection       a foe standing on the highest ground of the map within 5 tiles, in clear sight, spots a Hidden Thief
import Phaser from 'phaser';
import spells from './data/spells.json';
import jobs from './data/jobs.json';
import { tileToScreen, isInsideGrid, getHeight, depthFor } from './grid.js';
import { GRID_SIZE } from './config.js';
import { getHitChance, getDamage, distance, hasClearShot } from './combat.js';
import { applyBlinded, applyPoison, applyExposed, cooldownOf, canAfford } from './status.js';
import { smokeCloud } from './smokeArt.js';
import { dustPuff, screenShake } from './effects.js';
import { sfxHas, sfxAt } from './spellArt.js';
import { play } from './audio.js';
import { endDuel } from './engagement.js';

export const NEW_KINDS = ['smokePellet', 'concussive', 'hammerStrike', 'barricade', 'ambush', 'trap'];
export const NEW_TILE_KINDS = ['barricade', 'trap'];
const passive = (u, k) => (jobs[u.job] && jobs[u.job].passives && jobs[u.job].passives[k]) || 0;

// A sling stone: a small dark stone on a low arc, from (x0, y0) to (x1, y1), then onHit.
export function slingStone(scene, x0, y0, x1, y1, onHit) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const ms = Math.max(140, Math.min(320, dist * 0.9));
  const stone = scene.add.circle(x0, y0, 4, 0x3a3128).setStrokeStyle(1.5, 0xd9c49a).setDepth(95);
  const t = { p: 0 };
  scene.tweens.add({
    targets: t, p: 1, duration: ms, ease: 'Linear',
    onUpdate: () => { stone.setPosition(x0 + (x1 - x0) * t.p, y0 + (y1 - y0) * t.p - Math.sin(Math.PI * t.p) * Math.min(40, dist * 0.12)); },
    onComplete: () => { stone.destroy(); if (onHit) onHit(); },
  });
  return ms;
}

export const newClassMethods = {
  // ---------- availability ----------
  // Why a new-class skill cannot be used now (shown on the button), or null.
  newBlock(unit, id) {
    const spell = spells[id];
    if (!spell || !NEW_KINDS.includes(spell.kind)) return null;
    if (spell.hiddenOnly && !unit.hidden) return 'needs Hidden';
    if (spell.kind === 'trap' && !this.freeTilesNear(unit).length) return 'no room';
    if (spell.kind === 'barricade' && !this.freeTilesNear(unit).length) return 'no room';
    return null;
  },
  // Empty tiles next to a unit (for a barricade or a trap).
  freeTilesNear(unit) {
    const out = [];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = unit.col + dc, r = unit.row + dr;
      if (isInsideGrid(c, r) && !this.isBlocked(c, r) && !this.trapAt(c, r) && !(this.pendingBarricades || []).some((b) => b.col === c && b.row === r)) out.push({ col: c, row: r });
    }
    return out;
  },

  // ---------- castSpell hands their skills here ----------
  castNewSkill(caster, target, id, onDone) {
    const spell = spells[id];
    switch (spell.kind) {
      case 'smokePellet': return this.castSmokePellet(caster, target, spell, onDone);
      case 'concussive': return this.castConcussive(caster, target, spell, onDone);
      case 'hammerStrike': return this.castHammerStrike(caster, target, spell, onDone);
      case 'barricade': return this.castBarricade(caster, target, spell, onDone);
      case 'ambush': return this.castAmbush(caster, target, spell, onDone);
      case 'trap': return this.castTrap(caster, target, spell, onDone);
      default: return onDone();
    }
  },

  // ---------- Leol ----------
  // His weapon for a skill: a sling skill takes the sling, a hammer skill the hammer (the switch is part of the skill's action).
  takeWeapon(unit, close) {
    if (!unit.closeWeapon) return;
    const want = close ? 'dagger' : 'bow';
    if (unit.weapon !== want) { unit.weapon = want; this.floatText(unit, close ? unit.closeWeapon.name : unit.closeWeapon.farName, '#e8d5a8'); }
  },
  // A sling shot's chance, with Prepared Defender after a hammer push (+15, used up by the shot).
  slingChance(unit, target) {
    const bonus = unit.prepared ? passive(unit, 'preparedDefender') : 0;
    unit.prepared = false;
    return Math.min(100, getHitChance(unit, target) + bonus);
  },
  castSmokePellet(caster, target, spell, onDone) {
    this.takeWeapon(caster, false);
    const dx = target.view.x - caster.view.x || 1;
    this.faceToward(caster, dx, target.view.y - caster.view.y);
    this.showPose(caster, 'attack', dx);
    play('whoosh');
    const from = this.centerOf(caster), to = { x: target.view.x, y: target.view.y - 10 };
    const ms = target === caster ? 0 : slingStone(this, from.x, from.y, to.x, to.y);
    this.time.delayedCall(ms + 40, () => {
      play('crash');
      dustPuff(this, target.view.x, target.view.y);
      const cloud = smokeCloud(this, target.view.x, target.view.y, depthFor(target.col, target.row) + 2);
      this.smokes.push({ owner: target, col: target.col, row: target.row, cloud });
      target.hidden = true;
      target.smokeHidden = true; // the cloud blows away at the start of its next turn (wakeSmoke)
      this.hiddenLook(target, true);
      this.tweens.add({ targets: target.view, alpha: this.hiddenAlpha(target), duration: 220 });
      this.floatText(target, 'Hidden', spell.color, { rise: 30 });
      for (const foe of this.units.filter((u) => u.alive && u.side !== caster.side && !u.hidden && distance(u, target) === 1)) {
        applyBlinded(foe, this.activeUnit === foe);
        this.floatText(foe, 'Blinded', '#e0d8cc', { pop: true });
        this.interrupt(foe);
      }
      this.refreshStatusTags();
    });
    this.time.delayedCall(ms + 700, () => { if (caster.alive) this.showStanding(caster); onDone(); });
  },
  castConcussive(caster, target, spell, onDone) {
    this.takeWeapon(caster, false);
    const hit = Math.random() * 100 < this.slingChance(caster, target);
    let damage = 0, note = null;
    if (hit) {
      const landed = this.landHit(target, Math.max(1, Math.round(getDamage(caster, target) * (spell.damageShare || 1))));
      damage = landed.damage; note = landed.note;
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) this.defeat(target);
    }
    const broke = hit && target.alive ? this.breakPrepared(target) : null;
    const dx = target.view.x - caster.view.x;
    this.faceToward(caster, dx, target.view.y - caster.view.y);
    this.showPose(caster, 'attack', dx);
    play('whoosh');
    const from = this.centerOf(caster), to = this.centerOf(target);
    const ms = slingStone(this, from.x, from.y, to.x, to.y, () => {
      this.showImpact(caster, target, { hit, damage, note }, dx, target.hp === 0);
      if (hit) { screenShake(this, 0.006, 140); if (sfxHas(this, 'lunge_impact')) sfxAt(this, 'lunge_impact', target.view.x, target.view.y + 4, { size: 0.7 }); }
      if (broke) this.time.delayedCall(260, () => target.alive && this.floatText(target, broke, '#f2d38a', { rise: 52 }));
    });
    this.newFinish(onDone, ms + 800, caster);
  },
  // Breaks what a unit was preparing: Singularity's charge, an aim, a meditation, a ward. Returns the word to show, or null.
  breakPrepared(unit) {
    if (unit.channel) { this.breakChannel(unit, 'Broken'); return 'Concussed!'; }
    if (unit.zone && unit.zone.charges > 0) { unit.zone = null; this.clearZoneMark(unit); return 'Ward broken'; }
    if (unit.meditating || unit.aiming) { this.interrupt(unit); return 'Concussed!'; }
    return null;
  },
  castHammerStrike(caster, target, spell, onDone) {
    this.takeWeapon(caster, true);
    const hit = Math.random() * 100 < getHitChance(caster, target);
    let damage = 0, note = null, pushed = null;
    if (hit) {
      const landed = this.landHit(target, Math.max(1, Math.round(getDamage(caster, target) * (spell.damageShare || 1))));
      damage = landed.damage; note = landed.note;
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) this.defeat(target);
      else {
        pushed = this.pushLoser(target, caster, spell.push || 1);
        if (target.engagedWith && distance(target, target.engagedWith) > 1) endDuel(target);
      }
    }
    if (pushed && (pushed.path.length || pushed.fall)) caster.prepared = true; // Prepared Defender: his next sling shot
    const dx = target.view.x - caster.view.x;
    this.faceToward(caster, dx, target.view.y - caster.view.y);
    if (this.hasPose(caster, 'hammerRaise')) this.showPose(caster, 'hammerRaise', dx);
    play('whoosh');
    this.time.delayedCall(240, () => {
      this.showPose(caster, this.hasPose(caster, 'hammerStrike') ? 'hammerStrike' : 'attack', dx);
      this.showImpact(caster, target, { hit, damage, note }, dx, target.hp === 0);
      if (pushed && (pushed.path.length || pushed.fall)) this.time.delayedCall(160, () => this.knockBack(target, pushed, dx));
      if (caster.prepared) this.time.delayedCall(500, () => caster.alive && this.floatText(caster, 'Prepared', '#e8c88a', { rise: 40 }));
    });
    this.newFinish(onDone, 1200, caster);
  },
  castBarricade(caster, tile, spell, onDone) {
    this.takeWeapon(caster, true);
    const at = tileToScreen(tile.col, tile.row);
    this.faceToward(caster, at.x - caster.view.x, at.y - caster.view.y);
    this.pendingBarricades = this.pendingBarricades || [];
    // the stakes go in now; the wall rises at the start of his next turn (tickNewClasses)
    const stakes = this.add.graphics().setDepth(depthFor(tile.col, tile.row) + 0.4);
    stakes.lineStyle(3, 0x8a5a2a, 0.9);
    for (const o of [-14, -5, 5, 14]) stakes.lineBetween(at.x + o, at.y - 4 + Math.abs(o) * 0.25, at.x + o, at.y - 14 + Math.abs(o) * 0.25);
    this.boardObjects.push(stakes);
    this.pendingBarricades.push({ col: tile.col, row: tile.row, owner: caster, stakes });
    if (this.hasPose(caster, 'hammerRaise')) this.showPose(caster, 'hammerRaise', at.x - caster.view.x);
    this.time.delayedCall(260, () => { play('bash'); dustPuff(this, at.x, at.y); if (this.hasPose(caster, 'hammerStrike')) this.showPose(caster, 'hammerStrike', at.x - caster.view.x); });
    this.floatText(caster, 'Barricade next turn', spell.color, { rise: 30 });
    caster.stepsUsed = Infinity; caster.hasMoved = true;
    this.time.delayedCall(900, () => { if (caster.alive) this.showStanding(caster); onDone(); });
  },
  // The start of a unit's turn: its barricade rises (Leol); a foe on the highest ground spots a Hidden Thief.
  tickNewClasses(unit) {
    for (const b of (this.pendingBarricades || []).filter((x) => x.owner === unit)) {
      this.pendingBarricades = this.pendingBarricades.filter((x) => x !== b);
      if (b.stakes) b.stakes.destroy();
      if (this.isBlocked(b.col, b.row) || !unit.alive) continue; // someone stands there now: no wall
      this.raiseBarricade(b.col, b.row, unit);
    }
    this.detectThieves(unit);
  },
  raiseBarricade(col, row, owner) {
    const spell = spells.barricade;
    const p = tileToScreen(col, row);
    // two views of the wall (art.json h6 "props"): its face turned to the side it was put on
    const side = owner && owner.col !== col ? 1 : 2;
    const k = 'h6:leol_barricade_' + side + '.png';
    const key = this.textures.exists(k) ? k : null;
    let view;
    if (key) {
      view = this.add.image(p.x, p.y + 6, key).setOrigin(0.5, 0.92).setDepth(depthFor(col, row) + 1.2);
      view.setScale((86) / view.width);
    } else view = this.add.rectangle(p.x, p.y - 14, 60, 28, 0x8a5a2a).setDepth(depthFor(col, row) + 1.2);
    view.setScale(view.scaleX, 0.05 * view.scaleY);
    this.tweens.add({ targets: view, scaleY: view.scaleX, duration: 260, ease: 'Back.easeOut' });
    play('bash'); dustPuff(this, p.x, p.y); screenShake(this, 0.004, 120);
    this.spikes.push({ col, row, owner, turnsLeft: spell.turns, view, barricade: true, hp: spell.hp });
    this.floatText(owner, 'Barricade up', spell.color, { rise: 30 });
  },
  // A foe with nobody to attack strikes a barricade next to it (12 points); at 0 it falls.
  hitBarricade(unit, done) {
    const b = this.spikes.find((s) => s.barricade && s.owner && s.owner.side !== unit.side && distance(unit, s) === 1);
    if (!b) return false;
    const dmg = Math.max(1, unit.attack);
    b.hp -= dmg;
    const p = tileToScreen(b.col, b.row);
    this.faceToward(unit, p.x - unit.view.x, p.y - unit.view.y);
    this.showPose(unit, 'attack', p.x - unit.view.x);
    play('bash'); dustPuff(this, p.x, p.y);
    const t = this.add.text(p.x, p.y - 50, '-' + dmg, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#ffd9a0', stroke: '#1a1410', strokeThickness: 4 }).setOrigin(0.5).setDepth(400);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    if (b.hp <= 0) this.time.delayedCall(250, () => this.removeSpike(b));
    this.time.delayedCall(700, () => { if (unit.alive) this.showStanding(unit); done(); });
    return true;
  },

  // ---------- the Thief ----------
  hideThief(unit, why = 'Hidden') {
    if (!unit.alive || unit.hidden) return;
    unit.hidden = true;
    unit.thiefHidden = true;
    this.hiddenLook(unit, true);
    if (unit.view) this.tweens.add({ targets: unit.view, alpha: this.hiddenAlpha(unit), duration: 260 });
    this.floatText(unit, why, '#c9a6ff', { rise: 30 });
    this.refreshStatusTags();
  },
  revealThief(unit, why = null) {
    if (!unit.thiefHidden) return;
    unit.thiefHidden = false;
    unit.hidden = false;
    this.hiddenLook(unit, false);
    if (unit.view && unit.alive) this.tweens.add({ targets: unit.view, alpha: 1, duration: 220 });
    if (why) this.floatText(unit, why, '#ffb0a0', { rise: 46 });
    this.refreshStatusTags();
  },
  // A turn ends: a Thief that did not act hides (Hide, 19.2).
  thiefEndsTurn(unit) {
    if (!unit || !passive(unit, 'hide') || !unit.alive || unit.hasActed || unit.engagedWith || unit.hidden) return;
    this.hideThief(unit);
  },
  // Detection: the unit whose turn starts, on the highest ground of the map, spots a Hidden Thief of the other side within 5 tiles.
  detectThieves(unit) {
    if (!unit || !unit.alive) return;
    if (this.highest === undefined) {
      let h = 0;
      for (let c = 0; c < GRID_SIZE; c++) for (let r = 0; r < GRID_SIZE; r++) h = Math.max(h, getHeight(c, r));
      this.highest = h;
    }
    if (getHeight(unit.col, unit.row) < this.highest) return;
    for (const t of this.units) {
      if (!t.alive || !t.thiefHidden || t.side === unit.side) continue;
      if (distance(unit, t) <= passive(t, 'detection') && hasClearShot(unit, t)) this.revealThief(t, 'Spotted!');
    }
  },
  castAmbush(caster, target, spell, onDone) {
    const hit = Math.random() * 100 < Math.min(100, getHitChance(caster, target) + 10); // from hiding: +10 to hit
    let damage = 0, note = null;
    if (hit) {
      const landed = this.landHit(target, Math.max(1, Math.round(getDamage(caster, target) * spell.damageShare)));
      damage = landed.damage; note = landed.note;
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) this.defeat(target);
      else {
        applyExposed(target, { defense: spell.weaken.defense, evade: 0 }); // Armor Weakening
        target.bleedBlocked = !applyPoison(target, 'ambush'); // Bleeding (status.poison with the Ambush's numbers; tagged BLEEDING); Aegis blocks it (1.104)
      }
    }
    const dx = target.view.x - caster.view.x;
    this.faceToward(caster, dx, target.view.y - caster.view.y);
    this.revealThief(caster); // Ambush always reveals him, hit or miss
    if (this.hasPose(caster, 'ambush')) this.showPose(caster, 'ambush', dx);
    play('whoosh');
    this.time.delayedCall(260, () => {
      this.showPose(caster, 'attack', dx);
      this.showImpact(caster, target, { hit, damage, note }, dx, target.hp === 0);
      if (hit && target.alive) this.time.delayedCall(300, () => target.alive && this.floatText(target, target.bleedBlocked ? 'Armour weakened' : 'Bleeding, armour weakened', '#ff7a7a', { rise: 52 }));
    });
    this.newFinish(onDone, 1200, caster);
  },
  trapAt(col, row) {
    return (this.traps || []).find((t) => t.col === col && t.row === row) || null;
  },
  castTrap(caster, tile, spell, onDone) {
    this.traps = this.traps || [];
    const mine = this.traps.filter((t) => t.owner === caster);
    if (mine.length >= spell.max) this.removeTrap(mine[0]); // two at most: the oldest goes
    const p = tileToScreen(tile.col, tile.row);
    this.faceToward(caster, p.x - caster.view.x, p.y - caster.view.y);
    if (this.hasPose(caster, 'trap')) this.showPose(caster, 'trap', p.x - caster.view.x);
    play('select');
    // only the Thief's own side sees where it is (a foe walks into it unaware)
    const view = this.add.graphics().setDepth(depthFor(tile.col, tile.row) + 0.3);
    view.fillStyle(0x2a1d12, 0.85).fillCircle(0, 0, 7).lineStyle(2, 0xe07a3a, 0.9).strokeCircle(0, 0, 7).fillStyle(0xe07a3a, 1).fillCircle(0, -1, 2);
    view.setPosition(p.x, p.y);
    view.setVisible(caster.side === 'hero');
    this.boardObjects.push(view);
    this.traps.push({ col: tile.col, row: tile.row, owner: caster, view });
    caster.stepsUsed = Infinity; caster.hasMoved = true; // he stays put this turn
    this.time.delayedCall(700, () => { if (caster.alive) this.showStanding(caster); onDone(); });
  },
  removeTrap(trap) {
    this.traps = (this.traps || []).filter((t) => t !== trap);
    if (trap.view) trap.view.destroy();
  },
  // A foe walked onto a trap: 6 damage, thrown 2 tiles back the way it came. done(stopped).
  trapReaction(trap, walker, prev, done) {
    const spell = spells.trap;
    this.removeTrap(trap);
    const p = tileToScreen(trap.col, trap.row);
    play('crash'); screenShake(this, 0.01, 260);
    if (sfxHas(this, 'trap_burst')) sfxAt(this, 'trap_burst', p.x, p.y + 6, { size: 1.2, depth: depthFor(trap.col, trap.row) + 2 });
    else dustPuff(this, p.x, p.y);
    const landed = this.landHit(walker, spell.damage);
    walker.hp = Math.max(0, walker.hp - landed.damage);
    let pushed = null;
    if (walker.hp === 0) this.defeat(walker);
    else {
      // thrown back the way it came: pushed away from the tile beyond the trap
      const ahead = { col: 2 * trap.col - prev.col, row: 2 * trap.row - prev.row };
      pushed = this.pushLoser(walker, ahead, spell.push);
      if (walker.engagedWith && distance(walker, walker.engagedWith) > 1) endDuel(walker);
    }
    this.time.delayedCall(180, () => {
      this.showImpact({ attackEffect: 'spark', attackType: 'physical', id: 'trap', side: trap.owner ? trap.owner.side : 'enemy' }, walker, { hit: true, damage: landed.damage, note: landed.note }, 1, walker.hp === 0);
      this.floatText(walker, 'Trap!', spell.color, { pop: true });
      if (pushed && (pushed.path.length || pushed.fall)) this.time.delayedCall(200, () => this.knockBack(walker, pushed, walker.view.x - p.x || 1));
    });
    if (walker.alive) walker.stepsUsed = Infinity; // its walk ends here
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshStatusTags();
    this.time.delayedCall(1100, () => {
      if (outcome) { this.busy = false; this.showResult(outcome); return; }
      done(true);
    });
  },

  // Ends a skill: checks the battle, waits, then carries on (or shows the result).
  newFinish(onDone, wait = 900, caster = null) {
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();
    this.refreshStatusTags();
    this.time.delayedCall(wait, () => {
      if (caster) this.backToStance(caster); // back to his stance once the blow is done (26 Nov: Leol stayed frozen in it)
      if (outcome) { this.busy = false; this.showResult(outcome); } else onDone();
    });
  },

  // ---------- their AI (either side: the enemy turn calls this; returns { id, target } or { wait: true } or null) ----------
  newClassChoice(unit, seen) {
    const foes = seen.filter((t) => t.alive && !t.isDecoy && t.side !== unit.side && !t.hidden);
    const ready = (id) => unit.spells.includes(id) && canAfford(unit, id) && !cooldownOf(unit, id) && !this.newBlock(unit, id);
    if (unit.job === 'slinger') {
      const near = foes.filter((t) => distance(unit, t) === 1);
      if (near.length && ready('hammerStrike')) return { id: 'hammerStrike', target: [...near].sort((a, b) => a.hp - b.hp)[0] };
      const reach = foes.filter((t) => distance(unit, t) >= 2 && distance(unit, t) <= spells.concussiveShot.range && hasClearShot(unit, t));
      const preparing = reach.find((t) => t.channel || t.aiming || t.meditating || (t.zone && t.zone.charges > 0));
      // (26 Nov, bot battles: he only ever used the hammer) a foe preparing something first; otherwise the weakest in reach
      if (reach.length && ready('concussiveShot')) return { id: 'concussiveShot', target: preparing || [...reach].sort((a, b) => a.hp - b.hp)[0] };
      const allies = this.units.filter((a) => a.alive && a.side === unit.side && !a.hidden && distance(unit, a) <= spells.smokePellet.range);
      const pressed = allies.find((a) => a.hp / a.maxHp < 0.4 && foes.some((f) => distance(f, a) === 1));
      if (pressed && ready('smokePellet')) return { id: 'smokePellet', target: pressed };
      if (!near.length && !reach.length && foes.some((t) => distance(unit, t) <= 7) && ready('suppressiveFire') && !unit.zone) return { id: 'suppressiveFire', target: unit };
      if (near.length && ready('barricade') && unit.hp / unit.maxHp < 0.5) { const tiles = this.freeTilesNear(unit); if (tiles.length) return { id: 'barricade', target: tiles[0] }; }
      return null;
    }
    if (unit.job === 'infiltrator') {
      const near = foes.filter((t) => distance(unit, t) === 1);
      // a mage hunter: casters and archers first
      const order = (t) => (t.maxMp > 0 || t.attackEffect === 'arrow' || t.attackEffect === 'spark' ? 0 : 1) * 1000 + t.hp;
      if (unit.hidden && near.length && ready('ambush')) return { id: 'ambush', target: [...near].sort((a, b) => order(a) - order(b))[0] };
      if (unit.hidden && !near.length && ready('trap') && foes.some((t) => distance(unit, t) <= 4)) {
        const tiles = this.freeTilesNear(unit);
        const best = tiles.sort((a, b) => Math.min(...foes.map((f) => distance(a, f))) - Math.min(...foes.map((f) => distance(b, f))))[0];
        if (best) return { id: 'trap', target: best };
      }
      if (!unit.hidden && !near.some((t) => getDamage(unit, t) >= t.hp)) return { wait: true }; // stay out of sight: hide
      return null;
    }
    return null;
  },
};
