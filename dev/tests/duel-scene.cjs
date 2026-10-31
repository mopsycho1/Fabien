// The stance duel on the battle screen.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); b.setSpeed('base', 3);
  const E = w.__engagement, St = w.__status;
  const U = (l) => b.units.find((u) => u.label === l);
  const H = require('/home/claude/fabien/src/data/map.json').heights;
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - H[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(80); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.stanceMenu = 'main'; b.empower = false; b.cancelMode(); };
  const labels = () => b.slots.map((s) => (s.label.text || '-')).join(' | ');
  // dice: 'high' or 'low' for each roll in order; anything else rolls normally
  let diceQ = []; const real = w.Math.random;
  w.Math.random = () => (diceQ.length && /rollDice/.test(new Error().stack) ? diceQ.shift() : real());
  const hi = (n) => Array(n).fill(0.99), lo = (n) => Array(n).fill(0.0);
  const guard = U('H1'), ew = U('E2');
  for (const u of b.units) put(u, 7, 7);
  put(U('H2'), 0, 7); put(U('H3'), 1, 7); put(U('E1'), 7, 0); put(U('E3'), 6, 0);
  put(guard, 3, 6); put(ew, 3, 5);
  b.setStanceChoice('manual'); // this test checks the manual stance buttons
  const realEndTurn = b.endTurn.bind(b);
  b.endTurn = () => {}; // keep control of whose turn it is in this test

  // 1. engaging starts a stance duel with an opening beat
  turnOf(guard);
  diceQ = Array(6).fill(0.5); // even dice: the opening beat cannot end the clash at once
  b.onEngageButton(); b.handleTap(3, 5); b.handleTap(3, 5); await idle(); await sleep(400);
  check('Engage starts a stance duel', guard.engagedWith === ew && !!guard.engagement && guard.engagement === ew.engagement);
  check('the opening beat was a Press by the one who engaged', guard.stance === 'press', guard.stance);

  // 2. a hero's turn in the duel: the stance buttons
  E.resetMomentum(guard); turnOf(guard);
  check('in a duel, the buttons are Press, Guard, Slip and More (Guardian strong in Guard)', labels() === 'Press | Guard  * | Slip | More  >', labels());
  check('the status line says the momentum and how stances beat each other', /Momentum 0/.test(b.statusText.text) && /Guard beats Press/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.openStanceMenu('more');
  check('More: Auto mode, Break away, Empower, Back', /^Auto mode \| Break away \| Empower  \d Poise \| Back$/.test(labels()), labels());
  b.openStanceMenu('main');

  // 3. pick Guard with high dice: the hero wins the beat
  diceQ = [...hi(3), ...lo(3)];
  b.onStance('guard'); await idle(); await sleep(300);
  check('picking a stance plays the beat and uses the turn', guard.hasActed && guard.stance === 'guard', guard.stance);
  check('winning the beat moves momentum the hero\'s way', E.momentumOf(guard) > 0, E.momentumOf(guard));

  // 4. Empower
  turnOf(guard); guard.poise = 2; E.resetMomentum(guard);
  b.openStanceMenu('more'); b.toggleEmpower();
  check('Empower turns on and goes back to the stances', b.empower && b.stanceMenu === 'main');
  diceQ = [...hi(3), ...lo(3)];
  b.onStance('guard'); await idle(); await sleep(300);
  check('an empowered stance spends 1 Poise', guard.poise === 1, guard.poise);

  // 5. a decisive beat: free strike, Off-Balance, momentum back to 0
  turnOf(guard); E.resetMomentum(guard); E.shiftMomentum(guard, 2); const hp = ew.hp;
  diceQ = [...hi(3), ...lo(3), 0.99, 0.99]; // the beat, then the loser's reaction rolls (no hold, no slip)
  b.onStance('press'); await idle(); await sleep(600);
  check('reaching +3 is decisive: the winner lands a free strike', ew.hp < hp, hp + ' -> ' + ew.hp);
  check('the loser is thrown Off-Balance', St.isOffBalance(ew));
  check('momentum starts again from 0', !guard.engagement || E.momentumOf(guard) === 0, guard.engagement ? E.momentumOf(guard) : 'duel over');

  // 6. an enemy's turn in the duel
  if (!guard.engagedWith) { put(ew, 3, 5); St.clearOffBalance(ew); E.startDuel(guard, ew); }
  b.activeUnit = ew; ew.hasActed = false; b.cancelMode();
  b.enemyDuelTurn(ew); await idle(); await sleep(400);
  check('an enemy takes its duel turn with a stance', ew.hasActed && ['press', 'guard', 'slip', 'break'].includes(ew.stance), ew.stance);

  // 7. breaking away
  if (!guard.engagedWith) { put(ew, 3, 5); E.startDuel(guard, ew); }
  turnOf(guard); ew.stance = 'guard';
  diceQ = [...hi(3), ...lo(3)];
  b.onStance('break'); await idle(); await sleep(300);
  check('a successful break ends the duel and steps away', !guard.engagedWith && !ew.engagedWith && !guard.engagement, guard.col + ',' + guard.row);

  // 8. the older Engage is one setting away
  E.engagementRules.mode = 'classic';
  put(guard, 3, 6); put(ew, 3, 5); E.startEngagement(guard, ew); turnOf(guard);
  check('with "mode": "classic", the old Press / Break away buttons return', /^Press \| Break away/.test(labels()), labels());
  E.endDuel(guard); E.engagementRules.mode = 'stance';

  // 9. a hero who starts a clash is never left with no buttons: the turn moves on
  b.endTurn = realEndTurn;
  for (const u of b.units) put(u, 7, 7);
  put(U('H1'), 0, 7); put(U('H3'), 1, 7); put(U('E1'), 7, 0); put(U('E3'), 6, 0);
  const gaha = U('H2'); if (gaha.engagedWith) E.endDuel(gaha); if (ew.engagedWith) E.endDuel(ew);
  put(gaha, 3, 6); put(ew, 3, 5); St.clearOffBalance(ew);
  diceQ = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]; // an even opening beat: the clash goes on
  turnOf(gaha); b.onEngageButton(); b.handleTap(3, 5); b.handleTap(3, 5);
  await idle(); await sleep(900);
  check('after starting a clash, the turn passes on (no stuck screen)', gaha.engagedWith === ew && b.activeUnit !== gaha, 'active ' + b.activeUnit.label + ', engaged ' + !!gaha.engagedWith);
  // the safety net: a hero locked in a clash who has already acted always has End turn
  b.endTurn = () => {};
  b.activeUnit = gaha; gaha.hasActed = true; b.busy = false; b.stanceMenu = 'main'; b.cancelMode();
  check('a locked hero who has acted always has an End turn button', b.slots[3].label.text === 'End turn' && b.slots[3].enabled, labels());

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
