// 8 Nov batch: Effects flair 16.1 steps 6 and 7 (step and hit effects of the four Verses) and the
// Enchant look without a picture over the body (4.4), at phone size (390 x 844). Each effect is
// frozen about 150 ms in (the scene is paused) so one screenshot can catch it. Run with the preview up
// (npx vite preview --port 4173):  node dev/browser/flair2.cjs <out dir>
// It writes one picture per effect; make the contact sheet with the PIL snippet in the roadmap note.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  // look at one unit close up, no Verses on anyone, effects on Full
  const focus = (label, zoom = 2.4) => page.evaluate(({ label, zoom }) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    for (const u of b.units) { u.status = u.status || { cooldowns: {} }; u.status.buff = null; u.status.hex = null; }
    const u = b.units.find((x) => x.label === label);
    b.refreshStatusTags();
    const c = b.cameras.main; c.setZoom(zoom); c.centerOn(u.view.x, u.view.y - 30);
    const t = b.children.list.find((o) => o.type === 'Text' && /^Effects:/.test(o.text));
    if (t && t.text !== 'Effects: Full') t.emit('pointerdown');
  }, { label, zoom });
  const clip = { x: 45, y: 250, width: 300, height: 300 };
  const frozen = async (name, js, arg) => {
    await page.evaluate(({ js, arg }) => {
      const b = window.__game.scene.getScene('BattleScene');
      new Function('b', 'arg', js)(b, arg);
      setTimeout(() => window.__game.scene.pause('BattleScene'), 150);
    }, { js, arg });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}.png`, clip });
    await page.evaluate(() => window.__game.scene.resume('BattleScene'));
    await page.waitForTimeout(1200);
  };
  await focus('H1');
  const unit = "const u = b.units.find((x) => x.label === 'H1'); const fx = window.__fxProbe;";
  // the effects are reached through the scene's own imports: tests use window.__fx, the real game has none,
  // so here a unit is given the Verse and made to take a blow and a step the real way
  const hit = (kind) => `
    const a = b.units.find((x) => x.label === 'E1'), t = b.units.find((x) => x.label === 'H1');
    const id = { stone: 'stone', swift: 'swiftness', fury: 'fury' }[arg];
    a.status = a.status || { cooldowns: {} };
    a.status.buff = id ? { id, turnsLeft: 3, power: 1 } : null;
    a.status.hex = arg === 'slow' ? { id: 'slow', turnsLeft: 2, power: 1 } : null;
    t.hp = t.maxHp;
    b.showImpact(a, t, { hit: true, damage: 4 }, 1, false);`;
  for (const k of ['stone', 'swift', 'fury', 'slow']) await frozen('hit_' + k, hit(), k);
  // steps: walk the unit one tile with the Verse on it (a real move)
  const step = `
    const u = b.units.find((x) => x.label === 'H1');
    const id = { stone: 'stone', swift: 'swiftness', fury: 'fury' }[arg];
    u.status = u.status || { cooldowns: {} };
    u.status.buff = id ? { id, turnsLeft: 3, power: 1 } : null;
    u.status.hex = arg === 'slow' ? { id: 'slow', turnsLeft: 2, power: 1 } : null;
    b.busy = true; b.moveUnit(u, u.col, u.row + 1, () => { b.busy = false; });`;
  for (const k of ['stone', 'swift', 'fury', 'slow']) {
    await focus('H1');
    await frozen('step_' + k, step, k);
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.label === 'H1'); u.row -= 1; b.placeEveryone(); });
  }
  // Rabdul enchanted: no picture over the body
  await focus('E1', 2.6);
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.label === 'E1'); window.__game.__s = window.__status; });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const u = b.units.find((x) => x.label === 'E1');
    u.status = u.status || { cooldowns: {} };
    u.status.enchant = { turnsLeft: 3 };
    b.refreshStatusTags();
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/enchant_rabdul_a.png`, clip });
  await page.waitForTimeout(170);
  await page.screenshot({ path: `${out}/enchant_rabdul_b.png`, clip });
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
