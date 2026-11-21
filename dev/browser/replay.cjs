// 1.76 (21 Nov): replaying a match brought the battle back WITHOUT its HTML HUD (Suleiman had to refresh the page).
//   node dev/browser/replay.cjs [phone|desktop|both]      (with the preview running)
// Plays to the result panel, presses Play again with a real tap, and checks the HUD is back and shows the menu.
const { openBattle } = require('./lib/play.cjs');
(async () => {
  let bad = 0;
  const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  [' + x + ']' : '')); if (!ok) bad++; };
  const views = !process.argv[2] || process.argv[2] === 'both' ? ['phone', 'desktop'] : [process.argv[2]];
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    const hud = () => page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene'), r = document.getElementById('fabien-hud');
      const rows = r ? [...r.querySelectorAll('.mrow')].filter((x) => x.getClientRects().length).length : -1;
      return { roots: document.querySelectorAll('#fabien-hud').length, has: !!b.domHud, rootOk: !!(b.domHud && b.domHud.root && b.domHud.root.isConnected), rows,
        strip: r ? r.querySelectorAll('.abs').length : 0, active: !!b.activeUnit, restarted: !!b.__oldUnits && b.units !== b.__oldUnits && b.units.some((u) => u.side === 'enemy' && u.hp > 0), over: b.battleOver, hp: b.units.map((u) => u.side[0] + u.hp).join(','), shown: !!r && getComputedStyle(r).visibility === 'visible', resultShown: !!b.resultShown, canvasMenuDrawn: b.menu.willRender(b.uiCam) || b.menu.willRender(b.cameras.main) };
    });
    try {
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 60000 });
      const before = await hud();
      check(view + ': the HUD is up in the first battle', before.rootOk && before.rows > 0 && before.shown, JSON.stringify(before));
      // end the battle the way a win does: the result panel, then a real press on "Play again"
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.units.filter((u) => u.side === 'enemy').forEach((u) => { u.hp = 0; u.alive = false; }); b.__oldUnits = b.units; b.showResult('win'); });
      await page.waitForTimeout(1500);
      // the last result button is "Play again" (or "Try again"): tap where it is drawn
      const pt = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        const v = b.resultButtons && b.resultButtons[b.resultButtons.length - 1];
        if (!v) return null;
        const c = b.game.canvas.getBoundingClientRect(), z = c.width / b.scale.width;
        return { x: c.left + v.x * z, y: c.top + v.y * z };
      });
      if (!pt) { check(view + ': the Play again button is on screen', false); await browser.close(); continue; }
      if (view === 'desktop') await page.mouse.click(pt.x, pt.y); else await page.touchscreen.tap(pt.x, pt.y);
      await page.waitForTimeout(3500);
      const after = await hud();
      check(view + ': the tap on Play again restarted the battle', after.restarted, JSON.stringify(after));
      check(view + ': after Play again there is one HUD overlay in the page', after.roots === 1, JSON.stringify(after));
      check(view + ': after Play again the scene\'s HUD is alive, connected and not hidden', after.rootOk && after.shown && !after.resultShown, JSON.stringify(after));
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 60000 }).catch(() => {});
      const later = await hud();
      check(view + ': the menu rows show again in the second battle', later.rows > 0 && later.shown && later.canvasMenuDrawn === false, JSON.stringify(later));
      check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' || '));
    } catch (e) { check(view + ': ran', false, String(e).slice(0, 200)); }
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED'); process.exit(bad ? 1 : 0);
})();
