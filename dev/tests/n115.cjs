// 22 Nov, parts 4 and 5. Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1.
//   6.91 Gadara's Dark Magic Orb Explosion: when Singularity resolves, the orb bursts at each foe it pulls, where the pull ends,
//        and the blow lands on its burst frame (frame 6.5 of 9, 140 ms each: about 0.91 s after the orb starts)
//   1.97 Layra's channel: while she casts, the channel spiral rises round her feet in the colour of the spell (a Verse's own
//        colour, Lightning violet, Wildfire orange)
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const spellsJson = require('../../src/data/spells.json');
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  b.runEnemyTurn = () => {}; b.endTurn = () => {}; b.enemySecondWalk = false;
  const U = (id) => b.units.find((u) => u.id === id);
  const gad = U('e5'), layra = U('h3'), gaha = U('h2');
  const far = [[10, 10], [9, 10], [10, 9], [0, 10], [0, 9], [1, 10], [10, 0], [9, 0]];
  const park = () => b.units.forEach((u, i) => { b.placeUnit(u, ...far[i % far.length]); u.engagedWith = null; u.status = { cooldowns: {} }; });
  const fxOn = (name) => b.children.list.filter((o) => o.active && o.texture && o.texture.key && o.texture.key.startsWith('fx:sfx_' + name + '_'));
  // 6.91
  park();
  b.placeUnit(gad, 5, 4); gad.mask = 6; gad.singularityUsed = false; gad.channel = { spellId: 'singularity' };
  b.placeUnit(gaha, 5, 6); gaha.hp = gaha.maxHp = 300; // two tiles away: pulled in next to him
  let hitAt = 0; const t0 = Date.now(); const realImpact = b.showImpact.bind(b);
  b.showImpact = (a, t, r, dx, l) => { if (t === gaha && !hitAt) hitAt = Date.now() - t0; return realImpact(a, t, r, dx, l); };
  let burstAt = 0, burstX = null; let done = false;
  const real = w.Math.random; let n = 0; w.Math.random = () => (n < 6 ? 0.3 + n++ * 0.05 : real());
  try { b.resolveSingularity(gad, () => { done = true; }); } finally { w.Math.random = real; }
  while (!done && Date.now() - t0 < 6000) {
    const o = fxOn('orb_burst');
    if (o.length && !burstAt) { burstAt = Date.now() - t0; burstX = o[0].x; }
    await sleep(15);
  }
  b.showImpact = realImpact;
  const landing = w.__grid.tileToScreen(gaha.col, gaha.row);
  check('6.91 the orb bursts at the pulled foe', burstAt > 0 && Math.abs(burstX - landing.x) < 4, burstAt + ' ms, x ' + burstX + ' vs ' + landing.x);
  check('6.91 the blow lands on the burst frame (about 0.91 s after the orb starts)', hitAt > 0 && Math.abs((hitAt - burstAt) - 910) < 160, (hitAt - burstAt) + ' ms');
  // 1.97
  const hex = (c) => Number('0x' + c.slice(1));
  const tintOf = () => { const o = fxOn('channel'); return o.length ? o[0].tintTopLeft : null; };
  park(); b.placeUnit(layra, 4, 6); b.placeUnit(gaha, 5, 6); layra.mp = layra.maxMp = 30;
  b.busy = true; b.castSpell(layra, gaha, 'swiftness', () => { b.busy = false; }); await sleep(120);
  const want = hex(spellsJson.swiftness.color);
  check('1.97 Swiftness: the channel in its colour', tintOf() === want, (tintOf() || 0).toString(16) + ' vs ' + want.toString(16));
  while (b.busy) await sleep(30); await sleep(400);
  b.busy = true; b.castSpell(layra, gaha, 'slow', () => { b.busy = false; }); await sleep(120);
  check('1.97 Slow: the channel in Slow\'s colour', tintOf() === hex(spellsJson.slow.color), (tintOf() || 0).toString(16));
  while (b.busy) await sleep(30); await sleep(400);
  const foe = U('e2'); b.placeUnit(foe, 6, 6); foe.hp = foe.maxHp = 300;
  b.busy = true; b.performAttack(layra, foe, () => { b.busy = false; }); await sleep(100);
  check('1.97 Lightning: the channel in violet', tintOf() === 0xb48cff, (tintOf() || 0).toString(16));
  while (b.busy) await sleep(30);
  const real2 = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real2.length === 0, real2.slice(0, 3).join(' / '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
