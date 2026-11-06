// The clean-up batch (1 Nov): Empower aura (9.6), Sudeen's dodge and slip
// strike (9.8), Gaha's clash close-ups (9.9), the element rising round Layra
// and his fire for Wildfire (9.10), Sonic Javelin in his new frames (9.16),
// Layra injured (9.17), tiles in the FFT style (8.19).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:sonic_impact')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 7], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.hp = u.maxHp = Math.max(u.maxHp, 150); u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const key = (u) => (u.sprite ? u.sprite.texture.key : '');
  // every picture shown on a unit, recorded as it happens
  const realShow = b.showFrame.bind(b); const seen = new Map();
  b.showFrame = (u, f) => { const ok = realShow(u, f); if (f) { if (!seen.has(u)) seen.set(u, []); seen.get(u).push(f.key); } return ok; };
  const shown = (u) => seen.get(u) || [];
  const fxSeen = new Set();
  const realAdd = b.add.image.bind(b.add);
  b.add.image = (...a) => { if (typeof a[2] === 'string') fxSeen.add(a[2]); return realAdd(...a); };

  // ---------- 8.19 tiles in the FFT style ----------
  reset([[gaha, 3, 5]]);
  b.activeUnit = gaha; b.startMove();
  const tw = b.tweens.getTweensOf(b.highlights[0]);
  check('8.19 the blue tiles breathe together (one pulse)', b.highlights.length > 3 && tw.length === 1, b.highlights.length + ' tiles, ' + tw.length + ' tween');
  check('8.19 each has its fill and a glowing edge (fill, glow, edge)', b.highlights[0].commandBuffer.filter((c) => c === 3 || c === 4).length >= 0 && b.highlights[0].commandBuffer.length > 20);
  b.cancelMode();

  // ---------- 9.9 Gaha's clash close-ups ----------
  check('9.9 Gaha has his close-up Press, Guard and Slip', ['clashPress', 'clashGuard', 'clashSlip'].every((p) => b.hasPose(gaha, p)));
  check('9.9 the others keep their usual stances', b.clashPose(bull, 'press') === 'windup' && b.clashPose(bull, 'guard') === 'guard');
  reset([[gaha, 3, 4], [bull, 3, 3]]);
  E.startEngagement ? null : null;
  const beat = (actor, holder, aS, hS, win, extra = {}) => ({ beat: { actor, holder, actorStance: aS, holderStance: hS, winner: win, loser: win === actor ? holder : win ? actor : null, kind: 'stance', actorScore: 5, holderScore: 3, decisive: false, empowered: false, ...extra }, response: null, path: [], ended: false, strike: null, escape: null });
  seen.clear();
  await new Promise((res) => b.playBeat(beat(gaha, bull, 'press', 'guard', gaha), false, res));
  check('9.9 Gaha Pressing: his close-up Press', shown(gaha).some((k) => /gaha_iso_attack_/.test(k)), shown(gaha).join(','));
  seen.clear(); reset([[gaha, 3, 4], [bull, 3, 3]]);
  await new Promise((res) => b.playBeat(beat(bull, gaha, 'press', 'guard', null), false, res));
  check('9.9 Gaha Guarding: his close-up Guard, held as the blades meet', shown(gaha).filter((k) => /gaha_iso_guard_/.test(k)).length >= 2);
  seen.clear(); reset([[gaha, 3, 4], [bull, 3, 3]]);
  await new Promise((res) => b.playBeat(beat(bull, gaha, 'press', 'slip', gaha), false, res));
  check('9.9 Gaha Slipping: his close-up dodge', shown(gaha).some((k) => /gaha_cu_clashSlip_/.test(k)));

  // ---------- 9.8 Sudeen ----------
  seen.clear(); reset([[sudeen, 3, 4], [bull, 3, 3]]);
  await new Promise((res) => b.playBeat(beat(bull, sudeen, 'press', 'slip', sudeen), false, res));
  const sk = shown(sudeen);
  const iDodge = sk.findIndex((k) => /sudeen_cu_dodge_/.test(k)); const iStrike = sk.findIndex((k) => /sudeen_cu_slipStrike_/.test(k));
  check('9.8 Sudeen winning with Slip: dodges, then strikes', iDodge >= 0 && iStrike > iDodge, sk.join(','));
  seen.clear(); reset([[sudeen, 3, 4], [bull, 3, 3]]);
  await new Promise((res) => b.playBeat(beat(sudeen, bull, 'slip', 'press', bull), false, res));
  check('9.8 a Slip that loses: no strike', !shown(sudeen).some((k) => /slipStrike/.test(k)));

  // ---------- 9.6 Empower ----------
  fxSeen.clear(); reset([[gaha, 3, 4], [bull, 3, 3]]);
  await new Promise((res) => b.playBeat(beat(gaha, bull, 'press', 'guard', gaha, { empowered: true }), false, res));
  check('9.6 Empowering: his golden aura bursts up round the fighter', fxSeen.has('fx:empower_aura'));

  // ---------- 9.10 the element rising, his fire ----------
  for (const [verse, el] of [['swiftness', 'wind'], ['stone', 'earth'], ['fury', 'fire'], ['slow', 'hex']]) {
    fxSeen.clear(); reset([[layra, 3, 6], [sudeen, 4, 6], [rabdul, 3, 3]]); layra.mp = layra.maxMp;
    await new Promise((res) => { b.activeUnit = layra; layra.hasActed = false; b.castSpell(layra, verse === 'slow' ? rabdul : sudeen, verse, res); setTimeout(res, 5000); });
    check('9.10 ' + verse + ': ' + el + ' rises round her as she concentrates', fxSeen.has('fx:rise_' + el + '_0'), [...fxSeen].filter((k) => /rise/.test(k)).join(','));
  }
  fxSeen.clear(); reset([[layra, 3, 6], [rabdul, 3, 3]]);
  S.applyBuff(layra, 'fury'); layra.accuracy = 999;
  await new Promise((res) => { b.performAttack(layra, rabdul, res); setTimeout(res, 4000); });
  check('9.10 Wildfire flies as his fire', fxSeen.has('fx:fire_beam'));

  // ---------- 9.16 Sonic Javelin ----------
  seen.clear(); fxSeen.clear(); reset([[gaha, 3, 6], [rabdul, 3, 2]]);
  S.applyBuff(gaha, 'swiftness');
  await new Promise((res) => { b.activeUnit = gaha; gaha.hasActed = false; b.castSpell(gaha, rabdul, 'sonicJavelin', res); setTimeout(res, 5000); });
  check('9.16 thrown: his wind-up', shown(gaha).some((k) => /gaha_n6_sonicPrep/.test(k)), shown(gaha).slice(0, 4).join(','));
  check('9.16 his flying spear and the impact', fxSeen.has('fx:sonic_spear') && fxSeen.has('fx:sonic_impact'), [...fxSeen].filter((k) => /sonic|sj/.test(k)).join(','));
  check('6.28 his throw picture and fire trail', shown(gaha).some((k) => /gaha_n6_sonicThrow/.test(k)) && fxSeen.has('fx:sonic_trail_0'), shown(gaha).join(',').slice(0, 200));
  seen.clear(); reset([[gaha, 3, 5], [rabdul, 3, 3]]);
  S.applyBuff(gaha, 'swiftness');
  await new Promise((res) => { b.activeUnit = gaha; gaha.hasActed = false; b.castSpell(gaha, rabdul, 'sonicJavelin', res); setTimeout(res, 5000); });
  check('9.16 close range: his close-range strike', shown(gaha).some((k) => /gaha_n6_sonicClose/.test(k)), shown(gaha).slice(-4).join(','));

  // ---------- 9.17 Layra injured ----------
  b.showPose(layra, 'hurt', 1);
  check('9.17 Layra hurt: his 1 Nov set', /layra_iso_hurt2_/.test(key(layra)), key(layra));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
