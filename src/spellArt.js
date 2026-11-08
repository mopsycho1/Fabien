import Phaser from 'phaser';
import { TILE_WIDTH } from './config.js';
import { preloadSmokeArt } from './smokeArt.js';

// Spell pictures from Suleiman's effect sheets (public/art/fx). They are
// drawn with "ADD" blending, so their black background disappears and only
// the light shows. Every one is optional: if a picture is missing, the game
// keeps the effect it drew before.

const FILES = [
  'strike_0', 'strike_1', 'strike_2', 'strike_3', 'strike_4', 'strike_5', 'strike_6',
  'crackle_0', 'crackle_1', 'crackle_2', 'crackle_3', 'crackle_4',
  'fury_column', 'fury_ribbons', 'fury_ring', 'fury_sparks',
  'swift_ribbons', 'swift_ring', 'swift_streaks',
  'stone_burst_0', 'stone_burst_1', 'stone_burst_2',
  'bulwark_crystal_0', 'bulwark_crystal_1', 'bulwark_crystal_2', // crystals from his Earth's Bulwark card
  // the clean-up batch (1 Nov, dev/tools/make_cleanup.py): the element rising
  // round Layra as she concentrates (9.10), his fire beam for Wildfire, his
  // new Sonic Javelin spear and impact (9.16)
  'rise_earth_0', 'rise_earth_1', 'rise_earth_2', 'rise_hex_0', 'rise_hex_1', 'rise_hex_2',
  'rise_wind_0', 'rise_wind_1', 'rise_wind_2', 'rise_fire_0', 'rise_fire_1', 'fire_beam',
  'sonic_spear', 'sonic_impact',
  'sonic_trail_0', 'sonic_trail_1', 'sonic_trail_2', 'sonic_trail_3', // his 5 Nov fire trail of the flying javelin (6.28)
  'herb_pouch', // Sudeen's herb pouch, thrown to an ally (his 31 Oct 11:51 sheet, roadmap 1.12)
  'slow_ring', 'slow_pull', 'slow_spiral', 'slow_waves', 'slow_motes',
  // Gaha's Sonic Javelin (roadmap 3.11) and the Swift looks (3.10). These are
  // painted on white, not black, so they are drawn normally, not added as light.
  'sj_spear_0', 'sj_spear_1', 'sj_spear_2', 'sj_impact_0', 'sj_impact_1', 'sj_rings', 'sj_burst_0', 'sj_burst_1',
  'swift_swirl_0', 'swift_swirl_1', 'swift_swirl_2', 'swift_swirl_3', 'swift_swirl_4', 'swift_swirl_5',
  'swift_trail_0', 'swift_trail_1', 'swift_trail_2', 'swift_trail_3', 'swift_trail_4', 'swift_trail_5',
  // his 30 Oct sheets (roadmap 6.11 and 6.18): the Sigil Dissolve, Fury and Earth's Bulwark landing,
  // the turning Fury ring and the Earth's Bulwark crystals
  'death_0', 'death_1', 'death_2', 'death_3', 'death_4', 'death_5', 'death_6', 'death_7',
  'death_sigil', // the flat ring of the dissolve, cut from death_0 by dev/tools/make_death_sigil.py
  'fury_cast_0', 'fury_cast_1', 'fury_cast_2', 'fury_cast_3', 'fury_cast_4', 'fury_cast_5', 'fury_cast_6', 'fury_ground',
  'earth_cast_0', 'earth_cast_1', 'earth_cast_2', 'earth_cast_3',
  'earth_crystal_0', 'earth_crystal_1', 'earth_crystal_2', 'earth_crystal_3',
  // Phase 4 (1 Nov, dev/tools/make_phase4.py): Rabdul's Enchant from his
  // ENCHANT RABDUL sheet (the ring of fire, Shango's sigil, the sigil flying)
  // and the rock spikes of Tayo's Earth Drive
  'enchant_ring_0', 'enchant_ring_1', 'enchant_ring_2', 'enchant_ring_3',
  'enchant_sigil_0', 'enchant_sigil_1', 'enchant_sigil_2', 'enchant_sigil_3',
  'enchant_comet_0', 'enchant_comet_1', 'enchant_comet_2', 'enchant_comet_3',
  'spike_0', 'spike_1', 'spike_2', 'spike_3', 'spike_4',
  // the dust rings from his 6 Nov 04:48 sheet (roadmap 13.18): used by dustPuff in effects.js
  'dust_ring_0', 'dust_ring_1', 'dust_ring_2', 'dust_ring_3',
  // the fireball orbs of Tayo's Element Blast (13.4, his 6 Nov 04:40 sheet): light, drawn added
  'blast_orb_0', 'blast_orb_1', 'blast_orb_2', 'blast_orb_3',
  // the sand thrown up where a heavy hit lands (6.37, his 7 Nov 07:51 sheet; the north-east and north-west views)
  'sand_impact_ne', 'sand_impact_nw',
];
const PAINTED = (key) => /^(sj_|swift_swirl|swift_trail|death_|fury_cast|fury_ground|earth_cast|earth_crystal|spike_|dust_ring_|sand_impact)/.test(key);

// Status icons (public/art/icons), shown over a unit instead of a word.
// A status with an "icon" in spells.json uses the picture of that name.
// Slow is from his first icon; the rest are from his "status effects" sheet
// (30 Oct, roadmap 6.7). The Verses use the middle of his Swift, Fury and
// Earth's Bulwark cards. Enchanted waits for Rabdul's Enchant (roadmap 4.1).
const ICONS = ['drenched', 'slow', 'poison', 'stunned', 'offbalance', 'exposed', 'hidden', 'echo', 'meditating',
  'aiming', 'marked', 'burn', 'disoriented', 'enchanted', 'bloodied', 'charge', 'bulwark',
  'swiftness', 'fury', 'stone', 'blinded'];

// His status cards (public/art/cards, roadmap 6.9): a small one pops up on the
// character when the status lands, then shrinks into its icon.
export const CARDS = ['offbalance', 'swiftness', 'fury', 'stone', 'press', 'empower'];

export function preloadSpellArt(scene) {
  for (const f of FILES) scene.load.image('fx:' + f, './art/fx/' + f + '.png');
  scene.load.image('fx:empower_aura', './art/fx/empower_aura.jpg'); // drawn on black: it glows (added light)
  for (const f of ICONS) scene.load.image('icon:' + f, './art/icons/' + f + '.png');
  for (const f of CARDS) scene.load.image('card:' + f, './art/cards/' + f + '.png');
  preloadSmokeArt(scene); // the archer's Smoke Bomb cloud (13.26)
}

// Slow lands: a gravity ring drops onto the target, light pulls down on it,
// and pressure waves spread at its feet (from the Slow effect sheet).
export function slowCast(scene, x, y) {
  if (!has(scene, ['slow_ring', 'slow_pull', 'slow_waves'])) return false;
  const add = (key, ox, oy, scale) => scene.add.image(x + ox, y + oy, 'fx:' + key).setScale(scale).setDepth(79).setBlendMode(Phaser.BlendModes.ADD);
  const ring = add('slow_ring', 0, -150, 0.55);
  scene.tweens.add({ targets: ring, y: y - 70, duration: 520, ease: 'Quad.easeIn' });
  scene.tweens.add({ targets: ring, alpha: 0, delay: 700, duration: 300, onComplete: () => ring.destroy() });
  const pull = add('slow_pull', 0, -50, 0.7).setAlpha(0);
  scene.tweens.add({ targets: pull, alpha: 1, duration: 260, yoyo: true, hold: 420, onComplete: () => pull.destroy() });
  const waves = add('slow_waves', 0, -8, 0.4).setScale(0.3, 0.2);
  scene.tweens.add({ targets: waves, scaleX: 0.75, scaleY: 0.45, alpha: 0, delay: 420, duration: 700, onComplete: () => waves.destroy() });
  return true;
}

// While a unit is slowed: a faint ring hovers over it and motes sink around it.
// Returns the objects (added to the unit's own container, so they move with
// it), or null if the pictures are missing.
export function slowAura(scene, unit) {
  if (!has(scene, ['slow_ring', 'slow_motes'])) return null;
  const top = -unit.topY + 4;
  const ring = scene.add.image(0, top, 'fx:slow_ring').setScale(0.4, 0.32).setBlendMode(Phaser.BlendModes.ADD).setAlpha(1);
  scene.tweens.add({ targets: ring, y: top + 8, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  unit.view.add(ring);
  const out = [ring];
  // a faint slow turn at the feet (flat, like fury_ground)
  if (has(scene, ['slow_spiral'])) {
    const flat = scene.add.container(0, 6).setScale(1, 0.36);
    const spiral = scene.add.image(0, 0, 'fx:slow_spiral').setScale(0.75).setAlpha(0.52).setBlendMode(Phaser.BlendModes.ADD);
    flat.add(spiral);
    behind(unit, flat);
    scene.tweens.add({ targets: spiral, angle: 360, duration: 9000, repeat: -1 });
    out.push(flat);
  }
  // purple motes that sink slowly round the body (16.1 step 3: replaces the one tweened picture)
  const motes = fxEmitter(scene, unit, {
    frequency: 175, // 1.5 times as many motes (phone boost 8 Nov)
    maxParticles: 20,
    config: {
      x: { min: -26, max: 26 },
      y: { min: -unit.topY, max: -unit.centerY },
      speedY: { min: 6, max: 16 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.51, end: 0.08 },
      alpha: { start: 0.75, end: 0 },
      tint: [0xb48cff, 0x8a5fe0, 0xd2b3ff],
      lifespan: { min: 1400, max: 2200 },
    },
  });
  if (motes) out.push(motes);
  return out;
}

const has = (scene, keys) => keys.every((k) => scene.textures.exists('fx:' + k));

// Plays pictures one after another at (x, y), standing on that point.
// hold: how long the last picture stays before it fades; fade: how long the fade takes.
function flipbook(scene, keys, x, y, { frameMs = 55, scale = 1, depth = 79, originY = 1, flip = false, hold = 0, fade = 220 } = {}) {
  const img = scene.add.image(x, y, 'fx:' + keys[0]).setOrigin(0.5, originY).setScale(scale).setDepth(depth).setFlipX(flip);
  if (!PAINTED(keys[0])) img.setBlendMode(Phaser.BlendModes.ADD);
  keys.forEach((k, i) => scene.time.delayedCall(i * frameMs, () => img.active && img.setTexture('fx:' + k)));
  scene.tweens.add({ targets: img, alpha: 0, delay: keys.length * frameMs + hold, duration: fade, onComplete: () => img.destroy() });
  return img;
}

const range = (name, n) => Array.from({ length: n }, (_, i) => name + '_' + i);
const FURY_CAST = range('fury_cast', 7);
const EARTH_CAST = range('earth_cast', 4);
const EARTH_CRYSTALS = range('earth_crystal', 4);

// A defeated unit dissolves (roadmap 6.11, reworked 8 Nov). No picture is pasted over the body any more:
// the figure itself brightens to gold and wipes away from the feet up (a Phaser glow and a crop;
// a simple fade where WebGL is not there), gold sparks and feathers rise from it, and the sigil
// glows flat on the ground under it, then fades. Returns how long it takes (ms).
// The unit's own container (unit.view) is destroyed at the end.
export function goldDissolve(scene, unit, { ms = 1100, onDone } = {}) {
  const view = unit.view;
  const sp = unit.sprite;
  if (!view || !view.active) { if (onDone) onDone(); return 0; }
  const GOLD = 0xffd27a;
  const gl = !!(scene.sys.game.renderer && scene.sys.game.renderer.type === Phaser.WEBGL);
  const wipe = gl && sp && sp.active && !unit.wading && !!sp.frame;   // the crop: from the feet up
  const x = view.x;
  const y = view.y;
  const size = TILE_WIDTH * 1.15;

  // 1. the sigil, flat on the ground under the body, glowing, then fading
  if (scene.textures.exists('fx:death_sigil')) {
    const sigil = scene.add.image(x, y + 4, 'fx:death_sigil').setDepth(view.depth - 0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    sigil.setScale((size / sigil.width) * 0.7);
    scene.tweens.add({ targets: sigil, alpha: 0.95, scale: size / sigil.width, duration: 320, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: sigil, alpha: 0, delay: ms * 0.7, duration: ms * 0.6 + 400, ease: 'Sine.easeIn', onComplete: () => sigil.destroy() });
  }

  // 2. the figure: a gold copy lights it up (added light), a glow round it in WebGL
  let gold = null;
  const haloes = [];
  if (sp && sp.active) {
    gold = scene.add.image(sp.x, sp.y, sp.texture.key, sp.frame.name).setOrigin(sp.originX, sp.originY).setFlipX(sp.flipX)
      .setScale(sp.scaleX, sp.scaleY).setAngle(sp.angle).setTintFill(GOLD).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    view.add(gold);
    scene.tweens.add({ targets: gold, alpha: 0.85, duration: ms * 0.3, ease: 'Sine.easeIn' });
    // a glow round the figure: Phaser's preFX glow crashes on a picture inside a container (checked in
    // WebGL), so two bigger, fainter gold copies stand in for it
    if (gl) {
      for (const [grow, a] of [[1.1, 0.3], [1.2, 0.16]]) {
        const halo = scene.add.image(sp.x, sp.y, sp.texture.key, sp.frame.name).setOrigin(sp.originX, sp.originY).setFlipX(sp.flipX)
          .setScale(sp.scaleX * grow, sp.scaleY * grow).setAngle(sp.angle).setTintFill(GOLD).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        view.addAt(halo, view.getIndex(sp));
        scene.tweens.add({ targets: halo, alpha: a, duration: ms * 0.3 });
        haloes.push(halo);
      }
    }
  }
  const frameH = wipe ? sp.frame.height : 0;
  const frameW = wipe ? sp.frame.width : 0;
  const shown = { t: 0 };   // 0 = whole, 1 = gone
  const figureH = sp && sp.active ? Math.max(30, sp.frame.height * sp.scaleY) : 60;

  // 3. sparks and feathers rise from the part that is still there
  const rise = (texture, config) => {
    if (!scene.textures.exists(texture)) return null;
    const em = scene.add.particles(0, 0, texture, {
      x: { onEmit: () => x + (Math.random() - 0.5) * 50 },
      y: { onEmit: () => y - 4 - Math.random() * figureH * (1 - shown.t * 0.9) },
      blendMode: 'ADD',
      duration: ms,
      ...config,
    });
    em.setDepth(91);
    scene.time.delayedCall(ms + 2200, () => em.active && em.destroy());
    return em;
  };
  rise('fx-dot', { frequency: 22, speedY: { min: -130, max: -50 }, speedX: { min: -24, max: 24 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, tint: [GOLD, 0xffe9a8, 0xffb04a], lifespan: { min: 600, max: 1200 }, maxAliveParticles: 40 });
  makeFeather(scene);
  rise('fx-feather', { frequency: 90, speedY: { min: -70, max: -30 }, speedX: { min: -28, max: 28 }, scale: { start: 0.9, end: 0.5 }, alpha: { start: 0.95, end: 0 }, rotate: { start: -30, end: 200 }, tint: [0xfff1c9, GOLD, 0xffffff], lifespan: { min: 1100, max: 1800 }, maxAliveParticles: 14 });

  // 4. the wipe: the feet go first
  scene.tweens.add({
    targets: shown,
    t: 1,
    delay: ms * 0.28,
    duration: ms * 0.72,
    ease: 'Sine.easeInOut',
    onUpdate: () => {
      if (!view.active) return;
      if (wipe) {
        const h = Math.max(0.5, frameH * (1 - shown.t));
        sp.setCrop(0, 0, frameW, h);
        if (gold && gold.active) gold.setCrop(0, 0, frameW, h);
        for (const hl of haloes) if (hl.active) hl.setCrop(0, 0, frameW, h);
      } else view.setAlpha(1 - shown.t);   // no WebGL: a simple fade
    },
    onComplete: () => {
      if (view.active) view.destroy();
      if (onDone) onDone();
    },
  });
  return ms;
}

// A small pale feather (made once, with the canvas) for the dissolve to scatter.
function makeFeather(scene) {
  if (scene.textures.exists('fx-feather')) return;
  const tex = scene.textures.createCanvas('fx-feather', 12, 30);
  const c = tex.getContext();
  c.translate(6, 15);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath();
  c.moveTo(0, -14);
  c.quadraticCurveTo(7, -2, 0, 14);
  c.quadraticCurveTo(-7, -2, 0, -14);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,1)';
  c.beginPath();
  c.moveTo(0, -14);
  c.lineTo(0, 14);
  c.stroke();
  tex.refresh();
}

// A ground picture that grows and fades, lying flat on the tile.
function groundFlash(scene, key, x, y, { scale = 0.6, duration = 650, depth = 2 } = {}) {
  const img = scene.add.image(x, y, 'fx:' + key).setScale(scale * 0.6, scale * 0.42).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: img, scaleX: scale, scaleY: scale * 0.7, alpha: 0, duration, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
}

// Lightning crashes down on a spot (the feet of the target). Returns true if
// the pictures were there to play it.
export function lightningStrike(scene, x, y, { big = false } = {}) {
  const frames = ['strike_0', 'strike_1', 'strike_2', 'strike_3', 'strike_4', 'strike_5', 'strike_6'];
  if (!has(scene, frames)) return false;
  flipbook(scene, frames, x, y + 14, { frameMs: 45, scale: big ? 0.72 : 0.58 });
  if (has(scene, ['crackle_3'])) groundFlash(scene, 'crackle_3', x, y + 2, { scale: big ? 0.8 : 0.62, depth: 79 });
  return true;
}

// The aura of a Verse settling on a unit. kind: 'fury', 'swiftness', 'stone'.
export function verseAura(scene, x, y, kind) {
  // his 30 Oct sheets (roadmap 6.18): the ring opens, fire spirals up, bursts and settles
  if (kind === 'fury' && has(scene, FURY_CAST)) {
    flipbook(scene, FURY_CAST, x, y + 8, { frameMs: 85, scale: 0.95, depth: 79 });
    return true;
  }
  // crystals rise round the ring and swirl into a guard
  if (kind === 'stone' && has(scene, EARTH_CAST)) {
    flipbook(scene, EARTH_CAST, x, y + 10, { frameMs: 130, scale: 0.72, depth: 79, hold: 120 });
    return true;
  }
  if (kind === 'fury' && has(scene, ['fury_ring', 'fury_column', 'fury_sparks'])) {
    groundFlash(scene, 'fury_ring', x, y, { scale: 0.62, duration: 800, depth: 79 });
    const col = scene.add.image(x, y + 6, 'fx:fury_column').setOrigin(0.5, 1).setScale(0.6, 0.2).setDepth(79).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: col, scaleY: 0.75, duration: 260, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: col, alpha: 0, delay: 420, duration: 380, onComplete: () => col.destroy() });
    const sparks = scene.add.image(x, y - 40, 'fx:fury_sparks').setScale(0.55).setDepth(79).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: sparks, y: y - 80, alpha: 0, duration: 900, onComplete: () => sparks.destroy() });
    return true;
  }
  if (kind === 'swiftness' && has(scene, ['swift_ring', 'swift_ribbons'])) {
    groundFlash(scene, 'swift_ring', x, y - 10, { scale: 0.6, duration: 800, depth: 79 });
    const rib = scene.add.image(x, y - 40, 'fx:swift_ribbons').setScale(0.4).setDepth(79).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: rib, y: y - 70, scale: 0.6, angle: 25, alpha: 0, duration: 900, onComplete: () => rib.destroy() });
    return true;
  }
  if (kind === 'stone' && has(scene, ['stone_burst_0', 'stone_burst_1', 'stone_burst_2'])) {
    flipbook(scene, ['stone_burst_0', 'stone_burst_1', 'stone_burst_2'], x, y + 10, { frameMs: 110, scale: 0.5 });
    return true;
  }
  return false;
}

// Speed streaks behind a unit under Swiftness as it runs.
export function speedStreak(scene, x, y, dx) {
  if (!has(scene, ['swift_streaks'])) return;
  const img = scene.add.image(x, y - 40, 'fx:swift_streaks').setScale(0.35).setFlipX(dx < 0).setDepth(78).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
  scene.tweens.add({ targets: img, alpha: 0, duration: 260, onComplete: () => img.destroy() });
}

// ---------- Swift (roadmap 3.10, his NEW EFFECTS sheets) ----------

const SWIRL = ['swift_swirl_0', 'swift_swirl_1', 'swift_swirl_2', 'swift_swirl_3', 'swift_swirl_4', 'swift_swirl_5'];
const TRAIL = ['swift_trail_0', 'swift_trail_1', 'swift_trail_2', 'swift_trail_3', 'swift_trail_4', 'swift_trail_5'];

// While a Verse of Swiftness is on a unit: wind and feathers swirl up around
// its feet, round and round. Returns the objects (in the unit's own container,
// so they move with it), or null if the pictures are missing.
export function swiftAura(scene, unit) {
  if (!has(scene, SWIRL)) return null;
  if (!scene.anims.exists('swiftSwirl')) {
    scene.anims.create({ key: 'swiftSwirl', frames: SWIRL.map((k) => ({ key: 'fx:' + k })), frameRate: 11, repeat: -1 });
  }
  const swirl = scene.add.sprite(0, 10, 'fx:' + SWIRL[0]).setOrigin(0.5, 1).setScale(1.1).setAlpha(1);
  swirl.play('swiftSwirl');
  unit.view.add(swirl);
  // a few light wind streaks drifting sideways (16.1 step 5)
  const wind = fxEmitter(scene, unit, {
    frequency: 215, // 1.5 times as many streaks (phone boost 8 Nov)
    maxParticles: 18,
    config: {
      x: { min: -30, max: 30 },
      y: { min: -unit.topY * 0.8, max: -8 },
      speedX: { min: 40, max: 70 },
      speedY: { min: -6, max: 6 },
      scaleX: { start: 1.65, end: 0.6 },
      scaleY: { start: 0.27, end: 0.15 },
      alpha: { start: 0.68, end: 0 },
      tint: [0xdff6ff, 0xbfe9ff],
      lifespan: { min: 600, max: 900 },
    },
  });
  return wind ? [swirl, wind] : [swirl];
}

// A unit under Swiftness takes a step: a gust of wind and feathers where it was.
// Returns true if the pictures were there.
export function swiftTrail(scene, x, y, dx) {
  if (!has(scene, TRAIL)) return false;
  flipbook(scene, TRAIL, x, y + 8, { frameMs: 45, scale: 0.9, depth: 78, flip: dx < 0 });
  return true;
}

// ---------- Fury and Earth's Bulwark while active (roadmap 6.13) ----------
// Suleiman asked for looks like Swift's swirl. Until he draws them, these are
// built from his Fury pictures and the crystals of his Earth's Bulwark card.

// Puts a picture behind the unit's figure (so the figure covers it).
function behind(unit, obj) {
  const at = unit.sprite ? unit.view.getIndex(unit.sprite) : 1;
  unit.view.addAt(obj, Math.max(0, at));
}

// ---------- Effects flair helper (roadmap 16.1 step 1) ----------
// One wrapper for every looping particle look. It keeps the rules:
// at most 3 loops at full strength (the active unit's first, the rest run at half),
// a hard cap on live particles, the Full / Light switch (Light = loops off), and
// a fall back to Light by itself if the frame rate stays under 40 for 3 seconds.
// The wrapper has destroy(), so keepAura (and the slow / swift cleanup) remove it.
const FX_KEY = 'fabien.fxMode';
const FULL_LOOPS = 3;
const fxState = { mode: 'full', auto: false, loops: new Set(), activeUnit: null, lowSince: 0 };
try { if (localStorage.getItem(FX_KEY) === 'light') fxState.mode = 'light'; } catch (e) { /* no saved setting */ }

export const fxMode = () => fxState.mode;
export const fxLoopCount = () => fxState.loops.size;
export const fxLiveParticles = () => [...fxState.loops].reduce((n, l) => n + l.emitter.getAliveParticleCount(), 0);

// Full strength for the first 3 loops (the active unit's first); the rest half. Light stops all.
function fxRebalance() {
  const list = [...fxState.loops].sort((a, b) => (b.unit === fxState.activeUnit) - (a.unit === fxState.activeUnit));
  list.forEach((l, i) => {
    if (!l.emitter.scene) return;
    const half = i >= FULL_LOOPS;
    if (fxState.mode === 'light') l.emitter.stop();
    else {
      l.emitter.setFrequency(l.frequency * (half ? 2 : 1));
      l.emitter.start();
    }
    l.emitter.setVisible(fxState.mode !== 'light');
  });
}

export function setFxMode(mode, { auto = false } = {}) {
  fxState.mode = mode === 'light' ? 'light' : 'full';
  fxState.auto = auto;
  fxState.lowSince = 0; // a new choice starts the 3 second frame-rate count again
  if (!auto) { try { localStorage.setItem(FX_KEY, fxState.mode); } catch (e) { /* fine */ } }
  fxRebalance();
}

// Tell the helper whose turn it is, so that unit's loops get the full-strength places.
export function fxSetActive(unit) {
  if (fxState.activeUnit === unit) return;
  fxState.activeUnit = unit;
  fxRebalance();
}

// Watches the frame rate: under 40 for 3 seconds in a row turns Light on (not saved).
export function fxWatchFrameRate(scene) {
  if (scene.fxWatching) return;
  scene.fxWatching = true;
  scene.time.addEvent({
    delay: 500, loop: true,
    callback: () => {
      const fps = scene.game.loop.actualFps;
      if (document.hidden || !fps || fps >= 40) { fxState.lowSince = 0; return; }
      fxState.lowSince = fxState.lowSince || scene.time.now;
      if (scene.time.now - fxState.lowSince >= 3000 && fxState.mode === 'full') setFxMode('light', { auto: true }); scene.events.emit('fxmode');
    },
  });
}

// A looping emitter on a unit. opts: { texture, frequency (ms between puffs), maxParticles (12 to 20),
// config (Phaser emitter settings, positions relative to the unit's feet), behindFigure }.
// Returns a wrapper with destroy(), or null if the texture is missing.
export function fxEmitter(scene, unit, { texture = 'fx-dot', frequency = 200, maxParticles = 16, config = {}, behindFigure = true } = {}) {
  if (!scene.textures.exists(texture)) return null;
  const emitter = scene.add.particles(0, 0, texture, {
    frequency,
    maxAliveParticles: Math.min(maxParticles, 20), // never more than this many alive at once
    blendMode: 'ADD',
    ...config,
  });
  if (behindFigure) behind(unit, emitter); else unit.view.add(emitter);
  const loop = { unit, emitter, frequency };
  fxState.loops.add(loop);
  fxRebalance();
  return {
    emitter,
    destroy: () => {
      fxState.loops.delete(loop);
      if (emitter.scene) emitter.destroy();
      fxRebalance();
    },
  };
}

// Turns a picture round and round on its upright axis: its width follows a
// cosine, so a flat ring of light looks like it spins around the unit.
function spin(scene, img, scale, ms, phase = 0) {
  const clock = { t: phase };
  return scene.tweens.add({
    targets: clock,
    t: phase + Math.PI * 2,
    duration: ms,
    repeat: -1,
    onUpdate: () => {
      if (!img.active) return;
      // never exactly 0 wide: some canvas renderers fail on a flat picture
      const c = Math.cos(clock.t);
      img.setScale(scale * (Math.abs(c) < 0.05 ? (c < 0 ? -0.05 : 0.05) : c), scale);
    },
  });
}

// While a Verse of Fury is on a unit: a ring of fire beats at its feet like a
// heart, red ribbons spin around it and sparks rise. Returns the objects (in
// the unit's container) and the tweens, or null if the pictures are missing.
// ribbons = false for a unit whose own Fury pictures already have the fire
// painted round it (Gaha): then only the ring and the sparks are added.
export function furyAura(scene, unit, { ribbons = true } = {}) {
  if (!has(scene, ['fury_ring', 'fury_ribbons', 'fury_sparks'])) return null;
  const add = (key, y, alpha) => scene.add.image(0, y, 'fx:' + key).setBlendMode(Phaser.BlendModes.ADD).setAlpha(alpha);
  const tweens = [];
  const objects = [];
  if (has(scene, ['fury_ground'])) {
    // his ring of fire seen from above, laid flat at the feet and turning
    const flat = scene.add.container(0, 6).setScale(1, 0.36);
    const ring = scene.add.image(0, 0, 'fx:fury_ground').setScale(1.2).setAlpha(1);
    flat.add(ring);
    behind(unit, flat);
    tweens.push(scene.tweens.add({ targets: ring, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })); // it glows; it no longer turns
    objects.push(flat);
  } else {
    const ring = add('fury_ring', 4, 0.55).setScale(0.42, 0.3);
    behind(unit, ring);
    tweens.push(scene.tweens.add({ targets: ring, scaleX: 0.48, scaleY: 0.34, alpha: 0.85, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    objects.push(ring);
  }
  if (ribbons) {
    // A unit without painted Fury pictures (roadmap 1.25): no picture over the
    // body. Instead its figure pulses a soft red-orange, and a few embers rise.
    const pulse = { t: 0 };
    const lo = Phaser.Display.Color.ValueToColor(0xffffff), hi = Phaser.Display.Color.ValueToColor(0xff6a45);
    tweens.push(scene.tweens.add({
      targets: pulse, t: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const sp = unit.sprite;
        if (!sp || !sp.active || sp.tintFill || unit.hidden) return; // leave the hit flash and the hidden glow alone
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(lo, hi, 100, Math.round(pulse.t * 100));
        sp.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
    }));
    // a stand-in object so the cleanup (keepAura) also removes the tint
    objects.push({ destroy: () => { if (unit.sprite && unit.sprite.active && !unit.sprite.tintFill && !unit.hidden) unit.sprite.clearTint(); } });
  }
  // one ember emitter replaces the hand-tweened circles and sparks: embers rise from the feet to above the head
  const embers = fxEmitter(scene, unit, {
    frequency: 100, // 1.5 times as many embers (phone boost 8 Nov)
    maxParticles: 20,
    behindFigure: false, // embers may drift in front of the body, but stay small and faint
    config: {
      x: { min: -22, max: 22 },
      y: { min: -6, max: 4 },
      speedY: { min: -(unit.topY + 10) / 1.3, max: -(unit.topY - 10) / 1.3 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.57, end: 0 },
      alpha: { start: 0.82, end: 0 },
      tint: [0xff7a2e, 0xffb347],
      lifespan: 1300,
    },
  });
  if (embers) objects.push(embers);
  // heat shimmer: a faint wavy band above the unit (no shader, so it works on every phone)
  if (has(scene, ['fury_column'])) {
    const shimmer = scene.add.image(0, -unit.centerY - 10, 'fx:fury_column').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4).setScale(0.7, 0.95);
    behind(unit, shimmer);
    tweens.push(scene.tweens.add({ targets: shimmer, x: 4, scaleX: 0.7, scaleY: 0.95, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    objects.push(shimmer);
  }
  return { objects, tweens };
}

// While Earth's Bulwark (the Verse of Stone) is on a unit: three crystals
// float round it, passing behind and in front, over a faint golden ring.
export function bulwarkAura(scene, unit) {
  // his 30 Oct crystals if they're there (solid, painted), else the ones cut from his card (light)
  const his = has(scene, EARTH_CRYSTALS);
  const keys = his ? EARTH_CRYSTALS : ['bulwark_crystal_0', 'bulwark_crystal_1', 'bulwark_crystal_2'];
  if (!has(scene, keys)) return null;
  let ring;
  if (has(scene, ['earth_cast_0'])) {
    // the first stage of his Earth's Bulwark sheet: a ring with small crystals and light
    ring = scene.add.image(0, 10, 'fx:earth_cast_0').setOrigin(0.5, 1).setScale(0.7).setAlpha(0.8);
  } else {
    ring = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(3, 0xd9b77a, 0.7);
    ring.strokeEllipse(0, 4, 74, 26);
    ring.setAlpha(0.5);
  }
  behind(unit, ring);
  const tweens = [scene.tweens.add({ targets: ring, alpha: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })];
  const crystals = keys.map((k) => {
    const c = scene.add.image(0, 0, 'fx:' + k).setScale(0.6);
    if (!his) c.setBlendMode(Phaser.BlendModes.ADD);
    return c;
  });
  crystals.forEach((c) => unit.view.add(c));
  const R = Math.max(30, (unit.bodyHalfWidth || 24) + 12);
  const clock = { t: 0 };
  const place = () => {
    crystals.forEach((c, i) => {
      if (!c.active) return;
      const a = clock.t + (i * Math.PI * 2) / crystals.length;
      const front = Math.sin(a) > 0; // the near half of the circle is lower on the screen
      c.setPosition(Math.cos(a) * R, -unit.centerY * 0.55 + Math.sin(a) * R * 0.3 + Math.sin(clock.t * 2 + i) * 4);
      c.setAlpha(front ? 0.95 : 0.55).setScale(front ? 0.62 : 0.5);
      // pass behind the figure on the far half
      if (unit.sprite && unit.view.exists(c)) {
        const above = unit.view.getIndex(c) > unit.view.getIndex(unit.sprite);
        if (front && !above) unit.view.moveAbove(c, unit.sprite);
        if (!front && above) unit.view.moveBelow(c, unit.sprite);
      }
    });
  };
  // 16.1 step 4: 3 small rock shards on a tighter, faster ellipse turning the other way
  // (stone_burst_0 to 2, added light, kept small and faint so the figure stays clear)
  const shardKeys = ['stone_burst_0', 'stone_burst_1', 'stone_burst_2'].filter((k) => has(scene, [k]));
  const shards = shardKeys.map((k) => {
    const c = scene.add.image(0, 0, 'fx:' + k).setScale(0.24).setBlendMode(Phaser.BlendModes.ADD);
    unit.view.add(c);
    return c;
  });
  const r2 = R * 0.7;
  const placeShards = () => {
    shards.forEach((c, i) => {
      if (!c.active) return;
      const a = -clock.t * 1.6 + (i * Math.PI * 2) / shards.length;
      const front = Math.sin(a) > 0;
      c.setPosition(Math.cos(a) * r2, -unit.centerY * 0.35 + Math.sin(a) * r2 * 0.3);
      c.setAlpha(front ? 0.82 : 0.45).setAngle(clock.t * 120 + i * 90);
      if (unit.sprite && unit.view.exists(c)) {
        const above = unit.view.getIndex(c) > unit.view.getIndex(unit.sprite);
        if (front && !above) unit.view.moveAbove(c, unit.sprite);
        if (!front && above) unit.view.moveBelow(c, unit.sprite);
      }
    });
  };
  place();
  placeShards();
  tweens.push(scene.tweens.add({ targets: clock, t: Math.PI * 2, duration: 4200, repeat: -1, onUpdate: () => { place(); placeShards(); } }));
  return { objects: [ring, ...crystals, ...shards], tweens };
}

// ---------- Sonic Javelin (roadmap 3.6 and 3.11, his Sonic Javelin sheets) ----------

const SPEAR = ['sj_spear_0', 'sj_spear_1', 'sj_spear_2'];

// True if every Sonic Javelin picture is there.
export function hasSonicArt(scene) {
  return has(scene, [...SPEAR, 'sj_impact_0', 'sj_impact_1', 'sj_rings', 'sj_burst_0', 'sj_burst_1']);
}

// The javelin in flight with its sonic rings, from (x0, y0) to (x1, y1).
// scale matches the thrower's pictures. onArrive runs when it gets there.
export function sonicSpear(scene, x0, y0, x1, y1, scale, duration, onArrive) {
  if (has(scene, ['sonic_spear'])) {
    // his 1 Nov flying spear (roadmap 9.16): one picture, tip to the right
    const spear = scene.add.image(x0, y0, 'fx:sonic_spear').setOrigin(0.9, 0.5).setScale(scale).setDepth(80);
    spear.setRotation(Math.atan2(y1 - y0, x1 - x0));
    if (x1 < x0) spear.setFlipY(true);
    scene.tweens.add({
      targets: spear, x: x1, y: y1, duration, ease: 'Linear',
      onComplete: () => {
        scene.tweens.add({ targets: spear, alpha: 0, duration: 140, onComplete: () => spear.destroy() });
        if (onArrive) onArrive();
      },
    });
    return spear;
  }
  if (!scene.anims.exists('sonicSpear')) {
    scene.anims.create({ key: 'sonicSpear', frames: SPEAR.map((k) => ({ key: 'fx:' + k })), frameRate: 18, repeat: -1 });
  }
  // the pictures fly to the right; the tip is near the right edge
  const spear = scene.add.sprite(x0, y0, 'fx:' + SPEAR[0]).setOrigin(0.82, 0.5).setScale(scale).setDepth(80);
  spear.setRotation(Math.atan2(y1 - y0, x1 - x0));
  if (x1 < x0) spear.setFlipY(true); // flying left: keep the feathers below the shaft
  spear.play('sonicSpear');
  scene.tweens.add({
    targets: spear,
    x: x1,
    y: y1,
    duration,
    ease: 'Linear',
    onComplete: () => {
      scene.tweens.add({ targets: spear, alpha: 0, duration: 140, onComplete: () => spear.destroy() });
      if (onArrive) onArrive();
    },
  });
  return spear;
}

// The fire trail the javelin leaves (his 5 Nov 15:41 sheet, roadmap 6.28): four
// stages of a streak, played one after another where the spear has just been,
// once about every 70 px of its flight. Same direction and flip as the spear.
export function sonicTrail(scene, x0, y0, x1, y1, scale, duration) {
  const keys = [0, 1, 2, 3].map((i) => 'sonic_trail_' + i);
  if (!has(scene, keys)) return;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const puffs = Math.max(1, Math.floor(len / 70));
  const angle = Math.atan2(y1 - y0, x1 - x0);
  for (let i = 0; i < puffs; i++) {
    const t = i / puffs;
    scene.time.delayedCall(duration * t, () => {
      const img = scene.add.image(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 'fx:' + keys[0]).setOrigin(0.9, 0.5).setScale(scale * 1.1).setDepth(79).setRotation(angle);
      if (x1 < x0) img.setFlipY(true);
      keys.forEach((k, j) => scene.time.delayedCall(j * 70, () => img.active && img.setTexture('fx:' + k)));
      scene.tweens.add({ targets: img, alpha: 0, delay: 280, duration: 160, onComplete: () => img.destroy() });
    });
  }
}

// The javelin bursts through a unit: a ring of sound at that point.
export function sonicRing(scene, x, y, angle, scale) {
  if (!has(scene, ['sj_rings'])) return;
  const ring = scene.add.image(x, y, 'fx:sj_rings').setScale(scale * 0.8).setRotation(angle).setDepth(80).setAlpha(0.95);
  scene.tweens.add({ targets: ring, scaleX: scale * 1.2, scaleY: scale * 1.2, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
}

// Where the javelin stops: rocks and dust burst up.
export function sonicImpact(scene, x, y, scale, flip) {
  if (has(scene, ['sonic_impact'])) {
    // his 1 Nov moment of impact: the spear driven into the ground, rocks and wind
    const img = scene.add.image(x, y + 6, 'fx:sonic_impact').setOrigin(0.52, 0.62).setScale(scale * 0.9).setDepth(80).setFlipX(flip).setAlpha(0);
    scene.tweens.add({ targets: img, alpha: 1, scale: scale, duration: 90 });
    scene.tweens.add({ targets: img, alpha: 0, delay: 520, duration: 320, onComplete: () => img.destroy() });
    return;
  }
  flipbook(scene, ['sj_impact_0', 'sj_impact_1'], x, y + 10, { frameMs: 110, scale, depth: 80, flip });
}

// The low sweep's burst of earth (Sonic Javelin's follow-up).
export function earthBurst(scene, x, y, scale, flip) {
  flipbook(scene, ['sj_burst_0', 'sj_burst_1'], x, y + 12, { frameMs: 120, scale, depth: 80, flip });
}

// Layra's Wildfire (roadmap 3.9): a ball of fire flies to the target and
// bursts into a column of flame. Uses the Fury pictures if they are there.
export function fireball(scene, x0, y0, x1, y1, onArrive) {
  if (has(scene, ['fire_beam'])) {
    // his fire from the Wildfire sheet (roadmap 9.10): its head is on the left as drawn
    const beam = scene.add.image(x0, y0, 'fx:fire_beam').setOrigin(0.15, 0.5).setScale(0.7).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
    beam.setRotation(Math.atan2(y1 - y0, x1 - x0) + Math.PI);
    scene.tweens.add({
      targets: beam, x: x1, y: y1, duration: 300, ease: 'Quad.easeIn',
      onComplete: () => {
        scene.tweens.add({ targets: beam, alpha: 0, duration: 120, onComplete: () => beam.destroy() });
        if (onArrive) onArrive();
      },
    });
    return;
  }
  const ball = scene.add.circle(x0, y0, 11, 0xffb347, 1).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
  const core = scene.add.circle(x0, y0, 6, 0xfff1c2, 1).setDepth(81).setBlendMode(Phaser.BlendModes.ADD);
  const trail = scene.time.addEvent({
    delay: 24,
    repeat: 12,
    callback: () => {
      const ember = scene.add.circle(ball.x, ball.y, 7, 0xff6a2a, 0.8).setDepth(79).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: ember, scale: 0.2, alpha: 0, duration: 260, onComplete: () => ember.destroy() });
    },
  });
  scene.tweens.add({
    targets: [ball, core],
    x: x1,
    y: y1,
    duration: 300,
    ease: 'Quad.easeIn',
    onComplete: () => {
      trail.remove();
      ball.destroy();
      core.destroy();
      if (onArrive) onArrive();
    },
  });
}

// Flames burst up at a spot (the feet of the target).
export function flameBurst(scene, x, y) {
  if (has(scene, ['fury_column', 'fury_sparks'])) {
    const col = scene.add.image(x, y + 6, 'fx:fury_column').setOrigin(0.5, 1).setScale(0.5, 0.15).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: col, scaleY: 0.6, duration: 200, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: col, alpha: 0, delay: 320, duration: 380, onComplete: () => col.destroy() });
    const sparks = scene.add.image(x, y - 40, 'fx:fury_sparks').setScale(0.45).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: sparks, y: y - 85, alpha: 0, duration: 800, onComplete: () => sparks.destroy() });
    return;
  }
  const glow = scene.add.circle(x, y - 30, 30, 0xff7a2a, 0.9).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: glow, scale: 1.8, alpha: 0, duration: 500, onComplete: () => glow.destroy() });
}

// While a unit burns: small embers rise off it now and then. Returns the
// objects (in the unit's container), so the battle can remove them.
export function burnAura(scene, unit) {
  const embers = [];
  for (let i = 0; i < 3; i++) {
    const e = scene.add.circle((i - 1) * 12, -unit.centerY + 10, 4, 0xff8a3c, 0.85).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: e, y: -unit.topY - 10, alpha: 0, duration: 900, delay: i * 300, repeat: -1 });
    unit.view.add(e);
    embers.push(e);
  }
  return embers;
}

// ---------- The clean-up batch (1 Nov) ----------

// Empower (roadmap 9.6): his golden aura bursts up round a fighter who spends
// Poise to Empower a stance. Drawn on black, so it is added as light.
export function empowerAura(scene, unit) {
  if (!scene.textures.exists('fx:empower_aura') || !unit.view) return;
  const img = scene.add.image(unit.view.x, unit.view.y + 8, 'fx:empower_aura').setOrigin(0.5, 0.92).setDepth(unit.view.depth + 0.5);
  img.setBlendMode(Phaser.BlendModes.ADD).setScale(0.35, 0.2).setAlpha(0);
  scene.tweens.add({ targets: img, alpha: 1, scaleX: 0.55, scaleY: 0.6, duration: 220, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: img, alpha: 0, delay: 650, duration: 380, onComplete: () => img.destroy() });
}

// The element a Verse is made of, for the swirl that rises round Layra as
// she concentrates (roadmap 9.10, his 30 Oct rows): earth, wind, fire, and the
// purple for her Hex.
const ELEMENT_OF = { swiftness: 'wind', stone: 'earth', fury: 'fire', slow: 'hex', husk: 'wind' };

// The swirl rising at the caster's feet while she gathers the Verse (two
// pictures), then the sphere as it is released. Returns true if drawn.
export function elementRise(scene, unit, spellId, ms) {
  const el = ELEMENT_OF[spellId];
  if (!el || !has(scene, ['rise_' + el + '_0', 'rise_' + el + '_1']) || !unit.view) return false;
  const x = unit.view.x;
  const y = unit.view.y + 6;
  const depth = unit.view.depth + 0.4;
  const img = scene.add.image(x, y, 'fx:rise_' + el + '_0').setOrigin(0.5, 1).setScale(0.35).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0); // half size (Baiyee 8 Nov): it hid Layra
  scene.tweens.add({ targets: img, alpha: 0.95, duration: 120 });
  scene.time.delayedCall(ms * 0.5, () => img.active && img.setTexture('fx:rise_' + el + '_1'));
  scene.time.delayedCall(ms, () => {
    if (!img.active) return;
    const sphere = 'rise_' + el + '_' + (el === 'fire' ? 1 : 2);
    if (has(scene, [sphere])) img.setTexture('fx:' + sphere);
    scene.tweens.add({ targets: img, alpha: 0, scale: 0.42, duration: 300, onComplete: () => img.destroy() });
  });
  return true;
}

// While the player picks a Verse target (roadmap 13.12): a subtle particle loop
// rising round the caster's feet, smaller than her and under 50% opacity (Baiyee
// 8 Nov: the big swirl hid her). Embers for Fury, drifting stones for Stone, wind
// streaks for Swift (and Husk), purple motes for Slow. It goes through fxEmitter,
// so the caps and the Full / Light switch apply. Returns stop(), or null if no art.
const HOLD_LOOK = {
  fury: { frequency: 220, config: { speedY: { min: -50, max: -25 }, speedX: { min: -6, max: 6 }, scale: { start: 0.3, end: 0 }, alpha: { start: 0.45, end: 0 }, tint: [0xff7a2e, 0xffb347], lifespan: 1100 } },
  stone: { texture: 'fx:stone_burst_0', frequency: 380, config: { speedY: { min: -22, max: -8 }, speedX: { min: -10, max: 10 }, rotate: { min: 0, max: 360 }, scale: { start: 0.09, end: 0.03 }, alpha: { start: 0.45, end: 0 }, lifespan: 1400 } },
  wind: { frequency: 300, config: { speedX: { min: 40, max: 65 }, speedY: { min: -14, max: -4 }, scaleX: { start: 1, end: 0.4 }, scaleY: { start: 0.16, end: 0.08 }, alpha: { start: 0.4, end: 0 }, tint: [0xdff6ff, 0xbfe9ff], lifespan: 800 } },
  hex: { frequency: 260, config: { speedY: { min: -28, max: -12 }, speedX: { min: -5, max: 5 }, scale: { start: 0.3, end: 0.05 }, alpha: { start: 0.45, end: 0 }, tint: [0xb48cff, 0x8a5fe0, 0xd2b3ff], lifespan: 1300 } },
};
export function elementHold(scene, unit, spellId) {
  const look = HOLD_LOOK[ELEMENT_OF[spellId]];
  if (!look || !unit.view) return null;
  const loop = fxEmitter(scene, unit, {
    texture: look.texture || 'fx-dot',
    frequency: look.frequency,
    maxParticles: 12,
    config: { x: { min: -20, max: 20 }, y: { min: -4, max: 6 }, ...look.config },
  });
  if (!loop) return null;
  return () => { loop.emitter.stop(); scene.time.delayedCall(1400, () => loop.destroy()); }; // let the last particles fade out
}

// ---------- Phase 4: the enemy skills (1 Nov) ----------

const ENCHANT_RING = range('enchant_ring', 4);
const ENCHANT_SIGIL = range('enchant_sigil', 4);
const ENCHANT_COMET = range('enchant_comet', 4);

// Rabdul's Enchant (roadmap 4.1), part one: as he chants, his ring of fire
// rises round his feet.
export function enchantChant(scene, x, y, depth) {
  if (!has(scene, ENCHANT_RING)) return;
  flipbook(scene, ENCHANT_RING, x, y + 14, { frameMs: 150, scale: 0.75, depth: depth + 0.5, hold: 200, fade: 260 });
}

// Part two: Shango's symbol forms over his hand, then flies to the weapon it
// will burn on (to "to"), a comet of fire. onArrive runs when it lands. If
// the target is Rabdul himself, the symbol just turns and settles on him.
export function enchantSigil(scene, from, to, onArrive) {
  if (!has(scene, [...ENCHANT_SIGIL, ...ENCHANT_COMET])) {
    scene.time.delayedCall(300, onArrive);
    return;
  }
  const sigil = scene.add.image(from.x, from.y, 'fx:' + ENCHANT_SIGIL[0]).setDepth(82).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0);
  ENCHANT_SIGIL.forEach((k, i) => scene.time.delayedCall(i * 90, () => sigil.active && sigil.setTexture('fx:' + k)));
  scene.tweens.add({ targets: sigil, scale: 0.55, alpha: 1, duration: 300, ease: 'Back.easeOut' });
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  scene.time.delayedCall(380, () => {
    if (dist < 20) {
      // on himself: it turns once and sinks onto him
      scene.tweens.add({ targets: sigil, y: to.y, angle: 360, scale: 0.3, alpha: 0, duration: 380, onComplete: () => { sigil.destroy(); onArrive(); } });
      return;
    }
    sigil.destroy();
    // the comet: the symbol at its head, the fire trailing behind (drawn flying right)
    const comet = scene.add.image(from.x, from.y, 'fx:' + ENCHANT_COMET[0]).setDepth(82).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5);
    comet.setRotation(Math.atan2(to.y - from.y, to.x - from.x));
    let f = 0;
    const flicker = scene.time.addEvent({ delay: 70, loop: true, callback: () => comet.active && comet.setTexture('fx:' + ENCHANT_COMET[++f % 4]) });
    scene.tweens.add({
      targets: comet, x: to.x, y: to.y, duration: Math.min(520, 160 + dist * 1.1), ease: 'Sine.easeIn',
      onComplete: () => { flicker.remove(); comet.destroy(); onArrive(); },
    });
  });
}

// Part three: the symbol lands on the weapon: it flares and burns into it.
export function enchantLand(scene, x, y) {
  if (!has(scene, ENCHANT_SIGIL)) return;
  const img = scene.add.image(x, y, 'fx:' + ENCHANT_SIGIL[2]).setDepth(82).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35);
  scene.tweens.add({ targets: img, scale: 0.75, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
}

// While a weapon is enchanted: Shango's symbol glows faintly on the ground at
// the unit's feet, turning slowly, and a few embers drift up off it.
export function enchantAura(scene, unit) {
  if (!has(scene, ['enchant_sigil_1'])) return null;
  const flat = scene.add.container(0, 4).setScale(1, 0.4);
  const mark = scene.add.image(0, 0, 'fx:enchant_sigil_1').setBlendMode(Phaser.BlendModes.ADD).setScale(0.42).setAlpha(0.55);
  flat.add(mark);
  unit.view.addAt(flat, 0); // under the figure
  const tweens = [
    scene.tweens.add({ targets: mark, angle: 360, duration: 9000, repeat: -1 }),
    scene.tweens.add({ targets: mark, alpha: 0.3, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
  ];
  // (units with painted flames keep the two drifting sparks; the others get the hand embers below)
  const embers = (unit.hasEnchantedArt ? [0, 1] : []).map((i) => {
    const e = scene.add.circle((i ? 10 : -12), -unit.centerY + 6, 3, 0xff8a3c, 0.8).setBlendMode(Phaser.BlendModes.ADD);
    unit.view.add(e);
    tweens.push(scene.tweens.add({ targets: e, y: -unit.topY, alpha: { from: 0.8, to: 0 }, duration: 1400, delay: i * 700, repeat: -1 }));
    return e;
  });
  // A unit with no flaming pictures of its own (art.json "enchanted": Rabdul and others, roadmap 4.4,
  // redone like Fury in 1.25): no picture over the body. Embers rise from the weapon hand and the
  // figure flickers a faint orange. (Units with flaming pictures keep those.)
  const extra = [];
  if (!unit.hasEnchantedArt) {
    const hand = fxEmitter(scene, unit, {
      frequency: 190,
      maxParticles: 10,
      behindFigure: false,
      config: {
        x: { min: -3, max: 3 },
        y: { min: -3, max: 3 },
        speedY: { min: -46, max: -26 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [0xff7a2e, 0xffb347],
        lifespan: 1100,
      },
    });
    if (hand) {
      // the weapon hand is on the side the unit faces; follow it as it turns
      tweens.push(scene.tweens.add({
        targets: hand.emitter, duration: 200, repeat: -1,
        x: 0, // a dummy property so the tween ticks; the real move is in onUpdate
        onUpdate: () => {
          if (!hand.emitter.scene) return;
          hand.emitter.setPosition((unit.facing || '').endsWith('Right') ? 15 : -15, -unit.centerY + 4);
        },
      }));
      extra.push(hand);
    }
    // a faint orange flicker on the figure (random small flickers, not a smooth pulse)
    const lo = Phaser.Display.Color.ValueToColor(0xffffff), hi = Phaser.Display.Color.ValueToColor(0xffb98a);
    const flick = { t: 0 };
    tweens.push(scene.tweens.add({
      targets: flick, t: 1, duration: 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onYoyo: () => { flick.max = 0.45 + Math.random() * 0.55; },
      onUpdate: () => {
        const sp = unit.sprite;
        if (!sp || !sp.active || sp.tintFill || unit.hidden) return; // leave the hit flash and the hidden glow alone
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(lo, hi, 100, Math.round(flick.t * (flick.max || 0.7) * 100));
        sp.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
    }));
    // a stand-in object so the cleanup (keepAura) also removes the tint
    extra.push({ destroy: () => { if (unit.sprite && unit.sprite.active && !unit.sprite.tintFill && !unit.hidden) unit.sprite.clearTint(); } });
  }
  return { objects: [flat, ...embers, ...extra], tweens };
}

// ---------- Step and hit effects for the four Verses (roadmap 16.1 steps 6 and 7) ----------
// Stone, Swift, Fury and Slow each leave a mark where a unit steps and flare where it lands or
// takes a blow. Short and small (Clarity: the board must stay readable on a phone). The bursts
// are one-offs with a hard cap of 30 particles, halved when the Effects switch is on Light.

// Which Verses a unit carries: its buff (swiftness, fury, stone) and, apart, being slowed.
export function verseKinds(unit) {
  const st = unit && unit.status;
  const kinds = [];
  if (st && st.buff && ['swiftness', 'fury', 'stone'].includes(st.buff.id)) kinds.push(st.buff.id === 'swiftness' ? 'swift' : st.buff.id);
  if (st && st.hex && st.hex.id === 'slow') kinds.push('slow');
  return kinds;
}

// A one-off puff of particles at (x, y). count is capped at 30 and halved in Light.
function fxBurst(scene, x, y, depth, count, config) {
  if (!scene.textures.exists('fx-dot')) return null;
  const n = Math.min(30, fxState.mode === 'light' ? Math.ceil(count / 2) : count);
  const life = config.lifespan && config.lifespan.max ? config.lifespan.max : (config.lifespan || 600);
  const emitter = scene.add.particles(x, y, 'fx-dot', { emitting: false, blendMode: 'ADD', ...config }).setDepth(depth);
  emitter.explode(n);
  scene.time.delayedCall(life + 100, () => emitter.scene && emitter.destroy());
  return emitter;
}

// A flat ring or wave laid on the ground (squashed to the tile's slope), growing and fading.
function groundWave(scene, key, x, y, depth, { from = 0.3, to = 0.7, squash = 0.5, ms = 420, alpha = 0.7, tint } = {}) {
  if (!has(scene, [key])) return null;
  const img = scene.add.image(x, y, 'fx:' + key).setDepth(depth).setScale(from, from * squash).setAlpha(alpha);
  if (!PAINTED(key)) img.setBlendMode(Phaser.BlendModes.ADD);
  if (tint) img.setTint(tint);
  scene.tweens.add({ targets: img, scaleX: to, scaleY: to * squash, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
  return img;
}

// A unit leaves the tile at (x, y) (screen), heading dx sideways. depth = that tile's drawing depth.
// "kinds" are the Verses it carries. Swift's gust at the start of the move stays as it was.
export function stepEffect(scene, kinds, x, y, dx, depth) {
  const d = depth + 0.5; // just above the tile, below the figures
  const dir = dx >= 0 ? 1 : -1;
  for (const kind of kinds) {
    if (kind === 'stone') {
      // a puff of dust: the flat dust ring, and a few brown grains
      const rings = ['dust_ring_0', 'dust_ring_1', 'dust_ring_2', 'dust_ring_3'].filter((k) => has(scene, [k]));
      if (rings.length) flipbook(scene, rings, x, y + 6, { frameMs: 70, scale: 0.4, depth: d, originY: 0.5, fade: 160 }).setScale(0.6, 0.33).setAlpha(1);
      fxBurst(scene, x, y, d, 8, { speedX: { min: -34, max: 34 }, speedY: { min: -34, max: -10 }, gravityY: 90, scale: { start: 0.45, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0x8a6a48, 0xa3825c, 0x6f553a], lifespan: { min: 320, max: 480 }, blendMode: 'NORMAL' });
    } else if (kind === 'swift') {
      // wind streaks thrown back along the way it came
      fxBurst(scene, x, y - 26, d + 1, 9, { speedX: { min: -dir * 90, max: -dir * 50 }, speedY: { min: -8, max: 8 }, x: { min: -8, max: 8 }, y: { min: -20, max: 14 }, scaleX: { start: 1.8, end: 0.6 }, scaleY: { start: 0.24, end: 0.12 }, alpha: { start: 0.75, end: 0 }, tint: [0xdff6ff, 0xbfe9ff], lifespan: { min: 280, max: 420 } });
    } else if (kind === 'fury') {
      // a few embers left on the tile, fading in about half a second
      fxBurst(scene, x, y + 2, d, 8, { x: { min: -14, max: 14 }, y: { min: -4, max: 4 }, speedX: { min: -6, max: 6 }, speedY: { min: -22, max: -8 }, scale: { start: 0.51, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xff7a2e, 0xffb347], lifespan: { min: 450, max: 600 } });
    } else if (kind === 'slow') {
      // a ripple on the tile it leaves
      groundWave(scene, 'slow_waves', x, y + 2, d, { from: 0.3, to: 0.8, squash: 0.55, ms: 700, alpha: 0.9 });
    }
  }
}

// A blow lands: attacker and target are the units; (x, y) is the target's middle and (gx, gy) the
// ground under it; dir is 1 or minus 1 (the way the blow travels). Each Verse either of them carries
// plays its flare once.
export function hitEffect(scene, kinds, x, y, gx, gy, dir, depth) {
  const d = depth + 1;
  for (const kind of new Set(kinds)) {
    if (kind === 'stone') {
      // a crack ring on the ground, a quick crackle, and shards thrown up that fall back
      groundWave(scene, 'earth_cast_0', gx, gy + 2, d - 0.6, { from: 0.35, to: 1, squash: 0.42, ms: 380, alpha: 1 });
      const ks = ['crackle_0', 'crackle_1', 'crackle_2', 'crackle_3', 'crackle_4'].filter((k) => has(scene, [k]));
      if (ks.length) flipbook(scene, ks, gx, gy + 6, { frameMs: 40, scale: 0.8, depth: d, originY: 0.7, fade: 120 });
      fxBurst(scene, gx, gy - 4, d, 11, { speedX: { min: -50, max: 50 }, speedY: { min: -120, max: -60 }, gravityY: 320, scale: { start: 0.63, end: 0.18 }, alpha: { start: 1, end: 0 }, tint: [0xb59a78, 0x8a7358, 0xd2b88c], lifespan: { min: 380, max: 520 }, blendMode: 'NORMAL' });
    } else if (kind === 'swift') {
      // a small ring flash and streaks flung the way the blow goes
      const ring = has(scene, ['swift_ring']) && scene.add.image(x, y, 'fx:swift_ring').setDepth(d).setScale(0.4).setAlpha(1).setBlendMode(Phaser.BlendModes.ADD);
      if (ring) scene.tweens.add({ targets: ring, scale: 0.75, alpha: 0, duration: 240, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
      fxBurst(scene, x, y, d, 12, { speedX: { min: dir * 80, max: dir * 190 }, speedY: { min: -30, max: 30 }, scaleX: { start: 1.95, end: 0.75 }, scaleY: { start: 0.27, end: 0.12 }, alpha: { start: 0.9, end: 0 }, tint: [0xdff6ff, 0xbfe9ff], lifespan: { min: 260, max: 380 } });
    } else if (kind === 'fury') {
      // a short flame flare, a ring flash and a burst of embers
      const ks = ['fury_cast_4', 'fury_cast_5', 'fury_cast_6'].filter((k) => has(scene, [k]));
      if (ks.length) flipbook(scene, ks, x, y + 14, { frameMs: 55, scale: 0.8, depth: d, originY: 0.8, fade: 140 });
      const ring = has(scene, ['fury_ring']) && scene.add.image(x, y, 'fx:fury_ring').setDepth(d).setScale(0.45).setAlpha(1).setBlendMode(Phaser.BlendModes.ADD);
      if (ring) scene.tweens.add({ targets: ring, scale: 0.9, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
      fxBurst(scene, x, y, d, 15, { speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 }, scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xff7a2e, 0xffb347], lifespan: { min: 320, max: 520 } });
    } else if (kind === 'slow') {
      // the pull flashes inward and motes are drawn toward the target
      const pull = has(scene, ['slow_pull']) && scene.add.image(x, y - 6, 'fx:slow_pull').setDepth(d).setScale(1.05).setAlpha(1).setBlendMode(Phaser.BlendModes.ADD);
      if (pull) scene.tweens.add({ targets: pull, scale: 0.3, alpha: 0, duration: 300, ease: 'Quad.easeIn', onComplete: () => pull.destroy() });
      if (scene.textures.exists('fx-dot')) {
        const n = fxState.mode === 'light' ? 5 : 9;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
          const mote = scene.add.image(x + Math.cos(a) * 36, y + Math.sin(a) * 26, 'fx-dot').setDepth(d).setScale(0.6).setAlpha(1).setTint(0xb48cff).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({ targets: mote, x, y, alpha: 0, scale: 0.1, duration: 320, delay: i * 18, ease: 'Quad.easeIn', onComplete: () => mote.destroy() });
        }
      }
    }
  }
}

// Tayo's Earth Drive (roadmap 4.2): a spike of rock bursts up out of the
// ground at (x, y), his rock from the "tayo's attack emerging" sheet. Returns
// the picture: it stays as a wall until the battle breaks it (crumbleSpike).
export function raiseSpike(scene, x, y, depth, width) {
  if (!has(scene, ['spike_2'])) return null;
  // a shade darker than his drawing, so the rock stands out on the sandstone floor
  // the origin is the rock's real bottom (the bottom edge of spike_2, which is solid across its base), so it stands on the tile's middle like a unit (1.35)
  const img = scene.add.image(x, y, 'fx:spike_2').setOrigin(0.5, 1).setDepth(depth).setTint(0xb89a80);
  const s = width / img.width;
  img.setScale(s, s * 0.08);
  scene.tweens.add({ targets: img, scaleY: s, duration: 240, ease: 'Back.easeOut' });
  // shards thrown up as it breaks the ground
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const r = scene.add.circle(x, y - 6, 2 + Math.random() * 3, 0x8a5a33, 1).setDepth(depth + 0.1);
    scene.tweens.add({ targets: r, x: x + Math.cos(a) * (30 + Math.random() * 30), y: y - 6 + Math.sin(a) * (40 + Math.random() * 30), alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }
  return img;
}

// The spike breaks apart and sinks back into the ground.
export function crumbleSpike(scene, img) {
  if (!img || !img.active) return;
  for (let i = 0; i < 6; i++) {
    const r = scene.add.circle(img.x + (Math.random() - 0.5) * 40, img.y - 20 - Math.random() * 40, 2 + Math.random() * 3, 0x8a5a33, 1).setDepth(img.depth + 0.1);
    scene.tweens.add({ targets: r, y: img.y + 4, alpha: 0, duration: 380 + Math.random() * 200, ease: 'Quad.easeIn', onComplete: () => r.destroy() });
  }
  scene.tweens.add({ targets: img, scaleY: 0, alpha: 0.4, duration: 380, ease: 'Quad.easeIn', onComplete: () => img.destroy() });
}

// ---------- Tayo's Element Blast (roadmap 13.4) ----------

// The water orbs: his fireball orbs with red and blue swapped, so the flame turns
// to cold blue light. Made once, the first time one is needed.
function waterOrbKeys(scene) {
  const keys = [0, 1, 2, 3].map((i) => 'fx:blast_orb_water_' + i);
  keys.forEach((key, i) => {
    const src = scene.textures.get('fx:blast_orb_' + i);
    if (scene.textures.exists(key) || !src || src.key === '__MISSING') return;
    const img = src.getSourceImage();
    const canvas = scene.textures.createCanvas(key, img.width, img.height);
    const ctx = canvas.getContext();
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    for (let p = 0; p < data.data.length; p += 4) {
      const r = data.data[p];
      data.data[p] = data.data[p + 2] * 0.55 + 20;
      data.data[p + 2] = Math.min(255, r + 20);
      data.data[p + 1] = Math.min(255, data.data[p + 1] * 0.9 + 40);
    }
    ctx.putImageData(data, 0, 0);
    canvas.refresh();
  });
  return keys;
}

// The orb of Element Blast: its four swirling pictures in turn, as light.
// Returns { orb, stop } at (x, y); the caller moves it and calls stop() to end it.
// water = true: the blue version.
export function elementOrb(scene, x, y, { water = false, scale = 0.4 } = {}) {
  if (!has(scene, ['blast_orb_0', 'blast_orb_1', 'blast_orb_2', 'blast_orb_3'])) return null;
  const keys = water ? waterOrbKeys(scene) : [0, 1, 2, 3].map((i) => 'fx:blast_orb_' + i);
  const orb = scene.add.image(x, y, keys[0]).setScale(scale).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
  let f = 0;
  const spin = scene.time.addEvent({ delay: 70, loop: true, callback: () => orb.active && orb.setTexture(keys[++f % 4]) });
  orb.once('destroy', () => spin.remove());
  return orb;
}

// Sand and rocks thrown up from the tile where a heavy hit lands (roadmap 6.37, his 7 Nov
// sheet). dir is 1 when the blow came from the left (the swirl flies up and right, his
// north-east view) and -1 when it came from the right (north-west). The sheet's other two
// views (south-east, south-west) are not used: the tile he drew under them hides part of
// the swirl, so only the two clean views play. Returns false if the pictures aren't loaded.
const SAND_VIEWS = { 1: ['sand_impact_ne', 0.384, 0.653], '-1': ['sand_impact_nw', 0.597, 0.627] }; // key, tile centre across, down
export function sandImpact(scene, x, y, dir) {
  const [key, ox, oy] = SAND_VIEWS[dir >= 0 ? 1 : -1];
  if (!has(scene, [key])) return false;
  // his tile is 205 px wide in the picture (it was cut at half size); the swirl is a little bigger than a tile
  const scale = (TILE_WIDTH * 1.3) / 205;
  const img = scene.add.image(x, y, 'fx:' + key).setOrigin(ox, oy).setScale(scale * 0.8).setDepth(80).setAlpha(0);
  scene.tweens.add({ targets: img, alpha: 0.95, scale, duration: 120, ease: 'Quad.easeOut' });
  scene.tweens.add({ targets: img, alpha: 0, y: y - 6, delay: 260, duration: 380, ease: 'Quad.easeIn', onComplete: () => img.destroy() });
  return true;
}

// ---------- Clash effects (roadmap 16.1 steps 8, 10 and 11) ----------
// Where two blades meet: a white flash card for 2 frames, the strike flipbook tinted gold, and 30 gold
// sparks flung both ways (15 each side, with gravity). Light halves the sparks (fxBurst).
export function clashSparks(scene, x, y, depth = 80) {
  const ks = range('strike', 7).filter((k) => has(scene, [k]));
  if (ks.length) flipbook(scene, ks, x, y, { frameMs: 28, scale: 0.5, depth, originY: 0.5, fade: 90 }).setTint(0xffd27a);
  if (scene.textures.exists('fx-dot')) {
    // the flash card: one big soft white dot for about 2 frames
    const card = scene.add.image(x, y, 'fx-dot').setDepth(depth + 1).setScale(5).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
    scene.time.delayedCall(34, () => card.destroy());
  }
  const gold = [0xffe08a, 0xffc24a, 0xffffff];
  for (const side of [-1, 1]) {
    const lo = side === 1 ? -35 : 145, hi = side === 1 ? 35 : 215; // degrees: right side or left side
    fxBurst(scene, x, y, depth, 15, { speed: { min: 110, max: 260 }, angle: { min: lo, max: hi }, gravityY: 420, scale: { start: 0.38, end: 0 }, alpha: { start: 1, end: 0 }, tint: gold, lifespan: { min: 220, max: 420 } });
  }
}

// The pulsing ground ring under two fighters in a clash. It is a flat gold ring (laid flat at 0.36
// height); pulse(winner) swells it once and lights the half toward the side with the momentum.
// The sprite-free drawing means no new art. Returns { pulse, destroy }.
export function clashRing(scene, a, b) {
  const gfx = scene.add.graphics();
  const cx = (a.view.x + b.view.x) / 2, cy = (a.view.y + b.view.y) / 2 + 4;
  const half = Math.hypot(b.view.x - a.view.x, (b.view.y - a.view.y) / 0.36) / 2 + 52;
  gfx.setPosition(cx, cy).setScale(1, 0.36).setDepth(Math.min(a.view.depth, b.view.depth) - 0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const draw = (leanX) => {
    gfx.clear();
    gfx.lineStyle(5, 0xffd27a, 0.55);
    gfx.strokeCircle(0, 0, half);
    gfx.lineStyle(9, 0xffe9a8, 0.95); // the brighter half faces the side that is winning
    if (leanX) {
      const mid = leanX > 0 ? 0 : Math.PI;
      gfx.beginPath();
      gfx.arc(0, 0, half, mid - Math.PI / 2, mid + Math.PI / 2);
      gfx.strokePath();
    }
  };
  draw(0);
  scene.tweens.add({ targets: gfx, alpha: 0.5, duration: 160 }); // it fades in as the stances appear
  const out = {
    pulse(winner, strong = false) {
      if (!gfx.active) return;
      const lean = winner ? Math.sign(winner.view.x - cx) : 0;
      draw(lean);
      scene.tweens.add({ targets: gfx, scaleX: strong ? 1.3 : 1.15, scaleY: (strong ? 1.3 : 1.15) * 0.36, alpha: 1, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
    },
    destroy() {
      if (!gfx.active) return;
      scene.tweens.add({ targets: gfx, alpha: 0, duration: 220, onComplete: () => gfx.destroy() });
    },
  };
  return out;
}

// The decisive beat's finishing burst on the loser: sj_burst, a big dust ring (1.5 times the step
// puff) and double the sparks. The scene adds the shake and the winner's Verse hit effect.
export function decisiveBurst(scene, x, y, depth = 82) {
  const bursts = ['sj_burst_0', 'sj_burst_1'].filter((k) => has(scene, [k]));
  if (bursts.length) flipbook(scene, bursts, x, y + 8, { frameMs: 80, scale: 0.6, depth, originY: 0.9, fade: 200 });
  const rings = range('dust_ring', 4).filter((k) => has(scene, [k]));
  if (rings.length) flipbook(scene, rings, x, y + 6, { frameMs: 70, scale: 0.6, depth: depth - 1, originY: 0.5, fade: 200 }).setScale(0.6, 0.33);
  fxBurst(scene, x, y - 20, depth + 1, 30, { speed: { min: 80, max: 280 }, angle: { min: 0, max: 360 }, gravityY: 380, scale: { start: 0.45, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffe08a, 0xffc24a, 0xffffff], lifespan: { min: 300, max: 560 } });
}
