import smoke from './data/smoke.json';
import { TILE_WIDTH } from './config.js';

// The archer's Smoke Bomb cloud (roadmap 13.26, redone in 1.34).
// Suleiman's 6-stage cloud grows on the tile, holds (drifting and breathing) with a few soft grey
// puffs rolling off its edges, and clears with his 4 dissipating frames. The pictures were cut with
// rembg (dev/tools/make_smoke_rembg.py) and are drawn NORMALLY, not as added light, so they stay
// grey-white in the warm cave. src/data/smoke.json says where the tile's middle is in each picture.
// Every picture is optional: with none loaded, the growth and the clear are just a fade.

const keyOf = (set, i) => 'smoke:' + set + i;
const PUFF = 'smoke-puff';
const CLOUD_ALPHA = 0.82;      // 80 to 85%: solid enough to read as smoke, the tile still shows faintly
const CUT_TILE = 172;          // the pictures were cut with the tile 172 px wide
const SIZE = 1.25;             // a little over one tile wide and about head height on the archer

export function preloadSmokeArt(scene) {
  smoke.cloud.forEach((f, i) => scene.load.image(keyOf('cloud', i), './art/fx/' + f.file));
  smoke.clear.forEach((f, i) => scene.load.image(keyOf('clear', i), './art/fx/' + f.file));
}

const ready = (scene, set) => smoke[set].every((f, i) => scene.textures.exists(keyOf(set, i)));

// A soft round puff (one canvas texture, made once): a white dot the emitter tints grey.
function makePuff(scene) {
  if (scene.textures.exists(PUFF)) return;
  const tex = scene.textures.createCanvas(PUFF, 64, 64);
  const d = tex.getContext();
  const g = d.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  d.fillStyle = g;
  d.fillRect(0, 0, 64, 64);
  tex.refresh();
}

// Puts one frame of a set down with the tile's middle on (x, y).
function place(img, set, i, x, y) {
  const f = smoke[set][i];
  img.setTexture(keyOf(set, i)).setOrigin(f.ax, f.ay).setPosition(x, y).setScale(SIZE * TILE_WIDTH / CUT_TILE);
}

// The bomb goes off on the tile at (x, y). Returns { img, clear(done), ms }.
// img is a container: first the puffs emitter, then the cloud picture. "clear" stops the puffs,
// plays the dissipating frames while the cloud fades, and destroys it (done is called at the end).
export function smokeCloud(scene, x, y, depth, { growMs = 130 } = {}) {
  makePuff(scene);
  const box = scene.add.container(x, y).setDepth(depth);
  // a few soft grey puffs drift off the cloud's edges (drawn normally, grey, never bright)
  const puffs = scene.add.particles(0, 0, PUFF, {
    frequency: 380,
    maxAliveParticles: 8,
    lifespan: { min: 1800, max: 2800 },
    scale: { start: 0.45, end: 1.1 },
    alpha: { start: 0.38, end: 0 },
    tint: [0xb9b2aa, 0xaaa39b, 0xc4bdb5],
    speedX: { min: -10, max: 10 },
    speedY: { min: -14, max: -4 },
    emitZone: { type: 'edge', source: new Phaser.Geom.Ellipse(0, -26, 96, 44), quantity: 1 },
  });
  box.add(puffs);
  const cloud = scene.add.image(0, 0, PUFF).setAlpha(CLOUD_ALPHA);
  box.add(cloud);
  if (ready(scene, 'cloud')) {
    // the 6 stages play, then the last one holds
    smoke.cloud.forEach((f, i) => scene.time.delayedCall(i * growMs, () => cloud.active && place(cloud, 'cloud', i, 0, 0)));
  } else {
    cloud.setVisible(false); // no pictures: the puffs alone
  }
  // the drift and the breath: the cloud slides a little and swells and shrinks
  const drift = scene.tweens.add({ targets: box, x: { from: x - 3, to: x + 3 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const breathe = scene.tweens.add({ targets: box, scaleX: 1.03, scaleY: 1.04, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return {
    img: box,
    ms: growMs * smoke.cloud.length,
    clear(done) {
      if (!box.active) { if (done) done(); return 0; }
      puffs.stop(); // no new puffs; the old ones drift away
      drift.stop();
      breathe.stop();
      box.setScale(1);
      if (!ready(scene, 'clear')) {
        scene.tweens.add({ targets: box, alpha: 0, duration: 500, onComplete: () => { box.destroy(); if (done) done(); } });
        return 500;
      }
      // the dissipating frames play on the tile, and the cloud fades out while they do
      const ms = 120;
      const wisps = scene.add.image(x, y, keyOf('clear', 0)).setDepth(depth).setAlpha(CLOUD_ALPHA);
      box.clearImg = wisps;
      smoke.clear.forEach((f, i) => scene.time.delayedCall(i * ms, () => wisps.active && place(wisps, 'clear', i, x, y)));
      const total = smoke.clear.length * ms + 200;
      scene.tweens.add({ targets: box, alpha: 0, duration: total, ease: 'Sine.easeIn' });
      scene.tweens.add({ targets: wisps, alpha: 0, delay: smoke.clear.length * ms - 60, duration: 260, onComplete: () => { wisps.destroy(); box.destroy(); if (done) done(); } });
      return total;
    },
  };
}
