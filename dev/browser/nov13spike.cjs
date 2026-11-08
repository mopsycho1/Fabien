// 13 Nov batch (roadmap 1.35): an Earth Drive spike on the cavern's waterfall edge, in a real
// browser, zoomed in. Shows the spike on the top tile of each waterfall and on the tile below it,
// so the depth against the platform edge and the falling water can be seen.
// Run with the preview up (npx vite preview --port 4173):
//   node dev/browser/nov13spike.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 860 } })).newPage();
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
  // a spike on a raised edge tile (3,5), then on flat ground (2,3)
  const place = (col, row) => page.evaluate(({ col, row }) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    const tayo = b.units.find((u) => u.label === 'E1');
    const img = b.add.image(0, 0, 'fx:spike_2').setOrigin(0.5, 1).setTint(0xb89a80); // the same anchor as raiseSpike (1.35)
    img.setScale(0.5);
    b.spikes.push({ col, row, owner: tayo, turnsLeft: 2, view: img });
    b.placeEveryone();
    const p = b.units.find((u) => u.label === 'E1');
    const c = b.cameras.main; c.setZoom(2.6);
    return true;
  }, { col, row });
  const zoomOn = (col, row) => page.evaluate(({ col, row }) => {
    const b = window.__game.scene.getScene('BattleScene');
    const c = b.cameras.main;
    const sp = b.spikes[b.spikes.length - 1];
    c.setZoom(3); c.centerOn(sp.view.x, sp.view.y - 30);
    if (b.menu) b.menu.setVisible(false); // the action menu hides the spot
    return true;
  }, { col, row });
  await place(3, 5);
  await zoomOn(3, 5);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/spike_on_top_tile_3_5.png` });
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.spikes.forEach((s) => s.view && s.view.destroy()); b.spikes = []; });
  await place(2, 3);
  await zoomOn(2, 3);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/spike_on_flat_tile_2_3.png` });
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
