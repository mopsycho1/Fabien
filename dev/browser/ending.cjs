// M12 (roadmap 18.12, checklist F3): photographs the ending. Three pictures of a win (the dim
// board with the word arriving, the full result) and one of a loss.
//   node dev/browser/ending.cjs <out dir> [phone|desktop]      (with the preview running)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const view = process.argv[3] || 'phone'; let errs = [];
  for (const kind of ['victory', 'defeat']) {
    const { browser, page, errors } = await openBattle(view);
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && !b.busy; }, null, { timeout: 60000 });
    await page.evaluate((kind) => {
      const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {}; b.endTurn = () => {};
      const losers = b.units.filter((u) => u.side === (kind === 'victory' ? 'enemy' : 'hero'));
      const others = b.units.filter((u) => !losers.includes(u));
      b.landHit(others[0], 11); b.landHit(others[1], others[1].hp); b.defeat(others[1]); b.playDefeat(others[1], 1);
      for (const u of losers) { b.landHit(u, u.hp); b.defeat(u); b.playDefeat(u, 1); }
      b.turnCount = kind === 'victory' ? 82 : 117; b.battleOver = true; b.showResult(kind);
    }, kind);
    await page.waitForTimeout(950); await page.screenshot({ path: out + '/ending_' + kind + '_1.png' });
    await page.waitForTimeout(2600); await page.screenshot({ path: out + '/ending_' + kind + '_2.png' });
    errs = errs.concat(errors); await browser.close();
  }
  console.log(errs.length ? 'FAILED: ' + errs.slice(0, 2).join(' | ') : 'ALL PASSED (pictures in ' + out + ')'); process.exit(errs.length ? 1 : 0);
})();
