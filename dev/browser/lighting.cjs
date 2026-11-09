// Roadmap 1.38: lighting test. Same battle, plain vs ?light, phone size, plus frame rate.
//   node dev/browser/lighting.cjs <out dir>      (preview running on 4173)
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = {};
  for (const mode of ['plain', 'lit']) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://localhost:4173/' + (mode === 'lit' ? '?light' : ''), { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const box = await page.locator('canvas').boundingBox();
    for (let i = 0; i < 40; i++) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
      await page.waitForTimeout(250);
      if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
    }
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__game.scene.getScene('BattleScene').runEnemyTurn = () => {}; });
    await page.screenshot({ path: `${out}/${mode}_1_calm.png` });
    // Fury on Gaha (h2) and Enchant on a hero, so auras are in the picture
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const g = b.units.find((u) => u.id === 'h2') || b.units[0];
      g.status = g.status || { cooldowns: {} };
      g.status.buff = { id: 'fury', turnsLeft: 3 };
      b.refreshStatusTags && b.refreshStatusTags();
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${mode}_2_fury.png` });
    // a lightning bolt across the board
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const [a, c] = [b.units.find((u) => u.side === 'hero'), b.units.find((u) => u.side === 'enemy')];
      const fx = require_lightning(b, a, c);
      function require_lightning(b, a, c) { b.events.emit('bolt', c.view.x, c.view.y - 40); return 1; }
    });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${out}/${mode}_3_bolt.png` });
    await page.waitForTimeout(1500);
    // close-up on Gaha, then on an enemy (they face the other way: their picture is mirrored)
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'h2'); const c = b.cameras.main; c.setZoom(3); c.centerOn(g.view.x, g.view.y - 40); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${mode}_4_gaha.png` });
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const e = b.units.find((u) => u.side === 'enemy'); const c = b.cameras.main; c.centerOn(e.view.x, e.view.y - 40); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${mode}_5_enemy.png` });
    await page.evaluate(() => { const c = window.__game.scene.getScene('BattleScene').cameras.main; c.setZoom(1); });
    // frame rate over 6 seconds
    const fps = await page.evaluate(() => new Promise((res) => {
      const g = window.__game; const t0 = performance.now(); let n = 0;
      const tick = () => { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(tick); else res(n / 6); };
      requestAnimationFrame(tick);
    }));
    const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
    report[mode] = { fps: +fps.toFixed(1), gl, errors: errors.slice(0, 4) };
    await ctx.close();
  }
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
