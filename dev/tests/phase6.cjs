// Phase 6 leftovers (6.1 to 6.4): Rabdul's hurt and fall, the archer's fall, Gaha's frame-by-frame thrust, Sudeen's new head.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const art = require('../../src/data/art.json');
const Hm = require('../../src/data/maps/yoba.json').heights;
(async () => {
  const { w, game, errors } = await start();
  // every new picture loads (wait for the slowest)
  const need = [];
  for (const id of ['e4', 'e3', 'h2', 'h1']) for (const f of require('fs').readdirSync(__dirname + '/../../public/art')) if (/^(rabdul_(hurt|fall|face_hurt)|archer_(fall|face_fall)|gaha_thrust|sudeen_head)/.test(f) && f.startsWith({ e4: 'rabdul', e3: 'archer', h2: 'gaha', h1: 'sudeen' }[id])) !/rabdul_face_hurt[023]|archer_face_fall[023]|archer_fall_3|sudeen_head_[1-5]/.test(f) && need.push(id + ':' + f); // (spare faces, spare fall picture and the head turnaround are kept but not loaded yet)
  const t0 = Date.now(); while (Date.now() - t0 < 20000 && need.some((k) => !game.textures.exists(k))) await sleep(100);
  check('all ' + need.length + ' new pictures loaded', need.every((k) => game.textures.exists(k)), need.filter((k) => !game.textures.exists(k)).join(','));
  const b = await battle(game);
  const byId = (id) => b.units.find((u) => u.id === id);
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - Hm[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const rab = byId('e4'), arc = byId('e3'), gaha = byId('h2'), sud = byId('h1');
  const key = (u) => u.sprite.texture.key.replace(/^.*:/, '');
  for (const u of b.units) put(u, 7, 7);
  put(sud, 0, 7); put(gaha, 3, 3); put(rab, 4, 3); put(arc, 5, 0);
  // 6.1 / 6.2 poses
  for (const [u, who, hurt] of [[rab, 'Rabdul', /rabdul_hurt_/], [arc, 'The archer', /archer_fall_0/]]) {
    b.showPose(u, 'hurt', 1);
    check(who + ' hurt shows the new picture', hurt.test(key(u)), key(u));
    for (const p of ['knocked', 'kneel', 'crumple', 'down']) { b.showPose(u, p, -1); check(who + ' ' + p + ' shows', /_fall_\d/.test(key(u)), key(u)); }
  }
  check('Rabdul hurt face (35% hp)', art.e4.portraitHurt === 'rabdul_face_hurt1.png');
  check('Sudeen portrait is the new head', art.h1.portrait === 'sudeen_head_0.png' && game.textures.exists('h1:sudeen_head_0.png'));
  // 6.1 the fall plays knocked, kneel, crumple, down in order, then fades
  const seen = []; const sample = setInterval(() => { try { const k = rab.view && rab.view.active ? key(rab) : ''; if (k && seen[seen.length - 1] !== k) seen.push(k); } catch (e) {} }, 20);
  rab.hp = 0; rab.alive = false; b.playDefeat(rab, 1);
  await sleep(1600); clearInterval(sample);
  const order = seen.filter((k) => /fall_/.test(k)).map((k) => k.match(/fall_(\d)/)[1]).join('');
  check('Rabdul falls: knocked, kneel, crumple, down', order === '0123', order);
  // 6.2 the archer too
  const seen2 = []; const sample2 = setInterval(() => { try { const k = arc.view && arc.view.active ? key(arc) : ''; if (k && seen2[seen2.length - 1] !== k) seen2.push(k); } catch (e) {} }, 20);
  arc.hp = 0; arc.alive = false; b.playDefeat(arc, -1);
  await sleep(1600); clearInterval(sample2);
  const order2 = seen2.filter((k) => /fall_/.test(k)).map((k) => k.match(/fall_(\d)/)[1]).join('');
  check('The archer falls: knocked, kneel, crumple, down', order2 === '1245', order2);
  // 6.3 Gaha's thrust plays frame by frame
  put(gaha, 3, 3); gaha.facing = 'downRight';
  const foe = byId('e2'); put(foe, 4, 3); foe.hp = foe.maxHp;
  const seen3 = []; const sample3 = setInterval(() => { try { const k = key(gaha); if (/gaha_thrust/.test(k) && seen3[seen3.length - 1] !== k) seen3.push(k); } catch (e) {} }, 15);
  b.playAttack(gaha, foe, { hit: true, damage: 3 }, false, null);
  await sleep(1200); clearInterval(sample3);
  check('Gaha thrusts through frames 0 to 5 in order', seen3.map((k) => k.match(/_(\d)\.png/)[1]).join('') === '012345', seen3.join(','));
  check('and goes back to standing', !/thrust/.test(key(gaha)), key(gaha));
  check('no errors', errors.filter((e) => !/Could not load img|focus\(\)/.test(e)).length === 0, errors.filter((e) => !/Could not load img|focus\(\)/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
