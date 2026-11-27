// The two kings' own rules (Phase 10). Nothing here draws anything; src/kingsScene.js plays the moves.
//
// GADARA THE GREATER (job "sovereign", roadmap 10.23 to 10.29, the 19 Nov "Basic Attack Revision"):
//   unit.grip    'fork' or 'blade': which end of his sword-staff leads (Reverse Grip, free, once a turn)
//   unit.mask    the Mask Gauge, 0 to 5 (10.53, 27 Nov): +1 for each different foe an attack of his hits (at most 3),
//                +2 when he strips a buff, +1 for the first clash beat he holds and +1 for the first hit he takes
//                between two of his turns. Full: Singularity can be cast (once a battle). Shadow Step and Shadow
//                Passage spend masks too (1 for himself, 1 for each foe carried), so they compete with Singularity.
//   unit.channel { spellId, tiles } while Singularity charges (it resolves at the start of his next turn)
//   Dominion (passive): buffs on his foes within 2 tiles of him are one step weaker (see dominionStep).
//
// KING ALAGARA (job "vessel", roadmap 10.17 to 10.22, class sheet v2 "Active and Echo"):
//   unit.status.buff  his ACTIVE Verse (the one that gives stat bonuses, 50 percent bigger on him)
//   unit.attune       { echo: the stashed Verse or null, swapped: true once he has swapped this turn }
//   A new Verse on him while he holds one: the old one goes to the Echo (it is not lost).
//   Swapping is free once a turn and gives the incoming Verse a one-time Surge (kingsScene.js).
import kings from './data/kings.json';

export const KING_RULES = kings;

// ---------- Gadara: the sword-staff ----------

export const hasGrip = (unit) => !!(unit && unit.grip);

// The other end of the staff.
export function otherGrip(unit) {
  return unit.grip === 'blade' ? 'fork' : 'blade';
}

// The attack's name on the button: Fork Strike or Blade Strike.
export function gripAttackName(unit) {
  return unit.grip === 'blade' ? kings.gadara.blade.name : kings.gadara.fork.name;
}

// Extra damage a hit does for the end he holds (Blade: +2).
export function gripBonus(unit) {
  return unit && unit.grip === 'blade' ? kings.gadara.blade.bonus : 0;
}

// The tiles straight behind the target, looking from the attacker: [{col, row}, ...] (up to "count").
export function lineBehind(attacker, target, count = 1) {
  const dc = Math.sign(target.col - attacker.col);
  const dr = Math.sign(target.row - attacker.row);
  if (dc && dr) return []; // only a straight line (no diagonals: the board's lines are its rows and columns)
  const out = [];
  for (let i = 1; i <= count; i++) out.push({ col: target.col + dc * i, row: target.row + dr * i });
  return out;
}

// Fork mode: who takes the second prong. The first foe on the tiles behind the target (up to 2 behind),
// never one of his own side: an ally in the way is skipped, the prong goes on to the next foe.
export function forkSecond(attacker, target, units) {
  if (!attacker.grip || attacker.grip !== 'fork') return null;
  for (const t of lineBehind(attacker, target, kings.gadara.fork.lineDepth)) {
    const u = units.find((x) => x.alive && !x.isDecoy && x.col === t.col && x.row === t.row);
    if (!u) return null; // an empty tile ends the line
    if (u.side !== attacker.side) return u;
  }
  return null;
}

// ---------- Gadara: the Mask Gauge ----------

export const hasMask = (unit) => !!(unit && unit.mask !== undefined && unit.mask !== null);
export const MASK_MAX = kings.gadara.mask.max;

// Adds to the gauge (never above the max). Returns how much was really added. It keeps filling after Singularity
// is spent (10.53): Shadow Passage still needs masks.
export function feedMask(unit, amount) {
  if (!hasMask(unit)) return 0;
  const before = unit.mask;
  unit.mask = Math.min(MASK_MAX, unit.mask + amount);
  return unit.mask - before;
}

// The same, but only once between two of his turns for this reason ('beat': a clash beat held, 'hit': a hit taken).
// unit.maskRound is cleared at the start of his turn.
export function feedMaskOnce(unit, why, amount) {
  if (!hasMask(unit)) return 0;
  unit.maskRound = unit.maskRound || {};
  if (unit.maskRound[why]) return 0;
  const fed = feedMask(unit, amount);
  if (fed) unit.maskRound[why] = true;
  return fed;
}

// An attack or skill of his hit these foes: +1 for each different one (at most 3). "hits" may hold nulls (misses).
export function maskFromHits(unit, hits) {
  if (!hasMask(unit)) return 0;
  const foes = new Set(hits.filter((t) => t && !t.isDecoy && t.side !== unit.side));
  return feedMask(unit, Math.min(kings.gadara.mask.hitCap, foes.size * kings.gadara.mask.perFoeHit));
}

export function maskFull(unit) {
  return hasMask(unit) && unit.mask >= MASK_MAX && !unit.singularityUsed;
}

// The tiles Singularity reaches: every tile within its radius of him (not his own).
export function singularityTiles(unit, gridSize) {
  const r = kings.gadara.singularity.radius;
  const out = [];
  for (let c = unit.col - r; c <= unit.col + r; c++) {
    for (let w = unit.row - r; w <= unit.row + r; w++) {
      if (c < 0 || w < 0 || c >= gridSize || w >= gridSize) continue;
      const d = Math.abs(c - unit.col) + Math.abs(w - unit.row);
      if (d >= 1 && d <= r) out.push({ col: c, row: w });
    }
  }
  return out;
}

// The foes Singularity would pull from where he stands: within the radius, not already next to him.
export function singularityCatch(unit, units) {
  const r = kings.gadara.singularity.radius;
  return units.filter((u) => u.alive && !u.isDecoy && u.side !== unit.side && Math.abs(u.col - unit.col) + Math.abs(u.row - unit.row) <= r);
}

// ---------- Gadara: Shadow Passage (10.53) ----------
export const PASSAGE = kings.gadara.passage;

// Can this foe be carried? Not a king, not one under the Stone Verse, not one standing Unmoved (Anchored).
export function carryable(unit, foe) {
  if (!foe || !foe.alive || foe.isDecoy || foe.side === unit.side) return false;
  if (foe.grip || foe.attune) return false; // the kings stand their ground (the draft: bosses are immune, shown on the card)
  if (foe.status && foe.status.buff && foe.status.buff.id === 'stone') return false;
  if (foe.unmoved) return false;
  return true;
}

// ---------- Gadara: Dominion ----------
// Buffs on his foes within 2 tiles are one step weaker: Fury +2 becomes +1, Swift's evade +15 becomes +10,
// Earth's Bulwark +2 becomes +1 (kings.json "dominion.step"). Returns the step to take off one stat
// (0 when the stat is not weakened).
export function dominionStep(stat) {
  return kings.gadara.dominion.step[stat] || 0;
}

// ---------- Alagara: Attunement ----------

export const isAttuned = (unit) => !!(unit && unit.attune);

// His Verse bonuses are 50 percent bigger (penalties are not): how much to multiply a boost by.
export function attuneTimes(unit, value) {
  return isAttuned(unit) && value > 0 ? kings.alagara.activeBonus : 1;
}

// Is this a Verse (a buff that can sit in a slot)?
export function isVerse(spell) {
  return !!spell && spell.kind === 'buff';
}

// The Verse in his Echo slot, or null.
export function echoOf(unit) {
  return isAttuned(unit) ? unit.attune.echo : null;
}

// Can he swap Active and Echo now? Both slots full, not yet this turn.
export function canSwap(unit) {
  return isAttuned(unit) && !!unit.attune.echo && !!(unit.status && unit.status.buff) && !unit.attune.swapped;
}

// Swaps the two slots. Returns the Verse id that is now Active (the one that Surges), or null.
export function swapVerses(unit) {
  if (!canSwap(unit)) return null;
  const active = unit.status.buff;
  unit.status.buff = unit.attune.echo;
  unit.attune.echo = active;
  unit.attune.swapped = true;
  return unit.status.buff.id;
}

// The Verse skills that belong to a Verse (Unmoved and Aegis to Stone; Rending Draw is in every form since 1.99).
// kings.json may give one id or a list. Returns a list.
export function verseSkillOf(verseId) {
  const s = (kings.alagara.verseSkills || {})[verseId];
  return !s ? [] : Array.isArray(s) ? s : [s];
}

// Which of his Verse skills he can use now: { id, echo } for the Active Verse's skills (full strength) and the
// Echo's (75 percent, one more turn of cooldown). Returns a list.
export function verseSkillsNow(unit) {
  if (!isAttuned(unit)) return [];
  const out = [];
  const active = unit.status && unit.status.buff ? verseSkillOf(unit.status.buff.id) : [];
  for (const id of active) out.push({ id, echo: false });
  const echo = unit.attune.echo ? verseSkillOf(unit.attune.echo.id) : [];
  for (const id of echo) if (!active.includes(id)) out.push({ id, echo: true });
  return out;
}

// ---------- Alagara: Aegis (10.46, Suleiman 21 Nov) ----------
// Under Earth's Bulwark he raises a shield on himself and every ally within 2 tiles. Each shield soaks damage up
// to a share of that fighter's own max health (20 percent; 15 from the Echo), for 2 of their turns.
//   unit.shield = { hp: points left to soak, max, turnsLeft }

// Puts a fresh shield on one fighter. power: 1 from the Active Verse, 0.75 from the Echo.
export function giveShield(unit, share, turns, power = 1) {
  const hp = Math.max(1, Math.round(unit.maxHp * share * power));
  unit.shield = { hp, max: hp, turnsLeft: turns };
  return hp;
}

// Takes damage off the shield first. Returns { damage: what still gets through, soaked }.
export function soakShield(unit, damage) {
  const s = unit && unit.shield;
  if (!s || s.hp <= 0 || damage <= 0) return { damage, soaked: 0 };
  const soaked = Math.min(s.hp, damage);
  s.hp -= soaked;
  if (s.hp <= 0) unit.shield = null; // broken
  return { damage: damage - soaked, soaked };
}

// One of the fighter's turns has passed: the shield fades after its last one.
export function tickShield(unit) {
  if (!unit || !unit.shield) return;
  unit.shield.turnsLeft -= 1;
  if (unit.shield.turnsLeft <= 0) unit.shield = null;
}

// Is this Verse skill used from the Echo now (75 percent)?
export function fromEcho(unit, skillId) {
  return verseSkillsNow(unit).some((s) => s.id === skillId && s.echo);
}

// How strong a Verse skill is now: 1 from the Active Verse, 0.75 from the Echo.
export function verseSkillPower(unit, skillId) {
  return fromEcho(unit, skillId) ? kings.alagara.echoPower : 1;
}
