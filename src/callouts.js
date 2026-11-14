// Floating words (roadmap 18.6 and 17.3, M6).
//
// Two kinds of words used to float over the fighters and sat on top of each other or ran
// off the screen. Now:
//   - a number or a short reaction ("-7", "+10", "Miss", "Cured") stays over the fighter,
//     but is moved up past any other word still there and kept inside the screen;
//   - a longer callout (a skill's name, "Guard beats Press!", "Found Shea balm") goes to ONE
//     LANE under the turn strip, with the fighter's name in front, one after another.
import Phaser from 'phaser';

// Does this text stay over the fighter? Numbers, and one short word.
export function staysOnUnit(text) {
  const t = String(text).trim();
  if (/^[+\-−]?\d/.test(t)) return true;
  return t.length <= 7 && !t.includes(' ');
}

// ---------- over the fighter: no overlaps, inside the screen ----------

// Moves a new label up until it touches no other living label, then inside the camera's view.
// "live" is the scene's list of labels still on screen (this adds the new one).
export function placeLabel(scene, label) {
  const live = (scene.liveLabels = (scene.liveLabels || []).filter((l) => l.active && l.alpha > 0.05));
  const view = scene.cameras.main.worldView;
  const pad = 6;
  const hw = label.width / 2, hh = label.height / 2;
  // inside the screen first (the lane and the top strip take the top 12 percent)
  label.x = Phaser.Math.Clamp(label.x, view.x + hw + pad, view.right - hw - pad);
  label.y = Phaser.Math.Clamp(label.y, view.y + view.height * 0.12 + hh, view.bottom - hh - pad);
  const hits = (o) => Math.abs(o.x - label.x) < (o.width + label.width) / 2 && Math.abs(o.y - label.y) < (o.height + label.height) / 2 - 4;
  for (let i = 0; i < 6 && live.some(hits); i++) {
    const o = live.find(hits);
    // step sideways when there is no room above
    if (label.y - o.height < view.y + view.height * 0.12 + hh) label.x += (label.x >= o.x ? 1 : -1) * (o.width / 2 + hw);
    else label.y = o.y - (o.height + label.height) / 2 + 2;
  }
  label.x = Phaser.Math.Clamp(label.x, view.x + hw + pad, view.right - hw - pad);
  live.push(label);
  return label;
}

// ---------- the lane ----------

// Puts a callout in the lane. Returns the word's Text object (made at once, shown in its turn).
//   who: the fighter's name, or ''; side: 'hero' or 'enemy' (the name's colour)
export function laneCallout(scene, who, side, text, color) {
  const lane = (scene.lane = scene.lane && scene.lane.alive ? scene.lane : { alive: true, queue: [], showing: null });
  const s = scene.lay ? scene.lay.s : 1;
  const size = Math.round(22 * s);
  const name = scene.add.text(0, 0, who ? who + '  ' : '', { fontFamily: 'Georgia, serif', fontSize: Math.round(size * 0.8) + 'px', fontStyle: 'bold', color: side === 'enemy' ? '#ff9a8a' : '#9fd4ff', stroke: '#1a1410', strokeThickness: 4 }).setOrigin(0, 0.5);
  const word = scene.add.text(0, 0, text, { fontFamily: 'Georgia, serif', fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#1a1410', strokeThickness: 5 }).setOrigin(0, 0.5);
  const w = name.width + word.width;
  name.setX(-w / 2); word.setX(-w / 2 + name.width);
  const back = scene.add.graphics();
  back.fillStyle(0x1a1410, 0.78); back.fillRoundedRect(-w / 2 - 14 * s, -size * 0.8, w + 28 * s, size * 1.6, 8 * s);
  back.lineStyle(1, 0xb88a4a, 0.8); back.strokeRoundedRect(-w / 2 - 14 * s, -size * 0.8, w + 28 * s, size * 1.6, 8 * s);
  const box = scene.add.container(0, 0, [back, name, word]).setDepth(250).setAlpha(0);
  box.boxW = w + 28 * s; box.boxH = size * 1.6;
  scene.ui(box);
  word.lane = box; // (tests and the overlap check find the box from the word)
  lane.queue.push(box);
  if (!lane.showing) nextInLane(scene);
  return word;
}

// Where the lane sits on the screen: under the turn strip, in the middle, inside the edges.
export function lanePoint(scene, box) {
  const { W, s, m, portrait } = scene.lay;
  const y = portrait ? scene.stripY + 66 * s : m + 26 * s;
  const half = (box ? box.boxW : 0) / 2;
  return { x: Phaser.Math.Clamp(W / 2, half + m, W - half - m), y };
}

function nextInLane(scene) {
  const lane = scene.lane;
  const box = lane.queue.shift();
  lane.showing = box || null;
  if (!box) return;
  if (!box.active) return nextInLane(scene);
  const p = lanePoint(scene, box);
  // a long word on a narrow phone: shrink it to fit
  const room = scene.lay.W - 2 * scene.lay.m;
  if (box.boxW > room) { box.setScale(room / box.boxW); }
  box.setPosition(p.x, p.y + 10);
  // the more are waiting, the shorter each one stays (never under 380 ms)
  const hold = Math.max(380, 900 - lane.queue.length * 220);
  scene.tweens.add({ targets: box, alpha: 1, y: p.y, duration: 110, ease: 'Quad.easeOut' });
  scene.tweens.add({
    targets: box, alpha: 0, y: p.y - 8, delay: hold, duration: 140,
    onComplete: () => { box.destroy(); if (scene.lane === lane) nextInLane(scene); },
  });
}

// A new battle: nothing left of the last one's lane.
export function resetCallouts(scene) {
  if (scene.lane) scene.lane.alive = false;
  scene.lane = null;
  scene.liveLabels = [];
}
