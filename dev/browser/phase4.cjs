// Phase 4 in a real browser (laptop): Rabdul's Enchant flying to the bull,
// the bull and the archer enchanted, Tayo's Earth Drive and the spike wall.
// Needs `npx vite preview --port 4173`. Usage: node dev/browser/phase4.cjs <out dir>
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 860 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 90; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + '/p4_start.png' });
  const setup = (spots) => page.evaluate((spots) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {}; b.endTurn = () => {};
    for (const [l, [c, r]] of Object.entries(spots)) { const u = b.units.find((v) => v.label === l); u.col = c; u.row = r; }
    b.placeEveryone(); b.busy = false; b.cancelMode();
  }, spots);
  // Enchant: Rabdul on the bull
  await setup({ E1: [3, 2], E2: [5, 3], E3: [4, 0], E4: [6, 1] });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const r = b.units.find((u) => u.label === 'E1'), bull = b.units.find((u) => u.label === 'E2');
    b.activeUnit = r; b.followUnit(r);
    b.castEnchant(r, bull, { name: 'Enchant', color: '#ff8a3c', damage: 2 }, () => {});
  });
  await page.waitForTimeout(450);
  await page.screenshot({ path: out + '/p4_chant.png' });
  await page.waitForTimeout(520);
  await page.screenshot({ path: out + '/p4_sigil.png' });
  await page.waitForTimeout(1800);
  // the archer enchanted too, then the look
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const a = b.units.find((u) => u.label === 'E3');
    a.status = a.status || {}; a.status.enchant = { damage: 2, turnsLeft: 3 };
    b.refreshStatusTags(); for (const u of b.units) b.showStanding(u);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '/p4_enchanted.png' });
  // Earth Drive: Tayo on Gaha
  await setup({ E4: [3, 7], H2: [4, 7], H1: [6, 8], H3: [1, 7] });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const t = b.units.find((u) => u.label === 'E4'), g = b.units.find((u) => u.label === 'H2');
    b.activeUnit = t; b.followUnit(t);
    b.castEarthDrive(t, g, { name: 'Earth Drive', color: '#d9a066', damageShare: 0.5, push: 1, turns: 2 }, () => {});
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/p4_drive.png' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/p4_wall.png' });
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
  await browser.close();
})();
