var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/engagement.js
var engagement_exports = {};
__export(engagement_exports, {
  aiStance: () => aiStance,
  answerStance: () => answerStance,
  autoStance: () => autoStance,
  beatParts: () => beatParts,
  breakAwayContest: () => breakAwayContest,
  canEngage: () => canEngage,
  contestEdge: () => contestEdge,
  contestParts: () => contestParts,
  contestRating: () => contestRating,
  counterTo: () => counterTo,
  displacementPath: () => displacementPath,
  endDuel: () => endDuel,
  endEngagement: () => endEngagement,
  engageTargets: () => engageTargets,
  engagementRules: () => engagementRules,
  escapeTile: () => escapeTile,
  isMelee: () => isMelee,
  isStanceDuel: () => isStanceDuel,
  lossResponse: () => lossResponse,
  matchup: () => matchup,
  momentumOf: () => momentumOf,
  openingHeightBonus: () => openingHeightBonus,
  poiseOf: () => poiseOf,
  pushDistance: () => pushDistance,
  refillPoise: () => refillPoise,
  resetMomentum: () => resetMomentum,
  resolveBeat: () => resolveBeat,
  resolveContest: () => resolveContest,
  rollDice: () => rollDice,
  shiftMomentum: () => shiftMomentum,
  stanceAffinity: () => stanceAffinity,
  stanceName: () => stanceName,
  stanceRating: () => stanceRating,
  startDuel: () => startDuel,
  startEngagement: () => startEngagement,
  styleOf: () => styleOf,
  sumBeat: () => sumBeat,
  sumParts: () => sumParts
});
module.exports = __toCommonJS(engagement_exports);

// src/data/engagement.json
var engagement_default = {
  note: "Numbers for the Skirmish / Distraction engagement. Everything here is a first guess for playtesting.",
  dice: 2,
  diceSides: 6,
  stalemateWithin: 1,
  decisiveMargin: 6,
  styleStat: {
    overpower: "power",
    defence: "guard",
    evasion: "agility"
  },
  pressBonus: {
    overpower: 2
  },
  holdBonus: {
    defence: 2
  },
  breakBonus: {
    evasion: 2
  },
  keepHoldBonus: {
    defence: 2
  },
  heightBonusPerLevel: 1,
  offBalance: {
    contest: 2,
    defense: 2,
    evade: 15
  },
  holdGroundChance: {
    defence: 50
  },
  slipChance: {
    evasion: 50
  },
  decisivePush: {
    overpower: 2
  },
  distractedHitBonus: 10,
  mode: "stance",
  modeNote: '"stance" = the stance duel (v0.4). "classic" = the older Engage with Press / Break away.',
  stances: {
    press: {
      name: "Press",
      stat: "power",
      hint: "attack hard"
    },
    guard: {
      name: "Guard",
      stat: "guard",
      hint: "hold firm"
    },
    slip: {
      name: "Slip",
      stat: "agility",
      hint: "dodge and counter"
    },
    break: {
      name: "Break away",
      stat: "agility",
      hint: "get out of the clash"
    }
  },
  beats: {
    guard: "press",
    slip: "guard",
    press: "slip"
  },
  matchupBonus: 3,
  breakVs: {
    press: -3,
    guard: 2,
    slip: 0
  },
  affinityBonus: {
    strong: 1,
    average: 0,
    weak: -1
  },
  momentum: {
    max: 3,
    leadAt: 2,
    leadBonus: 2,
    winShift: 1,
    pressWinShift: 2,
    decisiveExtra: 1
  },
  poise: {
    max: 3,
    start: 2,
    refill: 1,
    empower: 3
  },
  decisiveStrike: true,
  aiReadChance: 40,
  beatDice: 3,
  statWeight: 0.5,
  beatOddsNote: "With these numbers: same stance, a class strong in it beats one weak in it about 79% of the time; equal fighters where one stance beats the other, 64%; a strong class that picked the beaten stance, 55%."
};

// src/data/terrain.json
var terrain_default = {
  note: "How the lie of the land changes a fight. First guesses for playtesting.",
  rangedAccuracyPerLevel: 10,
  openingHeightBonusPerLevel: 2,
  fallDamagePerLevel: 4,
  pushClimbLimit: 1,
  downhillPushExtra: 1
};

// src/data/spells.json
var spells_default = {
  swiftness: {
    name: "Verse of Swiftness",
    button: "Swiftness",
    short: "SWIFT",
    kind: "buff",
    group: "Verse",
    color: "#9fd4ff",
    range: 3,
    turns: 2,
    stat: "agility",
    amount: 3,
    slipChance: 30,
    boosts: {
      evade: 15,
      move: 1
    },
    text: "+15 evade, +1 move. In a clash: +3 agility.",
    mp: 3,
    use: "both",
    affinity: {
      jobs: [
        "scout"
      ],
      times: 2,
      who: "a scout"
    }
  },
  stone: {
    name: "Verse of Stone",
    button: "Stone",
    short: "STONE",
    kind: "buff",
    group: "Verse",
    color: "#d9b77a",
    range: 3,
    turns: 2,
    stat: "guard",
    amount: 3,
    holdChance: 30,
    boosts: {
      defense: 2
    },
    text: "+2 defense. In a clash: +3 guard, harder to push.",
    mp: 3,
    use: "both",
    affinity: {
      jobs: [
        "guardian"
      ],
      times: 2,
      who: "a shield-bearer"
    }
  },
  fury: {
    name: "Verse of Fury",
    button: "Fury",
    short: "FURY",
    kind: "buff",
    group: "Verse",
    color: "#ff8a5c",
    range: 3,
    turns: 2,
    stat: "power",
    amount: 3,
    boosts: {
      attack: 2
    },
    text: "+2 attack. In a clash: +3 power.",
    mp: 3,
    use: "both",
    affinity: {
      jobs: [
        "warlord",
        "striker"
      ],
      times: 2,
      who: "a heavy hitter"
    }
  },
  slow: {
    name: "Slow",
    button: "Slow",
    short: "SLOW",
    kind: "hex",
    color: "#b48cff",
    range: 4,
    turns: 2,
    delay: 50,
    speedLoss: 4,
    text: "Its next turn comes later, and it is slower for 2 turns.",
    mp: 4,
    use: "battlefield",
    group: "Escape"
  },
  husk: {
    name: "Husk",
    button: "Husk",
    short: "HUSK",
    kind: "escape",
    color: "#8fd18a",
    range: 3,
    text: "Leave a decoy and slip up to 3 tiles away, even out of a clash.",
    mp: 5,
    use: "both",
    group: "Escape"
  },
  meditate: {
    name: "Meditate",
    button: "Meditate",
    short: "CALM",
    kind: "rest",
    color: "#7fd6c4",
    mp: 0,
    use: "battlefield",
    restore: 6,
    exposed: {
      defense: 2,
      evade: 10
    },
    text: "Restore 6 MP. Ends your turn; you are Exposed until your next."
  }
};

// src/status.js
function statusOf(unit) {
  if (!unit.status) unit.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null };
  return unit.status;
}
function isOffBalance(unit) {
  return statusOf(unit).offBalance;
}
function buffOf(unit) {
  const buff = statusOf(unit).buff;
  if (!buff) return null;
  const spell = spells_default[buff.id];
  const times = affinityTimes(unit, buff.id);
  const boosts = {};
  for (const [stat, value] of Object.entries(spell.boosts || {})) boosts[stat] = value * times;
  return {
    id: buff.id,
    turnsLeft: buff.turnsLeft,
    ...spell,
    boosts,
    amount: (spell.amount || 0) * times,
    holdChance: spell.holdChance ? spell.holdChance * times : void 0,
    slipChance: spell.slipChance ? spell.slipChance * times : void 0,
    times
  };
}
function affinityTimes(unit, spellId) {
  const a = spells_default[spellId] && spells_default[spellId].affinity;
  return a && a.jobs.includes(unit.job) ? a.times : 1;
}

// src/combat.js
function distance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

// src/engagement.js
var DEFAULT_CTX = { random: Math.random, heightOf: () => 0 };
function isMelee(unit) {
  return !!unit.contest && unit.range === 1;
}
function styleOf(unit) {
  return unit.contest ? unit.contest.style : null;
}
function canEngage(attacker, target) {
  return attacker.alive && target.alive && attacker.side !== target.side && !attacker.hasActed && isMelee(attacker) && isMelee(target) && !attacker.engagedWith && !target.engagedWith && distance(attacker, target) === 1;
}
function engageTargets(attacker, units) {
  return units.filter((other) => canEngage(attacker, other));
}
function startEngagement(a, b) {
  a.engagedWith = b;
  b.engagedWith = a;
}
function endEngagement(a) {
  const b = a.engagedWith;
  a.engagedWith = null;
  if (b && b.engagedWith === a) b.engagedWith = null;
}
function rollDice(random, count = engagement_default.dice) {
  let total = 0;
  for (let i = 0; i < count; i++) total += 1 + Math.floor(random() * engagement_default.diceSides);
  return total;
}
function contestRating(unit) {
  const stat = engagement_default.styleStat[styleOf(unit)];
  let rating = unit.contest[stat] || 0;
  const buff = buffOf(unit);
  if (buff && buff.stat === stat) rating += buff.amount;
  return rating;
}
function contestParts(unit, role, opponent, ctx = DEFAULT_CTX) {
  const style = styleOf(unit);
  const table = role === "press" ? engagement_default.pressBonus : engagement_default.holdBonus;
  const heightDiff = ctx.heightOf(unit.col, unit.row) - ctx.heightOf(opponent.col, opponent.row);
  return {
    rating: contestRating(unit),
    styleBonus: table[style] || 0,
    height: heightDiff * engagement_default.heightBonusPerLevel,
    offBalance: isOffBalance(unit) ? -engagement_default.offBalance.contest : 0
  };
}
function sumParts(parts) {
  return parts.rating + parts.styleBonus + parts.height + parts.offBalance;
}
function resolveContest(presser, holder, ctx = DEFAULT_CTX) {
  const pressParts = contestParts(presser, "press", holder, ctx);
  const holdParts = contestParts(holder, "hold", presser, ctx);
  const pressRoll = rollDice(ctx.random);
  const holdRoll = rollDice(ctx.random);
  const pressScore = sumParts(pressParts) + pressRoll;
  const holdScore = sumParts(holdParts) + holdRoll;
  const margin = pressScore - holdScore;
  let outcome = "stalemate";
  if (margin > engagement_default.stalemateWithin) outcome = "advantage";
  if (margin < -engagement_default.stalemateWithin) outcome = "reversal";
  const winner = outcome === "advantage" ? presser : outcome === "reversal" ? holder : null;
  const loser = outcome === "advantage" ? holder : outcome === "reversal" ? presser : null;
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
    decisive: Math.abs(margin) >= engagement_default.decisiveMargin
  };
}
function lossResponse(loser, ctx = DEFAULT_CTX) {
  const style = styleOf(loser);
  const buff = buffOf(loser);
  const holdChance = (engagement_default.holdGroundChance[style] || 0) + (buff && buff.holdChance ? buff.holdChance : 0);
  const slipChance = (engagement_default.slipChance[style] || 0) + (buff && buff.slipChance ? buff.slipChance : 0);
  return {
    held: ctx.random() * 100 < holdChance,
    slipped: ctx.random() * 100 < slipChance,
    holdChance,
    slipChance
  };
}
function pushDistance(result) {
  if (!result.decisive) return 1;
  return engagement_default.decisivePush[styleOf(result.winner)] || 1;
}
function displacementPath(loser, winner, steps, isFree) {
  const dc = Math.sign(loser.col - winner.col);
  const dr = Math.sign(loser.row - winner.row);
  const path = [];
  let col = loser.col;
  let row = loser.row;
  for (let i = 0; i < steps; i++) {
    if (!isFree(col + dc, row + dr, col, row)) break;
    col += dc;
    row += dr;
    path.push({ col, row });
  }
  if (path.length > 0) return path;
  for (const [sc, sr] of [[dr, dc], [-dr, -dc]]) {
    if (isFree(loser.col + sc, loser.row + sr, loser.col, loser.row)) return [{ col: loser.col + sc, row: loser.row + sr }];
  }
  return [];
}
function breakAwayContest(runner, holder, ctx = DEFAULT_CTX) {
  const runBuff = buffOf(runner);
  const runParts = {
    rating: runner.contest.agility + (runBuff && runBuff.stat === "agility" ? runBuff.amount : 0),
    styleBonus: engagement_default.breakBonus[styleOf(runner)] || 0,
    offBalance: isOffBalance(runner) ? -engagement_default.offBalance.contest : 0
  };
  const keepParts = {
    rating: contestRating(holder),
    styleBonus: engagement_default.keepHoldBonus[styleOf(holder)] || 0,
    offBalance: isOffBalance(holder) ? -engagement_default.offBalance.contest : 0
  };
  const runRoll = rollDice(ctx.random);
  const keepRoll = rollDice(ctx.random);
  const runScore = runParts.rating + runParts.styleBonus + runParts.offBalance + runRoll;
  const keepScore = keepParts.rating + keepParts.styleBonus + keepParts.offBalance + keepRoll;
  return { success: runScore >= keepScore, runScore, keepScore, runParts, keepParts };
}
function escapeTile(runner, holder, isFree) {
  const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => ({ col: runner.col + dc, row: runner.row + dr })).filter((t) => isFree(t.col, t.row));
  const clear = around.find((t) => distance(t, holder) > 1);
  return clear || around[0] || null;
}
function contestEdge(presser, holder, ctx = DEFAULT_CTX) {
  return sumParts(contestParts(presser, "press", holder, ctx)) - sumParts(contestParts(holder, "hold", presser, ctx));
}
var STANCE_IDS = ["press", "guard", "slip"];
var engagementRules = engagement_default;
function isStanceDuel() {
  return engagement_default.mode !== "classic";
}
function momentumOf(unit) {
  const e = unit.engagement;
  if (!e) return 0;
  return e.first === unit ? e.track : -e.track;
}
function shiftMomentum(unit, amount) {
  const e = unit.engagement;
  if (!e) return;
  const toward = e.first === unit ? 1 : -1;
  e.track = Math.max(-engagement_default.momentum.max, Math.min(engagement_default.momentum.max, e.track + toward * amount));
}
function resetMomentum(unit) {
  if (unit.engagement) unit.engagement.track = 0;
}
function startDuel(first, second) {
  startEngagement(first, second);
  const e = { first, second, track: 0 };
  first.engagement = e;
  second.engagement = e;
}
function endDuel(unit) {
  const foe = unit.engagedWith;
  endEngagement(unit);
  unit.engagement = null;
  if (foe) foe.engagement = null;
}
function poiseOf(unit) {
  if (unit.poise === void 0) unit.poise = engagement_default.poise.start;
  return unit.poise;
}
function refillPoise(unit) {
  unit.poise = Math.min(engagement_default.poise.max, poiseOf(unit) + engagement_default.poise.refill);
}
function stanceName(stance) {
  return engagement_default.stances[stance] ? engagement_default.stances[stance].name : stance;
}
function stanceAffinity(unit, stance) {
  return unit.stances && unit.stances[stance] || "average";
}
function autoStance(unit) {
  const order = { strong: 2, average: 1, weak: 0 };
  return STANCE_IDS.reduce((best, s) => order[stanceAffinity(unit, s)] > order[stanceAffinity(unit, best)] ? s : best, "guard");
}
function matchup(stance, against) {
  if (!against || stance === against) return 0;
  if (engagement_default.beats[stance] === against) return engagement_default.matchupBonus;
  if (engagement_default.beats[against] === stance) return -engagement_default.matchupBonus;
  return 0;
}
function counterTo(stance) {
  return Object.keys(engagement_default.beats).find((s) => engagement_default.beats[s] === stance) || "guard";
}
function stanceRating(unit, stance) {
  const stat = engagement_default.stances[stance].stat;
  let rating = unit.contest ? unit.contest[stat] || 0 : 0;
  const buff = buffOf(unit);
  if (buff && buff.stat === stat) rating += buff.amount;
  return rating;
}
function beatParts(unit, stance, foe, foeStance, ctx = DEFAULT_CTX, empowered = false, highGround = false) {
  const lead = momentumOf(unit) >= engagement_default.momentum.leadAt ? engagement_default.momentum.leadBonus : 0;
  const heightDiff = ctx.heightOf(unit.col, unit.row) - ctx.heightOf(foe.col, foe.row);
  return {
    rating: stanceRating(unit, stance) * engagement_default.statWeight,
    // stats count for half, so class strengths matter without deciding every beat
    affinity: engagement_default.affinityBonus[stanceAffinity(unit, stance)] || 0,
    // only the side whose stance beats the other's gets the bonus (a soft edge, not a 6-point swing)
    matchup: stance === "break" ? engagement_default.breakVs[foeStance] || 0 : Math.max(0, matchup(stance, foeStance)),
    momentum: lead,
    height: highGround ? Math.max(0, heightDiff) * terrain_default.openingHeightBonusPerLevel : 0,
    offBalance: isOffBalance(unit) ? -engagement_default.offBalance.contest : 0,
    empower: empowered ? engagement_default.poise.empower : 0
  };
}
function openingHeightBonus(unit, foe, ctx = DEFAULT_CTX) {
  return Math.max(0, ctx.heightOf(unit.col, unit.row) - ctx.heightOf(foe.col, foe.row)) * terrain_default.openingHeightBonusPerLevel;
}
function sumBeat(parts) {
  return Object.values(parts).reduce((a, b) => a + b, 0);
}
function resolveBeat(actor, actorStance, holder, holderStance, ctx = DEFAULT_CTX, empowered = false, opening = false) {
  if (empowered) actor.poise = poiseOf(actor) - 1;
  const actorParts = beatParts(actor, actorStance, holder, holderStance, ctx, empowered, opening);
  const holderParts = beatParts(holder, holderStance, actor, actorStance, ctx, false);
  const actorRoll = rollDice(ctx.random, engagement_default.beatDice);
  const holderRoll = rollDice(ctx.random, engagement_default.beatDice);
  const actorScore = sumBeat(actorParts) + actorRoll;
  const holderScore = sumBeat(holderParts) + holderRoll;
  const margin = actorScore - holderScore;
  actor.stance = actorStance;
  holder.stance = holderStance;
  const base = {
    actor,
    holder,
    actorStance,
    holderStance,
    actorParts,
    holderParts,
    actorRoll,
    holderRoll,
    actorScore,
    holderScore,
    margin,
    empowered
  };
  if (actorStance === "break") {
    const success = margin >= 0;
    if (!success) shiftMomentum(holder, 1);
    return { ...base, kind: "break", success, winner: success ? actor : holder, loser: success ? null : actor, shift: success ? 0 : 1, decisive: false };
  }
  let winner = null;
  if (margin > engagement_default.stalemateWithin) winner = actor;
  if (margin < -engagement_default.stalemateWithin) winner = holder;
  if (!winner) return { ...base, kind: "even", winner: null, loser: null, shift: 0, decisive: false };
  const loser = winner === actor ? holder : actor;
  const winStance = winner === actor ? actorStance : holderStance;
  let shift = winStance === "press" ? engagement_default.momentum.pressWinShift : engagement_default.momentum.winShift;
  if (Math.abs(margin) >= engagement_default.decisiveMargin) shift += engagement_default.momentum.decisiveExtra;
  shiftMomentum(winner, shift);
  const decisive = momentumOf(winner) >= engagement_default.momentum.max;
  return { ...base, kind: "win", winner, loser, shift, decisive };
}
function aiStance(unit, foe, ctx = DEFAULT_CTX) {
  if (foe && foe.stance && foe.stance !== "break" && ctx.random() * 100 < engagement_default.aiReadChance) return counterTo(foe.stance);
  const weight = { strong: 5, average: 2, weak: 1 };
  const total = STANCE_IDS.reduce((sum, s) => sum + weight[stanceAffinity(unit, s)], 0);
  let roll = ctx.random() * total;
  for (const s of STANCE_IDS) {
    roll -= weight[stanceAffinity(unit, s)];
    if (roll < 0) return s;
  }
  return autoStance(unit);
}
function answerStance(unit, ctx = DEFAULT_CTX) {
  return aiStance(unit, null, ctx);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aiStance,
  answerStance,
  autoStance,
  beatParts,
  breakAwayContest,
  canEngage,
  contestEdge,
  contestParts,
  contestRating,
  counterTo,
  displacementPath,
  endDuel,
  endEngagement,
  engageTargets,
  engagementRules,
  escapeTile,
  isMelee,
  isStanceDuel,
  lossResponse,
  matchup,
  momentumOf,
  openingHeightBonus,
  poiseOf,
  pushDistance,
  refillPoise,
  resetMomentum,
  resolveBeat,
  resolveContest,
  rollDice,
  shiftMomentum,
  stanceAffinity,
  stanceName,
  stanceRating,
  startDuel,
  startEngagement,
  styleOf,
  sumBeat,
  sumParts
});
