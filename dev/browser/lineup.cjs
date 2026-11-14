// The start of a battle on the phone and the desktop screen (roadmap 18.22, M10b): one picture
// each, to check that no figure covers another in the 4 against 4 line-up.
//   node dev/browser/lineup.cjs <out dir>      (with the preview running)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  for (const view of ['phone', 'desktop']) {
    const { browser, page, errors } = await openBattle(view);
    const info = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { n: b.units.length, heroes: b.units.filter((u) => u.side === 'hero').map((u) => u.name).join(', '), foes: b.units.filter((u) => u.side !== 'hero').map((u) => u.name).join(', ') }; });
    await page.screenshot({ path: out + '/lineup_' + view + '.png' });
    const ok = info.n === 8 && errors.length === 0; if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + view + ': ' + info.n + ' fighters | ' + info.heroes + ' | ' + info.foes);
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
