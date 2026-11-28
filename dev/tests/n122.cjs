// 10.53 (27 Nov, Baiyee's decisions on Suleiman's Shadow Passage draft): Gadara becomes a heavy tank.
//   - tank numbers: health 64, defense 5, magic defense 4, clash guard 8
//   - the Mask Gauge: 0 to 5; +1 for each different foe a blow hits (Fork Strike through two = +2, at most 3);
//     the hit he takes and the clash beat he holds give +1 only once between two of his turns
//   - Shadow Step: 1 mask, an empty tile within 3, it is his walk, he keeps his action, once a turn
//   - Shadow Passage: 1 mask a foe, foes within 2, all land at random at least 4 tiles away with the foes next to
//     him; kings and a foe under the Stone Verse cannot be taken; picked by taps (foes, then him); the AI uses it
//   - the cloak is Suleiman's Swirling Shadow Cloak GIF, drawn as solid cloth (normal blending), not as light
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n122.cjs
const { start, battle } = require('./boot.cjs');
const slots = require('../../src/data/fxSlots.json').spells;
const jobs = require('../../src/data/jobs.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, E = w.__engagement;
  const U = (id) => b.units.find((u) => u.id === id);
  const gad = U('e5'), gaha = U('h2'), sudeen = U('h1'), layra = U('h3'), ala = U('h5'), kofi = U('h4');
  check('Gadara, Gaha, Sudeen, Layra and Alagara are in the battle', !!(gad && gaha && sudeen && layra && ala));
  b.endTurn = () => {}; b.enemySecondWalk = false; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => { let i = 0; for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.status = fresh(); u.hidden = false; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; } };
  park();
  const waitDone = async (go) => { let done = false; go(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30); await sleep(150); return done; };
  const fresh0 = () => { gad.hasActed = false; gad.hasMoved = false; gad.stepsUsed = 0; gad.passaged = false; gad.maskRound = {}; b.activeUnit = gad; b.busy = false; };

  // ---------- the tank ----------
  const st = jobs.sovereign.stats;
  check('tank numbers: health 64, defense 5, magic defense 4', st.hp === 64 && st.defense === 5 && st.magicDefense === 4, JSON.stringify(st));
  check('...clash guard 8', jobs.sovereign.contest.guard === 8);
  check('...Shadow Step and Shadow Passage in his kit', ['shadowStep', 'shadowPassage'].every((s) => gad.spells.includes(s)), gad.spells.join(','));

  // ---------- the gauge ----------
  gad.mask = 0; gad.grip = 'fork';
  b.placeUnit(gad, 5, 5); b.placeUnit(gaha, 5, 6); b.placeUnit(sudeen, 5, 7);
  gaha.evade = -500; sudeen.evade = -500; sudeen.wardOff = true; gaha.hp = gaha.maxHp; sudeen.hp = sudeen.maxHp; // (sure hits; Sudeen's Ward off)
  const rnd = Math.random; Math.random = () => 0.01 + rnd() * 0.001; // every roll hits (never a constant: Phaser names text with it)
  fresh0();
  await waitDone((d) => b.performAttack(gad, gaha, d));
  Math.random = rnd;
  check('Fork Strike through two foes: +2 masks', gad.mask === 2, gad.mask);
  gad.maskRound = {};
  b.landHit(gad, 3); b.landHit(gad, 3);
  check('two hits taken between his turns: +1 only once', gad.mask === 3, gad.mask);
  gad.mask = 4; b.landHit(gad, 3); b.landHit(gad, 3); gad.maskRound = {}; b.landHit(gad, 3);
  check('the gauge stops at 5', gad.mask === 5, gad.mask);
  check("the card shows MASK 5/5", St.statusTags(gad).some((t) => t.text === 'MASK 5/5'), St.statusTags(gad).map((t) => t.text).join(','));
  check('Singularity needs 5 (it is ready at 5)', !b.kingBlock(gad, 'singularity'), b.kingBlock(gad, 'singularity'));
  gad.mask = 4;
  check('...and says Mask 4/5 below that', b.kingBlock(gad, 'singularity') === 'Mask 4/5', b.kingBlock(gad, 'singularity'));
  gad.hp = gad.maxHp;

  // ---------- Shadow Step ----------
  park(); b.placeUnit(gad, 5, 5); gad.mask = 2; fresh0();
  const tiles = b.shadowStepTiles(gad);
  check('Shadow Step tiles: empty and within 3', tiles.length > 10 && tiles.every((t) => dist(t, gad) >= 1 && dist(t, gad) <= 3 && !b.isBlocked(t.col, t.row)), tiles.length);
  const made = []; const realImage = b.add.image.bind(b.add);
  b.add.image = (x, y, key, ...r) => { const img = realImage(x, y, key, ...r); made.push({ key: String(key), img }); return img; };
  b.chooseSpell('shadowStep');
  check('picking Shadow Step lights tiles to pick', b.mode === 'huskTile' && b.reachableKeys.size === tiles.length, b.mode + ' ' + b.reachableKeys.size);
  check('...the hint says 1 mask and the action is kept', /1 mask/.test(b.statusText.text) && /keeps his action/.test(b.statusText.text), b.statusText.text);
  b.pendingTile = { col: 7, row: 4 };
  await waitDone((d) => b.castSpell(gad, { col: 7, row: 4 }, 'shadowStep', d));
  check('he arrives on the tile', gad.col === 7 && gad.row === 4, gad.col + ',' + gad.row);
  check('...1 mask spent', gad.mask === 1, gad.mask);
  check('...his walk is used, his action is kept', gad.stepsUsed === Infinity && !gad.hasActed);
  check('...his body stands on the middle of the tile', Math.abs(gad.view.x - b.tileCentre(gad).x) < 1 && Math.abs(gad.view.y - b.tileCentre(gad).y) < 1);
  check('...and he is seen again (not left see-through)', gad.view.alpha > 0.95, gad.view.alpha);
  const cloak = made.find((m) => m.key === 'fx:sfx_shadow_cloak_0');
  check("the cloak GIF plays (Suleiman's Swirling Shadow Cloak)", !!cloak && slots.shadow_cloak && slots.shadow_cloak.frames === 9, made.filter((m) => /sfx/.test(m.key)).map((m) => m.key).slice(0, 4).join(','));
  check('...drawn as solid cloth (normal blending), not as light', cloak && cloak.img.blendMode === 0, cloak && cloak.img.blendMode);
  check('once a turn: Shadow Step and Shadow Passage are blocked now', b.kingBlock(gad, 'shadowStep') === 'once a turn' && b.kingBlock(gad, 'shadowPassage') === 'once a turn');
  fresh0(); gad.mask = 0;
  check('with no mask it cannot be used, and says so', b.kingBlock(gad, 'shadowStep') === 'needs 1 mask' && b.kingBlock(gad, 'shadowPassage') === 'needs 1 mask per foe', b.kingBlock(gad, 'shadowStep') + ' / ' + b.kingBlock(gad, 'shadowPassage'));
  fresh0(); gad.mask = 1; gad.stepsUsed = 1;
  check('...nor after he has walked', b.kingBlock(gad, 'shadowStep') === 'he has walked', b.kingBlock(gad, 'shadowStep'));

  // ---------- Shadow Passage (the player picks) ----------
  park(); b.placeUnit(gad, 5, 5); b.placeUnit(gaha, 5, 6); b.placeUnit(layra, 4, 5); b.placeUnit(sudeen, 6, 6); b.placeUnit(ala, 5, 4); fresh0(); gad.mask = 3;
  St.applyBuff(sudeen, 'stone');
  const foes = b.passageFoes(gad);
  check('he can take Gaha and Layra', foes.includes(gaha) && foes.includes(layra));
  check('...not a king (Alagara) or a foe under the Stone Verse (Sudeen)', !foes.includes(ala) && !foes.includes(sudeen), foes.map((u) => u.name).join(','));
  E.startDuel(gaha, sudeen); // (a clash that the passage cuts)
  b.chooseSpell('shadowPassage');
  check('picking it lights the foes and him', b.mode === 'spellTarget' && b.targetsInRange.includes(gaha) && b.targetsInRange.includes(gad));
  b.passageTap(gaha.col, gaha.row); b.passageTap(layra.col, layra.row);
  check('two taps pick two foes, the hint counts them', b.passengers.length === 2 && /2 of 3/.test(b.statusText.text), b.statusText.text);
  b.passageTap(layra.col, layra.row);
  check('a tap on a picked foe drops it', b.passengers.length === 1);
  b.passageTap(layra.col, layra.row);
  const from = { col: gad.col, row: gad.row };
  const castDone = new Promise((res) => { const o = b.kingFinish.bind(b); b.kingFinish = (d, ms) => o(() => { b.kingFinish = o; res(); d && d(); }, ms); });
  b.passageTap(gad.col, gad.row);
  await Promise.race([castDone, sleep(9000)]); await sleep(200);
  check('he lands at least 4 tiles from where he stood', dist(gad, from) >= 4, from.col + ',' + from.row + ' to ' + gad.col + ',' + gad.row);
  check('...Gaha and Layra next to him', dist(gaha, gad) === 1 && dist(layra, gad) === 1, gaha.col + ',' + gaha.row + ' ' + layra.col + ',' + layra.row);
  check('...on two different tiles', !(gaha.col === layra.col && gaha.row === layra.row));
  check('...2 masks spent', gad.mask === 1, gad.mask);
  check("...Gaha's clash with Sudeen is over", !gaha.engagedWith && !sudeen.engagedWith);
  check('...it took his action and his walk', gad.hasActed && gad.stepsUsed === Infinity);
  check('...everyone stands on the middle of his tile', [gad, gaha, layra].every((u) => Math.abs(u.view.x - b.tileCentre(u).x) < 1 && Math.abs(u.view.y - b.tileCentre(u).y) < 1));
  check('...and is seen', [gad, gaha, layra].every((u) => u.view.alpha > 0.95), [gad, gaha, layra].map((u) => u.view.alpha.toFixed(2)).join(','));
  // the next spot is not the same one
  const last = { ...gad.passageLast };
  let same = 0; for (let k = 0; k < 30; k++) { const s = b.passageSpot(gad, [gaha]); if (s && s.at.col === last.col && s.at.row === last.row) same++; }
  check('the next carry never picks the spot he arrived at', same === 0, same);

  // ---------- the AI takes the foes off a badly hurt friend ----------
  park(); const bull = U('e2');
  b.placeUnit(gad, 5, 5); b.placeUnit(bull, 4, 6); b.placeUnit(gaha, 4, 5); b.placeUnit(sudeen, 5, 6); fresh0(); gad.mask = 3; gad.singularityUsed = false;
  bull.hp = Math.floor(bull.maxHp * 0.3);
  let acted = false;
  const did = b.gadaraShadowAi(gad, () => { acted = true; });
  const t0 = Date.now(); while (!acted && Date.now() - t0 < 9000) await sleep(30); await sleep(150);
  check('the AI uses Shadow Passage to take the foes off the hurt Bull', did && acted && dist(gaha, bull) > 1 && dist(sudeen, bull) > 1, gaha.col + ',' + gaha.row + ' ' + sudeen.col + ',' + sudeen.row);
  check('...both foes go (2 masks)', gad.mask === 1 && dist(gaha, gad) === 1 && dist(sudeen, gad) === 1, gad.mask);
  bull.hp = bull.maxHp;
  // ...and keeps 4 masks for Singularity for a lone foe
  park(); b.placeUnit(gad, 5, 5); b.placeUnit(layra, 5, 7); b.placeUnit(gaha, 6, 8); fresh0(); gad.mask = 4; gad.singularityUsed = false;
  check('with 4 masks and Singularity unused he does not spend one on a single foe', !b.gadaraShadowAi(gad, () => {}));

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
