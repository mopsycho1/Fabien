// The computer uses each fighter's whole kit (roadmap 13.69, 13.77, 13.80; Suleiman 22 Nov 16:50, 17:11, 19:47:
// "Kofi should heal those who are low", "the computer should care about its allies' state",
// "all Layra does as an enemy is cast Lightning"). Mixed into BattleScene like the kings' and the new classes' moves.
// The play style of each fighter (src/data/aiStyles.json, src/aiStyle.js) sets how hurt a friend must be before
// it helps, who it strikes and how it walks. Works the same on either side.
//
//   styleWalk(unit, hiddenAt)    where the style walks this turn (falling back, staying in reach of a hurt friend,
//                                 going for the foe hurting a friend), or null for the usual walk
//   preWalkKit(unit)             a move that is its walk and its blow at once (Gaha's Lunge and a Sonic Javelin
//                                 through two foes, Sudeen's Intercept on the foe hurting a friend), before walking
//   styleKitChoice(unit, seen)   after the walk: Layra's Verses, Slow, Husk and Meditate; Sudeen's Herbs and
//                                 Intercept; Gaha's Spear Throw (and its Verse forms). Returns { id, target } or null.
import spells from './data/spells.json';
import { distance, getDamage, hasClearShot, isDistracted } from './combat.js';
import { canAfford, activeMove, buffOf, hexOf, moveOf, isPoisoned, isBurning, isOffBalance } from './status.js';
import { chooseMoveTile } from './enemyAi.js';
import { styleOf, ratio, hurtFriends, guardFoe, supportTile, fallBackTile, sortTargets } from './aiStyle.js';
import { isInsideGrid } from './grid.js';

export const aiKitMethods = {
  // The foes the computer can see (a hidden one only as its decoy), alive.
  aiFoes(unit) {
    return this.enemyEyes().filter((t) => t.alive && t.side !== unit.side && !t.isDecoy);
  },
  aiFriends(unit) {
    return this.units.filter((a) => a.alive && !a.isDecoy && a.side === unit.side);
  },

  // ---------- walking by style ----------
  styleWalk(unit, hiddenAt) {
    if (unit.engagedWith) return null;
    const style = styleOf(unit);
    const eyes = this.enemyEyes();
    const blocked = (c, r) => this.isBlocked(c, r);
    const foes = this.aiFoes(unit);
    // a kill it can take this turn comes before anything else (it walks the usual way to it)
    const kill = foes.some((f) => distance(unit, f) <= moveOf(unit) + (unit.range || 1) && getDamage(unit, f) >= f.hp);
    if (kill) return null;
    // hurt: fall back to its friends (not a shooter: it keeps its distance already, enemyAi.js)
    if (unit.range <= 1 || style.name === 'support') {
      const back = fallBackTile(unit, eyes, blocked);
      if (back) { unit.aiNote = 'fall back'; return back; }
    }
    if (style.name === 'support') {
      const reach = this.supportReach(unit);
      if (reach > 0) {
        const t = supportTile(unit, eyes, blocked, reach);
        if (t) { unit.aiNote = 'to a hurt friend'; return t; }
      }
    }
    if (style.name === 'protector') {
      const g = guardFoe(unit, eyes, style.careAt);
      if (g) {
        const t = chooseMoveTile(unit, eyes, hiddenAt, [g.foe]);
        unit.aiNote = 'guard ' + g.friend.name;
        return t || { stay: true };
      }
      // Herbs ready and a friend at half health or less: walk into Herbs reach of it
      if (canAfford(unit, 'herbs') && unit.spells.includes('herbs')) {
        const t = supportTile(unit, eyes, blocked, spells.herbs.range, moveOf(unit));
        if (t && hurtFriends(unit, eyes, 0.5).some((a) => a !== unit)) { unit.aiNote = 'to a hurt friend'; return t; }
      }
    }
    return null;
  },

  // How far its heals and blessings reach (0 when none is ready): a support walks to within this of a hurt friend
  supportReach(unit) {
    let reach = 0;
    for (const id of ['infuse', 'stone', 'swiftness', 'healingWind', 'herbs']) {
      if (!unit.spells.includes(id) && !(id === 'healingWind' && unit.spells.includes('swiftness'))) continue;
      const sp = spells[id];
      if ((unit.mp || 0) < (sp.mp || 0)) continue;
      if (id !== 'healingWind' && !canAfford(unit, id)) continue;
      reach = Math.max(reach, sp.range || 0);
    }
    return reach;
  },

  // ---------- before the walk ----------
  preWalkKit(unit) {
    if (unit.engagedWith || unit.hasActed) return null;
    const foes = this.aiFoes(unit);
    if (!foes.length) return null;
    // Gaha: a Sonic Javelin (his throw under Swiftness) through two or more foes in a line
    if (unit.spells.includes('spearThrow')) {
      const id = activeMove(unit, 'spearThrow');
      const sp = spells[id];
      if (sp.kind === 'javelin' && canAfford(unit, id)) {
        let best = null;
        for (const t of foes) {
          if (distance(unit, t) > this.spellReach(unit, t, sp)) continue;
          const n = this.javelinLine(unit, t, sp).hits.length;
          if (!best || n > best.n) best = { t, n };
        }
        if (best && best.n >= 2) return { id, target: best.t };
      }
      // the Lunge: his walk and his blow at once, harder for each tile run (a foe 3 or 4 tiles off in a line)
      if (unit.spells.includes('lunge') && canAfford(unit, 'lunge') && !foes.some((f) => distance(unit, f) <= unit.range)) {
        const marks = foes.filter((t) => this.lungeSpot(unit, t, spells.lunge));
        const pick = this.styleSort(unit, marks)[0];
        if (pick) return { id: 'lunge', target: pick };
      }
    }
    // Sudeen: Intercept (a charge that locks the foe in a clash with him) on the foe hurting a friend
    if (unit.spells.includes('intercept')) {
      const id = activeMove(unit, 'intercept');
      const g = guardFoe(unit, this.enemyEyes(), styleOf(unit).careAt);
      if (g && canAfford(unit, id) && !g.foe.isDecoy && this.chargeTile(unit, g.foe, spells[id])) return { id, target: g.foe };
    }
    return null;
  },

  // The foes in the order this fighter's style wants them (a kill first, then an opening, then its focus)
  styleSort(unit, targets) {
    const opening = (t) => (t.isDecoy ? 0 : (isOffBalance(t) ? 2 : 0) + (isDistracted(t, unit) ? 1 : 0));
    return sortTargets(unit, targets, this.enemyEyes(), (t) => (t.isDecoy ? 0 : getDamage(unit, t)), opening);
  },

  // ---------- after the walk ----------
  styleKitChoice(unit, seen) {
    if (unit.engagedWith || unit.hasActed) return null;
    if (unit.job === 'sage') return this.sageChoice(unit, seen);
    if (unit.spells.includes('herbs') || unit.spells.includes('intercept')) {
      const g = this.guardianChoice(unit);
      if (g) return g;
    }
    if (unit.spells.includes('spearThrow')) return this.spearChoice(unit, seen);
    return null;
  },

  // Sudeen: Herbs on the neediest friend in reach at half health or less (himself at 40 percent), then Intercept
  // on the foe hurting a friend (it frees a friend locked in a clash with it)
  guardianChoice(unit) {
    if (unit.spells.includes('herbs') && canAfford(unit, 'herbs')) {
      const sp = spells.herbs;
      const hurt = hurtFriends(unit, this.units, 0.5)
        .filter((a) => (a !== unit || ratio(a) <= 0.4) && distance(unit, a) <= this.spellReach(unit, a, sp) && !a.engagedWith);
      if (hurt.length) return { id: 'herbs', target: hurt[0] };
    }
    const pre = this.preWalkKit(unit);
    if (pre && pre.id !== 'lunge') return pre;
    return null;
  },

  // Gaha after his walk: nobody in spear reach, so a throw (or its Verse form) at the foe his style wants
  spearChoice(unit, seen) {
    const pre = this.preWalkKit(unit);
    if (pre && pre.id !== 'lunge') return pre; // a javelin through two
    const foes = seen.filter((t) => t.alive && t.side !== unit.side && !t.isDecoy);
    if (foes.some((f) => distance(unit, f) <= unit.range)) return null; // a foe in reach: his own blow
    const id = activeMove(unit, 'spearThrow');
    const sp = spells[id];
    if (!canAfford(unit, id)) return null;
    const marks = foes.filter((t) => distance(unit, t) <= this.spellReach(unit, t, sp) && distance(unit, t) >= 2 &&
      (sp.kind !== 'dive' || this.sweepSpot(unit, t)) && (sp.kind !== 'throw' || hasClearShot(unit, t)));
    const pick = this.styleSort(unit, marks)[0];
    return pick ? { id, target: pick } : null;
  },

  // Layra, the support (13.80): she reads her friends before she casts.
  //  1. Husk away when a foe is next to her and she is at half health or less, or two foes are next to her
  //  2. Stone on a hurt friend (70 percent or less) that a foe is striking, so it takes less
  //  3. Swiftness on herself when a friend is hurt (60 percent or less), with the MP for Healing Wind after it
  //     (under Swift her Attack is Healing Wind, which the enemy turn already uses on the most hurt one)
  //  4. Slow on a heavy hitter (attack 8 or more) able to reach a friend next turn, when she keeps 3 MP for a Verse
  //  5. Fury on the hardest hitter of hers in the fight (on herself, so her Lightning becomes Wildfire, when
  //     nobody else is in the fight)
  //  6. Meditate with too little MP for a Verse and no foe able to reach her next turn
  // After a skill that was not an emergency she strikes with her next turn (aiStrikeNext), so she still fights.
  sageChoice(unit, seen) {
    const style = styleOf(unit);
    const foes = seen.filter((t) => t.alive && t.side !== unit.side && !t.isDecoy);
    const friends = this.aiFriends(unit);
    const ready = (id) => unit.spells.includes(id) && canAfford(unit, id);
    const inReach = (a, id) => distance(unit, a) <= this.spellReach(unit, a, spells[id]) && this.canSee(unit, a);
    const struck = (a) => !!a.engagedWith || foes.some((f) => distance(f, a) <= Math.max(1, f.range || 1));
    const adjacent = foes.filter((f) => distance(unit, f) === 1);
    const emergency = friends.some((a) => ratio(a) <= 0.4);
    const choose = (id, target, urgent = false) => { unit.aiStrikeNext = !urgent; return { id, target }; };
    // 1. Husk
    if (ready('husk') && adjacent.length && (ratio(unit) <= 0.5 || adjacent.length >= 2)) {
      const tile = this.huskTile(unit, foes);
      if (tile) return choose('husk', tile, true);
    }
    if (unit.aiStrikeNext && !emergency && foes.some((f) => distance(unit, f) <= this.spellReach(unit, f, { range: unit.range }))) {
      unit.aiStrikeNext = false; // her turn to strike
      return null;
    }
    unit.aiStrikeNext = false;
    // 2. Stone on a friend being struck
    if (ready('stone')) {
      const a = hurtFriends(unit, friends, style.careAt).filter((x) => !buffOf(x) && struck(x) && inReach(x, 'stone'))[0];
      if (a) return choose('stone', a, ratio(a) <= 0.4);
    }
    // 3. Swiftness on herself, for Healing Wind next
    if (ready('swiftness') && !buffOf(unit) && (unit.mp || 0) >= spells.swiftness.mp + spells.healingWind.mp) {
      const hurt = hurtFriends(unit, friends, 0.6).filter((a) => distance(unit, a) <= spells.healingWind.range + moveOf(unit) || isPoisoned(a) || isBurning(a));
      if (hurt.length) return choose('swiftness', unit, true);
    }
    // 4. Slow on the hardest hitter about to reach a friend (keeping 3 MP for a Verse)
    if (ready('slow') && (unit.mp || 0) - spells.slow.mp >= 3) {
      const threat = foes.filter((f) => !hexOf(f) && inReach(f, 'slow') && friends.some((a) => distance(f, a) <= moveOf(f) + (f.range || 1)))
        .sort((a, b) => b.attack - a.attack)[0];
      if (threat && threat.attack >= 8) return choose('slow', threat); // (a heavy hitter only: 7 sent her Slowing every other turn)
    }
    // 5. Fury on the hardest hitter in the fight (a heavy hitter gets it twice over: affinity)
    if (ready('fury')) {
      const fight = friends.filter((a) => a !== unit && !buffOf(a) && inReach(a, 'fury') && struck(a) && (a.range || 1) <= 2)
        .sort((a, b) => b.attack * this.furyTimes(a) - a.attack * this.furyTimes(b));
      if (fight.length) return choose('fury', fight[0]);
      if (!buffOf(unit) && (unit.mp || 0) >= 6 && foes.some((f) => distance(unit, f) <= unit.range + 1)) return choose('fury', unit);
    }
    // 6. Meditate
    if (ready('meditate') && (unit.mp || 0) < spells.stone.mp && !foes.some((f) => distance(unit, f) <= moveOf(f) + (f.range || 1))) return choose('meditate', unit, true);
    return null;
  },
  furyTimes(a) {
    const af = spells.fury.affinity;
    return af && af.jobs.includes(a.job) ? af.times : 1;
  },
  // Where her Husk slips her to: the free tile in reach furthest from the foes (up to 5 counts), nearest a friend
  huskTile(unit, foes) {
    const range = spells.husk.range;
    const friends = this.aiFriends(unit).filter((a) => a !== unit);
    const room = (t) => Math.min(5, ...foes.map((f) => distance(t, f)));
    const near = (t) => (friends.length ? Math.min(...friends.map((a) => distance(t, a))) : 0);
    let best = null;
    for (let col = unit.col - range; col <= unit.col + range; col++) {
      for (let row = unit.row - range; row <= unit.row + range; row++) {
        const t = { col, row };
        const d = distance(unit, t);
        if (d === 0 || d > range || !isInsideGrid(col, row) || this.isBlocked(col, row)) continue;
        if (!best || room(t) > room(best) || (room(t) === room(best) && near(t) < near(best))) best = t;
      }
    }
    return best && room(best) > room(unit) ? best : null;
  },
};
