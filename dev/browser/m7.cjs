// M7 (roadmap 18.7; 17.4, 17.5, 17.7; checklist D4 and D5): measures the battle screen in a
// real browser. D4: every word of the interface is 11 real pixels tall or more and every
// button 44 or more. D5: the action menu's corner is in the same place every time it opens.
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
    const measure = () => page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const real = b.scale.displaySize.width / b.scale.width;
      const main = b.cameras.main.id;
      const small = []; const low = [];
      const shown = (o) => { for (let p = o; p; p = p.parentContainer) if (!p.visible || p.alpha === 0) return false; return true; };
      const walk = (o, ui) => {
        ui = ui || (o.cameraFilter & main) !== 0; // the interface is what the board camera does not film
        if (o.type === 'Text' && ui && shown(o) && o.text.trim()) { const px = parseFloat(o.style.fontSize) * (o.scaleY || 1) * real; if (px < 10.95) small.push(o.text.slice(0, 18) + ' ' + px.toFixed(1)); }
        if (o.list) o.list.forEach((c) => walk(c, ui));
      };
      b.children.list.forEach((o) => walk(o, false));
      for (const r of [...b.slots, ...b.halves, ...b.lowHalves]) if (r.view.visible && b.menu.visible) { const h = r.h * real; if (h < 43.5) low.push(r.label.text + ' ' + h.toFixed(1)); }
      return { real, small, low, menu: b.menu.visible ? Math.round(b.menu.x + b.menuSize.w) + ',' + Math.round(b.menu.y + b.menuSize.h) : null };
    });
    const m1 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_turn.png' });
    check(view + ' D4: no interface word under 11 real pixels', m1.small.length === 0, m1.small.slice(0, 6).join(' | ') + ' (one game pixel = ' + m1.real.toFixed(2) + ' real)');
    check(view + ' D4: every menu row 44 real pixels tall or more', m1.low.length === 0, m1.low.join(' | '));
    // the card: open it
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cardHit.emit('pointerdown'); });
    await page.waitForTimeout(200);
    const m2 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_card_open.png' });
    check(view + ' D4: the open card too', m2.small.length === 0, m2.small.slice(0, 6).join(' | '));
    check(view + ' D5: turning the card\'s page does not move the menu', m2.menu === m1.menu, m1.menu + ' then ' + m2.menu);
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cardHit.emit('pointerdown'); b.onSpellButton(); });
    await page.waitForTimeout(250);
    const m3 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_skills.png' });
    check(view + ' D4: the skills list too', m3.small.length === 0 && m3.low.length === 0, m3.small.concat(m3.low).slice(0, 6).join(' | '));
    check(view + ' D5: the skills list stands on the same corner', m3.menu === m1.menu, m1.menu + ' then ' + m3.menu);
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); b.openSettings(true); });
    await page.waitForTimeout(250);
    const m4 = await measure();
    await page.screenshot({ path: out + '/m7_' + view + '_settings.png' });
    check(view + ' D4: the settings sheet too', m4.small.length === 0, m4.small.slice(0, 6).join(' | '));
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.openSettings(false); });
    // D5 over a stretch of real play: the corner at every moment the menu is open
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene'); window.__corners = {};
      setInterval(() => { if (b.menu.visible && !b.menuPin) { const k = Math.round(b.menu.x + b.menuSize.w) + ',' + Math.round(b.menu.y + b.menuSize.h); window.__corners[k] = (window.__corners[k] || 0) + 1; } }, 100);
    });
    await startPlayer(page, 45000);
    await page.waitForTimeout(40000);
    const corners = await page.evaluate(() => window.__corners);
    check(view + ' D5: 40 seconds of play, the menu opened on one corner only', Object.keys(corners).length === 1, JSON.stringify(corners));
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
