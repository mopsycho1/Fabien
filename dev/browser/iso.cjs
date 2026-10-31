// Phase 9: the new isometric pictures in a real browser (laptop and phone shapes).
// Needs `npx vite preview --port 4173`. Usage: node dev/browser/iso.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [name, vp, mobile] of [['laptop', { width: 1440, height: 860 }, false], ['phone', { width: 844, height: 390 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await page.goto('http://localhost:4173/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const box = await page.locator('canvas').boundingBox();
    for (let i = 0; i < 90; i++) {
      if (mobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.75);
      else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
      await page.waitForTimeout(200);
      if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: process.argv[2] + '/iso_' + name + '_start.png' });
    // everyone close together, Layra under a Verse, Gaha about to walk
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const U = (l) => b.units.find((u) => u.label === l);
      b.runEnemyTurn = () => {};
      const spots = { H1: [3, 4], H2: [4, 5], H3: [2, 6], E1: [4, 3], E2: [3, 3], E3: [5, 2] };
      for (const [l, [c, r]] of Object.entries(spots)) { const u = U(l); u.col = c; u.row = r; }
      b.placeEveryone();
      for (const u of b.units) { u.facing = u.side === 'hero' ? 'upRight' : 'downLeft'; b.showStanding(u); }
      const g = U('H2'); b.activeUnit = g; g.hasActed = false; g.hasMoved = false; g.stepsUsed = 0; b.busy = false; b.cancelMode();
      b.refreshButtons(); b.refreshCard(g); b.refreshTurnStrip();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: process.argv[2] + '/iso_' + name + '_close.png' });
    await ctx.close();
  }
  console.log(JSON.stringify(errors.slice(0, 5)));
  await browser.close();
})();
