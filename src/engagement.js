import rules from './data/engagement.json';
import { distance } from './combat.js';
import { isOffBalance, buffOf } from './status.js';

// Skirmish / Distraction: the engagement rules from the combat design notes.
//
// A melee unit can spend its action to ENGAGE an enemy melee unit next to it.
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
export function isMelee(unit) {
  return !!unit.contest && unit.range === 1;
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
    isMelee(target) &&
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
export function rollDice(random) {
  let total = 0;
  for (let i = 0; i < rules.dice; i++) total += 1 + Math.floor(random() * rules.diceSides);
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

// The tiles the loser is pushed through, in order. Straight away from the
// winner first. If that tile is taken, a tile to either side. It never goes
// off the board or into a tile someone is standing on (isFree says which are free).
// An empty list means there is nowhere to go, so the loser stays put.
export function displacementPath(loser, winner, steps, isFree) {
  const dc = Math.sign(loser.col - winner.col);
  const dr = Math.sign(loser.row - winner.row);

  const path = [];
  let col = loser.col;
  let row = loser.row;
  for (let i = 0; i < steps; i++) {
    if (!isFree(col + dc, row + dr)) break;
    col += dc;
    row += dr;
    path.push({ col, row });
  }
  if (path.length > 0) return path;

  // Straight back is blocked: try stepping to the side (at a right angle)
  for (const [sc, sr] of [[dr, dc], [-dr, -dc]]) {
    if (isFree(loser.col + sc, loser.row + sr)) return [{ col: loser.col + sc, row: loser.row + sr }];
  }
  return [];
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
