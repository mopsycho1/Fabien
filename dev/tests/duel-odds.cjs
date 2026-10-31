// How often each side wins a beat, over many dice rolls, for every pairing.
const E = require('./eng-bundle.cjs');
const jobs = require('/home/claude/fabien/src/data/jobs.json');
const mk = (job) => ({ job, contest: { ...jobs[job].contest }, stances: { ...jobs[job].stances }, col: 0, row: 0, status: { offBalance: false, buff: null } });
const ctx = { random: Math.random, heightOf: () => 0 };
const rows = [];
for (const [aj, bj] of [['warlord', 'guardian'], ['scout', 'warlord'], ['guardian', 'scout']]) {
  for (const as of ['press', 'guard', 'slip']) {
    const line = [];
    for (const bs of ['press', 'guard', 'slip']) {
      let win = 0, lose = 0; const N = 4000;
      for (let i = 0; i < N; i++) { const a = mk(aj), b = mk(bj); E.startDuel(a, b); const r = E.resolveBeat(a, as, b, bs, ctx); if (r.winner === a) win++; else if (r.winner === b) lose++; }
      line.push(`${bs}: ${Math.round(win / 40)}% win`);
    }
    rows.push(`${aj.padEnd(8)} ${as.padEnd(6)} vs ${bj.padEnd(8)} | ${line.join('  ')}`);
  }
}
console.log(rows.join('\n'));
