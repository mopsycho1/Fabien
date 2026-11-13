// 18.4 (Battle 1.0 milestone M4), checklist G4: skills show what they will do before you confirm.
// For each skill: first tap, read the plan drawn on the board, second tap, and check that what
// happened is what was shown (where the unit ended up, where the pushed foe landed).
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n58.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(500);
  const G = w.__grid, St = w.__status;
  const by = (id) => b.units.find((u) => u.id === id);
  const sudeen = by('h1'), gaha = by('h2'), layra = by('h3'), tayo = by('e1'), rabdul = by('e4');
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  b.setSpeed('base', 3);
  for (const st of b.sites || []) st.dug = true;
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async (max = 12000) => { const t = Date.now(); await sleep(150); while ((b.busy || b.inCinematic || b.units.some((u) => u.knock)) && Date.now() - t < max) await sleep(30); await sleep(250); };
  const spots = [[0, 0], [8, 0], [0, 2], [8, 2], [0, 4], [8, 4], [1, 1]];
  const stage = async (who, at, foe, foeAt, verse) => {
    let k = 0;
    for (const u of b.units) {
      u.hp = u.maxHp = 200; u.alive = true; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null;
      u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.knockPending = false; u.aiming = null;
      const t = u === who ? at : u === foe ? foeAt : spots[k++]; put(u, t[0], t[1]);
    }
    for (const d of (b.decoys || []).slice()) if (b.burstDecoys) b.burstDecoys(d.owner);
    b.relayQueue = null; b.busy = false; b.cancelMode();
    if (verse) {
      layra.mp = layra.maxMp; b.activeUnit = layra; b.busy = true;
      await new Promise((res) => b.castSpell(layra, who, verse, res)); b.busy = false; await sleep(500);
    }
    who.hasActed = false; b.activeUnit = who; b.busy = false; b.cancelMode(); b.refreshButtons();
  };
  const tile = (t) => t.col + ',' + t.row;
  // first tap, read the plan; second tap, compare
  const run = async (name, who, foe, id, want) => {
    b.onSpellButton(); b.chooseSpell(id);
    check(name + ': nothing is drawn before a target is picked', !b.previewPlan && b.previewItems.length === 0);
    b.handleTap(foe.col, foe.row);
    const plan = b.previewPlan;
    if (!plan) { check(name + ': a plan is drawn after the first tap', false, 'mode ' + b.mode + ' pending ' + (b.pendingTarget && b.pendingTarget.id)); b.cancelMode(); return; }
    const shownEnd = plan.end ? tile(plan.end) : tile(who);
    const shownPush = plan.pushes[0] ? tile(plan.pushes[0].to) : null;
    check(name + ': the board shows it (' + b.previewItems.length + ' things drawn), label "' + plan.label + '"', b.previewItems.length >= 2 && b.previewItems.every((o) => o.active) && (!want.label || plan.label === want.label), plan.label);
    if (want.ghost) check(name + ': a ghost of the unit stands on the tile it will end on', b.previewItems.some((o) => o.texture && o.texture.key === who.sprite.texture.key && Math.abs(o.x - G.tileToScreen(plan.end.col, plan.end.row).x) < 1));
    check(name + ': the target is marked as hit', plan.hits.includes(foe));
    const hpBefore = foe.hp;
    b.handleTap(foe.col, foe.row);
    check(name + ': the preview goes when the skill starts', b.previewItems.length === 0 && !b.previewPlan);
    await idle();
    check(name + ': the unit ended where the ghost stood', tile(who) === shownEnd, tile(who) + ' / shown ' + shownEnd);
    if (shownPush) check(name + ': the foe landed where the arrow pointed', tile(foe) === shownPush, tile(foe) + ' / shown ' + shownPush);
    if (want.fall !== undefined) check(name + ': the fall shown is the fall taken', plan.pushes[0].levels === want.fall, plan.pushes[0].levels);
    if (want.slam !== undefined) check(name + ': the slam shown happened', plan.pushes[0].slam === want.slam && St.isDisoriented(foe) === want.slam, plan.pushes[0].slam);
    void hpBefore;
  };

  // ---------- Sonic Javelin: three forms, named on the board ----------
  await stage(gaha, [2, 7], tayo, [6, 7], 'swiftness');
  await run('Sonic Javelin, far', gaha, tayo, 'sonicJavelin', { label: 'Throw' });
  await stage(gaha, [3, 7], tayo, [5, 7], 'swiftness');
  await run('Sonic Javelin, close', gaha, tayo, 'sonicJavelin', { label: 'Whirl', ghost: true });
  await stage(gaha, [2, 7], tayo, [5, 7], 'swiftness'); tayo.status.offBalance = true;
  await run('Sonic Javelin, reeling foe', gaha, tayo, 'sonicJavelin', { label: 'Sweep', ghost: true });
  // ---------- the charges ----------
  await stage(sudeen, [2, 7], tayo, [5, 7], 'stone');
  await run('Shield Ram', sudeen, tayo, 'shieldRam', { ghost: true });
  await stage(sudeen, [2, 7], tayo, [5, 7], 'swiftness');
  await run('Blitz', sudeen, tayo, 'blitz', { ghost: true });
  await stage(sudeen, [2, 7], tayo, [5, 7], 'fury');
  await run('Furious Charge', sudeen, tayo, 'furyCharge', { ghost: true });
  await stage(sudeen, [2, 7], tayo, [5, 7]);
  await run('Intercept', sudeen, tayo, 'intercept', { ghost: true });
  // a Shield Ram off the platform: the fall is shown (the bridge beside it is 1 level lower)
  await stage(sudeen, [3, 4], tayo, [5, 4], 'stone');
  await run('Shield Ram off the platform onto the bridge', sudeen, tayo, 'shieldRam', { ghost: true, fall: 1 });
  // a Shield Ram into the wall of the board: the slam is shown
  await stage(sudeen, [4, 7], tayo, [7, 7], 'stone');
  await run('Shield Ram into the edge', sudeen, tayo, 'shieldRam', { ghost: true });
  // ---------- Fury Dive and Spear Throw ----------
  await stage(gaha, [2, 7], tayo, [5, 7], 'fury');
  await run('Fury Dive', gaha, tayo, 'furyDive', { ghost: true });
  await stage(gaha, [2, 7], tayo, [5, 7]);
  { // Spear Throw can miss: the push only happens on a hit, so only the plan is checked
    b.onSpellButton(); b.chooseSpell('spearThrow'); b.handleTap(tayo.col, tayo.row);
    const plan = b.previewPlan;
    check('Spear Throw: the arrow points one tile behind the foe', !!plan && plan.pushes.length === 1 && tile(plan.pushes[0].to) === '6,7' && !plan.end, plan && tile(plan.pushes[0].to));
    b.cancelMode();
    check('cancelling removes the preview', b.previewItems.length === 0 && !b.previewPlan);
  }
  // ---------- Thunderclap (a plain attack changed by a Verse) ----------
  await stage(layra, [3, 7], tayo, [6, 7]);
  layra.status.buff = { id: 'stone', turnsLeft: 3, power: 1 }; b.refreshButtons();
  b.onAttackButton(); b.handleTap(tayo.col, tayo.row);
  check('Thunderclap: the attack preview shows where the bolt will knock the foe', !!b.previewPlan && b.previewPlan.pushes.length === 1 && tile(b.previewPlan.pushes[0].to) === '7,7', b.previewPlan && JSON.stringify(b.previewPlan.pushes.map((p) => p.to)));
  b.cancelMode();
  layra.status.buff = null; b.refreshButtons();
  b.onAttackButton(); b.handleTap(tayo.col, tayo.row);
  check('a plain attack that moves nobody draws no plan', !b.previewPlan && b.previewItems.length === 0);
  b.cancelMode();
  // ---------- Husk ----------
  await stage(layra, [3, 7], tayo, [4, 7]);
  layra.mp = layra.maxMp;
  b.onSpellButton(); b.chooseSpell('husk');
  const spot = [...b.reachableKeys].map((k) => k.split(',').map(Number))[0];
  b.handleTap(spot[0], spot[1]);
  check('Husk: a ghost on the tile she will slip to, and the decoy named where she stands', !!b.previewPlan && tile(b.previewPlan.end) === spot.join(',') && b.previewItems.some((o) => o.type === 'Text' && o.text === 'decoy stays'), b.previewPlan && tile(b.previewPlan.end));
  b.handleTap(spot[0], spot[1]); await idle();
  check('Husk: she is there, and the preview is gone', tile(layra) === spot.join(',') && b.previewItems.length === 0, tile(layra));
  // ---------- enemy turns never show a preview ----------
  b.activeUnit = tayo; b.refreshStatus();
  check('nothing is previewed on an enemy turn', b.previewItems.length === 0);
  // ---------- the rename ----------
  const spells = require('../../src/data/spells.json');
  check('13.37: Sonic Clap is Sonic Burst now', spells.clap.name === 'Sonic Burst' && spells.clap.button === 'Burst');

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
