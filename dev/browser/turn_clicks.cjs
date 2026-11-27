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
  // (the kings sit out: this checks taps and clicks with the heroes it was written for; their kits have n86, n87)
  const { browser, page, errors } = await openBattle(view, { noKings: true });
  const desktop = view === 'desktop';
  const tag = '[' + view + '] ';
  try {
    const rowsSeen = new Set();
    // A real click or tap at a point on the page.
    // 1.117 (27 Nov): a finger tap as a phone makes it: down, 110 ms, up. Then, when the tap began on the HUD, the
    // pretend mouse press and click an iPhone sends after a touch nobody cancelled (they put a just-picked skill away).
    const cdp = desktop ? null : await page.context().newCDPSession(page);
    const fingerTap = async (p, holdMs = 110) => {
      const onHud = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return !!(el && el.closest('#fabien-hud .fp')); }, [p.x, p.y]);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
      await sleep(holdMs);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      if (onHud) for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    };
    const press = async (p) => { if (desktop) await page.mouse.click(p.x, p.y); else await fingerTap(p); };

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
      // 1.111: the first tap lights the row and spends nothing; the second ends the turn
      await pressRow('End turn');
      const armed = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { armed: !!b.endArmed, same: b.activeUnit && b.activeUnit.id }; });
      check(armed.armed && armed.same === who, tag + 'a first tap on End turn only asks to confirm (1.111)');
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

    // ----- 1.70: the cancel tag and a tap on empty ground go back to the list, not out of the whole menu -----
    // (Suleiman 20 Nov on a phone: picking a skill and cancelling sent him back to the main menu every time)
    s = await heroTurn();
    if (s) {
      // (set-up only: Layra's turn, her Blessings list has a group, so "back" has somewhere to go)
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.name === 'Layra' && x.alive); if (!u) return; b.activeUnit = u; u.hasActed = false; b.busy = false; b.cancelMode(); b.refreshStatus(); b.refreshCard(u); });
      await sleep(500);
      await pressRow('Verses'); if (!(await state()).mode.startsWith('spell')) await pressRow('Skills');
      const group = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.menuRows.find((r) => r.view.visible && /^Blessings/.test(r.label.text)); return g ? { gx: b.menu.x + (g.x + g.w / 2) * b.menu.scaleX, gy: b.menu.y + (g.y + g.h / 2) * b.menu.scaleY } : null; });
      if (group) {
        await press(await screenPoint(group.gx, group.gy)); await sleep(500);
        const first = await pressFirstEnabled();
        await press(await screenPoint(first.gx, first.gy)); await sleep(600);
        let st = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { mode: b.mode, group: b.spellGroup, sel: b.selectedSpell }; });
        check(st.mode === 'spellTarget' && st.group === 'Blessings', tag + 'a skill picked: the list gives way to the cancel tag (' + JSON.stringify(st) + ')');
        const tagAt = () => page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.pill.visible ? { gx: b.pill.x + b.pillSize.w / 2, gy: b.pill.y + b.pillSize.h / 2 } : null; });
        const pill = await tagAt();
        if (pill) await press(await screenPoint(pill.gx, pill.gy));
        await sleep(600);
        st = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { mode: b.mode, group: b.spellGroup, sel: b.selectedSpell, shown: b.menu.visible, rows: b.menuRows.filter((r) => r.view.visible).map((r) => r.label.text.split('  ')[0]).join(',') }; });
        check(st.mode === 'spell' && st.group === 'Blessings' && st.shown && /Swiftness/.test(st.rows), tag + 'the cancel tag goes back to the same list, not to the main menu (1.70) ' + JSON.stringify(st));
        // the second skill is quick: pick again, then tap empty ground: back to the list again
        const again = await pressFirstEnabled();
        if (again) { await press(await screenPoint(again.gx, again.gy)); await sleep(600); }
        const empty = await screenPoint(8, 8); await press(empty); await sleep(600);
        st = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { mode: b.mode, group: b.spellGroup, rows: b.menuRows.filter((r) => r.view.visible).map((r) => r.label.text.split('  ')[0]).join(',') }; });
        check(st.mode === 'spell' && st.group === 'Blessings', tag + 'a tap on empty ground also goes back to the list (1.70) ' + JSON.stringify(st));
      }
      await page.evaluate(() => window.__game.scene.getScene('BattleScene').cancelMode());
      await sleep(300);
    }

    // ----- 1.117: a tap on a skill picks it and lights its targets at once; a hold shows its info only -----
    // (Suleiman 27 Nov, phone: "you have to hold the skill, then tap a fighter".) One skill of each kind, all by taps.
    const hudRow = (word) => page.evaluate((word) => {
      const el = [...document.querySelectorAll('#fabien-hud .fp.menu .mrow')].find((r) => r.getClientRects().length && !r.closest('.hide') && r.dataset.word.startsWith(word));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, word);
    const look = () => page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene');
      return { mode: b.mode, sel: b.selectedSpell, targets: (b.targetsInRange || []).map((t) => t.name || t.col + ',' + t.row), tiles: b.reachableKeys ? b.reachableKeys.size : 0, tip: !!(b.tip && b.tip.visible), casts: window.__seen.filter((x) => x === 'castSpell').length };
    });
    // the fighter "who" acts now, rested, with a foe "foeAt" tiles away and an ally next to him (set-up only)
    const setUp = (who, foeAt, hurt) => page.evaluate(([who, foeAt, hurt]) => {
      const b = window.__game.scene.getScene('BattleScene');
      const u = b.units.find((x) => x.name === who && x.alive);
      if (!u) return null;
      b.cancelMode();
      b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.mp = u.maxMp; u.cooldowns = {}; b.busy = false;
      const free = (c, r) => c >= 0 && r >= 0 && c < 11 && r < 11 && !b.getUnitAt(c, r) && !b.isBlocked(c, r);
      const near = (d, pick) => { for (const [dc, dr] of [[d, 0], [0, d], [-d, 0], [0, -d]]) if (free(u.col + dc, u.row + dr)) return pick(u.col + dc, u.row + dr); return null; };
      const foe = b.units.find((x) => x.alive && x.side === 'enemy');
      const ally = b.units.find((x) => x.alive && x.side === 'hero' && x !== u);
      if (foeAt && foe) near(foeAt, (c, r) => b.placeUnit(foe, c, r));
      if (ally) near(1, (c, r) => b.placeUnit(ally, c, r));
      if (hurt) u.hp = Math.max(1, Math.round(u.maxHp * 0.5));
      if (b.followUnit) b.followUnit(u, 0);
      b.cancelMode(); b.refreshStatus(); b.refreshCard(u);
      return { foe: foe && foe.id, ally: ally && ally.id, me: u.id };
    }, [who, foeAt, hurt]);
    const kinds = [
      { who: 'Gaha', open: 'Skills', skill: 'Spear Throw', on: 'foe', foeAt: 2 },
      { who: 'Layra', open: 'Verses', group: 'Blessings', skill: 'Swiftness', on: 'ally', foeAt: 5 },
      { who: 'Layra', open: 'Verses', skill: 'Husk', on: 'tile', foeAt: 5 },
      { who: 'Sudeen', open: 'Skills', skill: 'Herbs', on: 'self', foeAt: 5, hurt: true },
    ];
    let heldChecked = false;
    for (const k of kinds) {
      if (!(await heroTurn())) break;
      const ids = await setUp(k.who, k.foeAt, k.hurt);
      if (!ids) { check(false, tag + '1.117: ' + k.who + ' is on the board'); continue; }
      await sleep(900); // (the camera settles on him, the menu moves beside him)
      const name = k.who + "'s " + k.skill + ' (on ' + k.on + ')';
      let p = await hudRow(k.open);
      if (!p) { check(false, tag + '1.117: ' + k.open + ' on the menu for ' + k.who); continue; }
      await press(p); await sleep(250);
      let l = await look();
      check(l.mode === 'spell', tag + '1.117: one tap on ' + k.open + ' opens the list at once (' + l.mode + ')');
      if (!desktop && !heldChecked) { await sleep(500); l = await look(); check(!l.tip, tag + '1.117: no tooltip after a quick tap on ' + k.open); }
      if (k.group) { p = await hudRow(k.group); if (p) { await press(p); await sleep(250); } }
      p = await hudRow(k.skill);
      if (!p) { check(false, tag + '1.117: ' + k.skill + ' in the list'); continue; }
      if (!desktop && !heldChecked) {
        // a hold: the info only. Then a plain tap picks it.
        heldChecked = true;
        await fingerTap(p, 800);
        await sleep(150);
        l = await look();
        check(l.tip && l.mode === 'spell' && !l.sel, tag + '1.117: holding ' + k.skill + ' shows its info and does not pick it ' + JSON.stringify(l));
        p = await hudRow(k.skill);
      }
      await press(p); await sleep(300);
      l = await look();
      const lit = k.on === 'tile' ? l.mode === 'huskTile' && l.tiles > 0 : l.mode === 'spellTarget' && l.targets.length > 0;
      check(lit && !!l.sel, tag + '1.117: one tap on ' + name + ' picks it and lights its targets at once ' + JSON.stringify({ mode: l.mode, targets: l.targets.slice(0, 4), tiles: l.tiles }));
      await sleep(700); // (still picked a moment later: nothing put it away)
      l = await look();
      check(!!l.sel && (l.mode === 'spellTarget' || l.mode === 'huskTile'), tag + '1.117: ' + k.skill + ' still picked 0.7 s later (' + l.mode + ')');
      // the target, by taps (a second tap confirms where the game asks)
      const before = l.casts;
      for (let t = 0; t < 2; t++) {
        const m = (await look()).mode;
        if (m !== 'spellTarget' && m !== 'huskTile') break;
        if (k.on === 'tile') {
          const tile = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const k0 = [...b.reachableKeys][0]; return k0 ? k0.split(',').map(Number) : null; });
          if (tile) await pressTile(tile[0], tile[1]);
        } else await pressUnit(k.on === 'foe' ? ids.foe : k.on === 'ally' ? ids.ally : ids.me);
      }
      await idle();
      l = await look();
      check(l.casts > before, tag + '1.117: ' + name + ' cast by taps');
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); });
    }

    // ----- The grip: drag the menu, and it is remembered -----
    s = await heroTurn();
    if (s) {
      const g = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { gx: b.menu.x + b.menuGripHit.width / 2, gy: b.menu.y + b.menuGripHit.y + b.menuGripHit.height / 2, mx: b.menu.x, my: b.menu.y }; });
      const from = await screenPoint(g.gx, g.gy), toRight = g.mx < 100, to = { x: from.x + (toRight ? 120 : -120), y: from.y - 160 }; // (the slim menu can stand at the left edge: then drag right)
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
      check(Math.abs(after.mx - g.mx) > 20 && after.my < g.my - 20, tag + 'the grip drags the menu');
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
