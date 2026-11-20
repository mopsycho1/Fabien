// Roadmap 1.68: a knock-back must fly the figure from where it stood, not show it at the landing tile first.
// A push moves the unit on the board at once; the clash then plays its lunge and strike (moves measured from the
// tile, 13.54) and only then the knockback. Those moves must still draw the body on the tile it was pushed from.
// Run:  node n88.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game } = await start();
  const b = await battle(game); await sleep(600);
  b.endTurn = () => {}; b.runEnemyTurn = () => {}; b.time.removeAllEvents(); b.tweens.killAll(); await sleep(200); b.busy = false;
  const heroes = b.units.filter((u) => u.side === 'hero'), foes = b.units.filter((u) => u.side === 'enemy');
  const u = heroes[0], by = foes[0];
  let n = 0;
  for (const o of b.units) if (o !== u && o !== by) b.placeUnit(o, n++, 7);
  b.placeUnit(u, 3, 3); b.placeUnit(by, 2, 3);
  await sleep(300);
  const T = (c, r) => w.__iso ? w.__iso.tileToScreen(c, r) : null;
  const old = { x: u.view.x, y: u.view.y };
  const pushed = b.pushLoser(u, by, 1);
  check('the push moves it a tile on the board', pushed.path.length === 1 && u.col === 4, u.col + ',' + u.row);
  check('...and its body is still drawn from the old tile (bodyHome)', Math.abs(b.bodyHome(u).x - old.x) < 1 && Math.abs(b.bodyHome(u).y - old.y) < 1);
  // the clash's lunge and hit recoil, before the knockback (what made it jump)
  b.nudgeFromTile(u, 12, -6, { duration: 110 });
  await sleep(450);
  check('a recoil before the knockback ends on the OLD tile, not the landing tile', Math.hypot(u.view.x - old.x, u.view.y - old.y) < 2, Math.round(u.view.x - old.x) + ',' + Math.round(u.view.y - old.y));
  // the knockback: the body flies from the old tile, every frame a small step
  const seen = []; const tick = () => { seen.push({ x: u.view.x, y: u.view.y }); };
  const timer = setInterval(tick, 8);
  b.knockBack(u, pushed, 1);
  check('the knockback clears the waiting flag', !u.knockPending);
  const t0 = Date.now(); while (u.knock && Date.now() - t0 < 4000) await sleep(20);
  await sleep(200); clearInterval(timer);
  const end = b.bodyHome(u);
  check('...and lands it on the new tile', Math.hypot(u.view.x - end.x, u.view.y - end.y) < 2);
  let jump = 0; for (let i = 1; i < seen.length; i++) jump = Math.max(jump, Math.hypot(seen[i].x - seen[i - 1].x, seen[i].y - seen[i - 1].y));
  check('...never jumping more than half a tile at once', jump < 32, Math.round(jump));
  check('...starting from where it stood', seen.length > 0 && Math.hypot(seen[0].x - old.x, seen[0].y - old.y) < 12);
  // a push that was never drawn does not leave the body stuck on its old tile
  u.knockPending = true; u.pushedFrom = { col: 0, row: 0 };
  b.startTurn();
  check('a new turn clears a push that was never drawn', !u.knockPending);
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
