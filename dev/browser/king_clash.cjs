// 10.39 (21 Nov): every way a king gets locked in a clash opens with the two clash banners, not only Engage.
//   node dev/browser/king_clash.cjs [phone|desktop]      (with the preview running)
// Engage in both directions (Gaha on Gadara, Gadara on Gaha, Alagara on Tayo, Tayo on Alagara) and Alagara's Drawn Blade
// (which used to lock the clash with only the words "Locked in!").
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const view = process.argv[2] || 'phone';
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  let bad = 0;
  const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  [' + x + ']' : '')); if (!ok) bad++; };
  const res = await page.evaluate(async () => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {}; b.endTurn = () => {};
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1500);
    const seen = [];
    const o = b.bannerClash.bind(b); b.bannerClash = (h, e, ha, fa, done) => { seen.push(ha.key + ' + ' + fa.key); return o(h, e, ha, fa, done); };
    const plain = []; const c = b.cutIn.bind(b); b.cutIn = (u, t, d) => { plain.push(t); return c(u, t, d); };
    const out = {};
    const stage = (aid, tid) => {
      for (const u of b.units) { u.engagedWith = null; u.alive = true; u.hp = u.maxHp; u.hasActed = false; }
      const a = b.units.find((u) => u.id === aid), t = b.units.find((u) => u.id === tid);
      b.placeUnit(a, 5, 5); b.placeUnit(t, 6, 5); b.busy = false; b.battleOver = false; b.inCinematic = false; b.activeUnit = a;
      seen.length = 0; plain.length = 0;
      return [a, t];
    };
    for (const [aid, tid] of [['h2', 'e5'], ['e5', 'h2'], ['h5', 'e1'], ['e1', 'h5']]) {
      const [a, t] = stage(aid, tid);
      b.performEngage(a, t, () => {});
      await sleep(900);
      out['engage ' + aid + '>' + tid] = { banners: seen.slice(), plain: plain.slice() };
    }
    // Alagara's Drawn Blade: try until a blow lands and locks (a miss locks nothing)
    let locked = false, tries = 0, done = false;
    while (!locked && tries < 25) {
      tries++;
      const [a, t] = stage('h5', 'e1');
      done = false;
      b.castKingSkill(a, t, 'drawnBlade', () => { done = true; });
      for (let i = 0; i < 60 && !done; i++) { await sleep(100); }
      locked = a.engagedWith === t && seen.length > 0;
      if (a.engagedWith === t) break;
      await sleep(300);
    }
    out.drawn = { banners: seen.slice(), lockedNow: !!b.units.find((u) => u.id === 'h5').engagedWith, tries, finished: done };
    return out;
  });
  for (const [k, v] of Object.entries(res)) {
    if (k === 'drawn') check('Drawn Blade that locks a clash opens with the two banners, then the turn goes on', v.lockedNow && v.banners.length === 1 && /h5:clash\/.*e1:clash\//.test(v.banners[0]) && v.finished, JSON.stringify(v));
    else check(k + ' opens with the two banners', v.banners.length === 1 && v.plain.length === 0, JSON.stringify(v));
  }
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' || '));
  await browser.close();
  console.log(bad ? 'FAILED' : 'ALL PASSED'); process.exit(bad ? 1 : 0);
})();
