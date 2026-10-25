import Phaser from 'phaser';
import { GAME_WIDTH } from './config.js';
import { play } from './audio.js';

// The living battlefield: clouds drifting across the dusk sky, the sun's glow
// breathing, sand blowing over the board in gusts, and embers rising.
// It is all decoration: nothing here changes the battle.

function makeTextures(scene) {
  if (scene.textures.exists('fx-dot')) return;

  // a soft round dot, used for sand and embers
  const dot = scene.textures.createCanvas('fx-dot', 16, 16);
  const d = dot.getContext();
  const g = d.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  d.fillStyle = g;
  d.fillRect(0, 0, 16, 16);
  dot.refresh();

  // a soft cloud: a few overlapping blurry blobs
  const W = 260;
  const H = 90;
  const cloud = scene.textures.createCanvas('fx-cloud', W, H);
  const c = cloud.getContext();
  for (const [x, y, r, a] of [[70, 55, 40, 0.5], [120, 45, 50, 0.55], [175, 52, 42, 0.5], [210, 60, 30, 0.4], [40, 62, 28, 0.4]]) {
    const cg = c.createRadialGradient(x, y, 0, x, y, r);
    cg.addColorStop(0, `rgba(255,214,170,${a})`);
    cg.addColorStop(1, 'rgba(255,214,170,0)');
    c.fillStyle = cg;
    c.fillRect(0, 0, W, H);
  }
  cloud.refresh();

  // the sun's glow
  const S = 360;
  const glow = scene.textures.createCanvas('fx-glow', S, S);
  const s = glow.getContext();
  const sg = s.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  sg.addColorStop(0, 'rgba(255,230,170,0.55)');
  sg.addColorStop(0.3, 'rgba(255,190,110,0.22)');
  sg.addColorStop(1, 'rgba(255,160,80,0)');
  s.fillStyle = sg;
  s.fillRect(0, 0, S, S);
  glow.refresh();
}

export function createAtmosphere(scene) {
  makeTextures(scene);
  const parts = { emitters: [] };

  // The sun's glow slowly breathes
  // (with the painted sky, the sun sits low on the left)
  const sun = scene.textures.exists('terrain:backdrop') ? { x: 84, y: 337 } : { x: 560, y: 600 };
  const glow = scene.add.image(sun.x, sun.y, 'fx-glow').setDepth(-19).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
  scene.tweens.add({ targets: glow, alpha: 1, scale: 1.08, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // Clouds drift slowly from left to right and come round again
  for (let i = 0; i < 4; i++) {
    const y = 190 + i * 70 + Math.random() * 30;
    const scale = 0.7 + Math.random() * 0.6;
    const cloud = scene.add.image(-200 + Math.random() * (GAME_WIDTH + 300), y, 'fx-cloud').setDepth(-19).setScale(scale).setAlpha(0.35 + Math.random() * 0.3);
    const drift = () => {
      const remaining = GAME_WIDTH + 200 - cloud.x;
      scene.tweens.add({
        targets: cloud,
        x: GAME_WIDTH + 200,
        duration: remaining * (90 + i * 25),
        onComplete: () => {
          cloud.x = -260;
          drift();
        },
      });
    };
    drift();
  }

  // Sand blowing across the board
  const sand = scene.add.particles(0, 0, 'fx-dot', {
    x: { min: -40, max: 0 },
    y: { min: 330, max: 900 },
    speedX: { min: 60, max: 140 },
    speedY: { min: -12, max: 14 },
    lifespan: 9000,
    scale: { min: 0.12, max: 0.32 },
    alpha: { start: 0.55, end: 0 },
    tint: [0xe8cfa0, 0xd8b47a, 0xf1e0b8],
    frequency: 140,
    quantity: 1,
  });
  sand.setDepth(75);
  parts.emitters.push(sand);

  // Embers rising from below the board
  const embers = scene.add.particles(0, 0, 'fx-dot', {
    x: { min: 120, max: GAME_WIDTH - 120 },
    y: { min: 820, max: 900 },
    speedX: { min: -12, max: 22 },
    speedY: { min: -55, max: -25 },
    lifespan: 4200,
    scale: { start: 0.35, end: 0.05 },
    alpha: { start: 0.9, end: 0 },
    tint: [0xffb04a, 0xff7a2e, 0xffd27a],
    frequency: 420,
    blendMode: 'ADD',
  });
  embers.setDepth(74);
  parts.emitters.push(embers);

  // Every so often a gust of wind: more sand, moving faster, and a soft whoosh
  const gust = () => {
    sand.setFrequency(25, 3);
    sand.speedX = { min: 180, max: 320 };
    play('wind');
    scene.time.delayedCall(2200, () => {
      sand.setFrequency(140, 1);
      sand.speedX = { min: 60, max: 140 };
    });
    scene.time.delayedCall(7000 + Math.random() * 7000, gust);
  };
  scene.time.delayedCall(4000 + Math.random() * 4000, gust);

  return parts;
}
