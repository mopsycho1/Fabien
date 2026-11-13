import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT, GAME_WIDTH, GAME_HEIGHT, LEVEL_HEIGHT, BASE_DEPTH, BOARD_CENTER_X, BOARD_TOP_Y } from './config.js';
import { tileToScreen, getHeight, tileSideDepth, depthFor, toView, fromView, viewToScreen } from './grid.js';

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
  // the Hidden Cavern (Phase 11): his ground pictures, four looks each
  floor: { top: '#9a6638', side: 0x5a3a22 },
  caveSand: { top: '#c98e45', side: 0x6a4626 },
  rubble: { top: '#6e4a2c', side: 0x4a3020 },
  caveSigil: { top: '#94622f', side: 0x5a3a22 },
  water: { top: '#1f4a50', side: 0x2a2018 },
  bridge: { top: '#7a5230', side: 0x3a2414 },
};
// What the top right of the battle screen calls each kind of ground
const GROUND_NAMES = { caveSand: 'Sand', caveSigil: 'Sigil', rubble: 'Rubble', floor: 'Floor', water: 'Water', bridge: 'Bridge', rift: 'Rift', rock: 'Rock' };
export function groundName(kind) {
  return GROUND_NAMES[kind] || kind.charAt(0).toUpperCase() + kind.slice(1);
}
// The letters used in map.json for each kind of ground:
//   s = red sand        d = dusty sand with pebbles   c = cracked earth
//   r = grey stone      k = stone split by dark veins  v = cave floor with a glowing sigil
//   g = a withered thicket on sand
// The Hidden Cavern's letters are capitals:
//   F = stone floor   S = sand   R = rubble   G = the ritual platform's sigil stone
//   W = shallow water (walkable, leaves you Drenched)   B = a wooden bridge over water
const LETTERS = { s: 'sand', d: 'dust', c: 'cracked', r: 'rock', k: 'rift', v: 'sigil', g: 'grass', F: 'floor', S: 'caveSand', R: 'rubble', G: 'caveSigil', W: 'water', B: 'bridge' };
const VARIANTS = 3; // each kind of ground is drawn 3 slightly different ways
// His cavern grounds come as four squares each (dev/tools/make_cavern.py)
const CAVE_GROUND = { floor: 'floor', caveSand: 'sand', rubble: 'rubble', caveSigil: 'sigil', water: 'water', bridge: 'water' };
function variantsOf(kind) {
  return CAVE_GROUND[kind] ? 4 : VARIANTS;
}

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
  // the Hidden Cavern (his NEW CAVE MAP DESIGNS, cut by dev/tools/make_cavern.py)
  'face:caveLit': 'cave_wall_lit.jpg',
  'face:caveDark': 'cave_wall_dark.jpg',
  sigilRing: 'cave_sigilring.jpg',
  caveBackdrop: 'cave_backdrop.jpg',
  stalagmiteTall: 'cave_stalagmiteTall.png',
  stalagmiteShort: 'cave_stalagmiteShort.png',
  pillar: 'cave_pillar.png',
  rockPile: 'cave_rockPile.png',
  pots: 'cave_pots.png',
  brazier: 'cave_brazier.png',
  rockPool: 'cave_rockPool.png',
  bones: 'cave_bones.png',
};
for (const [kind, file] of Object.entries({ floor: 'floor', caveSand: 'sand', rubble: 'rubble', caveSigil: 'sigil', water: 'water' })) {
  for (let v = 0; v < 4; v++) TERRAIN_FILES['top:' + kind + ':' + v] = 'cave_' + file + '_' + v + '.jpg';
}
// How wide each prop's base is drawn (game pixels) and where its feet are
// across the picture (the pictures are cut at twice this size)
const CAVE_PROPS = {
  stalagmiteTall: { width: 120, originX: 0.501 },
  pillar: { width: 84, originX: 0.466 },
  stalagmiteShort: { width: 100, originX: 0.574 },
  rockPile: { width: 112, originX: 0.517 },
  pots: { width: 74, originX: 0.756 },
  brazier: { width: 52, originX: 0.379 },
  rockPool: { width: 150, originX: 0.572 },
  bones: { width: 100, originX: 0.456 },
};

// ---------- The setting: an open wasteland, or inside a cave ----------
// map.json says "setting": "cave" or "wasteland". A cave is darker, closed in
// by rock walls, lit by torches, and has no sky. The same pictures are used;
// in a cave they are drawn darker.
// "cavern" is the Hidden Cavern (Phase 11): his own pictures, lit by fire.
let setting = 'wasteland';
const CAVE_DARK = 'rgba(14, 7, 4, 0.3)'; // laid over pictures in a cave
const darkness = () => (setting === 'cavern' ? 'rgba(14, 7, 4, 0.12)' : CAVE_DARK);
const inCave = () => setting !== 'wasteland';

export function setBoardSetting(name) {
  setting = name === 'cave' || name === 'cavern' ? name : 'wasteland';
}
export function boardSetting() {
  return setting;
}

// Darkens whatever is already drawn on a canvas, keeping its see-through parts.
function darkenCanvas(ctx, w, h, color) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// The picture to use for a scenery key: in a cave, a darker copy (made once).
function sceneryKey(scene, key) {
  if (!inCave() || setting === 'cavern' || !scene.textures.exists(key)) return key;
  const darkKey = key + ':cave';
  if (!scene.textures.exists(darkKey)) {
    const src = scene.textures.get(key).getSourceImage();
    const tex = scene.textures.createCanvas(darkKey, src.width, src.height);
    const ctx = tex.getContext();
    ctx.drawImage(src, 0, 0);
    darkenCanvas(ctx, src.width, src.height, 'rgba(14, 7, 4, 0.5)');
    tex.refresh();
  }
  return darkKey;
}

// Gives every terrain picture to the loader (called from StartScene).
export function preloadBoardArt(scene) {
  for (const [key, file] of Object.entries(TERRAIN_FILES)) {
    scene.load.image('terrain:' + key, './art/terrain/' + file);
  }
  // Suleiman's 8 looping flame frames (roadmap 6.41), for every brazier and lamp
  for (let i = 1; i <= FLAME_FRAMES; i++) scene.load.image('flame:' + i, './art/fx/flame_f' + i + '.png');
  // the waterfall loops (roadmap 18.3): 12 frames side by side in one picture each
  for (const [name, w, h] of WATER_SHEETS) scene.load.spritesheet('water:' + name, './art/fx/' + name + '.png', { frameWidth: w, frameHeight: h });
}

const FLAME_FRAMES = 8;
// the flame frames are 200 by 225 with the base of the fire at about 91% of the height
const FLAME_ORIGIN_Y = 0.91;
// size 1 (a brazier) shows the flame about 43 px tall; a lamp passes a smaller size
const FLAME_SCALE = 0.36;

// The picture behind a terrain key, or null if it did not load.
function terrainImage(scene, key) {
  if (!scene.textures.exists('terrain:' + key) && /:\d$/.test(key)) key = key.replace(/:\d$/, ':0');
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
// The name of the diamond picture for a kind of ground (and one of its looks).
// The tile size is part of the name, since each map can have its own.
function tileKey(kind, v) {
  return 'tile:' + setting + ':' + TILE_WIDTH + ':' + kind + ':' + v;
}

export function createBoardTextures(scene) {
  const W = TILE_WIDTH + 2;
  const H = TILE_HEIGHT + 2;

  for (const kind of Object.keys(PALETTE)) {
    const cave = !!CAVE_GROUND[kind];
    const S = cave ? 256 : 128; // size of the flat square patch
    for (let v = 0; v < variantsOf(kind); v++) {
      const key = tileKey(kind, v);
      if (scene.textures.exists(key)) continue;

      // 1. a flat square of ground: the picture if we have one, otherwise painted in code
      const picture = kind === 'bridge' ? planks(S, v) : cave ? terrainImage(scene, 'top:' + kind + ':' + v) : terrainImage(scene, 'top:' + kind);
      const square = document.createElement('canvas');
      square.width = S;
      square.height = S;
      const sq = square.getContext('2d');
      if (picture) {
        // The same picture three ways, so the ground does not look stamped:
        // as it is, mirrored across the diamond, and turned half way round.
        if (!cave && v === 1) sq.setTransform(0, 1, 1, 0, 0, 0);
        if (!cave && v === 2) sq.setTransform(-1, 0, 0, -1, S, S);
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
      if (inCave()) darkenCanvas(ctx, W, H, darkness());

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
  if (setting === 'cavern') makeSigilRing(scene);
}

// Wooden planks for a bridge, as a flat square (the diamond is made from it):
// boards across, two ropes along the sides. v 0 and 2: the boards run one
// way, 1 and 3 the other (a bridge's boards lie across the way you walk).
function planks(S, v) {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  if (v % 2 === 1) g.setTransform(0, 1, 1, 0, 0, 0); // turned a quarter
  const n = 7;
  const bw = S / n;
  for (let i = 0; i < n; i++) {
    const shade = 0.82 + ((i * 37) % 9) / 40;
    g.fillStyle = `rgb(${Math.round(122 * shade)}, ${Math.round(84 * shade)}, ${Math.round(50 * shade)})`;
    g.fillRect(i * bw + 1.5, S * 0.06, bw - 3, S * 0.88);
    g.fillStyle = 'rgba(40, 22, 10, 0.5)'; // the grain
    for (let k = 0; k < 4; k++) g.fillRect(i * bw + 4 + k * (bw / 5), S * 0.1, 1, S * 0.8);
    g.fillStyle = 'rgba(20, 12, 6, 0.85)'; // nails
    g.fillRect(i * bw + bw / 2 - 2, S * 0.14, 4, 4);
    g.fillRect(i * bw + bw / 2 - 2, S * 0.82, 4, 4);
  }
  // the ropes along both sides
  g.fillStyle = '#4a3018';
  g.fillRect(0, S * 0.04, S, S * 0.05);
  g.fillRect(0, S * 0.91, S, S * 0.05);
  g.fillStyle = 'rgba(210, 170, 110, 0.5)';
  for (let x = 0; x < S; x += 10) {
    g.fillRect(x, S * 0.05, 5, 3);
    g.fillRect(x + 5, S * 0.92, 5, 3);
  }
  return c;
}

// His sigil ring laid across the 3 by 3 ritual platform: one diamond per
// tile, each holding its ninth of the ring (by where the tile is as the
// camera sees it, so the ring always looks whole).
function makeSigilRing(scene) {
  const ring = terrainImage(scene, 'sigilRing');
  if (!ring) return;
  const W = TILE_WIDTH + 2;
  const H = TILE_HEIGHT + 2;
  for (let dvc = -1; dvc <= 1; dvc++) {
    for (let dvr = -1; dvr <= 1; dvr++) {
      const key = 'tile:cavern:' + TILE_WIDTH + ':ring:' + dvc + ':' + dvr;
      if (scene.textures.exists(key)) continue;
      const S = 256;
      const square = document.createElement('canvas');
      square.width = S;
      square.height = S;
      const third = ring.width / 3;
      square.getContext('2d').drawImage(ring, (dvc + 1) * third, (dvr + 1) * third, third, third, 0, 0, S, S);
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
      darkenCanvas(ctx, W, H, darkness());
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
function sideTexture(scene, side, height, variant, fade = false) {
  const key = 'face:' + setting + ':' + TILE_WIDTH + ':' + side + ':' + height + ':' + variant + (fade ? ':fade' : '');
  if (scene.textures.exists(key)) return key;
  // the Hidden Cavern: his sunlit rock on the left faces, his shadowed rock on the right
  const cavern = setting === 'cavern';
  const rock = cavern ? terrainImage(scene, side === 'left' ? 'face:caveLit' : 'face:caveDark') : terrainImage(scene, 'face:' + side + 'Rock');
  const band = cavern ? rock : terrainImage(scene, 'face:' + side + 'Band');
  if (!rock || !band) return null;

  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const rockH = height * LEVEL_HEIGHT + (cavern ? BASE_DEPTH : 0); // (in the cavern the rock goes all the way down)
  const depth = BASE_DEPTH + height * LEVEL_HEIGHT;
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
  if (!cavern) ctx.drawImage(band, 0, rockH, hw, BASE_DEPTH);

  // shade: light comes from the top left, so the right side is darker
  // (his cavern rock is already lit and shadowed)
  ctx.fillStyle = cavern ? (side === 'left' ? 'rgba(20, 8, 2, 0.1)' : 'rgba(20, 8, 2, 0.2)') : side === 'left' ? 'rgba(20, 8, 2, 0.12)' : 'rgba(20, 8, 2, 0.42)';
  ctx.fillRect(0, 0, hw, depth);
  // a dark line along the bottom edge
  ctx.fillStyle = 'rgba(15, 6, 2, 0.6)';
  ctx.fillRect(0, depth - 2, hw, 2);
  if (inCave()) darkenCanvas(ctx, texture.width, texture.height, darkness());
  if (fade) {
    // a cavern wall: it sinks into darkness as it rises
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    const grad = ctx.createLinearGradient(0, 0, 0, texture.height);
    grad.addColorStop(0, 'rgba(6, 3, 2, 0.97)');
    grad.addColorStop(0.55, 'rgba(6, 3, 2, 0.8)');
    grad.addColorStop(1, 'rgba(6, 3, 2, 0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, texture.width, texture.height);
    ctx.restore();
  }

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
  if (kind === 'bridge') {
    drawBridge(scene, col, row, map, { x, y, hw, hh, height, depth, rand });
    return;
  }
  const leftKey = sideTexture(scene, 'left', height, variant);
  const rightKey = sideTexture(scene, 'right', height, 1 - variant);
  if (leftKey && rightKey) {
    const v = toView(col, row);
    const lit = fireTint(lightAt(v.vc + 0.5, v.vr + 0.5) * 0.92);
    scene.add.image(x - hw, y, leftKey).setOrigin(0, 0).setDepth(depth).setTint(lit);
    scene.add.image(x, y, rightKey).setOrigin(0, 0).setDepth(depth).setTint(lit);
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
  const variant = Math.floor(rand() * variantsOf(kind));
  let key = tileKey(kind, variant);
  // the platform's tiles round the sigil circle hold his ring (map.json "sigilCircle")
  const ringAt = map.sigilCircle;
  if (kind === 'caveSigil' && ringAt && Math.abs(col - ringAt[0]) <= 1 && Math.abs(row - ringAt[1]) <= 1) {
    const a = toView(col, row);
    const b = toView(ringAt[0], ringAt[1]);
    const ringKey = 'tile:cavern:' + TILE_WIDTH + ':ring:' + (a.vc - b.vc) + ':' + (a.vr - b.vr);
    if (scene.textures.exists(ringKey)) key = ringKey;
  }
  const top = scene.add.image(x, y, key).setDepth(depth);
  top.setTint(shade(0xffffff, Math.min(1, 0.88 + 0.04 * height))); // higher ground is a little lighter
  if (setting === 'cavern') {
    // lit by the fires near it; water keeps its colour (it shines back)
    const v = toView(col, row);
    const f = lightAt(v.vc, v.vr) * (0.94 + 0.03 * height);
    top.setTint(kind === 'water' ? fireTint(Math.max(0.78, f)) & 0xffffff : fireTint(f));
  }
  if (kind === 'water') shimmer(scene, x, y, depth, rand);

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
  // (the tiles behind are found in the view, so this works with the camera turned)
  const { vc, vr } = toView(col, row);
  const upLeft = fromView(vc - 1, vr);
  const upRight = fromView(vc, vr - 1);
  const behindLeft = getHeight(upLeft.col, upLeft.row) - height; // the tile up and to the left
  const behindRight = getHeight(upRight.col, upRight.row) - height; // the tile up and to the right
  if (vc > 0 && behindLeft > 0) shadowStrip(x - hw, y, x, y - hh, behindLeft);
  if (vr > 0 && behindRight > 0) shadowStrip(x, y - hh, x + hw, y, behindRight);

  // A withered thicket: the picture covers the whole top, with the tree on it
  if (kind === 'grass' && scene.textures.exists('terrain:thicket')) {
    const img = scene.add.image(x, y, sceneryKey(scene, 'terrain:thicket')).setDepth(depth + 0.05);
    // the thicket picture's diamond is 148 wide and 101 tall, centred 57 from its top
    img.setOrigin(0.5, 57 / img.height).setScale(TILE_WIDTH / 148, TILE_HEIGHT / 101);
    img.setTint(shade(0xffffff, Math.min(1, 0.88 + 0.04 * height)));
    return;
  }
  if (pictures || CAVE_GROUND[kind]) return; // the pictures already have their own pebbles

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

// Light playing on the water: another of his pool pictures laid over the
// tile, glowing in and out.
function shimmer(scene, x, y, depth, rand) {
  const glint = scene.add.image(x, y, tileKey('water', Math.floor(rand() * 4))).setDepth(depth + 0.05);
  glint.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.05).setTint(0x8fe0ff);
  // (slow and faint: brighter, faster glints read as lights jumping about, Baiyee 1 Nov)
  scene.tweens.add({ targets: glint, alpha: 0.15, duration: 2800 + rand() * 1800, delay: rand() * 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

// A wooden bridge over the water (map letter B): the water below it, the
// deck of planks on top (at the tile's height, so it is walked at that
// height), and posts at its corners down into the water.
function drawBridge(scene, col, row, map, t) {
  const { x, y, hw, hh, height, depth, rand } = t;
  const drop = height * LEVEL_HEIGHT; // how far the water is below the deck
  // the water underneath
  const water = scene.add.image(x, y + drop, tileKey('water', Math.floor(rand() * 4))).setDepth(depth - 0.4);
  water.setTint(0xb8c8c8);
  shimmer(scene, x, y + drop, depth - 0.35, rand);
  const wl = sideTexture(scene, 'left', 0, 0);
  const wr = sideTexture(scene, 'right', 0, 1);
  if (wl && wr) {
    scene.add.image(x - hw, y + drop, wl).setOrigin(0, 0).setDepth(depth - 0.4);
    scene.add.image(x, y + drop, wr).setOrigin(0, 0).setDepth(depth - 0.4);
  }
  // the boards lie across the way you walk: along the rows or the columns
  const land = (c, r) => getHeight(c, r) > 0 && terrainAt(map, c, r) !== 'water';
  const alongRows = land(col, row - 1) || land(col, row + 1);
  const a = toView(col, row);
  const b = toView(col, row + 1);
  const runsVc = alongRows ? Math.abs(b.vc - a.vc) === 1 : Math.abs(b.vc - a.vc) !== 1;
  // the posts
  const g = scene.add.graphics().setDepth(depth - 0.3);
  for (const [px, py] of [[x - hw * 0.72, y], [x + hw * 0.72, y], [x, y + hh * 0.72]]) {
    g.fillStyle(0x2a180c, 1).fillRect(px - 3, py, 6, drop + 6);
    g.fillStyle(0x6a4428, 1).fillRect(px - 3, py, 3, drop + 6);
  }
  // the deck: planks across the way it runs (picture 1 or 0), a dark edge under it
  const deck = scene.add.image(x, y, tileKey('bridge', runsVc ? 1 : 0)).setDepth(depth);
  deck.setTint(fireTint(lightAt(a.vc, a.vr) * 0.95));
  g.fillStyle(0x1a0e06, 0.85);
  g.fillPoints([{ x: x - hw, y }, { x, y: y + hh }, { x: x + hw, y }, { x: x + hw, y: y + 5 }, { x, y: y + hh + 5 }, { x: x - hw, y: y + 5 }], true);
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
  if (inCave()) {
    drawCaveFloor(scene);
    return;
  }
  const last = GRID_SIZE - 1;
  // the three front corners of the board, as the camera sees it now
  const cLeft = fromView(0, last);
  const cBottom = fromView(last, last);
  const cRight = fromView(last, 0);
  const left = tileToScreen(cLeft.col, cLeft.row);
  const bottom = tileToScreen(cBottom.col, cBottom.row);
  const right = tileToScreen(cRight.col, cRight.row);
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const baseDepth = tileSideDepth(cLeft.col, cLeft.row);

  // the edge of the board along the bottom: left corner, bottom corner, right corner
  const lx = left.x - hw;
  const ly = left.y + baseDepth;
  const bx = bottom.x;
  const by = bottom.y + hh + tileSideDepth(cBottom.col, cBottom.row);
  const rx = right.x + hw;
  const ry = right.y + tileSideDepth(cRight.col, cRight.row);

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
// x0 and x1 say how far left and right of the world it must reach (a
// landscape screen sees more of the world's sides; roadmap 8.1).
export function drawBackdrop(scene, x0 = 0, x1 = GAME_WIDTH) {
  if (inCave()) {
    drawCaveBackdrop(scene, x0, x1);
    return;
  }
  // The painted wasteland, if we have it
  if (scene.textures.exists('terrain:backdrop')) {
    scene.add.image(x0, 0, 'terrain:backdrop').setOrigin(0, 0).setDepth(-21).setDisplaySize(x1 - x0, GAME_HEIGHT);
    // the ground fades to dark at the bottom, where the buttons are
    const fade = scene.add.graphics().setDepth(-20);
    for (let i = 0; i < 12; i++) {
      fade.fillStyle(0x140e0b, (i + 1) / 12);
      fade.fillRect(x0, 800 + i * 10, x1 - x0, 11);
    }
    fade.fillStyle(0x140e0b, 1);
    fade.fillRect(x0, 920, x1 - x0, GAME_HEIGHT - 920);
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
    g.fillRect(x0, (horizon * i) / bands, x1 - x0, horizon / bands + 2);
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
    g.moveTo(x0, GAME_HEIGHT);
    for (let x = x0; x <= x1 + 40; x += 40) {
      g.lineTo(x, baseY + Math.sin(x / 90 + seed) * amp + (rand() - 0.5) * 8);
    }
    g.lineTo(x1, GAME_HEIGHT);
    g.closePath();
    g.fillPath();
  };
  dune(690, 26, 0x6a3f33, 3);
  dune(740, 22, 0x4a2c28, 7);
  dune(800, 18, 0x2f1c1b, 11);

  // the ground fades to dark at the bottom, where the buttons are
  g.fillStyle(0x140e0b, 1);
  g.fillRect(x0, 900, x1 - x0, GAME_HEIGHT - 900);
  for (let i = 0; i < 8; i++) {
    g.fillStyle(0x140e0b, i / 8);
    g.fillRect(x0, 820 + i * 10, x1 - x0, 11);
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
    if (item.prop === 'torch') {
      drawTorch(scene, item);
      continue;
    }
    if (!scene.textures.exists('terrain:' + item.prop)) continue;
    // Props off the board (the cave walls) are the room around the board:
    // they stay on the far side whichever way the camera turns, so they
    // never block the view. Their col and row are places in the VIEW.
    const key = sceneryKey(scene, 'terrain:' + item.prop);
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
  // the tile the sand lands on (as the map was drawn: "left" is the next row, "right" the next column)
  const nCol = item.side !== 'right' ? col : col + 1;
  const nRow = item.side !== 'right' ? row + 1 : row;
  const drop = getHeight(col, row) - getHeight(nCol, nRow);
  if (drop <= 0) return;
  // With the camera turned, that cliff face may now face away (hidden), or be the other front face
  const a = toView(col, row);
  const b = toView(nCol, nRow);
  let left;
  if (b.vc - a.vc === 0 && b.vr - a.vr === 1) left = true; // pours down the front-left face
  else if (b.vc - a.vc === 1 && b.vr - a.vr === 0) left = false; // the front-right face
  else return; // that face points away from the camera now
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

// ---------- Inside the cave ----------

// The darkness of the cavern: black above, warm dark rock lower down, rock
// walls closing in at the sides, and teeth of rock hanging from the ceiling.
// When we have a painted cave picture, add it to TERRAIN_FILES as
// caveBackdrop and it is used instead.
function drawCaveBackdrop(scene, X0 = 0, X1 = GAME_WIDTH) {
  if (setting === 'cavern' && scene.textures.exists('terrain:caveBackdrop')) {
    // his tall cavern painting (roadmap 11.6), filling the width, its top at
    // the top of the world, a little darker so the board stands out
    const img = scene.add.image((X0 + X1) / 2, -120, 'terrain:caveBackdrop').setOrigin(0.5, 0).setDepth(-21);
    img.setScale(Math.max((X1 - X0) / img.width, (GAME_HEIGHT + 120) / img.height));
    img.setTint(0x9a8a7a);
  } else {
    const g = scene.add.graphics().setDepth(-21);
    const bands = 30;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const color = t < 0.5 ? lerpColor(0x050302, 0x1c110b, t / 0.5) : lerpColor(0x1c110b, 0x2a1810, (t - 0.5) / 0.5);
      g.fillStyle(color, 1);
      g.fillRect(X0, (900 * i) / bands, X1 - X0, 900 / bands + 2);
    }
    const rand = makeRandom(77);
    // rock walls at the sides, in two layers
    const wall = (side, color, reach, seed) => {
      const r = makeRandom(seed);
      const x0 = side === 'left' ? X0 : X1;
      const dir = side === 'left' ? 1 : -1;
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(x0, 120);
      for (let y = 120; y <= 900; y += 40) g.lineTo(x0 + dir * (reach * (0.55 + 0.45 * Math.sin(y / 170 + seed)) + r() * 30), y);
      g.lineTo(x0, 900);
      g.closePath();
      g.fillPath();
    };
    wall('left', 0x22140c, 150, 1);
    wall('right', 0x22140c, 150, 4);
    wall('left', 0x120a06, 80, 9);
    wall('right', 0x120a06, 80, 13);
    // rock teeth hanging from the ceiling
    for (let i = 0; i < Math.round((16 * (X1 - X0)) / GAME_WIDTH); i++) {
      const x = X0 + rand() * (X1 - X0);
      const w = 14 + rand() * 30;
      const h = 40 + rand() * 120;
      g.fillStyle(rand() < 0.5 ? 0x1a0f09 : 0x0e0805, 1);
      g.beginPath();
      g.moveTo(x - w, 150);
      g.lineTo(x + w, 150);
      g.lineTo(x + (rand() - 0.5) * 8, 150 + h);
      g.closePath();
      g.fillPath();
    }
  }
  // dark at the bottom, where the buttons are
  const fade = scene.add.graphics().setDepth(-20);
  for (let i = 0; i < 12; i++) {
    fade.fillStyle(0x0a0604, (i + 1) / 12);
    fade.fillRect(X0, 800 + i * 10, X1 - X0, 11);
  }
  fade.fillStyle(0x0a0604, 1);
  fade.fillRect(X0, 920, X1 - X0, GAME_HEIGHT - 920);
}

// The cave floor carries on past the edge of the board, fading into the dark,
// so the board is part of the cavern instead of a floating island.
// These outer tiles are only decoration: units cannot walk on them.
function drawCaveFloor(scene) {
  const kinds = setting === 'cavern' ? ['floor', 'rubble', 'floor', 'caveSand', 'rubble'] : ['rock', 'rift', 'cracked', 'rock', 'dust'];
  const ring = [];
  for (let c = -1; c <= GRID_SIZE + 2; c++) for (let r = GRID_SIZE; r <= GRID_SIZE + 2; r++) ring.push([c, r]);
  for (let r = -1; r < GRID_SIZE; r++) for (let c = GRID_SIZE; c <= GRID_SIZE + 2; c++) ring.push([c, r]);
  for (const [c, r] of ring) {
    const rand = makeRandom(c * 37 + r * 91 + 3);
    const away = Math.max(c - (GRID_SIZE - 1), r - (GRID_SIZE - 1), 1); // 1, 2 or 3 tiles out
    const x = BOARD_CENTER_X + ((c - r) * TILE_WIDTH) / 2;
    const y = BOARD_TOP_Y + ((c + r) * TILE_HEIGHT) / 2;
    const kind = kinds[Math.floor(rand() * kinds.length)];
    const img = scene.add.image(x, y, tileKey(kind, Math.floor(rand() * variantsOf(kind))));
    img.setDepth((c + r) * 2).setAlpha(away === 1 ? 0.42 : away === 2 ? 0.16 : 0.05);
  }
}

// A torch fixed to a rock wall: a flame, a flickering glow, and sparks.
//   { "prop": "torch", "col": 3, "row": -1 }  sits on the wall at that spot
function drawTorch(scene, item) {
  const x = BOARD_CENTER_X + ((item.col - item.row) * TILE_WIDTH) / 2;
  const y = BOARD_TOP_Y + ((item.col + item.row) * TILE_HEIGHT) / 2 - 18;
  const depth = (item.col + item.row) * 2 - 0.2;
  const g = scene.add.graphics().setDepth(depth);
  g.lineStyle(4, 0x2a1a10, 1); // the wooden handle
  g.lineBetween(x - 4, y + 22, x, y);
  g.fillStyle(0xffb347, 1); // the flame
  g.fillEllipse(x, y - 6, 9, 16);
  g.fillStyle(0xfff1c0, 1);
  g.fillEllipse(x, y - 4, 4, 8);
  if (scene.textures.exists('fx-glow')) {
    const glow = scene.add.image(x, y - 6, 'fx-glow').setDepth(depth).setBlendMode('ADD').setScale(0.6).setAlpha(0.8);
    scene.tweens.add({ targets: glow, alpha: 0.66, scale: 0.58, duration: 700 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  if (scene.textures.exists('fx-dot')) {
    scene.add.particles(x, y - 10, 'fx-dot', {
      speedY: { min: -26, max: -14 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: [0xffb04a, 0xff7a2e],
      lifespan: 800,
      frequency: 650,
      blendMode: 'ADD',
    }).setDepth(depth);
  }
}

// ---------- Firelight in the Hidden Cavern ----------
// His cavern has no natural openings: it is lit only by fire. Each tile is as
// bright as the flames near it make it (the ritual lamps, the braziers on the
// ledge), warm near them and dark between. Worked out in the camera's view,
// again each time the board is drawn.
// (lighting test, roadmap 1.38) every flame's position, for lighting.js; and a switch that turns
// the old darkening tints off when real lights are on
export const flamePoints = [];
let litMode = false;
export function setLitMode(on) { litMode = on; }
let lights = [];
export function prepareLights(map) {
  lights = [];
  flamePoints.length = 0;
  if (setting !== 'cavern') return;
  for (const [c, r] of map.lamps || []) {
    const v = toView(c, r);
    lights.push({ vc: v.vc, vr: v.vr, strength: 0.5, reach: 1.35 });
  }
  for (const item of (map.surround && map.surround.props) || []) {
    if (item.prop === 'brazier') lights.push({ vc: item.at[0], vr: item.at[1], strength: 0.7, reach: 1.9 });
  }
}

// How lit a spot in the view is: 0.42 in the dark, up to about 1.1 by a fire.
function lightAt(vc, vr) {
  if (setting !== 'cavern' || litMode) return 1;
  let sum = 0;
  for (const l of lights) {
    const d2 = (vc - l.vc) ** 2 + (vr - l.vr) ** 2;
    sum += l.strength * Math.exp(-d2 / (2 * l.reach * l.reach));
  }
  return Math.min(1.12, 0.42 + 0.75 * Math.min(1, sum));
}

// A warm tint for that much light (firelight is orange: less blue than red).
function fireTint(f) {
  if (litMode) return 0xffffff;
  const r = Math.min(255, Math.round(255 * f));
  const g = Math.min(255, Math.round(255 * f * 0.92));
  const b = Math.min(255, Math.round(255 * f * 0.8));
  return (r << 16) | (g << 8) | b;
}

// ---------- The Hidden Cavern around the board (Phase 11) ----------

// Everything in the cavern that isn't a tile you can stand on: the ledge and
// rock walls round the far sides with his props on the ledge, water pouring
// off the ritual platform, and the ritual lamps. All read from the map file.
export function drawCavern(scene, map) {
  if (setting !== 'cavern') return;
  drawSurround(scene, map.surround || {});
  waterfallSprites.length = 0; // (a new board: the old pictures went with the old scene)
  for (const w of map.waterfalls || []) drawWaterfall(scene, w);
  for (const [c, r] of map.lamps || []) drawLamp(scene, c, r, map.sigilCircle || [4, 4]);
  drawSites(scene);
}

// Things lying on the board that a unit can dig up (roadmap 5.3): the pots and
// bone piles of the map's "digsites", and the satchel a fallen unit leaves.
// scene.sites holds them; a dug one is not drawn. Each keeps its picture in
// site.sprite so the dig can fade it out.
function drawSites(scene) {
  for (const site of scene.sites || []) drawSite(scene, site);
}

export function drawSite(scene, site) {
  {
    site.sprite = null;
    if (site.dug) return;
    const { x, y } = tileToScreen(site.col, site.row);
    const v = toView(site.col, site.row);
    const depth = depthFor(site.col, site.row) + 0.4;
    const spec = CAVE_PROPS[site.prop];
    if (spec && scene.textures.exists('terrain:' + site.prop)) {
      const img = scene.add.image(x, y + TILE_HEIGHT * 0.1, 'terrain:' + site.prop).setOrigin(spec.originX, 1);
      img.setScale((spec.width * 0.8 * (TILE_WIDTH / 112)) / img.width).setDepth(depth).setTint(fireTint(lightAt(v.vc, v.vr) * 0.95));
      site.sprite = img;
    } else {
      // a small satchel on the floor, drawn round its own point
      const g = scene.add.graphics({ x, y }).setDepth(depth);
      g.fillStyle(0x000000, 0.35).fillEllipse(0, 2, 26, 9);
      g.fillStyle(0x7a4f2a, 1).fillEllipse(0, -5, 22, 14);
      g.fillStyle(0xb98a52, 1).fillEllipse(0, -8, 14, 7);
      g.fillStyle(0xffe08a, 1).fillCircle(0, -9, 1.6);
      site.sprite = g;
    }
  }
}

// A block of rock seen from the camera at a place in the VIEW (it stays
// behind the board whichever way the camera turns): sides of his rock and a
// rubble top. Used for the ledge and the walls round the board.
function drawViewBlock(scene, vc, vr, height, topKind, depthShift, wall = false) {
  const { x, y } = viewToScreen(vc, vr, height);
  const hw = TILE_WIDTH / 2;
  const rand = makeRandom(vc * 71 + vr * 13 + height * 7 + 11);
  const depth = (vc + vr) * 2 + depthShift;
  const v = rand() < 0.5 ? 0 : 1;
  const l = sideTexture(scene, 'left', height, v, wall);
  const r = sideTexture(scene, 'right', height, 1 - v, wall);
  const lit = fireTint(lightAt(vc + 0.5, vr + 0.5) * (wall ? 1 : 0.9));
  if (l && r) {
    scene.add.image(x - hw, y, l).setOrigin(0, 0).setDepth(depth).setTint(lit);
    scene.add.image(x, y, r).setOrigin(0, 0).setDepth(depth).setTint(lit);
  }
  scene.add.image(x, y, tileKey(topKind, Math.floor(rand() * 4))).setDepth(depth).setTint(wall ? 0x1c140e : fireTint(lightAt(vc, vr) * 0.85));
  return { x, y, depth };
}

// The ledge one tile deep round the far sides (with his props on it), then
// the rock walls behind it, reaching up into the dark.
function drawSurround(scene, surround) {
  const n = GRID_SIZE;
  const ledge = surround.ledgeHeight || 3;
  const wall = surround.wallHeight || 9;
  for (let vc = -2; vc <= n; vc++) drawViewBlock(scene, vc, -2, wall + (vc % 3 === 0 ? 1 : 0), 'rubble', -0.6, true);
  for (let vr = -1; vr <= n; vr++) drawViewBlock(scene, -2, vr, wall + (vr % 3 === 1 ? 1 : 0), 'rubble', -0.6, true);
  for (let vc = -1; vc <= n; vc++) drawViewBlock(scene, vc, -1, ledge, 'floor', -0.5);
  for (let vr = 0; vr <= n; vr++) drawViewBlock(scene, -1, vr, ledge, 'floor', -0.5);
  for (const item of surround.props || []) {
    const [vc, vr] = item.at;
    const spec = CAVE_PROPS[item.prop];
    if (!spec || !scene.textures.exists('terrain:' + item.prop)) continue;
    const { x, y } = viewToScreen(vc, vr, ledge);
    const img = scene.add.image(x, y + TILE_HEIGHT * 0.18, 'terrain:' + item.prop).setOrigin(spec.originX, 1);
    img.setScale((spec.width * (TILE_WIDTH / 112)) / img.width).setDepth((vc + vr) * 2 - 0.3).setTint(fireTint(lightAt(vc, vr) * 0.95));
    if (item.flip) img.setFlipX(true);
    if (item.prop === 'brazier') flame(scene, x + (0.5 - spec.originX) * img.displayWidth, y + TILE_HEIGHT * 0.18 - img.displayHeight * 0.77, (vc + vr) * 2 - 0.2, 1.15); // base of the fire in the bowl, covering the painted flame
  }
}

// A flickering flame with its glow and sparks (braziers, lamps).
function flame(scene, x, y, depth, size) {
  // drawn round its own point and placed at (x, y): a Graphics scales from its
  // own point, and drawn at (x, y) inside it the flame slid up and down the
  // screen as it flickered (the lights "moving out of place", Baiyee 1 Nov)
  flamePoints.push({ x, y });
  if (scene.textures.exists('flame:1')) {
    // the looping flame: one shared animation, each flame starts on its own frame
    // and speed so a row of braziers does not flicker in step
    if (!scene.anims.exists('flame-loop')) {
      const frames = [];
      for (let i = 1; i <= FLAME_FRAMES; i++) frames.push({ key: 'flame:' + i });
      scene.anims.create({ key: 'flame-loop', frames, frameRate: 10, repeat: -1 });
    }
    const f = scene.add.sprite(x, y, 'flame:1').setOrigin(0.5, FLAME_ORIGIN_Y).setScale(FLAME_SCALE * size).setDepth(depth);
    f.play({ key: 'flame-loop', startFrame: Math.floor(Math.random() * FLAME_FRAMES), frameRate: 9 + Math.random() * 3 });
    // only a soft, low glow close round the fire (no big floating ball of light)
    if (scene.textures.exists('fx-glow')) {
      const glow = scene.add.image(x, y - 10 * size, 'fx-glow').setDepth(depth - 0.01).setBlendMode('ADD').setScale(0.4 * size).setAlpha(0.3);
      scene.tweens.add({ targets: glow, alpha: 0.22, duration: 900 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  } else {
    // old painted-shape flame, used only if the pictures did not load
    const g = scene.add.graphics({ x, y }).setDepth(depth);
    g.fillStyle(0xffb347, 0.9).fillEllipse(0, -4 * size, 9 * size, 16 * size);
    g.fillStyle(0xfff1c0, 1).fillEllipse(0, -2 * size, 4 * size, 8 * size);
  }
  if (scene.textures.exists('fx-dot')) {
    scene.add.particles(x, y - 8 * size, 'fx-dot', {
      speedY: { min: -24, max: -12 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.2 * size, end: 0 },
      alpha: { start: 0.65, end: 0 },
      tint: [0xffb04a, 0xff7a2e],
      lifespan: 800,
      frequency: 900,
      blendMode: 'ADD',
    }).setDepth(depth);
  }
}

// A small ritual lamp at the outer corner of a platform tile: a stone bowl
// with a flame (his main view has them round the sigil).
function drawLamp(scene, col, row, centre) {
  const { x, y } = tileToScreen(col, row);
  const a = toView(col, row);
  const b = toView(centre[0], centre[1]);
  const dvc = Math.sign(a.vc - b.vc);
  const dvr = Math.sign(a.vr - b.vr);
  // the corner pointing away from the middle of the platform
  const cx = x + ((dvc - dvr) * TILE_WIDTH) / 4 * 0.72;
  const cy = y + ((dvc + dvr) * TILE_HEIGHT) / 4 * 0.72;
  const front = dvc + dvr > 0; // the corner nearest the camera is drawn in front of the tile's figure
  const depth = depthFor(col, row) + (front ? 1.5 : 0.3);
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(0x000000, 0.35).fillEllipse(cx, cy + 2, 22, 8);
  g.fillStyle(0x3a2a1c, 1).fillEllipse(cx, cy - 3, 18, 9);
  g.fillStyle(0x6a5038, 1).fillEllipse(cx, cy - 6, 16, 6);
  flame(scene, cx, cy - 3, depth + 0.01, 0.45); // small flame in the bowl
}

// ---------- The waterfalls (roadmap 1.41 and 18.3, checklist C3) ----------
// Three loops made in Blender with the board's own camera (12 frames each, in
// one strip, see dev/tools/make_water.py): a tall sheet for a drop of two
// levels or more, a short one for one level, and a ring of ripples where the
// water lands. They are drawn for the front-LEFT face of a block; the
// front-right face shows them mirrored.
const WATER_SHEETS = [['waterfall_tall', 256, 352], ['waterfall', 256, 224], ['splash_ring', 272, 168]];
// Where things are inside a frame, in its own pixels (measured on the frames):
//   lip    : the middle of the sheet's top edge (it sits on the middle of the ledge's edge)
//   height : how long the sheet is below the lip
const FALL_SHAPE = {
  waterfall_tall: { lip: { x: 111, y: 90 }, height: 194, w: 256, h: 352 },
  waterfall: { lip: { x: 108, y: 92 }, height: 59, w: 256, h: 224 },
};
const WATER_FRAMES = 12;

// Water pouring off a ledge into the water below: [col, row, toCol, toRow].
// Only a face turned towards the camera shows it.
function drawWaterfall(scene, w) {
  const [c, r, c2, r2] = w;
  const drop = getHeight(c, r) - getHeight(c2, r2);
  if (drop <= 0) return;
  const a = toView(c, r);
  const b = toView(c2, r2);
  let left;
  if (b.vc - a.vc === 0 && b.vr - a.vr === 1) left = true; // the front-left face
  else if (b.vc - a.vc === 1 && b.vr - a.vr === 0) left = false; // the front-right face
  else return;
  const { x, y } = tileToScreen(c, r);
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const sx = left ? x - hw / 2 : x + hw / 2; // the middle of the ledge's edge
  const sy = y + hh / 2;
  const length = drop * LEVEL_HEIGHT + 6;
  const depth = depthFor(c, r) + 0.25;
  const name = drop >= 2 ? 'waterfall_tall' : 'waterfall';
  if (!scene.textures.exists('water:' + name)) return drawWaterfallOld(scene, sx, sy, length, depth, c2, r2);
  const shape = FALL_SHAPE[name];
  const loop = (key) => {
    if (!scene.anims.exists(key + '-loop')) {
      scene.anims.create({ key: key + '-loop', frames: scene.anims.generateFrameNumbers('water:' + key, { start: 0, end: WATER_FRAMES - 1 }), frameRate: 12, repeat: -1 });
    }
    return key + '-loop';
  };
  // the sheet: scaled so it is as long as the drop, its lip on the ledge
  const scale = length / shape.height;
  const fall = scene.add.sprite(sx, sy - 2, 'water:' + name)
    .setOrigin(left ? shape.lip.x / shape.w : 1 - shape.lip.x / shape.w, shape.lip.y / shape.h)
    .setScale(scale).setFlipX(!left).setDepth(depth);
  fall.play({ key: loop(name), startFrame: Math.floor(Math.random() * WATER_FRAMES) }); // each fall starts on its own frame
  waterfallSprites.push(fall);
  // ripples where it lands, lying on the pool
  if (scene.textures.exists('water:splash_ring')) {
    const ring = scene.add.sprite(sx, sy + length + 2, 'water:splash_ring').setScale(scale * 0.9).setAlpha(0.85).setDepth(depthFor(c2, r2) + 0.3);
    ring.play({ key: loop('splash_ring'), startFrame: Math.floor(Math.random() * WATER_FRAMES) });
    waterfallSprites.push(ring);
  }
}
// every waterfall picture on the board now (tests and the browser checks read this)
export const waterfallSprites = [];

// The old waterfall, drawn in code: only used if the pictures did not load.
function drawWaterfallOld(scene, sx, sy, length, depth, c2, r2) {
  makeFallTexture(scene);
  const fall = scene.add.tileSprite(sx, sy - 2, 26, length, 'fx-waterfall').setOrigin(0.5, 0).setDepth(depth).setAlpha(0.85);
  fall.setBlendMode(Phaser.BlendModes.SCREEN);
  scene.tweens.add({ targets: fall, tilePositionY: -256, duration: 1600, repeat: -1 });
  // white water and mist where it lands
  if (scene.textures.exists('fx-dot')) {
    scene.add.particles(sx, sy + length - 4, 'fx-dot', {
      speed: { min: 3, max: 10 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.4, end: 0.1 },
      alpha: { start: 0.3, end: 0 },
      tint: [0xdff6ff, 0x9fd8ec],
      lifespan: 900,
      frequency: 170,
    }).setDepth(depthFor(c2, r2) + 0.3);
  }
}

// The falling water: pale streaks on a soft blue, drawn once, scrolled down.
function makeFallTexture(scene) {
  if (scene.textures.exists('fx-waterfall')) return;
  const W = 32;
  const H = 256;
  const tex = scene.textures.createCanvas('fx-waterfall', W, H);
  const g = tex.getContext();
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'rgba(120, 190, 210, 0)');
  grad.addColorStop(0.25, 'rgba(120, 190, 210, 0.45)');
  grad.addColorStop(0.75, 'rgba(120, 190, 210, 0.45)');
  grad.addColorStop(1, 'rgba(120, 190, 210, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const rand = makeRandom(9);
  for (let i = 0; i < 40; i++) {
    const x = 5 + rand() * (W - 10);
    const y = rand() * H;
    const len = 20 + rand() * 60;
    g.fillStyle = `rgba(235, 250, 255, ${0.35 + rand() * 0.4})`;
    g.fillRect(x, y, 1.5, len);
    if (y + len > H) g.fillRect(x, y - H, 1.5, len); // wraps round, so it scrolls without a seam
  }
  tex.refresh();
}
