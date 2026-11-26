// Leol's Barricade on the real board (1.113): the stakes when he casts it, the wall rising at the start of his next turn, and the
// wall standing, on two sides of him. Photographs each moment close up.  node dev/browser/barricade.cjs <out prefix>
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2];
  const lineUp = { hero: ['h1', 'h2', 'h3', 'h6'], enemy: ['e2', 'e3', 'e4', 'e6'], known: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'] };
  const { browser, page, errors } = await openBattle('desktop', { dsf: 2, lineUp });
  await page.waitForTimeout(1500);
  const shots = [];
  for (const side of [0, 1]) {
    await page.evaluate((side) => {
      const b = window.__game.scene.getScene('BattleScene'); const leol = b.units.find((u) => u.id === 'h6');
      b.runEnemyTurn = () => {}; b.endTurn = () => {};
      const park = [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [9, 0], [0, 1], [10, 1]]; let k = 0;
      for (const u of b.units) if (u !== leol) { const p = park[k++]; b.placeUnit(u, p[0], p[1]); }
      for (const sp of (b.spikes || []).slice()) b.removeSpike(sp);
      b.placeUnit(leol, 5, 6); leol.status.cooldowns = {}; leol.hasActed = false; b.activeUnit = leol;
      const tile = side ? { col: 6, row: 6 } : { col: 5, row: 7 };
      window.__tile = tile;
      b.busy = true; b.castSpell(leol, tile, 'barricade', () => { b.busy = false; });
      b.manualView = true; b.cameras.main.setZoom(3); b.cameras.main.centerOn(leol.view.x + 20, leol.view.y - 20);
    }, side);
    await page.waitForTimeout(1000);
    shots.push(out + '_side' + side + '_1stakes.png'); await page.screenshot({ path: shots[shots.length - 1], clip: { x: 420, y: 150, width: 600, height: 600 } });
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.tickNewClasses(b.units.find((u) => u.id === 'h6')); });
    await page.waitForTimeout(120);
    shots.push(out + '_side' + side + '_2rising.png'); await page.screenshot({ path: shots[shots.length - 1], clip: { x: 420, y: 150, width: 600, height: 600 } });
    await page.waitForTimeout(800);
    shots.push(out + '_side' + side + '_3standing.png'); await page.screenshot({ path: shots[shots.length - 1], clip: { x: 420, y: 150, width: 600, height: 600 } });
  }
  console.log(shots.join('\n'));
  console.log('page errors: ' + errors.length);
  await browser.close();
})();
