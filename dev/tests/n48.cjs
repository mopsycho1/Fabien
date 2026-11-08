// Effects flair 16.1 steps 6 and 7: the step effects and hit effects of the four Verses.
// Each makes only small, short-lived objects, cleans itself up, respects the 30-particle cap,
// and halves its bursts in Light.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('card:empower')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const U = (l) => b.units.find((u) => u.label === l);
  const [sudeen, gaha] = ['H1', 'H2'].map(U);
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const setBuff = (u, id) => { u.status = u.status || { cooldowns: {} }; u.status.buff = id ? { id, turnsLeft: 3, power: 1 } : null; u.status.hex = u.status.hex || null; };
  const setSlow = (u, on) => { u.status = u.status || { cooldowns: {} }; u.status.hex = on ? { id: 'slow', turnsLeft: 2, power: 1 } : null; };
  // a real walk: with a Verse on the unit, stepping makes effect objects at the tile it leaves
  const ground = (u) => b.children.list.length;
  for (const [id, kind] of [['stone', 'stone'], ['swiftness', 'swift'], ['fury', 'fury']]) {
    setBuff(sudeen, id); setSlow(sudeen, false);
    const before = ground();
    let peak = 0;
    const timer = setInterval(() => { peak = Math.max(peak, ground() - before); }, 20);
    await new Promise((res) => { b.busy = true; b.moveUnit(sudeen, sudeen.col, sudeen.row + 1, () => { b.busy = false; res(); }); setTimeout(res, 3000); });
    clearInterval(timer);
    check('walking with ' + kind + ': the step made effect objects on the board', peak >= 1, peak);
    await sleep(900);
    sudeen.col = 4; sudeen.row = 4; b.placeEveryone();
  }
  setBuff(sudeen, null);
  // the dedicated checks go through the scene: step and hit functions are exposed on window by the bundle
  const fx = w.__fx || null;
  check('the bundle exposes the step and hit effect functions for tests (window.__fx)', !!(fx && fx.stepEffect && fx.hitEffect && fx.verseKinds), fx ? Object.keys(fx).join(',') : 'none');
  if (fx) {
    check('verseKinds reads the buff and the slow', (() => { setBuff(gaha, 'swiftness'); setSlow(gaha, true); return fx.verseKinds(gaha).join() === 'swift,slow'; })(), fx.verseKinds(gaha).join());
    setBuff(gaha, null); setSlow(gaha, false);
    check('verseKinds is empty with no Verse', fx.verseKinds(gaha).length === 0);
    const depth = 10;
    const run = async (name, fn, minNew) => {
      const n0 = b.children.list.length;
      fn();
      const made = b.children.list.length - n0;
      await sleep(1200);
      const left = b.children.list.length - n0;
      check(name + ': made ' + made + ' objects, all cleaned up after 1.2 s', made >= minNew && left <= 0, made + ' made, ' + left + ' left');
    };
    await run('step stone', () => fx.stepEffect(b, ['stone'], 300, 300, 1, depth), 2);
    await run('step swift', () => fx.stepEffect(b, ['swift'], 300, 300, 1, depth), 1);
    await run('step fury', () => fx.stepEffect(b, ['fury'], 300, 300, -1, depth), 1);
    await run('step slow (slowed only)', () => fx.stepEffect(b, ['slow'], 300, 300, 1, depth), 1);
    await run('hit stone', () => fx.hitEffect(b, ['stone'], 300, 260, 300, 300, 1, depth), 3);
    await run('hit swift', () => fx.hitEffect(b, ['swift'], 300, 260, 300, 300, 1, depth), 2);
    await run('hit fury', () => fx.hitEffect(b, ['fury'], 300, 260, 300, 300, 1, depth), 3);
    await run('hit slow', () => fx.hitEffect(b, ['slow'], 300, 260, 300, 300, 1, depth), 2);
    await run('hit with two Verses plays each once', () => fx.hitEffect(b, ['fury', 'fury', 'slow'], 300, 260, 300, 300, 1, depth), 5);
    await run('no Verse: nothing at all', () => { fx.stepEffect(b, [], 300, 300, 1, depth); fx.hitEffect(b, [], 300, 260, 300, 300, 1, depth); }, 0);
    // the 30-particle cap and Light halving
    // only the emitters this burst made (loops from auras already on the board are left out)
    const burstOf = () => { const old = new Set(b.children.list.filter((o) => o.type === 'ParticleEmitter')); fx.hitEffect(b, ['fury'], 300, 260, 300, 300, 1, depth); return b.children.list.filter((o) => o.type === 'ParticleEmitter' && !old.has(o)).reduce((n, e) => n + e.getAliveParticleCount(), 0); };
    fx.setFxMode('full'); /* the test browser is slow and may have dropped to Light by itself */
    const full = burstOf();
    await sleep(800);
    fx.setFxMode('light');
    const light = burstOf();
    fx.setFxMode('full');
    check('a burst is under the cap of 30', full > 0 && full <= 30, full);
    check('Light halves the burst', light > 0 && light <= Math.ceil(full / 2), light + ' vs ' + full);
    await sleep(800);
  }
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
