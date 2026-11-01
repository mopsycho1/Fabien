// The clean-up batch in a real browser (laptop): the FFT-style blue tiles, a
// clash close-up, Layra concentrating, Sonic Javelin in flight.
// Needs `npx vite preview --port 4173`. Usage: node dev/browser/cleanup.cjs <out dir>
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 860 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 90; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + '/cu_tiles.png' });
  const setup = (spots) => page.evaluate((spots) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {}; b.endTurn = () => {};
    for (const [l, [c, r]] of Object.entries(spots)) { const u = b.units.find((v) => v.label === l); u.col = c; u.row = r; }
    b.placeEveryone(); b.busy = false; b.cancelMode();
  }, spots);
  // a clash: Gaha Guards against the bull's Press
  await setup({ H2: [4, 4], E2: [4, 3] });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const g = b.units.find((u) => u.label === 'H2'), e = b.units.find((u) => u.label === 'E2');
    b.playBeat({ beat: { actor: e, holder: g, actorStance: 'press', holderStance: 'guard', winner: g, loser: e, kind: 'stance', actorScore: 4, holderScore: 6, decisive: false, empowered: false }, response: null, path: [], ended: false, strike: null, escape: null }, true, () => {});
  });
  await page.waitForTimeout(560);
  await page.screenshot({ path: out + '/cu_clash.png' });
  await page.waitForTimeout(1600);
  // Layra concentrating on a Verse
  await setup({ H3: [4, 6], H1: [5, 6] });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const l = b.units.find((u) => u.label === 'H3'), s = b.units.find((u) => u.label === 'H1');
    b.activeUnit = l; l.mp = l.maxMp; b.castSpell(l, s, 'stone', () => {});
  });
  await page.waitForTimeout(260);
  await page.screenshot({ path: out + '/cu_chant.png' });
  await page.waitForTimeout(1500);
  // Sonic Javelin thrown
  await setup({ H2: [4, 7], E1: [4, 2] });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const g = b.units.find((u) => u.label === 'H2'), r = b.units.find((u) => u.label === 'E1');
    window.__status ? 0 : 0;
    b.activeUnit = g; g.hasActed = false;
    const S = b.units && null;
  });
  await page.evaluate(async () => {
    const b = window.__game.scene.getScene('BattleScene');
    const g = b.units.find((u) => u.label === 'H2'), r = b.units.find((u) => u.label === 'E1');
    g.status.buff = { id: 'swiftness', turnsLeft: 3, power: 1 }; g.status.lentMp = 3;
    b.castSonicJavelin(g, r, (await import('/src/data/spells.json').catch(() => null)) || { range: 5, push: 1, sweepShare: 1.5 }, () => {});
  }).catch(() => {});
  await page.waitForTimeout(470);
  await page.screenshot({ path: out + '/cu_sonic.png' });
  console.log('errors', JSON.stringify(errors.slice(0, 4)));
  await browser.close();
})();
