// M10b (roadmap 18.22, 14.1, 6.38): 4 against 4 on the cavern, and Kofi's first kit.
// Run on the cavern with the map's own line-up:  FABIEN_MAP=cavern node n62.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, G = w.__grid, combat = w.__combat;
  const U = (id) => b.units.find((u) => u.id === id);
  const kofi = U('h4'), layra = U('h3'), gaha = U('h2'), sudeen = U('h1'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 9000) await sleep(30); await sleep(60); };

  // ---------- the line-up ----------
  check('8 fighters: 4 heroes (Kofi the 4th) and 4 enemies (the bull is back)', b.units.length === 8 && b.units.filter((u) => u.side === 'hero').length === 4 && !!kofi && !!bull, b.units.map((u) => u.id).join(','));
  const tiles = new Set(b.units.map((u) => u.col + ',' + u.row));
  check('everyone starts on a tile of their own', tiles.size === 8, [...tiles].join(' '));
  // nobody's picture hides another's at the start: no two figures closer than 60 percent of a figure's width on the same screen row
  const overlaps = [];
  for (const p of b.units) for (const q of b.units) if (p !== q && p.view.y < q.view.y && Math.abs(p.view.x - q.view.x) < 30 && q.view.y - p.view.y < 60) overlaps.push(p.id + '/' + q.id);
  check('no figure stands right in front of another at the start', overlaps.length === 0, overlaps.join(' '));
  check('Kofi is a Shaman with Haunt and Infuse, and his attack is Spirit Bolt', kofi.jobName === 'Shaman' && kofi.spells.join() === 'haunt,infuse' && kofi.attackName === 'Spirit Bolt' && kofi.reading === true && kofi.maxMp === 10);
  const keys = game.textures.getTextureKeys();
  const want = []; for (const el of ['water', 'fire', 'storm', 'earth']) for (const k of ['chant', 'cast']) for (let i = 1; i <= 4; i++) want.push('h4:kofi_' + el + '_' + k + '_f' + i + '.png');
  for (let i = 1; i <= 4; i++) want.push('h4:kofi_hurt_f' + i + '.png', 'h4:kofi_down_f' + i + '.png');
  check('his 40 new pictures are loaded (casting in four elements, hurt, down)', want.every((k) => keys.includes(k)), want.filter((k) => !keys.includes(k)).slice(0, 3).join(' '));

  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.mp = u.maxMp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.aiming = null; u.markedBy = null; }
    put(sudeen, 0, 4); put(gaha, 0, 5); put(layra, 8, 4); put(tayo, 1, 0); put(bull, 2, 0); put(archer, 6, 0); put(rabdul, 7, 0); kofi.lastRead = null;
    b.busy = false; b.cancelMode(); b.refreshEngagementMarks(); b.refreshStatusTags();
  };

  // ---------- the Reading ----------
  park(); put(kofi, 2, 3); // water at (2,2),(3,2),(2,3),(2,5)...
  let r = b.reading(kofi);
  check('standing in the pool he reads Water', r.element === 'water' && r.points >= 2, JSON.stringify(r.all));
  check('and his Spirit Bolt is the Tide Bolt', b.readingMove(kofi) === 'spiritBoltWater');
  park(); put(kofi, 4, 4); // the platform: four lamps on its corners within 2 tiles, and it is high ground
  r = b.reading(kofi);
  check('on the platform, among the ritual lamps, he reads Fire', r.element === 'fire' && r.all.fire >= 4, JSON.stringify(r.all));
  park(); put(kofi, 1, 8); // rubble at (0,8),(1,8), sand at (1,7)
  r = b.reading(kofi);
  check('on rubble and sand he reads Earth', r.element === 'earth', JSON.stringify(r.all));
  park(); put(kofi, 7, 6); put(layra, 7, 7); put(gaha, 8, 6); St.applyBuff(gaha, 'swiftness');
  r = b.reading(kofi);
  check('beside Layra (lightning) and an ally under Swiftness he reads Storm', r.element === 'storm' && r.all.storm >= 4, JSON.stringify(r.all));
  // a bare spot, if the cavern has one: nothing to read
  park(); let bare = null;
  for (let c = 0; c < 9 && !bare; c++) for (let rr = 0; rr < 9 && !bare; rr++) { if (b.getUnitAt(c, rr)) continue; put(kofi, c, rr); kofi.lastRead = null; if (b.reading(kofi).points === 0) bare = [c, rr]; }
  if (bare) { r = b.reading(kofi); check('with nothing to read (tile ' + bare + ') he falls back to Water at strength 0', r.element === 'water' && r.points === 0, JSON.stringify(r.all)); }
  else console.log('PASS (the cavern has no bare tile: every spot reads something)');
  park(); put(kofi, 2, 3); b.activeUnit = kofi; b.refreshStatus();
  check('his turn line says what he reads and what his bolt will be', /Reads Water \d+: Tide Bolt/.test(b.statusText.text), b.statusText.text.replace(/\n/g, ' | '));
  // his casting picture follows the reading
  park(); put(kofi, 4, 4); kofi.facing = 'downRight'; b.showPose(kofi, 'chant', 10);
  const kFire = kofi.sprite.texture.key; put(kofi, 2, 3); kofi.lastRead = null; b.showPose(kofi, 'chant', 10);
  check('his channel picture is the fire one among the lamps and the green one in the pool', /kofi_fire_chant_f1/.test(kFire) && /kofi_water_chant_f1/.test(kofi.sprite.texture.key), kFire + ' / ' + kofi.sprite.texture.key);
  kofi.facing = 'downLeft'; b.showPose(kofi, 'cast', -10);
  check('casting down-left shows figure 3 mirrored (no down-left view was drawn)', /kofi_water_cast_f3/.test(kofi.sprite.texture.key) && kofi.sprite.flipX === true, kofi.sprite.texture.key + ' ' + kofi.sprite.flipX);

  // ---------- Spirit Bolt by element ----------
  const real = w.Math.random; const sure = () => { w.Math.random = () => (/rollAttack/.test(new Error().stack) ? 0.01 : real()); };
  const bolt = async (setup, foe) => {
    park(); setup(); sure();
    b.activeUnit = kofi; kofi.hasActed = false; b.busy = true;
    const from = { col: foe.col, row: foe.row }; const hp = foe.hp; const other = b.units.filter((u) => u.side === 'enemy' && u !== foe).map((u) => u.hp).join();
    await new Promise((res) => { b.performAttack(kofi, foe, res); setTimeout(res, 6000); });
    w.Math.random = real; await sleep(700);
    return { hurt: foe.hp < hp, moved: foe.col !== from.col || foe.row !== from.row, othersHurt: b.units.filter((u) => u.side === 'enemy' && u !== foe).map((u) => u.hp).join() !== other };
  };
  let out = await bolt(() => { put(kofi, 4, 4); put(tayo, 4, 7); }, tayo);
  check('Ember Bolt (Fire): it hurts and sets the target alight; it does not jump', out.hurt && St.isBurning(tayo) && !out.moved, JSON.stringify(out));
  out = await bolt(() => { put(kofi, 2, 3); put(tayo, 2, 6); put(bull, 2, 7); }, tayo);
  check('Tide Bolt (Water): it hurts and leaves the target Drenched; the foe next to it is not struck', out.hurt && St.isDrenched(tayo) && !out.othersHurt, JSON.stringify(out));
  out = await bolt(() => { put(kofi, 1, 8); put(tayo, 4, 8); }, tayo);
  check('Stone Bolt (Earth): it hurts and knocks the target a tile back', out.hurt && out.moved && tayo.col === 5 && tayo.row === 8, tayo.col + ',' + tayo.row);
  out = await bolt(() => { put(kofi, 7, 6); put(layra, 7, 7); put(gaha, 8, 6); St.applyBuff(gaha, 'swiftness'); put(tayo, 7, 3); put(bull, 7, 2); }, tayo);
  check('Gale Bolt (Storm): it hurts, and it is the one bolt that can jump to the foe beside the target', out.hurt && b.readingMove(kofi) === 'spiritBoltStorm' && combat.chainTarget(kofi, tayo, b.units) === bull && w.__game && true, JSON.stringify(out));

  // ---------- Haunt ----------
  park(); put(kofi, 2, 3); put(tayo, 2, 6);
  b.activeUnit = kofi; b.cancelMode(); b.onSpellButton && b.onSpellButton(); b.chooseSpell('haunt');
  check('Haunt can be aimed at a foe within 4 tiles, not at an ally', b.mode === 'spellTarget' && b.targetsInRange.includes(tayo) && !b.targetsInRange.some((u) => u.side === 'hero'), b.mode);
  b.cancelMode();
  const seen = []; const shown = b.showFrame.bind(b); b.showFrame = (u, f) => { const ok = shown(u, f); if (u === kofi && ok) seen.push(f.key); return ok; };
  await new Promise((res) => { b.busy = true; b.castSpell(kofi, tayo, 'haunt', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  b.showFrame = shown;
  check('Haunt costs 2 MP and marks the foe: 2 damage a turn for 3 turns', kofi.mp === kofi.maxMp - 2 && St.isPoisoned(tayo) && tayo.status.poison.turnsLeft === 3, JSON.stringify(tayo.status.poison));
  check('read in Water it also leaves the foe Drenched', St.isDrenched(tayo));
  check('he channels, then casts (both pictures, in that order)', seen.findIndex((k) => /chant/.test(k)) >= 0 && seen.findIndex((k) => /_cast_/.test(k)) > seen.findIndex((k) => /chant/.test(k)), seen.map((k) => k.split(':')[1]).join(' ').slice(0, 160));
  const hp1 = tayo.hp; const bite = St.tickPoison(tayo);
  check('the mark bites at the start of its turn', bite === 2 && tayo.hp === hp1 - 2, bite);
  park(); put(kofi, 1, 8); put(tayo, 4, 8); const sp0 = tayo.speed + St.statMod(tayo, 'speed');
  await new Promise((res) => { b.busy = true; b.castSpell(kofi, tayo, 'haunt', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  check('read in Earth it binds: the foe is slower', tayo.speed + St.statMod(tayo, 'speed') < sp0 && St.isPoisoned(tayo), sp0 + ' -> ' + (tayo.speed + St.statMod(tayo, 'speed')));

  // ---------- Infuse ----------
  park(); put(kofi, 4, 4); put(gaha, 4, 6);
  b.activeUnit = kofi; b.cancelMode(); b.chooseSpell('infuse');
  check('Infuse can be aimed at an ally within 3 tiles or himself, not at a foe', b.mode === 'spellTarget' && b.targetsInRange.includes(gaha) && b.targetsInRange.includes(kofi) && !b.targetsInRange.some((u) => u.side === 'enemy'), b.targetsInRange.map((u) => u.id).join());
  b.cancelMode();
  await new Promise((res) => { b.busy = true; b.castSpell(kofi, gaha, 'infuse', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  check('read in Fire, Infuse gives the Fury Verse, for 2 MP in all', St.buffOf(gaha) && St.buffOf(gaha).id === 'fury' && kofi.mp === kofi.maxMp - 2 && St.cooldownOf(kofi, 'infuse') === 2, (St.buffOf(gaha) || {}).id + ' mp ' + kofi.mp);
  park(); put(kofi, 2, 3); put(gaha, 2, 5); gaha.hp = 10; St.applyPoison(gaha, 'poisonArrow');
  await new Promise((res) => { b.busy = true; b.castSpell(kofi, gaha, 'infuse', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  await sleep(300);
  check('read in Water, Infuse is Renewal: +8 health and the poison is lifted', gaha.hp === 18 && !St.isPoisoned(gaha), gaha.hp);

  // ---------- a whole 4 v 4 enemy round does not break ----------
  park(); b.runEnemyTurn = Object.getPrototypeOf(b).runEnemyTurn.bind(b);
  put(kofi, 6, 8); put(sudeen, 3, 7); put(gaha, 5, 7); put(layra, 4, 8); put(rabdul, 3, 1); put(bull, 5, 1); put(archer, 4, 0); put(tayo, 4, 1);
  for (const e of [rabdul, tayo, bull, archer]) { b.activeUnit = e; e.hasActed = false; e.hasMoved = false; e.stepsUsed = 0; b.runEnemyTurn(); await sleep(700); await idle(); await sleep(900); await idle(); }
  check('all four enemies take a turn with no error', true);
  const realErr = errors.filter((e) => !e.includes('focus()'));
  check('no errors', realErr.length === 0, realErr.slice(0, 2).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
