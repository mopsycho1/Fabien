const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const U = (l) => b.units.find((u) => u.label === l);
  const H = require('/home/claude/fabien/src/data/map.json').heights; // the real map
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - H[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const tap = (x, y) => b.input.emit('pointerdown', { x, y }, []);
  const mid = (u) => ({ x: u.view.x, y: u.view.y - u.centerY });
  const park = () => { put(U('H1'), 0, 7); put(U('H2'), 7, 7); put(U('E2'), 7, 0); };
  let picks = 0, tries = 0, misses = [];
  // Many layouts: the Sage (range 2) attacks; one enemy stands right in front of another, from the camera's view
  for (const [sc, sr, fc, fr, bc, br, front, back] of [
    [3, 7, 3, 6, 3, 5, 'E3', 'E1'],
    [3, 7, 3, 6, 3, 5, 'E1', 'E3'],
    [5, 6, 5, 5, 4, 5, 'E3', 'E1'],
    [5, 6, 4, 6, 4, 5, 'E3', 'E1'],
    [2, 7, 2, 6, 1, 6, 'E3', 'E1'],
    [6, 6, 6, 5, 6, 4, 'E1', 'E3'],
  ]) {
    park(); put(U('H3'), sc, sr); put(U(front), fc, fr); put(U(back), bc, br);
    b.activeUnit = U('H3'); U('H3').hasActed = false; b.cancelMode(); b.startAttack();
    const tg = b.targetsInRange.map((u) => u.label).sort().join();
    // tap the visible middle of the unit behind, and the middle of the one in front
    for (const [who, label] of [[U(back), 'behind'], [U(front), 'front']]) {
      b.pendingTarget = null; b.refreshStatus();
      const p = mid(who); if (fc === 6) console.log('   before tap', who.label, 'mode', b.mode, 'busy', b.busy, 'acted', U('H3').hasActed, 'active', b.activeUnit.label, 'targets', b.targetsInRange.map(u=>u.label).join()); tap(p.x, p.y); tries++;
      if (b.pendingTarget === who) picks++; else misses.push(`${front} at ${fc},${fr} in front of ${back} at ${bc},${br}: tapped ${label} ${who.label}, got ${b.pendingTarget ? b.pendingTarget.label : 'nothing'} (targets ${tg})`);
      // its own tile works too
      b.pendingTarget = null;
      const t = { x: 360 + (who.col - who.row) * 43, y: 400 + (who.col + who.row) * 27 - H[who.row][who.col] * 22 + 6 };
      tap(t.x, t.y); tries++;
      if (b.pendingTarget === who) picks++; else misses.push(`tile of ${label} ${who.label}: got ${b.pendingTarget ? b.pendingTarget.label : 'nothing'}`);
    }
    b.cancelMode();
  }
  check(`tapping the middle or the tile of the unit you mean picks it (${picks} of ${tries})`, picks === tries, misses.join(' | '));
  // idle: you can always select your own unit even when an enemy stands in front of it
  park(); put(U('H2'), 3, 4); put(U('E2'), 3, 5); b.activeUnit = U('H2'); U('H2').hasMoved = false; b.cancelMode();
  const p = mid(U('H2')); tap(p.x, p.y);
  check('your own unit can be selected even with an enemy standing in front of it', b.mode === 'move', b.mode);
  // walking: tap a blue tile that sits right behind a tall figure
  const blocked = b.highlights.length;
  const target = [...b.reachableKeys].map((k) => k.split(',').map(Number)).find(([c, r]) => c === 2 && r === 4) || [...b.reachableKeys].map((k) => k.split(',').map(Number))[0];
  // its centre is behind the enemy's chest (that tap now means the enemy), so tap its uncovered left corner
  tap(360 + (target[0] - target[1]) * 43 - 32, 400 + (target[0] + target[1]) * 27 - H[target[1]][target[0]] * 22);
  check('tapping the visible corner of a blue tile hidden behind a figure walks there', U('H2').col === target[0] && U('H2').row === target[1], U('H2').col + ',' + U('H2').row);
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no errors', real.length === 0, real.join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
