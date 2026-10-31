// Archers can be caught in a clash.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const Hm = require('/home/claude/fabien/src/data/map.json').heights;
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - Hm[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(50); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.stanceMenu = 'main'; b.empower = false; b.cancelMode(); };
  const guard = U('H1'), scout = U('H2'), sage = U('H3'), eg = U('E1'), ew = U('E2'), archer = U('E3');
  const realEnd = b.endTurn.bind(b); b.endTurn = () => {};
  const park = () => { put(guard, 0, 7); put(scout, 1, 7); put(sage, 3, 7); put(eg, 7, 0); put(ew, 6, 0); put(archer, 5, 0); };
  const combat = require('./combat-bundle.cjs');

  park(); put(archer, 3, 3); put(scout, 3, 4); put(sage, 3, 5); turnOf(scout);
  check('a fighter next to the archer can engage it', E.engageTargets(scout, b.units).includes(archer));
  check('the Engage button lights up', b.halves[0].label.text === 'Engage' && b.halves[0].enabled, b.halves[0].label.text);
  const realR = w.Math.random; w.Math.random = () => (/rollDice/.test(new Error().stack) ? 0.5 : realR()); // even dice: the opening beat cannot be decisive
  b.cancelMode(); b.onEngageButton(); b.handleTap(3, 3);
  check('the preview says it cannot shoot once caught', /Caught, it cannot shoot/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.handleTap(3, 3); await idle(); await sleep(600); await idle();
  w.Math.random = realR;
  check('the archer is caught in the clash', archer.engagedWith === scout && scout.engagedWith === archer);

  // pile-on: everyone else hits a caught archer more easily
  const caught = combat.getHitChance(sage, archer);
  archer.engagedWith = null; const free = combat.getHitChance(sage, archer); archer.engagedWith = scout;
  check('others hit the caught archer 10% more easily', caught - free === 10, free + ' -> ' + caught);

  // on its turn the caught archer cannot shoot: it fights the clash or tries to break free
  const stances = {}; let shots = 0;
  for (let i = 0; i < 12; i++) {
    if (!archer.engagedWith) { put(archer, 3, 3); put(scout, 3, 4); E.startDuel ? E.startDuel(scout, archer) : null; b.refreshEngagementMarks(); }
    archer.hp = archer.maxHp; scout.hp = scout.maxHp; sage.hp = sage.maxHp;
    put(archer, archer.col, archer.row);
    turnOf(archer);
    const sageHp = sage.hp;
    b.runEnemyTurn(); await sleep(300); await idle(); await sleep(400); await idle();
    stances[archer.stance] = (stances[archer.stance] || 0) + 1;
    if (sage.hp < sageHp) shots++;
  }
  check('a caught archer never shoots anyone', shots === 0, shots);
  check('it often tries to Break away', (stances.break || 0) >= 3, JSON.stringify(stances));

  // casters still cannot be caught
  park(); put(sage, 3, 4); put(eg, 3, 3);
  check('the Sage still cannot be caught', !E.canEngage(eg, sage));
  // an archer cannot start a clash itself
  park(); put(archer, 3, 3); put(scout, 3, 4); archer.engagedWith = null; scout.engagedWith = null; archer.hasActed = false;
  check('an archer cannot start a clash', !E.canEngage(archer, scout));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
