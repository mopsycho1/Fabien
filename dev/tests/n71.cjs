// M16 (roadmap 18.16, checklist H2): save and resume. The battle is saved between turns; a
// battle started with "resume" comes back with every fighter's numbers, place and
// conditions, the turn count, what was dug up and Tayo's rocks, at the start of the turn
// that was being played.
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n71.cjs
// (The reload in a real browser: node dev/browser/resume.cjs)
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  let b = await battle(game); await sleep(600);
  const Sv = w.__save, St = w.__status, E = w.__engagement, I = w.__items;
  const U = (id) => b.units.find((u) => u.id === id);
  check('the battle saved itself when its first turn started', !!Sv.readSave() && Sv.readSave().turnCount === 0 && Sv.readSave().units.length === 8);

  // ---------- make a mess worth saving ----------
  b.runEnemyTurn = () => {};
  let sudeen = U('h1'), gaha = U('h2'), layra = U('h3'), kofi = U('h4'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  b.placeUnit(gaha, 4, 4); b.placeUnit(rabdul, 4, 3); b.placeUnit(sudeen, 2, 6); b.placeUnit(tayo, 6, 2);
  const hit = (u, d) => { u.hp = Math.max(0, u.hp - b.landHit(u, d).damage); b.updateHpBar(u); }; /* (landHit works the blow out; the caller takes the health off) */
  hit(gaha, 11); hit(tayo, 20); archer.hp = 0; b.damageTaken.e3 = archer.maxHp; b.defeat(archer); b.playDefeat(archer, 1);
  St.applyBuff(gaha, 'fury'); St.applyPoison(sudeen, 'poisonArrow'); St.startCooldown(sudeen, 'herbs'); layra.mp = 4; kofi.bag = { spiritWater: 2 };
  E.startDuel(gaha, rabdul); E.shiftMomentum(gaha, 2); gaha.poise = 1;
  const site = b.sites.find((s) => s.col === 1 && s.row === 2); b.activeUnit = sudeen; b.digUp(sudeen, site, () => {});
  b.spikes.push({ col: 6, row: 3, owner: tayo, turnsLeft: 2, view: null });
  b.turnCount = 37; b.lastEnemyClashTurn = 30;
  await sleep(1200); b.busy = false;
  const want = { gahaHp: gaha.hp, tayoHp: tayo.hp, track: gaha.engagement.track, cts: b.units.map((u) => u.ct).join(), sudeenBag: JSON.stringify(sudeen.bag), dmg: JSON.stringify(b.damageTaken) };
  b.startTurn(); await sleep(200); // the turn starts: this is the moment it saves
  const actor = b.activeUnit.id, turn = b.turnCount;
  const save = Sv.readSave();
  check('the save is plain data: no pictures, fighters named by id', save.turnCount === 37 && JSON.stringify(save).length < 40000 && save.units.find((s) => s.id === 'h2').data.engagedWith.__unit === 'e4', JSON.stringify(save).length + ' letters');

  // ---------- the page goes away; the battle is started again with "resume" ----------
  b.scene.restart({ stepIndex: null, resume: true });
  const tr = Date.now(); while (Date.now() - tr < 8000) { const s2 = game.scene.getScene('BattleScene'); if (s2.units && s2.activeUnit && s2.slots && s2.resumed && s2.turnCount === turn) break; await sleep(30); }
  b = game.scene.getScene('BattleScene'); await sleep(500); b.runEnemyTurn = () => {};
  sudeen = U('h1'); gaha = U('h2'); layra = U('h3'); kofi = U('h4'); tayo = U('e1'); archer = U('e3'); rabdul = U('e4');
  check('H2 it comes back at the start of the same turn: same turn number, same fighter to act', b.resumed === true && b.turnCount === turn && b.activeUnit.id === actor, b.turnCount + ' ' + b.activeUnit.id + ' (was ' + turn + ' ' + actor + ')');
  check('health is back as it was', gaha.hp === want.gahaHp && tayo.hp === want.tayoHp && gaha.hpFill.scaleX < 1, gaha.hp + ' ' + tayo.hp);
  check('the fallen archer is still fallen, and not drawn', archer.alive === false && archer.view.visible === false && archer.hp === 0);
  check('fighters stand where they stood', gaha.col === 4 && gaha.row === 4 && rabdul.row === 3 && tayo.col === 6 && Math.abs(gaha.view.x - w.__grid.tileToScreen(4, 4).x) < 1);
  check('Verses, poison, cooldowns, MP and bags are back', !!St.buffOf(gaha) && St.buffOf(gaha).id === 'fury' && St.isPoisoned(sudeen) && St.cooldownOf(sudeen, 'herbs') > 0 && layra.mp >= 4 && layra.mp <= 5 && kofi.bag.spiritWater === 2 && JSON.stringify(sudeen.bag) === want.sudeenBag, [St.buffOf(gaha) && St.buffOf(gaha).id, St.isPoisoned(sudeen), St.cooldownOf(sudeen, 'herbs'), layra.mp, JSON.stringify(kofi.bag), JSON.stringify(sudeen.bag)].join(' / '));
  check('the clash is back: the same two, one shared momentum track, Poise', gaha.engagedWith === rabdul && rabdul.engagedWith === gaha && gaha.engagement === rabdul.engagement && gaha.engagement.track === want.track && E.momentumOf(gaha) === 2 && gaha.poise === 1, gaha.engagement && gaha.engagement.track);
  check('the dug pot stays dug, the others are still there', b.sites.find((s) => s.col === 1 && s.row === 2).dug === true && b.sites.filter((s) => !s.dug && s.prop !== 'bag').length === 3);
  check('the fallen archer\'s satchel is on the board', b.sites.some((s) => s.prop === 'bag' && !s.dug && s.items.includes('bitterLeaf')));
  check('Tayo\'s rock stands again, with its owner and its turns', b.spikes.length === 1 && b.spikes[0].owner === tayo && b.spikes[0].turnsLeft >= 1 && !!b.spikes[0].view && !!b.spikeAt(6, 3));
  check('the damage count for the result screen carried over', Object.keys(b.damageTaken).length >= 3 && b.damageTaken.e3 === JSON.parse(want.dmg).e3, JSON.stringify(b.damageTaken));
  check('the enemies\' clash wait carried over', b.lastEnemyClashTurn === 30);
  // it plays on
  const before = b.turnCount; b.busy = false; b.cancelMode(); b.endTurn(); await sleep(900);
  check('and the battle plays on: the next turn starts and is saved', b.turnCount === before + 1 && Sv.readSave().turnCount === before);
  // the end clears the save
  for (const f of b.units.filter((u) => u.side === 'enemy' && u.alive)) { b.landHit(f, f.hp); b.defeat(f); }
  b.battleOver = true; b.showResult('victory'); await sleep(200);
  check('when the battle ends the save is cleared', Sv.readSave() === null);
  // a save that does not fit is refused
  check('a save for other fighters is refused and changes nothing', Sv.applySave(b, { v: 1, units: [{ id: 'zz', data: {} }] }) === false);

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
