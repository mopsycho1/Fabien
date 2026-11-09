// Roadmap 13.31, Tayo's Sonic Clap, on the old flat 8x8 map (run with FABIEN_BENCH=):
// every foe within 2 tiles takes a little damage and is knocked back 1 tile (wall or unit behind: a slam),
// foes out of reach are left alone, cooldown 3, the AI claps with 2 or more foes near (not with 1).
const { start, battle } = require('./boot.cjs');
const SP = require('../../src/data/spells.json');
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

  // find a flat, open patch so the usual downhill and cliff rules don't colour the numbers (tests use a cross-shaped patch, Tayo in the middle at 4,4)
  const gh = (c, r) => G.getHeight(c, r);
  let ox = 0, oy = 0, found = false;
  for (let c = 1; c <= 9 && !found; c++) for (let r = 1; r <= 8 && !found; r++) {
    let ok = true; const h = gh(c, r);
    const cross = [[-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [0, 3], [-1, 1], [1, 1], [0, -1]];
    for (const [dc, dr] of cross) { const cc = c - 4 + 4 + dc, rr = r + dr; if (!G.isInsideGrid(cc, rr) || b.isBlocked(cc, rr) || gh(cc, rr) !== h) ok = false; }
    if (ok) { ox = c; oy = r; found = true; }
  }
  const at = (u, c, r) => [u, c - 4 + ox, r - 4 + oy];
  check('13.31 test patch found', found, ox + ',' + oy);
  const calls = []; const realClap = b.castClap.bind(b); b.castClap = (u, sp, d) => { calls.push(u.label); return realClap(u, sp, d); };
  check('13.31 Tayo has the clap, range 2, push 1, cooldown 3', tayo.spells.includes('clap') && SP.clap.range === 2 && SP.clap.push === 1 && SP.clap.cooldown === 3);
  // open floor: two foes in reach (one at 1, one at 2), one out of reach (3) and an ally
  reset([at(tayo, 4, 4), at(gaha, 5, 4), at(sudeen, 4, 6), at(layra, 4, 1), at(rabdul, 3, 4)]);
  const pos = (u) => (u.col - ox + 4) + ',' + (u.row - oy + 4), full = C.getDamage(tayo, gaha);
  const hp = [gaha, sudeen, layra, rabdul].map((u) => u.hp);
  await new Promise((res) => { b.activeUnit = tayo; b.castClap(tayo, SP.clap, res); setTimeout(res, 6000); });
  check('13.31 foe at 1 tile knocked back 1 tile', pos(gaha) === '6,4', pos(gaha));
  check('13.31 foe at 2 tiles knocked back 1 tile', pos(sudeen) === '4,7', pos(sudeen));
  check('13.31 a foe 3 tiles away is not touched', pos(layra) === '4,1' && layra.hp === hp[2], pos(layra));
  check('13.31 small damage (under half a hit, at least 1)', gaha.hp < hp[0] && hp[0] - gaha.hp <= Math.ceil(full / 2), (hp[0] - gaha.hp) + ' of ' + full);
  check('13.31 it hits only foes (his own side is not knocked)', pos(rabdul) === '3,4' && rabdul.hp === hp[3], pos(rabdul));
  // wall slam: a foe pushed into a unit behind it
  reset([at(tayo, 4, 4), at(gaha, 5, 4), at(sudeen, 6, 4)]);
  await new Promise((res) => { b.activeUnit = tayo; b.castClap(tayo, SP.clap, res); setTimeout(res, 6000); });
  check('13.31 the far foe is pushed first, then the near one follows into the gap', pos(sudeen) === '7,4' && pos(gaha) === '6,4', pos(gaha) + ' ' + pos(sudeen));
  reset([at(tayo, 4, 4), at(gaha, 5, 4), at(rabdul, 6, 4)]); // his own ally stands right behind the foe
  const hp2 = gaha.hp;
  await new Promise((res) => { b.activeUnit = tayo; b.castClap(tayo, SP.clap, res); setTimeout(res, 6000); });
  check('13.31 a blocked push is a slam: stays put, Disoriented, extra damage', pos(gaha) === '5,4' && JSON.stringify(gaha.status).includes('isoriented') && hp2 - gaha.hp > 1, pos(gaha) + ' ' + (hp2 - gaha.hp) + ' ' + JSON.stringify(gaha.status));
  // the AI
  calls.length = 0;
  reset([at(tayo, 4, 4), at(gaha, 5, 4), at(sudeen, 4, 6)]);
  b.activeUnit = tayo; b.enemyAttack(tayo); await sleep(400);
  check('13.31 AI claps with 2 foes within 2 tiles', calls.length === 1, calls.join(','));
  check('13.31 and it goes on cooldown 3', !S.canAfford(tayo, 'clap') && S.cooldownOf(tayo, 'clap') === 3, S.cooldownOf(tayo, 'clap'));
  await sleep(2600);
  calls.length = 0;
  reset([at(tayo, 4, 4), at(gaha, 5, 4), at(sudeen, 4, 8)]);
  b.activeUnit = tayo; b.enemyAttack(tayo); await sleep(400);
  check('13.31 AI does not clap for a single foe (Earth Drive instead)', calls.length === 0, calls.join(','));
  await sleep(2600);
  calls.length = 0;
  reset([at(tayo, 4, 4), at(gaha, 5, 4), at(sudeen, 4, 6)]); S.startCooldown(tayo, 'clap');
  b.activeUnit = tayo; b.enemyAttack(tayo); await sleep(400);
  check('13.31 AI does not clap while it is cooling down', calls.length === 0, calls.join(','));
  await sleep(2600);
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
