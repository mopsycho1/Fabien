// M10 (roadmap 18.10): the enemy team's colour, tried on the same picture. One contact sheet:
// white (Suleiman's idea), red, violet. Heroes stay teal.
//   node dev/browser/team_colours.cjs <out dir> [phone|desktop]      (with the preview running)
// It writes one picture per colour; make the sheet with the few lines of Python in the roadmap note.
const fs = require('fs');
const { chromium } = require('playwright');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const view = process.argv[3] || 'phone'; let bad = 0;
  for (const colour of ['white', 'red', 'violet']) {
    const { browser, page, errors } = await openBattle(view, { initScript: null });
    // (openBattle has no colour option: set it and restart the battle scene)
    await page.evaluate((colour) => { window.__enemyColor = colour; const b = window.__game.scene.getScene('BattleScene'); b.scene.restart({ stepIndex: null }); }, colour);
    await page.waitForTimeout(2500);
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.units && b.activeUnit && !b.busy; }, null, { timeout: 60000 });
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {};
      const at = { h1: [3, 5], h2: [4, 5], h3: [5, 6], h4: [3, 6], e4: [3, 4], e1: [4, 3], e2: [5, 4], e3: [5, 3] };
      for (const u of b.units) if (at[u.id]) b.placeUnit(u, at[u.id][0], at[u.id][1]);
      for (const u of b.units) b.faceNearestOpponent(u);
      const g = b.units.find((u) => u.id === 'h2'); b.activeUnit = g; g.hasActed = false; g.hasMoved = false; g.stepsUsed = 0; b.cancelMode(); b.markActive(); b.followUnit(g); b.refreshStatus();
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + '/enemy_' + colour + '.png' });
    if (errors.length) { bad++; console.log('FAIL ' + colour + ': ' + errors[0]); } else console.log('PASS ' + colour);
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')'); process.exit(bad ? 1 : 0);
})();
