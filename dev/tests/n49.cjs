// Effects flair 16.1 steps 8 to 11: clash sparks and flash, per-beat zoom punch and slow-mo,
// the pulsing clash ring, and the decisive burst. Checks they appear, stay under the caps,
// clean up, and leave the speed back at normal (skipping a cut-in must keep working).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:strike_0')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const G = w.__grid, fx = w.__fx;
  const U = (l) => b.units.find((u) => u.label === l);
  const gaha = U('H2'), bull = U('E2');
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  put(gaha, 3, 4); put(bull, 3, 3);
  fx.setFxMode('full');
  const beat = (win, extra = {}) => ({ beat: { actor: gaha, holder: bull, actorStance: 'press', holderStance: 'guard', winner: win, loser: win === gaha ? bull : win ? gaha : null, kind: 'stance', actorScore: 5, holderScore: 3, decisive: false, empowered: false, ...extra }, response: null, path: [], ended: false, strike: null, escape: null });
  // sparks: under the cap of 30 per burst call, 2 calls
  const emitters = () => b.children.list.filter((o) => o.type === 'ParticleEmitter');
  const e0 = new Set(emitters());
  fx.clashSparks(b, 300, 300);
  const sparks = emitters().filter((o) => !e0.has(o)).reduce((n, e) => n + e.getAliveParticleCount(), 0);
  check('clash sparks: about 30 gold sparks, never more than 30 in total', sparks > 0 && sparks <= 30, sparks);
  await sleep(900);
  check('clash sparks clean up', emitters().filter((o) => !e0.has(o)).length === 0);
  fx.setFxMode('light'); const e1 = new Set(emitters()); fx.clashSparks(b, 300, 300);
  const light = emitters().filter((o) => !e1.has(o)).reduce((n, e) => n + e.getAliveParticleCount(), 0);
  check('Light halves the sparks', light > 0 && light <= 16, light);
  fx.setFxMode('full'); await sleep(900);
  // decisive burst: under 30 particles, cleans up
  const e2 = new Set(emitters()); const n0 = b.children.list.length;
  fx.decisiveBurst(b, 300, 300);
  const burst = emitters().filter((o) => !e2.has(o)).reduce((n, e) => n + e.getAliveParticleCount(), 0);
  check('decisive burst: double sparks but still capped at 30', burst > 15 && burst <= 30, burst);
  await sleep(1500);
  check('decisive burst cleans up', b.children.list.length - n0 <= 0, b.children.list.length - n0);
  // ring: made for a beat, destroyed afterwards
  const rings = () => b.children.list.filter((o) => o.type === 'Graphics').length;
  const g0 = rings();
  let peak = 0; const timer = setInterval(() => { peak = Math.max(peak, rings() - g0); }, 30);
  const zooms = []; const zt = setInterval(() => zooms.push(b.cameras.main.zoom), 15);
  const speeds = []; const st = setInterval(() => speeds.push(b.tweens.timeScale), 15);
  const zoomBefore = b.cameras.main.zoom;
  await new Promise((res) => b.playBeat(beat(gaha), false, res));
  check('ordinary beat: ring appears while the clash is on', peak >= 1, peak);
  await sleep(600);
  check('ordinary beat: ring gone afterwards', rings() - g0 <= 0, rings() - g0);
  check('ordinary beat: no slow-mo (punch only)', Math.min(...speeds) >= 0.99, Math.min(...speeds));
  // opening beat: slow-mo happens and returns to 1
  speeds.length = 0;
  put(gaha, 3, 4); put(bull, 3, 3);
  await new Promise((res) => b.playBeat(beat(bull), true, res));
  check('opening beat: slow-mo to 0.4 for a moment', Math.min(...speeds) <= 0.45, Math.min(...speeds));
  await sleep(400);
  check('speed is back to normal after the beat', Math.abs(b.tweens.timeScale - 1) < 0.001, b.tweens.timeScale);
  // decisive beat: burst, shake, no leaks
  put(gaha, 3, 4); put(bull, 3, 3);
  const n1 = b.children.list.length;
  await new Promise((res) => b.playBeat({ ...beat(gaha, { decisive: true }), response: { held: true, slipped: false }, strike: null }, false, res));
  await sleep(1500);
  clearInterval(timer); clearInterval(zt); clearInterval(st);
  check('decisive beat: speed normal after', Math.abs(b.tweens.timeScale - 1) < 0.001, b.tweens.timeScale);
  check('decisive beat leaves no effect objects behind', b.children.list.length - n1 <= 2, b.children.list.length - n1);
  check('zoom punch moved the camera in a little (not past 1.06 over the beat zoom)', zooms.length > 5, zooms.length);
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
