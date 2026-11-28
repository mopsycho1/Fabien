// Call Spirit's summon on a phone (6.99, Baiyee 28 Nov: "Phones must stay smooth"). Opens the battle on the phone view
// with the processor slowed 4 times (a mid-range phone), then measures every frame for 3 seconds on a quiet board and
// for the whole first summon (the long one), in Full effects and in Light. Prints frames a second, the slowest frame and
// how many frames took over 50 ms. FAILED when the summon's frame rate is under 80 percent of the quiet board's or a
// frame takes over 150 ms.
// Run with the preview up:  node dev/browser/summon_fps.cjs [slowdown, default 4]
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const slow = Number(process.argv[2] || 4);
  const { browser, page, errors } = await openBattle('phone');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: slow });
  const measure = (ms, stage) => page.evaluate(async ({ ms, stage }) => {
    const b = window.__game.scene.getScene('BattleScene');
    if (stage) {
      b.runEnemyTurn = () => {}; b.time.removeAllEvents(); b.busy = false;
      for (const sp of [...(b.spirits || [])]) b.removeSpirit(sp);
      const kofi = b.units.find((u) => u.id === 'h4'), bull = b.units.find((u) => u.id === 'e2');
      b.placeUnit(kofi, 2, 7); b.placeUnit(bull, 3, 5); kofi.mp = 9; kofi.status.cooldowns = {}; b.activeUnit = kofi;
      b.spiritShowSeen = false;
    }
    const gaps = []; let last = performance.now(); let on = true;
    const tick = (t) => { gaps.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const t0 = performance.now();
    if (stage) {
      const kofi = b.units.find((u) => u.id === 'h4');
      await new Promise((res) => b.castSpell(kofi, { col: 3, row: 6 }, 'callSpirit', res));
    } else await new Promise((r) => setTimeout(r, ms));
    on = false;
    const total = performance.now() - t0;
    gaps.shift();
    return { fps: gaps.length / (total / 1000), worst: Math.max(...gaps), over50: gaps.filter((g) => g > 50).length, frames: gaps.length, ms: Math.round(total) };
  }, { ms, stage });
  let fails = 0;
  for (const mode of ['full', 'light']) {
    await page.evaluate((m) => window.__setFxMode(m), mode);
    const quiet = await measure(3000, false);
    const show = await measure(0, true);
    const ok = show.fps >= quiet.fps * 0.8 && show.worst < 150;
    if (!ok) fails++;
    console.log((ok ? 'PASS ' : 'FAIL ') + mode + ' (CPU x' + slow + '): quiet board ' + quiet.fps.toFixed(1) + ' fps, worst ' + Math.round(quiet.worst) + ' ms | summon ' + show.fps.toFixed(1) + ' fps over ' + show.ms + ' ms, worst ' + Math.round(show.worst) + ' ms, ' + show.over50 + ' frames over 50 ms');
  }
  if (errors.length) { fails++; console.log('page errors: ' + errors.slice(0, 2).join(' || ')); }
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
