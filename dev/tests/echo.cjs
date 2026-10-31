// Husk echo, new pictures, Engage button, spear reach from high ground, figure size.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('e2:bull_down.png')) await sleep(50);
  const b = await battle(game);
  const St = w.__status, G = w.__grid;
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.cancelMode(); };
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), tayo = U('E1'), bull = U('E2'), archer = U('E3');
  const park = () => { for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.status.cooldowns = {}; u.status.buff = null; u.status.hex = null; } b.refreshEngagementMarks(); put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 3, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0); };
  const realEnd = b.endTurn.bind(b);
  b.runEnemyTurn = () => {}; // this test plays every turn by hand

  // pictures and names
  check('names: Sudeen, Gaha, Layra vs Rabdul, Bull Commander (Tayo is on the bench)', [sudeen, gaha, layra, tayo, bull].map((u) => u.name).join() === 'Sudeen,Gaha,Layra,Rabdul,Bull Commander', b.units.map((u) => u.name).join());
  const keys = game.textures.getTextureKeys();
  check('Layra\'s 12 pictures loaded', keys.filter((k) => k.startsWith('h3:layra_')).length === 12, keys.filter((k) => k.startsWith('h3:layra_')).length);
  check('the bull\'s pictures loaded', keys.filter((k) => k.startsWith('e2:bull_')).length === 18, keys.filter((k) => k.startsWith('e2:bull_')).length);
  park(); St.applyBuff(sudeen, 'stone'); b.showStanding(sudeen);
  check('Sudeen under Stone shows his stone look', /sudeen_stone_/.test(sudeen.sprite.texture.key), sudeen.sprite.texture.key);
  sudeen.status.buff = null; b.showStanding(sudeen);
  check('the figures are drawn at 86% size (map.json figureScale)', Math.abs(gaha.sprite.displayHeight / (gaha.sprite.height * gaha.artScale) - 1) < 0.01 && Math.abs(gaha.artScale * gaha.sprite.height - 86) < 3, (gaha.artScale * gaha.sprite.height).toFixed(1));

  // spear reach from high ground: row 0 is height 2, row 4 is height 0
  park(); put(gaha, 0, 0); put(bull, 0, 4); turnOf(gaha);
  b.onSpellButton(); b.chooseSpell('spearThrow');
  check('from 2 levels up, Spear Throw reaches an enemy 4 tiles away', b.targetsInRange.includes(bull), b.targetsInRange.map((u) => u.label).join());
  b.cancelMode(); put(gaha, 4, 4); put(bull, 4, 0); turnOf(gaha);
  b.onSpellButton(); b.chooseSpell('spearThrow');
  check('from below, it does not', !b.targetsInRange.includes(bull));
  b.cancelMode();

  // ---------- Husk echo ----------
  // turn 1: Husk. The decoy must survive the end of her own turn.
  park(); put(layra, 3, 6); put(bull, 3, 2); turnOf(layra); layra.mp = 12;
  b.endTurn = () => {};
  b.onSpellButton(); b.chooseSpell('husk'); b.handleTap(5, 6); b.handleTap(5, 6); await idle();
  realEnd.call(b) ; await sleep(200); b.endTurn = () => {};
  check('the decoy stays after the turn she cast Husk', b.decoys.length === 1 && layra.hidden);
  // nobody strikes it; her next turn starts
  b.activeUnit = layra; b.wakeDecoy(layra); await sleep(350);
  check('at her next turn: she shows herself and the decoy is ready to echo', !layra.hidden && layra.echoReady && b.decoys.length === 1 && St.statusTags(layra).some((t) => t.text === 'ECHO'));
  turnOf(layra);
  put(bull, 5, 3); bull.hp = bull.maxHp; const hp = bull.hp;
  const dmgLog = []; const origImpact = b.showImpact.bind(b); b.showImpact = (a, t, r, dx, l) => { dmgLog.push(a.label + '>' + t.label + ':' + r.damage + '@' + (new Error().stack.split('\n').slice(2,5).map((l) => l.trim().split(' ')[1]).join('<'))); return origImpact(a, t, r, dx, l); };
  const real = w.Math.random; w.Math.random = () => (/performAttack|rollAttack/.test(new Error().stack) ? 0.01 : real());
  b.onAttackButton(); b.handleTap(5, 3); b.handleTap(5, 3); await idle(); await sleep(1300);
  w.Math.random = real;
  const combat = require('./combat-bundle.cjs');
  const one = combat.getDamage(layra, bull);
  b.showImpact = origImpact;
  check('Lightning with an echo: two bolts hit (twice the damage)', hp - bull.hp === one * 2, hp + ' -> ' + bull.hp + ' (one bolt ' + one + ') ' + dmgLog.join(' '));
  check('the decoy bursts after echoing', b.decoys.length === 0 && !layra.echoReady);

  // echo on a Verse: twice as strong
  park(); put(layra, 3, 6); put(gaha, 3, 5); turnOf(layra); layra.mp = 12;
  b.onSpellButton(); b.chooseSpell('husk'); b.handleTap(5, 6); b.handleTap(5, 6); await idle();
  b.wakeDecoy(layra); turnOf(layra); layra.mp = 12;
  b.onSpellButton(); b.openSpellGroup('Blessings'); b.chooseSpell('fury'); b.handleTap(3, 5); b.handleTap(3, 5); await idle(); await sleep(800);
  check('an echoed Verse of Fury gives +4 attack instead of +2', St.statMod(gaha, 'attack') === 4, St.statMod(gaha, 'attack'));
  check('and the decoy is gone', b.decoys.length === 0);

  // an unused echo fades at the end of her turn
  park(); put(layra, 3, 6); turnOf(layra); layra.mp = 12;
  b.onSpellButton(); b.chooseSpell('husk'); b.handleTap(5, 6); b.handleTap(5, 6); await idle();
  b.activeUnit = layra; b.wakeDecoy(layra); turnOf(layra);
  realEnd.call(b); await sleep(300);
  check('an echo she does not use fades at the end of her turn', b.decoys.length === 0 && !layra.echoReady);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
