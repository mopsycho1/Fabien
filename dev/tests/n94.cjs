// Roadmap 10.37 (20 Nov): Gadara's weapon aura lies ON his staff, in every picture and facing (it floated beside him).
// art.json e5.weapon marks the two ends of the staff in each picture; spellArt.weaponAuraFx moves, turns and sizes the loop
// every frame so its bright line covers them (mirrored pictures included). This checks the marks and the geometry.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n94.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const art = require('../../src/data/art.json').e5; const fx = require('../../src/data/fxSlots.json').buffs.blade;
  const files = new Set();
  (function walk(v) { if (v && typeof v === 'object') { if (typeof v.file === 'string') { if (!v.file.startsWith('clash')) files.add(v.file); } else Object.values(v).forEach(walk); } })({ a: art.standing, b: art.battle, c: art.weak, d: art.poses, e: art.buffed, f: art.buffPoses });
  const missing = [...files].filter((f) => !(art.weapon && art.weapon[f]));
  check('every picture of Gadara has a staff mark (' + files.size + ' pictures)', missing.length === 0, missing.join(', '));
  const sizes = require('fs'); const png = (f) => { const b = sizes.readFileSync(require('path').resolve(__dirname, '../../public/art/' + f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const off = [...files].filter((f) => { const m = art.weapon[f]; const [w, h] = png(f); return !m || m.some((v, i) => v < -5 || v > (i % 2 ? h : w) + 5); });
  check('every mark lies inside its picture', off.length === 0, off.join(', '));
  check('the aura loop knows its own axis', fx.weaponAxis && fx.weaponAxis.len > 100 && fx.weaponAxis.angle > 0);

  const { w, game, errors: all } = await start();
  const errors = all.filter((e) => !/focus\(\)/.test(e));
  const b = await battle(game); await sleep(500);
  b.endTurn = () => {}; b.runEnemyTurn = () => {}; b.busy = false;
  const g = b.units.find((u) => u.id === 'e5');
  check('Gadara is on the board', !!g);
  g.grip = 'blade'; b.refreshStatusTags(); await sleep(300);
  const aura = g.drawnAura_blade && g.drawnAura_blade.objects[0];
  check('holding the blade end he has the weapon aura', !!aura);
  const axis = fx.weaponAxis;
  // the line the aura draws, in the container: its middle and its two ends
  const lineOf = () => {
    const r = aura.rotation + (axis.angle * Math.PI) / 180, half = (axis.len * aura.scaleX) / 2;
    return { mx: aura.x, my: aura.y, a: [aura.x - Math.cos(r) * half, aura.y - Math.sin(r) * half], c: [aura.x + Math.cos(r) * half, aura.y + Math.sin(r) * half] };
  };
  const spriteEnds = (m) => { const sp = g.sprite; const W = sp.width, H = sp.height; const at = (px, py) => [sp.x + ((sp.flipX ? W - px : px) - sp.originX * W) * sp.scaleX, sp.y + (py - sp.originY * H) * sp.scaleY]; return [at(m[0], m[1]), at(m[2], m[3])]; };
  const poses = ['ready', 'attack', 'windup', 'cleave', 'hookReach', 'hookPull', 'sunder', 'guard', 'hurt'];
  let bad = [], total = 0, mirrored = [];
  for (const pose of poses) for (const facing of ['downLeft', 'downRight', 'upLeft', 'upRight']) {
    g.facing = facing; b.showPose(g, pose, facing.endsWith('Right') ? 10 : -10); await sleep(60);
    const m = w.__art.weaponMarks('e5', g.sprite.texture.key);
    if (!m) { bad.push(pose + '/' + facing + ': no mark for ' + g.sprite.texture.key); continue; }
    const [pa, pb] = spriteEnds(m); const L = lineOf(); total++;
    // the aura's line must lie along the staff: its middle at the staff's middle, its ends on the staff's two ends (either way round)
    const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    const d1 = Math.hypot(L.a[0] - pa[0], L.a[1] - pa[1]) + Math.hypot(L.c[0] - pb[0], L.c[1] - pb[1]);
    const d2 = Math.hypot(L.a[0] - pb[0], L.a[1] - pb[1]) + Math.hypot(L.c[0] - pa[0], L.c[1] - pa[1]);
    if (Math.min(d1, d2) > 3 || Math.hypot(L.mx - mid[0], L.my - mid[1]) > 1.5 || !aura.visible) bad.push(pose + '/' + facing + ' off by ' + Math.min(d1, d2).toFixed(1));
    if (g.sprite.flipX) mirrored.push(Math.sign(L.mx - g.sprite.x) + ':' + g.sprite.texture.key);
  }
  check('in every pose and facing the aura lies on the staff (' + total + ' views)', bad.length === 0, bad.slice(0, 3).join(' | '));
  check('mirrored pictures were checked too', mirrored.length > 0, mirrored.length + ' mirrored views');
  // mirror check: the same picture flipped puts the aura on the other side of the figure
  g.facing = 'downLeft'; b.showPose(g, 'cleave', -10); await sleep(60); const left = Math.sign(aura.x - g.sprite.x), keyL = g.sprite.texture.key, flipL = g.sprite.flipX;
  g.facing = 'downRight'; b.showPose(g, 'cleave', 10); await sleep(60); const right = Math.sign(aura.x - g.sprite.x);
  check('a mirrored picture puts the aura on the other side (' + keyL + ' flipped ' + flipL + '→' + g.sprite.flipX + ')', left !== right && g.sprite.flipX !== flipL, left + ' / ' + right);
    check('the aura is shown while a marked picture is shown', aura.visible);
  g.grip = 'fork'; b.refreshStatusTags(); await sleep(100);
  check('on the fork end the aura is gone', !g.drawnAura_blade);
  check('no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
