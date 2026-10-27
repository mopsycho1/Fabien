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
];

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
function flipbook(scene, keys, x, y, { frameMs = 55, scale = 1, depth = 79, originY = 1 } = {}) {
  const img = scene.add.image(x, y, 'fx:' + keys[0]).setOrigin(0.5, originY).setScale(scale).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
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
