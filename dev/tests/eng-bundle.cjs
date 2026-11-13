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
  canBeCaught: () => canBeCaught,
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
  beatRule: "THE RULE OF A BEAT: score = 3 dice + half the stat of your stance (rounded up) + bonuses. The higher score wins; a gap of 0 or 1 is even (stalemateWithin); a gap of 6 or more moves momentum 1 further (decisiveMargin). Dice: beatDice dice of diceSides sides. Half: statWeight. Bonuses: affinityBonus, matchupBonus, momentum.leadBonus, poise.empower, offBalance.contest, and high ground on the opening beat (terrain.json).",
  dice: 2,
  diceNote: 'dice, pressBonus, holdBonus, breakBonus, keepHoldBonus, heightBonusPerLevel and styleStat are only for the older "classic" clash (mode: classic), which the game no longer uses. The live rule is beatRule above.',
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
  heightBonusPerLevel: 2,
  heightBonusNote: "High ground in a clash is worth 2 per level (picked 13 Nov, roadmap 13.52). The same number is in terrain.json as openingHeightBonusPerLevel, which is the one the live stance duel reads: only the fighter who starts the clash gets it, only on the opening beat, and only for standing higher. Keep the two numbers the same (dev/tests/duel-rules.cjs checks it).",
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
    empower: 3,
    refillInClash: 0,
    note: "Poise: up to max, a battle starts with start. Each turn OUT of a clash gives back refill; a turn IN a clash gives back refillInClash. Empower spends 1 for +empower to one beat."
  },
  decisiveStrike: true,
  aiReadChance: 40,
  beatDice: 3,
  statWeight: 0.5,
  beatOddsNote: "Odds of a beat, by how far ahead you are before the dice (your half stat and bonuses minus theirs). Lead 0: win 36%, even 27%, lose 36%. Lead 1: 45, 27, 28. Lead 2: 55, 25, 21. Lead 3 (your stance beats theirs, all else equal): 64, 22, 14. Lead 4: 72, 18, 10. Lead 5: 79, 15, 6. Lead 6: 86, 11, 4. Checked by dev/tests/duel-rules.cjs.",
  rangedBreakChance: 50,
  rangedBreakNote: "An archer caught in a clash cannot shoot, so on its turn it tries to Break away this often (in %), unless it is winning the clash.",
  signatures: {
    note: "Signature stances (Suleiman's tank design). A unit has one if its job in jobs.json has a signature line. Its defence works while it is in a clash and its last stance is the signature stance.",
    bloodied: {
      note: "Bloodied Press (Warlord, Berserker): every hit taken adds a stack. In Press, each stack takes 1 off every hit. Winning a beat with Press lands a quick hit of winHitBase + stacks, and a decisive win pushes 1 tile further.",
      maxStacks: 3,
      reducePerStack: 1,
      winHitBase: 1,
      decisivePushExtra: 1
    },
    counter: {
      note: "Counter-Press (Bruiser): in Press, the gauntlet soaks up to absorb damage of the first hit after each beat. Every chargePer damage soaked is 1 Charge. Losing a beat releases all Charge as a counter-punch of damagePerCharge per Charge.",
      absorb: 4,
      chargePer: 4,
      maxCharge: 3,
      damagePerCharge: 3
    },
    bulwark: {
      note: "Bulwark (Warden): each beat in a row held in Guard adds a level. Each level pushes him 1 tile less. An even beat in Guard gives back standoffPoise Poise and standoffHeal health.",
      max: 3,
      pushResistPerLevel: 1,
      standoffHeal: 2,
      standoffPoise: 1
    }
  },
  stanceChoice: "auto",
  stanceChoiceNote: `How heroes pick stances in a clash, until the player switches: "auto" (one Fight button picks for you) or "manual" (Press, Guard and Slip buttons). The player's switch is remembered on their device.`
};

// src/data/terrain.json
var terrain_default = {
  note: "How the lie of the land changes a fight. First guesses for playtesting.",
  rangedAccuracyPerLevel: 10,
  openingHeightBonusPerLevel: 2,
  openingHeightBonusNote: "High ground in a clash (picked 13 Nov, roadmap 13.52): 2 per level, for the fighter who starts the clash, on the opening beat only. 1 level up moves a fair beat from 36 wins in 100 to 55; 2 levels to 72. engagement.json heightBonusPerLevel must say the same number.",
  fallDamagePerLevel: 4,
  pushClimbLimit: 1,
  downhillPushExtra: 1,
  sightHeight: 1.5,
  sightHeightNote: "Line of sight (Suleiman, 29 Oct): arrows and thrown weapons fly from chest height to chest height, this many levels above the ground each unit stands on. A tile in between whose top reaches that line stops the shot. Magic, and techniques that pierce, are not stopped. With 1.5, a block 2 levels higher than both units hides the target; 1 level does not.",
  climbLimit: 1,
  climbLimitNote: "Walking (roadmap 3.8): a unit can step up at most this many levels from one tile to the next; stepping down is always fine. Pushes have their own pushClimbLimit. Layra under a Verse of Swiftness ignores it (spells.json, swiftness, freeClimb).",
  water: {
    drenchedTurns: 2,
    lightningTimes: 1.5,
    fireTimes: 0.5,
    note: "Shallow water (roadmap 11.4, Suleiman 29 Oct 19:58): units can wade through it. A unit standing in water is Drenched, and stays Drenched for drenchedTurns of its own turns after it leaves. Drenched units take lightningTimes the damage from lightning and fireTimes from fire (ice when it exists: more). Water puts out a burn, and fire can't set a Drenched unit alight."
  }
};

// src/data/spells.json
var spells_default = {
  swiftness: {
    name: "Verse of Swiftness",
    button: "Swiftness",
    short: "SWIFT",
    icon: "swiftness",
    card: "swiftness",
    effect: "Swift",
    kind: "buff",
    group: "Blessings",
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
        "scout",
        "spearman"
      ],
      times: 2,
      who: "a scout or spearman"
    },
    freeClimb: {
      jobs: [
        "sage"
      ],
      text: "A Sage (Layra) hops from one high spot to another: her moves ignore height, and she flies over anyone in her way."
    }
  },
  stone: {
    name: "Verse of Stone",
    button: "Stone",
    short: "EARTH",
    icon: "stone",
    card: "stone",
    effect: "Earth's Bulwark",
    effectNote: "Suleiman 30 Oct: the effect of the Verse of Stone is called Earth's Bulwark. Its short word is EARTH because BULWARK is already the Warden's signature.",
    kind: "buff",
    group: "Blessings",
    color: "#d9b77a",
    range: 3,
    turns: 2,
    stat: "guard",
    amount: 3,
    holdChance: 30,
    boosts: {
      defense: 2
    },
    text: "Earth's Bulwark, +2 defense. In a clash: +3 guard, harder to push.",
    mp: 3,
    use: "both",
    affinity: {
      jobs: [
        "guardian",
        "warden"
      ],
      times: 2,
      who: "a shield-bearer"
    },
    stillGuard: {
      jobs: [
        "spearman"
      ],
      damageTaken: 0.5,
      unpushable: true,
      text: "A spearman (Gaha) who doesn't move on his turn plants his feet: half damage, and nothing can push him, until his next turn."
    }
  },
  fury: {
    name: "Verse of Fury",
    button: "Fury",
    short: "FURY",
    icon: "fury",
    card: "fury",
    effect: "Fury",
    kind: "buff",
    group: "Blessings",
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
    group: "Hexes",
    icon: "slow"
  },
  husk: {
    name: "Husk",
    button: "Husk",
    short: "HUSK",
    kind: "escape",
    color: "#8fd18a",
    range: 3,
    text: "Leave a decoy that fools the enemy and slip up to 3 tiles away, even out of a clash. Enemies chase the decoy. If nobody strikes it by your next turn, it echoes your next spell: a second bolt of Lightning, or a Verse or Slow twice as strong. Cast under Swiftness, a struck decoy bursts in a howling gust: enemies next to it are blown 2 tiles away.",
    mp: 5,
    use: "both"
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
    text: "Sink into a trance: your next turn is spent meditating too (you can't act), then 6 MP come back. You are Exposed until then, so keep allies close."
  },
  spearThrow: {
    name: "Spear Throw",
    button: "Spear Throw",
    short: "THROW",
    kind: "throw",
    color: "#e8c690",
    range: 3,
    push: 1,
    cooldown: 3,
    text: "Hurl the spear at an enemy up to 3 tiles away, 1 tile further for each level you stand above it. A hit knocks it back a tile (off a ledge, it falls; into a wall, it slams and is Disoriented). A higher block in the way stops the throw. Ready again after 3 turns.",
    mp: 0,
    use: "enemy",
    rangePerLevel: 1
  },
  herbs: {
    name: "Herbs",
    button: "Herbs",
    short: "HERBS",
    kind: "heal",
    color: "#9fdc8a",
    range: 2,
    heal: 10,
    cooldown: 3,
    uses: 3,
    text: "Throw a pouch of healing herbs to an ally up to 2 tiles away (one tile further for each level you stand above them), or use it yourself: +10 health, and it cures poison and puts out a burn. Ready again after 3 turns. Only 3 pouches a battle.",
    mp: 0,
    use: "ally",
    rangePerLevel: 1
  },
  poisonArrow: {
    name: "Poison Arrow",
    button: "Poison Arrow",
    short: "POISON",
    kind: "poison",
    color: "#9fdc6a",
    range: 5,
    damageShare: 0.5,
    poison: 3,
    turns: 3,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "Take aim this turn; the arrow flies at the start of your next turn if the target is still within reach and in clear sight (a higher block in the way stops it). Half damage, then 3 damage at the start of each of its next 3 turns. Poison never takes the last point of health, and Herbs cures it. Ready again after 3 turns."
  },
  intercept: {
    name: "Intercept",
    button: "Intercept",
    short: "CHARGE",
    kind: "charge",
    color: "#ffd27a",
    range: 4,
    damageShare: 0.5,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "Charge up to 4 tiles at an enemy and slam it with the shield: half damage, and it's locked in a clash with you. If it was clashing with an ally, you take over and the ally is free. Ready again after 3 turns.",
    effect: "lock"
  },
  shieldToss: {
    name: "Shield Toss",
    button: "Shield Toss",
    short: "TOSS",
    kind: "toss",
    color: "#c9d6e8",
    range: 3,
    damageShare: 0.5,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "Hurl the shield at an enemy up to 3 tiles away (a higher block in the way stops it): half damage, and it is stunned for a turn. A stunned unit loses its next turn, can't dodge, and takes flank hits (+3 damage). Ready again after 3 turns."
  },
  doubleHit: {
    name: "Double Hit",
    button: "Double Hit",
    short: "DOUBLE",
    kind: "double",
    color: "#9fc4e8",
    range: 1,
    hits: 2,
    damageShare: 0.6,
    chance: 0.35,
    cooldown: 0,
    mp: 0,
    use: "enemy",
    text: "Strike with both heads of the spear: two quick hits on an enemy next to you, each 60% of a normal hit, each rolled on its own. When Rabdul attacks, there is a 35% chance he strikes this way."
  },
  shieldRam: {
    name: "Shield Ram",
    button: "Shield Ram",
    short: "RAM",
    kind: "charge",
    effect: "knockback",
    verse: {
      of: "intercept",
      with: "stone"
    },
    color: "#d9b77a",
    range: 4,
    damageShare: 0.5,
    push: 2,
    mp: 3,
    use: "enemy",
    text: "Stone turns Intercept into this: charge up to 4 tiles and ram the enemy 2 tiles back, no clash. Into a wall, it slams and is Disoriented. 3 Verse MP."
  },
  furyCharge: {
    name: "Furious Charge",
    button: "Furious Charge",
    short: "FURY",
    kind: "charge",
    effect: "strike",
    verse: {
      of: "intercept",
      with: "fury"
    },
    color: "#ff8a5c",
    range: 4,
    damageShare: 1,
    mp: 3,
    use: "enemy",
    text: "Fury turns Intercept into this: charge up to 4 tiles and hit with your full strength, no clash. 3 Verse MP."
  },
  blitz: {
    name: "Blitz",
    button: "Blitz",
    short: "BLITZ",
    kind: "charge",
    effect: "stun",
    verse: {
      of: "intercept",
      with: "swiftness"
    },
    color: "#9fd4ff",
    range: 4,
    damageShare: 0.5,
    mp: 3,
    use: "enemy",
    text: "Swiftness turns Intercept into this: a charge too fast to answer. Half damage, and it is stunned for a turn, no clash. 3 Verse MP."
  },
  sonicJavelin: {
    name: "Sonic Javelin",
    button: "Sonic Javelin",
    short: "SONIC",
    kind: "javelin",
    verse: {
      of: "spearThrow",
      with: "swiftness"
    },
    color: "#f2d3a0",
    range: 5,
    rangePerLevel: 1,
    pierce: true,
    push: 1,
    closeRange: 2,
    sweepShare: 1.5,
    mp: 3,
    use: "enemy",
    text: "Swiftness turns Spear Throw into this. Up close: dash in and whirl the spear down. Further (5 tiles): a throw that hits every enemy in its line, through high blocks. At a reeling foe: zip to it and sweep low (1.5x damage). Never misses. 3 Verse MP."
  },
  furyDive: {
    name: "Fury Dive",
    button: "Fury Dive",
    short: "DIVE",
    kind: "dive",
    verse: {
      of: "spearThrow",
      with: "fury"
    },
    color: "#ff8a5c",
    range: 3,
    damageShare: 1.5,
    mp: 3,
    use: "enemy",
    text: "Fury turns Spear Throw into this: leap up to 3 tiles, over heads and walls, and slam down on an enemy for 1.5x a normal blow. Enemies next to where he lands are knocked Off-Balance. Never misses. 3 Verse MP."
  },
  thunderclap: {
    name: "Thunderclap",
    button: "Thunderclap",
    short: "CLAP",
    kind: "bolt",
    verse: {
      of: "attack",
      with: "stone",
      jobs: [
        "sage"
      ]
    },
    color: "#d9b77a",
    push: 1,
    mp: 0,
    use: "enemy",
    text: "Stone turns her Lightning into this: the bolt knocks the target a tile back (into a wall, it slams). It still jumps to a second enemy.",
    element: "lightning"
  },
  wildfire: {
    name: "Wildfire",
    button: "Wildfire",
    short: "FIRE",
    kind: "bolt",
    element: "fire",
    verse: {
      of: "attack",
      with: "fury",
      jobs: [
        "sage"
      ]
    },
    color: "#ff8a3c",
    burn: 2,
    turns: 3,
    mp: 0,
    use: "enemy",
    text: "Fury turns her Lightning to fire: it sets the target alight, 2 damage a turn for 3 turns (never the last point; Herbs put it out). Fire doesn't jump."
  },
  enchant: {
    name: "Enchant",
    button: "Enchant",
    short: "ENCHANTED",
    kind: "enchant",
    color: "#ff8a3c",
    icon: "enchanted",
    range: 3,
    mp: 3,
    cooldown: 3,
    turns: 3,
    damage: 2,
    use: "ally",
    note: "Roadmap 4.1 (Suleiman OK'd): Shango's symbol set on a weapon. Rabdul has 9 MP, so three casts a battle.",
    text: "Rabdul calls on Shango and sets his symbol on a weapon: his own, or an ally's up to 3 tiles away. For its next 3 turns that weapon burns: +2 damage on every hit (+1 against a Drenched target, the water dulls the flames). Costs 3 MP. Ready again after 3 turns."
  },
  earthDrive: {
    name: "Earth Drive",
    button: "Earth Drive",
    short: "EARTH DRIVE",
    kind: "earthDrive",
    color: "#d9a066",
    range: 1,
    damageShare: 0.5,
    push: 1,
    turns: 2,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    note: "Roadmap 4.2 (proposal built as proposed): half damage, push 1, the spike lasts 2 of Tayo's turns.",
    text: "Tayo drives his fist into the ground and a spike of rock bursts up under the foe in front of him: half damage, and it is thrown back a tile (into a wall or a unit: a slam). The spike stays as a wall for 2 of his turns: nobody walks through it and it stops arrows and thrown weapons. Ready again after 3 turns."
  },
  clap: {
    name: "Sonic Clap",
    button: "Clap",
    short: "CLAP",
    kind: "clap",
    color: "#e8c08a",
    range: 2,
    damageShare: 0.3,
    push: 1,
    cooldown: 3,
    mp: 0,
    use: "area",
    note: "Roadmap 13.31 (Baiyee 8 Nov, Suleiman agreed, no more long range): an area around Tayo, not a line. Every foe within 2 tiles takes a little damage (30 percent of a hit) and is knocked back 1 tile with the usual push rules (a wall or a unit behind it: a slam). The AI claps when 2 or more foes are within 2 tiles. Drawn with his attack pictures until Suleiman sends clap art.",
    text: "Tayo claps his hands with all his might. A shockwave blasts every foe within 2 tiles: a little damage, and each is knocked back a tile (into a wall or a unit: a slam). Ready again after 3 turns."
  },
  elementBlast: {
    name: "Element Blast",
    button: "Element Blast",
    short: "BLAST",
    kind: "elementBlast",
    color: "#ff8a3c",
    range: 3,
    damageShare: 1,
    burn: 2,
    turns: 3,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    needsElement: true,
    note: "Roadmap 13.4 (Suleiman's 6 Nov art, 13.17): only while an element is on him. Enchanted = fire (sets Burn, burn and turns as Wildfire), Drenched = water (leaves the target Drenched, puts out a burn). Spends the element. A straight line, range 3, full damage, a block in the way stops it like an arrow.",
    text: "Tayo gathers the element on him into one fist and fires it down a straight line, up to 3 tiles (a higher block in the way stops it). Full damage. Enchanted: a fire blast that sets the target Burning. Drenched: a water blast that leaves the target Drenched. It spends the element (the Enchant ends, or he dries off), so it only works while one is on him. Ready again after 3 turns."
  },
  smokeBomb: {
    name: "Smoke Bomb",
    button: "Smoke Bomb",
    short: "SMOKE",
    kind: "smoke",
    color: "#c9c0b4",
    range: 2,
    cooldown: 3,
    mp: 0,
    use: "battlefield",
    text: "Throw a smoke bomb at your own feet. Enemies next to you are Blinded for 1 turn (their attacks mostly miss, and they cannot start a clash or take aim). Then slip up to 2 tiles away for free: you are Hidden for 1 turn, so enemies cannot target you. The cloud stays until your next turn. Ready again after 3 turns. Not during a clash."
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
  const times = affinityTimes(unit, buff.id) * (buff.power || 1);
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
function isBlinded(unit) {
  return !!(unit && unit.status && unit.status.blinded);
}

// src/combat.js
function distance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

// src/engagement.js
var DEFAULT_CTX = { random: Math.random, heightOf: () => 0 };
function isMelee(unit) {
  return !!unit.contest && (unit.range === 1 || !!unit.melee);
}
function canBeCaught(unit) {
  return !!unit.contest;
}
function styleOf(unit) {
  return unit.contest ? unit.contest.style : null;
}
function canEngage(attacker, target) {
  return attacker.alive && target.alive && attacker.side !== target.side && !attacker.hasActed && !isBlinded(attacker) && // it cannot see to grab anyone (Smoke Bomb)
  (!target.hidden || target.isDecoy) && // a hidden unit cannot be grabbed (a decoy can)
  isMelee(attacker) && canBeCaught(target) && !attacker.engagedWith && !target.engagedWith && distance(attacker, target) === 1;
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
  return path;
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
  const amount = unit.engagedWith ? engagement_default.poise.refillInClash || 0 : engagement_default.poise.refill;
  unit.poise = Math.min(engagement_default.poise.max, poiseOf(unit) + amount);
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
    rating: Math.ceil(stanceRating(unit, stance) * engagement_default.statWeight),
    // half the stat, rounded up: class strengths matter without deciding every beat
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
  canBeCaught,
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
