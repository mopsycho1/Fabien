// 19.11 (Suleiman and Baiyee 27 Nov): the Thief's Steal takes one item or one buff from the foe next to him, with his cut
// steal pose. A Verse first (his for 2 turns), then an Enchanted weapon, then one item (healing first). No damage, no
// reveal, ready again after 3 turns. Only a foe with something to take can be picked. The AI steals a blessing.
// Run:  FABIEN_MAP=cavern FABIEN_NEW=1 FABIEN_BENCH= node n125.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const thief = U('e6'), gaha = U('h2'), layra = U('h3');
  check('the Thief, Gaha and Layra are in the battle', !!(thief && gaha && layra));
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => { b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; let i = 0; for (const u of b.units) { u.engagedWith = null; u.status = fresh(); u.hidden = false; u.thiefHidden = false; u.hasActed = false; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; } };
  const waitDone = async (go) => { let done = false; go(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 6000) await sleep(30); await sleep(200); return done; };
  check('Steal is in his kit', thief.spells.includes('steal'), thief.spells.join(','));
  check('his steal pose is wired, four views', ['upLeft', 'upRight', 'downLeft', 'downRight'].every((f) => b.textures.exists('e6:thief_steal_' + { downRight: 1, upLeft: 2, downLeft: 3, upRight: 4 }[f] + '.png')));

  // a Verse first
  park(); b.placeUnit(thief, 5, 5); b.placeUnit(gaha, 5, 6); b.activeUnit = thief;
  St.applyBuff(gaha, 'fury'); gaha.bag = { sheaBalm: 1 };
  const hp0 = gaha.hp;
  b.thiefHidden = false; b.hideThief(thief);
  const shown = []; const sp = b.showPose.bind(b); b.showPose = (u, pose, ...r) => { if (u === thief) shown.push(pose); return sp(u, pose, ...r); };
  await waitDone((d) => b.castSpell(thief, gaha, 'steal', d));
  b.showPose = sp;
  check('he takes the Verse: Fury is his for 2 turns, gone from Gaha', thief.status.buff && thief.status.buff.id === 'fury' && thief.status.buff.turnsLeft === 2 && !gaha.status.buff, JSON.stringify(thief.status.buff));
  check('...the item stays (one thing a steal)', gaha.bag.sheaBalm === 1);
  check('...no damage', gaha.hp === hp0);
  check('...with his steal pose', shown.includes('steal'), shown.join(','));
  check('...and he stays Hidden', thief.hidden);
  check('...ready again after 3 turns', St.cooldownOf(thief, 'steal') === 3, St.cooldownOf(thief, 'steal'));

  // then an item (healing first)
  park(); b.placeUnit(thief, 5, 5); b.placeUnit(layra, 4, 5); b.activeUnit = thief;
  layra.bag = { spiritWater: 1, sheaBalm: 2 }; thief.bag = {};
  await waitDone((d) => b.castSpell(thief, layra, 'steal', d));
  check('no blessing: he takes one item, healing first (a Shea Balm)', thief.bag.sheaBalm === 1 && layra.bag.sheaBalm === 1 && layra.bag.spiritWater === 1, JSON.stringify(thief.bag) + ' ' + JSON.stringify(layra.bag));

  // only a foe with something to take
  park(); b.placeUnit(thief, 5, 5); b.placeUnit(gaha, 5, 6); b.activeUnit = thief; gaha.bag = {};
  b.chooseSpell('steal');
  check('a foe with nothing to take cannot be picked', !b.targetsInRange.includes(gaha));
  b.cancelMode();

  // the AI steals a blessing next to him
  park(); b.placeUnit(thief, 5, 5); b.placeUnit(gaha, 5, 6); b.activeUnit = thief;
  St.applyBuff(gaha, 'swiftness');
  const pick = b.newClassChoice ? b.newClassChoice(thief, b.enemyEyes()) : null;
  check('the AI picks Steal on the blessed foe next to him', pick && pick.id === 'steal' && pick.target === gaha, pick && pick.id);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
