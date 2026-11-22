// Batch 7, the Bull Commander (19.5, art 6.73). Horn Charge: a straight, clear lane of 2 or 3 tiles into the first foe,
// no clash; 75 percent of a blow from 2 tiles, a full blow from 3; a hit pushes 1 tile, or knocks a Guarding foe
// Off-Balance instead. Shield Toss Stuns only a foe that was already Off-Balance. Its Verse forms: Ricochet Toss
// (Swiftness, bounces to a second foe), Wrath Toss (Fury, a full blow and Off-Balance), Quake Toss (Stone, throws the
// foes next to the target away). His charge pictures and the two impact effects are wired.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= node n110.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, C = w.__combat, E = w.__engagement, G = w.__grid;
  const U = (id) => b.units.find((u) => u.id === id);
  const bull = U('e2'), gaha = U('h2'), sudeen = U('h1'), layra = U('h3');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  // a flat row to charge along: find a row with 6 tiles of one height in a line
  let lane = null;
  for (let r = 1; r < 10 && !lane; r++) for (let c = 0; c + 5 < 11 && !lane; c++) {
    const h = G.getHeight(c, r); let ok = true;
    for (let k = 0; k < 6; k++) if (G.getHeight(c + k, r) !== h || b.isBlocked(c + k, r) && ![bull, gaha, sudeen, layra].some((u) => u.col === c + k && u.row === r)) ok = false;
    if (ok) lane = { c, r };
  }
  const park = () => {
    b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false;
    let i = 0;
    for (const u of b.units) {
      if (u.engagedWith) E.endDuel(u);
      u.alive = true; u.hp = u.maxHp; u.status = fresh(); u.wardOff = true; u.zone = null;
      if ([bull, gaha].includes(u)) continue;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    bull.hasActed = false; bull.hasMoved = false; bull.stepsUsed = 0;
    b.placeUnit(bull, lane.c, lane.r); b.placeUnit(gaha, lane.c + 3, lane.r);
    b.activeUnit = bull; b.busy = false; b.cancelMode();
  };
  check('a flat lane was found for the test', !!lane, lane && lane.c + ',' + lane.r);
  park();
  check('his kit: Horn Charge and Shield Toss', bull.spells.includes('hornCharge') && bull.spells.includes('shieldToss'));
  check('his charge picture is wired (all three looks)', b.hasPose(bull, 'charge'));
  check('the two impact effects are loaded', w.__fx.sfxHas(b, 'horn_dust') && w.__fx.sfxHas(b, 'horn_fire'));
  // 1. the lane
  check('a lane of 3 in a line: yes', b.hornLine(bull, gaha) && b.hornLine(bull, gaha).d === 3);
  b.placeUnit(layra, lane.c + 1, lane.r);
  check('someone in the way: no', !b.hornLine(bull, gaha));
  b.placeUnit(layra, 0, 10);
  b.placeUnit(gaha, lane.c + 1, lane.r);
  check('right next to him: no (2 tiles at least)', !b.hornLine(bull, gaha));
  b.placeUnit(gaha, lane.c + 4, lane.r);
  check('4 tiles: no (3 at most)', !b.hornLine(bull, gaha));
  // 2. a 3 tile charge: a full blow, pushed a tile
  let tries = 0, hit = false;
  const full = C.getDamage(bull, { ...gaha, status: fresh() });
  while (tries++ < 30 && !hit) {
    park();
    b.castSpell(bull, gaha, 'hornCharge', () => {}); await sleep(1700);
    hit = gaha.hp < gaha.maxHp;
  }
  check('3 tiles: a full blow', hit && gaha.maxHp - gaha.hp === full, (gaha.maxHp - gaha.hp) + ' vs ' + full);
  check('...he ends next to where it stood', bull.col === lane.c + 2 && bull.row === lane.r, bull.col + ',' + bull.row);
  check('...and it is pushed a tile', gaha.col === lane.c + 4 && gaha.row === lane.r, gaha.col + ',' + gaha.row);
  check('...no clash', !bull.engagedWith && !gaha.engagedWith);
  check('...ready again after 3 turns', St.cooldownOf(bull, 'hornCharge') === 3);
  const v = G.tileToScreen(bull.col, bull.row);
  check('...his body stands on his tile', Math.hypot(bull.view.x - v.x, bull.view.y - v.y) < 3);
  // 3. 2 tiles: 75 percent
  tries = 0; hit = false;
  while (tries++ < 30 && !hit) {
    park(); b.placeUnit(gaha, lane.c + 2, lane.r);
    b.castSpell(bull, gaha, 'hornCharge', () => {}); await sleep(1600);
    hit = gaha.hp < gaha.maxHp;
  }
  check('2 tiles: 75 percent of a blow', hit && gaha.maxHp - gaha.hp === Math.max(1, Math.round(full * 0.75)), gaha.maxHp - gaha.hp);
  // 4. a Guarding foe: Off-Balance, not pushed
  tries = 0; hit = false;
  while (tries++ < 30 && !hit) {
    park(); gaha.status.rooted = true;
    b.castSpell(bull, gaha, 'hornCharge', () => {}); await sleep(1600);
    hit = gaha.hp < gaha.maxHp;
  }
  check('a Guarding (Rooted) foe: Off-Balance', hit && St.isOffBalance(gaha));
  check('...and not pushed', gaha.col === lane.c + 3 && gaha.row === lane.r);
  // 5. Shield Toss: Stun only on an Off-Balance foe
  const toss = async (id, setup) => {
    let n = 0, done = false;
    while (n++ < 30 && !done) {
      park(); b.placeUnit(gaha, lane.c + 3, lane.r); if (setup) setup();
      b.castShieldToss(bull, gaha, w.__spellsAll[id], () => {}); await sleep(2100);
      done = gaha.hp < gaha.maxHp;
    }
    return done;
  };
  check('a plain Shield Toss hit: no Stun', await toss('shieldToss') && !St.isStunned(gaha));
  check('on a foe already Off-Balance: Stunned', await toss('shieldToss', () => St.applyOffBalance(gaha)) && St.isStunned(gaha));
  check('Wrath Toss: a full blow and Off-Balance, no Stun', await toss('wrathToss') && gaha.maxHp - gaha.hp === full && St.isOffBalance(gaha) && !St.isStunned(gaha), gaha.maxHp - gaha.hp);
  let side = null;
  const quakeOk = await toss('quakeToss', () => { b.placeUnit(sudeen, lane.c + 3, lane.r - 1); side = { col: sudeen.col, row: sudeen.row }; });
  check('Quake Toss: the foe next to it is thrown a tile away', quakeOk && !(sudeen.col === side.col && sudeen.row === side.row), sudeen.col + ',' + sudeen.row);
  let bounced = false; tries = 0;
  while (tries++ < 30 && !bounced) {
    park(); b.placeUnit(gaha, lane.c + 3, lane.r); b.placeUnit(sudeen, lane.c + 4, lane.r);
    b.castShieldToss(bull, gaha, w.__spellsAll.ricochetToss, () => {}); await sleep(2300);
    bounced = sudeen.hp < sudeen.maxHp;
  }
  check('Ricochet Toss: the shield bounces on to a second foe', bounced);
  check('the Verse forms: Swiftness, Fury, Stone', (() => { park(); St.applyBuff(bull, 'swiftness'); const a1 = St.activeMove(bull, 'shieldToss'); bull.status.buff = null; St.applyBuff(bull, 'fury'); const a2 = St.activeMove(bull, 'shieldToss'); bull.status.buff = null; St.applyBuff(bull, 'stone'); const a3 = St.activeMove(bull, 'shieldToss'); return a1 + a2 + a3 === 'ricochetTosswrathTossquakeToss'; })());
  // 6. his AI: the open lane
  park(); bull.status.buff = null;
  check('AI: he charges down an open lane', b.hornChoice(bull) === gaha);
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
