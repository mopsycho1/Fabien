// M9 (roadmap 18.9; 17.13, 17.15; checklist F1 and F2): weight. A hit leaves a pale chunk of
// health that drains, bigger hits write bigger numbers, and each turn starts with a short
// banner in the side's colour that any tap puts away.
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n68.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const U = (id) => b.units.find((u) => u.id === id);
  const sudeen = U('h1'), gaha = U('h2'), rabdul = U('e4');
  b.runEnemyTurn = () => {};
  const near = (a, c, by = 0.03) => Math.abs(a - c) <= by;

  // ---------- the pale chunk ----------
  const ghost = sudeen.plate.ghost;
  check('the plate has a pale piece of bar, empty at the start', !!ghost && ghost.scaleX === 0 && sudeen.plate.list.indexOf(ghost) < sudeen.plate.list.indexOf(sudeen.hpFill));
  const full = sudeen.hp / sudeen.maxHp;
  sudeen.hp -= 12; b.updateHpBar(sudeen); await sleep(120);
  const after = sudeen.hp / sudeen.maxHp;
  check('hit for 12: the green bar drops at once, the pale piece still marks where it was', near(sudeen.hpFill.scaleX, after) && near(ghost.scaleX, full), sudeen.hpFill.scaleX.toFixed(2) + ' ghost ' + ghost.scaleX.toFixed(2));
  await sleep(1000);
  check('about a second later the pale piece has drained to the green', near(ghost.scaleX, after), ghost.scaleX.toFixed(2) + ' vs ' + after.toFixed(2));
  sudeen.hp -= 5; b.updateHpBar(sudeen); await sleep(60); sudeen.hp -= 5; b.updateHpBar(sudeen); await sleep(60);
  check('two quick hits: the pale piece keeps the whole loss', near(ghost.scaleX, after), ghost.scaleX.toFixed(2));
  sudeen.hp += 6; b.updateHpBar(sudeen);
  check('healed: no pale piece', ghost.scaleX === 0);

  // ---------- number size ----------
  const sizeOf = (text) => { const t = b.children.list.filter((o) => o.type === 'Text' && o.text === text).pop(); return t ? parseFloat(t.style.fontSize) : 0; };
  b.placeUnit(gaha, 4, 4); b.placeUnit(rabdul, 4, 3);
  b.showImpact(gaha, rabdul, { hit: true, damage: 2 }, 1); const small = sizeOf('-2');
  b.showImpact(gaha, rabdul, { hit: true, damage: 7 }, 1); const mid = sizeOf('-7');
  b.showImpact(gaha, rabdul, { hit: true, damage: 14 }, 1); const big = sizeOf('-14');
  check('F1 bigger hits write bigger numbers: 2, 7 and 14 damage', small > 0 && small < mid && mid < big && big >= small * 1.6, small + ' ' + mid + ' ' + big);
  check('F1 the target flashes white on a hit (tint filled)', rabdul.sprite.isTinted === true || rabdul.sprite.tintFill === true);
  await sleep(900); b.endCinematic && b.endCinematic(); b.busy = false;

  // ---------- the turn banner ----------
  const seen = {};
  for (let i = 0; i < 10 && !(seen.hero && seen.enemy); i++) {
    b.startTurn(); await sleep(220);
    const box = b.turnBannerBox;
    if (box) seen[b.activeUnit.side] = { side: box.side, color: box.bandColor, x: box.x, alpha: box.alpha, name: box.list.some((o) => o.type === 'Text' && o.text === b.activeUnit.name.toUpperCase()), ui: (box.cameraFilter & b.cameras.main.id) !== 0 };
    if (i === 0) {
      check('F2 a turn starts with a banner, with the fighter\'s name, part of the still interface', !!box && seen[b.activeUnit.side].name && seen[b.activeUnit.side].ui && box.alpha > 0.9);
      b.input.emit('pointerdown', { x: 5, y: 5, id: 1 }, [{}]);
      check('F2 a tap puts it away at once', !b.turnBannerBox && !box.active);
      b.startTurn(); await sleep(1100);
      check('F2 left alone, it is gone inside a second', !b.turnBannerBox);
    }
    b.busy = false;
  }
  check('F2 a hero\'s banner and an enemy\'s are in different colours', seen.hero && seen.enemy && seen.hero.color !== seen.enemy.color, JSON.stringify(seen).slice(0, 200));

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
