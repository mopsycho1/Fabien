// The Aegis dome on the real board (1.104): Alagara's shield raised on one fighter, photographed close. node dev/browser/aegis.cjs <out.png> [unit id]
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const [out, id] = process.argv.slice(2);
  const { browser, page } = await openBattle('desktop', { dsf: 2, lineUp: { hero: ['h1', 'h2', 'h3', 'h5'], enemy: ['e2', 'e3', 'e4', 'e5'], known: ['h1','h2','h3','h4','h5','h6','e1','e2','e3','e4','e5','e6'] } });
  await page.waitForTimeout(1500);
  await page.evaluate((id) => {
    const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === (id || 'h1'));
    u.shield = { hp: 8, max: 8, turnsLeft: 3 }; b.syncShieldDome(u, true);
    b.manualView = true; b.cameras.main.setZoom(2.5); b.cameras.main.centerOn(u.view.x, u.view.y - 50);
  }, id);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out, clip: { x: 420, y: 150, width: 600, height: 600 } });
  await browser.close();
})();
