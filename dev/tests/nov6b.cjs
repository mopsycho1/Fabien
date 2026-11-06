// 6 Nov set: Rabdul's double hit frames (4.6), the bull's shield throw and Bloodied look (6.33), Tayo's flame stance (6.30).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h3:layra_iso_stand_upRight.png')) await sleep(50);
  const b = await battle(game);
  const G = w.__grid;
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const gaha = U('H2'), rabdul = U('E1'), bull = U('E2');
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const key = (u) => u.sprite.texture.key;
  // Rabdul's double hit plays his two frames, one after the other
  const seen = [];
  const realShow = b.showFrame.bind(b);
  b.showFrame = (u, f) => { if (u === rabdul && f) seen.push(f.key); return realShow(u, f); };
  put(rabdul, 4, 4); put(gaha, 5, 4);
  b.castDoubleHit(rabdul, gaha, w.__spells ? w.__spells.doubleHit : { name: 'Double Hit', color: '#fff', hits: 2, damageShare: 0.6, range: 1 }, () => {});
  await sleep(1800);
  check('4.6 the double hit shows his two multi-hit pictures in turn', seen.some((k) => /rabdul_n6b_multi_f2/.test(k)) && seen.some((k) => /rabdul_n6b_multi_f3/.test(k)), seen.join(','));
  b.showFrame = realShow;
  // the bull: weakened, defeated and victory pictures, and the Bloodied look
  bull.hp = 5; b.showStanding(bull);
  check('6.33 the bull weakened uses his new weak picture', /bull_n6b_weak/.test(key(bull)), key(bull));
  bull.hp = bull.maxHp; bull.fury = 2; b.showStanding(bull);
  check('6.33 the bull with Bloodied stacks shows his Bloodied stance', /bull_n6b_bl3/.test(key(bull)), key(bull));
  b.showPose(bull, 'attack', 1);
  check('6.33 and strikes with the double-gripped mace picture', /bull_n6b_bl5/.test(key(bull)), key(bull));
  bull.fury = 0; b.showStanding(bull);
  check('6.33 without stacks he is back to his normal stance', !/bull_n6b_bl/.test(key(bull)), key(bull));
  b.showPose(bull, 'throw', 1);
  check('6.33 the shield throw has its own picture', /bull_n6b_throw1/.test(key(bull)), key(bull));
  check('6.33 the shield in flight is a four-picture move', game.textures.exists('e2:bull_n6b_shield_f4.png'));
  check('6.30 Tayo has his new battle stance', game.textures.exists('e1:tayo_n6b_battle_f3.png') && game.textures.exists('e1:tayo_n6b_punchFire_f3.png'));
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
