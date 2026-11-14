// Long-press tooltips (roadmap 13.49, Suleiman 13 Nov): hold a finger (or the mouse button)
// on a button or a fighter for half a second and a small panel explains it. The words are
// in src/data/tooltips.json, spells.json ("text") and items.json ("text").
import Phaser from 'phaser';
import tips from './data/tooltips.json';
import spells from './data/spells.json';
import { statusTags, buffOf, hexOf } from './status.js';

export const TIP_HOLD_MS = tips.holdMs;

// The tooltip for a button, from its label ("Fury  3 MP" finds "Fury" in tooltips.json).
export function buttonTip(label) {
  if (!label) return null;
  const key = Object.keys(tips.buttons).find((k) => label === k || label.startsWith(k + ' ') || label.startsWith(k + ':'));
  return key ? { title: key, body: tips.buttons[key] } : null;
}

// The tooltip for a skill: its full name and its text.
export function spellTip(id) {
  const sp = spells[id];
  if (!sp || !sp.text) return null;
  const cost = sp.mp ? '  ·  ' + sp.mp + ' MP' : '';
  return { title: sp.name + cost, body: sp.text };
}

// The tooltip for a fighter: who it is and every status on it, each with what it does.
export function unitTip(unit) {
  const lines = [];
  const buff = buffOf(unit), hex = hexOf(unit);
  for (const t of statusTags(unit)) {
    const word = t.text.replace(/\s+\d+$/, '');
    let body = tips.statuses[word];
    if (!body && buff && buff.short === t.text) body = spells[buff.id] && spells[buff.id].text;
    if (!body && hex && hex.short === t.text) body = spells[hex.id] && spells[hex.id].text;
    lines.push(t.text + (body ? ': ' + body : ''));
  }
  const head = unit.name + '  ·  ' + unit.jobName + '  ·  ' + Math.max(0, unit.hp) + '/' + unit.maxHp + ' HP' + (unit.maxMp > 0 ? '  ·  ' + unit.mp + '/' + unit.maxMp + ' MP' : '');
  return { title: head, body: lines.length ? lines.join('\n') : 'No statuses on this fighter.' };
}

// Shows a tooltip near a point on the screen (interface camera), inside the edges.
// Returns the panel; scene.tip holds it. A new one replaces the old.
export function showTip(scene, tip, sx, sy) {
  hideTip(scene);
  if (!tip || !scene.lay) return null;
  const { W, H, s, m } = scene.lay;
  const width = Math.min(W - 2 * m, Math.round(430 * s));
  const pad = Math.round(12 * s);
  const title = scene.add.text(pad, pad, tip.title, { fontFamily: 'Georgia, serif', fontSize: Math.round(19 * s) + 'px', fontStyle: 'bold', color: '#ffe08a', wordWrap: { width: width - 2 * pad } });
  const body = scene.add.text(pad, pad + title.height + Math.round(6 * s), tip.body, { fontFamily: 'Georgia, serif', fontSize: Math.round(17 * s) + 'px', color: '#f1e6c8', wordWrap: { width: width - 2 * pad }, lineSpacing: 3 });
  const h = body.y + body.height + pad;
  const back = scene.add.graphics();
  back.fillStyle(0x1a1410, 0.95); back.fillRoundedRect(0, 0, width, h, 8 * s);
  back.lineStyle(2, 0xb88a4a, 1); back.strokeRoundedRect(0, 0, width, h, 8 * s);
  const x = Phaser.Math.Clamp(sx - width / 2, m, W - m - width);
  // above the finger if there is room, else below it
  const y = sy - h - 30 * s >= m ? sy - h - 30 * s : Math.min(H - m - h, sy + 40 * s);
  const panel = scene.add.container(x, Math.max(m, y), [back, title, body]).setDepth(400);
  panel.tipW = width; panel.tipH = h; panel.tip = tip;
  scene.ui(panel);
  scene.tip = panel;
  return panel;
}

export function hideTip(scene) {
  if (scene.tip) { scene.tip.destroy(); scene.tip = null; }
}
