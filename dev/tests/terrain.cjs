// High ground: ranged accuracy, the opening-beat bonus, pushes, falls.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const H = require('/home/claude/fabien/src/data/map.json').heights;
  const T = require('/home/claude/fabien/src/data/terrain.json');
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - H[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(80); };
  const park = () => { for (const u of b.units) put(u, 7, 7); put(U('H1'), 0, 7); put(U('H2'), 1, 7); put(U('H3'), 2, 7); put(U('E1'), 7, 0); put(U('E2'), 6, 0); put(U('E3'), 7, 1); };
  const archer = U('E3'), scout = U('H2'), guard = U('H1'), war = U('E2');
  const combat = require('./combat-bundle.cjs'); combat.setHeightLookup((c, r) => (H[r] && H[r][c]) || 0);
  check('the rock block at 4,5 is 2 levels high (test assumption)', H[5][4] === 2 && H[6][4] === 0 && H[4][4] === 0 && H[3][4] === 0);

  // 1. ranged accuracy
  park(); put(scout, 4, 7); put(archer, 4, 5);
  const fromAbove = combat.getHitChance(archer, scout); put(archer, 3, 5); const flat = combat.getHitChance(archer, scout);
  check('an archer 2 levels up gets +20% to hit', fromAbove - flat === 2 * T.rangedAccuracyPerLevel, flat + ' -> ' + fromAbove);
  park(); put(scout, 4, 5); put(archer, 4, 7);
  const uphill = combat.getHitChance(archer, scout); put(scout, 3, 5); const flat2 = combat.getHitChance(archer, scout);
  check('shooting 2 levels uphill is 20% harder', flat2 - uphill === 2 * T.rangedAccuracyPerLevel, flat2 + ' -> ' + uphill);
  park(); put(war, 4, 6); put(scout, 4, 5);
  check('swords and spears are not affected by height', combat.heightAccuracy(war, scout) === 0);
  // the preview says so
  park(); put(U('H3'), 4, 5); put(war, 4, 2); b.activeUnit = U('H3'); U('H3').hasActed = false; U('H3').hasMoved = true; b.cancelMode();
  b.onAttackButton(); b.handleTap(4, 2);
  check('the attack preview mentions high ground', /\+20% from high ground/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.cancelMode();

  // 2. engaging from above
  park(); put(guard, 4, 5); put(war, 4, 6);
  check('engaging from 2 levels up is worth +4 on the opening beat', E.openingHeightBonus(guard, war, { heightOf: (c, r) => H[r][c] }) === 2 * T.openingHeightBonusPerLevel);
  const ctx = { random: () => 0.5, heightOf: (c, r) => H[r][c] };
  E.startDuel(guard, war);
  const opening = E.resolveBeat(guard, 'press', war, 'guard', ctx, false, true);
  const later = E.resolveBeat(guard, 'press', war, 'guard', ctx, false, false);
  check('the bonus counts on the opening beat only', opening.actorParts.height === 4 && later.actorParts.height === 0, opening.actorParts.height + ' then ' + later.actorParts.height);
  E.endDuel(guard);
  b.activeUnit = guard; guard.hasActed = false; b.cancelMode(); b.onEngageButton(); b.handleTap(4, 6);
  check('the Engage preview mentions it', /\+4 from high ground/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.cancelMode();

  // 3. a push off the rock block: a fall, and one tile further downhill
  park(); put(war, 4, 6); put(scout, 4, 5); scout.hp = scout.maxHp;
  let r = b.pushLoser(scout, war, 1);
  check('pushed off a 2-level block: the push carries one tile further downhill', r.path.length === 2 && scout.col === 4 && scout.row === 3, r.path.map((t) => t.col + ',' + t.row).join(' '));
  check('and the fall costs 4 per level (8)', r.fall && r.fall.damage === 2 * T.fallDamagePerLevel && scout.hp === scout.maxHp - 8, scout.hp);
  // 4. a push up a 2-level step is blocked (it goes sideways instead)
  park(); put(war, 4, 7); put(scout, 4, 6);
  r = b.pushLoser(scout, war, 1);
  check('a push cannot shove someone up a 2-level step', !(scout.col === 4 && scout.row === 5), scout.col + ',' + scout.row);
  // 5. a fall can be lethal
  park(); put(war, 4, 6); put(scout, 4, 5); scout.hp = 5; scout.alive = true;
  r = b.pushLoser(scout, war, 1);
  check('a fall can finish a fighter off', scout.hp === 0 && !scout.alive);
  scout.alive = true; scout.hp = scout.maxHp;

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
