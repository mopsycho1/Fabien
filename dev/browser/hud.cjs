// 18.44 (20 Nov): the battle HUD in HTML over the canvas, checked in a real browser.
//   node dev/browser/hud.cjs <out dir> [phone|desktop|both]      (with the preview running)
// Checks, on each screen:
//   - the overlay lies exactly over the canvas, and its words are real HTML (sharp at any size)
//   - the old canvas HUD is no longer drawn (its menu is filmed by no camera)
//   - a clash: the HUD steps aside while the clash banner plays, then his clash meter (HTML) stands
//     between the two locked fighters and follows the camera
//   - desktop: a mouse resting on a row shows its tooltip, in HTML, beside the menu
//   - no page errors
// Photographs: <out>/hud_<view>_clash.png
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    try {
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 60000 });
      const a = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        const root = document.getElementById('fabien-hud'), c = b.game.canvas.getBoundingClientRect(), r = root.getBoundingClientRect();
        const rows = [...root.querySelectorAll('.mrow')].filter((x) => x.getClientRects().length);
        return { off: Math.max(Math.abs(c.left - r.left), Math.abs(c.top - r.top), Math.abs(c.width - r.width), Math.abs(c.height - r.height)),
          rows: rows.map((x) => x.textContent.trim()).join('|'), labels: b.menuRows.map((x) => x.word.text).join('|'),
          canvasMenuDrawn: b.menu.willRender(b.uiCam) || b.menu.willRender(b.cameras.main) };
      });
      check(view + ': the overlay lies exactly over the canvas', a.off < 1.5, a.off.toFixed(2) + ' px');
      check(view + ': the menu rows are HTML, with the same words as the game\'s menu', a.rows.length > 0 && a.rows.replace(/\d+/g, '').split('|').every((w, i) => w.trim() === a.labels.split('|')[i].replace(/\d+/g, '').trim()), a.rows + ' / ' + a.labels);
      check(view + ': the canvas menu is no longer drawn', a.canvasMenuDrawn === false);
      if (view === 'desktop') {
        // a mouse resting on a menu row: its tooltip, in HTML, beside the menu (never over it)
        const row = await page.evaluate(() => { const r = [...document.querySelectorAll('#fabien-hud .mrow')].find((x) => x.getClientRects().length && !x.classList.contains('off')); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
        await page.mouse.move(row.x, row.y); await sleep(900);
        const tip = await page.evaluate(() => {
          const t = document.querySelector('#fabien-hud .tipp');
          if (!t || !t.getClientRects().length) return null;
          const a = t.getBoundingClientRect();
          const over = [...document.querySelectorAll('#fabien-hud .menu')].filter((m) => m.getClientRects().length).some((m) => { const b = m.getBoundingClientRect(); return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; });
          return { text: t.textContent.slice(0, 40), over };
        });
        check(view + ': a mouse resting on a row shows its tooltip in HTML, not over the menu', tip && !tip.over && tip.text.length > 3, JSON.stringify(tip));
        await page.mouse.move(5, 450); await sleep(300);
      }
      // a clash: the hero next to a foe, Engage, and the banner plays. A clash can end in its first exchange,
      // or the hero may be one who cannot engage: then two fighters are locked by hand (as startEngagement does)
      // for the meter's check.
      let locked = null;
      for (let attempt = 0; attempt < 1 && !locked; attempt++) {
        await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && !b.inCinematic && b.menu.visible; }, null, { timeout: 60000 });
        await page.evaluate((first) => {
          const b = window.__game.scene.getScene('BattleScene');
          b.runEnemyTurn = () => setTimeout(() => b.endTurn(), 50);
          const u = b.activeUnit;
          const foe = b.units.find((f) => f.alive && f.side === 'enemy');
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c = u.col + dc, r = u.row + dr;
            if (c >= 0 && r >= 0 && c < 11 && r < 11 && !b.getUnitAt(c, r)) { b.placeUnit(foe, c, r); break; }
          }
          b.cancelMode(); b.onEngageButton(); b.handleTap(foe.col, foe.row); b.handleTap(foe.col, foe.row);
          if (first) {
            window.__hudHidden = false;
            const t = setInterval(() => { if (b.inCinematic && document.getElementById('fabien-hud').style.visibility === 'hidden') window.__hudHidden = true; }, 30);
            setTimeout(() => clearInterval(t), 45000);
          }
        }, attempt === 0);
        await sleep(600);
        for (let i = 0; i < 100; i++) {
          await sleep(200);
          const st = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.alive && x.engagedWith); return { locked: u && !b.inCinematic && !b.busy ? u.id : null, calm: !b.inCinematic && !b.busy }; });
          locked = st.locked;
          if (locked || st.calm) break;
        }
        if (!locked && process.env.HUD_DEBUG) console.log('  try ' + (attempt + 1) + ': ' + await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return JSON.stringify({ turn: b.activeUnit && b.activeUnit.id, mode: b.mode, eng: b.units.filter((x) => x.engagedWith).map((x) => x.id), msg: b.statusText.text, hp: b.units.map((u) => u.id + ':' + u.hp).join(' ') }); }));
      }
      if (!locked) {
        locked = await page.evaluate(() => {
          const b = window.__game.scene.getScene('BattleScene');
          const u = b.units.find((x) => x.alive && x.side === 'hero'), foe = b.units.find((f) => f.alive && f.side === 'enemy');
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c = u.col + dc, r = u.row + dr;
            if (c >= 0 && r >= 0 && c < 11 && r < 11 && !b.getUnitAt(c, r)) { b.placeUnit(foe, c, r); break; }
          }
          u.engagedWith = foe; foe.engagedWith = u; b.refreshEngagementMarks();
          return u.id + ' (locked by hand)';
        });
      }
      const hidden = await page.evaluate(() => window.__hudHidden);
      check(view + ': the HUD steps aside while the clash banner plays', hidden === true);
      check(view + ': the two fighters are locked after the banner', !!locked, String(locked));
      if (locked) {
        await sleep(1500); // (the camera may still be turning to the next unit)
        const m = await page.evaluate(() => {
          const b = window.__game.scene.getScene('BattleScene');
          const u = b.units.find((x) => x.alive && x.engagedWith), v = u.engagedWith, cam = b.cameras.main, c = b.game.canvas.getBoundingClientRect();
          const k = c.width / b.scale.width;
          const mx = (u.view.x + v.view.x) / 2, my = Math.min(u.view.y - u.topY, v.view.y - v.topY) - 50;
          const want = { x: c.left + ((mx - cam.worldView.x) * cam.zoom + cam.x) * k, y: c.top + ((my - cam.worldView.y) * cam.zoom + cam.y) * k };
          const el = document.querySelector('#fabien-hud .clash');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const skull = el.querySelector('img[src*="clash_skull"]');
          return { dx: Math.abs(r.left - want.x), dy: Math.abs(r.top - want.y), skull: skull ? Math.round(skull.getBoundingClientRect().height) : 0, canvasDrawn: b.engageMarks.some((o) => o.type === 'Container' && (o.willRender(cam) || o.willRender(b.uiCam))) };
        });
        await page.screenshot({ path: out + '/hud_' + view + '_clash.png' });
        check(view + ': his clash meter (HTML) stands between the locked fighters', m && m.dx < 2 && m.dy < 2 && m.skull > 10, JSON.stringify(m));
        check(view + ': and the canvas meter is not drawn under it', m && m.canvasDrawn === false);
      }
      check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    } catch (e) {
      check(view + ': test crashed: ' + e.message.split('\n')[0], false);
    } finally { await browser.close(); }
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
