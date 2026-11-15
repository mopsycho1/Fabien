// M10 (roadmap 18.10; 17.6 code part, 17.11; checklist D6 and D7): reading the board. Every
// figure has a contact shadow and a rim in its side's colour that stays on its picture; move
// and target tiles let the floor show; a hero's walk draws its path.
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n69.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const rules = require('../../src/data/board.json');
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), rabdul = U('e4');
  const num = (h) => parseInt(h.slice(1), 16);
  b.endTurn = () => {};

  check('D6 every figure has a rim: three copies of its picture just behind it', b.units.every((u) => u.rims && u.rims.length === 3 && u.rims.every((r) => u.view.getIndex(r) < u.view.getIndex(u.sprite))));
  check('D6 heroes\' rims are the hero colour, enemies\' the enemy colour (white)', b.units.every((u) => u.rims.every((r) => r.tintTopLeft === num(rules.teamColors[u.side]) && r.tintFill === true)) && rules.teamColors.enemy === rules.enemyOptions.white, gaha.rims[0].tintTopLeft.toString(16) + ' ' + rabdul.rims[0].tintTopLeft.toString(16));
  check('D6 the ring on the ground is in the same colour', gaha.ringColor === num(rules.teamColors.hero) && rabdul.ringColor === num(rules.teamColors.enemy));
  check('D6 every figure stands on two shadows: a wide soft one and a small dark one', b.units.every((u) => { const [a, c] = u.view.list; return a.type === 'Ellipse' && c.type === 'Ellipse' && a.width > c.width && c.fillAlpha > a.fillAlpha; }));
  await sleep(300);
  const onPicture = (u) => u.rims.every((r) => r.texture.key === u.sprite.texture.key && r.flipX === u.sprite.flipX && Math.abs(r.scaleX - u.sprite.scaleX) < 1e-6 && Math.abs(r.x - u.sprite.x) <= rules.rim.width && Math.abs(r.y - u.sprite.y) <= rules.rim.width);
  check('the rims sit on the pictures (same picture, size and side), a couple of pixels out', b.units.every(onPicture));
  b.showPose(gaha, 'hurt', 1); await sleep(120);
  check('when the picture changes (hurt), the rim changes with it', onPicture(gaha), gaha.sprite.texture.key + ' / ' + gaha.rims[0].texture.key);
  b.showStanding(gaha); await sleep(120);
  gaha.alive = false; await sleep(80);
  check('a fallen fighter has no rim', gaha.rims.every((r) => !r.visible));
  gaha.alive = true; await sleep(80);

  // ---------- tiles and the path ----------
  check('D7 tiles are soft: the fill is under a third, so the floor shows', rules.tiles.fill <= 0.34);
  b.placeUnit(gaha, 4, 7); b.activeUnit = gaha; gaha.hasActed = false; gaha.hasMoved = false; gaha.stepsUsed = 0; gaha.moveFrom = null; b.busy = false; b.cancelMode();
  b.onMoveButton();
  check('move tiles are up and breathing', b.mode === 'move' && b.highlights.length > 3 && b.tweens.getTweensOf(b.highlights[0]).length > 0, b.highlights.length);
  const far = [...b.reachableKeys].map((k) => k.split(',').map(Number)).sort((p, q) => (Math.abs(q[0] - 4) + Math.abs(q[1] - 7)) - (Math.abs(p[0] - 4) + Math.abs(p[1] - 7)))[0];
  b.handleTap(far[0], far[1]); await sleep(60);
  const line = b.lastPath;
  check('D7 the walk draws its path: a line through each tile to where he will stand', !!line && line.active && line.pathTiles.length >= 2 && line.pathTiles[line.pathTiles.length - 1].col === far[0] && line.pathTiles[line.pathTiles.length - 1].row === far[1], line && line.pathTiles.map((t) => t.col + ',' + t.row).join(' '));
  const t0 = Date.now(); while (b.busy && Date.now() - t0 < 6000) await sleep(30); await sleep(900);
  check('the line is gone once he has arrived', !b.lastPath && (!line || !line.active));
  // an enemy's walk draws none
  b.lastPath = null; b.activeUnit = rabdul; rabdul.stepsUsed = 0;
  b.moveUnit(rabdul, rabdul.col, rabdul.row + 1, () => {}); await sleep(60);
  check('an enemy\'s walk draws no line', !b.lastPath);

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
