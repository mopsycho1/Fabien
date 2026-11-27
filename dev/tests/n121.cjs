// Fixes of 27 Nov (Baiyee and Suleiman). Run with FABIEN_MAP=cavern FABIEN_BENCH=h4,e1.
//   1.117 a finger acts when it lifts: a tap on Skills opens the list, a tap on a skill picks it and lights its
//         targets; a hold shows the info only (and lifting after it picks nothing); a mouse click still acts at once
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors: all } = await start();
  const errors = all.filter((e) => !/focus\(\)/.test(e));
  const b = await battle(game); await sleep(600);
  b.runEnemyTurn = () => {};
  const T = require('../../src/data/tooltips.json').holdMs;
  const gaha = b.units.find((u) => u.name === 'Gaha');
  const foe = b.units.find((u) => u.side === 'enemy' && u.alive);
  const rest = () => { b.cancelMode(); b.activeUnit = gaha; b.busy = false; gaha.hasActed = false; gaha.hasMoved = false; b.refreshStatus(); };
  rest();
  // a foe two tiles from him, for Spear Throw
  for (const [dc, dr] of [[2, 0], [0, 2], [-2, 0], [0, -2]]) { const c = gaha.col + dc, r = gaha.row + dr; if (c >= 0 && r >= 0 && c < 11 && r < 11 && !b.getUnitAt(c, r) && !b.isBlocked(c, r)) { b.placeUnit(foe, c, r); break; } }
  rest();
  const row = (word) => [...b.slots, ...b.halves, ...b.lowHalves].find((r) => r.view.visible && r.label.text.split('  ')[0] === word);
  const finger = { x: 10, y: 10, wasTouch: true };

  // ----- 1.117 -----
  row('Skills').hit.emit('pointerdown', finger);
  check('1.117 a finger landing on Skills does nothing yet', b.mode !== 'spell', b.mode);
  row('Skills').release(true);
  check('1.117 the finger lifting on it opens the list', b.mode === 'spell', b.mode);
  await sleep(T + 150);
  check('1.117 no tooltip after a quick tap', !(b.tip && b.tip.visible));
  // a hold on a skill: its info, and lifting picks nothing
  let r = row('Spear Throw');
  check('1.117 Spear Throw is in the list', !!r);
  r.hit.emit('pointerdown', finger);
  await sleep(T + 150);
  check('1.117 a hold shows the info', !!(b.tip && b.tip.visible));
  r.release(true);
  check('1.117 lifting after the hold picks nothing', b.mode === 'spell' && !b.selectedSpell, b.mode + ' ' + b.selectedSpell);
  // a tap picks it and lights its targets
  r = row('Spear Throw');
  r.hit.emit('pointerdown', finger); r.release(true);
  check('1.117 a tap picks it and lights its targets', b.mode === 'spellTarget' && b.selectedSpell === 'spearThrow' && b.targetsInRange.includes(foe), b.mode + ' ' + b.targetsInRange.map((t) => t.name));
  // a finger that slides off the row (a scroll) is not a tap
  b.spellBack();
  r = row('Spear Throw');
  r.hit.emit('pointerdown', finger); r.release(false);
  check('1.117 a finger sliding off the row picks nothing', b.mode === 'spell' && !b.selectedSpell, b.mode);
  // a mouse click still acts on the press
  rest();
  row('Skills').hit.emit('pointerdown', { x: 10, y: 10, wasTouch: false });
  check('1.117 a mouse click on Skills acts at once', b.mode === 'spell', b.mode);

  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})();
