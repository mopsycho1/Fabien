import Phaser from 'phaser';

// Battle effects: slashes, sparks, fire, lightning, ice, earth and so on.
//
// Every effect is DRAWN IN CODE with simple shapes, so there are no image
// files to load. Each one plays for a moment and then removes itself.
// x and y are positions on the screen, in pixels.
//
// Later, finished effect artwork can replace any of these, one at a time.

const EFFECT_DEPTH = 90; // above every tile and unit

// An effect calls makeBigger(x, y, 1.3) just before play() to be drawn 30
// percent bigger around the point (x, y). This is the one place to turn all
// the effects up or down if they look too small or too big.
let nextBigger = null;
function makeBigger(x, y, scale) {
  nextBigger = { x, y, scale };
}

// Runs an effect. "draw(g, t)" is called again and again while t goes from
// 0 (just started) to 1 (finished). It draws the effect for that moment onto
// the graphics object g.
function play(scene, duration, draw, onDone) {
  const g = scene.add.graphics().setDepth(EFFECT_DEPTH);

  // If the effect asked to be drawn bigger (see makeBigger below), scale it
  // around its middle point so it stays in the right place.
  if (nextBigger) {
    const b = nextBigger;
    nextBigger = null;
    g.setScale(b.scale);
    g.setPosition(b.x * (1 - b.scale), b.y * (1 - b.scale));
  }
  const state = { t: 0 };
  scene.tweens.add({
    targets: state,
    t: 1,
    duration,
    onUpdate: () => {
      g.clear();
      draw(g, state.t);
    },
    onComplete: () => {
      g.destroy();
      if (onDone) onDone();
    },
  });
}

const rad = Phaser.Math.DegToRad;
const ease = (t) => 1 - (1 - t) * (1 - t); // fast at first, then slows down

// A quick shake of the whole screen. Bigger power means a bigger shake.
export function screenShake(scene, power = 0.004, duration = 130) {
  scene.cameras.main.shake(duration, power);
}

// A curved blade streak. dir is 1 for a swing to the right, -1 for the left.
export function slashArc(scene, x, y, dir = 1) {
  makeBigger(x, y, 1.3);
  play(scene, 220, (g, t) => {
    const sweep = 170 * ease(t);
    const start = dir === 1 ? -95 : 275;
    const from = rad(start);
    const to = rad(start + dir * sweep);
    const fade = 1 - t * t;

    g.lineStyle(12 * (1 - t) + 3, 0xfff3c4, fade);
    g.beginPath();
    g.arc(x, y, 36, from, to, dir === -1);
    g.strokePath();

    g.lineStyle(5 * (1 - t) + 1, 0xffffff, fade);
    g.beginPath();
    g.arc(x, y, 42, from, to, dir === -1);
    g.strokePath();
  });
}

// Small bright lines flying outward from a point. Used for every hit.
export function hitSpark(scene, x, y, color = 0xffe08a, count = 9) {
  makeBigger(x, y, 1.3);
  const angles = [];
  for (let i = 0; i < count; i++) {
    angles.push((Math.PI * 2 * i) / count + Math.random() * 0.5);
  }
  play(scene, 260, (g, t) => {
    g.lineStyle(3, color, 1 - t);
    for (const a of angles) {
      const r0 = 6 + 14 * t;
      const r1 = 12 + 34 * ease(t);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      g.strokePath();
    }
    g.fillStyle(0xffffff, 0.8 * (1 - t));
    g.fillCircle(x, y, 10 * (1 - t) + 2);
  });
}

// A puff of dust rolling out along the ground.
export function dustPuff(scene, x, y) {
  makeBigger(x, y, 1.25);
  const puffs = [-26, -12, 0, 12, 26].map((dx) => ({ dx, size: 6 + Math.random() * 5 }));
  play(scene, 420, (g, t) => {
    for (const p of puffs) {
      g.fillStyle(0xcdb48a, 0.55 * (1 - t));
      g.fillCircle(x + p.dx * (0.6 + t * 1.5), y - 4 - t * 16, p.size + 12 * t);
    }
  });
}

// An arrow flying from one point to another. onHit runs when it lands.
export function arrowShot(scene, fromX, fromY, toX, toY, onHit) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const dist = Math.hypot(toX - fromX, toY - fromY);
  const duration = Math.max(120, Math.min(260, dist * 0.9));

  play(
    scene,
    duration,
    (g, t) => {
      const px = fromX + (toX - fromX) * t;
      const py = fromY + (toY - fromY) * t;
      const tailX = px - Math.cos(angle) * 28;
      const tailY = py - Math.sin(angle) * 28;

      // faint trail
      g.lineStyle(2, 0xffffff, 0.35);
      g.beginPath();
      g.moveTo(px - Math.cos(angle) * 60, py - Math.sin(angle) * 60);
      g.lineTo(tailX, tailY);
      g.strokePath();

      // shaft
      g.lineStyle(3, 0xe8d5a8, 1);
      g.beginPath();
      g.moveTo(tailX, tailY);
      g.lineTo(px, py);
      g.strokePath();

      // arrow head
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(
        px + Math.cos(angle) * 8, py + Math.sin(angle) * 8,
        px + Math.cos(angle + 2.5) * 8, py + Math.sin(angle + 2.5) * 8,
        px + Math.cos(angle - 2.5) * 8, py + Math.sin(angle - 2.5) * 8
      );
    },
    onHit
  );
}

// A burst of flame rising from a point.
export function fireBurst(scene, x, y) {
  makeBigger(x, y, 1.4);
  const flames = [];
  for (let i = 0; i < 14; i++) {
    flames.push({
      dx: (Math.random() - 0.5) * 46,
      rise: 26 + Math.random() * 40,
      size: 7 + Math.random() * 7,
      delay: Math.random() * 0.25,
    });
  }
  play(scene, 640, (g, t) => {
    // a warm glow on the ground under the fire
    g.fillStyle(0xff9f1c, 0.35 * (1 - t));
    g.fillEllipse(x, y + 4, 70 * (0.6 + t * 0.6), 30 * (0.6 + t * 0.6));

    for (const f of flames) {
      const p = Math.max(0, Math.min(1, (t - f.delay) / (1 - f.delay)));
      if (p <= 0) continue;
      const color = p < 0.35 ? 0xfff1a8 : p < 0.7 ? 0xff9a2e : 0xd62828;
      g.fillStyle(color, (1 - p) * 0.95);
      g.fillCircle(x + f.dx * (0.5 + p * 0.5), y - p * f.rise, f.size * (1 - p * 0.7));
    }
  });
}

// A jagged bolt from one point to another, flickering for a moment.
export function lightning(scene, fromX, fromY, toX, toY) {
  const points = [{ x: fromX, y: fromY }];
  const steps = 7;
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    points.push({
      x: fromX + (toX - fromX) * k + (Math.random() - 0.5) * 34,
      y: fromY + (toY - fromY) * k + (Math.random() - 0.5) * 34,
    });
  }
  points.push({ x: toX, y: toY });

  const drawBolt = (g, width, color, alpha) => {
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
  };

  play(scene, 320, (g, t) => {
    const flicker = Math.floor(t * 9) % 2 === 0 ? 1 : 0.35;
    drawBolt(g, 14, 0x4aa3ff, 0.25 * flicker * (1 - t));
    drawBolt(g, 6, 0x9fd4ff, 0.7 * flicker * (1 - t));
    drawBolt(g, 2.5, 0xffffff, flicker * (1 - t * 0.5));
  });
}

// Shards of ice bursting out, with a frost ring on the ground.
export function iceShards(scene, x, y) {
  makeBigger(x, y, 1.35);
  const shards = [];
  for (let i = 0; i < 10; i++) {
    shards.push({ angle: (Math.PI * 2 * i) / 10 + Math.random() * 0.4, speed: 24 + Math.random() * 30, size: 6 + Math.random() * 6 });
  }
  play(scene, 560, (g, t) => {
    g.lineStyle(3, 0xbfe9ff, 0.7 * (1 - t));
    g.strokeEllipse(x, y + 6, 20 + 90 * ease(t), 10 + 40 * ease(t));
    g.fillStyle(0xdff4ff, 0.18 * (1 - t));
    g.fillEllipse(x, y + 6, 20 + 90 * ease(t), 10 + 40 * ease(t));

    for (const s of shards) {
      const d = s.speed * ease(t);
      const cx = x + Math.cos(s.angle) * d;
      const cy = y - 10 + Math.sin(s.angle) * d * 0.7 + 22 * t * t;
      g.fillStyle(t < 0.5 ? 0xffffff : 0x8fd0f8, 1 - t);
      g.fillTriangle(
        cx + Math.cos(s.angle) * s.size, cy + Math.sin(s.angle) * s.size,
        cx + Math.cos(s.angle + 2.2) * s.size * 0.5, cy + Math.sin(s.angle + 2.2) * s.size * 0.5,
        cx + Math.cos(s.angle - 2.2) * s.size * 0.5, cy + Math.sin(s.angle - 2.2) * s.size * 0.5
      );
    }
  });
}

// Stone spikes rising out of the ground, holding, then crumbling.
export function earthSpikes(scene, x, y) {
  makeBigger(x, y, 1.4);
  const spikes = [-30, -15, 0, 15, 30].map((dx, i) => ({ dx, h: 38 + (i === 2 ? 26 : Math.random() * 14), w: 9 + Math.random() * 3 }));
  play(scene, 900, (g, t) => {
    const rise = t < 0.3 ? ease(t / 0.3) : 1;
    const crumble = t > 0.7 ? (t - 0.7) / 0.3 : 0;
    const alpha = 1 - crumble;

    for (const s of spikes) {
      const h = s.h * rise * (1 - crumble * 0.5);
      const baseY = y + 6 + crumble * 8;
      g.fillStyle(0x6b4f2a, alpha);
      g.fillTriangle(x + s.dx - s.w, baseY, x + s.dx + s.w, baseY, x + s.dx, baseY - h);
      g.fillStyle(0x9c7a4a, alpha);
      g.fillTriangle(x + s.dx, baseY, x + s.dx + s.w, baseY, x + s.dx, baseY - h);
    }

    // dust at the base as the spikes burst up
    if (t < 0.5) {
      g.fillStyle(0xcdb48a, 0.5 * (1 - t * 2));
      for (const dx of [-34, -12, 12, 34]) g.fillCircle(x + dx * (1 + t), y + 2 - t * 14, 8 + 8 * t);
    }
  });
}

// A ring of light rising around a unit: a spell landing on it.
export function buffAura(scene, x, y, color = 0xffe08a) {
  makeBigger(x, y, 1.2);
  play(scene, 700, (g, t) => {
    const fade = 1 - t;
    for (let i = 0; i < 3; i++) {
      const p = (t + i / 3) % 1;
      g.lineStyle(3, color, fade * (1 - p));
      g.strokeEllipse(x, y + 4 - p * 70, 70 - p * 20, 26 - p * 8);
    }
    g.fillStyle(color, 0.18 * fade);
    g.fillEllipse(x, y + 4, 80, 30);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 3;
      g.fillStyle(0xffffff, fade);
      g.fillCircle(x + Math.cos(a) * 30, y - 20 - t * 60 + Math.sin(a) * 6, 2.5);
    }
  });
}

// Two blades meeting: a bright flash and sparks flying both ways.
export function clashFlash(scene, x, y) {
  makeBigger(x, y, 1.4);
  play(scene, 360, (g, t) => {
    g.fillStyle(0xffffff, 0.85 * (1 - t));
    g.fillCircle(x, y, 26 * (1 - t) + 4);
    g.lineStyle(4, 0xffe08a, 1 - t);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r0 = 10 + 30 * t;
      const r1 = 18 + 60 * ease(t);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.7);
      g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.7);
      g.strokePath();
    }
  });
}

// ---------- Heavier hits and defeats ----------

// A wide glowing blade crescent: a soft glow, a bright core and speed lines.
// dir is 1 for a swing toward the right, -1 toward the left.
export function heavySlash(scene, x, y, dir = 1, color = 0xffd27a) {
  const glow = scene.add.graphics().setDepth(EFFECT_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  const core = scene.add.graphics().setDepth(EFFECT_DEPTH + 1);
  const state = { t: 0 };
  const start = dir === 1 ? 200 : -20; // starts high behind the target and sweeps down through it
  scene.tweens.add({
    targets: state,
    t: 1,
    duration: 240,
    onUpdate: () => {
      const t = state.t;
      const sweep = 150 * ease(Math.min(1, t * 1.6));
      const from = rad(start);
      const to = rad(start + dir * sweep);
      const fade = 1 - t * t;
      glow.clear();
      core.clear();
      glow.lineStyle(30 * (1 - t) + 6, color, 0.35 * fade);
      glow.beginPath();
      glow.arc(x, y, 50, from, to, dir === -1);
      glow.strokePath();
      core.lineStyle(10 * (1 - t) + 2, 0xffffff, fade);
      core.beginPath();
      core.arc(x, y, 50, from, to, dir === -1);
      core.strokePath();
      core.lineStyle(4 * (1 - t) + 1, color, fade);
      core.beginPath();
      core.arc(x, y, 60, from, to, dir === -1);
      core.strokePath();
    },
    onComplete: () => {
      glow.destroy();
      core.destroy();
    },
  });
}

// The moment of impact: a white flash, a ring bursting outward, and sparks
// that spray away from the attacker (dir: 1 = attacker on the left).
// power from about 1 (a light hit) to 2 (a huge one) makes it all bigger.
export function impactBurst(scene, x, y, dir = 1, color = 0xffe08a, power = 1) {
  const sparks = [];
  const n = Math.round(10 + 6 * power);
  for (let i = 0; i < n; i++) {
    const spread = (Math.random() - 0.5) * 2.2; // mostly in the direction of the blow
    const a = (dir === 1 ? 0 : Math.PI) + spread + (Math.random() < 0.2 ? Math.PI : 0);
    sparks.push({ a, len: 18 + Math.random() * 40 * power, w: 2 + Math.random() * 2.5 });
  }
  const g = scene.add.graphics().setDepth(EFFECT_DEPTH + 2).setBlendMode(Phaser.BlendModes.ADD);
  const state = { t: 0 };
  scene.tweens.add({
    targets: state,
    t: 1,
    duration: 320,
    onUpdate: () => {
      const t = state.t;
      g.clear();
      // flash
      g.fillStyle(0xffffff, 0.9 * (1 - t) * (1 - t));
      g.fillCircle(x, y, (14 + 26 * power) * (0.4 + t));
      // ring
      g.lineStyle(5 * (1 - t) + 1, color, 0.9 * (1 - t));
      g.strokeCircle(x, y, (20 + 50 * power) * ease(t));
      // sparks
      for (const s of sparks) {
        const r0 = 8 + s.len * 0.6 * ease(t);
        const r1 = 8 + s.len * 1.4 * ease(t);
        g.lineStyle(s.w * (1 - t) + 0.5, t < 0.3 ? 0xffffff : color, 1 - t);
        g.lineBetween(x + Math.cos(s.a) * r0, y + Math.sin(s.a) * r0 * 0.8, x + Math.cos(s.a) * r1, y + Math.sin(s.a) * r1 * 0.8);
      }
    },
    onComplete: () => g.destroy(),
  });
}

// A flat ring rushing out along the ground, like a shockwave.
export function groundRing(scene, x, y, color = 0xffd08a, size = 1) {
  const g = scene.add.graphics().setDepth(EFFECT_DEPTH - 1).setBlendMode(Phaser.BlendModes.ADD);
  const state = { t: 0 };
  scene.tweens.add({
    targets: state,
    t: 1,
    duration: 420,
    onUpdate: () => {
      const t = state.t;
      g.clear();
      g.lineStyle(6 * (1 - t) + 1, color, 0.8 * (1 - t));
      g.strokeEllipse(x, y, 140 * size * ease(t) + 10, 56 * size * ease(t) + 4);
    },
    onComplete: () => g.destroy(),
  });
}

// A burst of glowing embers from a body, drifting up as it burns away.
// Uses the soft dot made by atmosphere.js.
export function emberBurst(scene, x, y, colors, count = 40, height = 80) {
  if (!scene.textures.exists('fx-dot')) return;
  const emitter = scene.add.particles(0, 0, 'fx-dot', {
    x: { min: x - 22, max: x + 22 },
    y: { min: y - height, max: y },
    speedX: { min: -30, max: 30 },
    speedY: { min: -120, max: -30 },
    scale: { start: 0.55, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: colors,
    lifespan: { min: 700, max: 1400 },
    blendMode: 'ADD',
    emitting: false,
  });
  emitter.setDepth(EFFECT_DEPTH);
  emitter.explode(count);
  scene.time.delayedCall(1600, () => emitter.destroy());
}

// A soft column of light rising from where a fighter fell.
export function lightColumn(scene, x, y, color = 0xffb35c) {
  const g = scene.add.graphics().setDepth(EFFECT_DEPTH - 1).setBlendMode(Phaser.BlendModes.ADD);
  const state = { t: 0 };
  scene.tweens.add({
    targets: state,
    t: 1,
    duration: 900,
    onUpdate: () => {
      const t = state.t;
      const a = Math.sin(t * Math.PI) * 0.45;
      const w = 30 * (1 - t * 0.6);
      g.clear();
      for (let i = 0; i < 4; i++) {
        g.fillStyle(color, a / (i + 1));
        g.fillRect(x - w / 2 - i * 5, y - 220 * ease(t) - 10, w + i * 10, 220 * ease(t) + 10);
      }
    },
    onComplete: () => g.destroy(),
  });
}
