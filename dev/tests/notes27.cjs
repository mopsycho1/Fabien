// Suleiman's Oct 27 notes: facings, weakened looks, Layra's size, meditation trance, spear reach, aimed Poison Arrow.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h2:gaha_weak_upRight.png')) await sleep(50);
  const b = await battle(game);
  const E = w.__engagement, St = w.__status, G = w.__grid;
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.cancelMode(); };
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), tayo = U('E1'), bull = U('E2'), archer = U('E3');
  b.runEnemyTurn = () => {}; const realEnd = b.endTurn.bind(b); b.endTurn = () => {};
  const park = () => { for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.status.cooldowns = {}; u.status.poison = null; u.aiming = null; u.markedBy = null; u.meditating = null; } b.refreshEngagementMarks(); put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 3, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0); };
  const key = (u) => u.sprite.texture.key;

  // facings
  park(); gaha.facing = 'upRight'; b.showStanding(gaha);
  check('Gaha facing up-right shows his back turned right', key(gaha) === 'h2:gaha_stand_upRight.png', key(gaha));
  put(gaha, 3, 5); put(bull, 3, 4); b.faceNearestOpponent(gaha); // (3,4) is up-right of (3,5)
  check('an enemy near: his battle stance in the same facing', /gaha_battle_upRight/.test(key(gaha)), key(gaha));
  E.startDuel(gaha, bull); b.showStanding(gaha); b.showStanding(bull);
  check('in a clash he faces his foe (up-right)', /gaha_battle_upRight/.test(key(gaha)), key(gaha) + ' facing ' + gaha.facing);
  check('and the bull faces him back (down-left)', /bull_battle_downLeft/.test(key(bull)), key(bull));
  put(bull, 3, 6); b.showStanding(gaha); // (3,6) is down-left of (3,5)
  check('foe moves to his down-left: he turns to face it', /gaha_battle_downLeft/.test(key(gaha)), key(gaha));
  park();
  // archer aims in four facings
  put(archer, 4, 3); put(gaha, 2, 3); /* two columns back is up-left */ archer.facing = 'downLeft'; b.faceToward(archer, gaha.view.x - archer.view.x, gaha.view.y - archer.view.y); b.showPose(archer, 'attack', gaha.view.x - archer.view.x);
  check('the archer aims up-left with her up-left picture', /archer_aim_upLeft/.test(key(archer)), key(archer));
  // weakened
  park(); gaha.hp = Math.floor(gaha.maxHp * 0.3); gaha.facing = 'downLeft'; b.showStanding(gaha);
  check('badly hurt Gaha stands bloodied', /gaha_weak_downLeft/.test(key(gaha)), key(gaha));
  layra.hp = 5; b.showStanding(layra);
  check('badly hurt Layra leans on her staff', /layra_weak/.test(key(layra)), key(layra));
  layra.hp = layra.maxHp; gaha.hp = gaha.maxHp; b.showStanding(layra); b.showStanding(gaha);
  // Layra's size
  const shown = (u) => Math.max(...['downLeft', 'downRight', 'upLeft', 'upRight'].map((f) => { u.facing = f; b.showStanding(u); return u.sprite.displayHeight; }));
  const lh = shown(layra), gh = shown(gaha);
  check('Layra is no longer drawn bigger than the others (tallest picture within Gaha\'s)', lh <= gh + 2, lh.toFixed(0) + ' vs Gaha ' + gh.toFixed(0));

  // spear reach
  park(); put(gaha, 3, 6); put(bull, 3, 4); put(tayo, 4, 5); turnOf(gaha);
  const reach = w.__combat ? null : null;
  b.onAttackButton();
  check('Gaha can thrust at a foe 2 tiles away in a straight line', b.targetsInRange.includes(bull));
  check('but not 2 tiles away on a diagonal', !b.targetsInRange.includes(tayo));
  b.cancelMode();
  check('he is still a fighter (Engage, clashes)', E.isMelee(gaha));

  // meditation trance
  park(); turnOf(layra); layra.mp = 2;
  b.onSpellButton(); b.chooseSpell('meditate'); b.chooseSpell('meditate'); await sleep(1300); await idle();
  check('Meditate: no MP yet, she is MEDITATING and Exposed', layra.mp === 2 && layra.meditating && St.statusTags(layra).some((t) => t.text === 'MEDITATING') && St.statusTags(layra).some((t) => t.text === 'EXPOSED'), 'mp ' + layra.mp);
  check('she holds her meditation picture', /layra_meditate/.test(key(layra)), key(layra));
  for (const u of b.units) u.ct = 0; layra.ct = 500;
  b.startTurn(); await sleep(200);
  check('her next turn is spent in the trance: she cannot act', b.activeUnit === layra && layra.hasActed && b.slots.every((s) => !s.enabled || s.label.text === 'End turn'), b.slots.map((s) => s.label.text + (s.enabled ? '' : '(dim)')).join('|'));
  await sleep(1300);
  check('then she wakes with 6 MP back (+1 for the turn)', layra.mp === 2 + 1 + 6 && !layra.meditating, layra.mp);

  // aimed Poison Arrow
  park(); put(archer, 3, 2); put(gaha, 3, 4); turnOf(archer);
  b.castPoisonArrow(archer, gaha, w.__spells ? null : { color: '#9fdc6a' }, () => {}); await sleep(1000);
  check('Poison Arrow: she takes aim (AIMING) and Gaha is MARKED, nothing hits yet', archer.aiming && St.statusTags(gaha).some((t) => t.text === 'MARKED') && !St.isPoisoned(gaha) && gaha.hp === gaha.maxHp);
  const real = w.Math.random; w.Math.random = () => (/shootPoisonArrow/.test(new Error().stack) ? 0.01 : real());
  let done = false; b.releaseAim(archer, () => { done = true; }); await sleep(1800); w.Math.random = real;
  check('next turn the arrow flies: Gaha is hurt and poisoned', done && St.isPoisoned(gaha) && gaha.hp < gaha.maxHp && !archer.aiming, gaha.hp);
  check('and MARKED is gone', !St.statusTags(gaha).some((t) => t.text === 'MARKED'));
  park(); put(archer, 3, 2); put(gaha, 3, 4); turnOf(archer);
  b.castPoisonArrow(archer, gaha, { color: '#9fdc6a' }, () => {}); await sleep(1000);
  put(gaha, 7, 7); done = false; b.releaseAim(archer, () => { done = true; }); await sleep(1200); // 7,7 is 9 tiles away: past her 5-tile reach
  check('if the target walked out of reach, the shot is lost', done && !St.isPoisoned(gaha) && gaha.hp === gaha.maxHp);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
