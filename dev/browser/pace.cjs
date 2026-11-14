// How long the enemies take (Battle 1.0 checklist G5, roadmap 18.11). In a real browser the
// heroes pass every turn and the four enemies play 4 rounds; the script times each enemy
// turn and adds up each round, at Normal and at Fast enemy speed.
// G5: a full enemy round takes under 8 seconds at Fast speed.
//   node dev/browser/pace.cjs [phone|desktop]      (with the preview running)
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const view = process.argv[2] || 'phone'; const rows = {};
  for (const pace of ['normal', 'fast']) {
    const { browser, page, errors } = await openBattle(view);
    const out = await page.evaluate(async (pace) => {
      const b = window.__game.scene.getScene('BattleScene'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      b.setEnemyFast(pace === 'fast');
      const foes = b.units.filter((u) => u.side !== 'hero').length;
      const turns = []; let cur = null; const t0 = performance.now();
      while (turns.length < foes * 4 && !b.battleOver && performance.now() - t0 < 150000) {
        const u = b.activeUnit;
        if (cur && cur.unit !== u) { cur.ms = performance.now() - cur.at; turns.push(cur); cur = null; }
        if (u.side === 'hero') { if (!b.busy && !b.inCinematic) { if (u.engagedWith) b.onStance ? b.onStance('guard') : b.onPressButton(); else b.endTurn(); } }
        else if (!cur) cur = { unit: u, name: u.name, at: performance.now() };
        await sleep(15);
      }
      const rounds = [];
      for (let i = 0; i + foes <= turns.length; i += foes) rounds.push(turns.slice(i, i + foes).reduce((a, t) => a + t.ms, 0) / 1000);
      return { rounds, slowest: turns.slice().sort((a, c) => c.ms - a.ms).slice(0, 2).map((t) => t.name + ' ' + (t.ms / 1000).toFixed(1) + ' s'), foes };
    }, pace);
    rows[pace] = out;
    console.log(pace + ': enemy rounds of ' + out.foes + ' took ' + out.rounds.map((r) => r.toFixed(1)).join(', ') + ' s | longest turns: ' + out.slowest.join(', ') + (errors.length ? ' | page errors: ' + errors[0] : ''));
    await browser.close();
  }
  const worst = Math.max(...rows.fast.rounds);
  const ok = rows.fast.rounds.length >= 3 && worst < 8;
  console.log((ok ? 'PASS' : 'FAIL') + ' G5: the longest Fast round took ' + worst.toFixed(1) + ' s (under 8 wanted); Normal: ' + Math.max(...rows.normal.rounds).toFixed(1) + ' s');
  console.log(ok ? 'ALL PASSED' : 'FAILED');
  process.exit(ok ? 0 : 1);
})();
