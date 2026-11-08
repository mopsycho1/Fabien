import smoke from './data/smoke.json';
import { TILE_WIDTH } from './config.js';

// The archer's Smoke Bomb cloud (roadmap 13.26), from Suleiman's two 8 Nov sheets:
// 6 stages of the cloud growing and 4 frames of it blowing away. They are cut
// see-through (no floor tile) by dev/tools/make_smoke.py, and src/data/smoke.json says where
// the middle of each picture's tile is, so the cloud stands on a board tile.
// Every picture is optional: with none loaded the functions do nothing and return null.

const keyOf = (set, i) => 'smoke:' + set + i;

export function preloadSmokeArt(scene) {
  for (const set of ['cloud', 'clear']) smoke[set].forEach((f, i) => scene.load.image(keyOf(set, i), './art/fx/' + f.file));
}

const ready = (scene, set) => smoke[set].every((f, i) => scene.textures.exists(keyOf(set, i)));

// Puts one frame down with its tile middle on (x, y). The pictures were cut at an 86 px tile.
function place(scene, img, set, i, x, y) {
  const f = smoke[set][i];
  img.setTexture(keyOf(set, i)).setOrigin(f.ax, f.ay).setPosition(x, y).setScale(TILE_WIDTH / 86);
}

// The bomb goes off on the tile at (x, y): the burst, then the cloud grows through its 6 stages
// and stays at the last one. Returns { img, clear(done), ms } or null. "clear" plays the
// dissipating sheet, fades it out and destroys it (done is called at the end).
export function smokeCloud(scene, x, y, depth, { frameMs = 90 } = {}) {
  if (!ready(scene, 'cloud')) return null;
  const img = scene.add.image(x, y, keyOf('cloud', 0)).setDepth(depth).setAlpha(0.96);
  place(scene, img, 'cloud', 0, x, y);
  smoke.cloud.forEach((f, i) => scene.time.delayedCall(i * frameMs, () => img.active && place(scene, img, 'cloud', i, x, y)));
  return {
    img,
    ms: smoke.cloud.length * frameMs,
    clear(done) {
      if (!img.active) { if (done) done(); return 0; }
      if (!ready(scene, 'clear')) {
        scene.tweens.add({ targets: img, alpha: 0, duration: 500, onComplete: () => { img.destroy(); if (done) done(); } });
        return 500;
      }
      const ms = 120;
      smoke.clear.forEach((f, i) => scene.time.delayedCall(i * ms, () => img.active && place(scene, img, 'clear', i, x, y)));
      scene.tweens.add({ targets: img, alpha: 0, delay: smoke.clear.length * ms - 60, duration: 260, onComplete: () => { img.destroy(); if (done) done(); } });
      return smoke.clear.length * ms + 200;
    },
  };
}
