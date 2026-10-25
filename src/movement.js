import { isInsideGrid } from './grid.js';

// Works out every tile a unit can walk to.
//
// startCol, startRow : where the unit is now
// moveRange          : how many steps it can take (one step = one tile up,
//                      down, left or right, no diagonals)
// isBlocked          : a function we are given. isBlocked(col, row) says true
//                      if a tile cannot be walked on. Right now nothing is
//                      blocked. Later, other units and obstacles will be.
//
// It returns a list like [{ col: 3, row: 5 }, { col: 2, row: 6 }, ...]
// It does NOT include the tile the unit is already standing on.
//
// How it works: start at the unit, find all neighbours (1 step away), then
// the neighbours of those (2 steps away), and so on, until we run out of steps.
export function getReachableTiles(startCol, startRow, moveRange, isBlocked) {
  const seen = new Set([startCol + ',' + startRow]); // tiles we already counted
  const reachable = [];
  let frontier = [{ col: startCol, row: startRow }]; // tiles found in the last step

  for (let step = 0; step < moveRange; step++) {
    const nextFrontier = [];

    for (const tile of frontier) {
      // The four neighbours: right, left, down, up
      for (const [dCol, dRow] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const col = tile.col + dCol;
        const row = tile.row + dRow;
        const key = col + ',' + row;

        if (!isInsideGrid(col, row)) continue; // off the board
        if (seen.has(key)) continue;           // already counted
        if (isBlocked(col, row)) continue;     // something is in the way

        seen.add(key);
        nextFrontier.push({ col, row });
        reachable.push({ col, row });
      }
    }

    frontier = nextFrontier;
  }

  return reachable;
}

// The steps a unit takes to reach a tile, one tile at a time, using the same
// rules as getReachableTiles. Returns a list of tiles from the first step to
// the destination, or [] if it cannot get there within moveRange.
export function getPath(startCol, startRow, destCol, destRow, moveRange, isBlocked) {
  const startKey = startCol + ',' + startRow;
  const cameFrom = new Map([[startKey, null]]); // for each tile, the tile we stepped from
  let frontier = [{ col: startCol, row: startRow }];

  for (let step = 0; step < moveRange && frontier.length > 0; step++) {
    const nextFrontier = [];
    for (const tile of frontier) {
      for (const [dCol, dRow] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const col = tile.col + dCol;
        const row = tile.row + dRow;
        const key = col + ',' + row;
        if (!isInsideGrid(col, row) || cameFrom.has(key) || isBlocked(col, row)) continue;
        cameFrom.set(key, tile.col + ',' + tile.row);
        nextFrontier.push({ col, row });
      }
    }
    frontier = nextFrontier;
  }

  const destKey = destCol + ',' + destRow;
  if (!cameFrom.has(destKey) || destKey === startKey) return [];

  // Walk back from the destination to the start, then turn the list around
  const path = [];
  let key = destKey;
  while (key !== startKey) {
    const [col, row] = key.split(',').map(Number);
    path.unshift({ col, row });
    key = cameFrom.get(key);
  }
  return path;
}
