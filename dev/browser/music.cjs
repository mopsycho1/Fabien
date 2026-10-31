// Real browser: his music plays on the title and story screens, switches in
// battle, and the battle screen in landscape (timeline, turn numbers).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 860 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push('failed ' + r.url()));
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
  await page.waitForTimeout(2500);
  const playing = () => page.evaluate(() => [...document.querySelectorAll('audio')].length + ' audio els; ' + JSON.stringify(window.__trackState ? window.__trackState() : null));
  const title = await page.evaluate(() => { const a = window.__music; return a; });
  for (let i = 0; i < 90; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(3000);
  const state = await page.evaluate(() => window.__musicState());
  await page.screenshot({ path: process.argv[2] + '/landscape_831.png' });
  console.log(JSON.stringify({ state, errors: errors.slice(0, 4) }));
  await browser.close();
})();
