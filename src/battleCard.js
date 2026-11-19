import Phaser from 'phaser';
import { textStyle, UI } from './hud.js';
import spells from './data/spells.json';
import skillPanel from './data/skillPanel.json';

// The UI rework of 16 Nov (Suleiman's phone mock-up, INBOX/2026-11-16 "new ui"):
// Final Fantasy Tactics style panels. Bottom left the unit card (square portrait,
// name, level, class, HP, MP and CT bars); bottom right the skill panel (emblem,
// name, MP, the area as a small grid, the effect and one line).
// Everything here is drawn in code, so it is sharp at any size (no stretched pictures).

// The frame (UI rework, matched to his mock-up 16 Nov): a dark see-through panel (about 80 percent),
// a thin gold line (1 to 2 real pixels), a faint inner line and a soft shadow. No thick frames.
// px: game pixels per design pixel (BattleScene lay.px), so the line is thin on every screen.
export function framePanel(g, x, y, w, h, px = 1, { alpha = 0.8, line = 0xc9a35a } = {}) {
  const r = Math.max(2, Math.round(3 * px));
  // the soft shadow: two faint dark layers a little below and around
  g.fillStyle(0x000000, 0.14).fillRoundedRect(x - 2 * px, y, w + 4 * px, h + 5 * px, r + 3 * px);
  g.fillStyle(0x000000, 0.2).fillRoundedRect(x - 0.5 * px, y + 1.5 * px, w + px, h + 2.5 * px, r + px);
  g.fillStyle(0x0b0806, alpha).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(Math.max(1, 1.2 * px), line, 0.85).strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(Math.max(1, 0.8 * px), 0xe4c27c, 0.1).strokeRoundedRect(x + 2.5 * px, y + 2.5 * px, w - 5 * px, h - 5 * px, Math.max(1, r - px));
}

// A tiny gold diamond (his marks before the class line and the title), centre (x, y), half size d.
export function goldDiamond(g, x, y, d, color = 0xe4c27c) {
  g.lineStyle(1, color, 0.95).strokePoints([{ x, y: y - d }, { x: x + d, y }, { x, y: y + d }, { x: x - d, y }], true);
  g.fillStyle(color, 0.9).fillPoints([{ x, y: y - d * 0.45 }, { x: x + d * 0.45, y }, { x, y: y + d * 0.45 }, { x: x - d * 0.45, y }], true);
}

// A square portrait (the face filling the square, aimed a little above the middle),
// as a texture of its own, made once per face and size.
export function squarePortrait(scene, unit, faceKey, size) {
  const key = 'square:' + unit.id + ':' + size + ':' + (faceKey || 'none');
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size, size);
  const c = tex.getContext();
  const grad = c.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, unit.side === 'hero' ? '#2e5f5b' : '#6e2e22');
  grad.addColorStop(1, '#120c08');
  c.fillStyle = grad;
  c.fillRect(0, 0, size, size);
  if (faceKey && scene.textures.exists(faceKey)) {
    const img = scene.textures.get(faceKey).getSourceImage();
    const k = Math.max(size / img.width, size / img.height) * 1.05;
    const w = img.width * k, h = img.height * k;
    c.drawImage(img, (size - w) / 2, (size - h) * 0.3, w, h);
  } else {
    c.fillStyle = '#f1e6c8';
    c.font = 'bold ' + Math.round(size * 0.2) + 'px Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(unit.name || '', size / 2, size / 2, size * 0.9);
  }
  tex.refresh();
  return key;
}

// The card's size in design pixels (real screen pixels on a phone; BattleScene multiplies by lay.px).
// compact on a phone (the board needs the room: 85 percent of the height), roomier on a wide screen,
// where it follows his mock-up more closely (Lv. on its own line, more space between the bars).
export const CARD = { w: 188, h: 64 };
export const CARD_ROOMY = { w: 220, h: 104 };

// The unit card, bottom left, as in his mock-up but compact: a square portrait, the name and Lv.,
// thin HP, MP and CT bars with their numbers, and the class line along the bottom.
// P: game pixels per design pixel; F: the letter sizes ({ small, mid, name }) in game pixels.
// Returns the things to put in the card's container and its size.
export function drawUnitCard(scene, unit, P, F, { active = false, viewing = false, faceKey = null, jobLine = '', roomy = false } = {}) {
  const D = (n) => Math.round(n * P);
  const size = roomy ? CARD_ROOMY : CARD;
  const w = D(size.w), h = D(size.h), pad = D(roomy ? 7 : 4);
  const items = [];
  const g = scene.add.graphics();
  framePanel(g, 0, 0, w, h, P);
  items.push(g);
  // the portrait, with a thin gold edge (brighter for the one acting)
  const ps = D(roomy ? 70 : 46);
  items.push(scene.add.image(pad, pad, squarePortrait(scene, unit, faceKey, 128)).setOrigin(0, 0).setDisplaySize(ps, ps));
  g.lineStyle(Math.max(1, P), active ? 0xffe08a : 0xa87b3a, 0.95).strokeRect(pad, pad, ps, ps);
  // the name and Lv. on the first line
  const tx = pad + ps + D(7), right = w - pad - D(2);
  items.push(scene.add.text(tx, pad - D(1), unit.name, textStyle(F.name, '#f3e7c6')));
  const lv = scene.add.text(right, pad + D(1), 'Lv. ' + (unit.level || 1), textStyle(F.small, '#bfae86')).setOrigin(1, 0);
  if (roomy) lv.setOrigin(0, 0).setPosition(tx, pad + D(17)); // his mock-up: Lv. under the name
  items.push(lv);
  // three thin bars: the word, the bar, the numbers at the end
  const bars = scene.add.graphics();
  items.push(bars);
  const numW = D(46);
  const barX = tx + D(22), barW = Math.max(D(20), right - numW - D(4) - barX), barH = Math.max(2, D(3));
  let cy = pad + D(roomy ? 40 : 22);
  const bar = (word, value, max, color, numbers) => {
    items.push(scene.add.text(tx, cy, word, textStyle(F.small, '#cdbb92')).setOrigin(0, 0.5));
    bars.fillStyle(0x000000, 0.6).fillRect(barX, cy - barH / 2, barW, barH);
    if (max > 0 && value > 0) bars.fillStyle(color, 1).fillRect(barX, cy - barH / 2, barW * Math.min(1, value / max), barH);
    items.push(scene.add.text(right, cy, numbers, textStyle(F.small, '#efe3c2')).setOrigin(1, 0.5));
    cy += D(roomy ? 14 : 10.5);
  };
  const hpFrac = Math.max(0, unit.hp / unit.maxHp);
  bar('HP', unit.hp, unit.maxHp, hpFrac <= 0.35 ? 0xe05a47 : 0x5cc46a, Math.max(0, unit.hp) + ' / ' + unit.maxHp);
  const mp = unit.mpShown;
  if (mp) bar('MP', mp.mp, mp.max, mp.color || 0x4f8fe8, mp.mp + ' / ' + mp.max);
  else bar('MP', 0, 0, 0x4f8fe8, '-');
  const ct = active ? 100 : Math.max(0, Math.min(100, Math.round(unit.ct || 0)));
  bar('CT', ct, 100, 0xe0a944, String(ct));
  // the class line along the bottom, under a faint rule, with his small diamond
  const ly = h - pad - D(roomy ? 5 : 4);
  bars.lineStyle(1, 0xc9a35a, 0.22).lineBetween(pad, ly - D(roomy ? 8 : 6.5), w - pad, ly - D(roomy ? 8 : 6.5));
  goldDiamond(bars, pad + D(4), ly, D(3.5));
  const job = scene.add.text(pad + D(11), ly, jobLine + (viewing ? '   (viewing)' : ''), textStyle(F.small, '#c9b07a')).setOrigin(0, 0.5);
  if (job.width > w - pad - job.x) job.setScale((w - pad - job.x) / job.width);
  items.push(job);
  return { items, w, h };
}

// The words of a skill for the panel (from skillPanel.json), with safe defaults.
export function skillWords(id) {
  const sp = spells[id] || {};
  const p = (skillPanel.skills || {})[id] || {};
  return { name: sp.name || id, mp: sp.mp || 0, color: sp.color || '#e4c27c', area: p.area || '1 target', grid: p.grid || ['x'], effect: p.effect || '', line: p.line || '' };
}

// Which of Suleiman's emblems stands for a skill (roadmap 6.53). Every other skill shows "Skills".
export function emblemFor(id) {
  const sp = spells[id] || {};
  const own = { husk: 'husk', meditate: 'meditate', haunt: 'haunt', infuse: 'infuse' };
  if (own[id]) return own[id];
  if (sp.group === 'Blessings' || sp.kind === 'buff') return 'blessings';
  if (sp.group === 'Hexes' || sp.kind === 'hex') return 'hexes';
  return 'skills';
}

// The skill panel, bottom right, as his: the emblem, the name and MP, the area as a small grid at
// the right, and under a faint rule "1 foe  |  Inflicts Burn". P and F as for the card.
export const SKILL_PANEL = { w: 178, h: 56 };
export function drawSkillPanel(scene, id, P, F) {
  const D = (n) => Math.round(n * P);
  const k = skillWords(id);
  const color = Phaser.Display.Color.HexStringToColor(k.color).color;
  const w = D(SKILL_PANEL.w), h = D(SKILL_PANEL.h), pad = D(6);
  const frame = scene.add.graphics();
  framePanel(frame, 0, 0, w, h, P);
  const g = scene.add.graphics();
  const items = [frame, g];
  // the emblem with a soft glow in the skill's colour
  const e = D(26), ex = pad + e / 2, ey = pad + e / 2;
  g.fillStyle(color, 0.3).fillCircle(ex, ey, e * 0.58);
  const key = 'ui:emblem_' + emblemFor(id);
  if (scene.textures.exists(key)) items.push(scene.add.image(ex, ey, key).setDisplaySize(e, e));
  // the area grid at the right: small squares, lit in the skill's colour
  const rows = k.grid, n = Math.max(rows.length, ...rows.map((r) => r.length));
  const cell = Math.max(3, Math.floor(D(24) / Math.max(3, n)));
  const gw = cell * rows[0].length, gh = cell * rows.length;
  const gx = w - pad - gw, gy = ey - gh / 2;
  rows.forEach((r, j) => [...r].forEach((c, i) => {
    const x = gx + i * cell, y = gy + j * cell;
    if (c === 'x') g.fillStyle(color, 0.95).fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    else if (c === 'c') g.fillStyle(0xffe08a, 0.9).fillRect(x + cell * 0.25, y + cell * 0.25, cell * 0.5, cell * 0.5);
    else g.fillStyle(0xffffff, 0.07).fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
  }));
  // the name, and the MP under it
  const tx = pad + e + D(8);
  const nm = scene.add.text(tx, ey - D(1), k.name, textStyle(F.mid, '#f3e7c6')).setOrigin(0, 1);
  if (nm.width > gx - D(6) - tx) nm.setScale((gx - D(6) - tx) / nm.width);
  items.push(nm);
  items.push(scene.add.text(tx, ey + D(1), k.mp ? 'MP ' + k.mp : 'MP 0', textStyle(F.small, '#cdbb92')).setOrigin(0, 0));
  // under a faint rule: the area | the effect (the effect in the skill's colour)
  const ry = pad + e + D(4);
  g.lineStyle(1, 0xc9a35a, 0.22).lineBetween(pad, ry, w - pad, ry);
  const ly = (ry + h - D(2)) / 2 + D(1);
  const area = scene.add.text(pad + D(2), ly, k.area, textStyle(F.small, '#d8c8a4')).setOrigin(0, 0.5);
  items.push(area);
  if (k.effect) {
    const sep = scene.add.text(area.x + area.width + D(7), ly, '|', textStyle(F.small, '#7a6848')).setOrigin(0, 0.5);
    const eff = scene.add.text(sep.x + sep.width + D(7), ly, k.effect, textStyle(F.small, k.color)).setOrigin(0, 0.5);
    if (eff.x + eff.width > w - pad) eff.setScale((w - pad - eff.x) / eff.width);
    items.push(sep, eff);
  }
  return { items, w, h };
}

// A portrait cut as a diamond (the unit list down the left side, UI rework step 3).
export function diamondPortrait(scene, unit, faceKey, size) {
  const key = 'diamond:' + unit.id + ':' + size + ':' + (faceKey || 'none');
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size, size);
  const c = tex.getContext();
  const h = size / 2;
  c.save();
  c.beginPath();
  c.moveTo(h, 0); c.lineTo(size, h); c.lineTo(h, size); c.lineTo(0, h);
  c.closePath();
  c.clip();
  c.fillStyle = unit.side === 'hero' ? '#2e5f5b' : '#6e2e22';
  c.fillRect(0, 0, size, size);
  if (faceKey && scene.textures.exists(faceKey)) {
    const img = scene.textures.get(faceKey).getSourceImage();
    const k = Math.max(size / img.width, size / img.height) * 1.15;
    const w = img.width * k, hh = img.height * k;
    c.drawImage(img, (size - w) / 2, (size - hh) * 0.3, w, hh);
  }
  c.restore();
  tex.refresh();
  return key;
}

// A small block of ground for the turn and terrain panel: the top in the ground's colour,
// the two sides darker. g: a graphics object; (x, y) the middle of the top face; w its width.
export function tileBlock(g, x, y, w, top, side) {
  const h = w / 2, d = w * 0.28;
  g.fillStyle(side, 1);
  g.fillPoints([{ x: x - w / 2, y }, { x, y: y + h / 2 }, { x, y: y + h / 2 + d }, { x: x - w / 2, y: y + d }], true);
  g.fillStyle(Phaser.Display.Color.ValueToColor(side).darken(25).color, 1);
  g.fillPoints([{ x: x + w / 2, y }, { x, y: y + h / 2 }, { x, y: y + h / 2 + d }, { x: x + w / 2, y: y + d }], true);
  g.fillStyle(top, 1);
  g.fillPoints([{ x, y: y - h / 2 }, { x: x + w / 2, y }, { x, y: y + h / 2 }, { x: x - w / 2, y }], true);
  g.lineStyle(1, 0xffe6b0, 0.35);
  g.strokePoints([{ x, y: y - h / 2 }, { x: x + w / 2, y }, { x, y: y + h / 2 }, { x: x - w / 2, y }], true);
}
