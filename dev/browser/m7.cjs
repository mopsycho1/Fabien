// M7 (roadmap 18.7; 17.4, 17.5, 17.7; checklist D4 and D5): measures the battle screen in a
// real browser. Brought up to date on 20 Nov (18.44, the HTML HUD): every word of the interface is
// 12 real pixels or more on a phone and 16 on a desktop (Baiyee), menu rows 30 or more (his compact
// rows since 16 Nov), and the menu stands beside the unit whose turn it is (16 Nov, 18.35; the old
// D5 "one fixed corner" of 14 Nov was replaced then), with the skills list to its right.
// Also photographs the screen, the open card, the skills list and the settings sheet.
//   node dev/browser/m7.cjs <out dir> [phone|desktop|both]      (with the preview running)
const fs = require('fs');
const { openBattle, startPlayer } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    // wait for a hero's turn
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 60000 });
    // 18.44 (20 Nov): the HUD is HTML over the canvas. The letters are measured as the browser draws
    // them (computed size, real pixels), with what is still drawn on the canvas; the floor is Baiyee's:
    // 10 real pixels on a phone, 11 on a desktop (the polish pass of 20 Nov; before it 12 and 16).
    const least = view === 'phone' ? 10 : 11; // 20 Nov (Baiyee, HUD polish): the HUD at 55 to 60 percent, letters 10 to 11 real pixels at least
    const measure = () => page.evaluate((least) => {
      const b = window.__game.scene.getScene('BattleScene');
      const real = b.scale.displaySize.width / b.scale.width;
      const main = b.cameras.main.id, ui = b.uiCam.id;
      const small = []; const low = [];
      const shown = (o) => { for (let p = o; p; p = p.parentContainer) if (!p.visible || p.alpha === 0 || (p.cameraFilter & ui)) return false; return true; };
      const walk = (o, isUi) => {
        isUi = isUi || ((o.cameraFilter & main) !== 0 && !(o.cameraFilter & ui)); // still drawn by the interface camera
        if (o.type === 'Text' && isUi && shown(o) && o.text.trim()) { const px = parseFloat(o.style.fontSize) * (o.scaleY || 1) * real; if (px < least - 0.05) small.push('canvas: ' + o.text.slice(0, 18) + ' ' + px.toFixed(1)); }
        if (o.list) o.list.forEach((c) => walk(c, isUi));
      };
      b.children.list.forEach((o) => walk(o, false));
      for (const el of document.querySelectorAll('#fabien-hud *')) {
        if (!el.getClientRects().length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px < least - 0.05) small.push(el.textContent.trim().slice(0, 18) + ' ' + px.toFixed(1));
      }
      const rows = [...document.querySelectorAll('#fabien-hud .mrow')].filter((r) => r.getClientRects().length);
      for (const r of rows) { const h = r.getBoundingClientRect().height; if (h < (least < 11 ? 20 : 21)) low.push(r.dataset.word + ' ' + h.toFixed(1)); }
      const u = b.activeUnit, cam = b.cameras.main, v = cam.worldView;
      const ux = (u.view.x - v.x) * cam.zoom, uy = (u.view.y - u.centerY - v.y) * cam.zoom;
      const box = b.menu.visible ? { x0: b.menu.x, y0: b.menu.y, x1: b.menu.x + b.menuSize.w, y1: b.menu.y + b.menuSize.h } : null;
      const side = b.sideMenu.visible && b.sideSize ? { x0: b.sideMenu.x, x1: b.sideMenu.x + b.sideSize.w } : null;
      // how far the menu (with the main commands beside a list) is from the unit, in screen widths
      const lead = side ? Math.min(side.x0, box.x0) : box && box.x0, tail = box && box.x1;
      const away = box ? Math.max(0, lead - ux, ux - tail) / b.scale.width : null;
      // 21 Nov (Suleiman's mock-up): the menu (and the list beside it) never covers the fighter whose turn it is
      const bh = (u.topY || 60) * cam.zoom, bw = 0.2 * 86 * cam.zoom, feet = (u.view.y - v.y) * cam.zoom;
      const gx0 = box ? (side ? Math.min(side.x0, box.x0) : box.x0) : 0, gx1 = box ? box.x1 : 0;
      const covers = !!box && gx0 < ux + bw && gx1 > ux - bw && box.y0 < feet && box.y1 > feet - bh;
      return { covers, real, small, low, away, pinned: !!b.menuPin, listRight: side ? side.x1 <= box.x0 + 1 : null, cardTop: b.cardTop, menuBottom: box && box.y1, rows: rows.length };
    }, least);
    const m1 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_turn.png' });
    check(view + ' D4: no interface word under ' + least + ' real pixels', m1.small.length === 0, m1.small.slice(0, 6).join(' | ') + ' (one game pixel = ' + m1.real.toFixed(2) + ' real)');
    check(view + ' D4: every menu row 20 real pixels tall or more on a phone, 21 on a desktop (his compact rows; the 20 Nov polish made them slimmer), each row\'s whole band taps it', m1.low.length === 0 && m1.rows > 0, m1.low.join(' | '));
    check(view + ' 18.44: the menu stands beside the unit whose turn it is', m1.pinned || (m1.away !== null && m1.away < 0.2), 'gap ' + (m1.away === null ? 'none' : (m1.away * 100).toFixed(1) + '% of the width'));
    check(view + ' 21 Nov: the menu does not cover the active fighter', m1.pinned || !m1.covers, String(m1.covers));
    check(view + ' 18.44: the menu never covers the card', m1.menuBottom !== null && m1.menuBottom <= m1.cardTop + 1, m1.menuBottom + ' / ' + m1.cardTop);
    // the card: open it
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cardHit.emit('pointerdown'); });
    await page.waitForTimeout(200);
    const m2 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_card_open.png' });
    check(view + ' D4: the open card too', m2.small.length === 0, m2.small.slice(0, 6).join(' | '));
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cardHit.emit('pointerdown'); b.onSpellButton(); });
    await page.waitForTimeout(250);
    const m3 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_skills.png' });
    check(view + ' D4: the skills list too', m3.small.length === 0 && m3.low.length === 0, m3.small.concat(m3.low).slice(0, 6).join(' | '));
    check(view + ' 21 Nov: with the skills list open the menu still clears the fighter', m3.pinned || !m3.covers, String(m3.covers));
    check(view + ' 18.44: the skills list opens to the right of the main commands', m3.listRight === true, String(m3.listRight));
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); b.openSettings(true); });
    await page.waitForTimeout(250);
    const m4 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_settings.png' });
    check(view + ' D4: the settings sheet too', m4.small.length === 0, m4.small.slice(0, 6).join(' | '));
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.openSettings(false); });
    // over a stretch of real play: every moment the menu is open, it is beside the unit and above the card
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene'); window.__menuSeen = { n: 0, far: 0, overCard: 0 };
      setInterval(() => {
        if (!b.menu.visible || b.menuPin || !b.activeUnit) return;
        const u = b.activeUnit, cam = b.cameras.main, v = cam.worldView, ux = (u.view.x - v.x) * cam.zoom;
        const lead = b.sideMenu.visible ? Math.min(b.sideMenu.x, b.menu.x) : b.menu.x, tail = b.menu.x + b.menuSize.w;
        const s = window.__menuSeen; s.n++;
        if (Math.max(0, lead - ux, ux - tail) / b.scale.width >= 0.2) s.far++;
        if (b.menu.y + b.menuSize.h > b.cardTop + 1) s.overCard++;
      }, 100);
    });
    await startPlayer(page, 45000);
    await page.waitForTimeout(40000);
    const seen = await page.evaluate(() => window.__menuSeen);
    // (a sample can fall in the frame a turn passes, while the camera is still panning: under 5 percent is allowed)
    check(view + ' 18.44: 40 seconds of play, the menu beside the unit and above the card', seen.n > 0 && seen.far <= seen.n * 0.05 && seen.overCard === 0, JSON.stringify(seen));
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
