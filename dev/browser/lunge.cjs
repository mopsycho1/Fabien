// Gaha's Lunge on a phone (390 x 844), roadmap 13.59: Lunge a foe 2, 3 and 4 tiles away through the real buttons, then
// check the game is not left waiting (busy, a cinematic, a clash mark) and that the turn can end and the next unit acts.
//   node dev/browser/lunge.cjs      (preview running on 4173)
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const { browser, page, errors } = await openBattle('phone', { everyone: true });
  await page.waitForTimeout(1200);
  let bad = 0;
  for (const gap of [2, 3, 4]) {
    const r = await page.evaluate(async (gap) => {
      const b = window.__game.scene.getScene('BattleScene');
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const U = (id) => b.units.find((u) => u.id === id);
      const spots = [[0, 0], [8, 0], [0, 2], [8, 2], [0, 4], [8, 4], [1, 1], [7, 1]]; let k = 0;
      const gaha = U('h2'), foe = U('e1');
      for (const u of b.units) {
        if (!u.alive) continue;
        u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; u.status.cooldowns = {};
        const p = u === gaha ? [2, 7] : u === foe ? [2 + gap, 7] : spots[k++]; b.placeUnit(u, p[0], p[1]);
      }
      b.busy = false; b.cancelMode(); b.activeUnit = gaha; b.refreshButtons && b.refreshButtons(); b.showStanding(gaha); b.showStanding(foe);
      gaha.accuracy = 999;
      const turn0 = b.turnCount, t0 = performance.now();
      b.onSpellButton(); b.chooseSpell('lunge'); b.handleTap(foe.col, foe.row); await sleep(60); b.handleTap(foe.col, foe.row);
      let waited = 0;
      while ((b.busy || b.inCinematic) && waited < 9000) { await sleep(50); waited += 50; }
      const out = { gap, stuckBusy: !!b.busy, stuckCine: !!b.inCinematic, ms: Math.round(performance.now() - t0), foeHp: foe.hp + '/' + foe.maxHp, gahaTile: gaha.col + ',' + gaha.row, clash: !!gaha.engagedWith, mode: b.mode };
      // now end the turn the way the End button does, and see the next unit get the turn
      b.endTurn(); await sleep(2500);
      out.turnPassed = b.turnCount !== turn0 || b.activeUnit !== gaha;
      out.next = b.activeUnit && b.activeUnit.id;
      return out;
    }, gap);
    const ok = !r.stuckBusy && !r.stuckCine && r.turnPassed;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r));
  }
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
  console.log(bad || errors.length ? 'FAILED' : 'ALL PASSED');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
