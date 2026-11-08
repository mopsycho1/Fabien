// 8 Nov batch, Effects flair 16.1 step 12 (phone check): 390 x 844, WebGL, Verses on three units and a slow,
// then clashes: contact (sparks, flash, ring) and a decisive beat. Logs the frame rate in each state.
// Run with the preview up (npx vite preview --port 4173):  node dev/browser/flair3.cjs <out dir>
// The headless browser draws at 8 to 20 fps, so the numbers only compare states with each other.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  const log = {};
  const fps = async (name) => {
    let t = 0, n = 0;
    for (let i = 0; i < 6; i++) { t += await page.evaluate(() => window.__game.loop.actualFps); n++; await page.waitForTimeout(350); }
    log[name] = Math.round(t / n);
  };
  const full = () => page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const t = b.children.list.find((o) => o.type === 'Text' && /^Effects:/.test(o.text));
    if (t && t.text !== 'Effects: Full') t.emit('pointerdown');
  });
  await fps('idle, no Verses');
  // three Verses and a slow
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    const m = { H1: 'fury', H3: 'stone', E1: 'swiftness' };
    for (const u of b.units) { u.status = u.status || { cooldowns: {} }; u.status.buff = m[u.label] ? { id: m[u.label], turnsLeft: 3, power: 1 } : null; u.status.hex = u.label === 'H2' ? { id: 'slow', turnsLeft: 2, power: 1 } : null; }
    b.refreshStatusTags();
  });
  await full(); await page.waitForTimeout(1800); await full();
  await fps('3 Verses + a slow');
  await page.screenshot({ path: `${out}/verses_board.png` });
  // a clash between Gaha (H2) and Tayo (E4) with the Verses still on; frozen at the moment of contact
  const clash = async (name, opening, decisive, freezeAt) => {
    await full(); // the headless frame rate is low, so the automatic Light may have switched in: back to Full
    await page.evaluate(({ opening, decisive }) => {
      const b = window.__game.scene.getScene('BattleScene');
      const gaha = b.units.find((u) => u.label === 'H2'), bull = b.units.find((u) => u.label === 'E4');
      gaha.col = 3; gaha.row = 4; bull.col = 3; bull.row = 3; b.placeEveryone();
      const beat = { actor: gaha, holder: bull, actorStance: 'press', holderStance: 'guard', winner: gaha, loser: bull, kind: 'stance', actorScore: 5, holderScore: 3, decisive, empowered: false };
      b.busy = true;
      b.playBeat({ beat, response: decisive ? { held: false, slipped: false } : null, path: [], ended: false, strike: null, escape: null }, opening, () => { b.busy = false; });
    }, { opening, decisive });
    // freeze the scene on the game clock (not real time: the headless frame rate is far too low to time by)
    await page.evaluate((ms) => { const b = window.__game.scene.getScene('BattleScene'); b.time.delayedCall(ms, () => window.__game.scene.pause('BattleScene')); }, freezeAt);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${out}/${name}.png` });
    log['during ' + name] = Math.round(await page.evaluate(() => window.__game.loop.actualFps));
    await page.evaluate(() => window.__game.scene.resume('BattleScene'));
    await page.waitForTimeout(3500);
  };
  await clash('clash_contact', false, false, 540);
  await clash('clash_decisive', false, true, 780);
  const mode = await page.evaluate(() => window.__game.scene.getScene('BattleScene').children.list.filter((o) => o.type === 'Text' && /^Effects:/.test(o.text)).map((o) => o.text)[0]);
  console.log(JSON.stringify({ fps: log, modeAtEnd: mode, errors: errors.slice(0, 5) }));
  await browser.close();
})();
