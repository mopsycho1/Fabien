// Effects flair 16.1 (steps 1 to 5) on a phone-size screen (390 x 844): Fury, Slow, Stone and Swift
// loops on four units, one shot each plus a Light shot, and the frame rate. Run with the preview up
// (npx vite preview --port 4173):  node dev/browser/flair.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  const setMode = (want) => page.evaluate((want) => {
    const t = window.__game.scene.getScene('BattleScene').children.list.find((o) => o.type === 'Text' && /^Effects:/.test(o.text));
    if (t.text !== 'Effects: ' + want) t.emit('pointerdown');
  }, want);
  const shot = async (name, label, buff, hex, zoom) => {
    await page.evaluate(({ label, buff, hex, zoom }) => {
      const b = window.__game.scene.getScene('BattleScene');
      b.runEnemyTurn = () => {};
      for (const u of b.units) { u.status = u.status || { cooldowns: {} }; u.status.buff = null; u.status.hex = null; }
      const u = b.units.find((x) => x.label === label);
      if (buff) u.status.buff = { id: buff, turnsLeft: 3, power: 1 };
      if (hex) u.status.hex = { id: 'slow', turnsLeft: 2, power: 1 };
      b.refreshStatusTags();
      const c = b.cameras.main; c.setZoom(zoom); c.centerOn(u.view.x, u.view.y - 30);
    }, { label, buff, hex, zoom });
    await setMode('Full');
    await page.waitForTimeout(1800);
    await setMode('Full'); // headless draws at 10 to 20 fps, so the automatic Light would flip it back: restart its 3 second count
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}.png` });
  };
  const fps = await page.evaluate(() => window.__game.loop.actualFps);
  await shot('fury', 'H1', 'fury', false, 2.2);
  await shot('slow', 'H2', null, true, 2.2);
  await shot('stone', 'H3', 'stone', false, 2.2);
  await shot('swift', 'E1', 'swiftness', false, 2.2);
  // all four at once on the whole board, then Light
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const m = { H1: 'fury', H3: 'stone', E1: 'swiftness' };
    for (const u of b.units) { u.status = u.status || { cooldowns: {} }; u.status.buff = m[u.label] ? { id: m[u.label], turnsLeft: 3, power: 1 } : null; u.status.hex = u.label === 'H2' ? { id: 'slow', turnsLeft: 2, power: 1 } : null; }
    b.refreshStatusTags();
    b.cameras.main.setZoom(1);
  });
  await setMode('Full');
  await page.waitForTimeout(1800);
  await setMode('Full');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/board_full.png` });
  const avgFps = async () => { let t = 0; for (let i = 0; i < 6; i++) { t += await page.evaluate(() => window.__game.loop.actualFps); await page.waitForTimeout(350); } return Math.round(t / 6); };
  const fpsFull = await avgFps();
  await setMode('Light');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/board_light.png` });
  const fpsLight = await avgFps();
  const mode = 'Light';
  console.log(JSON.stringify({ fpsAtStart: fps, fpsFullWith4Loops: fpsFull, fpsLight, note: 'headless software rendering, so absolute numbers are low', errors: errors.slice(0, 5) }));
  await browser.close();
})();
