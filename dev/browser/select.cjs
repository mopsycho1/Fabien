// The character select (roadmap 18.30), in a real browser: taps through the story to the select screen, photographs
// it, picks a line-up by tapping cards (Heroes: Gaha and Layra; Enemies: Tayo and the Archer), presses Start battle
// and checks the battle has exactly those four. Then reloads and checks the line-up was remembered, and that
// "Reset to default" brings back the map's 4 v 4. Phone and desktop.
// (Both columns list every character since 20 Nov; a card id like h1 is looked for in its home column here.
// Swapping sides is checked by swap_sides.cjs.)
//   node dev/browser/select.cjs <out dir> [phone|desktop|both]      (preview running on 4173)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.argv[2] || 'select_out';
const which = process.argv[3] || 'both';
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };

async function toSelect(page, desktop) {
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 240; i++) {
    if (await page.evaluate(() => window.__game.scene.isActive('SelectScene'))) return true;
    const x = box.x + box.width / 2, y = box.y + box.height * 0.3; // tap high up, away from where the select's buttons will be
    if (desktop) await page.mouse.click(x, y); else await page.touchscreen.tap(x, y);
    await sleep(250);
  }
  return false;
}

async function run(view) {
  const desktop = view === 'desktop';
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(desktop ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = '[' + view + '] ';
  const press = async (p) => { if (desktop) await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y); await sleep(350); };
  // where a card or button is on the page (its middle)
  const spot = (pred) => page.evaluate((pred) => {
    const s = window.__game.scene.getScene('SelectScene'), c = s.game.canvas.getBoundingClientRect(), cam = s.cameras.main;
    const hits = [...(s.cardHits || []), s.startButton, ...s.layer.list.filter((o) => o.label)];
    const h = hits.find((o) => o && ((o.charId === pred && (!o.side || o.side === (pred[0] === 'e' ? 'enemy' : 'hero'))) || o.label === pred));
    if (!h) return null;
    const gx = h.x + h.width / 2 - cam.scrollX, gy = h.y + h.height / 2 - cam.scrollY;
    return { x: c.left + gx * c.width / s.scale.width, y: c.top + gy * c.height / s.scale.height, inView: gy > 0 && gy < s.scale.height };
  }, pred);
  const tapThing = async (pred) => {
    let p = await spot(pred);
    if (p && !p.inView) { await page.evaluate((pred) => { const s = window.__game.scene.getScene('SelectScene'); const h = [...s.cardHits, s.startButton, ...s.layer.list.filter((o) => o.label)].find((o) => o && ((o.charId === pred && (!o.side || o.side === (pred[0] === 'e' ? 'enemy' : 'hero'))) || o.label === pred)); s.cameras.main.scrollY = Math.max(0, Math.min(s.maxScroll, h.y - s.scale.height / 2)); }, pred); await sleep(200); p = await spot(pred); }
    if (!p) return false;
    await press(p); return true;
  };
  const pick = () => page.evaluate(() => { const s = window.__game.scene.getScene('SelectScene'); return JSON.stringify(s.pick); });
  try {
    await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load', timeout: 120000 });
    await page.evaluate(() => { try { localStorage.removeItem('fabien.lineup'); localStorage.removeItem('fabien.testMode'); } catch (e) {} });
    await page.reload({ waitUntil: 'load' });
    await sleep(2500);
    check(tag + 'the story leads to the character select', await toSelect(page, desktop));
    await sleep(800);
    const def = JSON.parse(await pick());
    check(tag + 'it starts on the map\'s 4 v 4', def.hero.length === 4 && def.enemy.length === 4, JSON.stringify(def));
    const cards = await page.evaluate(() => window.__game.scene.getScene('SelectScene').cardHits.map((h) => h.charId));
    const units = require(path.join(__dirname, '../../src/data/units.json')).map((u) => u.id);
    check(tag + 'every character in units.json has a card', units.every((id) => cards.includes(id)), cards.join(','));
    await page.screenshot({ path: path.join(out, view + '_select_default.png') });
    // a full side refuses a fifth; take some out, put the wanted ones in
    for (const id of ['h1', 'h4']) await tapThing(id); // heroes: take out Sudeen and Kofi -> Gaha, Layra
    for (const id of ['e4', 'e2']) await tapThing(id); // enemies: take out Rabdul and the bull -> Tayo, Archer
    const now = JSON.parse(await pick());
    check(tag + 'tapping cards takes them out', now.hero.sort().join() === 'h2,h3' && now.enemy.sort().join() === 'e1,e3', JSON.stringify(now));
    await tapThing('h1'); await tapThing('h1'); // in and out again
    check(tag + 'a second tap takes a card back out', JSON.parse(await pick()).hero.sort().join() === 'h2,h3');
    await page.screenshot({ path: path.join(out, view + '_select_picked.png') });
    await tapThing('Start battle');
    let inBattle = false;
    for (let i = 0; i < 40 && !inBattle; i++) { await sleep(250); inBattle = await page.evaluate(() => window.__game.scene.isActive('BattleScene')); }
    check(tag + 'Start battle starts the battle', inBattle);
    await sleep(2500);
    const fielded = await page.evaluate(() => window.__game.scene.getScene('BattleScene').units.map((u) => u.id).sort().join());
    check(tag + 'the battle has exactly that line-up', fielded === 'e1,e3,h2,h3', fielded);
    await page.screenshot({ path: path.join(out, view + '_battle.png') });
    // remembered on the device, and Reset to default
    await page.reload({ waitUntil: 'load' }); await sleep(2500);
    await toSelect(page, desktop); await sleep(800);
    const again = JSON.parse(await pick());
    check(tag + 'the line-up is remembered after a reload', again.hero.sort().join() === 'h2,h3' && again.enemy.sort().join() === 'e1,e3', JSON.stringify(again));
    await tapThing('Reset to default');
    const reset = JSON.parse(await pick());
    check(tag + 'Reset to default brings back the 4 v 4', reset.hero.length === 4 && reset.enemy.length === 4, JSON.stringify(reset));
    // words big enough (11 real pixels, checklist D4)
    const small = await page.evaluate(() => { const s = window.__game.scene.getScene('SelectScene'); const k = s.game.canvas.getBoundingClientRect().height / s.scale.height; return s.layer.list.filter((o) => o.type === 'Text').map((t) => ({ t: t.text, px: parseFloat(t.style.fontSize) * t.scaleY * k })).filter((o) => o.px < 11).map((o) => o.t.slice(0, 20) + ' ' + o.px.toFixed(1)); });
    check(tag + 'every word is 11 real pixels or more', small.length === 0, small.slice(0, 4).join(' | '));
  } finally {
    check(tag + 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }
}

(async () => {
  for (const v of which === 'both' ? ['phone', 'desktop'] : [which]) await run(v);
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
