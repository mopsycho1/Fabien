import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT, GAME_WIDTH, GAME_HEIGHT, LEVEL_HEIGHT, BASE_DEPTH, BOARD_CENTER_X, BOARD_TOP_Y } from './config.js';
import { tileToScreen, getHeight, tileSideDepth, depthFor } from './grid.js';

// How the battlefield LOOKS: ground, cliff sides, shadows, the rocky
// underside, the sky behind, and scenery around the edges. It uses the terrain
// pictures in public/art/terrain when they are there, and falls back to
// drawing everything in code when they are not.
//
// None of this changes where tiles are or how taps work. That is all in grid.js.

// ---------- Colors for each kind of ground ----------
// "top" is the surface, "side" is the cliff face below it.
// These colors are only used if the terrain pictures are missing.
const PALETTE = {
  sand: { top: '#b8532c', side: 0x7a3a22 },
  dust: { top: '#c99a55', side: 0x8f6b3e },
  cracked: { top: '#b5703a', side: 0x8f5a32 },
  rock: { top: '#8a8278', side: 0x5a4a3f },
  rift: { top: '#7a6e64', side: 0x4a3e35 },
  sigil: { top: '#3a2418', side: 0x2a1a10 },
  grass: { top: '#b8532c', side: 0x7a3a22 },
};
// The letters used in map.json for each kind of ground:
//   s = red sand        d = dusty sand with pebbles   c = cracked earth
//   r = grey stone      k = stone split by dark veins  v = cave floor with a glowing sigil
//   g = a withered thicket on sand
const LETTERS = { s: 'sand', d: 'dust', c: 'cracked', r: 'rock', k: 'rift', v: 'sigil', g: 'grass' };
const VARIANTS = 3; // each kind of ground is drawn 3 slightly different ways

// ---------- Terrain pictures ----------
// The ground, cliff sides, sky and scenery are pictures in public/art/terrain,
// cut from the tileset my cousin's art tool made. If a picture is missing, the
// board falls back to the colors above, so the game still runs.
const TERRAIN_FILES = {
  'top:sand': 'top_sand.png',
  'top:dust': 'top_dust.png',
  'top:cracked': 'top_cracked.png',
  'top:rock': 'top_stone.png',
  'top:rift': 'top_rift.png',
  'top:sigil': 'top_sigil.png',
  'top:grass': 'top_sand.png', // a thicket stands on red sand
  'face:leftRock': 'face_left_rock.png',
  'face:rightRock': 'face_right_rock.png',
  'face:leftBand': 'face_left_band.png',
  'face:rightBand': 'face_right_band.png',
  backdrop: 'backdrop.jpg',
  stream: 'stream.png',
  thicket: 'prop_thicket.png',
  cliffLow: 'prop_cliff_low.png',
  cliffHigh: 'prop_cliff_high.png',
  spire: 'prop_spire.png',
  sigilWall: 'prop_sigil_wall.png',
};

// Gives every terrain picture to the loader (called from StartScene).
export function preloadBoardArt(scene) {
  for (const [key, file] of Object.entries(TERRAIN_FILES)) {
    scene.load.image('terrain:' + key, './art/terrain/' + file);
  }
}

// The picture behind a terrain key, or null if it did not load.
function terrainImage(scene, key) {
  const k = 'terrain:' + key;
  return scene.textures.exists(k) ? scene.textures.get(k).getSourceImage() : null;
}

// ---------- Small helpers ----------

// A random number generator that gives the same numbers for the same seed, so
// the board looks the same every time the game runs.
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(color, factor) {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((color & 255) * factor));
  return (r << 16) | (g << 8) | b;
}

// The kind of ground at a tile: "sand", "cracked", "rock" or "grass".
// map.terrain is a list of 8 rows, each a text of 8 letters (see map.json).
export function terrainAt(map, col, row) {
  const rowText = map.terrain && map.terrain[row];
  const letter = rowText ? rowText[col] : 's';
  return LETTERS[letter] || 'sand';
}

// ---------- Painted ground textures ----------

// Paints a square patch of ground. It is later bent into a diamond.
function paintGround(ctx, kind, S, rand) {
  ctx.fillStyle = PALETTE[kind].top;
  ctx.fillRect(0, 0, S, S);

  // soft light and dark patches
  const patchCount = kind === 'rock' ? 16 : 10;
  for (let i = 0; i < patchCount; i++) {
    ctx.globalAlpha = kind === 'rock' ? 0.16 : 0.1;
    ctx.fillStyle = rand() < 0.5 ? '#e0c48c' : '#6a4c28';
    ctx.beginPath();
    ctx.arc(rand() * S, rand() * S, 12 + rand() * 24, 0, Math.PI * 2);
    ctx.fill();
  }

  if (kind === 'sand') {
    // wind ripples
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#8a6a3c';
    ctx.lineWidth = 1.5;
    for (let y = 8; y < S; y += 14) {
      ctx.beginPath();
      for (let x = 0; x <= S; x += 8) {
        const yy = y + Math.sin((x + y * 3) / 14) * 3;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  if (kind === 'cracked' || kind === 'rock') {
    // cracks: wandering lines that sometimes split
    const crackCount = kind === 'cracked' ? 7 : 4;
    for (let i = 0; i < crackCount; i++) {
      let x = rand() * S;
      let y = rand() * S;
      let angle = rand() * Math.PI * 2;
      for (let step = 0; step < 9; step++) {
        const nx = x + Math.cos(angle) * (9 + rand() * 9);
        const ny = y + Math.sin(angle) * (9 + rand() * 9);
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = '#3f2b14';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#e8c88a';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(nx + 1, ny + 1);
        ctx.stroke();
        x = nx;
        y = ny;
        angle += (rand() - 0.5) * 1.2;
      }
    }
  }

  if (kind === 'rock') {
    // chipped stone: small angular flakes
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = rand() < 0.5 ? '#b49c7a' : '#4d3d2b';
      const cx = rand() * S;
      const cy = rand() * S;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 4 + rand() * 9, cy + rand() * 5);
      ctx.lineTo(cx + 2 + rand() * 6, cy + 4 + rand() * 8);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (kind === 'grass') {
    // dry grass tufts
    for (let i = 0; i < 90; i++) {
      const x = rand() * S;
      const y = rand() * S;
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = ['#7f8f3f', '#a6a04a', '#c8b65e'][Math.floor(rand() * 3)];
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y - 4 - rand() * 6);
      ctx.stroke();
    }
  }

  // fine grain over everything
  for (let i = 0; i < 240; i++) {
    ctx.globalAlpha = 0.2 + rand() * 0.2;
    ctx.fillStyle = rand() < 0.5 ? '#f0dba8' : '#6e5230';
    ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.globalAlpha = 1;
}

// Makes the tile pictures: for each kind of ground, a few variants, each bent
// into the diamond shape of a tile. Does nothing if they already exist.
export function createBoardTextures(scene) {
  const S = 128; // size of the flat square patch
  const W = TILE_WIDTH + 2;
  const H = TILE_HEIGHT + 2;

  for (const kind of Object.keys(PALETTE)) {
    for (let v = 0; v < VARIANTS; v++) {
      const key = 'tile:' + kind + ':' + v;
      if (scene.textures.exists(key)) continue;

      // 1. a flat square of ground: the picture if we have one, otherwise painted in code
      const picture = terrainImage(scene, 'top:' + kind);
      const square = document.createElement('canvas');
      square.width = S;
      square.height = S;
      const sq = square.getContext('2d');
      if (picture) {
        // The same picture three ways, so the ground does not look stamped:
        // as it is, mirrored across the diamond, and turned half way round.
        if (v === 1) sq.setTransform(0, 1, 1, 0, 0, 0);
        if (v === 2) sq.setTransform(-1, 0, 0, -1, S, S);
        sq.drawImage(picture, 0, 0, S, S);
      } else {
        paintGround(sq, kind, S, makeRandom(1000 + v * 77 + kind.length * 13));
      }

      // 2. bend it into a diamond: the square's corners become the diamond's corners
      const texture = scene.textures.createCanvas(key, W, H);
      const ctx = texture.getContext();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W / 2, 1);
      ctx.lineTo(W - 1, H / 2);
      ctx.lineTo(W / 2, H - 1);
      ctx.lineTo(1, H / 2);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(TILE_WIDTH / 2 / S, TILE_HEIGHT / 2 / S, -TILE_WIDTH / 2 / S, TILE_HEIGHT / 2 / S, W / 2, 1);
      ctx.drawImage(square, 0, 0);
      ctx.restore();

      // 3. an edge: light on the far edges, dark on the near ones
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255, 238, 190, 0.35)';
      ctx.beginPath();
      ctx.moveTo(1, H / 2);
      ctx.lineTo(W / 2, 1);
      ctx.lineTo(W - 1, H / 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(50, 32, 14, 0.55)';
      ctx.beginPath();
      ctx.moveTo(1, H / 2);
      ctx.lineTo(W / 2, H - 1);
      ctx.lineTo(W - 1, H / 2);
      ctx.stroke();

      texture.refresh();
    }
  }
}

// ---------- Cliff side pictures ----------

// Makes (once) the picture of one side of a tile block, or returns null if the
// cliff pictures are missing. side is 'left' or 'right', height is the tile's
// height, variant is 0 or 1 (the rock mirrored, so the cliffs do not repeat).
//
// A side is a slanted strip: rock on top, and the woven band at the bottom.
// We draw the straight rock picture through a "skew", which slants it to
// follow the edge of the diamond.
function sideTexture(scene, side, height, variant) {
  const key = 'face:' + side + ':' + height + ':' + variant;
  if (scene.textures.exists(key)) return key;
  const rock = terrainImage(scene, 'face:' + side + 'Rock');
  const band = terrainImage(scene, 'face:' + side + 'Band');
  if (!rock || !band) return null;

  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const rockH = height * LEVEL_HEIGHT;
  const depth = BASE_DEPTH + rockH;
  const texture = scene.textures.createCanvas(key, Math.ceil(hw) + 1, Math.ceil(hh + depth) + 1);
  const ctx = texture.getContext();

  // left side: the top edge runs down to the right; right side: up to the right
  if (side === 'left') ctx.setTransform(1, hh / hw, 0, 1, 0, 0);
  else ctx.setTransform(1, -hh / hw, 0, 1, 0, hh);

  // rock, stacked up from the band as many times as it takes
  if (rockH > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, hw, rockH);
    ctx.clip();
    const pieceH = (rock.height * hw) / rock.width;
    for (let y = rockH - pieceH, i = 0; y > -pieceH; y -= pieceH, i++) {
      const mirrored = (variant + i) % 2 === 1;
      ctx.save();
      if (mirrored) {
        ctx.translate(hw, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(rock, 0, y, hw, pieceH);
      ctx.restore();
    }
    ctx.restore();
  }
  // the woven band along the bottom
  ctx.drawImage(band, 0, rockH, hw, BASE_DEPTH);

  // shade: light comes from the top left, so the right side is darker
  ctx.fillStyle = side === 'left' ? 'rgba(20, 8, 2, 0.12)' : 'rgba(20, 8, 2, 0.42)';
  ctx.fillRect(0, 0, hw, depth);
  // a dark line along the bottom edge
  ctx.fillStyle = 'rgba(15, 6, 2, 0.6)';
  ctx.fillRect(0, depth - 2, hw, 2);

  texture.refresh();
  return key;
}

// ---------- One tile block ----------

// Draws one tile: cliff sides with rock layers, the ground on top, shadows
// where a taller tile sits next to it, and a few small rocks or tufts.
export function drawTileBlock(scene, col, row, map) {
  const { x, y } = tileToScreen(col, row);
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const sideDepth = tileSideDepth(col, row);
  const height = getHeight(col, row);
  const depth = depthFor(col, row);
  const kind = terrainAt(map, col, row);
  const palette = PALETTE[kind];
  const rand = makeRandom(col * 131 + row * 17 + 5);

  // --- the cliff sides ---
  // With pictures: two slanted pictures, one each side. Without: drawn in code.
  const variant = rand() < 0.5 ? 0 : 1;
  const leftKey = sideTexture(scene, 'left', height, variant);
  const rightKey = sideTexture(scene, 'right', height, 1 - variant);
  if (leftKey && rightKey) {
    scene.add.image(x - hw, y, leftKey).setOrigin(0, 0).setDepth(depth);
    scene.add.image(x, y, rightKey).setOrigin(0, 0).setDepth(depth);
    const edge = scene.add.graphics().setDepth(depth);
    edge.lineStyle(1.5, 0x140802, 0.5); // where the two sides meet
    edge.lineBetween(x, y + hh, x, y + hh + sideDepth);
    drawTop(scene, col, row, map, { x, y, hw, hh, height, depth, kind, rand, pictures: true });
    return;
  }

  const sides = scene.add.graphics().setDepth(depth);
  const sideLeft = shade(palette.side, 0.85);
  const sideRight = shade(palette.side, 0.62);

  const fillSide = (color, bx, by, flipX) => {
    sides.fillStyle(color, 1);
    sides.beginPath();
    sides.moveTo(bx, by);
    sides.lineTo(x, y + hh);
    sides.lineTo(x, y + hh + sideDepth);
    sides.lineTo(bx, by + sideDepth);
    sides.closePath();
    sides.fillPath();

    // layers of rock: thin lines that follow the slope of the face
    const layers = Math.max(1, Math.floor(sideDepth / 9));
    for (let i = 1; i <= layers; i++) {
      const off = (sideDepth * i) / (layers + 1) + (rand() - 0.5) * 2;
      sides.lineStyle(1.5, i % 2 === 0 ? 0x2a1a0a : 0xf0dba8, i % 2 === 0 ? 0.22 : 0.1);
      sides.beginPath();
      sides.moveTo(bx, by + off);
      sides.lineTo(x, y + hh + off);
      sides.strokePath();
    }
    // a dark edge along the bottom
    sides.lineStyle(2, 0x1a1008, 0.5);
    sides.beginPath();
    sides.moveTo(bx, by + sideDepth);
    sides.lineTo(x, y + hh + sideDepth);
    sides.strokePath();
  };
  fillSide(sideLeft, x - hw, y, false);
  fillSide(sideRight, x + hw, y, true);

  // a vertical line where the two faces meet
  sides.lineStyle(2, 0x1a1008, 0.45);
  sides.beginPath();
  sides.moveTo(x, y + hh);
  sides.lineTo(x, y + hh + sideDepth);
  sides.strokePath();

  drawTop(scene, col, row, map, { x, y, hw, hh, height, depth, kind, rand, pictures: false });
}

// The top of a tile: the ground, shadows from taller tiles behind it, and the
// small things lying on it (a thicket, or pebbles and tufts drawn in code).
function drawTop(scene, col, row, map, t) {
  const { x, y, hw, hh, height, depth, kind, rand, pictures } = t;

  // --- the ground ---
  const variant = Math.floor(rand() * VARIANTS);
  const top = scene.add.image(x, y, 'tile:' + kind + ':' + variant).setDepth(depth);
  top.setTint(shade(0xffffff, Math.min(1, 0.88 + 0.04 * height))); // higher ground is a little lighter

  // --- shadows, and small details, on top of the ground ---
  const details = scene.add.graphics().setDepth(depth + 0.1);

  // Where a taller tile sits behind this one, its wall casts a shadow on the near edge
  const insetToward = (px, py) => ({ x: px + (x - px) * 0.42, y: py + (y - py) * 0.42 });
  const shadowStrip = (ax, ay, bx, by, strength) => {
    const a2 = insetToward(ax, ay);
    const b2 = insetToward(bx, by);
    details.fillStyle(0x1a1008, Math.min(0.4, 0.2 * strength));
    details.beginPath();
    details.moveTo(ax, ay);
    details.lineTo(bx, by);
    details.lineTo(b2.x, b2.y);
    details.lineTo(a2.x, a2.y);
    details.closePath();
    details.fillPath();
  };
  const behindLeft = getHeight(col - 1, row) - height; // the tile up and to the left
  const behindRight = getHeight(col, row - 1) - height; // the tile up and to the right
  if (col > 0 && behindLeft > 0) shadowStrip(x - hw, y, x, y - hh, behindLeft);
  if (row > 0 && behindRight > 0) shadowStrip(x, y - hh, x + hw, y, behindRight);

  // A withered thicket: the picture covers the whole top, with the tree on it
  if (kind === 'grass' && scene.textures.exists('terrain:thicket')) {
    const img = scene.add.image(x, y, 'terrain:thicket').setDepth(depth + 0.05);
    // the thicket picture's diamond is 148 wide and 101 tall, centred 57 from its top
    img.setOrigin(0.5, 57 / img.height).setScale(TILE_WIDTH / 148, TILE_HEIGHT / 101);
    img.setTint(shade(0xffffff, Math.min(1, 0.88 + 0.04 * height)));
    return;
  }
  if (pictures) return; // the pictures already have their own pebbles

  // Small things lying on the ground, kept away from the middle where units stand
  const count = rand() < 0.6 ? 1 + Math.floor(rand() * 3) : 0;
  for (let i = 0; i < count; i++) {
    let px = 0;
    let py = 0;
    let ok = false;
    for (let tries = 0; tries < 8 && !ok; tries++) {
      px = (rand() * 2 - 1) * hw * 0.78;
      py = (rand() * 2 - 1) * hh * 0.78;
      const d = Math.abs(px) / hw + Math.abs(py) / hh;
      ok = d < 0.88 && d > 0.42;
    }
    if (!ok) continue;
    drawDetail(details, kind, x + px, y + py, rand);
  }
}

// One small thing on the ground: a pebble, a rock, or a dry tuft.
function drawDetail(g, kind, x, y, rand) {
  const roll = rand();
  const grassy = kind === 'grass' ? roll < 0.7 : roll < 0.14;

  if (grassy) {
    g.lineStyle(1.6, kind === 'grass' ? 0x8f9a4a : 0xa59a52, 0.95);
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(x + i * 1.6, y);
      g.lineTo(x + i * 3.2, y - 7 - rand() * 4);
      g.strokePath();
    }
    return;
  }

  if (roll < 0.62) {
    // a pebble
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x + 1, y + 2, 9, 4);
    g.fillStyle(0x8a7358, 1);
    g.fillEllipse(x, y, 7, 5);
    g.fillStyle(0xc4ae8a, 0.8);
    g.fillEllipse(x - 1, y - 1, 3, 2);
    return;
  }

  // a small rock
  const w = 7 + rand() * 6;
  const h = 6 + rand() * 5;
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(x + 2, y + 2, w * 1.6, 5);
  g.fillStyle(0x6a553f, 1);
  g.beginPath();
  g.moveTo(x - w, y);
  g.lineTo(x - w * 0.5, y - h);
  g.lineTo(x + w * 0.4, y - h * 0.9);
  g.lineTo(x + w, y);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xb9a27d, 0.9);
  g.beginPath();
  g.moveTo(x - w * 0.5, y - h);
  g.lineTo(x + w * 0.4, y - h * 0.9);
  g.lineTo(x + w * 0.1, y - h * 0.35);
  g.lineTo(x - w * 0.6, y - h * 0.4);
  g.closePath();
  g.fillPath();
}

// ---------- Under the board and behind it ----------

let undersideAt = { x: 0, y: 0 }; // where the underside picture goes (it is made once)

// The board is a floating piece of ground. This draws the jagged rock that
// hangs beneath it, and a soft shadow below.
export function drawUnderside(scene) {
  const last = GRID_SIZE - 1;
  const left = tileToScreen(0, last);
  const bottom = tileToScreen(last, last);
  const right = tileToScreen(last, 0);
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const baseDepth = tileSideDepth(0, last);

  // the edge of the board along the bottom: left corner, bottom corner, right corner
  const lx = left.x - hw;
  const ly = left.y + baseDepth;
  const bx = bottom.x;
  const by = bottom.y + hh + tileSideDepth(last, last);
  const rx = right.x + hw;
  const ry = right.y + tileSideDepth(last, 0);

  const rand = makeRandom(4242);
  const g = scene.add.graphics().setDepth(-3);

  // a soft shadow on the ground far below
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(bx, by + 118, 500, 70);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(bx, by + 118, 340, 46);

  // the hanging rock: from the left corner, down to a point, and up to the right corner
  const tipY = by + 92;
  const path = [{ x: lx, y: ly }];
  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    path.push({ x: lx + (bx - lx) * t * 0.92 + (rand() - 0.5) * 34, y: ly + (by - ly) * t + (tipY - by) * t * t * 0.9 + (rand() - 0.5) * 30 });
  }
  path.push({ x: bx, y: tipY });
  for (let i = 6; i >= 1; i--) {
    const t = i / 7;
    path.push({ x: rx - (rx - bx) * t * 0.92 + (rand() - 0.5) * 34, y: ry + (by - ry) * t + (tipY - by) * t * t * 0.9 + (rand() - 0.5) * 30 });
  }
  path.push({ x: rx, y: ry });

  const drawShape = (color, alpha, insetY) => {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (const p of path) g.lineTo(p.x, p.y - insetY);
    g.closePath();
    g.fillPath();
  };
  const rock = terrainImage(scene, 'face:leftRock');
  if (rock && !scene.textures.exists('underside')) {
    // Fill the hanging shape with the cliff rock picture, repeated
    const minX = Math.min(...path.map((p) => p.x)) - 2;
    const maxX = Math.max(...path.map((p) => p.x)) + 2;
    const minY = Math.min(...path.map((p) => p.y)) - 2;
    const maxY = Math.max(...path.map((p) => p.y)) + 2;
    const tex = scene.textures.createCanvas('underside', Math.ceil(maxX - minX), Math.ceil(maxY - minY));
    const ctx = tex.getContext();
    const small = document.createElement('canvas'); // the rock at board size
    small.width = Math.round(rock.width * 0.45);
    small.height = Math.round(rock.height * 0.45);
    small.getContext('2d').drawImage(rock, 0, 0, small.width, small.height);
    ctx.beginPath();
    ctx.moveTo(path[0].x - minX, path[0].y - minY);
    for (const p of path) ctx.lineTo(p.x - minX, p.y - minY);
    ctx.closePath();
    ctx.fillStyle = ctx.createPattern(small, 'repeat');
    ctx.fill();
    // darker the further down it hangs
    const shadow = ctx.createLinearGradient(0, 0, 0, maxY - minY);
    shadow.addColorStop(0, 'rgba(20, 8, 2, 0.25)');
    shadow.addColorStop(1, 'rgba(20, 8, 2, 0.8)');
    ctx.fillStyle = shadow;
    ctx.fill();
    tex.refresh();
    undersideAt = { x: minX, y: minY };
  }
  if (scene.textures.exists('underside')) {
    const at = undersideAt;
    scene.add.image(at.x, at.y, 'underside').setOrigin(0, 0).setDepth(-3.5);
  } else {
    drawShape(0x4a3822, 1, 0);
  }

  // right half darker, for a bit of roundness
  g.fillStyle(0x2e2214, 0.55);
  g.beginPath();
  g.moveTo(bx, by);
  for (const p of path) if (p.x >= bx) g.lineTo(p.x, p.y);
  g.lineTo(rx, ry);
  g.closePath();
  g.fillPath();

  // layers of rock across the hanging part
  for (let i = 1; i <= 5; i++) {
    const yy = by + i * 17;
    g.lineStyle(2, i % 2 ? 0x1a1008 : 0x8a6a3c, i % 2 ? 0.3 : 0.18);
    g.beginPath();
    const spread = Math.max(16, (bx - lx) * (1 - (i * 17) / (tipY - by + 12)) * 0.9);
    g.moveTo(bx - spread, yy - 10 + rand() * 4);
    g.lineTo(bx - spread * 0.3, yy + 4 + rand() * 4);
    g.lineTo(bx + spread * 0.3, yy + 2 + rand() * 4);
    g.lineTo(bx + spread, yy - 8 + rand() * 4);
    g.strokePath();
  }
}

// The sky behind the board: dusk colors, a low sun, and far-off dunes.
export function drawBackdrop(scene) {
  // The painted wasteland, if we have it
  if (scene.textures.exists('terrain:backdrop')) {
    scene.add.image(0, 0, 'terrain:backdrop').setOrigin(0, 0).setDepth(-21).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    // the ground fades to dark at the bottom, where the buttons are
    const fade = scene.add.graphics().setDepth(-20);
    for (let i = 0; i < 12; i++) {
      fade.fillStyle(0x140e0b, (i + 1) / 12);
      fade.fillRect(0, 800 + i * 10, GAME_WIDTH, 11);
    }
    fade.fillStyle(0x140e0b, 1);
    fade.fillRect(0, 920, GAME_WIDTH, GAME_HEIGHT - 920);
    return;
  }

  const g = scene.add.graphics().setDepth(-20);

  // sky in bands, from dark at the top to warm near the horizon
  const bands = 24;
  const top = [0x1b1224, 0x6b3a3f, 0xd98a4e]; // dark violet, dusky red, warm orange
  const horizon = 760;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const color = t < 0.6 ? lerpColor(top[0], top[1], t / 0.6) : lerpColor(top[1], top[2], (t - 0.6) / 0.4);
    g.fillStyle(color, 1);
    g.fillRect(0, (horizon * i) / bands, GAME_WIDTH, horizon / bands + 2);
  }

  // a low sun with a glow
  for (let r = 170; r > 20; r -= 6) {
    g.fillStyle(0xffd08a, 0.018 + (170 - r) / 4200);
    g.fillCircle(560, 600, r);
  }
  g.fillStyle(0xffe6b0, 0.95);
  g.fillCircle(560, 600, 34);

  // far dunes
  const dune = (baseY, amp, color, seed) => {
    const rand = makeRandom(seed);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, GAME_HEIGHT);
    for (let x = 0; x <= GAME_WIDTH + 40; x += 40) {
      g.lineTo(x, baseY + Math.sin(x / 90 + seed) * amp + (rand() - 0.5) * 8);
    }
    g.lineTo(GAME_WIDTH, GAME_HEIGHT);
    g.closePath();
    g.fillPath();
  };
  dune(690, 26, 0x6a3f33, 3);
  dune(740, 22, 0x4a2c28, 7);
  dune(800, 18, 0x2f1c1b, 11);

  // the ground fades to dark at the bottom, where the buttons are
  g.fillStyle(0x140e0b, 1);
  g.fillRect(0, 900, GAME_WIDTH, GAME_HEIGHT - 900);
  for (let i = 0; i < 8; i++) {
    g.fillStyle(0x140e0b, i / 8);
    g.fillRect(0, 820 + i * 10, GAME_WIDTH, 11);
  }
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

// ---------- Scenery ----------

// Draws the scenery listed in map.json under "scenery". Scenery is only
// decoration: it never blocks a tile. Each entry is one of:
//
//   { "prop": "cliffHigh", "col": 4, "row": -1 }
//       a block of rock standing at that spot. Use a row or column of -1 to
//       put it just behind the board. Props: cliffLow, cliffHigh, spire, sigilWall.
//       Add "flip": true to mirror it.
//
//   { "prop": "sandfall", "col": 1, "row": 1, "side": "left" }
//       sand pouring off the left or right side of that tile, down to the tile
//       in front of it.
export function drawScenery(scene, map) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  for (const item of map.scenery || []) {
    if (item.prop === 'sandfall') {
      drawSandfall(scene, item, hw, hh);
      continue;
    }
    const key = 'terrain:' + item.prop;
    if (!scene.textures.exists(key)) continue;
    // where a height-0 tile at this spot would have its front bottom corner
    const x = BOARD_CENTER_X + ((item.col - item.row) * TILE_WIDTH) / 2;
    const y = BOARD_TOP_Y + ((item.col + item.row) * TILE_HEIGHT) / 2 + hh + BASE_DEPTH;
    const img = scene.add.image(x, y, key).setOrigin(0.5, 1);
    img.setScale(TILE_WIDTH / 148).setFlipX(!!item.flip);
    img.setDepth((item.col + item.row) * 2 - 0.5); // just behind the tiles at the same distance
  }
}

function drawSandfall(scene, item, hw, hh) {
  if (!scene.textures.exists('terrain:stream')) return;
  const { col, row } = item;
  const left = item.side !== 'right';
  // the tile the sand lands on: in front of this one, on that side
  const nCol = left ? col : col + 1;
  const nRow = left ? row + 1 : row;
  const drop = getHeight(col, row) - getHeight(nCol, nRow);
  if (drop <= 0) return;
  const { x, y } = tileToScreen(col, row);
  const sx = left ? x - hw / 2 : x + hw / 2; // the middle of that side's top edge
  const sy = y + hh / 2;
  const length = drop * LEVEL_HEIGHT + 8;
  const stream = scene.add.image(sx, sy - 2, 'terrain:stream').setOrigin(0.5, 0);
  stream.setDisplaySize(18, length).setDepth(depthFor(col, row) + 0.2);
  // it shimmers as the sand flows
  scene.tweens.add({ targets: stream, alpha: 0.82, duration: 420 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  // and puffs a little dust where it lands
  if (scene.textures.exists('fx-dot')) {
    scene.add.particles(sx, sy + length - 4, 'fx-dot', {
      speed: { min: 6, max: 22 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xe8b878,
      lifespan: 700,
      frequency: 140,
    }).setDepth(depthFor(nCol, nRow) + 0.3);
  }
}
