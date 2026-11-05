const path = require('path');
// Phase 11 (1 Nov): the Hidden Cavern. Run with the cavern map:
// Runs with FABIEN_MAP=cavern FABIEN_BENCH=e1: the line-up it was written for (Rabdul, the bull, the archer), from before Phase 4 put Tayo in for the bull.
//   FABIEN_MAP=cavern node n39.cjs
// The map (11.3), his ground, walls, props and painting (11.1, 11.2, 11.6),
// the water rules (11.4), and the camera that follows (11.5).
process.env.FABIEN_MAP = 'cavern';
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('terrain:cave_floor_0') && !game.textures.exists('terrain:top:floor:0')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const map = require(path.join(__dirname, '../../src/data/maps/cavern.json'));
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};

  // ---------- 11.3 the layout ----------
  check('11.3 the battle is on the Hidden Cavern (9 by 9)', b.mapName === 'cavern' && G.isInsideGrid(8, 8) && !G.isInsideGrid(9, 0), b.mapName);
  const startOk = Object.entries(map.starts).every(([id, [c, r]]) => { const u = b.units.find((v) => v.id === id); return !u || (u.col === c && u.row === r); });
  check('11.3 everyone starts where the map says', startOk, all.map((u) => u.label + '@' + u.col + ',' + u.row).join(' '));
  check('11.3 the ritual platform is at mid height (2), the water at 0, the walkways at 1', G.getHeight(4, 4) === 2 && G.getHeight(2, 3) === 0 && G.getHeight(1, 4) === 1);
  check('11.3 the bridges are at walkway height (1)', [[4, 2], [2, 4], [6, 4], [4, 6]].every(([c, r]) => G.getHeight(c, r) === 1));
  const tiles = b.children.list.filter((o) => o.type === 'Image' && o.texture && /^tile:cavern:112:/.test(o.texture.key));
  check('11.1 his ground pictures on the tiles (floor, sand, rubble, water, bridge planks)', ['floor', 'caveSand', 'rubble', 'water', 'bridge'].every((k) => tiles.some((o) => o.texture.key.includes(':' + k + ':'))), [...new Set(tiles.map((o) => o.texture.key.split(':')[3]))].join(','));
  check('11.1 his sigil ring laid across the platform', tiles.filter((o) => o.texture.key.includes(':ring:')).length === 9);
  const imgs = b.children.list.filter((o) => o.type === 'Image' && o.texture).map((o) => o.texture.key);
  check('11.2 his rock walls on the sides of the tiles', imgs.some((k) => /^face:cavern:112:/.test(k)));
  check('11.2 his props round the board (stalagmites, pillar, pots, braziers, bones, pool)', ['stalagmiteTall', 'pillar', 'pots', 'brazier', 'bones', 'rockPool'].every((p) => imgs.includes('terrain:' + p)));
  check('11.2 water falls off the platform (the faces turned to the camera)', b.children.list.filter((o) => o.type === 'TileSprite').length >= 3); // (the canvas renderer gives each its own picture name)
  check('11.6 his cavern painting behind', imgs.includes('terrain:caveBackdrop'));
  b.activeUnit = gaha; b.pendingTarget = null; b.approach = null;
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  put(gaha, 2, 3); b.refreshTileInfo();
  check('11.1 the tile in focus is named: Water', /^Water/.test(b.tileText.text), b.tileText.text);

  // the bridges are the way onto the platform
  const PARK = [[0, 8], [1, 8], [8, 8], [0, 0], [8, 0], [7, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.hidden = false; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshWater(); b.refreshStatusTags();
  };
  reset([[gaha, 3, 2]]);
  b.activeUnit = gaha; gaha.stepsUsed = S.moveOf(gaha) - 1; b.startMove(); // one step left
  check('11.3 from the water you can\'t climb straight onto the platform (two levels up)', !b.reachableKeys.has('3,3'), [...b.reachableKeys].join(' '));
  b.cancelMode(); reset([[gaha, 4, 2]]); b.activeUnit = gaha; gaha.stepsUsed = S.moveOf(gaha) - 1; b.startMove();
  check('11.3 from a bridge you can step up onto it', b.reachableKeys.has('4,3'));
  b.cancelMode();

  // ---------- 11.4 water ----------
  reset([[gaha, 1, 3]]);
  await new Promise((res) => { b.activeUnit = gaha; b.moveUnit(gaha, 2, 3, res); });
  check('11.4 a unit can wade into the water', gaha.col === 2 && gaha.row === 3);
  check('11.4 in the water: Drenched', S.isDrenched(gaha) && S.statusTags(gaha).some((t) => t.icon === 'drenched'));
  check('11.4 it stands in the water up to its shins (feet hidden, rings round it)', gaha.wading && gaha.sprite.isCropped && gaha.wadeParts && gaha.wadeParts.length === 2);
  b.showPose(gaha, 'guard', 1);
  check('11.4 and stays so in any pose', gaha.sprite.isCropped);
  // drying off: 2 of its own turns after leaving
  const realEnd = b.constructor.prototype.endTurn;
  const turnEnd = (u) => { b.activeUnit = u; const st = b.startTurn; b.startTurn = () => {}; realEnd.call(b); b.startTurn = st; };
  turnEnd(gaha);
  check('11.4 still in the water at the end of its turn: still Drenched', S.isDrenched(gaha));
  await new Promise((res) => { b.activeUnit = gaha; gaha.stepsUsed = 0; b.moveUnit(gaha, 1, 3, res); });
  check('11.4 out of the water: no longer wading', !gaha.wading && !gaha.sprite.isCropped);
  check('11.4 but still Drenched after leaving', S.isDrenched(gaha));
  turnEnd(gaha);
  check('11.4 one turn out: still Drenched', S.isDrenched(gaha));
  turnEnd(gaha);
  check('11.4 two turns out: dry', !S.isDrenched(gaha));
  // lightning and fire
  reset([[layra, 1, 6], [rabdul, 1, 4], [bull, 7, 5]]); // (dry ground: row 4, column 1 is floor)
  const Cb = w.__combat;
  const dry = Cb ? Cb.getDamage(layra, rabdul) : null;
  S.applyDrenched(rabdul, 2);
  const wet = Cb ? Cb.getDamage(layra, rabdul) : null;
  check('11.4 Drenched: Layra\'s lightning hits half again as hard', dry !== null && wet === Math.max(1, Math.round(dry * 1.5)), dry + ' -> ' + wet);
  S.applyBuff(layra, 'fury'); // her attack becomes Wildfire
  const fireWet = Cb.getDamage(layra, rabdul);
  rabdul.status.drenched = null;
  const fireDry = Cb.getDamage(layra, rabdul);
  check('11.4 Drenched: fire does half', fireWet === Math.max(1, Math.round(fireDry * 0.5)), fireDry + ' -> ' + fireWet);
  S.applyDrenched(rabdul, 2);
  b.activeUnit = layra; layra.hasActed = false; b.startAttack(); b.handleTap(rabdul.col, rabdul.row);
  check('11.4 the preview says so', /Drenched: fire does less/.test(b.statusText.text) && /Too wet to catch fire/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.cancelMode();
  layra.accuracy = 999; rabdul.hp = 200; rabdul.maxHp = 200;
  await new Promise((res) => { b.performAttack(layra, rabdul, res); setTimeout(res, 4000); });
  check('11.4 Wildfire can\'t set a Drenched unit alight', !S.isBurning(rabdul));
  // water puts out a burn
  reset([[rabdul, 1, 3]]);
  S.applyBurn(rabdul, 'wildfire');
  await new Promise((res) => { b.activeUnit = rabdul; b.moveUnit(rabdul, 2, 3, res); });
  check('11.4 wading into water puts out a burn', !S.isBurning(rabdul) && S.isDrenched(rabdul));
  // pushed into the water: Drenched when it lands
  reset([[gaha, 1, 5], [bull, 2, 5]]);
  b.pushLoser(bull, gaha, 1); // pushed from (2,5) away from Gaha... (3,5) is the platform: blocked, wall slam
  reset([[gaha, 0, 3], [bull, 1, 3]]);
  const pushed = b.pushLoser(bull, gaha, 1);
  if (pushed.path.length) b.slideAlong(bull, pushed.path);
  await sleep(600);
  check('11.4 a unit knocked into the water is Drenched', bull.col === 2 && bull.row === 3 && S.isDrenched(bull), bull.col + ',' + bull.row);

  // ---------- 11.5 the camera ----------
  reset([[gaha, 4, 7], [bull, 4, 1]]);
  const cam = b.cameras.main;
  check('11.5 the cavern map follows the unit whose turn it is', b.follow === true);
  // (a phone-sized screen: the battle is played zoomed in)
  b.playZoom = b.home.zoom * 1.6; b.zoomRange = [b.home.zoom, b.playZoom * 1.5]; b.rest = { ...b.home, zoom: b.playZoom }; b.manualView = false;
  b.followUnit(gaha, 1);
  await sleep(120);
  const mid = () => ({ x: cam.worldView.centerX, y: cam.worldView.centerY });
  check('11.5 zoomed in on the active unit', cam.zoom > b.home.zoom * 1.4 && Math.abs(mid().x - gaha.view.x) < 60, cam.zoom.toFixed(2) + ' vs ' + b.home.zoom.toFixed(2));
  b.followUnit(bull, 1);
  await sleep(120);
  check('11.5 and turns to the next one', Math.abs(mid().x - bull.view.x) < 60 && mid().y < G.tileToScreen(4, 4).y);
  // drag to look around (no tap)
  b.activeUnit = gaha; gaha.hasMoved = false; gaha.stepsUsed = 0; b.cancelMode(); b.startMove(true);
  const before = { ...mid() };
  const P = (id, x, y, isDown = true) => ({ id, x, y, isDown });
  b.boardDown(P(1, 300, 600));
  b.boardMove(P(1, 200, 560));
  b.boardMove(P(1, 100, 520));
  const tapsBefore = gaha.col + ',' + gaha.row;
  b.boardUp(P(1, 100, 520, false));
  await sleep(60); // (the camera's view is worked out when the next picture is drawn)
  check('11.5 dragging moves the view', Math.abs(mid().x - before.x - 200 / cam.zoom) < 4 && Math.abs(mid().y - before.y - 80 / cam.zoom) < 4, Math.round(mid().x - before.x) + ',' + Math.round(mid().y - before.y));
  check('11.5 a drag is not a tap (nobody moved)', gaha.col + ',' + gaha.row === tapsBefore && !b.busy);
  // a tap is still a tap (on release)
  const dest = G.tileToScreen(4, 6);
  const sp = { x: (dest.x - cam.worldView.x) * cam.zoom, y: (dest.y - cam.worldView.y) * cam.zoom };
  b.boardDown(P(2, sp.x, sp.y));
  check('11.5 nothing happens yet when the finger goes down', !b.busy);
  b.boardUp(P(2, sp.x, sp.y, false));
  await sleep(700);
  check('11.5 lifting it taps: he walks there', gaha.col === 4 && gaha.row === 6, gaha.col + ',' + gaha.row);
  // pinch and the wheel
  const z0 = cam.zoom;
  b.boardDown(P(3, 300, 600)); b.boardDown(P(4, 400, 600));
  const pts = b.input.manager.pointers;
  // (the second finger is read from Phaser's pointers: stand one in)
  const fake = { id: 4, x: 500, y: 600, isDown: true };
  b.input.manager.pointers = [...pts, fake];
  b.boardMove(P(3, 200, 600));
  b.input.manager.pointers = pts;
  check('11.5 pinching out zooms in', cam.zoom > z0 * 1.2, z0.toFixed(2) + ' -> ' + cam.zoom.toFixed(2));
  b.boardUp(P(3, 200, 600, false)); b.boardUp(P(4, 500, 600, false));
  b.zoomAt(300, 600, 0.01);
  check('11.5 zooming out stops at the whole board', Math.abs(cam.zoom - b.home.zoom) < 0.001);
  b.zoomAt(300, 600, 99);
  check('11.5 and zooming in stops somewhere sensible', Math.abs(cam.zoom - b.zoomRange[1]) < 0.001);
  const t1 = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t1 < 3000) await sleep(20);
  b.toggleWholeBoard(); await sleep(400);
  check('11.5 the little map: the whole board', Math.abs(cam.zoom - b.home.zoom) < 0.01, cam.zoom.toFixed(2) + ' busy ' + b.busy + ' cine ' + b.inCinematic);
  b.toggleWholeBoard(); await sleep(400);
  check('11.5 tapped again: back to the unit, zoomed in', cam.zoom > b.home.zoom * 1.4 && !b.manualView);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
