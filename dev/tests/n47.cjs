// 8 Nov batch: the archer's Smoke Bomb (13.26), Switch weapon (13.29), her 4-view Poison Arrow crouch,
// the Blinded status, and the reworked deaths (one continuous fall, wall slam, gold dissolve).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('smoke:clear3')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const St = w.__status, G = w.__grid, E = w.__engagement;
  const combat = w.__combat; // (the game's own, bundled with it)
  const U = (l) => b.units.find((u) => u.label === l);
  const [sudeen, gaha, layra, tayo, bull, archer] = ['H1', 'H2', 'H3', 'E1', 'E2', 'E3'].map(U);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  b.endTurn = () => {};
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.hp = u.maxHp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hidden = false; u.smokeHidden = false; u.aiming = null; u.markedBy = null; u.weaponSwitched = false; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; }
    archer.weapon = 'bow';
    b.refreshEngagementMarks();
    put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 3, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const real = w.Math.random;

  // ---------- the pictures ----------
  const keys = game.textures.getTextureKeys();
  check('her new Poison Arrow crouch is in 4 views and the old single picture is gone', [1, 2, 3, 4].every((i) => keys.includes('e3:archer_poison_f' + i + '.png')) && !keys.includes('e3:archer_poison.png'));
  check('the 4-frame smoke throw is loaded', [1, 2, 3, 4].every((i) => keys.includes('e3:archer_smoke_throw_f' + i + '.png')));
  check('the 4 dissipating frames are loaded (1.34: the growing cloud is particles now)', [0, 1, 2, 3].every((i) => keys.includes('smoke:clear' + i)));
  check('the Blinded icon is loaded', keys.includes('icon:blinded'));
  park(); put(archer, 3, 3); put(gaha, 5, 3);
  archer.facing = 'upRight'; archer.aiming = { target: gaha, spellId: 'poisonArrow' }; b.showStanding(archer);
  const k1 = archer.sprite.texture.key;
  archer.facing = 'downLeft'; put(gaha, 1, 3); b.showStanding(archer);
  const k2 = archer.sprite.texture.key;
  check('aiming shows the crouch from the right view (up-right = 2, down-left = 3)', /archer_poison_f2/.test(k1) && /archer_poison_f3/.test(k2), k1 + ' / ' + k2);
  archer.aiming = null;

  // ---------- Switch weapon ----------
  park(); put(archer, 3, 3); put(gaha, 3, 4); put(layra, 3, 5);
  check('she starts with the bow', archer.weapon === 'bow');
  let tg = combat.getTargetsInRange(archer, b.units).map((u) => u.label);
  check('bow: reaches Layra 2 tiles off but not Gaha right next to her (no room to draw)', tg.includes('H3') && !tg.includes('H2'), tg.join(','));
  check('a foe next to her no longer makes her draw the dagger by herself', !combat.usesCloseWeapon(archer, gaha));
  b.showStanding(archer);
  check('and she stands in her bow stance', !/dagger/.test(archer.sprite.texture.key) && /(n6b|hq)_(stand|battle)/.test(archer.sprite.texture.key), archer.sprite.texture.key);
  check('Switch weapon works once, takes her to the dagger', b.switchWeapon(archer) === true && archer.weapon === 'dagger' && archer.weaponSwitched);
  tg = combat.getTargetsInRange(archer, b.units).map((u) => u.label);
  check('dagger: reaches only the tile next to her (Gaha), not Layra', tg.length === 1 && tg[0] === 'H2', tg.join(','));
  check('the dagger is 2 weaker than the bow, and she stands in her dagger stance', combat.getDamage(archer, gaha) === combat.getDamage({ ...archer, closeWeapon: null }, gaha) - 2 && /dagger/.test(archer.sprite.texture.key), archer.sprite.texture.key);
  check('a second switch the same turn is refused', b.switchWeapon(archer) === false && archer.weapon === 'dagger');
  archer.weaponSwitched = false; b.activeUnit = archer; archer.side = 'hero';
  b.refreshButtons();
  const lbl = b.halves[1].label.text, en = b.halves[1].enabled;
  archer.side = 'enemy'; b.refreshButtons();
  check('the menu has a Switch weapon button next to Skills (shows the weapon she would take)', b.halves[0].label.text === 'Skills' && lbl === 'To bow' && en, b.halves.map((h) => h.label.text).join('/') + ' ' + lbl);
  // a hero archer with the dagger out who taps Poison Arrow is given the bow for her one free switch
  archer.weapon = 'dagger'; archer.weaponSwitched = false; archer.side = 'hero'; b.activeUnit = archer; archer.hasActed = false; put(bull, 3, 6);
  b.cancelMode(); b.chooseSpell('poisonArrow');
  check('Poison Arrow with the dagger out takes the bow (the free switch)', archer.weapon === 'bow' && b.mode === 'spellTarget', archer.weapon + ' ' + b.mode);
  b.cancelMode(); archer.side = 'enemy';
  // the AI: bow when nobody is next to her, dagger when someone is
  park(); put(archer, 3, 3); put(gaha, 3, 4); archer.weapon = 'bow'; b.aiPickWeapon(archer);
  check('AI: a foe next to her, she takes the dagger', archer.weapon === 'dagger');
  park(); put(archer, 3, 3); put(gaha, 3, 6); archer.weapon = 'dagger'; b.aiPickWeapon(archer);
  check('AI: nobody next to her, she takes the bow back', archer.weapon === 'bow');

  // ---------- Blinded ----------
  park(); put(gaha, 3, 4); put(bull, 3, 5); put(layra, 3, 6);
  const base = combat.getHitChance(gaha, bull);
  St.applyBlinded(gaha);
  const dim = combat.getHitChance(gaha, bull);
  check('Blinded: the unit hits much less often (45 less, never below 5)', dim === Math.max(5, base - 45), base + ' -> ' + dim);
  check('Blinded shows the BLINDED tag with its icon', St.statusTags(gaha).some((t) => t.text === 'BLINDED' && t.icon === 'blinded'));
  check('Blinded: it cannot start a clash', !E.canEngage(gaha, bull));
  St.tickBuff(gaha);
  check('Blinded wears off after its next turn', !St.isBlinded(gaha) && E.canEngage(gaha, bull) && combat.getHitChance(gaha, bull) === base);
  St.applyBlinded(archer); b.activeUnit = archer; put(archer, 3, 2); put(gaha, 3, 3);
  b.cancelMode(); b.chooseSpell('poisonArrow');
  check('Blinded: a blinded archer cannot take aim', b.mode !== 'spellTarget' && /Blinded/.test(b.statusText.text), b.mode + ' ' + b.statusText.text);

  // ---------- Smoke Bomb, cast by hand ----------
  park(); put(archer, 3, 3); put(gaha, 3, 4); put(sudeen, 4, 3); put(layra, 3, 7);
  check('the archer has Smoke Bomb, cooldown 3', archer.spells.includes('smokeBomb') && w.__game && true);
  b.activeUnit = archer; b.cancelMode(); archer.side = 'hero'; b.chooseSpell('smokeBomb');
  check('picking Smoke Bomb offers her own tile and tiles up to 2 away', b.mode === 'huskTile' && b.reachableKeys.has('3,3') && b.reachableKeys.has('3,1') && !b.reachableKeys.has('3,4') && !b.reachableKeys.has('0,0'), [...b.reachableKeys].join(' '));
  b.cancelMode(); archer.side = 'enemy';
  archer.hasActed = false;
  await new Promise((res) => { b.busy = true; b.castSpell(archer, { col: 3, row: 1 }, 'smokeBomb', () => { b.busy = false; res(); }); setTimeout(res, 6000); });
  await sleep(300);
  check('the neighbours (Gaha, Sudeen) are Blinded; Layra, far away, is not', St.isBlinded(gaha) && St.isBlinded(sudeen) && !St.isBlinded(layra));
  check('she is Hidden, and enemies can no longer pick her as a target', archer.hidden && !b.canSee(gaha, archer) && b.canSee(archer, gaha));
  check('she slipped 2 tiles away for free (no steps used)', archer.col === 3 && archer.row === 1 && !archer.hasMoved && (archer.stepsUsed || 0) === 0, archer.col + ',' + archer.row);
  check('the cloud stands on the tile she threw it on', b.smokes.length === 1 && b.smokes[0].col === 3 && b.smokes[0].row === 3 && b.smokes[0].cloud && b.smokes[0].cloud.img.active);
  const at = G.tileToScreen(3, 3);
  check('and the cloud is a puff cloud on that tile (1.34: a container of particles; it drifts up to 3 px)', Math.abs(b.smokes[0].cloud.img.x - at.x) < 4 && b.smokes[0].cloud.img.list.length >= 1, b.smokes[0].cloud.img.list.length);
  check('Smoke Bomb waits 3 turns', St.cooldownOf(archer, 'smokeBomb') === 3);
  check('HIDDEN shows over her', St.statusTags(archer).some((t) => t.text === 'HIDDEN'));
  check('a hero cannot attack or engage her while hidden', (b.activeUnit = gaha, put(gaha, 3, 2), b.cancelMode(), b.startAttack(), !b.targetsInRange.includes(archer)) && !E.canEngage(sudeen, archer));
  b.cancelMode();
  // the grown cloud, then her next turn
  await sleep(500);
  check('the cloud is still there and rolling (its puffs keep going)', b.smokes[0].cloud.img.active && b.smokes[0].cloud.img.list[0].emitting !== undefined);
  const cloud = b.smokes[0].cloud.img;
  b.wakeSmoke(archer);
  await sleep(150);
  check('her next turn: she shows herself again', !archer.hidden && !archer.smokeHidden && b.smokes.length === 0);
  check('and the cloud plays the dissipating pictures', cloud.clearImg && /^smoke:clear/.test(cloud.clearImg.texture.key), cloud.clearImg && cloud.clearImg.texture.key);
  await sleep(1100);
  check('then the cloud is gone', !cloud.active);

  // ---------- Smoke Bomb in her AI ----------
  park(); put(archer, 3, 3); put(gaha, 3, 4); archer.hp = 10; // hurt (under 60%), a foe next to her
  b.activeUnit = archer; archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0;
  b.runEnemyTurn(); await sleep(800); await idle(); await sleep(900);
  check('AI: hurt with a foe next to her, she throws the Smoke Bomb and slips away hidden', archer.hidden && St.isBlinded(gaha) && St.cooldownOf(archer, 'smokeBomb') === 3 && Math.abs(archer.col - 3) + Math.abs(archer.row - 3) <= 2, archer.col + ',' + archer.row);
  b.wakeSmoke(archer); await sleep(300);
  park(); put(archer, 3, 3); put(gaha, 3, 4); // healthy and free to walk away
  b.activeUnit = archer; archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0;
  b.runEnemyTurn(); await sleep(800); await idle(); await sleep(900);
  check('AI: healthy and able to walk away, she throws no Smoke Bomb: she stabs with the dagger and steps back (1.46)', !archer.hidden && St.cooldownOf(archer, 'smokeBomb') === 0 && Math.abs(archer.col - gaha.col) + Math.abs(archer.row - gaha.row) >= 2);
  park(); put(archer, 0, 0); put(gaha, 0, 1); put(sudeen, 1, 0); // cornered
  b.activeUnit = archer; archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0;
  b.runEnemyTurn(); await sleep(800); await idle(); await sleep(900);
  check('AI: cornered by two foes, she throws it even at full health', archer.hidden && St.isBlinded(gaha) && St.isBlinded(sudeen));
  b.wakeSmoke(archer); await sleep(300);
  // blinded enemies cannot start a clash
  park(); put(bull, 3, 3); put(gaha, 3, 4); St.applyBlinded(bull);
  check('a blinded enemy cannot grab a hero (engage targets are empty)', E.engageTargets(bull, b.units).length === 0);

  // ---------- deaths: one continuous fall ----------
  park(); put(archer, 3, 3); put(gaha, 0, 7);
  const view = archer.view, sp = archer.sprite, art = archer.artScale;
  archer.hp = 0; b.defeat(archer);
  const baseLen = view.list.length;
  let lastKey = sp.texture.key, swaps = 0, hard = false, ghost = false, maxTilt = 0, squash = false, x0 = view.x, maxX = 0, goldSeen = false, faded = false, sigil = false, runes = false, parts = false;
  b.playDefeat(archer, 1);
  const tFall = Date.now();
  while (Date.now() - tFall < 4200 && view.active) {
    const key = sp.texture.key;
    const ghosts = view.list.filter((o) => o.type === 'Image' && o !== sp && o.texture && /e3:archer/.test(o.texture.key));
    if (ghosts.length) ghost = true;
    if (key !== lastKey) { swaps++; if (!view.list.some((o) => o !== sp && o.type === 'Image' && o.texture && o.texture.key === lastKey)) hard = true; lastKey = key; }
    maxTilt = Math.max(maxTilt, Math.abs(sp.angle));
    if (sp.scaleY < art * 0.9 && sp.scaleX > art * 1.05) squash = true;
    maxX = Math.max(maxX, view.x - x0);
    if (view.list.some((o) => o.tintFill && o.blendMode === 1)) goldSeen = true;
    if (view.alpha < 0.95 || (sp.isCropped)) faded = true;
    if (b.children.list.some((o) => o.type === 'Image' && o.texture && o.texture.key === 'fx:death_sigil')) sigil = true;
    if (b.children.list.some((o) => o.type === 'Image' && o.texture && /^fx:death_[0-7]$/.test(o.texture.key))) runes = true;
    if (b.children.list.some((o) => o.type === 'ParticleEmitter' && o.depth === 91)) parts = true;
    await sleep(16);
  }
  check('the fall is knocked back and slides on (it moved 40 px or more away from the blow)', maxX >= 40, maxX.toFixed(1));
  check('it tilts as it flies', maxTilt >= 20, maxTilt.toFixed(1));
  check('it lands with a squash', squash);
  check('the pictures cross-fade: old one stays as a ghost while it fades, never a hard swap', swaps >= 2 && ghost && !hard, 'swaps ' + swaps + ' ghost ' + ghost + ' hard ' + hard);
  check('the figure itself turns gold (an added gold copy), and wipes or fades away', goldSeen && faded);
  check('the sigil glows flat on the ground; no rune frames are pasted over the body', sigil && !runes);
  check('sparks and feathers rise from it', parts);
  check('then the figure is gone', !view.active);

  // ---------- deaths: a wall slam ----------
  park(); put(gaha, 3, 3); put(bull, 0, 0);
  const gv = gaha.view, gs = gaha.sprite, gart = gaha.artScale;
  gaha.hp = 0; b.defeat(gaha);
  const gx0 = gv.x, gy0 = gv.y; let toward = 0, slumped = 0, sq2 = false, bumped = false;
  b.playDefeat(gaha, -1, { levels: 0, damage: 0, slam: 2, toward: { x: 40, y: 0 } });
  const tS = Date.now();
  while (Date.now() - tS < 1500 && gv.active) {
    toward = Math.max(toward, gv.x - gx0); slumped = Math.max(slumped, gv.y - gy0);
    if (gs.scaleX < gart * 0.85) sq2 = true;
    await sleep(16);
  }
  check('wall slam: it flies into the wall (toward it), squashes against it and slumps down it', toward >= 10 && sq2 && slumped >= 8, 'toward ' + toward.toFixed(1) + ' squash ' + sq2 + ' slump ' + slumped.toFixed(1));
  await sleep(3000);
  check('wall slam: it dissolves like any other fall', !gv.active);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
