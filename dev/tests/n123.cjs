// 27 Nov freeze (Baiyee, desktop): Layra, low on health, walked onto the hidden Thief's trap, died mid-walk, and
// nobody ever got a turn again. Cause: a player's walk has nothing to do when it ends; only a tap ends the turn,
// and a fallen hero has no menu. Fix (BattleScene.watchDeadTurn): a fighter who falls in its own turn ends that turn
// once the board settles, and a safety net ends ANY turn whose fighter has fallen 5 seconds after the fall.
// One check for each way of dying mid-move: the trap, Rabdul's Spear Ward, Leol's Suppressive Fire, a wall slam
// (the trap's throw into someone), an AI fighter on a trap (no blow from beyond), the last hero (Defeat shows),
// and the safety net with the game stuck busy.
// Run:  FABIEN_MAP=cavern FABIEN_NEW=1 FABIEN_KINGS=1 FABIEN_BENCH= node n123.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const E = w.__engagement;
  const U = (id) => b.units.find((u) => u.id === id);
  const layra = U('h3'), gaha = U('h2'), sudeen = U('h1'), thief = U('e6'), rabdul = U('e4'), leol = U('h6'), bull = U('e2');
  check('Layra, Gaha, Sudeen, the Thief, Rabdul, Leol and the Bull are in the battle', !!(layra && gaha && sudeen && thief && rabdul && leol && bull));
  b.enemySecondWalk = false;
  b.runEnemyTurn = () => {}; // the next fighter's turn is only started, not played
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => {
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; b.battleOver = false; b.knockUntil = 0; b.watchingDead = null;
    for (const t of [...(b.traps || [])]) b.removeTrap(t);
    let i = 0;
    for (const u of b.units) {
      if (u.engagedWith) E.endDuel(u);
      u.status = fresh(); u.zone = null; b.clearZoneMark(u); u.stepsUsed = 0; u.hasMoved = false; u.hasActed = false; u.hidden = false; u.thiefHidden = false; u.knock = null;
      if (!u.alive) { u.alive = true; if (u.view) u.view.setAlpha(1); }
      u.hp = u.maxHp;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
  };
  // a hero's turn as the player plays it: the walk is a tap, nothing follows it
  const herosTurn = (u) => { b.activeUnit = u; b.turnCount += 1; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.busy = false; b.cancelMode(); };
  // the turn has passed to a living fighter (within "ms")
  const movesOn = async (dead, turn, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (b.battleOver || (b.turnCount > turn && b.activeUnit !== dead && b.activeUnit.alive)) return Date.now() - t; await sleep(50); } return -1; };
  const sure = (u) => { u.accuracy = 400; };
  // the ward's roll is capped below 100: during these walks every roll is a tiny number (never a constant: Phaser names text with it)
  const rnd = Math.random; const lucky = () => { Math.random = () => 0.001 + rnd() * 0.001; }; const fair = () => { Math.random = rnd; };

  // 1. the trap (Baiyee's case: Layra near a lamp, low on health, the Thief Hidden)
  park(); b.placeUnit(layra, 5, 8); b.placeUnit(thief, 3, 3);
  b.castTrap(thief, { col: 5, row: 6 }, { max: 2 }, () => {}); await sleep(800); b.time.removeAllEvents(); b.busy = false;
  b.hideThief(thief);
  herosTurn(layra); layra.hp = 4; let turn = b.turnCount;
  b.moveUnit(layra, 5, 5);
  let took = await movesOn(layra, turn);
  check('trap: Layra falls on it mid-walk', !layra.alive);
  check('...and the turn passes on by itself (no freeze)', took >= 0, took + ' ms, now ' + (b.activeUnit && b.activeUnit.name));

  // 2. Rabdul's Spear Ward
  park(); b.placeUnit(rabdul, 5, 4); b.placeUnit(gaha, 5, 8);
  b.castSpell(rabdul, rabdul, 'spearWard', () => {}); await sleep(800); b.time.removeAllEvents(); b.busy = false;
  check('Spear Ward is set', !!rabdul.zone);
  herosTurn(gaha); gaha.hp = 1; gaha.evade = -500; sure(rabdul); turn = b.turnCount;
  lucky(); b.moveUnit(gaha, 5, 5);
  took = await movesOn(gaha, turn, 6000); fair();
  check('Spear Ward: Gaha falls walking in', !gaha.alive, gaha.hp);
  check('...and the turn passes on', took >= 0, took);

  // 3. Leol's Suppressive Fire (on the heroes' side here, so a foe walks in: the Bull, played by the player as a test)
  park();
  // a row where Leol, 3 tiles off, has a clear shot at the tile Sudeen walks into (the cavern's rocks block some)
  let row = -1;
  b.placeUnit(leol, 1, 5); b.castSpell(leol, leol, 'suppressiveFire', () => {}); await sleep(800); b.time.removeAllEvents(); b.busy = false;
  check('Suppressive Fire is set', leol.zone && leol.zone.mode === 'sling');
  leol.side = 'enemy'; // (a hero walks into an ENEMY's ward: Leol on the enemies' side for this one)
  for (let r = 1; r < 10 && row < 0; r++) {
    b.placeUnit(leol, 1, r); b.placeUnit(sudeen, 7, r);
    if (b.isBlocked(6, r) || b.isBlocked(5, r) || b.isBlocked(4, r)) continue;
    const trig = b.wardTrigger(sudeen, [6, 5, 4].map((c) => ({ col: c, row: r })), new Set());
    if (trig && trig.warder === leol) row = r;
  }
  check('...a lane in its sight', row >= 0, row);
  herosTurn(sudeen); sudeen.hp = 1; sudeen.evade = -500; sure(leol); turn = b.turnCount;
  const said3 = []; const ft3 = b.floatText.bind(b); b.floatText = (u, t, ...r) => { if (u === sudeen) said3.push(t); return ft3(u, t, ...r); };
  lucky(); b.moveUnit(sudeen, 4, row);
  took = await movesOn(sudeen, turn, 6000); fair();
  b.floatText = ft3;
  check('Suppressive Fire: Sudeen falls walking in', !sudeen.alive, sudeen.hp + ' at ' + sudeen.col + ',' + sudeen.row + ' said ' + said3.join('|'));
  check('...and the turn passes on', took >= 0, took);
  leol.side = 'hero'; leol.zone = null; b.clearZoneMark(leol);

  // 4. a wall slam: the trap throws her back into someone, and the slam finishes her
  park(); b.placeUnit(layra, 5, 8); b.placeUnit(bull, 5, 7); b.placeUnit(thief, 2, 2);
  b.castTrap(thief, { col: 5, row: 5 }, { max: 2 }, () => {}); await sleep(800); b.time.removeAllEvents(); b.busy = false;
  b.placeUnit(layra, 5, 4); b.placeUnit(bull, 5, 3); // she walks down from 5,4 to 5,5... the throw goes back up, into the Bull
  herosTurn(layra); layra.hp = 7; turn = b.turnCount;
  b.moveUnit(layra, 5, 6);
  took = await movesOn(layra, turn, 6000);
  check('wall slam: the trap (6) and the slam into the Bull finish her', !layra.alive, layra.hp + ' at ' + layra.col + ',' + layra.row);
  check('...and the turn passes on', took >= 0, took);

  // 5. an AI fighter on a trap: no blow from beyond, its turn ends
  park(); b.placeUnit(bull, 5, 2); b.placeUnit(gaha, 5, 7); b.placeUnit(thief, 9, 9);
  thief.side = 'hero'; b.castTrap(thief, { col: 5, row: 4 }, { max: 2 }, () => {}); await sleep(800); b.time.removeAllEvents(); b.busy = false; // (the Thief on the heroes' side, so the Bull is his foe)
  b.activeUnit = bull; b.turnCount += 1; bull.hp = 1; bull.fury = 0; turn = b.turnCount;
  let blows = 0; const pa = b.performAttack.bind(b); b.performAttack = (a, ...r) => { if (a === bull) blows++; return pa(a, ...r); };
  b.moveUnit(bull, 5, 4, () => b.enemyAttack(bull));
  took = await movesOn(bull, turn, 4000);
  b.performAttack = pa; thief.side = 'enemy';
  check('AI on a trap: the Bull falls', !bull.alive, bull.hp + ' at ' + bull.col + ',' + bull.row);
  check('...strikes nobody after it fell', blows === 0, blows);
  check('...and its turn passes on', took >= 0, took);

  // 6. the safety net: the game is stuck busy after the fall; 5 seconds later the turn moves on anyway
  park(); herosTurn(gaha); turn = b.turnCount;
  b.busy = true; gaha.hp = 0; b.defeat(gaha);
  const early = await movesOn(gaha, turn, 3000);
  check('safety net: nothing happens while the game is busy at first', early < 0, early);
  took = await movesOn(gaha, turn, 4000);
  check('...but within 5 seconds of the fall the next fighter gets his turn', took >= 0, took);

  // 7. the last hero falls on a trap in her own turn: the battle ends (Defeat), no freeze
  park(); for (const u of b.units) if (u.side === 'hero' && u !== layra) { u.hp = 0; b.defeat(u); }
  b.watchingDead = null; b.placeUnit(layra, 5, 8); b.placeUnit(thief, 3, 3);
  b.castTrap(thief, { col: 5, row: 6 }, { max: 2 }, () => {}); await sleep(800); b.time.removeAllEvents(); b.busy = false;
  let result = null; const sr = b.showResult.bind(b); b.showResult = (o) => { result = o; return sr(o); };
  herosTurn(layra); layra.hp = 2;
  b.moveUnit(layra, 5, 5);
  const t7 = Date.now(); while (!result && Date.now() - t7 < 5000) await sleep(50);
  check('last hero falls on a trap: the battle ends in Defeat', result === 'defeat' || /defeat/i.test(String(result)), result);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
