// 8 Nov (roadmap 4.4): Rabdul enchanted, close up at phone size: Shango's symbol at the feet, embers
// from the weapon hand and a faint orange flicker, no picture over the body. Run with the preview up:
//   node dev/browser/enchant44.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    const u = b.units.find((x) => x.label === 'E1');
    u.status = u.status || { cooldowns: {} };
    u.status.enchant = { id: 'enchant', damage: 2, turnsLeft: 3 };
    b.refreshStatusTags();
    const t = b.children.list.find((o) => o.type === 'Text' && /^Effects:/.test(o.text));
    if (t && t.text !== 'Effects: Full') t.emit('pointerdown');
    const c = b.cameras.main; c.setZoom(4.2); c.centerOn(u.view.x, u.view.y - 40);
    return { name: u.name, aura: !!u.enchantAura, objects: u.enchantAura ? u.enchantAura.objects.length : 0, paintedFlames: u.hasEnchantedArt };
  });
  console.log(JSON.stringify(info));
  const clip = { x: 55, y: 220, width: 280, height: 380 };
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(700);
    await page.evaluate(() => { const t = window.__game.scene.getScene('BattleScene').children.list.find((o) => o.type === 'Text' && /^Effects:/.test(o.text)); if (t && t.text !== 'Effects: Full') t.emit('pointerdown'); }); /* headless is slow: keep Full */
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/rabdul_${i}.png`, clip });
  }
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
