// Starts the bundled game inside jsdom (a fake browser with a real 2D canvas).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
exports.start = async function start() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('warn', (...a) => errors.push('console.warn: ' + a.join(' ')));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM('<!doctype html><html><body><div id="game"></div></body></html>', {
    url: 'http://localhost:8800/', runScripts: 'outside-only', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  });
  const w = dom.window;
  w.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  w.CanvasRenderingContext2D = require('canvas').CanvasRenderingContext2D;
  w.eval(fs.readFileSync(__dirname + '/bundle.js', 'utf8'));
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const g = w.__game; const s = g && g.scene && g.scene.getScene('StartScene');
    if (s && s.titleText) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  // wait for the pictures to load
  const t1 = Date.now();
  while (Date.now() - t1 < 8000 && !(w.__game.textures.exists('e2:warlord_attack.png'))) await new Promise((r) => setTimeout(r, 50));
  return { w, errors, game: w.__game };
};
// Starts a battle on its own, outside the story
exports.battle = async function battle(game) {
  game.scene.getScene('StartScene').scene.stop();
  game.scene.start('BattleScene', { stepIndex: null });
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const b = game.scene.getScene('BattleScene');
    if (b.units && b.activeUnit && b.slots) { b.clashLifeOn = false; b.autoMove = false; b.home = { zoom: 1, x: 360, y: 640 }; b.goHome(); b.cancelMode(); return b; } // (older tests tap at screen points made for the Phase 2 camera) // (tests pick Move themselves; n35 turns tap-to-move on) // tests turn the background clash exchanges on themselves
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error('battle did not start');
};
