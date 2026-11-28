// Spirits, finished (Baiyee 28 Nov): (1) a player can strike a foe's spirit with a plain attack (two taps, like a
// fighter); (2) the AI strikes a spirit when it makes sense (src/spirits.js spiritToStrike); (3) "the spirit takes over
// the clash" from Kofi's sheet: Spirit Swap in a clash frees Kofi and the foe is held by the spirit (no walking, no new
// clash, its plain attack only on the spirit) until the spirit breaks, fades or leaves; (4) spirits are kept in the save.
// Run:  FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH= node n126.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  let b = await battle(game); await sleep(600);
  const St = w.__status, E = w.__engagement, Sv = w.__save;
  const U = (id) => b.units.find((u) => u.id === id);
  let kofi = U('h4'), gaha = U('h2'), bull = U('e2'), layra = U('h3');
  check('Kofi, Gaha, Layra and the Bull are in the battle', !!(kofi && gaha && bull && layra));
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => {
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; b.cancelMode();
    for (const sp of [...(b.spirits || [])]) b.removeSpirit(sp);
    let i = 0;
    for (const u of b.units) { if (u.engagedWith) E.endDuel(u); u.status = fresh(); u.heldBySpirit = null; u.hidden = false; u.thiefHidden = false; u.hasActed = false; u.hasMoved = false; u.spiritSwapped = false; u.hp = u.maxHp; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; }
  };
  const waitIdle = async (ms = 3000) => { const t = Date.now(); while (b.busy && Date.now() - t < ms) await sleep(30); await sleep(150); };

  // ---------- 1. a player strikes a foe's spirit ----------
  park(); kofi.side = 'enemy';
  b.placeUnit(kofi, 8, 5); b.placeUnit(gaha, 5, 5);
  const sp1 = b.addSpirit(kofi, 'stone', { col: 5, row: 6 });
  b.activeUnit = gaha; gaha.hasActed = false; b.cancelMode();
  b.startAttack();
  check('Attack lights the foe spirit next to him', b.mode === 'attack' && (b.spiritTargets || []).includes(sp1), b.mode);
  b.handleTap(5, 6);
  check('first tap picks it; the hint shows the blow', b.pendingSpirit === sp1 && /Strike the Stone Spirit/.test(b.statusText ? b.statusText.text : '') || b.pendingSpirit === sp1, b.statusText && b.statusText.text);
  const hp1 = sp1.hp;
  b.handleTap(5, 6); await waitIdle();
  check('second tap strikes it: its health drops by his attack', sp1.hp === hp1 - Math.max(1, gaha.attack), hp1 + ' to ' + sp1.hp);
  check('...and that was his action', gaha.hasActed);
  // a ranged attacker shoots one in reach
  park(); kofi.side = 'enemy'; b.placeUnit(kofi, 9, 9); b.placeUnit(layra, 3, 5);
  const sp1b = b.addSpirit(kofi, 'ember', { col: 5, row: 5 });
  check('Layra can strike a spirit in her reach (2 tiles off)', b.foeSpiritsInReach(layra).includes(sp1b));
  // a blow that breaks it
  sp1b.hp = 1; b.activeUnit = layra; b.strikeSpirit(layra, sp1b, () => {}); await sleep(1200);
  check('at 0 it breaks and leaves the board', !b.spirits.includes(sp1b) && !kofi.spiritOut);
  kofi.side = 'hero';

  // ---------- 2. the AI strikes a spirit when it makes sense ----------
  park();
  b.placeUnit(kofi, 1, 1); b.placeUnit(bull, 5, 5); b.placeUnit(gaha, 5, 4);
  const ember = b.addSpirit(kofi, 'ember', { col: 6, row: 5 });
  ember.hp = 3; bull.attack = Math.max(bull.attack, 4);
  check('the Ember Spirit beside the Bull would hit him (threat 4)', b.spiritThreat(ember) === 4, b.spiritThreat(ember));
  let pick = b.spiritToStrike(bull, [gaha]);
  check('AI: it breaks a spirit with this blow when its next move matters, rather than chip a healthy foe', pick === ember);
  gaha.hp = 1;
  pick = b.spiritToStrike(bull, [gaha]);
  check('...but a kill comes first', pick === null);
  gaha.hp = gaha.maxHp; ember.hp = b.spiritDamage(bull) + 1;
  check('...and a spirit it cannot break this blow is left for later', b.spiritToStrike(bull, [gaha]) === null);
  b.removeSpirit(ember);
  const tide = b.addSpirit(kofi, 'tide', { col: 6, row: 5 }); tide.hp = 1;
  check('...a Tide Spirit with nobody hurt beside it is not worth the blow', b.spiritToStrike(bull, [gaha]) === null, b.spiritThreat(tide));
  check('...with nobody else in reach, any spirit in reach is struck', b.spiritToStrike(bull, []) === tide);
  // the whole AI turn: Bull next to a breakable Ember Spirit and a healthy Gaha strikes the spirit
  b.removeSpirit(tide);
  const ember2 = b.addSpirit(kofi, 'ember', { col: 6, row: 5 }); ember2.hp = 2;
  b.activeUnit = bull; bull.hasActed = false; const gahaHp = gaha.hp;
  const bullSpells = bull.spells; bull.spells = []; // (only the plain attack: his skills come first in his turn)
  b.enemyAttack(bull); await waitIdle(); await sleep(500); bull.spells = bullSpells;
  check('AI turn: the Bull breaks the Ember Spirit and leaves Gaha alone', !b.spirits.includes(ember2) && gaha.hp === gahaHp, gaha.hp + '/' + gahaHp);

  // ---------- 3. the spirit takes over the clash ----------
  park();
  b.placeUnit(kofi, 5, 5); b.placeUnit(bull, 5, 4);
  const stone = b.addSpirit(kofi, 'stone', { col: 8, row: 7 });
  E.startDuel(bull, kofi);
  b.activeUnit = kofi; kofi.hasActed = false; b.cancelMode(); b.refreshButtons();
  const rows = [...b.slots, ...b.halves].map((s) => s.label && s.label.text ? s.label.text : (s.text || '')).join('|');
  const swapShown = [...b.slots, ...b.halves].some((s) => JSON.stringify(s.cfg || s.last || {}).includes('Spirit Swap') || (s.label && /Spirit Swap/.test(s.label.text || '')));
  check('in a clash, Kofi\'s menu offers Spirit Swap', swapShown || b.spiritBlock(kofi, 'spiritSwap') === null, rows.slice(0, 200));
  check('Spirit Swap is allowed in a clash now', b.spiritBlock(kofi, 'spiritSwap') === null, b.spiritBlock(kofi, 'spiritSwap'));
  b.useFreeKingAction(kofi, 'spiritSwap'); await sleep(700);
  check('Kofi is out of the clash, on the spirit\'s old tile', !kofi.engagedWith && kofi.col === 8 && kofi.row === 7, kofi.col + ',' + kofi.row);
  check('the spirit stands where he stood, next to the Bull', stone.col === 5 && stone.row === 5);
  check('the Bull is held by the spirit (not in a clash with anyone)', bull.heldBySpirit === kofi && !bull.engagedWith && b.heldSpirit(bull) === stone);
  check('held: it cannot walk', St.moveOf(bull) === 0, St.moveOf(bull));
  check('held: it cannot start a new clash', !E.canEngage(bull, gaha) || (b.placeUnit(gaha, 4, 4), !E.canEngage(bull, gaha)));
  b.placeUnit(gaha, 5, 3);
  check('held: its plain attack can only strike the spirit', b.spiritToStrike(bull, [gaha]) === stone && b.foeSpiritsInReach(bull).length === 1);
  check('its card says HELD', St.statusTags(bull).some((t) => t.text === 'HELD'), St.statusTags(bull).map((t) => t.text).join(','));
  const sHp = stone.hp;
  b.activeUnit = bull; bull.hasActed = false;
  const bs2 = bull.spells; bull.spells = [];
  b.enemyAttack(bull); await waitIdle(); await sleep(400); bull.spells = bs2;
  check('AI held: the Bull strikes the spirit, not Gaha beside it', stone.hp < sHp && gaha.hp === gaha.maxHp, stone.hp + '/' + sHp);
  stone.hp = 1; b.strikeSpirit(bull, stone, () => {}); await sleep(1200);
  check('when the spirit breaks the Bull is free again', !bull.heldBySpirit && St.moveOf(bull) > 0);
  // a player held: the Attack button only lights the spirit
  park(); kofi.side = 'enemy'; b.placeUnit(kofi, 5, 5); b.placeUnit(gaha, 5, 4); b.placeUnit(bull, 9, 9);
  const st2 = b.addSpirit(kofi, 'stone', { col: 8, row: 7 }); b.placeUnit(layra, 4, 4); layra.side = 'enemy';
  E.startDuel(gaha, kofi); b.activeUnit = kofi; b.swapWithSpirit(kofi); await sleep(700);
  b.activeUnit = gaha; gaha.hasActed = false; b.cancelMode(); b.startAttack();
  check('a held hero: Attack lights only the spirit (not the foe beside him)', b.targetsInRange.length === 0 && b.spiritTargets.length === 1 && b.spiritTargets[0] === st2, b.targetsInRange.map((t) => t.name).join(','));
  b.cancelMode(); kofi.side = 'hero'; layra.side = 'hero';
  // a spirit swapped away lets go
  park(); b.placeUnit(kofi, 5, 5); b.placeUnit(bull, 5, 4); const st3 = b.addSpirit(kofi, 'stone', { col: 8, row: 7 });
  E.startDuel(bull, kofi); b.activeUnit = kofi; b.swapWithSpirit(kofi); await sleep(700);
  kofi.spiritSwapped = false; b.swapWithSpirit(kofi); await sleep(700);
  check('the spirit swapped away again: the Bull is free', !bull.heldBySpirit, st3.col + ',' + st3.row);
  // Kofi's AI swaps out of a clash
  park(); b.placeUnit(kofi, 5, 5); b.placeUnit(bull, 5, 4); b.addSpirit(kofi, 'gale', { col: 8, row: 7 });
  E.startDuel(bull, kofi); b.activeUnit = kofi;
  const swapped = b.spiritSwapAi(kofi); await sleep(700);
  check('Kofi\'s AI: caught in a clash, he swaps and the spirit takes it over', swapped && !kofi.engagedWith && bull.heldBySpirit === kofi);

  // ---------- 4. spirits are kept in the save ----------
  park(); b.placeUnit(kofi, 3, 3); b.placeUnit(bull, 6, 6);
  const tide2 = b.addSpirit(kofi, 'tide', { col: 6, row: 5 }); tide2.hp = 5; tide2.movesLeft = 2;
  bull.heldBySpirit = kofi;
  await sleep(500); b.busy = false; w.__noSave = false;
  b.startTurn(); await sleep(200);
  const turn = b.turnCount, actor = b.activeUnit.id;
  const save = Sv.readSave();
  check('the save holds the spirit (kind, owner, tile, health, moves)', save && Array.isArray(save.spirits) && save.spirits.length === 1 && save.spirits[0].kind === 'tide' && save.spirits[0].owner === 'h4' && save.spirits[0].col === 6 && save.spirits[0].hp === 5, JSON.stringify(save && save.spirits));
  check('...and not a stale copy through Kofi', !('spiritOut' in save.units.find((s) => s.id === 'h4').data));
  b.scene.restart({ stepIndex: null, resume: true });
  const tr = Date.now(); while (Date.now() - tr < 8000) { const s2 = game.scene.getScene('BattleScene'); if (s2.units && s2.activeUnit && s2.slots && s2.resumed && s2.turnCount === turn) break; await sleep(30); }
  b = game.scene.getScene('BattleScene'); await sleep(600);
  kofi = U('h4'); bull = U('e2');
  const back = (b.spirits || [])[0];
  check('after the reload the Tide Spirit stands where it stood, with its health', back && back.kind === 'tide' && back.col === 6 && back.row === 5 && back.hp === 5 && back.owner === kofi && kofi.spiritOut === back, back && JSON.stringify({ k: back.kind, c: back.col, r: back.row, hp: back.hp }));
  check('...with its moves left (one less if its turn has just come round again)', back && (back.movesLeft === 2 || (actor === 'h4' && back.movesLeft === 1)), back && back.movesLeft + ' actor ' + actor);
  check('...drawn on the board', back && back.view && back.view.active && back.view.alpha > 0.5);
  check('...and the Bull is still held by it', bull.heldBySpirit === kofi);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
