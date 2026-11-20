// No cut-off words anywhere (Baiyee 20 Nov, HUD polish part 2): every word the HTML HUD shows must stand whole
// inside its own box and inside its panel, in every state a player can reach:
//   the menu and the item list of every fighter, every skill's list row and skill panel, the card (closed and open)
//   of every fighter, the turn panel, a tooltip.
//   node dev/browser/cutoff.cjs <out dir> [phone|desktop|both]      (preview running on 4173)
// A word is cut off when its element scrolls wider than it is (scrollWidth > clientWidth), when its box leaves its
// panel (the nearest ".fp"), or when the text ends in "..." (an ellipsis). Ends with ALL PASSED or FAILED.
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); let bad = 0, states = 0;
  const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view, { everyone: true });
    try {
      await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 60000 });
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => setTimeout(() => b.endTurn(), 50); });
      // the page-side checker: lists every cut-off word now on show
      await page.evaluate(() => {
        window.__cut = () => {
          const root = document.getElementById('fabien-hud'), rr = root.getBoundingClientRect(), found = [];
          for (const el of root.querySelectorAll('*')) {
            if (!el.getClientRects().length || el.closest('.hide')) continue;
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (!own) continue;
            const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
            const panel = el.closest('.fp'), pr = panel ? panel.getBoundingClientRect() : rr, t = 1.5;
            const text = el.textContent.trim().slice(0, 30);
            if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) found.push('wider than its box: "' + text + '"');
            if (r.left < pr.left - t || r.right > pr.right + t || r.top < pr.top - t || r.bottom > pr.bottom + t) found.push('leaves its panel: "' + text + '" (' + Math.round(r.right - pr.right) + ',' + Math.round(r.bottom - pr.bottom) + ')');
            if (/(\.\.\.|…)$/.test(text)) found.push('ends in dots: "' + text + '"');
          }
          return found;
        };
      });
      const look = async (what) => {
        await sleep(160); states++;
        const f = await page.evaluate(() => window.__cut());
        if (f.length) { bad++; console.log('FAIL ' + view + ': ' + what + ': ' + [...new Set(f)].slice(0, 4).join('; ')); }
      };
      const heroes = await page.evaluate(() => window.__game.scene.getScene('BattleScene').units.filter((u) => u.side === 'hero').map((u) => u.id));
      const all = await page.evaluate(() => window.__game.scene.getScene('BattleScene').units.map((u) => u.id));
      const turn = (id) => page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id); b.activeUnit = u; u.hasActed = false; u.hasMoved = false; b.busy = false; b.cancelMode(); b.refreshStatus(); b.refreshCard(u); b.followUnit(u, 0, true); }, id);
      // the turn panel and the cards of every fighter, closed and open
      for (const id of all) {
        await turn(id);
        await page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); b.cardOpen = false; b.refreshCard(b.units.find((x) => x.id === id)); }, id);
        await look('card closed ' + id);
        await page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); b.cardOpen = true; b.refreshCard(b.units.find((x) => x.id === id)); }, id);
        await look('card open ' + id);
        await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cardOpen = false; });
      }
      // menus, lists and skill panels of every hero
      for (const id of heroes) {
        await turn(id); await look('menu ' + id);
        const spells = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit.spells.slice(); });
        await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.onSpellButton(); }); await look('skills list ' + id);
        for (const sp of spells) {
          await page.evaluate((sp) => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); b.mode = 'spell'; b.selectedSpell = sp; b.refreshStatus(); b.layoutMenu(); }, sp);
          await look('skill panel ' + id + ' ' + sp);
        }
        await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); b.onItemsButton(); }); await look('items list ' + id);
        await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); });
      }
      if (errors.length) { bad++; console.log('FAIL ' + view + ': page errors: ' + errors[0]); }
      console.log((bad ? '' : 'PASS ') + view + ': ' + states + ' states looked at');
      await page.screenshot({ path: out + '/cutoff_' + view + '.png' });
    } catch (e) { bad++; console.log('FAIL ' + view + ': crashed: ' + e.message.split('\n')[0]); }
    await browser.close();
  }
  console.log(bad ? 'FAILED (' + bad + ')' : 'ALL PASSED');
  process.exit(bad ? 1 : 0);
})();
