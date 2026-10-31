// Phase 8 (30 Oct evening): the new battle screen from Suleiman's mockups.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('ui:clash_frame')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; let ended = 0; b.endTurn = () => { ended++; };
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 0], [1, 0], [7, 0], [6, 0]];
  const reset = (placed, active) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.activeUnit = active; b.busy = false; b.cancelMode(); b.refreshButtons(); b.refreshCard(active); b.refreshStatusTags();
  };
  const inside = (o, W, H) => { const r = o.getBounds(); return r.x >= -1 && r.y >= -1 && r.right <= W + 1 && r.bottom <= H + 1; };
  const cardBox = () => b.cardLayer.getBounds();

  // ---------- 8.2 the frame in portrait (the test screen is 720 by 1280) ----------
  reset([[gaha, 3, 4], [bull, 3, 1]], gaha);
  await sleep(100);
  check('8.2 the turn number and the tile in focus (top right)', /^\d\d$/.test(b.turnText.text) && /ELEV \d/.test(b.tileText.text), b.turnText.text + ' / ' + b.tileText.text);
  const cb = cardBox();
  check('8.2 the profile card sits bottom left, on screen', cb.x < 40 && cb.bottom <= 1280 && cb.bottom > 1200, Math.round(cb.x) + ',' + Math.round(cb.y) + ' ' + Math.round(cb.width) + 'x' + Math.round(cb.height));
  const texts = []; const walk = (c) => c.list.forEach((o) => (o.list ? walk(o) : o.type === 'Text' && texts.push(o.text))); walk(b.cardLayer);
  check('8.2 the card has the HP bar with numbers, and the numbers row (no CT bar for the unit acting, 8.12)', texts.includes('HP') && texts.includes('36/36') && !texts.includes('CT') && !texts.includes('Next turn') && ['ATK', 'DEF', 'MAG', 'MDF', 'SPD', 'MOV', 'RNG'].every((k) => texts.includes(k)), texts.join(' '));
  b.showMessage('A test message for the info card');
  await sleep(50);
  const ib = b.infoPanel.getBounds ? null : null;
  check('8.2 the info card holds the text, bottom right', b.statusText.x > 360 && b.statusText.y > 1100 && b.infoTop < 1280, Math.round(b.statusText.x) + ',' + Math.round(b.statusText.y));

  // ---------- 8.3 the menu beside the unit ----------
  await sleep(50);
  check('8.3 the menu shows on a hero\'s turn, beside the unit', b.menu.visible && Math.abs(b.menu.x - (gaha.view.x - b.cameras.main.worldView.x) * b.cameras.main.zoom) < 320, b.menu.x + ',' + b.menu.y);
  check('8.3 its rows: Thrust, Engage, Skills, Items, End turn', b.menuRows.map((r) => r.label.text).join('|') === 'Move|Thrust|Engage|Skills|Items|End turn' || b.menuRows.map((r) => r.label.text).join('|') === 'Thrust|Engage|Skills|Items|End turn', b.menuRows.map((r) => r.label.text).join('|'));
  check('8.3 the menu stays on screen', inside(b.menu, 720, 1280));
  reset([[layra, 2, 5], [rabdul, 2, 1]], layra);
  layra.mp = layra.maxMp; b.onSpellButton(); await sleep(50);
  const costs = b.menuRows.filter((r) => r.cost.text).map((r) => r.word.text + '=' + r.cost.text);
  check('8.3 Skills open with each MP cost on the right', costs.length >= 1 && b.menuHeader.text.length > 0, costs.join(' ') + ' / ' + b.menuHeader.text);
  b.cancelMode();
  reset([[gaha, 3, 4], [bull, 3, 1]], bull);
  await sleep(50);
  check('8.3 no menu on the enemy\'s turn', !b.menu.visible);

  // ---------- 8.4 less over the characters ----------
  reset([[gaha, 3, 4], [bull, 3, 1]], gaha);
  await sleep(50);
  const badge = gaha.view.list.filter((o) => o.type === 'Arc' || (o.type === 'Text' && o.text && o.text.length <= 2 && o.visible));
  check('8.4 the job badges are hidden', !gaha.view.list.some((o) => o.type === 'Arc' && o.visible && o.radius === 10));
  check('8.4 the HP bar is thin', gaha.hpFill.height === 5);
  check('8.4 a gold marker floats over the unit whose turn it is', b.activeMarker.visible && Math.abs(b.activeMarker.x - gaha.view.x) < 1 && b.activeMarker.y < gaha.view.y - gaha.topY);

  // ---------- 8.5 tap to move ----------
  b.autoMove = true;
  reset([[gaha, 3, 4], [bull, 3, 0]], gaha);
  await sleep(80);
  check('8.5 on his turn the blue tiles show by themselves', b.mode === 'move' && b.reachableKeys.size > 0, b.mode + ' ' + b.reachableKeys.size);
  check('8.5 Move leaves the menu (Undo move stays when needed)', !b.menuRows.some((r) => r.iconName === 'walk'), b.menuRows.map((r) => r.label.text).join('|'));
  b.handleTap(3, 4); await sleep(30);
  check('8.5 tapping himself keeps the blue tiles', b.mode === 'move');
  const dest = [...b.reachableKeys].find((k) => k === '4,5') ? [4, 5] : [...b.reachableKeys][0].split(',').map(Number);
  b.handleTap(dest[0], dest[1]);
  { const t = Date.now(); while (Date.now() - t < 3000 && b.busy) await sleep(30); }
  check('8.5 one tap on a blue tile walks there', gaha.col === dest[0] && gaha.row === dest[1], gaha.col + ',' + gaha.row);
  b.autoMove = false;

  // ---------- 8.7 double-tap a Verse: on herself ----------
  reset([[layra, 2, 5], [rabdul, 2, 0], [sudeen, 6, 6]], layra);
  layra.mp = layra.maxMp;
  b.onSpellButton(); b.openSpellGroup && b.openSpellGroup('Blessings'); b.chooseSpell('stone'); b.chooseSpell('stone');
  { const t = Date.now(); while (Date.now() - t < 3000 && !S.buffOf(layra)) await sleep(30); }
  check('8.7 tapping a Verse twice casts it on Layra herself', S.buffOf(layra) && S.buffOf(layra).id === 'stone');
  await sleep(1200);

  // ---------- 8.6 the clash banner ----------
  reset([[gaha, 3, 4], [bull, 3, 3]], gaha);
  const banner = () => b.children.list.filter((o) => o.type === 'Image' && o.texture && o.texture.key === 'ui:clash_frame');
  b.onEngageButton(); b.handleTap(3, 3); b.handleTap(3, 3);
  await sleep(350);
  const halves = banner();
  check('8.6 a clash starts with his banner, in two halves', halves.length === 2, halves.length);
  const faces = b.children.list.filter((o) => o.type === 'Image' && o.mask && o.depth === 251);
  check('8.6 both fighters\' faces are clipped to the panels', faces.length === 2, faces.length);
  check('8.6 the banner is on screen', halves.every((h) => inside(h, 720, 1280)));
  { const t = Date.now(); while (Date.now() - t < 6000 && banner().length) await sleep(50); }
  check('8.6 then it goes, and the clash plays on', banner().length === 0 && gaha.hasActed, banner().length + ' ' + (gaha.engagedWith && gaha.engagedWith.name) + ' cine ' + b.inCinematic + ' busy ' + b.busy);
  { const t = Date.now(); while (Date.now() - t < 6000 && (b.busy || b.inCinematic)) await sleep(50); }

  // ---------- 8.9 the menu gets out of the way ----------
  b.autoMove = true;
  reset([[gaha, 3, 4], [bull, 3, 2], [sudeen, 4, 5]], gaha);
  await sleep(80);
  const cam9 = b.cameras.main;
  const scr = (x, y) => ({ x: (x - cam9.worldView.x) * cam9.zoom, y: (y - cam9.worldView.y) * cam9.zoom });
  const covers = () => {
    const r = { x: b.menu.x, y: b.menu.y, w: b.menuSize.w, h: b.menuSize.h };
    let n = 0;
    for (const k of b.reachableKeys) { const [c, rr] = k.split(',').map(Number); const p = G.tileToScreen(c, rr); const q = scr(p.x, p.y); if (q.x > r.x && q.x < r.x + r.w && q.y > r.y && q.y < r.y + r.h) n++; }
    return n;
  };
  check('8.9 walking: the menu covers as few blue tiles as it can (none here)', b.mode === 'move' && b.menu.visible && covers() === 0, 'covers ' + covers());
  b.onAttackButton(); await sleep(50);
  check('8.9 picking a target: the menu shrinks to a small cancel tag', b.mode === 'attack' && !b.menu.visible && b.pill.visible && /Thrust/.test(b.pillText.text), b.pillText.text);
  check('8.9 the hidden menu can\'t catch taps', b.slots.every((r) => !r.hit.input || !r.hit.input.enabled));
  b.handleTap(3, 2); await sleep(30);
  check('8.9 the target can be tapped where the menu was', b.pendingTarget === bull);
  b.pillHit.emit('pointerdown'); await sleep(80);
  check('8.9 tapping the tag cancels, and the menu comes back', b.mode === 'move' && b.menu.visible && !b.pill.visible && b.slots.some((r) => r.view.visible && r.hit.input.enabled), b.mode);
  b.autoMove = false;

  // ---------- 31 Oct quick batch: 8.10 to 8.14 ----------
  reset([[layra, 2, 5], [rabdul, 2, 1]], layra);
  layra.mp = layra.maxMp; await sleep(50);
  const rows = () => b.menuRows.map((r) => r.label.text).join('|');
  check('8.10 Meditate has its own row on Layra\'s main menu', /Verses/.test(rows()) && /Meditate/.test(rows()), rows());
  b.halves[1].hit.emit('pointerdown'); await sleep(50);
  check('8.10 first tap lights Meditate and explains it; the menu stays', b.selectedSpell === 'meditate' && b.mode === 'rest' && b.menu.visible && b.halves[1].selected && /Tap Meditate again/.test(b.statusText.text), b.mode + ' / ' + b.statusText.text);
  b.cancelMode();
  b.onSpellButton(); await sleep(30);
  check('8.11 the Verses panel: Blessings, Hexes and Husk under a VERSES header', /Blessings/.test(rows()) && /Hexes/.test(rows()) && /Husk/.test(rows()) && !/Meditate/.test(rows()) && b.menuHeader.text === 'VERSES', rows() + ' / ' + b.menuHeader.text);
  b.openSpellGroup('Hexes'); await sleep(30);
  check('8.11 Slow sits under Hexes', /Slow/.test(rows()) && b.menuHeader.text === 'HEXES', rows());
  b.cancelMode();
  b.refreshCard(gaha); const t2 = []; const walk2 = (c) => c.list.forEach((o) => (o.list ? walk2(o) : o.type === 'Text' && t2.push(o.text))); walk2(b.cardLayer);
  const order = w.__game.scene.getScene('BattleScene');
  check('8.12 a waiting unit\'s card says when it acts next', t2.includes('Next turn') && t2.some((t) => /^(next|in \d+|later)$/.test(t)) && !t2.includes('CT'), t2.join(' '));
  b.refreshTurnStrip(); await sleep(30);
  const nums = b.units.filter((u) => u.alive && u !== b.activeUnit).map((u) => u.orderNumber && u.orderNumber.visible ? Number(u.orderNumber.text) : 0);
  check('8.14 every waiting unit shows its place in the turn order (2 and up, all different)', nums.every((n) => n >= 2) && new Set(nums).size === nums.length, nums.join(','));
  check('8.14 the unit acting has no number (it has the gold marker)', !layra.orderNumber.visible);
  // 8.13: victory without the jump
  const ys = []; const y0 = gaha.sprite ? gaha.sprite.y : 0;
  b.battleOver = false; b.showResult('victory');
  for (let i = 0; i < 12; i++) { await sleep(60); ys.push(gaha.sprite.y); }
  check('8.13 the victory pose plays without the jump', ys.every((y) => Math.abs(y - y0) < 0.5), ys.map((y) => Math.round(y - y0)).join(','));
  await sleep(1200);
  for (const o of b.children.list.filter((o) => o.depth >= 300)) o.destroy();
  b.resultButtons.forEach((r) => r.view.destroy()); b.resultButtons = []; b.battleOver = false;

  // ---------- 8.1 turning the phone: landscape ----------
  E.endDuel(gaha);
  reset([[gaha, 3, 4], [bull, 3, 1]], gaha);
  game.scale.setGameSize(1280, 720); b.events.emit('layout', 1280, 720);
  await sleep(150);
  check('8.1 sideways: both cameras take the new size', b.cameras.main.width === 1280 && b.uiCam.width === 1280 && b.uiCam.height === 720);
  const cb2 = cardBox();
  check('8.1 sideways: the card is bottom left, inside 1280 by 720', cb2.x < 40 && cb2.bottom <= 721 && cb2.bottom > 650, Math.round(cb2.x) + ',' + Math.round(cb2.y) + ',' + Math.round(cb2.bottom));
  check('8.1 sideways: the turn box is top right', b.turnText.x > 1000 && b.turnText.y < 60);
  check('8.1 sideways: the menu stays on screen', b.menu.visible && inside(b.menu, 1280, 720));
  const cam = b.cameras.main;
  const corner = (c, r) => { const p = G.tileToScreen(c, r); return { x: (p.x - cam.worldView.x) * cam.zoom, y: (p.y - cam.worldView.y) * cam.zoom }; };
  const ends = [corner(0, 0), corner(7, 7), corner(0, 7), corner(7, 0)];
  check('8.8 sideways: the whole board is on screen', ends.every((p) => p.x > 0 && p.x < 1280 && p.y > 0 && p.y < 720), ends.map((p) => Math.round(p.x) + ',' + Math.round(p.y)).join(' '));
  game.scale.setGameSize(720, 1280); b.events.emit('layout', 720, 1280);
  await sleep(150);
  check('8.1 and back upright', b.uiCam.width === 720 && cardBox().bottom > 1200);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
