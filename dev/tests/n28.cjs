// Oct 27 evening: Layra's views and meditation, Herbs on yourself, Slow effect and icon, Rabdul and Double Hit, living clashes.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !(game.textures.exists('e4:rabdul_battle_upRight.png') && game.textures.exists('icon:slow'))) await sleep(50);
  const b = await battle(game);
  const E = w.__engagement, St = w.__status, G = w.__grid;
  const combat = require('./combat-bundle.cjs');
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.stanceMenu = 'main'; b.empower = false; b.cancelMode(); };
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const park = () => { for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.status.cooldowns = {}; u.status.hex = null; u.status.stunned = false; u.meditating = null; } b.refreshEngagementMarks(); put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 3, 7); put(rabdul, 7, 0); put(bull, 6, 0); put(archer, 5, 0); b.refreshStatusTags(); };
  const key = (u) => u.sprite.texture.key;
  const real = w.Math.random;

  // line-up
  check('Rabdul takes the E1 slot; Tayo sits on the bench', rabdul && rabdul.name === 'Rabdul' && !b.units.some((u) => u.name === 'Tayo'), b.units.map((u) => u.name).join());
  check('Rabdul\'s pictures loaded', game.textures.getTextureKeys().filter((k) => k.startsWith('e4:rabdul_')).length === 9);
  park(); rabdul.facing = 'upLeft'; b.showStanding(rabdul);
  check('Rabdul facing up-left shows his labeled north-west view', /rabdul_stand_upLeft/.test(key(rabdul)), key(rabdul));
  put(rabdul, 3, 5); put(gaha, 3, 6); rabdul.facing = 'downLeft'; b.faceNearestOpponent(rabdul);
  check('with Gaha close, Rabdul takes his battle stance facing him', /rabdul_battle_down/.test(key(rabdul)), key(rabdul) + ' ' + rabdul.facing);

  // Layra
  park(); layra.facing = 'downLeft'; b.showStanding(layra);
  check('Layra facing down-left: her level-gaze pose, mirrored', /layra_battle_downRight/.test(key(layra)) && layra.sprite.flipX, key(layra));
  turnOf(layra); b.onSpellButton(); b.chooseSpell('meditate'); b.chooseSpell('meditate'); await sleep(1200); await idle();
  check('Meditate shows her kneeling pose', /layra_meditate/.test(key(layra)), key(layra));
  layra.meditating = null;

  // Husk: hidden, she glows see-through gold (the look from his cave screenshot)
  park(); put(layra, 3, 6); turnOf(layra); layra.mp = 12;
  b.onSpellButton(); b.chooseSpell('husk'); b.handleTap(5, 6); b.handleTap(5, 6); await idle(); await sleep(500);
  const ADD = 1; // Phaser.BlendModes.ADD
  check('hidden by Husk: she is lit gold and see-through', layra.hidden && layra.sprite.blendMode === ADD && layra.sprite.tintTopLeft === 0xffc46a, layra.sprite.blendMode + ' ' + layra.sprite.tintTopLeft.toString(16));
  b.flashUnit(layra); await sleep(250);
  check('a hit flash does not wipe the glow while she stays hidden', layra.sprite.tintTopLeft === 0xffc46a, layra.sprite.tintTopLeft.toString(16));
  b.removeDecoys(layra); await sleep(100);
  check('when she shows herself she is back to normal', !layra.hidden && layra.sprite.blendMode !== ADD && layra.sprite.tintTopLeft === 0xffffff, layra.sprite.blendMode + ' ' + layra.sprite.tintTopLeft.toString(16));

  // Herbs on yourself
  park(); put(sudeen, 2, 6); sudeen.hp = 30; turnOf(sudeen);
  b.onSpellButton(); b.chooseSpell('herbs');
  check('first tap on Herbs: the hint says tap again for yourself', /Tap Herbs again to use them on yourself/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.chooseSpell('herbs'); await idle(); await sleep(300);
  check('second tap on Herbs heals Sudeen himself', sudeen.hp === 40, sudeen.hp);

  // Slow: effect, aura and icon
  park(); put(layra, 3, 6); put(bull, 3, 3); turnOf(layra); layra.mp = 12;
  b.onSpellButton(); b.openSpellGroup('Hexes'); b.chooseSpell('slow'); b.handleTap(3, 3); b.handleTap(3, 3);
  await sleep(500);
  const fx = b.children.list.filter((o) => o.texture && /fx:slow_/.test(o.texture.key));
  check('Slow plays the gravity effect from his sheet', fx.length >= 2, fx.map((o) => o.texture.key).join());
  await idle(); await sleep(800);
  const icons = bull.tagRow.list.filter((o) => o.texture && o.texture.key === 'icon:slow');
  const words = bull.tagRow.list.filter((o) => o.type === 'Text').map((t) => t.text);
  check('over the slowed unit: the Slow icon, not the word', icons.length === 1 && !words.includes('SLOW'), words.join());
  check('and a faint Slow aura stays on it', bull.slowAura && bull.slowAura.length === 2);
  St.tickBuff(bull); St.tickBuff(bull); b.refreshStatusTags();
  check('when Slow wears off the aura goes', !bull.slowAura);

  // Double Hit
  park(); put(rabdul, 3, 4); put(gaha, 3, 5);
  w.Math.random = () => (/castDoubleHit/.test(new Error().stack) ? 0.01 : real());
  const ghp = gaha.hp; b.activeUnit = rabdul; rabdul.hasActed = false; rabdul.hasMoved = false; rabdul.stepsUsed = 0;
  b.runEnemyTurn = Object.getPrototypeOf(b).runEnemyTurn.bind(b);
  const mv = rabdul.move; rabdul.move = 0; rabdul.status.cooldowns = {};
  b.runEnemyTurn(); await sleep(400); await idle(); await sleep(1600);
  b.runEnemyTurn = () => {}; rabdul.move = mv; w.Math.random = real;
  const each = Math.max(1, Math.round(combat.getDamage(rabdul, gaha) * 0.6));
  check('the enemy Rabdul uses Double Hit: two strikes', ghp - gaha.hp === each * 2, ghp + ' -> ' + gaha.hp + ' (each ' + each + ')');
  check('Double Hit then waits 2 turns', St.cooldownOf(rabdul, 'doubleHit') === 2);

  // living clashes
  park(); put(gaha, 3, 5); put(rabdul, 3, 4); E.startDuel(gaha, rabdul); b.refreshEngagementMarks();
  b.activeUnit = sudeen; b.clashLifeOn = true;
  const seen = new Set(); const t1 = Date.now();
  while (Date.now() - t1 < 6000) { seen.add(key(gaha).replace(/^h2:gaha_/, '')); seen.add(key(rabdul).replace(/^e4:rabdul_/, '')); await sleep(60); }
  b.clashLifeOn = false; await sleep(800);
  check('between turns the locked pair trades blows (attack, guard or dodge poses appear)', [...seen].some((k) => /attack|guard|dodge/.test(k)), [...seen].join(','));
  check('and they settle back into their stances', /gaha_battle_/.test(key(gaha)) && gaha.sprite.x === 0, key(gaha) + ' x ' + gaha.sprite.x);
  // faces at the screen edges during a beat
  turnOf(gaha); b.setStanceChoice('manual');
  w.Math.random = () => (/rollDice/.test(new Error().stack) ? 0.5 : real());
  b.onStance('guard'); await sleep(300);
  const faces = b.duelFaces || [];
  check('a clash beat: both faces slide in at the screen edges', faces.length === 2 && faces[0].unit === gaha && faces[1].unit === rabdul);
  await sleep(700);
  check('and change with the result', faces.every((f) => f.img && f.img.texture && f.img.texture.key.startsWith('round:')));
  await idle(); await sleep(400); w.Math.random = real;
  check('and are gone once the beat is over', (b.duelFaces || []).length === 0);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
