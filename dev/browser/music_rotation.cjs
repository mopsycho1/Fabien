// A.3 (Suleiman: "let's have the soundtracks on rotation"): in a battle the battle tracks take turns. A track does not loop: near
// its end it crossfades into the next one in the rotation, and so on round. Starts a battle, jumps the music near the end twice
// and checks who plays.   node dev/browser/music_rotation.cjs     (with the preview running)
const { chromium } = require('playwright');
(async () => {
  let bad = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) bad++; };
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__skipSelect = true; });
  await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 120; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(3000);
  const s1 = await page.evaluate(() => window.__musicState());
  check('a battle track plays', s1.rotation.includes(s1.current) && s1[s1.current] && !s1[s1.current].paused, JSON.stringify(s1));
  const loops = s1.rotation.map((n) => n + ':' + (s1[n] ? s1[n].loop : '?')).join(' ');
  check('no battle track loops forever (they take turns)', s1.rotation.every((n) => s1[n] && s1[n].loop === false), loops);
  const seen = [s1.current];
  for (let round = 0; round < 2; round++) {
    await page.evaluate(() => window.__musicSeekEnd(4));
    await page.waitForTimeout(6000);
    const s = await page.evaluate(() => window.__musicState());
    seen.push(s.current);
    check('near its end, ' + seen[seen.length - 2] + ' hands over to the next track', s.current !== seen[seen.length - 2] && s.rotation.includes(s.current) && !s[s.current].paused, JSON.stringify(s));
  }
  check('...and round again', seen[2] === seen[0], seen.join(' > '));
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(bad ? 'FAILED' : 'ALL PASSED');
  process.exit(bad ? 1 : 0);
})();
