import spells from './data/spells.json';
import rules from './data/engagement.json';

// Short-lived conditions on a unit: being Off-Balance, and a spell (buff)
// from the Sage. Nothing here draws anything.
//
// A unit keeps them in unit.status:
//   unit.status.offBalance : true until the start of that unit's next turn
//   unit.status.buff       : { id: 'stoneSkin', turnsLeft: 2 } or null
//
// A unit only ever has one buff. A new one replaces the old one, so spells
// cannot pile up (the design notes ask us to avoid unlimited stacking).

function statusOf(unit) {
  if (!unit.status) unit.status = { offBalance: false, buff: null };
  return unit.status;
}

// ---------- Off-Balance ----------

export function isOffBalance(unit) {
  return statusOf(unit).offBalance;
}

export function applyOffBalance(unit) {
  statusOf(unit).offBalance = true;
}

// Called at the start of the unit's own turn: it has found its footing again.
export function clearOffBalance(unit) {
  statusOf(unit).offBalance = false;
}

// How much a condition changes one of the unit's numbers in an ordinary attack.
// Only "defense" and "evade" are affected, and only while Off-Balance.
export function statMod(unit, stat) {
  if (!isOffBalance(unit)) return 0;
  if (stat === 'defense') return -rules.offBalance.defense;
  if (stat === 'evade') return -rules.offBalance.evade;
  return 0;
}

// ---------- Buffs ----------

// Puts a spell on a unit for its next few turns, replacing any spell it had.
export function applyBuff(unit, spellId) {
  const spell = spells[spellId];
  if (!spell) throw new Error('spells.json has no spell called ' + spellId);
  statusOf(unit).buff = { id: spellId, turnsLeft: spell.turns };
}

// The spell on a unit, with its numbers from spells.json, or null.
export function buffOf(unit) {
  const buff = statusOf(unit).buff;
  if (!buff) return null;
  return { id: buff.id, turnsLeft: buff.turnsLeft, ...spells[buff.id] };
}

// Called at the end of the unit's own turn. The spell fades when its turns run out.
export function tickBuff(unit) {
  const status = statusOf(unit);
  if (!status.buff) return;
  status.buff.turnsLeft -= 1;
  if (status.buff.turnsLeft <= 0) status.buff = null;
}

// Short words shown above a unit: ENGAGED, OFF-BAL, and its spell.
export function statusTags(unit) {
  const tags = [];
  if (unit.engagedWith) tags.push({ text: 'ENGAGED', color: '#ffb35c' });
  if (isOffBalance(unit)) tags.push({ text: 'OFF-BAL', color: '#ff6b5a' });
  const buff = buffOf(unit);
  if (buff) tags.push({ text: buff.short, color: buff.color });
  return tags;
}
