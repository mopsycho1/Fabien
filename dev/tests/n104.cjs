// Roadmap 10.49 (Suleiman 21 Nov): Drawn Slash (Alagara's Drawn Blade) can free an ally from a clash. A hit on a foe
// locked with one of his allies ends that clash: the ally is free and the foe is locked with Alagara instead.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n104.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const E = w.__engagement;
  const U = (id) => b.units.find((u) => u.id === id);
  const a = U('h5'), sudeen = U('h1'), tayo = U('e1');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u.engagedWith) E.endDuel(u);
      if (u === a) continue;
      u.alive = true; u.hp = u.maxHp; u.status = fresh(); u.shield = null;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    a.status = fresh(); a.attune = { echo: null, swapped: false }; a.hp = a.maxHp;
    a.hasActed = false; a.hasMoved = false; a.stepsUsed = 0;
    b.placeUnit(a, 4, 5); b.placeUnit(tayo, 5, 5); b.placeUnit(sudeen, 6, 5);
    E.startDuel(sudeen, tayo);
    b.activeUnit = a; b.busy = false; b.cancelMode();
  };
  const said = []; const realFloat = b.floatText.bind(b);
  b.floatText = (u, text, ...r) => { said.push((u && u.id) + ':' + text); return realFloat(u, text, ...r); };
  const draw = async (roll) => {
    const real = w.Math.random; let n = 0; w.Math.random = () => (n++ < 6 ? roll : real());
    let done = false;
    try { b.castKingSkill(a, tayo, 'drawnBlade', () => { done = true; }); } finally { w.Math.random = real; }
    const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30);
    return done;
  };

  // 1. A hit frees Sudeen and locks Tayo with Alagara
  park();
  check('Sudeen and Tayo are in a clash', sudeen.engagedWith === tayo && tayo.engagedWith === sudeen);
  check('Tayo is a Drawn Blade target', b.kingTargets(a, 'drawnBlade').includes(tayo));
  said.length = 0;
  const hp0 = tayo.hp;
  check('the draw finishes', await draw(0.02));
  check('Tayo is cut', tayo.hp < hp0, hp0 + ' -> ' + tayo.hp);
  check('Sudeen is free', sudeen.engagedWith === null && !sudeen.engagement);
  check('Tayo is locked with Alagara now', tayo.engagedWith === a && a.engagedWith === tayo);
  check('"Free!" shows over Sudeen', said.includes('h1:Free!'), said.join(' | '));

  // 2. A miss changes nothing
  park();
  await draw(0.99);
  check('a miss: Sudeen is still in the clash', sudeen.engagedWith === tayo && !a.engagedWith);

  // 3. A foe clashing with nobody is locked as before; Alagara already in a clash cannot take over
  park(); E.endDuel(tayo);
  await draw(0.02);
  check('a free foe: locked with Alagara as before', tayo.engagedWith === a);
  park();
  const bull = U('e2'); b.placeUnit(bull, 4, 4); E.startDuel(a, bull);
  await draw(0.02);
  check('Alagara busy in his own clash: Sudeen stays locked', sudeen.engagedWith === tayo && a.engagedWith === bull);

  // 4. The AI does it: the rescue comes before a plain attack
  park();
  let fin = false; let aimed = null;
  const realCast = b.aiCast.bind(b); b.aiCast = (u, t, id, f) => { aimed = id + '@' + t.id; return realCast(u, t, id, f); };
  const acted = b.kingAiAct(a, () => { fin = true; });
  const t0 = Date.now(); while (acted && !fin && Date.now() - t0 < 9000) await sleep(30);
  check('the AI uses Drawn Blade on Tayo to free Sudeen', aimed === 'drawnBlade@e1', aimed);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
