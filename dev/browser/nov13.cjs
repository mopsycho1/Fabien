// 13 Nov batch (roadmap 1.34): the archer's Smoke Bomb cloud in a real browser, at phone size.
// Shows the growing cloud (puffs rolling up), the drifting cloud a moment later, and the
// dissipating frames as it clears. Run with the preview up (npx vite preview --port 4173):
//   node dev/browser/nov13.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  // a phone-sized screen (390 by 844, like an iPhone 14)
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
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
  await page.waitForTimeout(2500);
  // the archer (E3) in the open, zoomed in on her tile
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const U = (l) => b.units.find((u) => u.label === l);
    b.runEnemyTurn = () => {};
    const a = U('E3');
    a.col = 3; a.row = 3; b.placeEveryone();
    const c = b.cameras.main; c.setZoom(2.6); c.centerOn(a.view.x, a.view.y - 20);
    window.__smokeTile = { col: 3, row: 3 };
  });
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const a = b.units.find((u) => u.label === 'E3');
    b.busy = true;
    b.castSmokeBomb(a, { col: 3, row: 3 }, () => { b.busy = false; });
  });
  await page.waitForTimeout(350); await shot('smoke_1_growing_350ms');
  await page.waitForTimeout(900); await shot('smoke_2_full_1250ms');
  await page.waitForTimeout(1400); await shot('smoke_3_drifting_2650ms');
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const a = b.units.find((u) => u.label === 'E3'); b.wakeSmoke(a); });
  await page.waitForTimeout(120); await shot('smoke_4_clearing_120ms');
  await page.waitForTimeout(260); await shot('smoke_5_clearing_380ms');
  await page.waitForTimeout(600); await shot('smoke_6_gone');
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
