// 13.47: a push must never leave a unit in the gap between blocks.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n53.cjs
// Part 1 pushes a unit off EVERY tile of the board in all 8 directions (so from
// every edge and every height), 1, 2 and 3 tiles, and checks both the rule (it
// ends on a real, free tile) and the drawing (the body rests on the middle of it).
// Part 2 replays the cause that was found: a hit landing on a body that is not
// on its tile at that instant (mid-push, mid-lunge) used to leave it there.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(400);
  const G = w.__grid;
  const U = (l) => b.units.find((u) => u.label === l);
  const N = process.env.FABIEN_MAP === 'cavern' ? 9 : 8;
  const victim = U('H2'), pusher = U('E1');
  const others = b.units.filter((u) => u !== victim && u !== pusher);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  b.endTurn = () => {};
  b.defeat = () => {}; // nobody dies in this test: only where bodies end up matters
  // everyone else stands off the board so every tile is free (pots are dug up too)
  for (const u of others) { u.col = -5; u.row = -5; }
  for (const st of b.sites || []) st.dug = true;
  const fresh = () => { for (const u of [victim, pusher]) { u.maxHp = 500; u.hp = 500; /* falls and slams never kill here */ u.alive = true; u.engagedWith = null; u.knockPending = false; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; } b.relayQueue = null; };
  const offBy = (u) => { const p = G.tileToScreen(u.col, u.row); return Math.hypot(u.view.x - p.x, u.view.y - p.y); };
  // waits until the push has been drawn to its end (knockback.js clears unit.knock when the body is home)
  const rest = async () => { const t = Date.now(); while (victim.knock && Date.now() - t < 5000) await sleep(2); await sleep(6); };
  b.setSpeed('base', 10); // the same animations, ten times faster
  b.cameras.main.setVisible(false); // nothing is painted in part 1 (positions are still worked out): the test browser paints slowly

  // ---------- Part 1: every tile, every direction, every length ----------
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const shapes = new Set(); let drawn = 0;
  let pushes = 0, badRule = [], badDraw = [], heights = new Set(), edges = 0, falls = 0, slams = 0;
  for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) for (const [dc, dr] of dirs) {
    const pc = c - dc, pr = r - dr; // the pusher stands on the other side (it may be off the board: only the direction counts)
    for (const steps of [1, 2, 3]) {
      fresh();
      put(victim, c, r);
      pusher.col = pc; pusher.row = pr;
      const pushed = b.pushLoser(victim, pusher, steps);
      const from = G.tileToScreen(c, r), to = G.tileToScreen(victim.col, victim.row);
      pushes++;
      const onBoard = victim.col >= 0 && victim.row >= 0 && victim.col < N && victim.row < N && Number.isInteger(victim.col) && Number.isInteger(victim.row);
      const last = pushed.path.length ? pushed.path[pushed.path.length - 1] : { col: c, row: r };
      if (!onBoard || last.col !== victim.col || last.row !== victim.row) badRule.push([c, r, dc, dr, steps, victim.col, victim.row].join(' '));
      heights.add(G.getHeight(c, r) + '>' + G.getHeight(victim.col, victim.row));
      if (c === 0 || r === 0 || c === N - 1 || r === N - 1) edges++;
      if (pushed.fall && pushed.fall.levels) falls++;
      if (pushed.fall && pushed.fall.slam) slams++;
      // the drawing: watched to the end for every push that starts on the edge of the
      // board, and once for each different shape of push anywhere else (the heights it
      // crosses, its direction, and whether it ends in a slam)
      const shape = [G.getHeight(c, r), ...pushed.path.map((t) => G.getHeight(t.col, t.row)), dc, dr, pushed.fall && pushed.fall.slam ? 's' : ''].join(',');
      const onEdge = c === 0 || r === 0 || c === N - 1 || r === N - 1;
      if ((onEdge && steps === 3) || !shapes.has(shape)) {
        shapes.add(shape); drawn++;
        b.knockBack(victim, pushed, to.x - from.x || 1);
        const tR = Date.now(); await rest(); if (process.env.SLOW && Date.now() - tR > 1500) console.log("SLOW", c, r, dc, dr, steps, Date.now() - tR, "knock", !!victim.knock, "now", Math.round(b.time.now), "until", Math.round(b.knockUntil), JSON.stringify(pushed.fall));
        if (offBy(victim) > 0.5 || victim.knock) badDraw.push([c, r, dc, dr, 'ends', victim.col, victim.row, 'off', offBy(victim).toFixed(1)].join(' '));
      } else victim.knockPending = false;
    }
  }
  check('every push ends on a real tile of the board (' + pushes + ' pushes, ' + edges + ' from the edge)', badRule.length === 0, badRule.slice(0, 3).join(' | '));
  check('every drawn push comes to rest on the middle of that tile (' + drawn + ' watched to the end)', badDraw.length === 0 && drawn > 200, badDraw.length + ' bad: ' + badDraw.slice(0, 3).join(' | '));
  check('the pushes covered falls, wall slams and every height the map has', falls > 50 && slams > 50 && heights.size >= 8, falls + ' falls, ' + slams + ' slams, heights ' + [...heights].sort().join(' '));

  // ---------- Part 2: the cause (a hit on a body that is away from its tile) ----------
  b.setSpeed('base', 1);
  b.cameras.main.setVisible(true);
  const hit = (target, dx) => b.showImpact(pusher, target, { hit: true, damage: 3 }, dx, false);
  // (a) hit while still flying from a push
  fresh(); put(victim, 4, 7); put(pusher, 3, 7);
  let pushed = b.pushLoser(victim, pusher, 2);
  b.knockBack(victim, pushed, 1);
  await sleep(140); // in the air, between two tiles
  const midAir = offBy(victim);
  hit(victim, 1);
  await sleep(1300);
  check('(a) hit in mid-push: it was between tiles when struck, and still lands on its tile', midAir > 5 && offBy(victim) < 0.5, 'mid-air ' + midAir.toFixed(1) + ', after ' + offBy(victim).toFixed(1));
  // (b) hit while lunging in its own attack (a counter): it used to come home to the lunge spot
  fresh(); put(victim, 4, 7); put(pusher, 5, 7);
  victim.view.x += 30; victim.view.y += 15; // where a lunge puts the body
  hit(victim, -1);
  { const home = G.tileToScreen(4, 7); b.tweens.add({ targets: victim.view, x: home.x, y: home.y, duration: 120 }); } // the lunge's own step back
  await sleep(900);
  check('(b) hit in mid-lunge: back on its tile after the recoil', offBy(victim) < 0.5, offBy(victim).toFixed(1));
  // (c) two hits close together: the second recoil used to start from the first one's far point
  fresh(); put(victim, 4, 7);
  hit(victim, 1); await sleep(110); const far = offBy(victim); hit(victim, 1);
  await sleep(900);
  check('(c) two quick hits: recoiled, then back on its tile', far > 3 && offBy(victim) < 0.5, 'far ' + far.toFixed(1) + ', after ' + offBy(victim).toFixed(1));
  // (d) pushed to a new tile while a recoil is still playing: it must end on the NEW tile
  fresh(); put(victim, 4, 7); put(pusher, 3, 7);
  hit(victim, 1); await sleep(60);
  pushed = b.pushLoser(victim, pusher, 1); b.knockBack(victim, pushed, 1);
  await sleep(1200);
  check('(d) recoil then a push: rests on the new tile', victim.col === 5 && offBy(victim) < 0.5, victim.col + ',' + victim.row + ' off ' + offBy(victim).toFixed(1));
  // (e) a miss (sidestep) on a body away from its tile
  fresh(); put(victim, 4, 7); victim.view.x -= 22;
  b.showImpact(pusher, victim, { hit: false, damage: 0 }, 1, false);
  await sleep(600);
  check('(e) a sidestep also comes home to the tile', offBy(victim) < 0.5, offBy(victim).toFixed(1));
  // (f) the safety net at the end of a turn
  fresh(); put(victim, 2, 7); victim.view.x += 40; victim.view.y -= 9;
  b.settleBodies();
  check('(f) the end of a turn puts any stray body back on its tile', offBy(victim) < 0.5, offBy(victim).toFixed(1));

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
