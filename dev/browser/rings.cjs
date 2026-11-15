// Team ring options (15 Nov): the same moment with three colour pairs for the floor rings.
//   node dev/browser/rings.cjs <out dir>    (preview running)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  for (const set of ['tealwhite', 'tealred', 'goldred']) {
    const { browser, page, errors } = await openBattle('phone', { ringSet: set });
    await page.evaluate(async () => {
      const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {};
      const U = (id) => b.units.find((u) => u.id === id);
      b.placeUnit(U('h4'), 1, 4); b.placeUnit(U('h2'), 3, 6); b.placeUnit(U('e4'), 5, 3); b.placeUnit(U('e2'), 5, 5);
      for (const u of b.units) b.showStanding && b.showStanding(u);
      b.cancelMode && b.cancelMode(); b.busy = false;
      await new Promise((r) => setTimeout(r, 600));
    });
    const at = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const us = ['h4', 'h2', 'e4', 'e2'].map((i) => b.units.find((x) => x.id === i)); const u = { view: { x: us.reduce((a, v) => a + v.view.x, 0) / 4, y: us.reduce((a, v) => a + v.view.y, 0) / 4 } }; const c = b.cameras.main; const r = document.querySelector('canvas').getBoundingClientRect(); return { x: ((u.view.x - c.worldView.x) * c.zoom) * (r.width / c.width) + r.left, y: ((u.view.y - c.worldView.y) * c.zoom) * (r.height / c.height) + r.top }; });
    fs.writeFileSync(out + '/at.json', JSON.stringify(at));
    await page.screenshot({ path: out + '/ring_' + set + '.png' });
    console.log(set, errors.length ? 'ERRORS ' + errors[0] : 'ok');
    await browser.close();
  }
})();
