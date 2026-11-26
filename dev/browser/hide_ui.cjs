// 1.110: the eye button (left of the Settings gear) hides the battle screen for a screenshot; a tap anywhere (or H on a computer)
// brings it back, and that tap does nothing else. Photographs before, hidden and back.
//   node dev/browser/hide_ui.cjs <out dir> [phone|desktop|both]
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const views = process.argv[3] && process.argv[3] !== 'both' ? [process.argv[3]] : ['phone', 'desktop'];
  let bad = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) bad++; };
  for (const view of views) {
    const { browser, page, errors } = await openBattle(view);
    await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && !b.busy && document.querySelector('#fabien-hud .eye'); }, null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: out + '/' + view + '_1_before.png' });
    const eye = await page.locator('#fabien-hud .eye').boundingBox();
    check(view + ': the eye button is on screen, a finger-sized target', !!eye && eye.width >= 16, eye && Math.round(eye.width) + ' px');
    if (view === 'phone') await page.touchscreen.tap(eye.x + eye.width / 2, eye.y + eye.height / 2); else await page.mouse.click(eye.x + eye.width / 2, eye.y + eye.height / 2);
    await page.waitForTimeout(500);
    await page.screenshot({ path: out + '/' + view + '_2_hidden.png' });
    const hid = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { flag: b.uiHidden, dom: getComputedStyle(document.getElementById('fabien-hud')).display, cam: b.uiCam ? b.uiCam.visible : null, arrow: b.activeMarker ? b.activeMarker.visible : null, mode: b.mode }; });
    check(view + ': hidden (HTML HUD and canvas HUD gone)', hid.flag === true && hid.dom === 'none' && hid.cam === false && hid.arrow === false, JSON.stringify(hid));
    // a tap on the board brings it back and does nothing else (no move, no menu change)
    const before = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit.col + ',' + b.activeUnit.row + ' ' + b.mode; });
    const box = await page.locator('canvas').boundingBox();
    if (view === 'phone') await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.55); else await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
    await page.waitForTimeout(500);
    const back = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { flag: b.uiHidden, dom: getComputedStyle(document.getElementById('fabien-hud')).display, where: b.activeUnit.col + ',' + b.activeUnit.row + ' ' + b.mode }; });
    await page.screenshot({ path: out + '/' + view + '_3_back.png' });
    check(view + ': a tap brings it back', back.flag === false && back.dom !== 'none', JSON.stringify(back));
    check(view + ': ...and the tap did nothing else', back.where === before, before + ' then ' + back.where);
    if (view === 'desktop') {
      await page.keyboard.press('h'); await page.waitForTimeout(300);
      const k1 = await page.evaluate(() => window.__game.scene.getScene('BattleScene').uiHidden);
      await page.keyboard.press('h'); await page.waitForTimeout(300);
      const k2 = await page.evaluate(() => window.__game.scene.getScene('BattleScene').uiHidden);
      check('desktop: H hides and H shows again', k1 === true && k2 === false);
    }
    check(view + ': no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }
  console.log(bad ? 'FAILED' : 'ALL PASSED');
  process.exit(bad ? 1 : 0);
})();
