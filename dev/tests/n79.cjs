// Roadmap 6.65: Layra's Lightning in two forms. Plain: she gathers the orb and the bolt flies from her to the target, no
// strike from the sky. On a Drenched target (Skyfall) the lightning comes down from the sky instead of the bolt, for
// terrain.json water.skyfall.bonus more damage, with the "Skyfall!" callout, and the number lands when the strike arrives.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n79.cjs
const { start, battle } = require('./boot.cjs');
const terrain = require('../../src/data/terrain.json');
const slots = require('../../src/data/fxSlots.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid;
  const U = (id) => b.units.find((u) => u.id === id);
  const layra = U('h3'), tayo = U('e1');
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  let line = null;
  for (let r = 0; r < 11 && !line; r++) for (let c = 0; c + 3 < 11 && !line; c++) {
    const t = [0, 1, 2, 3].map((i) => ({ col: c + i, row: r }));
    if (t.every((x) => G.isInsideGrid(x.col, x.row) && !b.isBlocked(x.col, x.row))) line = t;
  }
  const park = () => { b.units.forEach((u, i) => { u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.status.buff = null; u.status.cooldowns = {}; if (u !== layra && u !== tayo) b.placeUnit(u, 10 - (i % 3), 10 - Math.floor(i / 3)); }); b.placeUnit(layra, line[0].col, line[0].row); b.placeUnit(tayo, line[3].col, line[3].row); layra.accuracy = 999; b.busy = false; b.cancelMode(); b.activeUnit = layra; };
  const run = async (drenched) => { /* a hit is never certain (95 in 100 at most): go again after a miss */
    for (let i = 0; i < 6; i++) { const r = await runOnce(drenched); if (r.lost > 0) return r; }
    return runOnce(drenched);
  };
  const runOnce = async (drenched) => {
    park(); tayo.status.drenched = drenched ? { turnsLeft: 2 } : null; b.refreshStatusTags();
    const seen = {}; const log = []; const t0 = Date.now(); const T = () => Date.now() - t0;
    const poll = setInterval(() => { for (const o of b.children.list) { const m = o.texture && /^fx:sfx_(lightning_\w+?)_\d+$/.exec(o.texture.key || ''); if (m && o.active && !seen[m[1]]) seen[m[1]] = T(); } }, 20);
    const oFT = b.floatText.bind(b); b.floatText = (u, t, c, o) => { log.push([T(), String(t)]); return oFT(u, t, c, o); };
    const hp0 = tayo.hp; let hpAt = null; const oHP = b.updateHpBar.bind(b); b.updateHpBar = (u) => { if (u === tayo && tayo.hp !== hp0 && hpAt === null) hpAt = T(); return oHP(u); };
    b.busy = true; let done = false; b.performAttack(layra, tayo, () => { done = true; b.busy = false; });
    const t = Date.now(); while (!done && Date.now() - t < 8000) await sleep(30); await sleep(400);
    clearInterval(poll); b.floatText = oFT; b.updateHpBar = oHP;
    return { seen, log, lost: hp0 - tayo.hp, hpAt };
  };
  const plain = await run(false);
  check('plain Lightning: the orb and the bolt, and no strike from the sky', plain.seen.lightning_orb !== undefined && plain.seen.lightning_bolt !== undefined && plain.seen.lightning_strike === undefined, JSON.stringify(plain.seen));
  check('plain Lightning: no Skyfall callout', !plain.log.some((l) => l[1] === terrain.water.skyfall.word));
  check('plain Lightning: the number lands when the bolt arrives (its hitMs)', plain.hpAt !== null && Math.abs(plain.hpAt - (plain.seen.lightning_bolt + slots.spells.lightning_bolt.hitMs)) < 320, plain.hpAt + ' vs ' + (plain.seen.lightning_bolt + slots.spells.lightning_bolt.hitMs));
  const wet = await run(true);
  check('on a Drenched target: the orb, then the strike from the sky, no bolt', wet.seen.lightning_orb !== undefined && wet.seen.lightning_strike !== undefined && wet.seen.lightning_bolt === undefined, JSON.stringify(wet.seen));
  check('Skyfall! shows', wet.log.some((l) => l[1] === terrain.water.skyfall.word), JSON.stringify(wet.log));
  check('Skyfall: the number lands when the strike arrives (its hitMs)', wet.hpAt !== null && Math.abs(wet.hpAt - (wet.seen.lightning_strike + slots.spells.lightning_strike.hitMs)) < 320, wet.hpAt + ' vs ' + (wet.seen.lightning_strike + slots.spells.lightning_strike.hitMs));
  // the damage: Drenched takes 1.5 times from lightning, and Skyfall adds its bonus on top
  const base = w.__combat.getDamage(layra, tayo); // (Drenched is on now, so this already has the 1.5)
  check('Skyfall damage is the Drenched damage plus the bonus (' + terrain.water.skyfall.bonus + ')', wet.lost === base + terrain.water.skyfall.bonus, wet.lost + ' vs ' + base + ' + ' + terrain.water.skyfall.bonus);
  check('no page errors', errors.filter((e) => !/Not implemented/.test(String(e))).length === 0);
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
