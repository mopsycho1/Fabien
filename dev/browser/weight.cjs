// M9 (roadmap 18.9, checklist F1 and F2): three frames of a hit (white flash, pale chunk on the
// bar, the number) for a small and a big hit, and the turn banner for a hero and an enemy.
//   node dev/browser/weight.cjs <out dir> [phone|desktop]      (with the preview running)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const view = process.argv[3] || 'phone';
  const { browser, page, errors } = await openBattle(view);
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy; }, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {}; const g = b.units.find((u) => u.id === 'h2'), r = b.units.find((u) => u.id === 'e4'); b.placeUnit(g, 4, 5); b.placeUnit(r, 4, 4); b.followUnit(g); });
  await page.waitForTimeout(700);
  for (const dmg of [3, 14]) {
    await page.evaluate((dmg) => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'h2'), r = b.units.find((u) => u.id === 'e4'); r.hp -= dmg; b.showImpact(g, r, { hit: true, damage: dmg }, 1); }, dmg);
    for (const [i, wait] of [[1, 40], [2, 260], [3, 700]]) { await page.waitForTimeout(wait); await page.screenshot({ path: out + '/hit' + dmg + '_' + i + '.png' }); }
    await page.waitForTimeout(900);
  }
  for (const side of ['hero', 'enemy']) {
    await page.evaluate((side) => { const b = window.__game.scene.getScene('BattleScene'); for (let i = 0; i < 9; i++) { b.busy = false; b.startTurn(); if (b.activeUnit.side === side) break; } }, side);
    await page.waitForTimeout(330);
    await page.screenshot({ path: out + '/banner_' + side + '.png' });
    await page.waitForTimeout(900);
  }
  console.log(errors.length ? 'FAILED: ' + errors.slice(0, 2).join(' | ') : 'ALL PASSED (pictures in ' + out + ')');
  await browser.close(); process.exit(errors.length ? 1 : 0);
})();
