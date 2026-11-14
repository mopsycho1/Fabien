// 18.3 (M3), checklist C3, and 1.48: the waterfalls move. The game shows Suleiman's own waterfall
// (6 frames, its own splash); the Blender v2 loops (with a ring of ripples) are the other style.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n56.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(500);
  const G = w.__grid;
  check('the three Blender water loops are loaded, 12 frames each', ['waterfall_tall', 'waterfall', 'splash_ring'].every((n) => game.textures.exists('water:' + n) && game.textures.get('water:' + n).frameTotal - 1 === 12), ['waterfall_tall', 'waterfall', 'splash_ring'].map((n) => game.textures.exists('water:' + n) && game.textures.get('water:' + n).frameTotal - 1).join());
  check('Suleiman\'s own waterfall is loaded, 6 frames, tall and short (1.48)', ['waterfall_s_tall', 'waterfall_s'].every((n) => game.textures.exists('water:' + n) && game.textures.get('water:' + n).frameTotal - 1 === 6));
  const falls = () => b.children.list.filter((o) => o.texture && /^water:waterfall/.test(o.texture.key));
  const rings = () => b.children.list.filter((o) => o.texture && o.texture.key === 'water:splash_ring');
  const old = () => b.children.list.filter((o) => o.texture && o.texture.key === 'fx-waterfall');
  const map = require('../../src/data/maps/cavern.json');
  const TW = map.board.tileWidth, TH = map.board.tileHeight, LH = map.board.levelHeight;
  const want = [];
  for (const [c, r, c2, r2] of map.waterfalls) {
    const p = G.tileToScreen(c, r); const left = c2 === c && r2 === r + 1; const right = c2 === c + 1 && r2 === r;
    if (left || right) want.push({ x: p.x + (left ? -TW / 4 : TW / 4), y: p.y + TH / 4 - 2, len: (G.getHeight(c, r) - G.getHeight(c2, r2)) * LH + 6 });
  }
  const near = (f) => want.find((q) => Math.abs(q.x - f.x) < 0.5 && Math.abs(q.y - f.y) < 0.5);
  // The same checks for both styles. The game shows Suleiman's (his art comes first);
  // the Blender loops are the other style (window.__waterStyle = 'blender', or ?water=blender).
  //   key: the sheet a two-level drop uses; sheet: how long the fall is inside a frame; ringed: a ripple ring per fall
  const look = async (style, key, sheet, ringed) => {
    const n = ringed ? 4 : 0;
    check(style + ': 4 falls face the camera' + (ringed ? ', each with its ring of ripples' : ', with their own splash (no ripple rings)') + ', and the old code-drawn strips are gone', falls().length === 4 && rings().length === n && old().length === 0, falls().length + ' falls, ' + rings().length + ' rings, ' + old().length + ' old');
    check(style + ': a two-level drop uses the tall sheet', falls().every((f) => f.texture.key === 'water:' + key), falls().map((f) => f.texture.key).join());
    check(style + ': two are on left faces and two on right faces (mirrored)', falls().filter((f) => f.flipX).length === 2, falls().map((f) => f.flipX).join());
    check(style + ': each fall hangs from the middle of its ledge edge', want.length === 4 && falls().every(near), falls().map((f) => Math.round(f.x) + ',' + Math.round(f.y)).join(' '));
    check(style + ': and is as long as the drop (' + sheet + ' frame pixels scaled to the drop, not squashed)', falls().every((f) => Math.abs(f.scaleY * sheet - near(f).len) < 0.5 && f.scaleX === f.scaleY), falls().map((f) => (f.scaleY * sheet).toFixed(1)).join());
    if (ringed) check(style + ': the ripples lie on the pool at the foot of each fall', rings().every((g) => falls().some((f) => Math.abs(f.x - g.x) < 0.5 && Math.abs(g.y - (f.y + near(f).len + 4)) < 1)));
    // it moves (not a whole loop later: his 6 frames come round every 720 ms)
    const f0 = falls().map((f) => f.frame.name).join();
    await sleep(400);
    const f1 = falls().map((f) => f.frame.name).join();
    check(style + ': the water moves: the frames change', f0 !== f1 && falls().every((f) => f.anims.isPlaying) && rings().every((f) => f.anims.isPlaying), f0 + ' then ' + f1);
    await sleep(170);
    const f2 = falls().map((f) => f.frame.name).join();
    check(style + ': the falls do not all show the same frame (each starts on its own)', [f0, f1, f2].some((f) => new Set(f.split(',')).size > 1), f1);
  };
  check('the game shows Suleiman\'s waterfall unless asked otherwise', w.__art !== undefined && !w.__waterStyle);
  await look('his waterfall', 'waterfall_s_tall', 228, false);
  // turning the camera: the falls on the faces now in front are drawn, none left over
  b.rotateCamera(1); await sleep(900);
  check('his waterfall: after a quarter turn there are again 4 falls, nothing left over', falls().length === 4 && rings().length === 0, falls().length + ' / ' + rings().length);
  // the other style: the board is drawn again in it when the camera turns back
  w.__waterStyle = 'blender';
  b.rotateCamera(-1); await sleep(900);
  await look('Blender loops', 'waterfall_tall', 194, true);
  b.rotateCamera(1); await sleep(900);
  check('Blender loops: after a quarter turn there are again 4 falls and 4 rings, nothing left over', falls().length === 4 && rings().length === 4, falls().length + ' / ' + rings().length);
  w.__waterStyle = null; b.rotateCamera(-1); await sleep(900);
  check('back to his waterfall: 4 falls, no rings', falls().length === 4 && rings().length === 0 && falls().every((f) => f.texture.key === 'water:waterfall_s_tall'));
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
