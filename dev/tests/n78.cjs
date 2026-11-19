// 16 Nov: Gaha's Lunge froze the game. With the foe exactly 2 tiles away there is no run, the step list was empty and
// tweens.chain threw, leaving the turn busy for ever. This uses Lunge from 2, 3 and 4 tiles, checks it always finishes,
// and then plays the next turn (ends it and sees the turn pass on).
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n78.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid;
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), bull = U('e2');
  let line = null;
  for (let r = 0; r < 11 && !line; r++) for (let c = 0; c + 4 < 11 && !line; c++) {
    const tiles = [0, 1, 2, 3, 4].map((i) => ({ col: c + i, row: r }));
    if (tiles.every((t, i) => G.isInsideGrid(t.col, t.row) && !b.isBlocked(t.col, t.row) && (i === 0 || Math.abs(G.getHeight(t.col, t.row) - G.getHeight(tiles[i - 1].col, tiles[i - 1].row)) <= 1))) line = tiles;
  }
  check('a free line of 5 tiles to test on', !!line);
  for (const gap of [2, 3, 4]) {
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.mp = u.maxMp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.status.cooldowns = {}; }
    const others = b.units.filter((u) => u !== gaha && u !== bull); others.forEach((u, i) => b.placeUnit(u, 10 - (i % 3), 10 - Math.floor(i / 3)));
    b.placeUnit(gaha, line[0].col, line[0].row); b.placeUnit(bull, line[gap].col, line[gap].row);
    b.busy = false; b.cancelMode(); b.activeUnit = gaha; gaha.accuracy = 999;
    let done = false;
    b.busy = true;
    try { b.castSpell(gaha, bull, 'lunge', () => { done = true; b.busy = false; }); } catch (e) { console.log('threw: ' + e.message); }
    const t = Date.now(); while (!done && Date.now() - t < 8000) await sleep(40);
    await sleep(300);
    check('Lunge from ' + gap + ' tiles finishes and frees the game', done && !b.busy && !b.inCinematic);
    check('  the foe was hit and Gaha stands ' + (gap - 2) + ' tile(s) along', bull.hp < bull.maxHp && gaha.col + gaha.row === line[gap - 2].col + line[gap - 2].row, gaha.col + ',' + gaha.row);
    // play the next turn: end this one and see the turn pass on
    const turn0 = b.turnCount, who0 = b.activeUnit;
    b.endTurn();
    const t2 = Date.now(); while (b.turnCount === turn0 && b.activeUnit === who0 && Date.now() - t2 < 6000) await sleep(40);
    check('  the turn can be ended and the next unit gets it', b.turnCount !== turn0 || b.activeUnit !== who0, (b.activeUnit && b.activeUnit.id));
    // let an enemy turn play out so the next loop starts quiet
    const t3 = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t3 < 15000) await sleep(60);
  }
  // 1.59 safety net: a skill that throws as it starts (as Lunge did on 16 Nov) must not freeze the game. Through the
  // real confirm path (confirmSpell), the turn is freed, any cut-in ends and the menu has a live End turn row.
  {
    const t0 = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t0 < 15000) await sleep(60);
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hasActed = false; u.status.cooldowns = {}; }
    b.placeUnit(gaha, line[0].col, line[0].row); b.placeUnit(bull, line[3].col, line[3].row);
    b.cancelMode(); b.activeUnit = gaha; b.refreshButtons();
    const real = b.castLunge; b.castLunge = () => { b.beginCinematic(); throw new Error('test: the run could not start'); };
    const quiet = w.console.error; w.console.error = () => {};
    b.onSpellButton(); b.chooseSpell('lunge'); b.handleTap(bull.col, bull.row); b.handleTap(bull.col, bull.row);
    w.console.error = quiet; b.castLunge = real;
    await sleep(300);
    const rows = [...b.slots, ...b.halves, ...b.lowHalves].filter((sl) => sl.enabled).map((sl) => sl.label && sl.label.text);
    check('a skill that throws leaves the game free (not busy, no cut-in)', !b.busy && !b.inCinematic && gaha.hasActed);
    check('  and the menu still has a live button (End turn)', rows.length > 0, rows.join('/'));
  }
  const real = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', real.length === 0, real.join('|').slice(0, 200));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
