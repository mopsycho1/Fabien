import { getReachableTiles } from './movement.js';
import { distance, getTargetsInRange } from './combat.js';

// Decides where an enemy should walk this turn.
// It returns a tile like { col: 2, row: 4 }, or null if the enemy should
// stay where it is.
//
// The idea is simple:
//  1. If someone is already in range, stay and fight.
//  2. Otherwise, look at every tile we can walk to, and pick the one that
//     gets us closest to being able to attack. Among equally good tiles,
//     pick the one that needs the fewest steps.
export function chooseMoveTile(unit, units) {
  const opponents = units.filter((other) => other.alive && other.side !== unit.side);
  if (opponents.length === 0) return null;
  if (getTargetsInRange(unit, units).length > 0) return null;

  // Units standing on a tile block it
  const isBlocked = (col, row) =>
    units.some((other) => other.alive && other.col === col && other.row === row);

  const tiles = getReachableTiles(unit.col, unit.row, unit.move, isBlocked);

  // How many tiles short of attacking we would be if we stood on this tile.
  // 0 means we could attack someone from here.
  const gap = (tile) => {
    const nearest = Math.min(...opponents.map((o) => distance(tile, o)));
    return Math.max(0, nearest - unit.range);
  };

  let best = null;
  let bestGap = gap(unit); // staying where we are is the starting point to beat
  let bestSteps = 0;

  for (const tile of tiles) {
    const g = gap(tile);
    const steps = distance(unit, tile);
    const better = g < bestGap || (best !== null && g === bestGap && steps < bestSteps);
    if (better) {
      best = tile;
      bestGap = g;
      bestSteps = steps;
    }
  }

  return best;
}
