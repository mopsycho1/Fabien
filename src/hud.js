import { buttonTip, showTip, hoverTipStart, hoverTipEnd, TIP_HOLD_MS } from './tooltip.js';
import Phaser from 'phaser';
import { play } from './audio.js';

// The look of the battle interface. Since 29 Oct it uses Suleiman's UI art
// (public/art/ui, cut from his UI COMPONENTS sheets): the textile-draped
// frames, the button bars in three states, the ring around the portrait and
// his round icons. If those pictures are missing, the older look drawn in
// code (bronze frames, woven bands) is used instead.

// ---------- Suleiman's UI art ----------

const UI_FILES = ['top', 'bottom', 'hint', 'ring', 'medal_normal', 'medal_glow', 'medal_grey',
  'bar_normal', 'bar_glow', 'bar_grey', 'barS_normal', 'barS_glow', 'barS_grey',
  'clash_frame', // his clash banner (30 Oct, roadmap 8.6)
  'clash_skull', 'clash_bar', 'clash_fill_red', 'clash_fill_blue']; // his clash meter (roadmap 8.21, dev/tools/make_clash_meter.py)
// his 14 icons: a round medal (for round buttons) and just the symbol (for a button's socket)
export const UI_ICONS = ['walk', 'sword', 'spear', 'lightning', 'crossed', 'star', 'hourglass',
  'shield', 'run', 'gem', 'undo', 'redo', 'sound', 'mute'];

// glyphs made from his later art (30 Oct): the Charge symbol from his status
// sheet for Engage (roadmap 6.12) and his bag icon for Items (roadmap 6.10)
const EXTRA_GLYPHS = ['charge', 'bag'];

export function preloadUiArt(scene) {
  for (const f of UI_FILES) scene.load.image('ui:' + f, './art/ui/' + f + '.png');
  for (const f of UI_ICONS) {
    scene.load.image('ui:icon_' + f, './art/ui/icon_' + f + '.png');
    scene.load.image('ui:glyph_' + f, './art/ui/glyph_' + f + '.png');
  }
  for (const f of EXTRA_GLYPHS) scene.load.image('ui:glyph_' + f, './art/ui/glyph_' + f + '.png');
  // his action emblems (roadmap 6.53, cut by dev/tools/make_ui_emblems.py without their words)
  for (const f of UI_EMBLEMS) scene.load.image('ui:emblem_' + f, './art/ui/emblem_' + f + '.png');
}
export const UI_EMBLEMS = ['meditate', 'husk', 'hexes', 'blessings', 'skills', 'digup', 'summon', 'haunt', 'infuse', 'press', 'empower'];

// True once his frames are loaded (so the battle screen can use them).
export function hasUiArt(scene) {
  return scene.textures.exists('ui:top') && scene.textures.exists('ui:bar_normal');
}

// Our icon names that have one of his pictures (the rest are drawn in code).
const GLYPH_FOR = { back: 'undo' };
function glyphKey(scene, name) {
  const key = 'ui:glyph_' + (GLYPH_FOR[name] || name);
  return scene.textures.exists(key) ? key : null;
}

// The button bars: the wide bar for full buttons and the short one for half
// buttons, cut to the size asked for. The ends keep their shape (the socket
// for the icon on the left, the woven end on the right) and the leather in
// the middle stretches. Made once per size and state.
const BARS = {
  wide: { left: 160, right: 96, socketX: 85, socketR: 50 },
  short: { left: 135, right: 52, socketX: 77, socketR: 50 }, // half buttons keep only a sliver of the woven end, so the word fits
};
export function barPlate(scene, w, h, state, short) {
  const kind = short ? 'short' : 'wide';
  const key = 'ui:plate:' + kind + ':' + state + ':' + w + 'x' + h;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get('ui:' + (short ? 'barS_' : 'bar_') + state).getSourceImage();
  const b = BARS[kind];
  const s = h / src.height;
  const lw = Math.round(b.left * s);
  const rw = Math.round(b.right * s);
  const tex = scene.textures.createCanvas(key, w, h);
  const c = tex.getContext();
  c.drawImage(src, 0, 0, b.left, src.height, 0, 0, lw, h);
  c.drawImage(src, b.left, 0, src.width - b.left - b.right, src.height, lw, 0, w - lw - rw, h);
  c.drawImage(src, src.width - b.right, 0, b.right, src.height, w - rw, 0, rw, h);
  tex.refresh();
  return key;
}

// Where the icon socket sits on a bar of this height (from its left edge).
function socketOf(h, short) {
  const b = BARS[short ? 'short' : 'wide'];
  const s = h / 145;
  return { x: b.socketX * s, r: b.socketR * s };
}

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
    case 'charge': // (Engage, if his Charge glyph is missing)
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
    case 'bag':
      // a pouch tied at the neck (Items)
      g.fillCircle(x, y + 5 * s, 13 * s);
      g.fillTriangle(x - 7 * s, y - 6 * s, x + 7 * s, y - 6 * s, x, y + 2 * s);
      L(-8, -11, 8, -11, 3);
      g.fillTriangle(x - 9 * s, y - 15 * s, x - 3 * s, y - 11 * s, x - 9 * s, y - 9 * s);
      g.fillTriangle(x + 9 * s, y - 15 * s, x + 3 * s, y - 11 * s, x + 9 * s, y - 9 * s);
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
    // No picture: show the NAME, never a letter or an ID (M16 follow-up). Every unit has a portrait now.
    c.font = 'bold ' + Math.round(size * 0.22) + 'px Georgia, serif';
    c.fillText(unit.name || unit.jobName || '', r, r, size * 0.9);
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

// A round portrait inside Suleiman's ring with tassels (the unit card).
// Falls back to the drawn medallion without his art.
export function ringPortrait(scene, x, y, radius, unit, portraitKey, { active = false } = {}) {
  if (!scene.textures.exists('ui:ring')) return portraitMedallion(scene, x, y, radius, unit, portraitKey, { active });
  const back = scene.add.graphics();
  back.fillStyle(unit.side === 'hero' ? UI.hero : UI.enemy, 1);
  back.fillCircle(x, y, radius + 3);
  const img = scene.add.image(x, y, roundPortrait(scene, unit, portraitKey, 128)).setDisplaySize(radius * 2, radius * 2);
  // the ring picture is 169 wide; its hole is about 117 across, centred at (84, 83)
  const ringScale = (radius * 2 + 8) / 117;
  const ring = scene.add.image(x, y, 'ui:ring').setOrigin(84 / 169, 83 / 163).setScale(ringScale);
  return scene.add.container(0, 0, [back, img, ring]);
}

// A round portrait in his medal frame: glowing for the unit whose turn it is.
export function medalPortrait(scene, x, y, radius, unit, portraitKey, { active = false } = {}) {
  const key = active ? 'ui:medal_glow' : 'ui:medal_normal';
  if (!scene.textures.exists(key)) return portraitMedallion(scene, x, y, radius, unit, portraitKey, { active });
  const frame = scene.add.image(x, y, key);
  // the medal's inside is about 0.72 of its width across; the face sits in it
  frame.setScale((radius * 2) / (frame.width * 0.72));
  const img = scene.add.image(x, y - radius * 0.04, roundPortrait(scene, unit, portraitKey, 128)).setDisplaySize(radius * 2, radius * 2);
  return scene.add.container(0, 0, [frame, img]);
}

// One of his round icons as a picture, or null if it isn't loaded.
export function iconImage(scene, x, y, name, size) {
  const key = 'ui:icon_' + name;
  return scene.textures.exists(key) ? scene.add.image(x, y, key).setDisplaySize(size, size) : null;
}

// ---------- Command buttons ----------

// A command button: a leather bar with a bronze edge, an icon and a word.
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

    // With Suleiman's art: his bar picture (normal, glowing when in use, grey
    // when it can't be used) and his icon in the socket on the left.
    this.art = hasUiArt(scene);
    this.bg = scene.add.graphics();
    this.plate = scene.add.image(x, y, '__DEFAULT').setVisible(false);
    this.icon = scene.add.graphics();
    this.glyph = scene.add.image(x, y, '__DEFAULT').setVisible(false);
    const sock = socketOf(h, compact);
    this.socket = sock;
    const labelX = this.art ? x - w / 2 + sock.x + sock.r + (compact ? 6 : 10) : x - w / 2 + (compact ? 50 : 70);
    const size = this.art ? Math.round(h * (compact ? 0.38 : 0.44)) : compact ? 23 : 28;
    this.label = scene.add.text(labelX, y, '', textStyle(size, '#f1e6c8')).setOrigin(0, 0.5);
    this.labelSize = size;
    // room for the word: from its start to the woven end of the bar
    const rightEnd = Math.round(BARS[compact ? 'short' : 'wide'].right * (h / 145));
    this.labelRoom = x + w / 2 - rightEnd - 6 - labelX;
    this.hit = scene.add.rectangle(x, y, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    this.view = scene.add.container(0, 0, [this.bg, this.plate, this.icon, this.glyph, this.label, this.hit]);

    this.hit.on('pointerdown', (pointer) => {
      // held for half a second: a tooltip says what the button does (roadmap 13.49), also
      // when the button is greyed out. The tap itself still happens at once.
      this.stopHold();
      const at = pointer ? { x: pointer.x, y: pointer.y } : { x, y };
      // A mouse gets its tooltip by resting on the button, not by holding it down, so only a
      // finger starts the hold timer. (15 Nov bug: this used to 'return' here, which also
      // skipped the tap below, so no mouse click on a button did anything.)
      const touch = !(pointer && pointer.wasTouch === false);
      if (touch) this.holdTimer = setTimeout(() => {
        this.holdTimer = null;
        const tip = this.tip || buttonTip(this.label.text);
        if (tip && this.view.visible && scene.lay) showTip(scene, tip, at.x, at.y);
      }, TIP_HOLD_MS);
      else hoverTipEnd(scene); // a click puts the hover tooltip away
      if (!this.enabled || !this.onTap) return;
      play('click');
      this.flash();
      this.onTap();
    });
    this.hit.on('pointerup', () => this.stopHold());
    // a mouse resting on the button for half a second shows its tooltip; leaving puts it away (15 Nov)
    this.hit.on('pointerover', (pointer) => {
      this.draw(true);
      if (pointer && pointer.wasTouch === false) {
        const at = { x: pointer.x, y: pointer.y };
        hoverTipStart(scene, () => (this.view.visible ? this.tip || buttonTip(this.label.text) : null), at.x, at.y);
      }
    });
    this.hit.on('pointerout', () => { this.stopHold(); hoverTipEnd(scene); this.draw(false); });
  }

  stopHold() {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  // label: the word on the button, or null to hide it.
  // tip: { title, body } for the long-press tooltip (a skill's or an item's own text);
  //      without one, the main buttons find theirs by their word (tooltips.json).
  set(label, iconName, enabled, onTap, { selected = false, accent = UI.bronzeLight, tip = null } = {}) {
    this.tip = tip;
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
    if (this.art) {
      this.drawArt(hover);
      return;
    }
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
    const ix = x - w / 2 + (this.compact ? 26 : 36);
    const r = this.compact ? 17 : 22;
    g.fillStyle(UI.ink, 1);
    g.fillCircle(ix, y, r);
    g.lineStyle(2, on ? this.accent : UI.bronzeDark, 1);
    g.strokeCircle(ix, y, r);

    this.icon.clear();
    if (this.iconName) drawIcon(this.icon, this.iconName, ix, y, this.compact ? 23 : 30, on ? this.accent : 0x6a5434);
    this.label.setColor(on ? '#f1e6c8' : '#7a6a52');
    this.view.setAlpha(on ? 1 : 0.7);
  }

  // The button in Suleiman's style: his bar in the right state, his icon (or
  // a drawn one where he has none yet), and the word.
  drawArt(hover) {
    const { x, y, w, h } = this;
    const on = this.enabled;
    const state = this.selected ? 'glow' : on ? 'normal' : 'grey';
    this.bg.clear();
    this.plate.setTexture(barPlate(this.scene, w, h, state, this.compact)).setVisible(true);
    this.plate.setTint(hover && on ? 0xfff0d8 : 0xffffff);
    const sx = x - w / 2 + this.socket.x;
    const key = this.iconName && glyphKey(this.scene, this.iconName);
    this.icon.clear();
    if (key) {
      const d = this.socket.r * 1.62;
      this.glyph.setTexture(key).setPosition(sx, y).setDisplaySize(d, d).setVisible(true).setAlpha(on ? 1 : 0.45);
    } else {
      this.glyph.setVisible(false);
      if (this.iconName) drawIcon(this.icon, this.iconName, sx, y, this.socket.r * 1.3, on ? UI.bronzeLight : 0x6a5434);
    }
    this.label.setColor(on ? '#f1e6c8' : '#8a7a62');
    // a long word gets smaller so it never runs into the woven end
    let size = this.labelSize;
    this.label.setFontSize(size);
    while (this.label.width > this.labelRoom && size > 13) {
      size -= 1;
      this.label.setFontSize(size);
    }
    this.view.setAlpha(1);
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

// ---------- The new battle screen (roadmap Phase 8, his 30 Oct mockups) ----------

// A dark see-through panel with a thin bronze edge, like the cards in his
// mockups. Drawn into the graphics object g.
export function darkPanel(g, x, y, w, h, s = 1) {
  const r = Math.round(8 * s);
  g.fillStyle(0x0e0906, 0.86);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(1.5, UI.bronze, 0.95);
  g.strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(1, UI.bronzeLight, 0.18);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 3));
}

// Suleiman's emblems per menu word (roadmap 6.53). Summon and Dig Up have no action in the game yet.
const EMBLEM_FOR_WORD = { Skills: 'skills', Verses: 'skills', Blessings: 'blessings', Hexes: 'hexes', Meditate: 'meditate', Husk: 'husk', Haunt: 'haunt', Infuse: 'infuse', Press: 'press', Empower: 'empower' };
// Words shown differently from the label (the label stays: the game and the tests read it)
const SHOWN_AS = { 'End turn': 'Wait' };

// One row of the small command menu beside the unit whose turn it is
// (roadmap 8.3): his icon, the word, and on the right a cost (the part of the
// label after two spaces, like "Furious Charge  3 MP"). It works like a
// CommandButton (set, enabled, label, glyph), so the turn logic that fills
// the buttons stays the same; BattleScene.layoutMenu decides where rows go.
export class MenuRow {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.selected = false;
    this.onTap = null;
    this.iconName = null;
    this.accent = UI.bronzeLight;
    this.x = 0;
    this.y = 0;
    this.w = 236;
    this.h = 42;
    this.s = 1;
    this.bg = scene.add.graphics();
    this.icon = scene.add.graphics();
    this.glyph = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    // the whole label (what the rest of the game reads); the row shows it as a word and a cost
    this.label = scene.add.text(0, 0, '').setVisible(false);
    this.word = scene.add.text(0, 0, '', textStyle(19, '#f1e6c8')).setOrigin(0, 0.5);
    this.cost = scene.add.text(0, 0, '', textStyle(15, '#e8dcc0')).setOrigin(1, 0.5);
    this.hit = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.view = scene.add.container(0, 0, [this.bg, this.icon, this.glyph, this.label, this.word, this.cost, this.hit]);
    this.hit.on('pointerdown', (pointer) => {
      // held for half a second: a tooltip (roadmap 13.49), as on CommandButton above
      this.stopHold();
      const at = pointer && pointer.x !== undefined ? { x: pointer.x, y: pointer.y } : { x: this.x || 0, y: this.y || 0 };
      // A mouse gets its tooltip by resting on the button, not by holding it down, so only a
      // finger starts the hold timer. (15 Nov bug: this used to 'return' here, which also
      // skipped the tap below, so no mouse click on a button did anything.)
      const touch = !(pointer && pointer.wasTouch === false);
      if (touch) this.holdTimer = setTimeout(() => {
        this.holdTimer = null;
        const tip = this.tip || buttonTip(this.label.text);
        if (tip && this.view.visible && scene.lay) showTip(scene, tip, at.x, at.y);
      }, TIP_HOLD_MS);
      else hoverTipEnd(scene); // a click puts the hover tooltip away
      if (!this.enabled || !this.onTap) return;
      play('click');
      this.flash();
      this.onTap();
    });
    this.hit.on('pointerup', () => this.stopHold());
    // a mouse resting on the button for half a second shows its tooltip; leaving puts it away (15 Nov)
    this.hit.on('pointerover', (pointer) => {
      this.draw(true);
      if (pointer && pointer.wasTouch === false) {
        const at = { x: pointer.x, y: pointer.y };
        hoverTipStart(scene, () => (this.view.visible ? this.tip || buttonTip(this.label.text) : null), at.x, at.y);
      }
    });
    this.hit.on('pointerout', () => { this.stopHold(); hoverTipEnd(scene); this.draw(false); });
  }

  stopHold() {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  // label: the words on the row, or null to hide it.
  // tip: { title, body } for the long-press tooltip (see CommandButton.set)
  set(label, iconName, enabled, onTap, { selected = false, accent = UI.bronzeLight, tip = null, emblem = null, ring = null, shown = null } = {}) {
    this.shown = shown; // the word shown, when it differs from the label ("Attack" for Thrust)
    this.tip = tip;
    const visible = label !== null;
    // his emblem for this row (UI rework 16 Nov, roadmap 6.53): given, or found from the row's word
    this.emblem = emblem || EMBLEM_FOR_WORD[(label || '').split('  ')[0].replace(/\s*>$/, '')] || null;
    this.ringColor = ring;
    this.view.setVisible(visible);
    this.hit.setVisible(visible);
    this.enabled = visible && enabled;
    this.selected = selected;
    this.onTap = onTap;
    this.accent = accent;
    this.iconName = iconName;
    this.label.setText(label || '');
    const [word, ...rest] = (label || '').split('  ');
    this.word.setText(shown || SHOWN_AS[word] || word); // (the label stays as it is: the game and the tests read it)
    this.cost.setText(rest.join(' ').trim().replace(/^(\d+) MP$/, '$1')); // his list shows the MP number alone, right-aligned
    this.draw(false);
  }

  // Where the row sits inside the menu, and how big it is drawn.
  // minText: the smallest letters allowed, in game pixels (11 real pixels on this screen, M7)
  place(x, y, w, h, s, minText = 11) {
    Object.assign(this, { x, y, w, h, s, minText });
    this.hit.setPosition(x, y).setSize(w, h);
    if (this.hit.input) this.hit.input.hitArea.setTo(0, 0, w, h);
    this.draw(false);
  }

  draw(hover) {
    this.word.setVisible(true).setOrigin(0, 0.5);
    const { x, y, w, h, s } = this;
    // compact (15 Nov, Baiyee): the main menu's rows are small, a little icon and its word;
    // lists of skills and items keep the bigger rows so names and costs fit
    const on = this.enabled;
    const cy = y + h / 2;
    const g = this.bg;
    g.clear();
    if (this.selected || (hover && on)) {
      // his mock-up: the chosen row is a soft warm band, with a small gold pointer just outside on the left
      g.fillStyle(0xc9a35a, this.selected ? 0.2 : 0.11);
      g.fillRect(x, y + 1, w, h - 2);
      if (this.selected) {
        g.lineStyle(1, 0xc9a35a, 0.35).lineBetween(x, y + 1, x + w, y + 1).lineBetween(x, y + h - 1, x + w, y + h - 1);
        g.fillStyle(UI.gold, 1);
        g.fillTriangle(x - 7 * s, cy - 4 * s, x - 2 * s, cy, x - 7 * s, cy + 4 * s);
      }
    }
    // compact: the icon is as big as the letters allow (so it reads on a phone too)
    const d = this.iconSize || (this.compact ? Math.max(20 * s, (this.compactFont || 11) * 1.35) : 28 * s);
    const ix = this.compact ? x + 6 * s + d / 2 : x + 26 * s;
    const emblemKey = this.emblem && this.scene.textures.exists('ui:emblem_' + this.emblem) ? 'ui:emblem_' + this.emblem : null;
    const key = emblemKey || (this.iconName && glyphKey(this.scene, this.iconName));
    this.icon.clear();
    // a skill in a list: a soft ring in its colour behind the emblem (fire orange, lightning violet...)
    if (emblemKey && this.ringColor) this.icon.fillStyle(this.ringColor, on ? 0.55 : 0.2).fillCircle(ix, cy, d * 0.62);
    if (key) {
      const dd = emblemKey ? d * 1.1 : d;
      this.glyph.setTexture(key).setPosition(ix, cy).setDisplaySize(dd, dd).setVisible(true).setAlpha(on ? 1 : 0.4);
    } else {
      this.glyph.setVisible(false);
      if (this.iconName) drawIcon(this.icon, this.iconName, ix, cy, d * 0.8, on ? UI.bronzeLight : 0x6a5434);
    }
    const least = this.minText || 11;
    this.cost.setFontSize(this.costFont || Math.max(least, Math.round(15 * s))).setPosition(x + w - (this.iconSize ? 6 : 10) * s, cy).setAlpha(on ? 1 : 0.5);
    const wx = this.compact ? ix + d / 2 + 7 * s : x + 48 * s;
    this.word.setPosition(wx, cy).setColor(on ? '#f1e6c8' : '#7d6e58');
    // a long word shrinks so it never runs into the cost
    let size = this.compact ? this.compactFont || least : Math.max(least, Math.round(19 * s));
    this.word.setFontSize(size);
    const room = x + w - wx - 6 * s - (this.cost.text ? this.cost.width + 8 * s : 0);
    while (this.word.width > room && size > least) this.word.setFontSize(--size);
  }

  flash() {
    const glow = this.scene.add.graphics();
    glow.fillStyle(UI.gold, 0.3);
    glow.fillRoundedRect(this.x, this.y, this.w, this.h, 6 * this.s);
    glow.cameraFilter = this.view.cameraFilter; // seen by the same camera as the row
    this.view.add(glow);
    this.scene.tweens.add({ targets: glow, alpha: 0, duration: 260, onComplete: () => glow.destroy() });
  }
}
