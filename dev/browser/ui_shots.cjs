// UI size check (15 Nov, Baiyee: "the UI is too big"): the battle screen on a phone (390 x 844) and
// a desktop (1440 x 900), with the numbers: how much of the screen the board has free.
//   node dev/browser/ui_shots.cjs <out dir> <tag>     (preview running; tag = before or after)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.', tag = process.argv[3] || 'after'; fs.mkdirSync(out, { recursive: true });
  for (const view of ['phone', 'desktop']) {
    const { browser, page, errors } = await openBattle(view);
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy; }, null, { timeout: 60000 });
    await page.waitForTimeout(3500); // the "Your turn" line fades after 2 seconds
    const info = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const l = b.lay; return { W: l.W, H: l.H, s: +l.s.toFixed(2), free: +((l.bottom - l.top) / l.H).toFixed(3), freeW: 1 }; });
    await page.screenshot({ path: out + '/' + tag + '_' + view + '.png' });
    console.log(view, JSON.stringify(info), errors.length ? 'ERRORS ' + errors[0] : 'no errors');
    await browser.close();
  }
})();
