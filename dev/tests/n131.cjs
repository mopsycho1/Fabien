// 10.57 (Baiyee 28 Nov): "Gadara's Shadow Passage doesn't seem to work when played by a person".
// The cause: his skills sit in groups (Techniques, Spells), and a group row was greyed out (and could not be opened)
// whenever nothing in it could be used now. With 0 masks after a walk (the old gauge started at 0) every Spell was
// blocked, so "Spells >" was grey and the player never saw Shadow Passage or why. Fixed: a group always opens before
// he acts, and the rows say what they need ("needs 1 mask per foe", "no foe within 2").
// Then a player casts it through the board's own tap handler on 1 foe and on 2 foes.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 FABIEN_SIDES='{"e5":"hero"}' node n131.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const U = (id) => b.units.find((u) => u.id === id);
  const gad = U('e5'), bull = U('e2'), rab = U('e4');
  check('Gadara plays on the heroes\' side', gad && gad.side === 'hero');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => {
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; b.cancelMode();
    let i = 0;
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.status = fresh(); u.hidden = false; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; }
    gad.passaged = false; gad.channel = null; b.activeUnit = gad; b.spellGroup = null;
  };
  const rowsNow = () => b.spellMenu(gad).map((r) => r.label + (r.enabled ? '' : ' [grey]'));

  // ---------- the greyed group ----------
  park(); b.placeUnit(gad, 5, 5); b.placeUnit(bull, 5, 6);
  gad.mask = 0; gad.hasMoved = true; gad.stepsUsed = 2; // he walked, and has no mask (the old gauge's start)
  const spellsRow = b.spellMenu(gad).find((r) => /^Spells/.test(r.label));
  check('0 masks after a walk: the Spells group still opens (nothing in it can be used)', spellsRow && spellsRow.enabled, rowsNow().join(' | '));
  b.openSpellGroup('Spells');
  const inside = rowsNow();
  check('...inside, Shadow Passage says "needs 1 mask per foe"', inside.some((t) => /^Shadow Passage {2}needs 1 mask per foe \[grey\]$/.test(t)), inside.join(' | '));
  check('...Shadow Step says "needs 1 mask"', inside.some((t) => /^Shadow Step {2}needs 1 mask \[grey\]$/.test(t)), inside.join(' | '));
  b.spellGroup = null;
  gad.mask = 2; b.placeUnit(bull, 5, 9);
  check('with masks but no foe within 2: "no foe within 2"', b.kingBlock(gad, 'shadowPassage') === 'no foe within 2', b.kingBlock(gad, 'shadowPassage'));
  gad.hasActed = true;
  check('after he has acted, a group with nothing left to use is greyed again', !b.spellMenu(gad).find((r) => /^Spells/.test(r.label)).enabled);

  // ---------- a player casts it: 1 foe, then 2 ----------
  for (const n of [1, 2]) {
    park(); b.placeUnit(gad, 5, 5); b.placeUnit(bull, 5, 6); if (n === 2) b.placeUnit(rab, 6, 5);
    gad.mask = 3; b.refreshButtons();
    const from = { col: gad.col, row: gad.row };
    b.openSpellGroup('Spells');
    const row = b.spellMenu(gad).find((r) => /^Shadow Passage/.test(r.label));
    check(n + ' foe(s): the row can be pressed', row && row.enabled, row && row.label);
    row.onTap();
    check(n + ': the foes and he are lit', b.mode === 'spellTarget' && b.targetsInRange.includes(bull) && b.targetsInRange.includes(gad));
    b.handleTap(bull.col, bull.row);
    if (n === 2) b.handleTap(rab.col, rab.row);
    check(n + ': the taps pick them, the hint counts them', b.passengers.length === n && new RegExp(n + ' of 3').test(b.statusText.text), b.statusText.text.replace(/\n/g, ' '));
    let done = false; const o = b.kingFinish.bind(b); b.kingFinish = (d, ms) => o(() => { b.kingFinish = o; done = true; d && d(); }, ms);
    b.handleTap(gad.col, gad.row); // tap him to go
    const t0 = Date.now(); while (!done && Date.now() - t0 < 9000) await sleep(30); await sleep(300);
    check(n + ': he lands 4 or more tiles away', dist(gad, from) >= 4, from.col + ',' + from.row + ' to ' + gad.col + ',' + gad.row);
    check(n + ': the foe(s) beside him', dist(bull, gad) === 1 && (n === 1 || dist(rab, gad) === 1));
    check(n + ': ' + n + ' mask(s) spent, his action and walk taken', gad.mask === 3 - n && gad.hasActed && gad.stepsUsed === Infinity, gad.mask);
    check(n + ': the turn is his again, not stuck', !b.busy && b.activeUnit === gad);
  }

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
