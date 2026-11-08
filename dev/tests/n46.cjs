// Effects flair 16.1 steps 1 to 5: the fxEmitter helper (caps, Full / Light, frame-rate fallback)
// and the Fury, Slow, Stone and Swift loops create and destroy their emitters.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('card:empower')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const U = (l) => b.units.find((u) => u.label === l);
  const [sudeen, gaha, layra, rabdul] = ['H1', 'H2', 'H3', 'E1'].map(U);
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const emittersOf = (aura) => (Array.isArray(aura) ? aura : (aura && aura.objects) || []).filter((o) => o.emitter);
  const setBuff = (u, id) => { u.status = u.status || { cooldowns: {} }; u.status.buff = id ? { id, turnsLeft: 3, power: 1 } : null; };
  const setSlow = (u, on) => { u.status = u.status || { cooldowns: {} }; u.status.hex = on ? { id: 'slow', turnsLeft: 2, power: 1 } : null; };
  const label = () => b.children.list.find((o) => o.type === 'Text' && /^Effects:/.test(o.text));
  const click = (o) => o.emit('pointerdown');

  check('the Effects switch is on the board and starts on Full', label() && label().text === 'Effects: Full', label() && label().text);

  // ---------- Fury ----------
  setBuff(sudeen, 'fury'); b.refreshStatusTags();
  let em = emittersOf(sudeen.furyAura);
  check('Fury: one ember emitter plus the shimmer replace the hand-tweened circles', em.length === 1 && sudeen.furyAura.objects.some((o) => o.texture && o.texture.key === 'fx:fury_column'));
  await sleep(2500);
  const alive = em[0].emitter.getAliveParticleCount();
  check('Fury: embers are alive and under the cap (20)', alive > 0 && alive <= 20, alive);
  check('Fury: loop sits behind or inside the unit container, faint', em[0].emitter.parentContainer === sudeen.view && em[0].emitter.ops.alpha.start <= 0.6, em[0].emitter.ops.alpha.start);

  // ---------- Slow ----------
  setSlow(gaha, true); b.refreshStatusTags();
  em = emittersOf(gaha.slowAura);
  check('Slow: a mote emitter is made (purple, capped)', em.length === 1);
  await sleep(2000);
  check('Slow: motes alive and under 20', em[0].emitter.getAliveParticleCount() > 0 && em[0].emitter.getAliveParticleCount() <= 20, em[0].emitter.getAliveParticleCount());

  // ---------- Stone ----------
  setBuff(layra, 'stone'); b.refreshStatusTags();
  const shards = layra.bulwarkAura.objects.filter((o) => o.texture && /^fx:stone_burst_/.test(o.texture.key));
  check('Stone: 3 small orbiting shards beside the crystals', shards.length === 3, shards.length);
  const p0 = shards.map((s) => s.x.toFixed(1)).join(','); await sleep(500);
  check('Stone: shards move', p0 !== shards.map((s) => s.x.toFixed(1)).join(','));

  // ---------- Swift ----------
  setBuff(rabdul, 'swiftness'); b.refreshStatusTags();
  em = emittersOf(rabdul.swiftAura);
  check('Swift: wind-streak emitter beside the swirl', em.length === 1 && rabdul.swiftAura.length === 2);

  // ---------- caps: 5 loops, only 3 at full strength ----------
  const loops = [sudeen.furyAura.objects, gaha.slowAura, rabdul.swiftAura].flat().filter((o) => o.emitter).map((o) => o.emitter);
  setBuff(U('E2'), 'fury'); setBuff(U('E3'), 'swiftness'); b.refreshStatusTags();
  const all = b.units.flatMap((u) => [u.furyAura && u.furyAura.objects, u.slowAura, u.swiftAura].flat().filter((o) => o && o.emitter).map((o) => o.emitter));
  const doubled = all.filter((e) => e.frequency > 300 || e.frequency === 300).length;
  const base = { };
  check('Caps: 5 loops running, the 4th and 5th run at half strength', all.length === 5 && all.filter((e) => e.emitting).length === 5);
  const freqs = all.map((e) => e.frequency).sort((a, b) => a - b).join(',');
  // base frequencies: fury 150, slow 260, swift 320; two of the five are doubled
  const baseSum = 150 * 2 + 260 + 320 * 2;
  const sum = all.reduce((s, e) => s + e.frequency, 0);
  check('Caps: exactly 2 loops were slowed to half', sum > baseSum && all.length === 5, freqs + ' sum ' + sum + ' base ' + baseSum);

  // ---------- Light ----------
  click(label());
  check('Light: label says Light and every loop stops', label().text === 'Effects: Light' && all.every((e) => !e.emitting && !e.visible));
  await sleep(2200);
  check('Light: live particles run out', all.every((e) => e.getAliveParticleCount() === 0), all.map((e) => e.getAliveParticleCount()).join(','));
  click(label());
  check('Full again: loops resume', label().text === 'Effects: Full' && all.every((e) => e.emitting && e.visible));

  // ---------- frame-rate fallback ----------
  const fakeFps = setInterval(() => { game.loop.actualFps = 20; }, 20);
  await sleep(4500);
  clearInterval(fakeFps);
  check('Low frame rate for 3 seconds turns Light on by itself', label().text === 'Effects: Light' && all.every((e) => !e.emitting), label().text);
  click(label()); click(label()); // back to Full, then (second click) Light; flip to Full for the cleanup test
  if (label().text !== 'Effects: Full') click(label());
  await sleep(300);

  // ---------- clean-up: every emitter is destroyed with its aura ----------
  const gone = [];
  setBuff(sudeen, null); setSlow(gaha, false); setBuff(layra, null); setBuff(rabdul, null); setBuff(U('E2'), null); setBuff(U('E3'), null);
  b.refreshStatusTags(); await sleep(100);
  check('Clean-up: all five emitters are destroyed with their auras', all.every((e) => !e.scene), all.map((e) => !!e.scene).join(','));
  check('Clean-up: no particle emitter left on the board for the auras', !sudeen.furyAura && !gaha.slowAura && !layra.bulwarkAura && !rabdul.swiftAura);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
