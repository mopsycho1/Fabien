// 18.51 (21 Nov): the board markers and the turn strip, in a real browser, on each screen.
//   node dev/browser/markers.cjs <out dir> [phone|desktop|both]      (preview running on 4173)
// Checks: tile outlines are drawn (gold under the one acting, red under each enemy) and the rings are hidden; each enemy has a
// small red bar over its head; Settings has "Markers: Tiles" and one tap makes the rings come back and the tiles go; the turn strip
// shows at most 6 faces in its window with the rest to scroll to, the one acting about twice the size of the others.
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0;
  const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
  const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) bad++; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy; }, null, { timeout: 60000 });
    await sleep(800);
    const st = () => page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const foes = b.units.filter((u) => u.side !== 'hero' && u.alive);
      return {
        mode: window.localStorage.getItem('fabien.markers') || 'tiles',
        active: b.activeUnit.markState, activeShown: b.activeUnit.tileMark.visible,
        foesRed: foes.every((u) => u.tileMark.visible && u.markState === 'enemy'),
        foeBars: foes.every((u) => u.miniBar && u.miniBar.visible),
        ringsHidden: b.units.every((u) => !u.body.visible), ringsShown: b.units.every((u) => u.body.visible),
        settings: (b.settingsRows || []).map((l) => l.text),
      };
    });
    const a = await st();
    check(view + ': tiles are the default: gold under the one acting, red under each enemy, rings hidden', a.activeShown && a.active === 'active' && a.foesRed && a.ringsHidden, JSON.stringify({ active: a.active, foesRed: a.foesRed, ringsHidden: a.ringsHidden }));
    check(view + ': a small red bar over each enemy', a.foeBars);
    check(view + ': Settings has the Markers row', a.settings.includes('Markers: Tiles'), a.settings.join(' | '));
    await page.screenshot({ path: out + '/markers_' + view + '_tiles.png' });
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.settingsRows.find((l) => /^Markers/.test(l.text)).emit('pointerdown'); });
    await sleep(500);
    const r = await st();
    check(view + ': one tap on Markers brings the rings back and takes the tiles away', r.settings.includes('Markers: Rings') && r.ringsShown && r.mode === 'rings' && await page.evaluate(() => window.__game.scene.getScene('BattleScene').units.every((u) => !u.tileMark.visible)));
    await page.screenshot({ path: out + '/markers_' + view + '_rings.png' });
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.settingsRows.find((l) => /^Markers/.test(l.text)).emit('pointerdown'); });
    // the turn strip
    const strip = await page.evaluate(() => {
      const w = document.querySelector('#fabien-hud .stripwin');
      if (!w) return null;
      const wr = w.getBoundingClientRect();
      const medals = [...w.querySelectorAll('.medal')].map((m) => m.getBoundingClientRect());
      const visible = medals.filter((m) => m.right <= wr.right + 1 && m.left >= wr.left - 1).length;
      const others = medals.slice(1).map((m) => m.width);
      return { visible, total: medals.length, ratio: medals[0].width / (others.reduce((x, y) => x + y, 0) / others.length), scrolls: w.scrollWidth > w.clientWidth + 1 };
    });
    check(view + ': the strip shows 6 faces or fewer in its window', strip && strip.visible <= 6 && strip.visible >= 4, JSON.stringify(strip));
    check(view + ': the face of the one acting is about twice the size of the others (1.6 to 2.4 times)', strip && strip.ratio > 1.6 && strip.ratio < 2.4, strip && strip.ratio.toFixed(2));
    check(view + ': the rest of the fighters are there to scroll to', strip && strip.total > strip.visible && strip.scrolls, JSON.stringify(strip));
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
