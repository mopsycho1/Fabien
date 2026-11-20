// Phase 10, King Alagara (roadmap 10.17 to 10.22, class sheet v2 "Active and Echo"; cooldowns in place of SP).
// Every skill: his numbers, Attunement (Active and Echo slots, the Active one 50 percent stronger, the Echo gives
// no stat bonus, it takes over when the Active one wears off), Swap Verse (free, once a turn) and its three Surges,
// Drawn Blade (a hit locks a clash with the momentum his way), Claim (a blessing from an ally or a foe), Mantle
// (his Verse at half strength on allies beside him), Gale Cut (any form: a dash through a line of foes), Rending
// Draw (Fury: ignores 2 defense, throws 2 back; from the Echo 75 percent and a longer cooldown), Unmoved (Stone:
// a push cancelled and answered), his look per Verse, the skills list's pages, and the AI.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n87.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, C = w.__combat, E = w.__engagement;
  const U = (id) => b.units.find((u) => u.id === id);
  const a = U('h5');
  check('Alagara is in the battle (units.json, the cavern line-up)', !!a, b.units.map((u) => u.id).join(','));
  if (!a) { console.log('FAILED'); process.exit(1); }
  b.endTurn = () => {};
  b.enemySecondWalk = false;
  b.runEnemyTurn = () => {}; const realEnemyAttack = b.enemyAttack.bind(b); b.enemyAttack = () => {}; b.enemyWrapUp = () => {}; b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const foes = b.units.filter((u) => u.side === 'enemy'), friends = b.units.filter((u) => u.side === 'hero' && u !== a);
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u === a) continue;
      u.engagedWith = null; u.engagement = null; u.alive = true; u.hp = u.maxHp; u.status = fresh();
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    a.status = fresh(); a.attune = { echo: null, swapped: false }; a.engagedWith = null; a.hp = a.maxHp;
    a.hasActed = false; a.hasMoved = false; a.stepsUsed = 0; a.surgePress = 0; a.surgeStone = false;
    b.placeUnit(a, 5, 5);
    b.activeUnit = a; b.busy = false; b.battleOver = false; b.cancelMode();
  };
  // (the game runs in the test browser's window: its own Math.random is the one to steer)
  const sure = (fn) => { const real = w.Math.random; let n = 0; w.Math.random = () => (n < 6 ? 0.02 + (n++ * 0.004) : real()); try { return fn(); } finally { w.Math.random = real; } };
  const waitDone = async (go) => { let done = false; go(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30); await sleep(150); return done; };
  const gadara = U('e5'), bull = U('e2'), rab = U('e4'), tayo = U('e1');
  const sudeen = U('h1'), gaha = U('h2');

  // 1. profile (10.17)
  park();
  check('Scout, Sovereign: agility high, defense low, cooldowns not SP', a.job === 'vessel' && a.contest.agility >= 7 && a.defense <= 2 && a.maxMp === 0, [a.attack, a.defense, a.evade, a.speed, a.move].join(','));
  check('two Verse slots (Attunement)', !!a.attune && a.attune.echo === null);

  // 2. Attunement: a second Verse sends the first to the Echo
  park();
  St.applyBuff(a, 'fury');
  St.applyBuff(a, 'swiftness');
  check('a second Verse: Swiftness Active, Fury in the Echo', a.status.buff.id === 'swiftness' && a.attune.echo && a.attune.echo.id === 'fury');
  check('the Active Verse is 50 percent stronger on him (evade +15 -> +23)', St.buffOf(a).boosts.evade === 23, St.buffOf(a).boosts.evade);
  check('the Echo gives no stat bonus (no attack from Fury)', St.statMod(a, 'attack') === 0, St.statMod(a, 'attack'));
  check('the Echo shows over him (ECHO FURY)', St.statusTags(a).some((t) => /ECHO FURY/.test(t.text)));
  St.applyBuff(a, 'swiftness');
  check('the same Verse again just refreshes (the Echo stays)', a.attune.echo && a.attune.echo.id === 'fury');
  a.status.buff.turnsLeft = 1; a.attune.echo.turnsLeft = 3;
  St.tickBuff(a);
  check('when the Active Verse wears off, the Echo takes over (no Surge)', a.status.buff && a.status.buff.id === 'fury' && !a.attune.echo);

  // 3. Swap Verse: free, once a turn, Surges
  park();
  St.applyBuff(a, 'fury'); St.applyBuff(a, 'swiftness'); // Active Swiftness, Echo Fury
  b.chooseSpell('verseSwap');
  check('Swap: Fury Active, Swiftness to the Echo', a.status.buff.id === 'fury' && a.attune.echo.id === 'swiftness');
  check('...free (no action)', !a.hasActed);
  check('...Fury Surge: his next Press a step further', a.surgePress === 1);
  b.chooseSpell('verseSwap');
  check('...once a turn', a.status.buff.id === 'fury', b.kingBlock(a, 'verseSwap'));
  park(); St.applyBuff(a, 'fury'); St.applyBuff(a, 'swiftness'); St.applyBuff(a, 'fury'); // Active Fury, Echo Swiftness
  a.stepsUsed = 3;
  b.chooseSpell('verseSwap');
  check('Swiftness Surge: a free step', a.stepsUsed === 2, a.stepsUsed);
  park(); St.applyBuff(a, 'stone'); St.applyBuff(a, 'fury'); St.applyOffBalance(a);
  b.chooseSpell('verseSwap');
  check('Stone Surge: Off-Balance shaken off', !St.isOffBalance(a));
  b.placeUnit(bull, 5, 4);
  b.pushLoser(a, bull, 2);
  check('...and the next push this turn is cancelled', a.col === 5 && a.row === 5);
  // the Surge's Press: a won Press moves the momentum one more step
  park();
  b.placeUnit(tayo, 5, 6);
  a.surgePress = 1;
  E.startDuel(a, tayo);
  const real = w.Math.random; let n = 0; w.Math.random = () => (n++ % 2 ? 0.95 - (n % 5) * 0.002 : 0.03 + (n % 5) * 0.002);
  const beat = E.resolveBeat(a, 'press', tayo, 'slip');
  w.Math.random = real;
  check('Fury Surge: his won Press shifts the momentum one step further', beat.kind !== 'win' || beat.winner !== a || (beat.shift >= 2 && a.surgePress === 0), beat.kind + ' shift ' + beat.shift);
  E.endDuel(a);

  // 4. Drawn Blade: a full blow; a hit locks a clash with the momentum one step his way
  park();
  b.placeUnit(tayo, 5, 6);
  let hp0 = tayo.hp;
  const full = C.getDamage(a, tayo);
  St.startCooldown(a, 'drawnBlade'); a.hasActed = true;
  await waitDone((d) => sure(() => b.castKingSkill(a, tayo, 'drawnBlade', d)));
  check('Drawn Blade: a full blow', hp0 - tayo.hp === full, (hp0 - tayo.hp) + ' vs ' + full);
  check('...locks them in a clash', a.engagedWith === tayo);
  if (E.isStanceDuel()) check('...with the momentum one step his way (a free Press)', E.momentumOf(a) >= 1, E.momentumOf(a));
  check('...ready again after 3 turns', St.cooldownOf(a, 'drawnBlade') === 3);
  if (a.engagedWith) E.endDuel(a);

  // 5. Claim: a blessing from the unit next to him, ally or foe
  park();
  b.placeUnit(bull, 5, 6); St.applyBuff(bull, 'fury');
  check('Claim is aimed at a blessed unit next to him', b.kingTargets(a, 'claim').includes(bull));
  await waitDone((d) => b.castKingSkill(a, bull, 'claim', d));
  check('...the foe loses it', !St.buffOf(bull));
  check('...it is his for 2 turns (Active)', a.status.buff && a.status.buff.id === 'fury' && a.status.buff.turnsLeft === 2);
  park();
  b.placeUnit(gaha, 5, 6); St.applyBuff(gaha, 'swiftness'); St.applyBuff(a, 'stone');
  await waitDone((d) => b.castKingSkill(a, gaha, 'claim', d));
  check('...from an ally too, and his old Verse goes to the Echo', a.status.buff.id === 'swiftness' && a.attune.echo && a.attune.echo.id === 'stone' && !St.buffOf(gaha));
  park();
  b.placeUnit(rab, 5, 6); rab.status.enchant = { damage: 2, turnsLeft: 3 };
  await waitDone((d) => b.castKingSkill(a, rab, 'claim', d));
  check('...an Enchanted weapon too', !rab.status.enchant && a.status.enchant && a.status.enchant.turnsLeft === 2);

  // 6. Mantle: his Active Verse at half strength on allies beside him, for their next turn
  park();
  check('Mantle needs an Active Verse', b.kingBlock(a, 'mantle') === 'needs a Verse');
  St.applyBuff(a, 'fury');
  b.placeUnit(gaha, 5, 6); b.placeUnit(sudeen, 4, 5);
  await waitDone((d) => b.castKingSkill(a, a, 'mantle', d));
  check('Mantle: allies beside him get Fury', St.buffOf(gaha) && St.buffOf(gaha).id === 'fury' && St.buffOf(sudeen) && St.buffOf(sudeen).id === 'fury');
  check('...at half strength (attack +1)', St.buffOf(gaha).boosts.attack === 1, St.buffOf(gaha).boosts.attack);
  check('...for one turn', gaha.status.buff.turnsLeft === 1, gaha.status.buff.turnsLeft);

  // 7. Gale Cut: a dash through a line of foes (in every form since 20 Nov, 10.34; more in n90)
  park();
  check('Gale Cut needs no Verse (10.34)', b.kingBlock(a, 'galeCut') === null, b.kingBlock(a, 'galeCut'));
  St.applyBuff(a, 'swiftness');
  b.placeUnit(tayo, 6, 5); b.placeUnit(bull, 7, 5);
  const plan = b.galePlan(a, tayo);
  check('the dash cuts both foes in the line and lands past them', plan.hits.includes(tayo) && plan.hits.includes(bull) && plan.land && plan.land.col >= 8, JSON.stringify(plan.land));
  const t0 = tayo.hp, b0 = bull.hp;
  St.startCooldown(a, 'galeCut'); a.hasActed = true;
  await waitDone((d) => sure(() => b.castKingSkill(a, tayo, 'galeCut', d)));
  check('Gale Cut: both are cut', tayo.hp < t0 && bull.hp < b0, (t0 - tayo.hp) + ', ' + (b0 - bull.hp));
  check('...he stands where the dash ended, his move spent', a.col === plan.land.col && a.row === plan.land.row && a.stepsUsed === Infinity);

  // 8. Rending Draw (Fury): ignores 2 defense, throws 2 back; from the Echo 75 percent and one more turn of cooldown
  park();
  check('Rending Draw needs Fury', b.kingBlock(a, 'rendingDraw') === 'needs Fury');
  St.applyBuff(a, 'fury');
  b.placeUnit(a, 3, 9); b.placeUnit(tayo, 4, 9); tayo.hp = tayo.maxHp = 200; // flat ground (a push downhill goes further)
  const rend = Math.max(1, Math.round(C.getDamage(a, { ...tayo, defense: tayo.defense - 2 })));
  hp0 = tayo.hp;
  St.startCooldown(a, 'rendingDraw'); a.hasActed = true;
  await waitDone((d) => sure(() => b.castKingSkill(a, tayo, 'rendingDraw', d)));
  check('Rending Draw ignores 2 defense', hp0 - tayo.hp === rend, (hp0 - tayo.hp) + ' vs ' + rend);
  check('...and throws the foe 2 tiles back', tayo.col === 6 && tayo.row === 9, tayo.col + ',' + tayo.row);
  check('...ready again after 3 turns (from the Active Verse)', St.cooldownOf(a, 'rendingDraw') === 3);
  park();
  St.applyBuff(a, 'fury'); St.applyBuff(a, 'stone'); // Fury in the Echo
  b.placeUnit(a, 3, 9); b.placeUnit(tayo, 4, 9); tayo.hp = tayo.maxHp = 200; // flat ground
  check('from the Echo it still works', !b.kingBlock(a, 'rendingDraw'));
  const rendEcho = Math.max(1, Math.round(C.getDamage(a, { ...tayo, defense: tayo.defense - 2 }) * 0.75));
  hp0 = tayo.hp;
  St.startCooldown(a, 'rendingDraw'); a.hasActed = true;
  await waitDone((d) => sure(() => b.castKingSkill(a, tayo, 'rendingDraw', d)));
  check('...at 75 percent', hp0 - tayo.hp === rendEcho, (hp0 - tayo.hp) + ' vs ' + rendEcho);
  check('...with one more turn of cooldown (4)', St.cooldownOf(a, 'rendingDraw') === 4, St.cooldownOf(a, 'rendingDraw'));
  tayo.maxHp = 53;

  // 9. Unmoved (Stone): a push cancelled, answered with a half-strength counter
  park();
  St.applyBuff(a, 'stone');
  b.placeUnit(bull, 5, 4);
  hp0 = bull.hp;
  b.pushLoser(a, bull, 2);
  check('Unmoved: the push is cancelled', a.col === 5 && a.row === 5);
  check('...he answers with a counter', bull.hp < hp0, hp0 + ' -> ' + bull.hp);
  check('...then it waits 3 turns', St.cooldownOf(a, 'unmoved') === 3);
  b.pushLoser(a, bull, 1);
  check('...so the next push moves him', a.col !== 5 || a.row !== 5, a.col + ',' + a.row);
  check('Unmoved is a reaction, not in his skills list', !b.spellMenu(a).some((e) => /Unmoved/.test(e.label)));

  // 10. his look follows the Active Verse
  park();
  const A = w.__art;
  if (A && A.standingFrame) {
    St.applyBuff(a, 'fury');
    const f = A.standingFrame('h5', 'downLeft', true, 'fury');
    check('under Fury he stands in his Fury picture', f && /alagara_fury/.test(f.key), f && f.key);
    const s = A.standingFrame('h5', 'downLeft', true, 'swiftness');
    check('under Swiftness in his Swift picture', s && /alagara_swift/.test(s.key), s && s.key);
  }

  // 11. the skills list: more than three skills go on pages (More)
  park();
  St.applyBuff(a, 'fury'); St.applyBuff(a, 'swiftness');
  b.onSpellButton();
  const labels = () => b.slots.map((s) => s.label && s.label.text).filter(Boolean);
  check('his skills list has pages (More)', labels().some((l) => /More/.test(l)), labels().join(' | '));
  b.cancelMode();

  // 12. the AI (he can play on the enemy side too: the same choices)
  park();
  St.applyBuff(bull, 'fury'); b.placeUnit(bull, 5, 6);
  const casts = []; const orig = b.castKingSkill.bind(b); b.castKingSkill = (c, t, id, d) => { casts.push(id); return orig(c, t, id, d); };
  b.kingAiAct(a, () => {});
  check('AI: Claims a blessing off the foe beside him', casts.includes('claim'), casts.join(','));
  await sleep(1700);
  park(); casts.length = 0;
  St.applyBuff(a, 'swiftness');
  b.placeUnit(tayo, 6, 5); b.placeUnit(bull, 7, 5);
  b.kingAiAct(a, () => {});
  check('AI: Gale Cut through two foes in a line', casts.includes('galeCut'), casts.join(','));
  await sleep(1700);
  park(); casts.length = 0;
  St.applyBuff(a, 'fury'); b.placeUnit(gaha, 4, 5);
  b.kingAiAct(a, () => {});
  check('AI: Mantle on an ally beside him', casts.includes('mantle'), casts.join(','));
  await sleep(1700);
  park(); casts.length = 0;
  b.placeUnit(tayo, 5, 6);
  b.kingAiAct(a, () => {});
  check('AI: Drawn Blade on a foe beside him', casts.includes('drawnBlade'), casts.join(','));
  b.castKingSkill = orig;
  await sleep(1700);
  const errs = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', errs.length === 0, errs.join('|').slice(0, 300));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
