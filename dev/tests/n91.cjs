// Roadmap 13.60 and 1.71 (decided 20 Nov): Kofi's Haunt is a hex. It rolls against the target's magic defense
// (60 + 8 per point of his magic attack over its magic defense, 25 to 95 percent); when it lands the target is
// Disoriented for 2 turns (no poison any more), and a resisted Haunt does nothing but cost the MP.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= node n91.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  b.endTurn = () => {}; b.runEnemyTurn = () => {}; b.time.removeAllEvents(); b.tweens.killAll(); await sleep(200); b.busy = false;
  const kofi = b.units.find((u) => u.id === 'h4');
  const foe = b.units.find((u) => u.id === 'e2');
  const layra = b.units.find((u) => u.id === 'h3');
  const rule = require('../../src/data/spells.json').haunt.resist;
  check('Kofi is in the battle', !!kofi && !!foe);
  // the chance
  const c1 = St.hexChance(kofi, foe, rule), c2 = St.hexChance(kofi, layra, rule);
  check('against the Bull (magic defense ' + foe.magicDefense + '): 60 + 8 per point of edge', c1 === Math.max(25, Math.min(95, 60 + 8 * (kofi.magicAttack - foe.magicDefense))), c1);
  check('a stronger mind is harder to haunt (Layra, magic defense ' + layra.magicDefense + ')', c2 < c1, c2 + ' < ' + c1);
  check('never sure, never hopeless (25 to 95)', St.hexChance(kofi, { magicDefense: -50 }, rule) === 95 && St.hexChance(kofi, { magicDefense: 50 }, rule) === 25);
  const cast = async (roll) => {
    foe.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null }; foe.hp = foe.maxHp;
    kofi.mp = kofi.maxMp; kofi.status.cooldowns = {}; b.activeUnit = kofi; b.busy = true;
    b.placeUnit(kofi, 2, 3); b.placeUnit(foe, 2, 6);
    const real = w.Math.random; let n = 0; w.Math.random = () => (n++ < 1 ? roll : real());
    let done = false;
    try { b.castSpell(kofi, foe, 'haunt', () => { done = true; b.busy = false; }); } finally { w.Math.random = real; }
    const t = Date.now(); while (!done && Date.now() - t < 6000) await sleep(30);
  };
  await cast(0.01);
  check('a roll under the chance: Disoriented for 2 turns, by Haunt', St.isDisoriented(foe) && foe.status.disoriented.by === 'haunt' && foe.status.disoriented.turnsLeft === 2, JSON.stringify(foe.status.disoriented));
  check('...and no poison (the old rule is gone)', !St.isPoisoned(foe));
  check('...it costs 2 MP', kofi.mp === kofi.maxMp - 2);
  check('...the haunted unit fights worse (attack -2, defense -2, evade -10)', St.statMod(foe, 'attack') <= -2 && St.statMod(foe, 'defense') <= -2 && St.statMod(foe, 'evade') <= -10);
  await cast(0.99);
  check('a roll over the chance: Resisted, nothing lands', !St.isDisoriented(foe) && !St.isPoisoned(foe) && !St.isDrenched(foe));
  check('...the MP is still spent', kofi.mp === kofi.maxMp - 2);
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
