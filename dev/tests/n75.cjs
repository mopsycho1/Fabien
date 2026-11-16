// Roadmap 13.59: Gaha's Spearman Build (Suleiman's PDF, 15 Nov): Lunge, Counterstep, Riposte.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n75.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, G = w.__grid, combat = w.__combat, E = w.__engagement;
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), sudeen = U('h1'), layra = U('h3'), bull = U('e2'), archer = U('e3'), rabdul = U('e4'), tayo = U('e1'), kofi = U('h4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 12000) await sleep(30); await sleep(80); };
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  const fresh = (u) => { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.mp = u.maxMp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.riposte = 0; u.counterTurn = undefined; u.lungeBonus = 0; u.alive = true; u.hidden = false; };
  const park = () => {
    for (const u of b.units) fresh(u);
    put(sudeen, 0, 10); put(layra, 1, 10); put(kofi, 2, 10); put(tayo, 10, 0); put(archer, 9, 0); put(rabdul, 8, 0); put(bull, 10, 10);
    b.busy = false; b.cancelMode(); b.refreshEngagementMarks(); b.refreshStatusTags();
  };
  // a straight run of 7 free tiles in a row, no step of more than 1 level, so the test has room
  park();
  let line = null;
  for (let r = 0; r < 11 && !line; r++) for (let c = 0; c + 6 < 11 && !line; c++) {
    const tiles = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ col: c + i, row: r }));
    if (tiles.every((t, i) => G.isInsideGrid(t.col, t.row) && !b.isBlocked(t.col, t.row) && (i === 0 || Math.abs(G.getHeight(t.col, t.row) - G.getHeight(tiles[i - 1].col, tiles[i - 1].row)) <= 1))) line = tiles;
  }
  check('the cavern has a free line of 7 tiles to test on', !!line, JSON.stringify(line && line[0]));
  const L = (i) => line[i];

  // ---------- the data ----------
  check('Gaha has Lunge, Riposte as his signature in Slip, and the Counterstep passive', gaha.spells.includes('lunge') && gaha.signature && gaha.signature.id === 'riposte' && gaha.signature.stance === 'slip' && gaha.counterstep === true, gaha.spells.join());
  check('other fighters have no Counterstep or Riposte', !sudeen.counterstep && !bull.counterstep && !rabdul.counterstep && (!bull.signature || bull.signature.id !== 'riposte'));

  // ---------- Lunge: where it can go ----------
  park(); put(gaha, L(0).col, L(0).row);
  const sp = w.__spells || null;
  const lunge = require('fs') && JSON.parse(require('fs').readFileSync(__dirname + '/../../src/data/spells.json', 'utf8')).lunge;
  check('Lunge numbers: range 4 (from 3), cooldown 3, +1 per tile', lunge.range === 4 && lunge.minRange === 2 && lunge.cooldown === 3 && lunge.bonusPerTile === 1);
  const at = (i) => { put(bull, L(i).col, L(i).row); return b.lungeSpot(gaha, bull, lunge); };
  check('a foe 4 tiles away in a line: he runs 2 tiles', (() => { const s = at(4); return !!s && s.path.length === 2 && s.col === L(2).col && s.row === L(2).row; })());
  check('a foe 3 tiles away: he runs 1 tile', (() => { const s = at(3); return !!s && s.path.length === 1; })());
  check('a foe 2 tiles away: a Lunge with no run (+0)', (() => { const s = at(2); return !!s && s.path.length === 0; })());
  check('a foe next to him: no Lunge', at(1) === null);
  check('a foe 5 tiles away: too far', at(5) === null);
  put(bull, L(3).col, L(3).row + 1 <= 10 ? L(3).row + 1 : L(3).row - 1);
  check('a foe not in a straight line: no Lunge', b.lungeSpot(gaha, bull, lunge) === null);
  put(bull, L(4).col, L(4).row); put(layra, L(2).col, L(2).row);
  check('someone standing in the way: no Lunge', b.lungeSpot(gaha, bull, lunge) === null);
  put(layra, 1, 10);
  gaha.engagedWith = bull;
  check('in a clash: no Lunge', b.lungeSpot(gaha, bull, lunge) === null);
  gaha.engagedWith = null;

  // ---------- Lunge: the blow ----------
  park(); put(gaha, L(0).col, L(0).row); put(bull, L(4).col, L(4).row);
  bull.accuracy = 0; gaha.accuracy = 200; bull.evade = -500; // he cannot miss more than 5 in 100
    gaha.status.rooted = true;
  let hitDmg = null, tries = 0;
  const base = combat.getDamage(gaha, bull);
  while (hitDmg === null && tries < 12) {
    tries++; put(gaha, L(0).col, L(0).row); put(bull, L(4).col, L(4).row); bull.hp = bull.maxHp; gaha.status.cooldowns = {}; gaha.hasActed = false; gaha.hasMoved = false; gaha.status.rooted = true;
    b.activeUnit = gaha; b.busy = true;
    b.castSpell(gaha, bull, 'lunge', () => { b.busy = false; });
    await idle();
    if (bull.hp < bull.maxHp) hitDmg = bull.maxHp - bull.hp;
  }
  check('Lunge over 2 tiles hits for a Thrust plus 2', hitDmg === base + 2, 'base ' + base + ' got ' + hitDmg);
  check('he ends 2 tiles on, in spear reach of the foe', gaha.col === L(2).col && gaha.row === L(2).row && combat.inReach(gaha, bull));
  check('the Lunge bonus is used up, not kept', !gaha.lungeBonus);
  check('it cancels Rooted', !St.isRooted(gaha) && gaha.hasMoved === true);
  check('the run does not use up his Move (he can still walk, 13.53)', !gaha.stepsUsed && b.stepsLeft(gaha) === St.moveOf(gaha), 'steps used ' + gaha.stepsUsed);
  check('Lunge goes on cooldown (3 turns)', St.cooldownOf(gaha, 'lunge') === 3 && !St.canAfford(gaha, 'lunge'));
  // a 3-tile foe: +1
  park(); bull.evade = -500; gaha.accuracy = 200; hitDmg = null; tries = 0;
  while (hitDmg === null && tries < 12) {
    tries++; put(gaha, L(0).col, L(0).row); put(bull, L(3).col, L(3).row); bull.hp = bull.maxHp; gaha.status.cooldowns = {};
    b.busy = true; b.castSpell(gaha, bull, 'lunge', () => { b.busy = false; }); await idle();
    if (bull.hp < bull.maxHp) hitDmg = bull.maxHp - bull.hp;
  }
  check('Lunge over 1 tile hits for a Thrust plus 1', hitDmg === combat.getDamage(gaha, bull) + 1, 'got ' + hitDmg);

  // ---------- Lunge: the enemy AI ----------
  park(); fresh(rabdul); rabdul.spells = [...rabdul.spells, 'lunge']; rabdul.lineReach = true; rabdul.range = 2; rabdul.melee = true; rabdul.accuracy = 200; rabdul.mp = 0; /* no Enchant first */
  put(rabdul, L(0).col, L(0).row); put(gaha, L(4).col, L(4).row); gaha.evade = -500;
  b.activeUnit = rabdul; b.seen = null; b.busy = false;
  b.enemyAttack(rabdul); await idle(); await sleep(400); await idle();
  check('an enemy with Lunge uses it on a hero 4 tiles away in a line', St.cooldownOf(rabdul, 'lunge') === 3 && rabdul.hasActed && distanceOk(rabdul, gaha), rabdul.col + ',' + rabdul.row);
  function distanceOk(a, c) { return Math.abs(a.col - c.col) + Math.abs(a.row - c.row) <= 2; }
  rabdul.spells = rabdul.spells.filter((s) => s !== 'lunge');

  // ---------- Counterstep ----------
  const missAt = async (attacker, defender) => { // the attacker strikes and misses (it keeps trying until it does)
    for (let i = 0; i < 30; i++) {
      attacker.accuracy = -1000; attacker.hasActed = false; defender.hp = defender.maxHp;
      const before = attacker.hp;
      b.busy = true; b.performAttack(attacker, defender, () => { b.busy = false; }); await idle();
      if (defender.hp === defender.maxHp) return true; // a miss
    }
    return false;
  };
  park(); put(gaha, 5, 5); put(bull, 5, 6); const bullAcc = bull.accuracy;
  b.turnCount = 10; bull.hp = bull.maxHp;
  let missed = await missAt(bull, gaha);
  const expect = Math.max(1, Math.round(combat.getDamage(gaha, bull) * 0.6));
  check('a miss on Gaha gives him a free Thrust at 60 percent', missed && bull.hp === bull.maxHp - expect, 'bull lost ' + (bull.maxHp - bull.hp) + ', want ' + expect);
  check('it used his Counterstep for the round', gaha.counterTurn === 10);
  bull.hp = bull.maxHp; missed = await missAt(bull, gaha);
  check('a second miss in the same round: no second Counterstep', missed && bull.hp === bull.maxHp, 'bull hp ' + bull.hp);
  b.turnCount = 10 + b.units.filter((u) => u.alive).length; bull.hp = bull.maxHp;
  missed = await missAt(bull, gaha);
  check('a full round later it is ready again', missed && bull.hp === bull.maxHp - expect, 'bull lost ' + (bull.maxHp - bull.hp));
  // Off-Balance attacker: full damage
  park(); put(gaha, 5, 5); put(bull, 5, 6); b.turnCount = 40; E.applyOffBalance ? E.applyOffBalance(bull) : St.applyOffBalance(bull);
  const hpFull = bull.maxHp; await missAt(bull, gaha);
  check('an Off-Balance attacker takes the Counterstep at full damage', bull.hp === hpFull - combat.getDamage(gaha, bull), 'lost ' + (hpFull - bull.hp));
  // never while stunned, meditating or in a clash
  for (const [name, setup, undo] of [
    ['Stunned', () => St.applyStun(gaha), () => St.clearStun(gaha)],
    ['Meditating', () => { gaha.meditating = { turns: 1 }; }, () => { gaha.meditating = null; }],
    ['in a clash', () => { gaha.engagedWith = layra; }, () => { gaha.engagedWith = null; }],
  ]) {
    park(); put(gaha, 5, 5); put(bull, 5, 6); b.turnCount = 80; setup();
    if (name === 'Stunned') { /* a stunned unit cannot dodge: it is hit, so the test checks the rule directly */ check('no Counterstep while ' + name, !b.canCounterstep(gaha, bull)); }
    else check('no Counterstep while ' + name, !b.canCounterstep(gaha, bull));
    undo();
  }
  park(); put(gaha, 5, 5); put(bull, 5, 6); b.turnCount = 90;
  check('and the rule is on when none of those is true', b.canCounterstep(gaha, bull) === true);
  put(archer, 5, 4); archer.weapon = 'bow';
  check('an archer with her bow does not set it off', b.canCounterstep(gaha, archer) === false);
  archer.weapon = 'dagger';
  check('an archer stabbing with her dagger does', b.canCounterstep(gaha, archer) === true);
  archer.weapon = 'bow';
  check('Layra, who cannot be caught, does not either', b.canCounterstep(gaha, layra) === false);
  // Double Hit (a melee skill that rolls to hit) sets it off too
  park(); put(gaha, 5, 5); put(rabdul, 5, 6); rabdul.accuracy = -1000; b.turnCount = 100; rabdul.hp = rabdul.maxHp;
  b.busy = true; b.castDoubleHit(rabdul, gaha, JSON.parse(require('fs').readFileSync(__dirname + '/../../src/data/spells.json', 'utf8')).doubleHit, () => { b.busy = false; }); await idle(); await sleep(300); await idle();
  check('misses from Double Hit set off Counterstep too', gaha.counterTurn === 100 && rabdul.hp < rabdul.maxHp, 'rabdul ' + rabdul.hp + ' counterTurn ' + gaha.counterTurn);
  // a Counterstep is a free strike, not an attack roll: it cannot set off another
  park(); put(gaha, 5, 5); put(bull, 5, 6); bull.counterstep = true; b.turnCount = 120;
  await missAt(bull, gaha); // gaha counterstrikes bull, who also has the passive
  check('a Counterstep cannot trigger another one', bull.counterTurn === undefined && gaha.counterTurn === 120, 'bull ' + bull.counterTurn);
  bull.counterstep = false;

  // ---------- Riposte ----------
  const mkBeat = (winner, loser, winStance, loseStance, decisive = false, kind = 'win') => ({
    kind, actor: winner, holder: loser, actorStance: winStance, holderStance: loseStance, winner: kind === 'even' ? null : winner, loser: kind === 'even' ? null : loser, decisive, margin: 3, actorScore: 10, holderScore: 5, shift: 1,
  });
  park(); put(gaha, 5, 5); put(bull, 5, 6); E.startDuel(gaha, bull);
  let out = b.applyBeat(mkBeat(gaha, bull, 'slip', 'press'));
  check('first Slip win: a hit of 1 (no stacks yet), then 1 stack', out.sig.length === 1 && out.sig[0].word === 'Riposte' && out.sig[0].damage >= 1 && gaha.riposte === 1, 'stacks ' + gaha.riposte + ' dmg ' + (out.sig[0] && out.sig[0].damage));
  const dmg1 = out.sig[0].damage;
  out = b.applyBeat(mkBeat(gaha, bull, 'slip', 'press'));
  check('second Slip win: he holds 2 stacks', gaha.riposte === 2 && out.sig[0].damage >= dmg1, 'dmg ' + out.sig[0].damage);
  out = b.applyBeat(mkBeat(gaha, bull, 'slip', 'press'));
  check('stacks stop at 2', gaha.riposte === 2);
  const stats = require('fs'); // the exact numbers, read from the rules the game uses
  const rules = JSON.parse(stats.readFileSync(__dirname + '/../../src/data/engagement.json', 'utf8')).signatures.riposte;
  check('numbers: 2 stacks at most, base hit 1', rules.maxStacks === 2 && rules.winHitBase === 1);
  // the raw hit sizes, through afterBeat's own list (health is changed by the scene, so read the effect list)
  const sigMod = w.__sig || null;
  out = b.applyBeat(mkBeat(gaha, bull, 'press', 'slip')); // a Press win does not add a stack
  check('a Press win adds no stack and does not clear them', gaha.riposte === 2 && out.sig.length === 0);
  out = b.applyBeat(mkBeat(gaha, bull, 'slip', 'slip', false, 'even'));
  check('an even beat leaves the stacks alone', gaha.riposte === 2);
  out = b.applyBeat(mkBeat(bull, gaha, 'press', 'slip'));
  check('losing any beat clears the stacks', gaha.riposte === 0);
  // hit sizes: 1, 2, 3 against a foe with 0 defence
  bull.defense = 0; bull.hp = bull.maxHp = 60; gaha.riposte = 0; const sizes = [];
  for (let i = 0; i < 4; i++) { const before = bull.hp; out = b.applyBeat(mkBeat(gaha, bull, 'slip', 'press')); sizes.push(before - bull.hp); }
  check('a won Slip beat hits for 1, then 2, then 3, then 3 (1 plus the stacks held)', sizes.join() === '1,2,3,3', sizes.join());
  // statusTags shows the stacks
  check('the stacks show as RIPOSTE 2 over him', St.statusTags(gaha).some((t) => t.text === 'RIPOSTE 2'));
  // decisive Slip win: a step to a free tile, the clash ends, the foe is Off-Balance, no push
  park(); put(gaha, 5, 5); put(bull, 5, 6); E.startDuel(gaha, bull); const bullTile = bull.col + ',' + bull.row;
  out = b.applyBeat(mkBeat(gaha, bull, 'slip', 'press', true));
  const stepped = out.riposteStep;
  check('a decisive Slip win steps him to a free tile next to where he stood', !!stepped && Math.abs(stepped.col - 5) + Math.abs(stepped.row - 5) === 1 && gaha.col === stepped.col && gaha.row === stepped.row, JSON.stringify(stepped));
  check('the clash is over', !gaha.engagedWith && !bull.engagedWith);
  check('the foe is left Off-Balance, and was not pushed', St.isOffBalance(bull) && bull.col + ',' + bull.row === bullTile);
  check('the stacks end with the clash', gaha.riposte === 0);
  // a decisive win with Press pushes as before, no step
  park(); put(gaha, 5, 5); put(bull, 5, 6); E.startDuel(gaha, bull);
  out = b.applyBeat(mkBeat(gaha, bull, 'press', 'slip', true));
  check('a decisive Press win is the old push, no Riposte step', !out.riposteStep);
  // a decisive Slip win with no room: the usual decisive result
  park(); put(gaha, 0, 0); put(bull, 0, 1); put(layra, 1, 0); E.startDuel(gaha, bull);
  out = b.applyBeat(mkBeat(gaha, bull, 'slip', 'press', true));
  check('no free tile beside him: the plain decisive result (no step, no error)', !out.riposteStep);
  // the whole beat, drawn
  park(); put(gaha, 5, 5); put(bull, 5, 6); E.startDuel(gaha, bull); b.activeUnit = gaha; b.busy = true;
  b.duelBeat(gaha, 'slip', bull, 'press', false, false, () => { b.busy = false; }); await idle(); await sleep(2500); await idle();
  check('a drawn clash beat with Riposte runs without an error', true);
  // the auto pick for Gaha is his signature stance
  park(); put(gaha, 5, 5); put(bull, 5, 6); E.startDuel(gaha, bull); bull.stance = null;
  check('on Auto Gaha fights in Slip', b.autoStanceFor(gaha) === 'slip', b.autoStanceFor(gaha));

  const realErr = errors.filter((e) => !e.includes('focus()'));
  check('no errors', realErr.length === 0, realErr.slice(0, 2).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
