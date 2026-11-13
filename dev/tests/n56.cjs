// 18.3 (M3), checklist C3: the waterfalls play the v2 loop, with a ring of ripples in the pool.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n56.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(500);
  const G = w.__grid;
  check('the three water loops are loaded, 12 frames each', ['waterfall_tall', 'waterfall', 'splash_ring'].every((n) => game.textures.exists('water:' + n) && game.textures.get('water:' + n).frameTotal - 1 === 12), ['waterfall_tall', 'waterfall', 'splash_ring'].map((n) => game.textures.exists('water:' + n) && game.textures.get('water:' + n).frameTotal - 1).join());
  const falls = () => b.children.list.filter((o) => o.texture && /^water:waterfall/.test(o.texture.key));
  const rings = () => b.children.list.filter((o) => o.texture && o.texture.key === 'water:splash_ring');
  const old = () => b.children.list.filter((o) => o.texture && o.texture.key === 'fx-waterfall');
  check('4 falls face the camera, each with its ring of ripples, and the old drawn strips are gone', falls().length === 4 && rings().length === 4 && old().length === 0, falls().length + ' falls, ' + rings().length + ' rings, ' + old().length + ' old');
  check('a two-level drop uses the tall sheet', falls().every((f) => f.texture.key === 'water:waterfall_tall'));
  check('two are on left faces and two on right faces (mirrored)', falls().filter((f) => f.flipX).length === 2, falls().map((f) => f.flipX).join());
  // each sits with its lip on the middle of its ledge edge, and is as long as the drop
  const map = require('../../src/data/maps/cavern.json');
  const TW = map.board.tileWidth, TH = map.board.tileHeight, LH = map.board.levelHeight;
  const want = [];
  for (const [c, r, c2, r2] of map.waterfalls) {
    const p = G.tileToScreen(c, r); const left = c2 === c && r2 === r + 1; const right = c2 === c + 1 && r2 === r;
    if (left || right) want.push({ x: p.x + (left ? -TW / 4 : TW / 4), y: p.y + TH / 4 - 2, len: (G.getHeight(c, r) - G.getHeight(c2, r2)) * LH + 6 });
  }
  const near = (f) => want.find((q) => Math.abs(q.x - f.x) < 0.5 && Math.abs(q.y - f.y) < 0.5);
  check('each fall hangs from the middle of its ledge edge', want.length === 4 && falls().every(near), falls().map((f) => Math.round(f.x) + ',' + Math.round(f.y)).join(' '));
  check('and is as long as the drop (194 frame pixels of sheet scaled to the drop)', falls().every((f) => Math.abs(f.scaleY * 194 - near(f).len) < 0.5 && f.scaleX === f.scaleY), falls().map((f) => (f.scaleY * 194).toFixed(1)).join());
  check('the ripples lie on the pool at the foot of each fall', rings().every((g) => falls().some((f) => Math.abs(f.x - g.x) < 0.5 && Math.abs(g.y - (f.y + near(f).len + 4)) < 1)));
  // it moves
  const f0 = falls().map((f) => f.frame.name).join(); const r0 = rings().map((f) => f.frame.name).join();
  await sleep(700);
  const f1 = falls().map((f) => f.frame.name).join();
  check('the water moves: the frames change', f0 !== f1 && falls().every((f) => f.anims.isPlaying) && rings().every((f) => f.anims.isPlaying), f0 + ' then ' + f1 + ' (rings ' + r0 + ')');
  check('the falls do not all show the same frame (each starts on its own)', new Set(f1.split(',')).size > 1 || new Set(f0.split(',')).size > 1, f1);
  // turning the camera: the falls on the faces now in front are drawn, none left over
  if (b.rotateCamera) {
    b.rotateCamera(1); await sleep(900);
    check('after a quarter turn there are again 4 falls and 4 rings, nothing left over', falls().length === 4 && rings().length === 4, falls().length + ' / ' + rings().length);
    b.rotateCamera(-1); await sleep(900);
  }
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
