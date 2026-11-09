// Dynamic lighting test (roadmap 1.38). Only runs with ?light in the web address.
// Suleiman's pictures are never changed: Phaser's Light2D multiplies them by the
// light that falls on them, and a separate "normal map" picture says which way
// each bit of surface faces so the light can slide over it.
//   - every torch, brazier and lamp: warm light with a slow flicker
//   - Fury or Enchant on a unit: orange light round that unit
//   - every lightning bolt: a short bright blue-white flash over the board
import Phaser from 'phaser';
import { setLitMode, flamePoints } from './boardArt.js';

export const lightingOn = () => typeof window !== 'undefined' && /[?&]light/.test(window.location.search);

// Gaha's pictures that have a normal map (made by dev/tools/make_normals.py)
export const NORMAL_FILES = ['gaha_iso_stand_upRight', 'gaha_iso_stand_downRight', 'gaha_iso_battle_upRight', 'gaha_iso_battle_downRight'];

export function preloadNormals(scene) {
  if (!lightingOn()) return;
  for (const n of NORMAL_FILES) scene.load.image('normal:' + n, './art/normals/' + n + '.png');
}

// A normal map for a picture we only have as a canvas (the floor tiles are bent into
// diamonds in code, so their bump is worked out here, the same idea as the Python tool).
function bumpFromCanvas(src) {
  const w = src.width, h = src.height;
  const ctx = src.getContext('2d');
  const px = ctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const at = (x, y) => lum[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const k = 3.2; // how strong the bumps are
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = (at(x + 1, y) - at(x - 1, y)) * k;
    const gy = (at(x, y + 1) - at(x, y - 1)) * k;
    const nx = -gx, ny = gy, nz = 1, len = Math.hypot(nx, ny, nz);
    const o = (y * w + x) * 4;
    img.data[o] = ((nx / len) * 0.5 + 0.5) * 255;
    img.data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
    img.data[o + 2] = ((nz / len) * 0.5 + 0.5) * 255;
    img.data[o + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function installLighting(scene) {
  if (!lightingOn()) return;
  setLitMode(true); // the old darkening tints step aside: the lights do that job now
  const lm = scene.lights.enable();
  lm.setAmbientColor(0x6e6478); // low: the cave stays moody
  scene.lit = { torches: [], auras: new Map(), flashes: [] };

  // Gaha's normal maps go onto his textures
  for (const n of NORMAL_FILES) {
    const normal = scene.textures.exists('normal:' + n) ? scene.textures.get('normal:' + n).getSourceImage() : null;
    if (!normal) continue;
    for (const key of scene.textures.getTextureKeys()) {
      if (key.endsWith(n + '.png') || key.endsWith(':' + n + '.png') || key.endsWith(n)) {
        const tex = scene.textures.get(key);
        if (!tex.dataSource.length) tex.setDataSource(normal);
      }
    }
  }

  // Everything drawn for the board (floor, walls, props) takes light; so do the figures.
  const lightBoard = () => {
    for (const o of scene.boardObjects || []) {
      if (o.type !== 'Image') continue;
      if (/^tile:/.test(o.texture.key) && !o.texture.dataSource.length) o.texture.setDataSource(bumpFromCanvas(o.texture.getSourceImage()));
      o.setPipeline('Light2D');
    }
    // the fires: one light per flame
    for (const l of scene.lit.torches) lm.removeLight(l.light);
    scene.lit.torches = flamePoints.map((p) => ({ p, light: lm.addLight(p.x, p.y - 10, 260, 0xff9a3c, 1.7), seed: Math.random() * 10 }));
  };
  const origBuild = scene.buildBoard.bind(scene);
  scene.buildBoard = () => { origBuild(); lightBoard(); };
  lightBoard();

  // a dim fill over the board centre so faces never go black
  lm.addLight(scene.cameras.main.midPoint.x, scene.cameras.main.midPoint.y, 1100, 0xc8b49a, 0.8);

  // a bolt of lightning (effects.js and spellArt.js tell us where)
  scene.events.on('bolt', (x, y) => {
    const light = lm.addLight(x, y - 30, 520, 0xbfd8ff, 3.2);
    scene.tweens.add({ targets: light, intensity: 0, radius: 760, duration: 420, ease: 'Quad.easeOut', onComplete: () => lm.removeLight(light) });
  });

  scene.events.on('update', (time) => {
    for (const t of scene.lit.torches) { // a slow, gentle flicker (not the fast jitter Baiyee disliked)
      t.light.intensity = 1.7 + 0.22 * Math.sin(time / 310 + t.seed) + 0.12 * Math.sin(time / 97 + t.seed * 3);
      t.light.radius = 260 + 10 * Math.sin(time / 410 + t.seed);
    }
    for (const u of scene.units || []) {
      const s = u.sprite;
      if (s && s.pipeline && s.pipeline.name !== 'Light2D') s.setPipeline('Light2D');
      const burning = u.alive && (u.furyAura || u.enchantAura);
      let a = scene.lit.auras.get(u);
      if (burning && !a) { a = lm.addLight(0, 0, 150, 0xff7a1e, 1.7); scene.lit.auras.set(u, a); }
      if (!burning && a) { lm.removeLight(a); scene.lit.auras.delete(u); a = null; }
      if (a) {
        a.x = u.view.x; a.y = u.view.y - u.centerY;
        a.intensity = 1.6 + 0.3 * Math.sin(time / 160 + u.col);
      }
    }
  });
}
