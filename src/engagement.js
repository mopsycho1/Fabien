import rules from './data/engagement.json';
import terrain from './data/terrain.json';
import { distance } from './combat.js';
import { isOffBalance, buffOf } from './status.js';

// Skirmish / Distraction: the engagement rules from the combat design notes.
//
// A melee unit can spend its action to ENGAGE an enemy next to it: another
// fighter, or an archer (anyone with clash numbers in jobs.json, see canBeCaught).
// Both are then locked together: neither can walk or make ordinary attacks,
// while the rest of the battle carries on around them.
//
// Every so often the two have a CONTEST (dice plus their numbers):
//   - when the engagement starts
//   - when either of them spends its turn to PRESS the fight
// A contest ends in one of three ways:
//   Advantage : the one who pressed wins
//   Stalemate : nobody wins, nothing changes
//   Reversal  : the one being pressed wins instead
// The loser is knocked Off-Balance (easier to hit and hurt until its next
// turn) and pushed back a tile. If that breaks contact, the engagement ends.
//
// Each fighting style answers differently (the "class-responsive" part):
//   Overpower (Warlord)  : stronger when pressing, can shove two tiles on a big win
//   Defence   (Guardian) : stronger when holding, often holds its ground when it loses
//   Evasion   (Scout)    : often slips the Off-Balance when it loses, better at breaking away
//
// Nothing in this file draws anything. Every number comes from
// src/data/engagement.json, so the design can be tuned without touching code.
//
// "ctx" is an optional bundle of helpers, so tests can control everything:
//   ctx.random(): a number from 0 up to 1 (the game uses Math.random)
//   ctx.heightOf(col, row): how high a tile is (the game uses grid.js)

const DEFAULT_CTX = { random: Math.random, heightOf: () => 0 };

// ---------- Who can engage ----------

// A melee unit: it fights next to its foe and has a fighting style.
// (A spearman reaches 2 tiles but is still a close fighter: "melee" in jobs.json.)
export function isMelee(unit) {
  return !!unit.contest && (unit.range === 1 || !!unit.melee);
}

// A unit that can be caught in a clash: any unit with clash numbers. That is
// every fighter, and archers too (who then cannot shoot until they get free).
// Casters like the Sage have none, so they cannot be caught.
export function canBeCaught(unit) {
  return !!unit.contest;
}

export function styleOf(unit) {
  return unit.contest ? unit.contest.style : null;
}

// True if "attacker" may start an engagement with "target" right now.
export function canEngage(attacker, target) {
  return (
    attacker.alive &&
    target.alive &&
    attacker.side !== target.side &&
    !attacker.hasActed &&
    isMelee(attacker) &&
    canBeCaught(target) &&
    !attacker.engagedWith &&
    !target.engagedWith &&
    distance(attacker, target) === 1
  );
}

// Every unit the attacker could engage from where it stands.
export function engageTargets(attacker, units) {
  return units.filter((other) => canEngage(attacker, other));
}

// Locks two units together, or unlocks them.
export function startEngagement(a, b) {
  a.engagedWith = b;
  b.engagedWith = a;
}

export function endEngagement(a) {
  const b = a.engagedWith;
  a.engagedWith = null;
  if (b && b.engagedWith === a) b.engagedWith = null;
}

// ---------- The contest ----------

// Rolls the dice: by default two six-sided dice, so 2 to 12, usually near 7.
export function rollDice(random, count = rules.dice) {
  let total = 0;
  for (let i = 0; i < count; i++) total += 1 + Math.floor(random() * rules.diceSides);
  return total;
}

// The number a unit fights with: the stat that matches its style, plus a
// spell only if that spell boosts the same stat.
export function contestRating(unit) {
  const stat = rules.styleStat[styleOf(unit)];
  let rating = unit.contest[stat] || 0;
  const buff = buffOf(unit);
  if (buff && buff.stat === stat) rating += buff.amount;
  return rating;
}

// The parts of a contest score, before the dice.
//   role: 'press' (the one starting this contest) or 'hold' (the one receiving it)
export function contestParts(unit, role, opponent, ctx = DEFAULT_CTX) {
  const style = styleOf(unit);
  const table = role === 'press' ? rules.pressBonus : rules.holdBonus;
  const heightDiff = ctx.heightOf(unit.col, unit.row) - ctx.heightOf(opponent.col, opponent.row);
  return {
    rating: contestRating(unit),
    styleBonus: table[style] || 0,
    height: heightDiff * rules.heightBonusPerLevel,
    offBalance: isOffBalance(unit) ? -rules.offBalance.contest : 0,
  };
}

export function sumParts(parts) {
  return parts.rating + parts.styleBonus + parts.height + parts.offBalance;
}

// One contest. "presser" started it; "holder" receives it.
// Returns everything that happened, for the animation and the status line.
export function resolveContest(presser, holder, ctx = DEFAULT_CTX) {
  const pressParts = contestParts(presser, 'press', holder, ctx);
  const holdParts = contestParts(holder, 'hold', presser, ctx);
  const pressRoll = rollDice(ctx.random);
  const holdRoll = rollDice(ctx.random);
  const pressScore = sumParts(pressParts) + pressRoll;
  const holdScore = sumParts(holdParts) + holdRoll;
  const margin = pressScore - holdScore;

  let outcome = 'stalemate';
  if (margin > rules.stalemateWithin) outcome = 'advantage';
  if (margin < -rules.stalemateWithin) outcome = 'reversal';

  const winner = outcome === 'advantage' ? presser : outcome === 'reversal' ? holder : null;
  const loser = outcome === 'advantage' ? holder : outcome === 'reversal' ? presser : null;

  return {
    outcome,
    presser,
    holder,
    pressScore,
    holdScore,
    pressRoll,
    holdRoll,
    pressParts,
    holdParts,
    margin,
    winner,
    loser,
    decisive: Math.abs(margin) >= rules.decisiveMargin,
  };
}

// How the loser's style (and spell) answers a lost contest.
//   held    : it held its ground, so it is not pushed back (Defence)
//   slipped : it avoided being Off-Balance (Evasion)
export function lossResponse(loser, ctx = DEFAULT_CTX) {
  const style = styleOf(loser);
  const buff = buffOf(loser);
  const holdChance = (rules.holdGroundChance[style] || 0) + (buff && buff.holdChance ? buff.holdChance : 0);
  const slipChance = (rules.slipChance[style] || 0) + (buff && buff.slipChance ? buff.slipChance : 0);
  return {
    held: ctx.random() * 100 < holdChance,
    slipped: ctx.random() * 100 < slipChance,
    holdChance,
    slipChance,
  };
}

// How many tiles the loser is pushed: usually one, more on a big Overpower win.
export function pushDistance(result) {
  if (!result.decisive) return 1;
  return rules.decisivePush[styleOf(result.winner)] || 1;
}

// The tiles the loser is pushed through, in order, straight away from the
// winner. It never goes off the board or into a tile someone is standing on
// (isFree says which are free); it stops at the first tile that isn't free.
// An empty list means there is nowhere to go, so the loser stays put.
export function displacementPath(loser, winner, steps, isFree) {
  const dc = Math.sign(loser.col - winner.col);
  const dr = Math.sign(loser.row - winner.row);

  const path = [];
  let col = loser.col;
  let row = loser.row;
  for (let i = 0; i < steps; i++) {
    if (!isFree(col + dc, row + dr, col, row)) break; // isFree also gets the tile it comes from (to block climbing)
    col += dc;
    row += dr;
    path.push({ col, row });
  }
  // A path shorter than the push means something was in the way: the unit
  // slams into it (the battle scene makes it Disoriented). There used to be a
  // sidestep here, but for a diagonal push it stepped straight back toward the
  // attacker, so enemies looked knocked forward (Suleiman, 29 Oct).
  return path;
}

// ---------- Breaking away ----------

// The engaged unit spends its turn trying to get loose.
export function breakAwayContest(runner, holder, ctx = DEFAULT_CTX) {
  const runBuff = buffOf(runner);
  const runParts = {
    rating: runner.contest.agility + (runBuff && runBuff.stat === 'agility' ? runBuff.amount : 0),
    styleBonus: rules.breakBonus[styleOf(runner)] || 0,
    offBalance: isOffBalance(runner) ? -rules.offBalance.contest : 0,
  };
  const keepParts = {
    rating: contestRating(holder),
    styleBonus: rules.keepHoldBonus[styleOf(holder)] || 0,
    offBalance: isOffBalance(holder) ? -rules.offBalance.contest : 0,
  };
  const runRoll = rollDice(ctx.random);
  const keepRoll = rollDice(ctx.random);
  const runScore = runParts.rating + runParts.styleBonus + runParts.offBalance + runRoll;
  const keepScore = keepParts.rating + keepParts.styleBonus + keepParts.offBalance + keepRoll;
  return { success: runScore >= keepScore, runScore, keepScore, runParts, keepParts };
}

// Where a unit that broke free steps to: a free tile next to it that is not
// next to its old foe if possible, otherwise any free tile next to it, otherwise nowhere.
export function escapeTile(runner, holder, isFree) {
  const around = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dc, dr]) => ({ col: runner.col + dc, row: runner.row + dr }))
    .filter((t) => isFree(t.col, t.row));
  const clear = around.find((t) => distance(t, holder) > 1);
  return clear || around[0] || null;
}

// ---------- For the enemy's decisions ----------

// A rough guess of how a contest would go, without rolling dice.
// Positive means the presser is favoured.
export function contestEdge(presser, holder, ctx = DEFAULT_CTX) {
  return sumParts(contestParts(presser, 'press', holder, ctx)) - sumParts(contestParts(holder, 'hold', presser, ctx));
}

// ======================================================================
// The stance duel (combat design v0.4)
// ======================================================================
//
// Used when engagement.json says "mode": "stance".
//
// While two units are locked together, every turn of each of them is a BEAT:
// the unit whose turn it is picks a STANCE, and its foe answers with one.
//   Press : attack hard (uses power)
//   Guard : hold firm (uses guard)
//   Slip  : dodge and counter (uses agility)
//   Break : try to get out of the clash (uses agility)
// Stances beat each other in a circle (see "beats" in engagement.json):
// Guard beats Press, Slip beats Guard, Press beats Slip. Beating the other
// stance is a bonus, not a guarantee: the dice still roll.
//
// Each class is strong or weak in each stance (see "stances" in jobs.json).
//
// MOMENTUM is a track from -3 to +3 shared by the two. Winning a beat moves it
// your way (a winning Press moves it further). At +2 the leader fights better.
// At +3 the beat is DECISIVE: the loser is thrown Off-Balance and pushed back,
// the winner gets a free strike, and the track goes back to 0.
//
// POISE is a small pool (3) that comes back slowly. Spending 1 EMPOWERS a
// stance for that beat.

const STANCE_IDS = ['press', 'guard', 'slip'];

// The numbers from engagement.json, for the battle screen (it checks "mode").
export const engagementRules = rules;

// True when clashes use the stance duel, false for the older Press / Break away.
export function isStanceDuel() {
  return rules.mode !== 'classic';
}

// ---------- Momentum ----------

// The momentum from this unit's side: positive means it is winning.
export function momentumOf(unit) {
  const e = unit.engagement;
  if (!e) return 0;
  return e.first === unit ? e.track : -e.track;
}

// Moves the momentum toward "unit" by "amount" (never past the ends).
export function shiftMomentum(unit, amount) {
  const e = unit.engagement;
  if (!e) return;
  const toward = e.first === unit ? 1 : -1;
  e.track = Math.max(-rules.momentum.max, Math.min(rules.momentum.max, e.track + toward * amount));
}

export function resetMomentum(unit) {
  if (unit.engagement) unit.engagement.track = 0;
}

// Locks two units into a stance duel: like startEngagement, plus a shared
// momentum track. "first" is the one who started it.
export function startDuel(first, second) {
  startEngagement(first, second);
  const e = { first, second, track: 0 };
  first.engagement = e;
  second.engagement = e;
}

export function endDuel(unit) {
  const foe = unit.engagedWith;
  endEngagement(unit);
  unit.engagement = null;
  if (foe) foe.engagement = null;
}

// ---------- Poise ----------

export function poiseOf(unit) {
  if (unit.poise === undefined) unit.poise = rules.poise.start;
  return unit.poise;
}

// Called at the start of the unit's own turn. Poise only comes back while the
// unit is OUT of a clash (catching its breath), so every Empower in a clash
// really costs: a long clash drains it. (A Warden's standoff also gives some back.)
export function refillPoise(unit) {
  const amount = unit.engagedWith ? rules.poise.refillInClash || 0 : rules.poise.refill;
  unit.poise = Math.min(rules.poise.max, poiseOf(unit) + amount);
}

// ---------- Stances ----------

export function stanceName(stance) {
  return rules.stances[stance] ? rules.stances[stance].name : stance;
}

// 'strong', 'average' or 'weak' for this unit in this stance.
export function stanceAffinity(unit, stance) {
  return (unit.stances && unit.stances[stance]) || 'average';
}

// The stance this unit's class fights with by default (its strongest).
export function autoStance(unit) {
  const order = { strong: 2, average: 1, weak: 0 };
  return STANCE_IDS.reduce((best, s) => (order[stanceAffinity(unit, s)] > order[stanceAffinity(unit, best)] ? s : best), 'guard');
}

// +matchupBonus if "stance" beats "against", minus it if beaten, else 0.
export function matchup(stance, against) {
  if (!against || stance === against) return 0;
  if (rules.beats[stance] === against) return rules.matchupBonus;
  if (rules.beats[against] === stance) return -rules.matchupBonus;
  return 0;
}

// The stance that beats this one.
export function counterTo(stance) {
  return Object.keys(rules.beats).find((s) => rules.beats[s] === stance) || 'guard';
}

// The unit's number for a stance: the stat it uses, plus a spell that boosts that stat.
export function stanceRating(unit, stance) {
  const stat = rules.stances[stance].stat;
  let rating = unit.contest ? unit.contest[stat] || 0 : 0;
  const buff = buffOf(unit);
  if (buff && buff.stat === stat) rating += buff.amount;
  return rating;
}

// Everything that adds up to one side's score in a beat, before the dice.
// highGround: true only for the one who started the clash, on the opening beat:
// engaging from higher ground gives a bonus for each level (terrain.json).
export function beatParts(unit, stance, foe, foeStance, ctx = DEFAULT_CTX, empowered = false, highGround = false) {
  const lead = momentumOf(unit) >= rules.momentum.leadAt ? rules.momentum.leadBonus : 0;
  const heightDiff = ctx.heightOf(unit.col, unit.row) - ctx.heightOf(foe.col, foe.row);
  return {
    rating: stanceRating(unit, stance) * rules.statWeight, // stats count for half, so class strengths matter without deciding every beat
    affinity: rules.affinityBonus[stanceAffinity(unit, stance)] || 0,
    // only the side whose stance beats the other's gets the bonus (a soft edge, not a 6-point swing)
    matchup: stance === 'break' ? rules.breakVs[foeStance] || 0 : Math.max(0, matchup(stance, foeStance)),
    momentum: lead,
    height: highGround ? Math.max(0, heightDiff) * terrain.openingHeightBonusPerLevel : 0,
    offBalance: isOffBalance(unit) ? -rules.offBalance.contest : 0,
    empower: empowered ? rules.poise.empower : 0,
  };
}

// The opening-beat bonus "unit" would get for engaging "foe" from where it stands.
export function openingHeightBonus(unit, foe, ctx = DEFAULT_CTX) {
  return Math.max(0, ctx.heightOf(unit.col, unit.row) - ctx.heightOf(foe.col, foe.row)) * terrain.openingHeightBonusPerLevel;
}

export function sumBeat(parts) {
  return Object.values(parts).reduce((a, b) => a + b, 0);
}

// One beat. "actor" is the unit whose turn it is.
// Returns what happened; nothing has been changed yet except momentum and Poise.
// opening: true for the first beat of a clash (the one engaging may have high ground).
export function resolveBeat(actor, actorStance, holder, holderStance, ctx = DEFAULT_CTX, empowered = false, opening = false) {
  if (empowered) actor.poise = poiseOf(actor) - 1;
  const actorParts = beatParts(actor, actorStance, holder, holderStance, ctx, empowered, opening);
  const holderParts = beatParts(holder, holderStance, actor, actorStance, ctx, false);
  const actorRoll = rollDice(ctx.random, rules.beatDice);
  const holderRoll = rollDice(ctx.random, rules.beatDice);
  const actorScore = sumBeat(actorParts) + actorRoll;
  const holderScore = sumBeat(holderParts) + holderRoll;
  const margin = actorScore - holderScore;
  actor.stance = actorStance;
  holder.stance = holderStance;

  const base = {
    actor, holder, actorStance, holderStance, actorParts, holderParts,
    actorRoll, holderRoll, actorScore, holderScore, margin, empowered,
  };

  // Breaking away: succeed and the clash is over, fail and lose a little ground
  if (actorStance === 'break') {
    const success = margin >= 0;
    if (!success) shiftMomentum(holder, 1);
    return { ...base, kind: 'break', success, winner: success ? actor : holder, loser: success ? null : actor, shift: success ? 0 : 1, decisive: false };
  }

  let winner = null;
  if (margin > rules.stalemateWithin) winner = actor;
  if (margin < -rules.stalemateWithin) winner = holder;
  if (!winner) return { ...base, kind: 'even', winner: null, loser: null, shift: 0, decisive: false };

  const loser = winner === actor ? holder : actor;
  const winStance = winner === actor ? actorStance : holderStance;
  let shift = winStance === 'press' ? rules.momentum.pressWinShift : rules.momentum.winShift;
  if (Math.abs(margin) >= rules.decisiveMargin) shift += rules.momentum.decisiveExtra;
  shiftMomentum(winner, shift);
  const decisive = momentumOf(winner) >= rules.momentum.max;
  return { ...base, kind: 'win', winner, loser, shift, decisive };
}

// ---------- Choosing a stance for the computer ----------

// The enemy picks a stance. Mostly what its class is good at; sometimes it
// reads its foe's last stance and picks the one that beats it.
export function aiStance(unit, foe, ctx = DEFAULT_CTX) {
  if (foe && foe.stance && foe.stance !== 'break' && ctx.random() * 100 < rules.aiReadChance) return counterTo(foe.stance);
  const weight = { strong: 5, average: 2, weak: 1 };
  const total = STANCE_IDS.reduce((sum, s) => sum + weight[stanceAffinity(unit, s)], 0);
  let roll = ctx.random() * total;
  for (const s of STANCE_IDS) {
    roll -= weight[stanceAffinity(unit, s)];
    if (roll < 0) return s;
  }
  return autoStance(unit);
}

// A stance picked by a unit that is answering (not acting): its class habits only,
// with no read, because both stances are chosen at the same moment.
export function answerStance(unit, ctx = DEFAULT_CTX) {
  return aiStance(unit, null, ctx);
}
