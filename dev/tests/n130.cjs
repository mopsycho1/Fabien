// 10.56 (Suleiman 28 Nov, decided by Baiyee): Alagara's Claim draws from spirits, not tiles.
//   - Claim from nature (the ground) is gone
//   - any spirit within 2 tiles gives a Verse for 2 turns: Ember Fury, Tide Renewal, Stone Earth's Bulwark, Gale Swiftness
//   - an enemy spirit claimed is destroyed; a friendly one loses 1 turn of its life
//   - stealing a foe's blessing stays (n87, n124)
//   - the effect: the spirit's light streams into him; his AI uses it
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n130.cjs
const { start, battle } = require('./boot.cjs');
const spells = require('../../src/data/spells.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const kofi = U('h4'), ala = U('h5'), bull = U('e2'), rabdul = U('e4');
  check('Kofi, Alagara, the Bull and Rabdul are in the battle', !!(kofi && ala && bull && rabdul));
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => {
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; b.cancelMode();
    for (const sp of [...(b.spirits || [])]) b.removeSpirit(sp);
    let i = 0;
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.status = fresh(); u.hidden = false; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; }
    ala.attune = { echo: null, swapped: false }; ala.fury = 0; b.activeUnit = ala;
  };
  const waitDone = async (go) => { let done = false; go(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30); await sleep(300); return done; };
  const C = spells.claim;

  check('spells.json: Ember Fury, Tide Renewal, Stone Earth\'s Bulwark, Gale Swiftness, within 2, 2 turns, a friend pays 1',
    C.spirits.ember === 'fury' && C.spirits.tide === 'renewal' && C.spirits.stone === 'stone' && C.spirits.gale === 'swiftness' && C.spiritRange === 2 && C.turns === 2 && C.friendCost === 1);
  check('...Claim from nature is gone from the data', !C.nature);
  check('...the text says spirits', /spirit within 2 tiles/.test(C.text) && !/ground/.test(C.text), C.text);

  // ---------- reach ----------
  park(); b.placeUnit(ala, 3, 5);
  const tide = b.addSpirit(kofi, 'tide', { col: 5, row: 5 }, true);
  check('a friendly Tide Spirit 2 tiles away can be claimed', b.claimTiles(ala).some((t) => t.col === 5 && t.row === 5));
  b.removeSpirit(tide); const far = b.addSpirit(kofi, 'tide', { col: 6, row: 5 }, true);
  check('...3 tiles away it cannot', !b.claimTiles(ala).length);
  b.removeSpirit(far);

  // ---------- the player picks a friendly spirit ----------
  park(); b.placeUnit(ala, 3, 5); const t2 = b.addSpirit(kofi, 'tide', { col: 4, row: 6 }, true); t2.movesLeft = 2;
  b.chooseSpell('claim');
  check('picking Claim lights the spirit\'s tile', b.mode === 'spellTarget' && b.spellTiles && b.spellTiles.has('4,6'), b.spellTiles && [...b.spellTiles].join(' '));
  b.pendingTile = { col: 4, row: 6 }; b.refreshStatus();
  check('...the hint names Renewal and the cost to the spirit', /Renewal/.test(b.statusText.text) && /loses a turn/.test(b.statusText.text), b.statusText.text);
  b.cancelMode();
  // the effect: count the light motes made while he claims
  let adds = 0; const g0 = b.add.graphics.bind(b.add); b.add.graphics = (...a) => { const g = g0(...a); const sb = g.setBlendMode.bind(g); g.setBlendMode = (m) => { if (m === 1) adds++; return sb(m); }; return g; };
  const said = []; const ft = b.floatText.bind(b); b.floatText = (u, t, ...r) => { said.push(t); return ft(u, t, ...r); };
  await waitDone((d) => b.castSpell(ala, { col: 4, row: 6 }, 'claim', d));
  b.add.graphics = g0; b.floatText = ft;
  check('friendly Tide: Renewal for 2 turns', ala.status.buff && ala.status.buff.id === 'renewal' && ala.status.buff.turnsLeft === 2, JSON.stringify(ala.status.buff));
  check('...the spirit stays, one turn of life less (2 to 1)', b.spirits.includes(t2) && t2.movesLeft === 1, t2.movesLeft);
  check('...it says "-1 turn" over the spirit and "Claimed: Renewal" over him', said.includes('-1 turn') && said.some((t) => /^Claimed: Renewal/.test(t)), said.join('|'));
  check('...the light streams in (16 glowing motes, added light)', adds >= 16, adds);
  check('...his action, no MP, the usual cooldown', ala.hasActed && St.cooldownOf(ala, 'claim') > 0);
  // a friendly spirit on its last turn fades
  park(); b.placeUnit(ala, 3, 5); const g1 = b.addSpirit(kofi, 'gale', { col: 3, row: 4 }, true); g1.movesLeft = 1;
  await waitDone((d) => b.castSpell(ala, { col: 3, row: 4 }, 'claim', d));
  check('friendly Gale on its last turn: Swiftness, and the spirit fades', ala.status.buff && ala.status.buff.id === 'swiftness' && !b.spirits.includes(g1), JSON.stringify(ala.status.buff));

  // ---------- an enemy spirit is destroyed ----------
  park(); b.placeUnit(ala, 3, 5); const e1 = b.addSpirit(bull, 'ember', { col: 4, row: 6 }, true);
  check('an enemy spirit is on the foe\'s side', e1.side === 'enemy');
  b.pendingTile = { col: 4, row: 6 }; b.mode = 'spellTarget'; b.selectedSpell = 'claim'; b.refreshStatus();
  check('...the hint says it destroys the spirit', /destroys the spirit/.test(b.statusText.text), b.statusText.text);
  b.cancelMode();
  await waitDone((d) => b.castSpell(ala, { col: 4, row: 6 }, 'claim', d));
  check('enemy Ember: Fury, and the spirit is destroyed', ala.status.buff && ala.status.buff.id === 'fury' && !b.spirits.includes(e1), JSON.stringify(ala.status.buff));
  park(); b.placeUnit(ala, 3, 5); const s1 = b.addSpirit(bull, 'stone', { col: 5, row: 5 }, true);
  await waitDone((d) => b.castSpell(ala, { col: 5, row: 5 }, 'claim', d));
  check('enemy Stone: Earth\'s Bulwark (the Stone Verse)', ala.status.buff && ala.status.buff.id === 'stone' && !b.spirits.includes(s1), JSON.stringify(ala.status.buff));

  // ---------- no spirit, no ground ----------
  park(); b.placeUnit(ala, 4, 3); // (by a lamp: Claim from nature gave Fury here before 10.56)
  b.chooseSpell('claim');
  check('no spirit and nobody blessed next to him: nothing to claim, even by a lamp', b.mode !== 'spellTarget', b.mode);
  b.cancelMode();

  // ---------- his AI ----------
  park(); b.placeUnit(ala, 3, 5); const ae = b.addSpirit(bull, 'ember', { col: 4, row: 6 }, true);
  for (const id of Object.keys(ala.status.cooldowns || {})) ala.status.cooldowns[id] = 0;
  let aiDone = false; const acted = b.alagaraAi(ala, () => { aiDone = true; });
  let t0 = Date.now(); while (!aiDone && Date.now() - t0 < 6000) await sleep(30); await sleep(300);
  check('AI: with no Verse he claims the foe\'s spirit near him (Fury, and it is gone)', acted && ala.status.buff && ala.status.buff.id === 'fury' && !b.spirits.includes(ae), JSON.stringify(ala.status.buff));
  park(); b.placeUnit(ala, 3, 5); const af = b.addSpirit(kofi, 'tide', { col: 4, row: 6 }, true); af.movesLeft = 3;
  St.applyBuff(ala, 'swiftness'); ala.status.buff.turnsLeft = 3;
  aiDone = false; b.alagaraAi(ala, () => { aiDone = true; });
  t0 = Date.now(); while (!aiDone && Date.now() - t0 < 6000) await sleep(30); await sleep(300);
  check('AI: holding a Verse, he leaves his own side\'s spirit alone', af.movesLeft === 3 && b.spirits.includes(af), af.movesLeft);
  park(); b.placeUnit(ala, 3, 5); const ag = b.addSpirit(kofi, 'tide', { col: 4, row: 6 }, true); ag.movesLeft = 3; ala.hp = Math.round(ala.maxHp * 0.5);
  aiDone = false; b.alagaraAi(ala, () => { aiDone = true; });
  t0 = Date.now(); while (!aiDone && Date.now() - t0 < 6000) await sleep(30); await sleep(300);
  check('AI: hurt and with no Verse, he takes Renewal from his side\'s Tide Spirit', ala.status.buff && ala.status.buff.id === 'renewal' && ag.movesLeft === 2, JSON.stringify(ala.status.buff) + ' ' + ag.movesLeft);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
