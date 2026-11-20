// Plays real hero turns the way a player does: every choice is a real mouse click
// (desktop, 1440 x 900) or a real finger tap (phone, 390 x 844) on the menu, the
// board and the figures. (15 Nov: the unit tests passed while no mouse click on the
// menu did anything, because they call the game's code directly. This test does not.)
//
//   node dev/browser/turn_clicks.cjs [phone|desktop|both]     (preview running on PORT, 4173)
//   GAME_URL=https://mopsycho1.github.io/Fabien/ node dev/browser/turn_clicks.cjs both
//
// What it checks, on each screen:
//   Turn 1: Thrust with no foe in reach says so; a tap on a blue tile walks there;
//           with a foe next to the hero, Engage starts choosing and the cancel tag
//           cancels; Thrust then a tap on the foe strikes it; End turn ends the turn.
//   Turn 2: Skills opens the list; a skill and its target are cast.
//   Turn 3: Items opens the list; a potion on the (hurt) hero is used.
//   The menu's grip drags the menu, and the spot is remembered on the device.
// The only things set up by code: a foe placed next to the hero, a hero hurt so a
// potion has a use, and the enemies passing their turns (so no clash gets in the way).
// Since 18.44 (20 Nov) the menu is HTML over the canvas: each tapped row is checked to be the HTML row.
// Ends with ALL PASSED or FAILED.
const { openBattle } = require('./lib/play.cjs');

const views = process.argv[2] === 'both' || !process.argv[2] ? ['desktop', 'phone'] : [process.argv[2]];
let failed = 0;
const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function playView(view) {
  const { browser, page, errors } = await openBattle(view);
  const desktop = view === 'desktop';
  const tag = '[' + view + '] ';
  try {
    const rowsSeen = new Set();
    // A real click or tap at a point on the page.
    const press = async (p) => { if (desktop) await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y); };

    // Watches (does not drive) what the game does: attacks, spells, items, walks.
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      window.__seen = [];
      for (const fn of ['performAttack', 'castSpell', 'useItem', 'moveUnit']) {
        const o = b[fn].bind(b);
        b[fn] = (...a) => { window.__seen.push(fn); return o(...a); };
      }
      // the enemies pass their turns (so the test sees only the heroes' buttons)
      b.runEnemyTurn = () => setTimeout(() => b.endTurn(), 50);
    });

    // Page coordinates of a point in the game's screen (the menu, the cancel tag) ...
    const screenPoint = (gx, gy) => page.evaluate(([gx, gy]) => {
      const b = window.__game.scene.getScene('BattleScene');
      const c = b.game.canvas.getBoundingClientRect();
      return { x: c.left + gx * c.width / b.scale.width, y: c.top + gy * c.height / b.scale.height };
    }, [gx, gy]);
    // ... and of a point on the board (seen through the board camera)
    const worldPoint = (wx, wy) => page.evaluate(([wx, wy]) => {
      const b = window.__game.scene.getScene('BattleScene');
      const cam = b.cameras.main, c = b.game.canvas.getBoundingClientRect();
      const gx = (wx - cam.worldView.x) * cam.zoom + cam.x, gy = (wy - cam.worldView.y) * cam.zoom + cam.y;
      return { x: c.left + gx * c.width / b.scale.width, y: c.top + gy * c.height / b.scale.height };
    }, [wx, wy]);

    // Where a menu row is on the page, found by its word (null when not shown)
    const rowAt = (word) => page.evaluate((word) => {
      const b = window.__game.scene.getScene('BattleScene');
      if (!b.menu.visible) return null;
      const r = b.menuRows.find((r) => r.view.visible && r.label.text.split('  ')[0] === word);
      if (!r) return null;
      return { gx: b.menu.x + (r.x + r.w / 2) * b.menu.scaleX, gy: b.menu.y + (r.y + r.h / 2) * b.menu.scaleY, enabled: r.enabled };
    }, word);
    const pressRow = async (word) => {
      const r = await rowAt(word);
      if (!r) return null;
      const p = await screenPoint(r.gx, r.gy);
      // 18.44: the menu is HTML over the canvas; what is under the finger must be that row
      const under = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); const row = el && el.closest('#fabien-hud .mrow'); return row ? row.dataset.word : (el ? el.tagName : 'nothing'); }, [p.x, p.y]);
      if (!rowsSeen.has(word)) { rowsSeen.add(word); check(under === word, tag + 'the HTML row "' + word + '" is what the tap lands on (' + under + ')'); }
      await press(p);
      await sleep(600);
      return r;
    };
    // The first enabled row of a list (skills or items), skipping Back
    const pressFirstEnabled = () => page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const r = b.menuRows.find((r) => r.view.visible && r.enabled && !/^Back/.test(r.label.text));
      return r ? { gx: b.menu.x + (r.x + r.w / 2) * b.menu.scaleX, gy: b.menu.y + (r.y + r.h / 2) * b.menu.scaleY, label: r.label.text } : null;
    });
    const state = () => page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = b.activeUnit;
      return { id: u && u.id, side: u && u.side, col: u && u.col, row: u && u.row, mode: b.mode, menu: b.menu.visible, busy: b.busy || b.inCinematic, msg: b.statusText ? b.statusText.text : '', seen: window.__seen.slice(), turn: b.turnCount };
    });
    // Waits until a hero may choose (menu up, nothing moving)
    const heroTurn = async () => {
      for (let i = 0; i < 160; i++) {
        const s = await state();
        if (s.side === 'hero' && s.menu && !s.busy) { await sleep(400); return s; }
        await sleep(250);
      }
      return null;
    };
    const idle = async () => { await sleep(300); for (let i = 0; i < 80; i++) { if (!(await state()).busy) return; await sleep(200); } };
    // A tap on a figure (its middle) or, for a tile, on the middle of that tile's top
    const pressUnit = async (id) => {
      const p = await page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id); return { x: u.view.x, y: u.view.y - (u.centerY || 30) * 0.6 }; }, id);
      await press(await worldPoint(p.x, p.y));
      await sleep(500);
    };
    const pressTile = async (col, row) => {
      // the middle of every board point that the game itself reads as this tile
      const p = await page.evaluate(([col, row]) => {
        const b = window.__game.scene.getScene('BattleScene');
        const v = b.cameras.main.worldView;
        let sx = 0, sy = 0, n = 0;
        for (let x = v.x; x < v.right; x += 6) for (let y = v.y; y < v.bottom; y += 6) {
          const t = b.tileAtPoint(x, y);
          if (t && t.col === col && t.row === row) { sx += x; sy += y; n++; }
        }
        return n ? { x: sx / n, y: sy / n } : null;
      }, [col, row]);
      if (!p) return false;
      await press(await worldPoint(p.x, p.y));
      await sleep(400);
      return true;
    };
    // Picks the first target of the current choice: a figure, or a tile. A second tap confirms.
    const pressFirstTarget = async () => {
      const t = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        const t = (b.targetsInRange || [])[0];
        if (!t) return null;
        return t.view ? { id: t.id } : { col: t.col, row: t.row };
      });
      if (!t) return false;
      for (let k = 0; k < 2; k++) {
        const s = await state();
        if (!['attack', 'engage', 'spellTarget', 'huskTile', 'approach', 'itemTarget'].includes(s.mode)) break;
        if (t.id) await pressUnit(t.id); else await pressTile(t.col, t.row);
      }
      return true;
    };
    const endTurn = async (who) => {
      const s = await state();
      if (s.id !== who || !s.menu) return true; // already over
      await pressRow('End turn');
      await idle();
      return (await state()).id !== who || (await state()).turn !== s.turn;
    };

    // ----- Turn 1: Thrust with nobody in reach, walk, Engage, Thrust, End turn -----
    let s = await heroTurn();
    check(!!s, tag + 'a hero turn starts with the menu up');
    if (!s) return;
    const hero = s.id;
    // push every foe out of reach first
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = b.activeUnit;
      const far = (f) => Math.abs(f.col - u.col) + Math.abs(f.row - u.row);
      for (const f of b.units) if (f.alive && f.side === 'enemy' && far(f) <= Math.max(2, u.range + 1)) {
        let best = null;
        for (let c = 0; c < 11; c++) for (let r = 0; r < 11; r++) if (!b.getUnitAt(c, r) && Math.abs(c - u.col) + Math.abs(r - u.row) > 6) { best = [c, r]; break; }
        if (best) b.placeUnit(f, best[0], best[1]);
      }
      b.cancelMode();
    });
    await sleep(300);
    check((await rowAt('Thrust')) !== null, tag + 'Thrust is on the menu');
    await pressRow('Thrust');
    s = await state();
    check(/No enemy in range/.test(s.msg) && s.mode !== 'attack', tag + 'Thrust with no foe in reach says "No enemy in range"');

    // walk: a blue tile, by a real tap
    const dest = await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const keys = [...(b.reachableKeys || [])].map((k) => k.split(',').map(Number)).filter(([c, r]) => !b.getUnitAt(c, r));
      const u = b.activeUnit;
      keys.sort((a, c) => (Math.abs(a[0] - u.col) + Math.abs(a[1] - u.row)) - (Math.abs(c[0] - u.col) + Math.abs(c[1] - u.row)));
      return keys.length ? keys[Math.min(1, keys.length - 1)] : null;
    });
    check(!!dest, tag + 'blue tiles to walk to');
    if (dest) {
      await pressTile(dest[0], dest[1]);
      if ((await state()).col !== dest[0] || (await state()).row !== dest[1]) await pressTile(dest[0], dest[1]); // a confirm tap, if the game asks
      await idle();
      s = await state();
      check(s.col === dest[0] && s.row === dest[1], tag + 'a tap on a blue tile walks there (' + dest + ')');
    }

    // a foe next to the hero
    const foe = await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = b.activeUnit;
      const f = b.units.find((x) => x.alive && x.side === 'enemy');
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = u.col + dc, r = u.row + dr;
        if (c >= 0 && r >= 0 && c < 11 && r < 11 && !b.getUnitAt(c, r) && Math.abs(b.getHeightAt ? b.getHeightAt(c, r) - b.getHeightAt(u.col, u.row) : 0) <= 1) {
          b.placeUnit(f, c, r); b.faceNearestOpponent && b.faceNearestOpponent(f); b.cancelMode(); return { id: f.id, hp: f.hp };
        }
      }
      return null;
    });
    check(!!foe, tag + 'a foe placed next to the hero');
    await sleep(500);
    const engage = await rowAt('Engage');
    if (engage && engage.enabled) {
      await pressRow('Engage');
      s = await state();
      check(['engage', 'approach'].includes(s.mode), tag + 'Engage starts choosing a foe (mode ' + s.mode + ')');
      // the cancel tag puts the choice away
      const pill = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.pill.visible ? { gx: b.pill.x + b.pillHit.width / 2, gy: b.pill.y + b.pillHit.height / 2 } : null; });
      if (pill) { await press(await screenPoint(pill.gx, pill.gy)); await sleep(500); }
      check(!['engage', 'approach'].includes((await state()).mode), tag + 'the cancel tag cancels Engage');
    } else check(!!engage, tag + 'Engage is on the menu');
    if (foe) {
      await pressRow('Thrust');
      s = await state();
      check(s.mode === 'attack', tag + 'Thrust with a foe in reach starts choosing (mode ' + s.mode + ')');
      await pressFirstTarget();
      await idle();
      s = await state();
      check(s.seen.includes('performAttack'), tag + 'a tap on the foe strikes it');
    }
    check(await endTurn(hero), tag + 'End turn ends the turn');

    // ----- Turn 2: a skill -----
    s = await heroTurn();
    check(!!s, tag + 'the next hero turn comes');
    if (!s) return;
    const hero2 = s.id;
    const before2 = s.seen.filter((x) => x === 'castSpell').length;
    if (!(await pressRow('Skills'))) await pressRow('Verses'); // a caster's skills are her Verses
    s = await state();
    check(s.mode === 'spell', tag + 'Skills opens the list (' + hero2 + ')');
    for (let k = 0; k < 3; k++) { // a group of skills opens another list
      s = await state();
      if (s.mode !== 'spell') break;
      const r = await pressFirstEnabled();
      if (!r) break;
      await press(await screenPoint(r.gx, r.gy));
      await sleep(600);
    }
    await pressFirstTarget();
    await idle();
    s = await state();
    check(s.seen.filter((x) => x === 'castSpell').length > before2, tag + 'a skill is cast by taps');
    check(await endTurn(hero2), tag + 'End turn after the skill');

    // ----- Turn 3: an item -----
    s = await heroTurn();
    if (!s) { check(false, tag + 'a third hero turn comes'); return; }
    const hero3 = s.id;
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.activeUnit; u.hp = Math.max(1, Math.round(u.maxHp * 0.4)); b.cancelMode(); });
    await sleep(300);
    await pressRow('Items');
    s = await state();
    check(s.mode === 'item', tag + 'Items opens the list (' + hero3 + ')');
    const r = await pressFirstEnabled();
    if (r) { await press(await screenPoint(r.gx, r.gy)); await sleep(600); }
    s = await state();
    if (s.mode === 'itemTarget') {
      // on the hero itself
      await pressUnit(hero3);
      if ((await state()).mode === 'itemTarget') await pressUnit(hero3);
    }
    await idle();
    s = await state();
    check(s.seen.includes('useItem'), tag + 'an item is used by taps (' + (r ? r.label : 'none') + ')');
    if ((await state()).id === hero3) check(await endTurn(hero3), tag + 'End turn after the item');

    // ----- The grip: drag the menu, and it is remembered -----
    s = await heroTurn();
    if (s) {
      const g = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { gx: b.menu.x + b.menuGripHit.width / 2, gy: b.menu.y + b.menuGripHit.y + b.menuGripHit.height / 2, mx: b.menu.x, my: b.menu.y }; });
      const from = await screenPoint(g.gx, g.gy), to = { x: from.x - 120, y: from.y - 160 };
      if (desktop) {
        await page.mouse.move(from.x, from.y); await page.mouse.down();
        for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + (to.x - from.x) * i / 8, from.y + (to.y - from.y) * i / 8);
        await page.mouse.up();
      } else {
        // a finger drag (Playwright has no touch drag, so the touch events are sent to the page)
        const cdp = await page.context().newCDPSession(page);
        const t = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y }] });
        await t('touchStart', from);
        for (let i = 1; i <= 8; i++) { await t('touchMove', { x: from.x + (to.x - from.x) * i / 8, y: from.y + (to.y - from.y) * i / 8 }); await sleep(16); }
        await t('touchEnd', to);
      }
      await sleep(400);
      const after = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { mx: b.menu.x, my: b.menu.y, saved: window.localStorage.getItem('fabien.menuPin') }; });
      check(after.mx < g.mx - 20 && after.my < g.my - 20, tag + 'the grip drags the menu');
      check(!!after.saved, tag + 'the spot is remembered on the device');
    }
    check(errors.length === 0, tag + 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
  } catch (e) {
    check(false, tag + 'test crashed: ' + e.message.split('\n')[0]);
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const v of views) await playView(v);
  console.log(failed ? 'FAILED (' + failed + ')' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
