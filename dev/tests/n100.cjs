// 6.84 and 6.88 (Suleiman's 20 and 21 Nov effects).
//   6.84 Mantle's crown: it floats over the head of each ally Mantle helps (in the ally's own container, above the
//        head), not over Alagara; it goes when the shared Verse ends. The old gold cloak GIF is gone.
//   6.88 "Shockwave for clash" plays on the ground between the two fighters when a clash beat lands, and the
//        "Golden Empowerment Aura" plays round a fighter who spends Poise to Empower.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n100.cjs
const { start, battle } = require('./boot.cjs');
const slots = require('../../src/data/fxSlots.json').spells;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, E = w.__engagement;
  const U = (id) => b.units.find((u) => u.id === id);
  const a = U('h5'), gaha = U('h2'), sudeen = U('h1'), bull = U('e2');
  check('Alagara, Gaha, Sudeen and the bull are in the battle', !!(a && gaha && sudeen && bull));
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  let i = 0;
  for (const u of b.units) { if (u === a) continue; u.engagedWith = null; u.engagement = null; u.status = fresh(); b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; }
  a.status = fresh(); a.attune = { echo: null, swapped: false }; b.placeUnit(a, 5, 5); b.activeUnit = a; a.hasActed = false;
  const waitDone = async (go) => { let done = false; go(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30); await sleep(150); return done; };

  // ---------- 6.84 the crown ----------
  check('the Mantle slot is the crown GIF (9 frames at 150 ms, 359 wide)', slots.mantle && slots.mantle.frames === 9 && slots.mantle.frameMs === 150 && slots.mantle.size[0] === 359, JSON.stringify(slots.mantle && slots.mantle.size));
  St.applyBuff(a, 'fury');
  b.placeUnit(gaha, 5, 6); b.placeUnit(sudeen, 4, 5);
  await waitDone((d) => b.castKingSkill(a, a, 'mantle', d));
  await sleep(1500); // it forms (6 frames), then hovers
  const crown = gaha.mantleCrown;
  check('a crown over Gaha and over Sudeen (both helped)', !!(crown && crown.active && sudeen.mantleCrown && sudeen.mantleCrown.active));
  check('...none over Alagara (he casts it, it helps the others)', !a.mantleCrown);
  check("...in the ally's own container, so it follows him", crown && crown.parentContainer === gaha.view);
  check('...above his head', crown && crown.y < -gaha.topY + 6 && crown.y > -gaha.topY - 40, crown && Math.round(crown.y) + ' head ' + Math.round(-gaha.topY));
  check('...about a head and a half across, not the whole GIF', crown && crown.displayWidth > 20 && crown.displayWidth < 120, crown && Math.round(crown.displayWidth));
  check('...hovering on its last frames (6 to 8)', crown && /sfx_mantle_[678]$/.test(crown.texture.key), crown && crown.texture.key);
  gaha.status.buff.turnsLeft = 1; St.tickBuff(gaha); b.refreshStatusTags();
  check('the crown goes when the shared Verse ends', !gaha.mantleCrown && !crown.active);
  check("...Sudeen's stays while his lasts", sudeen.mantleCrown && sudeen.mantleCrown.active);
  sudeen.status.buff = null; b.refreshStatusTags();
  check("...and his goes when his ends", !sudeen.mantleCrown);

  // ---------- 6.88 the clash shockwave and the Empower aura ----------
  const made = []; const realImage = b.add.image.bind(b.add);
  b.add.image = (x, y, key, ...r) => { made.push({ key: String(key), x, y }); return realImage(x, y, key, ...r); };
  for (const u of [gaha, bull]) { u.status = fresh(); u.engagedWith = null; u.engagement = null; }
  b.placeUnit(gaha, 3, 3); b.placeUnit(bull, 3, 4);
  E.startDuel(gaha, bull);
  const beat = { kind: 'stance', actor: gaha, holder: bull, actorStance: 'press', holderStance: 'slip', winner: gaha, loser: bull, decisive: true, empowered: true, actorScore: 14, holderScore: 8 };
  let done = false;
  b.playBeat({ beat, response: { held: false, slipped: false }, path: [], ended: false, strike: { hit: true, damage: 3 }, escape: null }, false, () => (done = true));
  const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(40);
  const shock = made.find((m) => m.key === 'fx:sfx_clash_shock_0');
  const midX = (gaha.view.x + bull.view.x) / 2;
  check('the clash shockwave GIF plays when the beat lands', !!shock, made.filter((m) => m.key.startsWith('fx:sfx')).map((m) => m.key).slice(0, 6).join(','));
  check('...between the two fighters', shock && Math.abs(shock.x - midX) < 4, shock && Math.round(shock.x) + ' vs ' + Math.round(midX));
  const emp = made.find((m) => m.key === 'fx:sfx_empower_0');
  check('the Golden Empowerment Aura plays round the fighter who Empowered', emp && Math.abs(emp.x - gaha.view.x) < 4, emp ? Math.round(emp.x) + ' vs ' + Math.round(gaha.view.x) : 'none');
  const real = errors.filter((e) => !/Not implemented/.test(String(e))); check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED: ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
