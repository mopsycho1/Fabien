// Roadmap 1.42: do the flames sit in their bowls on every frame? Phone view (iPhone 13).
//   node dev/browser/flame142.cjs <out dir>      (preview running on 4173)
// Writes phone.png (the whole battle) and clip_<kind>_<frame>.png: a close crop of one brazier and one
// lamp for each of the 8 flame frames, with the animation held on that frame (build the sheet with flame142_sheet.py).
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(3000);
  await page.evaluate(() => { window.__game.scene.getScene('BattleScene').runEnemyTurn = () => {}; });
  await page.screenshot({ path: `${out}/phone.png` });
  // braziers (big flames) can be off screen: centre the camera on one so it can be checked too
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene'), cam = b.cameras.main;
    const big = b.children.list.find((o) => o.texture && /^flame:\d$/.test(o.texture.key) && o.anims && o.scaleX > 0.3);
    if (big) { cam.stopFollow(); cam.centerOn(big.x, big.y - 20); }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/phone_brazier.png` });
  // flame sprites on screen, biggest = brazier, smallest = lamp
  const list = await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const cam = b.cameras.main;
    const sc = b.scale; const rect = document.querySelector('canvas').getBoundingClientRect();
    const k = rect.width / sc.width;
    return b.children.list.filter((o) => o.texture && /^flame:\d$/.test(o.texture.key) && o.anims).map((o, i) => {
      const x = (o.x - cam.worldView.x) * cam.zoom, y = (o.y - cam.worldView.y) * cam.zoom;
      return { i, sx: rect.left + x * k, sy: rect.top + y * k, h: o.displayHeight * cam.zoom * k, scale: o.scaleX };
    });
  });
  console.log('flames', list.length, JSON.stringify(list.map((f) => [Math.round(f.sx), Math.round(f.sy), f.scale.toFixed(3)])));
  const vis = list.filter((f) => f.sx > 20 && f.sx < box.width - 20 && f.sy > 60 && f.sy < box.height - 60);
  const pick = (kind) => { const s = [...vis].sort((a, b) => a.scale - b.scale); return kind === 'lamp' ? s[0] : s[s.length - 1]; };
  for (const kind of ['brazier', 'lamp']) {
    const f = pick(kind); if (!f) { console.log('no visible ' + kind); continue; }
    console.log(kind, JSON.stringify(f));
    for (let fr = 1; fr <= 8; fr++) {
      await page.evaluate(({ i, fr }) => {
        const b = window.__game.scene.getScene('BattleScene');
        const o = b.children.list.filter((o) => o.texture && /^flame:\d$/.test(o.texture.key) && o.anims)[i];
        o.anims.stop(); o.setTexture('flame:' + fr);
      }, { i: f.i, fr });
      await page.waitForTimeout(80);
      await page.screenshot({ path: `${out}/clip_${kind}_${fr}.png`, clip: { x: Math.max(0, f.sx - 45), y: Math.max(0, f.sy - 70), width: 90, height: 90 } });
    }
  }
  console.log('errors', errors.length);
  await browser.close();
})();
