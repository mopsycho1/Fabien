// Phase 9 (31 Oct): Suleiman's isometric re-render of the five battle
// characters, Gaha's walk (S.4 test), his Spear Throw frames, Layra's
// two-step casting, her blessing stance, and Layra caught in a clash (9.5).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h2:gaha_iso_walk2_upLeft.png')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 7], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.hidden = false; u.moveFrom = null; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const key = (u) => (u.sprite ? u.sprite.texture.key : '');
  const look = (u, f) => { u.facing = f; b.showStanding(u); return key(u).replace(/^\w+:/, '') + (u.sprite.flipX ? ' (m)' : ''); };

  // ---------- 9.11 the new pictures, all four facings ----------
  reset([]);
  for (const [u, name] of [[sudeen, 'sudeen'], [gaha, 'gaha'], [layra, 'layra'], [rabdul, 'rabdul'], [bull, 'bull']]) {
    const f = {}; for (const d of ['downLeft', 'downRight', 'upLeft', 'upRight']) f[d] = look(u, d);
    const ok = Object.values(f).every((k) => k.startsWith(name + '_iso_stand_'));
    // a facing that isn't drawn is the opposite side mirrored
    const mirrored = Object.values(f).filter((k) => k.endsWith('(m)')).length === 2;
    check('9.11 ' + name + ': his new standing pictures in all four facings (two drawn, two mirrored)', ok && mirrored, JSON.stringify(f));
  }
  // heroes are drawn facing up-right (towards the enemy), enemies down-left
  check('9.11 heroes use his north-east picture as drawn, enemies his south-west', look(gaha, 'upRight') === 'gaha_iso_stand_upRight.png' && look(bull, 'downLeft') === 'bull_iso_stand_downLeft.png');

  // the same size as before: tallest standing picture = height
  const shown = (u) => Math.round(u.sprite.displayHeight);
  for (const [u, h] of [[sudeen, 88], [gaha, 100], [layra, 100], [rabdul, 112], [bull, 112]]) { u.facing = 'downLeft'; b.showStanding(u); }
  // (map.json's figureScale shrinks everyone alike)
  const fs = shown(gaha) / 100;
  const same = [[sudeen, 88], [layra, 100], [rabdul, 112], [bull, 112]].every(([u, h]) => Math.abs(shown(u) - h * fs) <= 2);
  check('9.11 each character is drawn the same size as before', same && fs > 0.8 && fs <= 1, [shown(sudeen), shown(gaha), shown(layra), shown(rabdul), shown(bull)].join(',') + ' x' + fs.toFixed(2));
  // an old picture a character keeps (the bull's victory) is still drawn at its old size
  b.showPose(bull, 'victory', -1);
  check('9.11 old pictures kept are rescaled to stay the same size (bull victory about 112 tall)', bull.sprite.texture.key.includes('bull_n6b_victory') && Math.abs(bull.sprite.displayHeight - 112 * fs) < 12, Math.round(bull.sprite.displayHeight));

  // the poses
  const poses = { sudeen: ['ready', 'guard', 'attack', 'hurt', 'heal'], gaha: ['ready', 'guard', 'attack', 'hurt'], layra: ['ready', 'cast', 'chant', 'meditate', 'hurt'], rabdul: ['ready', 'attack', 'dodge', 'hurt'], bull: ['ready', 'guard', 'attack', 'hurt'] };
  for (const [u, name] of [[sudeen, 'sudeen'], [gaha, 'gaha'], [layra, 'layra'], [rabdul, 'rabdul'], [bull, 'bull']]) {
    const got = poses[name].map((p) => { u.facing = 'upRight'; b.showPose(u, p, 1); return p + '=' + (key(u).includes('_iso_') || key(u).includes('_n6_') || key(u).includes('_n8_') || /rabdul_hurt_/.test(key(u)) ? 'new' : key(u)); });
    check('9.11 ' + name + "'s poses are his new pictures", got.every((g) => g.endsWith('=new')), got.join(' '));
  }
  // Verse looks
  S.applyBuff(gaha, 'swiftness'); gaha.facing = 'upRight'; b.showStanding(gaha);
  check('9.11 Gaha under Swift: his new Swift look', /gaha_n6_swiftStand_/.test(key(gaha)), key(gaha));
  gaha.status = null; S.applyBuff(gaha, 'stone'); b.showStanding(gaha);
  check("9.11 Gaha under Earth's Bulwark: his new look", /gaha_n6_stoneGuard_/.test(key(gaha)), key(gaha));
  for (const v of ['swiftness', 'fury', 'stone']) {
    layra.status = null; S.applyBuff(layra, v); b.showStanding(layra);
    check('9.3 Layra under ' + v + ': her blessing stance', /layra_iso_blessed_/.test(key(layra)), key(layra));
  }

  // ---------- 9.12 Gaha walks (his 3 frames, 1 2 3 2) ----------
  reset([[gaha, 4, 6], [rabdul, 0, 0]]);
  b.activeUnit = gaha; gaha.facing = 'upRight';
  let seen = [];
  // (every picture shown on him is recorded, so a busy computer can't skip one)
  const realShow = b.showFrame.bind(b);
  b.showFrame = (u, f) => { const ok = realShow(u, f); if (u === gaha && f) seen.push(f.key.replace(/^\w+:/, '')); return ok; };
  let watch = setInterval(() => {}, 1000);
  await new Promise((res) => b.moveUnit(gaha, 2, 6, res));
  clearInterval(watch);
  b.showFrame = realShow;
  const walked = [...new Set(seen.filter((k) => /walk/.test(k)))];
  check('9.12 walking up-left: his walking frames play while he moves', ['walk0', 'walk1', 'walk2'].every((f) => walked.some((k) => k.includes(f))), walked.join(','));
  const order = seen.filter((k) => /walk/.test(k)).map((k) => k.match(/walk(\d)/)[1]).filter((v, i, a) => v !== a[i - 1]).join('');
  check('9.12 in the order 1, 2, 3, 2', /^0121/.test(order) || /0121/.test(order), order);
  await sleep(50);
  check('9.12 and he stands again when he stops', !/walk/.test(key(gaha)), key(gaha));
  reset([[gaha, 2, 2], [rabdul, 0, 0]]);
  seen = []; watch = setInterval(() => seen.push(key(gaha)), 15);
  await new Promise((res) => b.moveUnit(gaha, 2, 4, res));
  clearInterval(watch);
  check('9.12 walking towards the camera (no frames for that yet): the old hop', !seen.some((k) => /walk/.test(k)));

  // ---------- 9.13 Spear Throw: wind-up and release ----------
  reset([[gaha, 3, 5], [bull, 3, 2]]);
  seen = []; watch = setInterval(() => seen.push(key(gaha)), 15);
  await new Promise((res) => { b.activeUnit = gaha; b.castSpell(gaha, bull, 'spearThrow', res); setTimeout(res, 4000); });
  clearInterval(watch);
  check('9.13 Spear Throw: his wind-up, then the release', seen.some((k) => /gaha_iso_throw_/.test(k)) && seen.some((k) => /gaha_iso_release_/.test(k)));

  // ---------- 9.2 Layra casts in two steps ----------
  reset([[layra, 3, 6], [sudeen, 4, 6]]);
  layra.mp = layra.maxMp;
  seen = []; watch = setInterval(() => seen.push(key(layra)), 15);
  await new Promise((res) => { b.activeUnit = layra; b.castSpell(layra, sudeen, 'swiftness', res); setTimeout(res, 5000); });
  clearInterval(watch);
  const steps = seen.map((k) => (/_chant_/.test(k) ? 'chant' : /_cast_/.test(k) ? 'cast' : '')).filter((v, i, a) => v && v !== a[i - 1]);
  check('9.2 a Verse: she gathers it first (concentrating), then casts it', steps[0] === 'chant' && steps[1] === 'cast', steps.join(','));

  // ---------- 9.5 Layra can be caught in a clash ----------
  reset([[layra, 3, 4], [bull, 3, 3]]);
  check('9.5 an enemy next to Layra can catch her in a clash', E.canEngage(bull, layra));
  check('9.5 but she cannot start one', !E.canEngage(layra, bull));
  b.showPose(layra, 'guard', 1);
  check('9.5 she fends off with her staff (defending herself)', /layra_iso_guard_/.test(key(layra)), key(layra));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
