// The reworked deaths (roadmap 16.2) in a real browser at phone size (390 x 844, WebGL):
// a fall, a wall-slam death and the gold dissolve, as numbered crops round the unit and
// three full phone screenshots. Run with the preview up (npx vite preview --port 4173):
//   node dev/browser/death.cjs <out dir>
// then build the contact sheet with: python3 dev/browser/death_sheet.py <out dir>
const { chromium } = require('playwright');
// 'enemy' or 'hero' picks the first living unit on that side (the story battle's cast can differ)
const PICK = "const pick = (b, id) => b.units.find((x) => x.side === id);";
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 5).join(' | ')));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  if (process.env.NOGLOW) await page.evaluate(() => { window.__noGlow = true; });
  await page.evaluate(() => { window.pick = (b, side) => b.units.find((x) => x.side === side); });
  console.log('renderer', await page.evaluate(() => (window.__game.renderer.type === 2 ? 'WEBGL' : 'CANVAS')));
  // a clean stage: no enemy turns, only the dying unit on show, the camera on it
  const stage = (id, col, row) => page.evaluate(({ id, col, row }) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {}; b.endTurn = () => {};
    const u = window.pick(b, id);
    for (const o of b.units) o.view.setVisible(o === u);
    u.alive = true; u.hp = u.maxHp; u.col = col; u.row = row; b.placeEveryone();
    b.manualView = true; b.goHome && b.goHome();
    return true;
  }, { id, col, row });
  // where the unit is on the page (CSS pixels), for the crops
  const where = (id) => page.evaluate((id) => {
    const b = window.__game.scene.getScene('BattleScene');
    const u = window.pick(b, id) || b.units[0];
    const cam = b.cameras.main; const r = document.querySelector('canvas').getBoundingClientRect();
    const k = r.width / b.scale.width;
    return { x: r.left + (u.view.x - cam.worldView.x) * cam.zoom * k, y: r.top + (u.view.y - cam.worldView.y) * cam.zoom * k, k: cam.zoom * k };
  }, id);
  const run = async (name, id, kick, times, fullAt) => {
    await page.waitForTimeout(600);
    // the headless browser draws slowly and screenshots take a while, so the game runs at 1/5 speed
    // and the times below are game milliseconds
    await page.evaluate((TS) => { const b = window.__game.scene.getScene('BattleScene'); b.tweens.timeScale = TS; b.time.timeScale = TS; }, 0.2);
    await page.evaluate(kick);
    const t0 = Date.now();
    let n = 0;
    for (const t of times) {
      while (Date.now() - t0 < t * 5) await page.waitForTimeout(10);
      const p = await where(id);
      const s = 190;
      if (!isFinite(p.x) || !isFinite(p.y)) { console.log('where?', JSON.stringify(p)); p.x = 195; p.y = 420; }
      const clip = { x: Math.max(0, Math.min(390 - 2 * s, p.x - s)), y: Math.max(0, Math.min(844 - 2 * s * 1.2, p.y - s * 0.95)), width: 2 * s, height: 2 * s * 1.2 };
      await page.screenshot({ path: `${out}/${name}_${String(++n).padStart(2, '0')}_${t}.png`, clip });
      if (fullAt.includes(t)) await page.screenshot({ path: `${out}/${name}_phone_${t}.png` });
    }
  };
  // 1. a fall: the bull is hit from the left, thrown back and dissolves
  await stage('enemy', 4, 4);
  await run('fall', 'enemy', () => { const b = window.__game.scene.getScene('BattleScene'); const u = window.pick(b, 'enemy'); u.hp = 0; b.defeat(u); b.playDefeat(u, 1); }, [60, 180, 320, 480, 700, 1000, 1250, 1500, 1750, 2000, 2300, 2700], [320, 1750]);
  // 2. a wall-slam death: a hero shoved into a wall to the lower right
  await stage('hero', 3, 4);
  await run('slam', 'hero', () => { const b = window.__game.scene.getScene('BattleScene'); const u = window.pick(b, 'hero'); u.hp = 0; b.defeat(u); b.playDefeat(u, -1, { levels: 0, damage: 0, slam: 2, toward: { x: 43, y: 27 } }); }, [60, 200, 330, 480, 650, 900, 1250, 1700, 2100, 2500], [330]);
  console.log('errors', JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
