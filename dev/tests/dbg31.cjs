// Screenshots for the status art batch (30 Oct): icons over units, the small
// cards, Fury and Earth's Bulwark looks, the Engage and Items glyphs.
const { start, battle } = require('./boot.cjs');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('card:empower')) await sleep(50);
  const b = await battle(game); const G = w.__grid, S = w.__status, E = w.__engagement;
  const out = process.argv[2];
  const save = (n) => fs.writeFileSync(out + n + '.png', Buffer.from(game.canvas.toDataURL('image/png').split(',')[1], 'base64'));
  const cam = b.cameras.main;
  let focus = null;
  b.events.on('prerender', () => { if (!focus) return; const { units, zoom, dy } = focus; const x = units.reduce((s, u) => s + u.view.x, 0) / units.length, y = units.reduce((s, u) => s + u.view.y, 0) / units.length; cam.setZoom(zoom); cam.centerOn(x, y - dy); });
  const close = async (n, units, zoom = 2.0, dy = 50) => { focus = { units, zoom, dy }; await sleep(40); save(n); };
  const reset = () => { focus = null; cam.setZoom(1); cam.centerOn(360, 640); };
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  const PARK = [[7, 7], [7, 6], [0, 0], [1, 0], [7, 0], [6, 0]];
  const setup = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.fury = 0; u.charge = 0; u.bulwark = 0; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; put(u, ...PARK[i]); u.view.setAlpha(1); });
    for (const [u, c, r] of placed) put(u, c, r);
    for (const u of all) { b.faceNearestOpponent(u); b.showStanding(u); }
    b.refreshEngagementMarks(); b.refreshStatusTags(); b.busy = false; b.cancelMode();
  };
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  await sleep(900);

  // a. Fury lands on Gaha: his sequence, then Gaha's own Fury look
  setup([[layra, 2, 6], [gaha, 3, 5], [bull, 3, 2]]);
  layra.mp = layra.maxMp; b.activeUnit = layra;
  b.castSpell(layra, gaha, 'fury', () => {});
  await sleep(430); await close('a1_fury_cast', [gaha], 2.2, 60);
  await sleep(1400); console.log('gaha', gaha.sprite.texture.key, gaha.view.alpha, gaha.sprite.alpha, gaha.sprite.tintTopLeft, gaha.sprite.blendMode, gaha.view.list.map((o)=>o.type+':'+(o.texture?o.texture.key:'')+':'+o.alpha.toFixed(2)+':'+o.blendMode).join(' | ')); await close('a2_gaha_fury', [gaha], 2.4, 50); gaha.furyAura.objects[0].setVisible(false); await sleep(60); await close('a3_noring', [gaha], 2.4, 50); gaha.furyAura.objects[0].setVisible(true); gaha.furyAura.objects.slice(1).forEach((o)=>o.setVisible(false)); await sleep(60); await close('a4_nosparks', [gaha], 2.4, 50);
  reset();
  // b. Earth's Bulwark lands on Sudeen: his sequence, then the crystals
  setup([[layra, 2, 6], [sudeen, 3, 5], [bull, 3, 2]]);
  layra.mp = layra.maxMp; b.activeUnit = layra;
  b.castSpell(layra, sudeen, 'stone', () => {});
  await sleep(560); await close('b1_earth_cast', [sudeen], 2.2, 60);
  await sleep(1500); await close('b2_bulwark', [sudeen], 2.4, 50);
  reset();
  // c. Gaha rooted (down-right and up-left)
  setup([[gaha, 3, 5], [bull, 5, 6], [layra, 1, 1]]);
  S.applyBuff(gaha, 'stone'); gaha.status.rooted = { turnsLeft: 1 }; b.faceToward(gaha, 1, 1); b.showStanding(gaha); b.refreshStatusTags();
  await sleep(200); await close('c1_rooted', [gaha], 2.4, 50);
  b.faceToward(gaha, -1, -1); b.showStanding(gaha); await sleep(100); await close('c2_rooted_up', [gaha], 2.4, 50);
  reset();
  // d. a defeat: the Sigil Dissolve
  setup([[gaha, 3, 4], [bull, 4, 4]]);
  bull.hp = 0; b.defeat(bull); b.playDefeat(bull, 1);
  await sleep(380 + 520 + 250); await close('d1_dissolve', [bull], 2.2, 40);
  await sleep(350); await close('d2_dissolve', [bull], 2.2, 40);
  await sleep(500); await close('d3_dissolve', [bull], 2.2, 40);
  reset();
  // e. the card with the MP numbers (Layra, and Gaha with lent MP); the archer aiming
  setup([[layra, 2, 6], [archer, 4, 4], [gaha, 3, 5], [rabdul, 4, 1]]);
  layra.mp = 7; b.activeUnit = layra; b.cancelMode(); b.refreshCard(layra); b.refreshButtons();
  archer.aiming = { target: gaha }; b.showStanding(archer);
  await sleep(200); save('e1_layra_card');
  await close('e2_archer_aim', [archer, gaha], 2.0, 50);
  reset();
  S.applyBuff(gaha, 'swiftness'); b.activeUnit = gaha; b.refreshCard(gaha); await sleep(100); save('e3_gaha_card');
  console.log(errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | ') || 'no errors');
  w.close(); process.exit(0);
})();
