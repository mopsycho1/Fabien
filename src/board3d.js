// The Hidden Cavern rendered in Blender (Graphics 2.0 step 3), shown with ?map=blender in the
// address so it can be compared with today's board. Nothing about tiles, taps or rules changes:
// grid.js still decides where every tile is; the pictures were rendered with the game's own
// camera (dev/blender/cavern_board.py) and cut by dev/tools/make_board3d.py.
//
// Two pictures per camera turn:
//   base  the whole board, drawn under everything (depth -6)
//   top   every tile block cut out on its own; each piece is drawn at its tile's depth, as the
//         old tile blocks were, so a fighter behind a taller tile is hidden by it.
// Still drawn live on top, because they move: the flames, the waterfalls, the pots and bones you
// can dig up, and every highlight.
import data from './data/board3d.json';
import { depthFor } from './grid.js';
import { flame } from './boardArt.js';

export function board3dOn() {
  if (typeof window === 'undefined') return false;
  if (window.__mapStyle) return window.__mapStyle === 'blender';
  return /[?&]map=blender/.test(window.location.search || '');
}

const baseKey = (rot) => 'board3d:base:' + rot;
const topKey = (rot) => 'board3d:top:' + rot;

// Queues the pictures of one camera turn (WebP files go through artUrl unchanged).
export function queueBoard3d(scene, rot) {
  const r = data.rotations && data.rotations[rot];
  if (!r) return false;
  if (!scene.textures.exists(baseKey(rot))) scene.load.image(baseKey(rot), './' + r.base);
  if (!scene.textures.exists(topKey(rot))) scene.load.image(topKey(rot), './' + r.top);
  return true;
}

export function board3dReady(scene, rot) {
  return board3dOn() && scene.textures.exists(baseKey(rot)) && scene.textures.exists(topKey(rot));
}

// Loads a camera turn's pictures if they are not in yet, then calls done (at once if they are).
export function withBoard3d(scene, rot, done) {
  if (!board3dOn() || board3dReady(scene, rot) || !queueBoard3d(scene, rot)) return done();
  scene.load.once('complete', done);
  scene.load.start();
}

// Draws the board for the current camera turn. Returns false if its pictures are not loaded.
export function drawBoard3d(scene, rot) {
  if (!board3dReady(scene, rot)) return false;
  const r = data.rotations[rot];
  const [X0, Y0] = data.region;
  const s = 1 / data.k;
  scene.add.image(X0, Y0, baseKey(rot)).setOrigin(0, 0).setScale(s).setDepth(-6);
  const tex = scene.textures.get(topKey(rot));
  for (const [col, row, ax, ay, w, h, gx, gy] of r.pieces) {
    const name = col + ':' + row;
    if (!tex.has(name)) tex.add(name, 0, ax, ay, w, h);
    scene.add.image(gx, gy, topKey(rot), name).setOrigin(0, 0).setScale(s).setDepth(depthFor(col, row));
  }
  // the fires: the ritual lamps on their tiles, the braziers on the ledge (places measured in Blender)
  for (const f of r.flames) {
    if (f.kind === 'lamp') flame(scene, f.x, f.y, depthFor(f.col, f.row) + (f.front ? 1.5 : 0.3) + 0.01, 0.45);
    else flame(scene, f.x, f.y, f.depth, 1.0);
  }
  return true;
}
