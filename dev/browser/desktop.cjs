// M8 (roadmap 18.8; checklist E1, E2, E3): the desktop screen (1440 x 900) in a real browser.
// E1: a standing fighter is 90 real pixels tall or more. E2: pictures of the title, a story
// scene and the result panel. E3: hover names the tile and shows the fighter; Esc cancels,
// Enter confirms, Space ends the turn.
//   node dev/browser/desktop.cjs <out dir>      (with the preview running)
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__skipSelect = true; }); // the character select (18.30) goes straight on, as in the other checks
  await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  // ----- E2: title and story -----
  await page.screenshot({ path: out + '/desktop_title.png' });
  const title = await page.evaluate(() => { const s = window.__game.scene.getScene('StartScene'); const c = s.cameras.main; const real = s.scale.displaySize.width / s.scale.width; return { h: s.titleText.height * c.zoom * real, zoom: c.zoom }; });
  check('E2 the title is big on a wide screen (the word Fabien over 120 real pixels tall)', title.h >= 120, Math.round(title.h) + ' px, zoom ' + title.zoom.toFixed(2));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('DialogueScene'), null, { timeout: 15000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: out + '/desktop_story.png' });
  const story = await page.evaluate(() => { const s = window.__game.scene.getScene('DialogueScene'); const c = s.cameras.main; const real = s.scale.displaySize.width / s.scale.width; return { boxW: s.L.box[2] * c.zoom * real, font: parseFloat(s.bodyText.style.fontSize) * c.zoom * real }; });
  check('E2 the story box runs most of the screen\'s width (over 1000 of 1440 pixels), letters 20 real pixels or more', story.boxW >= 1000 && story.font >= 20, Math.round(story.boxW) + ' wide, ' + story.font.toFixed(1) + ' px letters');
  const line0 = await page.evaluate(() => window.__game.scene.getScene('DialogueScene').lineIndex);
  await page.keyboard.press('Space'); await page.waitForTimeout(300); await page.keyboard.press('Space'); await page.waitForTimeout(600);
  const line1 = await page.evaluate(() => window.__game.scene.getScene('DialogueScene').lineIndex);
  check('E3 Space moves the story on', line1 > line0, line0 + ' to ' + line1);
  for (let i = 0; i < 80; i++) { if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break; await page.keyboard.press('Enter'); await page.waitForTimeout(220); }
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  // ----- E1 -----
  const hs = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const real = b.scale.displaySize.width / b.scale.width; return b.units.map((u) => u.name + ' ' + Math.round(u.sprite.displayHeight * b.cameras.main.zoom * real)); });
  check('E1 every standing fighter is 90 real pixels tall or more', hs.every((x) => Number(x.split(' ').pop()) >= 90), hs.join(', '));
  // ----- E3: hover -----
  const spot = (id) => page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id); const c = b.cameras.main; const real = b.scale.displaySize.width / b.scale.width; const box = b.game.canvas.getBoundingClientRect(); return { x: box.x + (u.view.x - c.worldView.x) * c.zoom * real, y: box.y + (u.view.y - 20 - c.worldView.y) * c.zoom * real, name: u.name }; }, id);
  const foe = await spot('e4');
  await page.mouse.move(foe.x, foe.y); await page.waitForTimeout(400);
  const hov = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const card = b.cardLayer.list.filter((o) => o.type === 'Text').map((o) => o.text); return { unit: b.hoverUnit && b.hoverUnit.name, tile: b.tileText.text + ' ' + (b.elevText ? b.elevText.text : ''), mark: !!b.hoverMark, card: card.slice(0, 3).join(' '), plate: b.hoverUnit && b.hoverUnit.plate.alpha }; });
  await page.screenshot({ path: out + '/desktop_hover.png' });
  check('E3 hover on a foe: the tile is outlined and named, his card and health show', hov.unit === foe.name && hov.mark && /ELEV/.test(hov.tile) && hov.card.includes(foe.name) && hov.plate > 0.5, JSON.stringify(hov));
  await page.mouse.move(700, 60); await page.waitForTimeout(300);
  const off = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { unit: b.hoverUnit, card: b.cardLayer.list.filter((o) => o.type === 'Text')[0].text, active: b.activeUnit.name }; });
  check('E3 moving off: the card goes back to the fighter whose turn it is', !off.unit && off.card === off.active, off.card);
  // ----- E3: keys -----
  await page.evaluate(() => window.__game.scene.getScene('BattleScene').onSpellButton());
  const m1 = await page.evaluate(() => window.__game.scene.getScene('BattleScene').mode);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  const m2 = await page.evaluate(() => window.__game.scene.getScene('BattleScene').mode);
  check('E3 Esc cancels a choice (the skills list closes)', m1 === 'spell' && (m2 === 'idle' || m2 === 'move'), m1 + ' to ' + m2);
  // put a foe in reach, pick it (one tap = picked), Enter confirms
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.activeUnit; const f = b.units.find((x) => x.id === 'e4'); b.placeUnit(f, u.col, u.row - 1); b.cancelMode(); b.onAttackButton(); b.handleTap(f.col, f.row); });
  const picked = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { mode: b.mode, pending: b.pendingTarget && b.pendingTarget.name, acted: b.activeUnit.hasActed }; });
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const done = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { acted: b.activeUnit.hasActed, busy: b.busy }; });
  check('E3 Enter confirms the picked target (the attack goes)', !!picked.pending && !picked.acted && (done.acted || done.busy), JSON.stringify(picked) + ' then ' + JSON.stringify(done));
  await page.waitForFunction(() => !window.__game.scene.getScene('BattleScene').busy, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  const who = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {}; return b.activeUnit.name + b.turnCount; });
  await page.keyboard.press('Space'); await page.waitForTimeout(1500);
  const who2 = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit.name + b.turnCount; });
  check('E3 Space ends the turn', who !== who2, who + ' to ' + who2);
  // ----- E2: the result panel -----
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); for (const u of b.units.filter((x) => x.side === 'enemy')) { b.landHit(u, u.hp); b.defeat(u); b.playDefeat(u, 1); } b.turnCount = 84; b.battleOver = true; b.showResult('victory'); });
  await page.waitForTimeout(3600);
  await page.screenshot({ path: out + '/desktop_result.png' });
  const res = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const real = b.scale.displaySize.width / b.scale.width; let t = null; const walk = (o) => { if (o.type === 'Text' && (o.text === 'Victory' || o.text === 'VICTORY')) t = o; if (o.list) o.list.forEach(walk); }; b.children.list.forEach(walk); return t ? t.height * real : 0; });
  check('E2 the result word is big (over 100 real pixels tall)', res >= 100, Math.round(res) + ' px');
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')'); process.exit(bad ? 1 : 0);
})();
