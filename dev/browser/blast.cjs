// Tayo's Element Blast in a real browser (roadmap 13.4): fire and water, screenshots through the cast.
// Run with the preview up: node dev/browser/blast.cjs <out dir>
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
  for (const kind of ['fire', 'water']) {
    const info = await page.evaluate((kind) => {
      const b = window.__game.scene.getScene('BattleScene');
      const tayo = b.units.find((u) => u.id === 'e1');
      const sud = b.units.find((u) => u.id === 'h1');
      if (!tayo) return { error: 'no Tayo on the field', ids: b.units.map((u) => u.id) };
      b.runEnemyTurn = () => {};
      tayo.alive = true; tayo.hp = tayo.maxHp; sud.hp = sud.maxHp; sud.hidden = false;
      for (const u of b.units) if (u !== tayo && u !== sud) u.view.setVisible(false);
      tayo.col = 4; tayo.row = 3; sud.col = 4; sud.row = 6; b.placeEveryone();
      tayo.status = tayo.status || {}; sud.status = sud.status || {};
      if (kind === 'fire') tayo.status.enchant = { id: 'enchant', damage: 2, turnsLeft: 3 };
      else tayo.status.drenched = { turnsLeft: 2 };
      b.refreshStatusTags();
      b.activeUnit = tayo; b.busy = true;
      const hp0 = sud.hp;
      b.castElementBlast(tayo, sud, undefined, () => { b.busy = false; });
      return { hp0, target: sud.hp, x: (tayo.view.x + sud.view.x) / 2, y: (tayo.view.y + sud.view.y) / 2 };
    }, kind);
    console.log(kind, JSON.stringify(info));
    if (info.error) break;
    for (const [t, name] of [[420, 'dust'], [280, 'charge'], [300, 'punch'], [250, 'hit']]) {
      await page.waitForTimeout(t);
      await page.screenshot({ path: `${out}/blast_${kind}_${name}.png` });
    }
    await page.waitForTimeout(1500);
    console.log(kind, JSON.stringify(await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const t = b.units.find((u) => u.id === 'e1'), s = b.units.find((u) => u.id === 'h1');
      return { tayoEnchant: !!(t.status && t.status.enchant), tayoDrenched: !!(t.status && t.status.drenched), sudBurn: !!(s.status && s.status.burn), sudDrenched: !!(s.status && s.status.drenched), sudHp: s.hp };
    })));
  }
  console.log('errors', JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})();
