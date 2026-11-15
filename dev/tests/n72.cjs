// M16 follow-up: Kofi has a name, a face and clash pictures; no unit falls back to a letter
// or an ID; tooltips close when the result, settings or a turn end comes.
// Run: FABIEN_MAP=cavern FABIEN_BENCH= node n72.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(500);
  for (const u of b.units) {
    const key = w.__art.portraitKey(u.id, u);
    check(u.name + ' has a face picture loaded (no letter token)', !!key && b.textures.exists(key), key);
    check(u.name + ' has a real name (not an ID or "Enemy 3")', u.name && !/^(h|e)\d$/i.test(u.name) && !/^Enemy/.test(u.name), u.name);
  }
  const kofi = b.units.find((u) => u.id === 'h4');
  for (const pose of ['clashPress', 'clashGuard', 'clashSlip', 'guard', 'dodge', 'ready', 'attack']) check('Kofi has the ' + pose + ' picture', b.hasPose(kofi, pose));
  for (const st of ['press', 'guard', 'slip']) check('Kofi\'s ' + st + ' clash picture exists', b.hasPose(kofi, b.clashPose(kofi, st)), b.clashPose(kofi, st));
  // tooltips
  const T = w.__tooltip;
  const show = () => { T.showTip(b, { title: 'Press', body: 'test' }, 300, 400); return !!b.tip; };
  check('a tooltip shows in a normal turn', show());
  b.runEnemyTurn = () => {}; b.busy = false; b.endTurn(); await sleep(400);
  check('ending the turn closes the tooltip', !b.tip);
  b.openSettings(true); check('opening settings closes a tooltip', (b.tip === null || !b.tip)); 
  check('no tooltip can show over the settings sheet', !show()); b.openSettings(false);
  b.units.filter((u) => u.side === 'enemy').forEach((f) => { b.landHit(f, f.hp); b.defeat(f); });
  b.showResult('victory'); await sleep(300);
  check('no tooltip over the result screen', !b.tip && !show());
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
