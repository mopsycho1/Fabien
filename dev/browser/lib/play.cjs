// Shared helper for the browser checks that play a whole battle (roadmap 18.5):
// opens the game in a real browser, taps through the story into the battle, and
// starts a simple test player for the hero side (the enemy side plays itself).
// Used by dev/browser/battle.cjs (page errors) and dev/browser/jumps.cjs (jump logger).
const { chromium } = require('playwright');

// Opens the game and waits until the battle is on screen.
//   view : 'phone' (390 x 844, touch) or 'desktop' (1440 x 900, mouse)
// Gives back { browser, page, errors }; errors fills with every page error.
//   opts.everyone : true puts all seven fighters on the board (nobody sits out), for filming every skill
exports.openBattle = async function openBattle(view, opts = {}) {
  const desktop = view === 'desktop';
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(desktop
    ? { viewport: { width: 1440, height: 900 } }
    : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  if (opts.everyone) await page.addInitScript(() => { window.__bench = []; });
  const errors = [];
  page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
  await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const box = await page.locator('canvas').boundingBox();
  let inBattle = false;
  for (let i = 0; i < 60 && !inBattle; i++) {
    const x = box.x + box.width / 2, y = box.y + box.height * 0.8;
    if (desktop) await page.mouse.click(x, y); else await page.touchscreen.tap(x, y);
    await page.waitForTimeout(250);
    inBattle = await page.evaluate(() => window.__game.scene.isActive('BattleScene'));
  }
  if (!inBattle) { await browser.close(); throw new Error('the battle did not start'); }
  await page.waitForTimeout(2500);
  return { browser, page, errors };
};

// Starts the test player inside the page. It plays every hero turn: walks toward
// the nearest foe, tries each skill once, then a clash, then plain attacks.
// When the battle ends (or after maxMs) it sets window.__done.
// It also notes what is happening in window.__doing = { what, at } so the jump
// logger can say which move a jump belongs to.
exports.startPlayer = async function startPlayer(page, maxMs = 600000) {
  await page.evaluate((maxMs) => {
    const b = window.__game.scene.getScene('BattleScene');
    window.__doing = { what: 'start', at: performance.now() };
    const tag = (fn, name) => { const o = b[fn].bind(b); b[fn] = (...a) => { window.__doing = { what: name(a), at: performance.now() }; return o(...a); }; };
    tag('castSpell', (a) => a[2]); // the skill's id in spells.json
    tag('performAttack', () => 'attack');
    tag('moveUnit', () => 'walk');
    tag('knockBack', () => 'knockback');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
    const idle = async () => { const t = Date.now(); await sleep(150); while ((b.busy || b.inCinematic) && Date.now() - t < 15000) await sleep(50); };
    const tap2 = (t) => { b.handleTap(t.col, t.row); b.handleTap(t.col, t.row); };
    const used = {};
    (async () => {
      const t0 = Date.now();
      while (!b.battleOver && Date.now() - t0 < maxMs) {
        const u = b.activeUnit;
        if (u && u.side === 'hero' && !b.busy && !b.inCinematic) {
          const foes = b.units.filter((x) => x.alive && x.side === 'enemy');
          if (u.engagedWith) {
            // in a clash: pick the stance the game would pick, then wait for the turn to pass
            const turn = b.turnCount;
            b.onStance(b.autoStanceFor(u)); await idle();
            const t2 = Date.now(); while (b.turnCount === turn && !b.battleOver && Date.now() - t2 < 4000) await sleep(50);
            if (b.turnCount !== turn || b.battleOver) continue;
          } else {
            // walk toward the nearest foe when none is in reach
            if (foes.length && Math.min(...foes.map((f) => dist(u, f))) > u.range) {
              b.handleTap(u.col, u.row); await sleep(500);
              let best = null, bd = Math.min(...foes.map((f) => dist(u, f)));
              for (const k of b.reachableKeys || []) { const [c, r] = k.split(',').map(Number); const d = Math.min(...foes.map((f) => dist({ col: c, row: r }, f))); if (d < bd) { bd = d; best = [c, r]; } }
              if (best) { b.handleTap(best[0], best[1]); await idle(); } else b.handleTap(-1, -1);
            }
            // each skill once per hero, then a clash, then plain attacks
            let done = false;
            for (const id of u.spells || []) {
              if (done || used[u.label + id]) continue;
              b.onSpellButton(); await sleep(450);
              b.chooseSpell(id); await sleep(300);
              if (b.mode === 'spellTarget' && b.targetsInRange.length) {
                used[u.label + id] = true; await sleep(350);
                tap2(b.targetsInRange[0]); await idle(); done = u.hasActed;
              }
              if (!done) { b.cancelMode(); b.refreshButtons(); }
            }
            if (!done && !used[u.label + 'engage']) {
              b.onEngageButton();
              if (b.targetsInRange.length) { used[u.label + 'engage'] = true; tap2(b.targetsInRange[0]); await idle(); done = true; } else b.cancelMode();
            }
            if (!done) {
              b.onAttackButton();
              if (b.mode === 'attack' && b.targetsInRange.length) { await sleep(450); tap2([...b.targetsInRange].sort((a, c) => a.hp - c.hp)[0]); await idle(); } else b.cancelMode();
            }
          }
          if (!b.battleOver && b.activeUnit === u) b.onEndButton();
        }
        await sleep(80);
      }
      window.__done = true;
    })();
  }, maxMs);
};

// Waits for the player to finish, then gives back how the battle went.
exports.waitForEnd = async function waitForEnd(page, maxMs = 600000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs + 5000) {
    if (await page.evaluate(() => !!window.__done)) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(4000); // let the last blow and the result panel play
  return page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const left = (side) => b.units.filter((u) => u.alive && u.side === side).length;
    return { over: !!b.battleOver, turns: b.turnCount, heroesLeft: left('hero'), enemiesLeft: left('enemy') };
  });
};
