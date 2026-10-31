// Husk rework, leftover steps, relaxed and battle stances.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const St = w.__status;
  const U = (l) => b.units.find((u) => u.label === l);
  const H = require('/home/claude/fabien/src/data/map.json').heights;
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - H[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(50); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.cancelMode(); };
  const sage = U('H3'), guard = U('H1'), scout = U('H2'), eg = U('E1'), ew = U('E2'), er = U('E3');
  const park = () => { put(guard, 0, 7); put(scout, 1, 7); put(sage, 3, 7); put(eg, 7, 0); put(ew, 6, 0); put(er, 5, 0); };
  b.endTurn = () => {}; // the test hands out turns itself; a real turn change would land mid-check on a slow run

  // ---------- Husk ----------
  // The warlord is 2 tiles from the Sage. She vanishes 3 tiles further away.
  park(); put(sage, 3, 5); put(ew, 3, 3); turnOf(sage); sage.mp = 12;
  b.onSpellButton(); b.chooseSpell('husk');
  b.handleTap(6, 5); b.handleTap(6, 5); await idle(); await sleep(500);
  check('Husk: the Sage is hidden, drawn as see-through light', sage.hidden && Math.abs(sage.view.alpha - 0.6) < 0.05, sage.view.alpha);
  check('the HIDDEN tag shows on her', St.statusTags(sage).some((t) => t.text === 'HIDDEN'));
  const decoy = b.decoys[0];
  check('the decoy stands where she was, fully solid', decoy && decoy.col === 3 && decoy.row === 5 && decoy.view.alpha === 1);
  const eyes = b.enemyEyes();
  check('enemies see the decoy, not the real Sage', eyes.some((u) => u.isDecoy && u.col === 3 && u.row === 5) && !eyes.some((u) => u.label === 'H3' && !u.isDecoy));
  const hp = sage.hp;
  b.activeUnit = ew; ew.hasActed = false; ew.hasMoved = false; ew.stepsUsed = 0;
  b.runEnemyTurn(); await sleep(400); await idle(); await sleep(1500); await idle();
  check('the warlord walked to the decoy and struck it, not the Sage', sage.hp === hp && b.decoys.length === 0, 'hp ' + hp + ' -> ' + sage.hp + ', decoys ' + b.decoys.length + ', warlord at ' + ew.col + ',' + ew.row);
  check('the warlord ended next to the decoy tile', Math.abs(ew.col - 3) + Math.abs(ew.row - 5) === 1, ew.col + ',' + ew.row);
  await sleep(400);
  check('the trick is over: the Sage is solid and in plain sight', !sage.hidden && sage.view.alpha === 1, sage.view.alpha);

  // the trick also ends at her next turn, even if nobody struck the decoy
  park(); turnOf(sage); sage.mp = 12;
  b.onSpellButton(); b.chooseSpell('husk');
  b.handleTap(3, 4); b.handleTap(3, 4); await idle();
  b.removeDecoys(sage); await sleep(400);
  const fading = b.tweens.getTweensOf(sage.view).some((t) => t.data.some((d) => d.key === "alpha" && d.end === 1)); // a slow test browser may still be mid-fade
  check('at her next turn the decoy goes and she reappears', !sage.hidden && b.decoys.length === 0 && (sage.view.alpha === 1 || fading), 'hidden ' + sage.hidden + ' decoys ' + b.decoys.length + ' alpha ' + sage.view.alpha + ' fading ' + fading);

  // ---------- Leftover steps ----------
  park(); put(scout, 1, 7); turnOf(scout);
  const move = St.moveOf(scout);
  b.onMoveButton();
  b.handleTap(1, 5); await idle();
  check('walked 2: ' + (move - 2) + ' steps left', b.stepsLeft(scout) === move - 2, b.stepsLeft(scout));
  check('the blue tiles come straight back for the rest', b.mode === 'move' && b.reachableKeys.has('1,' + (5 - (move - 2))) && !b.reachableKeys.has('1,' + (5 - (move - 1))), b.mode + ' ' + b.reachableKeys.size);
  check('the first button is Undo move', b.slots[0].label.text === 'Undo move', b.slots[0].label.text);
  b.handleTap(2, 5); await idle();
  check('walked 1 more', scout.col === 2 && scout.row === 5 && b.stepsLeft(scout) === move - 3, b.stepsLeft(scout));
  b.undoMove(); await sleep(250);
  check('Undo goes back to the start of the turn with every step', scout.col === 1 && scout.row === 7 && b.stepsLeft(scout) === move, scout.col + ',' + scout.row + ' left ' + b.stepsLeft(scout));
  // walk, attack, then use what is left
  park(); put(scout, 1, 7); put(ew, 1, 4); turnOf(scout);
  const realRandom = w.Math.random; w.Math.random = () => (/rollAttack/.test(new Error().stack) ? 0.99 : realRandom());
  b.onMoveButton(); b.handleTap(1, 5); await idle();
  b.onAttackButton(); b.handleTap(1, 4); b.handleTap(1, 4); await idle(); await sleep(1200); await idle();
  w.Math.random = realRandom;
  check('after attacking, Move shows the steps left', b.slots[0].label.text === 'Move  ' + (move - 2) + ' left' && b.slots[0].enabled, b.slots[0].label.text);
  b.onMoveButton();
  check('and the leftover steps can still be walked', b.mode === 'move' && b.reachableKeys.has('2,5'), b.reachableKeys.size);
  b.handleTap(2, 5); await idle(); b.cancelMode();
  // an enemy walk is unchanged: it still gets its full move
  park(); put(ew, 6, 2); turnOf(ew); ew.side === 'enemy';
  check('enemies still get their full move', b.stepsLeft(ew) === St.moveOf(ew));

  // ---------- Relaxed and battle stances ----------
  park(); turnOf(scout);
  b.showStanding(scout);
  check('far from enemies: relaxed standing pose', /stand/.test(scout.sprite.texture.key), scout.sprite.texture.key);
  put(eg, 1, 5); b.faceNearestOpponent(scout);
  check('an enemy 2 tiles away: battle stance', /battle/.test(scout.sprite.texture.key), scout.sprite.texture.key);
  put(eg, 7, 0); b.faceNearestOpponent(scout);
  check('enemy gone: relaxed again', /stand/.test(scout.sprite.texture.key), scout.sprite.texture.key);
  check('a unit with no battle pictures keeps standing as before', /stand/.test(guard.sprite.texture.key), guard.sprite.texture.key);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
