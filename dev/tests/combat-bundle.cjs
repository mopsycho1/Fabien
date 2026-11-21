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
  skyfallOn: () => skyfallOn,
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
  spiritBoltFire: {
    name: "Ember Bolt",
    button: "Ember Bolt",
    short: "EMBER",
    kind: "bolt",
    element: "fire",
    reads: "fire",
    color: "#ff8a3c",
    burn: 2,
    turns: 3,
    mp: 0,
    use: "enemy",
    text: "Kofi reads Fire: his Spirit Bolt sets the target alight, 2 damage a turn for 3 turns (never the last point; Herbs put it out)."
  },
  spiritBoltWater: {
    name: "Tide Bolt",
    button: "Tide Bolt",
    short: "TIDE",
    kind: "bolt",
    element: "water",
    reads: "water",
    color: "#7fd6c4",
    drench: 2,
    mp: 0,
    use: "enemy",
    text: "Kofi reads Water: his Spirit Bolt leaves the target Drenched for 2 turns, so lightning hurts it more."
  },
  spiritBoltEarth: {
    name: "Stone Bolt",
    button: "Stone Bolt",
    short: "STONE",
    kind: "bolt",
    element: "earth",
    reads: "earth",
    color: "#d9b77a",
    push: 1,
    mp: 0,
    use: "enemy",
    text: "Kofi reads Earth: his Spirit Bolt knocks the target a tile back (into a wall, it slams)."
  },
  spiritBoltStorm: {
    name: "Gale Bolt",
    button: "Gale Bolt",
    short: "GALE",
    kind: "bolt",
    element: "lightning",
    reads: "storm",
    color: "#bfd8ff",
    jump: true,
    mp: 0,
    use: "enemy",
    text: "Kofi reads Storm: his Spirit Bolt jumps to a second enemy within 2 tiles for half damage."
  },
  haunt: {
    name: "Haunt",
    button: "Haunt",
    short: "HAUNT",
    kind: "haunt",
    color: "#8fe0b0",
    range: 4,
    hexTurns: 2,
    resist: { base: 60, perPoint: 8, min: 25, max: 95, note: "13.60: the chance to land, in percent: 60 plus 8 for each point of Kofi's magic attack over the target's magic defense, kept between 25 and 95 (92 against a fighter, 68 against Layra)." },
    turns: 3,
    delay: 0,
    speedLoss: 2,
    drench: 2,
    burnAs: "spiritBoltFire",
    mp: 2,
    use: "enemy",
    text: "A hex: the spirits leave the target Disoriented for its next 2 turns (attack -2, defense -2, evade -10, magic hits it harder; Herbs lift it). It rolls against the target's magic defense first: a strong mind can shake it off. What Kofi reads adds to it when it lands. Fire: it also burns. Water: Drenched. Earth: bound, slower for 3 turns. Storm: shaken, its aim or trance breaks and it is Off-Balance."
  },
  infuse: {
    name: "Infuse",
    button: "Infuse",
    short: "INFUSE",
    kind: "infuse",
    color: "#8fe0b0",
    range: 3,
    verses: {
      earth: "stone",
      storm: "swiftness",
      fire: "fury",
      water: "renewal"
    },
    cooldown: 2,
    mp: 2,
    use: "ally",
    text: "A blessing for an ally within 3 tiles, or himself, from what Kofi reads. Earth: the Stone Verse. Storm: Swiftness. Fire: Fury. Water: Renewal, a healing that starts at once and goes on for 3 turns. Ready again after 2 turns."
  },
  renewal: {
    name: "Renewal",
    button: "Renewal",
    short: "RENEW",
    kind: "buff",
    group: "Blessings",
    color: "#7fd6c4",
    range: 3,
    turns: 3,
    regen: 0.05,
    minHeal: 3,
    cleanse: 1,
    boosts: {},
    text: "Kofi's Water blessing (only through Infuse, roadmap 1.49, 6.38). It heals as soon as it is given, and again at the start of each of its turns: each time about 5% of its health (at least 3 points) and one weak status lifted (poison, burn, blinded or disoriented). Lasts 3 turns.",
    mp: 0,
    use: "both"
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
  lunge: {
    name: "Lunge",
    button: "Lunge",
    short: "LUNGE",
    kind: "lunge",
    color: "#e8c690",
    range: 4,
    minRange: 2,
    reach: 2,
    bonusPerTile: 1,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    note: "Gaha's Spearman Build (Suleiman, 15 Nov; roadmap 13.59). Numbers are the PDF's defaults. Advance up to 2 tiles in a straight line, then Thrust: +1 damage for each tile he advanced. He stops where his spear (reach 2) just touches the foe, so the foe stands 2 to 4 tiles away in a line (at 2 he does not run: +0). The run does not use up his Move. Not in a clash. Cancels Rooted that turn.",
    text: "Run up to 2 tiles in a straight line at an enemy, then Thrust: 1 extra damage for each tile you ran. The foe must stand 2 to 4 tiles away in a straight line. The run does not use up your Move. Not during a clash. It moves you, so you are not Rooted this turn. Ready again after 3 turns."
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
    rockDamage: 4,
    damageShare: 0.3,
    push: 1,
    cooldown: 3,
    mp: 0,
    use: "area",
    note: 'Roadmap 13.31 (Baiyee 8 Nov, Suleiman agreed, no more long range): an area around Tayo, not a line. Every foe within 2 tiles takes a little damage (30 percent of a hit) and is knocked back 1 tile with the usual push rules (a wall or a unit behind it: a slam). The AI claps when 2 or more foes are within 2 tiles. Drawn with his attack pictures until Suleiman sends his Sonic Burst art (ART10). Renamed from Sonic Clap on 13 Nov (roadmap 13.37); the id stays "clap".',
    text: "Tayo claps his hands with all his might. A shockwave blasts every foe within 2 tiles: a little damage, and each is knocked back a tile (into a wall or a unit: a slam). Combo: any Earth Drive rock of his within 2 tiles bursts, and each foe next to a burst rock takes 4 more. Ready again after 3 turns."
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
  },
  reverseGrip: {
    name: "Reverse Grip",
    button: "Reverse Grip",
    short: "GRIP",
    kind: "grip",
    free: true,
    color: "#c9a8ff",
    range: 0,
    mp: 0,
    use: "self",
    text: "Free, once a turn, no action: turn the sword-staff round. Fork leading: his attack (Fork Strike) also hits the next foe straight behind the target at half damage, and Snare Hook and Sunder Boon are ready. Blade leading: his attack (Blade Strike) does 2 more damage, and Heavy Cleave is ready."
  },
  snareHook: {
    name: "Snare Hook",
    button: "Snare Hook",
    short: "HOOK",
    kind: "hook",
    grip: "fork",
    color: "#a98bff",
    range: 2,
    lineOnly: true,
    damageShare: 0.5,
    pull: 1,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "Fork end. Hook a foe up to 2 tiles away in a straight line: half damage, and it is pulled 1 tile toward him (into a unit or a wall: a slam). A pulled foe next to his allies can take Relay Strikes. Ready again after 3 turns."
  },
  sunderBoon: {
    name: "Sunder Boon",
    button: "Sunder Boon",
    short: "SUNDER",
    kind: "sunder",
    grip: "fork",
    color: "#b07cff",
    range: 1,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "Fork end. Tear one blessing off the foe next to him (Swiftness, Earth's Bulwark, Fury or an Enchanted weapon). No damage. Adds 2 to his Mask Gauge. Ready again after 3 turns."
  },
  heavyCleave: {
    name: "Heavy Cleave",
    button: "Heavy Cleave",
    short: "CLEAVE",
    kind: "cleave",
    grip: "blade",
    color: "#9b6bff",
    range: 1,
    damageTimes: 1.5,
    ignoreDefense: 2,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "Blade end. A slow overhead strike at the foe next to him: one and a half times the damage, ignoring 2 of its defense. Ready again after 3 turns."
  },
  singularity: {
    name: "Singularity",
    button: "Singularity",
    short: "SINGULARITY",
    kind: "singularity",
    color: "#8b5cff",
    range: 0,
    uses: 1,
    mp: 0,
    use: "self",
    text: "Needs a full Mask Gauge (6). He dons the mask: it takes his whole turn, and the area within 3 tiles of him is marked. At the start of his next turn every foe within 3 tiles is pulled up to 3 tiles straight toward him; one stopped by a wall, a higher level or another unit takes 2 damage and is Disoriented, one that ends next to him is Off-Balance. Then every foe still standing takes a blow that cannot miss, 1.5 times a normal hit of his. Then he is Exposed for a turn (defense -2, evade -10) and the gauge is empty. A Stun, a fall or a slam on him while it charges breaks it. Once a battle."
  },
  verseSwap: {
    name: "Swap Verse",
    button: "Swap Verse",
    short: "SWAP",
    kind: "swap",
    free: true,
    color: "#ffd27a",
    range: 0,
    mp: 0,
    use: "self",
    text: "Free, once a turn, no action: his Echo Verse becomes Active and the Active one goes to the Echo. The incoming Verse Surges once: Swiftness a free step, Fury his next Press pushes the momentum one step further, Stone shakes off Off-Balance and cancels the next push this turn."
  },
  drawnBlade: {
    name: "Drawn Blade",
    button: "Drawn Blade",
    short: "DRAW",
    kind: "drawn",
    color: "#ffcf6a",
    range: 1,
    damageShare: 1,
    momentum: 1,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "The sheathed draw: he feints, then cuts the foe next to him (full damage). A hit locks them in a clash with the momentum already one step his way, a free Press. Ready again after 3 turns."
  },
  claim: {
    name: "Claim",
    button: "Claim",
    short: "CLAIM",
    kind: "claim",
    color: "#f2c14e",
    range: 1,
    turns: 2,
    cooldown: 3,
    mp: 0,
    use: "both",
    text: "Take one blessing from the unit next to him, ally or foe (a Verse, an Enchanted weapon, or Bloodied stacks: those take a point off every hit on him): it leaves them and is his for 2 turns. A Verse goes in his Active slot (the old one to the Echo). Ready again after 3 turns."
  },
  mantle: {
    name: "Mantle",
    button: "Mantle",
    short: "MANTLE",
    kind: "mantle",
    color: "#ffc95a",
    range: 3,
    power: 0.5,
    cooldown: 3,
    mp: 0,
    use: "self",
    text: "Share his Active Verse with every ally within 3 tiles at half strength, for their next turn. Needs an Active Verse. Ready again after 3 turns."
  },
  galeCut: {
    name: "Gale Cut",
    button: "Gale Cut",
    short: "GALE",
    kind: "gale",
    color: "#e8f2ff",
    damageShare: 0.8,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "In any form. He dashes in a straight line as far as his move, cutting through every foe on the way (each takes 0.8 of his damage, rolled on its own), and stops on the first free tile past the last one. Uses his move. Ready again after 3 turns."
  },
  rendingDraw: {
    name: "Rending Draw",
    button: "Rending Draw",
    short: "REND",
    kind: "rending",
    verseSkill: "fury",
    color: "#ff7a4a",
    range: 1,
    damageShare: 1,
    ignoreDefense: 2,
    push: 2,
    cooldown: 3,
    mp: 0,
    use: "enemy",
    text: "Fury. A Drawn Blade that ignores 2 of the foe's defense and throws it 2 tiles back (into a wall or a unit: a slam). From the Echo: 75 percent, one more turn of cooldown. Ready again after 3 turns."
  },
  bulwarkShield: {
    name: "Bulwark Shield",
    button: "Bulwark Shield",
    short: "SHIELD",
    kind: "shield",
    verseSkill: "stone",
    color: "#e8c87a",
    range: 2,
    share: 0.2,
    turns: 2,
    cooldown: 3,
    mp: 0,
    use: "self",
    note: "Roadmap 10.46 (Suleiman 21 Nov): the answer to area attacks like Gadara's Singularity. share = part of each fighter's own max health the shield soaks; turns = how many of that fighter's turns it lasts; range = allies within this many tiles. Suleiman's defaults: 20 percent, 2 turns, 2 tiles.",
    text: "Earth's Bulwark. He raises a shield on himself and every ally within 2 tiles: it soaks damage (hits, slams and falls, Singularity too) up to 20 percent of each one's max health, for 2 turns. From the Echo: 15 percent, one more turn of cooldown. Ready again after 3 turns."
  },
  unmoved: {
    name: "Unmoved",
    button: "Unmoved",
    short: "UNMOVED",
    kind: "unmoved",
    verseSkill: "stone",
    reaction: true,
    color: "#d9b77a",
    counterShare: 0.5,
    cooldown: 3,
    mp: 0,
    use: "self",
    text: "Stone, a reaction (no button): the first push or pull on him is cancelled, and he answers the one who pushed with a half-strength counter if they stand next to him. From the Echo: 75 percent, one more turn of cooldown. Ready again after 3 turns."
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
  distractedDamageBonus: 2,
  distractedNote: "A fighter locked in a clash with SOMEONE ELSE is Distracted: every other attacker hits it 10 points more often (distractedHitBonus) and for 2 more damage (distractedDamageBonus, 1.77, 21 Nov: before this there was no damage bonus at all). The two in the clash do not get it against each other.",
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
    riposte: {
      note: "Riposte (Gaha, Spearman; roadmap 13.59, numbers from Suleiman's build sheet): each Slip beat he wins adds a stack (up to maxStacks); losing any beat clears them. A won Slip beat hits for winHitBase + the stacks he held before it. A decisive Slip win lets him step to a free tile next to him, ends the clash and leaves the foe Off-Balance (no push).",
      maxStacks: 2,
      winHitBase: 1
    },
    bulwark: {
      note: "Bulwark (Warden): each beat in a row held in Guard adds a level. Each level pushes him 1 tile less. An even beat in Guard gives back standoffPoise Poise and standoffHeal health.",
      max: 3,
      pushResistPerLevel: 1,
      standoffHeal: 2,
      standoffPoise: 1
    }
  },
  enemyClashGap: 14,
  enemyClashGapNote: "Balance (roadmap 18.15, 14 Nov): after an enemy starts a clash, the whole enemy side waits this many turns (every fighter's turn counts as one) before any enemy starts another. 0 = no wait. Each enemy still waits 6 turns of its own after its clash ends.",
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
    note: "Shallow water (roadmap 11.4, Suleiman 29 Oct 19:58): units can wade through it. A unit standing in water is Drenched, and stays Drenched for drenchedTurns of its own turns after it leaves. Drenched units take lightningTimes the damage from lightning and fireTimes from fire (ice when it exists: more). Water puts out a burn, and fire can't set a Drenched unit alight.",
    skyfall: {
      bonus: 2,
      word: "Skyfall!",
      color: "#cfd8ff",
      note: "Roadmap 6.65 (Suleiman 15 Nov, voice note 1578): Layra's plain Lightning has two forms. Normally she gathers the orb and the bolt flies from her to the target. When the target is Drenched (wet from Kofi's Tide Bolt, a Haunt of Water, or standing in water) the lightning comes down from the sky instead and hits for `bonus` more damage, with the `word` callout. Only a hit; not Thunderclap or Wildfire."
    }
  }
};

// src/data/kings.json
var kings_default = {
  note: "The two kings' own numbers (Phase 10). Gadara: the 19 Nov kit sheet 'Basic Attack Revision' (roadmap 10.23 to 10.29). Alagara: class sheet v2 'Active and Echo' (10.17 to 10.22) with cooldowns in place of SP, like Gadara's revision. Every number is a placeholder for playtesting. Their skills' own numbers are in spells.json.",
  gadara: {
    fork: { name: "Fork Strike", secondShare: 0.5, lineDepth: 2, note: "Fork mode basic attack: the target and the next foe straight behind it (an ally in between is skipped), each hit rolled on its own, the second at half damage." },
    blade: { name: "Blade Strike", bonus: 2, note: "Blade mode basic attack: one target, +2 damage." },
    mask: { max: 6, strip: 2, beat: 1, hit: 1, note: "+2 when he strips a buff, +1 for each clash beat he holds (wins or ties), +1 when he takes a hit." },
    dominion: { radius: 2, step: { attack: 1, defense: 1, evade: 5, amount: 1 }, note: "Buffs on his foes within 2 tiles are one step weaker: Fury +2 to +1, Swift's evade +15 to +10, Earth's Bulwark +2 to +1, and the clash bonus of a Verse 1 lower. Rabdul's Enchant burns 1 less." },
    singularity: { radius: 3, pull: 3, collisionDamage: 2, damageShare: 1.5, damageNote: "1.80 (21 Nov): every foe still standing when the pull ends takes 1.5 times a normal blow from him, a sure hit (5 to 8 normally, so 8 to 12 here), on top of a slam or fall.", chargeTicks: 8, chargeNote: "It resolves after a fixed charge of 8 time ticks (about one turn for each other fighter), not after his own slow turn: at speed 6 that was 13 turns, and it was nearly always broken or out of reach first (20 Nov).", exposed: { defense: 2, evade: 10 }, note: "Every foe within 3 tiles is pulled up to 3 tiles straight toward him; one stopped by a wall, a higher level or another unit takes 2 damage and is Disoriented; one that ends next to him is Off-Balance. Then he is Exposed for a turn (defense -2, evade -10), the mask comes off and the gauge is 0. Once a battle. A Stun, a fall or a slam on him while it charges breaks it (the gauge empties, the once-a-battle use is kept)." },
    ai: { clusterMin: 2, clusterAlways: 3, note: "The enemy AI casts Singularity when at least 2 foes stand within 3 tiles (always at 3 or more)." }
  },
  alagara: {
    activeBonus: 1.5,
    echoPower: 0.75,
    echoCooldownExtra: 1,
    verseSkills: { fury: "rendingDraw", stone: ["unmoved", "bulwarkShield"] },
    verseSkillsNote: "Gale Cut is his own skill in every form since 20 Nov (Suleiman, 10.34); it was the Swiftness Verse skill.",
    surge: {
      swiftness: { steps: 1, text: "Surge: a free step" },
      fury: { pressSteps: 1, text: "Surge: his next Press pushes the momentum one step further" },
      stone: { text: "Surge: Off-Balance shaken off, and the next push this turn is cancelled" }
    },
    note: "Attunement: two Verse slots, Active and Echo. Only the Active one gives stat bonuses (50 percent bigger on him). The Echo's Verse skill still works at 75 percent, with one more turn of cooldown. A swap is free, once a turn, and gives the incoming Verse a Surge. Left out for now (systems we do not have): the Renewal Verse's Surge and Sovereign's Grace, Hex, Counterspell, Anchor, Reveal, Crowned Cut (no art yet)."
  }
};

// src/kings.js
var MASK_MAX = kings_default.gadara.mask.max;
function dominionStep(stat) {
  return kings_default.gadara.dominion.step[stat] || 0;
}
var isAttuned = (unit) => !!(unit && unit.attune);
function attuneTimes(unit, value) {
  return isAttuned(unit) && value > 0 ? kings_default.alagara.activeBonus : 1;
}

// src/status.js
var underDominion = () => false;
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
  const weak = underDominion(unit);
  const round = (stat, v) => stat === "move" ? Math.floor(v) : Math.round(v);
  for (const [stat, value] of Object.entries(spell.boosts || {})) {
    let v = value * times * attuneTimes(unit, value);
    if (weak && v > 0) v = Math.max(0, v - dominionStep(stat));
    boosts[stat] = round(stat, v);
  }
  let amount = Math.round((spell.amount || 0) * times * attuneTimes(unit, spell.amount || 0));
  if (weak && amount > 0) amount = Math.max(0, amount - dominionStep("amount"));
  return {
    id: buff.id,
    turnsLeft: buff.turnsLeft,
    ...spell,
    boosts,
    amount,
    dominion: weak,
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
  const dmg = Math.max(0, e.damage - (underDominion(attacker) ? 1 : 0));
  return isDrenched(defender) ? Math.round(dmg * terrain_default.water.fireTimes) : dmg;
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
  const flank = (isStunned(defender) ? conditions_default.stun.flankDamage : 0) + (isDistracted(defender, attacker) ? engagement_default.distractedDamageBonus || 0 : 0);
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
function skyfallOn(attacker, defender) {
  return attacker.attackEffect === "spark" && attackElement(attacker) === "lightning" && !defender.isDecoy && isDrenched(defender);
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
  skyfallOn,
  usesCloseWeapon
});
