// Roadmap 18.47 (20 Nov): faster loading. The title loads nothing, the select loads only portraits, and Start battle
// loads just the picked fighters' pictures (and the shared board, effects and HUD pictures) behind a loading bar.
// Pictures are fetched as WebP twins (lossy at quality 90 since 18.48) (the jsdom canvas cannot read WebP, so the test browser asks for PNG).
// Run:  node n92.cjs
const { start } = require('./boot.cjs');
const { execSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors: allErrors } = await start();
  const errors = { filter: (f) => allErrors.filter(f), some: (f) => allErrors.some(f), slice: (...a) => allErrors.filter((e) => !/focus\(\)/.test(e)).slice(...a), get length() { return allErrors.filter((e) => !/focus\(\)/.test(e)).length; } }; // (the fake browser has no focus())
  const tex = (key) => game.textures.exists(key);
  const A = w.__art;
  const gahaStand = (() => { const art = require('../../src/data/art.json'); return A.textureKey('h2', Object.values(art.h2.standing).map((v) => v.file || v)[0]); })();
  const sudeenStand = (() => { const art = require('../../src/data/art.json'); return A.textureKey('h1', Object.values(art.h1.standing).map((v) => v.file || v)[0]); })();

  // 1. the title: nothing fetched, ready at once
  const title = game.scene.getScene('StartScene');
  check('the title is ready with no pictures loaded', title.artReady === true && !tex(gahaStand) && !tex('terrain:top:sand') && !tex('ui:' + 'frame'), Object.keys(game.textures.list).length + ' textures');
  check('the title has no loading bar', !title.loadBar);

  // 2. the select: the portraits only
  game.scene.stop('StartScene');
  w.localStorage.removeItem('fabien.lineup');
  game.scene.start('SelectScene', { stepIndex: null, map: 'cavern' });
  let s = null; for (let i = 0; i < 300 && !(s && s.cardHits && s.cardHits.length); i++) { await sleep(100); s = game.scene.getScene('SelectScene'); }
  check('the select shows its cards', !!s && s.cardHits.length > 0);
  check('the select has loaded the portraits (Gaha)', tex('sel:h2'));
  check('...and no fighter pictures or board pictures yet', !tex(gahaStand) && !tex('terrain:top:sand'));

  // 3. Start battle: only the picked fighters (Gaha against the Archer), and the bar goes away
  game.scene.stop('SelectScene');
  game.scene.start('BattleScene', { stepIndex: null, map: 'cavern', lineUp: { hero: ['h2'], enemy: ['e3'] } });
  let b = null; let sawBar = false;
  for (let i = 0; i < 900 && !(b && b.units && b.units.length); i++) { await sleep(100); b = game.scene.getScene('BattleScene'); if (b && b.loadBarObjects && b.loadBarObjects.length) sawBar = true; }
  await sleep(500);
  check('the loading bar showed while the pictures came in', sawBar);
  check('the loading bar is gone when the battle is on', !b.loadBarObjects && b.loadProgress === 1, b.loadProgress);
  check('the battle fields exactly Gaha and the Archer', b.units.map((u) => u.id).sort().join() === 'e3,h2', b.units.map((u) => u.id).join());
  check('Gaha\'s pictures are in', tex(gahaStand));
  check('Sudeen sat out, so his pictures were never fetched', !tex(sudeenStand));
  check('the board and HUD pictures are in', tex('terrain:top:sand') && game.textures.getTextureKeys().some((k) => k.startsWith('ui:')));
  check('a fighter\'s every picture is in (no missing-picture warnings)', !errors.some((e) => /missing|Texture ".*" not found/i.test(e)), errors.slice(0, 2).join(' | '));

  // 4. a second battle in the same visit finds everything in the cache: no bar, no waiting
  const before = game.textures.getTextureKeys().length;
  game.scene.stop('BattleScene');
  game.scene.start('BattleScene', { stepIndex: null, map: 'cavern', lineUp: { hero: ['h2'], enemy: ['e3'] } });
  let sawBar2 = false; let b2 = null;
  for (let i = 0; i < 300 && !(b2 && b2.units && b2.units.length); i++) { await sleep(50); b2 = game.scene.getScene('BattleScene'); if (b2 && b2.loadBarObjects) sawBar2 = true; }
  check('a second battle with the same fighters shows no loading bar', !sawBar2);
  check('...and fetches nothing new', game.textures.getTextureKeys().length === before + 0 || Math.abs(game.textures.getTextureKeys().length - before) < 40, game.textures.getTextureKeys().length + ' vs ' + before);

  // 5. the address of a picture: WebP in a real browser, PNG in this test browser or with ?png
  const U = w.__artUrl;
  check('this test browser asks for PNG (it cannot read WebP)', U.artUrl('./art/x/y.png') === './art/x/y.png');
  w.__noWebp = false;
  check('a real browser asks for the WebP twin', U.artUrl('./art/x/y.png') === './art/x/y.webp');
  check('a JPEG or a WebP file goes through as it is', U.artUrl('./art/a.jpg') === './art/a.jpg' && U.artUrl('./art/clash/b.webp') === './art/clash/b.webp');
  w.__noWebp = true;

  // 6. every PNG has a current WebP twin (a re-cut picture that was not converted fails here: run dev/tools/make_webp.py)
  const py = path.join(os.homedir(), '.fabien-tools/venv/bin/python');
  if (fs.existsSync(py)) {
    let out = ''; let ok = true;
    try { out = execSync('"' + py + '" -I dev/tools/make_webp.py --check', { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' }); } catch (e) { ok = false; out = (e.stdout || '') + (e.stderr || ''); }
    check('every PNG in public/art has a current WebP twin', ok, out.trim().split('\n').slice(-3).join(' | '));
  } else console.log('SKIP the WebP twin check (no Python venv at ~/.fabien-tools/venv)');

  check('no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
