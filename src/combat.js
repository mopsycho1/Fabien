import { statMod, isStunned, isDisoriented } from './status.js';
import conditions from './data/conditions.json';
import rules from './data/engagement.json';
import terrain from './data/terrain.json';

// How high a tile is. The battle screen hands in the real map (grid.js);
// until then everything counts as flat ground.
let heightOf = () => 0;
export function setHeightLookup(fn) {
  heightOf = fn;
}

// How many levels higher the attacker stands than the defender (negative if lower).
export function heightEdge(attacker, defender) {
  return heightOf(attacker.col, attacker.row) - heightOf(defender.col, defender.row);
}

// Ranged attacks (archers, the Sage) aim better from above and worse uphill.
export function heightAccuracy(attacker, defender) {
  if (attacker.range <= 1 || attacker.melee) return 0; // shooting only, not a spear's reach
  return heightEdge(attacker, defender) * terrain.rangedAccuracyPerLevel;
}

// The rules of attacking. Nothing in this file draws anything. It only does
// maths, so it is easy to test and easy to change.

// How many tiles apart two units are, counting steps up, down, left and right.
export function distance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

// ---------- Line of sight (Suleiman, 29 Oct) ----------
// "Higher blocks should stop all arrows unless the technique has piercing potential."
// An arrow or a thrown weapon flies in a straight line from chest height to
// chest height (terrain.json "sightHeight", in levels above each unit's tile).
// We walk along that line in small steps; if a tile in between has its top at
// or above the line where the line crosses it, the shot is blocked.
// Only the ground blocks shots, not other units. Magic is never blocked.
export function hasClearShot(from, to) {
  const d = distance(from, to);
  if (d <= 1) return true; // right next to it: nothing in between
  const h0 = heightOf(from.col, from.row) + terrain.sightHeight;
  const h1 = heightOf(to.col, to.row) + terrain.sightHeight;
  const steps = d * 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // the point on the line, measured from the middle of the shooter's tile
    const col = Math.floor(from.col + 0.5 + (to.col - from.col) * t);
    const row = Math.floor(from.row + 0.5 + (to.row - from.row) * t);
    if ((col === from.col && row === from.row) || (col === to.col && row === to.row)) continue;
    if (heightOf(col, row) >= h0 + (h1 - h0) * t) return false;
  }
  return true;
}

// True for units whose normal attack is an arrow (or another missile): they
// need a clear line to the target once it is not right next to them.
// Spears (melee) and magic do not.
export function shootsProjectiles(unit) {
  return unit.range > 1 && !unit.melee && unit.attackType !== 'magic';
}

// Chance (in percent) that the attack lands.
// Attacker accuracy minus defender evade, but never below 5 or above 95,
// so no attack is ever certain and none is ever hopeless.
// Two things make a target easier to hit:
//   - being Off-Balance (it lost an engagement contest)
//   - being busy fighting someone else in an engagement (it is distracted)
//   - (and one makes it harder: lightning aimed at someone right next to the
//     caster, see closePenalty in jobs.json)
//   - height, for ranged attacks: better from above, worse uphill (terrain.json)
export function getHitChance(attacker, defender) {
  // a stunned unit cannot dodge (conditions.json)
  const evade = isStunned(defender) && !conditions.stun.canDodge ? 0 : defender.evade + statMod(defender, 'evade');
  let chance = attacker.accuracy - evade;
  if (isDistracted(defender, attacker)) chance += rules.distractedHitBonus;
  if (attacker.closePenalty && distance(attacker, defender) <= 1) chance -= attacker.closePenalty;
  chance += heightAccuracy(attacker, defender); // shooting from high ground, or uphill
  return Math.min(95, Math.max(5, chance));
}

// True if the defender is locked in an engagement with someone other than the attacker.
export function isDistracted(defender, attacker) {
  return !!defender.engagedWith && defender.engagedWith !== attacker;
}

// Damage if the attack lands, always at least 1.
//   weapon attacks (swords, spears, arrows): attack minus defense
//   magic attacks (lightning):               magicAttack minus magicDefense
// Spells count too (a Verse of Fury adds attack, a Verse of Stone adds defense).
export function getDamage(attacker, defender) {
  // hits on a stunned unit are flank hits: extra damage (conditions.json)
  const flank = isStunned(defender) ? conditions.stun.flankDamage : 0;
  if (attacker.attackType === 'magic') {
    const power = attacker.magicAttack + statMod(attacker, 'magicAttack');
    // a Disoriented unit takes extra damage from every kind of magic (conditions.json)
    const dazed = isDisoriented(defender) ? conditions.disoriented.magicDamage : 0;
    return Math.max(1, power - (defender.magicDefense + statMod(defender, 'magicDefense'))) + flank + dazed;
  }
  const attack = attacker.attack + statMod(attacker, 'attack') + (usesCloseWeapon(attacker, defender) ? attacker.closeWeapon.attack : 0);
  return Math.max(1, attack - (defender.defense + statMod(defender, 'defense'))) + flank;
}

// True when an archer is right next to its target: it fights with its close
// weapon (a dagger, weaker than the bow), not its bow. See closeWeapon in jobs.json.
export function usesCloseWeapon(attacker, defender) {
  return !!attacker.closeWeapon && distance(attacker, defender) <= 1;
}

// Lightning jumps: the enemy nearest to the one just struck (within the
// chain's range, not the one struck, still standing), or null.
export function chainTarget(attacker, struck, units) {
  if (!attacker.chain) return null;
  let best = null;
  for (const u of units) {
    if (!u.alive || u === struck || u.side === attacker.side) continue;
    const d = distance(struck, u);
    if (d <= attacker.chain.range && (best === null || d < distance(struck, best))) best = u;
  }
  return best;
}

// Damage from the jump: a share of the full damage, at least 1.
export function chainDamage(attacker, defender) {
  return Math.max(1, Math.round(getDamage(attacker, defender) * attacker.chain.share));
}

// Every living unit on the other side that this attacker can reach right now.
// "range" is how many tiles away it can hit. Range 1 means next to it.
export function getTargetsInRange(attacker, units) {
  return units.filter((other) => other.alive && other.side !== attacker.side && inReach(attacker, other));
}

// True if the attacker can hit this spot from where it stands: within its
// range, for a spear ("lineReach" in jobs.json) only in a straight line once
// it is past the tile next to it, and for an archer only with a clear shot
// (no higher block in the way, see hasClearShot).
export function inReach(attacker, spot) {
  const d = distance(attacker, spot);
  if (d < 1 || d > attacker.range) return false;
  if (attacker.lineReach && d > 1) return attacker.col === spot.col || attacker.row === spot.row;
  if (shootsProjectiles(attacker) && !hasClearShot(attacker, spot)) return false;
  return true;
}

// Rolls the dice for one attack.
// "random" gives a number from 0 up to (but not including) 1. We pass it in
// so tests can control it. In the real game it is Math.random.
// Returns { hit: true or false, damage: number, hitChance: number }
export function rollAttack(attacker, defender, random = Math.random) {
  const hitChance = getHitChance(attacker, defender);
  const hit = random() * 100 < hitChance;
  return {
    hit,
    damage: hit ? getDamage(attacker, defender) : 0,
    hitChance,
  };
}
