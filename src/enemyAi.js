import { getReachableTiles } from './movement.js';
import { distance, hasClearShot, shootsProjectiles } from './combat.js';
import { moveOf, moveRules } from './status.js';
import { getHeight, isInsideGrid } from './grid.js';
import terrain from './data/terrain.json';

// Walking distance to a foe (roadmap 14.2). On the wide cavern a foe can be 3 tiles away in a
// straight line but 9 steps away on foot (round the water, up a bridge). Straight-line distance
// sent enemies into the water below the platform. walkMapTo(foe) gives, for every tile, how
// many steps it takes to walk from that tile to the foe, using the same climbing rule as
// walking (stepping up at most "climb" levels, down is always fine). Fixed things that block
// (pots, spikes) count; fighters do not, since they move. A tile with no way there is missing.
function walkMapTo(foe, climb, blocked) {
  const out = new Map([[foe.col + ',' + foe.row, 0]]);
  let front = [foe];
  for (let step = 1; front.length > 0 && step < 60; step++) {
    const next = [];
    for (const t of front) {
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const col = t.col + dc;
        const row = t.row + dr;
        const key = col + ',' + row;
        if (!isInsideGrid(col, row) || out.has(key) || blocked(col, row)) continue;
        // we are walking backwards from the foe: the step goes from (col, row) up to t
        if (getHeight(t.col, t.row) - getHeight(col, row) > climb) continue;
        out.set(key, step);
        next.push({ col, row });
      }
    }
    front = next;
  }
  return out;
}

// How many tiles short of reaching foe "o" a unit standing on tile t is. Inside its reach the
// old straight-line rule holds; outside, the steps on foot count (with no way there at all,
// the straight line plus a big penalty, so it still drifts the right way).
function walkGap(t, o, range, walk) {
  const d = Math.abs(t.col - o.col) + Math.abs(t.row - o.row);
  if (d <= range) return 0;
  const w = walk.get(t.col + ',' + t.row);
  if (w === undefined) return d - range + 12;
  return Math.max(1, w - range);
}

// Decides where an enemy should walk this turn.
// It returns a tile like { col: 2, row: 4 }, or null if the enemy should
// stay where it is.
//
// The idea:
//  1. Look at every tile we can walk to (and staying put), and pick the one
//     that gets us closest to being able to attack someone. Among equally good
//     tiles, pick the one that needs the fewest steps.
//  2. Casters (units with spells, like the Sage) are fragile and dangerous, so
//     they are worth a detour: reaching a caster counts as CASTER_DETOUR tiles
//     better than reaching anyone else. So an enemy already next to a Guardian
//     will still step round it to get at a Sage close behind.
// extraBlocked(col, row) is optional: other things in the way, like a decoy's swarm.
export const CASTER_DETOUR = 2;

// An archer keeps its distance (Suleiman, 29 Oct): "you're supposed to be
// struggling to get to the archer". Among tiles it can shoot from, it picks
// the one furthest from every foe, up to this many tiles (further than this
// counts the same, so it doesn't run to a corner for nothing).
export const KEEP_AWAY = 4;

// True for units that cast spells: the ones enemies most want to reach.
// (Fighters with skills like Herbs or Spear Throw are not casters: casters use MP.)
export function isCaster(unit) {
  return unit.attackType === 'magic' || (unit.maxMp || 0) > 0;
}

export function chooseMoveTile(unit, units, extraBlocked = () => false) {
  const opponents = units.filter((other) => other.alive && other.side !== unit.side);
  if (opponents.length === 0) return null;

  // Units standing on a tile block it
  const isBlocked = (col, row) =>
    extraBlocked(col, row) || units.some((other) => other.alive && other.col === col && other.row === row);

  const tiles = getReachableTiles(unit.col, unit.row, moveOf(unit), isBlocked, moveRules(unit));

  // How many tiles short of attacking we would be if we stood on this tile.
  // 0 means we could attack someone from here; a caster counts as nearer.
  // An archer in range but behind a higher block has no shot: it counts as 1 short.
  const shooter = shootsProjectiles(unit);
  // walking distances to every foe (roadmap 14.2); a flier (Swiftness) passes over what blocks
  const rules = moveRules(unit);
  const climb = rules.climb ?? terrain.climbLimit ?? Infinity;
  const walks = new Map(opponents.map((o) => [o, walkMapTo(o, climb, rules.fly ? () => false : extraBlocked)]));
  const reachGap = (tile, o) => {
    const d = distance(tile, o);
    const g = walkGap(tile, o, unit.range, walks.get(o));
    if (g === 0 && shooter && d > 1 && !hasClearShot(tile, o)) return 1;
    return g;
  };
  const gap = (tile) => Math.min(...opponents.map((o) => reachGap(tile, o) - (isCaster(o) ? CASTER_DETOUR : 0)));

  // Ranged units also like high ground (they aim better from above), and
  // keep a tile away from foes (right next to one, an archer only has a dagger).
  const lift = (t) => (unit.range > 1 ? getHeight(t.col, t.row) - (opponents.some((o) => distance(t, o) <= 1) ? 3 : 0) : 0);

  // An archer keeps its distance: further from every foe is better (up to KEEP_AWAY).
  const room = (t) => Math.min(KEEP_AWAY, ...opponents.map((o) => distance(t, o)));
  const canShoot = (t) => opponents.some((o) => reachGap(t, o) === 0);

  // Each tile gets a list of scores, compared in order (lower is better):
  //  - most units: how close to attacking, then high ground, then fewest steps.
  //  - archers: first, a tile it can shoot someone from; among those, the one
  //    furthest from every foe, then a caster in reach, then high ground, then
  //    fewest steps. If it can't shoot from anywhere, it closes the gap.
  const score = (t) => {
    const steps = distance(unit, t);
    if (!shooter) return [gap(t), -lift(t), steps];
    return canShoot(t) ? [0, -room(t), gap(t), -lift(t), steps] : [1, gap(t), -room(t), -lift(t), steps];
  };
  const better = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };

  let best = null;
  let bestScore = score(unit); // staying where we are is the starting point to beat
  for (const tile of tiles) {
    const sc = score(tile);
    if (better(sc, bestScore)) {
      best = tile;
      bestScore = sc;
    }
  }

  return best;
}

// Where an enemy should walk AFTER it has acted, with the steps it has left
// (roadmap 13.53: a turn is one action and up to "move" steps, in any order).
// Returns a tile, or null to stay.
//   steps : how many steps it still has
//   aim   : optional { target, range }: it is taking aim at this unit and must
//           keep it in reach and in clear sight
// Ranged units back away: the tile furthest from every foe (up to their own
// reach) that they can still shoot from, higher ground breaking ties. They only move
// if that gives them more room than they have now.
// Close fighters walk up, but only if no foe is next to them already (they do
// not leave a fight) and only if it brings them nearer to striking.
export function chooseAfterTile(unit, units, steps, extraBlocked = () => false, aim = null) {
  const opponents = units.filter((other) => other.alive && other.side !== unit.side);
  if (opponents.length === 0 || steps <= 0) return null;
  const isBlocked = (col, row) =>
    extraBlocked(col, row) || units.some((other) => other.alive && other.col === col && other.row === row);
  const tiles = getReachableTiles(unit.col, unit.row, steps, isBlocked, moveRules(unit));
  const better = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };
  let score;
  let allowed = () => true;
  if (unit.range > 1) {
    const shooter = shootsProjectiles(unit);
    const canHit = (t, o, range) => {
      const d = distance(t, o);
      return d <= range && !(shooter && (d <= 1 || !hasClearShot(t, o)));
    };
    allowed = (t) => (aim ? canHit(t, aim.target, aim.range) : opponents.some((o) => canHit(t, o, unit.range)));
    // (before it shoots, KEEP_AWAY tiles of room is enough; once it has shot it may back off as far as its own reach)
    const room = (t) => Math.min(unit.range, ...opponents.map((o) => distance(t, o)));
    score = (t) => [-room(t), -getHeight(t.col, t.row), distance(unit, t)];
  } else {
    if (opponents.some((o) => distance(unit, o) <= 1)) return null; // already in the fight
    const rules = moveRules(unit);
    const climb = rules.climb ?? terrain.climbLimit ?? Infinity;
    const walks = new Map(opponents.map((o) => [o, walkMapTo(o, climb, rules.fly ? () => false : extraBlocked)]));
    const gap = (t) => Math.min(...opponents.map((o) => walkGap(t, o, unit.range, walks.get(o)) - (isCaster(o) ? CASTER_DETOUR : 0)));
    score = (t) => [gap(t), distance(unit, t)];
  }
  let best = null;
  let bestScore = score(unit);
  const start = bestScore; // it only moves if the first score (room, or nearness) gets better
  for (const tile of tiles) {
    if (!allowed(tile)) continue;
    const sc = score(tile);
    if (sc[0] < start[0] && better(sc, bestScore)) { best = tile; bestScore = sc; }
  }
  return best;
}


// Rabdul stays with the line (balance pass, roadmap 10.31, 22 Nov). He is "fast, evasive, fragile" (his kit sheet:
// health 34, defense 3 are his weaknesses) and his job is denying the approach with Spear Ward. Walking in on his own,
// he arrived a turn before the others and all four heroes struck him: he fell first in 8 of 12 bot battles, at round 3.
// So he goes no nearer the foes than the foremost of his close-fighting allies (archers and casters are not the line),
// unless he can strike from there and no more than 2 foes could reach him next turn. Returns the tile to walk to, or null to stay.
//   tile: the walk chooseMoveTile (or chooseAfterTile) picked; the rule only ever shortens it
//   steps: how far he may still walk (his whole move before acting, what is left after)
export function keepWithLine(unit, units, tile, extraBlocked = () => false, steps = moveOf(unit)) {
  if (!tile) return null;
  const opponents = units.filter((o) => o.alive && o.side !== unit.side && !o.isDecoy);
  if (!opponents.length) return tile;
  const nearFoe = (t) => Math.min(...opponents.map((o) => distance(t, o)));
  const line = units.filter((a) => a.alive && a !== unit && a.side === unit.side && !a.isDecoy && a.range <= 1);
  if (!line.length) return tile;
  const front = Math.min(...line.map(nearFoe)); // how close the foremost ally stands to the foes
  if (nearFoe(tile) >= front) return tile;      // not ahead of the line
  // ahead of the line he still goes to strike a foe, but only where no more than 2 foes could reach him next turn
  // (with more, he holds back: the foes have to walk onto his Spear Ward)
  const threats = (t) => opponents.filter((o) => distance(t, o) <= moveOf(o) + (o.range || 1)).length;
  if (opponents.some((o) => distance(tile, o) <= unit.range) && threats(tile) <= 2) return tile;
  const isBlocked = (col, row) => extraBlocked(col, row) || units.some((o) => o.alive && o.col === col && o.row === row);
  const tiles = [{ col: unit.col, row: unit.row }, ...getReachableTiles(unit.col, unit.row, steps, isBlocked, moveRules(unit))];
  // the tile nearest the foes that is still level with the line (or behind it), fewest steps breaking ties
  const ok = tiles.filter((t) => nearFoe(t) >= front).sort((a, b) => nearFoe(a) - nearFoe(b) || distance(unit, a) - distance(unit, b));
  const pick = ok[0];
  if (!pick || (pick.col === unit.col && pick.row === unit.row)) return null;
  return pick;
}
