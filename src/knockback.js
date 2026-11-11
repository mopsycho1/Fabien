// One knockback for the whole game (roadmap 18.1, Battle 1.0 milestone M1).
//
// Every push in the battle (a clash lost, Spear Throw, Thunderclap, the bull's
// charge, a gust...) is DRAWN here, so they all look and time the same.
// The rules of a push (where the unit ends, the damage) are worked out before,
// in BattleScene.pushLoser; this file only shows what happened.
//
// What a push looks like:
//   1. knocked back : the unit shows its "thrown" picture (fallAir if it has
//                     one, else its hurt picture tilted back)
//   2. the flight   : level ground = a low hop per tile; a ledge = it leaves
//                     the edge and drops on a curve, speeding up as it falls
//   3. the landing  : a squash, dust, a ring on the ground, "Fall -N"
//   4. getting up   : on hands and knees for a moment, then up (if it lived)
//   A wall in the way: it flies into the wall, flattens against it, bounces
//   back and staggers. If the push killed it, the same start, then it lies
//   down and dissolves (BattleScene.playDefeat).
import { tileToScreen, depthFor, getHeight } from './grid.js';
import { LEVEL_HEIGHT } from './config.js';
import { poseFrame } from './art.js';
import { dustPuff, groundRing, screenShake } from './effects.js';
import { play } from './audio.js';

// All the timings and sizes in one place (milliseconds and pixels).
export const KNOCK = {
  stepMs: 150,        // one tile on level ground
  hop: 12,            // how high the low hop goes
  dropMs: 250,        // a drop of one level...
  dropMsPerLevel: 80, // ...and this much longer for each level more
  lift: 16,           // how far it rises off the edge before it drops
  tilt: 20,           // degrees the hurt picture leans while thrown
  landHold: 340,      // on hands and knees
  riseMs: 260,        // pushing up
  slamIn: 150,        // flying into the wall
  slamReach: 16,      // how far toward the wall it goes
  slamBack: 210,      // bouncing off it
  stagger: 300,       // swaying before it stands straight
};

// Where the body is during one step of a push, as a share t (0 to 1) of the step.
//   from, to : the two tiles' places on the screen ({ x, y })
//   levels   : how many levels lower the second tile is (0 on level ground)
// On level ground it is a low hop. Off a ledge it keeps going sideways at a
// steady speed while the drop speeds up (t times t), so the body curves out
// over the edge and never cuts through the cliff face.
export function flightPoint(from, to, levels, t) {
  const x = from.x + (to.x - from.x) * t;
  if (levels <= 0) return { x, y: from.y + (to.y - from.y) * t - KNOCK.hop * Math.sin(Math.PI * t) };
  const drop = levels * LEVEL_HEIGHT;                 // the part of the way down that is the fall itself
  const flat = to.y - drop - from.y;                  // the rest is just the next tile's place on the board
  return { x, y: from.y + flat * t + drop * t * t - KNOCK.lift * Math.sin(Math.PI * t) };
}

// How long one step takes.
export function stepTime(levels) {
  return levels > 0 ? KNOCK.dropMs + KNOCK.dropMsPerLevel * (levels - 1) : KNOCK.stepMs;
}

// The first picture of the list that this unit has, or null.
function firstPose(unit, names) {
  return names.find((n) => poseFrame(unit.id, n, 'right')) || null;
}

// Plays a push.
//   scene  : the battle scene
//   unit   : who was pushed (its tile and health are already the new ones)
//   pushed : what pushLoser returned: { from, path, fall }
//            fall = { levels, damage, slam, toward } or null
//   awayX  : which way it was pushed on the screen (more than 0 = to the right)
//   label  : optional words over its head as it goes, { text, color }
// Returns how long it takes, in milliseconds.
export function playKnockback(scene, unit, pushed, awayX = 0, label = null) {
  unit.knockPending = false;
  if (!pushed || !unit.view || !unit.view.active) return 0;
  const path = pushed.path || [];
  const fall = pushed.fall || null;
  if (path.length === 0 && !fall) return 0;
  if (unit.knock) unit.knock.cancelled = true; // a second push takes over from the first

  const view = unit.view;
  const sprite = unit.sprite && unit.sprite.active ? unit.sprite : null;
  const lethal = unit.hp === 0;
  const away = awayX >= 0 ? 1 : -1;
  const knock = { cancelled: false };
  unit.knock = knock; // while this is set, showStanding leaves the unit's picture alone
  const alive = () => !knock.cancelled && view.active;
  const base = sprite ? { sx: unit.artScale || sprite.scaleX, sy: unit.artScale || sprite.scaleY } : null;
  if (unit.idleTween) unit.idleTween.pause(); // the breathing would fight the squash

  // the tiles it passes, the first being where it stood
  const start = pushed.from || path[0] || unit;
  const tiles = [start, ...path];
  let total = 0;
  for (let i = 1; i < tiles.length; i++) total += stepTime(Math.max(0, getHeight(tiles[i - 1].col, tiles[i - 1].row) - getHeight(tiles[i].col, tiles[i].row)));

  // ---- small helpers ----
  const pose = (name) => scene.showPose(unit, name, -awayX); // it keeps facing whoever hit it
  const squash = (wide) => {
    if (!sprite || !base) return;
    const to = wide ? { x: base.sx * 0.72, y: base.sy * 1.1 } : { x: base.sx * 1.16, y: base.sy * 0.8 };
    scene.tweens.add({ targets: sprite, scaleX: to.x, scaleY: to.y, duration: 80, yoyo: true, ease: 'Quad.easeOut', onComplete: () => sprite.active && sprite.setScale(base.sx, base.sy) });
  };
  // the end of every push: back on its tile, standing (or handed to the death)
  const finish = () => {
    if (!alive()) return;
    unit.knock = null;
    const home = tileToScreen(unit.col, unit.row);
    view.setPosition(home.x, home.y).setDepth(depthFor(unit.col, unit.row) + 1);
    if (sprite) { sprite.setAngle(0); sprite.setScale(base.sx, base.sy); }
    if (unit.idleTween) unit.idleTween.resume();
    if (unit.alive) scene.showStanding(unit);
    scene.refreshWater();
  };
  // a push that killed: the knockback ends and the death takes over from where the body is
  const die = (slam) => {
    if (!alive()) return;
    unit.knock = null;
    if (sprite) sprite.setScale(base.sx, base.sy);
    scene.playDefeat(unit, awayX, slam ? fall : null, !slam);
  };

  // ---- 1. knocked back ----
  if (label && path.length) scene.floatText(unit, label.text, label.color, { rise: 46 });
  const airPose = firstPose(unit, ['fallAir']);
  if (path.length) {
    pose(airPose || 'hurt');
    // no picture of being thrown: the hurt picture leans back instead (as the deaths do)
    if (sprite && !airPose) scene.tweens.add({ targets: sprite, angle: -away * KNOCK.tilt, duration: 90, ease: 'Quad.easeOut' });
  }

  // ---- 2 and 3. the flight, one tile at a time, and each landing ----
  let dropped = 0;
  const step = (i) => {
    if (!alive()) return;
    if (i >= tiles.length) return afterFlight();
    const a = tiles[i - 1];
    const b = tiles[i];
    const levels = Math.max(0, getHeight(a.col, a.row) - getHeight(b.col, b.row));
    const from = tileToScreen(a.col, a.row);
    const to = tileToScreen(b.col, b.row);
    // drawing order follows the body: moving toward the camera it is in front at once;
    // moving away it stays in front of its old tile until it is past the edge
    const depthA = depthFor(a.col, a.row) + 1;
    const depthB = depthFor(b.col, b.row) + 1;
    const clock = { t: 0 };
    scene.tweens.add({
      targets: clock,
      t: 1,
      duration: stepTime(levels),
      ease: 'Linear',
      onUpdate: () => {
        if (!alive()) return;
        const p = flightPoint(from, to, levels, clock.t);
        view.setPosition(p.x, p.y);
        view.setDepth(depthB >= depthA || clock.t > 0.55 ? depthB : depthA);
      },
      onComplete: () => {
        if (!alive()) return;
        view.setPosition(to.x, to.y).setDepth(depthB);
        if (levels > 0) {
          // the landing
          dropped += levels;
          play('crash');
          squash(false);
          dustPuff(scene, to.x, to.y);
          groundRing(scene, to.x, to.y, 0xe8c08a, 1 + 0.2 * (levels - 1));
          screenShake(scene, 0.006 + 0.002 * (levels - 1), 160);
        }
        step(i + 1);
      },
    });
  };

  // ---- 4. what happens once it has stopped moving ----
  const afterFlight = () => {
    if (sprite) scene.tweens.add({ targets: sprite, angle: 0, duration: 100 });
    scene.refreshWater(); // landed in water: Drenched at once
    if (fall && fall.levels > 0) {
      scene.updateHpBar(unit);
      scene.floatText(unit, 'Fall -' + fall.damage, '#ff9a5a', { pop: true, big: fall.damage >= 8 });
    }
    if (fall && fall.slam) return scene.time.delayedCall(dropped > 0 ? 260 : 0, slam);
    if (lethal) return die(false);
    if (dropped === 0) return scene.time.delayedCall(110, finish); // level ground: it just steadies
    // a fall it lived through: down on hands and knees, then up
    const landPose = firstPose(unit, ['fallLand', 'kneel', 'down']);
    const risePose = firstPose(unit, ['fallRise']);
    if (landPose) pose(landPose);
    scene.time.delayedCall(KNOCK.landHold, () => {
      if (!alive()) return;
      if (risePose) pose(risePose);
      else {
        // no picture of getting up: it stands and stretches up from a crouch
        unit.knock = null; scene.showStanding(unit); unit.knock = knock;
        if (sprite) { sprite.setScale(base.sx, base.sy * 0.86); scene.tweens.add({ targets: sprite, scaleY: base.sy, duration: KNOCK.riseMs, ease: 'Back.easeOut' }); }
      }
      scene.time.delayedCall(KNOCK.riseMs, finish);
    });
  };

  // ---- the wall slam: fly in, flatten, bounce, stagger ----
  const slam = () => {
    if (!alive()) return;
    if (lethal) return die(true); // the same fly-in and squash, then it slumps and dissolves
    const len = Math.hypot(fall.toward.x, fall.toward.y) || 1;
    const wall = { x: fall.toward.x / len, y: fall.toward.y / len };
    const home = { x: view.x, y: view.y };
    const lean = Math.sign(wall.x) || 1;
    pose('hurt');
    const fly = { u: 0 };
    scene.tweens.add({
      targets: fly,
      u: 1,
      duration: KNOCK.slamIn,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        if (!alive()) return;
        view.setPosition(home.x + wall.x * KNOCK.slamReach * fly.u, home.y + wall.y * KNOCK.slamReach * 0.5 * fly.u);
        if (sprite) sprite.setAngle(-lean * 10 * fly.u); // leaning into the wall
      },
      onComplete: () => {
        if (!alive()) return;
        // flattened against it
        play('bash');
        squash(Math.abs(wall.x) > Math.abs(wall.y));
        dustPuff(scene, view.x + wall.x * 10, view.y);
        screenShake(scene, 0.005, 140);
        scene.updateHpBar(unit);
        scene.flashUnit(unit);
        scene.floatText(unit, 'Slammed! -' + fall.slam, '#ff9a5a', { pop: true });
        scene.time.delayedCall(420, () => unit.alive && scene.floatText(unit, 'Disoriented', '#e3a8ff'));
        scene.refreshStatusTags();
        // the bounce: back off the wall with a small hop, a little past where it stood
        const back = { u: 0 };
        scene.tweens.add({
          targets: back,
          u: 1,
          delay: 70,
          duration: KNOCK.slamBack,
          ease: 'Quad.easeOut',
          onUpdate: () => {
            if (!alive()) return;
            const reach = KNOCK.slamReach * (1 - 1.3 * back.u); // ends 0.3 of the reach behind home
            view.setPosition(home.x + wall.x * reach, home.y + wall.y * reach * 0.5 - 8 * Math.sin(Math.PI * back.u));
            if (sprite) sprite.setAngle(-lean * 10 * (1 - 2 * back.u)); // thrown the other way
          },
          onComplete: () => {
            if (!alive()) return;
            // the stagger: it sways twice, each smaller, as it finds its feet
            const sway = { u: 0 };
            scene.tweens.add({
              targets: sway,
              u: 1,
              duration: KNOCK.stagger,
              ease: 'Linear',
              onUpdate: () => {
                if (!alive()) return;
                const fade = 1 - sway.u;
                view.setPosition(home.x - wall.x * KNOCK.slamReach * 0.3 * fade, home.y - wall.y * KNOCK.slamReach * 0.15 * fade);
                if (sprite) sprite.setAngle(lean * 10 * fade * Math.cos(sway.u * Math.PI * 2));
              },
              onComplete: finish,
            });
          },
        });
      },
    });
  };

  // how long the whole thing takes (the scene holds the next turn until then)
  let after = 110;
  if (fall && fall.slam) after = (fall.levels > 0 ? 260 : 0) + KNOCK.slamIn + 70 + KNOCK.slamBack + KNOCK.stagger;
  else if (fall && fall.levels > 0) after = KNOCK.landHold + KNOCK.riseMs;
  if (lethal) after = 300; // the death plays on by itself
  step(1);
  return total + after;
}
