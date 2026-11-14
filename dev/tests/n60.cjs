// 14 Nov: three archer bugs (roadmap 1.45, 1.46, 1.47).
//  1.45 she aims and shoots toward her target from every side (the front-view pictures were wired pointing right)
//  1.46 she uses her dagger when a foe is next to her, and the bow at range
//  1.47 a hidden unit (Smoke Bomb, Husk) cannot be picked as a target by the other side; area attacks still hit it
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, G = w.__grid, E = w.__engagement, combat = w.__combat;
  const U = (l) => b.units.find((u) => u.label === l);
  const [sudeen, gaha, layra, tayo, bull, archer] = ['H1', 'H2', 'H3', 'E1', 'E2', 'E3'].map(U);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  b.endTurn = () => {};
  const park = () => {
    for (const u of b.units) { if (u.hidden) b.revealHidden(u); u.engagedWith = null; u.hp = u.maxHp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hidden = false; u.smokeHidden = false; u.aiming = null; u.markedBy = null; u.weaponSwitched = false; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.view.setAlpha(1); }
    archer.weapon = 'bow';
    b.refreshEngagementMarks();
    put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 7, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };

  // ---------- 1.45: which way the bow points ----------
  // Measured on the picture itself: the bow is the tall thin thing, so the half of the
  // picture (left or right of the feet) whose paint reaches highest above the head line... is
  // not steady across poses. Simpler and sure: the arrow leaves from the bow hand, so the
  // drawn picture's widest reach from the foot point is on the side she aims at.
  const reachSide = (unit) => {
    const sp = unit.sprite, img = sp.texture.getSourceImage();
    const c = w.document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    // only the band from the shoulders to the head (the top 45 percent): the arms and the bow, not the feet or a floor shadow
    let minX = img.width, maxX = 0;
    for (let y = 0; y < img.height * 0.45; y++) for (let x = 0; x < img.width; x++) if (d[(y * img.width + x) * 4 + 3] > 80) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    const foot = sp.originX * img.width; // (as drawn: a flipped picture has its origin mirrored already)
    let left = foot - minX, right = maxX - foot;
    if (sp.flipX) { const fl = img.width - maxX, fr = img.width - minX; left = foot - fl; right = fr - foot; }
    return right > left ? 'right' : 'left';
  };
  const sides = { 'down-right': [3, 0, 'downRight'], 'up-left': [-3, 0, 'upLeft'], 'down-left': [0, 3, 'downLeft'], 'up-right': [0, -3, 'upRight'] };
  const shown = b.showFrame.bind(b);
  for (const [name, [dc, dr, facing]] of Object.entries(sides)) {
    park(); put(archer, 3, 3); put(gaha, 3 + dc, 3 + dr); archer.facing = name === 'down-left' ? 'upRight' : 'downLeft'; b.showStanding(archer);
    const want = facing.endsWith('Right') ? 'right' : 'left';
    const seen = [];
    b.showFrame = (u, f) => { const ok = shown(u, f); if (u === archer && ok && /primed|fire/.test(f.key)) seen.push({ key: f.key.replace('e3:archer_hq_', '').replace('.png', ''), side: reachSide(archer), up: /_f[12]\./.test(f.key) }); return ok; };
    b.activeUnit = archer; b.busy = true;
    await new Promise((res) => { b.performAttack(archer, gaha, res); setTimeout(res, 4000); });
    await sleep(500);
    b.showFrame = shown;
    const aim = seen.find((s) => /primed/.test(s.key)), shot = seen.find((s) => /fire/.test(s.key));
    check('shot ' + name + ': she turns to face ' + facing, archer.facing === facing, archer.facing);
    check('shot ' + name + ': she aims first, then lets fly (both pictures shown)', !!aim && !!shot && seen.indexOf(aim) < seen.indexOf(shot), seen.map((s) => s.key).join(' '));
    check('shot ' + name + ': the aim picture points ' + want + ' and is the ' + (facing.startsWith('up') ? 'back' : 'front') + ' view', !!aim && aim.side === want && aim.up === facing.startsWith('up'), aim && aim.key + ' ' + aim.side);
    check('shot ' + name + ': the shot picture points ' + want + ' and is the ' + (facing.startsWith('up') ? 'back' : 'front') + ' view', !!shot && shot.side === want && shot.up === facing.startsWith('up'), shot && shot.key + ' ' + shot.side);
    // her battle stance, bow in hand, looks the same way
    b.showStanding(archer);
    // (her low-held bow cannot be measured this way; seen on the contact sheet: figures 2, 3 and 4 hold it to the right, figure 1 to the left)
    const stance = { downRight: ['f4', false], downLeft: ['f3', true], upLeft: ['f1', false], upRight: ['f2', false] }[facing];
    check('shot ' + name + ': afterwards her battle stance points ' + want, archer.sprite.texture.key.includes('hq_battle_' + stance[0]) && archer.sprite.flipX === stance[1], archer.sprite.texture.key + ' flip ' + archer.sprite.flipX);
  }
  // straight below her on the screen: the pose keeps the side she already faces (no front and side mismatch)
  park(); put(archer, 3, 3); put(gaha, 5, 5); archer.facing = 'downLeft'; b.showStanding(archer);
  b.showPose(archer, 'attack', gaha.view.x - archer.view.x);
  check('a target straight below: the shot keeps the side she faces (left)', Math.abs(gaha.view.x - archer.view.x) < 2 && archer.sprite.flipX === true && /fire_f3/.test(archer.sprite.texture.key), archer.sprite.texture.key + ' flip ' + archer.sprite.flipX);
  // the Poison Arrow shot from behind uses her back view
  archer.facing = 'upLeft'; b.showPose(archer, 'poisonShot', -10);
  const pk1 = archer.sprite.texture.key; archer.facing = 'downRight'; b.showPose(archer, 'poisonShot', 10);
  check('Poison Arrow shot: back view when shooting away from us, the crouched shot when shooting toward us', /hq_fire_f1/.test(pk1) && /poisonShot/.test(archer.sprite.texture.key), pk1 + ' / ' + archer.sprite.texture.key);

  // ---------- 1.46: dagger up close, bow at range ----------
  park(); put(archer, 3, 3); put(gaha, 3, 6); b.activeUnit = gaha;
  b.readyCloseWeapons();
  check('nobody next to her: she holds the bow', archer.weapon === 'bow' && !/dagger/.test(archer.sprite.texture.key));
  await new Promise((res) => { b.moveUnit(gaha, 3, 4, res); setTimeout(res, 4000); }); await sleep(100);
  check('a hero walks up to her: she draws the dagger at once, without using her switch', archer.weapon === 'dagger' && !archer.weaponSwitched && /dagger/.test(archer.sprite.texture.key), archer.weapon + ' ' + archer.sprite.texture.key);
  b.undoMove(); await sleep(250);
  check('the hero takes the move back: she has the bow again', archer.weapon === 'bow' && !/dagger/.test(archer.sprite.texture.key), archer.weapon);
  // her AI: a foe next to her, she stabs it with the dagger, then steps back
  const watch = async (setup) => {
    park(); setup();
    const calls = [];
    const pa = b.performAttack.bind(b);
    b.performAttack = (a, t, d) => { calls.push({ who: t.label, weapon: a.weapon, dist: combat.distance(a, t), close: combat.usesCloseWeapon(a, t) }); return pa(a, t, d); };
    b.activeUnit = archer; archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0; archer.status.cooldowns = { smokeBomb: 3, poisonArrow: 3 };
    b.runEnemyTurn(); await sleep(800); await idle(); await sleep(1600); await idle();
    b.performAttack = pa;
    return calls;
  };
  let calls = await watch(() => { put(archer, 3, 3); put(gaha, 3, 4); });
  check('AI, a foe next to her: she attacks it with the dagger from where she stands (no point-blank bow shot)', calls.length === 1 && calls[0].who === 'H2' && calls[0].weapon === 'dagger' && calls[0].dist === 1 && calls[0].close, JSON.stringify(calls));
  check('AI: then she steps back out of its reach with the steps she has left', combat.distance(archer, gaha) >= 2, archer.col + ',' + archer.row);
  b.activeUnit = gaha; b.readyCloseWeapons();
  check('and once nobody is next to her she has the bow in hand again', archer.weapon === 'bow');
  calls = await watch(() => { put(archer, 3, 3); put(gaha, 3, 6); });
  check('AI, a foe at range: she shoots it with the bow', calls.length === 1 && calls[0].weapon === 'bow' && calls[0].dist >= 2 && !calls[0].close, JSON.stringify(calls));
  // Poison Arrow never flies at a foe that has come next to her
  park(); put(archer, 3, 3); put(gaha, 3, 6); archer.aiming = { target: gaha, spellId: 'poisonArrow' }; gaha.markedBy = archer; b.showStanding(archer);
  put(gaha, 3, 4);
  let released = false; const ra = b.releaseAim.bind(b); b.releaseAim = (...a) => { released = true; return ra(...a); };
  // the turn start is where the aim is let go: her turn comes up through the game's own turn start
  const runEnemy = b.runEnemyTurn.bind(b); b.runEnemyTurn = () => {};
  for (const u of b.units) u.ct = 0; archer.ct = 1000;
  b.startTurn(); await sleep(600);
  check('aiming at a foe that came next to her: the aim is dropped (Too close), no Poison Arrow at point-blank', b.activeUnit === archer && !released && !archer.aiming && !gaha.markedBy && !St.isPoisoned(gaha) && !archer.hasActed, 'released ' + released + ' active ' + (b.activeUnit && b.activeUnit.label));
  b.runEnemyTurn = runEnemy; b.busy = false;
  b.releaseAim = ra;

  // ---------- 1.47: hidden means hidden ----------
  park(); put(archer, 3, 3); put(gaha, 3, 4); put(layra, 3, 6); put(sudeen, 5, 1);
  archer.hasActed = false; b.activeUnit = archer;
  await new Promise((res) => { b.busy = true; b.castSpell(archer, { col: 3, row: 1 }, 'smokeBomb', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  await sleep(400);
  check('Smoke Bomb: she is hidden', archer.hidden && archer.smokeHidden && archer.col === 3 && archer.row === 1);
  check('she is drawn as a faint shape (30 percent), not the bright gold glow', Math.abs(archer.view.alpha - 0.3) < 0.02 && archer.sprite.blendMode === 0, archer.view.alpha + ' blend ' + archer.sprite.blendMode);
  St.clearBlinded ? St.clearBlinded(gaha) : (gaha.status.blinded = null);
  for (const h of [gaha, layra, sudeen]) { h.hasActed = false; h.hasMoved = false; h.stepsUsed = 0; h.status.blinded = null; }
  b.activeUnit = gaha; put(gaha, 3, 2); b.cancelMode();
  b.startAttack();
  check('a hero next to her: Attack does not list her', !b.targetsInRange.includes(archer)); b.cancelMode();
  check('tapping her does not start a walk-up attack (this was the bug)', b.approachTiles(gaha, archer).length === 0 && b.startApproach(archer) === false && b.mode !== 'approach', b.mode);
  b.cancelMode(); b.handleTap(3, 1);
  check('a tap on her tile leaves no target chosen', b.pendingTarget !== archer && !b.targetsInRange.includes(archer), b.mode);
  b.cancelMode(); if (b.viewing) b.viewing = null;
  check('no clash can be started with her', !E.canEngage(gaha, archer) && !E.engageTargets(gaha, b.units).includes(archer));
  b.activeUnit = gaha; b.cancelMode(); b.chooseSpell('spearThrow');
  check('a skill (Spear Throw) does not list her', b.mode !== 'spellTarget' || !b.targetsInRange.includes(archer), b.mode); b.cancelMode();
  b.activeUnit = layra; put(layra, 3, 4); b.cancelMode(); b.startAttack();
  check('Lightning cannot be aimed at her', !b.targetsInRange.includes(archer)); b.cancelMode();
  b.faceNearestOpponent(gaha);
  // the exception: an area effect catches her. Lightning's jump is one.
  put(bull, 3, 0); put(layra, 3, 4); // the bull stands next to the hidden archer; Layra strikes the bull
  const jump = combat.chainTarget(layra, bull, b.units);
  check('area exception: Lightning that strikes the bull may jump to her (she is the unit next to it)', jump === archer, jump && jump.label);
  const landed = b.landHit(archer, 3); await sleep(350);
  check('an area hit hurts her and shows her again (Revealed), full to see', landed.damage > 0 && !archer.hidden && !archer.smokeHidden && archer.view.alpha > 0.95, JSON.stringify(landed) + ' hidden ' + archer.hidden + ' alpha ' + archer.view.alpha);
  b.activeUnit = gaha; put(gaha, 3, 2); b.cancelMode(); b.startAttack();
  check('once shown she can be attacked again', b.targetsInRange.includes(archer)); b.cancelMode();
  b.wakeSmoke(archer); await sleep(200);

  // the same for the enemy AI: a hidden hero (Layra behind her Husk) cannot be targeted
  park(); put(layra, 3, 4); put(archer, 3, 2); put(tayo, 6, 4); put(bull, 0, 0); put(gaha, 0, 7); put(sudeen, 1, 7);
  b.activeUnit = layra; layra.hasActed = false; layra.mp = layra.maxMp;
  await new Promise((res) => { b.busy = true; b.castSpell(layra, { col: 3, row: 6 }, 'husk', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  await sleep(500);
  check('Husk: Layra is hidden and still glows gold for her own side (60 percent)', layra.hidden && Math.abs(layra.view.alpha - 0.6) < 0.02 && layra.sprite.blendMode !== 0, layra.view.alpha + ' ' + layra.sprite.blendMode);
  const eyes = b.enemyEyes();
  check('the enemies do not see her: only her decoy stands in their list', !eyes.includes(layra) && eyes.some((u) => u.isDecoy), eyes.map((u) => u.label + (u.isDecoy ? '*' : '')).join(','));
  check('the archer, in bow reach of her real tile, has no shot at her', combat.distance(archer, layra) <= archer.range && !combat.getTargetsInRange(archer, eyes).some((t) => t.label === 'H3' && !t.isDecoy));
  check('nor a Poison Arrow, a clash or Tayo\'s spike', !E.engageTargets(tayo, eyes).some((t) => !t.isDecoy && t.label === 'H3') && b.blastTarget(tayo) === null);
  // an aim taken before she hid finds nothing to fly at
  archer.aiming = { target: layra, spellId: 'poisonArrow' }; layra.markedBy = archer; const hpL = layra.hp;
  await new Promise((res) => { b.releaseAim(archer, res); setTimeout(res, 3000); }); await sleep(200);
  check('an arrow aimed at her before she hid does not fly (Lost sight)', layra.hp === hpL && !St.isPoisoned(layra));
  // a whole enemy turn next to her real tile: nobody strikes her
  put(tayo, 4, 6); tayo.status.cooldowns = { clap: 9, earthDrive: 9, elementBlast: 9 }; b.enemySecondWalk = false;
  const hits = []; const pa2 = b.performAttack.bind(b); b.performAttack = (a, t, d) => { hits.push(t.label + (t.isDecoy ? '*' : '')); return pa2(a, t, d); };
  b.activeUnit = tayo; tayo.hasActed = false; tayo.hasMoved = false; tayo.stepsUsed = 0;
  b.runEnemyTurn(); await sleep(800); await idle(); await sleep(1500); await idle();
  b.performAttack = pa2;
  check('Tayo\'s turn, standing right next to the hidden Layra: he does not attack her', !hits.includes('H3') && layra.hp === hpL, hits.join(',') + ' hp ' + layra.hp);

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(fails ? 1 : 0);
})();
