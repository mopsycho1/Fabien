import spells from './data/spells.json';
import rules from './data/engagement.json';

// Short-lived conditions on a unit: being Off-Balance, a helpful spell (a
// buff, like a Verse), a harmful one (a hex, like Slow), and spells waiting to
// be ready again (cooldowns). Nothing here draws anything.
//
// A unit keeps them in unit.status:
//   unit.status.offBalance : true until the start of that unit's next turn
//   unit.status.buff       : { id: 'stone', turnsLeft: 2 } or null
//   unit.status.hex        : { id: 'slow', turnsLeft: 2 } or null
//   unit.status.cooldowns  : { husk: 2 } turns until a spell can be cast again
//   unit.status.exposed    : { defense: 2, evade: 10 } while Meditating, or null
//
// A unit only ever has one buff. A new one replaces the old one, so spells
// cannot pile up (the design notes ask us to avoid unlimited stacking).

function statusOf(unit) {
  if (!unit.status) unit.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null };
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

// How much the unit's conditions change one of its numbers in ordinary
// fighting: "attack", "defense", "evade" or "move".
//   - Off-Balance lowers defense and evade.
//   - A buff adds its "boosts" from spells.json (a Verse of Stone adds defense).
export function statMod(unit, stat) {
  let mod = 0;
  if (isOffBalance(unit)) {
    if (stat === 'defense') mod -= rules.offBalance.defense;
    if (stat === 'evade') mod -= rules.offBalance.evade;
  }
  const buff = buffOf(unit);
  if (buff && buff.boosts && buff.boosts[stat]) mod += buff.boosts[stat];
  const exposed = statusOf(unit).exposed;
  if (exposed && exposed[stat]) mod -= exposed[stat];
  return mod;
}

// ---------- Exposed (while Meditating) ----------

export function applyExposed(unit, amounts) {
  statusOf(unit).exposed = { ...amounts };
}

// Called at the start of the unit's own turn: it is on guard again.
export function clearExposed(unit) {
  statusOf(unit).exposed = null;
}

// ---------- Magic points ----------

// True if the unit has enough MP for the spell.
// True if the unit has the MP for this spell and it is not cooling down.
export function canAfford(unit, spellId) {
  return (unit.mp || 0) >= (spells[spellId].mp || 0) && cooldownOf(unit, spellId) === 0;
}

export function spendMp(unit, spellId) {
  unit.mp = Math.max(0, (unit.mp || 0) - (spells[spellId].mp || 0));
}

// Gives back MP, never above the unit's full pool.
export function restoreMp(unit, amount) {
  unit.mp = Math.min(unit.maxMp || 0, (unit.mp || 0) + amount);
}

// How far a unit can walk this turn (a Verse of Swiftness adds a step).
export function moveOf(unit) {
  return Math.max(0, unit.move + statMod(unit, 'move'));
}

// ---------- Buffs ----------

// Puts a spell on a unit for its next few turns, replacing any spell it had.
// power 2 is a doubled Verse (echoed by a Husk decoy).
export function applyBuff(unit, spellId, power = 1) {
  const spell = spells[spellId];
  if (!spell) throw new Error('spells.json has no spell called ' + spellId);
  statusOf(unit).buff = { id: spellId, turnsLeft: spell.turns, power };
}

// The spell on a unit, with its numbers from spells.json, or null.
// A spell is stronger on the class it suits (its "affinity" in spells.json):
// a Verse of Stone on a shield-bearing Guardian works twice as well.
export function buffOf(unit) {
  const buff = statusOf(unit).buff;
  if (!buff) return null;
  const spell = spells[buff.id];
  const times = affinityTimes(unit, buff.id) * (buff.power || 1);
  const boosts = {};
  for (const [stat, value] of Object.entries(spell.boosts || {})) boosts[stat] = value * times;
  return {
    id: buff.id,
    turnsLeft: buff.turnsLeft,
    ...spell,
    boosts,
    amount: (spell.amount || 0) * times,
    holdChance: spell.holdChance ? spell.holdChance * times : undefined,
    slipChance: spell.slipChance ? spell.slipChance * times : undefined,
    times,
  };
}

// How many times stronger a spell is on this unit: 2 on the class it suits, otherwise 1.
export function affinityTimes(unit, spellId) {
  const a = spells[spellId] && spells[spellId].affinity;
  return a && a.jobs.includes(unit.job) ? a.times : 1;
}

// ---------- Hexes ----------

// Slow: the unit's next turn is pushed back, and it is slower for a while.
// Its speed comes back when the hex fades. A new Slow replaces an old one.
// power 2 is a doubled Slow (echoed by a Husk decoy).
export function applySlow(unit, spellId, power = 1) {
  const spell = spells[spellId];
  const status = statusOf(unit);
  if (status.hex) unit.speed += status.hex.speedLoss; // undo the old one first
  const loss = Math.min(spell.speedLoss * power, unit.speed - 1); // never stop a unit completely
  unit.speed -= loss;
  unit.ct -= spell.delay * power;
  status.hex = { id: spellId, turnsLeft: spell.turns, speedLoss: loss };
}

export function hexOf(unit) {
  const hex = statusOf(unit).hex;
  return hex ? { ...hex, ...spells[hex.id] } : null;
}

// ---------- Poison ----------

// Poison: a few points of health lost at the start of each of the unit's
// next few turns. A new poison replaces an old one.
export function applyPoison(unit, spellId) {
  const spell = spells[spellId];
  statusOf(unit).poison = { id: spellId, turnsLeft: spell.turns, damage: spell.poison };
}

export function isPoisoned(unit) {
  return !!statusOf(unit).poison;
}

export function curePoison(unit) {
  statusOf(unit).poison = null;
}

// The start of a poisoned unit's turn: it loses health (never the last
// point). Returns how much it lost (0 if not poisoned).
export function tickPoison(unit) {
  const p = statusOf(unit).poison;
  if (!p) return 0;
  const lost = Math.min(p.damage, unit.hp - 1);
  unit.hp -= lost;
  p.turnsLeft -= 1;
  if (p.turnsLeft <= 0) statusOf(unit).poison = null;
  return lost;
}

// ---------- Cooldowns ----------

export function startCooldown(unit, spellId) {
  const turns = spells[spellId].cooldown || 0;
  if (turns > 0) statusOf(unit).cooldowns[spellId] = turns;
}

// How many more of its own turns the unit must wait to cast this spell (0 = ready).
export function cooldownOf(unit, spellId) {
  return statusOf(unit).cooldowns[spellId] || 0;
}

// ---------- End of turn ----------

// Called at the end of the unit's own turn: spells on it get one turn
// shorter, and its spells come one turn closer to being ready.
export function tickBuff(unit) {
  const status = statusOf(unit);
  if (status.buff) {
    status.buff.turnsLeft -= 1;
    if (status.buff.turnsLeft <= 0) status.buff = null;
  }
  if (status.hex) {
    status.hex.turnsLeft -= 1;
    if (status.hex.turnsLeft <= 0) {
      unit.speed += status.hex.speedLoss;
      status.hex = null;
    }
  }
  for (const id of Object.keys(status.cooldowns)) {
    status.cooldowns[id] -= 1;
    if (status.cooldowns[id] <= 0) delete status.cooldowns[id];
  }
}

// Short words shown above a unit: ENGAGED, OFF-BAL, and its spell.
export function statusTags(unit) {
  const tags = [];
  if (unit.engagedWith) tags.push({ text: 'ENGAGED', color: '#ffb35c' });
  if (isOffBalance(unit)) tags.push({ text: 'OFF-BAL', color: '#ff6b5a' });
  const buff = buffOf(unit);
  if (buff) tags.push({ text: buff.short, color: buff.color });
  const hex = hexOf(unit);
  if (hex) tags.push({ text: hex.short, color: hex.color });
  if (statusOf(unit).exposed) tags.push({ text: 'EXPOSED', color: '#ff9a7a' });
  // signature stances (see signature.js)
  if (unit.fury) tags.push({ text: 'BLOODIED ' + unit.fury, color: '#ff6b5a' });
  if (unit.charge) tags.push({ text: 'CHARGE ' + unit.charge, color: '#ffd27a' });
  if (unit.bulwark) tags.push({ text: 'BULWARK ' + unit.bulwark, color: '#d9b77a' });
  if (unit.hidden) tags.push({ text: 'HIDDEN', color: '#8fd18a' }); // Husk: enemies chase the decoy
  if (unit.meditating) tags.push({ text: 'MEDITATING', color: '#7fd6c4' }); // her next turn is spent in the trance
  if (unit.aiming) tags.push({ text: 'AIMING', color: '#9fdc6a' }); // a Poison Arrow, released next turn
  if (unit.markedBy && unit.markedBy.alive) tags.push({ text: 'MARKED', color: '#9fdc6a' }); // an archer's Poison Arrow is aimed at it
  if (statusOf(unit).poison) tags.push({ text: 'POISON', color: '#9fdc6a' });
  if (unit.echoReady) tags.push({ text: 'ECHO', color: '#c9a8ff' }); // Husk: the decoy will copy the next spell
  // In a clash, a hero's last stance is known to everyone (an enemy's is not)
  if (unit.engagedWith && unit.side === 'hero' && unit.stance && unit.stance !== 'break') {
    tags.push({ text: unit.stance.toUpperCase(), color: { press: '#ff9a6a', guard: '#e8c690', slip: '#9fd4ff' }[unit.stance] });
  }
  return tags;
}
