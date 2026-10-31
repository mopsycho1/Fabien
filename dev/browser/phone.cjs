const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const name of ['iPhone 13', 'Pixel 7']) {
    const ctx = await browser.newContext({ ...devices[name] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('requestfailed', (r) => errors.push('failed: ' + r.url()));
    const t0 = Date.now();
    await page.goto('http://localhost:4173/', { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: process.argv[2] + '/phone_' + name.replace(' ', '_') + '_title.png' });
    // tap to start, then skip through to the battle
    const box = await page.locator('canvas').boundingBox();
    for (let i = 0; i < 40; i++) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
      await page.waitForTimeout(250);
      const inBattle = await page.evaluate(() => { const g = window.__game || (window.Phaser && Phaser.GAMES && Phaser.GAMES[0]); if (!g) return 'nogame'; return g.scene.getScenes(true).map((s) => s.scene.key).join(','); }).catch(() => 'x');
      if (/BattleScene/.test(inBattle)) break;
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: process.argv[2] + '/phone_' + name.replace(' ', '_') + '_battle.png' });
    out[name] = { ms: Date.now() - t0, errors: errors.slice(0, 5) };
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
