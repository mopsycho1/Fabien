// Weight (roadmap 18.9, M9; 17.13 and 17.15): what makes a hit and a new turn felt.
//   - damageSize: bigger numbers for bigger hits
//   - turnBanner: a short sweep in the side's colour with the fighter's face and name when
//     a turn starts; any tap puts it away
// (The pale chunk of health that drains is in nameplate.js; the white flash and the hit
// stop were already in BattleScene.js.)
import { portraitMedallion, textStyle } from './hud.js';
import { portraitKey } from './art.js';

// How big a damage number is written, in game pixels: 1 damage 36, 5 damage 46, 10 damage 58,
// 15 or more 70. (It was 40 for everything under 9 and 54 above.)
export function damageSize(damage) {
  return Math.round(Math.min(70, Math.max(34, 34 + damage * 2.4)));
}

export const BANNER = { inMs: 150, holdMs: 520, outMs: 160 };
const SIDE = { hero: { band: 0x1f5f8f, edge: 0x9fd4ff, word: 'YOUR TURN' }, enemy: { band: 0x8a2a22, edge: 0xff9a8a, word: 'ENEMY TURN' } };

// Shows the banner for this fighter's turn. Heroes sweep in from the left, enemies from the
// right. It never blocks a tap: a tap anywhere just puts it away (scene.dropTurnBanner).
export function turnBanner(scene, unit) {
  dropTurnBanner(scene);
  if (!scene.lay || !unit || !unit.alive) return null;
  const { W, s, m, portrait, minText } = scene.lay;
  const look = SIDE[unit.side] || SIDE.hero;
  const h = Math.round(64 * s);
  const y = portrait ? scene.stripY + Math.round(150 * s) : m + Math.round(92 * s);
  const band = scene.add.graphics();
  // a band that fades out towards both ends, with a bright line above and below
  for (let i = 0; i < 24; i++) {
    const a = 0.82 * Math.sin((Math.PI * (i + 0.5)) / 24);
    band.fillStyle(look.band, a).fillRect((W / 24) * i - W / 2, -h / 2, W / 24 + 1, h);
  }
  band.fillStyle(look.edge, 0.9).fillRect(-W * 0.36, -h / 2, W * 0.72, 2).fillRect(-W * 0.36, h / 2 - 2, W * 0.72, 2);
  const r = Math.round(24 * s);
  const name = scene.add.text(0, -Math.round(4 * s), unit.name.toUpperCase(), textStyle(Math.max(minText, Math.round(26 * s)), '#fff4d6', { fontStyle: 'bold' })).setOrigin(0, 0.5).setLetterSpacing(2);
  const word = scene.add.text(0, 0, look.word, textStyle(Math.max(minText, Math.round(13 * s)), '#' + look.edge.toString(16).padStart(6, '0'))).setOrigin(0, 0.5).setLetterSpacing(2);
  const total = 2 * r + Math.round(14 * s) + Math.max(name.width, word.width);
  const face = portraitMedallion(scene, -total / 2 + r, 0, r, unit, portraitKey(unit.id, unit), { active: true });
  name.setPosition(-total / 2 + 2 * r + Math.round(14 * s), -name.height * 0.32);
  word.setPosition(name.x, name.height * 0.42);
  const from = unit.side === 'enemy' ? 1 : -1;
  const box = scene.add.container(W / 2 + from * W * 0.5, y, [band, face, name, word]).setDepth(240).setAlpha(0);
  box.side = unit.side; box.unit = unit; box.bandColor = look.band;
  scene.ui(box);
  scene.turnBannerBox = box;
  scene.tweens.add({ targets: box, x: W / 2, alpha: 1, duration: BANNER.inMs, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: box, x: W / 2 - from * W * 0.25, alpha: 0, delay: BANNER.inMs + BANNER.holdMs, duration: BANNER.outMs, ease: 'Cubic.easeIn', onComplete: () => { if (scene.turnBannerBox === box) scene.turnBannerBox = null; box.destroy(); } });
  return box;
}

// Puts the banner away at once (a tap, a cut-in, the end of the battle).
export function dropTurnBanner(scene) {
  const box = scene.turnBannerBox;
  scene.turnBannerBox = null;
  if (box && box.active) { scene.tweens.killTweensOf(box); box.destroy(); }
}
