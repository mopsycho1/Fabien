// Waterfall v2 check (roadmap 18.3, checklist C3): in a real browser the falls must MOVE.
// Two close-up pictures of the platform's front falls are taken a moment apart, on the phone
// and the desktop screen; the script passes if the falls' frames differ and prints where
// the pictures went.  Run with the preview up:  node dev/browser/water.cjs <out dir>
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  let bad = 0;
  for (const view of ['phone', 'desktop']) {
    const { browser, page, errors } = await openBattle(view);
    await page.waitForTimeout(800);
    const look = async (tag) => {
      const info = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        b.busy = true; // nobody acts while we look
        const cam = b.cameras.main; cam.stopFollow && cam.stopFollow();
        const falls = b.children.list.filter((o) => o.texture && /^water:waterfall/.test(o.texture.key));
        const rings = b.children.list.filter((o) => o.texture && o.texture.key === 'water:splash_ring');
        const front = falls.slice().sort((p, q) => q.y - p.y).slice(0, 2);
        if (front.length) { cam.setZoom(Math.max(cam.zoom, 2.2)); cam.centerOn((front[0].x + front[front.length - 1].x) / 2, front[0].y + 20); }
        return { falls: falls.length, rings: rings.length, frames: falls.map((f) => f.frame.name).join(','), playing: falls.every((f) => f.anims && f.anims.isPlaying) };
      });
      await page.waitForTimeout(120);
      await page.screenshot({ path: out + '/water_' + view + '_' + tag + '.png' });
      return info;
    };
    const one = await look('a');
    await page.waitForTimeout(420);
    const two = await look('b');
    const ok = one.falls >= 4 && one.rings === one.falls && one.playing && one.frames !== two.frames && errors.length === 0;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + view + ': ' + one.falls + ' falls, ' + one.rings + ' splash rings, frames ' + one.frames + ' then ' + two.frames + (errors.length ? ' | ' + errors[0] : ''));
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
