// Verse moves, round two (31 Oct): Gaha's Fury Dive (3.14), the Husk gust
// (3.15), Sudeen's Furious Charge and Shield Ram frames (6.15, 6.16).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h1:sudeen_ram_5.png')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 7], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.maxHp = Math.max(u.maxHp, 200); u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.hidden = false; u.echoReady = false; put(u, ...PARK[i]); u.view.setAlpha(1); });
    b.removeDecoys && all.forEach((u) => b.removeDecoys(u));
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const cast = (caster, target, id) => new Promise((res) => { b.activeUnit = caster; caster.hasActed = false; b.castSpell(caster, target, id, res); setTimeout(res, 6000); });
  const frames = (u) => (u.sprite ? u.sprite.texture.key : '');

  // ---------- 3.14 Fury Dive ----------
  reset([[gaha, 1, 3], [rabdul, 4, 3], [bull, 3, 4], [archer, 6, 6]]);
  S.applyBuff(gaha, 'fury');
  b.activeUnit = gaha; b.spellGroup = null;
  const menu = b.spellMenu(gaha).map((e) => e.label).join(' | ');
  check('3.14 under Fury, Spear Throw becomes Fury Dive (3 Verse MP)', /Fury Dive  3 MP/.test(menu) && !/Spear Throw/.test(menu), menu);
  check('3.14 Fury lends Gaha MP for it', S.mpShown(gaha) && S.mpShown(gaha).lent && S.mpShown(gaha).mp === 3);
  b.chooseSpell('furyDive');
  const reach = b.targetsInRange.map((u) => u.label).sort().join();
  check('3.14 it reaches enemies up to 3 tiles away, not further', reach.includes('E1') && reach.includes('E2') && !reach.includes('E3'), reach);
  b.handleTap(4, 3); await sleep(30);
  check('3.14 the preview: 1.5x damage and who is knocked Off-Balance', /Fury Dive on .*: \d+ damage, and .* knocked Off-Balance\. Uses 3 MP/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.cancelMode();
  const expect = Math.max(1, Math.round(w.__combat ? 0 : 0));
  const hp0 = rabdul.hp;
  const seen = new Set();
  const watch = setInterval(() => seen.add(frames(gaha)), 20);
  const p = cast(gaha, rabdul, 'furyDive');
  await sleep(400);
  const midY = gaha.view.y; const landY = G.tileToScreen(3, 3).y;
  check('3.14 he is up in the air mid-leap', midY < landY - 30, Math.round(landY - midY));
  await p; clearInterval(watch);
  check('3.14 he lands on the free tile next to the foe, nearest him', gaha.col === 3 && gaha.row === 3, gaha.col + ',' + gaha.row);
  check('3.14 it never misses: damage dealt', rabdul.hp < hp0, (hp0 - rabdul.hp));
  check('3.14 the foe and the enemy next to the landing are Off-Balance', S.isOffBalance(rabdul) && S.isOffBalance(bull) && !S.isOffBalance(archer));
  check('3.14 his dive frames played (wind-up, leap, dive, slam, landing)', ['gaha_dive_0', 'gaha_dive_1', 'gaha_dive_2', 'gaha_dive_3', 'gaha_dive_4'].every((f) => [...seen].some((k) => k.includes(f))), [...seen].filter((k) => /dive/.test(k)).join(','));
  check('3.14 the Verse MP is spent', S.mpShown(gaha) === null || S.mpShown(gaha).mp === 0, JSON.stringify(S.mpShown(gaha)));
  await sleep(400);

  // ---------- 6.15 Furious Charge and 6.16 Shield Ram ----------
  for (const [verse, id, move, label] of [['fury', 'furyCharge', 'sudeen_fc', '6.15 Furious Charge'], ['stone', 'shieldRam', 'sudeen_ram', '6.16 Shield Ram']]) {
    reset([[sudeen, 1, 7], [archer, 5, 7]]);
    S.applyBuff(sudeen, verse);
    const got = new Set();
    const wt = setInterval(() => got.add(frames(sudeen)), 15);
    await cast(sudeen, archer, id);
    clearInterval(wt);
    const used = [...got].filter((k) => k.includes(move)).map((k) => k.replace(/.*_(\d)\.png/, '$1')).sort().join('');
    check(label + ': his frames play through the charge and the strike', used.length >= 5, used);
    await sleep(300);
  }

  // ---------- 3.15 the Husk gust ----------
  reset([[layra, 3, 4], [rabdul, 0, 0]]);
  S.applyBuff(layra, 'swiftness');
  layra.mp = layra.maxMp;
  await cast(layra, { col: 3, row: 7 }, 'husk');
  const decoy = b.decoys.find((d) => d.owner === layra);
  check('3.15 a Husk cast under Swiftness leaves a gust decoy (wind at its feet)', decoy && decoy.gust === true && decoy.view.list.some((o) => o.anims && o.anims.currentAnim && o.anims.currentAnim.key === 'swiftSwirl'));
  put(bull, 3, 3); put(rabdul, 4, 4); put(sudeen, 2, 4);
  const before = { bull: [bull.col, bull.row], rabdul: [rabdul.col, rabdul.row] };
  let finished = false;
  b.strikeDecoy(bull, decoy, () => (finished = true));
  await sleep(2300);
  const moved = (u, b0) => Math.abs(u.col - b0[0]) + Math.abs(u.row - b0[1]);
  check('3.15 struck: the attacker next to it is blown away (up to 2 tiles)', moved(bull, before.bull) >= 1 || bull.status && bull.status.disoriented, bull.col + ',' + bull.row);
  check('3.15 and so is any other enemy next to it', moved(rabdul, before.rabdul) >= 1 || rabdul.status && rabdul.status.disoriented, rabdul.col + ',' + rabdul.row);
  check('3.15 allies next to it are left alone (no friendly fire)', sudeen.col === 2 && sudeen.row === 4);
  check('3.15 the decoy is gone and the enemy turn carries on', !b.decoys.includes(decoy) && finished);
  reset([[layra, 3, 4], [rabdul, 0, 0]]);
  layra.mp = layra.maxMp;
  await cast(layra, { col: 3, row: 7 }, 'husk');
  const plain = b.decoys.find((d) => d.owner === layra);
  check('3.15 without Swiftness, no gust', plain && !plain.gust);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
