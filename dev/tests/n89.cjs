// Gadara's Singularity through REAL turns (Suleiman 20 Nov: "it never goes off"). The cast takes his turn; it must
// resolve within about one turn of everyone else (a fixed charge, kings.json chargeTicks), not after his own slow
// turn (speed 6: 13 turns), and then pull, slam (2 damage, Disoriented), leave the ones beside him Off-Balance,
// show the Umbra vortex, leave him Exposed with the gauge at 0. Both sides: the enemy AI and a player's taps.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n89.cjs
//       FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 FABIEN_SIDES='{"e5":"hero"}' node n89.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const g = b.units.find((u) => u.id === 'e5');
  const asHero = g.side === 'hero';
  console.log('Gadara plays on the ' + g.side + ' side');
  b.enemySecondWalk = false;
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(200); b.busy = false;
  // every other turn ends at once; Gadara's own turn after the resolve is noted, not played
  let turnsBetween = 0, resolvedOnHisTurn = false, casting = false;
  b.runEnemyTurn = () => { if (b.activeUnit !== g) b.endTurn(); };
  const realStart = b.startTurn.bind(b);
  b.startTurn = () => {
    const wasCharging = !!g.channel;
    realStart();
    const a = b.activeUnit;
    if (a === g) { resolvedOnHisTurn = wasCharging && !g.channel; return; }
    if (casting) turnsBetween++;
    if (a.side === 'hero') setTimeout(() => { if (b.activeUnit === a && !b.battleOver) b.endTurn(); }, 20);
  };
  const foes = b.units.filter((u) => u.side !== g.side);
  const mates = b.units.filter((u) => u.side === g.side && u !== g);
  // the stage: Gadara in the middle; one foe 3 tiles off (pulled next to him), two in a row on his right (the far one
  // slams into the near one), everyone else far away in the corners
  const stage = () => {
    let i = 0;
    for (const u of b.units) {
      u.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null }; u.hp = u.maxHp; u.alive = true; u.engagedWith = null;
      if (u !== g) { b.placeUnit(u, [0, 10, 0, 10, 1, 9, 1, 9][i % 8], [0, 0, 10, 10, 0, 0, 10, 10][i % 8]); i++; }
    }
    b.placeUnit(g, 5, 5);
    b.placeUnit(foes[0], 5, 8); b.placeUnit(foes[1], 7, 5); b.placeUnit(foes[2], 8, 5);
    g.mask = 6; g.channel = null; g.singularityUsed = false; g.hasActed = false; g.hasMoved = false; g.stepsUsed = 0;
  };
  stage();
  const hp = foes.map((f) => f.hp);
  const at = foes.map((f) => [f.col, f.row]);
  // whose turn: Gadara's, with a fresh clock (as if his turn had just begun)
  for (const u of b.units) u.ct = u === g ? 0 : Math.min(u.ct, 60);
  b.activeUnit = g; b.busy = false; b.cancelMode();
  casting = true;
  if (asHero) {
    b.chooseSpell('singularity'); b.handleTap(g.col, g.row); b.handleTap(g.col, g.row);
  } else {
    b.kingAiAct(g, () => { b.busy = false; b.endTurn(); });
  }
  check('the cast: the mask goes on, Singularity charges', !!g.channel);
  check('...his turn clock is moved on (a fixed charge, not his speed)', g.ct >= 100 - g.speed * 8 - 1, Math.round(g.ct));
  // the Umbra vortex: note every effect picture made while it resolves
  const made = []; const realSprite = b.add.sprite.bind(b.add), realImage = b.add.image.bind(b.add);
  b.add.sprite = (x, y, key, ...r) => { made.push(String(key)); return realSprite(x, y, key, ...r); };
  b.add.image = (x, y, key, ...r) => { made.push(String(key)); return realImage(x, y, key, ...r); };
  const knocks = []; { const o = b.knockBack.bind(b); b.knockBack = (u, p, ...r) => { knocks.push(u.name + ':' + p.path.length); return o(u, p, ...r); }; }
  const t0 = Date.now();
  while (!resolvedOnHisTurn && Date.now() - t0 < 30000) await sleep(50);
  check('it goes off at the start of his next turn', resolvedOnHisTurn);
  check('...within about one turn of each other fighter (7 others)', turnsBetween >= 1 && turnsBetween <= 9, turnsBetween);
  await sleep(2400);
  check('the far foe is pulled next to him', Math.abs(foes[0].col - g.col) + Math.abs(foes[0].row - g.row) === 1, at[0] + ' -> ' + foes[0].col + ',' + foes[0].row);
  check('...and is Off-Balance', St.isOffBalance(foes[0]));
  check('the foe behind slams into the one in front: 2 damage', hp[2] - foes[2].hp === 2, hp[2] + ' -> ' + foes[2].hp);
  check('...and is Disoriented', !!(foes[2].status.disoriented || (St.isDisoriented && St.isDisoriented(foes[2]))), JSON.stringify(foes[2].status).slice(0, 120));
  check('the pulls are drawn (knockbacks)', knocks.length >= 1, knocks.join(' '));
  check('the Umbra vortex is shown', made.some((k) => k.includes('umbra_vortex')), made.filter((k) => k.includes('umbra')).slice(0, 3).join(','));
  check('his allies are not pulled', mates.every((m) => m.col === 0 || m.col === 10 || m.col === 1 || m.col === 9));
  check('after: Exposed (defense -2, evade -10), gauge 0, used, no charge', St.statMod(g, 'defense') <= -2 && St.statMod(g, 'evade') <= -10 && g.mask === 0 && g.singularityUsed && !g.channel);
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
