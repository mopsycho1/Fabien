// Jump logger (roadmap 18.5, checklist A5): a test player plays one full battle in a
// real browser while every frame the script checks how far each figure moved.
// A "jump" is a figure moving more than one tile inside 80 ms. Jumps are fine for
// the fast moves on the ALLOWED list below; anything else is printed as a FAIL.
// Run with the preview up (npx vite build, then npx vite preview --port 4173):
//   node dev/browser/jumps.cjs [phone|desktop]
// It also prints the frame rate it ran at: the check is only trusted near 60 frames
// a second, so a slow run is a FAIL too (close other heavy programs and rerun).
// To prove the logger itself works:  SELFTEST=1 node dev/browser/jumps.cjs
// (it shoves one figure 3 tiles sideways on purpose and must report that jump).
const fs = require('fs');
const path = require('path');
const { openBattle, startPlayer, waitForEnd } = require('./lib/play.cjs');

// Moves that are meant to be faster than one tile in 80 ms (ids from spells.json,
// plus 'knockback' for pushes, falls and wall slams, which fly by design).
const ALLOWED = ['sonicJavelin', 'blitz', 'husk', 'knockback'];
const WINDOW_MS = 80;
const SELFTEST = !!process.env.SELFTEST;

(async () => {
  // one tile step on screen, from the map's own tile size
  const board = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../src/data/maps/cavern.json'), 'utf8')).board || {};
  const tile = Math.hypot((board.tileWidth || 86) / 2, (board.tileHeight || 54) / 2);

  const { browser, page, errors } = await openBattle(process.argv[2] || 'phone');
  await startPlayer(page, SELFTEST ? 15000 : undefined);
  await page.evaluate(({ tile, WINDOW_MS }) => {
    const b = window.__game.scene.getScene('BattleScene');
    const trail = new Map(); // per figure: where it was over the last 80 ms
    const jumps = (window.__jumps = []);
    const gaps = (window.__gaps = []); // time between frames, to report the frame rate
    let lastFrame = performance.now();
    b.events.on('postupdate', () => {
      const now = performance.now();
      gaps.push(now - lastFrame); lastFrame = now;
      for (const u of b.units) {
        if (!u.view || !u.view.active) continue;
        const t = trail.get(u) || []; trail.set(u, t);
        t.push({ x: u.view.x, y: u.view.y, at: now });
        while (t.length > 1 && now - t[0].at > WINDOW_MS) t.shift();
        // the frame before this one counts too, so a one-frame snap is never missed
        const d = Math.hypot(u.view.x - t[0].x, u.view.y - t[0].y) / tile;
        if (d > 1.05 && now - (u.__lastJump || 0) > 400) { // one line per burst, not one per frame
          u.__lastJump = now;
          const doing = window.__doing || {};
          jumps.push({ who: u.label || u.id, tiles: Math.round(d * 10) / 10, during: doing.what, ago: Math.round(now - doing.at), turn: b.turnCount, active: b.activeUnit && (b.activeUnit.label || b.activeUnit.id) });
        }
      }
    });
  }, { tile, WINDOW_MS });
  if (SELFTEST) {
    await page.waitForTimeout(3000);
    await page.evaluate((tile) => { const b = window.__game.scene.getScene('BattleScene'); window.__doing = { what: 'selftest', at: performance.now() }; b.units[0].view.x += tile * 3; }, tile);
  }
  const end = await waitForEnd(page, SELFTEST ? 15000 : undefined);
  const { jumps, gaps } = await page.evaluate(() => ({ jumps: window.__jumps, gaps: window.__gaps }));
  await browser.close();

  gaps.sort((a, c) => a - c);
  const median = gaps[Math.floor(gaps.length / 2)] || 0;
  const slow = gaps.filter((g) => g > 34).length / Math.max(1, gaps.length); // frames that took 2 or more frames' time
  const fps = median ? Math.round(1000 / median) : 0;
  console.log('Battle: ' + end.turns + ' turns, ' + (end.over ? 'finished' : 'NOT finished') + ', ' + errors.length + ' page errors');
  console.log('Frames: ' + gaps.length + ', about ' + fps + ' a second, ' + (slow * 100).toFixed(1) + '% slow frames');

  if (SELFTEST) {
    const seen = jumps.some((j) => j.during === 'selftest' && j.tiles >= 2.5);
    console.log(seen ? 'ALL PASSED: the logger caught the 3 tile shove' : 'FAILED: the logger missed the 3 tile shove');
    process.exit(seen ? 0 : 1);
  }
  const count = {};
  for (const j of jumps) count[j.during] = (count[j.during] || 0) + 1;
  console.log('Jumps over one tile in ' + WINDOW_MS + ' ms, by move: ' + (JSON.stringify(count)));
  const badJumps = jumps.filter((j) => !ALLOWED.includes(j.during));
  for (const j of badJumps.slice(0, 30)) console.log('FAIL jump: ' + j.who + ' moved ' + j.tiles + ' tiles during "' + j.during + '" (' + j.ago + ' ms in), turn ' + j.turn + ', active ' + j.active);
  for (const e of errors.slice(0, 10)) console.log('FAIL page error: ' + e);
  if (fps < 55) console.log('FAIL frame rate: ' + fps + ' a second is too slow to trust this check');
  if (!end.over) console.log('FAIL the battle did not finish');
  const ok = !badJumps.length && !errors.length && fps >= 55 && end.over;
  console.log(ok ? 'ALL PASSED' : 'FAILED');
  process.exit(ok ? 0 : 1);
})();
