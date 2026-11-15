// Reading the board (roadmap 18.10, M10; 17.6 and 17.11): what lets the eye pick a fighter
// out of the cave floor and see where a walk goes.
//   - each figure stands on a small dark contact shadow and a wider soft one
//   - a rim of light in its side's colour runs round it (copies of its own picture, filled
//     with the colour, peeping out a couple of pixels behind it)
//   - the walking path is drawn as a line with a dot where it ends
// The numbers and colours are in src/data/board.json.
import Phaser from 'phaser';
import rules from './data/board.json';
import { tileToScreen } from './grid.js';
import { lightStrength } from './fxLayers.js';

export const boardRules = rules;
const hex = (h) => Phaser.Display.Color.HexStringToColor(h).color;

// A side's colour. ?enemy=white (or red, violet) in the address tries another enemy colour.
export function teamColor(side) {
  if (side === 'enemy' && typeof window !== 'undefined') {
    const asked = window.__enemyColor || new URLSearchParams(window.location.search).get('enemy');
    if (asked && rules.enemyOptions[asked]) return hex(rules.enemyOptions[asked]);
  }
  return hex(rules.teamColors[side] || '#ffffff');
}

// The two shadows under a figure. Returns [floor, contact], to go first in its container.
export function figureShadows(scene) {
  const floor = scene.add.ellipse(0, 3, 92, 42, 0x000000, rules.shadow.floor);
  const contact = scene.add.ellipse(0, 3, 44, 18, 0x000000, rules.shadow.contact);
  return [floor, contact];
}

// The rim: copies of the figure's picture in the side's colour, just behind it. They are
// kept on the picture every frame by syncRims (the picture changes, breathes, squashes).
const OFFSETS = [[-1, 0], [1, 0], [0, -1]];
export function addRim(scene, view, sprite, color) {
  const at = view.getIndex(sprite);
  const rims = OFFSETS.map(() => scene.add.image(sprite.x, sprite.y, sprite.texture.key).setTintFill(color).setAlpha(rules.rim.alpha));
  rims.forEach((r) => view.addAt(r, at));
  return rims;
}

export function syncRims(units) {
  const w = rules.rim.width;
  for (const u of units) {
    const s = u.sprite, rims = u.rims;
    if (!rims || !s || !s.active) continue;
    const show = u.alive && s.visible && !u.hidden && s.alpha > 0.5;
    for (let i = 0; i < rims.length; i++) {
      const r = rims[i];
      if (!r.active) continue;
      r.setVisible(show);
      r.setAlpha(rules.rim.alpha * lightStrength().rim);
      if (!show) continue;
      if (r.texture.key !== s.texture.key) r.setTexture(s.texture.key);
      r.setOrigin(s.originX, s.originY).setFlipX(s.flipX).setScale(s.scaleX, s.scaleY).setAngle(s.angle);
      r.setPosition(s.x + OFFSETS[i][0] * w, s.y + OFFSETS[i][1] * w);
    }
  }
}

// The walking line: through the middle of each tile on the way, a dot at the end.
//   from: { x, y } where the walk starts on the screen; tiles: [{ col, row }, ...]
export function drawPath(scene, from, tiles, depth) {
  const p = rules.tiles.path;
  const color = hex(p.color);
  const g = scene.add.graphics().setDepth(depth);
  const pts = [from, ...tiles.map((t) => tileToScreen(t.col, t.row))];
  g.lineStyle(p.width + 4, 0x1a1410, 0.5);
  g.strokePoints(pts, false);
  g.lineStyle(p.width, color, p.alpha);
  g.strokePoints(pts, false);
  const end = pts[pts.length - 1];
  g.fillStyle(0x1a1410, 0.6).fillEllipse(end.x, end.y, 26, 13);
  g.fillStyle(color, 1).fillEllipse(end.x, end.y, 18, 9);
  g.pathTiles = tiles;
  return g;
}
