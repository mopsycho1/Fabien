// Tap an enemy to walk up and attack in one go; the smart standing tile; Undo move.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const U = (l) => b.units.find((u) => u.label === l);
  const H = require('/home/claude/fabien/src/data/map.json').heights;
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - H[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const tap = (x, y) => b.input.emit('pointerdown', { x, y }, []);
  const tapUnit = (u) => tap(u.view.x, u.view.y - u.centerY); // a finger on the figure's middle
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(60); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.cancelMode(); };
  const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
  const scout = U('H2'), sage = U('H3'), guard = U('H1'), ew = U('E2'), eg = U('E1'), er = U('E3');
  const park = () => { put(guard, 0, 7); put(scout, 3, 7); put(sage, 1, 7); put(ew, 3, 4); put(eg, 7, 0); put(er, 6, 0); };

  // 1. tap a reachable enemy: preview
  park(); turnOf(scout);
  tapUnit(ew);
  check('tapping a reachable enemy previews a walk-up attack', b.mode === 'approach' && b.approach && b.approach.target === ew, b.mode);
  const t1 = b.approach && b.approach.tile;
  check('it picks a tile where Gaha\'s spear reaches (2 tiles in a line, or next to it)', t1 && (dist(t1, ew) === 1 || (dist(t1, ew) === 2 && (t1.col === ew.col || t1.row === ew.row))), t1 && t1.col + ',' + t1.row);
  check('a short walk', t1 && dist(t1, scout) <= 2, t1 && dist(t1, scout));
  check('the odds are shown before committing', /% to hit, \d+ damage/.test(b.statusText.text) && /Tap it again to go/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  check('the path is drawn (gold steps, if it walks more than one tile)', dist(t1, scout) < 2 || b.highlights.filter((h) => h.type === 'Arc').length >= 1, b.highlights.filter((h) => h.type === 'Arc').length);
  check('two markers float above every figure (stand-here arrow, target sign)', b.highlights.filter((h) => h.depth === 78).length === 2, b.highlights.filter((h) => h.depth === 78).length);
  // 1b. an enemy standing behind another one can be picked, and gets its own target sign
  b.cancelMode(); put(eg, 3, 3); put(scout, 3, 6); // E1 right behind E2, within the Scout's reach
  b.input.emit('pointerdown', { x: eg.view.x, y: eg.view.y - eg.topY + 16 }, []); // its head, above the one in front
  const sign = b.highlights.find((h) => h.depth === 78 && Math.abs(h.x - eg.view.x) < 2);
  check('tapping the head of an enemy behind another previews an attack on it, with the target sign over it', b.mode === 'approach' && b.approach.target === eg && !!sign, b.mode + ' ' + (b.approach && b.approach.target.label));
  b.cancelMode(); put(eg, 7, 0); put(scout, 3, 7);
  tapUnit(ew);
  // 2. pick a different blue tile
  const other = b.approach.options.find((t) => t.col !== t1.col || t.row !== t1.row);
  b.handleTap(other.col, other.row);
  check('tapping another blue tile changes where to stand', b.approach.tile.col === other.col && b.approach.tile.row === other.row, other.col + ',' + other.row);
  // 3. go
  const hp = ew.hp;
  tapUnit(ew); await idle(); await sleep(600);
  check('tapping the enemy again walks there and attacks', scout.col === other.col && scout.row === other.row && scout.hasActed, `${scout.col},${scout.row} acted ${scout.hasActed}`);
  check('the attack happened (hit or miss)', scout.hasActed && (ew.hp < hp || true));
  ew.hp = hp; b.updateHpBar(ew);

  // 4. the Sage keeps her distance
  park(); put(ew, 3, 2); turnOf(sage); put(sage, 3, 7);
  tapUnit(ew);
  const t4 = b.approach && b.approach.tile;
  check('the Sage stands as far back as her range allows (4 tiles)', b.mode === 'approach' && t4 && dist(t4, ew) === 4, t4 && dist(t4, ew));
  b.cancelMode();

  // 5. an enemy out of reach just shows its details
  park(); put(ew, 3, 0); turnOf(scout); put(scout, 3, 7);
  tapUnit(ew);
  check('an enemy out of reach is only inspected', b.mode === 'idle' && b.viewing === ew, b.mode);
  b.cancelMode(); b.viewing = null;

  // 6. Undo move
  park(); turnOf(scout);
  b.onMoveButton(); b.handleTap(4, 7); await idle();
  check('after a move, the Move button becomes Undo move', b.slots[0].label.text === 'Undo move', b.slots[0].label.text);
  b.undoMove(); await sleep(300);
  check('Undo move puts the unit back and lets it move again', scout.col === 3 && scout.row === 7 && !scout.hasMoved && b.slots[0].label.text === 'Move', `${scout.col},${scout.row} moved ${scout.hasMoved}`);

  // 7. after moving, an enemy in range can still be tapped to attack without walking
  park(); put(ew, 3, 5); turnOf(scout);
  b.onMoveButton(); b.handleTap(3, 6); await idle();
  tapUnit(ew);
  check('after moving, tapping an adjacent enemy can still attack from where you stand', b.mode === 'approach' && b.approach.options.some((t) => t.col === 3 && t.row === 6), b.mode);
  b.cancelMode();

  // 8. clashes are never started by a plain tap
  park(); put(ew, 3, 6); turnOf(scout);
  tapUnit(ew); tapUnit(ew); await idle(); await sleep(600);
  check('a plain tap-tap attacks; it never starts a clash', !scout.engagedWith && !ew.engagedWith && scout.hasActed);

  // 9. an enemy diagonally in front of your unit: its figure is drawn over yours, so a tap on it means it
  park(); put(scout, 3, 6); put(ew, 4, 7); turnOf(scout);
  // a point where the enemy's picture is drawn over the Scout's tap area
  let spot = null;
  for (let y = ew.view.y - ew.topY; y < ew.view.y && !spot; y += 3) for (let x = ew.view.x - 30; x <= ew.view.x + 30 && !spot; x += 3) {
    if (b.drawnAt(ew, x, y) && b.bodyContains(scout, x, y)) spot = [x, y];
  }
  tap(...spot);
  check('an enemy diagonally in front of your unit: tapping it previews the attack (not your move tiles)', b.mode === 'approach' && b.approach.target === ew, b.mode);
  b.cancelMode();
  // 10. ... and your own unit is still selectable where you can see it
  tap(scout.view.x, scout.view.y - scout.topY + 10);
  check('your unit is still selectable by tapping where it is visible', b.mode === 'move', b.mode);
  b.cancelMode();

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
