// 8 Nov batch (roadmap 1.37): the Blender Earth Drive wall at phone size (390 x 844): erupt, stand, crumble.
// Run with the preview up (npx vite preview --port 4173):  node dev/browser/spike_anim.cjs <out dir>
const { chromium } = require('playwright');
const SPELL = require('../../src/data/spells.json').earthDrive;
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  // Tayo drives a spike under a foe next to him, camera close on that tile
  const info = await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    const tayo = b.units.find((u) => u.label === 'E1');
    const foe = b.units.find((u) => u.side !== tayo.side && u.alive);
    // Tayo steps up next to the foe
    tayo.col = foe.col; tayo.row = foe.row - 1; b.placeEveryone();
    b.__tayo = tayo; b.__foe = foe;
    if (b.menu) b.menu.setVisible(false);
    return { tayo: [tayo.col, tayo.row], foe: [foe.col, foe.row] };
  });
  console.log(JSON.stringify(info));
  // phone-size screenshot, cropped round the foe's tile (where the wall stands)
  const shot = async (name, wait) => {
    await page.waitForTimeout(wait);
    const r = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const c = b.cameras.main; const f = b.__foe.view; const rect = window.__game.canvas.getBoundingClientRect(); const k = rect.width / c.width; return { x: rect.left + (f.x - c.worldView.x) * c.zoom * k, y: rect.top + (f.y - c.worldView.y) * c.zoom * k }; });
    const clip = { x: Math.max(0, r.x - 110), y: Math.max(0, r.y - 170), width: 220, height: 230 };
    await page.screenshot({ path: `${out}/${name}.png`, clip });
  };
  await page.evaluate((spell) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.castEarthDrive(b.__tayo, b.__foe, spell, () => {});
  }, SPELL);
  // the fist lands about 300 ms in; the 8 erupt frames take 400 ms after that
  await shot('1_erupt_early', 420);
  await shot('2_erupt_late', 220);
  await shot('3_stand', 1200);
  console.log('spike texture:', await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.spikes.map((s) => s.view && s.view.texture.key); }));
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.time.timeScale = 0.2; b.spikes.slice().forEach((s) => b.removeSpike(s)); }); // slowed so the slow screenshots catch the frames
  await shot('4_crumble_early', 300);
  await shot('5_crumble_mid', 400);
  await shot('6_crumble_late', 600);
  await page.evaluate(() => { window.__game.scene.getScene('BattleScene').time.timeScale = 1; });
  await shot('7_gone', 1500);
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
