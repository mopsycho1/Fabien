// Gaha's Lunge through REAL taps on a phone (roadmap 1.59): press Skills, Lunge, then the foe (twice), for a foe
// 2, 3 and 4 tiles away, and after it check what a player sees: the menu is back, its rows can be pressed, no page
// error, the words that floated up, and End turn passes the turn. Also once from a clash-free spot with Swift on.
//   node dev/browser/lunge_taps.cjs [phone|desktop]      (preview running on 4173)
const { openBattle } = require('./lib/play.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const view = process.argv[2] || 'phone', desktop = view === 'desktop';
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  const press = async (p) => { if (desktop) await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y); };
  const screenPoint = (gx, gy) => page.evaluate(([gx, gy]) => {
    const b = window.__game.scene.getScene('BattleScene'), c = b.game.canvas.getBoundingClientRect();
    return { x: c.left + gx * c.width / b.scale.width, y: c.top + gy * c.height / b.scale.height };
  }, [gx, gy]);
  const worldPoint = (wx, wy) => page.evaluate(([wx, wy]) => {
    const b = window.__game.scene.getScene('BattleScene'), cam = b.cameras.main, c = b.game.canvas.getBoundingClientRect();
    const gx = (wx - cam.worldView.x) * cam.zoom + cam.x, gy = (wy - cam.worldView.y) * cam.zoom + cam.y;
    return { x: c.left + gx * c.width / b.scale.width, y: c.top + gy * c.height / b.scale.height };
  }, [wx, wy]);
  const rows = () => page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    return b.menu.visible ? b.menuRows.filter((r) => r.view.visible).map((r) => ({ word: r.label.text.split('  ')[0], enabled: r.enabled, gx: b.menu.x + (r.x + r.w / 2) * b.menu.scaleX, gy: b.menu.y + (r.y + r.h / 2) * b.menu.scaleY })) : [];
  });
  const pressRow = async (word) => { const r = (await rows()).find((r) => r.word === word); if (!r) return false; await press(await screenPoint(r.gx, r.gy)); await sleep(600); return true; };
  const pressUnit = async (id) => {
    const p = await page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id); return { x: u.view.x, y: u.view.y - (u.centerY || 30) * 0.6 }; }, id);
    const q = await worldPoint(p.x, p.y);
    global.__lastPress = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return [Math.round(x), Math.round(y), e ? e.tagName + '#' + e.id + '.' + e.className : null]; }, [q.x, q.y]);
    await press(q); await sleep(500);
  };
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    window.__floats = [];
    const o = b.floatText.bind(b); b.floatText = (u, t, ...a) => { window.__floats.push(String(t)); return o(u, t, ...a); };
    b.runEnemyTurn = () => setTimeout(() => b.endTurn(), 50); // enemies pass, so we see only Gaha
    window.__calls = [];
    for (const fn of ['handleTap', 'inspect', 'cancelMode', 'boardDown', 'boardUp']) { const o = b[fn].bind(b); b[fn] = (...a) => { window.__calls.push(fn + '(' + a.filter((x) => typeof x !== 'object').join(',') + ')' + (fn === 'cancelMode' ? new Error().stack.split('\n')[2].trim().slice(0, 60) : '')); return o(...a); }; }
  });
  let bad = 0;
  const cases = [{ gap: 2 }, { gap: 3 }, { gap: 4 }, { gap: 3, swift: true }];
  for (const c of cases) {
    // wait for a calm moment, then set the board: Gaha at (2,7), the bull gap tiles east of him
    for (let i = 0; i < 60 && (await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.busy || b.inCinematic; })); i++) await sleep(200);
    await page.evaluate(async (c) => {
      const b = window.__game.scene.getScene('BattleScene');
      const U = (id) => b.units.find((u) => u.id === id);
      const spots = [[0, 0], [10, 0], [0, 2], [10, 2], [0, 4], [10, 4], [1, 1], [9, 1]]; let k = 0;
      const gaha = U('h2'), foe = U('e2') || U('e1');
      for (const u of b.units) {
        if (!u.alive) continue;
        u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; u.status.cooldowns = {};
        const p = u === gaha ? [2, 7] : u === foe ? [2 + c.gap, 7] : spots[k++]; b.placeUnit(u, p[0], p[1]);
      }
      if (c.swift && b.applyVerseTest) b.applyVerseTest(gaha, 'swift');
      b.cancelMode(); b.activeUnit = gaha; b.refreshButtons(); b.showStanding(gaha); b.showStanding(foe);
      b.followUnit(gaha, 0, true); // the camera looks at Gaha (it was still on the last case)
      window.__foe = foe.id; window.__floats = [];
    }, c);
    await sleep(500);
    const r0 = (await rows()).map((r) => r.word);
    const okSkills = await pressRow('Skills');
    const okLunge = await pressRow('Lunge');
    const mode = await page.evaluate(() => window.__game.scene.getScene('BattleScene').mode);
    const foeId = await page.evaluate(() => window.__foe);
    const look = () => page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const c = b.cameras.main; return { mode: b.mode, pending: b.pendingTarget && b.pendingTarget.id, cam: [Math.round(c.scrollX), Math.round(c.scrollY), +c.zoom.toFixed(2)] }; });
    const look0 = await look(); await page.evaluate(() => { window.__calls = []; });
    await pressUnit(foeId);
    const look1 = { ...(await look()), calls: await page.evaluate(() => window.__calls), at: global.__lastPress };
    await pressUnit(foeId);
    const look2 = await look();
    for (let i = 0; i < 60 && (await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.busy || b.inCinematic; })); i++) await sleep(200);
    await sleep(800);
    const after = await rows();
    const st = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'h2'); return { acted: g.hasActed, tile: g.col + ',' + g.row, active: b.activeUnit && b.activeUnit.id, mode: b.mode, menu: b.menu.visible, menuAlpha: b.menu.alpha, uiHidden: !!b.uiHidden, floats: window.__floats.slice(0, 6) }; });
    const enabled = after.filter((r) => r.enabled).map((r) => r.word);
    const turn0 = await page.evaluate(() => window.__game.scene.getScene('BattleScene').turnCount);
    const ended = await pressRow('End turn');
    await sleep(1500);
    const passed = await page.evaluate((t) => window.__game.scene.getScene('BattleScene').turnCount !== t, turn0);
    const ok = okSkills && okLunge && st.acted && st.menu && enabled.length > 0 && ended && passed;
    if (!ok) bad++;
    console.log((ok ? "PASS " : "FAIL ") + JSON.stringify({ ...c, okSkills, okLunge, look0, look1, look2, modeAfterLunge: mode, before: r0, ...st, enabled, ended, passed }));
  }
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
  console.log(bad || errors.length ? 'FAILED' : 'ALL PASSED');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
