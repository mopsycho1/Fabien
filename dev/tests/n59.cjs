// 13 Nov batch (roadmap ART2 = 18.18, ART3 = 13.44): Suleiman's fall sheets for Sudeen and Gaha's back view,
// and the dodge sheets for Layra and the archer, cut through the size ruler and wired in.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n59.cjs
const fs = require('fs');
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const art = JSON.parse(fs.readFileSync(__dirname + '/../../src/data/art.json', 'utf8'));
(async () => {
  // ---------- the pictures ----------
  const files = (v) => (v.file ? [v.file] : Object.values(v).map((x) => x.file));
  const sets = { 'Sudeen fallAir': art.h1.poses.fallAir, 'Sudeen fallLand': art.h1.poses.fallLand, 'Sudeen fallRise': art.h1.poses.fallRise,
    'Gaha fallAir': art.h2.poses.fallAir, 'Gaha fallLand': art.h2.poses.fallLand, 'Gaha fallRise': art.h2.poses.fallRise,
    'Layra dodge': art.h3.poses.dodge, 'archer dodge': art.e3.poses.dodge };
  const missing = Object.entries(sets).flatMap(([n, v]) => files(v).filter((f) => !fs.existsSync(__dirname + '/../../public/art/' + f)).map((f) => n + ': ' + f));
  check('every new picture is on disk', missing.length === 0, missing.join(' '));
  check('Sudeen has a fall set in two views (down-right, up-right); the game mirrors the other two', ['fallAir', 'fallLand', 'fallRise'].every((k) => art.h1.poses[k].downRight && art.h1.poses[k].upRight));
  check('Gaha: his front fall (11 Nov) stays as his down-right and the back view is his up-right', ['fallAir', 'fallLand', 'fallRise'].every((k) => /^gaha_fall_(air|land|rise)\.png$/.test(art.h2.poses[k].downRight.file) && /upRight/.test(art.h2.poses[k].upRight.file)));
  check('Layra has a dodge in four views, and the archer\'s four replace her single old one', Object.keys(art.h3.poses.dodge).length === 4 && Object.keys(art.e3.poses.dodge).length === 4 && !fs.existsSync(__dirname + '/../../public/art/archer_dodge.png'));
  // the size ruler: heads within 8 percent is the audit's job (ruler.py audit, in ruler.cjs); here: no stray scale on the new families
  const R = (c) => art[c].ruler || {};
  const stray = Object.entries({ ...R('h1'), ...R('h2'), ...R('h3'), ...R('e3') }).filter(([f, r]) => /sudeen_fall|gaha_fall|layra_dodge|archer_dodge/.test(f) && r.scale).map(([f]) => f);
  check('the new pictures were cut at the right size: the ruler leaves them at 1', stray.length === 0, stray.join(' '));
  const feet = Object.entries({ ...R('h1'), ...R('h2'), ...R('h3'), ...R('e3') }).filter(([f]) => /sudeen_fall|gaha_fall_.*upRight|layra_dodge|archer_dodge/.test(f) && !/air/.test(f));
  check('and their feet are on the tile middle (a foot point is stored for them)', feet.length >= 8, feet.length);

  // ---------- in the battle ----------
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(500);
  const G = w.__grid;
  const by = (id) => b.units.find((u) => u.id === id);
  const sudeen = by('h1'), gaha = by('h2'), layra = by('h3'), tayo = by('e1'), archer = by('e3');
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  for (const st of b.sites || []) st.dug = true;
  const put = (u, c, r) => b.placeUnit(u, c, r);
  let k = 0; const away = [[0, 0], [8, 0], [0, 2], [8, 2], [0, 4], [8, 4], [1, 1], [7, 1]]; /* 8 fighters since M10b */
  const clear = () => { k = 0; for (const u of b.units) { u.hp = u.maxHp = 300; u.alive = true; u.knockPending = false; u.engagedWith = null; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; put(u, ...away[k++]); } b.busy = false; };
  b.setSpeed('base', 3);
  const seen = async (unit, ms) => { const keys = new Set(); const t = Date.now(); while (Date.now() - t < ms) { if (unit.sprite && unit.sprite.active) keys.add(unit.sprite.texture.key.split(':')[1]); await sleep(8); } return [...keys]; };
  // a push off the platform onto the bridge beside it, for a unit facing a given way
  for (const [who, name, prefix] of [[sudeen, 'Sudeen', 'sudeen_fall'], [gaha, 'Gaha', 'gaha_fall']]) {
    for (const facing of ['downRight', 'upRight', 'upLeft']) {
      clear(); put(who, 3, 4); put(tayo, 4, 4); who.facing = facing; b.showStanding(who); // pushed west off the platform (2 levels) onto the bridge (1 level)
      const pushed = b.pushLoser(who, tayo, 2);
      b.knockBack(who, pushed, 1);
      const keys = await seen(who, 1600);
      const air = keys.find((x) => x.startsWith(prefix + '_air')), land = keys.find((x) => x.startsWith(prefix + '_land')), rise = keys.find((x) => x.startsWith(prefix + '_rise'));
      const wantBack = facing.startsWith('up');
      check(name + ' pushed while facing ' + facing + ': the air, landing and rising pictures show' + (wantBack ? ' (back view)' : ' (front view)'), !!air && !!land && !!rise && [air, land, rise].every((x) => (wantBack ? /upRight/.test(x) : !/upRight/.test(x))), [air, land, rise].join(' '));
      while (who.knock) await sleep(20);
      const p = G.tileToScreen(who.col, who.row);
      check(name + ': and he is back on the middle of his tile, standing', Math.hypot(who.view.x - p.x, who.view.y - p.y) < 0.5 && !/fall/.test(who.sprite.texture.key), who.sprite.texture.key);
    }
  }
  // a miss shows the dodge, then the unit stands again
  for (const [who, name, rx] of [[layra, 'Layra', /layra_dodge_/], [archer, 'The archer', /archer_dodge_/]]) {
    for (const [facing, dx, want] of [['downRight', -50, 'downRight'], ['downLeft', 50, 'downLeft'], ['upRight', -50, 'upRight'], ['upLeft', 50, 'upLeft']]) {
      clear(); put(who, 4, 7); put(tayo, 5, 7); who.facing = facing; b.showStanding(who);
      b.showImpact(tayo, who, { hit: false, damage: 0 }, dx, false);
      await sleep(60);
      const key = who.sprite.texture.key;
      check(name + ' facing ' + facing + ', attacker ' + (dx < 0 ? 'on the right' : 'on the left') + ': a miss shows her dodge picture for that view', rx.test(key) && key.endsWith(want + '.png'), key.split(':')[1]);
      await sleep(900);
      const p = G.tileToScreen(who.col, who.row);
      check(name + ': and after a moment she stands again, on her tile', !/dodge/.test(who.sprite.texture.key) && Math.hypot(who.view.x - p.x, who.view.y - p.y) < 0.5, who.sprite.texture.key.split(':')[1]);
    }
  }
  // the dodge is only shown while the miss plays: a unit hit for real (not a miss) never shows it
  clear(); put(archer, 4, 7); put(tayo, 5, 7); archer.facing = 'downRight'; b.showStanding(archer);
  b.showImpact(tayo, archer, { hit: true, damage: 3 }, -50, false); await sleep(80);
  check('a hit is not a dodge', !/dodge/.test(archer.sprite.texture.key), archer.sprite.texture.key.split(':')[1]);
  await sleep(700);
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
