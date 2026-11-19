// 13.54: a figure left off its tile. The attack lunge, the clash lunges and Rabdul's Double Hit tweened the body to
// fixed points measured from where it stood when they began. Pushed to another tile mid-swing, it was dragged back
// to the old one (a whole tile off); started a little off, it came back there. Now they move from the middle of the
// tile it stands on, every frame. This pushes an attacker one tile while he swings, and plays Rabdul's two heads.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n81.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid;
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), bull = U('e2'), rabdul = U('e4'), sudeen = U('h1');
  b.endTurn = () => {};
  const off = (u) => { const p = G.tileToScreen(u.col, u.row); return Math.round(Math.hypot(u.view.x - p.x, u.view.y - p.y)); };
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.hasActed = false; u.status.cooldowns = {}; }
    const others = b.units.filter((u) => ![gaha, bull, rabdul, sudeen].includes(u)); others.forEach((u, i) => b.placeUnit(u, 10 - i, 10));
    b.busy = false; b.cancelMode();
  };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(900); };

  // 1. Gaha attacks the bull and is pushed one tile back while his spear is out
  for (const lead of [120, 260, 420]) {
    park(); b.placeUnit(gaha, 5, 5); b.placeUnit(bull, 5, 4); b.placeUnit(sudeen, 0, 10); b.placeUnit(rabdul, 1, 10);
    gaha.accuracy = 999; b.busy = true;
    b.performAttack(gaha, bull, () => { b.busy = false; });
    await sleep(lead);
    const pushed = b.pushLoser(gaha, bull, 1);
    if (pushed && pushed.path.length) b.knockBack(gaha, pushed, 0);
    await idle();
    check('pushed ' + lead + ' ms into his attack, Gaha ends on the middle of his new tile', off(gaha) <= 2 && pushed && pushed.path.length > 0, 'tile ' + gaha.col + ',' + gaha.row + ' off ' + off(gaha) + ' px');
  }
  // 2. an attack started with the body a little off its tile still ends on the middle
  park(); b.placeUnit(gaha, 5, 5); b.placeUnit(bull, 5, 4); gaha.view.x += 12;
  b.busy = true; b.performAttack(gaha, bull, () => { b.busy = false; }); await idle();
  check('an attack begun 12 px off the tile ends on its middle', off(gaha) <= 2, off(gaha) + ' px');
  // 3. Rabdul's Double Hit: two heads, the second starting while the first is still out
  park(); b.placeUnit(rabdul, 5, 5); b.placeUnit(sudeen, 5, 6); b.placeUnit(gaha, 0, 10); b.placeUnit(bull, 1, 10);
  rabdul.accuracy = 999; b.busy = true;
  b.castSpell(rabdul, sudeen, 'doubleHit', () => { b.busy = false; }); await idle();
  check('Rabdul ends his Double Hit on the middle of his tile', off(rabdul) <= 2, off(rabdul) + ' px');
  // 4. a clash beat (both lunge to the middle and back)
  park(); b.placeUnit(gaha, 5, 5); b.placeUnit(bull, 5, 4);
  b.busy = true; b.performEngage(gaha, bull, () => { b.busy = false; }); await idle(); await sleep(1500); await idle();
  check('after a clash opening both stand on the middle of their tiles', off(gaha) <= 2 && off(bull) <= 2, off(gaha) + ' and ' + off(bull) + ' px');

  const real = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', real.length === 0, real.join('|').slice(0, 200));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
