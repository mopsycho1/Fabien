// The new archer: dagger up close, Poison Arrow, Herbs cures, enemy archer AI.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('e3:archer_poisonShot.png')) await sleep(50);
  const b = await battle(game);
  const St = w.__status, G = w.__grid;
  const combat = require('./combat-bundle.cjs');
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), tayo = U('E1'), bull = U('E2'), archer = U('E3');
  const realEnd = b.endTurn.bind(b); b.endTurn = () => {};
  const park = () => { for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.status.cooldowns = {}; u.status.poison = null; u.status.buff = null; } b.refreshEngagementMarks(); put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 3, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0); };
  const real = w.Math.random; const sure = () => { w.Math.random = () => (/rollAttack|shootPoisonArrow/.test(new Error().stack) ? 0.01 : real()); };

  check('all 24 of her pictures loaded', game.textures.getTextureKeys().filter((k) => k.startsWith('e3:archer_')).length === 24);
  // dagger
  park(); put(archer, 3, 3); put(gaha, 3, 4); put(layra, 3, 5);
  const bowAt2 = combat.getDamage(archer, layra), daggerAt1 = combat.getDamage(archer, gaha);
  const bowSameFoe = combat.getDamage({ ...archer, closeWeapon: null }, gaha);
  check('right next to a foe she uses the dagger: 2 less damage than her bow', daggerAt1 === bowSameFoe - 2, daggerAt1 + ' vs ' + bowSameFoe + ' (bow at 2 tiles on Layra ' + bowAt2 + ')');
  let poses = [];
  const origPose = b.showPose.bind(b); b.showPose = (u, pose, dx) => { if (u === archer) poses.push(pose); return origPose(u, pose, dx); };
  sure(); b.activeUnit = archer; archer.hasActed = false; b.performAttack(archer, gaha, () => {}); await idle(); await sleep(900); w.Math.random = real;
  check('and strikes with the dagger pose, not the bow', poses.includes('dagger') && !poses.includes('attack'), poses.join(','));
  poses = []; b.showPose = origPose;

  // Poison Arrow, by the enemy AI
  park(); put(archer, 3, 2); put(gaha, 3, 4); put(sudeen, 5, 2); gaha.hp = 20; // both 2 tiles away
  const mv = archer.move; archer.move = 0; // she stays put for this check
  b.activeUnit = archer; archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0;
  sure(); b.runEnemyTurn(); await sleep(700); await idle(); await sleep(1200);
  check('she takes aim at one of them first (MARKED)', [gaha, sudeen].some((u) => u.markedBy === archer));
  let shot = false; b.releaseAim(archer, () => { shot = true; }); await sleep(1800); w.Math.random = real; archer.move = mv;
  const victim = [gaha, sudeen].find((u) => St.isPoisoned(u));
  check('the enemy archer uses Poison Arrow on the healthiest foe in reach', victim === sudeen, victim && victim.label);
  check('Poison Arrow then waits 3 turns', St.cooldownOf(archer, 'poisonArrow') === 3);
  check('POISON shows over the target', St.statusTags(sudeen).some((t) => t.text === 'POISON'));
  // ticks
  const hp0 = sudeen.hp; St.tickPoison(sudeen);
  check('poison takes 3 at the start of each of its turns', hp0 - sudeen.hp === 3, hp0 + ' -> ' + sudeen.hp);
  sudeen.hp = 2; St.tickPoison(sudeen);
  check('but never the last point of health', sudeen.hp === 1, sudeen.hp);
  St.tickPoison(sudeen);
  check('it wears off after 3 turns', !St.isPoisoned(sudeen));
  // the archer keeps her distance
  park(); put(archer, 3, 3); put(gaha, 3, 4); archer.status.cooldowns = { poisonArrow: 2 };
  b.activeUnit = archer; archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0;
  sure(); b.runEnemyTurn(); await sleep(700); await idle(); await sleep(1400); w.Math.random = real;
  check('an enemy archer next to a foe steps away before shooting', Math.abs(archer.col - gaha.col) + Math.abs(archer.row - gaha.row) >= 2, archer.col + ',' + archer.row);

  // Herbs cures
  park(); put(sudeen, 2, 6); put(gaha, 2, 5); St.applyPoison(gaha, 'poisonArrow');
  b.activeUnit = sudeen; sudeen.hasActed = false; sudeen.hasMoved = false; sudeen.stepsUsed = 0; b.cancelMode();
  b.onSpellButton(); b.chooseSpell('herbs');
  check('Herbs can target a poisoned ally even at full health', b.targetsInRange.includes(gaha));
  b.handleTap(2, 5); b.handleTap(2, 5); await idle();
  check('Herbs cures the poison', !St.isPoisoned(gaha));

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
