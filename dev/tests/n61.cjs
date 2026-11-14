// M13 (roadmap 18.13): movement life in code.
//  - a fighter without walk pictures walks in code: two footfalls a tile, a lean, a squash, foot dust, a settle
//  - Layra is carried by sand (13.41): no footfalls, sand round her legs, gone when she stops
//  - Gaha keeps his own walk frames where he has them, and walks in code toward the camera
//  - channel, then cast (13.10): Layra gathers her Lightning before it flies
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid, W = w.__walk, A = w.__art;
  const U = (l) => b.units.find((u) => u.label === l);
  const [sudeen, gaha, layra, tayo, bull, archer] = ['H1', 'H2', 'H3', 'E1', 'E2', 'E3'].map(U);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; }
    put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 2, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0);
    b.busy = false; b.cancelMode();
  };
  // walks a unit and watches its picture every few ms
  const walk = async (u, c, r) => {
    const seen = { maxLean: 0, minLean: 0, maxSquash: 0, lift: 0, keys: new Set(), kids: 0, offTile: 0 };
    const y0 = u.sprite.y; const kids0 = u.view.list.length;
    b.activeUnit = u; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null;
    let done = false; b.moveUnit(u, c, r, () => { done = true; });
    const t0 = Date.now();
    while (!done && Date.now() - t0 < 6000) {
      seen.maxLean = Math.max(seen.maxLean, u.sprite.angle); seen.minLean = Math.min(seen.minLean, u.sprite.angle);
      seen.maxSquash = Math.max(seen.maxSquash, u.squash || 0); seen.lift = Math.max(seen.lift, y0 - u.sprite.y);
      seen.keys.add(u.sprite.texture.key); seen.kids = Math.max(seen.kids, u.view.list.length - kids0);
      await sleep(8);
    }
    seen.ms = Date.now() - t0;
    return seen;
  };
  const rest = async (u) => { await sleep(450); return { angle: u.sprite.angle, squash: u.squash || 0, sx: u.sprite.scaleX / u.artScale, kids: u.view.list.length }; };

  // ---------- who walks how ----------
  check('Layra is marked as carried by sand; the others walk in code', A.walkStyle('h3') === 'sand' && ['h1', 'h2', 'e1', 'e2', 'e3', 'e4'].every((id) => A.walkStyle(id) === 'code'));
  check('only Gaha has walk pictures, and only away from the camera', !!A.walkFrames('h2', 'upLeft') && !!A.walkFrames('h2', 'upRight') && !A.walkFrames('h2', 'downLeft') && ['h1', 'h3', 'e1', 'e2', 'e3', 'e4'].every((id) => !A.walkFrames(id, 'upLeft') && !A.walkFrames(id, 'downRight')));

  // ---------- the code walk: every fighter without pictures, all four ways ----------
  const ways = { 'down-right': [2, 0], 'up-left': [-2, 0], 'down-left': [0, 2], 'up-right': [0, -2] };
  for (const u of [sudeen, tayo, bull, archer]) {
    for (const [name, [dc, dr]] of Object.entries(ways)) {
      park(); put(u, 3, 3); for (const o of b.units) if (o !== u) put(o, o.side === 'hero' ? b.units.indexOf(o) : 7 - b.units.indexOf(o) % 3, o.side === 'hero' ? 7 : 0);
      const c0 = { ...W.walkCount }; const kids = u.view.list.length; const y0 = u.sprite.y;
      const s = await walk(u, 3 + dc, 3 + dr);
      const right = name.endsWith('right');
      const lean = right ? s.maxLean : -s.minLean;
      const after = await rest(u);
      const ok = W.walkCount.steps - c0.steps === 2 && W.walkCount.dust - c0.dust >= 2 /* (2 in Light mode, 4 in Full) */ && W.walkCount.settles - c0.settles === 1 &&
        lean > 3.5 && lean < 9 && s.maxSquash > 0.03 && s.lift >= 2 && s.lift <= 3.5 &&
        Math.abs(after.angle) < 0.01 && after.squash === 0 && Math.abs(after.sx - 1) < 0.001 && after.kids === kids && Math.abs(u.sprite.y - y0) < 0.01 &&
        u.col === 3 + dc && u.row === 3 + dr;
      check(u.name + ' ' + name + ': two footfalls a tile, leans the way it goes, squashes, raises dust, then stands straight on its tile', ok,
        'steps ' + (W.walkCount.steps - c0.steps) + ' dust ' + (W.walkCount.dust - c0.dust) + ' lean ' + lean.toFixed(1) + ' squash ' + s.maxSquash.toFixed(3) + ' lift ' + s.lift.toFixed(1) + ' after ' + after.angle.toFixed(2) + '/' + after.sx.toFixed(3));
    }
  }
  // it is not slower than the old slide: a tile still takes about 190 ms
  park(); put(sudeen, 3, 3);
  const timed = await walk(sudeen, 3, 6);
  check('the code walk takes no longer than the slide did (3 tiles in about 570 ms)', timed.ms > 480 && timed.ms < 900, timed.ms);

  // ---------- Gaha: his own frames going away, the code walk coming toward us ----------
  park(); put(gaha, 3, 5);
  let c0 = { ...W.walkCount };
  let s = await walk(gaha, 3, 3); // up-right: he has frames (mirrored)
  check('Gaha walking away from us plays his walk pictures, not the code walk', [...s.keys].some((k) => /walk/.test(k)) && W.walkCount.steps === c0.steps && Math.abs(s.maxLean) < 0.01 && Math.abs(s.minLean) < 0.01, [...s.keys].join(' ').slice(0, 120));
  await rest(gaha); park(); put(gaha, 3, 3); c0 = { ...W.walkCount };
  s = await walk(gaha, 3, 5); // down-left: no frames
  check('Gaha walking toward us has no pictures for it, so he walks in code', W.walkCount.steps - c0.steps === 2 && -s.minLean > 3.5 && ![...s.keys].some((k) => /walk/.test(k)), 'lean ' + s.minLean.toFixed(1));
  const ga = await rest(gaha);
  check('and stands straight after', Math.abs(ga.angle) < 0.01 && ga.squash === 0);

  // ---------- Layra: carried by sand ----------
  park(); put(layra, 3, 3); await sleep(100);
  c0 = { ...W.walkCount }; const lk = layra.view.list.length; const ly = layra.sprite.y;
  s = await walk(layra, 3, 6);
  check('Layra: the sand gathers once for the whole walk and lets go at the end', W.walkCount.sandStarts - c0.sandStarts === 1 && W.walkCount.sandEnds - c0.sandEnds === 1 && W.walkCount.steps - c0.steps === 3, JSON.stringify(W.walkCount));
  check('Layra: while she moves the sand is on her (two layers, behind and in front of her), and she has no footfall squash', s.kids === 2 && s.maxSquash === 0, 'layers ' + s.kids + ' squash ' + s.maxSquash);
  check('Layra: she leans less than a walker and rides a little above the ground', -s.minLean > 1.5 && -s.minLean < 3.5 && s.lift >= 2 && s.lift <= 4.5, 'lean ' + s.minLean.toFixed(1) + ' lift ' + s.lift.toFixed(1));
  const la = await rest(layra);
  check('Layra: when she stops the sand is gone, she is upright and back on the ground', la.kids === lk && Math.abs(la.angle) < 0.01 && !layra.sandRide && Math.abs(layra.sprite.y - ly) < 0.01, 'kids ' + la.kids + '/' + lk + ' y ' + layra.sprite.y);
  // undo after a sand walk leaves nothing behind either
  b.activeUnit = layra; b.undoMove(); await sleep(300);
  check('Layra: Undo move puts her back with no sand left on her', layra.col === 3 && layra.row === 3 && layra.view.list.length === lk);

  // ---------- channel, then cast (13.10) ----------
  park(); put(layra, 3, 5); put(tayo, 3, 2);
  check('Layra channels her Lightning for a moment; a fighter and the archer do not', b.channelLead(layra, tayo) > 200 && b.channelLead(layra, tayo) < 400 && b.channelLead(gaha, tayo) === 0 && b.channelLead(archer, gaha) === 0, b.channelLead(layra, tayo));
  const order = []; const shown = b.showFrame.bind(b);
  b.showFrame = (u, f) => { const ok = shown(u, f); if (u === layra && ok) order.push({ key: f.key, at: Date.now() }); return ok; };
  const real = w.Math.random; w.Math.random = () => (/rollAttack/.test(new Error().stack) ? 0.01 : real());
  const hp0 = tayo.hp; const tA = Date.now(); let hitAt = 0;
  b.activeUnit = layra; layra.hasActed = false; b.busy = true;
  const watch = setInterval(() => { if (!hitAt && tayo.sprite.tintFill) hitAt = Date.now(); }, 5);
  await new Promise((res) => { b.performAttack(layra, tayo, res); setTimeout(res, 5000); });
  clearInterval(watch); w.Math.random = real; b.showFrame = shown;
  const chant = order.find((o) => /chant/.test(o.key)), cast = order.find((o) => o.at > (chant ? chant.at : 0) && !/chant/.test(o.key));
  check('Lightning: she shows her channel picture first, then her cast picture', !!chant && !!cast && cast.at - chant.at >= 200, order.map((o) => o.key.split(':')[1] + '@' + (o.at - tA)).join(' ').slice(0, 200));
  check('Lightning still lands and the turn carries on', tayo.hp < hp0 && layra.hasActed);
  check('no errors', errors.filter((e) => !e.includes('focus()')).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
