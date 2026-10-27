import { getReachableTiles } from './movement.js';
import { distance } from './combat.js';
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
  const gap = (tile) =>
    Math.min(...opponents.map((o) => Math.max(0, distance(tile, o) - unit.range) - (isCaster(o) ? CASTER_DETOUR : 0)));

  let best = null;
  let bestGap = gap(unit); // staying where we are is the starting point to beat
  let bestSteps = 0;

  // Ranged units also like high ground (they aim better from above), and
  // keep a tile away from foes (right next to one, an archer only has a dagger).
  const lift = (t) => (unit.range > 1 ? getHeight(t.col, t.row) - (opponents.some((o) => distance(t, o) <= 1) ? 3 : 0) : 0);
  let bestLift = lift(unit);
  for (const tile of tiles) {
    const g = gap(tile);
    const steps = distance(unit, tile);
    const better =
      g < bestGap ||
      (g === bestGap && lift(tile) > bestLift) ||
      (best !== null && g === bestGap && lift(tile) === bestLift && steps < bestSteps);
    if (better) {
      best = tile;
      bestGap = g;
      bestSteps = steps;
      bestLift = lift(tile);
    }
  }

  return best;
}
