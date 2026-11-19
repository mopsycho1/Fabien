// 1.65 (Suleiman 17 Nov: "why this mofo heal while we were clashing"): a fighter locked in a clash cannot use items or
// be healed. Enemy and hero alike: no item handed to or used by a locked fighter, no Herbs on one, no Renewal blessing
// on one, and a Renewal already on him does not heal while he is locked (it still counts down).
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n79.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, I = w.__items;
  const U = (id) => b.units.find((u) => u.id === id);
  const sudeen = U('h1'), gaha = U('h2'), layra = U('h3'), kofi = U('h4'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(60); };
  b.endTurn = () => {}; b.enemySecondWalk = false;
  const lock = (a, c) => { a.engagedWith = c; c.engagedWith = a; };
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.hidden = false; }
    put(sudeen, 0, 10); put(gaha, 1, 10); put(layra, 2, 10); put(kofi, 3, 10); put(tayo, 10, 0); put(bull, 9, 0); put(archer, 8, 0); put(rabdul, 7, 0);
    b.busy = false; b.cancelMode();
  };

  // ---- the enemy side: the bull locked with Gaha, badly hurt, Tayo next to him holding a Shea balm ----
  park(); put(bull, 5, 5); put(gaha, 5, 6); put(tayo, 4, 5); lock(bull, gaha);
  bull.hp = Math.floor(bull.maxHp * 0.3); I.giveItem(tayo, 'sheaBalm');
  const mates = b.units.filter((o) => o.alive && o.side === 'enemy' && o !== tayo && Math.abs(o.col - tayo.col) + Math.abs(o.row - tayo.row) === 1);
  check('the rule: Tayo does not pick a balm for the bull while the bull is locked in a clash', I.enemyAllyItemChoice(tayo, mates) === null, JSON.stringify(I.enemyAllyItemChoice(tayo, mates) && I.enemyAllyItemChoice(tayo, mates).id));
  const hp0 = bull.hp;
  b.activeUnit = tayo; b.runEnemyTurn(); await sleep(700); await idle(); await sleep(600); await idle();
  check('on Tayo\'s turn the bull is not healed', bull.hp <= hp0, hp0 + ' -> ' + bull.hp);
  check('a locked fighter does not use an item on himself either', (() => { lock(bull, gaha); bull.hp = Math.floor(bull.maxHp * 0.3); I.giveItem(bull, 'sheaBalm'); return I.enemyItemChoice(bull) === null; })());

  // ---- the hero side: Gaha locked with the bull, hurt; Sudeen next to him ----
  park(); put(gaha, 5, 5); put(bull, 5, 4); put(sudeen, 4, 5); lock(gaha, bull); gaha.hp = Math.floor(gaha.maxHp * 0.4);
  I.giveItem(sudeen, 'sheaBalm');
  check('items: Sudeen cannot hand a balm to Gaha while Gaha is locked', !b.itemTargets(sudeen, 'sheaBalm').includes(gaha));
  b.activeUnit = sudeen; b.refreshButtons(); b.onSpellButton(); b.chooseSpell('herbs');
  check('Herbs: Gaha is not a target while he is locked', !(b.targetsInRange || []).includes(gaha), (b.targetsInRange || []).map((u) => u.id).join(','));
  b.cancelMode();
  sudeen.hp = sudeen.maxHp - 10; lock(sudeen, rabdul); put(rabdul, 3, 5);
  check('items: a locked fighter cannot use one on himself', b.itemTargets(sudeen, 'sheaBalm').length === 0);
  sudeen.engagedWith = null; rabdul.engagedWith = null;

  // ---- Renewal (Kofi's Water blessing) ----
  park(); put(gaha, 5, 5); put(bull, 5, 4); lock(gaha, bull); gaha.hp = Math.floor(gaha.maxHp * 0.5);
  St.applyBuff(gaha, 'renewal', 1);
  
  const r = b.renewalTick(gaha);
  check('Renewal does not heal a locked fighter', r.heal === 0 && gaha.hp === Math.floor(gaha.maxHp * 0.5), JSON.stringify(r));
  gaha.engagedWith = null; bull.engagedWith = null;
  const r2 = b.renewalTick(gaha);
  check('...and heals again once the clash is over', r2.heal > 0, JSON.stringify(r2));

  const real = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', real.length === 0, real.join('|').slice(0, 200));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
