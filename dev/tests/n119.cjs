// Part 0 bugs (Baiyee 26 Nov, playing the live game). Run with FABIEN_MAP=cavern FABIEN_NEW=1 FABIEN_KINGS=1 FABIEN_BENCH=
//   A. Sudeen "sometimes can't move at all on his turn". Bot battles with MOVE_LOG=h1 caught every 0-step turn:
//      each one was the archer's Pinning Shot (19.6, one turn, by design), and nothing on the Move row said so.
//      Here: after each of his skills (and with his Ward on, after a clash, after Intercept Ally out of a clash)
//      he can walk on his next turn; pinned, the row says "Pinned: no move"; the turn after, he walks again.
//   B. Leol stayed frozen in his attack picture after Concussive Shot and Hammer Strike (the Thief after Ambush):
//      their skills never put him back in his stance. Here: every fighter is back in his stance after his attack,
//      and after every skill of Leol and the Thief. (Bot battles check every skill of everyone: FROZEN, bot.cjs.)
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const S = w.__status, E = w.__engagement;
  b.runEnemyTurn = () => {};
  b.enemySecondWalk = false;
  const realEnd = b.endTurn.bind(b);
  b.endTurn = () => {};
  const U = (id) => b.units.find((u) => u.id === id);
  // put everyone out of the way along the back rows, then stand the ones the check needs
  const park = () => { let c = 0; for (const u of b.units) { if (!u.alive) continue; if (u.engagedWith) E.endDuel(u); b.placeUnit(u, 1 + (c % 9), u.side === 'hero' ? 1 : 10); c++; } };
  const fresh = (u) => { u.hp = u.maxHp; u.mp = u.maxMp || u.mp; u.status = { cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.knock = null; u.zone = null; };
  const act = (fn) => new Promise((res) => { let done = false; const t = setTimeout(() => { if (!done) res('timeout'); }, 8000); fn(() => { done = true; clearTimeout(t); res('done'); }); });
  const idle = async () => { for (let i = 0; i < 80 && (b.busy || b.inCinematic); i++) await sleep(100); };
  // the next turn is this unit's (the real startTurn: statuses tick, steps reset)
  // (the turn before ends for real: statuses such as a pin count down in endTurn)
  const turnOf = async (u) => { for (const o of b.units) o.ct = 0; u.ct = 10000; b.busy = false; realEnd(); for (let i = 0; i < 40 && b.activeUnit !== u; i++) await sleep(100); await sleep(300); await idle(); return b.activeUnit === u; };
  const canWalk = (u) => { b.busy = false; b.cancelMode(); b.onMoveButton(); const tiles = b.reachableKeys ? b.reachableKeys.size : 0; const ok = b.mode === 'move' && tiles > 0; b.cancelMode(); return { ok, steps: b.stepsLeft(u), tiles }; };

  // ---------- A. Sudeen can walk after each of his skills ----------
  const sud = U('h1'), ally = U('h2'), foe = U('e4');
  const setA = () => { park(); for (const u of [sud, ally, foe]) fresh(u); b.placeUnit(sud, 4, 6); b.placeUnit(ally, 5, 6); b.placeUnit(foe, 6, 6); b.activeUnit = sud; b.busy = false; };
  const scenarios = [
    ['nothing (a plain turn)', async () => {}],
    ['his Ward switched on', async () => { if (!sud.wardOn) b.onWardButton(); }],
    ['Herbs on Gaha', async () => { ally.hp = 10; await act((d) => b.castSpell(sud, ally, 'herbs', d)); }],
    ['Intercept on a foe', async () => { b.placeUnit(foe, 7, 6); b.placeUnit(ally, 4, 8); await act((d) => b.castSpell(sud, foe, 'intercept', d)); }],
    ['Intercept Ally (Gaha in a clash)', async () => { E.startDuel(ally, foe); await act((d) => b.castSpell(sud, ally, 'interceptAlly', d)); }],
    ['a clash he broke out of', async () => { b.placeUnit(ally, 4, 8); b.placeUnit(foe, 5, 6); E.startDuel(sud, foe); await sleep(100); E.endDuel(sud); }],
    ['a plain attack', async () => { b.placeUnit(ally, 4, 8); b.placeUnit(foe, 5, 6); await act((d) => b.performAttack(sud, foe, d)); }],
  ];
  for (const [name, run] of scenarios) {
    setA();
    await run(); await sleep(400); await idle();
    if (sud.engagedWith) E.endDuel(sud); // (a clash still on is its own rule: Press or Break away)
    b.placeUnit(foe, 9, 9); foe.hp = foe.maxHp;
    const mine = await turnOf(sud);
    const r = canWalk(sud);
    check('A. after ' + name + ' Sudeen walks on his next turn', mine && r.ok && r.steps > 0, JSON.stringify(r));
  }
  // pinned: 0 steps that one turn, the row says why; the turn after he walks
  setA(); S.applyPinned(sud); b.activeUnit = U('e3'); // (pinned in the archer's turn: hers is the turn that ends)
  await turnOf(sud);
  b.refreshStatus();
  const moveRow = b.slots[0];
  check('A. pinned: no walking that turn', b.stepsLeft(sud) === 0);
  check('A. pinned: the Move row says so', /Pinned/.test(moveRow.label.text) && !moveRow.enabled, moveRow.label.text);
  await turnOf(sud);
  const r2 = canWalk(sud);
  check('A. the turn after the pin, he walks again', r2.ok, JSON.stringify(r2));

  // ---------- B. back in his stance after every attack (everyone) and every skill of Leol and the Thief ----------
  const stanceAfter = async (u, label, fn) => {
    await fn(); await sleep(900); await idle();
    if (!u.alive || u.knock) return;
    const k1 = u.sprite.texture.key; b.showStanding(u); const k2 = u.sprite.texture.key;
    check('B. ' + u.name + ' back in his stance after ' + label, k1 === k2, k1 + (k1 === k2 ? '' : ' (should be ' + k2 + ')'));
  };
  const melee = (u) => (u.range || 1) <= 1 || u.closeWeapon;
  for (const u of b.units) {
    const foeOf = b.units.find((o) => o.side !== u.side && o.alive && o.id !== 'e5' && o.id !== 'h5') || b.units.find((o) => o.side !== u.side);
    park(); fresh(u); fresh(foeOf); foeOf.hp = 999; foeOf.maxHp = Math.max(foeOf.maxHp, 999);
    b.placeUnit(u, 4, 6);
    const far = !melee(u);
    b.placeUnit(foeOf, far ? 7 : 5, 6);
    b.activeUnit = u; b.busy = false;
    await stanceAfter(u, 'his attack' + (far ? ' (at range)' : ''), () => act((d) => b.performAttack(u, foeOf, d)));
    if (u.closeWeapon && far) { // the archer's dagger, Leol's hammer: the close attack too
      fresh(u); b.placeUnit(foeOf, 5, 6);
      await stanceAfter(u, 'his close attack', () => act((d) => b.performAttack(u, foeOf, d)));
    }
  }
  const leol = U('h6'), thief = U('e6'), dummy = U('e2'), friend = U('h1');
  const leolSkills = [['Concussive Shot', 'concussiveShot', 8], ['Hammer Strike', 'hammerStrike', 5], ['Smoke Pellet', 'smokePellet', 8]];
  for (const [name, id, col] of leolSkills) {
    park(); fresh(leol); fresh(dummy); dummy.hp = 999; b.placeUnit(leol, 4, 6); b.placeUnit(dummy, col, 6); b.activeUnit = leol; b.busy = false;
    await stanceAfter(leol, name, () => act((d) => b.castSpell(leol, id === 'smokePellet' ? leol : dummy, id, d)));
  }
  park(); fresh(thief); fresh(friend); friend.hp = 999; b.placeUnit(thief, 4, 6); b.placeUnit(friend, 5, 6); b.activeUnit = thief; b.busy = false;
  b.hideThief(thief); await sleep(400);
  await stanceAfter(thief, 'Ambush', () => act((d) => b.castSpell(thief, friend, 'ambush', d)));

  b.endTurn = realEnd;
  const real = errors.filter((e) => !/Not implemented/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
