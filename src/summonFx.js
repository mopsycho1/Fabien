// Call Spirit as an event (roadmap 6.99, Baiyee 28 Nov, the Lens of Juiciness). Nothing here changes the rules: it is
// the show around Kofi's spirit coming and going (src/spirits.js calls it).
//
// THE SUMMON (summonShow), about 3 seconds the first time in a battle and about 1.5 after (every step at half time):
//   1. Kofi raises his lantern (his chant pose, a charge of light at the lantern); the board dims a little and the
//      camera eases in between him and the tile.
//   2. The tile cracks with glowing runes in the spirit's colour (Ember orange, Tide blue, Stone gold-brown, Gale pale
//      green): a ring of eight runes and cracks running out from the middle.
//   3. The spirit rises its own way, with Suleiman's effects where they fit:
//        Ember: out of a pillar of fire (the Fury column) with embers
//        Tide:  from a swirling pool (his Renewal water spiral, Kofi's own)
//        Stone: pushing up through breaking ground (Tayo's rock bursting up and crumbling, his Lunge dust)
//        Gale:  spiralling in from a whirlwind (his wind streak, three of them turning inwards)
//   4. A name banner ("EMBER SPIRIT") sweeps across with a sound sting, a flash of light on everyone nearby.
//   5. The board brightens, the camera goes back, and the spirit makes its first move (spirits.js).
// A tap speeds it up five times (the game's cut-in skip, inCinematic). Light effects mode halves the particles.
//
// THE FADE (spiritFade): when its time is up (or it breaks) the spirit goes back into its element:
//   embers rising (Ember), mist (Tide), dust falling (Stone), wind streaks (Gale).
//
// THE WAIT (spiritReadyCheck): at the start of Kofi's turn when Call Spirit has just come off its wait, a quiet chime
// and "Spirit ready" over him; the skills list fills its icon turn by turn and the ready row pulses (BattleScene.spellMenu).
import Phaser from 'phaser';
import { tileToScreen } from './grid.js';
import { TILE_WIDTH } from './config.js';
import { floorLight, lightNearby, chargeUp } from './fxLayers.js';
import { buffCastFx, sfxAt, fxMode } from './spellArt.js';
import { textStyle } from './hud.js';
import { play } from './audio.js';
import { screenShake } from './effects.js';

// The show's beats in milliseconds, the first time in a battle (later ones at LATER x these).
export const SUMMON = { dim: 260, runes: 200, rise: 800, arrive: 1150, banner: 1450, bright: 2350, end: 2750 };
export const LATER = 0.5;
const DIM_ALPHA = 0.32;   // how dark the board goes
const ZOOM = 1.22;        // how close the camera comes
const TOP = 79;           // the depth the summoner, the tile and the spirit are lifted to over the dimming (effects are 80+)

const color = (hex) => Phaser.Display.Color.HexStringToColor(hex).color;
const few = (n) => (fxMode() === 'light' ? Math.ceil(n / 2) : n); // (phones on Light: half the particles)
const has = (scene, k) => scene.textures.exists('fx:' + k);

// The whole summon. onArrive() makes the spirit (and returns it); onEnd(sp) runs when the show is over.
export function summonShow(scene, caster, tile, kind, S, first, onArrive, onEnd) {
  const f = first ? 1 : LATER;
  const at = (ms, fn) => scene.time.delayedCall(ms * f, fn);
  const p = tileToScreen(tile.col, tile.row);
  const c = color(S.color);
  const dx = p.x - caster.view.x || 1;
  const keep = [];
  scene.inCinematic = true;
  scene.summoning = { kind, first };
  scene.faceToward(caster, dx, p.y - caster.view.y);
  const casterDepth = caster.view.depth;
  caster.view.setDepth(TOP);

  // 1. the lantern, the dimming, the camera
  scene.showPose(caster, 'chant', dx);
  const lantern = { x: caster.view.x + Math.sign(dx) * 14, y: caster.view.y - caster.topY * 0.72 };
  chargeUp(scene, lantern.x, lantern.y, { ember: 'fire', tide: 'water', stone: 'earth', gale: 'wind' }[kind], { ms: 520 * f, size: 1.1, depth: TOP + 2 });
  floorLight(scene, caster.view.x, caster.view.y, c, { size: 1.1, peak: 0.6, ms: 900 * f, depth: TOP + 0.5 });
  play('select');
  const cam = scene.cameras.main;
  const dim = scene.add.rectangle(cam.midPoint.x, cam.midPoint.y, 8000, 8000, 0x05030a, 1).setDepth(TOP - 1).setAlpha(0);
  keep.push(dim);
  scene.tweens.add({ targets: dim, alpha: DIM_ALPHA, duration: SUMMON.dim * f });
  if (scene.focusCamera) scene.focusCamera((caster.view.x + p.x) / 2, (caster.view.y + p.y) / 2 - 20, ZOOM, 420 * f);

  // 2. the runes
  at(SUMMON.runes, () => { keep.push(...runeCircle(scene, p.x, p.y, c, (SUMMON.arrive - SUMMON.runes) * f)); play('rune'); });

  // 3. the rise
  let sp = null;
  at(SUMMON.rise, () => {
    if (caster.alive) scene.showPose(caster, 'cast', dx);
    play('spell');
    RISE[kind](scene, p.x, p.y, c, f);
  });
  at(SUMMON.arrive, () => {
    sp = onArrive();
    sp.view.setDepth(TOP + 0.6);
    ARRIVE[kind](scene, sp, f);
  });

  // 4. the banner and the flash
  at(SUMMON.banner, () => {
    spiritBanner(scene, S.name.toUpperCase(), S.color, f);
    play('sting');
    floorLight(scene, p.x, p.y, c, { size: 2.6, peak: 0.85, ms: 900 * f, depth: TOP + 0.4 });
    lightNearby(scene, p.x, p.y - 20, c, { radius: 240, peak: 0.75, ms: 700 * f });
    screenShake(scene, 0.0025, 140);
  });

  // 5. back to the battle
  at(SUMMON.bright, () => {
    scene.tweens.add({ targets: dim, alpha: 0, duration: 300 * f });
    if (scene.resetCamera) scene.resetCamera(380 * f);
  });
  at(SUMMON.end, () => {
    for (const o of keep) if (o && o.active) o.destroy();
    caster.view.setDepth(casterDepth);
    if (sp && sp.view && sp.view.active) sp.view.setDepth(sp.depth);
    if (scene.endCinematic) scene.endCinematic(); else scene.inCinematic = false;
    scene.summoning = null;
    onEnd(sp);
  });
}

// The tile cracks with runes: a ring of eight runes round the tile's middle and cracks running out, in the spirit's
// colour, added light. Drawn at (0,0) and placed (Phaser Graphics scale from their own x, y). Gone after "ms" + a fade.
export function runeCircle(scene, x, y, c, ms) {
  const rx = TILE_WIDTH * 0.46, ry = rx * 0.5;
  // a soft glow in added light under it, then the ring and runes in plain colour (added light alone turns white on the
  // bright sand)
  const glow = scene.add.graphics().setPosition(x, y).setDepth(TOP + 0.15).setBlendMode(Phaser.BlendModes.ADD);
  glow.fillStyle(c, 0.28).fillEllipse(0, 0, rx * 2.1, ry * 2.1);
  glow.fillStyle(c, 0.22).fillEllipse(0, 0, rx * 1.3, ry * 1.3);
  const ring = scene.add.graphics().setPosition(x, y).setDepth(TOP + 0.2);
  ring.lineStyle(3, c, 1).strokeEllipse(0, 0, rx * 2, ry * 2);
  ring.lineStyle(1.5, c, 0.8).strokeEllipse(0, 0, rx * 1.55, ry * 1.55);
  const bright = Phaser.Display.Color.IntegerToColor(c).lighten(25).color;
  for (let i = 0; i < 8; i++) { // eight small runes on the ring: a stroke, a bar and a hook each, turned a little
    const a = (i / 8) * Math.PI * 2;
    const gx = Math.cos(a) * rx * 0.78, gy = Math.sin(a) * ry * 0.78;
    const t = i % 3;
    ring.lineStyle(2, bright, 1);
    ring.lineBetween(gx, gy - 4, gx, gy + 3);
    if (t === 0) ring.lineBetween(gx - 3, gy - 1, gx + 3, gy - 1);
    if (t === 1) ring.lineBetween(gx - 3, gy - 4, gx + 3, gy + 2);
    if (t === 2) { ring.lineBetween(gx, gy - 4, gx + 3, gy - 6); ring.lineBetween(gx, gy + 3, gx - 3, gy + 5); }
  }
  glow.setScale(0.3).setAlpha(0);
  scene.tweens.add({ targets: glow, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: glow, alpha: 0.5, duration: 180, yoyo: true, repeat: 4, delay: 260 });
  ring.setScale(0.3).setAlpha(0);
  scene.tweens.add({ targets: ring, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: ring, alpha: 0.6, duration: 180, yoyo: true, repeat: 4, delay: 260 });
  const cracks = scene.add.graphics().setPosition(x, y).setDepth(TOP + 0.18);
  for (let i = 0; i < 7; i++) { // jagged cracks from the middle to the rim
    let a = (i / 7) * Math.PI * 2 + Math.random() * 0.5, r = 0, px = 0, py = 0;
    cracks.lineStyle(2 + (i % 2), i % 2 ? bright : c, 1);
    for (let k = 0; k < 4; k++) {
      r += rx * (0.22 + Math.random() * 0.1);
      a += (Math.random() - 0.5) * 0.7;
      const nx = Math.cos(a) * r, ny = Math.sin(a) * r * 0.5;
      cracks.lineBetween(px, py, nx, ny);
      px = nx; py = ny;
    }
  }
  cracks.setScale(0.05);
  scene.tweens.add({ targets: cracks, scale: 1, duration: 420, ease: 'Quad.easeOut' });
  const out = () => scene.tweens.add({ targets: [glow, ring, cracks], alpha: 0, duration: 380, onComplete: () => { glow.destroy(); ring.destroy(); cracks.destroy(); } });
  scene.time.delayedCall(Math.max(300, ms), out);
  return [glow, ring, cracks];
}

// Small specks flying from a point (embers, droplets, grit, wind motes): cheap circles, half on Light.
function specks(scene, x, y, c, n, { up = 70, spread = 40, ms = 700, size = 2.5, fall = false, depth = TOP + 1 } = {}) {
  for (let i = 0; i < few(n); i++) {
    const s = scene.add.circle(x + (Math.random() - 0.5) * spread, y - Math.random() * 10, size * (0.6 + Math.random() * 0.8), c, 1).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: s, x: s.x + (Math.random() - 0.5) * spread, y: s.y + (fall ? 1 : -1) * up * (0.5 + Math.random()), alpha: 0, scale: 0.3, duration: ms * (0.7 + Math.random() * 0.6), ease: 'Quad.easeOut', onComplete: () => s.destroy() });
  }
}

// How each spirit rises (step 3).
const RISE = {
  ember(scene, x, y, c, f) { // a pillar of fire
    play('fire');
    if (has(scene, 'fury_column')) {
      const col = scene.add.image(x, y + 6, 'fx:fury_column').setOrigin(0.5, 1).setScale(0.55, 0.05).setDepth(TOP + 0.4).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: col, scaleY: 0.85, duration: 260 * f, ease: 'Quad.easeOut' });
      scene.tweens.add({ targets: col, alpha: 0, scaleX: 0.2, delay: 520 * f, duration: 360 * f, onComplete: () => col.destroy() });
    }
    if (has(scene, 'rise_fire_0')) {
      const r = scene.add.image(x, y + 6, 'fx:rise_fire_0').setOrigin(0.5, 1).setScale(0.3).setDepth(TOP + 0.3).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: r, scale: 0.42, alpha: 0, duration: 700 * f, onComplete: () => r.destroy() });
    }
    specks(scene, x, y, 0xffa040, 14, { up: 110, spread: 36, ms: 800 * f });
  },
  tide(scene, x, y, c, f) { // a swirling pool
    play('heal');
    buffCastFx(scene, x, y, 'renewal');
    if (has(scene, 'splash_ring')) {
      const ring = scene.add.image(x, y, 'fx:splash_ring').setScale(0.15, 0.08).setDepth(TOP + 0.3).setBlendMode(Phaser.BlendModes.ADD).setTint(c);
      scene.tweens.add({ targets: ring, scaleX: 0.5, scaleY: 0.25, alpha: 0, duration: 700 * f, onComplete: () => ring.destroy() });
    }
    const pool = scene.add.ellipse(x, y, TILE_WIDTH * 0.8, TILE_WIDTH * 0.4, c, 0.45).setDepth(TOP + 0.2).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
    scene.tweens.add({ targets: pool, scale: 1, duration: 320 * f, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: pool, alpha: 0, delay: 520 * f, duration: 400 * f, onComplete: () => pool.destroy() });
    specks(scene, x, y, 0xbfe6ff, 10, { up: 60, spread: 44, ms: 700 * f, size: 2 });
  },
  stone(scene, x, y, c, f) { // breaking ground
    play('bash');
    screenShake(scene, 0.004, 220);
    const erupt = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => 'spike_erupt_' + i);
    if (erupt.every((k) => has(scene, k))) {
      const rock = scene.add.image(x, y, 'fx:' + erupt[0]).setOrigin(0.545, 0.93).setScale(110 / 280).setDepth(TOP + 0.3);
      erupt.forEach((k, i) => scene.time.delayedCall(i * 45 * f, () => rock.active && rock.setTexture('fx:' + k)));
      const crumble = [0, 1, 2, 3, 4, 5].map((i) => 'spike_crumble_' + i).filter((k) => has(scene, k));
      scene.time.delayedCall(380 * f, () => { if (!rock.active) return; crumble.forEach((k, i) => scene.time.delayedCall(i * 55 * f, () => rock.active && rock.setTexture('fx:' + k))); });
      scene.tweens.add({ targets: rock, alpha: 0, delay: 640 * f, duration: 220 * f, onComplete: () => rock.destroy() });
    }
    sfxAt(scene, 'lunge_dust', x, y + 4, { depth: TOP + 0.5, size: 1.3 });
    for (let i = 0; i < few(10); i++) { // chunks of the floor thrown up and falling back
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const r = scene.add.rectangle(x, y - 6, 4 + Math.random() * 5, 3 + Math.random() * 4, i % 2 ? 0x7a5a38 : c, 1).setDepth(TOP + 0.6).setRotation(Math.random() * 3);
      scene.tweens.add({ targets: r, x: x + Math.cos(a) * (30 + Math.random() * 30), y: y - 6 + Math.sin(a) * (40 + Math.random() * 30), rotation: r.rotation + 3, duration: 300 * f, ease: 'Quad.easeOut' });
      scene.tweens.add({ targets: r, y: y + 6, alpha: 0, delay: 300 * f, duration: 300 * f, ease: 'Quad.easeIn', onComplete: () => r.destroy() });
    }
  },
  gale(scene, x, y, c, f) { // a whirlwind
    play('whoosh');
    play('wind');
    for (let i = 0; i < 3; i++) { // three wind streaks turning in on the tile
      const img = sfxAt(scene, 'gale_swift', x, y - 18, { depth: TOP + 0.4, size: 0.7, rotation: (i * Math.PI * 2) / 3 });
      if (!img) break;
      img.setTint(c);
      scene.tweens.add({ targets: img, rotation: img.rotation + Math.PI * 1.4, scale: img.scale * 0.45, duration: 700 * f, ease: 'Quad.easeIn' });
    }
    // the whirlwind itself: pale green rings of wind turning and closing on the tile
    for (let i = 0; i < 3; i++) {
      const w = scene.add.graphics().setPosition(x, y - 16 - i * 14).setDepth(TOP + 0.5);
      w.lineStyle(3 - i * 0.6, c, 0.9).beginPath().arc(0, 0, 40 - i * 6, 0.2, Math.PI * 1.3).strokePath();
      w.lineStyle(2, 0xffffff, 0.6).beginPath().arc(0, 0, 32 - i * 6, Math.PI, Math.PI * 1.9).strokePath();
      w.setScale(1.4, 0.7).setAlpha(0);
      scene.tweens.add({ targets: w, alpha: 1, duration: 120 * f });
      scene.tweens.add({ targets: w, rotation: (i % 2 ? -1 : 1) * Math.PI * 3, scaleX: 0.4, scaleY: 0.2, y: w.y - 10, duration: 760 * f, ease: 'Quad.easeIn' });
      scene.tweens.add({ targets: w, alpha: 0, delay: 600 * f, duration: 200 * f, onComplete: () => w.destroy() });
    }
    for (let i = 0; i < few(12); i++) { // motes spiralling inwards
      const a = Math.random() * Math.PI * 2, r = 46 + Math.random() * 20;
      const m = scene.add.circle(x + Math.cos(a) * r, y - 20 + Math.sin(a) * r * 0.5, 2, c, 1).setDepth(TOP + 1).setBlendMode(Phaser.BlendModes.ADD);
      const o = { t: 0 };
      scene.tweens.add({ targets: o, t: 1, duration: 640 * f, ease: 'Quad.easeIn', onUpdate: () => { const rr = r * (1 - o.t), aa = a + o.t * 4; m.setPosition(x + Math.cos(aa) * rr, y - 20 - o.t * 16 + Math.sin(aa) * rr * 0.5); m.setAlpha(1 - o.t * 0.6); }, onComplete: () => m.destroy() });
    }
  },
};

// How the spirit itself comes into sight (step 3, end): its body rises out of the effect.
const ARRIVE = {
  ember(scene, sp, f) { lift(scene, sp, 26, 360 * f, 'Back.easeOut'); },
  tide(scene, sp, f) { sp.view.scaleY = 0.2; lift(scene, sp, 14, 420 * f, 'Sine.easeOut'); scene.tweens.add({ targets: sp.view, scaleY: 1, duration: 420 * f, ease: 'Back.easeOut' }); },
  stone(scene, sp, f) { lift(scene, sp, 34, 300 * f, 'Back.easeOut'); },
  gale(scene, sp, f) {
    sp.view.setAlpha(0);
    scene.tweens.add({ targets: sp.view, alpha: 1, duration: 300 * f });
    const o = { t: 0 };
    scene.tweens.add({ targets: o, t: 1, duration: 420 * f, ease: 'Sine.easeOut', onUpdate: () => { sp.body.scaleX = sp.bodyScale * Math.cos((1 - o.t) * Math.PI * 3); } });
  },
};
function lift(scene, sp, by, ms, ease) {
  const y0 = sp.view.y;
  sp.view.y = y0 + by;
  sp.view.setAlpha(0);
  scene.tweens.add({ targets: sp.view, y: y0, alpha: 1, duration: ms, ease });
}

// The name banner: a band across the screen, the spirit's name in its colour, sweeping in from the left and out to the
// right. On the interface camera (it does not zoom with the board).
export function spiritBanner(scene, word, hex, f = 1) {
  if (!scene.lay) return null;
  const { W, H, s, minText } = scene.lay;
  const c = color(hex);
  const h = Math.round(84 * s);
  const band = scene.add.graphics();
  for (let i = 0; i < 24; i++) band.fillStyle(0x0b0710, 0.78 * Math.sin((Math.PI * (i + 0.5)) / 24)).fillRect((W / 24) * i - W / 2, -h / 2, W / 24 + 1, h);
  band.fillStyle(c, 0.9).fillRect(-W * 0.34, -h / 2, W * 0.68, 2).fillRect(-W * 0.34, h / 2 - 2, W * 0.68, 2);
  const text = scene.add.text(0, 0, word, textStyle(Math.max(minText, Math.round(44 * s)), hex, { fontStyle: 'bold' })).setOrigin(0.5).setLetterSpacing(5);
  text.setShadow(0, 0, hex, 14, true, true);
  const box = scene.add.container(-W * 0.2, Math.round(H * 0.36), [band, text]).setDepth(241).setAlpha(0);
  scene.ui(box);
  scene.spiritBannerBox = box;
  scene.tweens.add({ targets: box, x: W / 2, alpha: 1, duration: 220 * f, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: box, x: W * 1.15, alpha: 0, delay: (220 + 620) * f, duration: 240 * f, ease: 'Cubic.easeIn', onComplete: () => { if (scene.spiritBannerBox === box) scene.spiritBannerBox = null; box.destroy(); } });
  return box;
}

// The spirit goes back into its element (removeSpirit): embers, mist, dust or wind. Calls onGone when it has gone.
export function spiritFade(scene, sp, onGone) {
  const v = sp.view;
  if (!v || !v.active) return onGone && onGone();
  const x = v.x, y = v.y - sp.h * 0.5;
  const c = color((sp.S && sp.S.color) || '#ffffff');
  const done = () => { v.destroy(); if (onGone) onGone(); };
  if (sp.kind === 'ember') { // it burns away upwards in embers
    specks(scene, x, y, 0xffa040, 16, { up: 90, spread: 30, ms: 900, depth: v.depth + 1 });
    if (sp.body.setTint) sp.body.setTint(0xffb070);
    scene.tweens.add({ targets: v, y: v.y - 16, alpha: 0, scaleX: 0.6, duration: 620, ease: 'Quad.easeIn', onComplete: done });
  } else if (sp.kind === 'tide') { // it sinks into a mist
    for (let i = 0; i < few(6); i++) {
      const m = scene.add.circle(x + (Math.random() - 0.5) * 30, y + 10, 8 + Math.random() * 6, c, 0.35).setDepth(v.depth + 1);
      scene.tweens.add({ targets: m, x: m.x + (Math.random() - 0.5) * 40, y: m.y - 10, scale: 2.2, alpha: 0, duration: 900, onComplete: () => m.destroy() });
    }
    scene.tweens.add({ targets: v, scaleY: 0.15, y: v.y + 6, alpha: 0, duration: 640, ease: 'Sine.easeIn', onComplete: done });
  } else if (sp.kind === 'stone') { // it crumbles into dust
    specks(scene, x, y, 0x9a7a54, 14, { up: 26, spread: 40, ms: 700, fall: true, size: 3, depth: v.depth + 1 });
    sfxAt(scene, 'lunge_dust', x, v.y + 4, { depth: v.depth + 0.5, size: 0.7 });
    scene.tweens.add({ targets: v, x: v.x + 2, duration: 50, yoyo: true, repeat: 3 });
    scene.tweens.add({ targets: v, y: v.y + 14, alpha: 0, delay: 220, duration: 420, ease: 'Quad.easeIn', onComplete: done });
  } else { // the wind takes it
    for (let i = 0; i < few(6); i++) {
      const st = scene.add.rectangle(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 30, 18, 2, c, 0.8).setDepth(v.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: st, x: st.x + 50 + Math.random() * 30, y: st.y - 20, scaleX: 2, alpha: 0, duration: 600, onComplete: () => st.destroy() });
    }
    const o = { t: 0 }, s0 = sp.bodyScale || sp.body.scaleX;
    scene.tweens.add({ targets: o, t: 1, duration: 560, onUpdate: () => { sp.body.scaleX = s0 * Math.cos(o.t * Math.PI * 4) * (1 - o.t); } });
    scene.tweens.add({ targets: v, y: v.y - 22, alpha: 0, duration: 560, ease: 'Quad.easeIn', onComplete: done });
  }
  return true;
}

// The start of Kofi's turn: Call Spirit has just come off its wait (it was waiting at the start of his last turn).
// A quiet chime and "Spirit ready" over him; the menu row pulses this turn (unit.spiritReadyTurn).
export function spiritReadyCheck(scene, unit, waitNow) {
  const was = unit.spiritWaitWas;
  unit.spiritWaitWas = waitNow;
  if (!(was > 0) || waitNow > 0 || !unit.alive) return false;
  unit.spiritReadyTurn = scene.turnCount;
  play('chime');
  scene.time.delayedCall(250, () => unit.alive && scene.floatText(unit, 'Spirit ready', '#b8f0c8', { rise: 40 }));
  if (unit.view) floorLight(scene, unit.view.x, unit.view.y, 0x9fe8c0, { size: 1, peak: 0.45, ms: 700 });
  return true;
}
