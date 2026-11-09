// Roadmap 13.31: Tayo's Sonic Clap on a phone (iPhone 13, landscape): the ring and dust as it goes off,
// then the foes knocked back. Run with the preview up (npx vite preview --port 4173):
//   node dev/browser/clap.cjs <out dir>
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  // the headless browser is slow, which would flip the game to Light effects by itself: tell it 60 frames a second
  await page.evaluate(() => { Object.defineProperty(window.__game.loop, 'actualFps', { get: () => 60, set: () => {} }); });
  await page.waitForTimeout(4000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  // line Tayo up with two heroes in reach (one a tile away, one two tiles away), and clap
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {}; b.endTurn = () => {};
    const tayo = b.units.find((u) => u.job === 'bruiser') || b.units.find((u) => u.label === 'E1');
    const heroes = b.units.filter((u) => u.side === 'hero');
    const put = (u, c, r) => { u.col = c; u.row = r; };
    put(tayo, 4, 4); put(heroes[0], 5, 4); put(heroes[1], 4, 6); if (heroes[2]) put(heroes[2], 1, 7);
    b.placeEveryone();
    b.activeUnit = tayo; b.busy = true; b.cancelMode && b.cancelMode();
    window.__tayo = tayo;
    const c = b.cameras.main; c.setZoom(1.6); c.centerOn(tayo.view.x, tayo.view.y - 20);
    b.castClap(tayo, { name: 'Sonic Clap', color: '#e8c08a', range: 2, damageShare: 0.3, push: 1 }, () => {});
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/clap_phone_1_wave.png` });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/clap_phone_2_ring.png` });
  await page.waitForTimeout(420);
  await page.screenshot({ path: `${out}/clap_phone_3_knockback.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/clap_phone_4_after.png` });
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
