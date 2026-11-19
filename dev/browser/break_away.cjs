// Break Away in a clash through the real menu (roadmap 1.67, Baiyee 19 Nov: "he takes damage and is still stuck").
// Gaha is locked with the Bull Commander; on his turn the test presses "Break away" as a player would, many times,
// and reports for each try: freed or not, health lost, what the screen said, and whether the odds were shown first.
// PASS needs: the odds on the row ("Break away  45%"); freed = moved off his tile; failed = "Break Away failed:
// still locked" on screen and no health lost (a failed try costs momentum, not a hit).
//   node dev/browser/break_away.cjs [phone|desktop] [tries]      (preview running on 4173)
const { openBattle } = require('./lib/play.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const view = process.argv[2] || 'phone', tries = +(process.argv[3] || 8), desktop = view === 'desktop';
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  const press = async (p) => { if (desktop) await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y); };
  const rows = () => page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene'), c = b.game.canvas.getBoundingClientRect();
    if (!b.menu.visible) return [];
    return b.menuRows.filter((r) => r.view.visible).map((r) => { const gx = b.menu.x + (r.x + r.w / 2) * b.menu.scaleX, gy = b.menu.y + (r.y + r.h / 2) * b.menu.scaleY; return { word: r.label.text, enabled: r.enabled, x: c.left + gx * c.width / b.scale.width, y: c.top + gy * c.height / b.scale.height }; });
  });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => setTimeout(() => b.endTurn(), 50);
    window.__said = [];
    const fb = b.banner.bind(b); b.banner = (x, y, t, c, sub) => { window.__said.push(t + (sub ? ' (' + sub + ')' : '')); return fb(x, y, t, c, sub); };
    const ft = b.floatText.bind(b); b.floatText = (u, t, ...a) => { window.__said.push(u.name + ': ' + t); return ft(u, t, ...a); };
  });
  let freed = 0, bad = 0;
  for (let k = 0; k < tries; k++) {
    for (let i = 0; i < 80 && (await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.busy || b.inCinematic; })); i++) await sleep(150);
    const started = await page.evaluate(async () => {
      const b = window.__game.scene.getScene('BattleScene');
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const U = (id) => b.units.find((u) => u.id === id);
      const gaha = U('h2'), bull = U('e2');
      const spots = [[0, 0], [10, 0], [0, 10], [10, 10], [0, 1], [10, 1]]; let k = 0;
      for (const u of b.units) { if (!u.alive) continue; u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.status.cooldowns = {}; u.status.offBalance = false; const p = u === gaha ? [5, 6] : u === bull ? [5, 5] : spots[k++]; b.placeUnit(u, p[0], p[1]); }
      // the bull starts the clash, as in a battle (its opening beat plays)
      b.activeUnit = bull; b.busy = true;
      await new Promise((res) => b.performEngage(bull, gaha, () => { b.busy = false; res(); }));
      while (b.busy || b.inCinematic) await sleep(100);
      if (!gaha.engagedWith) return false;
      gaha.hp = gaha.maxHp; gaha.hasActed = false;
      b.cancelMode(); b.activeUnit = gaha; b.stanceMenu = 'main'; b.refreshEngagementMarks(); b.refreshButtons(); b.refreshStatus(); b.followUnit(gaha, 0, true);
      window.__said = [];
      return true;
    });
    if (!started) { console.log('(the opening beat ended the clash: try again)'); continue; }
    await sleep(400);
    const before = await rows();
    const hint = await page.evaluate(() => window.__game.scene.getScene('BattleScene').statusText.text);
    const brk = before.find((r) => /^Break/.test(r.word));
    const hp0 = await page.evaluate(() => window.__game.scene.getScene('BattleScene').units.find((u) => u.id === 'h2').hp);
    if (!brk) { console.log('FAIL no Break away row: ' + before.map((r) => r.word).join(' / ')); bad++; continue; }
    await press(brk);
    for (let i = 0; i < 80 && (await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.busy || b.inCinematic; })); i++) await sleep(100);
    await sleep(600);
    const r = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'h2'); return { locked: !!g.engagedWith, hp: g.hp, tile: g.col + ',' + g.row, said: window.__said.slice() }; });
    if (!r.locked) freed++;
    const saidFailed = r.said.some((t) => /Break Away failed: still locked/.test(t));
    const oddsShown = /\d+%/.test(brk.word);
    const ok = oddsShown && (r.locked ? saidFailed && hp0 - r.hp === 0 : r.tile !== '5,6');
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify({ try: k + 1, row: brk.word, hint, freed: !r.locked, hpLost: hp0 - r.hp, tile: r.tile, said: r.said }));
  }
  console.log('freed ' + freed + ' of ' + tries);
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 2).join(' | ') : 'no page errors');
  console.log(bad || errors.length ? 'FAILED' : 'ALL PASSED');
  await browser.close();
})();
