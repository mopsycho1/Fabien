// M12 (roadmap 18.12; 17.10, 13.45; checklist F3): the ending. The last blow plays slowly, the
// board dims, the word arrives, then turns against par with a rating, damage, who fell, faces.
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n70.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  let b = await battle(game); await sleep(600);
  const En = w.__ending, rules = require('../../src/data/ending.json');
  const texts = () => { const out = []; const walk = (o) => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; b.children.list.forEach(walk); return out; };

  // ---------- the rules (13.45) ----------
  check('par on the cavern: 75 turns at 4 against 4, 40 at 3 against 3 (22 Nov, 18.32)', En.parFor('cavern', 4) === 75 && En.parFor('cavern', 3) === 40);
  check('a map with no par of its own uses the default', En.parFor('nowhere', 4) === rules.par.default['4']);
  check('15 under par or better is Swift, 3 stars, with the gold banner', En.rateWin(85, 100).id === 'swift' && En.rateWin(85, 100).stars === 3 && !!En.rateWin(60, 100).banner);
  check('up to par is Steady, 2 stars', En.rateWin(86, 100).id === 'steady' && En.rateWin(100, 100).id === 'steady' && En.rateWin(100, 100).stars === 2);
  check('over par is Long, 1 star', En.rateWin(101, 100).id === 'long' && En.rateWin(140, 100).stars === 1 && En.rateWin(140, 100).under === -40);

  // ---------- a win ----------
  const heroes = b.units.filter((u) => u.side === 'hero'), foes = b.units.filter((u) => u.side === 'enemy');
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  // real blows, so the damage is counted: each foe takes its whole health, one hero takes 9 and one falls
  for (const f of foes) { const d = f.hp; b.landHit(f, d); }
  b.landHit(heroes[0], 9); b.landHit(heroes[2], heroes[2].hp);
  const dealt = foes.reduce((n, f) => n + f.maxHp, 0), taken = 9 + heroes[2].maxHp;
  for (const u of [...foes, heroes[2]]) b.defeat(u);
  b.turnCount = 55; b.battleOver = true; /* par 75 since 22 Nov (18.32): 55 is Swift */
  b.showResult('victory'); await sleep(60);
  check('F3 the last blow plays slowly', b.speed.finale === rules.slowTo && b.time.timeScale < 0.5, b.speed.finale);
  check('F3 the board dims', !!b.resultDim && b.resultDim.active);
  await sleep(rules.slowMs + 250);
  check('then the speed is normal again', b.speed.finale === 1);
  const t0 = Date.now(); while (!b.resultButtons.length && Date.now() - t0 < 4000) await sleep(30); await sleep(1500);
  const T = texts();
  check('F3 the word: Victory', T.includes('VICTORY')); /* 18.55: his design, in capitals */
  check('F3 the turns, against par, with the rating: 55 turns is Swift', T.includes('Turns Played: 55') && /^Par 75 .*Swift  ★★★$/.test(b.resultRating) && T.includes('SWIFT VICTORY'), T.filter((t) => /Par|Turns|SWIFT/.test(t)).join(' | '));
  check('F3 the numbers are right: damage dealt and taken', b.result.tally.dealt === dealt && b.result.tally.taken === taken && b.resultLines.tally === 'Damage dealt ' + dealt + '   ·   taken ' + taken && T.includes('Damage Dealt') && T.includes(String(dealt)) && T.includes(String(taken)), b.result.tally.dealt + ' / ' + b.result.tally.taken);
  check('F3 who fell', T.includes('Fell: ' + heroes[2].name));
  check('F3 a face for every hero, the fallen one dark', b.resultRows.filter((o) => o.fallen !== undefined).length === heroes.length && b.resultRows.filter((o) => o.fallen).length === 1 && b.resultRows.find((o) => o.fallen).alpha < 0.5);
  check('the best is kept: 55 turns', T.some((t) => /^(New best|Best): 55 turns$/.test(t)), T.filter((t) => /est:/.test(t)).join());
  check('Play again is there', b.resultButtons.length >= 1 && b.resultButtons[b.resultButtons.length - 1].label.text === 'Play again');

  // ---------- again, slower: Long, and the old best stays ----------
  b.resultButtons[b.resultButtons.length - 1].hit.emit('pointerdown');
  const tr = Date.now(); while (Date.now() - tr < 8000) { const s2 = game.scene.getScene('BattleScene'); if (s2.units && s2.units.every((x) => x.alive) && !s2.battleOver && s2.activeUnit && s2.slots) break; await sleep(30); }
  b = game.scene.getScene('BattleScene'); await sleep(400);
  check('a new battle starts with nothing counted and normal speed', Object.keys(b.damageTaken).length === 0 && b.time.timeScale === 1);
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  for (const f of b.units.filter((u) => u.side === 'enemy')) { b.landHit(f, f.hp); b.defeat(f); }
  b.turnCount = 131; b.battleOver = true; b.showResult('victory');
  const t1 = Date.now(); while (!b.resultButtons.length && Date.now() - t1 < 4000) await sleep(30); await sleep(1200);
  const T2 = texts();
  check('131 turns: Long, 1 star, no gold banner, "No hero fell.", and the best is still 55', /Long  ★☆☆$/.test(b.resultRating) && !T2.includes('SWIFT VICTORY') && T2.includes('No Hero Fell.') && T2.includes('Best: 55 turns'), T2.filter((t) => /Par|Best|fell/.test(t)).join(' | '));

  // ---------- a loss ----------
  b.resultButtons[b.resultButtons.length - 1].hit.emit('pointerdown');
  const tq = Date.now(); while (Date.now() - tq < 8000) { const s2 = game.scene.getScene('BattleScene'); if (s2.units && s2.units.every((x) => x.alive) && !s2.battleOver && s2.activeUnit && s2.slots) break; await sleep(30); }
  b = game.scene.getScene('BattleScene'); await sleep(400); b.endTurn = () => {}; b.runEnemyTurn = () => {};
  for (const h of b.units.filter((u) => u.side === 'hero')) { b.landHit(h, h.hp); b.defeat(h); }
  b.turnCount = 90; b.battleOver = true; b.showResult('defeat');
  const t2 = Date.now(); while (!b.resultButtons.length && Date.now() - t2 < 4000) await sleep(30); await sleep(1200);
  const T3 = texts();
  check('a loss: Defeat, no rating, the par is told, Try again', T3.includes('DEFEAT') && !T3.some((t) => /★/.test(t)) && T3.includes('Par for a win here: 75 turns') && b.resultButtons[b.resultButtons.length - 1].label.text === 'Try again' && b.result.rating === null);

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
