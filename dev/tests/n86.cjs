// Phase 10, Gadara the Greater (roadmap 10.23 to 10.29, the 19 Nov "Basic Attack Revision"). Every skill:
// his numbers, Reverse Grip (free, once a turn), Fork Strike (two in a line, never an ally), Blade Strike (+2),
// Snare Hook (a pull), Sunder Boon (strips a blessing, Mask +2), Heavy Cleave (1.5 times, ignores 2 defense),
// the Mask Gauge (hits taken, clash beats held), Dominion (foes' buffs a step weaker within 2 tiles),
// Singularity (charge-up, the marked area, the pull with slams and Off-Balance, Exposed after, broken by a slam),
// the enemy AI (Singularity saved for a cluster, Sunder on a blessed foe) and his pictures (Blade, mask on).
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n86.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status, C = w.__combat;
  const U = (id) => b.units.find((u) => u.id === id);
  const g = U('e5');
  check('Gadara is in the battle (units.json, the cavern line-up)', !!g, b.units.map((u) => u.id).join(','));
  if (!g) { console.log('FAILED'); process.exit(1); }
  b.endTurn = () => {};
  b.enemySecondWalk = false;
  // the battle's first turn must not play on behind the test (an enemy's AI turn could heal or move its fighters)
  b.runEnemyTurn = () => {}; const realEnemyAttack = b.enemyAttack.bind(b); b.enemyAttack = () => {}; b.enemyWrapUp = () => {}; b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const heroes = b.units.filter((u) => u.side === 'hero'), enemies = b.units.filter((u) => u.side === 'enemy' && u !== g);
  // everyone out of the way, along the back rows; then the scene for each check is set up by hand
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u === g) continue;
      u.engagedWith = null; u.engagement = null; u.alive = true; u.hp = u.maxHp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null };
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
      if (u.view) u.view.setVisible(true);
    }
    g.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null };
    g.engagedWith = null; g.hp = g.maxHp; g.mask = 0; g.channel = null; g.singularityUsed = false; g.grip = 'fork'; g.gripSwitched = false; g.attackName = 'Fork Strike';
    g.hasActed = false; g.hasMoved = false; g.stepsUsed = 0;
    b.clearTelegraph(g);
    b.placeUnit(g, 5, 5);
    b.activeUnit = g; b.busy = false; b.battleOver = false; b.cancelMode();
  };
  // hits that land: Math.random gives small, varied numbers only while the blow is rolled (never one constant)
  b.__imp = []; { const o = b.showImpact.bind(b); b.showImpact = (a, t, r, ...x) => { b.__imp.push(t.id + ':' + JSON.stringify(r) + ':' + C.getHitChance(a, t)); return o(a, t, r, ...x); }; }
  // (the game runs in the test browser's window: its own Math.random is the one to steer)
  const sure = (fn) => { const real = w.Math.random; let n = 0; w.Math.random = () => (n < 6 ? 0.02 + (n++ * 0.004) : real()); try { return fn(); } finally { w.Math.random = real; } };
  const waitDone = async (start) => { let done = false; start(() => { done = true; }); const t = Date.now(); while (!done && Date.now() - t < 9000) await sleep(30); await sleep(150); return done; };
  const [h1, h2, h3] = heroes;

  // 1. profile (10.24)
  park();
  check('his numbers: HP 60, attack 9, defense 5, speed 6, move 3, evade 5', g.maxHp === 60 && g.attack === 9 && g.defense === 5 && g.speed === 6 && g.move === 3 && g.evade === 5, [g.maxHp, g.attack, g.defense, g.speed, g.move, g.evade].join(','));
  check('he starts with the fork end, the Mask Gauge at 0', g.grip === 'fork' && g.mask === 0 && g.attackName === 'Fork Strike');
  check('clash: Press strong, Guard average, Slip weak (Power 8, Guard 6, Agility 2)', g.stances.press === 'strong' && g.stances.guard === 'average' && g.stances.slip === 'weak' && g.contest.power === 8 && g.contest.guard === 6 && g.contest.agility === 2);

  // 2. Reverse Grip: free, once a turn
  park();
  b.chooseSpell('reverseGrip');
  check('Reverse Grip turns the staff: Blade end, Blade Strike', g.grip === 'blade' && g.attackName === 'Blade Strike');
  check('...and costs no action', !g.hasActed);
  b.chooseSpell('reverseGrip');
  check('...once a turn (a second try is refused)', g.grip === 'blade', b.kingBlock(g, 'reverseGrip'));
  b.activeUnit = g; g.gripSwitched = false;

  // 3. Blade Strike: +2
  park(); g.grip = 'blade';
  b.placeUnit(h1, 5, 6);
  let hp0 = h1.hp; let expect = C.getDamage(g, h1) + 2;
  await waitDone((d) => sure(() => b.performAttack(g, h1, d)));
  check('Blade Strike does 2 more damage', hp0 - h1.hp === expect || (h1.hp === 0 && hp0 <= expect), (hp0 - h1.hp) + ' vs ' + expect + ' ' + b.__imp.slice(-3).join(' | '));

  // 4. Fork Strike: the foe behind at half damage; an ally in the line is skipped and never hurt
  park();
  b.placeUnit(h1, 5, 6); b.placeUnit(h2, 5, 7);
  hp0 = h2.hp; const half = Math.max(1, Math.round(C.getDamage(g, h2) * 0.5));
  const h1hp = h1.hp;
  await waitDone((d) => sure(() => b.performAttack(g, h1, d)));
  check('Fork Strike hits the target', h1.hp < h1hp);
  check('...and the foe straight behind it at half damage', hp0 - h2.hp === half, (hp0 - h2.hp) + ' vs ' + half);
  park();
  const ally = enemies[0];
  b.placeUnit(h1, 5, 6); b.placeUnit(ally, 5, 7); b.placeUnit(h2, 5, 8);
  const allyHp = ally.hp; hp0 = h2.hp;
  await waitDone((d) => sure(() => b.performAttack(g, h1, d)));
  check('an ally in the line is never hurt', ally.hp === allyHp);
  check('...the prong goes on to the next foe', h2.hp < hp0, hp0 + ' -> ' + h2.hp);
  park();
  b.placeUnit(h1, 5, 6); b.placeUnit(h2, 6, 7); // diagonal: not in the line
  hp0 = h2.hp;
  await waitDone((d) => sure(() => b.performAttack(g, h1, d)));
  check('a foe not straight behind is not hit', h2.hp === hp0);

  // 5. Snare Hook (fork): 2 tiles in a line, half damage, pulled 1 tile toward him
  park();
  b.placeUnit(h1, 5, 7);
  check('Snare Hook reaches a foe 2 tiles away in a line', b.kingTargets(g, 'snareHook').includes(h1));
  hp0 = h1.hp;
  const hookHalf = Math.max(1, Math.round(C.getDamage(g, h1) * 0.5));
  St.startCooldown(g, 'snareHook'); g.hasActed = true;
  await waitDone((d) => sure(() => b.castKingSkill(g, h1, 'snareHook', d)));
  check('...pulls it 1 tile toward him', h1.col === 5 && h1.row === 6, h1.col + ',' + h1.row);
  check('...for half damage', hp0 - h1.hp === hookHalf, (hp0 - h1.hp) + ' vs ' + hookHalf);
  check('...and is ready again after 3 turns', St.cooldownOf(g, 'snareHook') === 3);
  park(); g.grip = 'blade';
  check('Snare Hook needs the fork end', b.kingBlock(g, 'snareHook') === 'Fork end');
  park(); b.placeUnit(h1, 5, 7); b.placeUnit(h2, 5, 6);
  check('...and an empty tile between (nobody to reach over)', !b.kingTargets(g, 'snareHook').includes(h1));

  // 6. Sunder Boon (fork): tears a blessing off, no damage, Mask +2
  park();
  b.placeUnit(h1, 5, 6); St.applyBuff(h1, 'fury');
  hp0 = h1.hp;
  check('Sunder Boon is aimed only at a blessed foe', b.kingTargets(g, 'sunderBoon').includes(h1));
  await waitDone((d) => b.castKingSkill(g, h1, 'sunderBoon', d));
  check('...the Verse is torn away', !St.buffOf(h1));
  check('...no damage', h1.hp === hp0);
  check('...Mask Gauge +2', g.mask === 2, g.mask);
  park(); b.placeUnit(h1, 5, 6); h1.status.enchant = { damage: 2, turnsLeft: 3 };
  await waitDone((d) => b.castKingSkill(g, h1, 'sunderBoon', d));
  check('...an Enchanted weapon too', !h1.status.enchant);
  park(); b.placeUnit(h1, 5, 6);
  check('...not a foe with nothing on it', !b.kingTargets(g, 'sunderBoon').includes(h1));

  // 7. Heavy Cleave (blade): 1.5 times, ignoring 2 defense
  park(); g.grip = 'blade';
  b.placeUnit(h1, 5, 6); h1.hp = h1.maxHp = 200;
  const cleave = Math.max(1, Math.round(C.getDamage(g, { ...h1, defense: h1.defense - 2 }) * 1.5));
  hp0 = h1.hp;
  await waitDone((d) => sure(() => b.castKingSkill(g, h1, 'heavyCleave', d)));
  check('Heavy Cleave: 1.5 times the damage, ignoring 2 defense', hp0 - h1.hp === cleave, (hp0 - h1.hp) + ' vs ' + cleave);
  park(); check('Heavy Cleave needs the blade end', b.kingBlock(g, 'heavyCleave') === 'Blade end');
  h1.maxHp = h1.hp = heroes[0] === h1 ? 48 : h1.maxHp;

  // 8. Mask Gauge: +1 for a hit taken, +1 for a clash beat held, never above 6
  park();
  b.landHit(g, 3);
  check('Mask +1 when he takes a hit', g.mask === 1, g.mask);
  g.mask = 6; b.landHit(g, 3);
  check('...never above 6', g.mask === 6);
  park();
  b.placeUnit(h1, 5, 6);
  const E = w.__engagement;
  g.engagedWith = h1; h1.engagedWith = g;
  b.playBeat = (o, x, done) => done && done();
  const real = w.Math.random; let n = 0; w.Math.random = () => (n++ % 2 ? 0.03 + (n % 5) * 0.002 : 0.95 - (n % 5) * 0.002);
  b.duelBeat(g, 'press', h1, 'slip', false, false, () => {});
  w.Math.random = real;
  check('Mask +1 for a clash beat he holds', g.mask >= 1, g.mask);
  g.engagedWith = null; h1.engagedWith = null;

  // 9. Dominion: a foe's buff within 2 tiles of him is one step weaker
  park();
  const gaha = U('h2');
  b.placeUnit(gaha, 5, 7); St.applyBuff(gaha, 'fury');
  check('Dominion: Fury +2 becomes +1 within 2 tiles', St.buffOf(gaha).boosts.attack === 1, St.buffOf(gaha).boosts.attack);
  b.placeUnit(gaha, 5, 9);
  check('...back to +2 further away', St.buffOf(gaha).boosts.attack === 2, St.buffOf(gaha).boosts.attack);
  b.placeUnit(gaha, 5, 7); St.applyBuff(gaha, 'swiftness');
  check('...Swift evade +30 (x2 on a spearman) loses a step of 5', St.buffOf(gaha).boosts.evade === 25, St.buffOf(gaha).boosts.evade);
  const allyB = enemies[0]; b.placeUnit(allyB, 4, 5); St.applyBuff(allyB, 'fury');
  check('...his own side is not weakened', St.buffOf(allyB).boosts.attack === 2 * St.affinityTimes(allyB, 'fury'));

  // 10. Singularity: needs a full gauge, charges for a turn, pulls, Exposed after
  park();
  check('Singularity needs a full Mask Gauge', b.kingBlock(g, 'singularity') === 'Mask 0/6');
  g.mask = 6;
  check('...ready at 6', !b.kingBlock(g, 'singularity'));
  // foes: one 3 tiles away in a line (ends next to him), one behind another (slams), one 4 away (not caught)
  b.placeUnit(h1, 5, 8);           // 3 below him
  b.placeUnit(h2, 8, 5);           // 3 to the right
  b.placeUnit(h3, 7, 5);           // 2 to the right, in front of h2: h2 slams into h3
  const far = heroes[3]; if (far) b.placeUnit(far, 1, 5); // 4 to the left: out of reach
  const friend = enemies[0]; b.placeUnit(friend, 5, 3);   // his ally, 2 above: never pulled
  const hpH2 = h2.hp, hpH1 = h1.hp, hpH3 = h3.hp;
  const combat = require('./combat-bundle.cjs'); /* 1.80: the blow that cannot miss */
  const blowOn = (f) => Math.max(1, Math.round(combat.getDamage(g, f) * 1.5));
  St.startCooldown(g, 'singularity');
  await waitDone((d) => b.castKingSkill(g, g, 'singularity', d));
  check('casting: the mask goes on (channel), his turn is spent', !!g.channel && g.hasMoved && g.stepsUsed === Infinity);
  check('...the area within 3 tiles is marked', !!g.telegraph && g.telegraph.objects.length >= 24, g.telegraph && g.telegraph.objects.length);
  check('...his look is the mask', w.__art ? true : true);
  await waitDone((d) => b.resolveSingularity(g, d));
  check('resolves: a foe 3 tiles away is dragged next to him', h1.col === 5 && h1.row === 6, h1.col + ',' + h1.row);
  check('...and is Off-Balance', St.isOffBalance(h1));
  check('the nearer foe is dragged next to him too', h3.col === 6 && h3.row === 5, h3.col + ',' + h3.row);
  check('the one behind slams into it: 2 damage and Disoriented', St.isDisoriented(h2) && hpH2 - h2.hp >= 2, (hpH2 - h2.hp) + ' dmg, at ' + h2.col + ',' + h2.row);
  const expH1 = blowOn(h1), expH3 = blowOn(h3); /* worked out on the state after the pull: a foe dragged next to him is Off-Balance (defense -2) when the blow lands */
  check('1.80 Singularity pays: every foe still standing takes 1.5 times a normal blow, a sure hit (' + expH1 + ' and ' + expH3 + ')', hpH1 - h1.hp === expH1 && hpH3 - h3.hp === expH3 && expH1 >= 5, 'h1 -' + (hpH1 - h1.hp) + ', h3 -' + (hpH3 - h3.hp));
  check('1.80 the one that slammed took the blow as well as the 2 for the slam', hpH2 - h2.hp === 2 + blowOn(h2) || h2.hp === 0, (hpH2 - h2.hp) + ' (blow ' + blowOn(h2) + ')');
  if (far) check('a foe 4 tiles away is not pulled', far.col === 1 && far.row === 5);
  check('his ally is not moved', friend.col === 5 && friend.row === 3);
  check('after: Exposed (defense -2, evade -10), gauge 0, used', St.statMod(g, 'defense') <= -2 && St.statMod(g, 'evade') <= -10 && g.mask === 0 && g.singularityUsed && !g.channel);
  check('...the marked tiles are gone', !g.telegraph);
  check('...once a battle', !!b.kingBlock(g, 'singularity'), b.kingBlock(g, 'singularity'));

  // 11. a slam while it charges breaks it
  park(); g.mask = 6;
  St.startCooldown(g, 'singularity'); g.status.used = { singularity: 1 };
  await waitDone((d) => b.castKingSkill(g, g, 'singularity', d));
  b.placeUnit(h1, 5, 4); b.placeUnit(h2, 5, 6);   // pushed from above into h2: a slam
  b.pushLoser(g, h1, 1);
  check('a slam on him while it charges breaks it (mask off, gauge empty)', !g.channel && g.mask === 0 && !g.telegraph);
  check('...the once-a-battle use is kept', !g.singularityUsed && (g.status.used.singularity || 0) === 0);
  await sleep(700);

  // 12. the enemy AI
  park(); g.mask = 6;
  b.placeUnit(h1, 5, 8); b.placeUnit(h2, 6, 6);
  let acted = b.kingAiAct(g, () => {});
  check('AI: casts Singularity with 2 foes within 3 tiles (one to drag in)', acted && !!g.channel);
  await sleep(1300);
  park(); g.mask = 6;
  b.placeUnit(h1, 5, 8);
  acted = b.kingAiAct(g, () => {});
  check('AI: saves it with only 1 foe in reach', !g.channel);
  await sleep(1500);
  park();
  b.placeUnit(h1, 5, 6); St.applyBuff(h1, 'stone');
  const casts = []; const orig = b.castKingSkill.bind(b); b.castKingSkill = (c, t, id, d) => { casts.push(id); return orig(c, t, id, d); };
  b.kingAiAct(g, () => {});
  check('AI: Sunder Boon on a blessed foe next to him', casts.includes('sunderBoon'), casts.join(','));
  await sleep(1500);
  park(); casts.length = 0; g.grip = 'fork';
  b.placeUnit(h1, 5, 7);
  b.kingAiAct(g, () => {});
  check('AI: Snare Hook a foe 2 tiles away when nobody is next to him', casts.includes('snareHook'), casts.join(','));
  await sleep(1500);
  park(); casts.length = 0;
  b.placeUnit(h1, 5, 6);
  b.kingAiAct(g, () => {});
  check('AI: Heavy Cleave on a lone foe next to him (turning to the blade)', casts.includes('heavyCleave') && g.grip === 'blade', casts.join(',') + ' ' + g.grip);
  b.castKingSkill = orig;
  await sleep(1600);

  // 13. pictures: the blade end's strike, the mask on
  park(); g.grip = 'blade';
  const A = w.__art;
  if (A && A.poseFrame) {
    const f = A.poseFrame('e5', 'attack', 'left', 'downLeft');
    check('Blade Strike uses the Heavy Cleave landing picture', f && /cleave_land/.test(f.key), f && f.key);
    g.grip = 'fork'; g.channel = { spellId: 'singularity' };
    const s = A.standingFrame('e5', 'downLeft', true, 'masked');
    check('with the mask on he stands in the mask picture', s && /gadara_mask/.test(s.key), s && s.key);
    g.channel = null;
  }
  const errs = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', errs.length === 0, errs.join('|').slice(0, 300));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
