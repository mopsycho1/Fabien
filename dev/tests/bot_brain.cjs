// The smarter test player (roadmap 18.15, 14 Nov). bot.cjs calls smartTurn for a hero's turn
// outside a clash and smartStance inside one. It plays the way a careful person would:
//   - items: balm when hurt, bitter leaf when poisoned or burning, spirit water when out of MP,
//     kola nut when Poise is empty, and it digs up what is buried next to it
//   - Layra: Husk when a foe stands next to her, Meditate when she is out of MP, Fury (or
//     Swiftness for Gaha) on a fighter about to strike, the right Verse for a friend in a clash
//   - Sudeen: Herbs on the most hurt friend in reach
//   - everyone picks the target that matters: a kill first, then the archer, then a foe who is
//     busy in a clash or Off-Balance
//   - shooters stand on high ground and away from fists; fighters walk real paths (bridges)
//     towards the archer when no one is in reach
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);

module.exports = function makeBrain(w, tally) {
  const E = w.__engagement, St = w.__status, G = w.__grid, C = w.__combat, It = w.__items;
  const note = (k) => { tally[k] = (tally[k] || 0) + 1; };

  // Walking distance from a tile to every tile (pots block, fighters do not: they move).
  const walkMap = (b, u, from) => {
    const climb = (St.moveRules(u).climb === undefined) ? 1 : St.moveRules(u).climb;
    const out = { [from.col + ',' + from.row]: 0 }; let front = [from];
    for (let step = 1; front.length && step < 40; step++) {
      const next = [];
      for (const t of front) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = t.col + dc, r = t.row + dr, k = c + ',' + r;
        if (!G.isInsideGrid(c, r) || out[k] !== undefined || b.potAt(c, r)) continue;
        if (G.getHeight(c, r) - G.getHeight(t.col, t.row) > climb) continue;
        out[k] = step; next.push({ col: c, row: r });
      }
      front = next;
    }
    return out;
  };

  return {
    // ---------- inside a clash ----------
    // The stance with the best expected score against what this foe usually picks: its class
    // habits (weights 5, 2, 1 like the enemy's own chooser), and 4 times in 10 the counter to
    // my last stance. Break away when badly hurt and losing.
    smartStance(b, u) {
      const foe = u.engagedWith; const rules = E.engagementRules;
      if (u.hp < u.maxHp * 0.35 && E.momentumOf(u) < 0) return { stance: 'break' };
      if (!E.isMelee(u) && E.momentumOf(u) <= 0) return { stance: 'break' }; // a caster has no business in a clash
      const ids = ['press', 'guard', 'slip'];
      const wt = { strong: 5, average: 2, weak: 1 };
      const total = ids.reduce((s, x) => s + wt[E.stanceAffinity(foe, x)], 0);
      const read = u.stance && u.stance !== 'break' ? rules.aiReadChance / 100 : 0;
      const pFoe = {}; for (const x of ids) pFoe[x] = (1 - read) * wt[E.stanceAffinity(foe, x)] / total + (read && E.counterTo(u.stance) === x ? read : 0);
      let best = null, bestV = -99;
      for (const s of ids) {
        let v = Math.ceil(E.stanceRating(u, s) * rules.statWeight) + (rules.affinityBonus[E.stanceAffinity(u, s)] || 0);
        for (const x of ids) v += pFoe[x] * (Math.max(0, E.matchup(s, x)) - Math.max(0, E.matchup(x, s)) - Math.ceil(E.stanceRating(foe, x) * rules.statWeight) - (rules.affinityBonus[E.stanceAffinity(foe, x)] || 0));
        v += Math.random() * 0.8; // not perfectly predictable
        if (v > bestV) { bestV = v; best = s; }
      }
      // Empower when it is close or the clash is about to be decided
      const empower = E.poiseOf(u) >= 1 && (bestV < 1.5 || Math.abs(E.momentumOf(u)) >= 2) && Math.random() < 0.7;
      return { stance: best, empower };
    },

    // ---------- a turn outside a clash ----------
    async smartTurn(b, u, waitIdle) {
      const alive = (s) => b.units.filter((x) => x.alive && x.side === s);
      const foes = alive('enemy').filter((f) => !f.hidden);
      const friends = alive('hero');
      if (!foes.length) return;
      const nearFoe = (t) => Math.min(...foes.map((f) => dist(t, f)));
      const isArcher = (f) => !!f.closeWeapon;
      const cast = async (id, target, twiceOnSelf) => {
        if (!u.spells.includes(id) || !St.canAfford(u, id)) return false;
        b.onSpellButton(); b.chooseSpell(id);
        if (twiceOnSelf) { b.chooseSpell(id); }
        else if (b.mode === 'spellTarget' && b.targetsInRange.includes(target)) { b.handleTap(target.col, target.row); b.handleTap(target.col, target.row); }
        await waitIdle();
        if (!u.hasActed) { b.cancelMode(); return false; }
        used(id); return true;
      };
      const used = (id) => note('bot ' + id);
      const useItem = async (id, target) => {
        if (!(u.bag && u.bag[id] > 0) || !It.itemHelps(target, id)) return false;
        b.onItemsButton(); b.chooseItem(id);
        if (target === u) b.chooseItem(id); else { b.handleTap(target.col, target.row); b.handleTap(target.col, target.row); }
        await waitIdle();
        if (!u.hasActed) { b.cancelMode(); return false; }
        note('bot item'); return true;
      };
      const walkTo = async (c, r) => {
        if (c === u.col && r === u.row) return;
        b.cancelMode(); b.onMoveButton();
        if (b.reachableKeys.has(c + ',' + r)) { b.handleTap(c, r); await waitIdle(); } else b.cancelMode();
      };
      // tiles it can stand on this turn: where it is, and where it can walk
      const standTiles = () => {
        b.cancelMode(); b.onMoveButton();
        const out = [{ col: u.col, row: u.row }];
        for (const k of b.reachableKeys) { const [c, r] = k.split(',').map(Number); out.push({ col: c, row: r }); }
        b.cancelMode();
        return out;
      };
      // after acting, a shooter uses the steps it has left to get away from fists
      const stepBack = async () => {
        if (b.battleOver || E.isMelee(u) || u.engagedWith || b.stepsLeft(u) <= 0) return;
        const tiles = standTiles(); if (tiles.length < 2) return;
        const safe = (t) => Math.min(4, ...foes.filter((f) => f.alive && !isArcher(f)).map((f) => dist(t, f))) * 3 + G.getHeight(t.col, t.row) + (nearFoe(t) <= u.range ? 1 : 0);
        const best = tiles.sort((a, c) => safe(c) - safe(a))[0];
        if (safe(best) > safe(u) + 1) { await walkTo(best.col, best.row); note('bot stepBack'); }
      };

      // ----- 1. look after yourself and the one next to you -----
      const hurtFrac = u.hp / u.maxHp;
      if ((St.isPoisoned(u) || St.isBurning(u)) && hurtFrac < 0.8 && await useItem('bitterLeaf', u)) return;
      if (u.spells.includes('herbs') && St.canAfford(u, 'herbs')) {
        const hurt = friends.filter((f) => dist(u, f) <= 2 && f.hp <= f.maxHp * 0.55).sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
        if (hurt && (hurt === u ? await cast('herbs', u, true) : await cast('herbs', hurt))) return;
      }
      if (hurtFrac <= 0.5 && await useItem('sheaBalm', u)) return;
      const mate = friends.find((f) => f !== u && dist(u, f) === 1 && f.hp <= f.maxHp * 0.4);
      if (mate && hurtFrac > 0.5 && await useItem('sheaBalm', mate)) return;
      if (u.maxMp > 0 && u.mp < 3 && await useItem('spiritWater', u)) return;
      if (E.isMelee(u) && E.poiseOf(u) === 0 && nearFoe(u) <= 2 && await useItem('kolaNut', u)) return;

      // ----- 2. the caster's own tricks -----
      if (u.spells.includes('husk')) {
        const fists = foes.filter((f) => !isArcher(f) && dist(u, f) === 1);
        if (fists.length && St.canAfford(u, 'husk')) {
          b.onSpellButton(); b.chooseSpell('husk');
          if (b.mode === 'huskTile') {
            const tiles = [...b.reachableKeys].map((k) => k.split(',').map(Number)).map(([c, r]) => ({ col: c, row: r }));
            const best = tiles.sort((a, c) => (nearFoe(c) * 2 + G.getHeight(c.col, c.row)) - (nearFoe(a) * 2 + G.getHeight(a.col, a.row)))[0];
            if (best) { b.handleTap(best.col, best.row); b.handleTap(best.col, best.row); await waitIdle(); }
          }
          if (u.hasActed) { used('husk'); return; }
          b.cancelMode();
        }
      }
      if (u.spells.includes('meditate') && u.mp < 3 && nearFoe(u) >= 3 && St.canAfford(u, 'meditate')) {
        b.chooseSpell('meditate'); b.chooseSpell('meditate'); await waitIdle();
        if (u.hasActed) { used('meditate'); await stepBack(); return; }
        b.cancelMode();
      }
      if (!E.isMelee(u) && u.spells.length) {
        // a friend in a clash gets the Verse that helps the stance they fight with
        const inClash = friends.find((f) => f !== u && f.engagedWith && !St.buffOf(f) && dist(u, f) <= 3);
        if (inClash) {
          const id = u.spells.includes('infuse') ? 'infuse' : E.styleOf(inClash) === 'evasion' ? 'swiftness' : E.styleOf(inClash) === 'overpower' ? 'fury' : 'stone';
          if (await cast(id, inClash)) { await stepBack(); return; }
        }
        // Infuse heals too: a hurt friend in reach
        if (u.spells.includes('infuse')) {
          const hurt = friends.filter((f) => dist(u, f) <= 3 && f.hp <= f.maxHp * 0.6).sort((a, c) => a.hp - c.hp)[0];
          if (hurt && St.cooldownOf(u, 'infuse') === 0 && await cast('infuse', hurt)) { await stepBack(); return; }
        }
        // Fury (Swiftness for Gaha: Sonic Javelin) on a fighter with a foe in front of them
        const striker = friends.filter((f) => f !== u && E.isMelee(f) && !f.engagedWith && !St.buffOf(f) && dist(u, f) <= 3 && nearFoe(f) <= 3)
          .sort((a, c) => c.attack - a.attack)[0];
        if (striker && u.spells.includes('fury') && u.mp >= 6 && Math.random() < 0.6) {
          if (await cast('fury', striker)) { await stepBack(); return; }
        }
      }

      // ----- 3. choose where to stand and whom to hit -----
      const dmgTo = (f, from) => { try { return C.getDamage(Object.assign(Object.create(Object.getPrototypeOf(u)), u, from), f); } catch (e) { return u.attack; } };
      const worth = (f, from) => {
        const d = dmgTo(f, from); let v = 0;
        if (f.hp <= d) v += 100;                       // a kill
        if (isArcher(f)) v += 30;                      // she does the most damage from far away
        if (f.engagedWith && f.engagedWith !== u) v += 10; // busy in a clash: easier to hit
        if (St.isOffBalance(f)) v += 8;
        v += (1 - f.hp / f.maxHp) * 20 + d;
        return v;
      };
      const tiles = standTiles();
      const melee = E.isMelee(u);
      let plan = null;
      for (const t of tiles) {
        const ghost = Object.assign(Object.create(Object.getPrototypeOf(u)), u, { col: t.col, row: t.row });
        const marks = foes.filter((f) => C.inReach(ghost, f));
        if (!marks.length) continue;
        const best = marks.sort((a, c) => worth(c, t) - worth(a, t))[0];
        let v = worth(best, t);
        const fists = foes.filter((f) => !isArcher(f) && dist(t, f) === 1).length;
        if (melee) v -= Math.max(0, fists - 1) * 6;   // do not walk into two of them
        else v += G.getHeight(t.col, t.row) * 4 + Math.min(4, Math.min(...foes.filter((f) => !isArcher(f)).map((f) => dist(t, f)), 4)) * 5 - fists * 12; // high ground, away from fists
        if (t.col === u.col && t.row === u.row) v += 1;
        if (!plan || v > plan.v) plan = { v, t, target: best };
      }
      // skills that reach further than a walk and a hit
      if (melee && !foes.some((f) => dist(u, f) <= 1)) {
        for (const id of ['intercept', 'spearThrow']) {
          if (!u.spells.includes(id) || !St.canAfford(u, id) || St.cooldownOf(u, id) > 0) continue;
          const inRange = foes.filter((f) => id === 'intercept' ? b.chargeTile(u, f, { range: 4 }) : dist(u, f) <= 3);
          const t = inRange.sort((a, c) => worth(c, u) - worth(a, u))[0];
          // worth it for the archer or a kill, or when a plain hit is not on
          if (t && (!plan || isArcher(t) || t.hp <= u.attack) && await cast(id, t)) return;
        }
      }
      if (plan) {
        await walkTo(plan.t.col, plan.t.row);
        // Kofi marks a healthy foe with Haunt before bolting it
        if (u.spells.includes('haunt') && St.canAfford(u, 'haunt') && !St.isPoisoned(plan.target) && plan.target.hp > plan.target.maxHp * 0.6 && dist(u, plan.target) <= 4 && Math.random() < 0.5 && await cast('haunt', plan.target)) { await stepBack(); return; }
        // a fighter starts a clash only where it is the stronger one and a friend can use it
        const pins = melee ? E.engageTargets(u, b.units).filter((p) => p === plan.target && E.contestEdge(u, p) >= 1 && friends.some((f) => f !== u && dist(f, p) <= 4)) : [];
        if (pins.length && plan.target.hp > 12 && Math.random() < 0.3) {
          b.onEngageButton(); b.handleTap(pins[0].col, pins[0].row); b.handleTap(pins[0].col, pins[0].row); await waitIdle();
          if (u.hasActed || u.engagedWith) { tally.engages++; return; }
          b.cancelMode();
        }
        b.onAttackButton();
        if (b.mode === 'attack' && b.targetsInRange.length) {
          const t = b.targetsInRange.includes(plan.target) ? plan.target : [...b.targetsInRange].sort((a, c) => worth(c, u) - worth(a, u))[0];
          b.handleTap(t.col, t.row); b.handleTap(t.col, t.row); tally.attacks++; await waitIdle();
        } else b.cancelMode();
        await stepBack();
        return;
      }

      // ----- 4. no one in reach: dig, bless, or close in -----
      if (b.sitesNear(u).length && nearFoe(u) >= 2) { b.onItemsButton(); b.digHere(); await waitIdle(); if (u.hasActed) { note('bot dig'); return; } }
      // walk towards the archer if she is the nearest worry, else the nearest foe, by real paths
      const goal = (melee ? foes.slice().sort((a, c) => (isArcher(c) - isArcher(a)) || dist(u, a) - dist(u, c)) : foes.slice().sort((a, c) => dist(u, a) - dist(u, c)))[0];
      const map = walkMap(b, u, goal);
      const want = melee ? 1 : Math.min(u.range, 3);
      const score = (t) => { const d = map[t.col + ',' + t.row]; return (d === undefined ? 99 : Math.abs(d - want)) * 10 - (melee ? 0 : G.getHeight(t.col, t.row) * 3) + (melee ? 0 : foes.filter((f) => !isArcher(f) && dist(t, f) <= 1).length * 30); };
      const best = tiles.slice().sort((a, c) => score(a) - score(c))[0];
      if (best && score(best) < score(u)) await walkTo(best.col, best.row);
      // nothing to hit: a Verse on a fighter going in, or rest
      if (!u.hasActed && u.spells.includes('swiftness') && u.mp >= 6) {
        const runner = friends.filter((f) => f !== u && E.isMelee(f) && !St.buffOf(f) && dist(u, f) <= 3).sort((a, c) => c.move - a.move)[0];
        if (runner && await cast(E.styleOf(runner) === 'evasion' ? 'swiftness' : 'stone', runner)) return;
      }
      if (!u.hasActed && u.spells.includes('meditate') && u.mp <= u.maxMp - 6 && St.canAfford(u, 'meditate')) { b.chooseSpell('meditate'); b.chooseSpell('meditate'); await waitIdle(); if (u.hasActed) used('meditate'); else b.cancelMode(); }
    },
  };
};
