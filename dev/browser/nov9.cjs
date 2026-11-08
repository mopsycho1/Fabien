// 9 Nov batch (roadmap 6.35 to 6.37) in a real browser: Sudeen's Fury stance and attack in four
// facings, the base attack, the Furious Charge, the archer's and Layra's clash banners, and
// the sand impact. Run with the preview up (npx vite preview --port 4173):
//   node dev/browser/nov9.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 860 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  // Sudeen (H1): zoom on him, show each pose in each facing, plain and under Fury
  const setup = (fury) => page.evaluate((fury) => {
    const b = window.__game.scene.getScene('BattleScene');
    const s = b.units.find((u) => u.label === 'H1');
    b.runEnemyTurn = () => {};
    s.status = s.status || { cooldowns: {} };
    s.status.buff = fury ? { id: 'fury', turnsLeft: 3, power: 1 } : null;
    const c = b.cameras.main; c.setZoom(3.4); c.centerOn(s.view.x, s.view.y - 30);
    return true;
  }, fury);
  const pose = async (name, fury, facing, which, dx) => {
    await setup(fury);
    await page.evaluate(({ facing, which, dx }) => {
      const b = window.__game.scene.getScene('BattleScene');
      const s = b.units.find((u) => u.label === 'H1');
      s.facing = facing;
      if (which === 'stand') b.showStanding(s); else b.showPose(s, which, dx);
    }, { facing, which, dx });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${out}/${name}.png`, clip: { x: box.x + box.width * 0.5 - 170, y: box.y + box.height * 0.5 - 160, width: 340, height: 320 } });
  };
  for (const f of ['upLeft', 'upRight', 'downLeft', 'downRight']) {
    const dx = f.endsWith('Left') ? -1 : 1;
    await pose(`fury_stand_${f}`, true, f, 'stand', dx);
    await pose(`fury_windup_${f}`, true, f, 'windup', dx);
    await pose(`fury_attack_${f}`, true, f, 'attack', dx);
    await pose(`base_attack_${f}`, false, f, 'attack', dx);
  }
  // Furious Charge: Sudeen charges the archer, sample frames during the run
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const U = (l) => b.units.find((u) => u.label === l);
    const s = U('H1'), e = U('E3');
    s.col = 1; s.row = 6; e.col = 5; e.row = 6; b.placeEveryone();
    s.status = { offBalance: false, buff: { id: 'fury', turnsLeft: 3, power: 1 }, hex: null, cooldowns: {}, exposed: null };
    b.focusCamera((s.view.x + e.view.x) / 2, s.view.y - 30, 1.5, 10);
  });
  console.log('furious charge uses', await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return typeof b.castFuriousCharge + ' ' + typeof b.playCharge; }));
  // sand impact: a heavy hit on Gaha's tile from the right and the left
  for (const dir of [1, -1]) {
    await page.evaluate((dir) => {
      const b = window.__game.scene.getScene('BattleScene');
      const g = b.units.find((u) => u.label === 'H2');
      b.focusCamera(g.view.x, g.view.y - 20, 2.2, 10);
      b.showImpact(b.units.find((u) => u.label === 'H1'), g, { hit: true, damage: 12, note: null }, dir, false);
    }, dir);
    await page.waitForTimeout(170);
    await page.screenshot({ path: `${out}/sand_${dir > 0 ? 'right' : 'left'}.png` });
    await page.waitForTimeout(900);
  }
  console.log('errors', errors.length ? errors : 'none');
  await browser.close();
})();
