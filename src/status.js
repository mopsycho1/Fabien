import spells from './data/spells.json';
import rules from './data/engagement.json';
import conditions from './data/conditions.json';
import terrain from './data/terrain.json';

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
//   unit.status.buff.lent  : { mp: 3, max: 3 } MP a Verse lends a unit with none of its own
//   unit.status.rooted     : true while Gaha stands his ground under Stone (until his next turn)
//   unit.status.burn       : { damage: 2, turnsLeft: 3 } after Layra's Wildfire
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
  // slammed into a wall: it fights worse for a moment (conditions.json)
  if (isDisoriented(unit) && ['attack', 'defense', 'evade'].includes(stat)) mod -= conditions.disoriented[stat];
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

// True if the unit has the MP for this spell and it is not cooling down.
// A Verse-changed move (see below) has no cooldown of its own: a unit with no
// MP of its own pays for it with the MP its Verse lent it.
export function canAfford(unit, spellId) {
  const spell = spells[spellId];
  if (spell.verse && !hasOwnMp(unit)) return lentMp(unit) >= (spell.mp || 0);
  return (unit.mp || 0) >= (spell.mp || 0) && cooldownOf(unit, spellId) === 0;
}

export function spendMp(unit, spellId) {
  const spell = spells[spellId];
  const cost = spell.mp || 0;
  const lent = spell.verse && !hasOwnMp(unit) ? statusOf(unit).buff && statusOf(unit).buff.lent : null;
  if (lent) lent.mp = Math.max(0, lent.mp - cost);
  else unit.mp = Math.max(0, (unit.mp || 0) - cost);
}

// True for units that use magic and so always have an MP bar (Layra; Rabdul
// once he has Enchant). The others only show MP while a Verse lends them some.
export function hasOwnMp(unit) {
  return (unit.maxMp || 0) > 0;
}

// The MP a Verse lent this unit (0 if none), and how much it started with.
export function lentMp(unit) {
  const buff = statusOf(unit).buff;
  return buff && buff.lent ? buff.lent.mp : 0;
}
export function lentMpMax(unit) {
  const buff = statusOf(unit).buff;
  return buff && buff.lent ? buff.lent.max : 0;
}

// What the card shows as MP: { mp, max, lent }, or null for no MP bar
// (Baiyee, 29 Oct: units without magic show MP only while a Verse is on them).
export function mpShown(unit) {
  if (hasOwnMp(unit)) return { mp: unit.mp, max: unit.maxMp, lent: false };
  const max = lentMpMax(unit);
  return max > 0 ? { mp: lentMp(unit), max, lent: true } : null;
}

// Gives back MP, never above the unit's full pool.
export function restoreMp(unit, amount) {
  unit.mp = Math.min(unit.maxMp || 0, (unit.mp || 0) + amount);
}

// How far a unit can walk this turn (a Verse of Swiftness adds a step).
export function moveOf(unit) {
  return Math.max(0, unit.move + statMod(unit, 'move'));
}

// How the unit walks (movement.js): how many levels it can step up from one
// tile to the next, and whether it flies over anyone in its way. Layra under a
// Verse of Swiftness hops between high spots (spells.json, freeClimb).
export function moveRules(unit) {
  const free = verseEffect(unit, 'freeClimb');
  return free ? { climb: Infinity, fly: true } : { climb: terrain.climbLimit ?? Infinity, fly: false };
}

// ---------- Buffs ----------

// Puts a spell on a unit for its next few turns, replacing any spell it had.
// power 2 is a doubled Verse (echoed by a Husk decoy).
// A Verse on a unit with no MP of its own lends it the Verse's MP (twice as
// much when a Husk echo doubles it), but only if the Verse changes one of its
// moves: that MP is what the changed move costs (roadmap 3.13).
export function applyBuff(unit, spellId, power = 1) {
  const spell = spells[spellId];
  if (!spell) throw new Error('spells.json has no spell called ' + spellId);
  const buff = { id: spellId, turnsLeft: spell.turns, power };
  if (spell.kind === 'buff' && !hasOwnMp(unit) && verseMovesOf(unit, spellId).length > 0) {
    const mp = (spell.mp || 0) * power;
    buff.lent = { mp, max: mp };
  }
  statusOf(unit).buff = buff;
}

// ---------- Verse-changed moves (roadmap 3.2) ----------
// While a Verse is on a unit, one of its moves can turn into another. In
// spells.json, a spell with "verse": { "of": "intercept", "with": "stone" }
// replaces Intercept while a Verse of Stone is on the unit ("jobs" limits it
// to some classes; "of": "attack" changes the unit's ordinary attack).

// Every Verse-changed move this unit would get from this Verse.
export function verseMovesOf(unit, verseId) {
  const own = new Set([...(unit.spells || []), 'attack']);
  return Object.keys(spells).filter((id) => {
    const v = spells[id].verse;
    return v && v.with === verseId && own.has(v.of) && (!v.jobs || v.jobs.includes(unit.job));
  });
}

// The move the unit gets when it uses baseId right now: the Verse-changed one
// while a Verse is on it (for a unit without MP, while the lent MP lasts),
// otherwise baseId itself.
export function activeMove(unit, baseId) {
  const buff = statusOf(unit).buff;
  if (!buff) return baseId;
  const id = verseMovesOf(unit, buff.id).find((m) => spells[m].verse.of === baseId);
  if (!id) return baseId;
  if (!hasOwnMp(unit) && lentMp(unit) < (spells[id].mp || 0)) return baseId; // spent: the move is back to normal
  return id;
}

// The base move a Verse-changed move replaces (or the move itself).
export function baseMoveOf(id) {
  return spells[id] && spells[id].verse ? spells[id].verse.of : id;
}

// A Verse's effect that isn't a changed move (spells.json: "stillGuard" on
// Stone, "freeClimb" on Swiftness), if the Verse on this unit has it for its class.
export function verseEffect(unit, key) {
  const buff = statusOf(unit).buff;
  if (!buff) return null;
  const effect = spells[buff.id][key];
  return effect && (!effect.jobs || effect.jobs.includes(unit.job)) ? effect : null;
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

// ---------- Stun ----------

// Stunned: the unit loses its next turn (see the battle's startTurn).
// While stunned it cannot dodge, and hits on it are flank hits (combat.js).
export function applyStun(unit) {
  statusOf(unit).stunned = true;
}

export function isStunned(unit) {
  return !!(unit && unit.status && unit.status.stunned);
}

export function clearStun(unit) {
  statusOf(unit).stunned = false;
}

// ---------- Rooted (Gaha under a Verse of Stone, roadmap 3.12) ----------

// At the end of his turn: if he didn't move, he stands his ground until his
// next turn (half damage, can't be pushed). Returns true if he did.
export function settleRooted(unit) {
  const guard = verseEffect(unit, 'stillGuard');
  statusOf(unit).rooted = !!guard && !unit.hasMoved;
  return statusOf(unit).rooted;
}

export function isRooted(unit) {
  return !!(unit && unit.status && unit.status.rooted);
}

export function clearRooted(unit) {
  statusOf(unit).rooted = false;
}

// How much of a blow a rooted unit takes (1 = all of it).
export function rootedShare() {
  return spells.stone.stillGuard.damageTaken;
}

// ---------- Disoriented ----------

// Disoriented (Suleiman, 29 Oct): a unit pushed into a wall, higher ground or
// another unit slams into it. Until the end of its next turn it fights worse
// (see statMod) and magic hurts it more (combat.js). The numbers are in
// conditions.json. ownTurn: it happened during the unit's own turn, so the
// "next turn" is the one after this.
export function applyDisoriented(unit, ownTurn = false) {
  statusOf(unit).disoriented = { turnsLeft: ownTurn ? 2 : 1 };
}

export function isDisoriented(unit) {
  return !!(unit && unit.status && unit.status.disoriented);
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

// ---------- Burn (Layra's Wildfire, roadmap 3.9) ----------

// Burn works like poison: damage at the start of each of the unit's next few
// turns, never the last point of health; Herbs put it out.
export function applyBurn(unit, spellId) {
  const spell = spells[spellId];
  statusOf(unit).burn = { id: spellId, turnsLeft: spell.turns, damage: spell.burn };
}

export function isBurning(unit) {
  return !!(unit && unit.status && unit.status.burn);
}

export function cureBurn(unit) {
  statusOf(unit).burn = null;
}

export function tickBurn(unit) {
  const b = statusOf(unit).burn;
  if (!b) return 0;
  const lost = Math.min(b.damage, unit.hp - 1);
  unit.hp -= lost;
  b.turnsLeft -= 1;
  if (b.turnsLeft <= 0) statusOf(unit).burn = null;
  return lost;
}

// ---------- Cooldowns ----------

// A Verse-changed move has no cooldown of its own; using it starts the
// cooldown of the move it replaces (Sonic Javelin: Spear Throw's).
export function startCooldown(unit, spellId) {
  const id = baseMoveOf(spellId);
  const turns = (spells[id] && spells[id].cooldown) || 0;
  if (turns > 0) statusOf(unit).cooldowns[id] = turns;
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
  if (status.disoriented) {
    status.disoriented.turnsLeft -= 1;
    if (status.disoriented.turnsLeft <= 0) status.disoriented = null;
  }
  for (const id of Object.keys(status.cooldowns)) {
    status.cooldowns[id] -= 1;
    if (status.cooldowns[id] <= 0) delete status.cooldowns[id];
  }
}

// Short words shown above a unit: ENGAGED, OFF-BAL, and its spell.
// Each tag can name an "icon" (public/art/icons, from Suleiman's status
// sheet, roadmap 6.7): over the unit the picture shows instead of the word,
// with "count" as a small number on it (Bloodied 2). The unit's card shows
// the picture and the word together, so the icons are easy to learn.
export function statusTags(unit) {
  const tags = [];
  if (unit.engagedWith) tags.push({ text: 'ENGAGED', color: '#ffb35c' });
  if (isOffBalance(unit)) tags.push({ text: 'OFF-BAL', color: '#ff6b5a', icon: 'offbalance' });
  // (a spell with an "icon" in spells.json shows its picture over the unit instead of the word)
  const buff = buffOf(unit);
  if (buff) tags.push({ text: buff.short, color: buff.color, icon: buff.icon });
  const hex = hexOf(unit);
  if (hex) tags.push({ text: hex.short, color: hex.color, icon: hex.icon });
  if (statusOf(unit).exposed) tags.push({ text: 'EXPOSED', color: '#ff9a7a', icon: 'exposed' });
  // signature stances (see signature.js)
  if (unit.fury) tags.push({ text: 'BLOODIED ' + unit.fury, color: '#ff6b5a', icon: 'bloodied', count: unit.fury });
  if (unit.charge) tags.push({ text: 'CHARGE ' + unit.charge, color: '#ffd27a', icon: 'charge', count: unit.charge });
  if (unit.bulwark) tags.push({ text: 'BULWARK ' + unit.bulwark, color: '#d9b77a', icon: 'bulwark', count: unit.bulwark });
  if (unit.hidden) tags.push({ text: 'HIDDEN', color: '#8fd18a', icon: 'hidden' }); // Husk: enemies chase the decoy
  if (unit.meditating) tags.push({ text: 'MEDITATING', color: '#7fd6c4', icon: 'meditating' }); // her next turn is spent in the trance
  if (unit.aiming) tags.push({ text: 'AIMING', color: '#9fdc6a', icon: 'aiming' }); // a Poison Arrow, released next turn
  if (unit.markedBy && unit.markedBy.alive) tags.push({ text: 'MARKED', color: '#9fdc6a', icon: 'marked' }); // an archer's Poison Arrow is aimed at it
  if (statusOf(unit).poison) tags.push({ text: 'POISON', color: '#9fdc6a', icon: 'poison' });
  if (statusOf(unit).burn) tags.push({ text: 'BURN', color: '#ff8a3c', icon: 'burn' }); // Layra's Wildfire
  if (statusOf(unit).rooted) tags.push({ text: 'ROOTED', color: '#d9b77a' }); // Gaha standing his ground under Earth's Bulwark (no icon yet)
  if (statusOf(unit).stunned) tags.push({ text: 'STUNNED', color: '#ffe08a', icon: 'stunned' });
  if (statusOf(unit).disoriented) tags.push({ text: 'DISORIENTED', color: '#e3a8ff', icon: 'disoriented' }); // slammed into a wall
  if (unit.echoReady) tags.push({ text: 'ECHO', color: '#c9a8ff', icon: 'echo' }); // Husk: the decoy will copy the next spell
  // In a clash, a hero's last stance is known to everyone (an enemy's is not)
  if (unit.engagedWith && unit.side === 'hero' && unit.stance && unit.stance !== 'break') {
    tags.push({ text: unit.stance.toUpperCase(), color: { press: '#ff9a6a', guard: '#e8c690', slip: '#9fd4ff' }[unit.stance] });
  }
  return tags;
}
