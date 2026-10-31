// The menu stepping aside (roadmap 8.9), in a real browser on a laptop-sized screen.
const { chromium } = require('playwright');
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
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const U = (l) => b.units.find((u) => u.label === l);
    b.runEnemyTurn = () => {};
    const sud = U('H1');
    const spots = { H1: [5, 3], H2: [6, 4], H3: [4, 4], E1: [5, 4], E2: [3, 6], E3: [2, 6] };
    for (const [l, [c, r]] of Object.entries(spots)) { const u = U(l); u.col = c; u.row = r; }
    b.placeEveryone();
    b.activeUnit = sud; sud.hasActed = false; sud.hasMoved = false; sud.stepsUsed = 0; b.busy = false; b.cancelMode();
    b.refreshButtons(); b.refreshCard(sud); b.refreshTurnStrip();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: process.argv[2] + '/menu_1.png' });
  await page.evaluate(() => window.__game.scene.getScene('BattleScene').onAttackButton());
  await page.waitForTimeout(400);
  await page.screenshot({ path: process.argv[2] + '/menu_2.png' });
  console.log(JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})();
