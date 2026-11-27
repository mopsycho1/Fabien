import spells from './data/spells.json';
import rules from './data/engagement.json';
import conditions from './data/conditions.json';
import terrain from './data/terrain.json';
import { attuneTimes, dominionStep, MASK_MAX } from './kings.js';

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
//   unit.status.enchant    : { damage: 2, turnsLeft: 3 } Rabdul's Enchant on its weapon
//
// A unit only ever has one buff. A new one replaces the old one, so spells
// cannot pile up (the design notes ask us to avoid unlimited stacking).

// Gadara's Dominion (Phase 10): the battle tells us whether a unit stands within 2 tiles of a foe who has it
// (BattleScene sets this; without a battle nobody is under it).
let underDominion = () => false;
export function setDominionLookup(fn) {
  underDominion = fn;
}

// ---------- Sudeen's Ward (19.3, 13.68) ----------
// Allies on the tiles next to him get more defense, and he takes a share of each hit that lands on them (the scene's
// landHit). Off while he is in a clash, Stunned, at 1 health, or switched off (unit.wardOff). The scene hands over
// its list of units once (setWardUnits), so statMod can find him.
let wardUnits = () => [];
export function setWardUnits(fn) {
  wardUnits = fn;
}
export function wardActive(warder) {
  return !!(warder && warder.alive && warder.passives && warder.passives.ward && !warder.wardOff && !warder.engagedWith && !isStunned(warder) && warder.hp > 1);
}
// The Ward-er covering this unit, or null
export function wardOf(unit) {
  if (!unit || unit.isDecoy) return null;
  return wardUnits().find((w) => w !== unit && w.side === unit.side && wardActive(w) && Math.abs(w.col - unit.col) + Math.abs(w.row - unit.row) === 1) || null;
}
function wardStone(warder) {
  const b = warder.status && warder.status.buff;
  return !!(b && b.id === 'stone');
}
export function wardDefense(unit) {
  const w = wardOf(unit);
  if (!w) return 0;
  const k = w.passives.ward;
  return wardStone(w) ? k.stoneDefense : k.defense;
}
// How much of a hit of "damage" the Ward-er takes: a third rounded up, at most 4 (under Stone half, at most 5), and
// never so much that he drops below 1 health. Returns { warder, share } or null.
export function wardShare(unit, damage) {
  const w = wardOf(unit);
  if (!w || damage <= 0) return null;
  const k = w.passives.ward;
  const stone = wardStone(w);
  const share = Math.min(stone ? k.stoneCap : k.cap, Math.ceil(damage / (stone ? k.stoneShareOf : k.shareOf)), w.hp - 1, damage);
  return share > 0 ? { warder: w, share } : null;
}

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
  if (stat === 'defense') mod += wardDefense(unit); // next to Sudeen (19.3): armour, so it stacks with any Verse
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
  return (unit.mp || 0) >= (spell.mp || 0) && cooldownOf(unit, spellId) === 0 && usesLeft(unit, spellId) !== 0 && !pinnedFrom(unit, spellId);
}

// The skills that carry their user across the board (a charge, a lunge, a dive, Husk, Smoke Bomb's slip, the bull's
// Horn Charge). A Pinned unit (the archer's Pinning Shot, 19.6) cannot use them.
export const MOVING_KINDS = ['charge', 'lunge', 'dive', 'escape', 'smoke', 'hornCharge'];
export function pinnedFrom(unit, spellId) {
  return isPinned(unit) && !!spells[spellId] && MOVING_KINDS.includes(spells[spellId].kind);
}

// A skill with "uses" in spells.json can be used only that many times a battle
// (Herbs: 3, roadmap 1.30). Returns how many are left, or null for no limit.
export function usesLeft(unit, spellId) {
  const spell = spells[spellId];
  if (!spell || !spell.uses) return null;
  const used = (statusOf(unit).used || {})[spellId] || 0;
  return Math.max(0, spell.uses - used);
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
  if (isPinned(unit)) return 0; // pinned to the ground by an arrow (19.6): no walking this turn
  const sneak = unit.thiefHidden && unit.passives && unit.passives.hiddenMove ? unit.passives.hiddenMove : 0; // Hidden Movement (the Thief, 19.2): +2 while Hidden
  return Math.max(0, unit.move + statMod(unit, 'move') + sneak);
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
// power 2 is a doubled Verse (echoed by a Husk decoy): twice the strength and twice the turns.
// A Verse on a unit with no MP of its own lends it the Verse's MP (twice as
// much when a Husk echo doubles it), but only if the Verse changes one of its
// moves: that MP is what the changed move costs (roadmap 3.13).
export function applyBuff(unit, spellId, power = 1) {
  const spell = spells[spellId];
  if (!spell) throw new Error('spells.json has no spell called ' + spellId);
  // an echoed Verse (power 2) is twice as strong AND lasts twice as many turns (13.58, Suleiman 15 Nov)
  const buff = { id: spellId, turnsLeft: spell.turns * power, power };
  if (spell.kind === 'buff' && !hasOwnMp(unit) && verseMovesOf(unit, spellId).length > 0) {
    let mp = (spell.mp || 0) * power;
    // 1.84 (Suleiman 21 Nov: Mantle gave no special skills): a half-strength Verse (Alagara's Mantle, power 0.5) lent half
    // the MP, 1.5 of the 3 a Verse move costs, so the move was never affordable and the fighter kept his plain one. The
    // numbers stay at half strength, but the Verse lends at least enough for one Verse move.
    if (power < 1) mp = Math.max(mp, Math.min(...verseMovesOf(unit, spellId).map((m) => spells[m].mp || 0)));
    buff.lent = { mp, max: mp };
  }
  // King Alagara (Attunement, 10.18): a new Verse on him while he holds another sends the old one to his Echo
  // slot instead of throwing it away (the same Verse again just refreshes it)
  const had = statusOf(unit).buff;
  if (unit.attune && had && had.id !== spellId && spells[had.id] && spells[had.id].kind === 'buff' && spell.kind === 'buff') unit.attune.echo = had;
  if (unit.attune && unit.attune.echo && unit.attune.echo.id === spellId) unit.attune.echo = null;
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

// Layra's Healing Wind (10.50): under Swiftness, with the MP for it, her Attack is Healing Wind. Returns the id or
// null. (Not a "verse" move: the attack paths stay Lightning; the scene also needs someone in reach to be hurt.)
export function healInPlaceOf(unit) {
  const buff = statusOf(unit).buff;
  if (!buff) return null;
  for (const id of Object.keys(spells)) {
    const p = spells[id].inPlaceOf;
    if (!p || p.of !== 'attack' || p.with !== buff.id || (p.jobs && !p.jobs.includes(unit.job))) continue;
    if ((unit.mp || 0) < (spells[id].mp || 0)) return null;
    return id;
  }
  return null;
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
  const weak = underDominion(unit); // Gadara's Dominion: one step weaker (kings.json)
  // (a half-strength Verse, from Alagara's Mantle, is rounded: no half steps of movement)
  const round = (stat, v) => (stat === 'move' ? Math.floor(v) : Math.round(v));
  for (const [stat, value] of Object.entries(spell.boosts || {})) {
    let v = value * times * attuneTimes(unit, value); // Alagara: his Active Verse is 50 percent stronger
    if (weak && v > 0) v = Math.max(0, v - dominionStep(stat));
    boosts[stat] = round(stat, v);
  }
  let amount = Math.round((spell.amount || 0) * times * attuneTimes(unit, spell.amount || 0));
  if (weak && amount > 0) amount = Math.max(0, amount - dominionStep('amount'));
  return {
    id: buff.id,
    turnsLeft: buff.turnsLeft,
    ...spell,
    boosts,
    amount,
    dominion: weak,
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
// turns: how many of its turns it lasts (1 for a slam; Kofi's Haunt sets its own, 13.60). by: what caused it
// ('haunt' keeps his Haunt smoke standing on the unit while it lasts, 1.71).
export function applyDisoriented(unit, ownTurn = false, turns = 1, by = null) {
  statusOf(unit).disoriented = { turnsLeft: turns + (ownTurn ? 1 : 0), by };
}

// Kofi's Haunt is a hex (13.60, Suleiman 15 Nov): it rolls against the target's magic defense before it lands.
// The chance in percent: base + perPoint for each point of the caster's magic attack over the target's magic
// defense (fewer when the target's is higher), kept between min and max (spells.json "haunt.resist").
export function hexChance(caster, target, rule) {
  const edge = ((caster.magicAttack || 0) + statMod(caster, 'magicAttack')) - ((target.magicDefense || 0) + statMod(target, 'magicDefense'));
  return Math.max(rule.min, Math.min(rule.max, Math.round(rule.base + rule.perPoint * edge)));
}

// ---------- Blinded (the archer's Smoke Bomb, roadmap 13.26) ----------
// Until the end of its next turn the unit's attacks miss far more often (conditions.json), and it
// cannot start a clash or take aim.
export function applyBlinded(unit, ownTurn = false) {
  statusOf(unit).blinded = { turnsLeft: ownTurn ? conditions.blinded.turns + 1 : conditions.blinded.turns };
}

export function isBlinded(unit) {
  return !!(unit && unit.status && unit.status.blinded);
}

// ---------- Pinned (the archer's Pinning Shot, 19.6) ----------
// Through its next turn the unit cannot walk or use a skill that moves it (MOVING_KINDS). It still attacks, casts
// and fights in a clash; a push or a pull still moves it. Set during the archer's turn, so 1 turn = its next one.
export function applyPinned(unit) {
  statusOf(unit).pinned = { turnsLeft: conditions.pinned.turns };
}

export function isPinned(unit) {
  return !!(unit && unit.status && unit.status.pinned);
}

// ---------- The archer's Poison Weapon and Prime Bow (1.82) ----------
// unit.coated: her next hit that lands poisons. unit.primed: { ready } once Prime Bow is drawn; "ready" from the
// start of her next turn, when her bow Attack has the bonus (spells.json primeBow) and reaches further.
export function primeBonus(attacker, defender, holdsCloseWeapon) {
  if (!attacker || !attacker.primed || !attacker.primed.ready || holdsCloseWeapon) return 0;
  return spells.primeBow.attackBonus;
}

// Patient Hunter (19.6): a bow shot from where she stood at the start of her turn is steadier.
export function patientBonus(attacker, holdsCloseWeapon) {
  const p = attacker && attacker.passives && attacker.passives.patientHunter;
  if (!p || holdsCloseWeapon || attacker.noPatient) return 0;
  return (attacker.stepsUsed || 0) === 0 && !attacker.hasMoved ? p : 0;
}

export function isDisoriented(unit) {
  return !!(unit && unit.status && unit.status.disoriented);
}

// ---------- Poison ----------

// Poison: a few points of health lost at the start of each of the unit's
// next few turns. A new poison replaces an old one.
// Aegis (Alagara, 10.46) holding on a fighter: poison, Bleeding and burn cannot take hold (1.104, Suleiman 22 Nov: "Had poison
// hit me despite using aegis to nullify the damage"), and a tick on a fighter already poisoned is soaked by the shield.
export function shielded(unit) {
  return !!(unit && unit.shield && unit.shield.hp > 0);
}
// A tick of poison or burn against Aegis: the shield takes it (its points go down; at 0 it breaks). Returns what got through.
function soakTick(unit, amount) {
  if (!shielded(unit) || amount <= 0) return amount;
  const soaked = Math.min(unit.shield.hp, amount);
  unit.shield.hp -= soaked;
  if (unit.shield.hp <= 0) unit.shield = null;
  unit.tickSoaked = (unit.tickSoaked || 0) + soaked; // (read once by the battle to show "Shield -n")
  return amount - soaked;
}

// Returns false when Aegis blocked it (the caller shows "Blocked" in place of "Poisoned").
export function applyPoison(unit, spellId) {
  if (shielded(unit)) return false;
  const spell = spells[spellId];
  statusOf(unit).poison = { id: spellId, turnsLeft: spell.turns, damage: spell.poison };
  return true;
}

// Bleeding (the Thief's Ambush, 19.2) is a poison with the Ambush's numbers, shown as BLEEDING; a healing item stops it
export function isBleeding(unit) {
  const p = statusOf(unit).poison;
  return !!(p && spells[p.id] && spells[p.id].bleed);
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
  const lost = Math.min(soakTick(unit, p.damage), unit.hp - 1);
  unit.hp -= lost;
  p.turnsLeft -= 1;
  if (p.turnsLeft <= 0) statusOf(unit).poison = null;
  return lost;
}

// ---------- Renewal (Kofi's Water blessing through Infuse, roadmap 1.49, 6.38) ----------

// The start of a unit's turn while Renewal is on it: it heals a share of its health (spells.json "regen",
// at least "minHeal" points) and loses one weak status ("cleanse": poison, burn, blinded, disoriented, in that order).
// Returns { heal, cured } (cured is the name of the status that lifted, or null).
// locked: the fighter is in a clash, so Renewal does not heal or cure this turn (roadmap 1.65); it still counts down.
export function tickRenewal(unit, locked = false) {
  const buff = statusOf(unit).buff;
  if (!buff || buff.id !== 'renewal' || locked) return { heal: 0, cured: null };
  const spell = spells.renewal;
  const heal = Math.min(Math.max(spell.minHeal || 1, Math.round(unit.maxHp * spell.regen * (buff.power || 1))), unit.maxHp - unit.hp); // about 5 percent, but never under minHeal (1.51: 5 percent of 28 to 50 health is 1 or 2 points, which nobody noticed)
  unit.hp += heal;
  const status = statusOf(unit);
  let cured = null;
  if (status.poison) { status.poison = null; cured = 'poison'; }
  else if (status.burn) { status.burn = null; cured = 'burn'; }
  else if (status.blinded) { status.blinded = null; cured = 'blinded'; }
  else if (status.disoriented) { status.disoriented = null; cured = 'disoriented'; }
  return { heal, cured };
}

// ---------- Burn (Layra's Wildfire, roadmap 3.9) ----------

// Burn works like poison: damage at the start of each of the unit's next few
// turns, never the last point of health; Herbs put it out.
export function applyBurn(unit, spellId) {
  if (shielded(unit)) return false; // (Aegis blocks it, 1.104)
  const spell = spells[spellId];
  statusOf(unit).burn = { id: spellId, turnsLeft: spell.turns, damage: spell.burn };
  return true;
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
  const lost = Math.min(soakTick(unit, b.damage), unit.hp - 1);
  unit.hp -= lost;
  b.turnsLeft -= 1;
  if (b.turnsLeft <= 0) statusOf(unit).burn = null;
  return lost;
}

// ---------- Enchanted (Rabdul's Enchant, roadmap 4.1) ----------

// Shango's symbol on a unit's weapon: its hits do more damage for a few of
// its own turns (spells.json, enchant). Kept apart from the Verses (a unit
// can carry a Verse and an Enchant at once). ownTurn: cast on itself during
// its own turn, so the turn it was cast in doesn't count.
export function applyEnchant(unit, spellId, ownTurn = false) {
  const spell = spells[spellId];
  statusOf(unit).enchant = { id: spellId, damage: spell.damage, turnsLeft: spell.turns + (ownTurn ? 1 : 0) };
}

export function isEnchanted(unit) {
  return !!(unit && unit.status && unit.status.enchant);
}

// The extra damage an enchanted weapon does to this target: the full bonus,
// or less against a Drenched target (the water dulls the flames: terrain.json
// water.fireTimes, so +2 becomes +1).
export function enchantBonus(attacker, defender) {
  const e = attacker && attacker.status && attacker.status.enchant;
  if (!e) return 0;
  const dmg = Math.max(0, e.damage - (underDominion(attacker) ? 1 : 0)); // Gadara's Dominion: it burns 1 less near him
  return isDrenched(defender) ? Math.round(dmg * terrain.water.fireTimes) : dmg;
}

// ---------- Drenched (the Hidden Cavern's water, roadmap 11.4) ----------

// A unit standing in water is Drenched, and stays so for a few of its own
// turns after it leaves (terrain.json, water). Drenched units take more
// damage from lightning and less from fire (combat.js), and can't be set alight.
export function applyDrenched(unit, turns) {
  statusOf(unit).drenched = { turnsLeft: turns };
}

export function isDrenched(unit) {
  return !!(unit && unit.status && unit.status.drenched);
}

// The end of its own turn, out of the water: a turn drier.
export function dryOff(unit) {
  const d = statusOf(unit).drenched;
  if (!d) return;
  d.turnsLeft -= 1;
  if (d.turnsLeft <= 0) statusOf(unit).drenched = null;
}

// Tayo's Element Blast spends the element on him: the Enchant ends (fire) or he
// dries off (water). Roadmap 13.4.
export function spendElement(unit, fire) {
  if (fire) statusOf(unit).enchant = null;
  else statusOf(unit).drenched = null;
}

// What a unit's attack is made of right now: its Verse-changed attack's
// element (Wildfire: fire, Thunderclap: lightning), else its own (Layra's
// Lightning), else nothing in particular.
export function attackElement(unit) {
  const id = activeMove(unit, 'attack');
  if (id !== 'attack' && spells[id] && spells[id].element) return spells[id].element;
  return unit.element || null;
}

// ---------- Cooldowns ----------

// A Verse-changed move has no cooldown of its own; using it starts the
// cooldown of the move it replaces (Sonic Javelin: Spear Throw's).
export function startCooldown(unit, spellId) {
  const id = baseMoveOf(spellId);
  if (spells[id] && spells[id].uses) {
    const st = statusOf(unit);
    st.used = st.used || {};
    st.used[id] = (st.used[id] || 0) + 1; // one more of its limited uses is gone
  }
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
  // Alagara's stored (Echo) Verse (10.47, Suleiman 21 Nov: "when one of his buffs runs out, he switches to the one
  // he has stored"): it is kept, not counted down, while it sits in the Echo. It used to wear off at the same pace as
  // the Active one, so both ran out together and the switch hardly ever happened. When his Active Verse runs out the
  // stored one takes over with the turns it had left (no Surge, 10.18); unit.storedSwitch tells the scene to say so.
  if (unit.attune && !status.buff && unit.attune.echo) {
    status.buff = unit.attune.echo;
    unit.attune.echo = null;
    unit.storedSwitch = status.buff.id;
  }
  if (status.hex) {
    status.hex.turnsLeft -= 1;
    if (status.hex.turnsLeft <= 0) {
      unit.speed += status.hex.speedLoss;
      status.hex = null;
    }
  }
  if (status.enchant) {
    status.enchant.turnsLeft -= 1;
    if (status.enchant.turnsLeft <= 0) status.enchant = null;
  }
  if (status.disoriented) {
    status.disoriented.turnsLeft -= 1;
    if (status.disoriented.turnsLeft <= 0) status.disoriented = null;
  }
  if (status.blinded) {
    status.blinded.turnsLeft -= 1;
    if (status.blinded.turnsLeft <= 0) status.blinded = null;
  }
  if (status.pinned) {
    status.pinned.turnsLeft -= 1;
    if (status.pinned.turnsLeft <= 0) status.pinned = null;
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
  if (unit.riposte) tags.push({ text: 'RIPOSTE ' + unit.riposte, color: '#9fd4ff', icon: 'bloodied', count: unit.riposte }); // Gaha's stacks (no icon of its own yet)
  if (unit.shield && unit.shield.hp > 0) tags.push({ text: 'SHIELD ' + unit.shield.hp, color: '#e8c87a', icon: 'bulwark', count: unit.shield.hp }); // Alagara's Aegis (10.46)
  if (unit.passives && unit.passives.ward && unit.alive && (wardActive(unit) || unit.wardOff)) tags.push(unit.wardOff ? { text: 'WARD OFF', color: '#8a8f99', icon: 'ward_off' } : { text: 'WARD', color: '#e8c87a', icon: 'ward' }); // Sudeen's Ward (19.3; his Golden Shield Triad icon, 6.93)
  if (unit.zone && unit.zone.charges > 0) tags.push(unit.zone.mode === 'spear' ? { text: 'SPEAR WARD ' + unit.zone.charges, color: '#9fc4e8', count: unit.zone.charges } : { text: 'HOLD THE LINE', color: '#d9b77a' }); // Rabdul's stances (19.4)
  if (unit.bulwark) tags.push({ text: 'BULWARK ' + unit.bulwark, color: '#d9b77a', icon: 'bulwark', count: unit.bulwark });
  if (unit.hidden) tags.push({ text: 'HIDDEN', color: '#8fd18a', icon: 'hidden' }); // Husk: enemies chase the decoy
  if (unit.meditating) tags.push({ text: 'MEDITATING', color: '#7fd6c4', icon: 'meditating' }); // her next turn is spent in the trance
  if (unit.aiming) tags.push({ text: 'AIMING', color: '#9fdc6a', icon: 'aiming' }); // a Poison Arrow, released next turn
  if (unit.markedBy && unit.markedBy.alive) tags.push({ text: 'MARKED', color: '#9fdc6a', icon: 'marked' }); // an archer's Poison Arrow is aimed at it
  if (statusOf(unit).poison) tags.push(isBleeding(unit) ? { text: 'BLEEDING', color: '#ff7a7a', icon: 'poison' } : { text: 'POISON', color: '#9fdc6a', icon: 'poison' });
  if (statusOf(unit).burn) tags.push({ text: 'BURN', color: '#ff8a3c', icon: 'burn' }); // Layra's Wildfire
  if (statusOf(unit).enchant) tags.push({ text: 'ENCHANTED', color: '#ff8a3c', icon: 'enchanted' }); // Rabdul's Enchant: a burning weapon
  if (statusOf(unit).rooted) tags.push({ text: 'ROOTED', color: '#d9b77a' }); // Gaha standing his ground under Earth's Bulwark (no icon yet)
  if (statusOf(unit).stunned) tags.push({ text: 'STUNNED', color: '#ffe08a', icon: 'stunned' });
  if (statusOf(unit).disoriented) tags.push({ text: 'DISORIENTED', color: '#e3a8ff', icon: 'disoriented' }); // slammed into a wall
  if (statusOf(unit).pinned) tags.push({ text: 'PINNED', color: '#d9b77a' }); // the archer's Pinning Shot (19.6)
  if (unit.coated) tags.push({ text: 'POISON BLADE', color: '#9fdc6a', icon: 'poison' }); // her next hit poisons (1.82)
  if (unit.primed) tags.push({ text: 'PRIMED', color: '#ffd27a' }); // Prime Bow drawn (1.82)
  if (statusOf(unit).blinded) tags.push({ text: 'BLINDED', color: '#c9c0b4', icon: 'blinded' }); // the archer's Smoke Bomb
  if (statusOf(unit).drenched) tags.push({ text: 'DRENCHED', color: '#7fd0ff', icon: 'drenched' }); // waded through the cavern's water
  if (unit.echoReady) tags.push({ text: 'ECHO', color: '#c9a8ff', icon: 'echo' }); // Husk: the decoy will copy the next spell
  // Kofi's spirit while it stands (13.72): its name and the moves it has left
  if (unit.spiritOut) tags.push({ text: unit.spiritOut.kind.toUpperCase() + ' SPIRIT ' + unit.spiritOut.movesLeft, color: (spells.callSpirit.spirits[unit.spiritOut.kind] || {}).color || '#8fe0b0', count: unit.spiritOut.movesLeft });
  // the kings (Phase 10): Gadara's Mask Gauge and his charging Singularity, Alagara's Echo Verse
  if (unit.channel) tags.push({ text: 'SINGULARITY', color: '#b48cff' });
  if (unit.mask !== null && unit.mask !== undefined) tags.push({ text: 'MASK ' + unit.mask + '/' + MASK_MAX, color: unit.mask >= MASK_MAX ? '#e0c8ff' : '#a98bff', count: unit.mask }); // (10.53: shown after Singularity too, Shadow Passage spends them)
  if (unit.attune && unit.attune.echo && spells[unit.attune.echo.id]) tags.push({ text: 'ECHO ' + spells[unit.attune.echo.id].short, color: spells[unit.attune.echo.id].color });
  // In a clash, a hero's last stance is known to everyone (an enemy's is not)
  if (unit.engagedWith && unit.side === 'hero' && unit.stance && unit.stance !== 'break') {
    tags.push({ text: unit.stance.toUpperCase(), color: { press: '#ff9a6a', guard: '#e8c690', slip: '#9fd4ff' }[unit.stance] });
  }
  return tags;
}
