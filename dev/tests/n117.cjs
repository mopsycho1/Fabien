// 26 Nov batch (Suleiman 22 to 26 Nov). Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1.
//   1.103 no floor or painted shadow left under Layra's standing and battle pictures (dev/tools/shadow_clean.py --check)
//   1.105 the save records the line-up with its sides, so Continue builds the same fighters (dev/browser/resume_lineup.cjs: the reload)
//   1.104 Aegis blocks poison, Bleeding and burn; a poison tick on a shielded fighter is soaked by the shield; the dome covers him
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

  // ---------- 1.104 ----------
  const St = w.__status;
  const ala = U('h5'), sud = U('h1'), arch = U('e3');
  const aegis = (u) => { u.shield = { hp: 8, turnsLeft: 3 }; b.syncShieldDome(u, true); };
  aegis(sud);
  check('1.104 Aegis blocks poison', St.applyPoison(sud, 'poisonArrow') === false && !St.isPoisoned(sud));
  check('1.104 Aegis blocks Bleeding', St.applyPoison(sud, 'ambush') === false && !St.isBleeding(sud));
  check('1.104 Aegis blocks burn', St.applyBurn(sud, 'kindleBurn') === false && !St.isBurning(sud));
  sud.shield = null; St.applyPoison(sud, 'poisonArrow'); sud.shield = { hp: 8, turnsLeft: 3 };
  const hp0 = sud.hp; const lost = St.tickPoison(sud);
  check('1.104 a poison tick on a shielded fighter is soaked by the shield', lost === 0 && sud.hp === hp0 && sud.shield.hp < 8, 'lost ' + lost + ', shield ' + sud.shield.hp);
  // the archer's coated hit on a shielded foe: "Blocked", no poison
  St.curePoison(sud); sud.shield = { hp: 8, turnsLeft: 3 }; arch.coated = true;
  b.coatLands(arch, sud);
  check('1.104 the coated hit is blocked by Aegis', !St.isPoisoned(sud));
  // the dome covers the whole fighter (its drawn dome, fit h, against his body height)
  sud.shield = null; b.syncShieldDome(sud); aegis(sud); await sleep(1500);
  const dome = sud.shieldDome;
  const slots = require('../../src/data/fxSlots.json');
  const find = (o) => { for (const k in o) { if (k === 'aegis' && o[k].fit) return o[k]; if (o[k] && typeof o[k] === 'object') { const r = find(o[k]); if (r) return r; } } return null; };
  const ae = find(slots);
  const domeH = dome && ae ? ae.fit.h * dome.scaleY : 0, body = sud.topY - 12;
  check('1.104 the Aegis dome is as tall as the fighter or taller', dome && domeH >= body * 1.15, Math.round(domeH) + ' vs body ' + Math.round(body));
  b.shieldFlash(sud); await sleep(400);
  check('1.104 a hit on the shield flashes the dome and leaves its size', dome && Math.abs(dome.scaleY * ae.fit.h - domeH) < 1, (dome && dome.scaleY));
  sud.shield = null; b.syncShieldDome(sud);

  // ---------- 1.105 ----------
  const snap = w.__save ? w.__save.snapshot(b) : null;
  const sides = b.units.map((u) => u.id + ':' + u.side).sort().join(' ');
  const saved = snap && snap.lineUp ? [...snap.lineUp.hero.map((i) => i + ':hero'), ...snap.lineUp.enemy.map((i) => i + ':enemy')].sort().join(' ') : 'no lineUp in the save';
  check('1.105 the save records who fights on which side', saved === sides, saved);

  // (more parts follow, one per fix)

  const real = errors.filter((e) => !/Not implemented/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log('RESULT ' + (fails ? 'FAILED' : 'ALL PASSED'));
  process.exit(fails ? 1 : 0);
})();
