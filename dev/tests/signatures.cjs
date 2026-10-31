// Spearman, Spear Throw, Herbs, signature stances, Auto stances.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game);
  const E = w.__engagement, St = w.__status;
  const U = (l) => b.units.find((u) => u.label === l);
  const Hm = require('/home/claude/fabien/src/data/map.json').heights;
  const put = (u, c, r) => { u.col = c; u.row = r; u.view.setPosition(360 + (c - r) * 43, 400 + (c + r) * 27 - Hm[r][c] * 22); u.view.setDepth((c + r) * 2 + 1); };
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 8000) await sleep(30); await sleep(60); };
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; b.stanceMenu = 'main'; b.empower = false; b.cancelMode(); };
  const labels = () => b.slots.map((s) => (s.view.visible ? s.label.text + (s.enabled ? '' : '(dim)') : '-')).join(' | ');
  const sudeen = U('H1'), gaha = U('H2'), sage = U('H3'), tayo = U('E1'), bull = U('E2'), archer = U('E3');
  // Tayo is on the bench, so E1 (Rabdul) is given Tayo's Bruiser numbers to test Counter-Press
  Object.assign(tayo, { signature: { id: 'counter', stance: 'press', name: 'Counter-Press' }, contest: { style: 'overpower', power: 7, guard: 6, agility: 3 }, stances: { press: 'strong', guard: 'average', slip: 'weak', break: 'weak' } });
  b.endTurn = () => {};
  const clear = () => { for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.stance = null; u.fury = 0; u.charge = 0; u.chargePool = 0; u.bulwark = 0; u.hp = u.maxHp; u.status.cooldowns = {}; u.status.offBalance = false; } b.refreshEngagementMarks(); };
  const park = () => { clear(); for (const u of b.units) put(u, 7, 7); put(sudeen, 0, 7); put(sage, 1, 7); put(gaha, 3, 7); put(tayo, 7, 0); put(bull, 6, 0); put(archer, 5, 0); };
  const real = w.Math.random; const force = (re, v) => { w.Math.random = () => (re.test(new Error().stack) ? v : real()); }; const unforce = () => { w.Math.random = real; };

  // ---------- Gaha the Spearman ----------
  park(); turnOf(gaha);
  check('Gaha is a Spearman and his attack is called Thrust', gaha.jobName === 'Spearman' && b.slots[1].label.text === 'Thrust', gaha.jobName + ' / ' + b.slots[1].label.text);
  const halves = () => b.halves.map((h) => (h.view.visible ? h.label.text + (h.enabled ? '' : '(dim)') : '-')).join(' | ');
  check('his third row is two buttons: Engage and Skills', halves() === 'Engage(dim) | Skills' && !b.slots[2].view.visible, halves());
  b.onSpellButton();
  check('Skills holds Spear Throw (Engage is not in it)', labels() === 'Spear Throw | - | - | Back', labels());
  b.cancelMode();
  // throw at an enemy 3 tiles away on flat ground: knocked back a tile
  park(); put(gaha, 3, 6); put(bull, 3, 3); turnOf(gaha);
  const hp = bull.hp;
  force(/rollAttack/, 0.01);
  b.onSpellButton(); b.chooseSpell('spearThrow');
  check('Spear Throw shows a red tile on the enemy 3 tiles away', b.mode === 'spellTarget' && b.targetsInRange.includes(bull), b.targetsInRange.map((u) => u.label).join());
  b.handleTap(3, 3);
  check('the preview shows the odds and the knock-back', /Spear Throw at Bull Commander: \d+% to hit, \d+ damage, knocked back a tile/.test(b.statusText.text), JSON.stringify(b.statusText.text));
  b.handleTap(3, 3); await idle(); await sleep(400); unforce();
  check('the throw hurts it', bull.hp < hp, hp + ' -> ' + bull.hp);
  check('and knocks it back a tile, away from Gaha', bull.col === 3 && bull.row === 2, bull.col + ',' + bull.row);
  check('Spear Throw must wait 3 turns', St.cooldownOf(gaha, 'spearThrow') === 3);
  turnOf(gaha); b.onSpellButton();
  check('the menu shows the wait and it is dim', /Spear Throw  \(3\)\(dim\)/.test(labels()), labels());
  b.cancelMode();
  // throw knocks an enemy off a ledge: row 0 is high ground (2), row 1 lower
  park(); put(gaha, 5, 4); put(bull, 5, 1); turnOf(gaha);
  // (just check the push path code runs with heights; damage includes any fall)
  force(/rollAttack/, 0.01); const hp2 = bull.hp;
  b.onSpellButton(); b.chooseSpell('spearThrow'); b.handleTap(5, 1); b.handleTap(5, 1); await idle(); await sleep(400); unforce();
  check('a second throw lands too', bull.hp < hp2, hp2 + ' -> ' + bull.hp);

  // ---------- Herbs ----------
  park(); put(sudeen, 2, 6); put(gaha, 2, 5); gaha.hp = 10; turnOf(sudeen);
  b.onSpellButton();
  check('Sudeen\'s Skills: Herbs and Intercept', labels() === 'Herbs | Intercept | - | Back', labels());
  b.chooseSpell('herbs');
  check('Herbs offers only hurt allies next to him', b.targetsInRange.length === 1 && b.targetsInRange[0] === gaha, b.targetsInRange.map((u) => u.label).join());
  b.handleTap(2, 5); b.handleTap(2, 5); await idle();
  check('Herbs heals 10', gaha.hp === 20, gaha.hp);

  // ---------- Signatures ----------
  // Counter-Press: Tayo in Press soaks the first hit, stores Charge, and counters when he loses
  park(); put(tayo, 3, 3); put(gaha, 3, 4); E.startDuel(gaha, tayo); tayo.stance = 'press';
  const r1 = b.landHit(tayo, 6);
  check('Counter-Press soaks 4 of the first hit and stores 1 Charge', r1.damage === 2 && tayo.charge === 1 && r1.note === 'Soaked 4', JSON.stringify(r1) + ' charge ' + tayo.charge);
  const r2 = b.landHit(tayo, 6);
  check('the second hit before the next beat is not soaked', r2.damage === 6, r2.damage);
  check('Tayo shows CHARGE 1', St.statusTags(tayo).some((t) => t.text === 'CHARGE 1'));
  const gHp = gaha.hp;
  let beatQ = [0.99, 0.99, 0.99, 0.0, 0.0, 0.0]; w.Math.random = () => (beatQ.length && /rollDice/.test(new Error().stack) ? beatQ.shift() : real());
  turnOf(gaha); b.setStanceChoice('manual'); b.onStance('slip'); await idle(); await sleep(300); unforce();
  check('Tayo lost the beat and his Charge came back as a counter-punch (3 per Charge)', gaha.hp === gHp - 3 && tayo.charge === 0, gHp + ' -> ' + gaha.hp);

  // Bloodied Press: every hit adds a stack; in Press each stack takes 1 off
  park(); put(bull, 3, 3); put(gaha, 3, 4); E.startDuel(gaha, bull); bull.stance = 'press';
  b.landHit(bull, 5); b.landHit(bull, 5);
  check('two hits: BLOODIED 2', bull.fury === 2 && St.statusTags(bull).some((t) => t.text === 'BLOODIED 2'));
  const r3 = b.landHit(bull, 5);
  check('in Press, a 5 damage hit becomes 3', r3.damage === 3 && r3.note === 'Bloodied -2', JSON.stringify(r3));
  check('stacks stop at 3', bull.fury === 3);
  bull.stance = 'guard';
  check('out of Press, no reduction', b.landHit(bull, 5).damage === 5);
  // a beat won with Press lands a quick hit of 1 + stacks
  bull.stance = null; bull.fury = 2; const gHp2 = gaha.hp;
  beatQ = [0.7, 0.7, 0.7, 0.7, 0.7, 0.7]; // same dice: the Warlord wins on his numbers, not by a decisive margin
  w.Math.random = () => (beatQ.length && /rollDice/.test(new Error().stack) ? beatQ.shift() : real());
  turnOf(bull); let seenBeat = null; const origApply = b.applyBeat.bind(b); b.applyBeat = (bt) => { seenBeat = bt; return origApply(bt); };
  b.duelBeat(bull, 'press', gaha, 'slip', false, false, () => {}); await idle(); await sleep(300); unforce(); b.applyBeat = origApply;
  check('the Warlord wins with Press: Bloodied Press hits for 1 + 2 stacks', !seenBeat.decisive && gaha.hp === gHp2 - 3, gHp2 + ' -> ' + gaha.hp);

  // Bulwark: a warden holding Guard is harder to push, and a standoff heals
  park(); const ward = Object.assign(sudeen, { signature: { id: 'bulwark', stance: 'guard', name: 'Bulwark' } });
  put(ward, 3, 4); put(bull, 3, 3); E.startDuel(bull, ward);
  ward.hp = ward.maxHp - 6; ward.poise = 1;
  beatQ = [0.4, 0.4, 0.4, 0.4, 0.4, 0.4]; // even dice: a stalemate (scores are close)
  const sig = w.__signature;
  turnOf(ward); b.setStanceChoice('manual');
  let even = null;
  for (let i = 0; i < 6 && !even; i++) {
    ward.stance = 'guard'; bull.stance = null;
    const beat = { kind: 'even', actor: ward, holder: bull, actorStance: 'guard', holderStance: 'guard', winner: null, loser: null };
    const out = b.applyBeat(beat); even = out.sig && out.sig.find((f) => f.kind === 'heal') ? out : null;
  }
  check('an even beat in Guard: Standoff heals 2 and gives 1 Poise', even && ward.hp === ward.maxHp - 4 && ward.poise === 2, ward.hp + ' poise ' + ward.poise);
  check('Bulwark grows with each beat held in Guard', ward.bulwark === 1, ward.bulwark);
  ward.bulwark = 2; ward.stance = 'guard';
  const pushed = b.pushLoser(ward, bull, 2);
  check('BULWARK 2 cancels a 2-tile push', pushed.path.length === 0 && ward.col === 3 && ward.row === 4, pushed.path.length);
  sudeen.signature = null;

  // ---------- Auto stances ----------
  park(); put(gaha, 3, 4); put(bull, 3, 3); E.startDuel(gaha, bull);
  turnOf(gaha); b.setStanceChoice('auto');
  check('Auto (the default): Fight, Break away, Empower, Manual', /^Fight: Slip  \* \| Break away \| Empower  \d Poise \| Manual  >$/.test(labels()), labels());
  bull.stance = 'press'; b.refreshStatus();
  check('if the foe last used the stance that beats his, Auto switches to the counter', /^Fight: Guard/.test(labels()), labels());
  b.setStanceChoice('manual');
  check('Manual: Press, Guard, Slip, More', /^Press \| Guard \| Slip  \* \| More  >$/.test(labels()), labels());
  b.setStanceChoice('auto');
  check('the choice is remembered on the device', w.localStorage.getItem('fabien.stanceChoice') === 'auto');

  // a Counter! that knocks out the winner of a decisive beat (this used to freeze the game)
  park(); put(gaha, 3, 5); put(tayo, 3, 4); E.startDuel(gaha, tayo);
  tayo.stance = 'press'; tayo.charge = 3; gaha.hp = 2; gaha.engagement.track = 2; // one more win is decisive for Gaha
  const fixed = [0.99, 0.99, 0.99, 0.0, 0.0, 0.0]; w.Math.random = () => (fixed.length && /rollDice/.test(new Error().stack) ? fixed.shift() : real());
  turnOf(gaha); b.setStanceChoice('manual'); E.momentumOf && 0;
  let done = false; b.duelBeat(gaha, 'slip', tayo, 'press', false, false, () => { done = true; });
  await sleep(300); await idle(); await sleep(2800); w.Math.random = real;
  check('a Counter! that knocks out the winner of a decisive beat does not freeze the game', !gaha.alive && (done || b.battleOver) && !b.inCinematic, 'alive ' + gaha.alive + ' done ' + done + ' cine ' + b.inCinematic);
  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
