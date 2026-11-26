// A fighter's full look on the real board (1.113, 26 Nov: "a full review of both characters on the board: size, feet, facing,
// every pose"). Every pose it has, in the four facings, photographed close on its tile, plus one standing beside a human for size.
// Writes <out dir>/<id>_<pose>_<facing>.png; dev/tools/review_sheet.py makes one sheet of them.
//   node dev/browser/review_unit.cjs <out dir> <unit id> [poses comma separated]
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const [out, id, only] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const all = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'];
  const lineUp = { hero: ['h1', 'h2', 'h3', 'h6'], enemy: ['e2', 'e3', 'e4', 'e6'], known: all };
  const { browser, page, errors } = await openBattle('desktop', { dsf: 2, lineUp });
  await page.waitForTimeout(1500);
  await page.mouse.move(2, 2); // (no hover card over the photos)
  const poses = await page.evaluate(([id, only]) => {
    const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id);
    b.runEnemyTurn = () => {}; b.endTurn = () => {};
    const park = [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [9, 0], [0, 1], [10, 1]]; let k = 0;
    for (const v of b.units) if (v !== u) { const p = park[k++]; b.placeUnit(v, p[0], p[1]); }
    // a dry, free tile away from the edges (water hides the feet and soaks him)
    const spots = [[5, 4], [4, 4], [6, 4], [4, 5], [6, 5], [5, 3], [3, 4], [7, 4], [5, 6]];
    for (const [c, r] of spots) { if (b.isBlocked(c, r)) continue; b.placeUnit(u, c, r); if (!b.inWater || !b.inWater(u)) break; }
    if (u.status) { u.status.drenched = null; } b.refreshStatusTags && b.refreshStatusTags();
    b.manualView = true; b.cameras.main.setZoom(3); b.cameras.main.centerOn(u.view.x, u.view.y - 30);
    return only ? only.split(',') : null;
  }, [id, only || '']);
  const list = poses || ['standing', 'battle', 'weak', 'attack', 'windup', 'ready', 'guard', 'dodge', 'hurt', 'knocked', 'down', 'victory', 'hammer', 'hammerStrike', 'hammerRaise', 'ambush', 'trap', 'steal', 'fallen'];
  const facings = { upLeft: [-1, -1], upRight: [1, -1], downLeft: [-1, 1], downRight: [1, 1] };
  const shot = [];
  for (const pose of list) {
    for (const [fc, [dx, dy]] of Object.entries(facings)) {
      const ok = await page.evaluate(([id, pose, dx, dy]) => {
        const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id);
        b.faceToward(u, dx * 40, dy * 20);
        if (pose === 'standing') { u.weapon = u.closeWeapon ? 'bow' : u.weapon; b.showStanding(u); return true; }
        if (pose === 'battle') { b.showStanding(u); return b.showPose(u, 'ready', dx) !== false; }
        if (pose === 'weak') { const hp = u.hp; u.hp = 1; b.showStanding(u); u.hp = hp; return true; }
        if (!b.hasPose(u, pose)) return false;
        b.showPose(u, pose, dx); return true;
      }, [id, pose, dx, dy]);
      if (!ok) continue;
      await page.waitForTimeout(250);
      const clip = await page.evaluate((id) => {
        const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id);
        const cam = b.cameras.main, cv = b.game.canvas, r = cv.getBoundingClientRect(), k = r.width / cv.width;
        const sx = ((u.view.x - cam.worldView.x) * cam.zoom + cam.x) * k + r.left, sy = ((u.view.y - cam.worldView.y) * cam.zoom + cam.y) * k + r.top;
        const z = cam.zoom * k; return { x: Math.max(0, sx - 70 * z), y: Math.max(0, sy - 125 * z), width: 140 * z, height: 150 * z };
      }, id);
      const f = out + '/' + id + '_' + pose + '_' + fc + '.png';
      await page.screenshot({ path: f, clip }); shot.push(f);
    }
  }
  console.log(shot.length + ' photos; page errors: ' + errors.length);
  await browser.close();
})();
