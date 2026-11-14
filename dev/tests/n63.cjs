// M11 (roadmap 18.11): pace. Fast enemy turns (a setting the player picks), and less dead time.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const total = () => Object.values(b.speed).reduce((a, c) => a * c, 1);
  const texts = () => { const out = []; const walk = (o) => { if (o.type === 'Text') out.push(o); if (o.list) o.list.forEach(walk); }; b.children.list.forEach(walk); return out; };
  const pill = () => texts().find((t) => /^Enemy turns: /.test(t.text));
  check('enemy turns start at Normal speed, and the pill says so', b.enemyFast === false && pill() && pill().text === 'Enemy turns: Normal', pill() && pill().text);
  check('it sits under the Effects pill without touching it', (() => { const fx = texts().find((t) => /^Effects: /.test(t.text)); const p = pill(); return fx && p && p.y - fx.y >= fx.height - 1; })());
  const hero = b.units.find((u) => u.side === 'hero'), foe = b.units.find((u) => u.side === 'enemy');
  const ran = []; b.runEnemyTurn = () => ran.push(Date.now());
  const turnOf = (u) => { for (const x of b.units) x.ct = 0; u.ct = 1000; b.busy = false; b.startTurn(); };
  // Normal: nothing is sped up
  turnOf(foe);
  check('Normal: an enemy turn runs at speed 1', b.activeUnit === foe && total() === 1, total());
  const t0 = Date.now(); while (!ran.length && Date.now() - t0 < 2000) await sleep(5);
  check('the pause before an enemy acts is about 0.4 seconds (it was 0.6)', ran.length === 1 && ran[0] - t0 >= 330 && ran[0] - t0 < 560, ran[0] - t0);
  // Fast: tapping the pill
  pill().emit('pointerdown');
  check('tapping the pill turns Fast on, at once for the enemy whose turn it is', b.enemyFast === true && pill().text === 'Enemy turns: Fast' && total() === 2, pill().text + ' ' + total());
  check('the choice is remembered on this device', w.localStorage.getItem('fabien.enemyPace') === 'fast');
  ran.length = 0; turnOf(hero);
  check('Fast: a hero turn is still at speed 1', b.activeUnit === hero && total() === 1 && b.tweens.timeScale === 1, total());
  turnOf(foe);
  check('Fast: an enemy turn runs at double speed (tweens and timers)', b.activeUnit === foe && total() === 2 && b.tweens.timeScale === 2 && b.time.timeScale === 2, b.tweens.timeScale);
  const t1 = Date.now(); while (!ran.length && Date.now() - t1 < 2000) await sleep(5);
  check('Fast: the pause before it acts is halved too', ran.length === 1 && ran[0] - t1 < 330, ran[0] - t1);
  // a knockback's wait shrinks with the speed (the wait is on the real clock)
  const realKnock = w.__knockback; b.knockUntil = 0;
  const before = b.time.now; const fake = { ...foe };
  const pk = b.knockBack; let msSeen = 0;
  const src = Object.getPrototypeOf(b).knockBack.toString();
  check('a knockback\'s wait is divided by the battle speed', /ms \/ Math\.max\(1, total\)/.test(src));
  // the finishing-blow slow motion still multiplies in, and never gets stuck
  b.setSpeed('slowMo', 0.35); check('slow motion multiplies with Fast (2 x 0.35)', Math.abs(total() - 0.7) < 1e-9, total()); b.setSpeed('slowMo', 1);
  // the ending is at normal speed
  b.setSpeed('enemy', 2); b.showResult('defeat');
  check('the result screen plays at normal speed', b.speed.enemy === 1 && total() === 1, total());
  pill() && pill().emit('pointerdown');
  check('tapping again goes back to Normal, remembered', b.enemyFast === false && w.localStorage.getItem('fabien.enemyPace') === 'normal');
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
