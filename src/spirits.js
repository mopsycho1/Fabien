// Kofi's spirits (roadmap 13.72, 6.38, 6.49; decided by Baiyee 27 Nov) and the ground's elements. Alagara's Claim draws
// on the spirits themselves since 10.56 (kingsScene.js claimSpirits), no longer on the ground. These are methods of the battle scene (BattleScene.js adds them with Object.assign), like the kings'.
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
// SPIRIT SWAP (6.49): free, once a turn, Kofi and his spirit trade places. In a clash the spirit TAKES OVER the clash
// (Kofi's sheet, built 28 Nov): Kofi is free, and the foe stays held by the spirit (it cannot walk, and its plain attack
// can only strike the spirit) until the spirit breaks, fades or leaves its side.
// Anyone can strike a foe's spirit with a plain attack (players tap it like a fighter; the AI weighs it, spiritToStrike).
// Spirits are kept in the save (saveGame.js "spirits", restored by restoreSpirits).
// Every number is in spells.json callSpirit "spirits" (picked by Claude, 27 Nov; Suleiman's sheet gives none).
import Phaser from 'phaser';
import spells from './data/spells.json';
import { tileToScreen, getHeight, depthFor } from './grid.js';
import { GRID_SIZE } from './config.js';
import { distance, inReach } from './combat.js';
import { applyBurn, isDrenched, canAfford, cooldownOf } from './status.js';
import { summonShow, spiritFade, spiritReadyCheck } from './summonFx.js';
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
  // (Kofi's Call Spirit reads the ground this way, 13.72.)
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
      // (28 Nov: allowed in a clash too: the spirit takes it over, takeOverClash)
    }
    return null;
  },

  // ---------- Call Spirit ----------
  // The summon is a show (src/summonFx.js, 6.99): about 3 seconds the first time in a battle, about 1.5 after; a tap
  // speeds it up. The spirit's first move comes at the end of it.
  castCallSpirit(caster, tile, spell, onDone) {
    const kind = this.spiritKindAt(caster, tile);
    const S = SPIRITS[kind];
    const old = this.spiritOf(caster);
    if (old) this.removeSpirit(old, 'Gone back');
    const first = !this.spiritShowSeen;
    this.spiritShowSeen = true;
    summonShow(this, caster, tile, kind, S, first, () => this.addSpirit(caster, kind, tile, 'show'), (sp) => {
      const finish = () => {
        if (caster.alive) this.showStanding(caster);
        const outcome = this.checkBattleEnd();
        if (outcome) { this.battleOver = true; this.busy = false; this.showResult(outcome); return; }
        onDone();
      };
      if (sp && this.spirits.includes(sp)) this.spiritMove(sp, finish); else finish();
    });
  },

  // Draws a spirit on its tile: its own picture (Suleiman's four, art.json sp_*), small, hovering, facing the foes.
  // quiet: true = no rising (a spirit put back from the save); 'show' = the summon show brings it in (summonFx.js).
  addSpirit(owner, kind, tile, quiet = false) {
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
    const bodyScale = body.scaleX;
    // it hovers (the picture already floats above its bottom edge) and breathes
    this.tweens.add({ targets: body, y: body.y - 5, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (!quiet || quiet === 'show') {
      if (!quiet) view.setScale(0.2).setAlpha(0);
      if (!quiet) this.tweens.add({ targets: view, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
      floorLight(this, p.x, p.y, Phaser.Display.Color.HexStringToColor(S.color).color, { size: 1.4, peak: 0.7, ms: 700 });
      energyWaves(this, p.x, p.y, Phaser.Display.Color.HexStringToColor(S.color).color, { count: 2, size: 0.8 });
    }
    const sp = { kind, owner, col: tile.col, row: tile.row, hp: S.hp, maxHp: S.hp, movesLeft: CALL.turns, view, body, bodyScale, h, side: owner.side, S, depth: view.depth };
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
    this.syncSpiritHolds(); // (a held foe pushed away, or its spirit gone: it is free)
    if (unit.spells && unit.spells.includes('callSpirit')) spiritReadyCheck(this, unit, cooldownOf(unit, 'callSpirit')); // 'Spirit ready' (6.99)
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
    this.syncSpiritHolds();
    if (why && sp.view && sp.view.active) this.floatText({ view: sp.view, topY: sp.h }, why, SPIRITS[sp.kind].color, { rise: 20 });
    // it goes back into its element: embers, mist, dust or wind (summonFx.js, 6.99)
    if (sp.view && sp.view.active) { this.tweens.killTweensOf(sp.view); spiritFade(this, sp); }
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

  // ---------- Striking a spirit (28 Nov) ----------
  // The foe spirits a unit can strike with its plain attack from where it stands (its own reach rules, inReach).
  // A unit held by a spirit can strike only that spirit.
  foeSpiritsInReach(unit) {
    const held = this.heldSpirit(unit);
    if (held) return inReach(unit, held) || distance(unit, held) === 1 ? [held] : [];
    return (this.spirits || []).filter((s) => s.side !== unit.side && inReach(unit, s));
  },
  // What a blow does to a spirit: the striker's attack, at least 1 (a spirit has no defense).
  spiritDamage(unit) {
    return Math.max(1, unit.attack || 1);
  },
  // A plain attack on a spirit (players and the AI). It counts as the unit's action. At 0 the spirit breaks.
  strikeSpirit(unit, sp, done) {
    if (unit.thiefHidden && this.revealThief) this.revealThief(unit); // (the Thief shows himself when he strikes, 19.2)
    unit.hasActed = true;
    const dmg = this.spiritDamage(unit);
    sp.hp = Math.max(0, sp.hp - dmg);
    const dx = sp.view.x - unit.view.x || 1;
    this.faceToward(unit, dx, sp.view.y - unit.view.y);
    this.showPose(unit, 'attack', dx);
    play(unit.range > 1 ? 'arrow' : 'slash');
    this.time.delayedCall(unit.range > 1 ? 260 : 120, () => {
      if (!this.spirits.includes(sp)) return;
      const color = Phaser.Display.Color.HexStringToColor(SPIRITS[sp.kind].color).color;
      floorLight(this, sp.view.x, sp.view.y, color, { size: 1, peak: 0.6, ms: 400 });
      this.tweens.add({ targets: sp.body, alpha: 0.35, duration: 70, yoyo: true, repeat: 1 });
      this.floatText({ view: sp.view, topY: sp.h }, '-' + dmg, '#ffd9a0', { pop: true });
      this.refreshStatusTags();
      if (sp.hp <= 0) this.time.delayedCall(250, () => this.removeSpirit(sp, 'Broken'));
    });
    this.time.delayedCall(750, () => { if (unit.alive) this.showStanding(unit); done(); });
    return true;
  },
  // The old fallback (a foe with nobody else to strike), kept for the AI's last resort.
  hitSpirit(unit, done) {
    const sp = this.foeSpiritsInReach(unit)[0];
    if (!sp) return false;
    return this.strikeSpirit(unit, sp, done);
  },
  // How much a spirit's NEXT move would do against "side" (the AI's side), in the same points as spiritChoice.
  spiritThreat(sp) {
    if (!sp || sp.movesLeft <= 0) return 0;
    const S = SPIRITS[sp.kind];
    const them = this.units.filter((u) => u.alive && !u.isDecoy && u.side !== sp.side); // the spirit's foes
    const its = this.units.filter((u) => u.alive && !u.isDecoy && u.side === sp.side); // the spirit's friends
    const near = them.filter((f) => distance(f, sp) === 1);
    const friends = its.filter((a) => distance(a, sp) <= 1);
    if (sp.kind === 'ember') return near.length * 4;
    if (sp.kind === 'gale') return near.length * 3;
    if (sp.kind === 'tide') return friends.reduce((s, a) => s + Math.min(S.heal, a.maxHp - a.hp), 0);
    if (sp.kind === 'stone') return friends.filter((a) => them.some((f) => distance(f, a) <= 2)).length * 3;
    return 0;
  },
  // The AI's choice: the spirit it should strike instead of a fighter, or null.
  //   Held by a spirit: that spirit, always (it is the only thing it can strike).
  //   Else a spirit in reach it can BREAK with this blow and whose next move is worth 4 or more (spiritThreat),
  //   unless a fighter in reach can be finished with this blow (a kill comes first). Nobody else in reach: any spirit.
  //   (early = the check made before its clashes and skills: only a held unit or a spirit worth breaking, never the
  //   "nobody else" case, which waits until its skills have had their say.)
  spiritToStrike(unit, targets, early = false) {
    const held = this.heldSpirit(unit);
    if (held) return this.foeSpiritsInReach(unit).includes(held) ? held : null;
    const spirits = this.foeSpiritsInReach(unit);
    if (!spirits.length) return null;
    const live = (targets || []).filter((t) => !t.isDecoy);
    if (!live.length && !early) return spirits[0];
    const dmg = this.spiritDamage(unit);
    const kill = live.some((t) => Math.max(1, (unit.attack || 0) - (t.defense || 0)) >= t.hp);
    if (kill) return null;
    const best = spirits.filter((s) => dmg >= s.hp && this.spiritThreat(s) >= 4).sort((a, b) => this.spiritThreat(b) - this.spiritThreat(a))[0];
    return best || null;
  },

  // ---------- Held by a spirit (the clash taken over, 28 Nov) ----------
  // The spirit holding this unit, or null. unit.heldBySpirit is the spirit's OWNER (Kofi), so it is kept in the save.
  heldSpirit(unit) {
    if (!unit || !unit.heldBySpirit) return null;
    const sp = this.spiritOf(unit.heldBySpirit);
    return sp && unit.alive && distance(sp, unit) <= 1 ? sp : null;
  },
  // Lets go of every hold whose spirit is gone or no longer next to its foe.
  syncSpiritHolds() {
    let changed = false;
    for (const u of this.units || []) {
      if (u.heldBySpirit && !this.heldSpirit(u)) { u.heldBySpirit = null; changed = true; if (u.alive && u.view) this.floatText(u, 'Free', '#d9e8c8', { rise: 30 }); }
    }
    if (changed && this.refreshStatusTags) this.refreshStatusTags();
  },
  // Kofi swaps out of a clash: the clash ends for him, and the foe is held by the spirit now on his old tile.
  takeOverClash(unit, sp) {
    const foe = unit.engagedWith;
    if (!foe) return null;
    endDuel(unit);
    if (this.refreshEngagementMarks) this.refreshEngagementMarks();
    if (!foe.alive || distance(foe, sp) > 1) return null;
    foe.heldBySpirit = unit;
    this.floatText({ view: sp.view, topY: sp.h }, 'Takes over!', SPIRITS[sp.kind].color, { pop: true });
    this.time.delayedCall(300, () => foe.alive && this.floatText(foe, 'Held by the spirit', SPIRITS[sp.kind].color, { rise: 40 }));
    this.refreshStatusTags();
    return foe;
  },

  // ---------- The save ----------
  // Spirits as plain data (saveGame.js snapshot), and back on the board after Continue.
  spiritsData() {
    return (this.spirits || []).map((s) => ({ kind: s.kind, owner: s.owner.id, col: s.col, row: s.row, hp: s.hp, movesLeft: s.movesLeft }));
  },
  restoreSpirits(list) {
    for (const d of list || []) {
      const owner = this.units.find((u) => u.id === d.owner);
      if (!owner || !owner.alive || !SPIRITS[d.kind]) continue;
      const sp = this.addSpirit(owner, d.kind, { col: d.col, row: d.row }, true);
      sp.hp = d.hp; sp.movesLeft = d.movesLeft;
    }
    this.syncSpiritHolds();
    this.refreshStatusTags();
  },

  // ---------- Spirit Swap (6.49): free, once a turn ----------
  swapWithSpirit(unit) {
    const sp = this.spiritOf(unit);
    if (!sp || this.spiritBlock(unit, 'spiritSwap')) return false;
    unit.spiritSwapped = true;
    const from = { col: unit.col, row: unit.row }, to = { col: sp.col, row: sp.row };
    const inClash = !!unit.engagedWith;
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
      if (inClash) this.takeOverClash(unit, sp); // the spirit takes his place in the clash (Kofi's sheet)
      this.syncSpiritHolds(); // (a spirit swapped away from the foe it held lets go)
      this.faceNearestOpponent(unit);
      if (this.activeUnit === unit && unit.side === 'hero' && !this.aiBoth) { this.refreshButtons(); this.startMove(true); } // (his walk tiles from the new spot)
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
  // Kofi's free swap in the AI: caught in a clash (the spirit takes it over), or a foe is next to him and none next to
  // his spirit, so he slips out to its tile.
  spiritSwapAi(unit) {
    const sp = this.spiritOf(unit);
    if (!sp || this.spiritBlock(unit, 'spiritSwap')) return false;
    if (unit.engagedWith) return this.swapWithSpirit(unit);
    const foes = this.units.filter((u) => u.alive && u.side !== unit.side && !u.isDecoy);
    if (!foes.some((f) => distance(f, unit) === 1) || foes.some((f) => distance(f, sp) === 1)) return false;
    return this.swapWithSpirit(unit);
  },
};
