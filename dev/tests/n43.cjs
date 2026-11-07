// Roadmap 13.12: the charge pose is held while the player picks a target.
// Run with FABIEN_MAP=cavern FABIEN_BENCH= .
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3'), tayo = U('E4');
  const all = [sudeen, gaha, layra, rabdul, bull, archer, tayo];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[0, 8], [1, 8], [0, 7], [8, 0], [7, 0], [8, 1], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { u.status = null; u.alive = true; u.hp = u.maxHp = Math.max(u.maxHp, 150); u.mp = u.maxMp; u.cooldowns = {}; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const key = (u) => (u.sprite ? u.sprite.texture.key : '');
  const has = (u, s) => key(u).includes(s);
  const pick = (u, id) => { b.activeUnit = u; b.mode = 'spell'; b.chooseSpell(id); };

  // Gaha: Sonic Javelin
  reset([[gaha, 4, 6], [rabdul, 4, 3]]);
  w.__status.applyBuff(gaha, 'swiftness');
  pick(gaha, 'sonicJavelin');
  check('13.12 Gaha picks Sonic Javelin: mode is spellTarget', b.mode === 'spellTarget', b.mode);
  check('13.12 he holds the wind-up picture', has(gaha, 'sonicPrep') || (gaha.charging && gaha.charging.pose === 'sonicWindup'), key(gaha));
  const held = key(gaha);
  b.showStanding(gaha);
  check('13.12 a refresh keeps the pose', key(gaha) === held, key(gaha));
  b.previewAttack(rabdul);
  check('13.12 picking a target keeps the pose', gaha.charging && gaha.charging.pose === 'sonicWindup' && has(gaha, 'sonicPrep'), key(gaha));
  b.spellBack();
  check('13.12 cancel: pose released, standing again', !gaha.charging && !has(gaha, 'sonicPrep') && !b.chargeFx, key(gaha));

  // Gaha confirm
  w.__status.applyBuff(gaha, 'swiftness');
  pick(gaha, 'sonicJavelin'); b.previewAttack(rabdul);
  const hp = rabdul.hp;
  b.confirmSpell();
  check('13.12 confirm: charge flag cleared at once', !gaha.charging && !b.chargeFx);
  await sleep(2500);
  check('13.12 the throw still lands', rabdul.hp < hp, hp + ' -> ' + rabdul.hp);

  // Layra: a Verse (chant + element rising)
  reset([[layra, 4, 6], [gaha, 4, 5]]);
  pick(layra, 'swiftness');
  check('13.12 Layra picks a Verse: she chants', layra.charging && layra.charging.pose === 'chant' && has(layra, 'chant'), key(layra));
  check('13.12 her element swirl is held', b.chargeFx && b.chargeFx.stops.length === 1);
  b.cancelMode();
  check('13.12 backing out ends pose and swirl', !layra.charging && !b.chargeFx && !has(layra, 'chant'), key(layra));

  // Tayo: the orb
  reset([[tayo, 4, 3], [sudeen, 4, 6]]);
  w.__status.applyEnchant(tayo, 'enchant');
  pick(tayo, 'elementBlast');
  check('13.12 Tayo picks Element Blast: he holds the charge pose and the orb', tayo.charging && has(tayo, 'blastCharge') && b.chargeFx.stops.length === 1, key(tayo));
  b.cancelMode();
  check('13.12 cancelled: orb gone, pose gone', !tayo.charging && !has(tayo, 'blastCharge'), key(tayo));

  // Skills with no charge picture stay standing
  reset([[sudeen, 4, 6], [rabdul, 4, 5]]);
  w.__status.applyBuff(sudeen, 'fury');
  pick(sudeen, 'furyCharge');
  check('13.12 a skill with no charge pose: nothing held', !sudeen.charging);
  b.cancelMode();

  check('no errors', errors.filter((e) => !e.includes('focus()')).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
