const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const allTexts = (sc) => { const out = []; const walk = (o) => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; sc.children.list.forEach(walk); return out; };
(async () => {
  const { w, game, errors } = await start();
  let b = await battle(game); b.clashLifeOn = true; // the test player plays with the background clash exchanges on
  const E = w.__engagement, St = w.__status;
  const tally = { Victory: 0, Defeat: 0, stuck: 0, engages: 0, presses: 0, breaks: 0, spells: 0, attacks: 0, enemyEngages: 0 };
  const texts = () => b.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
  const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
  const N = Number(process.argv[2] || 6);
  const STYLE = process.argv[3] || 'mixed';   // mixed | noengage
  for (let n = 1; n <= N; n++) {
    b.setSpeed('base', 8);
    const dmg = {}; const acts = {};
    const origAtk = b.performAttack.bind(b);
    b.performAttack = (a, t, d) => { const before = t.hp; const r = origAtk(a, t, d); dmg[a.label] = (dmg[a.label] || 0) + (before - t.hp); acts[a.label] = (acts[a.label] || 0) + 1; return r; };
    b.__dmg = dmg; b.__acts = acts;
    const origEngage = b.performEngage.bind(b);
    b.performEngage = (a, t, d) => { if (a.side === 'enemy') tally.enemyEngages++; return origEngage(a, t, d); };
    const waitIdle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 6000) await sleep(5); };
    const alive = (s) => b.units.filter((u) => u.alive && u.side === s);
    const t0 = Date.now(); let lastSig = '', lastChange = Date.now(), stuck = false;
    while (!b.battleOver && Date.now() - t0 < 400000) {
      const u = b.activeUnit;
      const sig = u.label + b.turnCount + b.busy + b.mode + b.inCinematic;
      if (sig !== lastSig) { lastSig = sig; lastChange = Date.now(); }
      if (Date.now() - lastChange > 7000) { stuck = true; console.log('STUCK', u.label, 'busy', b.busy, 'mode', b.mode, 'cine', b.inCinematic); break; }
      if (u.side === 'hero' && !b.busy && !b.inCinematic) {
        // a hero's turn with every button greyed out is a stuck screen for a real player
        if (b.slots.every((sl) => !sl.enabled)) { tally.noButtons = (tally.noButtons || 0) + 1; console.log('NO BUTTONS on', u.label, 'engaged', !!u.engagedWith, 'acted', u.hasActed); }
        const foes = alive('enemy');
        if (u.engagedWith) {
          const foe = u.engagedWith;
          // sensible play: slip away from a pinning Guardian when the odds allow, otherwise press only when favoured
          const edge = E.contestEdge(u, foe);
          const wantBreak = STYLE === 'noengage' || u.hp < u.maxHp * 0.35 || (E.styleOf(foe) === 'defence' && E.styleOf(u) === 'evasion') || edge < -1;
          if (E.isStanceDuel()) {
            // stance duel: break away when it makes sense, otherwise usually the class stance, sometimes a counter or a guess
            const hurtLosing = u.hp < u.maxHp * 0.35 && E.momentumOf(u) < 0;
            const roll = Math.random();
            const stance = hurtLosing || (STYLE === 'noengage') ? 'break' : roll < 0.5 ? E.autoStance(u) : ['press', 'guard', 'slip'][Math.floor(Math.random() * 3)];
            if (E.poiseOf(u) >= 2 && stance !== 'break' && Math.random() < 0.4) b.empower = true;
            const myTurn = b.turnCount;
            b.onStance(stance); tally[stance === 'break' ? 'breaks' : 'presses']++;
            await waitIdle();
            const t2 = Date.now(); while (b.turnCount === myTurn && !b.battleOver && Date.now() - t2 < 3000) await sleep(10);
            continue; // the stance ended the turn by itself
          }
          if (wantBreak) { b.onBreakButton(); tally.breaks++; } else { b.onPressButton(); tally.presses++; }
          await waitIdle();
        } else if (E.isMelee(u) && u.spells.includes('herbs') && St.cooldownOf(u, 'herbs') === 0 && alive('hero').some((f) => dist(u, f) <= 1 && f.hp < f.maxHp * 0.5)) {
          const f = alive('hero').find((x) => dist(u, x) <= 1 && x.hp < x.maxHp * 0.5);
          b.onSpellButton(); b.chooseSpell('herbs'); b.handleTap(f.col, f.row); b.handleTap(f.col, f.row); tally.spells++; await waitIdle();
        } else if (E.isMelee(u) && u.spells.includes('intercept') && St.cooldownOf(u, 'intercept') === 0 && !foes.some((f) => dist(u, f) <= 1) && foes.some((f) => b.chargeTile(u, f, { range: 4 }))) {
          const t = foes.filter((f) => b.chargeTile(u, f, { range: 4 })).sort((a, c) => (St.isOffBalance(c) - St.isOffBalance(a)) || a.hp - c.hp)[0];
          b.onSpellButton(); b.chooseSpell('intercept'); b.handleTap(t.col, t.row); b.handleTap(t.col, t.row); tally.intercepts = (tally.intercepts || 0) + 1; await waitIdle();
        } else if (E.isMelee(u) && u.spells.includes('spearThrow') && St.cooldownOf(u, 'spearThrow') === 0 && !foes.some((f) => dist(u, f) <= 1) && foes.some((f) => dist(u, f) <= 3)) {
          const t = foes.filter((f) => dist(u, f) <= 3).sort((a, c) => a.hp - c.hp)[0];
          b.onSpellButton(); b.chooseSpell('spearThrow'); b.handleTap(t.col, t.row); b.handleTap(t.col, t.row); tally.throws = (tally.throws || 0) + 1; await waitIdle();
        } else if (u.spells.length && !E.isMelee(u)) {
          const friend = alive('hero').find((f) => f.engagedWith && !St.buffOf(f) && dist(u, f) <= 3);
          if (friend) {
            b.onSpellButton(); b.chooseSpell(E.styleOf(friend) === 'evasion' ? 'swiftness' : 'stone');
            b.handleTap(friend.col, friend.row); b.handleTap(friend.col, friend.row); tally.spells++; await waitIdle();
          } else {
            if (Math.min(...foes.map((f) => dist(u, f))) > u.range) {
              b.handleTap(u.col, u.row);
              let best = null, bd = Math.min(...foes.map((f) => dist(u, f)));
              for (const k of b.reachableKeys) { const [c, r] = k.split(',').map(Number); const d = Math.min(...foes.map((f) => dist({ col: c, row: r }, f))); if (d < bd && d >= 2) { bd = d; best = [c, r]; } }
              if (best) { b.handleTap(best[0], best[1]); await waitIdle(); } else b.handleTap(-1, -1);
            }
            b.onAttackButton();
            if (b.mode === 'attack') { const t = [...b.targetsInRange].sort((a, c) => a.hp - c.hp)[0]; b.handleTap(t.col, t.row); b.handleTap(t.col, t.row); tally.attacks++; await waitIdle(); }
          }
        } else {
          if (Math.min(...foes.map((f) => dist(u, f))) > u.range) {
            b.handleTap(u.col, u.row);
            let best = null, bd = Math.min(...foes.map((f) => dist(u, f)));
            for (const k of b.reachableKeys) { const [c, r] = k.split(',').map(Number); const d = Math.min(...foes.map((f) => dist({ col: c, row: r }, f))); if (d < bd) { bd = d; best = [c, r]; } }
            if (best) { b.handleTap(best[0], best[1]); await waitIdle(); } else b.handleTap(-1, -1);
          }
          const pins = E.engageTargets(u, b.units).filter((p) => E.styleOf(p) === 'overpower');
          if (STYLE !== 'noengage' && pins.length && (b.turnCount % 2 === 0)) {
            b.onEngageButton(); b.handleTap(pins[0].col, pins[0].row); b.handleTap(pins[0].col, pins[0].row); tally.engages++; await waitIdle();
          } else {
            b.onAttackButton();
            if (b.mode === 'attack') { const t = [...b.targetsInRange].sort((a, c) => (St.isOffBalance(c) - St.isOffBalance(a)) || a.hp - c.hp)[0]; b.handleTap(t.col, t.row); b.handleTap(t.col, t.row); tally.attacks++; await waitIdle(); }
          }
        }
        if (!b.battleOver) b.onEndButton();
      }
      await sleep(10);
    }
    if (stuck) { tally.stuck++; break; }
    const tw = Date.now(); while (!(allTexts(b).includes('Victory') || allTexts(b).includes('Defeat')) && Date.now() - tw < 5000) await sleep(30);
    const r = allTexts(b).includes('Victory') ? 'Victory' : allTexts(b).includes('Defeat') ? 'Defeat' : 'NONE';
    if (tally[r] !== undefined) tally[r]++;
    console.log(`battle ${n}: ${r} after ${b.turnCount} turns | damage dealt ${JSON.stringify(b.__dmg)} | attacks ${JSON.stringify(b.__acts)} | hp left ${b.units.map(u => u.label + ':' + (u.alive ? u.hp : 'x')).join(' ')}`);
    // sanity: no leftover engagement with a fallen unit
    if (b.units.some((u) => u.engagedWith && (!u.alive || !u.engagedWith.alive))) console.log('  WARNING: engaged with a fallen unit');
    b.resultButtons[b.resultButtons.length - 1].hit.emit('pointerdown');
    const tr = Date.now(); while (Date.now() - tr < 6000) { const s2 = game.scene.getScene('BattleScene'); if (s2.units && s2.units.every((x) => x.alive) && !s2.battleOver && s2.activeUnit && s2.slots) break; await sleep(30); }
    b = game.scene.getScene('BattleScene'); b.clashLifeOn = true;
  }
  const real = errors.filter((e) => !e.includes('focus()'));
  console.log(JSON.stringify(tally));
  console.log('errors:', real.length ? real.slice(0, 5).join(' | ') : 'none');
  w.close(); process.exit(tally.stuck || real.length ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
