// Retry check (22 Nov, video 1818): the first download of each of Alagara's standing pictures is cut off;
// the battle must still show him as a picture (not the fallback circle "H5"). Ends with ALL PASSED or FAILED.
// Run with the preview going: node dev/browser/retry_art.cjs
const { chromium } = require('playwright');
(async () => {
  let ok = true;
  for (const view of ['desktop', 'phone']) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext(view === 'desktop' ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const cut = new Set();
    await page.route(/alagara_stand_f\d\.webp/, (route) => {
      const u = route.request().url();
      if (!cut.has(u)) { cut.add(u); return route.abort('connectionreset'); }
      return route.continue();
    });
    await page.addInitScript(() => {
      window.__skipSelect = true; window.__noPrefetch = true;
      localStorage.setItem('fabien.lineup', JSON.stringify({ hero: ['h1', 'h2', 'h3', 'e3'], enemy: ['h5', 'e4', 'e2', 'e5'], known: ['h1', 'h2', 'h3', 'h4', 'h5', 'e1', 'e2', 'e3', 'e4', 'e5'] }));
    });
    await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/');
    await page.waitForTimeout(2500);
    const box = await page.locator('canvas').boundingBox();
    for (let i = 0; i < 200; i++) {
      if (view === 'desktop') await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.8); else await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
      await page.waitForTimeout(250);
      if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
    }
    await page.waitForTimeout(2000);
    const h5 = await page.evaluate(() => { const u = window.__game.scene.getScene('BattleScene').units.find((x) => x.id === 'h5'); return u ? !!u.sprite : null; });
    const pass = h5 === true && cut.size > 0;
    console.log((pass ? 'PASS ' : 'FAIL ') + view + ': cut ' + cut.size + ' downloads, Alagara drawn as a picture: ' + h5);
    ok = ok && pass;
    await browser.close();
  }
  console.log(ok ? 'ALL PASSED' : 'FAILED');
})();
