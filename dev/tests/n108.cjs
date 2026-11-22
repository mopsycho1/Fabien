// Batch 7, Sudeen (19.3, 13.68; 21 Nov: his strength shows in clashes). Bulwark: a beat he wins with Guard hits back
// for 2 + his Bulwark level. Ward: allies next to him get +1 defense (+2 under Stone) and he takes a third of each hit
// on them, rounded up, at most 4 (half, at most 5, under Stone), never below 1 health; off in a clash, Stunned, at 1
// health, or switched off with his menu button. Shield Bash (his Attack): a chance to Disorient (+2 damage), then 2 of
// his turns before it can again. Intercept Ally: swap with an ally up to 4 steps away and take over its clash.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= node n108.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, C = w.__combat, E = w.__engagement;
  const Sig = w.__signature;
  const U = (id) => b.units.find((u) => u.id === id);
  const sudeen = U('h1'), gaha = U('h2'), layra = U('h3'), rabdul = U('e4'), bull = U('e2');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u.engagedWith) E.endDuel(u);
      u.alive = true; u.hp = u.maxHp; u.status = fresh(); u.wardOff = false; u.bulwark = 0;
      if ([sudeen, gaha, rabdul, bull].includes(u)) continue;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    sudeen.hasActed = false; sudeen.hasMoved = false; sudeen.stepsUsed = 0;
    b.placeUnit(sudeen, 4, 6); b.placeUnit(gaha, 5, 6); b.placeUnit(rabdul, 5, 5); b.placeUnit(bull, 8, 2);
    b.activeUnit = sudeen; b.busy = false; b.cancelMode();
  };

  park();
  // 1. Bulwark in a clash: a Guard beat he wins hits back for 2 + his level
  check('Sudeen\'s clash signature is Bulwark (Guard)', sudeen.signature && sudeen.signature.id === 'bulwark' && sudeen.signature.stance === 'guard');
  const fx = Sig ? Sig.afterBeat({ actor: rabdul, holder: sudeen, actorStance: 'press', holderStance: 'guard', kind: 'win', winner: sudeen, loser: rabdul }) : [];
  const bash1 = fx.find((f) => f.kind === 'hit' && f.from === sudeen);
  check('a Guard beat won: Shield Bash for 3 (2 + level 1)', bash1 && bash1.damage === 3, bash1 && bash1.damage);
  const fx2 = Sig.afterBeat({ actor: rabdul, holder: sudeen, actorStance: 'press', holderStance: 'guard', kind: 'win', winner: sudeen, loser: rabdul });
  check('the next one in a row: 4', (fx2.find((f) => f.from === sudeen) || {}).damage === 4);
  const fx3 = Sig.afterBeat({ actor: rabdul, holder: sudeen, actorStance: 'slip', holderStance: 'press', kind: 'win', winner: sudeen, loser: rabdul });
  check('a beat won with Press: no Shield Bash', !fx3.some((f) => f.from === sudeen));
  sudeen.bulwark = 0;

  // 2. Ward: +1 defense next to him, a third of each hit
  park();
  check('Gaha next to Sudeen: +1 defense', St.statMod(gaha, 'defense') === 1, St.statMod(gaha, 'defense'));
  check('Rabdul (a foe) next to him: no Ward', St.statMod(rabdul, 'defense') === 0);
  check('WARD shows over Sudeen', St.statusTags(sudeen).some((t) => t.text === 'WARD'));
  let landed = b.landHit(gaha, 4);
  check('a hit of 4 on Gaha: Gaha takes 2, Sudeen 2 (the sheet\'s example)', landed.damage === 2 && sudeen.hp === sudeen.maxHp - 2, landed.damage + ' / ' + (sudeen.maxHp - sudeen.hp));
  park();
  landed = b.landHit(gaha, 15);
  check('at most 4', landed.damage === 11 && sudeen.maxHp - sudeen.hp === 4, landed.damage);
  park();
  St.applyBuff(sudeen, 'stone');
  check('under Stone: +2 defense', St.statMod(gaha, 'defense') === 2, St.statMod(gaha, 'defense'));
  landed = b.landHit(gaha, 12);
  check('under Stone: half, at most 5', landed.damage === 7 && sudeen.maxHp - sudeen.hp === 5, landed.damage);
  park();
  sudeen.hp = 2;
  landed = b.landHit(gaha, 9);
  check('never below 1 health', sudeen.hp === 1 && landed.damage === 8, sudeen.hp + ' / ' + landed.damage);
  landed = b.landHit(gaha, 9);
  check('at 1 health: off', landed.damage === 9 && sudeen.hp === 1);
  park();
  St.applyStun(sudeen);
  check('Stunned: off', b.landHit(gaha, 6).damage === 6 && sudeen.hp === sudeen.maxHp);
  park();
  E.startDuel(sudeen, rabdul);
  check('in a clash: off (13.68)', b.landHit(gaha, 6).damage === 6 && St.statMod(gaha, 'defense') === 0);
  park();
  sudeen.hasActed = true; b.refreshButtons(); // (even after acting)
  b.onSpellButton();
  const entry = b.spellMenu(sudeen).find((e) => /^Ward/.test(e.label));
  check('his skills list has the Ward switch, live after acting', entry && entry.enabled && /Ward: on/.test(entry.label), entry && entry.label);
  b.chooseSpell('wardSwitch');
  check('tapped: off, and Gaha takes the whole hit', sudeen.wardOff === true && b.landHit(gaha, 6).damage === 6 && St.statMod(gaha, 'defense') === 0);
  check('WARD OFF shows', St.statusTags(sudeen).some((t) => t.text === 'WARD OFF'));
  b.onSpellButton(); b.chooseSpell('wardSwitch');
  check('tapped again: on', sudeen.wardOff === false && St.statMod(gaha, 'defense') === 1);
  check('the switch is free (no action used)', sudeen.hasActed === true && b.mode === 'idle'); sudeen.hasActed = false;

  // 3. Shield Bash: Disoriented and 2 more damage, then a 2 turn wait
  park();
  check('his Attack is called Shield Bash', sudeen.attackName === 'Shield Bash');
  let tries = 0;
  while (tries++ < 40 && !St.isDisoriented(rabdul)) {
    rabdul.hp = rabdul.maxHp; sudeen.status.cooldowns = {};
    b.performAttack(sudeen, rabdul, () => {}); await sleep(30);
  }
  check('Shield Bash can Disorient', St.isDisoriented(rabdul), tries);
  const plain = C.getDamage(sudeen, { ...rabdul, status: fresh() });
  check('...with 2 more damage', rabdul.maxHp - rabdul.hp === plain + 2, (rabdul.maxHp - rabdul.hp) + ' vs ' + plain);
  check('...then it waits 2 of his turns', sudeen.status.cooldowns.shieldBash === 2);
  rabdul.status.disoriented = null;
  let again = false;
  for (let i = 0; i < 20; i++) { rabdul.hp = rabdul.maxHp; b.performAttack(sudeen, rabdul, () => {}); await sleep(20); if (St.isDisoriented(rabdul)) again = true; }
  check('...no Disorient while it waits', !again);
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(200); b.busy = false;

  // 4. Intercept Ally: swap with Gaha, take over his clash, Gaha is free
  park();
  b.placeUnit(gaha, 6, 6); b.placeUnit(rabdul, 6, 5);
  E.startDuel(gaha, rabdul);
  b.onSpellButton(); b.chooseSpell('interceptAlly');
  check('Intercept Ally reaches Gaha 2 steps away', b.targetsInRange.includes(gaha), b.targetsInRange.map((u) => u.label).join(','));
  check('...not a foe', !b.targetsInRange.includes(rabdul));
  b.handleTap(gaha.col, gaha.row); b.handleTap(gaha.col, gaha.row);
  const t0 = Date.now(); while (b.busy && Date.now() - t0 < 5000) await sleep(30); await sleep(1100);
  check('they swapped tiles', sudeen.col === 6 && sudeen.row === 6 && gaha.col === 4 && gaha.row === 6, sudeen.col + ',' + sudeen.row + ' ' + gaha.col + ',' + gaha.row);
  check('Sudeen took over the clash', sudeen.engagedWith === rabdul && rabdul.engagedWith === sudeen);
  check('Gaha is free', !gaha.engagedWith);
  check('no damage', rabdul.hp === rabdul.maxHp);
  check('ready again after 2 turns', St.cooldownOf(sudeen, 'interceptAlly') === 2);
  const v = w.__grid.tileToScreen(sudeen.col, sudeen.row);
  check('his body stands on his new tile', Math.hypot(sudeen.view.x - v.x, sudeen.view.y - v.y) < 3);
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
