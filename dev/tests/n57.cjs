// 18.23 (Battle 1.0 milestone M3b): effects in layers. src/fxLayers.js adds, round Suleiman's
// drawn effects, a flash, light on the floor, light on the fighters near, sparks and an afterglow,
// sized by the level of the hit (1 light to 4 finishing) and coloured by the element.
// Also: his clash burst (16.4) and the room left for his buff effects (13.46).
const fs = require('fs');
const path = require('path');
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid, L = w.__layers, FX = w.__fx;
  const U = (l) => b.units.find((u) => u.label === l);
  const hero = U('H2'), foe = U('E1'), friend = U('H1');
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  for (const u of b.units) put(u, 7, b.units.indexOf(u) % 8);
  put(hero, 2, 5); put(foe, 3, 5); put(friend, 3, 4);
  const loose = () => b.children.list.filter((o) => (o.texture && /^fx[:-]/.test(o.texture.key)) || o.type === 'ParticleEmitter' || o.type === 'Graphics').length;
  const count = () => ({ ...L.fxLayerCount });

  // ---------- the colour language ----------
  const els = ['fire', 'earth', 'sand', 'sound', 'poison', 'lightning', 'water', 'heal'];
  check('one colour set per element: fire, earth, sand, sound, poison (and lightning, water, healing)', els.every((e) => L.ELEMENTS[e] && L.ELEMENTS[e].glow && L.ELEMENTS[e].spark.length === 3), els.filter((e) => !L.ELEMENTS[e]).join());
  check('no two of the five main elements share a glow colour', new Set(['fire', 'earth', 'sand', 'sound', 'poison'].map((e) => L.ELEMENTS[e].glow)).size === 5);
  check('an unknown element falls back to plain steel', L.elementOf('nope') === L.ELEMENTS.steel);

  // ---------- small hits stay small ----------
  check('hit levels: 2 damage is light, 5 solid, 10 heavy, a finishing blow is the top', L.hitLevel(2) === 1 && L.hitLevel(5) === 2 && L.hitLevel(10) === 3 && L.hitLevel(3, true) === 4);
  const F = L.FEEL;
  check('each level stops, shakes and jolts the camera more than the one below', [2, 3, 4].every((k) => F[k].stop > F[k - 1].stop && F[k].shake > F[k - 1].shake && F[k].zoom > F[k - 1].zoom), JSON.stringify(F[1]) + ' ' + JSON.stringify(F[4]));

  // ---------- the layers of one impact ----------
  let c0 = count(), l0 = loose();
  L.impactLayers(b, { x: foe.view.x, y: foe.view.y - 30, gx: foe.view.x, gy: foe.view.y, element: 'fire', level: 1, dir: 1 });
  let c1 = count();
  check('a light hit: a flash and floor light, but no light on fighters and nothing that lingers', c1.floor === c0.floor + 1 && c1.units === c0.units && c1.glow === c0.glow && c1.waves === c0.waves, JSON.stringify(c1));
  await sleep(1200);
  check('and it leaves nothing behind', loose() <= l0, loose() + ' / ' + l0);
  c0 = count(); l0 = loose();
  const kids = friend.view.list.length;
  L.impactLayers(b, { x: foe.view.x, y: foe.view.y - 30, gx: foe.view.x, gy: foe.view.y, element: 'fire', level: 4, dir: 1 });
  c1 = count();
  check('a finishing blow: floor light, fighters near are lit, embers linger, rings of energy roll out', c1.floor > c0.floor && c1.units >= c0.units + 2 && c1.glow === c0.glow + 1 && c1.waves === c0.waves + 1, JSON.stringify(c1));
  check('the light on a fighter is a copy inside its own container (its real picture and tint are untouched)', friend.view.list.length === kids + 1 && !friend.sprite.isTinted, friend.view.list.length + ' / ' + kids);
  await sleep(2200);
  check('all of it is gone two seconds later', loose() <= l0 && friend.view.list.length === kids, loose() + ' / ' + l0 + ', ' + friend.view.list.length + ' / ' + kids);

  // ---------- a real hit goes through the layers, sized by its damage ----------
  c0 = count();
  let stops = []; const realStop = b.hitStop.bind(b); b.hitStop = (ms) => { stops.push(ms); return realStop(ms); };
  b.showImpact(hero, foe, { hit: true, damage: 2 }, 1, false); await sleep(500);
  b.showImpact(hero, foe, { hit: true, damage: 11 }, 1, false); await sleep(900);
  c1 = count();
  check('showImpact draws the layers for every hit', c1.impact === c0.impact + 2, c1.impact - c0.impact);
  check('a 2 damage hit freezes the screen less than an 11 damage hit', stops.length === 2 && stops[0] < stops[1] && stops[0] === F[1].stop && stops[1] === F[3].stop, stops.join());
  c0 = count();
  b.showImpact(hero, foe, { hit: true, damage: 5, element: 'poison' }, 1, false); await sleep(700);
  check('a skill can name its element (Poison Arrow, Earth Drive, the Clap, Element Blast do)', count().impact === c0.impact + 1);
  const src = fs.readFileSync(path.join(__dirname, '../../src/scenes/BattleScene.js'), 'utf8');
  check('the skills that have an element pass it on', ["element: 'earth'", "element: 'sound'", "element: 'poison'", "element: fire ? 'fire' : 'water'"].every((t) => src.includes(t)));

  // ---------- charge-up ----------
  c0 = count(); l0 = loose();
  const end = L.chargeUp(b, hero.view.x, hero.view.y - 40, 'fire', { ms: 300 });
  await sleep(120);
  check('a charge-up gathers light before the release', count().charge === c0.charge + 1 && loose() > l0 && typeof end === 'function');
  await sleep(1100);
  check('and clears itself', loose() <= l0, loose() + ' / ' + l0);

  // ---------- Light mode ----------
  FX.setFxMode('light');
  c0 = count();
  L.impactLayers(b, { x: foe.view.x, y: foe.view.y - 30, gx: foe.view.x, gy: foe.view.y, element: 'fire', level: 4, dir: 1 });
  c1 = count();
  check('Effects: Light keeps the flash and floor light but drops the light on fighters and the afterglow', c1.floor > c0.floor && c1.units === c0.units && c1.glow === c0.glow, JSON.stringify(c1));
  FX.setFxMode('full');
  await sleep(1500);

  // ---------- 16.4: his clash burst ----------
  check('the six stages of his clash burst are loaded', [0, 1, 2, 3, 4, 5].every((i) => game.textures.exists('fx:clash_burst_' + i)));
  l0 = loose();
  FX.clashSparks(b, foe.view.x, foe.view.y - 40, 80, true);
  await sleep(60);
  const burst = b.children.list.find((o) => o.texture && /^fx:clash_burst_/.test(o.texture.key));
  check('the weapon-meet effect plays his burst, added as light, and bigger on a big beat', !!burst && burst.blendMode === 1 && burst.scaleX > 0.5, burst && burst.scaleX);
  await sleep(1300);
  check('and is gone after', !b.children.list.some((o) => o.texture && /^fx:clash_burst_/.test(o.texture.key)) && loose() <= l0);

  // ---------- 13.46: room for his buff effects ----------
  const slots = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/fxSlots.json'), 'utf8')).buffs;
  check('fxSlots.json has a slot for each Verse, Slow and Enchant, all empty for now', ['swiftness', 'fury', 'stone', 'slow', 'enchant'].every((id) => slots[id] && slots[id].cast === 0 && slots[id].loop === 0));
  check('with a slot empty the game keeps the looks it has', !FX.hasBuffLoop(b, 'fury') && FX.buffLoopFx(b, hero, 'fury') === null && FX.buffCastFx(b, 0, 0, 'fury') === false);
  hero.status.buff = { id: 'fury', turnsLeft: 3, power: 1 }; b.refreshStatusTags();
  check('Fury still shows its own aura', !!hero.furyAura && hero.furyAura.objects.length > 0);
  hero.status.buff = null; b.refreshStatusTags();

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
