// 13.72 (decided by Baiyee 27 Nov): Kofi's Call Spirit replaces Infuse, and Alagara's Claim draws from nature.
//   Kofi: Haunt, Call Spirit, Spirit Swap. The tile picks the spirit: by a lamp Ember, water Tide, sand or rubble Stone,
//   high ground Gale, plain floor what he reads. Each spirit is a small ally on its tile with one move (when it comes, then
//   at the start of his next 2 turns), then it fades; foes can break it; it goes when he falls; one at a time.
//   Alagara: Claim from the ground was removed on 28 Nov (10.56: Claim draws from spirits, n130).
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n124.cjs
const { start, battle } = require('./boot.cjs');
const spells = require('../../src/data/spells.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const kofi = U('h4'), gaha = U('h2'), sudeen = U('h1'), layra = U('h3'), ala = U('h5'), bull = U('e2'), rabdul = U('e4');
  check('Kofi, Alagara, Gaha, Sudeen, the Bull and Rabdul are in the battle', !!(kofi && ala && gaha && sudeen && bull && rabdul));
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => {
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false;
    for (const sp of [...(b.spirits || [])]) b.removeSpirit(sp);
    let i = 0;
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.status = fresh(); u.hidden = false; u.alive = true; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.spiritSwapped = false; if (u.view) u.view.setAlpha(1); b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; }
    kofi.mp = kofi.maxMp;
  };
  const waitDone = async (go) => { let done = false; go(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30); await sleep(250); return done; };

  // ---------- Kofi's kit and the ground ----------
  check("Kofi's kit: Haunt, Call Spirit, Spirit Swap (no Infuse)", ['haunt', 'callSpirit', 'spiritSwap'].every((s) => kofi.spells.includes(s)) && !kofi.spells.includes('infuse'), kofi.spells.join(','));
  check('the ground: by a lamp (4,4 and next to it) is fire', b.natureAt({ col: 4, row: 4 }) === 'fire' && b.natureAt({ col: 4, row: 3 }) === 'fire');
  check('...a water tile (3,3) is water', b.natureAt({ col: 3, row: 3 }) === 'water', b.natureAt({ col: 3, row: 3 }));
  check('...a sand tile (1,1) is earth', b.natureAt({ col: 1, row: 1 }) === 'earth', b.natureAt({ col: 1, row: 1 }));
  check('...high plain floor (2,0, 2 levels up) is storm', b.natureAt({ col: 2, row: 0 }) === 'storm', b.natureAt({ col: 2, row: 0 }));
  check('...low plain floor (5,2) is nothing (Kofi falls back on his Reading)', b.natureAt({ col: 5, row: 2 }) === null, b.natureAt({ col: 5, row: 2 }));
  check('the spirit pictures load with Kofi', ['ember', 'tide', 'stone', 'gale'].every((k) => b.textures.exists('sp_' + k + ':sp_' + k + '_f1.png')));

  // ---------- Tide: called on water, heals the ally next to it at once ----------
  park(); b.placeUnit(kofi, 3, 1); b.placeUnit(gaha, 2, 3); gaha.hp = gaha.maxHp - 9; b.activeUnit = kofi;
  const tiles = b.spiritTiles(kofi);
  check('Call Spirit: empty tiles up to 3 away', tiles.length > 5 && tiles.every((t) => dist(t, kofi) <= 3 && !b.isBlocked(t.col, t.row)), tiles.length);
  b.chooseSpell('callSpirit');
  check('picking it lights the tiles, the hint names the spirits', b.mode === 'huskTile' && /Ember/.test(b.statusText.text) && /Tide/.test(b.statusText.text), b.statusText.text);
  b.pendingTile = { col: 3, row: 3 };
  b.refreshStatus();
  check('...a picked water tile says Tide Spirit', /Tide Spirit/.test(b.statusText.text), b.statusText.text);
  const mp0 = kofi.mp, hp0 = gaha.hp;
  await waitDone((d) => b.castSpell(kofi, { col: 3, row: 3 }, 'callSpirit', d)); await sleep(800);
  const tide = b.spiritOf(kofi);
  check('the Tide Spirit stands on the water tile', tide && tide.kind === 'tide' && tide.col === 3 && tide.row === 3);
  check('...it is drawn with its own picture, small', tide && tide.body && /^sp_tide:/.test(tide.body.texture.key) && tide.body.displayHeight < kofi.topY, tide && tide.body.texture.key + ' ' + Math.round(tide.body.displayHeight));
  check('...it blocks its tile', b.isBlocked(3, 3));
  check('...3 MP', kofi.mp === mp0 - 3, mp0 + ' -> ' + kofi.mp);
  check('...Tide Mend: the ally next to it gets 5', gaha.hp === hp0 + 5, hp0 + ' -> ' + gaha.hp);
  check("...Kofi's card shows it", St.statusTags(kofi).some((t) => /TIDE SPIRIT/.test(t.text)), St.statusTags(kofi).map((t) => t.text).join(','));
  check('...2 moves left (it used one coming)', tide.movesLeft === 2, tide.movesLeft);
  b.tickSpirits(kofi); await sleep(900);
  check('at the start of his next turn it moves again', tide.movesLeft === 1 && gaha.hp === hp0 + 9, tide.movesLeft + ' ' + gaha.hp);
  b.tickSpirits(kofi); await sleep(1000);
  check('...after its third move it fades', !b.spiritOf(kofi) && !b.isBlocked(3, 3));

  // ---------- Ember: by a lamp, burns the foe next to it ----------
  park(); b.placeUnit(kofi, 2, 4); b.placeUnit(bull, 4, 2); b.activeUnit = kofi;
  const bh = bull.hp;
  await waitDone((d) => b.castSpell(kofi, { col: 4, row: 3 }, 'callSpirit', d)); await sleep(800);
  check('Ember Spirit next to the lamp', b.spiritOf(kofi) && b.spiritOf(kofi).kind === 'ember');
  check('...Ember Lash: the Bull next to it is hurt and burns', bull.hp < bh && St.isBurning(bull), bh + ' -> ' + bull.hp);
  // one at a time
  await waitDone((d) => b.castSpell(kofi, { col: 2, row: 1 }, 'callSpirit', d)); await sleep(800);
  check('a second call sends the first spirit away (one at a time)', b.spirits.filter((s) => s.owner === kofi).length === 1 && !b.isBlocked(4, 3));

  // ---------- Gale: high ground, blows the foe away ----------
  park(); b.placeUnit(kofi, 4, 1); b.placeUnit(bull, 2, 1); b.activeUnit = kofi;
  const gh = bull.hp;
  await waitDone((d) => b.castSpell(kofi, { col: 2, row: 0 }, 'callSpirit', d)); await sleep(1600);
  const gale = b.spiritOf(kofi);
  check('Gale Spirit on high ground', gale && gale.kind === 'gale', gale && gale.kind);
  check('...Gale Burst: the Bull takes 2 or more and is blown off it', bull.hp < gh && dist(bull, gale) >= 2, gh + ' -> ' + bull.hp + ' at ' + bull.col + ',' + bull.row);

  // ---------- Stone: sand, allies next to it take 2 less ----------
  park(); b.placeUnit(kofi, 1, 3); b.placeUnit(sudeen, 2, 1); b.activeUnit = kofi;
  await waitDone((d) => b.castSpell(kofi, { col: 1, row: 1 }, 'callSpirit', d)); await sleep(800);
  const stone = b.spiritOf(kofi);
  check('Stone Spirit on sand', stone && stone.kind === 'stone' && stone.hp === 14);
  sudeen.wardOff = true;
  const l1 = b.landHit(sudeen, 6);
  check('...Stone Ward: Sudeen next to it takes 2 less', l1.damage <= 4, l1.damage);
  b.placeUnit(sudeen, 5, 5);
  const l2 = b.landHit(sudeen, 6);
  check('...away from it he takes the full blow', l2.damage > l1.damage, l1.damage + ' vs ' + l2.damage);
  // a foe with nobody to strike breaks it down
  b.placeUnit(bull, 1, 0); b.activeUnit = bull;
  let struck = false; b.hitSpirit(bull, () => { struck = true; }); await sleep(900);
  check('a foe next to it strikes it', struck && stone.hp < 14, stone.hp);
  // Kofi falls: it goes with him
  b.activeUnit = sudeen; kofi.hp = 0; b.defeat(kofi); await sleep(500);
  check('Kofi falls: his spirit goes too', !b.spiritOf(kofi) && !b.isBlocked(1, 1));

  // ---------- Spirit Swap ----------
  park(); b.placeUnit(kofi, 5, 1); b.activeUnit = kofi;
  await waitDone((d) => b.castSpell(kofi, { col: 6, row: 2 }, 'callSpirit', d)); await sleep(600);
  check('Spirit Swap is a free skill', spells.spiritSwap.free === true);
  kofi.hasActed = false; b.cancelMode();
  b.chooseSpell('spiritSwap'); await sleep(700);
  const sw = b.spiritOf(kofi);
  check('...Kofi and the spirit trade places', kofi.col === 6 && kofi.row === 2 && sw.col === 5 && sw.row === 1, kofi.col + ',' + kofi.row + ' / ' + sw.col + ',' + sw.row);
  check('...it took no action', !kofi.hasActed);
  check('...once a turn', b.spiritBlock(kofi, 'spiritSwap') === 'once a turn');

  // ---------- the AI calls one where it helps ----------
  // (two foes by a lamp: an Ember Spirit between them burns both)
  park(); b.placeUnit(kofi, 4, 1); b.placeUnit(bull, 3, 4); b.placeUnit(rabdul, 5, 4); b.activeUnit = kofi;
  const pick = b.spiritChoice(kofi);
  check('the AI calls an Ember Spirit between the two foes by the lamp', pick && pick.id === 'callSpirit' && dist(pick.target, bull) === 1 && dist(pick.target, rabdul) === 1 && b.spiritKindAt(kofi, pick.target) === 'ember', pick && JSON.stringify(pick.target));
  // ...and none where it would do nothing (plain floor, nobody near)
  park(); b.placeUnit(kofi, 5, 1); b.placeUnit(bull, 9, 9); b.placeUnit(rabdul, 1, 9); b.activeUnit = kofi;
  check('...no spirit where it would do nothing', !b.spiritChoice(kofi));
  park(); b.placeUnit(kofi, 4, 1); b.placeUnit(bull, 3, 4); b.placeUnit(rabdul, 5, 4); b.activeUnit = kofi;
  const sc = b.shamanChoice(kofi);
  check('...through his usual choice (shamanChoice)', sc && sc.id === 'callSpirit', sc && sc.id);

  // ---------- Alagara: Claim from nature was removed (10.56, 28 Nov: Claim draws from spirits, test n130) ----------
  park(); b.placeUnit(ala, 4, 3); b.activeUnit = ala; ala.attune = { echo: null, swapped: false };
  check('10.56: his own tile by a lamp no longer makes him a Claim target', !b.kingTargets(ala, 'claim').includes(ala));
  park(); b.placeUnit(ala, 2, 3); b.activeUnit = ala; ala.hasActed = false; b.placeUnit(bull, 2, 4); St.applyBuff(bull, 'stone');
  b.chooseSpell('claim');
  check('...and the water tile next to him is not lit', !(b.spellTiles && b.spellTiles.has('3,3')), b.spellTiles && [...b.spellTiles].join(' '));
  b.cancelMode();
  // he can still steal a foe's Verse
  park(); b.placeUnit(ala, 5, 5); b.placeUnit(bull, 5, 6); b.activeUnit = ala; ala.attune = { echo: null, swapped: false };
  St.applyBuff(bull, 'stone');
  await waitDone((d) => b.castSpell(ala, bull, 'claim', d));
  check("Claim still takes a foe's Verse", ala.status.buff && ala.status.buff.id === 'stone' && !bull.status.buff);
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
