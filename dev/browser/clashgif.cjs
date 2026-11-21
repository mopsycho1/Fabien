// Roadmap 6.62, 6.80: Suleiman's clash GIFs, played ON the board over the two fighters (Gaha against the Bull Commander), no panel.
//   node dev/browser/clashgif.cjs <out dir> [phone|desktop|both]     (with the preview running on port 4173)
// Starts a clash between the two on the real board, photographs it while the banners are on, while each of the three
// GIFs plays, and measures the painting on the screen (it must stand between the two fighters, inside the screen, and the two
// real fighters must step out while it plays). Ends with ALL PASSED or FAILED.
const { openBattle } = require('./lib/play.cjs');
const fs = require('fs');
const out = process.argv[2] || '.';
const views = process.argv[3] === 'both' || !process.argv[3] ? ['phone', 'desktop'] : [process.argv[3]];
fs.mkdirSync(out, { recursive: true });
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    // wait for the background load of the frames
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.textures.exists('clashgif:dance:9') && b.textures.exists('clashgif:strike:8') && b.textures.exists('clashgif:duel:6'); }, null, { timeout: 30000 }).catch(() => {});
    const loaded = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return ['dance:9', 'strike:8', 'duel:6'].every((k) => b.textures.exists('clashgif:' + k)); });
    check(view + ': the 23 frames are loaded in the background', loaded);
    for (const name of ['dance', 'strike', 'duel']) {
      // set up a fresh clash; force which GIF plays by picking it through the scene's own turn-taking
      await page.evaluate((n) => {
        const b = window.__game.scene.getScene('BattleScene');
        const U = (l) => b.units.find((u) => u.label === l);
        const g = U('H2'), bull = U('E2');
        for (const u of b.units) { if (u.engagedWith) { u.engagedWith = null; u.engagement = null; } }
        b.runEnemyTurn = () => {};
        const place = (u, c, r) => b.placeUnit(u, c, r);
        place(g, 4, 5); place(bull, 4, 4);
        b.focusCamera((g.view.x + bull.view.x) / 2, (g.view.y + bull.view.y) / 2 - 40, 1.0, 0);   // (the test moves units without moving the camera)
        window.__forceGif = n;
        b.activeUnit = g; g.hasActed = false; g.hasMoved = false; b.busy = false; b.battleOver = false; b.cancelMode(); b.refreshButtons(); b.refreshCard(g);
        const real = Math.random; let used = false;
        Math.random = () => { if (!used) { used = true; Math.random = real; return ['dance', 'strike', 'duel'].indexOf(n) / 3 + 0.01; } return real(); };
        b.onEngageButton(); b.handleTap(4, 4); b.handleTap(4, 4);
      }, name);
      await page.waitForTimeout(700);
      await page.screenshot({ path: out + '/' + view + '_' + name + '_1_banners.png' });
      await page.waitForTimeout(1100);
      const panel = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        const imgs = b.children.list.filter((o) => o.type === 'Image' && o.texture && o.texture.key.startsWith('clashgif:soft:'));
        const i = imgs[0]; if (!i) return null;
        const cam = b.cameras.main;
        // world to screen (the board camera): the painting's box and the middle of the two fighters
        const toScreen = (x, y) => ({ x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom });
        const U = (l) => b.units.find((u) => u.label === l);
        const g = U('H2'), bull = U('E2');
        const bounds = i.getBounds(); const tl = toScreen(bounds.x, bounds.y), br = toScreen(bounds.right, bounds.bottom);
        const mid = toScreen((g.view.x + bull.view.x) / 2, (g.view.y + bull.view.y) / 2);
        return { key: i.texture.key, box: { x0: tl.x, y0: tl.y, x1: br.x, y1: br.y }, mid, W: b.scale.width, H: b.scale.height, hidden: g.view.alpha === 0 && bull.view.alpha === 0, depth: i.depth, ui: i.cameraFilter === cam.id };
      });
      await page.screenshot({ path: out + '/' + view + '_' + name + '_2_on_board.png' });
      check(view + ' ' + name + ': the painting is on the board', !!panel, panel && panel.key);
      if (panel) {
        check(view + ' ' + name + ': it is a battlefield object, not a screen-layer panel', !panel.ui && panel.depth < 250, 'depth ' + panel.depth);
        check(view + ' ' + name + ': it stands over the middle of the two fighters', panel.mid.x > panel.box.x0 && panel.mid.x < panel.box.x1 && panel.mid.y > panel.box.y0 && panel.mid.y < panel.box.y1, 'mid ' + Math.round(panel.mid.x) + ',' + Math.round(panel.mid.y));
        check(view + ' ' + name + ': it is on the screen (at least 60 percent of it)', Math.min(panel.box.x1, panel.W) - Math.max(panel.box.x0, 0) > 0.6 * (panel.box.x1 - panel.box.x0) && Math.min(panel.box.y1, panel.H) - Math.max(panel.box.y0, 0) > 0.6 * (panel.box.y1 - panel.box.y0), Math.round(panel.box.x1 - panel.box.x0) + ' x ' + Math.round(panel.box.y1 - panel.box.y0) + ' in ' + panel.W + ' x ' + panel.H);
        check(view + ' ' + name + ': the two real fighters have stepped out', panel.hidden);
      }
      await page.waitForTimeout(2200);
      await page.screenshot({ path: out + '/' + view + '_' + name + '_3_after.png' });
      const gone = await page.evaluate(() => !window.__game.scene.getScene('BattleScene').children.list.some((o) => o.type === 'Image' && o.texture && o.texture.key.startsWith('clashgif:soft:')));
      check(view + ' ' + name + ': the painting is gone when the clash goes on', gone);
    }
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
