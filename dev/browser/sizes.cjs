// Size ruler look (roadmap 18.2): in a real browser, every fighter is put through a list of
// poses and a picture is taken of each, so the sizes can be judged on the real board.
// Run with the preview up:  node dev/browser/sizes.cjs <out dir> [phone|desktop]
const { openBattle } = require('./lib/play.cjs');
const POSES = ['standing', 'ready', 'windup', 'attack', 'guard', 'hurt', 'sonicRelease', 'sonicClose', 'kneel', 'victory'];
(async () => {
  const out = process.argv[2] || '.'; const view = process.argv[3] || 'phone';
  require('fs').mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle(view);
  await page.waitForTimeout(1500);
  for (const pose of POSES) {
    await page.evaluate((pose) => {
      const b = window.__game.scene.getScene('BattleScene');
      b.busy = true; // nobody acts while we look
      for (const u of b.units) {
        if (!u.sprite) continue;
        if (pose === 'standing' || !b.hasPose(u, pose)) b.showStanding(u); else b.showPose(u, pose, u.side === 'hero' ? 1 : -1);
      }
    }, pose);
    await page.waitForTimeout(250);
    await page.screenshot({ path: out + '/sizes_' + view + '_' + pose + '.png' });
  }
  console.log(errors.length ? 'FAILED: ' + errors.slice(0, 3).join(' | ') : 'ALL PASSED (' + POSES.length + ' pictures in ' + out + ')');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
