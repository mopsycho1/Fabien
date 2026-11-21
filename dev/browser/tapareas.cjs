// 18.50 (21 Nov): phone menu rows keep their slim LOOK but every row's tap area is at least 40 real pixels.
//   node dev/browser/tapareas.cjs <out dir> [phone|desktop|both]      (with the preview running)
// Checks: each visible row (the main menu, then the skills list with the commands beside it) is 40 or more real pixels
// tall on a phone and as slim as before on a desktop; the lit row's gold band is still slim (under 26 pixels) inside it;
// a real tap 4 px inside the top edge and 4 px inside the bottom edge of every row reaches THAT row (the right word is
// what the game opens). Photographs: <out>/tap_<view>.png
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
  const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x ? '  [' + x + ']' : '')); if (!ok) bad++; };
  const rowsNow = (page) => page.evaluate(() => [...document.querySelectorAll('#fabien-hud .mrow')].filter((x) => x.getClientRects().length).map((x) => { const b = x.getBoundingClientRect(); const lit = getComputedStyle(x, '::after'); return { word: x.dataset.word, x: b.left, y: b.top, w: b.width, h: b.height, litH: x.classList.contains('lit') || x.classList.contains('cur') ? parseFloat(lit.height) : null, panel: x.parentElement.className }; }));
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    try {
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 60000 });
      const rows = await rowsNow(page);
      const least = Math.min(...rows.map((r) => r.h));
      if (view === 'phone') check('phone: every menu row is at least 40 real pixels tall (its tap area)', rows.length >= 4 && least >= 39.5, rows.map((r) => r.word + ' ' + r.h.toFixed(1)).join(', '));
      else check('desktop: the rows keep their slim size (unchanged, mouse)', least >= 21 && least < 36, least.toFixed(1));
      const lit = rows.filter((r) => r.litH !== null);
      if (lit.length) check(view + ': the lit row\'s gold band stays slim (under 26 px, and shorter than its band on a phone)', lit.every((r) => r.litH < 26 && (view !== 'phone' || r.litH < r.h)), lit.map((r) => r.word + ' band ' + r.litH.toFixed(1) + ' of ' + r.h.toFixed(1)).join(', '));
      // a real tap near the top and near the bottom of a row reaches that row
      const hit = await page.evaluate((rs) => rs.map((r) => ({ word: r.word, top: document.elementFromPoint(r.x + r.w / 2, r.y + 4), bot: document.elementFromPoint(r.x + r.w / 2, r.y + r.h - 4) })).map((o) => ({ word: o.word, top: o.top && o.top.closest('.mrow') && o.top.closest('.mrow').dataset.word, bot: o.bot && o.bot.closest('.mrow') && o.bot.closest('.mrow').dataset.word })), rows);
      check(view + ': a point 4 px inside the top and bottom edge of each row belongs to that row', hit.every((h) => h.top === h.word && h.bot === h.word), hit.filter((h) => h.top !== h.word || h.bot !== h.word).map((h) => h.word + ':' + h.top + '/' + h.bot).join(' '));
      // a real tap on the lower edge of "Skills" opens the skills list
      const sk = rows.find((r) => /^Skills|^Verses/.test(r.word));
      if (sk) {
        const px = sk.x + sk.w / 2, py = sk.y + sk.h - 5;
        if (view === 'desktop') await page.mouse.click(px, py); else await page.touchscreen.tap(px, py);
        await page.waitForTimeout(600);
        const opened = await page.evaluate(() => window.__game.scene.getScene('BattleScene').mode);
        check(view + ': a tap near the bottom edge of "' + sk.word + '" opens its list', opened === 'spell', opened);
        const list = await rowsNow(page);
        const leastL = Math.min(...list.map((r) => r.h));
        check(view + ': the skills list and the commands beside it are also tap-sized' + (view === 'phone' ? ' (40+)' : ''), view === 'phone' ? leastL >= 39.5 : leastL >= 21, list.map((r) => r.word + ' ' + r.h.toFixed(0)).join(', '));
        await page.screenshot({ path: out + '/tap_' + view + '.png' });
      }
      check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' || '));
    } catch (e) { check(view + ': ran', false, String(e).slice(0, 250)); }
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED'); process.exit(bad ? 1 : 0);
})();
