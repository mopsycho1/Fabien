// 10.38 (20 Nov): the mask for a PLAYER-controlled Gadara, in a real browser. Gadara fights on the heroes' side; the test player
// chooses Skills, Singularity and confirms with real taps; the check follows the picture he shows through the charge-up.
//   node dev/browser/mask_player.cjs <out dir> [phone|desktop|both]      (with the preview running)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view, { everyone: true, sides: { e5: 'hero' } });
    try {
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.units && b.activeUnit && !b.busy; }, null, { timeout: 60000 });
      await sleep(600);
      // wait for Gadara's own turn (the other heroes just end theirs; the enemies play themselves), then give him a full gauge
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'e5'); g.ct = 100; });
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); if (b.activeUnit && b.activeUnit.id !== 'e5' && b.activeUnit.side === 'hero' && !b.busy) b.endTurn(); return b.activeUnit && b.activeUnit.id === 'e5' && !b.busy; }, null, { timeout: 120000, polling: 200 });
      await sleep(500);
      const st = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'e5');
        g.mask = 6; g.channel = null; g.singularityUsed = false; b.refreshButtons(); b.refreshTurnStrip && b.refreshTurnStrip();
        return { side: g.side, tex: g.sprite.texture.key };
      });
      check(view + ': Gadara is on the heroes\' side and standing', st.side === 'hero', st.tex);
      const click = async (text) => { // a real tap on an HTML menu row
        const box = await page.evaluate((text) => { const r = [...document.querySelectorAll('#fabien-hud .mrow')].find((x) => x.getClientRects().length && x.textContent.trim().toLowerCase().startsWith(text.toLowerCase())); if (!r) return null; const c = r.getBoundingClientRect(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 }; }, text);
        if (!box) return false;
        if (view === 'desktop') await page.mouse.click(box.x, box.y); else await page.touchscreen.tap(box.x, box.y);
        await sleep(450); return true;
      };
      check(view + ': the Skills row is tapped', await click('Skills'));
      if (process.env.DEBUG) console.log('rows after Skills:', await page.evaluate(() => [...document.querySelectorAll('#fabien-hud .mrow')].map((x) => (x.getClientRects().length ? '' : '(hidden) ') + x.textContent.trim()).join('|')), await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.mode + ' busy=' + b.busy + ' active=' + (b.activeUnit && b.activeUnit.id) + ' skillsOpen=' + !!b.skillsOpen; }));
      let sing = await click('Singularity');
      if (!sing) { const more = await click('More'); sing = await click('Singularity'); if (process.env.DEBUG) console.log('more', more, 'sing', sing, await page.evaluate(() => [...document.querySelectorAll('#fabien-hud .mrow')].filter((x) => x.getClientRects().length).map((x) => x.textContent.trim()).join('|'))); } // (the list has pages)
      check(view + ': the Singularity row is tapped', sing);
      const state = () => page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'e5'); return { channel: !!g.channel, tex: g.sprite.texture.key.split(':')[1], facing: g.facing, visible: g.sprite.visible && g.view.visible, mode: b.mode || null }; });
      await sleep(300);
      const picked = await state();
      await page.screenshot({ path: out + '/mask_' + view + '_picked.png' });
      check(view + ': picking Singularity (before the confirm) puts the mask on', /gadara_mask/.test(picked.tex) && !picked.channel, picked.tex);
      // then the tile under him (the self-cast confirms on a tap on himself, twice: aim then confirm)
      const tapTile = async () => { const p = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'e5'); const cam = b.cameras.main; const c = b.game.canvas.getBoundingClientRect(); const k = c.width / b.scale.width; return { x: c.x + (g.view.x - cam.worldView.x) * cam.zoom * k, y: c.y + (g.view.y - 30 - cam.worldView.y) * cam.zoom * k }; }); if (view === 'desktop') await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y); await sleep(350); };
      await tapTile();
      let s = await state();
      if (!s.channel) { await tapTile(); s = await state(); } // the second tap confirms
      check(view + ': Singularity is charging after the taps', s.channel, JSON.stringify(s));
      const seen = [];
      for (const ms of [200, 400, 700, 1200, 2000, 3500]) { await sleep(ms - (seen.length ? [200, 400, 700, 1200, 2000, 3500][seen.length - 1] : 0)); seen.push(await state()); if (ms === 400) await page.screenshot({ path: out + '/mask_' + view + '_400.png' }); }
      await page.screenshot({ path: out + '/mask_' + view + '_late.png' });
      check(view + ': he wears the mask all through the charge-up (the mask pictures)', seen.every((x) => /gadara_mask/.test(x.tex)), seen.map((x) => x.tex).join(' '));
    } finally { await browser.close(); }
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')'); process.exit(bad ? 1 : 0);
})();
