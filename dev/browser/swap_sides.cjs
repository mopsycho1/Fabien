// Any character on either side (20 Nov): in a real browser, on the real character select, put an enemy
// (Rabdul) on the heroes' side and an ex-hero (Gaha) on the enemies' side with taps, start the battle, and
// play a turn with each: the test player plays the hero-side Rabdul, the enemy AI plays the enemy-side Gaha.
//   node dev/browser/swap_sides.cjs <out dir> [phone|desktop|both]      (preview running on 4173)
// Checks: Test mode is on by default and its switch on the select works; both columns list everyone; each card
// has its home tag; a tap moves a character across; the battle puts each on the side it was picked for
// (side, facing, start tile on that side); each takes a real turn. Ends with ALL PASSED or FAILED.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.argv[2] || 'swap_out';
const which = process.argv[3] || 'both';
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };

async function run(view) {
  const desktop = view === 'desktop';
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(desktop ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = '[' + view + '] ';
  const press = async (p) => { if (desktop) await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y); await sleep(350); };
  // A card (id and column) or a labelled button: where it is on the page
  const find = (pred, side) => page.evaluate(({ pred, side }) => {
    const s = window.__game.scene.getScene('SelectScene'), c = s.game.canvas.getBoundingClientRect(), cam = s.cameras.main;
    const hits = [...(s.cardHits || []), s.startButton, ...s.layer.list.filter((o) => o.label)];
    const h = hits.find((o) => o && (side ? o.charId === pred && o.side === side : o.label === pred));
    if (!h) return null;
    // scroll it into view when it is off the screen
    let gy = h.y + h.height / 2 - cam.scrollY;
    if (gy < 0 || gy > s.scale.height) { cam.scrollY = Math.max(0, Math.min(s.maxScroll, h.y - s.scale.height / 2)); gy = h.y + h.height / 2 - cam.scrollY; }
    const gx = h.x + h.width / 2 - cam.scrollX;
    return { x: c.left + gx * c.width / s.scale.width, y: c.top + gy * c.height / s.scale.height };
  }, { pred, side });
  const tap = async (pred, side) => { const p = await find(pred, side); if (!p) return false; await press(p); return true; };
  const pick = () => page.evaluate(() => { const s = window.__game.scene.getScene('SelectScene'); return JSON.parse(JSON.stringify(s.pick)); });
  const same = (a, b) => [...a].sort().join() === [...b].sort().join();
  try {
    await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load', timeout: 120000 });
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload({ waitUntil: 'load' });
    await sleep(2500);
    const box = await page.locator('canvas').boundingBox();
    let onSelect = false;
    for (let i = 0; i < 240 && !onSelect; i++) {
      const x = box.x + box.width / 2, y = box.y + box.height * 0.3;
      if (desktop) await page.mouse.click(x, y); else await page.touchscreen.tap(x, y);
      await sleep(250);
      onSelect = await page.evaluate(() => window.__game.scene.isActive('SelectScene'));
    }
    check(tag + 'the story leads to the character select', onSelect);
    await sleep(800);

    // Test mode: on by default, and its switch is on this screen
    const label = () => page.evaluate(() => window.__game.scene.getScene('SelectScene').layer.list.filter((o) => o.type === 'Text' && /^Test mode/.test(o.text)).map((o) => o.text)[0]);
    check(tag + 'Test mode is on by default', /ON/.test(await label()) && await page.evaluate(() => localStorage.getItem('fabien.testMode') !== 'off'), await label());
    const cards = await page.evaluate(() => window.__game.scene.getScene('SelectScene').cardHits.map((h) => h.side + ':' + h.charId));
    const ids = require(path.join(__dirname, '../../src/data/units.json')).map((u) => u.id);
    check(tag + 'both columns list every character', ids.every((id) => cards.includes('hero:' + id) && cards.includes('enemy:' + id)), cards.length + ' cards');
    const tags = await page.evaluate(() => window.__game.scene.getScene('SelectScene').layer.list.filter((o) => o.homeSide).map((o) => o.text + ':' + o.homeSide));
    check(tag + 'each card shows its home side as a small tag', tags.length === ids.length * 2 && tags.every((t) => /^(HERO:hero|ENEMY:enemy)$/.test(t)), tags.length + ' tags');
    // the switch: Off locks the enemies, On frees them again
    await tap('Test mode');
    const lockedCards = await page.evaluate(() => window.__game.scene.getScene('SelectScene').cardHits.filter((h) => h.side === 'enemy').length);
    check(tag + 'the switch turns Test mode off (enemies locked)', /OFF/.test(await label()) && lockedCards === 0, await label() + ' / enemy cards ' + lockedCards);
    await tap('Test mode');
    check(tag + '...and on again', /ON/.test(await label()) && await page.evaluate(() => window.__game.scene.getScene('SelectScene').cardHits.some((h) => h.side === 'enemy')));

    // the swap: heroes Sudeen + Rabdul, enemies Archer + Gaha
    const def = await pick();
    check(tag + 'it starts on the default 4 v 4 without the kings', same(def.hero, ['h1', 'h2', 'h3', 'h4']) && def.enemy.length === 4 && !def.enemy.includes('e5'), JSON.stringify(def));
    for (const id of ['h2', 'h3', 'h4']) await tap(id, 'hero'); // heroes down to Sudeen
    await tap('e4', 'hero'); // Rabdul, an enemy, onto the heroes' side
    let now = await pick();
    check(tag + 'tapping Rabdul on the heroes\' side moves him over', same(now.hero, ['h1', 'e4']) && !now.enemy.includes('e4'), JSON.stringify(now));
    await tap('h2', 'enemy'); // Gaha, a hero, onto the enemies' side
    for (const id of ['e1', 'e2']) await tap(id, 'enemy');
    now = await pick();
    check(tag + 'tapping Gaha on the enemies\' side moves him over', same(now.hero, ['h1', 'e4']) && same(now.enemy, ['e3', 'h2']), JSON.stringify(now));
    await page.screenshot({ path: path.join(out, view + '_swap_select.png') });
    await tap('Start battle');
    let inBattle = false;
    for (let i = 0; i < 40 && !inBattle; i++) { await sleep(250); inBattle = await page.evaluate(() => window.__game.scene.isActive('BattleScene')); }
    check(tag + 'Start battle starts the battle', inBattle);
    await sleep(2500);

    // the battle: each on the side it was picked for
    const info = await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      return b.units.map((u) => ({ id: u.id, side: u.side, facing: u.facing, col: u.col, row: u.row }));
    });
    const by = Object.fromEntries(info.map((u) => [u.id, u]));
    check(tag + 'the battle has exactly those four', same(info.map((u) => u.id), ['h1', 'e4', 'e3', 'h2']), info.map((u) => u.id).join());
    check(tag + 'Rabdul is on the heroes\' side and faces the foes', by.e4 && by.e4.side === 'hero' && by.e4.facing === 'upRight', JSON.stringify(by.e4));
    check(tag + 'Gaha is on the enemies\' side and faces the heroes', by.h2 && by.h2.side === 'enemy' && by.h2.facing === 'downLeft', JSON.stringify(by.h2));
    const heroRows = info.filter((u) => u.side === 'hero').map((u) => u.row), enemyRows = info.filter((u) => u.side === 'enemy').map((u) => u.row);
    check(tag + 'each side starts on its own end of the board (no overlap, no shared tile)', Math.min(...heroRows) > Math.max(...enemyRows) && new Set(info.map((u) => u.col + ',' + u.row)).size === 4, 'heroes rows ' + heroRows + ', enemies rows ' + enemyRows);
    await page.screenshot({ path: path.join(out, view + '_swap_battle.png') });

    // a turn with each: record every turn, let the test player play the hero side (the AI plays the enemy side)
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      window.__turns = [];
      let at = null;
      const sv = b.startTurn.bind(b); b.startTurn = (...a) => { const r = sv(...a); const u = b.activeUnit; if (u) at = { id: u.id, col: u.col, row: u.row, hp: u.hp }; return r; };
      const ru = b.runEnemyTurn.bind(b); b.runEnemyTurn = (...a) => { if (b.activeUnit) window.__turns.push({ id: b.activeUnit.id, by: 'ai' }); return ru(...a); };
      const et = b.endTurn.bind(b);
      b.endTurn = (...a) => { const u = b.activeUnit; if (u && at && at.id === u.id && !b.battleOver) window.__turns.push({ id: u.id, side: u.side, moved: u.col !== at.col || u.row !== at.row, acted: !!u.hasActed, by: 'end' }); return et(...a); };
    });
    const { startPlayer } = require('./lib/play.cjs');
    await startPlayer(page, 150000);
    const t0 = Date.now();
    let turns = [];
    while (Date.now() - t0 < 140000) {
      turns = await page.evaluate(() => window.__turns);
      if (turns.some((t) => t.id === 'e4' && t.by === 'end') && turns.some((t) => t.id === 'h2' && t.by === 'end')) break;
      if (await page.evaluate(() => window.__game.scene.getScene('BattleScene').battleOver)) break;
      await sleep(1000);
    }
    const mine = (id) => turns.find((t) => t.id === id && t.by === 'end');
    check(tag + 'Rabdul (hero side) took a turn the player drives: he moved or acted', !!mine('e4') && mine('e4').side === 'hero' && (mine('e4').moved || mine('e4').acted), JSON.stringify(mine('e4')));
    check(tag + 'the enemy AI played Gaha (enemy side), who moved or acted', turns.some((t) => t.id === 'h2' && t.by === 'ai') && !!mine('h2') && mine('h2').side === 'enemy' && (mine('h2').moved || mine('h2').acted), JSON.stringify(mine('h2')));
    check(tag + 'the AI did not play Rabdul, and the player did not play Gaha', !turns.some((t) => t.id === 'e4' && t.by === 'ai') && !turns.some((t) => t.id === 'h2' && t.side === 'hero'));
    await page.screenshot({ path: path.join(out, view + '_swap_turns.png') });
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
