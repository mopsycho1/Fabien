// 26 Nov batch (Suleiman 22 to 26 Nov). Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1.
//   1.103 no floor or painted shadow left under Layra's standing and battle pictures (dev/tools/shadow_clean.py --check)
const { start, battle } = require('./boot.cjs');
const { execSync } = require('child_process');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const ROOT = path.join(__dirname, '..', '..');
const PY = path.join(process.env.HOME, '.fabien-tools', 'venv', 'bin', 'python');
(async () => {
  // ---------- 1.103 ----------
  const files = ['stand', 'battle'].flatMap((k) => ['upLeft', 'upRight', 'downLeft', 'downRight'].map((f) => 'public/art/layra_n_' + k + '_' + f + '.png'));
  const out = execSync(PY + ' -I dev/tools/shadow_clean.py --check ' + files.join(' '), { cwd: ROOT }).toString().trim().split('\n');
  const left = out.map((l) => l.split(' ')).filter(([, n]) => Number(n) >= 40);
  check('1.103 no floor or painted shadow under Layra standing or in battle stance', left.length === 0, left.map((x) => x.join(' ')).join(', ') || 'all under 40 pixels');

  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  b.runEnemyTurn = () => {}; b.endTurn = () => {}; b.enemySecondWalk = false;
  const U = (id) => b.units.find((u) => u.id === id);

  // (more parts follow, one per fix)

  const real = errors.filter((e) => !/Not implemented/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log('RESULT ' + (fails ? 'FAILED' : 'ALL PASSED'));
  process.exit(fails ? 1 : 0);
})();
