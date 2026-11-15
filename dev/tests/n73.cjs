// Melee wind-ups (roadmap 18.29, 15 Nov): every plain melee strike has a short charge-up before the blow.
// A fighter with a drawn wind-up (Gaha: "strikeWindup" in art.json) shows that picture; the others lean back in
// code (6 degrees about the feet) and snap forward into the blow; Rabdul leans before each of his two strikes
// (Double Hit); her dagger stab leans too. The lean is always back to 0 when the move is over.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h2:gaha_wind_downLeft.png')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, E = w.__engagement;
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
  b.enemySecondWalk = false;
  // watch one unit's lean angle and picture while a move plays
  const film = async (u, play, ms) => {
    const angles = [], keys = new Set();
    const watch = setInterval(() => { if (u.sprite) { angles.push(u.sprite.angle || 0); keys.add(u.sprite.texture.key); } }, 12);
    play();
    await sleep(ms);
    clearInterval(watch);
    return { angles, keys: [...keys], end: u.sprite ? (u.sprite.angle || 0) : 0 };
  };
  const episodes = (angles) => { let n = 0, on = false; for (const a of angles) { if (!on && Math.abs(a) > 3) { n++; on = true; } else if (on && Math.abs(a) < 1) on = false; } return n; };
  const peak = (angles) => angles.reduce((m, a) => (Math.abs(a) > Math.abs(m) ? a : m), 0);
  const foeAt = (u) => b.units.find((x) => x !== u && Math.abs(x.col - u.col) + Math.abs(x.row - u.row) === 1);

  // ---------- Sudeen: the code lean, away from the target, then back to 0 ----------
  reset([[sudeen, 3, 4], [bull, 4, 4]]);
  let dx = bull.view.x - sudeen.view.x;
  let r = await film(sudeen, () => b.playAttack(sudeen, bull, { hit: true, damage: 1 }, false), 1800);
  check('18.29 Sudeen leans back before the blow (6 degrees)', Math.abs(peak(r.angles)) > 4 && Math.abs(peak(r.angles)) < 8, peak(r.angles).toFixed(1));
  check('18.29 and away from his target (target on the ' + (dx >= 0 ? 'right: anticlockwise' : 'left: clockwise') + ')', dx >= 0 ? peak(r.angles) < 0 : peak(r.angles) > 0);
  check('18.29 the lean is gone when the move is over', Math.abs(r.end) < 0.01, r.end);

  // ---------- Gaha: his drawn wind-up picture, no code lean ----------
  reset([[gaha, 3, 4], [bull, 4, 4]]);
  r = await film(gaha, () => b.playAttack(gaha, bull, { hit: true, damage: 1 }, false), 1800);
  check('18.29 Gaha shows his drawn wind-up before the thrust', r.keys.some((k) => /gaha_wind_/.test(k)), r.keys.map((k) => k.replace(/^\w+:/, '')).join(','));
  check('18.29 and does not lean as well', Math.abs(peak(r.angles)) < 0.5, peak(r.angles));

  // ---------- Rabdul: a lean before each of the two strikes ----------
  reset([[rabdul, 3, 4], [sudeen, 4, 4]]);
  r = await film(rabdul, () => b.castSpell(rabdul, sudeen, 'doubleHit', () => {}), 2600);
  check('18.29 Rabdul leans before each of his two strikes', episodes(r.angles) === 2, episodes(r.angles));
  check('18.29 and stands straight again afterwards', Math.abs(r.end) < 0.01, r.end);

  // ---------- the archer's dagger ----------
  reset([[archer, 3, 4], [sudeen, 4, 4]]);
  archer.weapon = 'dagger'; // she holds the dagger (13.29); with the bow she would shoot
  r = await film(archer, () => b.playAttack(archer, sudeen, { hit: true, damage: 1 }, false), 1800);
  check('18.29 her dagger stab leans back first too', Math.abs(peak(r.angles)) > 4, peak(r.angles).toFixed(1));
  check('18.29 and she stands straight again', Math.abs(r.end) < 0.01, r.end);

  // ---------- 18.31 the bull's flaming shield flies as the picture for its direction ----------
  const S = w.__status;
  const facingOf = (ddx, ddy) => (ddy < 0 ? 'up' : 'down') + (ddx >= 0 ? 'Right' : 'Left');
  for (const [tc, tr] of [[2, 6], [5, 7], [7, 3], [7, 1]]) { /* the four directions on screen */
    reset([[bull, 5, 4], [sudeen, tc, tr]]);
    S.applyEnchant(bull, 'enchant'); b.refreshStatusTags();
    const ddx = sudeen.view.x - bull.view.x, ddy = sudeen.view.y - bull.view.y;
    const seq = [];
    const w2 = setInterval(() => { for (const o of b.children.list) if (o.texture && /bull_flame_shield_/.test(o.texture.key)) { const k = o.texture.key.replace(/^\w+:bull_flame_shield_|\.png$/g, ''); if (seq[seq.length - 1] !== k) seq.push(k); } }, 15);
    await new Promise((res) => { b.busy = true; b.castSpell(bull, sudeen, 'shieldToss', () => { b.busy = false; res(); }); setTimeout(res, 3500); });
    clearInterval(w2);
    check('18.31 the flaming shield flies as the ' + facingOf(ddx, ddy) + ' picture, then the opposite one coming back', seq[0] === facingOf(ddx, ddy) && seq[1] === facingOf(-ddx, -ddy), seq.join(' > '));
  }

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
