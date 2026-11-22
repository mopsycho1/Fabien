// Batch 7, Rabdul (19.4). Spear Ward: the 8 tiles round him are guarded until his next turn; a foe that walks INTO one
// is struck for 75 percent of a blow and a hit stops its walk; 2 strikes; he cannot move. Hold the Line: +2 Guard,
// pushes do not move him, the first foe that walks next to him is contested (a win stops it, no damage). One stance at
// a time. Haft Sweep: half a blow, Off-Balance, pushed 1 tile. Switch Ends: a Press beat he wins hits for 2. No Blind
// Side: +5 to hit him while he is in someone else's clash (not +10). Kindle the Haft (Fury Enchant): his first hit
// each turn sets the foe alight.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= node n109.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, C = w.__combat, E = w.__engagement, Sig = w.__signature;
  const U = (id) => b.units.find((u) => u.id === id);
  const rabdul = U('e4'), gaha = U('h2'), layra = U('h3'), bull = U('e2');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = () => {
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false;
    let i = 0;
    for (const u of b.units) {
      if (u.engagedWith) E.endDuel(u);
      u.alive = true; u.hp = u.maxHp; u.status = fresh(); u.zone = null; b.clearZoneMark(u); u.stepsUsed = 0; u.hasMoved = false; u.hasActed = false;
      if ([rabdul, gaha].includes(u)) continue;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    b.placeUnit(rabdul, 5, 4); b.placeUnit(gaha, 5, 8);
    b.activeUnit = gaha; b.busy = false; b.cancelMode();
  };
  const idle = async () => { const t = Date.now(); while (b.busy && Date.now() - t < 8000) await sleep(30); await sleep(150); };
  const ward = async (id) => { b.castSpell(rabdul, rabdul, id, () => {}); await sleep(800); b.time.removeAllEvents(); b.busy = false; };

  park();
  check('his kit has Spear Ward, Hold the Line and Haft Sweep', ['spearWard', 'holdLine', 'haftSweep'].every((id) => rabdul.spells.includes(id)), rabdul.spells.join(','));
  // 1. Switch Ends in a clash
  const fx = Sig.afterBeat({ actor: rabdul, holder: gaha, actorStance: 'press', holderStance: 'slip', kind: 'win', winner: rabdul, loser: gaha });
  const se = fx.find((f) => f.from === rabdul);
  check('Switch Ends: a Press beat he wins hits for 2', se && se.damage === 2 && se.word === 'Switch Ends', se && se.damage);
  // 2. No Blind Side
  E.startDuel(rabdul, bull === rabdul ? gaha : U('h1'));
  const free = { ...rabdul, engagedWith: null };
  const caught = C.getHitChance(gaha, rabdul) - C.getHitChance(gaha, free);
  check('No Blind Side: +5 to hit him in someone else\'s clash (not +10)', caught === 5, caught);
  park();

  // 3. Spear Ward
  await ward('spearWard');
  check('Spear Ward: 2 strikes ready', rabdul.zone && rabdul.zone.mode === 'spear' && rabdul.zone.charges === 2);
  check('...he cannot move', b.stepsLeft(rabdul) === 0);
  check('...SPEAR WARD shows over him', St.statusTags(rabdul).some((t) => t.text.startsWith('SPEAR WARD')));
  let stopped = false, tries = 0, lost = 0;
  park(); await ward('spearWard');
  tries = 0;
  while (tries++ < 30) {
    park(); await ward('spearWard');
    b.activeUnit = gaha; gaha.stepsUsed = 0;
    b.moveUnit(gaha, 5, 5, () => {}); // 5,8 > 5,7 > 5,6 > 5,5: 5,5 is in the ring (5,6 is not)
    await idle(); await sleep(600);
    if (gaha.hp < gaha.maxHp) { stopped = true; break; }
    lost++;
  }
  check('a foe walking into the ring is struck and stopped there', stopped && gaha.col === 5 && gaha.row === 5, gaha.col + ',' + gaha.row);
  const share = Math.max(1, Math.round(C.getDamage(rabdul, { ...gaha, status: fresh() }) * 0.75));
  check('...for 75 percent of a blow', gaha.maxHp - gaha.hp === share, (gaha.maxHp - gaha.hp) + ' vs ' + share);
  check('...one strike used', rabdul.zone.charges === 1);
  check('...stopped for the rest of its walk', b.stepsLeft(gaha) === 0);
  // a foe already standing in the ring that steps within it: no strike
  gaha.stepsUsed = 0; const hp0 = gaha.hp;
  b.moveUnit(gaha, 4, 5, () => {}); await idle(); await sleep(500);
  check('a step inside the ring (already next to him): no strike', gaha.hp === hp0 && rabdul.zone.charges === 1, rabdul.zone.charges);
  // a missed strike lets it walk on (it uses a strike)
  // a missed strike lets it walk on (it uses a strike)
  park(); await ward('spearWard');
  b.activeUnit = gaha; gaha.stepsUsed = 0; const ev = gaha.evade, mv = gaha.move; gaha.evade = 300; gaha.move = 8;
  b.moveUnit(gaha, 5, 2, () => {}); await idle(); await sleep(900); await idle(); /* the short way (8 steps) goes through his ring; round it is 10 */
  check('a miss does not stop it: it walks on (and a strike is used)', gaha.col === 5 && gaha.row === 2 && rabdul.zone.charges === 1 && gaha.hp === gaha.maxHp, gaha.col + ',' + gaha.row + ' charges ' + rabdul.zone.charges);
  gaha.evade = ev; gaha.move = mv;

  // 4. Hold the Line: +2 Guard, no push, a contest that stops the walker without damage
  park(); await ward('holdLine');
  check('Hold the Line replaces Spear Ward (one stance)', rabdul.zone.mode === 'hold');
  check('+2 Guard in a clash', E.stanceRating(rabdul, 'guard') === rabdul.contest.guard + 2, E.stanceRating(rabdul, 'guard'));
  check('pushes do not move him', b.pushPlan(rabdul, gaha, 2).held === true);
  tries = 0; stopped = false;
  while (tries++ < 30) {
    park(); await ward('holdLine');
    b.activeUnit = gaha; gaha.stepsUsed = 0;
    b.moveUnit(gaha, 5, 5, () => {}); await idle(); await sleep(400);
    if (gaha.col === 5 && gaha.row === 5 && rabdul.zone.charges === 0 && b.stepsLeft(gaha) === 0) { stopped = true; break; }
  }
  check('Hold the Line stops a foe walking next to him', stopped);
  check('...with no damage', gaha.hp === gaha.maxHp);

  // 5. Haft Sweep
  tries = 0; let swept = false;
  while (tries++ < 30 && !swept) {
    park(); b.placeUnit(gaha, 5, 5);
    b.activeUnit = rabdul;
    b.castSpell(rabdul, gaha, 'haftSweep', () => {}); await sleep(1300);
    swept = gaha.hp < gaha.maxHp;
  }
  check('Haft Sweep hits for half a blow', swept && gaha.maxHp - gaha.hp === Math.max(1, Math.round(C.getDamage(rabdul, { ...gaha, status: fresh() }) * 0.5)), gaha.maxHp - gaha.hp);
  check('...Off-Balance', St.isOffBalance(gaha));
  check('...and pushed a tile', !(gaha.col === 5 && gaha.row === 5), gaha.col + ',' + gaha.row);

  // 6. Kindle the Haft
  park(); b.placeUnit(gaha, 5, 5);
  St.applyBuff(rabdul, 'fury');
  check('under Fury his Enchant is Kindle the Haft', St.activeMove(rabdul, 'enchant') === 'kindleHaft');
  b.activeUnit = rabdul;
  b.castEnchant(rabdul, rabdul, w.__spellsData ? w.__spellsData.kindleHaft : { self: true, name: 'Kindle the Haft', color: '#ff7a2e' }, () => {}); await sleep(1500);
  check('...it is on his own spear', rabdul.status.enchant && rabdul.status.enchant.id === 'kindleHaft');
  tries = 0;
  while (tries++ < 30 && !St.isBurning(gaha)) { gaha.hp = gaha.maxHp; rabdul.kindledTurn = null; b.performAttack(rabdul, gaha, () => {}); await sleep(40); }
  check('his hit sets the foe alight', St.isBurning(gaha));
  gaha.status.burn = null;
  for (let i = 0; i < 6; i++) { gaha.hp = gaha.maxHp; b.performAttack(rabdul, gaha, () => {}); await sleep(30); }
  check('...only his first hit each turn', !St.isBurning(gaha));

  // 7. his AI: a ward when a foe is coming and nobody is next to him; Hold the Line while the ward cools
  park(); b.placeUnit(gaha, 5, 8);
  rabdul.status.buff = null;
  const p1 = b.rabdulChoice(rabdul);
  check('AI: Spear Ward when a foe is coming', p1 && p1.id === 'spearWard', p1 && p1.id);
  rabdul.status.cooldowns.spearWard = 2;
  const p2 = b.rabdulChoice(rabdul);
  check('AI: Hold the Line while Spear Ward cools down', p2 && p2.id === 'holdLine', p2 && p2.id);
  // 8. he keeps with the line (balance pass 10.31, 22 Nov): no walking in ahead of his allies where 3 or more foes could
  // reach him next turn; level with the line (or with only one or two foes about) he walks as before
  park();
  const others = b.units.filter((u) => ![rabdul, gaha].includes(u));
  for (const u of others) u.alive = false;
  const tayo = U('e1'); const sudeen = U('h1');
  for (const u of [tayo, bull, layra, sudeen].filter(Boolean)) u.alive = true;
  b.placeUnit(rabdul, 5, 2); b.placeUnit(bull, 6, 1); if (tayo) { tayo.alive = false; }
  b.placeUnit(gaha, 5, 6); b.placeUnit(sudeen, 4, 7); b.placeUnit(layra, 6, 7);
  const ahead = { col: 5, row: 5 }; // next to Gaha, three rows in front of the Bull
  const kept = w.__ai.keepWithLine(rabdul, b.units, ahead);
  const near = (t) => Math.min(...[gaha, sudeen, layra].map((f) => Math.abs(f.col - t.col) + Math.abs(f.row - t.row)));
  check('AI: with 3 foes about he does not walk in ahead of his line', !kept || near(kept) >= near(bull), kept ? kept.col + ',' + kept.row : 'stays');
  layra.alive = false; sudeen.alive = false;
  const alone = w.__ai.keepWithLine(rabdul, b.units, ahead);
  check('AI: against one foe he still walks up to strike', alone && alone.col === 5 && alone.row === 5, alone ? alone.col + ',' + alone.row : 'stays');
  b.placeUnit(bull, 5, 4); layra.alive = true; sudeen.alive = true;
  const level = w.__ai.keepWithLine(rabdul, b.units, { col: 4, row: 4 });
  check('AI: level with an ally he walks as before', level && level.col === 4 && level.row === 4, level ? level.col + ',' + level.row : 'stays');
  // ...and he stays within 3 tiles of a close-fighting ally: no wandering down the other flank alone
  b.placeUnit(rabdul, 5, 2); b.placeUnit(bull, 9, 2);
  const flank = w.__ai.keepWithLine(rabdul, b.units, { col: 2, row: 3 });
  const toBull = (t) => Math.abs(t.col - bull.col) + Math.abs(t.row - bull.row);
  check('AI: he does not walk off away from his allies', !flank || toBull(flank) <= 3, flank ? flank.col + ',' + flank.row : 'stays');
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
