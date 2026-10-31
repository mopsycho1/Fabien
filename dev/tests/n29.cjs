// Phase 1 of the Fabien Roadmap (29 Oct): Gaha's facing, Sudeen's battle stance,
// Rabdul's size, archer range 5 and keeping distance, line of sight, wall slams.
const { start, battle } = require('./boot.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('h1:sudeen_battle_upLeft.png')) await sleep(50);
  const b = await battle(game);
  const E = w.__engagement, St = w.__status, G = w.__grid;
  const combat = require('./combat-bundle.cjs');
  const MAPH = require('/home/claude/fabien/src/data/map.json').heights; // the Node copy of the rules needs the map's heights too
  combat.setHeightLookup((c, r) => (MAPH[r] && MAPH[r][c]) || 0);
  const U = (l) => b.units.find((u) => u.label === l);
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.stanceMenu = 'main'; b.empower = false; b.cancelMode(); };
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const key = (u) => u.sprite.texture.key;
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const park = () => { for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.status.cooldowns = {}; u.status.hex = null; u.status.stunned = false; u.status.disoriented = null; u.status.offBalance = false; u.status.poison = null; u.aiming = null; u.markedBy = null; } b.refreshEngagementMarks(); put(sudeen, 0, 7); put(gaha, 1, 7); put(layra, 2, 7); put(rabdul, 7, 0); put(bull, 6, 0); put(archer, 5, 0); for (const u of b.units) b.faceNearestOpponent(u); b.refreshStatusTags(); };
  const real = w.Math.random;
  const md5 = (f) => execSync('md5sum ' + f).toString().slice(0, 32);

  // 1.1 Gaha's up-right standing picture is now the one with his face turned right
  const A = '/home/claude/fabien/public/art/';
  const was = (f) => execSync('cd /home/claude/fabien && git show 69d9a91:public/art/' + f + ' | md5sum').toString().slice(0, 32); // the pictures before the Phase 1 fix
  check('1.1 Gaha up-right and up-left were swapped (standing, weak, stone)', ['stand', 'weak', 'stone'].every((s) => md5(A + 'gaha_' + s + '_upRight.png') === was('gaha_' + s + '_upLeft.png') && md5(A + 'gaha_' + s + '_upLeft.png') === was('gaha_' + s + '_upRight.png')));
  check('1.1 at the start Gaha faces up-right, toward the enemy, with the up-right picture', gaha.facing === 'upRight' && key(gaha) === 'h2:gaha_stand_upRight.png' && !gaha.sprite.flipX, gaha.facing + ' ' + key(gaha));

  // 1.2 Sudeen's battle stance
  park(); put(sudeen, 3, 6); b.faceNearestOpponent(sudeen); b.showStanding(sudeen);
  check('1.2 far from enemies Sudeen stands relaxed', /sudeen_stand_/.test(key(sudeen)), key(sudeen));
  put(rabdul, 4, 4); b.faceNearestOpponent(sudeen);
  check('1.2 with an enemy 3 tiles away he takes his battle stance', /sudeen_battle_/.test(key(sudeen)), key(sudeen) + ' ' + sudeen.facing);
  put(rabdul, 3, 5); E.startDuel(sudeen, rabdul); b.refreshEngagementMarks(); b.showStanding(sudeen);
  check('1.2 locked in a clash he keeps the same battle stance', /sudeen_battle_/.test(key(sudeen)), key(sudeen));
  E.endDuel(sudeen); b.refreshEngagementMarks();
  const sudPics = ['downRight', 'upRight', 'upLeft'].every((d) => game.textures.exists('h1:sudeen_battle_' + d + '.png'));
  check('1.2 all three battle pictures loaded (down-left is down-right mirrored)', sudPics);

  // 1.3 Rabdul's size: in battle stance about as tall as the bull in his
  park(); put(rabdul, 3, 3); put(gaha, 3, 4); put(bull, 5, 3); put(sudeen, 5, 4); b.faceNearestOpponent(rabdul); b.faceNearestOpponent(bull);
  const rh = rabdul.sprite.displayHeight, bh = bull.sprite.displayHeight;
  check('1.3 Rabdul in battle stance is at least 90% of the bull\'s height', /rabdul_battle/.test(key(rabdul)) && rh >= 0.9 * bh, Math.round(rh) + ' vs ' + Math.round(bh));

  // 1.4 archer range 5
  check('1.4 the archer\'s bow and Poison Arrow reach 5 tiles', archer.range === 5 && require('/home/claude/fabien/src/data/spells.json').poisonArrow.range === 5);
  park(); put(archer, 2, 2); put(layra, 2, 7); // 5 tiles straight down the open column 2
  check('1.4 she can shoot a hero 5 tiles away in the open', combat.inReach(archer, layra));
  // 1.4 she keeps her distance: a hero next to her, her turn: she steps away and shoots
  park(); put(archer, 3, 2); put(gaha, 3, 3); put(sudeen, 0, 7); put(layra, 1, 7);
  w.Math.random = () => (/rollAttack/.test(new Error().stack) ? 0.01 : real());
  const ghp = gaha.hp;
  b.activeUnit = archer; archer.hasActed = false; archer.hasMoved = false; archer.stepsUsed = 0; archer.status.cooldowns = { poisonArrow: 3 };
  b.runEnemyTurn = Object.getPrototypeOf(b).runEnemyTurn.bind(b);
  b.runEnemyTurn(); await sleep(500); await idle(); await sleep(1500); await idle();
  b.runEnemyTurn = () => {}; w.Math.random = real;
  const near = Math.min(...[sudeen, gaha, layra].map((h) => combat.distance(archer, h)));
  check('1.4 with Gaha next to her, she backs off before shooting', near >= 3, 'archer at ' + archer.col + ',' + archer.row + ', nearest hero ' + near);
  check('1.4 ...and still shoots someone', [sudeen, gaha, layra].some((h) => h.hp < h.maxHp), 'gaha ' + ghp + '->' + gaha.hp);

  // 1.5 line of sight: tile (4,5) is a block 2 high with flat ground around it
  park(); put(archer, 4, 2); put(gaha, 4, 6);
  check('1.5 a hero right behind the high block can\'t be shot', !combat.hasClearShot(archer, gaha) && !combat.inReach(archer, gaha));
  put(gaha, 5, 6);
  check('1.5 one tile to the side, the shot is clear', combat.hasClearShot(archer, gaha) && combat.inReach(archer, gaha));
  check('1.5 magic is not blocked (Layra\'s lightning)', (() => { put(layra, 4, 6); const l = { ...layra, col: 4, row: 2 }; return combat.inReach(l, { col: 4, row: 6 }) || layra.range < 4; })());
  // the marked target ducks behind the block before the arrow flies
  park(); put(archer, 4, 2); put(gaha, 5, 6);
  b.activeUnit = archer; archer.hasActed = false; archer.status.cooldowns = {};
  b.castPoisonArrow(archer, gaha, require('/home/claude/fabien/src/data/spells.json').poisonArrow, () => {}); await idle(); await sleep(300);
  check('1.5 the archer takes aim at Gaha', archer.aiming && archer.aiming.target === gaha);
  put(gaha, 4, 6); const hp0 = gaha.hp;
  let done = false; b.releaseAim(archer, () => { done = true; }); await sleep(1200); await idle();
  check('1.5 he ducked behind the block: the arrow is Blocked, no damage, no poison', gaha.hp === hp0 && !St.isPoisoned(gaha) && done, gaha.hp + ' ' + St.isPoisoned(gaha));
  // Spear Throw needs a clear line too; Gaha has one to the archer from (4,3)
  park(); put(gaha, 3, 6); put(archer, 4, 3); put(rabdul, 3, 3); turnOf(gaha);
  b.onSpellButton(); b.chooseSpell('spearThrow');
  check('1.5 Spear Throw: a target behind the high block isn\'t offered', !b.targetsInRange.includes(archer) || combat.hasClearShot(gaha, archer), b.targetsInRange.map((u) => u.label).join());
  b.cancelMode();

  // 1.6 wall slam: Gaha throws at Rabdul with the high block right behind him
  park(); put(gaha, 4, 7); put(rabdul, 4, 6); turnOf(gaha);
  w.Math.random = () => (/rollAttack/.test(new Error().stack) ? 0.01 : real());
  const rhp = rabdul.hp;
  b.castThrow(gaha, rabdul, require('/home/claude/fabien/src/data/spells.json').spearThrow, () => {}); await sleep(1700); await idle();
  w.Math.random = real;
  const thrown = combat.getDamage(gaha, { ...rabdul, status: { cooldowns: {} } });
  check('1.6 pushed into the high block, Rabdul stays put (not knocked toward Gaha)', rabdul.col === 4 && rabdul.row === 6, rabdul.col + ',' + rabdul.row);
  check('1.6 he takes the hit plus 2 impact damage', rhp - rabdul.hp === thrown + 2, rhp + ' -> ' + rabdul.hp + ' (throw ' + thrown + ')');
  check('1.6 and is Disoriented, with the tag over him', St.isDisoriented(rabdul) && St.statusTags(rabdul).some((t) => t.text === 'DISORIENTED'));
  // the diagonal case Suleiman saw: thrown at from down-left, a wall up-right
  park(); put(gaha, 2, 7); put(bull, 3, 6); turnOf(gaha);
  const before = { col: bull.col, row: bull.row };
  const pushed = b.pushLoser(bull, gaha, 1);
  check('1.6 diagonal push into the block: no sliding back toward the attacker', bull.col === before.col && bull.row === before.row && pushed.fall && pushed.fall.slam === 2, bull.col + ',' + bull.row);
  // a free tile behind: a normal push, no slam
  park(); put(gaha, 2, 7); put(bull, 2, 6); turnOf(gaha);
  const p2 = b.pushLoser(bull, gaha, 1);
  check('1.6 with room behind, a push is a normal push', bull.row === 5 && !(p2.fall && p2.fall.slam) && !St.isDisoriented(bull), bull.col + ',' + bull.row);
  // what Disoriented does
  park(); St.applyDisoriented(rabdul);
  const plain = { ...rabdul, status: { cooldowns: {} } };
  check('1.6 Disoriented: attack and defense 2 lower, evade 10 lower', St.statMod(rabdul, 'attack') === -2 && St.statMod(rabdul, 'defense') === -2 && St.statMod(rabdul, 'evade') === -10);
  check('1.6 ...and magic hits it for 3 more', combat.getDamage(layra, rabdul) === combat.getDamage(layra, plain) + 3, combat.getDamage(layra, rabdul) + ' vs ' + combat.getDamage(layra, plain));
  St.tickBuff(rabdul);
  check('1.6 it wears off at the end of its next turn', !St.isDisoriented(rabdul));
  St.applyDisoriented(rabdul, true); St.tickBuff(rabdul);
  check('1.6 slammed during its own turn, it lasts through its next turn', St.isDisoriented(rabdul)); St.tickBuff(rabdul);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
