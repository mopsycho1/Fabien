// Phase 4, the enemy skills (1 Nov), on the Hidden Cavern (FABIEN_MAP=cavern):
// 4.1 Rabdul's Enchant (his MP, the +2, the flaming looks of the bull and the
// archer, the AI), 4.2 Tayo's Earth Drive (half damage, thrown back, the spike
// wall: blocks walking and arrows, crumbles after 2 of his turns; no wall when
// the foe can't be moved), 4.3 Tayo in for the bull, and the calmer cavern lights.
// Run with FABIEN_MAP=cavern FABIEN_BENCH= (nobody sits out, so the bull can be tested too).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:spike_2')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, C = w.__combat;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3'), tayo = U('E4');
  const all = [sudeen, gaha, layra, rabdul, bull, archer, tayo];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[0, 8], [1, 8], [0, 7], [8, 0], [7, 0], [8, 1], [6, 0]];
  const reset = (placed) => {
    for (const sp of [...b.spikes]) b.removeSpike(sp);
    all.forEach((u, i) => { u.status = null; u.alive = true; u.hp = u.maxHp = Math.max(u.maxHp, 150); u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.accuracy = 999; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const key = (u) => (u.sprite ? u.sprite.texture.key : '');
  const seen = new Map();
  const realShow = b.showFrame.bind(b);
  b.showFrame = (u, f) => { const ok = realShow(u, f); if (f) { if (!seen.has(u)) seen.set(u, []); seen.get(u).push(f.key); } return ok; };
  const shown = (u) => seen.get(u) || [];

  // ---------- 4.3 ----------
  // (this test runs with FABIEN_BENCH= so all four are on the board; the map's own line-up is checked here)
  check('4.3 the cavern line-up: Tayo in for the bull (3 against 3)', b.lineUp.alsoFighting.includes('e1') && b.lineUp.sittingOut.includes('e2'), JSON.stringify(b.lineUp));

  // ---------- 4.1 the rules ----------
  check('4.1 Rabdul has his own MP (9) and Enchant', rabdul.maxMp === 9 && rabdul.spells.includes('enchant') && S.mpShown(rabdul) && S.mpShown(rabdul).max === 9);
  reset([[bull, 4, 6], [sudeen, 4, 7]]);
  const before = C.getDamage(bull, sudeen);
  S.applyEnchant(bull, 'enchant');
  check('4.1 an enchanted weapon hits 2 harder', C.getDamage(bull, sudeen) === before + 2, before + ' -> ' + C.getDamage(bull, sudeen));
  S.applyDrenched(sudeen, 2);
  const wet = C.getDamage(bull, sudeen);
  S.applyEnchant(bull, 'enchant'); bull.status.enchant = null;
  check('4.1 against a Drenched target only +1 (the water dulls the flames)', wet === C.getDamage(bull, sudeen) + 1 && C.drenchedEffect({ ...bull, status: { enchant: { damage: 2 } } }, sudeen) === 'less', wet);
  S.applyEnchant(bull, 'enchant');
  S.tickBuff(bull); S.tickBuff(bull);
  const twoLeft = S.isEnchanted(bull);
  S.tickBuff(bull);
  check('4.1 it lasts 3 of the unit\'s turns', twoLeft && !S.isEnchanted(bull));
  check('4.1 shown as ENCHANTED with his icon', (() => { S.applyEnchant(bull, 'enchant'); return S.statusTags(bull).some((t) => t.icon === 'enchanted'); })());

  // ---------- 4.1 the cast and the looks ----------
  reset([[rabdul, 4, 2], [bull, 4, 4], [sudeen, 4, 6]]);
  seen.clear();
  await new Promise((res) => { b.activeUnit = rabdul; b.castEnchant(rabdul, bull, w.__spells ? w.__spells.enchant : { name: 'Enchant', color: '#ff8a3c', damage: 2 }, res); setTimeout(res, 5000); });
  check('4.1 Rabdul chants, then casts (his 31 Oct pictures)', shown(rabdul).some((k) => /rabdul_iso_chant/.test(k)) && shown(rabdul).some((k) => /rabdul_iso_cast/.test(k)), shown(rabdul).slice(0, 4).join(','));
  check('4.1 the bull is enchanted when the symbol lands', S.isEnchanted(bull));
  b.showStanding(bull);
  check('4.1 the bull shows his flaming mace and shield', /bull_ench_battle_/.test(key(bull)), key(bull));
  b.showPose(bull, 'attack', -1);
  check('4.1 and strikes with the flaming mace', /bull_ench_attack_/.test(key(bull)), key(bull));
  check('4.1 Shango\'s symbol glows at his feet', !!bull.enchantAura && bull.enchantAura.objects.length > 0);
  S.applyEnchant(tayo, 'enchant'); b.refreshStatusTags();
  /* Tayo has his own flaming pictures since 6 Nov (6.30), so neither he nor the bull gets the drawn fire */ check('4.1 Tayo and the bull wear their painted flames, no drawn fire', !(tayo.enchantAura && tayo.enchantAura.objects.some((o) => o.texture && /rise_fire/.test(o.texture.key))) && !(bull.enchantAura && bull.enchantAura.objects.some((o) => o.texture && /rise_fire/.test(o.texture.key))));
  tayo.status = null; b.refreshStatusTags();
  S.applyEnchant(rabdul, 'enchant'); b.refreshStatusTags(); for (let k = 0; k < 20 && !rabdul.sprite.isTinted; k++) await new Promise((r) => setTimeout(r, 50)); /* the flicker dips to white now and then */
  /* 4.4 (8 Nov): a unit without painted flames gets embers from the weapon hand and an orange flicker, no picture over the body */
  check('4.4 Rabdul (no painted flames): no fire picture over the body, an ember emitter, a flicker tint', !!rabdul.enchantAura && !rabdul.enchantAura.objects.some((o) => o.texture && /rise_fire/.test(o.texture.key)) && rabdul.enchantAura.objects.some((o) => o.emitter) && rabdul.sprite.isTinted, JSON.stringify([!!rabdul.enchantAura, rabdul.hasEnchantedArt, rabdul.enchantAura && rabdul.enchantAura.objects.length, rabdul.sprite.isTinted, rabdul.hidden]));
  rabdul.status = null; b.refreshStatusTags();
  check('4.4 the flicker tint and the embers go when Enchant ends', !rabdul.enchantAura && !rabdul.sprite.isTinted);
  S.applyBuff(sudeen, 'fury'); b.refreshStatusTags();
  check('Fury on Sudeen: no fire picture over his body, no turning cutouts (1.25)', !!sudeen.furyAura && !sudeen.furyAura.objects.some((o) => o.texture && /rise_fire|fury_ribbons/.test(o.texture.key)));
  sudeen.status = null; b.refreshStatusTags();
  S.applyEnchant(archer, 'enchant'); b.showStanding(archer);
  check('4.1 the archer shows her flaming bow', /archer_ench_/.test(key(archer)), key(archer));
  S.applyEnchant(rabdul, 'enchant'); b.showPose(rabdul, 'attack', -1);
  check('4.1 Rabdul himself strikes with his flaming spear', /rabdul_iso_fire_/.test(key(rabdul)), key(rabdul));
  bull.status.enchant = null; b.refreshStatusTags(); b.showStanding(bull);
  check('4.1 when it ends: his own pictures again, and the symbol goes', !/bull_ench/.test(key(bull)) && !bull.enchantAura, key(bull));

  // ---------- 4.1 the AI ----------
  reset([[rabdul, 4, 2], [bull, 4, 4], [sudeen, 4, 6], [archer, 8, 0]]);
  rabdul.mp = 9; rabdul.status = null;
  let cast = null; const realEnchant = b.castEnchant.bind(b);
  b.castEnchant = (c, t, sp, done) => { cast = t; done(); };
  b.activeUnit = rabdul; b.enemyAttack(rabdul); await sleep(400);
  check('4.1 Rabdul enchants the hardest hitter in the fight (the bull)', cast === bull, cast && cast.name);
  check('4.1 it costs 3 MP and has a cooldown', rabdul.mp === 6 && S.cooldownOf(rabdul, 'enchant') > 0, rabdul.mp);
  cast = null; S.applyEnchant(bull, 'enchant'); rabdul.status.cooldowns = {}; rabdul.hasActed = false;
  b.activeUnit = rabdul; b.enemyAttack(rabdul); await sleep(400);
  check('4.1 nobody gets it twice: next he picks someone else in the fight (or himself)', cast !== bull, cast && cast.name);
  // his own weapon waits when a foe is already in reach: he strikes instead
  reset([[rabdul, 4, 5], [sudeen, 4, 6]]);
  rabdul.mp = 9; rabdul.status = null; cast = null;
  let struck = false; const realAtk = b.performAttack.bind(b); const realDouble = b.castDoubleHit.bind(b);
  b.performAttack = (a, t, done) => { struck = true; done(); }; b.castDoubleHit = (a, t, sp2, done) => { struck = true; done(); };
  b.activeUnit = rabdul; b.enemyAttack(rabdul); await sleep(400);
  check('4.1 only himself to enchant and a foe next to him: he strikes now', cast === null && struck);
  b.performAttack = realAtk; b.castDoubleHit = realDouble;
  b.castEnchant = realEnchant;

  // ---------- 4.2 Earth Drive ----------
  check('4.2 Tayo has Earth Drive', tayo.spells.includes('earthDrive'));
  reset([[tayo, 3, 7], [gaha, 4, 7]]);
  const sp = w.__spellsData;
  const hp0 = gaha.hp; const full = C.getDamage(tayo, gaha);
  seen.clear();
  await new Promise((res) => { b.activeUnit = tayo; b.castEarthDrive(tayo, gaha, { name: 'Earth Drive', color: '#d9a066', damageShare: 0.5, push: 1, turns: 2 }, res); setTimeout(res, 5000); });
  check('4.2 his Earth Drive frames play', shown(tayo).filter((k) => /tayo_drive_/.test(k)).length >= 4, shown(tayo).join(','));
  check('4.2 half damage', hp0 - gaha.hp === Math.max(1, Math.round(full * 0.5)), (hp0 - gaha.hp) + ' of ' + full);
  check('4.2 thrown back a tile', gaha.col === 5 && gaha.row === 7, gaha.col + ',' + gaha.row);
  check('4.2 the spike stands where he was', !!b.spikeAt(4, 7) && b.spikeAt(4, 7).view && b.spikeAt(4, 7).view.texture.key.indexOf('fx:spike') === 0);
  check('4.2 nobody can walk through it', b.isBlocked(4, 7));
  check('4.2 it stops arrows', !C.hasClearShot({ col: 2, row: 7 }, { col: 6, row: 7 }));
  b.tickSpikes(tayo);
  check('4.2 still standing after one of his turns', !!b.spikeAt(4, 7));
  b.tickSpikes(tayo); await sleep(500);
  check('4.2 crumbles at the start of his second turn after', !b.spikeAt(4, 7) && C.hasClearShot({ col: 2, row: 7 }, { col: 6, row: 7 }));

  reset([[tayo, 3, 7], [gaha, 4, 7], [sudeen, 5, 7]]);
  await new Promise((res) => { b.activeUnit = tayo; b.castEarthDrive(tayo, gaha, { name: 'Earth Drive', color: '#d9a066', damageShare: 0.5, push: 1, turns: 2 }, res); setTimeout(res, 5000); });
  check('4.2 a unit behind him: he slams into it (Disoriented) and no wall is left', gaha.col === 4 && S.isDisoriented(gaha) && !b.spikeAt(4, 7));

  reset([[tayo, 3, 7], [layra, 4, 7]]);
  let drove = null; const realDrive = b.castEarthDrive.bind(b);
  b.castEarthDrive = (u, t, s2, done) => { drove = t; done(); };
  tayo.status = null; b.activeUnit = tayo; b.enemyAttack(tayo); await sleep(400);
  check('4.2 the AI: Tayo drives a spike under a foe next to him', drove === layra, drove && drove.name);
  b.castEarthDrive = realDrive;

  reset([[tayo, 3, 7], [gaha, 4, 7]]);
  await new Promise((res) => { b.activeUnit = tayo; b.castEarthDrive(tayo, gaha, { name: 'Earth Drive', color: '#d9a066', damageShare: 0.5, push: 1, turns: 2 }, res); setTimeout(res, 5000); });
  b.defeat(tayo); await sleep(900);
  check('4.2 his spikes fall with him', !b.spikeAt(4, 7));
  tayo.alive = true;

  // ---------- the lights ----------
  const glow = b.children.list.filter((o) => o.texture && o.texture.key === 'fx-glow');
  const fast = glow.filter((o) => b.tweens.getTweensOf(o).some((t) => t.data && t.data.some((d) => d.duration < 400)));
  check('lights: the lamp glows breathe slowly (no fast flicker)', glow.length > 0 && fast.length === 0, glow.length + ' glows, ' + fast.length + ' fast');
  const dots = b.children.list.filter((o) => o.type === 'ParticleEmitter' && o.texture && o.texture.key === 'fx-dot' && o.depth === 71);
  check('lights: no glowing dust drifting over the sealed cavern', dots.length === 0, dots.length);
  const flames = b.children.list.filter((o) => o.type === 'Graphics' && b.tweens.getTweensOf(o).length > 0);
  check('lights: every flickering flame sits on its own spot (it scales in place, it does not slide)', flames.length > 0 && flames.every((o) => o.x !== 0 || o.y !== 0), flames.length);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
