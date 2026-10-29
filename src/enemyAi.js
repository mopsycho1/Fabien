import { getReachableTiles } from './movement.js';
import { distance, hasClearShot, shootsProjectiles } from './combat.js';
import { moveOf } from './status.js';
import { getHeight } from './grid.js';

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

  const tiles = getReachableTiles(unit.col, unit.row, moveOf(unit), isBlocked);

  // How many tiles short of attacking we would be if we stood on this tile.
  // 0 means we could attack someone from here; a caster counts as nearer.
  // An archer in range but behind a higher block has no shot: it counts as 1 short.
  const shooter = shootsProjectiles(unit);
  const reachGap = (tile, o) => {
    const d = distance(tile, o);
    const g = Math.max(0, d - unit.range);
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
