// Screenshots of the Items menu, the target tiles and a buried pot (roadmap Phase 5).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 90; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(220);
    const k = await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(',')).catch(() => '');
    if (/BattleScene/.test(k)) break;
  }
  await page.waitForTimeout(2500);
  const out = process.argv[2];
  const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: out + '/' + n + '.png' }); };
  // put the active hero next to a hurt ally and a pot, then open the menu
  await page.evaluate(() => {
    const b = window.__game.scene.getScenes(true).find((s) => s.scene.key === 'BattleScene');
    window.__b = b;
    const hero = b.activeUnit.side === 'hero' ? b.activeUnit : b.units.find((u) => u.side === 'hero');
    const ally = b.units.find((u) => u.side === 'hero' && u !== hero);
    const pot = b.sites[0];
    const place = (u, c, r) => { u.col = c; u.row = r; };
    place(hero, pot.col + 1, pot.row); place(ally, pot.col + 1, pot.row + 1);
    b.placeEveryone();
    ally.hp = 8; b.updateHpBar(ally);
  });
  await page.evaluate(() => { const b = window.__b; b.rotateCamera && 0; b.cancelMode(); b.refreshButtons(); });
  await shot('1_board_with_pot');
  await page.evaluate(() => window.__b.onItemsButton());
  await shot('2_items_menu');
  await page.evaluate(() => window.__b.chooseItem('sheaBalm'));
  await shot('3_pick_target');
  console.log('errors', JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})();
