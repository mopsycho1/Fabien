// 22 Nov (Baiyee): Alagara and Gadara had no healing items, and even after a dig nothing showed in their Items.
//   A: every class in jobs.json starts with a bag (items.json "start"; a class with none gets "default"), so a fighter
//      added later (the kings, Leol, the Thief) is never empty-handed.
//   B: every fighter on the board digs up a pot, then uses what it found on itself, through the Items menu.
// Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1 (the kings on the board), and again with the default teams.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const jobs = require('../../src/data/jobs.json');
const items = require('../../src/data/items.json');
(async () => {
  // A
  for (const job of Object.keys(jobs)) {
    const bag = items.start[job] || items.start.default;
    check('A ' + job + ' starts with an item bag', !!bag && Object.values(bag).some((n) => n > 0), JSON.stringify(bag));
  }
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid;
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  b.enemySecondWalk = false;
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const pot = b.sites.find((s) => s.prop === 'pots') || b.sites[0];
  check('B the map has a pot to dig', !!pot);
  // everyone else parked far from the pot, in the corners
  const far = [[10, 10], [9, 10], [10, 9], [0, 10], [0, 9], [1, 10], [10, 0], [9, 0], [10, 1], [8, 10]];
  for (const u of b.units) {
    b.units.forEach((o, i) => { if (o !== u) put(o, ...far[i % far.length]); o.engagedWith = null; });
    pot.dug = false; pot.items = ['sheaBalm'];
    u.alive = true; u.status = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.engagedWith = null;
    put(u, pot.col + 1, pot.row);
    b.busy = false; b.cancelMode(); b.activeUnit = u; b.refreshButtons && b.refreshButtons();
    const had = (u.bag && u.bag.sheaBalm) || 0;
    check('B ' + u.name + ' (' + u.side + ') starts with something', Object.values(u.bag || {}).some((n) => n > 0), JSON.stringify(u.bag));
    check('B ' + u.name + ' is next to the pot', b.sitesNear(u).length > 0);
    b.onItemsButton(); b.digHere();
    await sleep(1000);
    check('B ' + u.name + ' holds the shea balm it dug up', ((u.bag && u.bag.sheaBalm) || 0) === had + 1, JSON.stringify(u.bag));
    // its next turn: hurt, it opens Items and uses the balm on itself
    u.hasActed = false; u.hp = Math.max(1, u.maxHp - 12); const hp = u.hp;
    b.busy = false; b.cancelMode(); b.activeUnit = u;
    const list = b.itemMenu(u).map((r) => r.label);
    check('B ' + u.name + ' sees it in Items', list.some((l) => /Shea/i.test(l)), list.join(' | '));
    b.onItemsButton(); b.chooseItem('sheaBalm'); if (b.mode === 'itemTarget') { b.pendingTarget = u; b.confirmItem(); }
    await sleep(1300);
    check('B ' + u.name + ' healed with it', u.hp > hp, hp + ' -> ' + u.hp);
  }
  const real = errors.filter((e) => !e.includes('focus()')); // (jsdom has no window.focus)
  check('no page errors', real.length === 0, real.slice(0, 3).join(' / '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
