const path = require('path');
// The stance duel rules, tested on their own with controlled dice.
const E = require('./eng-bundle.cjs');
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const jobs = require(path.join(__dirname, '../../src/data/jobs.json'));
const mk = (job, extra = {}) => ({ job, contest: { ...jobs[job].contest }, stances: { ...jobs[job].stances }, col: 0, row: 0, alive: true, status: { offBalance: false, buff: null }, ...extra });
const dice = (...faces) => { const q = faces.map((f) => (f - 1) / 6 + 0.01); return { random: () => q.length ? q.shift() : 0.5, heightOf: () => 0 }; };

check('Guard beats Press, Slip beats Guard, Press beats Slip', E.matchup('guard', 'press') > 0 && E.matchup('slip', 'guard') > 0 && E.matchup('press', 'slip') > 0 && E.matchup('press', 'guard') < 0, '');
check('the same stance is even', E.matchup('press', 'press') === 0);
const g = mk('guardian'), w = mk('warlord'), s = mk('scout');
check('Auto: Guardian guards, Warlord presses, Scout slips', E.autoStance(g) === 'guard' && E.autoStance(w) === 'press' && E.autoStance(s) === 'slip', [E.autoStance(g), E.autoStance(w), E.autoStance(s)].join());

// a duel: warlord (first) vs guardian
E.startDuel(w, g); w.col = 1;
check('a new duel starts at momentum 0', E.momentumOf(w) === 0 && E.momentumOf(g) === 0);
// warlord presses into a guard, both roll 4+4: guard should win (matchup + strong guard)
let r = E.resolveBeat(w, 'press', g, 'guard', dice(4, 4, 4, 4));
check('Press into Guard with even dice: the Guardian wins the beat', r.winner === g && r.kind === 'win', r.margin);
check('Guard winning moves momentum 1 toward the Guardian', E.momentumOf(g) === 1 && E.momentumOf(w) === -1, E.momentumOf(g));
// warlord presses into slip with good dice: press wins and shifts 2
r = E.resolveBeat(w, 'press', g, 'slip', dice(5, 5, 2, 2));
check('a winning Press moves momentum 2 (or 3 if decisive)', r.winner === w && r.shift >= 2, r.shift);
// push the warlord to +3
E.resetMomentum(w); E.shiftMomentum(w, 2);
r = E.resolveBeat(w, 'press', g, 'slip', dice(5, 5, 2, 2));
check('reaching +3 is decisive', r.decisive && E.momentumOf(w) === 3, E.momentumOf(w));
check('at +2 the leader gets a bonus', (() => { E.resetMomentum(w); E.shiftMomentum(w, 2); return E.beatParts(w, 'press', g, 'guard').momentum > 0; })());
// stalemate
E.resetMomentum(w);
r = E.resolveBeat(w, 'guard', g, 'guard', dice(3, 3, 1, 5)); // equal-ish
check('two Guards: the stronger guard wins', r.winner === g, r.kind + ' ' + r.margin);
// Poise
w.poise = 2; E.resetMomentum(w);
r = E.resolveBeat(w, 'press', g, 'guard', dice(4, 4, 4, 4), true);
check('Empower spends 1 Poise and adds to the score', w.poise === 1 && r.actorParts.empower > 0, w.poise);
w.poise = 3; E.refillPoise(w);
check('Poise never goes over its maximum', w.poise === 3, w.poise);
// Break away
E.resetMomentum(w);
r = E.resolveBeat(s, 'break', w, 'guard', dice(5, 5, 2, 2));
check('breaking away from a Guard with good dice succeeds', r.kind === 'break' && r.success, r.margin);
r = E.resolveBeat(s, 'break', w, 'press', dice(2, 2, 6, 6));
check('a failed break costs a little momentum', r.kind === 'break' && !r.success && r.shift === 1);
// AI read
const always = { random: () => 0, heightOf: () => 0 };
w.stance = 'press';
check('an enemy that reads its foe picks the counter', E.aiStance(g, w, always) === 'guard', E.aiStance(g, w, always));
// spells count
g.status.buff = { id: 'stone', turnsLeft: 2 };
check('a Verse of Stone adds to Guard (doubled on a Guardian: +6)', E.stanceRating(g, 'guard') === jobs.guardian.contest.guard + 6, E.stanceRating(g, 'guard'));
E.endDuel(w);
check('ending a duel clears it on both', !w.engagement && !g.engagement && !w.engagedWith && !g.engagedWith);

// ---------- the one rule of a beat (13 Nov): score = 3 dice + half the stat (rounded up) + bonuses ----------
{
  const R = require(path.join(__dirname, '../../src/data/engagement.json'));
  const statOf = { press: 'power', guard: 'guard', slip: 'agility', break: 'agility' };
  const fighters = Object.keys(jobs).filter((j) => jobs[j] && jobs[j].contest); // every class with clash numbers
  check('every class with clash numbers is tested', fighters.length >= 10, fighters.join());
  // 1. the stat part: half, rounded up, for every fighter in every stance
  let bad = [];
  for (const j of fighters) for (const st of ['press', 'guard', 'slip', 'break']) {
    const u = mk(j), foe = mk('guardian');
    const want = Math.ceil(jobs[j].contest[statOf[st]] / 2);
    const got = E.beatParts(u, st, foe, st).rating;
    if (got !== want) bad.push(j + ' ' + st + ' ' + got + ' not ' + want);
  }
  check('the stat part is half the stance stat, rounded up, for every fighter and stance', bad.length === 0, bad.slice(0, 3).join(' | '));
  // 2. the whole score with known dice: dice + half stat + strong or weak, nothing else
  bad = [];
  for (const j of fighters) for (const st of ['press', 'guard', 'slip']) {
    const u = mk(j), foe = mk(j); E.startDuel(u, foe);
    const r = E.resolveBeat(u, st, foe, st, dice(6, 2, 3, 1, 1, 1)); // same stance on both sides: no matchup bonus
    const aff = { strong: 1, average: 0, weak: -1 }[(jobs[j].stances || {})[st] || 'average'];
    const want = 11 + Math.ceil(jobs[j].contest[statOf[st]] / 2) + aff;
    if (r.actorRoll !== 11 || r.holderRoll !== 3 || r.actorScore !== want) bad.push(j + ' ' + st + ' score ' + r.actorScore + ' not ' + want);
  }
  check('score = the 3 dice + half the stat + 1 if strong, - 1 if weak', bad.length === 0, bad.slice(0, 3).join(' | '));
  // 3. each bonus is the whole number the data file says
  const a = mk('warlord'), c = mk('warlord'); E.startDuel(a, c);
  const plain = E.sumBeat(E.beatParts(a, 'press', c, 'press'));
  check('your stance beating theirs is +' + R.matchupBonus, E.sumBeat(E.beatParts(a, 'press', c, 'slip')) - plain === R.matchupBonus && R.matchupBonus === 3);
  check('the beaten stance gets nothing taken off (the bonus goes to one side only)', E.sumBeat(E.beatParts(a, 'press', c, 'guard')) === plain);
  check('Empower is +' + R.poise.empower, E.sumBeat(E.beatParts(a, 'press', c, 'press', undefined, true)) - plain === R.poise.empower);
  a.status.offBalance = true;
  check('Off-Balance is -' + R.offBalance.contest, E.sumBeat(E.beatParts(a, 'press', c, 'press')) - plain === -R.offBalance.contest);
  a.status.offBalance = false; E.shiftMomentum(a, 2);
  check('leading the momentum track by 2 is +' + R.momentum.leadBonus, E.sumBeat(E.beatParts(a, 'press', c, 'press')) - plain === R.momentum.leadBonus);
  E.resetMomentum(a);
  a.status.buff = { id: 'fury', turnsLeft: 2 };
  const withFury = E.beatParts(a, 'press', c, 'press').rating;
  check('a Verse is added to the stat first, then halved and rounded up', withFury === Math.ceil(E.stanceRating(a, 'press') / 2) && withFury > Math.ceil(jobs.warlord.contest.power / 2), withFury);
  a.status.buff = null;
  // 4. every score is a whole number, whatever happens (2,000 random beats with every fighter)
  let halves = 0;
  for (let i = 0; i < 2000; i++) {
    const u = mk(fighters[i % fighters.length]), foe = mk(fighters[(i * 3 + 1) % fighters.length]); E.startDuel(u, foe);
    if (i % 5 === 0) u.status.offBalance = true;
    const sts = ['press', 'guard', 'slip', 'break'];
    const r = E.resolveBeat(u, sts[i % 4], foe, sts[(i >> 2) % 3], undefined, i % 7 === 0);
    if (!Number.isInteger(r.actorScore) || !Number.isInteger(r.holderScore)) halves++;
  }
  check('no score ever has a half in it', halves === 0, halves);
  // 5. who wins: a gap of 0 or 1 is even, 2 wins, 6 or more moves momentum 1 further
  const even = (da, db) => { const u = mk('warlord'), foe = mk('warlord'); E.startDuel(u, foe); return E.resolveBeat(u, 'guard', foe, 'guard', dice(...da, ...db)); };
  let r = even([3, 3, 3], [3, 3, 3]); check('gap 0: even', r.kind === 'even' && r.margin === 0, r.margin);
  r = even([4, 3, 3], [3, 3, 3]); check('gap 1: still even', r.kind === 'even' && r.margin === 1, r.margin);
  r = even([5, 3, 3], [3, 3, 3]); check('gap 2: the higher score wins, momentum moves 1', r.kind === 'win' && r.margin === 2 && r.shift === 1, r.margin + ' shift ' + r.shift);
  r = even([6, 6, 3], [3, 3, 3]); check('gap 6: momentum moves 1 further', r.kind === 'win' && r.margin === 6 && r.shift === 2, r.margin + ' shift ' + r.shift);
  // 6. the odds table in engagement.json (beatOddsNote) is right: count every one of the 46,656 dice results
  const count = (lead) => { let win = 0, evenN = 0; for (let x = 0; x < 216; x++) for (let y = 0; y < 216; y++) { const sum = (n) => 3 + (n % 6) + (Math.floor(n / 6) % 6) + Math.floor(n / 36); const m = sum(x) + lead - sum(y); if (m > 1) win++; else if (m >= -1) evenN++; } return [Math.round(win / 466.56), Math.round(evenN / 466.56)]; };
  const table = [0, 1, 2, 3, 4, 5, 6].map((l) => count(l).join('/')).join(' ');
  check('odds by lead before the dice (win/even percent for a lead of 0 to 6)', table === '36/27 45/27 55/25 64/22 72/18 79/15 86/11', table);
  // 7. high ground (13.52): one number, 2 per level, the same in both data files
  const T = require(path.join(__dirname, '../../src/data/terrain.json'));
  check('high ground in a clash is 2 per level in terrain.json and in engagement.json', T.openingHeightBonusPerLevel === 2 && R.heightBonusPerLevel === 2);
  {
    const up = mk('warlord', { col: 0, row: 0 }), low = mk('warlord', { col: 1, row: 0 }); E.startDuel(up, low);
    const hill = { random: () => 0.5, heightOf: (c) => (c === 0 ? 2 : 0) };
    const flat = E.sumBeat(E.beatParts(up, 'press', low, 'press', hill, false, false));
    check('starting a clash from 2 levels up is +4 on the opening beat', E.sumBeat(E.beatParts(up, 'press', low, 'press', hill, false, true)) - flat === 4 && E.openingHeightBonus(up, low, hill) === 4);
    check('after the opening beat height gives nothing', E.beatParts(up, 'press', low, 'press', hill, false, false).height === 0);
    check('starting a clash from below costs nothing', E.beatParts(low, 'press', up, 'press', hill, false, true).height === 0);
    const r2 = E.resolveBeat(up, 'press', low, 'press', hill, false, true);
    check('the one answering never gets the height bonus', r2.holderParts.height === 0 && r2.actorParts.height === 4);
  }
  check('the dice are 3 six-sided dice', R.beatDice === 3 && R.diceSides === 6 && r.actorRoll === 15);
}
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
