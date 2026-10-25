// Settings that many files need. Change them here, not in five places.

// The game screen is phone shaped (portrait). Phaser scales it to fit any screen.
// We use a big internal size (720 by 1280) so everything stays sharp on
// large monitors and on high resolution phone screens.
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export const GRID_SIZE = 8; // 8 columns by 8 rows

// ---- How the board is drawn (isometric) ----
// Each tile is drawn as a diamond: TILE_WIDTH wide and TILE_HEIGHT tall.
// A true isometric diamond is exactly twice as wide as it is tall. We make
// ours a bit taller than that, so tiles are easier to tap on a phone.
export const TILE_WIDTH = 86;
export const TILE_HEIGHT = 54;

// Each step of height lifts a tile by this many pixels.
export const LEVEL_HEIGHT = 22;

// Every tile is drawn as a block with sides. This is the thickness of a
// block at height 0. Higher tiles are thicker (a taller block).
export const BASE_DEPTH = 14;

// Where the board sits on the screen.
// BOARD_CENTER_X is the middle of the screen. BOARD_TOP_Y is where tile
// (column 0, row 0), the far corner of the board, is drawn.
export const BOARD_CENTER_X = GAME_WIDTH / 2;
export const BOARD_TOP_Y = 400;
