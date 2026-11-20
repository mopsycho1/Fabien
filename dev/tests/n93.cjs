// Roadmap 10.36 (20 Nov): no fighter falls back to a blank face. Every character in units.json has a portrait picture that exists
// on disk (and a WebP twin), loads in the select and in the battle, and portraitKey gives a loaded picture for each one on the
// board (the turn strip, the diamond list and the unit card all draw from it).
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n93.cjs
const { start, battle } = require('./boot.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const units = require('../../src/data/units.json'); const art = require('../../src/data/art.json');
  const artDir = path.resolve(__dirname, '../../public/art/');
  // 1. the data: every character has a portrait file, and a WebP twin
  const noFace = units.filter((u) => !(art[u.id] && art[u.id].portrait && fs.existsSync(path.join(artDir, art[u.id].portrait))));
  check('every character has a portrait picture on disk', noFace.length === 0, noFace.map((u) => u.name).join(', '));
  const noTwin = units.filter((u) => art[u.id] && art[u.id].portrait && art[u.id].portrait.endsWith('.png') && !fs.existsSync(path.join(artDir, art[u.id].portrait.replace(/\.png$/, '.webp'))));
  check('...and each PNG portrait has its WebP twin', noTwin.length === 0, noTwin.map((u) => u.name).join(', '));
  // the kings' faces are real crops: a face about the size of the others (not a stand-in speck)
  for (const id of ['h5', 'e5']) {
    const f = path.join(artDir, art[id].portrait); const buf = fs.readFileSync(f);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    check(units.find((u) => u.id === id).name + '\'s portrait is a proper size (150 to 300 pixels wide, head and shoulders)', w >= 150 && w <= 300 && h >= 150 && h <= 300, w + ' x ' + h);
  }
  const { w, game, errors: all } = await start();
  const errors = all.filter((e) => !/focus\(\)/.test(e));
  // 2. the select shows a picture for everyone (no letter-in-a-diamond placeholder)
  game.scene.stop('StartScene'); w.localStorage.removeItem('fabien.lineup');
  game.scene.start('SelectScene', { stepIndex: null, map: 'cavern' });
  let s = null; for (let i = 0; i < 300 && !(s && s.cardHits && s.cardHits.length); i++) { await sleep(100); s = game.scene.getScene('SelectScene'); }
  const noSel = units.filter((u) => !game.textures.exists('sel:' + u.id));
  check('the select has a portrait loaded for every character', noSel.length === 0, noSel.map((u) => u.name).join(', '));
  // 3. the battle with everyone on the board: every fighter's face is a loaded picture
  game.scene.stop('SelectScene');
  const b = await battle(game); await sleep(400);
  const ids = b.units.map((u) => u.id);
  check('both kings are on the board', ids.includes('h5') && ids.includes('e5'), ids.join());
  const A = w.__art;
  const blank = b.units.filter((u) => { const k = A.portraitKey(u.id, u); return !k || !game.textures.exists(k); });
  check('every fighter on the board has a loaded face (turn strip, list and card)', blank.length === 0, blank.map((u) => u.name).join(', '));
  const hurt = b.units.filter((u) => { u.hp = 1; const k = A.portraitKey(u.id, u); return !k || !game.textures.exists(k); });
  check('...also when badly hurt', hurt.length === 0, hurt.map((u) => u.name).join(', '));
  const shout = b.units.filter((u) => { const k = A.shoutKey(u.id); return !k || !game.textures.exists(k); });
  check('...and for the battle cry', shout.length === 0, shout.map((u) => u.name).join(', '));
  check('no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
