import { tileToScreen, depthFor } from './grid.js';
import { TILE_WIDTH, TILE_HEIGHT } from './config.js';
import spells from './data/spells.json';
import terrain from './data/terrain.json';
import { distance } from './combat.js';
import { activeMove } from './status.js';

// Skills show what they will do (roadmap 18.4, Battle 1.0 milestone M4, checklist G4).
//
// After the first tap on a target, and before the second tap confirms, the
// BOARD shows what is about to happen, not only the small text box:
//   - where the unit will end up : a pale ghost of it on that tile, and a
//                                   streak from where it stands now
//   - who is hit                  : a red mark on each of them
//   - where a pushed unit lands   : an arrow to its landing tile and a faint
//                                   ghost there, with "Fall" or "Slam" if so
//   - the name of the form        : for Sonic Javelin, which picks one of
//                                   three forms itself (Throw, Whirl, Sweep)
//
// planSkill works the plan out with the same functions the skill itself
// uses (javelinForm, chargeTile, sweepSpot, pushPlan), so the preview and the
// result cannot disagree. Nothing in the battle is changed by a preview.

// What the skill would do. Returns null when there is nothing to show.
//   { label, end: tile or null, zip: true if it gets there in a blink,
//     hits: [unit], pushes: [{ unit, to: tile, levels, slam, held }],
//     marks: [{ unit, text }], line: [tiles] or null }
export function planSkill(scene, unit, target, id) {
  const sp = spells[id];
  if (!sp || !target) return null;
  const push = (t, from, steps, moved) => {
    const p = scene.pushPlan(t, from, steps, moved);
    const to = p.path.length ? p.path[p.path.length - 1] : { col: t.col, row: t.row };
    return { unit: t, to, levels: p.levels, slam: p.slam, held: p.held };
  };
  if (sp.kind === 'javelin') {
    const form = scene.javelinForm(unit, target, sp);
    if (form.form === 'sweep') return { label: 'Sweep', end: form.spot, zip: true, hits: [target], pushes: [], marks: [] };
    if (form.form === 'whirl') {
      const moved = { unit, to: form.spot };
      return { label: 'Whirl', end: form.spot, zip: false, hits: [target], pushes: [push(target, form.spot, sp.push || 1, moved)], marks: [] };
    }
    const line = scene.javelinLine(unit, target, sp);
    return { label: 'Throw', end: null, hits: line.hits, pushes: line.hits.map((u) => push(u, unit, sp.push || 1)), marks: [], line: line.tiles };
  }
  if (sp.kind === 'charge') {
    const spot = scene.chargeTile(unit, target, sp);
    if (!spot) return null;
    const moved = { unit, to: spot };
    const effect = sp.effect || 'lock';
    return {
      label: sp.button, end: spot, zip: effect === 'stun', hits: [target],
      pushes: effect === 'knockback' ? [push(target, spot, sp.push || 2, moved)] : [],
      marks: effect === 'stun' ? [{ unit: target, text: 'Stunned' }] : effect === 'knockback' || effect === 'strike' ? [] : [{ unit: target, text: 'Clash' }],
    };
  }
  if (sp.kind === 'dive') {
    const spot = scene.sweepSpot(unit, target);
    if (!spot) return null;
    const shaken = scene.units.filter((u) => u.alive && u.side !== unit.side && u !== target && distance(u, spot) === 1);
    return { label: sp.button, end: spot, zip: false, leap: true, hits: [target], pushes: [], marks: [target, ...shaken].map((u) => ({ unit: u, text: 'Off-Balance' })) };
  }
  if (sp.kind === 'throw') return { label: sp.button, end: null, hits: [target], pushes: [push(target, unit, sp.push || 1)], marks: [] };
  if (sp.kind === 'bolt' && sp.push) return { label: sp.button, end: null, hits: [target], pushes: [push(target, unit, sp.push)], marks: [] };
  if (sp.kind === 'toss') return { label: sp.button, end: null, hits: [target], pushes: [], marks: [{ unit: target, text: 'Stunned' }] };
  if (sp.kind === 'double' || sp.kind === 'poison') return { label: sp.button, end: null, hits: [target], pushes: [], marks: [] };
  return null;
}

// The plan for a plain attack that a Verse has changed (Layra's Thunderclap pushes).
export function planAttack(scene, unit, target) {
  const id = activeMove(unit, 'attack');
  if (id === 'attack' || !target || target.isDecoy) return null;
  return planSkill(scene, unit, target, id);
}

// The plan for Husk: she slips to the tile, a decoy stays where she stood.
export function planHusk(scene, unit, tile) {
  if (!tile) return null;
  return { label: 'Husk', end: tile, zip: true, hits: [], pushes: [], marks: [], decoyAt: { col: unit.col, row: unit.row } };
}

const GHOST = 0.5;
const DEPTH = 96; // above the board and the figures, below the menus

// A pale copy of a unit's picture standing on a tile.
function ghostOf(scene, unit, tile, alpha, tint) {
  const p = tileToScreen(tile.col, tile.row);
  const s = unit.sprite;
  if (!s || !s.active) {
    const g = scene.add.graphics({ x: p.x, y: p.y }).setDepth(depthFor(tile.col, tile.row) + 1.4);
    g.lineStyle(2, tint, alpha).strokeEllipse(0, 0, TILE_WIDTH * 0.4, TILE_HEIGHT * 0.4);
    return g;
  }
  const img = scene.add.image(p.x + s.x, p.y + s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY).setScale(unit.artScale || s.scaleX)
    .setFlipX(s.flipX).setAlpha(alpha).setTint(tint).setDepth(depthFor(tile.col, tile.row) + 1.4);
  scene.tweens.add({ targets: img, alpha: alpha * 0.55, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return img;
}

// Draws a plan on the board. Returns the list of things drawn (the scene keeps
// it and destroys them all when the choice changes).
export function drawPlan(scene, unit, plan) {
  const made = [];
  if (!plan) return made;
  const g = scene.add.graphics().setDepth(DEPTH);
  made.push(g);
  const here = tileToScreen(unit.col, unit.row);
  const text = (x, y, words, color) => {
    const t = scene.add.text(x, y, words, { fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold', color, stroke: '#1a1410', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(DEPTH + 1);
    made.push(t);
    return t;
  };
  const arrow = (a, b, color, width = 3, dashed = false) => {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    g.lineStyle(width + 4, 0x1a1410, 0.5); g.lineBetween(a.x, a.y, b.x, b.y); // a dark edge so it reads on any floor
    g.lineStyle(width, color, 0.95);
    if (dashed) for (let d = 0; d < len; d += 14) g.lineBetween(a.x + ux * d, a.y + uy * d, a.x + ux * Math.min(len, d + 8), a.y + uy * Math.min(len, d + 8));
    else g.lineBetween(a.x, a.y, b.x, b.y);
    g.fillStyle(color, 1).fillTriangle(b.x, b.y, b.x - ux * 11 - uy * 6, b.y - uy * 11 + ux * 6, b.x - ux * 11 + uy * 6, b.y - uy * 11 - ux * 6);
  };

  // where the unit ends up: its ghost, and how it gets there
  if (plan.end && (plan.end.col !== unit.col || plan.end.row !== unit.row)) {
    const end = tileToScreen(plan.end.col, plan.end.row);
    made.push(ghostOf(scene, unit, plan.end, GHOST, 0xbfe9ff));
    if (plan.zip) {
      // a zip: a bright streak, wide where it starts and thin where it lands
      g.lineStyle(9, 0xbfe9ff, 0.22); g.lineBetween(here.x, here.y - 18, end.x, end.y - 18);
      g.lineStyle(3, 0xffffff, 0.9); g.lineBetween(here.x, here.y - 18, end.x, end.y - 18);
    } else if (plan.leap) {
      // a leap: an arc over the heads
      const pts = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push({ x: here.x + (end.x - here.x) * t, y: here.y + (end.y - here.y) * t - 18 - 70 * Math.sin(Math.PI * t) }); }
      g.lineStyle(7, 0x1a1410, 0.45).strokePoints(pts); g.lineStyle(3, 0xffc24a, 0.95).strokePoints(pts);
    } else arrow({ x: here.x, y: here.y }, { x: end.x, y: end.y }, 0xbfe9ff, 3, true);
  }
  // a throw down a line: the line it flies along
  if (plan.line && plan.line.length) {
    const last = plan.line[plan.line.length - 1]; const p = tileToScreen(last.col, last.row);
    arrow({ x: here.x, y: here.y - 30 }, { x: p.x, y: p.y - 30 }, 0xffe9c4, 2, true);
  }
  // Husk: the decoy left behind
  if (plan.decoyAt) {
    const d = tileToScreen(plan.decoyAt.col, plan.decoyAt.row);
    text(d.x, d.y + 26, 'decoy stays', '#c9a8ff');
  }
  // who is hit
  for (const u of plan.hits) {
    const p = tileToScreen(u.col, u.row);
    g.lineStyle(3, 0xff5a4a, 0.95).strokeEllipse(p.x, p.y, TILE_WIDTH * 0.52, TILE_HEIGHT * 0.52);
    g.lineStyle(8, 0xff5a4a, 0.2).strokeEllipse(p.x, p.y, TILE_WIDTH * 0.52, TILE_HEIGHT * 0.52);
  }
  // where a pushed unit lands
  for (const pu of plan.pushes) {
    const from = tileToScreen(pu.unit.col, pu.unit.row);
    if (pu.held) { text(from.x, from.y - (pu.unit.topY || 60) - 4, 'Holds', '#d9b77a'); continue; }
    const to = tileToScreen(pu.to.col, pu.to.row);
    const movedOn = pu.to.col !== pu.unit.col || pu.to.row !== pu.unit.row;
    if (movedOn) {
      arrow({ x: from.x, y: from.y }, { x: to.x, y: to.y }, 0xff9a5a, 3);
      made.push(ghostOf(scene, pu.unit, pu.to, 0.36, 0xffb38a));
    }
    const words = [pu.levels > 0 ? 'Fall -' + pu.levels * terrain.fallDamagePerLevel : null, pu.slam ? 'Slam' : null].filter(Boolean).join(', ');
    if (words) text(to.x, to.y + 30, words, '#ff9a5a');
  }
  // other things that will happen to a unit
  for (const m of plan.marks) {
    const p = tileToScreen(m.unit.col, m.unit.row);
    text(p.x, p.y - (m.unit.topY || 60) - 22, m.text, '#ffd27a');
  }
  // the name of the form, over the unit that acts (Sonic Javelin picks its own form)
  if (plan.label) {
    const at = plan.end ? tileToScreen(plan.end.col, plan.end.row) : here;
    const t = text(at.x, at.y - (unit.topY || 60) - 8, plan.label, '#ffffff');
    t.setFontSize('17px');
  }
  return made;
}
