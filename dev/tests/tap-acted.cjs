// A blue tile hidden behind an enemy figure can be tapped once the hero cannot attack.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const U = (l) => b.units.find((u) => u.label === l);
  const Hm = require('/home/claude/fabien/src/data/map.json').heights;
  const scr = (c, r) => ({ x: 360 + (c - r) * 43, y: 400 + (c + r) * 27 - Hm[r][c] * 22 });
  const put = (u, c, r) => { u.col = c; u.row = r; const p = scr(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth((c + r) * 2 + 1); };
  const idle = async () => { const t = Date.now(); while (b.busy && Date.now() - t < 8000) await sleep(30); await sleep(50); };
  const scout = U('H2'), ew = U('E2');
  let found = 0, ok = 0, okBefore = 0;
  for (let c = 1; c < 7; c++) for (let r = 1; r < 7; r++) {
    for (const u of b.units) put(u, 7, 7);
    put(U('H1'), 0, 7); put(U('H3'), 0, 6); put(U('E1'), 7, 0); put(U('E3'), 6, 0);
    put(ew, c, r); put(scout, c - 1, r - 2 < 0 ? r : r - 2);
    if (r - 2 < 0) continue;
    const blue = { col: c - 1, row: r - 1 }; // diagonally behind the enemy, one step from the scout
    if (Hm[blue.row][blue.col] !== Hm[r][c]) continue; // keep it simple: flat ground
    const p = scr(blue.col, blue.row);
    if (b.figureAt(p.x, p.y) !== ew) continue; // only cases where the enemy really covers the tile
    found++;
    b.activeUnit = scout; scout.hasActed = true; scout.hasMoved = true; scout.stepsUsed = 3; scout.moveFrom = null; b.cancelMode();
    b.startMove();
    const t = b.tileAtPoint(p.x, p.y);
    if (t.col === blue.col && t.row === blue.row) ok++;
    scout.hasActed = false; scout.stepsUsed = 0; b.cancelMode(); b.startMove();
    const t2 = b.tileAtPoint(p.x, p.y);
    if (t2.col === c && t2.row === r) okBefore++;
  }
  check('cases where an enemy covers a blue tile', found > 3, found);
  check('after attacking, tapping there picks the blue tile', ok === found, ok + '/' + found);
  check('before attacking, tapping the enemy still means attack it', okBefore === found, okBefore + '/' + found);
  // and the full tap walks there
  for (const u of b.units) put(u, 7, 7);
  put(U('H1'), 0, 7); put(U('H3'), 0, 6); put(U('E1'), 7, 0); put(U('E3'), 6, 0); put(ew, 3, 4); put(scout, 2, 2);
  b.activeUnit = scout; scout.hasActed = true; scout.hasMoved = true; scout.stepsUsed = 3; b.cancelMode(); b.startMove();
  const p = scr(2, 3); const t = b.tileAtPoint(p.x, p.y); b.handleTap(t.col, t.row); await idle();
  check('the hero walks onto the tile behind the enemy', scout.col === 2 && scout.row === 3, scout.col + ',' + scout.row);
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
