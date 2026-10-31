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
  getDamage: () => getDamage,
  getHitChance: () => getHitChance,
  getTargetsInRange: () => getTargetsInRange,
  hasClearShot: () => hasClearShot,
  heightAccuracy: () => heightAccuracy,
  heightEdge: () => heightEdge,
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
    group: "Escape",
    icon: "slow"
  },
  husk: {
    name: "Husk",
    button: "Husk",
    short: "HUSK",
    kind: "escape",
    color: "#8fd18a",
    range: 3,
    text: "Leave a decoy that fools the enemy and slip up to 3 tiles away, even out of a clash. Enemies chase the decoy. If nobody strikes it by your next turn, it echoes your next spell: a second bolt of Lightning, or a Verse or Slow twice as strong.",
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
    range: 1,
    heal: 10,
    cooldown: 3,
    text: "Press healing herbs on yourself or an ally next to you: +10 health, and it cures poison and puts out a burn. Ready again after 3 turns.",
    mp: 0,
    use: "ally"
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
    text: "Charge up to 4 tiles at an enemy and slam it with the shield: half damage, and it's locked in a clash with you. If it was already clashing with an ally, you take over and the ally is free. Ready again after 3 turns.",
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
    cooldown: 2,
    mp: 0,
    use: "enemy",
    text: "Strike with both heads of the spear: two quick hits on an enemy next to you, each 60% of a normal hit, each rolled on its own. Ready again after 2 turns."
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
    text: "Verse of Stone changes Intercept: charge up to 4 tiles and ram the enemy 2 tiles back instead of locking it in a clash. Into a wall, it slams and is Disoriented. Uses 3 of the Verse's MP."
  },
  furyCharge: {
    name: "Fury Charge",
    button: "Fury Charge",
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
    text: "Verse of Fury changes Intercept: charge up to 4 tiles and hit with your full strength. No clash. Uses 3 of the Verse's MP."
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
    text: "Verse of Swiftness changes Intercept: a charge so fast the enemy can't react. Half damage, and it's stunned for a turn. No clash. Uses 3 of the Verse's MP."
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
    text: "Verse of Swiftness changes Spear Throw. Up close (2 tiles or less): dash in and bring the spear down in a whirl. Further away (up to 5 tiles): a throw that breaks the sound barrier and hits every enemy in its line; higher blocks don't stop it. A foe that is Off-Balance or Disoriented: zip next to it and sweep low with a burst of earth (1.5 times the damage). Never misses. Uses 3 of the Verse's MP."
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
    text: "Verse of Stone changes her Lightning: the bolt knocks the target a tile back (into a wall, it slams and is Disoriented). It still jumps to a second enemy."
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
    text: "Verse of Fury turns her Lightning to fire: it sets the target alight. Burn: 2 damage at the start of each of its next 3 turns. Like poison it never takes the last point of health, and Herbs put it out. Fire does not jump."
  }
};

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
    empower: 3,
    refillInClash: 0,
    note: "Poise: up to max, a battle starts with start. Each turn OUT of a clash gives back refill; a turn IN a clash gives back refillInClash. Empower spends 1 for +empower to one beat."
  },
  decisiveStrike: true,
  aiReadChance: 40,
  beatDice: 3,
  statWeight: 0.5,
  beatOddsNote: "With these numbers: same stance, a class strong in it beats one weak in it about 79% of the time; equal fighters where one stance beats the other, 64%; a strong class that picked the beaten stance, 55%.",
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
  }
};

// src/data/terrain.json
var terrain_default = {
  note: "How the lie of the land changes a fight. First guesses for playtesting.",
  rangedAccuracyPerLevel: 10,
  openingHeightBonusPerLevel: 2,
  fallDamagePerLevel: 4,
  pushClimbLimit: 1,
  downhillPushExtra: 1,
  sightHeight: 1.5,
  sightHeightNote: "Line of sight (Suleiman, 29 Oct): arrows and thrown weapons fly from chest height to chest height, this many levels above the ground each unit stands on. A tile in between whose top reaches that line stops the shot. Magic, and techniques that pierce, are not stopped. With 1.5, a block 2 levels higher than both units hides the target; 1 level does not.",
  climbLimit: 1,
  climbLimitNote: "Walking (roadmap 3.8): a unit can step up at most this many levels from one tile to the next; stepping down is always fine. Pushes have their own pushClimbLimit. Layra under a Verse of Swiftness ignores it (spells.json, swiftness, freeClimb)."
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
function isDisoriented(unit) {
  return !!(unit && unit.status && unit.status.disoriented);
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
    return Math.max(1, power - (defender.magicDefense + statMod(defender, "magicDefense"))) + flank + dazed;
  }
  const attack = attacker.attack + statMod(attacker, "attack") + (usesCloseWeapon(attacker, defender) ? attacker.closeWeapon.attack : 0);
  return Math.max(1, attack - (defender.defense + statMod(defender, "defense"))) + flank;
}
function usesCloseWeapon(attacker, defender) {
  return !!attacker.closeWeapon && distance(attacker, defender) <= 1;
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
  getDamage,
  getHitChance,
  getTargetsInRange,
  hasClearShot,
  heightAccuracy,
  heightEdge,
  inReach,
  isDistracted,
  rollAttack,
  setHeightLookup,
  shootsProjectiles,
  usesCloseWeapon
});
