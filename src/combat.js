import { statMod } from './status.js';
import rules from './data/engagement.json';

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
export function getHitChance(attacker, defender) {
  let chance = attacker.accuracy - (defender.evade + statMod(defender, 'evade'));
  if (isDistracted(defender, attacker)) chance += rules.distractedHitBonus;
  return Math.min(95, Math.max(5, chance));
}

// True if the defender is locked in an engagement with someone other than the attacker.
export function isDistracted(defender, attacker) {
  return !!defender.engagedWith && defender.engagedWith !== attacker;
}

// Damage if the attack lands: attack minus defense, but always at least 1.
export function getDamage(attacker, defender) {
  return Math.max(1, attacker.attack - (defender.defense + statMod(defender, 'defense')));
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
