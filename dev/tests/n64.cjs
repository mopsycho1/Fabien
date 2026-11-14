// M15 (roadmap 18.15): enemy play. Enemies heal an ally next to them (13.25); Sonic Burst
// bursts Tayo's Earth Drive rocks onto the foes beside them (13.38).
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n64.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, I = w.__items, combat = w.__combat;
  const spells = require('../../src/data/spells.json');
  const U = (id) => b.units.find((u) => u.id === id);
  const sudeen = U('h1'), gaha = U('h2'), layra = U('h3'), kofi = U('h4'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(60); };
  b.endTurn = () => {}; b.enemySecondWalk = false;
  const bags = Object.fromEntries(b.units.map((u) => [u.id, { ...u.bag }]));
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.bag = { ...bags[u.id] }; u.hidden = false; }
    for (const sp of b.spikes.slice()) b.removeSpike(sp);
    put(sudeen, 0, 8); put(gaha, 1, 8); put(layra, 2, 8); put(kofi, 3, 8); put(tayo, 8, 0); put(bull, 7, 0); put(archer, 6, 0); put(rabdul, 5, 0);
    b.busy = false; b.cancelMode(); b.refreshEngagementMarks(); b.refreshStatusTags();
  };
  const turn = async (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.runEnemyTurn(); await sleep(700); await idle(); await sleep(900); await idle(); };

  // ---------- 13.25: healing an ally ----------
  park(); put(bull, 4, 1); put(tayo, 4, 2); tayo.hp = Math.floor(tayo.maxHp * 0.3);
  check('the rule: the bull, healthy, with a balm, next to a badly hurt Tayo, picks the balm for Tayo', (() => { const g = I.enemyAllyItemChoice(bull, [tayo]); return g && g.id === 'sheaBalm' && g.target === tayo; })());
  const hp0 = tayo.hp;
  await turn(bull);
  check('on his turn the bull gives Tayo his Shea balm: Tayo is healed, the balm is spent, and it was the bull\'s action', tayo.hp === hp0 + 10 && !(bull.bag.sheaBalm > 0) && bull.hasActed, tayo.hp + ' bag ' + JSON.stringify(bull.bag));
  park(); put(bull, 4, 1); put(tayo, 4, 2); tayo.hp = Math.floor(tayo.maxHp * 0.3); bull.hp = Math.floor(bull.maxHp * 0.4);
  check('hurt himself, he keeps the balm for himself', I.enemyAllyItemChoice(bull, [tayo]) === null && I.enemyItemChoice(bull) === 'sheaBalm');
  park(); put(bull, 4, 1); put(tayo, 4, 2); tayo.hp = Math.floor(tayo.maxHp * 0.7);
  check('an ally who is only scratched gets nothing', I.enemyAllyItemChoice(bull, [tayo]) === null);
  park(); put(archer, 4, 1); put(tayo, 4, 2); St.applyPoison(tayo, 'poisonArrow');
  check('the archer cures a poisoned ally next to her with her Bitter leaf', (() => { const g = I.enemyAllyItemChoice(archer, [tayo]); return g && g.id === 'bitterLeaf' && g.target === tayo; })());
  park(); put(bull, 4, 1); put(tayo, 4, 4); tayo.hp = 5;
  const mates = b.units.filter((o) => o.alive && o.side === bull.side && o !== bull && combat.distance(bull, o) === 1);
  check('an ally two tiles away is out of reach (items are handed over, not thrown)', I.enemyAllyItemChoice(bull, mates) === null);

  // ---------- 13.38: the rock combo ----------
  check('Sonic Burst names its rock damage (4) and says so in its text', spells.clap.rockDamage === 4 && /rock/i.test(spells.clap.text));
  park(); put(tayo, 3, 7); put(gaha, 4, 7); /* flat ground along the near wall */ put(sudeen, 8, 4); put(layra, 8, 5); put(kofi, 8, 6); /* the other heroes far away */
  // Earth Drive first: Gaha is thrown back a tile and a rock stands where he was
  await new Promise((res) => { b.busy = true; b.castSpell(tayo, gaha, 'earthDrive', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  await sleep(900);
  const rock = b.spikes.find((sp) => sp.owner === tayo);
  check('Earth Drive leaves a rock next to Tayo and throws Gaha a tile back, beside it', !!rock && rock.col === 4 && rock.row === 7 && gaha.col === 5 && gaha.row === 7, rock && rock.col + ',' + rock.row + ' gaha ' + gaha.col + ',' + gaha.row);
  tayo.status.cooldowns = {}; tayo.hasActed = false;
  check('his AI sees the combo: a rock in reach with a foe beside it', b.clapCombo(tayo) === true && b.clapFoes(tayo).length === 1);
  const plain = Math.max(1, Math.round(combat.getDamage(tayo, gaha) * spells.clap.damageShare));
  const g0 = gaha.hp; const calls = []; const cs = b.castSpell.bind(b); const cc = b.castClap.bind(b); b.castClap = (...a) => { calls.push('clap'); return cc(...a); };
  const lh = b.landHit.bind(b); const hitsLog = []; b.landHit = (t, d) => { hitsLog.push(t.id + ':' + d); return lh(t, d); };
  await turn(tayo); b.castClap = cc; b.landHit = lh;
  check('with only one foe in reach he still claps, for the combo', calls.length === 1, calls.join());
  /* (he may lose more than these two: the wave can also slam him into what stands behind him) */
  check('the rock bursts (it is gone) and Gaha takes two blows: 4 from the rock, then the wave', !b.spikes.includes(rock) && hitsLog.join() === 'h2:4,h2:' + plain && g0 - gaha.hp >= plain + 4, hitsLog.join() + ' lost ' + (g0 - gaha.hp));
  // a rock with nobody beside it bursts harmlessly; a foe far from the rock takes only the wave
  park(); put(tayo, 4, 4); put(gaha, 4, 2); b.spikes.push({ col: 4, row: 6, owner: tayo, turnsLeft: 2, view: null });
  const g1 = gaha.hp; check('no foe beside the rock: his AI sees no combo', b.clapCombo(tayo) === false);
  await new Promise((res) => { b.busy = true; b.castSpell(tayo, null, 'clap', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  await sleep(600);
  check('the wave alone hurts a foe who is not next to a rock, and the rock still bursts', g1 - gaha.hp === plain && b.spikes.length === 0, 'lost ' + (g1 - gaha.hp));
  // another fighter's rocks are not his to burst
  park(); put(tayo, 4, 4); put(gaha, 4, 2); b.spikes.push({ col: 4, row: 6, owner: bull, turnsLeft: 2, view: null });
  await new Promise((res) => { b.busy = true; b.castSpell(tayo, null, 'clap', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  check('only his own rocks burst', b.spikes.length === 1);
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
