// 6.85: the kings' victory sheets. A win with Alagara standing and a loss with Gadara standing: at the end each
// survivor strikes his victory pose (art.json poses.victory, his 21 Nov triumph sheet) on the dimmed board behind the
// result panel, and the champion strikes it ON the result screen (the panel hides the board). Photographs both.
//   node dev/browser/king_victory.cjs <out dir> [phone|desktop]      (with the preview running)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const view = process.argv[3] || 'phone'; let errs = [], fails = 0;
  for (const [kind, king] of [['victory', 'h5'], ['defeat', 'e5']]) {
    const { browser, page, errors } = await openBattle(view, { everyone: true });
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && !b.busy; }, null, { timeout: 60000 });
    await page.evaluate(([kind, king]) => {
      const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {}; b.endTurn = () => {};
      const losers = b.units.filter((u) => u.side === (kind === 'victory' ? 'enemy' : 'hero'));
      // only the king is left standing on the winning side, in the middle of the board
      const winners = b.units.filter((u) => !losers.includes(u));
      for (const u of [...losers, ...winners.filter((u) => u.id !== king)]) { b.landHit(u, u.hp); b.defeat(u); b.playDefeat(u, 1); }
      const k = b.units.find((u) => u.id === king); b.placeUnit(k, 5, 5);
      b.turnCount = 40; b.battleOver = true; b.showResult(kind);
    }, [kind, king]);
    await page.waitForTimeout(1300);
    const key = await page.evaluate((king) => window.__game.scene.getScene('BattleScene').units.find((u) => u.id === king).sprite.texture.key, king);
    const ok = /_victory_f\d/.test(key);
    console.log((ok ? 'PASS ' : 'FAIL ') + king + ' strikes his victory pose at the end (' + kind + ')  [' + key + ']'); if (!ok) fails++;
    await page.waitForTimeout(1800); // the panel and the champion on it
    const champ = await page.evaluate(() => { const c = window.__game.scene.getScene('BattleScene').resultChampion; return c ? { id: c.unit.id, key: c.key, place: c.place, alpha: c.image.alpha, h: Math.round(c.image.displayHeight) } : null; });
    const ok2 = champ && champ.id === king && /_victory_f\d/.test(champ.key) && champ.alpha > 0.9 && champ.h > 100;
    console.log((ok2 ? 'PASS ' : 'FAIL ') + king + ' is the champion on the result screen, in his victory pose  [' + JSON.stringify(champ) + ']'); if (!ok2) fails++;
    await page.screenshot({ path: out + '/king_' + kind + '_' + view + '.png' });
    errs = errs.concat(errors); await browser.close();
  }
  if (errs.length) console.log('page errors: ' + errs.slice(0, 2).join(' | '));
  const bad = fails + errs.length;
  console.log(bad ? 'FAILED: ' + bad : 'ALL PASSED (pictures in ' + out + ')'); process.exit(bad ? 1 : 0);
})();
