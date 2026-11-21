// Roadmap 10.48 (Suleiman 21 Nov): Gale Cut does a bit more base damage (a full blow, it was 0.8) and the movement
// Alagara has left when he cuts adds damage, like Gaha's Lunge (+1 a step). It still works in every form (10.34).
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n103.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, C = w.__combat;
  const U = (id) => b.units.find((u) => u.id === id);
  const a = U('h5'), tayo = U('e1'), bull = U('e2');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = (used) => {
    let i = 0;
    for (const u of b.units) {
      if (u === a) continue;
      u.engagedWith = null; u.alive = true; u.hp = u.maxHp; u.status = fresh(); u.shield = null; u.fury = 0;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    a.status = fresh(); a.attune = { echo: null, swapped: false }; a.engagedWith = null; a.hp = a.maxHp;
    a.hasActed = false; a.hasMoved = used > 0; a.stepsUsed = used;
    b.placeUnit(a, 2, 5); b.placeUnit(tayo, 3, 5); b.placeUnit(bull, 4, 5);
    b.activeUnit = a; b.busy = false; b.cancelMode();
  };
  const sure = (fn) => { const real = w.Math.random; let n = 0; w.Math.random = () => (n < 8 ? 0.02 + (n++ * 0.004) : real()); try { return fn(); } finally { w.Math.random = real; } };
  const cut = async () => {
    const want = [tayo, bull].map((f) => Math.max(1, Math.round(C.getDamage(a, f))));
    const before = [tayo.hp, bull.hp];
    let done = false; sure(() => b.castKingSkill(a, tayo, 'galeCut', () => { done = true; }));
    const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30);
    return { got: [before[0] - tayo.hp, before[1] - bull.hp], plain: want };
  };

  // 1. Full move left (4 steps): a full blow +4 on each foe
  park(0);
  check('his Move is 4, none used', b.stepsLeft(a) === 4, b.stepsLeft(a));
  check('the bonus is +4', b.galeBonus(a) === 4, b.galeBonus(a));
  b.selectedSpell = 'galeCut'; b.mode = 'spellTarget'; b.pendingTarget = tayo;
  const hint = (b.hintFor ? b.hintFor(a) : '') || '';
  let r = await cut();
  check('each foe takes a full blow +4', r.got[0] === r.plain[0] + 4 && r.got[1] === r.plain[1] + 4, r.got.join(',') + ' vs plain ' + r.plain.join(','));
  check('more than the old 0.8 share with no bonus', r.got[0] > Math.round(r.plain[0] * 0.8), r.got[0] + ' > ' + Math.round(r.plain[0] * 0.8));

  // 2. He walked 1 first: +3
  park(1);
  check('1 step used: the bonus is +3', b.galeBonus(a) === 3, b.galeBonus(a));
  r = await cut();
  check('each foe takes a full blow +3', r.got[0] === r.plain[0] + 3 && r.got[1] === r.plain[1] + 3, r.got.join(',') + ' vs plain ' + r.plain.join(','));

  // 3. Every form still cuts, with the bonus (Fury adds attack, so compare with its own plain blow)
  for (const verse of ['swiftness', 'fury', 'stone']) {
    park(0); St.applyBuff(a, verse);
    check(verse + ': Gale Cut can be used', b.kingBlock(a, 'galeCut') === null, b.kingBlock(a, 'galeCut'));
    const extra = b.stepsLeft(a); // Swiftness gives him more Move, so more steps left
    r = await cut();
    check(verse + ': full blow +' + extra + ' (his steps left) on each', r.got[0] === r.plain[0] + extra && r.got[1] === r.plain[1] + extra, r.got.join(',') + ' vs plain ' + r.plain.join(','));
  }

  // 4. The hint names the bonus while aiming
  park(1);
  b.selectedSpell = 'galeCut'; b.mode = 'spellTarget'; b.pendingTarget = tayo;
  b.refreshStatus && b.refreshStatus();
  const texts = b.children.list.filter((o) => o.type === 'Text').map((o) => o.text).join(' | ');
  check('the hint says "+3 for steps left"', /\+3 for steps left/.test(texts), (texts.match(/Gale Cut[^|]*/) || [''])[0].slice(0, 120));

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
