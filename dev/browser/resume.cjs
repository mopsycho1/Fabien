// M16 (roadmap 18.16; checklist H2 and H4) in a real phone browser.
// H2: play into a battle, hurt someone, reload the page: the title offers "Continue the
//     battle" and it comes back at the start of the same turn with the same health.
// H4: a first load on a phone connection (9 megabits a second, 100 ms delay, nothing cached):
//     seconds until the title is on screen, the bar moving, and until "Tap to begin".
//   node dev/browser/resume.cjs <out dir>      (with the preview running)
const fs = require('fs');
const { chromium } = require('playwright');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };

  // ---------- H2 ----------
  const { browser, page, errors } = await openBattle('phone');
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy; }, null, { timeout: 60000 });
  // two turns go by, with some damage, so there is something to lose
  const before = await page.evaluate(async () => {
    const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => b.endTurn();
    const g = b.units.find((u) => u.id === 'h2'), r = b.units.find((u) => u.id === 'e4');
    g.hp -= 9; b.updateHpBar(g); r.hp -= 13; b.updateHpBar(r);
    b.endTurn(); await new Promise((res) => setTimeout(res, 1500));
    while (b.activeUnit.side !== 'hero' || b.busy) await new Promise((res) => setTimeout(res, 200));
    return { turn: b.turnCount, actor: b.activeUnit.name, gaha: g.hp, rabdul: r.hp };
  });
  await page.screenshot({ path: out + '/resume_before.png' });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => { const s = window.__game && window.__game.scene.getScene('StartScene'); return s && s.artReady; }, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/resume_title.png' });
  const offered = await page.evaluate(() => { const s = window.__game.scene.getScene('StartScene'); return !!s.continueButton; });
  check('H2 after a reload the title offers "Continue the battle"', offered);
  // tap the button where it is on the screen
  const at = await page.evaluate(() => { const s = window.__game.scene.getScene('StartScene'); const c = s.cameras.main; const real = s.scale.displaySize.width / s.scale.width; const box = s.game.canvas.getBoundingClientRect(); const o = s.continueButton; return { x: box.x + ((o.x - c.worldView.x) * c.zoom) * real, y: box.y + ((o.y - c.worldView.y) * c.zoom) * real }; });
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return window.__game.scene.isActive('BattleScene') && b.activeUnit && b.resumed; }, null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const after = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { turn: b.turnCount, actor: b.activeUnit.name, gaha: b.units.find((u) => u.id === 'h2').hp, rabdul: b.units.find((u) => u.id === 'e4').hp }; });
  await page.screenshot({ path: out + '/resume_after.png' });
  check('H2 it resumes at the start of the same turn, same fighter, same health', JSON.stringify(after) === JSON.stringify(before), JSON.stringify(before) + ' then ' + JSON.stringify(after));
  check('H2 no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();

  // ---------- H4 ----------
  const b2 = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const ctx = await b2.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p2 = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p2);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (2 * 1024 * 1024) / 8 });
  const t0 = Date.now();
  await p2.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'commit' });
  await p2.waitForFunction(() => { const s = window.__game && window.__game.scene.getScene('StartScene'); return s && s.titleText; }, null, { timeout: 120000 });
  const tTitle = (Date.now() - t0) / 1000;
  // 18.47: the title loads nothing, so "Tap to begin" is ready at once; the bar is on Start battle instead
  await p2.waitForFunction(() => { const s = window.__game.scene.getScene('StartScene'); return s && s.artReady; }, null, { timeout: 120000 });
  const tReady = (Date.now() - t0) / 1000;
  const box = await p2.locator('canvas').boundingBox();
  for (let i = 0; i < 200; i++) { // tap through the story to the character select
    if (await p2.evaluate(() => window.__game.scene.isActive('SelectScene'))) break;
    await p2.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8); await p2.waitForTimeout(250);
  }
  await p2.waitForTimeout(500);
  await p2.evaluate(() => { const s = window.__game.scene.getScene('SelectScene'); s.startBattle(s.pick); }); // Start battle
  await p2.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b && b.loadProgress > 0.05 || (b && b.units); }, null, { timeout: 120000 });
  await p2.waitForTimeout(1500);
  const mid = await p2.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { p: b.loadProgress, bar: !!(b.loadBarObjects && b.loadBarObjects.length) }; });
  await p2.screenshot({ path: out + '/loading_bar.png' });
  await p2.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b && b.units && b.activeUnit; }, null, { timeout: 300000 });
  const tBattle = (Date.now() - t0) / 1000;
  check('H4 the title is on screen in under 10 seconds on a phone connection', tTitle < 10, tTitle.toFixed(1) + ' s');
  check('H4 "Tap to begin" is ready in under 10 seconds (nothing to load for the title)', tReady < 10, tReady.toFixed(1) + ' s');
  check('H4 a progress bar shows while the battle\'s pictures load', mid.bar && mid.p > 0 && mid.p < 1, 'at ' + Math.round((mid.p || 0) * 100) + '%');
  console.log('INFO  battle on screen after ' + tBattle.toFixed(1) + ' s from opening the page (9 megabits a second, nothing cached)');
  await b2.close();
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')'); process.exit(bad ? 1 : 0);
})();
