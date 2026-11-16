import Phaser from 'phaser';
import { textStyle, UI } from './hud.js';
import spells from './data/spells.json';
import skillPanel from './data/skillPanel.json';

// The UI rework of 16 Nov (Suleiman's phone mock-up, INBOX/2026-11-16 "new ui"):
// Final Fantasy Tactics style panels. Bottom left the unit card (square portrait,
// name, level, class, HP, MP and CT bars); bottom right the skill panel (emblem,
// name, MP, the area as a small grid, the effect and one line).
// Everything here is drawn in code, so it is sharp at any size (no stretched pictures).

// The frame: a dark see-through panel, a thin gold line and a faint inner line,
// small gold diamonds on the corners. Drawn into the graphics object g.
export function framePanel(g, x, y, w, h, s = 1, { alpha = 0.88, line = UI.bronze } = {}) {
  const r = Math.max(2, Math.round(3 * s));
  g.fillStyle(0x0d0907, alpha).fillRoundedRect(x, y, w, h, r);
  // a faint lighter band along the top, like light on the edge of the panel
  g.fillStyle(0xffe6b0, 0.05).fillRect(x + 2, y + 2, w - 4, Math.round(h * 0.35));
  g.lineStyle(Math.max(1, 1.5 * s), line, 0.95).strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(1, UI.bronzeLight, 0.22).strokeRoundedRect(x + 4 * s, y + 4 * s, w - 8 * s, h - 8 * s, r);
  const d = Math.max(3, 4.5 * s);
  g.fillStyle(UI.bronzeLight, 1);
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    g.fillTriangle(cx - d, cy, cx, cy - d, cx + d, cy);
    g.fillTriangle(cx - d, cy, cx, cy + d, cx + d, cy);
  }
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

// How tall the closed unit card is, from the letter sizes (it never changes, so the menu can stand on it).
export function cardHeight(L) {
  return L.pad * 2 + L.name * 1.25 + L.small * 1.35 + 3 * L.row;
}

// The letter sizes and spacing for the card and panel. T(n) = n game pixels, never under minText.
export function cardSizes(s, minText) {
  const S = (n) => Math.round(n * s);
  const T = (n) => Math.max(S(n), minText);
  const small = T(13);
  return { S, T, small, name: Math.max(T(22), Math.round(small * 1.3)), pad: S(10), row: small + S(9) };
}

// The unit card (closed): returns the things to put in the card's container and its height.
// active: the unit whose turn it is (its CT shows full, as in FFT).
export function drawUnitCard(scene, unit, w, s, minText, { active = false, viewing = false, faceKey = null, jobLine = '' } = {}) {
  const L = cardSizes(s, minText);
  const { S, small, pad, row } = L;
  const h = Math.round(cardHeight(L));
  const items = [];
  const g = scene.add.graphics();
  framePanel(g, 0, 0, w, h, s);
  items.push(g);
  // the portrait: a square in a gold frame, as tall as the card allows but never more than a third of it wide
  const ps = Math.round(Math.min(h - 2 * pad, w * 0.3));
  const px = pad, py = Math.round((h - ps) / 2);
  items.push(scene.add.image(px, py, squarePortrait(scene, unit, faceKey, 160)).setOrigin(0, 0).setDisplaySize(ps, ps));
  g.lineStyle(Math.max(1.5, 2 * s), active ? UI.gold : UI.bronze, 1).strokeRect(px, py, ps, ps);
  g.lineStyle(Math.max(1, 1.5 * s), unit.side === 'hero' ? UI.hero : UI.enemy, 0.9).strokeRect(px + 3 * s, py + 3 * s, ps - 6 * s, ps - 6 * s);

  const tx = px + ps + pad + S(4);
  const right = w - pad;
  let y = pad;
  const nameT = scene.add.text(tx, y, unit.name, textStyle(L.name, '#ffe08a'));
  items.push(nameT);
  items.push(scene.add.text(right, y + L.name - small, 'Lv. ' + (unit.level || 1), textStyle(small, '#d8c8a4')).setOrigin(1, 0));
  y += Math.round(L.name * 1.25);
  const job = scene.add.text(tx, y, jobLine, textStyle(small, '#e4c27c'));
  if (job.width > right - tx) job.setScale((right - tx) / job.width); // a long class line shrinks to fit, never wraps
  items.push(job);
  y += Math.round(small * 1.35);
  if (viewing) items.push(scene.add.text(right, pad + L.name * 1.25, 'viewing', textStyle(small, '#a89a78', { fontStyle: 'italic' })).setOrigin(1, 0));

  // three bars: a small word, the bar, the numbers at its end
  const bars = scene.add.graphics();
  items.push(bars);
  const numW = Math.round(small * 3.7);
  const barX = tx + Math.round(small * 1.7);
  const barW = Math.max(S(30), right - numW - S(6) - barX);
  const barH = Math.max(4, Math.round(row * 0.26));
  const bar = (word, value, max, color, numbers) => {
    const cy = y + row / 2;
    items.push(scene.add.text(tx, cy, word, textStyle(small, '#d8c8a4')).setOrigin(0, 0.5));
    bars.fillStyle(0x000000, 0.75).fillRect(barX, cy - barH / 2, barW, barH);
    if (max > 0 && value > 0) {
      const f = Math.min(1, value / max);
      bars.fillStyle(color, 1).fillRect(barX, cy - barH / 2, barW * f, barH);
      bars.fillStyle(0xffffff, 0.25).fillRect(barX, cy - barH / 2, barW * f, Math.max(1, barH / 3)); // a shine on top
    }
    bars.lineStyle(1, UI.bronzeDark, 1).strokeRect(barX, cy - barH / 2, barW, barH);
    items.push(scene.add.text(right, cy, numbers, textStyle(small, '#f1e6c8', { fontStyle: 'bold' })).setOrigin(1, 0.5));
    y += row;
  };
  const hpFrac = Math.max(0, unit.hp / unit.maxHp);
  bar('HP', unit.hp, unit.maxHp, hpFrac <= 0.35 ? 0xe05a47 : 0x5fcf6f, Math.max(0, unit.hp) + '/' + unit.maxHp);
  const mp = unit.mpShown;
  if (mp) bar('MP', mp.mp, mp.max, mp.color || 0x4f8fe8, mp.mp + '/' + mp.max);
  else bar('MP', 0, 0, 0x4f8fe8, '-');
  const ct = active ? 100 : Math.max(0, Math.min(100, Math.round(unit.ct || 0)));
  bar('CT', ct, 100, 0xe8b04a, String(ct));
  return { items, h, nameText: nameT };
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

// The skill panel: emblem, name, MP, the area as a small grid, the effect and one line.
// w is its width; returns the things to put in its container and its height.
export function drawSkillPanel(scene, id, w, s, minText) {
  const L = cardSizes(s, minText);
  const { S, small, pad } = L;
  const k = skillWords(id);
  const color = Phaser.Display.Color.HexStringToColor(k.color).color;
  const frame = scene.add.graphics(); // the frame, drawn last but kept under everything
  const g = scene.add.graphics();     // the area grid and the dividing line
  const items = [frame, g];
  // the emblem, with a glow in the skill's colour behind it
  const e = Math.round(Math.max(S(44), small * 2.3));
  const ex = pad + e / 2, ey = pad + e / 2;
  const glow = scene.add.graphics();
  glow.fillStyle(color, 0.35).fillCircle(ex, ey, e * 0.56);
  items.push(glow);
  const key = 'ui:emblem_' + emblemFor(id);
  if (scene.textures.exists(key)) items.push(scene.add.image(ex, ey, key).setDisplaySize(e, e));
  // the area grid, top right: one small square per tile
  const rows = k.grid, n = Math.max(rows.length, ...rows.map((r) => r.length));
  const cell = Math.max(4, Math.floor(Math.min(e, S(46)) / Math.max(3, n)));
  const gw = cell * rows[0].length, gh = cell * rows.length;
  const gx = w - pad - gw, gy = pad + Math.max(0, (e - gh) / 2);
  rows.forEach((r, j) => [...r].forEach((c, i) => {
    const x = gx + i * cell, yy = gy + j * cell;
    if (c === 'x') g.fillStyle(color, 0.95).fillRect(x + 1, yy + 1, cell - 2, cell - 2);
    else if (c === 'c') g.fillStyle(UI.gold, 0.9).fillRect(x + cell * 0.25, yy + cell * 0.25, cell * 0.5, cell * 0.5);
    else g.fillStyle(0xffffff, 0.08).fillRect(x + 1, yy + 1, cell - 2, cell - 2);
  }));
  // the name and the MP under it
  const tx = pad + e + S(10);
  const nameRoom = gx - S(6) - tx;
  const nm = scene.add.text(tx, ey - S(2), k.name, textStyle(Math.max(L.T(17), small), '#f1e6c8')).setOrigin(0, 1);
  if (nm.width > nameRoom) nm.setScale(nameRoom / nm.width);
  items.push(nm);
  items.push(scene.add.text(tx, ey + S(2), k.mp ? 'MP ' + k.mp : 'No MP', textStyle(small, k.mp ? '#8fc0ff' : '#a89a78')).setOrigin(0, 0));
  let y = pad + e + S(8);
  g.lineStyle(1, UI.bronzeDark, 1).lineBetween(pad, y, w - pad, y);
  y += S(6);
  // the area and the effect on one line (the effect in the skill's colour), the description under it
  const area = scene.add.text(pad, y, k.area, textStyle(small, '#d8c8a4'));
  items.push(area);
  if (k.effect) {
    const sep = scene.add.text(pad + area.width + S(8), y, '|', textStyle(small, '#6b5a3c'));
    const eff = scene.add.text(sep.x + sep.width + S(8), y, k.effect, textStyle(small, k.color, { fontStyle: 'bold' }));
    const room = w - pad - eff.x;
    if (eff.width > room) {
      // no room beside the area: the effect goes on its own line
      sep.destroy();
      y += Math.round(small * 1.3);
      eff.setPosition(pad, y);
    } else items.push(sep);
    items.push(eff);
  }
  y += Math.round(small * 1.35);
  if (k.line) {
    const line = scene.add.text(pad, y, k.line, textStyle(small, '#bfb08c', { wordWrap: { width: w - 2 * pad }, fontStyle: 'italic' }));
    items.push(line);
    y += line.height;
  }
  const h = Math.round(y + pad);
  framePanel(frame, 0, 0, w, h, s);
  return { items, h };
}
