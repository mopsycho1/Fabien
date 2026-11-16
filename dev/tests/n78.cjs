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
  const real = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', real.length === 0, real.join('|').slice(0, 200));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
