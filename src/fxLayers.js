import Phaser from 'phaser';
import { fxMode } from './spellArt.js';

// Effect layers (roadmap 18.23, Battle 1.0 milestone M3b: effects to studio quality).
//
// Suleiman's drawn effects stay the heart of every skill. This file adds the
// layers a finished game puts AROUND a drawn effect, the same way everywhere:
//
//   1. charge-up  : light gathers before the release           (chargeUp)
//   2. flash      : a bright core for a moment at the impact   (impactLayers)
//   3. floor light: the ground round it lights up              (floorLight)
//   4. unit light : fighters standing near catch the light     (lightNearby)
//   5. particles  : sparks or debris thrown out                (impactLayers)
//   6. afterglow  : embers, dust or mist that linger and fade  (afterglow)
//   and for the big moments, rings of energy spreading out     (energyWaves)
//
// How strong each layer is comes from one number, the LEVEL of the hit:
//   1 = a light hit (small, quick, no lingering)   2 = a solid hit
//   3 = a heavy hit or a skill                     4 = a finishing blow, a clash burst
// so small hits stay small and the big ones feel big.
//
// Every layer is short-lived and removes itself. With Effects set to Light
// (the switch on the board, or the frame-rate fallback) the particle counts are
// halved and the light on nearby fighters and the afterglow are left out.

// ---------- One colour language per element ----------
// core  : the hottest, brightest colour (the flash)
// glow  : the light it throws on the floor and on fighters
// spark : the colours of its particles
// smoke : what lingers after (null = nothing lingers)
// rise  : true if what lingers drifts up (embers, mist); false if it settles (dust)
export const ELEMENTS = {
  fire: { core: 0xfff2c4, glow: 0xff7a2e, spark: [0xffe08a, 0xff9a3c, 0xff5a1e], smoke: 0xff8a3c, rise: true },
  earth: { core: 0xffe9c4, glow: 0xc98f4e, spark: [0xe8c08a, 0xb08050, 0x8a6a48], smoke: 0xb89a78, rise: false },
  sand: { core: 0xfff0d0, glow: 0xe8c08a, spark: [0xf2d9a6, 0xe0b878, 0xc9a06a], smoke: 0xd9c09a, rise: false },
  sound: { core: 0xffffff, glow: 0xffe9c4, spark: [0xffffff, 0xffeccf, 0xffd9a0], smoke: null, rise: true },
  poison: { core: 0xe6ffb0, glow: 0x7fd04a, spark: [0xc8f08a, 0x8fdc5a, 0x4a9a3a], smoke: 0x6fbf4a, rise: true },
  lightning: { core: 0xffffff, glow: 0x8fb8ff, spark: [0xffffff, 0xbfd8ff, 0xb9a0ff], smoke: null, rise: true },
  water: { core: 0xeaffff, glow: 0x5fc8c0, spark: [0xdff6ff, 0x9fe0e0, 0x5fc8c0], smoke: 0xbfeaf0, rise: true },
  wind: { core: 0xffffff, glow: 0xbfe9ff, spark: [0xffffff, 0xdff6ff, 0xbfe9ff], smoke: null, rise: true },
  heal: { core: 0xf4ffd8, glow: 0x9fe07a, spark: [0xf4ffd8, 0xc8f08a, 0xffe08a], smoke: 0xc8f0a0, rise: true },
  hex: { core: 0xf0d8ff, glow: 0x9a5cff, spark: [0xe3a8ff, 0xb070ff, 0x7a3cff], smoke: 0x8a5ccf, rise: false },
  spirit: { core: 0xffffff, glow: 0xffd27a, spark: [0xffffff, 0xffe08a, 0xffc24a], smoke: null, rise: true },
  steel: { core: 0xffffff, glow: 0xffd9a0, spark: [0xffffff, 0xffe08a, 0xffc24a], smoke: null, rise: false },
};
export const elementOf = (name) => ELEMENTS[name] || ELEMENTS.steel;

// How the screen answers a hit of each level (BattleScene.showImpact uses this):
// stop = milliseconds everything freezes, shake = how hard, zoom = camera jolt.
export const FEEL = {
  1: { stop: 28, shake: 0.0012, shakeMs: 70, zoom: 0.4 },
  2: { stop: 52, shake: 0.0030, shakeMs: 110, zoom: 0.9 },
  3: { stop: 78, shake: 0.0058, shakeMs: 160, zoom: 1.5 },
  4: { stop: 105, shake: 0.0090, shakeMs: 220, zoom: 2.1 },
};
// The level of a plain hit, from its damage.
export function hitLevel(damage, lethal = false) {
  if (lethal) return 4;
  return damage >= 9 ? 3 : damage >= 4 ? 2 : 1;
}

const light = () => fxMode() === 'light';
const has = (scene, key) => scene.textures.exists(key);
const ADD = Phaser.BlendModes.ADD;
// (how many of these have been made, for tests)
export const fxLayerCount = { floor: 0, units: 0, charge: 0, waves: 0, glow: 0, impact: 0 };

// A burst of particles that removes itself. Never more than 30, half in Light.
function burst(scene, x, y, depth, count, config) {
  if (!has(scene, 'fx-dot')) return null;
  const n = Math.max(1, Math.min(30, light() ? Math.ceil(count / 2) : count));
  const life = config.lifespan && config.lifespan.max ? config.lifespan.max : config.lifespan || 600;
  const emitter = scene.add.particles(x, y, 'fx-dot', { emitting: false, blendMode: 'ADD', ...config }).setDepth(depth);
  emitter.explode(n);
  scene.time.delayedCall(life + 120, () => emitter.scene && emitter.destroy());
  return emitter;
}

// ---------- 3. Light cast on the floor ----------
// A soft pool of coloured light lying on the ground at (x, y): it jumps up, then fades.
//   size : 1 = about one tile across      peak : how bright (0 to 1)
export function floorLight(scene, x, y, color, { size = 1, peak = 0.55, ms = 420, depth = 3 } = {}) {
  if (!has(scene, 'fx-glow')) return null;
  fxLayerCount.floor++;
  const img = scene.add.image(x, y, 'fx-glow').setBlendMode(ADD).setTint(color).setDepth(depth).setAlpha(0);
  const w = (150 * size) / img.width; // laid flat: wide and low, like the tiles
  img.setScale(w * 0.7, w * 0.36);
  scene.tweens.add({ targets: img, alpha: peak, scaleX: w, scaleY: w * 0.5, duration: 60, ease: 'Quad.easeOut',
    onComplete: () => scene.tweens.add({ targets: img, alpha: 0, scaleX: w * 1.15, scaleY: w * 0.58, duration: ms, ease: 'Quad.easeOut', onComplete: () => img.destroy() }) });
  return img;
}

// ---------- 4. Light on the fighters standing near ----------
// Every living unit within "radius" pixels of (x, y) is lit for a moment in the
// colour: a see-through copy of its own picture, added as light over it, which
// fades. Its real picture and tint are never touched, so nothing can be left
// the wrong colour. Nearer units are lit more.
export function lightNearby(scene, x, y, color, { radius = 170, peak = 0.5, ms = 300, skip = null } = {}) {
  if (light() || !scene.units) return 0;
  let lit = 0;
  for (const u of scene.units) {
    if (!u.alive || u === skip || !u.sprite || !u.sprite.active || !u.view || !u.view.active || u.hidden) continue;
    const d = Math.hypot(u.view.x - x, u.view.y - y);
    if (d > radius) continue;
    const s = u.sprite;
    const copy = scene.add.image(s.x, s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY).setScale(s.scaleX, s.scaleY).setFlipX(s.flipX)
      .setAngle(s.angle).setBlendMode(ADD).setTint(color).setAlpha(peak * (1 - 0.6 * (d / radius)));
    u.view.addAt(copy, u.view.getIndex(s) + 1); // just over the figure, inside its own container: it moves with it
    scene.tweens.add({ targets: copy, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => copy.destroy() });
    lit++;
  }
  fxLayerCount.units += lit;
  return lit;
}

// ---------- 1. Charge-up ----------
// Light gathers at (x, y) for "ms" before a release: motes are drawn in from
// round about and a glow swells. Returns a function that ends it early.
export function chargeUp(scene, x, y, element, { ms = 400, size = 1, depth = 81 } = {}) {
  const el = typeof element === 'string' ? elementOf(element) : element;
  fxLayerCount.charge++;
  const made = [];
  if (has(scene, 'fx-glow')) {
    const glow = scene.add.image(x, y, 'fx-glow').setBlendMode(ADD).setTint(el.glow).setDepth(depth).setScale(0.05 * size).setAlpha(0);
    made.push(glow);
    scene.tweens.add({ targets: glow, alpha: 0.75, scale: 0.42 * size, duration: ms, ease: 'Quad.easeIn' });
  }
  if (has(scene, 'fx-dot')) {
    // motes born on a ring round the point and pulled to its middle
    const ring = new Phaser.Geom.Circle(0, 0, 46 * size);
    const motes = scene.add.particles(x, y, 'fx-dot', {
      emitZone: { type: 'random', source: ring },
      moveToX: 0, moveToY: 0,
      lifespan: Math.min(360, ms * 0.8),
      frequency: light() ? 70 : 34,
      quantity: 1,
      scale: { start: 0.5 * size, end: 0.1 },
      alpha: { start: 0, end: 1 },
      tint: el.spark,
      blendMode: 'ADD',
    }).setDepth(depth + 0.1);
    made.push(motes);
  }
  let over = false;
  const end = () => {
    if (over) return;
    over = true;
    for (const o of made) {
      if (!o.scene) continue;
      if (o.stop) { o.stop(); scene.time.delayedCall(400, () => o.scene && o.destroy()); }
      else scene.tweens.add({ targets: o, alpha: 0, scale: o.scale * 1.6, duration: 120, onComplete: () => o.destroy() });
    }
  };
  scene.time.delayedCall(ms, end);
  return end;
}

// ---------- Rings of energy spreading out ----------
// "count" rings, one after another, lying on the ground at (x, y), each growing
// and fading. For the clash burst, a clap, a landing from a leap.
export function energyWaves(scene, x, y, color, { count = 3, size = 1, gap = 90, ms = 520, depth = 4 } = {}) {
  fxLayerCount.waves++;
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * gap, () => {
      // drawn round its own point and placed, so it grows from its middle
      const g = scene.add.graphics({ x, y }).setDepth(depth).setBlendMode(ADD);
      const state = { t: 0 };
      scene.tweens.add({
        targets: state, t: 1, duration: ms, ease: 'Quad.easeOut',
        onUpdate: () => {
          const r = (26 + 120 * state.t) * size;
          g.clear();
          g.lineStyle(Math.max(1, 5 * (1 - state.t)), color, 0.85 * (1 - state.t));
          g.strokeEllipse(0, 0, r * 2, r);
          g.lineStyle(Math.max(1, 12 * (1 - state.t)), color, 0.22 * (1 - state.t)); // a soft edge round it
          g.strokeEllipse(0, 0, r * 2, r);
        },
        onComplete: () => g.destroy(),
      });
    });
  }
}

// ---------- 6. What lingers ----------
// Embers or mist that drift up, or dust that settles, at (x, y), for about a second.
export function afterglow(scene, x, y, element, { level = 2, depth = 80 } = {}) {
  const el = typeof element === 'string' ? elementOf(element) : element;
  if (light() || !el.smoke || !has(scene, 'fx-dot')) return null;
  fxLayerCount.glow++;
  const n = 3 + level * 3;
  return burst(scene, x, y, depth, n, el.rise
    ? { x: { min: -16, max: 16 }, y: { min: -8, max: 6 }, speedY: { min: -46, max: -16 }, speedX: { min: -12, max: 12 }, scale: { start: 0.42, end: 0 }, alpha: { start: 0.75, end: 0 }, tint: [el.smoke, el.spark[0]], lifespan: { min: 620, max: 1100 }, delay: { min: 0, max: 260 } }
    : { x: { min: -22, max: 22 }, y: { min: -4, max: 6 }, speedY: { min: -14, max: -2 }, speedX: { min: -26, max: 26 }, scale: { start: 0.9, end: 1.7 }, alpha: { start: 0.3, end: 0 }, tint: el.smoke, lifespan: { min: 700, max: 1200 }, blendMode: 'NORMAL' });
}

// ---------- 2, 3, 4, 5 and 6 together: the layers of one impact ----------
//   x, y   : where the blow lands (the middle of the body)
//   gx, gy : the ground under it (the unit's feet)
//   dir    : 1 = the blow came from the left, -1 from the right (sparks fly on)
//   skip   : a unit that should not catch the light (none by default)
export function impactLayers(scene, { x, y, gx = x, gy = y, element = 'steel', level = 2, dir = 1, depth = 80 } = {}) {
  const el = typeof element === 'string' ? elementOf(element) : element;
  fxLayerCount.impact++;
  const k = [0, 0.7, 1, 1.35, 1.7][level] || 1;
  // 2. the flash: a white-hot core in a halo of the element's colour, two frames long
  if (has(scene, 'fx-glow')) {
    const halo = scene.add.image(x, y, 'fx-glow').setBlendMode(ADD).setTint(el.glow).setDepth(depth + 1).setScale(0.3 * k).setAlpha(0.9);
    scene.tweens.add({ targets: halo, scale: 0.62 * k, alpha: 0, duration: 150 + 40 * level, ease: 'Quad.easeOut', onComplete: () => halo.destroy() });
    const core = scene.add.image(x, y, 'fx-glow').setBlendMode(ADD).setTint(el.core).setDepth(depth + 1.1).setScale(0.2 * k).setAlpha(1);
    scene.tweens.add({ targets: core, scale: 0.09 * k, alpha: 0, duration: 90 + 20 * level, ease: 'Quad.easeIn', onComplete: () => core.destroy() });
  }
  // 3 and 4. the light it throws
  floorLight(scene, gx, gy, el.glow, { size: 0.8 * k, peak: 0.3 + 0.1 * level, ms: 260 + 90 * level });
  if (level >= 2) lightNearby(scene, x, y, el.glow, { radius: 90 + 45 * level, peak: 0.22 + 0.1 * level, ms: 220 + 60 * level });
  // 5. sparks thrown on in the direction of the blow (a light hit throws only a few)
  burst(scene, x, y, depth + 0.5, 3 + level * 5, {
    speed: { min: 60 + 30 * level, max: 150 + 60 * level },
    angle: dir >= 0 ? { min: -65, max: 40 } : { min: 140, max: 245 },
    gravityY: 340, scale: { start: 0.2 + 0.07 * level, end: 0 }, alpha: { start: 1, end: 0 },
    tint: el.spark, lifespan: { min: 180, max: 300 + 70 * level },
  });
  // 6. what lingers (not for a light hit)
  if (level >= 2) afterglow(scene, gx, gy - 6, el, { level, depth: depth - 1 });
  if (level >= 4) energyWaves(scene, gx, gy, el.glow, { count: 2, size: 0.8 });
}
