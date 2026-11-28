// 10.55 (Suleiman 28 Nov, decided by Baiyee): Gadara's Mask Gauge is easier to fill, so players actually use his teleport.
//   - he starts each battle with 1 mask
//   - +1 at the start of each of his turns
//   - +1 for each different foe he hits (the bonus for several at once stays: Fork Strike through two = +2)
//   - Shadow Step still costs 1, Singularity still needs all 5
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n129.cjs
const { start, battle } = require('./boot.cjs');
const kings = require('../../src/data/kings.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const S = w.__spellsAll;
  const U = (id) => b.units.find((u) => u.id === id);
  const gad = U('e5'), gaha = U('h2'), sudeen = U('h1');
  check('Gadara is in the battle', !!gad);
  // (read before any turn of his: the battle may already have started someone's turn)
  const G = kings.gadara.mask;
  check('the numbers: start 1, +1 a turn, +1 a foe hit, Shadow Step 1, max 5', G.start === 1 && G.turn === 1 && G.perFoeHit === 1 && kings.gadara.passage.soloCost === 1 && G.max === 5);
  const startMasks = gad.turnsTaken ? null : gad.mask;
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  check('he starts the battle with 1 mask (2 if his first turn has begun)', b.activeUnit === gad ? gad.mask === 2 : gad.mask === 1, gad.mask + (startMasks === null ? '' : ''));

  // ---------- +1 at the start of his turn ----------
  const theirTurn = async () => { for (const u of b.units) u.ct = 0; gad.ct = 1000; b.startTurn(); await sleep(500); b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; };
  gad.mask = 1; gad.channel = null;
  const said = []; const ft = b.floatText.bind(b); b.floatText = (u, t, ...r) => { if (u === gad) said.push(t); return ft(u, t, ...r); };
  await theirTurn();
  check('his turn starts: +1 mask (1 to 2)', b.activeUnit === gad && gad.mask === 2, gad.mask);
  check('...and "Mask +1" shows over him', said.includes('Mask +1'), said.join('|'));
  gad.mask = 5; await theirTurn();
  check('...never above 5', gad.mask === 5, gad.mask);
  b.floatText = ft;

  // ---------- hits ----------
  let i = 0; for (const u of b.units) { u.engagedWith = null; u.engagement = null; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; }
  gad.mask = 1; gad.grip = 'fork'; gad.hasActed = false; gad.maskRound = {};
  b.placeUnit(gad, 5, 5); b.placeUnit(gaha, 5, 6); b.placeUnit(sudeen, 5, 7);
  gaha.evade = -500; sudeen.evade = -500; sudeen.wardOff = true; gaha.hp = gaha.maxHp; sudeen.hp = sudeen.maxHp;
  const rnd = Math.random; Math.random = () => 0.01 + rnd() * 0.001; // every roll hits (never a constant)
  let done = false; b.performAttack(gad, gaha, () => { done = true; });
  const t0 = Date.now(); while (!done && Date.now() - t0 < 9000) await sleep(30);
  Math.random = rnd; await sleep(300);
  check('Fork Strike through two foes: +2 (the several-foes bonus stays)', gad.mask === 3, gad.mask);
  b.placeUnit(sudeen, 0, 0); gad.mask = 1; gad.grip = 'blade'; gad.hasActed = false; b.busy = false;
  Math.random = () => 0.01 + rnd() * 0.001; done = false; b.performAttack(gad, gaha, () => { done = true; });
  const t1 = Date.now(); while (!done && Date.now() - t1 < 9000) await sleep(30);
  Math.random = rnd; await sleep(300);
  check('one foe hit: +1', gad.mask === 2, gad.mask);

  // ---------- costs ----------
  gad.mask = 1; gad.passaged = false; gad.hasMoved = false; b.activeUnit = gad;
  check('Shadow Step can be used with 1 mask', !b.kingBlock(gad, 'shadowStep'), b.kingBlock(gad, 'shadowStep'));
  gad.mask = 4; gad.singularityUsed = false;
  check('Singularity is not ready at 4', !!b.kingBlock(gad, 'singularity'));
  gad.mask = 5;
  check('...it is at 5', !b.kingBlock(gad, 'singularity'), b.kingBlock(gad, 'singularity'));
  check('spells text says he starts with 1 and gains 1 a turn', /starts/i.test(S.shadowStep.text + S.singularity.text + (S.shadowPassage ? S.shadowPassage.text : '')), S.shadowStep.text);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
