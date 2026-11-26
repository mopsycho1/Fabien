// Close-up of one fighter on the real board (26 Nov, roadmap 1.103: check by eye whether a figure stands on its tile,
// with no floor bits under it and its feet not sunk into the ground). Desktop at device scale 2, the camera zoomed in.
// Run with the preview up:  node dev/browser/closeup.cjs <out prefix> <unit id> [looks] [zoom]
//   looks: standing (default) and any pose names, comma separated (attack,hurt,meditate...); zoom: 3 by default
//   LINEUP='{"hero":[...],"enemy":[...]}' picks the line-up.
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const [out, id, looks, zoom] = process.argv.slice(2);
  const { browser, page } = await openBattle('desktop', { dsf: 2, lineUp: process.env.LINEUP ? JSON.parse(process.env.LINEUP) : undefined });
  await page.waitForTimeout(1500);
  for (const look of (looks || 'standing').split(',')) {
    await page.evaluate(([id, look, zoom]) => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = b.units.find((x) => x.id === id);
      if (look === 'standing') b.showStanding(u); else b.showPose(u, look, 1);
      b.manualView = true;
      b.cameras.main.setZoom(zoom); b.cameras.main.centerOn(u.view.x, u.view.y - 40);
    }, [id, look, Number(zoom) || 3]);
    await page.waitForTimeout(500); // (the camera's view is worked out on the next frame)
    const clip = await page.evaluate((id) => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = b.units.find((x) => x.id === id);
      const cam = b.cameras.main, cv = b.game.canvas, r = cv.getBoundingClientRect(), k = r.width / cv.width;
      const sx = ((u.view.x - cam.worldView.x) * cam.zoom + cam.x) * k + r.left;
      const sy = ((u.view.y - cam.worldView.y) * cam.zoom + cam.y) * k + r.top;
      const z = cam.zoom * k;
      const x = Math.max(0, sx - 60 * z), y = Math.max(0, sy - 120 * z);
      return { x, y, width: Math.min(120 * z, window.innerWidth - x), height: Math.min(140 * z, window.innerHeight - y) };
    }, id);
    await page.screenshot({ path: out + '_' + look + '.png', clip });
  }
  await browser.close();
})();
