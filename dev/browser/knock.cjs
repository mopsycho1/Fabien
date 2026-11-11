// One knockback (roadmap 18.1) in a real browser: falls of 1 and 2 levels to both sides, a fall
// away from the camera, a lethal fall, and a wall slam (lived through and lethal), as numbered
// crops round the unit. Run with the preview up (npx vite preview --port 4173):
//   node dev/browser/knock.cjs <out dir> [desktop]
// then build the contact sheet: python3 dev/browser/knock_sheet.py <out dir>
// "desktop" uses a 1440 x 900 window instead of the phone (390 x 844).
const { chromium } = require('playwright');
// each case: who is pushed (unit id), the tile it stands on, the tile of whoever pushes, its health
const CASES = [
  { name: 'a_gaha_1level_right', id: 'h2', at: [5, 4], by: [4, 4] },
  { name: 'b_gaha_2levels_left', id: 'h2', at: [3, 5], by: [3, 4] },
  { name: 'c_foe_2levels_right', id: 'foe', at: [5, 3], by: [4, 3] },
  { name: 'd_archer_1level_away', id: 'e3', at: [4, 3], by: [4, 4] },
  { name: 'e_sudeen_1level_left', id: 'h1', at: [4, 5], by: [4, 4] },
  { name: 'f_archer_2levels_lethal', id: 'e3', at: [5, 3], by: [4, 3], hp: 2 },
  { name: 'g_gaha_slam', id: 'h2', at: [2, 3], by: [1, 3] },
  { name: 'h_foe_slam_lethal', id: 'foe', at: [2, 3], by: [1, 3], hp: 1 },
];
const TIMES = [40, 110, 180, 250, 320, 400, 480, 580, 700, 850, 1000, 1250];
(async () => {
  const out = process.argv[2] || '.';
  const desktop = process.argv[3] === 'desktop';
  const size = desktop ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: size, deviceScaleFactor: desktop ? 1 : 2, isMobile: !desktop, hasTouch: !desktop })).newPage();
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
  // 'foe' = the first enemy fighter that is not the archer (who fights can change per map)
  await page.evaluate(() => { window.who = (b, id) => b.units.find((x) => (id === 'foe' ? x.side === 'enemy' && x.id !== 'e3' : x.id === id) && x.view && x.view.active); });
  const where = (id) => page.evaluate((id) => {
    const b = window.__game.scene.getScene('BattleScene');
    const u = window.who(b, id);
    if (!u) return { x: NaN, y: NaN }; // it has dissolved
    const cam = b.cameras.main; const r = document.querySelector('canvas').getBoundingClientRect();
    const k = r.width / b.scale.width;
    return { x: r.left + (u.view.x - cam.worldView.x) * cam.zoom * k, y: r.top + (u.view.y - cam.worldView.y) * cam.zoom * k };
  }, id);
  for (const c of CASES) {
    // a clean stage: no turns, the others parked out of the way, only this unit on show
    const info = await page.evaluate((c) => {
      const b = window.__game.scene.getScene('BattleScene');
      b.runEnemyTurn = () => {}; b.endTurn = () => {};
      b.setSpeed('shots', 1);
      const u = window.who(b, c.id);
      if (!u || !u.view.active) return null;
      let n = 0;
      for (const o of b.units) { if (o !== u) { o.col = n++; o.row = 8; } o.view.setVisible(o === u); }
      u.alive = true; u.hp = u.maxHp; u.col = c.at[0]; u.row = c.at[1]; u.knockPending = false;
      b.placeEveryone(); b.showStanding(u);
      b.manualView = true; b.focusCamera && b.focusCamera(u.view.x, u.view.y, b.cameras.main.zoom, 1);
      return u.name;
    }, c);
    if (!info) { console.log('skipped', c.name); continue; }
    await page.waitForTimeout(700);
    // the headless browser draws slowly, and a screenshot takes about a second, so the game runs at 1/25 speed; TIMES are game milliseconds
    const what = await page.evaluate((c) => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = window.who(b, c.id);
      b.setSpeed('shots', 0.04);
      if (c.hp) u.hp = c.hp;
      const x0 = u.view.x;
      const pushed = b.pushLoser(u, { col: c.by[0], row: c.by[1] }, 1);
      const awayX = pushed.path.length ? (u.col - c.at[0]) - (u.row - c.at[1]) : pushed.fall.toward.x;
      b.knockBack(u, pushed, awayX, { text: 'Knocked back!', color: '#ff9a6a' });
      return JSON.stringify({ path: pushed.path.length, fall: pushed.fall, hp: u.hp });
    }, c);
    console.log(c.name, what);
    const t0 = Date.now();
    let n = 0; let last = null;
    for (const t of TIMES) {
      while (Date.now() - t0 < t * 25) await page.waitForTimeout(10);
      let p = await where(c.id);
      if (!isFinite(p.x) && last) p = last;
      last = p;
      const s = desktop ? 150 : 190;
      if (!isFinite(p.x)) { p.x = size.width / 2; p.y = size.height / 2; }
      const clip = { x: Math.max(0, Math.min(size.width - 2 * s, p.x - s)), y: Math.max(0, Math.min(size.height - 2 * s, p.y - s * 1.2)), width: 2 * s, height: 2 * s };
      await page.screenshot({ path: `${out}/${c.name}_${String(++n).padStart(2, '0')}_${t}.png`, clip });
      if (t === 250) await page.screenshot({ path: `${out}/${c.name}_full.png` });
    }
    await page.waitForTimeout(4000);
  }
  console.log('errors', JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
