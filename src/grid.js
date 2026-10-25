import {
  GRID_SIZE,
  TILE_WIDTH,
  TILE_HEIGHT,
  LEVEL_HEIGHT,
  BASE_DEPTH,
  BOARD_CENTER_X,
  BOARD_TOP_Y,
} from './config.js';

// This file is the only place that knows how tiles are laid out on screen.
// The battle rules only talk about columns and rows. Everything about how the
// board LOOKS (isometric diamonds, tile heights) is decided here.

// ---------- Tile heights ----------

// heights[row][col] is how high each tile is (0 is ground level).
let heights = [];

// Gives the grid its height map (from src/data/map.json).
export function setTileHeights(map) {
  heights = map;
}

// How high one tile is. Anything missing in the map counts as 0.
export function getHeight(col, row) {
  return (heights[row] && heights[row][col]) || 0;
}

// ---------- Tile to screen ----------

// Turns a tile position (column 3, row 6) into a screen position in pixels.
// It returns the CENTER of the tile's top surface, so a taller tile comes
// out higher up the screen.
//
// Moving one column to the right goes down and to the right on screen.
// Moving one row down goes down and to the left. That is what makes the board
// look like a diamond.
export function tileToScreen(col, row) {
  return {
    x: BOARD_CENTER_X + ((col - row) * TILE_WIDTH) / 2,
    y: BOARD_TOP_Y + ((col + row) * TILE_HEIGHT) / 2 - getHeight(col, row) * LEVEL_HEIGHT,
  };
}

// How thick the block under a tile is, in pixels.
export function tileSideDepth(col, row) {
  return BASE_DEPTH + getHeight(col, row) * LEVEL_HEIGHT;
}

// Drawing order. Tiles nearer the bottom of the screen must be drawn on top
// of tiles behind them. A bigger number is drawn later, so on top.
export function depthFor(col, row) {
  return (col + row) * 2;
}

// ---------- Screen to tile ----------

// The outline of a whole tile block as seen on screen: the top diamond plus
// the sides below it. A list of points like [x1, y1, x2, y2, ...].
function blockOutline(col, row) {
  const { x, y } = tileToScreen(col, row);
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const d = tileSideDepth(col, row);
  return [
    x, y - hh,        // top corner
    x + hw, y,        // right corner
    x + hw, y + d,    // right side, bottom
    x, y + hh + d,    // bottom corner, bottom
    x - hw, y + d,    // left side, bottom
    x - hw, y,        // left corner
  ];
}

// True if the point (px, py) is inside the shape. (Standard "ray casting" test.)
function pointInShape(px, py, points) {
  let inside = false;
  const count = points.length / 2;
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const xi = points[i * 2];
    const yi = points[i * 2 + 1];
    const xj = points[j * 2];
    const yj = points[j * 2 + 1];
    const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// The opposite: turns a tap position in pixels into a tile (column and row).
// If the tap is not on the board, both come back as -1.
//
// Tiles overlap on screen (a tall tile in front hides part of the tile behind
// it), so we check the nearest tiles first and stop at the first one that
// contains the tap.
export function screenToTile(x, y) {
  for (let sum = (GRID_SIZE - 1) * 2; sum >= 0; sum--) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const row = sum - col;
      if (row < 0 || row >= GRID_SIZE) continue;
      if (pointInShape(x, y, blockOutline(col, row))) {
        return { col, row };
      }
    }
  }
  return { col: -1, row: -1 };
}

// True if this column and row is a real tile on the board.
export function isInsideGrid(col, row) {
  return col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE;
}

// True if the point (px, py) is on the top surface of this tile, even if part
// of that surface is hidden behind a taller block in front of it.
export function pointInTileTop(px, py, col, row) {
  const { x, y } = tileToScreen(col, row);
  return Math.abs(px - x) / (TILE_WIDTH / 2) + Math.abs(py - y) / (TILE_HEIGHT / 2) <= 1;
}
