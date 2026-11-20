// Photographs the board on the phone and the desktop screen (roadmap 14.2): the view a turn
// starts with (the camera on the active unit) and the whole board (the little map top right).
//   node dev/browser/board.cjs <out dir> [name prefix]      (with the preview running)
// Pictures: <prefix>_phone_play.png, <prefix>_phone_whole.png, and the same for desktop.
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.';
  const prefix = process.argv[3] || 'board';
  fs.mkdirSync(out, { recursive: true });
  let bad = 0;
  for (const view of ['phone', 'desktop']) {
    const { browser, page, errors } = await openBattle(view);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${prefix}_${view}_play.png` });
    // the whole board: the same as tapping the little map top right
    const info = await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const cam = b.cameras.main;
      if (b.follow && cam.zoom <= b.home.zoom * 1.04) return { zoom: cam.zoom, note: "already whole" };
      b.toggleWholeBoard();
      return { zoom: b.home.zoom };
    });
    // the whole board must fit across the screen (roadmap 14.2) and the turn view must keep tiles big
    const fit = await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene'); const bb = b.boardBounds();
      const real = b.scale.displaySize.width / b.lay.W;
      return { fits: (bb.x1 - bb.x0) * b.home.zoom <= b.lay.W + 1, tile: Math.round(112 * b.playZoom * real) };
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${prefix}_${view}_whole.png` });
    const ok = errors.length === 0 && fit.fits && fit.tile >= (view === 'phone' ? 100 : 125);
    info.fit = fit;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + view + ' ' + JSON.stringify(info) + (errors.length ? ' errors: ' + errors.join(' | ') : ''));
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
