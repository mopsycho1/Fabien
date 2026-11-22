// 22 Nov, part 3: Alagara's new art (6.90, 1.96) and Radiant Rift (10.52). Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1.
//   1.96  his battle stance is the new sheathed-saber sheet (never the attack picture); his attack is the new saber sheet, four views
//   swing his slash arc shows on the frame his strike picture appears (photo 1768)
//   10.52 Radiant Rift: range 4 with a clear line; spends his Active Verse (the Echo takes over) for power attack + 4; with no
//         magic buff power 5; magic damage against magic defense; the AI uses it at a foe it cannot reach, with a Verse to spend
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const art = require('../../src/data/art.json');
(async () => {
  check('1.96 battle stance = the new sheet in four views', Object.keys(art.h5.battle).length === 4 && Object.values(art.h5.battle).every((v) => /alagara_battle_f/.test(v.file)));
  check('1.96 ready = battle stance, not the attack', art.h5.poses.ready.downLeft.file === art.h5.battle.downLeft.file && !/strike/.test(art.h5.poses.ready.downLeft.file));
  check('6.90 attack = the new saber sheet in four views', Object.keys(art.h5.poses.attack).length === 4 && Object.values(art.h5.poses.attack).every((v) => /alagara_strike_f/.test(v.file)));
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const S = w.__status;
  b.runEnemyTurn = () => {}; b.endTurn = () => {}; b.enemySecondWalk = false;
  const ala = b.units.find((u) => u.id === 'h5');
  const foes = b.units.filter((u) => u.side !== ala.side);
  const far = [[10, 10], [9, 10], [10, 9], [0, 10], [0, 9], [1, 10], [10, 0], [9, 0]];
  const park = () => b.units.forEach((u, i) => { if (u !== ala) b.placeUnit(u, ...far[i % far.length]); u.engagedWith = null; });
  const idle = async () => { const t = Date.now(); while (b.busy && Date.now() - t < 8000) await sleep(30); await sleep(100); };
  // swing arc
  park(); const foe = foes[0]; b.placeUnit(ala, 4, 9); b.placeUnit(foe, 5, 9); foe.hp = foe.maxHp = 300;
  let arcs = 0; const realArc = b.swingArc.bind(b); b.swingArc = (u, dx) => { if (u === ala) arcs++; realArc(u, dx); };
  let strikeKey = null; const realShow = b.showPose.bind(b);
  b.showPose = (u, pose, dx) => { realShow(u, pose, dx); if (u === ala && pose === 'attack' && arcs === 0) strikeKey = u.sprite.texture.key; };
  b.busy = true; b.performAttack(ala, foe, () => { b.busy = false; }); await idle();
  check('swing: his slash arc on his plain attack', arcs === 1, arcs);
  check('swing: the arc came with the new strike picture', /alagara_strike_f/.test(strikeKey || ''), strikeKey);
  b.swingArc = realArc; b.showPose = realShow;
  // Radiant Rift
  park(); b.placeUnit(ala, 3, 9); b.placeUnit(foe, 7, 9); // 4 tiles away, flat, nobody between
  ala.status = null; S.applyBuff(ala, 'fury'); S.applyBuff(ala, 'stone'); // Stone Active, Fury in the Echo
  check('10.52 a foe 4 tiles away is a target', b.kingTargets(ala, 'radiantRift').includes(foe));
  b.placeUnit(foe, 8, 9);
  check('10.52 5 tiles away is not', !b.kingTargets(ala, 'radiantRift').includes(foe));
  b.placeUnit(foe, 7, 9);
  const want = Math.max(1, ala.attack + 4 - foe.magicDefense);
  check('10.52 the AI damage guess with a Verse to spend: attack + 4 - magic defense', b.riftDamage(ala, foe) === want, b.riftDamage(ala, foe) + ' vs ' + want);
  const sure = (fn) => { const real = w.Math.random; let k = 0; w.Math.random = () => (k < 6 ? 0.02 + (k++ * 0.004) : real()); try { return fn(); } finally { w.Math.random = real; } }; // the first rolls hit, then real numbers (Phaser names its texts with them)
  const hp0 = foe.hp;
  b.busy = true; sure(() => b.castKingSkill(ala, foe, 'radiantRift', () => { b.busy = false; })); await idle();
  check('10.52 with Stone spent: ' + want + ' magic damage', hp0 - foe.hp === want, hp0 - foe.hp);
  check('10.52 Stone is spent and his Echo (Fury) takes over', ala.status.buff && ala.status.buff.id === 'fury' && !(ala.attune && ala.attune.echo), JSON.stringify(ala.status.buff && ala.status.buff.id));
  ala.status.buff = null; if (ala.attune) ala.attune.echo = null; ala.status.cooldowns = {};
  const weak = Math.max(1, 5 - foe.magicDefense);
  const hp1 = foe.hp;
  b.busy = true; sure(() => b.castKingSkill(ala, foe, 'radiantRift', () => { b.busy = false; })); await idle();
  check('10.52 with no magic buff: power 5, ' + weak + ' damage', hp1 - foe.hp === weak, hp1 - foe.hp);
  // the menu: under Spells
  b.activeUnit = ala; b.spellGroup = null; ala.status.cooldowns = {};
  b.openSpellGroup('Spells'); const inSpells = b.spellMenu(ala).map((r) => r.label); b.spellGroup = null;
  check('10.52 Radiant Rift is in his Spells', inSpells.some((l) => l.startsWith('Radiant Rift')), inSpells.join(' | '));
  // AI
  park(); b.placeUnit(ala, 3, 9); b.placeUnit(foe, 7, 9); ala.status.cooldowns = {}; S.applyBuff(ala, 'fury'); ala.hasActed = false;
  const casts = []; const realCast = b.castKingSkill.bind(b); b.castKingSkill = (u, t, id, d) => { casts.push(id); d(); };
  b.kingAiAct(ala, () => {}); await sleep(200);
  check('10.52 AI: Radiant Rift at a foe 4 tiles away while holding Fury', casts.includes('radiantRift'), casts.join(','));
  b.castKingSkill = realCast;
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' / '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
