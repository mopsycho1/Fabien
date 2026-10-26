import rules from './data/engagement.json';

// Signature stances: each tank class has one stance it defends best in.
// (From Suleiman's design: "committing to the stance is how they defend".)
//
//   Bloodied Press (Warlord / Berserker): pain makes them tougher.
//     Every hit taken adds a stack (up to 3). While in Press, each stack
//     takes 1 off every hit. A beat won with Press lands a quick hit, and a
//     decisive win pushes the loser a tile further.
//   Counter-Press (Bruiser): the gauntlet soaks the first hit after each beat
//     while in Press, and the damage soaked is stored as Charge. Lose a beat
//     and all the Charge comes back as a counter-punch.
//   Bulwark (Warden): each beat in a row held in Guard makes him harder to
//     push. An even beat in Guard gives back Poise and a little health.
//
// A unit has a signature if its job in jobs.json has a "signature" line.
// The numbers live in src/data/engagement.json under "signatures".
// Nothing here draws anything.

const S = rules.signatures;

export function signatureOf(unit) {
  return unit && unit.signature ? unit.signature.id : null;
}

// True while the unit is in a clash and its last stance is its signature stance.
export function holdingSignature(unit) {
  return !!unit.signature && !!unit.engagedWith && unit.stance === unit.signature.stance;
}

// A blow lands on "unit" for "damage". Applies its signature defence and
// returns { damage, note }: the damage after it, and a short word to show
// (or null). Health is NOT changed here; the caller does that.
export function takeHit(unit, damage) {
  let note = null;
  const sig = signatureOf(unit);
  if (sig === 'counter' && holdingSignature(unit) && !unit.absorbedThisBeat && damage > 0) {
    const soaked = Math.min(damage, S.counter.absorb);
    damage -= soaked;
    unit.absorbedThisBeat = true;
    unit.chargePool = (unit.chargePool || 0) + soaked;
    while (unit.chargePool >= S.counter.chargePer && (unit.charge || 0) < S.counter.maxCharge) {
      unit.chargePool -= S.counter.chargePer;
      unit.charge = (unit.charge || 0) + 1;
    }
    note = 'Soaked ' + soaked;
  }
  if (sig === 'bloodied') {
    const stacks = unit.fury || 0;
    if (holdingSignature(unit) && stacks > 0 && damage > 1) {
      const cut = Math.min(stacks * S.bloodied.reducePerStack, damage - 1);
      damage -= cut;
      note = 'Bloodied -' + cut;
    }
    unit.fury = Math.min(S.bloodied.maxStacks, stacks + 1); // the pain adds a stack
  }
  return { damage, note };
}

// Everything a signature does when a beat is decided. Changes Poise, health
// (for heals only), stacks and Bulwark levels; returns the extra blows and
// heals for the scene to deal and show:
//   [{ kind: 'hit', from, to, damage, word } | { kind: 'heal', unit, amount, poise }]
export function afterBeat(beat) {
  const effects = [];
  const pair = [
    [beat.actor, beat.actorStance],
    [beat.holder, beat.holderStance],
  ];
  for (const [u] of pair) u.absorbedThisBeat = false; // a new beat: the gauntlet is ready again

  // Bulwark grows with every beat held in Guard, and falls away otherwise
  for (const [u, stance] of pair) {
    if (signatureOf(u) !== 'bulwark') continue;
    u.bulwark = stance === 'guard' ? Math.min(S.bulwark.max, (u.bulwark || 0) + 1) : 0;
  }

  if (beat.kind === 'even') {
    for (const [u, stance] of pair) {
      if (signatureOf(u) === 'bulwark' && stance === 'guard') {
        const amount = Math.min(S.bulwark.standoffHeal, u.maxHp - u.hp);
        u.hp += amount;
        const before = u.poise || 0;
        u.poise = Math.min(rules.poise.max, before + S.bulwark.standoffPoise);
        effects.push({ kind: 'heal', unit: u, amount, poise: u.poise - before });
      }
    }
    return effects;
  }

  const winner = beat.winner;
  const loser = beat.loser;
  if (!winner || !loser) return effects;
  const winStance = winner === beat.actor ? beat.actorStance : beat.holderStance;

  // Bloodied Press: a beat won with Press lands a quick hit
  if (signatureOf(winner) === 'bloodied' && winStance === 'press') {
    effects.push({ kind: 'hit', from: winner, to: loser, damage: S.bloodied.winHitBase + (winner.fury || 0), word: 'Bloodied Press' });
  }
  // Counter-Press: losing a beat releases the stored Charge
  if (signatureOf(loser) === 'counter' && (loser.charge || 0) > 0) {
    effects.push({ kind: 'hit', from: loser, to: winner, damage: loser.charge * S.counter.damagePerCharge, word: 'Counter!' });
    loser.charge = 0;
  }
  return effects;
}

// How many tiles less this unit is pushed (Bulwark), and extra tiles a
// decisive Bloodied Press win pushes.
export function pushResist(unit) {
  return signatureOf(unit) === 'bulwark' && holdingSignature(unit) ? (unit.bulwark || 0) * S.bulwark.pushResistPerLevel : 0;
}
export function pushExtra(winner, winStance) {
  return signatureOf(winner) === 'bloodied' && winStance === 'press' ? S.bloodied.decisivePushExtra : 0;
}

// The stance an Auto hero picks: its signature (or strongest) stance, unless
// the foe's last stance beats that, then the stance that beats the foe's.
export function autoPick(unit, foe, beats, strongest) {
  const want = unit.signature ? unit.signature.stance : strongest;
  const last = foe && foe.stance && foe.stance !== 'break' ? foe.stance : null;
  if (last && beats[last] === want) return Object.keys(beats).find((s) => beats[s] === last) || want;
  return want;
}
