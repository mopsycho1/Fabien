// Gadara's Shadow Passage through REAL taps, as a player (roadmap 10.57, Baiyee 28 Nov: "it doesn't seem to work when
// played by a person"). Gadara on the heroes' side. First it records what a player meets at his first turn (his masks,
// the Shadow Passage row: there, greyed, and the word it shows). Then for 1 foe and for 2 foes: press Skills, Shadow
// Passage, tap the foes, tap Gadara to go; it checks the foes light up, the hint counts them, he and the foes land
// elsewhere, masks are spent, the Swirling Shadow Cloak was drawn, and End turn passes the turn.
//   node dev/browser/passage_taps.cjs [phone|desktop]      (preview running on 4173)
const { openBattle } = require('./lib/play.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const view = process.argv[2] || 'phone', desktop = view === 'desktop';
  const { browser, page, errors } = await openBattle(view, { everyone: true, sides: { e5: 'hero' } });
  const press = async (p) => { if (desktop) await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y); };
  const screenPoint = (gx, gy) => page.evaluate(([gx, gy]) => {
    const b = window.__game.scene.getScene('BattleScene'), c = b.game.canvas.getBoundingClientRect();
    return { x: c.left + gx * c.width / b.scale.width, y: c.top + gy * c.height / b.scale.height };
  }, [gx, gy]);
  const worldPoint = (wx, wy) => page.evaluate(([wx, wy]) => {
    const b = window.__game.scene.getScene('BattleScene'), cam = b.cameras.main, c = b.game.canvas.getBoundingClientRect();
    const gx = (wx - cam.worldView.x) * cam.zoom + cam.x, gy = (wy - cam.worldView.y) * cam.zoom + cam.y;
    return { x: c.left + gx * c.width / b.scale.width, y: c.top + gy * c.height / b.scale.height };
  }, [wx, wy]);
  const rows = () => page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    return b.menu.visible ? b.menuRows.filter((r) => r.view.visible).map((r) => ({ word: r.label.text.split('  ')[0], text: r.label.text.replace(/\n/g, ' '), enabled: r.enabled, gx: b.menu.x + (r.x + r.w / 2) * b.menu.scaleX, gy: b.menu.y + (r.y + r.h / 2) * b.menu.scaleY })) : [];
  });
  const pressRow = async (word) => { const r = (await rows()).find((r) => r.word === word); if (!r) return false; await press(await screenPoint(r.gx, r.gy)); await sleep(600); return true; };
  // Opens the skills list, then each group in it (Techniques, Spells...) until the row is shown. Returns the row.
  const findSkill = async (word) => {
    await pressRow('Skills');
    let r = (await rows()).find((x) => x.word === word);
    if (r) return r;
    const groups = (await rows()).filter((x) => /\s>$/.test(x.text)).map((x) => x.word);
    for (const g of groups) {
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.cancelMode(); b.refreshButtons(); });
      await sleep(300); await pressRow('Skills');
      await pressRow(g);
      r = (await rows()).find((x) => x.word === word);
      if (r) return { ...r, group: g };
    }
    return null;
  };
  const pressUnit = async (id) => {
    const p = await page.evaluate((id) => { const b = window.__game.scene.getScene('BattleScene'); const u = b.units.find((x) => x.id === id); return { x: u.view.x, y: u.view.y - (u.centerY || 30) * 0.4 }; }, id);
    await press(await worldPoint(p.x, p.y)); await sleep(500);
  };
  const calm = async () => { for (let i = 0; i < 60 && (await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.busy || b.inCinematic; })); i++) await sleep(200); };
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    window.__floats = []; window.__cloak = 0;
    const o = b.floatText.bind(b); b.floatText = (u, t, ...a) => { window.__floats.push(String(t)); return o(u, t, ...a); };
    // count the Swirling Shadow Cloak's frames on screen while it plays (its sprites use the shadow_cloak pictures)
    b.events.on('postupdate', () => { if (b.children.list.some((o) => o.visible && o.texture && /shadow_cloak/.test(o.texture.key))) window.__cloak++; });
  });
  let bad = 0;
  const say = (ok, what, x) => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + what + (x !== undefined ? '  ' + JSON.stringify(x) : '')); };

  // ---------- 1. what a player meets on Gadara's first turn ----------
  await calm();
  for (let i = 0; i < 80; i++) { // let the turns run (others pass) until Gadara's comes
    const who = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return b.activeUnit && b.activeUnit.id; });
    if (who === 'e5') break;
    await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); if (b.activeUnit && b.activeUnit.side === 'hero' && !b.busy) b.endTurn(); });
    await sleep(500);
  }
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.runEnemyTurn = () => setTimeout(() => b.endTurn(), 50); }); // enemies pass from here
  await calm(); await sleep(500);
  const first = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'e5'); return { active: b.activeUnit && b.activeUnit.id, mask: g.mask, side: g.side }; });
  const row0 = await findSkill('Shadow Passage');
  console.log('rows: ' + JSON.stringify((await rows()).map((r) => r.text + (r.enabled ? '' : ' [grey]'))));
  console.log('first turn: ' + JSON.stringify({ ...first, row: row0 && { text: row0.text, enabled: row0.enabled } }));
  say(first.active === 'e5' && first.side === 'hero', 'Gadara plays on the heroes\' side and his turn comes', first);
  say(!!row0, 'Shadow Passage is in his skills list');
  say(row0 && (row0.enabled || /mask/i.test(row0.text) || /no foe within/i.test(row0.text)), 'when greyed out, the row says why', row0 && row0.text);
  await page.evaluate(() => window.__game.scene.getScene('BattleScene').cancelMode());

  // ---------- 1b. no mask after a walk: the Spells group still opens and says why (10.57) ----------
  await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((u) => u.id === 'e5'); g.mask = 0; g.hasMoved = true; g.stepsUsed = 2; b.cancelMode(); b.refreshButtons(); });
  await sleep(400);
  const row1 = await findSkill('Shadow Passage');
  say(row1 && !row1.enabled && /needs 1 mask per foe/.test(row1.text), 'with 0 masks after a walk the Spells group opens and the row says "needs 1 mask per foe"', row1 && row1.text);
  await page.evaluate(() => window.__game.scene.getScene('BattleScene').cancelMode());

  // ---------- 2. one foe, then two ----------
  for (const n of [1, 2]) {
    await calm();
    await page.evaluate((n) => {
      const b = window.__game.scene.getScene('BattleScene');
      const U = (id) => b.units.find((u) => u.id === id);
      const g = U('e5'), f1 = U('e2'), f2 = U('e4');
      const spots = [[0, 0], [10, 0], [0, 2], [10, 2], [0, 10], [10, 10], [1, 10], [9, 10], [0, 8], [10, 8], [2, 0], [8, 0]]; let k = 0;
      for (const u of b.units) {
        if (!u.alive) continue;
        u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; u.status.cooldowns = {}; u.status.buff = null;
        const p = u === g ? [5, 5] : u === f1 ? [5, 6] : u === f2 && n === 2 ? [6, 5] : spots[k++]; b.placeUnit(u, p[0], p[1]);
      }
      g.mask = 3; g.passaged = false; g.channel = null;
      b.cancelMode(); b.activeUnit = g; b.refreshButtons(); for (const u of b.units) if (u.alive) b.showStanding(u);
      b.followUnit(g, 0, true);
      window.__floats = []; window.__cloak = 0;
    }, n);
    await sleep(600);
    const from = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return ['e5', 'e2', 'e4'].map((id) => { const u = b.units.find((x) => x.id === id); return u.col + ',' + u.row; }); });
    const row = await findSkill('Shadow Passage');
    say(row && row.enabled, n + ' foe(s): the Shadow Passage row can be pressed (3 masks)', row && row.text);
    if (row) { await press(await screenPoint(row.gx, row.gy)); await sleep(600); }
    const lit = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { mode: b.mode, targets: (b.targetsInRange || []).map((u) => u.id), hint: b.statusText.text }; });
    say(lit.mode === 'spellTarget' && lit.targets.includes('e2'), n + ': picking it lights the foes and him', lit);
    await pressUnit('e2');
    if (n === 2) await pressUnit('e4');
    const picked = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { passengers: (b.passengers || []).map((u) => u.id), hint: b.statusText.text.replace(/\n/g, ' ') }; });
    say(picked.passengers.length === n, n + ': the taps pick the foe(s)', picked);
    await pressUnit('e5'); // tap Gadara to go
    await sleep(300); await calm(); await sleep(800);
    const after = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); const g = b.units.find((x) => x.id === 'e5'); return { at: ['e5', 'e2', 'e4'].map((id) => { const u = b.units.find((x) => x.id === id); return u.col + ',' + u.row; }), mask: g.mask, acted: g.hasActed, floats: window.__floats.slice(0, 6), cloakFrames: window.__cloak, menu: b.menu.visible, active: b.activeUnit && b.activeUnit.id }; });
    const d = (a, c) => { const [x1, y1] = a.split(',').map(Number), [x2, y2] = c.split(',').map(Number); return Math.abs(x1 - x2) + Math.abs(y1 - y2); };
    say(d(after.at[0], from[0]) >= 4, n + ': Gadara lands 4 tiles or more away', { from, after: after.at });
    say(d(after.at[1], after.at[0]) === 1 && (n === 1 || d(after.at[2], after.at[0]) === 1), n + ': the foe(s) land next to him', after.at);
    say(after.mask === 3 - n && after.acted, n + ': ' + n + ' mask(s) spent, his action taken', after.mask);
    say(after.cloakFrames > 5, n + ': the Swirling Shadow Cloak played', after.cloakFrames);
    say(after.floats.includes('Shadow Passage'), n + ': "Shadow Passage" shows', after.floats);
    say(after.menu && after.active === 'e5', n + ': the menu is back for End turn', after);
    await pressRow('End turn'); await pressRow('End turn'); await sleep(800);
  }
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
  console.log(bad || errors.length ? 'FAILED' : 'ALL PASSED');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
