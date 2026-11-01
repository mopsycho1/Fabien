// Phase 11: the Hidden Cavern in a real browser, laptop and phone shapes.
// Needs `npx vite preview --port 4173`. Usage: node dev/browser/cavern.cjs <out dir> [rotate]
const { chromium, devices } = require('playwright');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const shapes = [['laptop', { viewport: { width: 1440, height: 860 } }], ['phone', { ...devices['iPhone 13 landscape'] }], ['portrait', { ...devices['iPhone 13'] }]];
  for (const [name, opts] of shapes) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await page.goto('http://localhost:4173/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const box = await page.locator('canvas').boundingBox();
    for (let i = 0; i < 90; i++) {
      if (opts.hasTouch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.75);
      else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
      await page.waitForTimeout(200);
      if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out + '/cav_' + name + '.png' });
    if (name === 'laptop' && process.argv[3]) {
      for (let r = 1; r <= 3; r++) {
        await page.evaluate(() => window.__game.scene.getScene('BattleScene').rotateCamera(1));
        await page.waitForTimeout(700);
        await page.screenshot({ path: out + '/cav_laptop_rot' + r + '.png' });
      }
    }
    await ctx.close();
  }
  console.log('errors', JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})();
