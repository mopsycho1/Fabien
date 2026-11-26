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
    if (process.env.NO_WARD) for (const u of b.units) u.wardOff = true; // measuring others' damage: Sudeen's Ward off (19.3)
    if (process.env.NO_ENCHANT) for (const u of b.units) u.spells = u.spells.filter((s) => s !== 'enchant'); // balance runs: Enchant off
    const dmg = {}; const acts = {};
    const origAtk = b.performAttack.bind(b);
    b.performAttack = (a, t, d) => { if (process.env.BAL_LOG && t && t.label === process.env.BAL_LOG) console.log('LOG   hit by', a.label, 'hp before', t.hp); const before = t.hp; const r = origAtk(a, t, d); dmg[a.label] = (dmg[a.label] || 0) + (before - t.hp); acts[a.label] = (acts[a.label] || 0) + 1; return r; };
    b.__dmg = dmg; b.__acts = acts;
    // poison ticks (shown as 'Poison -N' over the poisoned unit) are counted per side that took them, so the
    // archer's real damage can be read (Batch 7): "poison on heroes" is hers in the default teams
    if (!b.__poisonWatch) { b.__poisonWatch = true; const ft = b.floatText.bind(b); b.floatText = (u, text, ...rest) => { const m = /^Poison -(\d+)/.exec(text || ''); if (m && u && b.__dmg) { const k = 'poison on ' + (u.side === 'hero' ? 'heroes' : 'enemies'); b.__dmg[k] = (b.__dmg[k] || 0) + Number(m[1]); } return ft(u, text, ...rest); }; }
    // balance pass (10.31, 18.32): rounds (each turn counts 1 / fighters alive, so 8 turns with 8 alive = 1 round),
    // who falls and when, healing done, misses and Guarded clashes, to see what drags a battle out
    b.__bal = { rounds: 0, deaths: [], heal: 0, miss: 0, hits: 0 };
    if (!b.__balWatch) {
      b.__balWatch = true;
      const st = b.startTurn.bind(b); b.startTurn = (...a) => {
        if (b.__bal && !b.battleOver) b.__bal.rounds += 1 / Math.max(1, b.units.filter((x) => x.alive).length);
        if (process.env.BAL_LOG && b.activeUnit && b.activeUnit.label === process.env.BAL_LOG) console.log('LOG   end of turn at', b.activeUnit.col + ',' + b.activeUnit.row, 'zone', b.activeUnit.zone ? b.activeUnit.zone.name : '-');
        // what the turn that just ended was spent on (balance pass 18.32): clash, attack, skill, item, dig, or nothing (walk / wait)
        if (b.__bal && b.__turnWho) { const k = b.__turnWho.side + ' ' + (b.__turnInClash ? 'clash' : b.__turnAct || 'walk or wait'); b.__bal.spent = b.__bal.spent || {}; b.__bal.spent[k] = (b.__bal.spent[k] || 0) + 1; }
        // 26 Nov (Leol froze in his attack picture): the fighter whose turn just ended must be back in his stance.
        // What he shows now must be what showStanding would pick; FROZEN names him, the picture and what he did.
        if (!b.battleOver) for (const p of b.units) { if (p && p.alive && !p.knock && p.sprite && p.sprite.active) { const k1 = p.sprite.texture.key; b.showStanding(p); const k2 = p.sprite.texture.key; if (k1 !== k2) { tally.frozen = (tally.frozen || 0) + 1; console.log('FROZEN', p.id, p.name, 'showed', k1, 'not', k2, 'after', p === b.__turnWho ? 'his turn: ' + (b.__turnAct || 'walk or wait') : 'someone else\'s turn', '| last:', (b.__trail || []).slice(-3).join(' > ')); } } }
        const r = st(...a);
        b.__turnWho = b.activeUnit; b.__turnInClash = !!(b.activeUnit && b.activeUnit.engagedWith); b.__turnAct = null;
        // MOVE_LOG=h1 (26 Nov bug, Sudeen cannot move): that fighter's move range at the start of every turn of his, and why it is 0
        if (process.env.MOVE_LOG && b.activeUnit && b.activeUnit.id === process.env.MOVE_LOG && !b.battleOver) { const u = b.activeUnit; const MV = w.__movement || null; const steps = b.stepsLeft(u); let reach = -1; try { reach = b.reachableCount ? b.reachableCount(u) : -1; } catch (e) {} const why = { steps, move: u.move, stepsUsed: u.stepsUsed, engaged: u.engagedWith ? u.engagedWith.id : null, stunned: !!(u.status && u.status.stunned), status: Object.keys(u.status || {}).filter((k) => u.status[k]).join(','), buff: u.status && u.status.buff && u.status.buff.id, zone: u.zone && u.zone.name, ward: u.wardOn, busy: b.busy, cine: b.inCinematic }; console.log((steps === 0 ? 'MOVE0 ' : 'MOVE  ') + 'turn ' + b.turnCount + ' ' + JSON.stringify(why)); }
        // BAL_LOG=E1 prints that fighter's every turn: round, tile, health, nearest friend and foe (why does he fall first?)
        const who = b.activeUnit; if (process.env.BAL_LOG && who && who.label === process.env.BAL_LOG) { const d = (o) => Math.abs(o.col - who.col) + Math.abs(o.row - who.row); const fr = b.units.filter((o) => o.alive && o !== who && o.side === who.side).map(d), fo = b.units.filter((o) => o.alive && o.side !== who.side).map(d); console.log('LOG', who.label, 'round', b.__bal.rounds.toFixed(1), 'at', who.col + ',' + who.row, 'hp', who.hp + '/' + who.maxHp, 'nearest friend', Math.min(...fr), 'foes within 2:', fo.filter((x) => x <= 2).length, 'within 5:', fo.filter((x) => x <= 5).length, process.env.BAL_TRAIL ? '| ' + (b.__trail || []).filter((x) => x.includes('E1')).slice(-6).join(' > ') : ''); }
        return r;
      };
      const pd = b.playDefeat.bind(b); b.playDefeat = (u, ...a) => { if (b.__bal && u && !u.__fellLogged) { u.__fellLogged = true; b.__bal.deaths.push(u.label + '@' + (b.__bal.rounds).toFixed(1)); } return pd(u, ...a); };
      const mark = (fn, what) => { if (typeof b[fn] !== 'function') return; const o = b[fn].bind(b); b[fn] = (...a) => { if (!b.__turnAct || b.__turnAct === 'walk or wait') b.__turnAct = what; return o(...a); }; };
      mark('performAttack', 'attack'); mark('castSpell', 'skill'); mark('castKingSkill', 'skill'); mark('castEnchant', 'skill'); mark('castEarthDrive', 'skill'); mark('castClap', 'skill'); mark('castElementBlast', 'skill'); mark('castShieldToss', 'skill'); mark('castPoisonArrow', 'skill'); mark('castSmokeBomb', 'skill'); mark('castDoubleHit', 'attack'); mark('performEngage', 'start a clash'); mark('useItem', 'item'); mark('digUp', 'dig');
      const ft = b.floatText.bind(b); b.floatText = (u, text, ...rest) => { if (b.__bal && typeof text === 'string') { const m = /^\+(\d+)/.exec(text); if (m) b.__bal.heal += Number(m[1]); if (text === 'Miss') b.__bal.miss++; } return ft(u, text, ...rest); };
    }
    // a short trail of what last moved bodies about, printed with any OFF TILE line
    b.__trail = [];
    // every skill and item each fighter uses, counted per battle (checklist G3: the enemies use every
    // skill they own; roadmap 18.11 and 18.15). The enemy AI calls these casts directly.
    for (const fn of ['castSpell', 'castKingSkill', 'useFreeKingAction', 'castEnchant', 'castSmokeBomb', 'castElementBlast', 'castClap', 'castEarthDrive', 'castPoisonArrow', 'castShieldToss', 'castDoubleHit', 'useItem', 'performEngage']) {
      if (b['__counted_' + fn]) continue; b['__counted_' + fn] = true; // (the scene object lives on across battles: wrap it once, or battle n would count n times)
      const orig = b[fn].bind(b);
      b[fn] = (...args) => {
        const who = args[0]; const what = fn === 'castSpell' || fn === 'castKingSkill' ? args[2] : fn === 'useFreeKingAction' ? args[1] : fn === 'useItem' ? 'item ' + args[2] + (args[1] !== args[0] ? ' (to an ally)' : '') : fn.replace('cast', '').replace('perform', '');
        if (who && who.name && !(fn !== 'castSpell' && b.__inCast)) { const key = who.name + ': ' + what[0].toLowerCase() + what.slice(1); used[key] = (used[key] || 0) + 1; }
        const was = b.__inCast; if (fn === 'castSpell' || fn === 'castKingSkill') b.__inCast = true;
        try { return orig(...args); } finally { b.__inCast = was; }
      };
    }
    for (const fn of ['knockBack', 'knockback', 'sidestep', 'playDefeat', 'moveUnit', 'castSpell', 'performEngage']) { if (typeof b[fn] !== 'function' || b['__trailed_' + fn]) continue; b['__trailed_' + fn] = true; /* wrap once: the scene lives on across battles */ const orig = b[fn].bind(b); b[fn] = (...args) => { const x = args[0]; b.__trail.push(fn + '(' + (x && x.label ? x.label : typeof x === 'string' ? x : '') + (args[1] && args[1].label ? ',' + args[1].label : '') + ')@' + Math.round(b.time.now)); return orig(...args); }; }
    // 10.51: a turn that throws half-way leaves the next fighter with no menu; print the error and where it came from
    if (!b.__turnCatch) { b.__turnCatch = true; for (const fn of ['startTurn', 'endTurn']) { const o = b[fn].bind(b); b[fn] = (...a) => { const st = (new Error().stack || '').split('\n').slice(2, 5).map((l) => l.trim().replace(/^at /, '').replace(/ \(.*$/, '')).join('<'); b.__trail && b.__trail.push(fn + '[t' + b.turnCount + ' ' + (b.activeUnit && b.activeUnit.label) + ' busy ' + b.busy + ' from ' + st + ']@' + Math.round(b.time.now)); try { return o(...a); } catch (e) { tally.turnCrash = (tally.turnCrash || 0) + 1; console.log('TURN CRASH in ' + fn + ':', (e && e.stack || String(e)).split('\n').slice(0, 6).join(' | ')); throw e; } }; } }
    // 13.55: every frame, a hero's calm turn must have at least one live button. Notes who the buttons were last drawn
    // for (and from where), so a stale menu can be traced. Printed as NO BUTTONS (frame).
    if (!b.__btnWatch) {
      b.__btnWatch = true;
      const origSet = b.setButtons.bind(b);
      b.setButtons = () => { b.__lastSet = { who: b.activeUnit && b.activeUnit.label, busy: b.busy, mode: b.mode, at: Math.round(b.time.now), from: (new Error().stack || '').split('\n').slice(2, 6).map((l) => l.trim().replace(/^at /, '').replace(/ \(.*$/, '')).join(' < ') }; return origSet(); };
      b.events.on('postupdate', () => {
        const u = b.activeUnit;
        if (!u || u.side !== 'hero' || b.busy || b.inCinematic || b.battleOver) { b.__noBtnSince = 0; return; }
        const live = [...b.slots, ...b.halves, ...b.lowHalves].some((sl) => sl.enabled);
        if (live) { b.__noBtnSince = 0; return; }
        if (!b.__noBtnSince) b.__noBtnSince = b.time.now;
        if (b.__noBtnReported !== u.label + b.turnCount) { b.__noBtnReported = u.label + b.turnCount; tally.noButtonsFrame = (tally.noButtonsFrame || 0) + 1; console.log('NO BUTTONS (frame) on', u.label, 'turn', b.turnCount, 'acted', u.hasActed, 'engaged', !!u.engagedWith, 'mode', b.mode, 'menu', b.menu && b.menu.visible, '| buttons last drawn:', JSON.stringify(b.__lastSet), '| last:', (b.__trail || []).slice(-5).join(' > ')); }
      });
    }
    // 13.54: every frame, note when a figure's body moves (where to, its tile then, what tweens hold it, a push on or
    // not), the last 6 per unit, printed with any OFF TILE line so the move that left it there can be named.
    if (!b.__moveWatch) {
      b.__moveWatch = true;
      b.events.on('postupdate', () => {
        for (const u of b.units) {
          if (!u.view || !u.view.active) continue;
          const x = Math.round(u.view.x), y = Math.round(u.view.y);
          if (u.__mx === x && u.__my === y && u.__mt === u.col + ',' + u.row) continue;
          const tw = b.tweens.getTweensOf(u.view).filter((t) => t.isPlaying && t.isPlaying()).map((t) => (t.data || []).map((d) => d.key).join('+') + (t.data && t.data[0] && t.data[0].yoyo ? '(yoyo)' : '')).join(';');
          const p = w.__grid.tileToScreen(u.col, u.row);
          (u.__moves = u.__moves || []).push(Math.round(b.time.now) + ' @' + x + ',' + y + ' tile ' + u.col + ',' + u.row + ' off ' + Math.round(x - p.x) + ',' + Math.round(y - p.y) + (u.knock ? ' KNOCK' : '') + (tw ? ' tw[' + tw + ']' : '') + (b.busy ? ' busy' : ''));
          if (u.__moves.length > 8) u.__moves.shift();
          u.__mx = x; u.__my = y; u.__mt = u.col + ',' + u.row;
        }
      });
    }
    if (!b.__engageCounted) { b.__engageCounted = true; const origEngage = b.performEngage.bind(b);
      b.performEngage = (a, t, d) => { if (a.side === 'enemy') tally.enemyEngages++; return origEngage(a, t, d); }; }
    // Gadara's Singularity (10.32): how many went off and how many were broken while charging
    if (!b.__singCounted && b.resolveSingularity) { b.__singCounted = true; const r = b.resolveSingularity.bind(b), k = b.breakChannel.bind(b);
      b.resolveSingularity = (c, d) => { tally.singularityWentOff = (tally.singularityWentOff || 0) + 1; return r(c, d); };
      b.breakChannel = (u, why) => { if (u && u.channel) tally.singularityBroken = (tally.singularityBroken || 0) + 1; return k(u, why); }; }
    const waitIdle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 6000) await sleep(5); };
    const alive = (s) => b.units.filter((u) => u.alive && u.side === s);
    const t0 = Date.now(); let lastSig = '', lastChange = Date.now(), stuck = false;
    while (!b.battleOver && Date.now() - t0 < 400000) {
      const u = b.activeUnit;
      const sig = u.label + b.turnCount + b.busy + b.mode + b.inCinematic;
      if (sig !== lastSig) {
        // where fighters stand once per turn (roadmap 14.2, the wide cavern): flank lanes, the side towers,
        // and the height a shooter or caster stands on. Keys: enemyFlank, heroTower, enemyRangedH2 and so on.
        if (process.env.FABIEN_MAP === 'cavern' && u.label + b.turnCount !== b.__posSeen) {
          b.__posSeen = u.label + b.turnCount;
          const side = u.side === 'hero' ? 'hero' : 'enemy', G = w.__grid, h = G.getHeight(u.col, u.row);
          if ((u.col <= 2 || u.col >= 8) && u.row >= 3 && u.row <= 7) tally[side + 'Flank'] = (tally[side + 'Flank'] || 0) + 1;
          if (h === 3 && u.row >= 3 && u.row <= 7) tally[side + 'Tower'] = (tally[side + 'Tower'] || 0) + 1;
          if (u.range > 1) tally[side + 'RangedH' + h] = (tally[side + 'RangedH' + h] || 0) + 1;
        }
        lastSig = sig; lastChange = Date.now();
      }
      if (Date.now() - lastChange > 7000) { stuck = true; console.log('STUCK', u.label, 'busy', b.busy, 'mode', b.mode, 'cine', b.inCinematic, 'acted', u.hasActed, 'steps', b.stepsLeft(u), 'pinned', St.isPinned(u), 'endWait', b.endTurnWaiting, 'knock', Math.round((b.knockUntil || 0) - b.time.now), 'zone', !!u.zone, 'reach', b.reachableKeys && b.reachableKeys.size, '| last:', (b.__trail || []).slice(-10).join(' > ')); break; }
      if (u.side === 'hero' && !b.busy && !b.inCinematic) {
        // every figure must be standing on the middle of its tile (roadmap 13.47): checked twice,
        // a moment apart, so a body still settling is not counted
        const off = () => b.units.filter((x) => x.alive && x.view && x.view.active && !x.knock).map((x) => { const p = w.__grid.tileToScreen(x.col, x.row); return { x, d: Math.hypot(x.view.x - p.x, x.view.y - p.y) }; }).filter((o) => o.d > 2);
        // 10.51: each check below waits a moment and looks again; the turn may have passed meanwhile (a fighter walking or
        // being pushed in the NEXT turn is not off its tile, and the next fighter's menu is not this one's), so each
        // second look happens only if it is still this hero's calm turn
        const same = () => b.activeUnit === u && !b.busy && !b.inCinematic && !b.battleOver && !b.endTurnWaiting;
        if (off().length) { await sleep(700); for (const o of (same() ? off() : [])) { tally.offTile = (tally.offTile || 0) + 1; console.log('OFF TILE', o.x.label, 'by', o.d.toFixed(1), 'px at', o.x.col + ',' + o.x.row, 'turn', b.turnCount, '| last:', (b.__trail || []).slice(-6).join(' > ')); console.log('  moves of ' + o.x.label + ': ' + (o.x.__moves || []).join(' | ')); const p = w.__grid.tileToScreen(o.x.col, o.x.row); o.x.view.setPosition(p.x, p.y); } }
        // every figure must be drawn at its picture's size (roadmap 1.54): the sideways scale of the sprite is what the
        // unit says it is. A figure that is bigger or smaller than that has lost track of its picture's scale.
        const sizeOff = () => b.units.filter((x) => x.alive && x.sprite && x.sprite.active && !x.knock && !x.squash && !b.inCinematic).map((x) => ({ x, r: x.sprite.scaleX / x.artScale })).filter((o) => Math.abs(o.r - 1) > 0.04);
        if (sizeOff().length) { await sleep(500); for (const o of (same() ? sizeOff() : [])) { tally.sizeOff = (tally.sizeOff || 0) + 1; console.log('SIZE OFF', o.x.label, 'x' + o.r.toFixed(2), 'showing', o.x.sprite.texture.key, 'frameScale', o.x.frameScale, 'turn', b.turnCount, '| last:', (b.__trail || []).slice(-6).join(' > ')); } }
        // a hero's turn with every button greyed out is a stuck screen for a real player
        if (same() && [...b.slots, ...b.halves, ...b.lowHalves].every((sl) => !sl.enabled)) /* End turn sits in the low half row */ { tally.noButtons = (tally.noButtons || 0) + 1; const at = { mode: b.mode, spell: b.selectedSpell, item: b.selectedItem, last: b.__lastSet }; await new Promise((r) => setTimeout(r, 50)); const liveNext = [...b.slots, ...b.halves, ...b.lowHalves].some((sl) => sl.enabled); console.log('NO BUTTONS on', u.label, 'engaged', !!u.engagedWith, 'acted', u.hasActed, JSON.stringify(at), 'live a frame later:', liveNext, 'menu visible', b.menu && b.menu.visible, 'turn', b.turnCount, 'channel', !!u.channel, 'stunned', !!(u.status && u.status.stun), '| last:', (b.__trail || []).slice(-12).join(' > ')); }
        if (!same()) { await sleep(10); continue; } // (10.51: the turn passed while a check waited: start again with whoever acts now; the sleep lets the game run)
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
          const mark = u.spells.includes('haunt') && St.canAfford(u, 'haunt') ? foes.filter((f) => dist(u, f) <= 4 && !St.isDisoriented(f) && !f.hidden).sort((a, c) => c.hp - a.hp)[0] : null;
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
    console.log(`battle ${n}: ${r} after ${b.turnCount} turns (${b.__bal.rounds.toFixed(1)} rounds) | fell ${b.__bal.deaths.join(' ')} | healed ${b.__bal.heal} | misses ${b.__bal.miss} | spent ${JSON.stringify(b.__bal.spent || {})} | damage dealt ${JSON.stringify(b.__dmg)} | attacks ${JSON.stringify(b.__acts)} | hp left ${b.units.map(u => u.label + ':' + (u.alive ? u.hp : 'x')).join(' ')}`);
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
