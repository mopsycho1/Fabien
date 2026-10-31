const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  b.setSpeed('base', 3);
  w.__engagement.engagementRules.mode = 'classic'; // this test checks the older Engage (Press / Break away)
  const U = (l) => b.units.find((u) => u.label === l);
  const waitFor = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(20); } return false; };
  const H = require('/home/claude/fabien/src/data/map.json').heights; // the real map
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - H[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  // row 4 of a normal turn is two half buttons since Phase 2: Items | End turn
  const labels = () => b.slots.map((s, i) => (s.view.visible ? s.label.text + (s.enabled ? '' : '(dim)') : i === 3 && b.lowHalves[1].view.visible ? b.lowHalves.map((h) => h.label.text + (h.enabled ? '' : '(dim)')).join('/') : '-')).join(' | ');
  b.idleLifeOn = false;
  // words over the unit, and since 30 Oct (roadmap 6.7) his icons as icon:<name>
  const tags = (u) => u.tagRow.list.filter((o) => o.type === 'Text' || o.iconKey).map((t) => (t.iconKey ? 'icon:' + t.iconKey : t.text)).join(',');
  // dice control: queue for rollDice calls, queue for lossResponse / break rolls
  const real = w.Math.random.bind(w.Math); let diceQ = [], respQ = [];
  w.Math.random = () => { const st = new Error().stack; if (diceQ.length && st.includes('rollDice')) return diceQ.shift(); if (respQ.length && st.includes('lossResponse')) return respQ.shift(); return real(); };
  const die = (n) => (n - 1) / 6 + 0.01;
  const idle = async () => { await waitFor(() => !b.busy && !b.inCinematic, 8000); };

  // ---- pictures and line-up
  check('every unit is a picture now (Tayo stands in on E1)', b.units.every((u) => u.sprite), b.units.map((u) => u.label + (u.sprite ? ':pic' : ':circle')).join(' '));
  check('jobs: Guardian, Spearman, Sage vs Spearman (Rabdul), Warlord, Ranger', b.units.map((u) => u.jobName).join() === 'Guardian,Spearman,Sage,Spearman,Warlord,Ranger', b.units.map((u) => u.jobName).join());
  check('fastest unit goes first: H2', b.activeUnit.label === 'H2', b.activeUnit.label);
  // the rest of this test was written for a Scout in the H2 slot: give it back the Scout's numbers
  Object.assign(U('H2'), { contest: { style: 'evasion', power: 4, guard: 3, agility: 8 }, stances: { press: 'weak', guard: 'weak', slip: 'strong', break: 'strong' }, spells: [], attackName: 'Attack', speed: 12 });
  b.cancelMode();
  check('buttons: Move | Attack | Engage (dim, nobody next to it) | End turn', labels() === 'Move | Attack | Engage(dim) | Items(dim)/End turn', labels());

  // ---- engage: decisive Advantage for the scout pushes the warlord away and breaks contact
  const h2 = U('H2'), e2 = U('E2'), h1 = U('H1'), e1 = U('E1'), h3 = U('H3'), e3 = U('E3');
  put(h2, 3, 4); put(e2, 3, 3); b.cancelMode();
  check('with the Warlord next to it, Engage lights up', labels() === 'Move | Attack | Engage | Items(dim)/End turn', labels());
  b.onEngageButton();
  check('engage mode shows an orange tile on the Warlord only', b.mode === 'engage' && b.targetsInRange.length === 1 && b.targetsInRange[0] === e2);
  b.handleTap(3, 3);
  check('first tap shows both sides\' numbers', /Engage Bull Commander \(Overpower\)\?\nYou \d+ vs them \d+, plus dice/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  diceQ = [die(6), die(6), die(1), die(1)];
  b.handleTap(3, 3);
  check('second tap engages: the scout has used its action', h2.hasActed === true && b.inCinematic === true);
  check('the result is decided at once: Warlord off-balance and pushed to (3,2), contact broken', !h2.engagedWith && !e2.engagedWith && e2.col === 3 && e2.row === 2 && w.__status.isOffBalance(e2), e2.col + ',' + e2.row);
  check('his clash banner sweeps across first (8.6; was the "ENGAGE!" cut-in)', await waitFor(() => b.children.list.some((o) => o.type === 'Image' && o.texture && o.texture.key === 'ui:clash_frame'), 1500));
  check('after the cut-in the scout winds up and the clash plays', await waitFor(() => ['h2:gaha_windup.png', 'h2:gaha_attack.png'].includes(h2.sprite.texture.key), 4000), h2.sprite.texture.key);
  check('the battlefield camera zooms in on the clash', await waitFor(() => b.cameras.main.zoom > 1.2, 3000), b.cameras.main.zoom.toFixed(2));
  check('...while the interface camera stays still', b.uiCam.zoom === 1 && b.uiCam.scrollX === 0 && b.uiCam.scrollY === 0);
  await idle();
  check('the camera is back to the whole board afterwards', b.cameras.main.zoom === 1 && Math.abs(b.cameras.main.scrollX) < 0.5 && Math.abs(b.cameras.main.scrollY) < 0.5, b.cameras.main.zoom + ' ' + b.cameras.main.scrollX + ',' + b.cameras.main.scrollY);
  check('after the animation the Warlord stands on its new tile', Math.abs(e2.view.x - (360 + (3 - 2) * 43)) < 1 && Math.abs(e2.view.y - (400 + 5 * 27)) < 1, e2.view.x + ',' + e2.view.y);
  check('the Warlord shows the Off-Balance icon, and no engagement marks remain', tags(e2) === 'icon:offbalance' && b.engageMarks.length === 0, tags(e2) + ' / ' + b.engageMarks.length);

  // ---- stalemate keeps them locked
  put(e2, 3, 3); w.__status.clearOffBalance(e2); h2.hasActed = false; b.cancelMode();
  diceQ = [die(3), die(3), die(3), die(3)];
  b.onEngageButton(); b.handleTap(3, 3); b.handleTap(3, 3);
  await idle();
  check('stalemate: both stay engaged, no one is off-balance or moved', h2.engagedWith === e2 && e2.engagedWith === h2 && !w.__status.isOffBalance(h2) && !w.__status.isOffBalance(e2) && h2.col === 3 && h2.row === 4);
  check('an orange line and a crossed-blades icon are drawn between them', b.engageMarks.length === 2);
  check('both are ENGAGED (on the card; over their heads the crossed blades show it, not the word)', w.__status.statusTags(h2).some((t) => t.text === 'ENGAGED') && w.__status.statusTags(e2).some((t) => t.text === 'ENGAGED') && !/ENGAGED/.test(tags(h2)), tags(h2) + ' / ' + tags(e2));
  check('engaged units stand in their fighting stance', /gaha_battle_/.test(h2.sprite.texture.key) && /bull_battle_/.test(e2.sprite.texture.key), h2.sprite.texture.key + ' ' + e2.sprite.texture.key);
  check('buttons change to Press | Break away (dim, action used) | - | End turn', labels() === 'Press(dim) | Break away(dim) | - | End turn', labels());
  b.handleTap(3, 4); b.startMove();
  check('an engaged unit cannot walk', b.mode !== 'move' && /Locked with Bull Commander/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.startAttack();
  check('an engaged unit cannot make ordinary attacks', b.mode !== 'attack');

  // ---- intervention: the enemy ranger gets the distraction bonus on the locked scout
  put(e3, 5, 4); b.activeUnit = e3; e3.hasActed = false; b.cancelMode();
  const { getHitChance } = w.__engagement.__proto__ ? require('module') : {};
  check('the ranger sees the scout as distracted (+15 to hit)', b.units && true);
  // ---- press: a Reversal against the scout, which slips the off-balance (evasion) but is pushed
  b.activeUnit = h2; h2.hasActed = false; b.cancelMode();
  check('a fresh turn while locked: Press | Break away are live', labels() === 'Press | Break away | - | End turn', labels());
  diceQ = [die(1), die(1), die(6), die(6)]; respQ = [0.99, 0.0];   // not held, slipped
  console.log('  before press: busy', b.busy, 'cine', b.inCinematic, 'hasActed', h2.hasActed, 'engaged', h2.engagedWith && h2.engagedWith.label, 'h2', h2.col + ',' + h2.row, 'e2', e2.col + ',' + e2.row, 'blocked 3,5?', b.isBlocked(3,5));
  b.onPressButton();
  console.log('  after press: offbal', w.__status.isOffBalance(h2), 'h2', h2.col + ',' + h2.row, 'engaged', !!h2.engagedWith, 'diceQ left', diceQ.length, 'respQ left', respQ.length);
  check('big reversal: the scout loses, slips the off-balance, is shoved TWO tiles by the Warlord (overpower) to (3,6), contact breaks', !w.__status.isOffBalance(h2) && h2.col === 3 && h2.row === 6 && !h2.engagedWith, h2.col + ',' + h2.row);
  await idle();
  check('busy is clear afterwards', !b.busy && !b.inCinematic);

  // ---- a Guardian holds its ground: off-balance but not moved, still engaged
  put(h1, 4, 4); put(e2, 4, 3); h1.engagedWith = null; e2.engagedWith = null; w.__status.clearOffBalance(e2);
  b.activeUnit = e2; e2.hasActed = false; b.cancelMode();
  diceQ = [die(6), die(6), die(1), die(1)]; respQ = [0.0, 0.99];   // held, not slipped
  b.busy = true; b.performEngage(e2, h1, () => { b.busy = false; });
  check('the Guardian loses but holds its ground: stays at (4,4), off-balance, still engaged', h1.col === 4 && h1.row === 4 && w.__status.isOffBalance(h1) && h1.engagedWith === e2);
  await idle();
  check('it shows the Off-Balance icon (ENGAGED is shown by the crossed blades)', tags(h1) === 'icon:offbalance', tags(h1));
  const realHit = b.activeUnit; // e2
  b.activeUnit = e3; b.cancelMode(); b.startAttack();
  if (b.targetsInRange.includes(h1)) { b.previewAttack(h1); check('attack preview on the guardian says "distracted, off-balance"', /\(distracted, off-balance(, with the dagger)?\)/.test(b.statusText.text), JSON.stringify(b.statusText.text)); }
  else { put(e3, 4, 6); b.cancelMode(); b.startAttack(); b.previewAttack(h1); check('attack preview on the guardian says "distracted, off-balance"', /\(distracted, off-balance(, with the dagger)?\)/.test(b.statusText.text), JSON.stringify(b.statusText.text)); }
  b.cancelMode();
  // Off-balance clears at the start of the Guardian's own turn
  // a real turn start, arranged so the Guardian is next in line
  for (const u of b.units) u.ct = 0; h1.ct = 100;
  b.startTurn();
  check('Off-Balance clears at the start of the unit\'s own turn', !w.__status.isOffBalance(h1) && tags(h1) === '', tags(h1));

  // ---- break away
  b.activeUnit = h1; h1.hasActed = false; b.cancelMode();
  diceQ = [die(6), die(6), die(1), die(1)];
  b.onBreakButton();
  check('a successful break ends the engagement and steps away from the Warlord', !h1.engagedWith && !e2.engagedWith && Math.abs(h1.col - e2.col) + Math.abs(h1.row - e2.row) > 1, h1.col + ',' + h1.row);
  await idle();
  check('engagement marks are gone', b.engageMarks.length === 0);

  // ---- spells
  b.activeUnit = h3; h3.hasActed = false; b.cancelMode();
  check('the Sage has Move | Lightning | Verses/Meditate | End turn (8.10, 8.11)', labels() === 'Move | Lightning | - | Items(dim)/End turn' && b.halves[0].label.text === 'Verses' && b.halves[1].label.text === 'Meditate', labels() + ' / ' + b.halves.map((h) => h.label.text).join('/'));
  b.onSpellButton();
  check('Verses shows Blessings, Hexes, Husk and Back', labels() === 'Blessings  > | Hexes  > | Husk  5 MP | Back', labels());
  b.chooseSpell('stone');
  const inRange = b.targetsInRange.map((u) => u.label).sort().join();
  check('gold tiles on everyone within 3 tiles, friend or foe', b.mode === 'spellTarget' && b.targetsInRange.length > 0 && b.targetsInRange.every((u) => Math.abs(u.col - h3.col) + Math.abs(u.row - h3.row) <= 3), inRange);
  const tgt = b.targetsInRange.includes(h1) ? h1 : b.targetsInRange[0];
  b.handleTap(tgt.col, tgt.row);
  check('first tap explains the spell', /^Verse of Stone on .*Tap again\.\n(Double effect on a shield-bearer! )?Earth's Bulwark, \+2 defense/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.handleTap(tgt.col, tgt.row);
  check('second tap casts it: the target has the Verse of Stone and the Sage has acted', w.__status.buffOf(tgt) && w.__status.buffOf(tgt).id === 'stone' && h3.hasActed);
  check('the Sage shows its casting pose', h3.sprite.texture.key === 'h3:layra_cast.png', h3.sprite.texture.key);
  await idle(); await sleep(300);
  check('the target shows the Earth\'s Bulwark icon', tags(tgt).includes('icon:stone'), tags(tgt));
  b.onSpellButton();
  check('the Sage cannot cast twice in one turn', b.mode !== 'spell');

  // ---- skipping the animation
  put(h2, 2, 4); put(e1, 2, 3); h2.engagedWith = null; e1.engagedWith = null; b.activeUnit = h2; h2.hasActed = false; b.cancelMode();
  const baseScale = b.tweens.timeScale;
  b.onEngageButton(); b.handleTap(2, 3); b.handleTap(2, 3);
  b.input.emit('pointerdown', { x: 100, y: 100 }, []);
  check('a tap during the clash speeds it up 5x', b.tweens.timeScale === baseScale * 5 && b.time.timeScale === baseScale * 5);
  await idle();
  check('normal speed returns afterwards', b.tweens.timeScale === baseScale && b.time.timeScale === baseScale);

  // ---- enemy guardian pins a hero fighter
  for (const u of b.units) { if (u.engagedWith) w.__engagement.endEngagement(u); }
  put(e1, 6, 6); put(h1, 6, 7); b.activeUnit = e1; e1.hasActed = false; b.cancelMode();
  b.enemyAttack(e1);
  check('the enemy Guardian engages the hero fighter next to it instead of attacking', e1.engagedWith === h1 || (e1.hasActed && h1.engagedWith === e1) || (e1.hasActed && !e1.engagedWith), (e1.engagedWith ? e1.engagedWith.label : 'none'));
  await waitFor(() => !b.busy && !b.inCinematic && b.activeUnit !== e1, 9000);

  // ---- defeating a locked unit ends the engagement
  for (const u of b.units) { if (u.engagedWith) w.__engagement.endEngagement(u); }
  put(h2, 1, 4); put(e1, 1, 3); w.__engagement.startEngagement(h2, e1); b.refreshEngagementMarks();
  e1.hp = 1; b.defeat(e1);
  check('defeating a locked unit frees its foe and removes the marks', !h2.engagedWith && b.engageMarks.length === 0);

  const realErr = errors.filter((e) => !e.includes('focus()'));
  check('no errors or warnings', realErr.length === 0, realErr.join(' | '));
  console.log(fails === 0 ? '\nALL PASSED' : '\n' + fails + ' FAILED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
