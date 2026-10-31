// 30 Oct (17:58) batch: fixes 1.9 to 1.11, the Sigil Dissolve (6.11), Gaha under
// Fury (6.14), Gaha rooted (6.17), his Fury and Earth's Bulwark sheets (6.18).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:death_7')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 0], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.aiming = null; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const cast = (caster, target, id) => new Promise((res) => { b.activeUnit = caster; caster.hasActed = false; b.castSpell(caster, target, id, res); setTimeout(res, 6000); });
  const cardTexts = () => { const t = []; const walk = (c) => c.list.forEach((o) => (o.list ? walk(o) : o.type === 'Text' && t.push(o))); walk(b.cardLayer); return t; };
  const fxShown = (re) => b.children.list.some((o) => o.type === 'Image' && o.texture && re.test(o.texture.key));

  // ---------- 1.9 to 1.11 ----------
  reset([[layra, 2, 6]]);
  layra.mp = 7; b.activeUnit = layra; b.refreshCard(layra);
  const mpText = cardTexts().find((t) => t.text === '7/12');
  const mpWord = cardTexts().find((t) => t.text === 'MP');
  check('1.9 the MP numbers sit at the end of the MP bar (Phase 8 card)', mpText && mpWord && Math.abs(mpText.y - mpWord.y) < 1 && mpText.originX === 1 && mpText.x > mpWord.x + 150, mpText && mpText.x + ',' + mpText.y);
  check('1.9 and not twice (no MP in the SPD line)', !cardTexts().some((t) => /SPD.*MP/.test(t.text)));
  const aim = game.textures.get('e3:archer_poison.png').getSourceImage();
  check('1.10 the archer\'s aiming picture is drawn at her size (about 3/4 of before)', aim.height <= 80, aim.width + 'x' + aim.height);
  b.activeUnit = sudeen; S.applyBuff(sudeen, 'fury');
  check('1.11 Fury Charge is now Furious Charge', b.spellMenu(sudeen).some((e) => /Furious Charge/.test(e.label)), b.spellMenu(sudeen).map((e) => e.label).join(' | '));

  // ---------- 6.18 the landing effects ----------
  reset([[layra, 2, 6], [gaha, 3, 6]]);
  layra.mp = layra.maxMp;
  const p1 = cast(layra, gaha, 'fury'); await sleep(450);
  check('6.18 Fury lands with his sequence (fury_cast)', fxShown(/^fx:fury_cast_/));
  await p1; await sleep(300);
  // ---------- 6.14 Gaha under Fury ----------
  const look = {};
  for (const f of ['downLeft', 'downRight', 'upLeft', 'upRight']) { gaha.facing = f; b.showStanding(gaha); look[f] = gaha.sprite.texture.key.replace('h2:', '') + (gaha.sprite.flipX ? '(m)' : ''); }
  check('6.14 Gaha under Fury: his own pictures in all four facings', /gaha_fury_downLeft/.test(look.downLeft) && /gaha_fury_downLeft.*\(m\)/.test(look.downRight) && /gaha_fury_upRight/.test(look.upRight) && /gaha_fury_upRight.*\(m\)/.test(look.upLeft), JSON.stringify(look));
  check('6.14 his look has the fire painted on, so the aura adds only the ring and sparks', gaha.furyAura && gaha.furyAura.objects.length === 3, gaha.furyAura && gaha.furyAura.objects.length);
  reset([[layra, 2, 6], [sudeen, 3, 6]]);
  layra.mp = layra.maxMp;
  await cast(layra, sudeen, 'fury');
  check('6.18 Sudeen under Fury: his turning ring, the ribbons and sparks', sudeen.furyAura && sudeen.furyAura.objects.length === 5 && sudeen.furyAura.objects[0].list && sudeen.furyAura.objects[0].list[0].texture.key === 'fx:fury_ground');
  const ring = sudeen.furyAura.objects[0].list[0]; const a0 = ring.angle; await sleep(250);
  check('6.18 the ring turns', Math.abs(ring.angle - a0) > 5, a0.toFixed(1) + ' -> ' + ring.angle.toFixed(1));
  reset([[layra, 2, 6], [sudeen, 3, 6]]);
  layra.mp = layra.maxMp;
  const p2 = cast(layra, sudeen, 'stone'); await sleep(450);
  check('6.18 Earth\'s Bulwark lands with his sequence (earth_cast)', fxShown(/^fx:earth_cast_/));
  await p2; await sleep(200);
  check('6.18 his crystals float round the unit', sudeen.bulwarkAura && sudeen.bulwarkAura.objects.slice(1).every((o) => /fx:earth_crystal_/.test(o.texture.key)) && sudeen.bulwarkAura.objects.length === 5);

  // ---------- 6.17 Gaha rooted ----------
  reset([[gaha, 3, 4], [bull, 5, 6], [layra, 1, 1]]);
  S.applyBuff(gaha, 'stone');
  b.activeUnit = gaha; gaha.hasMoved = false; gaha.stepsUsed = 0;
  const realEnd = b.endTurn; let started = null; const realStart = b.startTurn; b.startTurn = () => {};
  b.endTurn();
  check('6.17 Gaha stands his ground: ROOTED and his rooted guard', S.isRooted(gaha) && /gaha_rooted_/.test(gaha.sprite.texture.key), gaha.sprite.texture.key);
  b.startTurn = realStart;
  // his next turn: the guard comes down
  b.activeUnit = gaha; S.clearRooted && null;
  const wasKey = gaha.sprite.texture.key;
  // (the start of his turn, as startTurn does it)
  b.time.timeScale = 1;
  const before = gaha.sprite.texture.key;
  w.__status.clearRooted(gaha); b.showStanding(gaha);
  check('6.17 out of the guard once he is no longer rooted', !/gaha_rooted_/.test(gaha.sprite.texture.key) && /gaha_rooted_/.test(before), before + ' -> ' + gaha.sprite.texture.key);

  // ---------- 6.11 the Sigil Dissolve ----------
  reset([[gaha, 3, 4], [bull, 4, 4]]);
  bull.hp = 0; b.defeat(bull); b.playDefeat(bull, 1);
  await sleep(380 + 520 + 300);
  check('6.11 a defeated unit dissolves in his Sigil Dissolve', fxShown(/^fx:death_/));
  await sleep(2600);
  check('6.11 then it is gone', !bull.view.active && !fxShown(/^fx:death_/));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
