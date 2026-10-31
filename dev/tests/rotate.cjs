// Turning the camera around the board.
const { start, battle } = require('./boot.cjs');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const G = w.__grid;
  const OUT = process.argv[2] || '/tmp/';
  const save = (n) => fs.writeFileSync(OUT + n + '.png', Buffer.from(game.canvas.toDataURL('image/png').split(',')[1], 'base64'));
  await sleep(1200);
  // the view maths turns and turns back
  let inverse = true;
  for (let r = 0; r < 4; r++) { G.setRotation(r); for (let c = -2; c < 10; c++) for (let rr = -2; rr < 10; rr++) { const v = G.toView(c, rr); const back = G.fromView(v.vc, v.vr); if (back.col !== c || back.row !== rr) inverse = false; } }
  G.setRotation(0);
  check('toView and fromView undo each other on every side', inverse);
  const objs0 = b.boardObjects.length;
  const unitAt = (u) => { const p = G.tileToScreen(u.col, u.row); return Math.abs(u.view.x - p.x) < 0.5 && Math.abs(u.view.y - p.y) < 0.5; };
  const tapsOk = () => { let ok = 0, total = 0; for (let c = 0; c < 8; c++) for (let r = 0; r < 8; r++) { const p = G.tileToScreen(c, r); total++; const t = G.screenToTile(p.x, p.y + 4); if (t.col === c && t.row === r) ok++; } return ok / total; };
  const base = tapsOk();
  save('rot_0');
  for (let i = 1; i <= 4; i++) {
    b.rotateCamera(1); await sleep(700);
    check('turn ' + i + ': rotation is ' + (i % 4), G.getRotation() === i % 4, G.getRotation());
    check('turn ' + i + ': every figure stands on its tile', b.units.filter((u) => u.alive).every(unitAt));
    check('turn ' + i + ': the board was drawn again (no pile-up of old pieces)', Math.abs(b.boardObjects.length - objs0) < 40, objs0 + ' -> ' + b.boardObjects.length + ', scene objects ' + b.children.list.length);
    const t = tapsOk();
    check('turn ' + i + ': tapping a tile top finds that tile about as often as before', t >= base - 0.08, t.toFixed(2) + ' vs ' + base.toFixed(2));
    if (i < 4) save('rot_' + i);
  }
  // tapping works after turning: walk somewhere
  b.rotateCamera(1); await sleep(700);
  const u = b.activeUnit;
  b.cancelMode(); b.startMove();
  const [k] = [...b.reachableKeys]; const [tc, tr] = k.split(',').map(Number);
  const p = G.tileToScreen(tc, tr); const picked = b.tileAtPoint(p.x, p.y + 3);
  b.handleTap(picked.col, picked.row); await sleep(1500);
  check('after a turn, tapping a blue tile walks there', u.col === tc && u.row === tr, u.label + ' ' + u.col + ',' + u.row + ' wanted ' + tc + ',' + tr);
  const objCount = b.children.list.length;
  for (let i = 0; i < 8; i++) { b.rotateCamera(i % 2 ? 1 : -1); await sleep(450); }
  check('turning back and forth does not leak objects', Math.abs(b.children.list.length - objCount) < 30, objCount + ' -> ' + b.children.list.length);
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
