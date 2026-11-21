// Roadmap 10.47 (Suleiman 21 Nov): Alagara's stored buff. "When one of his buffs runs out, he switches to the one he
// has stored." The Verse in his Echo slot is kept (not counted down) while it is stored; when the Active one runs
// out, the stored one takes over with the turns it had left, and the game says so over him.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n102.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const a = b.units.find((u) => u.id === 'h5');
  b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  a.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null };
  a.attune = { echo: null, swapped: false };

  // 1. The rules (status.js tickBuff)
  St.applyBuff(a, 'stone');
  const stored = a.status.buff.turnsLeft;
  St.applyBuff(a, 'fury'); // Stone goes to the Echo, Fury is Active
  check('Fury Active, Stone stored', a.status.buff.id === 'fury' && a.attune.echo && a.attune.echo.id === 'stone');
  a.status.buff.turnsLeft = 3;
  St.tickBuff(a); St.tickBuff(a);
  check('two turns on: the stored Verse has lost no turns', a.attune.echo && a.attune.echo.turnsLeft === stored, a.attune.echo && a.attune.echo.turnsLeft + ' of ' + stored);
  check('...and Fury is still Active', a.status.buff && a.status.buff.id === 'fury', a.status.buff && a.status.buff.turnsLeft);
  St.tickBuff(a);
  check('Fury runs out: the stored Stone takes over', a.status.buff && a.status.buff.id === 'stone' && !a.attune.echo);
  check('...with all the turns it had', a.status.buff && a.status.buff.turnsLeft === stored, a.status.buff && a.status.buff.turnsLeft);
  check('...and its stats now count (defense up)', St.statMod(a, 'defense') > 0, St.statMod(a, 'defense'));

  // 2. In a battle: the turn ends, the switch happens and is said over him
  a.status.buff = null; a.attune = { echo: null, swapped: false };
  St.applyBuff(a, 'swiftness'); St.applyBuff(a, 'fury');
  a.status.buff.turnsLeft = 1;
  const said = []; const realFloat = b.floatText.bind(b);
  b.floatText = (u, text, ...r) => { if (u === a) said.push(String(text)); return realFloat(u, text, ...r); };
  b.startTurn = () => {}; b.activeUnit = a; b.knockUntil = 0;
  b.endTurn();
  check('end of his turn: Swiftness (stored) is Active now', a.status.buff && a.status.buff.id === 'swiftness');
  check('the game says "Stored ... takes over"', said.some((t) => /^Stored .* takes over$/.test(t)), said.join(' | '));
  check('the card shows the new Verse', St.statusTags(a).some((t) => /SWIFT/i.test(t.text)), St.statusTags(a).map((t) => t.text).join(','));

  // 3. Taken away (Sunder Boon or Claim) also hands over to the stored one, as before
  a.status.buff = null; a.attune = { echo: null, swapped: false };
  St.applyBuff(a, 'stone'); St.applyBuff(a, 'fury');
  const gad = b.units.find((u) => u.id === 'e5');
  b.placeUnit(gad, a.col + 1 < 11 ? a.col + 1 : a.col - 1, a.row);
  gad.grip = 'fork';
  let done = false; b.castSunderBoon(gad, a, { color: "#9b6bff" }, () => { done = true; });
  const t = Date.now(); while (!done && Date.now() - t < 5000) await sleep(30);
  check('Sunder Boon tears off Fury: the stored Stone takes over', a.status.buff && a.status.buff.id === 'stone' && !a.attune.echo, a.status.buff && a.status.buff.id);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
