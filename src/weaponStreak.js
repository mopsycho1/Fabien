// Weapon streaks (roadmap 18.57, Graphics 2.0, 26 Nov): an attack comes from the weapon.
// In place of the one arc drawn round every target (heavySlash), each melee blow gets a short streak that starts
// at the fighter's weapon, follows the swing, and lands with the blow. The weapon's tip on every strike picture
// is in src/data/weaponTips.json (dev/tools/weapon_tips.py). Behind the "Weapon streaks" Settings switch.
//
// Three kinds of swing:
//   arc    a blade: a crescent swept round the shoulder, from above, into the tip (Sudeen, the Thief, Gadara)
//   thrust a spear or a stab: a straight, thin streak along the arm into the tip (Gaha, Rabdul, the archer's dagger)
//   blunt  a mace, a fist, a hammer: a short, heavy smear (the Bull, Tayo, Leol)
import Phaser from 'phaser';
import tipsJson from './data/weaponTips.json';
import { ELEMENTS } from './fxLayers.js';

const SWING = { h1: 'arc', h2: 'thrust', e1: 'blunt', e2: 'blunt', e3: 'thrust', e4: 'thrust', e5: 'arc', e6: 'arc', h6: 'blunt' };

// texture key ("<id>:<file>") -> [x, y] share of the picture
const TIPS = new Map();
for (const [id, files] of Object.entries(tipsJson.tips)) for (const [file, tip] of Object.entries(files)) TIPS.set(id + ':' + file, tip);

export const swingOf = (unit) => SWING[unit.id] || 'arc';

// Where the weapon tip is on screen now, from the picture the fighter shows: null if this picture has no tip.
export function weaponTip(unit) {
  const s = unit.sprite, v = unit.view;
  if (!s || !v || !s.active || !s.texture) return null;
  const tip = TIPS.get(s.texture.key);
  if (!tip) return null;
  const u = s.flipX ? 1 - tip[0] : tip[0];
  return {
    x: v.x + s.x + (u - s.originX) * s.displayWidth,
    y: v.y + s.y + (tip[1] - s.originY) * s.displayHeight,
  };
}

// The point the swing turns round: the fighter's shoulder.
function pivotOf(unit) {
  const s = unit.sprite, v = unit.view;
  return { x: v.x + s.x, y: v.y + s.y - s.displayHeight * 0.62 };
}

const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Play the streak on this fighter's blow. ms: how long until the blow lands (the streak's head reaches the tip then).
// element: the colour set (steel, fire, earth, wind, lightning) as the hit uses. Returns false if the picture has no tip.
export function weaponStreak(scene, unit, { ms = 90, element = 'steel', dx = 1 } = {}) {
  if (!weaponTip(unit)) return false;
  const kind = swingOf(unit);
  const col = ELEMENTS[element] || ELEMENTS.steel;
  const glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const core = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const depth = unit.view.depth + 0.6;
  glow.setDepth(depth); core.setDepth(depth + 0.01);
  const fade = kind === 'blunt' ? 140 : 180;
  const sweep = kind === 'blunt' ? 1.25 : 1.95; // radians the arc covers (about 70 and 110 degrees)
  const state = { t: 0 };
  unit.lastStreakAt = scene.time.now;

  // The points of the streak now: a list of { x, y, w } from the tail to the head (w: its half-width).
  const shape = (headP, tailP, width) => {
    const T = weaponTip(unit), P = pivotOf(unit);
    if (!T) return null;
    const pts = [];
    if (kind === 'thrust') {
      // along the arm: from a quarter of the way out to the tip, drawn out as it goes
      const from = { x: P.x + (T.x - P.x) * 0.15, y: P.y + (T.y - P.y) * 0.15 };
      for (let i = 0; i <= 10; i++) {
        const k = tailP + (headP - tailP) * (i / 10);
        pts.push({ x: from.x + (T.x - from.x) * k, y: from.y + (T.y - from.y) * k, w: width * 0.85 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * i / 10)) });
      }
      return pts;
    }
    const r = Math.max(14, Math.hypot(T.x - P.x, T.y - P.y));
    const end = Math.atan2(T.y - P.y, T.x - P.x);
    // the blade comes down from above: of the two ways round, take the one that starts higher on the screen
    const a = end - sweep, b = end + sweep;
    const start = Math.sin(a) < Math.sin(b) ? a : b;
    for (let i = 0; i <= 14; i++) {
      const k = tailP + (headP - tailP) * (i / 14);
      const ang = start + (end - start) * k;
      // the crescent is fat near the head and thin at the tail; the radius bows out a little mid-swing
      pts.push({ x: P.x + Math.cos(ang) * r, y: P.y + Math.sin(ang) * r * 0.92, w: width * Math.pow(i / 14, 1.4) });
    }
    return pts;
  };

  const draw = (g, pts, color, alpha) => {
    g.clear();
    if (!pts || pts.length < 2 || alpha <= 0) return;
    // a ribbon: one edge out, the other back
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
      let nx = -(q.y - o.y), ny = q.x - o.x;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      left.push({ x: p.x + nx * p.w, y: p.y + ny * p.w });
      right.push({ x: p.x - nx * p.w, y: p.y - ny * p.w });
    }
    g.fillStyle(color, alpha);
    g.fillPoints([...left, ...right.reverse()], true);
  };

  const width = (kind === 'blunt' ? 11 : kind === 'thrust' ? 10 : 9) * Math.max(0.7, unit.sprite.displayHeight / 150);
  const render = () => {
    if (!unit.view || !unit.view.active) return;
    const t = state.t; // 0 to 1: the swing; 1 to 2: the fade
    const head = Math.min(1, easeOut(Math.min(1, t)));
    const tail = t <= 1 ? Math.max(0, head - 0.6) : Math.min(1, 0.4 + 0.6 * (t - 1));
    const a = t <= 1 ? 1 : 1 - (t - 1);
    draw(glow, shape(head, tail, width * 1.9), col.glow, 0.42 * a);
    draw(core, shape(head, tail, width * 0.7), col.core, 0.9 * a);
  };
  render();
  scene.tweens.add({
    targets: state, t: 1, duration: ms, ease: 'Linear', onUpdate: render,
    onComplete: () => scene.tweens.add({
      targets: state, t: 2, duration: fade, ease: 'Linear', onUpdate: render,
      onComplete: () => { glow.destroy(); core.destroy(); },
    }),
  });
  return true;
}
