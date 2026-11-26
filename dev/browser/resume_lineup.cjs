// 1.105 (Suleiman 23 Nov: "when you refresh and load a fight it starts you off at the very beginning playing as the default team").
// Plays a battle with a line-up that is NOT the default (Leol and the Thief swapped onto the other sides, the kings in), lets a turn
// go by, reloads the page and presses "Continue the battle": the same fighters on the same sides, the same turn.
//   node dev/browser/resume_lineup.cjs [phone|desktop]      (with the preview running)
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const view = process.argv[2] || 'phone';
  let bad = 0;
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };
  const lineUp = { hero: ['h1', 'h3', 'h5', 'e6'], enemy: ['e2', 'e3', 'e5', 'h6'], known: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'] };
  const { browser, page, errors } = await openBattle(view, { lineUp });
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && !b.busy; }, null, { timeout: 60000 });
  const who = () => page.evaluate(() => window.__game.scene.getScene('BattleScene').units.map((u) => u.id + ':' + u.side).sort().join(' '));
  const before = await page.evaluate(async () => {
    const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => b.endTurn();
    b.endTurn(); await new Promise((r) => setTimeout(r, 1500));
    while (b.busy) await new Promise((r) => setTimeout(r, 200));
    return b.turnCount;
  });
  const teamBefore = await who();
  check('the battle has the picked line-up', teamBefore.includes('e6:hero') && teamBefore.includes('h6:enemy') && teamBefore.includes('h5:hero'), teamBefore);
  // the reload: no skipping the title this time (the remembered line-up stays as it was)
  await page.addInitScript(() => { window.__skipSelect = undefined; });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => { const s = window.__game && window.__game.scene.getScene('StartScene'); return s && s.artReady && s.continueButton; }, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  const at = await page.evaluate(() => { const s = window.__game.scene.getScene('StartScene'); const c = s.cameras.main; const real = s.scale.displaySize.width / s.scale.width; const box = s.game.canvas.getBoundingClientRect(); const o = s.continueButton; return { x: box.x + ((o.x - c.worldView.x) * c.zoom) * real, y: box.y + ((o.y - c.worldView.y) * c.zoom) * real }; });
  if (view === 'phone') await page.touchscreen.tap(at.x, at.y); else await page.mouse.click(at.x, at.y);
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return window.__game.scene.isActive('BattleScene') && b.activeUnit; }, null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const teamAfter = await who();
  const after = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { turn: b.turnCount, resumed: !!b.resumed }; });
  check('Continue brings back the same fighters on the same sides', teamAfter === teamBefore, teamAfter);
  check('Continue resumes the same turn (not the very beginning)', after.resumed && after.turn === before, 'turn ' + before + ' then ' + after.turn + (after.resumed ? '' : ', NOT resumed'));
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(bad ? 'FAILED' : 'ALL PASSED');
  process.exit(bad ? 1 : 0);
})();
