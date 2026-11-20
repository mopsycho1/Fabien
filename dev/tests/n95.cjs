// Roadmap 10.38 (20 Nov): the mask for a PLAYER-controlled Gadara. The AI has no choosing step, so it only ever showed the mask
// the cast gives; the player picked Singularity and saw him stand unmasked until the cast. Now the mask goes on as soon as
// Singularity is picked (the charge pose, 13.12), comes off if the pick is cancelled, and stays on through the confirm,
// the charge-up and until it goes off, in every facing.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 FABIEN_SIDES='{"e5":"hero"}' node n95.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors: all } = await start();
  const errors = all.filter((e) => !/focus\(\)/.test(e));
  const b = await battle(game); await sleep(500);
  const g = b.units.find((u) => u.id === 'e5');
  check('Gadara fights on the heroes\' side (the player controls him)', g.side === 'hero', g.side);
  const masked = () => /gadara_mask/.test(g.sprite.texture.key);
  const stage = (facing) => {
    let i = 0; for (const u of b.units) { u.alive = true; u.hp = u.maxHp; u.engagedWith = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; if (u !== g) b.placeUnit(u, [0, 10, 0, 10, 1, 9, 1, 9][i % 8], [0, 0, 10, 10, 0, 0, 10, 10][i++ % 8]); }
    g.channel = null; g.mask = 6; g.singularityUsed = false; if (g.status && g.status.used) g.status.used = {};
    b.placeUnit(g, 5, 5); g.facing = facing; b.showStanding(g);
    for (const u of b.units) u.ct = u === g ? 0 : Math.min(u.ct, 60);
    b.endTurn = () => {}; b.activeUnit = g; b.busy = false; b.cancelMode(); b.refreshButtons();
  };
  for (const facing of ['upRight', 'upLeft', 'downRight', 'downLeft']) {
    stage(facing);
    check(facing + ': standing, he has no mask on', !masked(), g.sprite.texture.key);
    b.chooseSpell('singularity'); await sleep(150);
    check(facing + ': picking Singularity puts the mask on (before any confirm)', masked() && !g.channel && !!g.charging, g.sprite.texture.key);
    b.cancelMode(); await sleep(150);
    check(facing + ': cancelling takes it off again', !masked() && !g.channel, g.sprite.texture.key);
    b.chooseSpell('singularity'); b.handleTap(g.col, g.row); await sleep(150);
    check(facing + ': the first tap (aim) keeps the mask on', masked() && !g.channel, g.sprite.texture.key);
    b.handleTap(g.col, g.row); await sleep(500);
    check(facing + ': confirmed: he is charging and still wears the mask', !!g.channel && masked() && !g.charging, g.sprite.texture.key);
    await sleep(1300);
    check(facing + ': the mask is on all through the charge-up', !!g.channel && masked(), g.sprite.texture.key);
    b.breakChannel(g); await sleep(900);
    check(facing + ': broken: the mask comes off', !g.channel && !masked(), g.sprite.texture.key);
  }
  // another skill is not touched: Snare Hook picked stays in his own picture (no mask)
  stage('upRight'); b.chooseSpell('snareHook'); await sleep(150);
  check('picking another skill (Snare Hook) does not put the mask on', !masked(), g.sprite.texture.key);
  b.cancelMode();
  // the AI path is unchanged: the cast shows the mask
  stage('downLeft'); g.side = 'enemy';
  await new Promise((res) => { b.busy = true; b.aiCast(g, g, 'singularity', res); });
  await sleep(400);
  check('the AI\'s cast still shows the mask', !!g.channel && masked(), g.sprite.texture.key);
  check('no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
