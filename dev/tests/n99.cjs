// 18.52 (after 1.85: at low health Alagara was drawn far bigger than everyone else).
// Every pose of every fighter is drawn at its standing size, within 10 percent.
//   A: no picture is drawn more than 10 percent TALLER than the fighter's standing picture (picture height x the
//      ruler's scale), unless dev/tools/pose_sizes.json "tall" says why (a weapon held over the head). Checked always.
//   B: the BODY size of every family (a crouch or a fall is shorter, so height alone cannot tell) is within 0.90 to
//      1.10 of standing: dev/tools/pose_size.py audit reads the head (the size ruler's head finder), or the size judged
//      by eye where the finder cannot read a family, and fails a family sized by eye whose picture changed since.
//      Run here when the tools Python is on this machine.
//   C: Alagara's hurt and weak (low health) pictures, the cause of 1.85, are no taller than his standing one.
//   D: (1.112, 26 Nov: "the Thief is drawn bigger than everyone else") no fighter's head is drawn more than 1.2 times the cast's
//      middle head: the head boxes in dev/tools/ruler_heads.json (read by eye on the standing pictures) times the size the game
//      draws the standing picture at (art.json "height" over the tallest standing picture). A fighter meant to be bigger is listed
//      in dev/tools/pose_sizes.json "bigHead" with the reason. Checked always.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };

const ROOT = path.join(__dirname, '../..');
const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/art.json'), 'utf8'));
const sizes = JSON.parse(fs.readFileSync(path.join(ROOT, 'dev/tools/pose_sizes.json'), 'utf8'));
const heightOf = (file) => fs.readFileSync(path.join(ROOT, 'public/art', file)).readUInt32BE(20); // a PNG says its size in its first bytes

// the same rules as dev/tools/ruler_lib.py: which parts are body pictures, and the family a picture belongs to
const SKIP = ['name', 'portrait', 'portraitHurt', 'shout', 'hurtFaces', 'clash', 'height', 'auraPainted', 'ruler', 'headTurn', 'walkStyle', 'unwired', 'weapon', 'expressions'];
const NOT_PICS = ['frameMs', 'chargeFrames', 'strikeFrom', 'strikeTo', 'walkStyle'];
const family = (file) => file.replace(/_(upLeft|upRight|downLeft|downRight|f\d+|\d+|single)\.png$/, '').replace('.png', '');
function pictures(entry) {
  const out = [];
  const walk = (v, where) => {
    if (typeof v === 'string' && v.endsWith('.png')) out.push({ file: v, where });
    else if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.file === 'string') out.push({ file: v.file, where });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, where + '.' + i));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (!k.startsWith('note') && !NOT_PICS.includes(k)) walk(x, where + '.' + k); }
  };
  for (const [k, v] of Object.entries(entry)) if (!SKIP.includes(k) && !k.startsWith('note')) walk(v, k);
  return out;
}

// ---------- A: nobody drawn more than 10 percent taller than standing ----------
let pics = 0; const tall = [];
for (const [id, entry] of Object.entries(art)) {
  if (!entry.standing) continue;
  const ruler = entry.ruler || {};
  const drawn = (f) => heightOf(f) * ((ruler[f] && ruler[f].scale) || 1);
  const all = pictures(entry);
  const stand = all.filter((p) => p.where.startsWith('standing')).map((p) => drawn(p.file)).sort((a, b) => a - b);
  const st = stand[Math.floor(stand.length / 2)];
  const seen = new Set();
  for (const p of all) {
    if (seen.has(p.file)) continue; seen.add(p.file); pics++;
    const k = drawn(p.file) / st;
    const why = sizes.tall[id] && sizes.tall[id][family(p.file)];
    const skip = sizes.skip[id] && sizes.skip[id][family(p.file)];
    if (k > 1.10 && !why && !skip) tall.push(id + ' ' + p.file + ' ' + k.toFixed(2));
  }
}
check('no picture is drawn more than 10 percent taller than standing (' + pics + ' pictures)', tall.length === 0, tall.slice(0, 40).join(' | '));
check('every "tall" family in pose_sizes.json says why', Object.values(sizes.tall).every((fams) => Object.values(fams).every((why) => typeof why === 'string' && why.length > 10)));

// ---------- C: the cause of 1.85 ----------
const ala = art.h5; const ar = ala.ruler || {};
const aDrawn = (f) => heightOf(f) * ((ar[f] && ar[f].scale) || 1);
const aStand = Math.max(...Object.values(ala.standing).map((v) => aDrawn(v.file)));
const low = [...Object.values(ala.weak), ...Object.values(ala.poses.hurt)].map((v) => aDrawn(v.file) / aStand);
check("Alagara's weak and hurt pictures are no taller than his standing one", low.every((k) => k <= 1.0), low.map((k) => k.toFixed(2)).join(' '));
check('Alagara stands in his 21 Nov neutral sheet and the Stone Verse wears his Swift look (6.83)',
  ala.buffed.stone && ala.buffed.stone.downLeft.file === ala.buffed.swiftness.downLeft.file && ala.buffPoses.fury.dodge && ala.buffPoses.swiftness.guard && ala.poses.dodge.downLeft.file.startsWith('alagara_dodge'));

// ---------- B: body size, through the head or the eye ----------
const py = process.env.HOME + '/.fabien-tools/venv/bin/python';
if (fs.existsSync(py)) {
  let out = '';
  try { out = execFileSync(py, [path.join(ROOT, 'dev/tools/pose_size.py'), 'audit'], { cwd: ROOT }).toString(); } catch (e) { out = (e.stdout || '').toString(); }
  const bad = out.split('\n').filter((l) => /^\s+FAIL/.test(l)).map((l) => l.trim());
  check('every family of every fighter has its body within 10 percent of standing (pose_size.py audit)', /ALL PASSED/.test(out) && bad.length === 0, bad.slice(0, 3).join(' | '));
} else console.log('SKIP body size audit (the tools Python is not on this machine)');

// ---------- D: nobody's head drawn far bigger than the cast's (1.112) ----------
{
  const heads = JSON.parse(fs.readFileSync(path.join(ROOT, 'dev/tools/ruler_heads.json'), 'utf8'));
  const drawnHead = {};
  for (const [id, boxes] of Object.entries(heads)) {
    if (id.startsWith('note') || !art[id] || !art[id].standing) continue;
    const tallest = Math.max(...Object.values(art[id].standing).map((v) => heightOf(typeof v === 'string' ? v : v.file)));
    const k = (art[id].height || 100) / tallest;
    const hs = Object.values(boxes).map((b) => (b[3] - b[1]) * k);
    drawnHead[id] = hs.reduce((a, b) => a + b, 0) / hs.length;
  }
  const vals = Object.values(drawnHead).sort((a, b) => a - b);
  const mid = vals[Math.floor(vals.length / 2)];
  const big = Object.entries(drawnHead).filter(([id, h]) => h > mid * 1.2 && !(sizes.bigHead && sizes.bigHead[id]));
  check('D 1.112 no fighter\'s head is drawn more than 1.2 times the cast\'s middle head (' + mid.toFixed(1) + ' px)', big.length === 0,
    big.map(([id, h]) => id + ' ' + (art[id].name || '') + ' ' + h.toFixed(1) + ' px (' + (h / mid).toFixed(2) + 'x)').join(', ') || Object.entries(drawnHead).map(([id, h]) => id + ' ' + h.toFixed(1)).join(' '));
}

console.log(fails ? 'FAILED: ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
