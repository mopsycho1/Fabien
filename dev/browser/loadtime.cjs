// Load time on a throttled phone connection (roadmap 18.47).
//   node dev/browser/loadtime.cjs [profile]   profile: 4g (default: 9 Mbit/s, 170 ms) or slow (1.6 Mbit/s, 150 ms)
// It opens the game cold (no cache), counts every request and its size, and times:
//   title  = the title is on screen and "Tap to begin" is ready (the player can start)
//   select = the character select is on screen with its portraits
//   battle = Start battle was pressed and the first turn is on screen
const { chromium } = require('playwright');
const profiles = { none: { dl: -1, ul: -1, lat: 0 }, '4g': { dl: 9e6, ul: 3e6, lat: 170 }, slow: { dl: 1.6e6, ul: 0.75e6, lat: 150 } };
(async () => {
  const p = profiles[process.argv[2] || '4g'];
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: p.dl / 8, uploadThroughput: p.ul / 8, latency: p.lat });
  const reqs = []; // { url, bytes, at }
  let t0 = 0, phase = 'title';
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.find((x) => x.id === e.requestId); if (r) r.bytes = e.encodedDataLength; });
  cdp.on('Network.requestWillBeSent', (e) => reqs.push({ id: e.requestId, url: e.request.url, phase, at: Date.now() - t0 }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const url = process.env.GAME_URL || 'http://localhost:' + (process.env.PORT || 4173) + '/';
  t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  const box = () => page.locator('canvas').boundingBox();
  const tap = async (fx, fy) => { const b = await box(); await page.touchscreen.tap(b.x + b.width * fx, b.y + b.height * fy); };
  const out = {};
  // title: wait until the Tap to begin prompt says so (StartScene.artReady)
  await page.waitForFunction(() => { const s = window.__game && window.__game.scene.getScene('StartScene'); return s && s.artReady; }, null, { timeout: 300000 });
  console.error('title ready', (Date.now() - t0) / 1000); out.title = (Date.now() - t0) / 1000; phase = 'story';
  // the story: tap until the select (or the battle) is up
  const t1 = Date.now();
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => ({ sel: window.__game.scene.isActive('SelectScene'), bat: window.__game.scene.isActive('BattleScene') }));
    if (i % 4 === 0) console.error('story tap', i, JSON.stringify(st), Math.round((Date.now() - t0) / 1000) + 's');
    if (st.sel || st.bat) { out.select = (Date.now() - t0) / 1000; out.hit = st; break; }
    await tap(0.5, 0.85); await page.waitForTimeout(250);
  }
  phase = 'battle';
  const t2 = Date.now();
  if (out.hit && out.hit.sel) {
    // press Start battle (the scene's own handler: the same thing the button calls)
    await page.waitForTimeout(500);
    await page.evaluate(() => { const s = window.__game.scene.getScene('SelectScene'); s.startBattle(s.pick); });
  }
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('BattleScene'); return b && b.units && b.activeUnit && b.slots; }, null, { timeout: 300000 });
  out.battleSeconds = (Date.now() - t2) / 1000; out.total = (Date.now() - t0) / 1000;
  const sum = (ph) => { const r = reqs.filter((x) => x.phase === ph); return { files: r.length, mb: +(r.reduce((a, x) => a + (x.bytes || 0), 0) / 1048576).toFixed(2) }; };
  out.title_load = sum('title'); out.story_load = sum('story'); out.battle_load = sum('battle');
  const all = reqs; out.all = { files: all.length, mb: +(all.reduce((a, x) => a + (x.bytes || 0), 0) / 1048576).toFixed(2) };
  // where the battle's bytes went: by folder under art/ (fighters' own pictures are the files straight in art/)
  const by = {};
  for (const r of reqs.filter((x) => x.phase === 'battle')) { const m = r.url.match(/\/art\/([^/]+)\//); const k = m ? m[1] : 'art (fighters)'; by[k] = by[k] || { files: 0, mb: 0 }; by[k].files++; by[k].mb = +(by[k].mb + (r.bytes || 0) / 1048576).toFixed(2); }
  out.battleByFolder = by;
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
