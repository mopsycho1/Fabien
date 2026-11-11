// 18.1 (Battle 1.0 milestone M1): one knockback. Every push goes through knockBack and is drawn
// by src/knockback.js: a curved flight off a ledge, a landing, getting up; a wall slam that
// flies in, flattens, bounces and staggers; and Gaha's fall pictures (Suleiman, 11 Nov).
const fs = require('fs');
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h2:gaha_fall_rise.png')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, K = w.__knockback;
  const U = (l) => b.units.find((u) => u.label === l);
  const [sudeen, gaha, layra, tayo, bull, archer] = ['H1', 'H2', 'H3', 'E1', 'E2', 'E3'].map(U);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  b.endTurn = () => {};
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.knockPending = false; }
    put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 3, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  // pushes "unit" (standing on from) away from "by" and watches the whole thing
  const watch = async (unit, pushed, awayX, ms) => {
    const v = unit.view, sp = unit.sprite, art = unit.artScale;
    const seen = { keys: new Set(), pts: [], tilt: 0, squashFlat: false, squashWide: false, depths: new Set() };
    b.knockBack(unit, pushed, awayX);
    const t = Date.now();
    while (Date.now() - t < ms && v.active) {
      seen.keys.add(sp.texture.key); seen.pts.push({ x: v.x, y: v.y }); seen.tilt = Math.max(seen.tilt, Math.abs(sp.angle));
      if (sp.scaleY < art * 0.9 && sp.scaleX > art * 1.05) seen.squashFlat = true;
      if (sp.scaleX < art * 0.85) seen.squashWide = true;
      seen.depths.add(v.depth);
      await sleep(8);
    }
    return seen;
  };
  // true if the body was above the straight line between the two tiles somewhere near the middle
  const aboveLine = (pts, from, to) => {
    let best = 0;
    for (const p of pts) {
      const t = (p.x - from.x) / (to.x - from.x);
      if (t > 0.3 && t < 0.7) best = Math.max(best, from.y + (to.y - from.y) * t - p.y);
    }
    return best;
  };

  // ---------- A4: one way in ----------
  const src = fs.readFileSync(__dirname + '/../../src/scenes/BattleScene.js', 'utf8');
  check('A4 the scene draws pushes in one place (one playKnockback call, showFall is gone)', (src.match(/playKnockback\(/g) || []).length === 1 && !/showFall/.test(src));
  check('A4 all 9 push sites call knockBack', (src.match(/this\.knockBack\(/g) || []).length === 9, (src.match(/this\.knockBack\(/g) || []).length);
  check('A4 no push uses slideAlong any more', !/this\.slideAlong\([a-zA-Z.]+, (pushed\.)?path\)/.test(src.replace('this.slideAlong(caster, path)', '')));

  // ---------- A2: the curve itself (the rule, no pictures) ----------
  const f = { x: 100, y: 100 }, t2 = { x: 143, y: 171 };
  const mid = K.flightPoint(f, t2, 2, 0.5);
  check('A2 mid-flight is above the straight line (2 level drop)', mid.y < (f.y + t2.y) / 2 - 10, mid.y.toFixed(1) + ' vs ' + ((f.y + t2.y) / 2).toFixed(1));
  const early = K.flightPoint(f, t2, 2, 0.25), late = K.flightPoint(f, t2, 2, 0.75);
  check('A2 the drop speeds up (the second half falls further than the first)', t2.y - mid.y > mid.y - f.y && late.y - mid.y > mid.y - early.y);
  check('A2 it starts and ends on the tiles', Math.abs(K.flightPoint(f, t2, 2, 0).y - f.y) < 0.01 && Math.abs(K.flightPoint(f, t2, 2, 1).y - t2.y) < 0.01);
  check('level ground is a low hop', K.flightPoint(f, { x: 143, y: 127 }, 0, 0.5).y < 113.5 - 8);

  // ---------- A2: Gaha off a 1 level ledge, to the right, with his fall pictures ----------
  park(); put(gaha, 1, 4); put(bull, 0, 4);
  let from = G.tileToScreen(1, 4), to = G.tileToScreen(2, 4);
  let hp = gaha.hp;
  let pushed = b.pushLoser(gaha, bull, 1);
  check('the push returns where it started', pushed.from && pushed.from.col === 1 && pushed.from.row === 4 && pushed.fall && pushed.fall.levels === 1 && gaha.knockPending === true, JSON.stringify(pushed.fall));
  let seen = await watch(gaha, pushed, to.x - from.x, 1500);
  const names = [...seen.keys].join(' ');
  check('Gaha: thrown in the air, on hands and knees, pushing up (his 3 fall pictures, in that order)', /gaha_fall_air/.test(names) && /gaha_fall_land/.test(names) && /gaha_fall_rise/.test(names) && names.indexOf('fall_air') < names.indexOf('fall_land') && names.indexOf('fall_land') < names.indexOf('fall_rise'), names);
  check('Gaha: the flight curves above the straight line', aboveLine(seen.pts, from, to) >= 6, aboveLine(seen.pts, from, to).toFixed(1));
  check('Gaha: he lands with a squash', seen.squashFlat);
  to = G.tileToScreen(gaha.col, gaha.row); /* (downhill carries him a tile further) */
  check('Gaha: he ends standing on his new tile, the fall cost 4', Math.abs(gaha.view.x - to.x) < 0.5 && Math.abs(gaha.view.y - to.y) < 0.5 && !gaha.knock && gaha.sprite.angle === 0 && Math.abs(gaha.sprite.scaleX - gaha.artScale) < 0.001 && /stand|battle|weak/.test(gaha.sprite.texture.key) && gaha.hp === hp - 4, [gaha.view.x - to.x, gaha.view.y - to.y, gaha.knock, gaha.sprite.angle, gaha.sprite.scaleX - gaha.artScale, gaha.sprite.texture.key, hp, gaha.hp].join(' '));

  // ---------- A2: the archer off a 2 level ledge, to the left (no fall pictures of her own) ----------
  park(); put(archer, 4, 5); put(gaha, 5, 5);
  from = G.tileToScreen(4, 5); to = G.tileToScreen(3, 5);
  pushed = b.pushLoser(archer, gaha, 1);
  const mark = Date.now();
  check('2 levels: the push is a 2 level fall', pushed.fall && pushed.fall.levels === 2 && pushed.path[0].col === 3, JSON.stringify(pushed));
  // (a push downhill carries a tile further: only the first step is the drop)
  const first = pushed.path[0];
  to = G.tileToScreen(first.col, first.row);
  b.knockBack(archer, pushed, to.x - from.x);
  check('the next turn is held until the body is at rest', b.knockUntil > b.time.now + 300, (b.knockUntil - b.time.now).toFixed(0));
  const pts = []; const keys2 = new Set(); let tilt = 0, stoodEarly = false;
  const k0 = archer.sprite.texture.key;
  while (Date.now() - mark < 1800) {
    pts.push({ x: archer.view.x, y: archer.view.y }); keys2.add(archer.sprite.texture.key); tilt = Math.max(tilt, Math.abs(archer.sprite.angle));
    if (archer.knock) { b.showStanding(archer); if (/stand|iso_idle/.test(archer.sprite.texture.key) && archer.sprite.texture.key !== k0) stoodEarly = true; }
    await sleep(8);
  }
  check('2 levels: the flight curves above the straight line', aboveLine(pts, from, to) >= 10, aboveLine(pts, from, to).toFixed(1));
  check('2 levels: her hurt picture leans back in the air, then she kneels', tilt >= 15 && [...keys2].some((k) => /hurt|hit/.test(k)) && [...keys2].some((k) => /kneel|down|wound/.test(k)), tilt.toFixed(0) + ' ' + [...keys2].join(' '));
  const end = G.tileToScreen(archer.col, archer.row);
  check('2 levels: she ends on her tile, upright', Math.abs(archer.view.x - end.x) < 0.5 && Math.abs(archer.view.y - end.y) < 0.5 && archer.sprite.angle === 0 && !archer.knock);

  // ---------- A3: a wall slam she lives through ----------
  park(); put(archer, 3, 5); put(gaha, 2, 5);
  pushed = b.pushLoser(archer, gaha, 1); // (4,5) is 2 levels up: a wall
  check('slam: nowhere to go, so it is a slam', pushed.path.length === 0 && pushed.fall && pushed.fall.slam > 0, JSON.stringify(pushed.fall));
  const home = G.tileToScreen(3, 5);
  const wall = pushed.fall.toward;
  const len = Math.hypot(wall.x, wall.y);
  seen = await watch(archer, pushed, wall.x, 1400);
  const along = seen.pts.map((p) => ((p.x - home.x) * wall.x + (p.y - home.y) * wall.y * 2) / len);
  const far = Math.max(...along), back = Math.min(...along);
  check('slam: flies into the wall, flattens against it, bounces back past where she stood', far >= 10 && (seen.squashWide || seen.squashFlat) && back <= -2 && along.indexOf(far) < along.indexOf(back), 'in ' + far.toFixed(1) + ' back ' + back.toFixed(1));
  check('slam: she staggers (leans both ways) and ends standing at home', seen.tilt >= 6 && Math.abs(archer.view.x - home.x) < 0.5 && archer.sprite.angle === 0 && !archer.knock && archer.alive, seen.tilt.toFixed(1));

  // ---------- lethal: the same start, a different ending ----------
  const realDefeat = b.playDefeat.bind(b); let calls = [];
  b.playDefeat = (u, dx, slam, afterFall) => { calls.push({ u, slam: !!slam, afterFall: !!afterFall }); return realDefeat(u, dx, slam, afterFall); };
  park(); put(archer, 4, 5); put(gaha, 5, 5); archer.hp = 3;
  from = G.tileToScreen(4, 5);
  pushed = b.pushLoser(archer, gaha, 1);
  to = G.tileToScreen(pushed.path[0].col, pushed.path[0].row);
  b.showImpact(gaha, archer, { hit: true, damage: 1 }, to.x - from.x, true);
  check('lethal fall: the blow does not start the death early (the push will)', calls.length === 0 && archer.hp === 0);
  seen = await watch(archer, pushed, to.x - from.x, 1600); /* (the finishing blow plays in slow motion) */
  check('lethal fall: she still flies on the curve first', aboveLine(seen.pts, from, to) >= 10 && seen.squashFlat, aboveLine(seen.pts, from, to).toFixed(1));
  await sleep(3200);
  check('lethal fall: one death, played from where she landed, and she is gone', calls.length === 1 && calls[0].afterFall && !calls[0].slam && !archer.view.active, JSON.stringify(calls.map((c) => [c.slam, c.afterFall])));

  calls = [];
  park(); put(tayo, 3, 5); put(gaha, 2, 5); tayo.hp = 1;
  pushed = b.pushLoser(tayo, gaha, 1);
  b.knockBack(tayo, pushed, pushed.fall.toward.x);
  await sleep(3600);
  check('lethal slam: one death, against the wall, and he is gone', calls.length === 1 && calls[0].slam && !tayo.view.active, JSON.stringify(calls.map((c) => [c.slam, c.afterFall])));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails === 0 ? 0 : 1);
})();
