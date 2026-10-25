import { statMod } from './status.js';
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
  if (attacker.range <= 1) return 0;
  return heightEdge(attacker, defender) * terrain.rangedAccuracyPerLevel;
}

// The rules of attacking. Nothing in this file draws anything. It only does
// maths, so it is easy to test and easy to change.

// How many tiles apart two units are, counting steps up, down, left and right.
export function distance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
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
  let chance = attacker.accuracy - (defender.evade + statMod(defender, 'evade'));
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
  if (attacker.attackType === 'magic') {
    const power = attacker.magicAttack + statMod(attacker, 'magicAttack');
    return Math.max(1, power - (defender.magicDefense + statMod(defender, 'magicDefense')));
  }
  const attack = attacker.attack + statMod(attacker, 'attack');
  return Math.max(1, attack - (defender.defense + statMod(defender, 'defense')));
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
  return units.filter(
    (other) =>
      other.alive &&
      other.side !== attacker.side &&
      distance(attacker, other) <= attacker.range
  );
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
