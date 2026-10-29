import Phaser from 'phaser';
import { play } from './audio.js';

// The look of the battle interface: thin gold frames (from Suleiman's mock),
// diamond and framed portraits, icons and command buttons. Everything is drawn in code.
// (bronzePanel, the older heavy frame with studs and a woven band, is still
// used by the result screen.)

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
    case 'move':
      // an arrow with a dashed tail: walk somewhere
      L(-1, 0, 14, 0, 4);
      L(6, -8, 14, 0, 4);
      L(6, 8, 14, 0, 4);
      L(-17, 0, -13, 0, 3);
      L(-10, 0, -5, 0, 3);
      break;
    case 'flask':
      // a round potion flask with a narrow neck
      g.fillCircle(x, y + 5 * s, 11 * s);
      g.fillRect(x - 4 * s, y - 13 * s, 8 * s, 10 * s);
      L(-7, -14, 7, -14, 3);
      break;
    case 'info':
      g.lineStyle(2.5 * s, color, 1);
      g.strokeCircle(x, y, 16 * s);
      g.fillCircle(x, y - 7 * s, 2.5 * s);
      L(0, -2, 0, 9, 3.5);
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
  const key = 'round:' + unit.id + ':' + size + ':' + (portraitKey || 'token'); // one per face, so a hurt face gets its own
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

// ---------- The slim look (from Suleiman's mock) ----------

// A dark panel with a thin gold line, as in the mock: no studs, no woven band.
// ornament: a strip of small diamonds down the left edge (the unit card).
export function framePanel(scene, x, y, w, h, { ornament = false, alpha = 0.94 } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.4);
  g.fillRoundedRect(x + 3, y + 4, w, h, 8);
  g.fillStyle(0x110c08, alpha);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(1.5, UI.bronze, 0.9);
  g.strokeRoundedRect(x, y, w, h, 8);
  g.lineStyle(1, UI.bronzeDark, 0.9);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 6);
  if (ornament) {
    // two thin rails with a chain of diamonds near the top
    const ox = x + 13;
    g.lineStyle(1, UI.bronze, 0.7);
    g.lineBetween(ox - 4, y + 14, ox - 4, y + h * 0.55);
    g.lineBetween(ox + 4, y + 14, ox + 4, y + h * 0.55);
    for (let i = 0; i < 4; i++) {
      const cy = y + 26 + i * 15;
      g.fillStyle(UI.ink, 1);
      g.fillTriangle(ox, cy - 7, ox + 6, cy, ox - 6, cy);
      g.fillTriangle(ox, cy + 7, ox + 6, cy, ox - 6, cy);
      g.lineStyle(1.5, i === 0 ? UI.bronzeLight : UI.bronze, 1);
      g.strokePoints([{ x: ox, y: cy - 7 }, { x: ox + 6, y: cy }, { x: ox, y: cy + 7 }, { x: ox - 6, y: cy }], true);
    }
  }
  return g;
}

// The side's colors behind a face: blue for heroes, red for enemies (as in the mock)
const SIDE_BACK = { hero: ['#3f7f9e', '#142f3d'], enemy: ['#a5392c', '#3a120d'] };

// Draws a face (or a token with the job letter) filling a w x h canvas area.
// alignY: where the face sits when the picture is taller than the area (0 top, 0.5 middle).
function paintFace(scene, c, unit, portraitKey, w, h, alignY) {
  const [light, dark] = SIDE_BACK[unit.side] || SIDE_BACK.hero;
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, light);
  grad.addColorStop(1, dark);
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
  if (portraitKey && scene.textures.exists(portraitKey)) {
    const img = scene.textures.get(portraitKey).getSourceImage();
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    c.drawImage(img, (w - dw) / 2, (h - dh) * alignY, dw, dh);
  } else {
    c.fillStyle = '#f1e6c8';
    c.font = 'bold ' + Math.round(Math.min(w, h) * 0.42) + 'px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(unit.badge || '?', w / 2, h / 2);
  }
}

// Makes (once) a diamond-shaped picture of a unit's face and returns its name.
export function diamondTexture(scene, unit, portraitKey) {
  const key = 'diamond:' + unit.id + ':' + (portraitKey || 'token');
  if (scene.textures.exists(key)) return key;
  const size = 128;
  const tex = scene.textures.createCanvas(key, size, size);
  const c = tex.getContext();
  c.save();
  c.beginPath();
  c.moveTo(size / 2, 0);
  c.lineTo(size, size / 2);
  c.lineTo(size / 2, size);
  c.lineTo(0, size / 2);
  c.closePath();
  c.clip();
  // the face is zoomed in a little, so the diamond shows the face rather than the shoulders
  c.translate(-size * 0.12, -size * 0.06);
  paintFace(scene, c, unit, portraitKey, size * 1.24, size * 1.24, 0.25);
  c.restore();
  tex.refresh();
  return key;
}

// A face in a diamond with a thin gold frame, for the turn order.
// half: half the diamond's width. active: the unit whose turn it is (brighter frame).
export function diamondPortrait(scene, x, y, half, unit, portraitKey, { active = false } = {}) {
  const pts = (r, dx = 0, dy = 0) => [
    { x: x + dx, y: y - r + dy },
    { x: x + r + dx, y: y + dy },
    { x: x + dx, y: y + r + dy },
    { x: x - r + dx, y: y + dy },
  ];
  const back = scene.add.graphics();
  back.fillStyle(0x000000, 0.55);
  back.fillPoints(pts(half + 5, 2, 3), true);
  back.fillStyle(active ? 0x6b4a1c : 0x2a1d12, 1);
  back.fillPoints(pts(half + 4), true);
  const img = scene.add.image(x, y, diamondTexture(scene, unit, portraitKey)).setDisplaySize(half * 2, half * 2);
  const frame = scene.add.graphics();
  frame.lineStyle(active ? 2.5 : 1.5, active ? UI.gold : UI.bronze, 1);
  frame.strokePoints(pts(half + 3), true);
  frame.lineStyle(1, active ? UI.bronzeLight : UI.bronzeDark, 0.9);
  frame.strokePoints(pts(half), true);
  return scene.add.container(0, 0, [back, img, frame]);
}

// A tall portrait in a gold frame, for the unit card.
export function framedPortrait(scene, x, y, w, h, unit, portraitKey) {
  const key = 'rect:' + unit.id + ':' + w + 'x' + h + ':' + (portraitKey || 'token');
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, w * 2, h * 2); // twice the size, so it stays sharp
    paintFace(scene, tex.getContext(), unit, portraitKey, w * 2, h * 2, 0.15);
    tex.refresh();
  }
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.5);
  g.fillRect(x - 1, y + 2, w + 8, h + 8);
  g.fillStyle(UI.bronzeDark, 1);
  g.fillRect(x - 4, y - 4, w + 8, h + 8);
  const img = scene.add.image(x, y, key).setOrigin(0, 0).setDisplaySize(w, h);
  const frame = scene.add.graphics();
  frame.lineStyle(2, UI.bronzeLight, 1);
  frame.strokeRect(x - 3, y - 3, w + 6, h + 6);
  frame.lineStyle(1, UI.bronze, 0.9);
  frame.strokeRect(x, y, w, h);
  // small corner cuts, like a fitted frame
  frame.fillStyle(UI.bronzeLight, 1);
  for (const [cx, cy] of [[x - 3, y - 3], [x + w + 3, y - 3], [x - 3, y + h + 3], [x + w + 3, y + h + 3]]) frame.fillRect(cx - 2, cy - 2, 4, 4);
  return scene.add.container(0, 0, [g, img, frame]);
}

// ---------- Command buttons ----------

// A command button in the slim style of the mock: a dark bar with a thin
// bronze edge, a round icon, a word, and a ">" when it opens a list.
// It reacts to presses and can be dimmed or highlighted.
export class CommandButton {
  // compact: a half-width button (smaller icon and words), two side by side in one row
  constructor(scene, x, y, w, h, { compact = false } = {}) {
    this.scene = scene;
    this.compact = compact;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.enabled = false;
    this.selected = false;
    this.onTap = null;
    this.accent = UI.bronzeLight;
    this.chevron = false;
    this.decor = null;

    this.bg = scene.add.graphics();
    this.icon = scene.add.graphics();
    this.label = scene.add.text(x - w / 2 + (compact ? 44 : 62), y, '', textStyle(compact ? 21 : 25, '#f1e6c8')).setOrigin(0, 0.5);
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
  // chevron: draw a ">" (it opens a list). decor: 'tiles' draws small blue tiles (Move).
  set(label, iconName, enabled, onTap, { selected = false, accent = UI.bronzeLight, chevron = false, decor = null } = {}) {
    const visible = label !== null;
    this.view.setVisible(visible);
    this.hit.setVisible(visible);
    this.enabled = visible && enabled;
    this.selected = selected;
    this.onTap = onTap;
    this.accent = accent;
    this.iconName = iconName;
    this.chevron = chevron;
    this.decor = decor;
    this.label.setText(label || '');
    this.draw(false);
  }

  // Moves the button to another row (the list closes up when a row is not needed).
  setY(y) {
    if (y === this.y) return;
    this.y = y;
    this.label.setY(y);
    this.hit.setY(y);
    this.draw(false);
  }

  draw(hover) {
    const { x, y, w, h } = this;
    const g = this.bg;
    g.clear();
    const on = this.enabled;
    const left = x - w / 2;
    const top = y - h / 2;
    if (this.selected) {
      // a soft gold glow around the chosen command
      g.lineStyle(6, UI.gold, 0.16);
      g.strokeRoundedRect(left - 2, top - 2, w + 4, h + 4, 9);
    }
    g.fillStyle(this.selected ? 0x2c200f : hover && on ? 0x221810 : 0x16100b, 0.96);
    g.fillRoundedRect(left, top, w, h, 7);
    g.fillStyle(0xffffff, 0.03); // a faint sheen on the upper half
    g.fillRoundedRect(left + 2, top + 2, w - 4, h / 2 - 2, 6);
    g.lineStyle(this.selected ? 2.5 : 1.5, this.selected ? UI.gold : on ? UI.bronze : UI.bronzeDark, 1);
    g.strokeRoundedRect(left, top, w, h, 7);
    // round icon socket
    const ix = left + (this.compact ? 23 : 31);
    const r = this.compact ? 15 : 19;
    g.fillStyle(UI.ink, 1);
    g.fillCircle(ix, y, r);
    g.lineStyle(1.5, on ? this.accent : UI.bronzeDark, 1);
    g.strokeCircle(ix, y, r);
    // ">" for a command that opens a list
    if (this.chevron) {
      const cx = left + w - (this.compact ? 16 : 24);
      g.lineStyle(2.5, on ? UI.bronzeLight : UI.bronzeDark, 1);
      g.lineBetween(cx - 5, y - 8, cx + 2, y);
      g.lineBetween(cx + 2, y, cx - 5, y + 8);
    }
    // small blue tiles on the Move command, as in the mock
    if (this.decor === 'tiles' && !this.chevron) {
      const tx = left + w - 52;
      for (const [dx, dy] of [[0, 0], [14, -7], [14, 7], [28, 0]]) {
        g.fillStyle(0x7fc4ff, on ? 0.55 : 0.2);
        g.fillPoints([{ x: tx + dx, y: y + dy - 6 }, { x: tx + dx + 12, y: y + dy }, { x: tx + dx, y: y + dy + 6 }, { x: tx + dx - 12, y: y + dy }], true);
      }
    }

    this.icon.clear();
    if (this.iconName) drawIcon(this.icon, this.iconName, ix, y, this.compact ? 20 : 26, on ? this.accent : 0x6a5434);
    this.label.setColor(on ? '#f1e6c8' : '#7a6a52');
    this.view.setAlpha(on ? 1 : 0.75);
  }

  flash() {
    this.scene.tweens.add({ targets: this.view, scaleX: 0.98, scaleY: 0.98, duration: 60, yoyo: true });
    const glow = this.scene.add.graphics();
    glow.fillStyle(UI.gold, 0.25);
    glow.fillRoundedRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, 7);
    glow.cameraFilter = this.view.cameraFilter; // seen by the same camera as the button
    this.view.add(glow);
    this.scene.tweens.add({ targets: glow, alpha: 0, duration: 260, onComplete: () => glow.destroy() });
  }
}

// Turns a CSS color like '#ff8a5c' into a number Phaser drawing understands.
export function hexToNumber(hex) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}
