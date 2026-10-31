// Fixes 1.7 and 1.8 (29 Oct evening): the archer's combat-ready stance; the bull and Rabdul facing the heroes at the start.
const { start, battle } = require('./boot.cjs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('e3:archer_stance_upLeft.png')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const G = w.__grid;
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const key = (u) => u.sprite.texture.key;
  const bull = U('E2'), rabdul = U('E1'), archer = U('E3'), gaha = U('H2'), sudeen = U('H1'), layra = U('H3');
  const A = '/home/claude/fabien/public/art/';
  const md5 = (f) => execSync('md5sum ' + A + f).toString().slice(0, 32);
  const was = (f) => execSync('cd /home/claude/fabien && git show a06e253:public/art/' + f + ' | md5sum').toString().slice(0, 32); // before this fix
  // 1.8
  check('1.8 the bull\'s and Rabdul\'s down-left and down-right pictures were swapped (standing and battle)',
    ['bull_stand', 'bull_battle', 'rabdul_stand', 'rabdul_battle'].every((s) => md5(s + '_downLeft.png') === was(s + '_downRight.png') && md5(s + '_downRight.png') === was(s + '_downLeft.png')));
  check('1.8 at the start both face down-left, toward the heroes, with the down-left picture',
    bull.facing === 'downLeft' && /bull_stand_downLeft/.test(key(bull)) && !bull.sprite.flipX && rabdul.facing === 'downLeft' && /rabdul_stand_downLeft/.test(key(rabdul)) && !rabdul.sprite.flipX,
    key(bull) + ' ' + key(rabdul));
  // 1.7
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  put(gaha, 0, 7); put(sudeen, 1, 7); put(layra, 2, 7); put(archer, 7, 0); put(bull, 6, 0); put(rabdul, 5, 0);
  b.faceNearestOpponent(archer);
  check('1.7 no hero within her reach: she stands relaxed', /archer_stand_/.test(key(archer)), key(archer));
  put(archer, 2, 2); b.faceNearestOpponent(archer); // Layra is 5 tiles away
  check('1.7 a hero 5 tiles away, within her bow\'s reach: her combat-ready stance', /archer_(stance|ready)/.test(key(archer)), key(archer) + ' ' + archer.facing);
  put(archer, 3, 1); b.faceNearestOpponent(archer); // 6 or more away from everyone
  check('1.7 further than her reach: relaxed again', /archer_stand_/.test(key(archer)), key(archer));
  check('1.7 melee units still switch at 3 tiles, not further', (() => { put(gaha, 3, 4); put(bull, 3, 0); b.faceNearestOpponent(bull); const far = /bull_stand/.test(key(bull)); put(bull, 3, 1); b.faceNearestOpponent(bull); return far && /bull_battle/.test(key(bull)); })(), key(bull));
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
