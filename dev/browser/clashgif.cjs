// Roadmap 6.62: Suleiman's clash GIFs as framed panels in the clash opening (Gaha against the Bull Commander).
//   node dev/browser/clashgif.cjs <out dir> [phone|desktop|both]     (with the preview running on port 4173)
// Starts a clash between the two on the real board, photographs it while the banners are on, while each of the three
// GIFs plays, and measures the panel (it must sit inside the screen, at the clash banner's height). Ends with ALL PASSED or FAILED.
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
        const imgs = b.children.list.filter((o) => o.type === 'Image' && o.texture && o.texture.key.startsWith('clashgif:'));
        const i = imgs[0]; if (!i) return null;
        const s = b.scale; const cam = b.cameras.main;
        return { key: i.texture.key, x: i.x, y: i.y, w: i.displayWidth, h: i.displayHeight, W: b.lay.W, H: b.lay.H, portrait: b.lay.portrait, alpha: i.alpha };
      });
      await page.screenshot({ path: out + '/' + view + '_' + name + '_2_panel.png' });
      check(view + ' ' + name + ': a panel is on screen', !!panel, panel && panel.key);
      if (panel) {
        check(view + ' ' + name + ': it sits inside the screen with a margin', panel.x - panel.w / 2 >= panel.W * 0.02 && panel.x + panel.w / 2 <= panel.W * 0.98 && panel.y - panel.h / 2 >= 0 && panel.y + panel.h / 2 <= panel.H, Math.round(panel.w) + ' x ' + Math.round(panel.h) + ' in ' + panel.W + ' x ' + panel.H);
        check(view + ' ' + name + ': it is not taller than the clash banners (' + (panel.portrait ? '0.30' : '0.52') + ' of the screen)', panel.h <= panel.H * (panel.portrait ? 0.3 : 0.52) + 1, 'h ' + Math.round(panel.h));
      }
      await page.waitForTimeout(2200);
      await page.screenshot({ path: out + '/' + view + '_' + name + '_3_after.png' });
      const gone = await page.evaluate(() => !window.__game.scene.getScene('BattleScene').children.list.some((o) => o.type === 'Image' && o.texture && o.texture.key.startsWith('clashgif:')));
      check(view + ' ' + name + ': the panel is gone when the clash goes on', gone);
    }
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
