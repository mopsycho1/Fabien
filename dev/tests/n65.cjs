// Enemies forage (roadmap 13.48, Suleiman 13 Nov): an enemy that cannot strike anyone this
// turn digs up what is buried beside it, or walks to a pot it can reach and digs it up.
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n65.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const U = (id) => b.units.find((u) => u.id === id);
  const sudeen = U('h1'), gaha = U('h2'), layra = U('h3'), kofi = U('h4'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(60); };
  b.endTurn = () => {}; b.enemySecondWalk = false;
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; }
    put(sudeen, 0, 8); put(gaha, 1, 8); put(layra, 2, 8); put(kofi, 3, 8); put(tayo, 8, 0); put(bull, 7, 0); put(archer, 6, 0); put(rabdul, 5, 0);
    b.busy = false; b.cancelMode();
  };
  const turn = async (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.runEnemyTurn(); await sleep(700); await idle(); await sleep(1200); await idle(); };
  const site = (c, r) => b.sites.find((st) => st.col === c && st.row === r);
  const balm = site(1, 3), water = site(7, 3), leaf = site(7, 5), kola = site(1, 5);
  check('the cavern has its four buried things', !!balm && !!water && !!leaf && !!kola);

  // beside a pot, no hero near: it digs
  park(); put(bull, 1, 2);
  const had = bull.bag.sheaBalm || 0;
  check('the rule: the bull beside the balm pot, heroes far away, chooses to dig it', (() => { const f = b.forageChoice(bull); return f && f.site === balm && f.tile === null; })());
  await turn(bull);
  check('on his turn he digs it up: the pot is gone, the balm is in his bag, it was his action', balm.dug && bull.bag.sheaBalm === had + 1 && bull.hasActed, JSON.stringify(bull.bag));

  // a pot within a walk: it walks there, then digs
  park(); put(rabdul, 7, 1);
  const f2 = b.forageChoice(rabdul);
  check('Rabdul (he has MP) two steps from the spirit water chooses to walk beside it', !!f2 && f2.site === water && !!f2.tile && Math.abs(f2.tile.col - 7) + Math.abs(f2.tile.row - 3) === 1, f2 && f2.tile && f2.tile.col + ',' + f2.tile.row);
  await turn(rabdul);
  check('he walks there and digs: spirit water in his bag', water.dug && rabdul.bag.spiritWater === 1 && Math.abs(rabdul.col - 7) + Math.abs(rabdul.row - 3) === 1, rabdul.col + ',' + rabdul.row + ' ' + JSON.stringify(rabdul.bag));

  // a hero in reach: the fight comes first
  park(); put(tayo, 7, 4); put(gaha, 5, 4);
  check('with a hero he can reach this turn, Tayo does not forage (the bitter leaf is beside him)', b.forageChoice(tayo) === null);
  // something it cannot use is left alone
  park(); water.dug = false; balm.dug = true; put(bull, 7, 2);
  check('the bull has no MP: he leaves the spirit water alone', b.forageChoice(bull) === null);
  put(bull, 8, 0); put(rabdul, 7, 2);
  check('Rabdul, who has MP, would take it', (() => { const f = b.forageChoice(rabdul); return f && f.site === water; })());
  water.dug = true;
  park(); kola.dug = true; leaf.dug = true; put(bull, 6, 2);
  check('nothing left that helps: no foraging', b.forageChoice(bull) === null);
  // a fallen fighter's satchel is foraged too
  park(); b.sites.push({ col: 4, row: 2, prop: 'bag', items: ['sheaBalm'], blocking: false, dug: false, sprite: null });
  put(tayo, 4, 1);
  check('a dropped satchel beside him counts', (() => { const f = b.forageChoice(tayo); return f && f.site.prop === 'bag'; })());

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
