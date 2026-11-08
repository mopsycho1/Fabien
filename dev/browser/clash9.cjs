// Layra against the female archer: the two banners cut on 9 Nov (roadmap 6.35). Run: node dev/browser/clash9.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(5000);
  // put Gaha next to the bull and engage
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const U = (l) => b.units.find((u) => u.label === l);
    const g = U('H3'), bull = U('E3');
    const place = (u, c, r) => { u.col = c; u.row = r; b.placeEveryone(); };
    b.runEnemyTurn = () => {};
    place(g, 3, 4); place(bull, 3, 3);
    b.clashBanner(g, bull, () => {}); // both banners face to face
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: process.argv[2] + '/clash9_1.png' });
  await page.waitForTimeout(450);
  await page.screenshot({ path: process.argv[2] + '/clash9_2.png' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: process.argv[2] + '/clash9_3.png' });
  console.log(JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})();
