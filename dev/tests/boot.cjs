// Starts the bundled game inside jsdom (a fake browser with a real 2D canvas).
// The waits below give up after 30 seconds (it was 8, which a busy machine could
// miss: pictures not loaded in time, roadmap 18.5). They end as soon as the game is ready.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
exports.start = async function start() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('warn', (...a) => errors.push('console.warn: ' + a.join(' ')));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM('<!doctype html><html><body><div id="game"></div></body></html>', {
    url: 'http://localhost:' + (process.env.FABIEN_PORT || 8800) + '/', runScripts: 'outside-only', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  });
  const w = dom.window;
  w.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  w.CanvasRenderingContext2D = require('canvas').CanvasRenderingContext2D;
  w.__mapName = process.env.FABIEN_MAP || 'yoba'; // the rule tests were written for the first map's tiles; n39 asks for the Hidden Cavern
  if (process.env.FABIEN_BENCH !== undefined) w.__bench = process.env.FABIEN_BENCH.split(',').filter(Boolean); // who sits out (bot balance runs)
  w.__noWebp = true; // this test browser can't read WebP pictures (the clash banners load in the background in a real browser)
  w.eval(fs.readFileSync(__dirname + '/bundle.js', 'utf8'));
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const g = w.__game; const s = g && g.scene && g.scene.getScene('StartScene');
    if (s && s.titleText) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  // Warm-up (roadmap 18.5). The pictures are all loaded by now (the title only appears
  // after StartScene has loaded them), but a test browser that has just started draws
  // slowly for its first seconds, and tests that time an animation then miss frames
  // (n34, n37, n44, n49 and n52 failed every run without this). So let the title screen
  // draw 200 frames first: about 4 seconds on a quiet machine, longer on a busy one,
  // which is what makes this steady. (It used to be a fixed 8 second wait for a
  // picture, e2:warlord_attack.png, that no longer exists.)
  const f0 = w.__game.loop.frame; const t1 = Date.now();
  while (w.__game.loop.frame - f0 < 200 && Date.now() - t1 < 30000) await new Promise((r) => setTimeout(r, 50));
  return { w, errors, game: w.__game };
};
// Starts a battle on its own, outside the story
exports.battle = async function battle(game) {
  game.scene.getScene('StartScene').scene.stop();
  game.scene.start('BattleScene', { stepIndex: null });
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const b = game.scene.getScene('BattleScene');
    if (b.units && b.activeUnit && b.slots) { b.clashLifeOn = false; b.autoMove = false; b.home = { zoom: 1, x: 360, y: 640 }; b.goHome(); b.cancelMode(); return b; } // (older tests tap at screen points made for the Phase 2 camera) // (tests pick Move themselves; n35 turns tap-to-move on) // tests turn the background clash exchanges on themselves
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error('battle did not start');
};
