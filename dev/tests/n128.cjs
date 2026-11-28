// Kofi's Renewal, his own spell again (Baiyee 28 Nov: "Kofi lost his healing when Infuse went. Give him Renewal back as his own
// spell, not through Infuse: it heals on cast and then a little each turn, with the numbers it had before (1.79). His AI uses
// it on the ally who needs it most, as before. Keep Call Spirit, Haunt and Spirit Swap as they are.")
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= node n128.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, E = w.__engagement, S = w.__spellsAll;
  const U = (id) => b.units.find((u) => u.id === id);
  const kofi = U('h4'), gaha = U('h2'), sudeen = U('h1'), layra = U('h3'), bull = U('e2');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => { b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; b.cancelMode(); let i = 0; for (const u of b.units) { if (u.engagedWith) E.endDuel(u); u.status = fresh(); u.hasActed = false; u.hp = u.maxHp; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; } };
  const waitDone = async (go) => { let done = false; go(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 6000) await sleep(30); await sleep(300); return done; };

  check('Kofi\'s kit: Haunt, Call Spirit, Renewal, Spirit Swap', kofi.spells.join(',') === 'haunt,callSpirit,kofiRenewal,spiritSwap', kofi.spells.join(','));
  const sp = S.kofiRenewal, R = S.renewal;
  check('the numbers it had under Infuse: 2 MP, reach 3, ready again after 2 turns', sp.mp === 2 && sp.range === 3 && sp.cooldown === 2, JSON.stringify({ mp: sp.mp, range: sp.range, cd: sp.cooldown }));
  check('...and Renewal itself as in 1.79: 3 turns, about 5 percent, at least 3, one weak status', R.turns === 3 && R.regen === 0.05 && R.minHeal === 3 && R.cleanse === 1);

  // ---------- the player casts it ----------
  park(); b.placeUnit(kofi, 4, 4); b.placeUnit(gaha, 5, 5); b.placeUnit(bull, 9, 9);
  b.activeUnit = kofi; kofi.mp = 9; kofi.hasActed = false; b.cancelMode(); b.refreshButtons();
  const row = b.spellMenu(kofi).find((e) => /^Renewal/.test(e.label));
  check('Renewal is in his skills list, usable', !!row && row.enabled, row && row.label);
  check('...with a healing icon', row && row.el === 'heal', row && row.el);
  gaha.hp = Math.round(gaha.maxHp * 0.4); St.applyPoison(gaha, 'poisonArrow');
  b.chooseSpell('kofiRenewal');
  check('it can pick a hurt friend in reach', b.targetsInRange.includes(gaha));
  check('...and Kofi himself', b.targetsInRange.includes(kofi));
  check('...never a foe', !b.targetsInRange.includes(bull));
  b.cancelMode();
  const said = []; const ft = b.floatText.bind(b); b.floatText = (u, t, ...r) => { if (u === gaha) said.push(t); return ft(u, t, ...r); };
  const hp0 = gaha.hp, mp0 = kofi.mp;
  await waitDone((d) => b.castSpell(kofi, gaha, 'kofiRenewal', d));
  const first = gaha.hp - hp0;
  const want = Math.max(R.minHeal, Math.round(gaha.maxHp * R.regen));
  check('it heals at once (about 5 percent, at least 3)', first >= R.minHeal && Math.abs(first - want) <= 1, first + ' (want about ' + want + ')');
  check('...says "+n Renewal"', said.some((t) => /Renewal/.test(t)), said.join('|'));
  check('...and lifts one weak status (the poison)', !St.isPoisoned(gaha));
  check('the Renewal Verse is on Gaha for 3 turns', gaha.status.buff && gaha.status.buff.id === 'renewal', JSON.stringify(gaha.status.buff));
  check('it cost 2 MP and waits 2 turns', kofi.mp === mp0 - 2 && St.cooldownOf(kofi, 'kofiRenewal') === 2, kofi.mp + ' ' + St.cooldownOf(kofi, 'kofiRenewal'));
  check('...it was his action', kofi.hasActed);
  // a little more at the start of Gaha's turn
  const hp1 = gaha.hp; said.length = 0;
  b.renewalTick(gaha); await sleep(400);
  check('then a little more at the start of each of his turns', gaha.hp - hp1 >= R.minHeal, gaha.hp - hp1);
  b.floatText = ft;

  // ---------- not on a friend in a clash ----------
  park(); b.placeUnit(kofi, 4, 4); b.placeUnit(gaha, 5, 5); b.placeUnit(bull, 5, 6); E.startDuel(bull, gaha);
  b.activeUnit = kofi; kofi.mp = 9; b.chooseSpell('kofiRenewal');
  check('not on a friend locked in a clash (it would not tick there)', !b.targetsInRange.includes(gaha));
  b.cancelMode(); E.endDuel(gaha);

  // ---------- the AI: the friend who needs it most ----------
  park(); b.placeUnit(kofi, 4, 4); b.placeUnit(gaha, 5, 5); b.placeUnit(sudeen, 3, 4); b.placeUnit(layra, 4, 6); b.placeUnit(bull, 10, 10);
  kofi.mp = 9; gaha.hp = Math.round(gaha.maxHp * 0.6); sudeen.hp = Math.round(sudeen.maxHp * 0.3); layra.hp = Math.round(layra.maxHp * 0.5);
  let pick = b.shamanChoice(kofi);
  check('AI: Renewal on the friend who needs it most (Sudeen at 30 percent)', pick && pick.id === 'kofiRenewal' && pick.target === sudeen, pick && pick.id + ' ' + (pick.target && pick.target.name));
  St.applyBuff(sudeen, 'stone');
  pick = b.shamanChoice(kofi);
  check('...one under a Verse already is passed over (Layra next, at 50)', pick && pick.target === layra, pick && pick.target && pick.target.name);
  for (const u of [gaha, sudeen, layra, kofi]) { u.hp = Math.round(u.maxHp * 0.9); u.status = fresh(); }
  pick = b.shamanChoice(kofi);
  check('...nobody at 70 percent or under: no Renewal', !pick || pick.id !== 'kofiRenewal', pick && pick.id);
  kofi.hp = Math.round(kofi.maxHp * 0.5); gaha.hp = Math.round(gaha.maxHp * 0.5);
  pick = b.shamanChoice(kofi);
  check('...on a tie a friend before himself', pick && pick.target === gaha, pick && pick.target && pick.target.name);
  kofi.status.cooldowns = { kofiRenewal: 1 };
  pick = b.shamanChoice(kofi);
  check('...waiting: he goes on to his other skills', !pick || pick.id !== 'kofiRenewal');

  // ---------- the rest of the kit is untouched ----------
  check('Call Spirit, Haunt and Spirit Swap as they were', S.callSpirit.mp === 3 && S.callSpirit.cooldown === 3 && S.callSpirit.range === 3 && S.haunt.kind === 'haunt' && S.spiritSwap.free === true);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
