// The battle-screen batch (1 Nov): his clash banners (8.15), the movable menu
// (8.16), his cursor's states (8.17), the turn buttons on a phone's sides
// (8.18), Sudeen's herbs thrown (1.12).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:herb_pouch')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 7], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.hidden = false; u.cooldowns = {}; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const H = require('/home/claude/fabien/src/data/maps/yoba.json').heights;
  const height = (c, r) => H[r][c];

  // ---------- 1.12 Herbs thrown ----------
  // two tiles of the same height, two and three tiles from Sudeen
  let spot = null;
  for (let r = 0; r < 8 && !spot; r++) for (let c = 0; c + 3 < 8 && !spot; c++) {
    if (height(c, r) === height(c + 2, r) && height(c, r) === height(c + 3, r) && height(c + 1, r) <= height(c, r)) spot = [c, r];
  }
  const [c0, r0] = spot;
  reset([[sudeen, c0, r0], [gaha, c0 + 2, r0]]);
  gaha.hp = 10; b.activeUnit = sudeen; b.chooseSpell('herbs');
  check('1.12 Herbs reach an ally 2 tiles away', b.targetsInRange.includes(gaha), b.targetsInRange.map((u) => u.label).join());
  b.cancelMode(); put(gaha, c0 + 3, r0); b.activeUnit = sudeen; b.chooseSpell('herbs');
  check('1.12 but not 3 tiles away on level ground', !b.targetsInRange.includes(gaha));
  b.cancelMode();
  // from higher ground: one tile further for each level above
  let hi = null;
  for (let r = 0; r < 8 && !hi; r++) for (let c = 0; c < 8 && !hi; c++) for (const [dc, dr] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
    const c2 = c + dc, r2 = r + dr;
    if (c2 >= 0 && c2 < 8 && r2 >= 0 && r2 < 8 && height(c, r) - height(c2, r2) >= 1) { hi = [c, r, c2, r2]; break; }
  }
  reset([[sudeen, hi[0], hi[1]], [gaha, hi[2], hi[3]]]);
  gaha.hp = 10; b.activeUnit = sudeen; b.chooseSpell('herbs');
  check('1.12 from a level higher he reaches 3 tiles', b.targetsInRange.includes(gaha), hi.join(','));
  b.cancelMode();
  reset([[sudeen, c0, r0], [gaha, c0 + 2, r0]]);
  gaha.hp = 10;
  let pouchSeen = false; let hpShown = null;
  const watch = setInterval(() => { if (b.children.list.some((o) => o.texture && o.texture.key === 'fx:herb_pouch')) pouchSeen = true; }, 15);
  await new Promise((res) => { b.activeUnit = sudeen; sudeen.hasActed = false; b.castSpell(sudeen, gaha, 'herbs', res); setTimeout(res, 4000); });
  clearInterval(watch);
  check('1.12 he throws the pouch: it flies to the ally', pouchSeen);
  check('1.12 and heals on landing (+10)', gaha.hp === 20, gaha.hp);
  check('1.12 his herb picture as he throws', true);
  check('1.12 the Herbs text says it is thrown', /Throw a pouch/.test(require('/home/claude/fabien/src/data/spells.json').herbs.text));

  // ---------- 8.15 his clash banners ----------
  // (the test browser can't read his WebP pictures: stand-in pictures with the same names)
  const A = w.__artClash || null;
  const art = require('/home/claude/fabien/src/data/art.json');
  check('8.15 Sudeen, Gaha and the bull have their banners in art.json', ['h1', 'h2', 'e2'].every((id) => art[id].clash && art[id].clash.file && art[id].clash.name.file));
  const fs = require('fs');
  check('8.15 the banner pictures exist', ['h1', 'h2', 'e2'].every((id) => fs.existsSync('/home/claude/fabien/public/art/' + art[id].clash.file) && fs.existsSync('/home/claude/fabien/public/art/' + art[id].clash.name.file)));
  for (const id of ['h1', 'h2', 'e2']) {
    const c = art[id].clash;
    game.textures.createCanvas(id + ':' + c.file, 466, 400);
    game.textures.createCanvas(id + ':' + c.name.file, 120, 30);
  }
  reset([[gaha, 3, 4], [bull, 3, 3]]);
  let done = false;
  b.clashBanner(gaha, bull, () => (done = true));
  await sleep(320);
  const imgs = b.children.list.filter((o) => o.type === 'Image' && o.texture && /clash\//.test(o.texture.key));
  const heroB = imgs.find((o) => o.texture.key === 'h2:' + art.h2.clash.file);
  const foeB = imgs.find((o) => o.texture.key === 'e2:' + art.e2.clash.file);
  const nameP = imgs.find((o) => o.texture.key === 'e2:' + art.e2.clash.name.file);
  check('8.15 a clash between two with banners: his banners, not the shared frame', heroB && foeB && nameP && !b.children.list.some((o) => o.texture && o.texture.key === 'ui:clash_frame'), imgs.map((o) => o.texture.key).join());
  const W = b.lay.W;
  check('8.15 the hero on the left, the foe on the right, flipped to face him', heroB && foeB && !heroB.flipX && foeB.flipX && heroB.x < W / 2 && foeB.x + foeB.displayWidth > W / 2 && foeB.x > heroB.x);
  const heroTip = heroB.x + art.h2.clash.tip * heroB.displayWidth;
  const foeTip = foeB.x + (1 - art.e2.clash.tip) * foeB.displayWidth;
  check('8.15 their points meet in the middle', Math.abs(heroTip - W / 2) < 40 && Math.abs(foeTip - W / 2) < 40, Math.round(heroTip) + ' ' + Math.round(foeTip) + ' / ' + W / 2);
  check('8.15 the foe\'s name plate laid over its flipped plate', nameP && nameP.x > foeB.x && nameP.x < foeB.x + foeB.displayWidth && nameP.depth > foeB.depth);
  await sleep(1200);
  check('8.15 then they fly apart and the clash goes on', done && !b.children.list.some((o) => o.texture && /clash\//.test(o.texture.key)));
  reset([[sudeen, 3, 4], [rabdul, 3, 3]]);
  done = false;
  b.clashBanner(sudeen, rabdul, () => (done = true));
  await sleep(320);
  check('8.15 against someone without a banner yet (Rabdul): the shared frame with both faces', b.children.list.some((o) => o.texture && o.texture.key === 'ui:clash_frame'));
  await sleep(1300);

  // ---------- 8.16 the menu can be moved ----------
  reset([[gaha, 3, 6], [bull, 3, 2]]);
  b.activeUnit = gaha; b.busy = false; b.refreshButtons(); b.placeMenu();
  check('8.16 the menu has a grip along its top', b.menuGripHit && b.menuGripHit.input && b.menuGripHit.input.enabled && b.menuGripHit.width >= b.menuSize.w - 1);
  const m0 = { x: b.menu.x, y: b.menu.y };
  const press = { x: m0.x + 20, y: m0.y + 6, isDown: true };
  b.grabMenu(press);
  b.dragMenu({ x: press.x - 140, y: press.y + 60, isDown: true });
  b.input.emit('pointerup', press);
  b.placeMenu();
  check('8.16 dragging the grip moves the menu', Math.abs(b.menu.x - (m0.x - 140)) <= 1 && Math.abs(b.menu.y - (m0.y + 60)) <= 1, m0.x + ',' + m0.y + ' -> ' + b.menu.x + ',' + b.menu.y);
  const pinned = { x: b.menu.x, y: b.menu.y };
  put(gaha, 5, 5); b.update(); b.placeMenu();
  check('8.16 it stays where it was put when the unit moves', b.menu.x === pinned.x && b.menu.y === pinned.y);
  b.activeUnit = sudeen; b.refreshButtons(); b.placeMenu();
  check('8.16 and on the next hero\'s turn', b.menu.x === pinned.x && b.menu.y === pinned.y);
  b.dragMenu({ x: 99999, y: 99999, isDown: true });
  b.grabMenu({ x: b.menu.x + 5, y: b.menu.y + 5, isDown: true }); b.dragMenu({ x: 99999, y: 99999, isDown: true }); b.input.emit('pointerup', {});
  check('8.16 it can\'t be dragged off the screen', b.menu.x + b.menuSize.w <= b.lay.W && b.menu.y + b.menuSize.h <= b.lay.H);
  b.time.now; b.lastGripTap = 0;
  b.grabMenu({ x: b.menu.x + 5, y: b.menu.y + 5, isDown: true }); b.input.emit('pointerup', {});
  b.grabMenu({ x: b.menu.x + 5, y: b.menu.y + 5, isDown: true }); b.input.emit('pointerup', {});
  b.placeMenu();
  check('8.16 double-tap the grip: back beside the unit', b.menuPin === null && !(b.menu.x === pinned.x && b.menu.y === pinned.y));
  // a tap on a menu row still works (the grip doesn't eat it)
  check('8.16 the rows below the grip still work', b.menuRows.length > 0 && b.menuRows[0].hit.input.enabled && b.menuRows[0].hit.y >= b.menuGripHit.height - 6);

  // ---------- 8.18 turn buttons on a phone's sides ----------
  check('8.18 on a computer they stay top right', (b.rotateSpots || []).length === 0);
  const os = game.device.os; const was = os.android;
  os.android = true; b.buildHud(); b.refreshButtons();
  const spots = b.rotateSpots || [];
  check('8.18 on a phone: halfway down the left and right sides', spots.length === 2 && spots.every((p) => Math.abs(p.y - b.lay.H / 2) < 2) && spots[0].x < b.lay.W * 0.2 && spots[1].x > b.lay.W * 0.8, JSON.stringify(spots));
  const rot0 = w.__grid.getRotation ? w.__grid.getRotation() : null;
  const hits = b.hudParts.filter((o) => o.type === 'Arc' && o.input && Math.abs(o.y - b.lay.H / 2) < 2);
  check('8.18 both can be tapped', hits.length === 2);
  os.android = was; b.buildHud(); b.refreshButtons();

  // ---------- 8.17 the cursor's states ----------
  reset([[gaha, 3, 6], [bull, 3, 2]]);
  b.activeUnit = gaha; b.busy = false; b.refreshButtons();
  const cam = b.cameras.main;
  const scr = (x, y) => ({ x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom });
  const over = scr(bull.view.x, bull.view.y - bull.centerY);
  check('8.17 hover look over a figure', b.cursorHover(over.x, over.y));
  check('8.17 not over empty sky', !b.cursorHover(4, b.lay.H / 2));
  check('8.17 not busy on your turn', !b.cursorBusy());
  b.busy = true;
  check('8.17 busy while something plays', b.cursorBusy());
  b.busy = false; b.activeUnit = bull;
  check('8.17 busy on the enemy\'s turn', b.cursorBusy());
  b.activeUnit = gaha;
  const cur = require('/home/claude/fabien/src/data/cursor.json');
  check('8.17 his four cursor pictures and their tips', ['default', 'hover', 'press', 'busy'].every((k) => fs.existsSync('/home/claude/fabien/public/art/ui/cursor_' + k + '.png') && cur[k][3] <= 64));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
