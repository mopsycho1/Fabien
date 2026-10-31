// Gaha's pictures: relaxed, battle stance, Verse looks, poses, hurt face.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h2:gaha_down.png')) await sleep(50);
  const b = await battle(game);
  const St = w.__status;
  const U = (l) => b.units.find((u) => u.label === l);
  const Hm = require('/home/claude/fabien/src/data/map.json').heights;
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - Hm[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const gaha = U('H2');
  check('Hero 2 is called Gaha', gaha.name === 'Gaha', gaha.name);
  const keys = game.textures.getTextureKeys().filter((k) => k.startsWith('h2:gaha_'));
  check('all 51 of his pictures loaded (32, 15 Sonic Javelin frames from roadmap 3.11, 2 under Fury and 2 rooted from 6.14 and 6.17)', keys.length === 51, keys.length);
  for (const u of b.units) put(u, 7, 7);
  put(U('H1'), 0, 7); put(U('H3'), 1, 7); put(U('E1'), 7, 0); put(U('E2'), 6, 0); put(U('E3'), 5, 0); put(gaha, 3, 6);
  b.faceNearestOpponent(gaha);
  check('far from enemies he stands relaxed', /gaha_stand_/.test(gaha.sprite.texture.key), gaha.sprite.texture.key);
  put(U('E2'), 3, 4); b.faceNearestOpponent(gaha);
  check('an enemy 2 tiles away: battle stance', /gaha_battle_/.test(gaha.sprite.texture.key), gaha.sprite.texture.key);
  St.applyBuff(gaha, 'stone'); b.showStanding(gaha);
  check('under Verse of Stone: the stone picture', /gaha_stone_/.test(gaha.sprite.texture.key), gaha.sprite.texture.key);
  St.applyBuff(gaha, 'swiftness'); b.showStanding(gaha);
  check('under Verse of Swiftness: the swift picture', /gaha_swift_/.test(gaha.sprite.texture.key), gaha.sprite.texture.key);
  gaha.status.buff = null; b.showStanding(gaha);
  check('Verse gone: back to normal', /gaha_battle_/.test(gaha.sprite.texture.key), gaha.sprite.texture.key);
  for (const pose of ['windup', 'attack', 'ready', 'guard', 'dodge', 'hurt', 'knocked', 'down', 'victory']) {
    b.showPose(gaha, pose, 1);
    if (!gaha.sprite.texture.key.endsWith('gaha_' + pose + '.png') && !(pose === 'ready' && /gaha_battle_/.test(gaha.sprite.texture.key))) check('pose ' + pose, false, gaha.sprite.texture.key);
  }
  check('every action pose shows', true);
  b.showStanding(gaha);
  const art = require('/home/claude/fabien/src/data/art.json');
  b.refreshCard(gaha, true);
  const calm = game.textures.getTextureKeys().filter((k) => k.startsWith('round:h2:') && k.endsWith('gaha_face.png'));
  gaha.hp = Math.floor(gaha.maxHp * 0.3); b.updateHpBar(gaha); b.refreshCard(gaha, true);
  const hurt = game.textures.getTextureKeys().filter((k) => k.startsWith('round:h2:') && k.endsWith('gaha_face_hurt.png'));
  check('badly hurt: the card shows his hurt face', calm.length > 0 && hurt.length > 0, calm.length + ' calm, ' + hurt.length + ' hurt');
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
