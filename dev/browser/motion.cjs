// Motion polish (roadmap 14.1... see ROADMAP): glide, breathing pause, attack weight, in a real browser.
// Run with the preview up: node dev/browser/motion.cjs <out dir>
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
  // breathing runs while idle
  const idle = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { paused: b.breathPaused, playing: b.units.filter((u) => u.idleTween && u.idleTween.isPlaying()).length }; });
  console.log('idle', JSON.stringify(idle));
  // walk the active hero and sample position + pause state mid-walk
  const walk = await page.evaluate(async () => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    const u = b.activeUnit.side === 'hero' ? b.activeUnit : b.units.find((x) => x.side === 'hero');
    b.activeUnit = u;
    const tiles = require_tiles(b, u);
    function require_tiles(b, u) { const k = [...(b.reachableKeys || [])]; return k; }
    b.startMove(true);
    const far = [...b.reachableKeys].map((k) => k.split(',').map(Number)).sort((a, c) => Math.abs(c[0] - u.col) + Math.abs(c[1] - u.row) - Math.abs(a[0] - u.col) - Math.abs(a[1] - u.row))[0];
    b.moveUnit(u, far[0], far[1]);
    const xs = [];
    for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 90)); xs.push(Math.round(u.view.x) + ',' + Math.round(u.view.y)); }
    return { xs, pausedDuring: b.breathPaused };
  });
  console.log('walk', JSON.stringify(walk));
  await page.screenshot({ path: `${out}/motion_walk.png` });
  await page.waitForTimeout(1500);
  console.log('after walk paused=', await page.evaluate(() => window.__game.scene.getScene('BattleScene').breathPaused));
  console.log('errors', errors.length ? errors : 'none');
  await browser.close();
})();
