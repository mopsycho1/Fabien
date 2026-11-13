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

// src/combat.js
var combat_exports = {};
__export(combat_exports, {
  chainDamage: () => chainDamage,
  chainTarget: () => chainTarget,
  distance: () => distance,
  drenchedEffect: () => drenchedEffect,
  getDamage: () => getDamage,
  getHitChance: () => getHitChance,
  getTargetsInRange: () => getTargetsInRange,
  hasClearShot: () => hasClearShot,
  heightAccuracy: () => heightAccuracy,
  heightEdge: () => heightEdge,
  holdsDagger: () => holdsDagger,
  inReach: () => inReach,
  isDistracted: () => isDistracted,
  rollAttack: () => rollAttack,
  setHeightLookup: () => setHeightLookup,
  shootsProjectiles: () => shootsProjectiles,
  usesCloseWeapon: () => usesCloseWeapon
});
module.exports = __toCommonJS(combat_exports);

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
    name: "Sonic Burst",
    button: "Burst",
    short: "BURST",
    kind: "clap",
    color: "#e8c08a",
    range: 2,
    damageShare: 0.3,
    push: 1,
    cooldown: 3,
    mp: 0,
    use: "area",
    note: 'Roadmap 13.31 (Baiyee 8 Nov, Suleiman agreed, no more long range): an area around Tayo, not a line. Every foe within 2 tiles takes a little damage (30 percent of a hit) and is knocked back 1 tile with the usual push rules (a wall or a unit behind it: a slam). The AI claps when 2 or more foes are within 2 tiles. Drawn with his attack pictures until Suleiman sends his Sonic Burst art (ART10). Renamed from Sonic Clap on 13 Nov (roadmap 13.37); the id stays "clap".',
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

// src/data/conditions.json
var conditions_default = {
  note: "Conditions a unit can be put in by skills. Every number here is a first guess for playtesting.",
  stun: {
    note: "Stunned (Shield Toss, Intercept): the unit loses its next turn. While stunned it cannot dodge, and every hit on it lands as a flank hit for flankDamage extra damage.",
    flankDamage: 3,
    canDodge: false
  },
  disoriented: {
    note: "Disoriented (Suleiman, 29 Oct): a unit pushed into a wall, higher ground or another unit slams into it. It takes impactDamage, and until the end of its next turn it fights worse (attack, defense and evade lowered by these amounts) and every kind of magic hits it for magicDamage extra.",
    impactDamage: 2,
    attack: 2,
    defense: 2,
    evade: 10,
    magicDamage: 3
  },
  blinded: {
    note: "Blinded (the archer's Smoke Bomb, roadmap 13.26): a unit next to the cloud cannot see. Until the end of its next turn every attack it makes has missPenalty less chance to hit (never below 5), and it cannot start a clash or take aim (Poison Arrow).",
    missPenalty: 45,
    turns: 1
  }
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

// src/status.js
function statusOf(unit) {
  if (!unit.status) unit.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null };
  return unit.status;
}
function isOffBalance(unit) {
  return statusOf(unit).offBalance;
}
function statMod(unit, stat) {
  let mod = 0;
  if (isOffBalance(unit)) {
    if (stat === "defense") mod -= engagement_default.offBalance.defense;
    if (stat === "evade") mod -= engagement_default.offBalance.evade;
  }
  const buff = buffOf(unit);
  if (buff && buff.boosts && buff.boosts[stat]) mod += buff.boosts[stat];
  const exposed = statusOf(unit).exposed;
  if (exposed && exposed[stat]) mod -= exposed[stat];
  if (isDisoriented(unit) && ["attack", "defense", "evade"].includes(stat)) mod -= conditions_default.disoriented[stat];
  return mod;
}
function hasOwnMp(unit) {
  return (unit.maxMp || 0) > 0;
}
function lentMp(unit) {
  const buff = statusOf(unit).buff;
  return buff && buff.lent ? buff.lent.mp : 0;
}
function verseMovesOf(unit, verseId) {
  const own = /* @__PURE__ */ new Set([...unit.spells || [], "attack"]);
  return Object.keys(spells_default).filter((id) => {
    const v = spells_default[id].verse;
    return v && v.with === verseId && own.has(v.of) && (!v.jobs || v.jobs.includes(unit.job));
  });
}
function activeMove(unit, baseId) {
  const buff = statusOf(unit).buff;
  if (!buff) return baseId;
  const id = verseMovesOf(unit, buff.id).find((m) => spells_default[m].verse.of === baseId);
  if (!id) return baseId;
  if (!hasOwnMp(unit) && lentMp(unit) < (spells_default[id].mp || 0)) return baseId;
  return id;
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
function isStunned(unit) {
  return !!(unit && unit.status && unit.status.stunned);
}
function isBlinded(unit) {
  return !!(unit && unit.status && unit.status.blinded);
}
function isDisoriented(unit) {
  return !!(unit && unit.status && unit.status.disoriented);
}
function isEnchanted(unit) {
  return !!(unit && unit.status && unit.status.enchant);
}
function enchantBonus(attacker, defender) {
  const e = attacker && attacker.status && attacker.status.enchant;
  if (!e) return 0;
  return isDrenched(defender) ? Math.round(e.damage * terrain_default.water.fireTimes) : e.damage;
}
function isDrenched(unit) {
  return !!(unit && unit.status && unit.status.drenched);
}
function attackElement(unit) {
  const id = activeMove(unit, "attack");
  if (id !== "attack" && spells_default[id] && spells_default[id].element) return spells_default[id].element;
  return unit.element || null;
}

// src/combat.js
var heightOf = () => 0;
function setHeightLookup(fn) {
  heightOf = fn;
}
function heightEdge(attacker, defender) {
  return heightOf(attacker.col, attacker.row) - heightOf(defender.col, defender.row);
}
function heightAccuracy(attacker, defender) {
  if (attacker.range <= 1 || attacker.melee) return 0;
  return heightEdge(attacker, defender) * terrain_default.rangedAccuracyPerLevel;
}
function distance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
function hasClearShot(from, to) {
  const d = distance(from, to);
  if (d <= 1) return true;
  const h0 = heightOf(from.col, from.row) + terrain_default.sightHeight;
  const h1 = heightOf(to.col, to.row) + terrain_default.sightHeight;
  const steps = d * 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const col = Math.floor(from.col + 0.5 + (to.col - from.col) * t);
    const row = Math.floor(from.row + 0.5 + (to.row - from.row) * t);
    if (col === from.col && row === from.row || col === to.col && row === to.row) continue;
    if (heightOf(col, row) >= h0 + (h1 - h0) * t) return false;
  }
  return true;
}
function shootsProjectiles(unit) {
  return unit.range > 1 && !unit.melee && unit.attackType !== "magic";
}
function getHitChance(attacker, defender) {
  const evade = isStunned(defender) && !conditions_default.stun.canDodge ? 0 : defender.evade + statMod(defender, "evade");
  let chance = attacker.accuracy - evade;
  if (isDistracted(defender, attacker)) chance += engagement_default.distractedHitBonus;
  if (attacker.closePenalty && distance(attacker, defender) <= 1) chance -= attacker.closePenalty;
  chance += heightAccuracy(attacker, defender);
  if (isBlinded(attacker)) chance -= conditions_default.blinded.missPenalty;
  return Math.min(95, Math.max(5, chance));
}
function isDistracted(defender, attacker) {
  return !!defender.engagedWith && defender.engagedWith !== attacker;
}
function getDamage(attacker, defender) {
  const flank = isStunned(defender) ? conditions_default.stun.flankDamage : 0;
  if (attacker.attackType === "magic") {
    const power = attacker.magicAttack + statMod(attacker, "magicAttack");
    const dazed = isDisoriented(defender) ? conditions_default.disoriented.magicDamage : 0;
    return soaked(attacker, defender, Math.max(1, power - (defender.magicDefense + statMod(defender, "magicDefense"))) + flank + dazed);
  }
  const attack = attacker.attack + statMod(attacker, "attack") + (usesCloseWeapon(attacker, defender) ? attacker.closeWeapon.attack : 0);
  return soaked(attacker, defender, Math.max(1, attack - (defender.defense + statMod(defender, "defense"))) + flank) + enchantBonus(attacker, defender);
}
function soaked(attacker, defender, damage) {
  if (!isDrenched(defender)) return damage;
  const element = attackElement(attacker);
  const times = element === "lightning" ? terrain_default.water.lightningTimes : element === "fire" ? terrain_default.water.fireTimes : 1;
  return Math.max(1, Math.round(damage * times));
}
function drenchedEffect(attacker, defender) {
  if (!isDrenched(defender)) return null;
  if (isEnchanted(attacker) && attacker.attackType !== "magic") return "less";
  const element = attackElement(attacker);
  return element === "lightning" ? "more" : element === "fire" ? "less" : null;
}
function usesCloseWeapon(attacker, defender) {
  return holdsDagger(attacker) && distance(attacker, defender) <= 1;
}
function holdsDagger(unit) {
  return !!unit.closeWeapon && unit.weapon === "dagger";
}
function chainTarget(attacker, struck, units) {
  if (!attacker.chain) return null;
  let best = null;
  for (const u of units) {
    if (!u.alive || u === struck || u.side === attacker.side) continue;
    const d = distance(struck, u);
    if (d <= attacker.chain.range && (best === null || d < distance(struck, best))) best = u;
  }
  return best;
}
function chainDamage(attacker, defender) {
  return Math.max(1, Math.round(getDamage(attacker, defender) * attacker.chain.share));
}
function getTargetsInRange(attacker, units) {
  return units.filter((other) => other.alive && other.side !== attacker.side && inReach(attacker, other));
}
function inReach(attacker, spot) {
  const d = distance(attacker, spot);
  if (d < 1 || d > attacker.range) return false;
  if (attacker.closeWeapon && attacker.weapon) {
    if (holdsDagger(attacker) ? d > 1 : d < 2) return false;
  }
  if (attacker.lineReach && d > 1) return attacker.col === spot.col || attacker.row === spot.row;
  if (shootsProjectiles(attacker) && !hasClearShot(attacker, spot)) return false;
  return true;
}
function rollAttack(attacker, defender, random = Math.random) {
  const hitChance = getHitChance(attacker, defender);
  const hit = random() * 100 < hitChance;
  return {
    hit,
    damage: hit ? getDamage(attacker, defender) : 0,
    hitChance
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  chainDamage,
  chainTarget,
  distance,
  drenchedEffect,
  getDamage,
  getHitChance,
  getTargetsInRange,
  hasClearShot,
  heightAccuracy,
  heightEdge,
  holdsDagger,
  inReach,
  isDistracted,
  rollAttack,
  setHeightLookup,
  shootsProjectiles,
  usesCloseWeapon
});
