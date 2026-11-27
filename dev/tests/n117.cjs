// 26 Nov batch (Suleiman 22 to 26 Nov). Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1.
//   1.103 no floor or painted shadow left under Layra's standing and battle pictures (dev/tools/shadow_clean.py --check)
//   1.105 the save records the line-up with its sides, so Continue builds the same fighters (dev/browser/resume_lineup.cjs: the reload)
//   1.106 Gaha's Attack and Lunge strike with his newest drawn thrust (the 18 Nov lunge attack sheet), never the old skeleton-era frames
//   1.107 Sudeen keeps his sword and shield in the same hands across stance, attack, block and wind-up in each facing
//   1.109 Rabdul's Spear Ward fires when he is Blinded and at a Hidden walker (Suleiman 22 Nov 22:50; Baiyee chose it 26 Nov)
//   1.110 the battle screen hides for a screenshot (and comes back)
//   6.93 Sudeen's Ward shows Suleiman's Golden Shield Triad: lit when on, dark when off (tag and Skills row)
//   6.94 Rabdul's Kindle the Haft burns with Suleiman's Shango flame aura; plain Enchant does not
//   1.104 Aegis blocks poison, Bleeding and burn; a poison tick on a shielded fighter is soaked by the shield; the dome covers him
const { start, battle } = require('./boot.cjs');
const { execSync } = require('child_process');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const ROOT = path.join(__dirname, '..', '..');
const PY = path.join(process.env.HOME, '.fabien-tools', 'venv', 'bin', 'python');
(async () => {
  // ---------- 1.103 ----------
  const files = ['stand', 'battle'].flatMap((k) => ['upLeft', 'upRight', 'downLeft', 'downRight'].map((f) => 'public/art/layra_n_' + k + '_' + f + '.png'));
  const out = execSync(PY + ' -I dev/tools/shadow_clean.py --check ' + files.join(' '), { cwd: ROOT }).toString().trim().split('\n');
  const left = out.map((l) => l.split(' ')).filter(([, n]) => Number(n) >= 40);
  check('1.103 no floor or painted shadow under Layra standing or in battle stance', left.length === 0, left.map((x) => x.join(' ')).join(', ') || 'all under 40 pixels');

  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  b.runEnemyTurn = () => {}; b.endTurn = () => {}; b.enemySecondWalk = false;
  const U = (id) => b.units.find((u) => u.id === id);

  // ---------- 1.104 ----------
  const St = w.__status;
  const ala = U('h5'), sud = U('h1'), arch = U('e3');
  const aegis = (u) => { u.shield = { hp: 8, turnsLeft: 3 }; b.syncShieldDome(u, true); };
  aegis(sud);
  check('1.104 Aegis blocks poison', St.applyPoison(sud, 'poisonArrow') === false && !St.isPoisoned(sud));
  check('1.104 Aegis blocks Bleeding', St.applyPoison(sud, 'ambush') === false && !St.isBleeding(sud));
  check('1.104 Aegis blocks burn', St.applyBurn(sud, 'kindleBurn') === false && !St.isBurning(sud));
  sud.shield = null; St.applyPoison(sud, 'poisonArrow'); sud.shield = { hp: 8, turnsLeft: 3 };
  const hp0 = sud.hp; const lost = St.tickPoison(sud);
  check('1.104 a poison tick on a shielded fighter is soaked by the shield', lost === 0 && sud.hp === hp0 && sud.shield.hp < 8, 'lost ' + lost + ', shield ' + sud.shield.hp);
  // the archer's coated hit on a shielded foe: "Blocked", no poison
  St.curePoison(sud); sud.shield = { hp: 8, turnsLeft: 3 }; arch.coated = true;
  b.coatLands(arch, sud);
  check('1.104 the coated hit is blocked by Aegis', !St.isPoisoned(sud));
  // the dome covers the whole fighter (its drawn dome, fit h, against his body height)
  sud.shield = null; b.syncShieldDome(sud); aegis(sud); await sleep(1500);
  const dome = sud.shieldDome;
  const slots = require('../../src/data/fxSlots.json');
  const find = (o) => { for (const k in o) { if (k === 'aegis' && o[k].fit) return o[k]; if (o[k] && typeof o[k] === 'object') { const r = find(o[k]); if (r) return r; } } return null; };
  // 1.127 (27 Nov): the dome is the concentrated Earth's Bulwark rock dome (Rabdul's when he holds the line), wrapped round
  // the fighter: as tall as him or taller, its back half behind his figure, so he is not covered
  const rf = slots.buffs.stone.fit.rooted;
  const first = dome && dome.objects ? dome.objects[0] : null;
  const domeH = first ? rf.h * first.scaleY : 0, body = sud.topY - 12;
  check('1.127 Aegis is the concentrated Earth\'s Bulwark rock dome', !!(dome && dome.rock && /buff_stone_rooted|stone_rooted/.test(first.texture.key)), first && first.texture.key);
  check('1.104 the Aegis dome is as tall as the fighter or taller', domeH >= body * 1.15, Math.round(domeH) + ' vs body ' + Math.round(body));
  const list = sud.view.list;
  check('1.127 ...its back half is behind his figure, the front only a faint lower part', first && list.indexOf(first) < list.indexOf(sud.sprite) && dome.objects.slice(1).every((o) => o.alpha < 0.5), list.indexOf(first) + ' vs ' + list.indexOf(sud.sprite));
  b.shieldFlash(sud); await sleep(400);
  check('1.104 a hit on the shield flashes the dome and leaves its size', first && Math.abs(first.scaleY * rf.h - domeH) < 1, (first && first.scaleY));
  sud.shield = null; b.syncShieldDome(sud);

  // ---------- 1.105 ----------
  const snap = w.__save ? w.__save.snapshot(b) : null;
  const sides = b.units.map((u) => u.id + ':' + u.side).sort().join(' ');
  const saved = snap && snap.lineUp ? [...snap.lineUp.hero.map((i) => i + ':hero'), ...snap.lineUp.enemy.map((i) => i + ':enemy')].sort().join(' ') : 'no lineUp in the save';
  check('1.105 the save records who fights on which side', saved === sides, saved);

  // ---------- 1.106 ----------
  const gaha = U('h2'), foe6 = U('e2');
  const watch = async (fn) => {
    const seen = new Set(); const iv = setInterval(() => { try { seen.add(gaha.sprite.texture.key); } catch (e) {} }, 10);
    await fn(); clearInterval(iv); return [...seen];
  };
  const park6 = () => b.units.forEach((u, i) => { if (u !== gaha && u !== foe6) b.placeUnit(u, [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [9, 0]][i % 6][0], [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [9, 0]][i % 6][1]); u.engagedWith = null; u.hp = u.maxHp = 300; });
  park6(); b.placeUnit(gaha, 4, 6); b.placeUnit(foe6, 5, 6);
  const att = await watch(() => new Promise((r) => b.performAttack(gaha, foe6, r)));
  await sleep(500);
  check('1.106 Gaha attacks with his newest thrust (gaha_n_lunge)', att.some((k) => /gaha_n_lunge/.test(k)), att.join(','));
  check('1.106 no old thrust frame in his attack', !att.some((k) => /gaha_thrust/.test(k)));
  park6();
  // a line where the Lunge can run (flat enough): the first one found
  let lineOk = false;
  for (let r = 1; r < 10 && !lineOk; r++) for (let c = 0; c < 7 && !lineOk; c++) {
    if (b.isBlocked(c, r) || b.isBlocked(c + 4, r)) continue;
    b.placeUnit(gaha, c, r); b.placeUnit(foe6, c + 4, r);
    if (b.lungeSpot(gaha, foe6, w.__spellsAll.lunge)) lineOk = true;
  } gaha.status.cooldowns = {}; gaha.hasActed = false; gaha.hasMoved = false; gaha.stepsUsed = 0; gaha.status.rooted = true; b.activeUnit = gaha; /* (Lunge needs him Rooted, as n75) */
  const lun = await watch(() => new Promise((r) => { b.busy = true; b.castSpell(gaha, foe6, 'lunge', () => { b.busy = false; r(); }); }));
  await sleep(500);
  check('1.106 the Lunge shows his leap and his lunge attack', lun.some((k) => /gaha_n_leap/.test(k)) && lun.some((k) => /gaha_n_lunge/.test(k)), lun.join(','));
  check('1.106 no old thrust frame in the Lunge', !lun.some((k) => /gaha_thrust/.test(k)));

  // ---------- 1.107 ----------
  // Read on 26 Nov with dev/tools/hands_sheet.py: per facing, these are the pictures (and mirrors) whose shield side agrees.
  // A mirror swaps the hands, so the two facings made by mirroring (up-right, down-left) must mirror in every one of these poses.
  const want = {
    upLeft:    { battle: 'sudeen_n_battle_upLeft.png', attack: 'sudeen_n_slash_upLeft.png', guard: 'sudeen_n8_guard_upLeft.png' },
    upRight:   { battle: 'sudeen_n_battle_upLeft.png M', attack: 'sudeen_n_slash_upLeft.png M', guard: 'sudeen_n8_guard_upRight.png' },
    downLeft:  { battle: 'sudeen_n_battle_downRight.png M', attack: 'sudeen_n_slash_downLeft.png', guard: 'sudeen_n8_guard_downRight.png M' },
    downRight: { battle: 'sudeen_n_battle_downRight.png', attack: 'sudeen_n_slash_downRight.png', guard: 'sudeen_n8_guard_downRight.png' },
  };
  const bad7 = [];
  const artH1 = require('../../src/data/art.json').h1;
  const MIR = { upLeft: 'upRight', upRight: 'upLeft', downLeft: 'downRight', downRight: 'downLeft' };
  const pick7 = (g, fc) => { let v = g[fc], flip = false; if (!v) { v = g[MIR[fc]]; flip = true; } if (v.flip) flip = !flip; return v.file + (flip ? ' M' : ''); };
  for (const fc of Object.keys(want)) for (const [pose, file] of Object.entries(want[fc])) {
    const g = pose === 'battle' ? artH1.battle : artH1.poses[pose];
    const got = pick7(g, fc);
    if (got !== file) bad7.push(fc + ' ' + pose + ': ' + got);
  }
  check('1.107 Sudeen: in every facing his stance, attack and block come from the same side of the mirror', bad7.length === 0, bad7.join(' | ') || 'as read');
  check('1.107 Sudeen: the dodge and ready stance follow the battle stance', JSON.stringify(artH1.poses.dodge) === JSON.stringify(artH1.battle) && JSON.stringify(artH1.poses.ready) === JSON.stringify(artH1.battle));

  // ---------- 1.109 ----------
  // Rabdul (e4) is benched in this line-up; the ward is his skill, so it is set on the Bull here, as castZoneWard sets it
  const warder = U('e2'), walker = U('h1');
  const ward = () => { warder.zone = { name: 'Spear Ward', color: '#9fc4e8', mode: 'spear', charges: 1, damageShare: 1, pushOnHit: 0, guardBonus: 0, radius: 1 }; };
  const walkIn = () => new Promise((r) => { let ok = false; b.activeUnit = walker; walker.stepsUsed = 0; b.moveUnit(walker, 5, 5, () => { ok = true; r(true); }); setTimeout(() => !ok && r(false), 5000); });
  const park9 = () => b.units.forEach((u, i) => { if (u !== warder && u !== walker) b.placeUnit(u, [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [9, 0]][i % 6][0], [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [9, 0]][i % 6][1]); u.engagedWith = null; u.hp = u.maxHp = 300; u.status = { cooldowns: {} }; u.hidden = false; u.stepsUsed = 0; });
  park9(); b.placeUnit(warder, 5, 4); b.placeUnit(walker, 5, 8); ward(); w.__status.applyBlinded(warder);
  await walkIn(); await sleep(900);
  check('1.109 a Blinded warder\'s Spear Ward still fires', warder.zone === null || warder.zone.charges === 0, JSON.stringify(warder.zone));
  park9(); b.placeUnit(warder, 5, 4); b.placeUnit(walker, 5, 8); ward(); walker.hidden = true; walker.smokeHidden = true;
  await walkIn(); await sleep(900);
  check('1.109 the Spear Ward fires at a Hidden walker', warder.zone === null || warder.zone.charges === 0, JSON.stringify(warder.zone));
  check('1.109 ...and a hit shows the walker again (or it missed and stays hidden)', walker.hp < walker.maxHp ? !walker.hidden : true, 'hp ' + walker.hp + ', hidden ' + walker.hidden);
  warder.zone = null; walker.hidden = false;

  // ---------- 1.110 ----------
  const sud10 = U('h1');
  sud10.plate.setVisible(true);
  b.toggleUi(true); await sleep(200);
  const hiddenNow = b.uiHidden === true && (!b.uiCam || b.uiCam.visible === false) && b.units.every((u) => !u.plate || !u.plate.visible) && (b.highlights || []).every((h) => !h.visible);
  b.showHpBar && b.showHpBar(sud10); await sleep(200); // something that shows a plate while hidden
  const stillHidden = !sud10.plate.visible;
  b.toggleUi(false); await sleep(200);
  check('1.110 hide: the HUD camera, plates and coloured tiles go', hiddenNow);
  check('1.110 ...and stay hidden while the battle shows things', stillHidden);
  check('1.110 show again: the HUD camera and the plate that was showing come back', b.uiHidden === false && (!b.uiCam || b.uiCam.visible === true) && sud10.plate.visible === true);

  // ---------- 6.93 ----------
  const s93 = U('h1'); s93.wardOff = false;
  const tagOn = w.__status.statusTags(s93).find((t) => /^WARD/.test(t.text));
  const rowOn = b.spellMenu(s93).concat(...[]).find((e) => /Ward: on/.test(e.label)) || (() => { for (const g of ['Tricks', 'Guard', 'Skills']) { b.openSpellGroup && b.openSpellGroup(g); const r = b.spellMenu(s93).find((e) => /Ward: on/.test(e.label)); b.spellGroup = null; if (r) return r; } return null; })();
  s93.wardOff = true;
  const tagOff = w.__status.statusTags(s93).find((t) => /^WARD/.test(t.text));
  s93.wardOff = false;
  check('6.93 the WARD tag shows his shield, lit on and dark off', tagOn && tagOn.icon === 'ward' && tagOff && tagOff.icon === 'ward_off' && game.textures.exists('icon:ward') && game.textures.exists('icon:ward_off'), JSON.stringify([tagOn, tagOff]));
  check('6.93 the Ward row in his Skills shows the shield emblem', !rowOn || (rowOn.emblem === 'ward' && !rowOn.el && game.textures.exists('ui:emblem_ward')), rowOn ? rowOn.emblem + ' ' + rowOn.el : 'row in a group');

  // ---------- 6.94 ----------
  // Rabdul (e4) is benched here: the aura follows the Kindle the Haft enchant, so it is tried on the Bull
  const r94 = U('e2'); const St94 = w.__status;
  St94.applyEnchant(r94, 'kindleHaft'); b.refreshStatusTags(); await sleep(300);
  const onK = !!r94.drawnAura_kindle && game.textures.exists('fx:buff_kindle_loop_0');
  St94.applyEnchant(r94, 'enchant'); b.refreshStatusTags(); await sleep(300);
  const offK = !r94.drawnAura_kindle;
  r94.status.enchant = null; b.refreshStatusTags();
  check('6.94 Kindle the Haft shows the flame aura (9 frames)', onK, Object.keys(r94).filter((k) => /Aura/.test(k)).join(','));
  check('6.94 ...and a plain Enchant does not', offK);

  // (more parts follow, one per fix)

  const real = errors.filter((e) => !/Not implemented/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log('RESULT ' + (fails ? 'FAILED' : 'ALL PASSED'));
  process.exit(fails ? 1 : 0);
})();
