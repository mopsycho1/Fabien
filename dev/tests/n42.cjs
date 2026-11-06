// Roadmap 13.4: Tayo's Element Blast (fire when Enchanted, water when Drenched), on the Hidden Cavern.
// Run with FABIEN_MAP=cavern FABIEN_BENCH= . Unused header follows:
// 4.1 Rabdul's Enchant (his MP, the +2, the flaming looks of the bull and the
// archer, the AI), 4.2 Tayo's Earth Drive (half damage, thrown back, the spike
// wall: blocks walking and arrows, crumbles after 2 of his turns; no wall when
// the foe can't be moved), 4.3 Tayo in for the bull, and the calmer cavern lights.
// Run with FABIEN_MAP=cavern FABIEN_BENCH= (nobody sits out, so the bull can be tested too).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:blast_orb_0')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, C = w.__combat;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3'), tayo = U('E4');
  const all = [sudeen, gaha, layra, rabdul, bull, archer, tayo];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[0, 8], [1, 8], [0, 7], [8, 0], [7, 0], [8, 1], [6, 0]];
  const reset = (placed) => {
    for (const sp of [...b.spikes]) b.removeSpike(sp);
    all.forEach((u, i) => { u.status = null; u.alive = true; u.hp = u.maxHp = Math.max(u.maxHp, 150); u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.accuracy = 999; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const key = (u) => (u.sprite ? u.sprite.texture.key : '');
  const seen = new Map();
  const realShow = b.showFrame.bind(b);
  b.showFrame = (u, f) => { const ok = realShow(u, f); if (f) { if (!seen.has(u)) seen.set(u, []); seen.get(u).push(f.key); } return ok; };
  const shown = (u) => seen.get(u) || [];

  const spell = require('../../src/data/spells.json').elementBlast;
  const runCast = (caster, target) => new Promise((res) => { b.activeUnit = caster; b.castElementBlast(caster, target, spell, res); setTimeout(res, 6000); });
  check('13.4 the pictures: three poses in four views and four orbs', ['blastWind', 'blastCharge', 'blastPunch'].every((p) => ['upLeft', 'upRight', 'downLeft', 'downRight'].every((f) => game.textures.exists('e1:tayo_n6d_' + p + '_f' + (['upLeft', 'upRight', 'downLeft', 'downRight'].indexOf(f) + 1) + '.png'))) && [0, 1, 2, 3].every((i) => game.textures.exists('fx:blast_orb_' + i)));
  check('13.4 Tayo has the skill; range 3, cooldown 3', tayo.spells.includes('elementBlast') && spell.range === 3 && spell.cooldown === 3);

  // the AI: needs an element, a straight line and a clear shot
  reset([[tayo, 4, 3], [sudeen, 4, 6]]);
  check('13.4 no element on him: no blast', b.blastTarget(tayo) === null);
  S.applyEnchant(tayo, 'enchant');
  check('13.4 Enchanted, foe 3 tiles down the line: he fires', b.blastTarget(tayo) === sudeen);
  put(sudeen, 5, 6);
  check('13.4 not in a line: no blast', b.blastTarget(tayo) === null);
  put(sudeen, 4, 7);
  check('13.4 4 tiles away: out of range', b.blastTarget(tayo) === null);

  // fire
  reset([[tayo, 4, 3], [sudeen, 4, 6]]);
  S.applyEnchant(tayo, 'enchant');
  const hp0 = sudeen.hp;
  seen.clear();
  await runCast(tayo, sudeen);
  check('13.4 fire: full damage, sets Burn, spends the Enchant', sudeen.hp < hp0 && S.isBurning(sudeen) && !S.isEnchanted(tayo), hp0 + ' -> ' + sudeen.hp);
  check('13.4 he shows wind-up, arms open and punch', ['blastWind', 'blastCharge', 'blastPunch'].every((p) => shown(tayo).some((k) => k.includes(p))), shown(tayo).slice(0, 5).join(','));

  // fire at a Drenched foe: no burn
  reset([[tayo, 4, 3], [sudeen, 4, 5]]);
  S.applyEnchant(tayo, 'enchant'); S.applyDrenched(sudeen, 2);
  await runCast(tayo, sudeen);
  check('13.4 fire at a Drenched foe does not burn', !S.isBurning(sudeen));

  // water
  reset([[tayo, 4, 3], [sudeen, 4, 5]]);
  S.applyDrenched(tayo, 2); S.applyBurn(sudeen, 'wildfire');
  const hp1 = sudeen.hp;
  await runCast(tayo, sudeen);
  check('13.4 water: damage, leaves the target Drenched, puts out its burn, Tayo dries off', sudeen.hp < hp1 && S.isDrenched(sudeen) && !S.isBurning(sudeen) && !S.isDrenched(tayo));
  check('13.4 the blue orb was made', game.textures.exists('fx:blast_orb_water_0'));

  // the cooldown
  check('13.4 cooldown after use', (() => { S.startCooldown(tayo, 'elementBlast'); S.applyDrenched(tayo, 2); put(sudeen, 4, 5); return b.blastTarget(tayo) === null; })());

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
