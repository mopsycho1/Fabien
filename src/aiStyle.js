// Play styles for the computer's fighters (roadmap 13.69, 13.77, 13.80; Suleiman 20 and 22 Nov).
// Each fighter has a style in src/data/aiStyles.json: aggressive, protector, support or skirmisher.
// The style steers three things, the same on either side:
//   1. who it strikes (sortTargets): a kill first for everyone, then its focus
//   2. how it walks (supportTile, guardFoe, fallBackTile): a support stays in reach of the friend who needs it,
//      a protector goes for the foe hurting a friend, a hurt fighter falls back to its friends
//   3. how hurt a friend must be before it spends a heal or a guard on it (careAt)
// Every fighter also reads its friends' health and statuses here (friendNeed), not only its own.
// These are plain functions (no Phaser), so tests can call them directly.
import data from './data/aiStyles.json';
import { getReachableTiles } from './movement.js';
import { distance } from './combat.js';
import { moveOf, moveRules, isPoisoned, isBurning, isStunned, isOffBalance, isBleeding } from './status.js';
import { isCaster } from './enemyAi.js';

const DEFAULT = 'aggressive';

// The style of a fighter: { name, text, careAt, fallBackAt, focus }
export function styleOf(unit) {
  const f = (unit && data.fighters[unit.id]) || null;
  const name = (unit && unit.aiStyle) || (f && f.style) || DEFAULT; // (a test can set unit.aiStyle)
  return { name, ...data.styles[name] };
}

export const ratio = (u) => u.hp / u.maxHp;

// How much a friend needs help, 0 (fine) to about 1.5 (about to fall): missing health, and more for
// what will keep hurting it (poison, a burn, bleeding), for being locked in a clash or stunned.
export function friendNeed(u) {
  let need = 1 - ratio(u);
  if (isPoisoned(u) || isBurning(u) || isBleeding(u)) need += 0.15;
  if (u.engagedWith) need += 0.1;
  if (isStunned(u)) need += 0.1;
  return need;
}

// The friends (itself too) at or under its style's careAt health, the neediest first.
export function hurtFriends(unit, units, careAt = styleOf(unit).careAt) {
  return units
    .filter((a) => a.alive && !a.isDecoy && a.side === unit.side && ratio(a) <= careAt)
    .sort((a, b) => friendNeed(b) - friendNeed(a));
}

// The foe that is hurting a hurt friend most: standing next to it (or locked in a clash with it).
// Returns { foe, friend } or null. Used by protectors to pick a target and a way to walk.
export function guardFoe(unit, units, careAt = styleOf(unit).careAt) {
  const foes = units.filter((o) => o.alive && !o.isDecoy && o.side !== unit.side);
  for (const friend of hurtFriends(unit, units, careAt)) {
    if (friend === unit) continue;
    const near = foes.filter((f) => f === friend.engagedWith || distance(f, friend) <= Math.max(1, f.range || 1))
      .sort((a, b) => b.attack - a.attack);
    if (near.length) return { foe: near[0], friend };
  }
  return null;
}

// Orders the foes it could strike now. Everyone takes a kill first (dmg(t) >= t.hp), then an opening
// (Off-Balance, Distracted), then its focus: weakest (least health), threat (the foe hurting a hurt
// friend, then the hardest hitter), casters (casters and archers, then the least health), nearest.
// opening(t) and dmg(t) are given by the scene (they need its rules).
export function sortTargets(unit, targets, units, dmg, opening = (t) => (isOffBalance(t) ? 2 : 0)) {
  const style = styleOf(unit);
  const guard = style.focus === 'threat' ? guardFoe(unit, units, style.careAt) : null;
  const kill = (t) => (!t.isDecoy && dmg(t) >= t.hp ? 1 : 0);
  const focusScore = (t) => {
    if (style.focus === 'threat') return (guard && guard.foe === t ? 1000 : 0) + t.attack * 10 - t.hp;
    if (style.focus === 'casters') return (isCaster(t) || (t.range || 1) > 1 ? 1000 : 0) - t.hp;
    if (style.focus === 'nearest') return -distance(unit, t) * 100 - t.hp;
    return (isCaster(t) ? 5 : 0) - t.hp; // weakest (a caster breaks a near tie, as before)
  };
  return [...targets].sort((a, b) => kill(b) - kill(a) || opening(b) - opening(a) || focusScore(b) - focusScore(a));
}

// The tiles it can walk to this turn (and its own), with the scene's blocking rule.
function walkTiles(unit, isBlocked, steps = moveOf(unit)) {
  return [{ col: unit.col, row: unit.row }, ...getReachableTiles(unit.col, unit.row, steps, isBlocked, moveRules(unit))];
}

// A support's walk: to a tile from which it reaches the friend who needs it most (reach = its heal or
// blessing range), as far from the foes as it can (at least 2 tiles if it can), fewest steps.
// Only when someone needs it (careAt); returns null to walk the usual way. Never for a fighter in a clash.
export function supportTile(unit, units, isBlocked, reach, steps = moveOf(unit)) {
  if (unit.engagedWith) return null;
  const friend = hurtFriends(unit, units).find((a) => a !== unit);
  if (!friend) return null;
  const foes = units.filter((o) => o.alive && !o.isDecoy && o.side !== unit.side);
  const room = (t) => (foes.length ? Math.min(4, ...foes.map((f) => distance(t, f))) : 4);
  const tiles = walkTiles(unit, isBlocked, steps).filter((t) => distance(t, friend) <= reach);
  if (!tiles.length) return null; // too far this turn: the usual walk brings it nearer the fight
  tiles.sort((a, b) => Math.min(room(b), 2) - Math.min(room(a), 2) || room(b) - room(a) || distance(unit, a) - distance(unit, b));
  const t = tiles[0];
  return t.col === unit.col && t.row === unit.row ? { stay: true } : t;
}

// A hurt fighter falls back (fallBackAt), when a support friend is alive to heal it: to the tile furthest from the foes (up to 5 tiles counts),
// then nearest a friend who can heal (a support), then any friend, fewest steps. Returns a tile,
// { stay: true } when where it stands is already the best, or null when it should not fall back.
export function fallBackTile(unit, units, isBlocked, steps = moveOf(unit)) {
  const style = styleOf(unit);
  if (!style.fallBackAt || unit.engagedWith || ratio(unit) > style.fallBackAt) return null;
  const foes = units.filter((o) => o.alive && !o.isDecoy && o.side !== unit.side);
  if (!foes.length) return null;
  const friends = units.filter((a) => a.alive && !a.isDecoy && a !== unit && a.side === unit.side);
  const healers = friends.filter((a) => styleOf(a).name === 'support');
  // (falling back only pays when a friend can heal it there; a support itself always keeps back when hurt)
  if (!healers.length && style.name !== 'support') return null;
  const room = (t) => Math.min(5, ...foes.map((f) => distance(t, f)));
  const near = (list, t) => (list.length ? Math.min(...list.map((a) => distance(t, a))) : 0);
  const tiles = walkTiles(unit, isBlocked, steps);
  tiles.sort((a, b) => room(b) - room(a) || near(healers, a) - near(healers, b) || near(friends, a) - near(friends, b) || distance(unit, a) - distance(unit, b));
  const t = tiles[0];
  if (room(t) <= room(unit)) return { stay: true };
  return t;
}
