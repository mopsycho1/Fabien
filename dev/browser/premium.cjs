// Premium pass (Phase 17): plays one full battle at phone size (390 x 844) with a simple
// test player and saves a screenshot at every key moment (turn start, move, attack, skill,
// clash, hit, death, result). Run with the preview up:  node dev/browser/premium.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/00_title.png` });
  const box = await page.locator('canvas').boundingBox();
  for (let i = 0; i < 40; i++) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(250);
    if (i === 3) await page.screenshot({ path: `${out}/01_story.png` });
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
  }
  await page.waitForTimeout(2500);
  // the test player, running inside the page; it notes each key moment in window.__ev
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    const ev = (window.__ev = []);
    const note = (name, delay) => ev.push({ name, at: performance.now() + (delay || 0) });
    const wrap = (fn, name, delays) => { const o = b[fn].bind(b); b[fn] = (...a) => { for (const d of delays) note(name + (a[0] && a[0].side ? '_' + a[0].side : ''), d); return o(...a); }; };
    wrap('startTurn', 'turn', [700]);
    wrap('moveUnit', 'move', [250]);
    wrap('performAttack', 'attack', [200, 500, 900]);
    wrap('showImpact', 'hit', [80, 260]);
    wrap('castSpell', 'skill', [300, 800, 1400]);
    wrap('playBeat', 'clash', [150, 600, 1000]);
    wrap('playDefeat', 'death', [200, 700, 1500]);
    wrap('showResultPanel', 'result', [1500]);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
    const idle = async () => { const t = Date.now(); await sleep(150); while ((b.busy || b.inCinematic) && Date.now() - t < 15000) await sleep(50); };
    const tap2 = (t) => { b.handleTap(t.col, t.row); b.handleTap(t.col, t.row); };
    const used = {};
    (async () => {
      const t0 = Date.now();
      while (!b.battleOver && Date.now() - t0 < 600000) {
        const u = b.activeUnit;
        if (u && u.side === 'hero' && !b.busy && !b.inCinematic) {
          const foes = b.units.filter((x) => x.alive && x.side === 'enemy');
          if (u.engagedWith) {
            const turn = b.turnCount;
            b.onStance(b.autoStanceFor(u)); await idle();
            const t2 = Date.now(); while (b.turnCount === turn && !b.battleOver && Date.now() - t2 < 4000) await sleep(50);
            if (b.turnCount !== turn || b.battleOver) continue;
          } else {
            // walk toward the nearest foe when none is in reach
            if (Math.min(...foes.map((f) => dist(u, f))) > u.range) {
              b.handleTap(u.col, u.row); note('moveRange', 150); await sleep(500);
              let best = null, bd = Math.min(...foes.map((f) => dist(u, f)));
              for (const k of b.reachableKeys) { const [c, r] = k.split(',').map(Number); const d = Math.min(...foes.map((f) => dist({ col: c, row: r }, f))); if (d < bd) { bd = d; best = [c, r]; } }
              if (best) { b.handleTap(best[0], best[1]); await idle(); } else b.handleTap(-1, -1);
            }
            // try each skill once per hero (so every skill gets a picture), then engage, then plain attacks
            let done = false;
            for (const id of u.spells || []) {
              if (done || used[u.label + id]) continue;
              b.onSpellButton(); note('skillMenu', 150); await sleep(450);
              b.chooseSpell(id); await sleep(300);
              if (b.mode === 'spellTarget' && b.targetsInRange.length) {
                used[u.label + id] = true; note('skillTarget', 100); await sleep(350);
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
              if (b.mode === 'attack' && b.targetsInRange.length) { note('attackTarget', 150); await sleep(450); tap2([...b.targetsInRange].sort((a, c) => a.hp - c.hp)[0]); await idle(); } else b.cancelMode();
            }
          }
          if (!b.battleOver && b.activeUnit === u) b.onEndButton();
        }
        await sleep(80);
      }
      window.__done = true;
    })();
  });
  // take a picture whenever a noted moment comes due (at most 4 of each kind, so the folder stays small)
  const seen = {}; let i = 0, n = 2; const t0 = Date.now();
  while (Date.now() - t0 < 600000) {
    const st = await page.evaluate((i) => ({ now: performance.now(), ev: window.__ev.slice(i), done: !!window.__done }), i);
    const due = st.ev.filter((e) => e.at <= st.now);
    if (due.length) {
      i += st.ev.findIndex((e) => e === due[due.length - 1]) + 1;
      const name = due[due.length - 1].name;
      seen[name] = (seen[name] || 0) + 1;
      if (seen[name] <= (/death|result/.test(name) ? 9 : 4)) await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}_${name}_${seen[name]}.png` });
    }
    if (st.done && !st.ev.length) break;
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}_end.png` });
  console.log(JSON.stringify({ shots: n, seen, errors: errors.slice(0, 5) }));
  await browser.close();
})();
