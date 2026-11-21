// Roadmap 10.34 (Suleiman 20 Nov): Alagara's Gale Cut works in every form (bare, Swiftness, Fury, Stone), not only
// under Swiftness. A slash across a distance: he dashes along a line, cuts every foe on it, and the Gale Cut GIF of
// his form (Fury's flame cut, Swiftness's wind cut, else the gold cut) lies on every tile of the path.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n90.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const a = U('h5');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const tayo = U('e1'), bull = U('e2');
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u === a) continue;
      u.engagedWith = null; u.alive = true; u.hp = u.maxHp; u.status = fresh();
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    a.status = fresh(); a.attune = { echo: null, swapped: false }; a.engagedWith = null; a.hp = a.maxHp;
    a.hasActed = false; a.hasMoved = false; a.stepsUsed = 0;
    b.placeUnit(a, 3, 5);
    b.activeUnit = a; b.busy = false; b.cancelMode();
  };
  const sure = (fn) => { const real = w.Math.random; let n = 0; w.Math.random = () => (n < 8 ? 0.02 + (n++ * 0.004) : real()); try { return fn(); } finally { w.Math.random = real; } };
  // every effect picture made, by name
  const made = []; const realImage = b.add.image.bind(b.add), realSprite = b.add.sprite.bind(b.add);
  b.add.image = (x, y, key, ...r) => { made.push({ key: String(key), x, y }); return realImage(x, y, key, ...r); };
  b.add.sprite = (x, y, key, ...r) => { made.push({ key: String(key), x, y }); return realSprite(x, y, key, ...r); };
  const forms = [[null, 'sfx_gale_'], ['swiftness', 'sfx_gale_swift_'], ['fury', 'sfx_gale_fury_'], ['stone', 'sfx_gale_']];
  for (const [verse, gif] of forms) {
    const name = verse || 'no Verse';
    park();
    if (verse) St.applyBuff(a, verse);
    check(name + ': Gale Cut can be used', b.kingBlock(a, 'galeCut') === null, b.kingBlock(a, 'galeCut'));
    // the skills list offers it
    b.stanceMenu = 'main'; b.mode = 'idle';
    b.placeUnit(tayo, 5, 5); b.placeUnit(bull, 6, 5);
    const plan = b.galePlan(a, tayo);
    check(name + ': the line holds both foes, he lands past them', plan.hits.includes(tayo) && plan.hits.includes(bull) && plan.land && plan.land.col > 6, JSON.stringify(plan.land) + ' over ' + plan.tiles.length + ' tiles');
    check(name + ': both are targets', b.kingTargets(a, 'galeCut').includes(tayo));
    const t0 = tayo.hp, b0 = bull.hp;
    made.length = 0;
    St.startCooldown(a, 'galeCut'); a.hasActed = true;
    let done = false; sure(() => b.castKingSkill(a, tayo, 'galeCut', () => { done = true; }));
    await sleep(60); const pose = a.sprite.texture.key;
    const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30);
    check(name + ': both are cut', tayo.hp < t0 && bull.hp < b0, (t0 - tayo.hp) + ', ' + (b0 - bull.hp));
    check(name + ': he stands where the dash ended', a.col === plan.land.col && a.row === plan.land.row);
    // the slashes: one per tile of the path, in his form's colours, spread from start to end
    const cuts = made.filter((m) => m.key.includes(gif + '0') || (m.key.startsWith('fx:' + gif) && /_0$/.test(m.key)));
    const firstFrames = made.filter((m) => m.key === 'fx:' + gif + '0');
    check(name + ': the ' + gif.replace('sfx_', '').replace(/_$/, '') + ' GIF on every tile of the path (' + plan.tiles.length + ')', firstFrames.length === plan.tiles.length, firstFrames.length);
    const xs = firstFrames.map((m) => m.x);
    check(name + ': ...spread along the whole path', xs.length > 1 && Math.max(...xs) - Math.min(...xs) > 100, Math.round(Math.max(...xs) - Math.min(...xs)) + ' px');
    const want = verse === 'fury' ? 'gale_fury' : (verse === 'swiftness' || verse === 'stone') ? 'gale_swift' : 'alagara_gale_f'; // Stone wears his Swift design (6.83)
    check(name + ': his form\'s Gale Cut picture during the dash', pose.includes(want), pose);
    await sleep(300);
  }
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
