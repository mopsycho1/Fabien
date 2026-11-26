// Graphics 2.0, step 1 (26 Nov). Run with FABIEN_MAP=cavern FABIEN_BENCH=h4,e1.
//   1.111 End turn needs a second tap (like Prime Bow): a stray tap spends nothing
//   18.56 to 18.61: every new look sits behind a Settings switch, Off until Baiyee approves it
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  b.runEnemyTurn = () => {};
  let ended = 0;
  const realEnd = b.endTurn.bind(b);
  b.endTurn = () => { ended++; };
  const hero = b.units.find((u) => u.side === 'hero' && u.alive);
  b.activeUnit = hero; b.busy = false; hero.hasActed = false; hero.hasMoved = false;
  b.refreshStatus();
  const endRow = () => [...b.slots, ...b.halves, ...b.lowHalves].find((r) => r.label && r.label.text === 'End turn' && r.view.visible);
  const tap = (r) => r.hit.emit('pointerdown', { x: 10, y: 10, wasTouch: false });
  // 1.111
  let r = endRow();
  check('1.111 the End turn row is in the menu', !!r);
  tap(r);
  check('1.111 one tap does not end the turn', ended === 0 && b.endArmed === hero, ended);
  check('1.111 the row lights up', endRow() && endRow().selected !== false, endRow() && endRow().selected);
  tap(endRow());
  check('1.111 a second tap ends the turn', ended === 1, ended);
  // a stray tap, then something else: the confirm is put away
  b.activeUnit = hero; b.busy = false; b.refreshStatus();
  tap(endRow());
  b.handleTap(-5, -5); // a tap outside the board
  check('1.111 a tap elsewhere puts the confirm away', !b.endArmed);
  tap(endRow());
  check('1.111 after that, one tap again only asks', ended === 1, ended);
  // after 4 seconds the light goes out by itself
  b.endArmedAt = b.time.now - 5000;
  tap(endRow());
  check('1.111 a second tap after 4 seconds only asks again', ended === 1 && !!b.endArmed, ended);
  b.cancelEndArm();
  // Space on a keyboard is deliberate: still one press
  b.activeUnit = hero; b.busy = false; b.inCinematic = false;
  b.keyEndTurn();
  check('1.111 Space still ends the turn at once', ended === 2, ended);
  b.endTurn = realEnd;

  // 18.56 the switches, 18.57 weapon streaks
  const rowOf = (word) => b.settingsRows.find((r) => r.text.startsWith(word));
  const sr = rowOf('Weapon streaks');
  check('18.56 Settings has a Weapon streaks row, Off by default', sr && /Off$/.test(sr.text), sr && sr.text);
  check('18.56 the sheet still ends with Close', b.settingsRows[b.settingsRows.length - 1].text === 'Close');
  const sud = b.units.find((u) => u.id === 'h1'), foe = b.units.find((u) => u.side === 'enemy' && u.alive);
  b.placeUnit(sud, 4, 6); b.placeUnit(foe, 5, 6); foe.hp = 999;
  sud.lastStreakAt = 0;
  await new Promise((r) => b.performAttack(sud, foe, r)); await sleep(800);
  check('18.57 switched off: no streak (the old arc)', !sud.lastStreakAt);
  sr.emit('pointerdown');
  check('18.56 a tap turns it On', /On$/.test(rowOf('Weapon streaks').text), rowOf('Weapon streaks').text);
  sud.lastStreakAt = 0; sud.hasActed = false;
  await new Promise((r) => b.performAttack(sud, foe, r)); await sleep(800);
  check('18.57 switched on: his blow plays a streak', sud.lastStreakAt > 0, sud.lastStreakAt);
  const ala = b.units.find((u) => u.id === 'h5');
  if (ala) { ala.lastStreakAt = 0; b.placeUnit(ala, 4, 4); b.placeUnit(foe, 5, 4); await new Promise((r) => b.performAttack(ala, foe, r)); await sleep(800); check('18.57 Alagara keeps his own drawn slash (no streak)', !ala.lastStreakAt); }
  rowOf('Weapon streaks').emit('pointerdown'); // back Off for the device
  check('18.56 a second tap turns it Off', /Off$/.test(rowOf('Weapon streaks').text));

  const real = errors.filter((e) => !/Not implemented/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
