// 1.67 (Baiyee 19 Nov: "Break Away doesn't work, he takes damage and is still stuck"). Break Away is a roll
// (BATTLE_SYSTEMS 4). Checks: the chance on the row matches the real roll (10000 simulated beats with the foe
// answering by its habits), a failed try costs no health (the bull's Bloodied Press used to hit), the screen says
// "Break Away failed: still locked", and a success leaves him free on another tile.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n84.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const E = w.__engagement;
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), bull = U('e2');
  b.endTurn = () => {};
  const lock = () => {
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hasActed = false; u.status.offBalance = false; }
    const others = b.units.filter((u) => u !== gaha && u !== bull); others.forEach((u, i) => b.placeUnit(u, 10 - i, 10));
    b.placeUnit(gaha, 5, 6); b.placeUnit(bull, 5, 5);
    gaha.engagedWith = bull; bull.engagedWith = gaha; gaha.momentum = 0; bull.momentum = 0;
    gaha.hp = gaha.maxHp; bull.bloodied = 3;
  };
  lock();
  // 1. the odds on the row match the roll
  const shown = E.breakChance(gaha, bull);
  let wins = 0; const N = 10000;
  const m0 = { g: gaha.momentum, b: bull.momentum };
  for (let i = 0; i < N; i++) { const beat = E.resolveBeat(gaha, 'break', bull, E.answerStance(bull)); if (beat.success) wins++; gaha.momentum = m0.g; bull.momentum = m0.b; if (E.resetMomentum) { /* keep the track where it was */ } }
  const real = Math.round((wins / N) * 100);
  check('the chance shown on the row matches the roll (within 3)', Math.abs(shown - real) <= 3, 'shown ' + shown + '%, rolled ' + real + '%');
  lock(); b.activeUnit = gaha; b.stanceChoice = 'auto'; b.refreshButtons();
  const row = [...b.slots, ...b.halves].find((s) => s.label && /^Break away/.test(s.label.text));
  check('the Break away row shows the chance', !!row && /Break away\s+\d+%/.test(row.label.text), row && row.label.text);
  // 2. failed tries: no health lost, the screen says so, still locked
  const said = []; const fb = b.banner.bind(b); b.banner = (x, y, t, ...a) => { said.push(t); return fb(x, y, t, ...a); };
  let failed = 0, freed = 0, hurt = 0, sayFail = 0, movedWhenFree = 0;
  const realRandom = Math.random;
  for (let k = 0; k < 12; k++) {
    lock(); b.activeUnit = gaha; b.busy = false; b.cancelMode(); said.length = 0;
    // half the tries fixed to fail (the bull's dice high, Gaha's low), half to succeed; varied, never one constant
    const want = k % 2 ? 'fail' : 'free'; let n = 0;
    Math.random = () => { n++; const hi = 0.97 - (n % 7) * 0.001, lo = 0.02 + (n % 7) * 0.001; return n <= 3 ? (want === 'fail' ? lo : hi) : n <= 6 ? (want === 'fail' ? hi : lo) : realRandom(); };
    const hp0 = gaha.hp, tile0 = gaha.col + ',' + gaha.row;
    b.onStance('break');
    Math.random = realRandom;
    const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(40); await sleep(200);
    if (gaha.engagedWith) { failed++; if (gaha.hp < hp0) hurt++; if (said.some((s) => /Break Away failed: still locked/.test(s))) sayFail++; }
    else { freed++; if (gaha.col + ',' + gaha.row !== tile0) movedWhenFree++; }
  }
  check('failed tries happen and cost no health (even against the bull)', failed > 0 && hurt === 0, failed + ' failed, ' + hurt + ' hurt');
  check('every failed try says "Break Away failed: still locked"', failed > 0 && sayFail === failed, sayFail + ' of ' + failed);
  check('every successful try leaves him free on another tile', freed > 0 && movedWhenFree === freed, movedWhenFree + ' of ' + freed);
  const errs = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', errs.length === 0, errs.join('|').slice(0, 200));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
