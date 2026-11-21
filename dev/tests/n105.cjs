// Roadmap 10.50 (Suleiman 21 Nov): Layra's Healing Wind, a heal she casts under Swift in place of Lightning, that
// costs a lot of MP. Numbers picked: 12 health to the ally (or herself) within 4 tiles, 6 to each ally next to
// them, 6 MP. Lightning comes back when nobody in reach is hurt or her MP is under 6.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= node n105.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const layra = U('h3'), sudeen = U('h1'), gaha = U('h2');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u.engagedWith) w.__engagement.endDuel(u);
      u.alive = true; u.hp = u.maxHp; u.status = fresh();
      if (u === layra) continue;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    layra.mp = layra.maxMp; layra.hasActed = false; layra.hasMoved = false; layra.stepsUsed = 0;
    b.placeUnit(layra, 3, 5); b.placeUnit(sudeen, 6, 5); b.placeUnit(gaha, 6, 6);
    b.activeUnit = layra; b.busy = false; b.cancelMode();
  };
  const words = () => b.children.list.filter((o) => o.type === 'Text' && o.visible !== false).map((o) => o.text).join(' | ');
  const idle = async () => { const t = Date.now(); while (b.busy && Date.now() - t < 6000) await sleep(30); await sleep(100); };

  // 1. No Swift: Lightning
  park();
  sudeen.hp = 20;
  check('without Swift: no Healing Wind', b.healAttack(layra) === null);
  // 2. Swift, MP, a hurt ally in reach: the Attack button is Healing Wind
  St.applyBuff(layra, 'swiftness');
  b.refreshButtons();
  check('under Swift with a hurt ally in reach: Healing Wind', b.healAttack(layra) === 'healingWind');
  const labels = () => (b.slots || []).map((sl) => sl && sl.label && sl.label.text).join(',');
  check('the Attack button says Healing Wind', /Healing Wind/.test(labels()), labels());
  // 3. Use it on Sudeen: +12, Gaha next to him +6, 6 MP
  gaha.hp = gaha.maxHp - 10;
  const mp0 = layra.mp, s0 = sudeen.hp, g0 = gaha.hp;
  b.onAttackButton();
  check('the button aims a heal (green tiles on allies)', b.mode === 'spellTarget' && b.selectedSpell === 'healingWind' && b.targetsInRange.includes(sudeen), b.mode + ' ' + b.selectedSpell);
  check('no foe is a target', !b.targetsInRange.some((u) => u.side !== layra.side));
  b.handleTap(sudeen.col, sudeen.row);
  check('the hint gives the numbers', /Healing Wind on Sudeen: \+12 health, \+6 to Gaha\. 6 MP/.test(words()), (words().match(/Healing Wind on[^|]*/) || [''])[0]);
  b.handleTap(sudeen.col, sudeen.row);
  await idle();
  check('Sudeen +12', sudeen.hp === s0 + 12, s0 + ' -> ' + sudeen.hp);
  check('Gaha (next to him) +6', gaha.hp === g0 + 6, g0 + ' -> ' + gaha.hp);
  check('it costs 6 MP', layra.mp === mp0 - 6, mp0 + ' -> ' + layra.mp);
  check('it is her action', layra.hasActed);

  // 4. MP under 6: Lightning comes back
  park(); St.applyBuff(layra, 'swiftness'); sudeen.hp = 20; layra.mp = 5;
  check('5 MP: no Healing Wind (Lightning)', b.healAttack(layra) === null);
  // 5. Nobody hurt: Lightning
  park(); St.applyBuff(layra, 'swiftness');
  check('nobody hurt: Lightning', b.healAttack(layra) === null);
  // 6. Herself: tap the button twice
  park(); St.applyBuff(layra, 'swiftness'); layra.hp = 10;
  b.onAttackButton(); b.onAttackButton();
  await idle();
  check('tapped twice: she heals herself +12', layra.hp === 22, layra.hp);
  // 7. It cures poison
  park(); St.applyBuff(layra, 'swiftness'); St.applyPoison(sudeen, 'poisonArrow');
  check('a poisoned ally counts as hurt', b.healAttack(layra) === 'healingWind');
  b.onAttackButton(); b.handleTap(sudeen.col, sudeen.row); b.handleTap(sudeen.col, sudeen.row);
  await idle();
  check('...and the poison is gone', !St.isPoisoned(sudeen));

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
