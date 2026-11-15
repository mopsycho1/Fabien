// Lighting test (15 Nov): the same battle moment in 3 looks, for Baiyee to choose.
//   now     : as built
//   soft    : glow on fighters, team rims and floor light at about half
//   minimal : team rims only, a thin floor glow, no light on fighters
//   node dev/browser/lighting.cjs <out dir>     (with the preview running)
// Each look: a still of the board before, and 3 stills at 120, 260 and 420 ms into a fire bolt
// that lands between two enemies with two heroes beside them. A Python sheet puts them together.
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  for (const mode of ['now', 'soft', 'minimal']) {
    const { browser, page, errors } = await openBattle('phone');
    await page.evaluate((m) => { window.__lightMode = m; }, mode);
    await page.evaluate(async () => {
      const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {};
      const U = (id) => b.units.find((u) => u.id === id);
      b.placeUnit(U('h4'), 2, 4); b.placeUnit(U('h2'), 3, 5); b.placeUnit(U('e4'), 4, 4); b.placeUnit(U('e2'), 4, 5);
      for (const u of b.units) b.showStanding && b.showStanding(u);
      b.cancelMode && b.cancelMode(); b.busy = false;
      await new Promise((r) => setTimeout(r, 600));
    });
    const at = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === 'e4'); const c = b.cameras.main; const r = document.querySelector('canvas').getBoundingClientRect(); return { x: ((u.view.x - c.worldView.x) * c.zoom) * (r.width / c.width) + r.left, y: ((u.view.y - c.worldView.y) * c.zoom) * (r.height / c.height) + r.top }; });
    fs.writeFileSync(out + '/at.json', JSON.stringify(at));
    await page.screenshot({ path: out + '/' + mode + '_0.png' });
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const U = (id) => b.units.find((u) => u.id === id);
      b.castSpell(U('h4'), U('e4'), 'wildfire', () => {}, true);
    });
    let t = 0;
    for (const ms of [380, 480, 580]) { await page.waitForTimeout(ms - t); t = ms; await page.screenshot({ path: out + '/' + mode + '_' + ms + '.png' }); }
    console.log(mode, errors.length ? 'ERRORS ' + errors[0] : 'ok');
    await browser.close();
  }
})();
