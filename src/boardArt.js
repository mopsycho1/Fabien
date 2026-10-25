import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT, GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { tileToScreen, getHeight, tileSideDepth, depthFor } from './grid.js';

// How the battlefield LOOKS: ground textures, cliff sides, shadows, small
// rocks and tufts, the rocky underside, and the sky behind. Everything here is
// drawn in code, so no picture files are needed. When real terrain pictures
// arrive, they can replace the painted ground textures in paintGround().
//
// None of this changes where tiles are or how taps work. That is all in grid.js.

// ---------- Colors for each kind of ground ----------
// "top" is the surface, "side" is the cliff face below it.
const PALETTE = {
  sand: { top: '#c9a66b', side: 0xa98552 },
  cracked: { top: '#b58a52', side: 0x8f6b3e },
  rock: { top: '#8a7358', side: 0x6a553f },
  grass: { top: '#b3a05f', side: 0x8a7a45 },
};
const LETTERS = { s: 'sand', c: 'cracked', r: 'rock', g: 'grass' };
const VARIANTS = 3; // each kind of ground is painted 3 slightly different ways

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

      // 1. paint a flat square
      const square = document.createElement('canvas');
      square.width = S;
      square.height = S;
      paintGround(square.getContext('2d'), kind, S, makeRandom(1000 + v * 77 + kind.length * 13));

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

  // --- the ground on top ---
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
    details.fillStyle(0x1a1008, Math.min(0.34, 0.16 * strength));
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
  drawShape(0x4a3822, 1, 0);

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
