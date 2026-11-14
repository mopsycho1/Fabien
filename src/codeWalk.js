import { fxMode } from './spellArt.js';
import { ELEMENTS } from './fxLayers.js';

// Movement life in code (roadmap 18.13, milestone M13).
//
// A fighter without walking pictures used to glide over the board in its
// standing pose. This file gives every such fighter a walk made in code, on
// the picture it already has:
//   - two footfalls a tile: a small rise and fall, twice, with the body
//     rocking from one foot to the other
//   - a lean into the way it is going, held for the whole walk
//   - a little squash as each foot lands, and a puff of dust at that foot
//   - a quick settle when it stops: it straightens up and sinks a touch
//
// Layra does not walk like that (roadmap 13.41): she cannot walk unaided, and
// moves by binding sand and earth to her legs. So she is carried: no
// footfalls, a steady low ride, sand gathering to her legs as she sets off,
// circling her shins while she moves, and falling away when she stops.
// "walkStyle": "sand" on a fighter in src/data/art.json asks for it.
//
// A fighter that gets real walk pictures ("walk" in art.json) uses those
// instead, with no change here (see walkFrames in art.js).
//
// Everything here is drawn in code. Nothing is loaded.

const LEAN = 5;        // degrees it leans into a walk
const ROCK = 1.6;      // degrees it rocks from foot to foot
const BOB = 3;         // pixels each footfall lifts it
const SQUASH = 0.045;  // how much shorter it is as a foot lands (0.045 = 4.5 percent)
const SETTLE = 0.07;   // the sink as it stops
const SAND = ELEMENTS.sand.spark;

// How many of each thing has happened, for the tests.
export const walkCount = { steps: 0, dust: 0, settles: 0, sandStarts: 0, sandEnds: 0 };

// The picture's squash. The breathing in BattleScene multiplies its height by
// (1 - unit.squash) every frame, so the two never fight; the width is set here.
function setSquash(unit, v) {
  unit.squash = v;
  const sp = unit.sprite;
  if (sp && sp.active) sp.scaleX = unit.artScale * (1 + v * 0.6);
}

// How far the picture is lifted off the ground, in pixels. It is always set as a whole
// number from the picture's resting place, never added to where it happens to be: two
// bobs that overlap by a frame must not leave it hanging in the air.
function setLift(unit, v) {
  const sp = unit.sprite;
  if (!sp || !sp.active) return;
  if (unit.restY === undefined) unit.restY = sp.y;
  unit.lift = v;
  sp.y = unit.restY - v;
}

function tweenLift(scene, unit, to, ms, { yoyo = false, ease = 'Sine.easeOut' } = {}) {
  if (unit.liftTween) unit.liftTween.stop();
  const s = { v: unit.lift || 0 };
  unit.liftTween = scene.tweens.add({ targets: s, v: to, duration: ms, yoyo, ease, onUpdate: () => setLift(unit, s.v), onComplete: () => setLift(unit, yoyo ? 0 : to) });
}

function tweenSquash(scene, unit, from, ms) {
  const s = { v: from };
  setSquash(unit, from);
  scene.tweens.add({ targets: s, v: 0, duration: ms, ease: 'Sine.easeOut', onUpdate: () => setSquash(unit, s.v), onComplete: () => setSquash(unit, 0) });
}

// A small puff where a foot lands. Drawn round its own point (0, 0) and placed, so it
// can grow without sliding. "tone" is the dust colour for the ground it is on.
function footDust(scene, x, y, dir, depth, tone = 0xcdb48a, size = 1) {
  walkCount.dust++;
  const g = scene.add.graphics({ x, y }).setDepth(depth);
  const s = { t: 0 };
  scene.tweens.add({
    targets: s, t: 1, duration: 300, ease: 'Sine.easeOut',
    onUpdate: () => {
      g.clear();
      g.fillStyle(tone, 0.42 * (1 - s.t));
      g.fillEllipse(-dir * (3 + 7 * s.t), -2 - 5 * s.t, (9 + 9 * s.t) * size, (5 + 4 * s.t) * size);
      g.fillEllipse(-dir * (8 + 10 * s.t), -1 - 3 * s.t, (6 + 6 * s.t) * size, (3.5 + 3 * s.t) * size);
    },
    onComplete: () => g.destroy(),
  });
}

// One tile of the code walk. Call it as the fighter leaves for the next tile.
//   dx      : which way it goes across the screen (pixels; the sign is what matters)
//   ms      : how long the tile takes
//   ground  : 'water' = no dust (the splash is drawn elsewhere), 'sand' = sandier dust
export function codeStep(scene, unit, { dx, ms, ground = 'floor' }) {
  const sp = unit.sprite;
  if (!sp || !sp.active) return;
  walkCount.steps++;
  unit.gait = 'code';
  const dir = dx >= 0 ? 1 : -1;
  const beat = ms / 2;
  const light = fxMode() === 'light';
  const tone = ground === 'sand' ? 0xe0c088 : 0xbfa888;
  for (let k = 0; k < 2; k++) {
    scene.time.delayedCall(k * beat, () => {
      if (!unit.alive || !sp.active || unit.knock) return;
      // up and down once, rocking onto the other foot
      tweenLift(scene, unit, BOB, beat / 2, { yoyo: true });
      scene.tweens.add({ targets: sp, angle: dir * LEAN + (k === 0 ? ROCK : -ROCK), duration: beat * 0.6, ease: 'Sine.easeInOut' });
      // the foot lands at the end of the beat: squash, and dust at that foot
      scene.time.delayedCall(beat * 0.85, () => {
        if (!unit.alive || !sp.active || unit.knock) return;
        tweenSquash(scene, unit, SQUASH, beat * 0.6);
        if (ground !== 'water' && !(light && k === 1)) footDust(scene, unit.view.x + (k === 0 ? -5 : 5), unit.view.y + 2, dir, unit.view.depth - 0.2, tone);
      });
    });
  }
}

// The fighter has arrived: it straightens up with a small overshoot and sinks a touch.
export function settle(scene, unit) {
  const sp = unit.sprite;
  if (!sp || !sp.active) return;
  if (unit.gait === 'sand') return sandEnd(scene, unit);
  if (unit.gait !== 'code') return;
  walkCount.settles++;
  unit.gait = null;
  scene.tweens.add({ targets: sp, angle: 0, duration: 150, ease: 'Back.easeOut' });
  tweenLift(scene, unit, 0, 90);
  tweenSquash(scene, unit, SETTLE, 170);
}

// ---------- Layra: carried by sand (roadmap 13.41) ----------

// The sand round her legs: grains circling her shins, half of them drawn behind
// her and half in front, so they go round her. It lives inside her own
// container, so it moves with her.
function sandStart(scene, unit) {
  walkCount.sandStarts++;
  const sp = unit.sprite;
  const view = unit.view;
  const at = view.getIndex(sp);
  const back = scene.add.graphics();
  const front = scene.add.graphics();
  view.addAt(back, at);
  view.addAt(front, view.getIndex(sp) + 1);
  const n = fxMode() === 'light' ? 7 : 12;
  const grains = [];
  for (let i = 0; i < n; i++) grains.push({ a: (i / n) * Math.PI * 2, h: 3 + Math.random() * 20, r: 0.75 + Math.random() * 0.5, size: 1.6 + Math.random() * 1.7, tone: SAND[i % SAND.length], speed: 5 + Math.random() * 3 });
  // "gather": 0 = the grains are still out on the ground round her, 1 = bound to her legs
  // "fall": 0 = up round her legs, 1 = dropped to the floor and gone
  const state = { gather: 0, fall: 0, t: 0, back, front, grains, dead: false };
  const draw = () => {
    if (state.dead || !back.active || !front.active) return;
    back.clear(); front.clear();
    state.t = scene.time.now / 1000;
    for (const p of grains) {
      const ang = p.a + state.t * p.speed;
      const reach = (14 + 22 * (1 - state.gather)) * p.r; // they close in from a wide ring as they gather
      const x = Math.cos(ang) * reach;
      const depthY = Math.sin(ang) * reach * 0.38;        // the ring lies flat on the ground
      const y = depthY - p.h * state.gather * (1 - state.fall);
      const g = depthY < 0 ? back : front;
      g.fillStyle(p.tone, (0.35 + 0.55 * state.gather) * (1 - state.fall));
      g.fillCircle(x, y, p.size);
    }
    // a soft cuff of sand at her shins while it carries her
    front.fillStyle(SAND[1], 0.3 * state.gather * (1 - state.fall));
    front.fillEllipse(0, -6, 26, 9);
  };
  scene.events.on('update', draw);
  state.stop = () => { state.dead = true; scene.events.off('update', draw); back.destroy(); front.destroy(); };
  scene.tweens.add({ targets: state, gather: 1, duration: 200, ease: 'Sine.easeOut' });
  // she rides a little above the ground, leaning gently the way she goes
  tweenLift(scene, unit, BOB, 200);
  unit.sandRide = state;
}

// One tile of the sand walk: no footfalls. A streak of sand is left on the tile she leaves.
export function sandStep(scene, unit, { dx, ground = 'floor' }) {
  const sp = unit.sprite;
  if (!sp || !sp.active) return;
  walkCount.steps++;
  if (!unit.sandRide || unit.sandRide.dead) sandStart(scene, unit);
  unit.gait = 'sand';
  const dir = dx >= 0 ? 1 : -1;
  scene.tweens.add({ targets: sp, angle: dir * LEAN * 0.5, duration: 160, ease: 'Sine.easeInOut' });
  if (ground !== 'water') footDust(scene, unit.view.x, unit.view.y + 2, dir, unit.view.depth - 0.2, SAND[1], 1.5);
}

// She stops: the sand lets go and falls to the floor, and she comes down onto her feet.
function sandEnd(scene, unit) {
  walkCount.sandEnds++;
  walkCount.settles++;
  unit.gait = null;
  const sp = unit.sprite;
  const ride = unit.sandRide;
  unit.sandRide = null;
  scene.tweens.add({ targets: sp, angle: 0, duration: 180, ease: 'Sine.easeOut' });
  tweenLift(scene, unit, 0, 180, { ease: 'Sine.easeIn' });
  tweenSquash(scene, unit, SETTLE * 0.6, 200);
  if (!ride) return;
  scene.tweens.add({ targets: ride, fall: 1, duration: 260, ease: 'Sine.easeIn', onComplete: () => ride.stop() });
  footDust(scene, unit.view.x, unit.view.y + 2, 1, unit.view.depth - 0.2, SAND[1], 1.6);
  footDust(scene, unit.view.x, unit.view.y + 2, -1, unit.view.depth - 0.2, SAND[1], 1.6);
}

// Anything that cuts a walk short (a knockback, a death) must leave nothing behind.
export function dropWalk(unit) {
  if (unit.sandRide) { unit.sandRide.stop(); unit.sandRide = null; }
  unit.gait = null;
  unit.squash = 0;
  if (unit.liftTween) unit.liftTween.stop();
  if (unit.lift) setLift(unit, 0);
}
