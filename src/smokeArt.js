import smoke from './data/smoke.json';
import { TILE_WIDTH } from './config.js';

// The archer's Smoke Bomb cloud (roadmap 13.26, rebuilt in 1.34).
// The growing cloud is particles only: soft grey puffs from the fx-dot family,
// because the cut cloud pictures kept a grey floor-tile wedge under them. The
// dissipating sheet (4 frames, see-through, from dev/tools/make_smoke.py) is
// still used for the clear, tinted to suit the cave by dev/tools/make_nov13_smoke.py.
// src/data/smoke.json says where the tile's middle is for each clear frame.
// Every picture is optional: with none loaded the clear just fades the cloud out.

const keyOf = (set, i) => 'smoke:' + set + i;
const PUFF = 'smoke-puff';
const CLOUD_ALPHA = 0.65;      // 60 to 70%: the tile and units show through faintly

export function preloadSmokeArt(scene) {
  smoke.clear.forEach((f, i) => scene.load.image(keyOf('clear', i), './art/fx/' + f.file));
}

const readyClear = (scene) => smoke.clear.every((f, i) => scene.textures.exists(keyOf('clear', i)));

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

// Puts one clear frame down with its tile middle on (x, y). The pictures were cut at an 86 px tile.
function placeClear(scene, img, i, x, y) {
  const f = smoke.clear[i];
  img.setTexture(keyOf('clear', i)).setOrigin(f.ax, f.ay).setPosition(x, y).setScale(TILE_WIDTH / 86);
}

// The bomb goes off on the tile at (x, y). The cloud grows from nothing: a bank of grey puffs
// rolls up from the tile, fast at first and then steady, and the whole cloud drifts and breathes
// gently until it clears. Returns { img, clear(done), ms }. "clear" stops the puffs, plays the
// dissipating sheet while the cloud fades, and destroys it (done is called at the end).
export function smokeCloud(scene, x, y, depth, { growMs = 900 } = {}) {
  makePuff(scene);
  const box = scene.add.container(x, y).setDepth(depth).setAlpha(CLOUD_ALPHA);
  // the puffs: start small, swell and fade; they come from a flat ellipse over the tile
  const puffs = scene.add.particles(0, 0, PUFF, {
    frequency: 35,
    maxAliveParticles: 40,
    lifespan: { min: 1400, max: 2200 },
    scale: { start: 0.35, end: 1.5 },
    alpha: { start: 0.4, end: 0 },
    tint: [0xa39c93, 0x958e84, 0x847d75], // warm grey
    speedX: { min: -6, max: 6 },
    speedY: { min: -14, max: -6 },
    emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, -12, 84, 40) },
  });
  box.add(puffs);
  // after the growth, a steadier rate keeps the cloud full
  scene.time.delayedCall(growMs, () => { if (puffs.active) puffs.frequency = 90; });
  // the drift and the breath: the cloud slides a little and swells and shrinks
  const drift = scene.tweens.add({ targets: box, x: { from: x - 3, to: x + 3 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const breathe = scene.tweens.add({ targets: box, scaleX: 1.05, scaleY: 1.06, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return {
    img: box,
    ms: growMs,
    clear(done) {
      if (!box.active) { if (done) done(); return 0; }
      puffs.stop(); // no new puffs; the old ones drift away
      drift.stop();
      breathe.stop();
      box.setScale(1);
      if (!readyClear(scene)) {
        scene.tweens.add({ targets: box, alpha: 0, duration: 500, onComplete: () => { box.destroy(); if (done) done(); } });
        return 500;
      }
      // the dissipating frames play on the tile, and the cloud fades out while they do
      const ms = 120;
      const wisps = scene.add.image(x, y, keyOf('clear', 0)).setDepth(depth).setAlpha(CLOUD_ALPHA);
      box.clearImg = wisps;
      smoke.clear.forEach((f, i) => scene.time.delayedCall(i * ms, () => wisps.active && placeClear(scene, wisps, i, x, y)));
      const total = smoke.clear.length * ms + 200;
      scene.tweens.add({ targets: box, alpha: 0, duration: total, ease: 'Sine.easeIn' });
      scene.tweens.add({ targets: wisps, alpha: 0, delay: smoke.clear.length * ms - 60, duration: 260, onComplete: () => { wisps.destroy(); box.destroy(); if (done) done(); } });
      return total;
    },
  };
}
