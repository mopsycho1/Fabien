// Batch 7, the Archer (19.6 and 1.82): Poison Weapon (free, at any time in her turn: her next hit that lands poisons),
// Prime Bow (takes her turn; next turn her bow Attack has +4 attack and +2 reach), Pinning Shot (bow, 2 to 5 tiles,
// half damage, Pinned through the target's next turn: no walking, no moving skills) and Patient Hunter (+5 accuracy
// on a bow shot when she has not moved). She plays on the heroes' side here so the buttons can be pressed.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_SIDES='{"e3":"hero"}' node n106.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, C = w.__combat;
  const U = (id) => b.units.find((u) => u.id === id);
  const archer = U('e3'), bull = U('e2'), rabdul = U('e4'), sudeen = U('h1');
  let ended = 0;
  b.endTurn = () => { ended++; }; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u.engagedWith) w.__engagement.endDuel(u);
      u.alive = true; u.hp = u.maxHp; u.status = fresh(); u.coated = false; if (u.primed) b.dropPrime(u);
      if (u === archer || u === bull || u === rabdul) continue;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0; archer.weapon = 'bow'; archer.weaponSwitched = false;
    b.placeUnit(archer, 5, 7); b.placeUnit(bull, 5, 4); b.placeUnit(rabdul, 8, 7);
    b.activeUnit = archer; b.busy = false; b.cancelMode();
  };
  const idle = async () => { const t = Date.now(); while (b.busy && Date.now() - t < 6000) await sleep(30); await sleep(150); };
  const skillsBtn = () => b.halves[0];

  park();
  check('she is on the heroes\' side for this test', archer.side === 'hero');
  check('her kit: Poison Arrow, Pinning Shot, Prime Bow, Poison Weapon, Smoke Bomb', ['poisonArrow', 'pinningShot', 'primeBow', 'poisonWeapon', 'smokeBomb'].every((id) => archer.spells.includes(id)), archer.spells.join(','));
  check('Patient Hunter is +5', archer.passives && archer.passives.patientHunter === 5);

  // 1. Patient Hunter: +5 to hit with the bow when she has not moved
  const still = C.getHitChance(archer, bull);
  archer.stepsUsed = 1;
  const moved = C.getHitChance(archer, bull);
  archer.stepsUsed = 0;
  check('Patient Hunter: 5 more to hit standing still', still - moved === 5, still + ' vs ' + moved);

  // 2. Poison Weapon: free, at once; usable after acting; the next hit that lands poisons
  b.onSpellButton(); b.chooseSpell('poisonWeapon');
  check('Poison Weapon coats her weapon', archer.coated === true);
  check('...and costs no action', archer.hasActed === false && ended === 0);
  check('...ready again after 3 turns', St.cooldownOf(archer, 'poisonWeapon') === 3);
  archer.status.cooldowns = {}; archer.coated = false; archer.hasActed = true; b.refreshButtons();
  check('after acting the Skills button stays live while Poison Weapon is ready', skillsBtn().enabled === true);
  const entries = b.spellMenu(archer);
  // 1.100 (22 Nov): her list shows by category (Shots, Tricks); the one live row is the category that holds Poison Weapon
  let live = entries.filter((e) => e.enabled);
  if (live.length === 1 && />$/.test(live[0].label.trim())) { b.openSpellGroup(live[0].label.replace('>', '').trim()); live = b.spellMenu(archer).filter((e) => e.enabled); b.spellGroup = null; }
  check('...and only free skills are live in the list then', live.length === 1 && /Poison Weapon/.test(live[0].label), live.map((e) => e.label).join(','));
  archer.hasActed = false; b.cancelMode();
  b.chooseSpell('poisonWeapon');
  let tries = 0;
  while (tries++ < 30) {
    bull.hp = bull.maxHp; bull.status = fresh();
    b.performAttack(archer, bull, () => {}); await sleep(50);
    if (St.isPoisoned(bull)) break;
  }
  check('a coated hit poisons the target', St.isPoisoned(bull));
  check('...and the coat is used up', archer.coated === false);
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(200); b.busy = false;

  // 3. Prime Bow: takes her turn; next turn +4 attack and +2 reach; spent by the shot
  park();
  const plain = C.getDamage(archer, bull);
  b.onSpellButton(); b.chooseSpell('primeBow'); b.chooseSpell('primeBow');
  await idle(); await sleep(900);
  check('Prime Bow takes her turn', archer.hasActed === true && ended >= 1, ended);
  check('...drawn but not ready yet', archer.primed && archer.primed.ready === false);
  check('...no extra damage on the turn she draws', C.getDamage(archer, bull) === plain);
  b.primeTurn(archer); // her next turn starts
  check('next turn: primed, 2 more reach (7)', archer.primed.ready === true && archer.range === 7, archer.range);
  check('next turn: +4 damage', C.getDamage(archer, bull) === plain + 4, C.getDamage(archer, bull) + ' vs ' + plain);
  b.placeUnit(bull, 5, 0); // 7 tiles away
  check('a foe 7 tiles away is in reach', C.inReach(archer, bull));
  b.performAttack(archer, bull, () => {}); await sleep(50);
  check('the shot spends the draw (back to reach 5)', !archer.primed && archer.range === 5, archer.range);
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(200); b.busy = false;
  // not shot that turn: lost
  park();
  archer.primed = { ready: false }; b.primeTurn(archer);
  b.primeTurn(archer); // a second turn start without a shot
  check('a draw not used in its turn is lost', !archer.primed && archer.range === 5);
  // caught in a clash: lost
  park();
  archer.primed = { ready: false }; archer.engagedWith = rabdul; rabdul.engagedWith = archer;
  b.primeTurn(archer);
  check('a draw held into a clash is lost', !archer.primed && archer.range === 5);
  archer.engagedWith = null; rabdul.engagedWith = null;

  // 4. Pinning Shot: 2 to 5 tiles, foes only; a hit pins through the target's next turn
  park();
  b.placeUnit(rabdul, 5, 6); // right next to her: no room for the bow
  b.onSpellButton(); b.chooseSpell('pinningShot');
  check('Pinning Shot reaches the bull 3 tiles away', b.targetsInRange.includes(bull));
  check('...not the foe right next to her', !b.targetsInRange.includes(rabdul));
  b.cancelMode();
  tries = 0;
  while (tries++ < 30 && !St.isPinned(bull)) {
    park(); bull.hp = bull.maxHp; b.placeUnit(rabdul, 9, 9);
    b.onSpellButton(); b.chooseSpell('pinningShot'); b.handleTap(bull.col, bull.row); b.handleTap(bull.col, bull.row);
    await idle(); await sleep(1600);
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false;
  }
  check('a hit Pins the target', St.isPinned(bull));
  check('...for half damage', bull.maxHp - bull.hp === Math.max(1, Math.round(C.getDamage({ ...archer, closeWeapon: null }, bull) * 0.5)), bull.maxHp - bull.hp);
  check('...it cannot walk (Move 0)', St.moveOf(bull) === 0);
  check('...a moving skill is blocked (Intercept on a pinned Sudeen)', (() => { St.applyPinned(sudeen); const no = !St.canAfford(sudeen, 'intercept'); sudeen.status.pinned = null; return no; })());
  check('...a plain skill is not (Shield Toss)', St.canAfford(bull, 'shieldToss'));
  check('PINNED shows over it', St.statusTags(bull).some((t) => t.text === 'PINNED'));
  St.tickBuff(bull); // the end of its next turn
  check('the pin is gone after its next turn', !St.isPinned(bull) && St.moveOf(bull) === bull.move);

  // 5. Her AI: pin a close fighter who could reach her; draw the bow when nobody is in reach
  park();
  archer.side = 'enemy'; for (const u of [bull, rabdul]) u.side = 'hero';
  b.placeUnit(bull, 5, 4); b.placeUnit(rabdul, 10, 0);
  for (const u of b.units) if (u.side === 'hero' && u !== bull && u !== rabdul) u.alive = false; // (only the bull and Rabdul are foes now)
  const seen = b.units.filter((u) => u.alive);
  const pick = b.archerChoice(archer, seen);
  check('AI: Pinning Shot at the bull coming for her', pick && pick.id === 'pinningShot' && pick.target === bull, pick && pick.id);
  check('AI: she coats her weapon first (free)', archer.coated === true);
  archer.status.cooldowns.pinningShot = 2;
  for (const u of b.units) if (u.side === 'hero') b.placeUnit(u, u === bull ? 5 : u.col, u === bull ? 0 : 0);
  b.placeUnit(archer, 5, 10); b.placeUnit(bull, 6, 1);
  for (const u of b.units) if (u.side === 'hero' && u !== bull) { u.alive = false; }
  const pick2 = b.archerChoice(archer, b.units.filter((u) => u.alive));
  check('AI: Prime Bow when nobody is in reach', pick2 && pick2.id === 'primeBow', pick2 && pick2.id);
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
