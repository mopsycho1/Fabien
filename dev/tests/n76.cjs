// 16 Nov: three jobs in one test.
//   6.62  the clash GIFs (Gaha against the Bull Commander) shown as framed panels when their clash opens
//   1.54  Tayo no longer turns into his old, smaller self (the old Earth Drive pictures, a Fire battle stance with no size)
//   6.63  Kofi's four drawn spell effects: Renewal's halo and spiral, Haunt's smoke, his spirit comet, sized by the 6.64 rule
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n76.cjs
const { start, battle } = require('./boot.cjs');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const readJson = (p) => JSON.parse(fs.readFileSync(__dirname + '/../../' + p, 'utf8'));
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), sudeen = U('h1'), layra = U('h3'), kofi = U('h4'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 12000) await sleep(30); await sleep(80); };
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.mp = u.maxMp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.alive = true; u.hidden = false; }
    put(sudeen, 0, 10); put(layra, 1, 10); put(gaha, 5, 5); put(kofi, 8, 8); put(tayo, 10, 0); put(archer, 9, 0); put(rabdul, 8, 0); put(bull, 5, 4);
    b.busy = false; b.cancelMode(); b.refreshEngagementMarks(); b.refreshStatusTags();
  };
  const images = (prefix) => b.children.list.filter((o) => o.texture && o.texture.key && o.texture.key.startsWith(prefix));

  // ================= 6.62 the clash GIFs =================
  const cg = readJson('src/data/clashGifs.json');
  check('three clash GIFs with his frame counts and delays: dance 9 x 140, strike 8 x 150, duel 6 x 150', cg.gifs.dance.frames === 9 && cg.gifs.dance.ms === 140 && cg.gifs.strike.frames === 8 && cg.gifs.strike.ms === 150 && cg.gifs.duel.frames === 6 && cg.gifs.duel.ms === 150);
  const missing = []; for (const [n, g] of Object.entries(cg.gifs)) for (let i = 1; i <= g.frames; i++) if (!fs.existsSync(__dirname + '/../../public/art/clashgif/' + n + '_' + i + '.jpg')) missing.push(n + '_' + i);
  check('every frame file is there', missing.length === 0, missing.join(' '));
  for (let i = 0; i < 40 && !(b.textures.exists('clashgif:dance:9') && b.textures.exists('clashgif:strike:8') && b.textures.exists('clashgif:duel:6')); i++) await sleep(250);
  check('the 23 frames load in the background once a battle has Gaha and the Bull', b.textures.exists('clashgif:dance:9') && b.textures.exists('clashgif:strike:8') && b.textures.exists('clashgif:duel:6'));
  // the window: as tall as the clash banners, never wider than 94 percent of the screen, and it keeps his picture's shape
  const CG = require('./cg-bundle.cjs');
  for (const lay of [{ W: 720, H: 1558, portrait: true }, { W: 1152, H: 720, portrait: false }, { W: 600, H: 400, portrait: false }]) {
    for (const name of ['dance', 'strike', 'duel']) {
      const win = CG.panelWindow(lay, name); const g = cg.gifs[name];
      const bannerH = lay.H * (lay.portrait ? 0.3 : 0.52);
      check('window ' + lay.W + 'x' + lay.H + ' ' + name + ': inside the screen, not taller than the banners, his shape kept', win.w <= lay.W * 0.94 + 0.5 && win.h <= bannerH + 0.5 && Math.abs(win.w / win.h - g.w / g.h) < 0.01, Math.round(win.w) + ' x ' + Math.round(win.h));
    }
  }
  check('only Gaha against the Bull Commander has a clash GIF', CG.hasClashGif(gaha, bull) && CG.hasClashGif(bull, gaha) && !CG.hasClashGif(sudeen, bull) && !CG.hasClashGif(gaha, tayo));
  // the three take turns: never the same one twice in a row
  b.speed.base = 1;
  let same = 0, last = null; const seen = new Set();
  for (let i = 0; i < 30; i++) { const n = CG.pickClashGif(b); if (n === last) same++; last = n; seen.add(n); }
  check('the three take turns, never one twice in a row', same === 0 && seen.size === 3, [...seen].join());
  // the real opening of a clash: the panel plays after the banners, then the clash goes on
  park(); put(gaha, 5, 5); put(bull, 5, 4);
  let done = false, panelSeen = null; const t0 = Date.now();
  b.clashBanner(gaha, bull, () => { done = true; });
  const watch = setInterval(() => { const im = images('clashgif:'); if (im.length && !panelSeen) panelSeen = { key: im[0].texture.key, w: im[0].displayWidth, h: im[0].displayHeight, t: Date.now() - t0 }; }, 50);
  while (!done && Date.now() - t0 < 9000) await sleep(40);
  clearInterval(watch);
  check('a panel shows during the clash opening for Gaha against the Bull', !!panelSeen, panelSeen && panelSeen.key + ' after ' + panelSeen.t + ' ms');
  check('the clash opening carries on after the panel', done && images('clashgif:').length === 0);
  check('the panel is in the clash window', !!panelSeen && panelSeen.h <= b.lay.H * (b.lay.portrait ? 0.3 : 0.52) + 1 && panelSeen.w <= b.lay.W * 0.94 + 1, panelSeen && Math.round(panelSeen.w) + 'x' + Math.round(panelSeen.h));
  // another pair: no panel
  done = false; let other = false; const t1 = Date.now();
  b.clashBanner(sudeen, bull, () => { done = true; });
  const watch2 = setInterval(() => { if (images('clashgif:').length) other = true; }, 50);
  while (!done && Date.now() - t1 < 9000) await sleep(40);
  clearInterval(watch2);
  check('another pair (Sudeen against the Bull) has no panel', done && !other);
  // fast speed: the cut-in is skipped, the clash is not slowed
  b.speed.base = 8; done = false; other = false; const t2 = Date.now();
  b.clashBanner(gaha, bull, () => { done = true; });
  const watch3 = setInterval(() => { if (images('clashgif:').length) other = true; }, 50);
  while (!done && Date.now() - t2 < 9000) await sleep(40);
  clearInterval(watch3); b.speed.base = 1;
  check('at fast speed there is no panel', done && !other);

  // ================= 1.54 Tayo =================
  const art = readJson('src/data/art.json').e1;
  const files = JSON.stringify(art, (k, v) => (k === 'ruler' || k.startsWith('note') ? undefined : v)); // (the notes may name the old files)
  check('no picture of his old 29 Oct Earth Drive is in his art any more', !/tayo_drive_/.test(files) && !(art.moves && art.moves.earthDrive));
  const same2 = (f) => (art.ruler[f] || {}).scale || 1;
  const pairs = [['tayo_n6b_battle_f', 'tayo_n6b_battleFire_f'], ['tayo_n6b_punch_f', 'tayo_n6b_punchFire_f']];
  const bad = []; for (const [plain, fire] of pairs) for (let i = 1; i <= 4; i++) if (Math.abs(same2(plain + i + '.png') - same2(fire + i + '.png')) > 0.1) bad.push(fire + i + ' ' + same2(fire + i + '.png') + ' vs ' + same2(plain + i + '.png'));
  check('his Enchanted battle stance and punch are drawn at the size of the plain ones (no 15 percent jump when he is Enchanted)', bad.length === 0, bad.join('; '));
  // drawn height of the stance with and without the Enchant, side by side
  park(); put(tayo, 5, 5); put(gaha, 5, 7); b.showStanding(tayo); const calmH = tayo.sprite.height * tayo.sprite.scaleX;
  const alertPlain = (() => { b.showStanding(tayo); return tayo.sprite.height * tayo.sprite.scaleX; })();
  St.applyEnchant(tayo, 'enchant', false); b.showStanding(tayo); const alertFire = tayo.sprite.height * tayo.sprite.scaleX;
  check('alert, plain and Enchanted: his height differs by less than 8 percent', Math.abs(alertFire / alertPlain - 1) < 0.08, Math.round(alertPlain) + ' vs ' + Math.round(alertFire));
  tayo.status.enchant = null;
  // Earth Drive plays on his current sheet and leaves him standing at his own size
  park(); put(tayo, 5, 5); put(gaha, 5, 6); const seenKeys = new Set(); const iv = setInterval(() => seenKeys.add(tayo.sprite.texture.key), 20);
  const sizeBefore = tayo.artScale; b.busy = true;
  b.castEarthDrive(tayo, gaha, { name: 'Earth Drive', color: '#d9a066', damageShare: 0.5, push: 1, turns: 2 }, () => { b.busy = false; }); await idle(); await sleep(900); clearInterval(iv);
  check('Earth Drive shows the arms drawn back and the punch of his current sheet', [...seenKeys].some((k) => /blastWind/.test(k)) && [...seenKeys].some((k) => /n6b_punch/.test(k)) && ![...seenKeys].some((k) => /tayo_drive/.test(k)), [...seenKeys].map((k) => k.replace('e1:tayo_', '')).join(','));
  check('and he is back at his standing size afterwards', Math.abs(tayo.sprite.scaleX / tayo.artScale - 1) < 0.04 && /n6b_(stand|battle)/.test(tayo.sprite.texture.key), tayo.sprite.texture.key);
  for (const spike of b.spikes.splice(0)) { if (spike.view && spike.view.destroy) spike.view.destroy(); }

  // ================= 6.63 Kofi's effects =================
  const slots = readJson('src/data/fxSlots.json');
  check('Kofi\'s slots: Renewal 8 loop frames at 140 ms and an 8 frame cast at 160 ms, Haunt 8 loop frames at 150 ms, the comet 8 frames at 120 ms', slots.buffs.renewal.loop === 8 && slots.buffs.renewal.loopMs === 140 && slots.buffs.renewal.cast === 8 && slots.buffs.renewal.castMs === 160 && slots.buffs.haunt.loop === 8 && slots.buffs.haunt.loopMs === 150 && slots.spells.spirit_bolt.frames === 8 && slots.spells.spirit_bolt.frameMs === 120);
  check('the pictures are loaded', b.textures.exists('fx:buff_renewal_loop_0') && b.textures.exists('fx:buff_renewal_cast_7') && b.textures.exists('fx:buff_haunt_loop_7') && b.textures.exists('fx:sfx_spirit_bolt_7'));
  // sized by the 6.64 rule: the drawn effect is k body heights tall
  const drawnH = (sprite, fit) => sprite.scaleY * fit.h;
  park(); put(kofi, 3, 8);
  St.applyBuff(sudeen, 'renewal', 1); b.refreshStatusTags();
  const ren = sudeen.drawnAura_renewal && sudeen.drawnAura_renewal.objects[0];
  check('a unit under Renewal carries the droplet halo', !!ren && ren.texture.key.startsWith('fx:buff_renewal_loop'));
  const body = (u) => u.topY - 12;
  check('the halo is 1.0 body height tall (6.64), on the body', !!ren && Math.abs(drawnH(ren, slots.buffs.renewal.fit.loop) / (1.0 * body(sudeen)) - 1) < 0.03, ren && Math.round(drawnH(ren, slots.buffs.renewal.fit.loop)) + ' vs ' + Math.round(1.0 * body(sudeen)));
  // a smaller and a bigger fighter get the same proportion
  St.applyBuff(layra, 'renewal', 1); b.refreshStatusTags(); const ren2 = layra.drawnAura_renewal && layra.drawnAura_renewal.objects[0];
  check('another fighter gets the same proportion', !!ren2 && Math.abs(drawnH(ren2, slots.buffs.renewal.fit.loop) / (1.0 * body(layra)) - 1) < 0.03);
  sudeen.status.buff = null; layra.status.buff = null; b.refreshStatusTags();
  check('the halo goes when Renewal ends', !sudeen.drawnAura_renewal && !layra.drawnAura_renewal);
  // the spiral at the start of the turn's heal
  park(); St.applyBuff(sudeen, 'renewal', 1); sudeen.hp = sudeen.maxHp - 10; b.refreshStatusTags();
  const before = images('fx:buff_renewal_cast').length; b.renewalTick(sudeen); await sleep(150);
  check('each Renewal heal plays his healing spiral on the unit', images('fx:buff_renewal_cast').length > before || images('fx:buff_renewal_cast').length > 0);
  const spiral = images('fx:buff_renewal_cast')[0];
  check('the spiral is 1.3 body heights tall, its base on the feet', !!spiral && Math.abs(drawnH(spiral, slots.buffs.renewal.fit.cast) / (1.3 * body(sudeen)) - 1) < 0.03);
  await sleep(1700);
  // Haunt: the comet, then the smoke at the foot of the mark, and the smoke stays while it lasts
  park(); put(kofi, 5, 8); put(bull, 5, 5); kofi.lastRead = null;
  const oldComets = new Set(images('fx:sfx_spirit_bolt'));
  b.busy = true; b.castHaunt(kofi, bull, JSON.parse(fs.readFileSync(__dirname + '/../../src/data/spells.json', 'utf8')).haunt, () => { b.busy = false; });
  let hauntComet = false; for (let i = 0; i < 40 && !hauntComet; i++) { await sleep(40); hauntComet = images('fx:sfx_spirit_bolt').some((o) => !oldComets.has(o)); }
  await sleep(700);
  check('Haunt sends his teal spirit comet', hauntComet);
  const smoke = bull.drawnAura_haunt && bull.drawnAura_haunt.objects[0];
  check('the haunted foe stands in his Haunt smoke', !!smoke && smoke.texture.key.startsWith('fx:buff_haunt_loop'));
  check('the smoke is 1.2 body heights tall, its base on the feet', !!smoke && Math.abs(drawnH(smoke, slots.buffs.haunt.fit.loop) / (1.2 * body(bull)) - 1) < 0.03);
  await idle();
  bull.status.poison = null; b.refreshStatusTags();
  check('the smoke goes when the mark is gone', !bull.drawnAura_haunt);
  // the Tide Bolt is the comet too, with no orb and no strike
  park(); put(kofi, 2, 3); put(bull, 2, 6); kofi.lastRead = null;
  const variant = readJson('src/data/spells.json').spiritBoltWater;
  const names = b.drawnSpell(variant);
  check('Kofi\'s Tide Bolt is drawn with the spirit comet, no orb, no strike', !!names && names.beam === 'spirit_bolt' && names.orb === null && names.strike === null, JSON.stringify(names));
  check('Layra\'s Lightning is still the old pieces (Kofi\'s other bolts are the tinted comet since 1.55, see n77)', b.drawnSpell(null).beam === 'lightning_bolt' && b.drawnSpell(readJson('src/data/spells.json').spiritBoltFire).beam === 'spirit_bolt_fire');
  check('the Tide Bolt gathers for the plain channel time (no orb of his to wait for)', b.channelLead(kofi, bull, variant) > 0 && b.channelLead(kofi, bull, variant) !== slots.spells.lightning_orb.lead, b.channelLead(kofi, bull, variant));
  b.busy = true; bull.evade = -500; kofi.accuracy = 500;
  const cometsBefore = new Set(images('fx:sfx_spirit_bolt'));
  b.performAttack(kofi, bull, () => { b.busy = false; });
  let comets = null; for (let i = 0; i < 60 && !comets; i++) { await sleep(40); comets = images('fx:sfx_spirit_bolt').find((o) => !cometsBefore.has(o)) || null; }
  check('a Tide Bolt flies as the comet', !!comets);
  check('the comet is about 0.8 of a tile thick (6.64)', !!comets && comets.scaleY * slots.spells.spirit_bolt.fit.h > 20 && comets.scaleY * slots.spells.spirit_bolt.fit.h < 90, comets && Math.round(comets.scaleY * slots.spells.spirit_bolt.fit.h));
  await idle(); await sleep(600);

  const realErr = errors.filter((e) => !e.includes('focus()'));
  check('no errors', realErr.length === 0, realErr.slice(0, 2).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
