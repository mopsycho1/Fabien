// Suleiman's Oct 27 answers: Layra's views, Poise, interruptions, stun, Shield Toss, Intercept.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h3:layra_battle_downRight.png')) await sleep(50);
  const b = await battle(game);
  const E = w.__engagement, St = w.__status, G = w.__grid;
  const combat = require('./combat-bundle.cjs');
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.stanceMenu = 'main'; b.empower = false; b.cancelMode(); };
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), tayo = U('E1'), bull = U('E2'), archer = U('E3');
  b.runEnemyTurn = () => {}; const realEnd = b.endTurn.bind(b); b.endTurn = () => {};
  const park = () => { for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.status.cooldowns = {}; u.status.poison = null; u.status.stunned = false; u.status.offBalance = false; u.aiming = null; u.markedBy = null; u.meditating = null; } b.refreshEngagementMarks(); put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 3, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0); };
  const key = (u) => u.sprite.texture.key;
  const real = w.Math.random;

  // Layra
  park();
  for (const f of ['upLeft', 'upRight']) { layra.facing = f; b.showStanding(layra); check('Layra facing ' + f + ' shows her back view (not looking up at the sky)', /layra_stand_upLeft/.test(key(layra)), key(layra)); }
  put(bull, 3, 5); layra.facing = 'upRight'; b.showStanding(layra);
  check('an enemy close: Layra in her battle-ready stance', /layra_battle_downRight|layra_stand_upLeft/.test(key(layra)), key(layra));
  layra.facing = 'downLeft'; b.showStanding(layra);
  check('facing down with an enemy close: her battle-ready stance', /layra_battle_downRight/.test(key(layra)), key(layra));

  // Poise
  park(); put(gaha, 3, 5); put(bull, 3, 4); E.startDuel(gaha, bull); gaha.poise = 3;
  turnOf(gaha); b.setStanceChoice('manual'); b.toggleEmpower();
  w.Math.random = () => (/rollDice/.test(new Error().stack) ? 0.5 : real()); // even dice: the clash goes on
  b.onStance('slip'); await idle(); await sleep(400); w.Math.random = real;
  check('Empower spends 1 Poise', gaha.poise === 2, gaha.poise);
  E.refillPoise(gaha);
  check('and it does NOT come back while still in the clash', gaha.poise === 2, gaha.poise);
  E.endDuel(gaha); E.refillPoise(gaha);
  check('out of the clash it comes back 1 a turn', gaha.poise === 3, gaha.poise);

  // meditation interrupted
  park(); turnOf(layra); layra.mp = 2;
  b.onSpellButton(); b.chooseSpell('meditate'); b.chooseSpell('meditate'); await sleep(1300); await idle();
  w.Math.random = () => (/rollAttack/.test(new Error().stack) ? 0.01 : real());
  put(archer, 3, 5); b.activeUnit = archer; archer.hasActed = false; b.performAttack(archer, layra, () => {}); await idle(); await sleep(900);
  w.Math.random = real;
  check('a hit breaks her trance: no longer meditating, no MP back', !layra.meditating && layra.mp === 2, 'mp ' + layra.mp);
  // aim interrupted
  park(); put(archer, 3, 2); put(gaha, 3, 4); turnOf(archer);
  b.castPoisonArrow(archer, gaha, { color: '#9fdc6a' }, () => {}); await sleep(1000);
  w.Math.random = () => (/rollAttack/.test(new Error().stack) ? 0.01 : real());
  put(gaha, 3, 3); b.activeUnit = gaha; gaha.hasActed = false; b.performAttack(gaha, archer, () => {}); await idle(); await sleep(900);
  w.Math.random = real;
  check('a hit breaks the archer\'s aim, and MARKED goes', !archer.aiming && !gaha.markedBy, String(!!archer.aiming));

  // stun and flank hits
  park(); put(gaha, 3, 5); put(bull, 3, 4);
  const plain = combat.getDamage(gaha, bull), plainHit = combat.getHitChance(gaha, bull);
  St.applyStun(bull);
  check('hits on a stunned unit are flank hits: +3 damage', combat.getDamage(gaha, bull) === plain + 3, plain + ' -> ' + combat.getDamage(gaha, bull));
  check('and it cannot dodge', combat.getHitChance(gaha, bull) > plainHit, plainHit + ' -> ' + combat.getHitChance(gaha, bull));
  check('STUNNED shows over it', St.statusTags(bull).some((t) => t.text === 'STUNNED'));
  for (const u of b.units) u.ct = 0; bull.ct = 500; b.endTurn = realEnd; let next = null; const orig = b.endTurn; b.endTurn = () => { next = 'ended'; };
  b.startTurn(); await sleep(1400);
  check('a stunned unit loses its turn, then the stun is gone', next === 'ended' && !St.isStunned(bull) && bull.hasActed, next);

  // Shield Toss by the bull (enemy AI)
  park(); put(bull, 3, 2); put(layra, 3, 5); put(gaha, 0, 7); const mv = bull.move; bull.move = 0;
  b.runEnemyTurn = Object.getPrototypeOf(b).runEnemyTurn.bind(b); b.endTurn = () => {};
  w.Math.random = () => (/castShieldToss/.test(new Error().stack) ? 0.01 : real());
  b.activeUnit = bull; bull.hasActed = false; bull.hasMoved = false; bull.stepsUsed = 0;
  b.runEnemyTurn(); await sleep(400); await idle(); await sleep(1700);
  w.Math.random = real; bull.move = mv; b.runEnemyTurn = () => {};
  check('the bull Shield Tosses a foe 3 tiles away and stuns it', St.isStunned(layra) && layra.hp < layra.maxHp, 'hp ' + layra.hp);
  check('Shield Toss then waits 3 turns', St.cooldownOf(bull, 'shieldToss') === 3);

  // Intercept by Sudeen
  park(); put(sudeen, 3, 7); put(bull, 3, 3); turnOf(sudeen);
  b.onSpellButton();
  check('Sudeen\'s Skills: Herbs and Intercept', /Herbs.*Intercept/.test(b.slots.map((s) => s.label.text).join('|')), b.slots.map((s) => s.label.text).join('|'));
  b.chooseSpell('intercept');
  check('Intercept reaches an enemy 4 tiles away', b.targetsInRange.includes(bull), b.targetsInRange.map((u) => u.label).join());
  b.handleTap(3, 3);
  // Roadmap 3.1 (29 Oct): Intercept now locks the enemy in a clash instead of stunning it
  check('the preview says it will lock it in a clash (3.1)', /locked in a clash/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  const bhp = bull.hp; b.handleTap(3, 3); await idle(); await sleep(1500);
  check('Sudeen charges up next to it', Math.abs(sudeen.col - 3) + Math.abs(sudeen.row - 3) === 1 && sudeen.row === 4, sudeen.col + ',' + sudeen.row);
  check('and slams it: hurt and locked with him, not stunned (3.1)', bull.hp < bhp && bull.engagedWith === sudeen && !St.isStunned(bull), bhp + ' -> ' + bull.hp);
  // the knockback moved to Shield Ram (Intercept under a Verse of Stone, 3.3)
  park(); put(sudeen, 3, 7); put(bull, 3, 3); St.applyBuff(sudeen, 'stone'); turnOf(sudeen);
  b.onSpellButton(); b.chooseSpell('shieldRam'); b.handleTap(3, 3);
  check('Shield Ram: the preview says knocked back 2 (3.3)', /knocked back 2/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.handleTap(3, 3); await idle(); await sleep(1700);
  check('it is knocked back 2 tiles and not stunned', bull.row === 1 && bull.col === 3 && !St.isStunned(bull), bull.col + ',' + bull.row);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
