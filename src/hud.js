import Phaser from 'phaser';
import { play } from './audio.js';

// The look of the battle interface: bronze frames, woven cloth bands, icons,
// round portraits and command buttons. Everything is drawn in code.

export const UI = {
  leather: 0x1c130c,
  leatherLight: 0x2b1d12,
  bronzeDark: 0x5a3d1c,
  bronze: 0xa87b3a,
  bronzeLight: 0xe4c27c,
  gold: 0xffe08a,
  cream: 0xf1e6c8,
  red: 0x9e2b25,
  ochre: 0xd99a2b,
  green: 0x3f5a2a,
  ink: 0x120c08,
  hero: 0x3fa7a0,
  enemy: 0xc4573f,
};

export const FONT = 'Georgia, "Times New Roman", serif';

// Text styles used across the interface
export function textStyle(size, color = '#f1e6c8', extra = {}) {
  return { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#120c08', strokeThickness: Math.max(2, Math.round(size / 7)), ...extra };
}

// ---------- Textures made once ----------

export function createHudTextures(scene) {
  if (scene.textures.exists('ui-woven')) return;

  // A woven band: diamonds and zigzags in red, ochre, green, cream and black,
  // in the spirit of the patterned cloth the characters wear. It repeats sideways.
  const W = 96;
  const H = 18;
  const band = scene.textures.createCanvas('ui-woven', W, H);
  const c = band.getContext();
  c.fillStyle = '#120c08';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#9e2b25';
  c.fillRect(0, 3, W, H - 6);
  for (let i = 0; i < 4; i++) {
    const x = i * 24;
    // ochre diamond with a black centre
    c.fillStyle = '#d99a2b';
    c.beginPath(); c.moveTo(x + 12, 3); c.lineTo(x + 21, H / 2); c.lineTo(x + 12, H - 3); c.lineTo(x + 3, H / 2); c.closePath(); c.fill();
    c.fillStyle = '#120c08';
    c.beginPath(); c.moveTo(x + 12, 6); c.lineTo(x + 16, H / 2); c.lineTo(x + 12, H - 6); c.lineTo(x + 8, H / 2); c.closePath(); c.fill();
    c.fillStyle = i % 2 ? '#3f5a2a' : '#f1e6c8';
    c.fillRect(x + 11, H / 2 - 1, 2, 2);
    // small cream triangles between diamonds
    c.fillStyle = '#f1e6c8';
    c.beginPath(); c.moveTo(x + 21, 3); c.lineTo(x + 24, 3); c.lineTo(x + 22.5, 6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + 21, H - 3); c.lineTo(x + 24, H - 3); c.lineTo(x + 22.5, H - 6); c.closePath(); c.fill();
  }
  c.fillStyle = '#e4c27c';
  c.fillRect(0, 2, W, 1);
  c.fillRect(0, H - 3, W, 1);
  band.refresh();

  // Fine leather grain, laid over dark panels
  const G = 128;
  const grain = scene.textures.createCanvas('ui-grain', G, G);
  const g = grain.getContext();
  g.fillStyle = '#1c130c';
  g.fillRect(0, 0, G, G);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,230,180,0.035)' : 'rgba(0,0,0,0.12)';
    g.fillRect(Math.random() * G, Math.random() * G, 1 + Math.random() * 2, 1);
  }
  grain.refresh();
}

// ---------- Panels ----------

// A leather panel with a bronze frame, studs in the corners, and an optional
// woven band along the top. Returns a container holding all the pieces.
export function bronzePanel(scene, x, y, w, h, { woven = true, alpha = 0.96 } = {}) {
  const parts = [];
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.45);
  shadow.fillRoundedRect(x + 4, y + 6, w, h, 14);
  parts.push(shadow);

  const leather = scene.add.tileSprite(x + w / 2, y + h / 2, w - 8, h - 8, 'ui-grain').setAlpha(alpha);
  parts.push(leather);

  const frame = scene.add.graphics();
  frame.lineStyle(6, UI.bronzeDark, 1);
  frame.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 12);
  frame.lineStyle(3, UI.bronze, 1);
  frame.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 11);
  frame.lineStyle(1, UI.bronzeLight, 0.8);
  frame.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 9);
  for (const [sx, sy] of [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]]) {
    frame.fillStyle(UI.bronzeDark, 1);
    frame.fillCircle(sx, sy, 5);
    frame.fillStyle(UI.bronzeLight, 1);
    frame.fillCircle(sx - 1, sy - 1, 2.5);
  }
  parts.push(frame);

  if (woven) {
    const band = scene.add.tileSprite(x + w / 2, y + 14, w - 36, 18, 'ui-woven');
    parts.push(band);
  }
  return scene.add.container(0, 0, parts);
}

// ---------- Icons ----------

// Draws a simple icon centred on (x, y), about "size" pixels across.
export function drawIcon(g, name, x, y, size, color = UI.bronzeLight) {
  const s = size / 40;
  const L = (ax, ay, bx, by, w = 4) => {
    g.lineStyle(w * s, color, 1);
    g.lineBetween(x + ax * s, y + ay * s, x + bx * s, y + by * s);
  };
  g.fillStyle(color, 1);
  switch (name) {
    case 'sword':
      L(-12, 12, 13, -13, 5);
      L(-15, 4, -4, 15, 4);
      L(-17, 17, -12, 12, 5);
      break;
    case 'crossed':
      L(-13, 13, 13, -13, 4);
      L(13, 13, -13, -13, 4);
      L(-16, 6, -6, 16, 3);
      L(16, 6, 6, 16, 3);
      break;
    case 'star':
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = (i % 2 ? 7 : 17) * s;
        if (i === 0) g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        else g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
      g.fillPath();
      break;
    case 'hourglass':
      g.fillTriangle(x - 11 * s, y - 15 * s, x + 11 * s, y - 15 * s, x, y);
      g.fillTriangle(x - 11 * s, y + 15 * s, x + 11 * s, y + 15 * s, x, y);
      L(-14, -16, 14, -16, 3);
      L(-14, 16, 14, 16, 3);
      break;
    case 'press':
      g.fillTriangle(x - 4 * s, y - 14 * s, x + 16 * s, y, x - 4 * s, y + 14 * s);
      L(-16, 0, -2, 0, 6);
      break;
    case 'shield':
      // a round shield with a boss in the middle
      g.fillCircle(x, y, 15 * s);
      g.fillStyle(0x1a1410, 1);
      g.fillCircle(x, y, 5 * s);
      break;
    case 'run':
      L(-14, 0, 12, 0, 4);
      L(4, -9, 14, 0, 4);
      L(4, 9, 14, 0, 4);
      L(-16, -10, -8, -10, 3);
      L(-18, 10, -10, 10, 3);
      break;
    case 'back':
      L(-12, 0, 14, 0, 4);
      L(-12, 0, -3, -9, 4);
      L(-12, 0, -3, 9, 4);
      break;
    case 'gem':
      g.fillTriangle(x - 13 * s, y - 4 * s, x + 13 * s, y - 4 * s, x, y + 15 * s);
      g.fillTriangle(x - 13 * s, y - 4 * s, x - 6 * s, y - 13 * s, x + 6 * s, y - 13 * s);
      g.fillTriangle(x - 13 * s, y - 4 * s, x + 6 * s, y - 13 * s, x + 13 * s, y - 4 * s);
      break;
    case 'sound':
    case 'mute':
      g.fillRect(x - 14 * s, y - 6 * s, 8 * s, 12 * s);
      g.fillTriangle(x - 7 * s, y - 6 * s, x + 4 * s, y - 15 * s, x + 4 * s, y + 15 * s);
      g.fillTriangle(x - 7 * s, y + 6 * s, x + 4 * s, y - 15 * s, x + 4 * s, y + 15 * s);
      if (name === 'sound') {
        g.lineStyle(3 * s, color, 1);
        g.beginPath(); g.arc(x + 6 * s, y, 8 * s, -0.8, 0.8); g.strokePath();
        g.beginPath(); g.arc(x + 6 * s, y, 14 * s, -0.8, 0.8); g.strokePath();
      } else {
        L(9, -8, 19, 8, 3);
        L(19, -8, 9, 8, 3);
      }
      break;
    default:
      g.fillCircle(x, y, 8 * s);
  }
}

// ---------- Round portraits ----------

// Makes (once) a round picture of a unit's face and returns its name.
// Units without a portrait get a token in their side's color with their job letter.
export function roundPortrait(scene, unit, portraitKey, size) {
  const key = 'round:' + unit.id + ':' + size;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size, size);
  const c = tex.getContext();
  const r = size / 2;
  c.save();
  c.beginPath();
  c.arc(r, r, r, 0, Math.PI * 2);
  c.closePath();
  c.clip();

  const sideColor = unit.side === 'hero' ? '#2d6f6a' : '#7d3326';
  const grad = c.createRadialGradient(r, r * 0.7, r * 0.1, r, r, r);
  grad.addColorStop(0, unit.side === 'hero' ? '#4fb9b1' : '#d4694f');
  grad.addColorStop(1, sideColor);
  c.fillStyle = grad;
  c.fillRect(0, 0, size, size);

  if (portraitKey && scene.textures.exists(portraitKey)) {
    const img = scene.textures.get(portraitKey).getSourceImage();
    // fill the circle with the face: scale to cover, aim a little above the middle
    const scale = Math.max(size / img.width, size / img.height) * 1.08;
    const w = img.width * scale;
    const h = img.height * scale;
    c.drawImage(img, (size - w) / 2, (size - h) * 0.35, w, h);
  } else {
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, size * 0.62, size, size);
    c.fillStyle = '#f1e6c8';
    c.font = 'bold ' + Math.round(size * 0.46) + 'px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(unit.badge || '?', r, r * 0.9);
    c.font = Math.round(size * 0.2) + 'px Georgia, serif';
    c.fillText(unit.label, r, size * 0.8);
  }
  c.restore();
  tex.refresh();
  return key;
}

// A round portrait in a bronze ring. The ring color shows the side.
export function portraitMedallion(scene, x, y, radius, unit, portraitKey, { active = false } = {}) {
  const ring = scene.add.graphics();
  ring.fillStyle(0x000000, 0.5);
  ring.fillCircle(x + 2, y + 3, radius + 5);
  ring.fillStyle(active ? UI.gold : UI.bronzeDark, 1);
  ring.fillCircle(x, y, radius + 5);
  ring.fillStyle(unit.side === 'hero' ? UI.hero : UI.enemy, 1);
  ring.fillCircle(x, y, radius + 2);
  const img = scene.add.image(x, y, roundPortrait(scene, unit, portraitKey, 128)).setDisplaySize(radius * 2, radius * 2);
  return scene.add.container(0, 0, [ring, img]);
}

// ---------- Command buttons ----------

// A command button: a leather bar with a bronze edge, an icon and a word.
// It reacts to presses and can be dimmed or highlighted.
export class CommandButton {
  constructor(scene, x, y, w, h) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.enabled = false;
    this.selected = false;
    this.onTap = null;
    this.accent = UI.bronzeLight;

    this.bg = scene.add.graphics();
    this.icon = scene.add.graphics();
    this.label = scene.add.text(x - w / 2 + 70, y, '', textStyle(28, '#f1e6c8')).setOrigin(0, 0.5);
    this.hit = scene.add.rectangle(x, y, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    this.view = scene.add.container(0, 0, [this.bg, this.icon, this.label, this.hit]);

    this.hit.on('pointerdown', () => {
      if (!this.enabled || !this.onTap) return;
      play('click');
      this.flash();
      this.onTap();
    });
    this.hit.on('pointerover', () => this.draw(true));
    this.hit.on('pointerout', () => this.draw(false));
  }

  // label: the word on the button, or null to hide it.
  set(label, iconName, enabled, onTap, { selected = false, accent = UI.bronzeLight } = {}) {
    const visible = label !== null;
    this.view.setVisible(visible);
    this.hit.setVisible(visible);
    this.enabled = visible && enabled;
    this.selected = selected;
    this.onTap = onTap;
    this.accent = accent;
    this.iconName = iconName;
    this.label.setText(label || '');
    this.draw(false);
  }

  draw(hover) {
    const { x, y, w, h } = this;
    const g = this.bg;
    g.clear();
    const on = this.enabled;
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 4, w, h, 10);
    g.fillStyle(this.selected ? 0x4a3218 : hover && on ? 0x3a2716 : UI.leatherLight, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(3, this.selected ? UI.gold : on ? UI.bronze : UI.bronzeDark, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(1, UI.bronzeLight, on ? 0.5 : 0.15);
    g.strokeRoundedRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, 7);
    // icon socket
    const ix = x - w / 2 + 36;
    g.fillStyle(UI.ink, 1);
    g.fillCircle(ix, y, 22);
    g.lineStyle(2, on ? this.accent : UI.bronzeDark, 1);
    g.strokeCircle(ix, y, 22);

    this.icon.clear();
    if (this.iconName) drawIcon(this.icon, this.iconName, ix, y, 30, on ? this.accent : 0x6a5434);
    this.label.setColor(on ? '#f1e6c8' : '#7a6a52');
    this.view.setAlpha(on ? 1 : 0.7);
  }

  flash() {
    this.scene.tweens.add({ targets: this.view, scaleX: 0.98, scaleY: 0.98, duration: 60, yoyo: true });
    const glow = this.scene.add.graphics();
    glow.fillStyle(UI.gold, 0.25);
    glow.fillRoundedRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, 10);
    glow.cameraFilter = this.view.cameraFilter; // seen by the same camera as the button
    this.view.add(glow);
    this.scene.tweens.add({ targets: glow, alpha: 0, duration: 260, onComplete: () => glow.destroy() });
  }
}

// Turns a CSS color like '#ff8a5c' into a number Phaser drawing understands.
export function hexToNumber(hex) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}
