// 18.2 (Battle 1.0 milestone M2): the size ruler. art.json lists a scale and a ground line
// ("feet") for the pictures that were cut too big or too small; the battle draws each picture
// with them (BattleScene.showFrame), so a character's head is the same size in every pose.
const fs = require('fs');
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const art = JSON.parse(fs.readFileSync(__dirname + '/../../src/data/art.json', 'utf8'));
(async () => {
  // ---- the list itself ----
  let listed = 0; const wrong = [];
  for (const [id, entry] of Object.entries(art)) {
    const text = JSON.stringify({ ...entry, ruler: null });
    for (const [file, r] of Object.entries(entry.ruler || {})) {
      listed++;
      if (!fs.existsSync(__dirname + '/../../public/art/' + file)) wrong.push(file + ' is not in public/art');
      if (!text.includes('"' + file + '"')) wrong.push(file + ' is not used by ' + id);
      if (r.scale !== undefined && !(r.scale >= 0.5 && r.scale <= 2)) wrong.push(file + ' scale ' + r.scale);
      if (r.feet !== undefined && !(r.feet >= 0.5 && r.feet <= 1)) wrong.push(file + ' feet ' + r.feet);
    }
  }
  check('art.json: the ruler lists pictures, each one real, in use, with a sane scale and ground line', listed > 50 && wrong.length === 0, listed + ' listed; ' + wrong.slice(0, 3).join(' | '));
  const standing = Object.keys(art).filter((id) => Object.values(art[id].standing || {}).some((v) => (art[id].ruler || {})[v.file || v]));
  check('a standing picture is the ruler itself: none is rescaled', standing.length === 0, standing.join(' '));
  const old = ['gaha_knocked.png', 'sudeen_knocked.png', 'layra_knocked.png', 'tayo_knocked.png', 'bull_knocked.png', 'sudeen_cast.png'].filter((f) => JSON.stringify(art).includes('"' + f + '"'));
  check('the old-style "knocked" pictures are no longer used (swapped for the hurt or in-the-air picture)', old.length === 0, old.join(' '));

  // ---- in the battle ----
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  b.endTurn = () => {};
  const gaha = b.units.find((u) => u.label === 'H2');
  const sp = gaha.sprite, base = gaha.baseScale;
  const near = (a, c) => Math.abs(a - c) < 0.002;
  b.busy = true; await sleep(100); // an action is on: breathing rests, so sizes can be read exactly
  b.showStanding(gaha);
  check('standing: drawn at the unit\'s one size', gaha.frameScale === 1 && near(sp.scaleX, base) && sp.originY === 1, sp.scaleX + ' / ' + base);
  // a pose the ruler rescales
  const R = art.h2.ruler;
  const pick = (name) => { const v = art.h2.poses[name]; const f = v.file ? v : (v.downRight || Object.values(v)[0]); return { file: f.file, rule: R[f.file] }; };
  const big = pick('sonicRelease');
  check('Gaha\'s Sonic Javelin release was cut small: the ruler lists it at 1.3 or more', !!big.rule && big.rule.scale >= 1.3, JSON.stringify(big.rule));
  gaha.facing = 'downRight';
  b.showPose(gaha, 'sonicRelease', 1);
  check('showFrame draws it bigger by exactly that much', sp.texture.key === 'h2:' + big.file && near(sp.scaleX, base * big.rule.scale) && near(sp.scaleY, base * big.rule.scale) && near(gaha.artScale, base * big.rule.scale), sp.texture.key + ' ' + (sp.scaleX / base).toFixed(3));
  // the head is the same height on screen in both pictures, within the 8 percent of checklist B1 (the tool's audit measures heads; here: the sizes multiply out)
  b.showStanding(gaha);
  check('back to standing: back to the one size, nothing left over', gaha.frameScale === 1 && near(sp.scaleX, base) && near(sp.scaleY, base), sp.scaleX / base);
  // a squash under way keeps its shape when the picture changes
  sp.setScale(base * 1.2, base * 0.8);
  b.showPose(gaha, 'sonicRelease', 1);
  check('a squash under way keeps its shape through a picture change', near(sp.scaleX, base * 1.2 * big.rule.scale) && near(sp.scaleY, base * 0.8 * big.rule.scale), (sp.scaleX / base).toFixed(3) + ' ' + (sp.scaleY / base).toFixed(3));
  sp.setScale(gaha.artScale); b.showStanding(gaha);
  // the ground line
  const withFeet = Object.entries(art).flatMap(([id, e]) => Object.entries(e.ruler || {}).filter(([, r]) => r.feet).map(([file, r]) => ({ id, file, feet: r.feet })));
  if (withFeet.length) {
    const f = withFeet.find((x) => x.id === 'h2') || withFeet[0];
    const u = b.units.find((x) => x.id === f.id);
    if (u) {
      const scale = (art[f.id].ruler[f.file].scale || 1);
      b.showFrame(u, { key: f.id + ':' + f.file, flip: false, originX: 0.5, scale, originY: f.feet });
      check('a picture with dust or a weapon below the feet stands on its ground line (' + f.file + ')', near(u.sprite.originY, f.feet), u.sprite.originY);
      b.showStanding(u);
      check('and the next picture stands on its bottom edge again', u.sprite.originY === 1, u.sprite.originY);
    }
  }
  // breathing follows the picture's size
  b.busy = false; b.showPose(gaha, 'sonicRelease', 1);
  let lo = 9, hi = 0, wide = true;
  for (let i = 0; i < 60; i++) { await sleep(40); const k = sp.scaleY / (base * big.rule.scale); lo = Math.min(lo, k); hi = Math.max(hi, k); if (!near(sp.scaleX, base * big.rule.scale)) wide = false; }
  check('breathing: the figure rises up to 3.5 percent from the size of the picture shown, width steady', lo > 0.999 && hi < 1.0351 && hi > 1.005 && wide, lo.toFixed(3) + ' to ' + hi.toFixed(3));
  b.showStanding(gaha); await sleep(200);
  check('standing again and breathing from the one size', sp.scaleY / base > 0.999 && sp.scaleY / base < 1.0351 && near(sp.scaleX, base), (sp.scaleY / base).toFixed(3));
  // every unit: every pose it has is drawn at base x the ruler's scale
  let bad = [];
  b.busy = true; await sleep(80);
  for (const u of b.units.filter((x) => x.sprite)) {
    for (const name of Object.keys((art[u.id] || {}).poses || {})) {
      b.showPose(u, name, 1);
      const file = u.sprite.texture.key.split(':')[1];
      const want = ((art[u.id].ruler || {})[file] || {}).scale || 1;
      if (!near(u.sprite.scaleX, u.baseScale * want)) bad.push(u.label + ' ' + name + ' ' + (u.sprite.scaleX / u.baseScale).toFixed(2) + ' not ' + want);
    }
    b.showStanding(u);
    if (!near(u.sprite.scaleX, u.baseScale * u.frameScale)) bad.push(u.label + ' standing');
  }
  check('every fighter, every pose: drawn at its one size times the ruler\'s scale', bad.length === 0, bad.slice(0, 4).join(' | '));
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails === 0 ? 0 : 1);
})();
