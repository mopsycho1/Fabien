// Milestone L: the Sage's lightning, spells, MP, and buffs in normal fighting.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const St = w.__status;
  const U = (l) => b.units.find((u) => u.label === l);
  const H = require('/home/claude/fabien/src/data/map.json').heights;
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - H[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(50); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.cancelMode(); };
  const sage = U('H3'), guard = U('H1'), scout = U('H2'), eg = U('E1'), ew = U('E2'), er = U('E3');
  const park = () => { put(guard, 0, 7); put(scout, 1, 7); put(sage, 3, 7); put(eg, 7, 0); put(ew, 6, 0); put(er, 5, 0); };
  const combat = require('./combat-bundle.cjs');

  // 1. range 4 and the reach area
  park(); put(sage, 3, 7); put(ew, 3, 3); turnOf(sage);
  b.onAttackButton();
  check('lightning reaches an enemy 4 tiles away', b.targetsInRange.includes(ew), b.targetsInRange.map((u) => u.label).join());
  check('the attack shows its whole reach, not only the targets', b.highlights.length > b.targetsInRange.length, b.highlights.length);
  check('the button is called Lightning', b.slots[1].label && b.slots[1].label.text === 'Lightning', b.slots[1].label && b.slots[1].label.text);
  b.cancelMode();

  // 2. magic and weapon damage are separate
  check('lightning uses magic attack against magic defense', combat.getDamage(sage, eg) === sage.magicAttack - eg.magicDefense, combat.getDamage(sage, eg));
  check('a spear uses attack: 8 attack - 3 defense = 5 on Rabdul', combat.getDamage(scout, eg) === 5, combat.getDamage(scout, eg));

  // 3. too close to aim
  put(ew, 3, 6); const near = combat.getHitChance(sage, ew); put(ew, 3, 5); const far = combat.getHitChance(sage, ew);
  check('lightning is 25 harder to aim at someone right next to you', far - near === 25, far + ' vs ' + near);

  // 4. the jump
  park(); put(ew, 3, 4); put(eg, 4, 4); turnOf(sage);
  const realRandom = w.Math.random; w.Math.random = () => (/performAttack|rollAttack/.test(new Error().stack) ? 0.01 : realRandom());
  const hpW = ew.hp, hpG = eg.hp;
  b.onAttackButton(); b.handleTap(3, 4); b.handleTap(3, 4); await idle(); await sleep(900);
  w.Math.random = realRandom;
  check('lightning hits the target', ew.hp < hpW, hpW + ' -> ' + ew.hp);
  check('and jumps to the enemy next to it for half damage', hpG - eg.hp === Math.max(1, Math.round(combat.getDamage(sage, eg) * 0.5)), hpG + ' -> ' + eg.hp);
  ew.hp = hpW; eg.hp = hpG; b.updateHpBar(ew); b.updateHpBar(eg);

  // 5. buffs change normal fighting
  park();
  const dmgIn = combat.getDamage(ew, scout); St.applyBuff(scout, 'stone');
  check('Verse of Stone: 2 less damage taken from swords (on a non-Guardian)', dmgIn - combat.getDamage(ew, scout) === 2, dmgIn + ' -> ' + combat.getDamage(ew, scout));
  scout.status.buff = null;
  const dmgOut = combat.getDamage(scout, ew); St.applyBuff(scout, 'fury');
  check('Verse of Fury: 2 more damage dealt', combat.getDamage(scout, ew) - dmgOut === 2, dmgOut + ' -> ' + combat.getDamage(scout, ew));
  const hitOn = combat.getHitChance(er, sage); const mv = St.moveOf(sage); St.applyBuff(sage, 'swiftness');
  check('Verse of Swiftness: 15 harder to hit and 1 more step', hitOn - combat.getHitChance(er, sage) === 15 && St.moveOf(sage) === mv + 1, hitOn + ' -> ' + combat.getHitChance(er, sage) + ', move ' + mv + ' -> ' + St.moveOf(sage));
  for (const u of [guard, scout, sage]) u.status.buff = null;

  // 5b. each Verse is twice as strong on the class it suits
  St.applyBuff(scout, 'stone');
  const onScout = St.statMod(scout, 'defense');
  St.applyBuff(guard, 'stone');
  check('Verse of Stone: +2 defense on a Scout, +4 on a shield-bearing Guardian', onScout === 2 && St.statMod(guard, 'defense') === 4, onScout + ' vs ' + St.statMod(guard, 'defense'));
  St.applyBuff(scout, 'swiftness');
  check('Verse of Swiftness: +30 evade on a Scout', St.statMod(scout, 'evade') === 30, St.statMod(scout, 'evade'));
  St.applyBuff(ew, 'fury');
  check('Verse of Fury: +4 attack on a Warlord', St.statMod(ew, 'attack') === 4, St.statMod(ew, 'attack'));
  check('the clash bonus doubles too (+6 guard on the Guardian)', St.buffOf(guard).amount === 6, St.buffOf(guard).amount);
  park(); turnOf(sage); sage.mp = 12; put(guard, 3, 6);
  b.onSpellButton(); b.openSpellGroup('Blessings'); b.chooseSpell('stone'); b.handleTap(3, 6);
  check('the preview says it is doubled', /Double effect on a shield-bearer/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.cancelMode();
  for (const u of [guard, scout, sage, ew]) u.status.buff = null;

  // 6. the menu, MP and Slow
  park(); put(ew, 3, 4); turnOf(sage); sage.mp = 12;
  b.onSpellButton();
  const labels = b.slots.slice(0, 3).map((s) => s.view.visible ? s.label.text : '-');
  check('8.11 Verses: Blessings, Hexes and Husk (Meditate has its own row, 8.10)', labels[0].startsWith('Blessings') && labels[1].startsWith('Hexes') && labels[2].startsWith('Husk'), labels.join(' | '));
  b.openSpellGroup('Hexes');
  const inner = b.slots.slice(0, 3).map((s) => s.view.visible ? s.label.text : '-');
  check('8.11 Hexes opens Slow, with its MP', inner[0] === 'Slow  4 MP' && inner[1] === '-', inner.join(' | '));
  const sp = ew.speed, ct = ew.ct;
  b.chooseSpell('slow'); b.handleTap(3, 4); b.handleTap(3, 4); await idle();
  check('Slow: 4 MP spent, enemy speed -4 and its next turn pushed back 50', sage.mp === 8 && ew.speed === sp - 4 && ew.ct === ct - 50, `mp ${sage.mp}, speed ${sp}->${ew.speed}, ct ${ct}->${ew.ct}`);
  check('Slow shows on the enemy', St.statusTags(ew).some((t) => t.text === 'SLOW'));
  St.tickBuff(ew); St.tickBuff(ew);
  check('Slow wears off after 2 of its turns and speed comes back', ew.speed === sp && !St.hexOf(ew), ew.speed);

  // 7. Husk
  park(); put(ew, 3, 6); turnOf(sage); sage.mp = 12;
  b.onSpellButton(); b.chooseSpell('husk');
  check('Husk shows green tiles to slip to', b.mode === 'huskTile' && b.reachableKeys.size > 0, b.reachableKeys.size);
  b.handleTap(5, 6); b.handleTap(5, 6); await idle();
  check('Husk moves the Sage and costs 5 MP', sage.col === 5 && sage.row === 6 && sage.mp === 7, `${sage.col},${sage.row} mp ${sage.mp}`);
  check('the decoy blocks the old tile', b.isBlocked(3, 7));
  b.removeDecoys(sage);
  check('the swarm scatters at the Sage\'s next turn', !b.isBlocked(3, 7));

  // 8. Meditate
  park(); turnOf(sage); sage.mp = 2;
  const defBefore = St.statMod(sage, 'defense');
  b.onSpellButton(); b.chooseSpell('meditate');
  check('first tap on Meditate explains it', b.selectedSpell === 'meditate' && sage.mp === 2);
  b.chooseSpell('meditate'); await sleep(1300); await idle();
  check('Meditate: the MP comes back only after her next turn (the trance)', sage.mp === 2 && sage.meditating, sage.mp);
  check('and leaves the Sage Exposed', St.statMod(sage, 'defense') === defBefore - 2 && St.statusTags(sage).some((t) => t.text === 'EXPOSED'));
  check('and ends the turn', b.activeUnit !== sage, b.activeUnit.label);

  // 9. not enough MP
  await sleep(1300); await idle(); sage.meditating = null; park(); turnOf(sage); sage.mp = 1;
  b.onSpellButton(); b.openSpellGroup('Hexes'); b.chooseSpell('slow');
  check('with too little MP, Slow cannot be cast', b.mode !== 'spellTarget' && !b.slots[0].enabled, b.mode);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
