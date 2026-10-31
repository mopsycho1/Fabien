// Screenshots of the battle in three screen shapes (roadmap 8.1).
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const out = {};
  const shapes = [
    ['desktop', { viewport: { width: 1440, height: 860 } }],
    ['phone_sideways', { ...devices['iPhone 13 landscape'] }],
    ['phone_upright', { ...devices['iPhone 13'] }],
  ];
  for (const [name, opts] of shapes) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('http://localhost:4173/', { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const box = await page.locator('canvas').boundingBox();
    for (let i = 0; i < 90; i++) {
      if (opts.hasTouch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.75);
      else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
      await page.waitForTimeout(220);
      const k = await page.evaluate(() => { const g = window.__game; return g ? g.scene.getScenes(true).map((s) => s.scene.key).join(',') : ''; }).catch(() => '');
      if (/BattleScene/.test(k)) break;
    }
    await page.waitForTimeout(2600);
    await page.screenshot({ path: process.argv[2] + '/' + name + '.png' });
    const size = await page.evaluate(() => { const g = window.__game; return g.scale.width + 'x' + g.scale.height; });
    out[name] = { size, errors: errors.slice(0, 4) };
    await ctx.close();
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
