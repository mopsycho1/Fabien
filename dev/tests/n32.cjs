// Phase 3 of the Fabien Roadmap (29 Oct): Intercept as a long-range engage, the
// Verse-changed moves (Sudeen, Gaha, Layra), the MP bar rule, Gaha's Stone guard,
// Layra's hop, Wildfire's Burn, and the Swift looks.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:sj_spear_0')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; let ended = 0; b.endTurn = () => { ended++; };
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  // everyone healthy, free, far apart; then place the ones a test needs
  const PARK = [[7, 7], [7, 6], [0, 0], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => {
      if (u.engagedWith) E.endDuel(u);
      u.status = null; u.maxHp = Math.max(u.maxHp, 200); u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null;
      u.view.setAlpha(1); put(u, ...PARK[i]);
    });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode();
  };
  const cast = (caster, target, id) => new Promise((res) => { b.activeUnit = caster; caster.hasActed = false; b.castSpell(caster, target, id, res); setTimeout(res, 6000); });
  const cardText = () => { const t = []; const walk = (c) => c.list.forEach((o) => (o.list ? walk(o) : o.type === 'Text' && t.push(o.text))); walk(b.cardLayer); return t.join(' '); };
  const menu = (u) => { b.activeUnit = u; b.spellGroup = null; return b.spellMenu(u).map((e) => e.label).join(' | '); };
  const realRandom = w.Math.random;

  // ---------- 3.1 Intercept: a long-range engage ----------
  reset([[sudeen, 1, 7], [archer, 5, 7]]);
  // what a blow does from the tile the charge ends on
  const fromTile = (u, c, r, t, share) => { const c0 = u.col, r0 = u.row; put(u, c, r); const d = b.skillHit(u, t, { damageShare: share }); put(u, c0, r0); return d; };
  const halfOnArcher = fromTile(sudeen, 4, 7, archer, 0.5);
  await cast(sudeen, archer, 'intercept'); await sleep(300);
  check('3.1 Intercept charges 4 tiles to the enemy', E && Math.abs(sudeen.col - archer.col) + Math.abs(sudeen.row - archer.row) === 1, sudeen.col + ',' + sudeen.row);
  check('3.1 half damage, and the enemy is locked in a clash with Sudeen', archer.maxHp - archer.hp === halfOnArcher && sudeen.engagedWith === archer && archer.engagedWith === sudeen, (archer.maxHp - archer.hp) + ' vs ' + halfOnArcher);
  check('3.1 no stun on the plain version', !S.isStunned(archer));
  reset([[gaha, 3, 3], [bull, 4, 3], [sudeen, 1, 2]]);
  E.startDuel(gaha, bull);
  await cast(sudeen, bull, 'intercept'); await sleep(300);
  check('3.1 an ally\'s clash: Sudeen takes it over and the ally is free', bull.engagedWith === sudeen && sudeen.engagedWith === bull && !gaha.engagedWith, (bull.engagedWith && bull.engagedWith.name) + ' / gaha ' + (gaha.engagedWith && gaha.engagedWith.name));
  // through the buttons: a lock ends his turn
  reset([[sudeen, 1, 7], [archer, 5, 7]]);
  ended = 0; b.activeUnit = sudeen; b.selectedSpell = 'intercept'; b.pendingTarget = archer; b.confirmSpell();
  { const t = Date.now(); while (Date.now() - t < 6000 && ended === 0) await sleep(50); } // (the charge takes longer when the machine is busy)
  check('3.1 locked in, his turn ends by itself', ended === 1 && sudeen.engagedWith === archer, 'ended ' + ended);

  // ---------- 3.2 + 3.13 Verse-changed moves and the MP bar ----------
  reset([[sudeen, 2, 7], [layra, 3, 7]]);
  check('3.13 no Verse: Sudeen shows no MP, his menu has Intercept', S.mpShown(sudeen) === null && /Intercept/.test(menu(sudeen)), menu(sudeen));
  layra.mp = layra.maxMp;
  await cast(layra, sudeen, 'stone'); await sleep(900);
  check('3.13 a Verse of Stone lends Sudeen its 3 MP', S.mpShown(sudeen) && S.mpShown(sudeen).mp === 3 && S.mpShown(sudeen).lent && layra.mp === layra.maxMp - 3, JSON.stringify(S.mpShown(sudeen)));
  check('3.2 while it lasts, Intercept is Shield Ram (3 MP)', /Shield Ram  3 MP/.test(menu(sudeen)) && !/Intercept/.test(menu(sudeen)), menu(sudeen));
  b.activeUnit = sudeen; b.refreshCard(sudeen);
  check('3.13 his card shows the MP', /MP 3\/3/.test(cardText()), cardText());
  check('3.13 Layra always has hers', S.mpShown(layra) && !S.mpShown(layra).lent && S.mpShown(layra).max === 12);
  S.applyBuff(sudeen, 'stone', 2);
  check('3.13 a Verse doubled by a Husk echo lends 6', S.lentMp(sudeen) === 6, S.lentMp(sudeen));
  S.applyBuff(gaha, 'stone');
  check('3.13 a Verse that changes none of his moves lends nothing (Gaha + Stone: no MP bar)', S.mpShown(gaha) === null);
  S.applyBuff(gaha, 'swiftness');
  check('3.13 Gaha + Swiftness: MP bar, and Spear Throw is Sonic Javelin', S.mpShown(gaha) && S.mpShown(gaha).mp === 3 && /Sonic Javelin  3 MP/.test(menu(gaha)), menu(gaha));
  S.startCooldown(gaha, 'spearThrow');
  check('3.2 a Verse move ignores the cooldown of the move it replaces', b.spellMenu(gaha).find((e) => /Sonic/.test(e.label)).enabled);
  gaha.status.buff.turnsLeft = 1; S.tickBuff(gaha);
  check('3.2 when the Verse fades, the move and the MP bar go back', S.mpShown(gaha) === null && /Spear Throw/.test(menu(gaha)), menu(gaha));

  // ---------- 3.3 to 3.5 Sudeen's Verse Intercepts ----------
  reset([[sudeen, 1, 7], [archer, 4, 7]]);
  S.applyBuff(sudeen, 'stone');
  await cast(sudeen, archer, 'shieldRam'); await sleep(600);
  check('3.3 Shield Ram: no clash, rammed 2 tiles back', !archer.engagedWith && archer.col === 6 && archer.row === 7, archer.col + ',' + archer.row);
  check('3.3 it spent the lent MP, so Intercept is back (and on its cooldown)', S.lentMp(sudeen) === 0 && /Intercept/.test(menu(sudeen)) && S.cooldownOf(sudeen, 'intercept') === 3, menu(sudeen));
  reset([[sudeen, 1, 7], [archer, 5, 7], [bull, 7, 7]]);
  S.applyBuff(sudeen, 'stone');
  await cast(sudeen, archer, 'shieldRam'); await sleep(900);
  check('3.3 into a unit behind it: it slams and is Disoriented', archer.col === 6 && S.isDisoriented(archer), archer.col + ' ' + S.isDisoriented(archer));
  reset([[sudeen, 1, 7], [archer, 5, 7]]);
  S.applyBuff(sudeen, 'fury');
  const fullDmg = fromTile(sudeen, 4, 7, archer, 1);
  await cast(sudeen, archer, 'furyCharge'); await sleep(300);
  check('3.4 Fury Charge: full damage, no clash, no stun', archer.maxHp - archer.hp === fullDmg && !archer.engagedWith && !S.isStunned(archer), (archer.maxHp - archer.hp) + ' vs ' + fullDmg);
  reset([[sudeen, 1, 7], [archer, 5, 7]]);
  S.applyBuff(sudeen, 'swiftness');
  const blitzDmg = fromTile(sudeen, 4, 7, archer, 0.5);
  await cast(sudeen, archer, 'blitz'); await sleep(300);
  check('3.5 Blitz: half damage and stunned, no clash', S.isStunned(archer) && !archer.engagedWith && archer.maxHp - archer.hp === blitzDmg, (archer.maxHp - archer.hp) + ' vs ' + blitzDmg);

  // ---------- 3.6 + 3.11 Sonic Javelin ----------
  reset([[gaha, 0, 3], [archer, 3, 3], [bull, 5, 3]]);
  S.applyBuff(gaha, 'swiftness');
  const plan = b.javelinForm(gaha, archer, require('/home/claude/fabien/src/data/spells.json').sonicJavelin);
  check('3.11 3 tiles away: the throw form', plan.form === 'throw', plan.form);
  let sawThrow = false; const watch = setInterval(() => { if (/gaha_sj_throw/.test(gaha.sprite.texture.key)) sawThrow = true; }, 20);
  const pA = archer.hp, pB = bull.hp;
  await cast(gaha, archer, 'sonicJavelin'); await sleep(300); clearInterval(watch);
  check('3.6 the throw hits every enemy in its line, never missing', archer.hp < pA && bull.hp < pB, (pA - archer.hp) + ' ' + (pB - bull.hp));
  check('3.6 each is knocked back a tile', archer.col === 4 && bull.col === 6, archer.col + ' ' + bull.col);
  check('3.11 his throw pictures play', sawThrow);
  check('3.6 Gaha stays put; Spear Throw is on its cooldown', gaha.col === 0 && S.cooldownOf(gaha, 'spearThrow') === 3);
  // pierces a higher block
  reset([[gaha, 4, 7], [rabdul, 4, 3]]);
  S.applyBuff(gaha, 'swiftness');
  b.activeUnit = gaha; b.chooseSpell('sonicJavelin');
  const pierce = b.targetsInRange.includes(rabdul);
  b.cancelMode(); S.applyBuff(gaha, 'stone'); b.chooseSpell('spearThrow');
  check('3.6 it pierces: a target behind the 2-high block can be hit (Spear Throw can\'t)', pierce && !b.targetsInRange.includes(rabdul));
  b.cancelMode();
  // whirl
  reset([[gaha, 0, 3], [rabdul, 2, 3]]);
  S.applyBuff(gaha, 'swiftness');
  let sawWhirl = false; const watch2 = setInterval(() => { if (/gaha_sj_whirl/.test(gaha.sprite.texture.key)) sawWhirl = true; }, 20);
  const pR = rabdul.hp;
  await cast(gaha, rabdul, 'sonicJavelin'); await sleep(200); clearInterval(watch2);
  check('3.11 up close: he dashes in, whirls down, it is knocked back', gaha.col === 1 && rabdul.hp < pR && rabdul.col === 3, gaha.col + ' ' + rabdul.col);
  check('3.11 his dash-and-whirl pictures play', sawWhirl);
  // sweep
  reset([[gaha, 1, 2], [rabdul, 5, 2]]);
  S.applyBuff(gaha, 'swiftness'); S.applyDisoriented(rabdul);
  const sweepDmg = Math.round(fromTile(gaha, 4, 2, rabdul, 1) * 1.5);
  const pR2 = rabdul.hp;
  await cast(gaha, rabdul, 'sonicJavelin'); await sleep(200);
  check('3.11 a reeling foe 4 tiles away: he zips next to it and sweeps low (1.5x)', Math.abs(gaha.col - rabdul.col) + Math.abs(gaha.row - rabdul.row) === 1 && pR2 - rabdul.hp === sweepDmg, gaha.col + ',' + gaha.row + ' ' + (pR2 - rabdul.hp) + ' vs ' + sweepDmg);

  // ---------- 3.12 Gaha's Stone guard ----------
  reset([[gaha, 3, 3], [bull, 4, 3]]);
  S.applyBuff(gaha, 'stone');
  gaha.hasMoved = false;
  check('3.12 didn\'t move under Stone: Rooted', S.settleRooted(gaha) && S.isRooted(gaha));
  check('3.12 rooted: half damage', b.landHit(gaha, 10).damage === 5, b.landHit(gaha, 10).damage);
  const held = b.pushLoser(gaha, bull, 2);
  check('3.12 rooted: can\'t be pushed', held.path.length === 0 && gaha.col === 3 && !S.isDisoriented(gaha));
  S.clearRooted(gaha); gaha.hasMoved = true;
  check('3.12 if he moved, no guard', !S.settleRooted(gaha));

  // ---------- 3.8 Layra hops between high spots ----------
  reset([[layra, 4, 6], [sudeen, 7, 3]]);
  const reach = (u) => { b.activeUnit = u; u.stepsUsed = 0; u.hasMoved = false; b.cancelMode(); b.startMove(); const k = new Set(b.reachableKeys); b.cancelMode(); return k; };
  check('3.8 walking, nobody steps up 2 levels: the pillar is out of reach', !reach(layra).has('4,5'));
  S.applyBuff(layra, 'swiftness');
  check('3.8 Layra under Swiftness hops up onto it', reach(layra).has('4,5'));
  reset([[layra, 0, 7], [sudeen, 1, 7], [gaha, 0, 6]]);
  check('3.8 boxed in, she can\'t walk', reach(layra).size === 0);
  S.applyBuff(layra, 'swiftness');
  check('3.8 under Swiftness she flies over them (but not onto them)', reach(layra).has('2,7') && !reach(layra).has('1,7'));

  // ---------- 3.7 + 3.9 Layra's changed Lightning ----------
  reset([[layra, 1, 7], [archer, 4, 7], [bull, 4, 6]]);
  S.applyBuff(layra, 'stone');
  b.activeUnit = layra; b.cancelMode(); b.refreshButtons();
  check('3.7 Stone on herself: her attack is Thunderclap', b.slots[1].label.text === 'Thunderclap', b.slots[1].label.text);
  // a sure hit: the dice are fixed only while the attack is worked out (not while it plays)
  await new Promise((r) => { w.Math.random = () => 0.01; b.performAttack(layra, archer, r); w.Math.random = realRandom; setTimeout(r, 5000); });
  await sleep(900);
  check('3.7 the bolt knocks the target a tile back', archer.col === 5, archer.col);
  reset([[layra, 1, 7], [archer, 4, 7], [bull, 4, 6]]);
  S.applyBuff(layra, 'fury');
  b.activeUnit = layra; b.cancelMode(); b.refreshButtons();
  check('3.9 Fury on herself: her attack is Wildfire', b.slots[1].label.text === 'Wildfire', b.slots[1].label.text);
  const bullHp = bull.hp;
  await new Promise((r) => { w.Math.random = () => 0.01; b.performAttack(layra, archer, r); w.Math.random = realRandom; setTimeout(r, 5000); });
  await sleep(700);
  check('3.9 it sets the target alight; fire doesn\'t jump', S.isBurning(archer) && bull.hp === bullHp);
  const before = archer.hp; const lost = S.tickBurn(archer);
  check('3.9 Burn: 2 at the start of its turn', lost === 2 && archer.hp === before - 2);
  archer.hp = 2; S.tickBurn(archer); S.tickBurn(archer);
  check('3.9 like poison, it never takes the last point', archer.hp >= 1 && !S.isBurning(archer), archer.hp);
  reset([[sudeen, 2, 7], [gaha, 3, 7]]);
  S.applyBurn(gaha, 'wildfire'); gaha.hp -= 5;
  await cast(sudeen, gaha, 'herbs'); await sleep(200);
  check('3.9 Herbs put the burn out', !S.isBurning(gaha));

  // ---------- 3.10 Swift looks ----------
  reset([[gaha, 3, 3]]);
  S.applyBuff(gaha, 'swiftness'); b.refreshStatusTags();
  check('3.10 under Swiftness, his swirl turns at his feet', gaha.swiftAura && gaha.swiftAura.length === 1 && /fx:swift_swirl_/.test(gaha.swiftAura[0].texture.key));
  gaha.status.buff = null; b.refreshStatusTags();
  check('3.10 and goes when the Verse does', !gaha.swiftAura);
  check('3.10 the trail pictures are loaded', [0, 1, 2, 3, 4, 5].every((i) => game.textures.exists('fx:swift_trail_' + i)));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
