// Roadmap 5.1 to 5.4: starting items, the Items menu, digging, satchels, enemy items.
// Run with FABIEN_MAP=cavern FABIEN_BENCH= .
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3'), tayo = U('E4');
  const all = [sudeen, gaha, layra, rabdul, bull, archer, tayo];
  const realEnemy = b.runEnemyTurn.bind(b);
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[0, 8], [1, 8], [0, 7], [8, 0], [7, 0], [8, 1], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { u.status = null; u.alive = true; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };

  // 5.1 starting bags
  check('5.1 Sudeen: shea balm and kola nut', sudeen.bag.sheaBalm === 1 && sudeen.bag.kolaNut === 1, JSON.stringify(sudeen.bag));
  check('5.1 Gaha: shea balm and bitter leaf', gaha.bag.sheaBalm === 1 && gaha.bag.bitterLeaf === 1, JSON.stringify(gaha.bag));
  check('5.1 Layra: spirit water and bitter leaf', layra.bag.spiritWater === 1 && layra.bag.bitterLeaf === 1, JSON.stringify(layra.bag));
  check('5.1 an enemy carries something too', Object.keys(bull.bag).length > 0);

  // 5.2 menu: heal an ally next to Sudeen
  reset([[sudeen, 4, 6], [gaha, 5, 6], [layra, 4, 7]]);
  gaha.hp = 10;
  b.activeUnit = sudeen;
  b.onItemsButton();
  check('5.2 Items opens the item menu', b.mode === 'item', b.mode);
  b.chooseItem('sheaBalm');
  check('5.2 shea balm: targets are the hurt ally only', b.mode === 'itemTarget' && b.targetsInRange.length === 1 && b.targetsInRange[0] === gaha, b.targetsInRange.map((u) => u.name).join());
  b.previewAttack(gaha);
  b.confirmItem();
  check('5.2 using it takes the action', sudeen.hasActed === true);
  check('5.2 Gaha healed by 10', gaha.hp === 20, gaha.hp);
  check('5.2 the balm is used up', sudeen.bag.sheaBalm === 0);
  await sleep(1300);
  check('5.2 not busy after', b.busy === false);

  // out of reach and not-needed items
  reset([[sudeen, 4, 6], [gaha, 4, 3]]);
  gaha.hp = 5; b.activeUnit = sudeen;
  check('5.2 nobody next to him needs balm', b.itemTargets(sudeen, 'sheaBalm').length === 0);
  check('5.2 a far ally is not a target', !b.itemTargets(sudeen, 'sheaBalm').includes(gaha));
  sudeen.poise = 1;
  check('5.2 kola nut helps when Poise is low', b.itemTargets(sudeen, 'kolaNut').length === 1);
  b.onItemsButton(); b.chooseItem('kolaNut'); b.pendingTarget = sudeen; b.confirmItem();
  check('5.2 kola nut fills Poise to 3', sudeen.poise === 3, sudeen.poise);
  await sleep(1300);

  // spirit water and bitter leaf
  reset([[layra, 4, 6]]);
  layra.mp = 2; b.activeUnit = layra;
  b.onItemsButton(); b.chooseItem('spiritWater'); b.chooseItem('spiritWater'); /* second tap: on herself */
  check('5.2 second tap uses it on herself: +6 MP', layra.mp === 8, layra.mp);
  await sleep(1300);
  reset([[layra, 4, 6]]);
  S.applyPoison(layra, 'poisonArrow');
  b.activeUnit = layra; b.onItemsButton(); b.chooseItem('bitterLeaf'); b.chooseItem('bitterLeaf');
  check('5.2 bitter leaf cures poison', !S.isPoisoned(layra));
  await sleep(1300);
  reset([[sudeen, 4, 6]]);
  check('5.2 spirit water does nothing for a unit with no MP', b.itemTargets(sudeen, 'spiritWater').length === 0);

  // 5.3 digging
  const pot = b.sites.find((s) => s.prop === 'pots');
  check('5.3 the map has buried things', b.sites.length >= 2, b.sites.length);
  check('5.3 a pot blocks its tile', b.isBlocked(pot.col, pot.row));
  reset([[gaha, pot.col + 1, pot.row]]);
  b.activeUnit = gaha;
  check('5.3 Gaha next to the pot can dig', b.sitesNear(gaha).length === 1);
  const before = gaha.bag[pot.items[0]] || 0;
  b.onItemsButton(); b.digHere();
  check('5.3 digging takes the action', gaha.hasActed === true);
  check('5.3 he now holds the item', (gaha.bag[pot.items[0]] || 0) === before + 1, JSON.stringify(gaha.bag));
  check('5.3 the pot no longer blocks', !b.isBlocked(pot.col, pot.row));
  await sleep(1300);
  reset([[sudeen, 4, 6]]);
  b.activeUnit = sudeen;
  check('5.3 nothing to dig far away', b.sitesNear(sudeen).length === 0);

  // fallen units drop their bag
  reset([[sudeen, 4, 5], [bull, 4, 4]]);
  const items = Object.values(bull.bag).reduce((a, n) => a + n, 0);
  b.defeat(bull);
  const sat = b.sites.find((s) => s.prop === 'bag' && s.col === 4 && s.row === 4);
  check('5.3 a fallen enemy leaves a satchel', !!sat && sat.items.length === items && !sat.blocking, sat && sat.items.join());
  reset([[sudeen, 4, 5]]);
  b.activeUnit = sudeen; await sleep(900);
  check('5.3 a hero next to it can dig it', b.sitesNear(sudeen).includes(sat));

  // 5.4 enemy AI
  reset([[bull, 4, 1]]);
  bull.hp = 10; bull.bag = { sheaBalm: 1 };
  b.activeUnit = bull; b.busy = false; b.battleOver = false;
  realEnemy();
  await sleep(1300);
  check('5.4 a hurt enemy drinks its balm', bull.hp === 20 && bull.bag.sheaBalm === 0 && bull.hasActed, bull.hp);
  { const { enemyItemChoice } = w.__items; bull.hp = bull.maxHp; bull.bag = { sheaBalm: 1 }; check('5.4 enemy keeps its balm when healthy', enemyItemChoice(bull) === null); }

  check('no errors', errors.filter((e) => !e.includes('focus()')).length === 0);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
