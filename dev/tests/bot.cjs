const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const allTexts = (sc) => { const out = []; const walk = (o) => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; sc.children.list.forEach(walk); return out; };
(async () => {
  const { w, game, errors } = await start();
  let b = await battle(game); b.clashLifeOn = true; // the test player plays with the background clash exchanges on
  const E = w.__engagement, St = w.__status;
  const used = {}; const turnsList = [];
  const tally = { Victory: 0, Defeat: 0, stuck: 0, engages: 0, presses: 0, breaks: 0, spells: 0, attacks: 0, enemyEngages: 0 };
  const texts = () => b.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
  const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
  const N = Number(process.argv[2] || 6);
  const STYLE = process.argv[3] || 'smart';   // smart (the careful player, bot_brain.cjs) | mixed (the old plain player) | noengage
  const brain = require('./bot_brain.cjs')(w, tally);
  for (let n = 1; n <= N; n++) {
    b.setSpeed('base', 8);
    if (process.env.NO_ENCHANT) for (const u of b.units) u.spells = u.spells.filter((s) => s !== 'enchant'); // balance runs: Enchant off
    const dmg = {}; const acts = {};
    const origAtk = b.performAttack.bind(b);
    b.performAttack = (a, t, d) => { const before = t.hp; const r = origAtk(a, t, d); dmg[a.label] = (dmg[a.label] || 0) + (before - t.hp); acts[a.label] = (acts[a.label] || 0) + 1; return r; };
    b.__dmg = dmg; b.__acts = acts;
    // a short trail of what last moved bodies about, printed with any OFF TILE line
    b.__trail = [];
    // every skill and item each fighter uses, counted per battle (checklist G3: the enemies use every
    // skill they own; roadmap 18.11 and 18.15). The enemy AI calls these casts directly.
    for (const fn of ['castSpell', 'castEnchant', 'castSmokeBomb', 'castElementBlast', 'castClap', 'castEarthDrive', 'castPoisonArrow', 'castShieldToss', 'castDoubleHit', 'useItem', 'performEngage']) {
      if (b['__counted_' + fn]) continue; b['__counted_' + fn] = true; // (the scene object lives on across battles: wrap it once, or battle n would count n times)
      const orig = b[fn].bind(b);
      b[fn] = (...args) => {
        const who = args[0]; const what = fn === 'castSpell' ? args[2] : fn === 'useItem' ? 'item ' + args[2] + (args[1] !== args[0] ? ' (to an ally)' : '') : fn.replace('cast', '').replace('perform', '');
        if (who && who.name && !(fn !== 'castSpell' && b.__inCast)) { const key = who.name + ': ' + what[0].toLowerCase() + what.slice(1); used[key] = (used[key] || 0) + 1; }
        const was = b.__inCast; if (fn === 'castSpell') b.__inCast = true;
        try { return orig(...args); } finally { b.__inCast = was; }
      };
    }
    for (const fn of ['knockBack', 'knockback', 'sidestep', 'playDefeat', 'moveUnit', 'castSpell', 'performEngage']) { if (typeof b[fn] !== 'function' || b['__trailed_' + fn]) continue; b['__trailed_' + fn] = true; /* wrap once: the scene lives on across battles */ const orig = b[fn].bind(b); b[fn] = (...args) => { const x = args[0]; b.__trail.push(fn + '(' + (x && x.label ? x.label : typeof x === 'string' ? x : '') + (args[1] && args[1].label ? ',' + args[1].label : '') + ')@' + Math.round(b.time.now)); return orig(...args); }; }
    if (!b.__engageCounted) { b.__engageCounted = true; const origEngage = b.performEngage.bind(b);
      b.performEngage = (a, t, d) => { if (a.side === 'enemy') tally.enemyEngages++; return origEngage(a, t, d); }; }
    const waitIdle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 6000) await sleep(5); };
    const alive = (s) => b.units.filter((u) => u.alive && u.side === s);
    const t0 = Date.now(); let lastSig = '', lastChange = Date.now(), stuck = false;
    while (!b.battleOver && Date.now() - t0 < 400000) {
      const u = b.activeUnit;
      const sig = u.label + b.turnCount + b.busy + b.mode + b.inCinematic;
      if (sig !== lastSig) { lastSig = sig; lastChange = Date.now(); }
      if (Date.now() - lastChange > 7000) { stuck = true; console.log('STUCK', u.label, 'busy', b.busy, 'mode', b.mode, 'cine', b.inCinematic); break; }
      if (u.side === 'hero' && !b.busy && !b.inCinematic) {
        // every figure must be standing on the middle of its tile (roadmap 13.47): checked twice,
        // a moment apart, so a body still settling is not counted
        const off = () => b.units.filter((x) => x.alive && x.view && x.view.active && !x.knock).map((x) => { const p = w.__grid.tileToScreen(x.col, x.row); return { x, d: Math.hypot(x.view.x - p.x, x.view.y - p.y) }; }).filter((o) => o.d > 2);
        if (off().length) { await sleep(700); for (const o of off()) { tally.offTile = (tally.offTile || 0) + 1; console.log('OFF TILE', o.x.label, 'by', o.d.toFixed(1), 'px at', o.x.col + ',' + o.x.row, 'turn', b.turnCount, '| last:', (b.__trail || []).slice(-6).join(' > ')); const p = w.__grid.tileToScreen(o.x.col, o.x.row); o.x.view.setPosition(p.x, p.y); } }
        // a hero's turn with every button greyed out is a stuck screen for a real player
        if ([...b.slots, ...b.halves, ...b.lowHalves].every((sl) => !sl.enabled)) /* End turn sits in the low half row */ { tally.noButtons = (tally.noButtons || 0) + 1; console.log('NO BUTTONS on', u.label, 'engaged', !!u.engagedWith, 'acted', u.hasActed); }
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
            let stance = hurtLosing || (STYLE === 'noengage') ? 'break' : roll < 0.5 ? E.autoStance(u) : ['press', 'guard', 'slip'][Math.floor(Math.random() * 3)];
            if (STYLE === 'smart') { const pick = brain.smartStance(b, u); stance = pick.stance; if (pick.empower) b.empower = true; }
            else if (E.poiseOf(u) >= 2 && stance !== 'break' && Math.random() < 0.4) b.empower = true;
            const myTurn = b.turnCount;
            b.onStance(stance); tally[stance === 'break' ? 'breaks' : 'presses']++;
            await waitIdle();
            const t2 = Date.now(); while (b.turnCount === myTurn && !b.battleOver && Date.now() - t2 < 3000) await sleep(10);
            continue; // the stance ended the turn by itself
          }
          if (wantBreak) { b.onBreakButton(); tally.breaks++; } else { b.onPressButton(); tally.presses++; }
          await waitIdle();
        } else if (STYLE === 'smart') {
          await brain.smartTurn(b, u, waitIdle);
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
          // Kofi (4 v 4, M10b) has Infuse in place of the Verses, and Haunt for a foe in reach that is not marked yet
          const bless = u.spells.includes('infuse') ? 'infuse' : E.styleOf(friend || u) === 'evasion' ? 'swiftness' : 'stone';
          const canBless = friend && u.spells.includes(bless) && St.canAfford(u, bless) && St.cooldownOf(u, bless) === 0;
          const mark = u.spells.includes('haunt') && St.canAfford(u, 'haunt') ? foes.filter((f) => dist(u, f) <= 4 && !St.isPoisoned(f) && !f.hidden).sort((a, c) => c.hp - a.hp)[0] : null;
          if (canBless) {
            b.onSpellButton(); b.chooseSpell(bless);
            b.handleTap(friend.col, friend.row); b.handleTap(friend.col, friend.row); tally.spells++; await waitIdle();
          } else if (mark && Math.random() < 0.5) {
            b.onSpellButton(); b.chooseSpell('haunt');
            if (b.mode === 'spellTarget' && b.targetsInRange.includes(mark)) { b.handleTap(mark.col, mark.row); b.handleTap(mark.col, mark.row); tally.spells++; tally.haunts = (tally.haunts || 0) + 1; await waitIdle(); } else b.cancelMode();
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
    turnsList.push(b.turnCount);
    console.log(`battle ${n}: ${r} after ${b.turnCount} turns | damage dealt ${JSON.stringify(b.__dmg)} | attacks ${JSON.stringify(b.__acts)} | hp left ${b.units.map(u => u.label + ':' + (u.alive ? u.hp : 'x')).join(' ')}`);
    // sanity: no leftover engagement with a fallen unit
    if (b.units.some((u) => u.engagedWith && (!u.alive || !u.engagedWith.alive))) console.log('  WARNING: engaged with a fallen unit');
    b.resultButtons[b.resultButtons.length - 1].hit.emit('pointerdown');
    const tr = Date.now(); while (Date.now() - tr < 6000) { const s2 = game.scene.getScene('BattleScene'); if (s2.units && s2.units.every((x) => x.alive) && !s2.battleOver && s2.activeUnit && s2.slots) break; await sleep(30); }
    b = game.scene.getScene('BattleScene'); b.clashLifeOn = true;
  }
  const real = errors.filter((e) => !e.includes('focus()'));
  console.log(JSON.stringify(tally));
  const sorted = turnsList.slice().sort((x, y) => x - y);
  if (sorted.length) console.log('turns: median ' + sorted[Math.floor(sorted.length / 2)] + ', shortest ' + sorted[0] + ', longest ' + sorted[sorted.length - 1]);
  console.log('skills and items used (all battles): ' + Object.keys(used).sort().map((k) => k + ' x' + used[k]).join(', '));
  console.log('errors:', real.length ? real.slice(0, 5).join(' | ') : 'none');
  w.close(); process.exit(tally.stuck || tally.offTile || real.length ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
