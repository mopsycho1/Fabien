// 1.118 and 1.124 (27 Nov): every fighter's skills list fits on the screen. For each of the twelve
// fighters (the kings' grouped lists too) it makes him the one acting, opens Skills, opens every group
// in the list, and checks that the menu, the list and every row in it are on the screen (a row may sit
// inside a list that scrolls, as long as that list is on the screen), that the list does not cover the
// fighter, and how tall the main menu is (1.116: about 25 percent of the screen at most, rows about
// 44 real pixels apart, each row's tap area filling its row). Photographs the turn menu and each list.
//   node dev/browser/skills_fit.cjs <out dir> [phone|desktop]      (PHONE=375x667 for another phone)
// Ends with ALL PASSED or FAILED.
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const view = process.argv[3] || 'phone';
  const size = view === 'phone' ? (process.env.PHONE || '390x844') : '1440x900';
  let bad = 0;
  const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) bad++; };
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  try {
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.side === 'hero' && !b.busy && b.menu.visible; }, null, { timeout: 90000 });
    // the enemies pass their turns, nobody walks in the middle of a photo
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => {}; window.localStorage.removeItem('fabien.menuPin'); b.menuPin = null; });
    // What is on the screen now: the menus (main commands and the list), their rows, the fighter's body
    const measure = () => page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const W = innerWidth, H = innerHeight;
      const c = b.game.canvas.getBoundingClientRect(), k = c.width / b.scale.width;
      const panels = [...document.querySelectorAll('#fabien-hud .fp.menu')].filter((p) => !p.classList.contains('hide') && p.getClientRects().length && getComputedStyle(p).display !== 'none');
      const box = (r) => ({ x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom) });
      const inScreen = (r) => r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
      const off = [];
      const rows = [];
      for (const p of panels) {
        const pr = p.getBoundingClientRect();
        if (!inScreen(pr)) off.push('panel ' + JSON.stringify(box(pr)));
        for (const r of p.querySelectorAll('.mrow')) {
          const rr = r.getBoundingClientRect();
          const sc = r.closest('.scroll');
          const ok = sc ? inScreen(sc.getBoundingClientRect()) : inScreen(rr);
          if (!ok) off.push(r.dataset.word + ' ' + JSON.stringify(box(rr)));
          rows.push({ word: r.dataset.word, h: rr.height, top: rr.top, panel: panels.indexOf(p) });
        }
      }
      // the fighter whose turn it is: his body on the screen (as m7.cjs)
      const u = b.activeUnit, cam = b.cameras.main, v = cam.worldView;
      const ux = c.left + (u.view.x - v.x) * cam.zoom * k, feet = c.top + (u.view.y - v.y) * cam.zoom * k;
      const bh = (u.topY || 60) * cam.zoom * k, bw = 0.2 * 86 * cam.zoom * k;
      const covers = panels.some((p) => { const r = p.getBoundingClientRect(); return r.left < ux + bw && r.right > ux - bw && r.top < feet && r.bottom > feet - bh; });
      // every other fighter's body too (1.116: never over a fighter)
      const others = b.units.filter((o) => o.alive && o !== u && o.view).filter((o) => {
        const ox = c.left + (o.view.x - v.x) * cam.zoom * k, of = c.top + (o.view.y - v.y) * cam.zoom * k, oh = (o.topY || 60) * cam.zoom * k * 0.8;
        return panels.some((p) => { const r = p.getBoundingClientRect(); return r.left < ox + bw * 0.6 && r.right > ox - bw * 0.6 && r.top < of - 4 && r.bottom > of - oh; });
      }).map((o) => o.name);
      const main = panels.length ? panels[panels.length === 2 ? 0 : 0].getBoundingClientRect() : null; // (the main commands, or the list alone)
      return { W, H, mode: b.mode, group: b.spellGroup, off, rows, covers, others, panels: panels.map((p) => box(p.getBoundingClientRect())), mainH: main ? main.height : 0 };
    });
    const shoot = (name) => page.screenshot({ path: out + '/' + name + '.png' });
    const ids = await page.evaluate(() => window.__game.scene.getScene('BattleScene').units.filter((u) => u.alive).map((u) => u.id));
    let first = true;
    for (const id of ids) {
      const who = await page.evaluate((id) => {
        const b = window.__game.scene.getScene('BattleScene');
        const u = b.units.find((x) => x.id === id);
        b.cancelMode();
        for (const o of b.units) if (o.__wasSide) { o.side = o.__wasSide; delete o.__wasSide; }
        if (u.side !== 'hero') { u.__wasSide = u.side; u.side = 'hero'; } // (the menu shows only on a hero's turn: an enemy is a hero for the photo)
        b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.mp = u.maxMp; b.busy = false;
        if (b.followUnit) b.followUnit(u, 0);
        b.refreshStatus(); b.refreshCard(u);
        return u.name;
      }, id);
      await page.waitForTimeout(500);
      const m0 = await measure();
      if (first) {
        // 1.116: the main menu at most about a quarter of the screen, rows about 44 real pixels apart, each row's band its tap area
        await shoot(view + '_' + size + '_menu');
        const main = m0.rows.filter((r) => r.panel === 0);
        const tops = [...new Set(main.map((r) => Math.round(r.top)))].sort((a, c) => a - c); // (one row a line, or two columns)
        const pitch = tops.length > 1 ? (tops[tops.length - 1] - tops[0]) / (tops.length - 1) : 0;
        console.log('  main menu: ' + main.length + ' rows, ' + m0.mainH.toFixed(0) + ' px tall (' + (100 * m0.mainH / m0.H).toFixed(1) + '% of ' + m0.H + '), rows ' + pitch.toFixed(1) + ' px apart, tap bands ' + main.map((r) => r.h.toFixed(0)).join('/'));
        if (view === 'phone') {
          check(m0.mainH <= m0.H * 0.27, '[' + size + '] 1.116: the main menu is ' + (100 * m0.mainH / m0.H).toFixed(1) + '% of the screen tall (about 25 at most)');
          check(pitch >= 40 && pitch <= 48, '[' + size + '] 1.116: rows ' + pitch.toFixed(1) + ' px apart (about 44)');
          check(main.every((r) => Math.abs(r.h - pitch) <= 1.5), '[' + size + '] 1.116: each row\'s tap area fills its row');
        }
        first = false;
      }
      check(!m0.covers, '[' + size + '] ' + who + ': the menu does not cover him');
      if (m0.others.length) await shoot(view + '_' + size + '_' + id + '_menu');
      // (all twelve stand close here, so a fighter in a crowd may have no clear spot: a note, not a failure; m7.cjs checks real play)
      if (m0.others.length) console.log('NOTE [' + size + '] ' + who + ': the menu touches ' + m0.others.join(', ') + ' (crowded, photo ' + id + '_menu)');
      await page.evaluate(() => window.__game.scene.getScene('BattleScene').onSpellButton());
      await page.waitForTimeout(400);
      const m1 = await measure();
      await shoot(view + '_' + size + '_' + id + '_skills');
      check(m1.mode === 'spell' && m1.off.length === 0, '[' + size + '] ' + who + ': the skills list is on the screen (' + m1.rows.length + ' rows)' + (m1.off.length ? ' OFF: ' + m1.off.slice(0, 3).join(' | ') : ''));
      check(!m1.covers, '[' + size + '] ' + who + ': the skills list does not cover him');
      // every group in the list (the kings' Forms, Techniques...; Layra's Blessings and Hexes)
      const groups = await page.evaluate(() => window.__game.scene.getScene('BattleScene').spellMenu(window.__game.scene.getScene('BattleScene').activeUnit).filter((e) => /  >$/.test(e.label)).map((e) => e.label.replace(/  >$/, '')));
      for (const g of groups) {
        await page.evaluate((g) => { const b = window.__game.scene.getScene('BattleScene'); b.openSpellGroup(g); }, g);
        await page.waitForTimeout(400);
        const m2 = await measure();
        await shoot(view + '_' + size + '_' + id + '_' + g.replace(/\W+/g, ''));
        check(m2.group === g && m2.off.length === 0, '[' + size + '] ' + who + ' ' + g + ': on the screen (' + m2.rows.length + ' rows)' + (m2.off.length ? ' OFF: ' + m2.off.slice(0, 3).join(' | ') : ''));
        check(!m2.covers, '[' + size + '] ' + who + ' ' + g + ': does not cover him');
        await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.spellGroup = null; b.refreshStatus(); });
      }
    }
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
  } catch (e) {
    check(false, 'test crashed: ' + e.message.split('\n')[0]);
  } finally {
    await browser.close();
  }
  console.log(bad ? 'FAILED (' + bad + ')' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
