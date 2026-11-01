// The battle-screen batch (1 Nov) in a real browser: his clash banners (8.15),
// the menu's grip (8.16), his cursor (8.17), the turn buttons on a phone's
// sides (8.18). Needs `npx vite preview --port 4173`.
// Usage: node dev/browser/screen31.cjs <out dir>
const { chromium, devices } = require('playwright');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const report = {};
  for (const [name, opts] of [['laptop', { viewport: { width: 1440, height: 860 } }], ['phone', { ...devices['iPhone 13 landscape'] }]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await page.goto('http://localhost:4173/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const box = await page.locator('canvas').boundingBox();
    for (let i = 0; i < 90; i++) {
      if (opts.hasTouch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.75);
      else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
      await page.waitForTimeout(200);
      if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
    }
    await page.waitForTimeout(3500); // the banners load in the background
    report[name] = await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const k = (id) => b.textures.exists(id);
      return { banners: ['h1:clash/sudeen_clash.webp', 'h2:clash/gaha_clash.webp', 'e2:clash/bull_clash.webp', 'e2:clash/bull_clash_name.webp'].map(k), rotateSpots: b.rotateSpots, cursor: window.__game.canvas.style.cursor.slice(0, 60) };
    });
    await page.screenshot({ path: out + '/s31_' + name + '_start.png' });
    // the menu dragged by its grip
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      b.runEnemyTurn = () => {};
      const g = b.units.find((u) => u.label === 'H2');
      b.activeUnit = g; g.hasActed = false; b.busy = false; b.cancelMode(); b.refreshButtons(); b.placeMenu();
    });
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { x: b.menu.x, y: b.menu.y, w: b.menuSize.w, W: b.lay.W, H: b.lay.H }; });
    // game pixels to page pixels
    const sx = box.width / m.W, sy = box.height / m.H;
    const gx = box.x + (m.x + m.w / 2) * sx, gy = box.y + (m.y + 8) * sy;
    if (opts.hasTouch) {
      // a real touch drag, through the browser's own touch input
      const cdp = await ctx.newCDPSession(page);
      const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await touch('touchStart', gx, gy);
      for (let i = 1; i <= 8; i++) { await touch('touchMove', gx - (300 * sx * i) / 8, gy - (200 * sy * i) / 8); await page.waitForTimeout(16); }
      await touch('touchEnd', 0, 0);
    } else {
      await page.mouse.move(gx, gy); await page.mouse.down();
      await page.mouse.move(gx - 300 * sx, gy - 200 * sy, { steps: 8 }); await page.mouse.up();
    }
    await page.waitForTimeout(300);
    report[name].menuMoved = await page.evaluate(([x, y]) => { const b = window.__game.scene.getScene('BattleScene'); return [b.menu.x - x, b.menu.y - y, !!b.menuPin]; }, [m.x, m.y]);
    await page.screenshot({ path: out + '/s31_' + name + '_menu.png' });
    // the cursor over a figure (computers)
    if (!opts.hasTouch) {
      const fig = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((v) => v.label === 'E2'); const c = b.cameras.main; return { x: (u.view.x - c.worldView.x) * c.zoom, y: (u.view.y - u.centerY - c.worldView.y) * c.zoom }; });
      await page.mouse.move(box.x + fig.x * sx, box.y + fig.y * sy);
      await page.waitForTimeout(200);
      report[name].cursorOverFigure = await page.evaluate(() => window.__game.canvas.style.cursor.slice(0, 40));
      await page.mouse.down(); await page.waitForTimeout(100);
      report[name].cursorPressed = await page.evaluate(() => window.__game.canvas.style.cursor.slice(0, 40));
      await page.mouse.up();
    }
    // a clash with both banners: Gaha engages the bull
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const g = b.units.find((u) => u.label === 'H2'), bull = b.units.find((u) => u.label === 'E2');
      b.clashBanner(g, bull, () => {});
    });
    await page.waitForTimeout(450);
    await page.screenshot({ path: out + '/s31_' + name + '_clash.png' });
    await page.waitForTimeout(1200);
    await ctx.close();
  }
  console.log(JSON.stringify(report, null, 1));
  console.log('errors', JSON.stringify(errors.slice(0, 5)));
  await browser.close();
})();
