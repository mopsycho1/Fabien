// How a hidden enemy looks on the board (roadmap 1.47): photographs the archer hidden by her
// Smoke Bomb next to a hero hidden by Husk, on the phone board.
//   node dev/browser/hidden_look.cjs <out dir>      (with the preview running)
const fs = require('fs'); const path = require('path');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle('phone', { everyone: true });
  const box = await page.evaluate(async () => {
    const b = window.__game.scene.getScene('BattleScene'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    b.endTurn = () => {};
    const U = (id) => b.units.find((u) => u.id === id); const archer = U('e3'), gaha = U('h2'), layra = U('h3');
    b.placeUnit(archer, 4, 7); b.placeUnit(gaha, 2, 7); b.placeUnit(layra, 6, 8);
    b.activeUnit = archer; b.busy = true;
    await new Promise((res) => b.castSpell(archer, { col: 5, row: 8 }, 'smokeBomb', res)); b.busy = false;
    await sleep(900);
    const cam = b.cameras.main; const k = window.__game.canvas.getBoundingClientRect().width / window.__game.scale.width;
    return { x: (archer.view.x - cam.worldView.x) * cam.zoom * k, y: (archer.view.y - cam.worldView.y) * cam.zoom * k, alpha: archer.view.alpha, hidden: archer.hidden };
  });
  const c = await page.locator('canvas').boundingBox();
  await page.screenshot({ path: path.join(out, 'hidden_look.png'), clip: { x: Math.max(0, c.x + box.x - 150), y: Math.max(0, c.y + box.y - 190), width: 300, height: 260 } });
  console.log('hidden ' + box.hidden + ', drawn at ' + box.alpha + (errors.length ? ' | page errors: ' + errors[0] : ''));
  console.log(errors.length || !box.hidden ? 'FAILED' : 'ALL PASSED');
  await browser.close();
})();
