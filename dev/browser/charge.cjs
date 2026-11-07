// The held charge pose while choosing a target (roadmap 13.12), in a real browser.
// Run with the preview up: node dev/browser/charge.cjs <out dir>
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
  const setup = (who, spell, buff) => page.evaluate(({ who, spell, buff }) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    const u = b.units.find((x) => x.id === who);
    const foe = b.units.find((x) => x.id === 'e2') || b.units.find((x) => x.side !== u.side);
    for (const o of b.units) o.view.setVisible(o === u || o === foe);
    u.alive = true; u.mp = u.maxMp; u.cooldowns = {}; u.hasActed = false;
    u.col = 4; u.row = 6; foe.col = 4; foe.row = 3; b.placeEveryone();
    if (buff) window.__status ? 0 : 0;
    b.activeUnit = u; b.mode = 'spell';
    return { u: u.id, foe: foe.id };
  }, { who, spell, buff });
  // Gaha, Layra, Tayo: pick the skill, screenshot the held pose, pick a target, screenshot, cancel
  const cases = [['h2', 'sonicJavelin', 'swiftness'], ['h3', 'swiftness', null], ['e1', 'elementBlast', 'enchant']];
  for (const [who, spell, buff] of cases) {
    console.log(who, JSON.stringify(await setup(who, spell, buff)));
    const r = await page.evaluate(({ who, spell, buff }) => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = b.units.find((x) => x.id === who);
            if (buff === 'swiftness' && u.id === 'h2') { u.status = u.status || {}; u.status.buff = { id: 'swiftness', turnsLeft: 3, power: 1, lent: { mp: 6, max: 6 } }; } // Gaha needs Swiftness on him for Sonic Javelin
      b.chooseSpell(spell);
      return { mode: b.mode, key: u.sprite.texture.key, targets: b.targetsInRange.map((t) => t.id) };
    }, { who, spell, buff });
    console.log(who, 'picked', JSON.stringify(r));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/charge_${who}_1_held.png` });
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); if (b.targetsInRange[0]) b.previewAttack(b.targetsInRange[0]); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/charge_${who}_2_aimed.png` });
    const after = await page.evaluate((who) => {
      const b = window.__game.scene.getScene('BattleScene');
      b.cancelMode();
      return b.units.find((x) => x.id === who).sprite.texture.key;
    }, who);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/charge_${who}_3_cancelled.png` });
    console.log(who, 'after cancel', after);
  }
  console.log('errors', JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})();
