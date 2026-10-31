// Phase 2 of the Fabien Roadmap (29 Oct): the battle screen in Suleiman's UI art.
// Since Phase 8 (30 Oct evening) the frame is his minimal mockup look; the
// checks that still mean something (his icons, button states, MP rule) stay.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('ui:glyph_mute')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const U = (l) => b.units.find((u) => u.label === l);
  const gaha = U('H2'), layra = U('H3'), sudeen = U('H1');
  const icons = ['walk', 'sword', 'spear', 'lightning', 'crossed', 'star', 'hourglass', 'shield', 'run', 'gem', 'undo', 'redo', 'sound', 'mute'];
  check('2.1 his ring and medals are loaded', ['ring', 'medal_glow'].every((k) => game.textures.exists('ui:' + k)));
  check('2.2 all 14 of his icons are loaded (medal and symbol)', icons.every((n) => game.textures.exists('ui:icon_' + n) && game.textures.exists('ui:glyph_' + n)));
  const imgs = b.children.list.filter((o) => o.type === 'Image').map((o) => o.texture.key);
  check('8.2 the heavy Phase 2 frames are gone', !['ui:top', 'ui:bottom', 'ui:hint'].some((k) => imgs.includes(k)), imgs.filter((k) => k.startsWith('ui:')).join(','));
  check('2.2 sound and camera buttons use his icons', ['ui:icon_sound', 'ui:icon_undo', 'ui:icon_redo'].every((k) => imgs.includes(k)));
  const inCard = (key) => { const found = []; const walk = (c) => c.list.forEach((o) => (o.list ? walk(o) : found.push(o))); walk(b.cardLayer); return found.some((o) => o.texture && o.texture.key === key); };
  const strip = []; const walkS = (c) => c.list.forEach((o) => (o.list ? walkS(o) : strip.push(o))); walkS(b.turnStripLayer);
  check('2.1 the card portrait sits in his ring; the acting unit glows in his medal', inCard('ui:ring') && strip.some((o) => o.texture && o.texture.key === 'ui:medal_glow'));

  // a normal turn for Gaha
  b.runEnemyTurn = () => {}; let ended = false; b.endTurn = () => { ended = true; };
  b.activeUnit = gaha; gaha.hasActed = false; gaha.hasMoved = false; gaha.stepsUsed = 0; b.cancelMode(); b.refreshCard(gaha); b.refreshButtons();
  const [mv, atk] = b.slots;
  check('2.2 Move shows his walking man, Thrust his spear', mv.glyph.visible && mv.glyph.texture.key === 'ui:glyph_walk' && atk.glyph.texture.key === 'ui:glyph_spear', mv.glyph.texture.key + ' ' + atk.glyph.texture.key);
  check('2.3 a usable row is lit', mv.enabled && !mv.selected);
  b.onMoveButton();
  check('2.3 the action in use is highlighted', b.slots[0].selected);
  b.cancelMode();
  check('2.5 row 4 is Items | End turn: Items greyed for now, End turn live', b.lowHalves[0].label.text === 'Items' && !b.lowHalves[0].enabled && b.lowHalves[1].label.text === 'End turn' && b.lowHalves[1].enabled && !b.slots[3].view.visible);
  b.lowHalves[1].hit.emit('pointerdown'); await sleep(100);
  check('2.5 tapping End turn ends the turn', ended);
  const cardText = () => { const t = []; const walk = (c) => c.list.forEach((o) => (o.list ? walk(o) : o.type === 'Text' && t.push(o.text))); walk(b.cardLayer); return t.join(' '); };
  check('2.4 Gaha has no MP line on his card', !/\bMP\b/.test(cardText()), cardText());
  b.activeUnit = layra; layra.hasActed = false; b.cancelMode(); b.refreshCard(layra); b.refreshButtons();
  check('2.4 Layra keeps hers', /MP 12\/12/.test(cardText()));
  check('2.2 Layra\'s Lightning shows his lightning bolt', b.slots[1].glyph.texture.key === 'ui:glyph_lightning');
  b.activeUnit = sudeen; sudeen.hasActed = true; b.cancelMode(); b.refreshButtons();
  check('2.3 after acting, the attack row is greyed', !b.slots[1].enabled);
  // every visible word fits on its button
  const all = [...b.slots, ...b.halves, ...b.lowHalves].filter((s) => s.view.visible);
  check('every word fits on its row (before its cost)', all.every((s) => s.word.x + s.word.width <= s.x + s.w - (s.cost.text ? s.cost.width + 4 : 0) + 0.5), all.map((s) => s.label.text + ':' + Math.round(s.word.width)).join(' '));
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
