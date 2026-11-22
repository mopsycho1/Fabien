// 22 Nov, part 1 bugs (roadmap 1.87 to 1.95). Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1.
//   1.89 no fighter's picture leaves see-through rows under the feet (dev/tools/float_audit.py), except airborne ones
//   1.87 Gaha starts turned toward the enemies: his up-right standing picture is the one cut from the sheet figure that turns right
//   1.88 Layra in meditation sits (her seated meditation pictures, not the spell chant)
//   1.91 Gaha standing his ground keeps his Stone look (no old painted "rooted" picture)
//   1.92 Alagara in Fury with a foe close by shows his Fury battle stance, not his neutral
//   1.93 Alagara in Fury keeps the Fury look for Claim, Mantle's chant and a hit (no base pictures in a form)
//   1.94 Mantle's crown sits under the plate over the head, never on it
//   1.95 Sudeen's slash in each facing is the sheet figure that lunges that way; his bash has no front view cut as up-right
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const ROOT = path.join(__dirname, '../..');
const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/art.json'), 'utf8'));
const PY = path.join(process.env.HOME, '.fabien-tools/venv/bin/python');
(async () => {
  if (fs.existsSync(PY)) {
    let out = '', ok = true;
    try { out = execFileSync(PY, [path.join(ROOT, 'dev/tools/float_audit.py')], { encoding: 'utf8' }); } catch (e) { out = e.stdout || ''; ok = false; }
    check('1.89 nothing floats above its tile', ok, out.trim().split('\n').pop());
  } else console.log('SKIP 1.89 float audit (no tools Python here)');
  // a sheet figure's picture is known by its PNG bytes: the cutter tables say which figure goes where (make_gaha_new.py, make_sudeen_new.py)
  const gahaCut = fs.readFileSync(path.join(ROOT, 'dev/tools/make_gaha_new.py'), 'utf8');
  check('1.87 Gaha: sheet figure 3 (turns right) is up-right', /'gaha_n_stand': \{1: 'upLeft', 2: 'downLeft', 3: 'upRight', 4: 'downRight'\}/.test(gahaCut));
  const sudCut = fs.readFileSync(path.join(ROOT, 'dev/tools/make_sudeen_new.py'), 'utf8');
  check('1.95 Sudeen slash read by the lunge, not the plates', /'sudeen_n_slash': \{1: 'upLeft', 2: 'upRight', 3: 'downLeft', 4: 'downRight'\}/.test(sudCut));
  check('1.95 Sudeen bash: no front view as up-right', !art.h1.poses.slipStrike.upRight && !art.h1.poses.push.upRight);
  check('1.88 Layra meditates seated', Object.values(art.h3.poses.meditate).every((v) => /meditate/.test(v.file)), JSON.stringify(art.h3.poses.meditate));
  check('1.91 Gaha has no painted rooted look', !art.h2.rooted);

  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const S = w.__status;
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const ala = b.units.find((u) => u.id === 'h5');
  const gaha = b.units.find((u) => u.id === 'h2');
  const layra = b.units.find((u) => u.id === 'h3');
  const key = (u) => u.sprite.texture.key;
  // 1.92 and 1.93
  S.applyBuff(ala, 'fury');
  b.isAlert = (u) => u === ala; ala.facing = 'downLeft'; b.showStanding(ala);
  check('1.92 Fury with a foe near: Fury battle stance', /alagara_fury_ready/.test(key(ala)), key(ala));
  for (const pose of ['claimReach', 'claimSnatch', 'chant', 'hurt', 'windup', 'attack']) {
    b.showPose(ala, pose, -10);
    check('1.93 Fury ' + pose + ' keeps the Fury look', /alagara_fury/.test(key(ala)), key(ala));
  }
  // 1.91
  S.applyBuff(gaha, 'stone'); gaha.status.rooted = true; b.showStanding(gaha);
  check('1.91 Gaha rooted: his Stone look', !/gaha_rooted/.test(key(gaha)), key(gaha));
  // 1.88
  layra.meditating = { restore: 4 }; b.showStanding(layra);
  check('1.88 Layra meditating: seated picture', /meditate/.test(key(layra)), key(layra));
  layra.meditating = null;
  // 1.94
  const sa = w.__fx;
  if (sa && sa.crownOver) {
    const c = sa.crownOver(b, gaha);
    if (c) {
      gaha.mantleCrown = c; gaha.mantleVerse = 'stone'; b.refreshStatusTags();
      const fit = require('../../src/data/fxSlots.json').spells.mantle.fit; // the drawn crown inside its frame
      const crownTop = c.y - (c.originY * fit.H - (fit.my - fit.h / 2)) * c.scaleY;
      check('1.94 the plate is lifted clear of the crown', gaha.plate.y <= 0 && (-gaha.topY + gaha.plate.y + 10) <= crownTop + 1, 'plate ' + gaha.plate.y + ', crown top ' + crownTop.toFixed(1));
    } else console.log('SKIP 1.94 (crown effect not loaded)');
  } else console.log('SKIP 1.94 (spellArt not exposed)');
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' / '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
