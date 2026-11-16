// UI rework (16 Nov): photographs the battle screen at the start of a turn, with a skill
// chosen (the skill panel), with the skills list open and with the card open, and measures:
//   - the board's share of the screen (the free space between the top bar and the bottom panels), at least 75% on a phone
//   - the smallest interface text in real pixels (13 or more)
//   node dev/browser/ui_shots.cjs <out dir> [phone|desktop|both]     (preview running on 4173)
const { openBattle } = require('./lib/play.cjs');
const fs = require('fs');
const out = process.argv[2] || 'ui_shots';
const views = !process.argv[3] || process.argv[3] === 'both' ? ['phone', 'desktop'] : [process.argv[3]];
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (what, ok, info = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + what + (info ? '  [' + info + ']' : '')); if (!ok) failed++; };

// Measures every visible text on the interface camera: its size in real pixels.
const measure = (page) => page.evaluate(() => {
  const b = window.__game.scene.getScene('BattleScene');
  const real = b.lay.real;
  const small = [];
  const visit = (o, vis) => {
    if (!o || !o.visible || !vis) return;
    if (o.type === 'Text' && o.text && o.alpha > 0.05) {
      const px = parseFloat(o.style.fontSize) * Math.abs(o.scaleY) * (o.parentContainer ? o.parentContainer.scaleY : 1) * real;
      if (px < 12.95) small.push(o.text.slice(0, 14) + ' ' + px.toFixed(1));
    }
    if (o.list) for (const c of o.list) visit(c, true);
  };
  for (const o of b.children.list) if (o.cameraFilter & b.cameras.main.id) visit(o, true); // (only what the interface camera draws)
  return { small, board: (b.lay.bottom - b.lay.top) / b.lay.H };
});

(async () => {
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    const tag = '[' + view + '] ';
    try {
      await page.screenshot({ path: out + '/' + view + '_1_turn.png' });
      const m1 = await measure(page);
      check(tag + 'board is at least 75% of the screen height', view !== 'phone' || m1.board >= 0.75, (m1.board * 100).toFixed(1) + '%');
      // the skills list, then a skill chosen
      await page.evaluate(() => window.__game.scene.getScene('BattleScene').onSpellButton());
      await page.waitForTimeout(500);
      await page.screenshot({ path: out + '/' + view + '_2_skills.png' });
      const chosen = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        const list = b.spellMenu(b.activeUnit).filter((e) => e.enabled && !/>$/.test(e.label));
        if (list[0]) list[0].onTap();
        // no target in reach: show the panel for the first skill anyway (this is a photo)
        if (!b.selectedSpell) { b.selectedSpell = b.activeUnit.spells.find((id) => id !== 'meditate'); b.refreshStatus(); }
        return b.selectedSpell;
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: out + '/' + view + '_3_skill_panel.png' });
      const m3 = await measure(page);
      check(tag + 'a skill chosen shows the skill panel', !!chosen && await page.evaluate(() => window.__game.scene.getScene('BattleScene').skillLayer.list.length > 0), String(chosen));
      check(tag + 'no text under 13 real pixels', m1.small.length === 0 && m3.small.length === 0, m1.small.concat(m3.small).slice(0, 6).join(' | '));
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); b.cardOpen = true; b.refreshCard(b.activeUnit); });
      await page.waitForTimeout(400);
      await page.screenshot({ path: out + '/' + view + '_4_card_open.png' });
      check(tag + 'no page errors', errors.length === 0, errors.slice(0, 2).join(' / '));
    } finally { await browser.close(); }
  }
  console.log(failed ? 'FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
