// The game speed must always come back to normal, whatever order the speed
// changes happen in (the freeze that once stuck a battle).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game } = await start(); const b = await battle(game);
  const speed = () => b.tweens.timeScale.toFixed(3) + '/' + b.time.timeScale.toFixed(3);
  // 1. a cut-in starts during an impact freeze, the freeze ends, then the cut-in ends
  b.hitStop(60); b.beginCinematic(); await sleep(150); b.endCinematic();
  check('freeze, then cut-in: back to normal speed', speed() === '1.000/1.000', speed());
  // 2. a cut-in is skipped, a freeze lands inside it, the slow motion plays
  b.beginCinematic(); b.skipCinematic(); b.hitStop(60); b.finisherSlowMotion(); await sleep(1500);
  check('skip + freeze + slow motion: back to normal speed', speed() === '1.000/1.000', speed());
  // 3. with a faster base speed (like the test bot) everything returns to the base
  b.setSpeed('base', 8); b.hitStop(40); b.beginCinematic(); b.skipCinematic(); await sleep(200); b.endCinematic();
  check('at base speed 8: back to 8', speed() === '8.000/8.000', speed());
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
