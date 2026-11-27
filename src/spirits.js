// Kofi's spirits (roadmap 13.72, 6.38, 6.49; decided by Baiyee 27 Nov) and the ground's elements that Alagara's Claim
// also draws on. These are methods of the battle scene (BattleScene.js adds them with Object.assign), like the kings'.
//
// CALL SPIRIT (it replaces Kofi's Infuse): he picks an empty tile up to 3 away and the ground there picks the spirit:
//   by a lamp (the lamp's own tile or next to it)  -> the Ember Spirit (fire)
//   a water tile                                  -> the Tide Spirit (water)
//   a sand or rubble tile                         -> the Stone Spirit (earth)
//   high ground (2 levels up or more)             -> the Gale Spirit (storm)
//   plain floor                                   -> the spirit of what Kofi reads (his Reading, jobs.json)
// The spirit is a small ally standing on that tile (it blocks it). It has ONE move, used when it comes and again at the
// start of each of Kofi's next turns, while it lasts (spells.json callSpirit "turns", counting the first). It fades
// after that, when a foe breaks it (its "hp"), or when Kofi falls. One spirit at a time: a new one sends the old away.
// SPIRIT SWAP (6.49): free, once a turn, Kofi and his spirit trade places (not while he is locked in a clash).
// Every number is in spells.json callSpirit "spirits" (picked by Claude, 27 Nov; Suleiman's sheet gives none).
import Phaser from 'phaser';
import spells from './data/spells.json';
import { tileToScreen, getHeight, depthFor } from './grid.js';
import { GRID_SIZE } from './config.js';
import { distance } from './combat.js';
import { applyBurn, isDrenched, canAfford } from './status.js';
import { terrainAt } from './boardArt.js';
import { floorLight, lightNearby, chargeUp, afterglow, energyWaves } from './fxLayers.js';
import { buffCastFx, sfxHas, sfxAt } from './spellArt.js';
import { play } from './audio.js';
import { screenShake } from './effects.js';
import { endDuel } from './engagement.js';

export const CALL = spells.callSpirit;
export const SPIRITS = CALL.spirits;
// element -> spirit, and spirit -> element
export const SPIRIT_OF = { fire: 'ember', water: 'tide', earth: 'stone', storm: 'gale' };
const READ_TO = { fire: 'fire', water: 'water', earth: 'earth', storm: 'storm' };
let mapData = null;
export function setSpiritMap(map) { mapData = map; }

export const spiritMethods = {
  // ---------- the ground ----------
  // The element a tile holds, or null for plain floor: by a lamp fire, water water, sand or rubble earth, high ground storm.
  // (Kofi's Call Spirit and Alagara's Claim from nature both read the ground this way, 13.72.)
  natureAt(tile) {
    const map = mapData || this.mapData || null;
    if (!map) return null;
    if ((map.lamps || []).some(([c, r]) => Math.abs(c - tile.col) + Math.abs(r - tile.row) <= 1)) return 'fire';
    const ground = terrainAt(map, tile.col, tile.row);
    if (ground === 'water') return 'water';
    if (ground === 'caveSand' || ground === 'rubble' || ground === 'sand') return 'earth';
    if (getHeight(tile.col, tile.row) >= 2) return 'storm';
    return null;
  },
  // Which spirit Call Spirit would raise on this tile.
  spiritKindAt(unit, tile) {
    const el = this.natureAt(tile) || READ_TO[this.reading(unit).element] || 'water';
    return SPIRIT_OF[el];
  },

  // ---------- where, and can he ----------
  spiritAt(col, row) {
    return (this.spirits || []).find((s) => s.col === col && s.row === row) || null;
  },
  spiritOf(owner) {
    return (this.spirits || []).find((s) => s.owner === owner) || null;
  },
  spiritTiles(unit) {
    const out = [];
    const r = CALL.range;
    for (let c = unit.col - r; c <= unit.col + r; c++) {
      for (let w = unit.row - r; w <= unit.row + r; w++) {
        const d = Math.abs(c - unit.col) + Math.abs(w - unit.row);
        if (d < 1 || d > r || c < 0 || w < 0 || c >= GRID_SIZE || w >= GRID_SIZE) continue;
        if (this.isBlocked(c, w) || (this.trapAt && this.trapAt(c, w))) continue;
        out.push({ col: c, row: w });
      }
    }
    return out;
  },
  // Why Call Spirit or Spirit Swap cannot be used now, or null.
  spiritBlock(unit, id) {
    const spell = spells[id];
    if (!spell) return null;
    if (spell.kind === 'callSpirit' && !this.spiritTiles(unit).length) return 'no room';
    if (spell.kind === 'spiritSwap') {
      if (!this.spiritOf(unit)) return 'no spirit out';
      if (unit.spiritSwapped) return 'once a turn';
      if (unit.engagedWith) return 'in a clash';
    }
    return null;
  },

  // ---------- Call Spirit ----------
  castCallSpirit(caster, tile, spell, onDone) {
    const kind = this.spiritKindAt(caster, tile);
    const S = SPIRITS[kind];
    const old = this.spiritOf(caster);
    if (old) this.removeSpirit(old, 'Gone back');
    const p = tileToScreen(tile.col, tile.row);
    const dx = p.x - caster.view.x || 1;
    this.faceToward(caster, dx, p.y - caster.view.y);
    this.showPose(caster, 'chant', dx);
    const tone = { ember: 'fire', tide: 'water', stone: 'earth', gale: 'lightning' }[kind];
    chargeUp(this, caster.view.x + Math.sign(dx) * 12, caster.view.y - caster.topY * 0.7, tone, { ms: 420, size: 0.9, depth: caster.view.depth + 2 });
    play('select');
    this.time.delayedCall(420, () => {
      if (!caster.alive) return;
      this.showPose(caster, 'cast', dx);
      play('spell');
      const sp = this.addSpirit(caster, kind, tile);
      this.floatText({ view: sp.view, topY: sp.h }, S.name, S.color, { pop: true });
      this.time.delayedCall(500, () => this.spiritMove(sp, () => {}));
    });
    this.time.delayedCall(1700, () => {
      if (caster.alive) this.showStanding(caster);
      const outcome = this.checkBattleEnd();
      if (outcome) { this.battleOver = true; this.busy = false; this.showResult(outcome); return; }
      onDone();
    });
  },

  // Draws a spirit on its tile: its own picture (Suleiman's four, art.json sp_*), small, hovering, facing the foes.
  addSpirit(owner, kind, tile) {
    this.spirits = this.spirits || [];
    const S = SPIRITS[kind];
    const id = 'sp_' + kind;
    const p = tileToScreen(tile.col, tile.row);
    const view = this.add.container(p.x, p.y).setDepth(depthFor(tile.col, tile.row) + 1);
    const shadow = this.add.ellipse(0, 2, 40, 16, 0x000000, 0.28);
    const ring = this.add.ellipse(0, 2, 50, 22).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(S.color).color, 0.8);
    view.add([shadow, ring]);
    const h = Math.round((owner.topY || 110) * CALL.size); // small: a share of Kofi's height
    const facing = this.spiritFacing(owner, tile);
    const key = id + ':' + id + '_f' + ({ downLeft: 1, upRight: 2, downRight: 3, upLeft: 4 }[facing]) + '.png';
    let body;
    if (this.textures.exists(key)) {
      body = this.add.image(0, 0, key).setOrigin(0.5, 1);
      body.setScale(h / body.height);
    } else {
      body = this.add.circle(0, -h / 2, h / 3, Phaser.Display.Color.HexStringToColor(S.color).color, 0.85);
    }
    view.add(body);
    // it hovers (the picture already floats above its bottom edge) and breathes
    this.tweens.add({ targets: body, y: body.y - 5, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    view.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: view, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
    floorLight(this, p.x, p.y, Phaser.Display.Color.HexStringToColor(S.color).color, { size: 1.4, peak: 0.7, ms: 700 });
    energyWaves(this, p.x, p.y, Phaser.Display.Color.HexStringToColor(S.color).color, { count: 2, size: 0.8 });
    const sp = { kind, owner, col: tile.col, row: tile.row, hp: S.hp, maxHp: S.hp, movesLeft: CALL.turns, view, body, h, side: owner.side };
    this.spirits.push(sp);
    owner.spiritOut = sp; // (Kofi's card shows it, status.js)
    this.refreshStatusTags();
    return sp;
  },
  // The spirit's view of the nearest foe (its four pictures: downLeft, upRight, downRight, upLeft).
  spiritFacing(owner, tile) {
    const foes = this.units.filter((u) => u.alive && u.side !== owner.side && !u.hidden);
    const f = foes.sort((a, b) => distance(a, tile) - distance(b, tile))[0];
    if (!f) return 'downLeft';
    const a = tileToScreen(tile.col, tile.row), b = tileToScreen(f.col, f.row);
    return (b.y >= a.y ? 'down' : 'up') + (b.x < a.x ? 'Left' : 'Right');
  },

  // Its one move. Ember Lash, Tide Mend, Stone Ward, Gale Burst (numbers in spells.json callSpirit.spirits).
  spiritMove(sp, done) {
    if (!this.spirits.includes(sp) || this.battleOver) return done();
    const S = SPIRITS[sp.kind];
    sp.movesLeft -= 1;
    const color = Phaser.Display.Color.HexStringToColor(S.color).color;
    const at = { x: sp.view.x, y: sp.view.y };
    const foes = this.units.filter((u) => u.alive && u.side !== sp.side && !u.isDecoy && distance(u, sp) === 1);
    const friends = this.units.filter((u) => u.alive && u.side === sp.side && !u.isDecoy && distance(u, sp) <= 1);
    this.tweens.add({ targets: sp.body, scale: sp.body.scale * 1.15, duration: 160, yoyo: true });
    floorLight(this, at.x, at.y, color, { size: 1.8, peak: 0.75, ms: 650 });
    lightNearby(this, at.x, at.y - sp.h / 2, color, { radius: 120, peak: 0.6, ms: 500 });
    this.floatText({ view: sp.view, topY: sp.h }, S.move, S.color, { rise: 20 });
    if (sp.kind === 'ember') {
      play('fire');
      for (const f of foes) {
        const landed = this.landHit(f, S.damage);
        f.hp = Math.max(0, f.hp - landed.damage);
        this.updateHpBar(f);
        afterglow(this, f.view.x, f.view.y - 8, 'fire', { level: 3, depth: f.view.depth + 2 });
        this.floatText(f, '-' + landed.damage, '#ff8a3c', { pop: true });
        if (f.hp === 0) this.defeat(f);
        else if (!isDrenched(f) && applyBurn(f, 'spiritBoltFire')) this.time.delayedCall(300, () => f.alive && this.floatText(f, 'Burning!', '#ff8a3c', { rise: 46 }));
      }
    } else if (sp.kind === 'tide') {
      play('heal');
      for (const a of friends) {
        const before = a.hp;
        a.hp = Math.min(a.maxHp, a.hp + S.heal);
        const st = a.status || {};
        let cured = null;
        if (st.poison) { st.poison = null; cured = 'poison'; } else if (st.burn) { st.burn = null; cured = 'burn'; }
        else if (st.blinded) { st.blinded = null; cured = 'blinded'; } else if (st.disoriented) { st.disoriented = null; cured = 'disoriented'; }
        this.updateHpBar(a);
        buffCastFx(this, a.view.x, a.view.y, 'renewal', a);
        if (a.hp > before) this.floatText(a, '+' + (a.hp - before), '#7fd6c4', { pop: true });
        if (cured) this.time.delayedCall(350, () => a.alive && this.floatText(a, 'Cured', '#9fdc6a', { rise: 46 }));
      }
    } else if (sp.kind === 'stone') {
      play('bash');
      screenShake(this, 0.003, 120);
      for (const a of friends.filter((u) => u.view)) floorLight(this, a.view.x, a.view.y, color, { size: 1, peak: 0.5, ms: 500 });
    } else if (sp.kind === 'gale') {
      play('whoosh');
      for (const f of foes) {
        const landed = this.landHit(f, S.damage);
        f.hp = Math.max(0, f.hp - landed.damage);
        this.updateHpBar(f);
        this.floatText(f, '-' + landed.damage, '#bfd8ff', { pop: true });
        if (f.hp === 0) { this.defeat(f); continue; }
        const pushed = this.pushLoser(f, sp, S.push);
        if (f.engagedWith && distance(f, f.engagedWith) > 1) endDuel(f);
        if (pushed && (pushed.path.length || pushed.fall)) this.time.delayedCall(150, () => this.knockBack(f, pushed, f.view.x - at.x || 1, { text: 'Blown back!', color: S.color }));
      }
      this.refreshEngagementMarks();
    }
    this.refreshStatusTags();
    const outcome = this.checkBattleEnd();
    if (outcome) { this.battleOver = true; this.time.delayedCall(700, () => { this.busy = false; this.showResult(outcome); }); return; }
    this.time.delayedCall(700, done);
  },

  // The start of a unit's turn: its spirit uses its move again, or fades when it has none left.
  tickSpirits(unit) {
    const sp = this.spiritOf(unit);
    unit.spiritSwapped = false;
    if (!sp) return;
    if (sp.movesLeft <= 0) { this.removeSpirit(sp, 'Fades'); return; }
    this.spiritMove(sp, () => { if (sp.movesLeft <= 0 && this.spirits.includes(sp)) this.removeSpirit(sp, 'Fades'); });
  },

  removeSpirit(sp, why = null) {
    if (!this.spirits || !this.spirits.includes(sp)) return;
    this.spirits = this.spirits.filter((s) => s !== sp);
    if (sp.owner && sp.owner.spiritOut === sp) sp.owner.spiritOut = null;
    if (why && sp.view && sp.view.active) this.floatText({ view: sp.view, topY: sp.h }, why, SPIRITS[sp.kind].color, { rise: 20 });
    const view = sp.view;
    if (view && view.active) this.tweens.add({ targets: view, alpha: 0, scale: 0.3, duration: 350, onComplete: () => view.destroy() });
    this.refreshStatusTags();
  },
  // Kofi fell: his spirit goes with him.
  spiritsFall(owner) {
    for (const sp of (this.spirits || []).filter((s) => s.owner === owner)) this.removeSpirit(sp, 'Gone');
  },

  // The Stone Spirit's ward: an ally next to it takes 2 less from each hit (never below 1). Returns the 2, or 0.
  stoneGuard(target) {
    if (!target || !this.spirits) return 0;
    const sp = this.spirits.find((s) => s.kind === 'stone' && s.side === target.side && distance(s, target) <= 1);
    return sp ? SPIRITS.stone.guard : 0;
  },

  // A foe with nobody to attack strikes a spirit next to it (like Leol's barricade, 19.1). At 0 it breaks.
  hitSpirit(unit, done) {
    const sp = (this.spirits || []).find((s) => s.side !== unit.side && distance(unit, s) === 1);
    if (!sp) return false;
    const dmg = Math.max(1, unit.attack);
    sp.hp -= dmg;
    this.faceToward(unit, sp.view.x - unit.view.x, sp.view.y - unit.view.y);
    this.showPose(unit, 'attack', sp.view.x - unit.view.x);
    play('slash');
    this.floatText({ view: sp.view, topY: sp.h }, '-' + dmg, '#ffd9a0', { pop: true });
    if (sp.hp <= 0) this.time.delayedCall(250, () => this.removeSpirit(sp, 'Broken'));
    this.time.delayedCall(700, () => { if (unit.alive) this.showStanding(unit); done(); });
    return true;
  },

  // ---------- Spirit Swap (6.49): free, once a turn ----------
  swapWithSpirit(unit) {
    const sp = this.spiritOf(unit);
    if (!sp || this.spiritBlock(unit, 'spiritSwap')) return false;
    unit.spiritSwapped = true;
    const from = { col: unit.col, row: unit.row }, to = { col: sp.col, row: sp.row };
    play('spell');
    const color = Phaser.Display.Color.HexStringToColor(SPIRITS[sp.kind].color).color;
    floorLight(this, unit.view.x, unit.view.y, color, { size: 1.2, peak: 0.6, ms: 500 });
    this.tweens.add({ targets: [unit.view, sp.view], alpha: 0, duration: 160, onComplete: () => {
      sp.col = from.col; sp.row = from.row;
      const p = tileToScreen(from.col, from.row);
      sp.view.setPosition(p.x, p.y).setDepth(depthFor(from.col, from.row) + 1);
      this.placeUnit(unit, to.col, to.row);
      floorLight(this, unit.view.x, unit.view.y, color, { size: 1.2, peak: 0.6, ms: 500 });
      this.tweens.add({ targets: [unit.view, sp.view], alpha: 1, duration: 220 });
      this.refreshWater();
      this.faceNearestOpponent(unit);
      if (this.activeUnit === unit && unit.side === 'hero') this.startMove(true); // (his walk tiles from the new spot)
    } });
    this.floatText(unit, 'Swap', SPIRITS[sp.kind].color, { rise: 30 });
    return true;
  },

  // ---------- the AI ----------
  // Where Kofi's AI would call a spirit, or null: every free tile in reach is scored for the spirit it would raise.
  //   Ember: 4 for each foe next to the tile. Tide: the health it would give friends there (up to 5 each, only the hurt).
  //   Stone: 3 for each friend next to it who has a foe within 2. Gale: 3 for each foe next to it, +2 if that foe stands
  //   next to a friend of Kofi's. It calls one only for a score of 4 or more, and not while his spirit is still out.
  spiritChoice(unit) {
    if (!unit.spells.includes('callSpirit') || !canAfford(unit, 'callSpirit') || this.spiritOf(unit)) return null;
    const foes = this.units.filter((u) => u.alive && u.side !== unit.side && !u.hidden && !u.isDecoy);
    const friends = this.units.filter((u) => u.alive && u.side === unit.side && !u.isDecoy);
    let best = null;
    for (const t of this.spiritTiles(unit)) {
      const kind = this.spiritKindAt(unit, t);
      const S = SPIRITS[kind];
      const nearFoes = foes.filter((f) => distance(f, t) === 1);
      const nearFriends = friends.filter((a) => distance(a, t) <= 1);
      let score = 0;
      if (kind === 'ember') score = nearFoes.length * 4;
      if (kind === 'tide') score = nearFriends.reduce((s, a) => s + Math.min(S.heal, a.maxHp - a.hp), 0);
      if (kind === 'stone') score = nearFriends.filter((a) => foes.some((f) => distance(f, a) <= 2)).length * 3;
      if (kind === 'gale') score = nearFoes.reduce((s, f) => s + 3 + (friends.some((a) => distance(a, f) === 1) ? 2 : 0), 0);
      if (!best || score > best.score) best = { tile: t, kind, score };
    }
    return best && best.score >= 4 ? { id: 'callSpirit', target: best.tile } : null;
  },
  // Kofi's free swap in the AI: a foe is next to him and none next to his spirit, so he slips out to its tile.
  spiritSwapAi(unit) {
    const sp = this.spiritOf(unit);
    if (!sp || this.spiritBlock(unit, 'spiritSwap')) return false;
    const foes = this.units.filter((u) => u.alive && u.side !== unit.side && !u.isDecoy);
    if (!foes.some((f) => distance(f, unit) === 1) || foes.some((f) => distance(f, sp) === 1)) return false;
    return this.swapWithSpirit(unit);
  },
};
