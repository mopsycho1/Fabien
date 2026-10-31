// The stance duel rules, tested on their own with controlled dice.
const E = require('./eng-bundle.cjs');
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const jobs = require('/home/claude/fabien/src/data/jobs.json');
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
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
