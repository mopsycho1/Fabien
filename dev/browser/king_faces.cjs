// 10.36 (20 Nov): the kings' portraits, in a real browser. Both kings on the board (everyone fights); on phone and desktop it
// checks the HTML HUD has no blank face (no ".noface" placeholder, every picture in the turn strip, the list and the card is
// loaded), then looks at each king's card and photographs the turn strip and the card.
//   node dev/browser/king_faces.cjs <out dir> [phone|desktop|both]      (with the preview running)
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view, { everyone: true });
    try {
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.units && b.activeUnit; }, null, { timeout: 60000 });
      await sleep(800);
      const sees = async () => page.evaluate(() => {
        const root = document.getElementById('fabien-hud');
        const faces = [...root.querySelectorAll('.medal img, .port img, .dmd img')].filter((i) => i.getClientRects().length);
        return { noface: [...root.querySelectorAll('.noface')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()), faces: faces.length, broken: faces.filter((i) => !i.complete || i.naturalWidth === 0).length };
      });
      let a = await sees();
      check(view + ': both kings are on the board', await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.units.some((u) => u.id === 'h5') && b.units.some((u) => u.id === 'e5'); }));
      check(view + ': no blank face in the turn strip or the list', a.noface.length === 0 && a.faces > 0 && a.broken === 0, a.faces + ' faces, ' + a.broken + ' broken, blank: ' + a.noface.join(','));
      for (const [id, name] of [['h5', 'Alagara'], ['e5', 'Gadara']]) {
        await page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); b.inspect(b.units.find((u) => u.id === id)); }, id);
        await sleep(600);
        a = await sees();
        const card = await page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); const root = document.getElementById('fabien-hud'); const p = root.querySelector('.card .port img'); return { shown: b.viewing && b.viewing.id, src: p ? p.getAttribute('src') : null, ok: p ? p.complete && p.naturalWidth > 0 : false }; }, id);
        check(view + ': ' + name + '\'s card shows his face', card.shown === id && card.ok && /_face\./.test(card.src || ''), card.src);
        check(view + ': ' + name + ': no blank anywhere', a.noface.length === 0 && a.broken === 0);
        await page.screenshot({ path: out + '/king_' + name.toLowerCase() + '_' + view + '.png' });
      }
    } finally { await browser.close(); }
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')'); process.exit(bad ? 1 : 0);
})();
