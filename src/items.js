// Items (roadmap Phase 5). A unit carries a small bag: { itemId: count }.
// This file holds the plain rules; BattleScene does the menu and the pictures.
import data from './data/items.json';
import rules from './data/engagement.json';
import { isPoisoned, isBurning, curePoison, cureBurn } from './status.js';

export const ITEMS = data.items;

// A fresh bag for a unit: its own "bag" in units.json, else its class's start.
export function startBag(entry) {
  return { ...(entry.bag || data.start[entry.job] || {}) };
}

// The item ids a unit holds (count above 0), in items.json order.
export function heldItems(unit) {
  const bag = unit.bag || {};
  return Object.keys(ITEMS).filter((id) => (bag[id] || 0) > 0);
}

export function giveItem(unit, id, n = 1) {
  unit.bag = unit.bag || {};
  unit.bag[id] = (unit.bag[id] || 0) + n;
}

// Would this item do anything for this unit? (Items are never wasted.)
export function itemHelps(unit, id) {
  const it = ITEMS[id];
  if (!it) return false;
  if (it.heal) return unit.hp < unit.maxHp;
  if (it.mp) return unit.maxMp > 0 && unit.mp < unit.maxMp;
  if (it.poise) return !!unit.contest && (unit.poise === undefined ? rules.poise.start : unit.poise) < rules.poise.max;
  if (it.cure) return isPoisoned(unit) || isBurning(unit);
  return false;
}

// The user spends one item from its bag; it works on `unit` (itself or an ally).
// Returns what changed, for the floating text.
export function applyItem(unit, id, user = unit) {
  const it = ITEMS[id];
  user.bag[id] -= 1;
  const out = { heal: 0, mp: 0, poise: 0, cured: false };
  if (it.heal) {
    out.heal = Math.min(it.heal, unit.maxHp - unit.hp);
    unit.hp += out.heal;
  }
  if (it.mp) {
    out.mp = Math.min(it.mp, unit.maxMp - unit.mp);
    unit.mp += out.mp;
  }
  if (it.poise) {
    const before = unit.poise === undefined ? rules.poise.start : unit.poise;
    unit.poise = rules.poise.max;
    out.poise = unit.poise - before;
  }
  if (it.cure) {
    out.cured = isPoisoned(unit) || isBurning(unit);
    curePoison(unit);
    cureBurn(unit);
  }
  return out;
}

// What an enemy would use right now, or null: it looks after itself first.
export function enemyItemChoice(unit) {
  const held = heldItems(unit);
  const pick = (test) => held.find((id) => itemHelps(unit, id) && test(ITEMS[id]));
  if (unit.hp <= unit.maxHp * 0.5) {
    const id = pick((it) => it.heal);
    if (id) return id;
  }
  const cure = pick((it) => it.cure);
  if (cure) return cure;
  if (unit.maxMp > 0 && unit.mp <= unit.maxMp * 0.35) {
    const id = pick((it) => it.mp);
    if (id) return id;
  }
  if (unit.contest && (unit.poise === undefined ? rules.poise.start : unit.poise) === 0) {
    const id = pick((it) => it.poise);
    if (id) return id;
  }
  return null;
}
