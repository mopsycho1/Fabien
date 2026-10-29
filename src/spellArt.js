import Phaser from 'phaser';

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
  'slow_ring', 'slow_pull', 'slow_spiral', 'slow_waves', 'slow_motes',
  // Gaha's Sonic Javelin (roadmap 3.11) and the Swift looks (3.10). These are
  // painted on white, not black, so they are drawn normally, not added as light.
  'sj_spear_0', 'sj_spear_1', 'sj_spear_2', 'sj_impact_0', 'sj_impact_1', 'sj_rings', 'sj_burst_0', 'sj_burst_1',
  'swift_swirl_0', 'swift_swirl_1', 'swift_swirl_2', 'swift_swirl_3', 'swift_swirl_4', 'swift_swirl_5',
  'swift_trail_0', 'swift_trail_1', 'swift_trail_2', 'swift_trail_3', 'swift_trail_4', 'swift_trail_5',
];
const PAINTED = (key) => /^(sj_|swift_swirl|swift_trail)/.test(key);

// Status icons (public/art/icons), shown over a unit instead of a word.
// A status with an "icon" in spells.json uses the picture of that name.
const ICONS = ['slow'];

export function preloadSpellArt(scene) {
  for (const f of FILES) scene.load.image('fx:' + f, './art/fx/' + f + '.png');
  for (const f of ICONS) scene.load.image('icon:' + f, './art/icons/' + f + '.png');
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
  const ring = scene.add.image(0, top, 'fx:slow_ring').setScale(0.32, 0.26).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.75);
  const motes = scene.add.image(0, -unit.centerY, 'fx:slow_motes').setScale(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
  scene.tweens.add({ targets: ring, y: top + 8, alpha: 0.45, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: motes, y: -unit.centerY + 10, alpha: 0.25, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  unit.view.add([ring, motes]);
  return [ring, motes];
}

const has = (scene, keys) => keys.every((k) => scene.textures.exists('fx:' + k));

// Plays pictures one after another at (x, y), standing on that point.
function flipbook(scene, keys, x, y, { frameMs = 55, scale = 1, depth = 79, originY = 1, flip = false } = {}) {
  const img = scene.add.image(x, y, 'fx:' + keys[0]).setOrigin(0.5, originY).setScale(scale).setDepth(depth).setFlipX(flip);
  if (!PAINTED(keys[0])) img.setBlendMode(Phaser.BlendModes.ADD);
  keys.forEach((k, i) => scene.time.delayedCall(i * frameMs, () => img.active && img.setTexture('fx:' + k)));
  scene.tweens.add({ targets: img, alpha: 0, delay: keys.length * frameMs, duration: 220, onComplete: () => img.destroy() });
  return img;
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
  const swirl = scene.add.sprite(0, 10, 'fx:' + SWIRL[0]).setOrigin(0.5, 1).setScale(0.62).setAlpha(0.8);
  swirl.play('swiftSwirl');
  unit.view.add(swirl);
  return [swirl];
}

// A unit under Swiftness takes a step: a gust of wind and feathers where it was.
// Returns true if the pictures were there.
export function swiftTrail(scene, x, y, dx) {
  if (!has(scene, TRAIL)) return false;
  flipbook(scene, TRAIL, x, y + 8, { frameMs: 45, scale: 0.62, depth: 78, flip: dx < 0 });
  return true;
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

// The javelin bursts through a unit: a ring of sound at that point.
export function sonicRing(scene, x, y, angle, scale) {
  if (!has(scene, ['sj_rings'])) return;
  const ring = scene.add.image(x, y, 'fx:sj_rings').setScale(scale * 0.8).setRotation(angle).setDepth(80).setAlpha(0.95);
  scene.tweens.add({ targets: ring, scaleX: scale * 1.2, scaleY: scale * 1.2, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
}

// Where the javelin stops: rocks and dust burst up.
export function sonicImpact(scene, x, y, scale, flip) {
  flipbook(scene, ['sj_impact_0', 'sj_impact_1'], x, y + 10, { frameMs: 110, scale, depth: 80, flip });
}

// The low sweep's burst of earth (Sonic Javelin's follow-up).
export function earthBurst(scene, x, y, scale, flip) {
  flipbook(scene, ['sj_burst_0', 'sj_burst_1'], x, y + 12, { frameMs: 120, scale, depth: 80, flip });
}

// Layra's Wildfire (roadmap 3.9): a ball of fire flies to the target and
// bursts into a column of flame. Uses the Fury pictures if they are there.
export function fireball(scene, x0, y0, x1, y1, onArrive) {
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
