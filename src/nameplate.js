// The small plate over a fighter's head: health bar, health number, its place in the turn
// order (roadmap 18.6 and 17.2, M6). Suleiman asked for the bars to be gone (14 Nov), so the
// plate is hidden by default. It flashes when the fighter is hurt or healed, and it shows
// while the fighter is tapped or can be chosen as a target. Settings can switch it to
// "always". The numbers are in src/data/nameplates.json, with the slot for his class plates.
import Phaser from 'phaser';
import rules from './data/nameplates.json';

export const plateRules = rules;
const KEY = 'fabien.hpBars';
const BAR_SIDE = 28; // where the health number starts, right of the 48 pixel bar

// 'hit' or 'always': the player's own choice if they made one, else the data file's.
export function plateMode() {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'hit' || saved === 'always') return saved;
  } catch (e) { /* no storage (private window): the default */ }
  return rules.show === 'always' ? 'always' : 'hit';
}

export function setPlateMode(mode) {
  try { window.localStorage.setItem(KEY, mode); } catch (e) { /* not remembered, still works */ }
}

// The pictures of the class plates named in nameplates.json, for the loader: [{ key, file }].
export function classPlateFiles() {
  const files = rules.classPlates.files || {};
  return Object.keys(files).filter((job) => files[job]).map((job) => ({ key: 'plate:' + job, file: 'art/ui/nameplates/' + files[job] }));
}

// Builds the plate from the bar pieces BattleScene made. Returns the container (hidden).
//   topY: how far above the feet the bar sits; job: the class id, for his plate picture.
export function buildPlate(scene, { topY, barBack, hpFill, job, hp, maxHp }) {
  const number = scene.add
    .text(BAR_SIDE, -topY, hp + '/' + maxHp, { fontFamily: 'Georgia, serif', fontSize: '16px', fontStyle: 'bold', color: '#f1e6c8', stroke: '#1a1410', strokeThickness: 4 })
    .setOrigin(0, 0.5); // to the right of the bar, so the status icons above stay clear
  const parts = [barBack, hpFill, number];
  // Suleiman's class plate, when its picture is there (the slot)
  const slot = rules.classPlates;
  if (scene.textures.exists('plate:' + job)) {
    const art = scene.add.image(0, 0, 'plate:' + job);
    const k = slot.height / art.height;
    art.setScale(k).setOrigin(0.5, slot.barAt).setPosition(0, -topY);
    const w = art.width * k * slot.barWidth;
    barBack.setPosition(-w / 2, -topY).setSize(w, barBack.height);
    hpFill.setPosition(-w / 2, -topY).setSize(w, hpFill.height);
    parts.unshift(art);
  }
  const plate = scene.add.container(0, 0, parts);
  plate.number = number;
  plate.setAlpha(plateMode() === 'always' ? 1 : 0);
  return plate;
}

function fadeTo(scene, unit, alpha) {
  const p = unit.plate;
  if (!p || !p.active || p.goal === alpha) return;
  p.goal = alpha;
  if (p.fade) p.fade.stop();
  p.fade = scene.tweens.add({ targets: p, alpha, duration: alpha ? 120 : 260 });
}

// Hides the plate again unless something still wants it shown.
export function settlePlate(scene, unit) {
  if (!unit.plate || !unit.plate.active) return;
  const on = unit.alive && (plateMode() === 'always' || unit.plateHold || scene.time.now < (unit.plateUntil || 0));
  fadeTo(scene, unit, on ? 1 : 0);
}

// Shows it for a moment (a hit, a heal, a tap).
export function flashPlate(scene, unit, ms = rules.flashMs) {
  if (!unit.plate || !unit.plate.active) return;
  unit.plateUntil = Math.max(unit.plateUntil || 0, scene.time.now + ms);
  settlePlate(scene, unit);
  scene.time.delayedCall(ms + 30, () => settlePlate(scene, unit));
}

// Keeps it shown (on = true) while the fighter can be chosen as a target, or lets it go.
export function holdPlate(scene, unit, on) {
  if (!!unit.plateHold === !!on) return;
  unit.plateHold = !!on;
  settlePlate(scene, unit);
}

// The health number on the plate.
export function setPlateNumber(unit) {
  if (unit.plate && unit.plate.number && unit.plate.number.active) unit.plate.number.setText(Math.max(0, unit.hp) + '/' + unit.maxHp);
}

// The box a fighter's icon row takes on the board, or null if it shows none (checklist D1).
export function tagBox(unit) {
  const row = unit.tagRow;
  if (!row || !row.active || !row.rowWidth || row.rowWidth <= 0) return null;
  const w = row.rowWidth, h = 28;
  return new Phaser.Geom.Rectangle(unit.view.x + row.x - w / 2, unit.view.y + row.y - h / 2, w, h);
}

// Icon rows of fighters standing together must not sit on each other (17.2, D1): a row that
// would touch one already placed is lifted by its own height (twice at most).
export function spreadTagRows(units) {
  const placed = [];
  const list = units.filter((u) => u.alive && u.tagRow && u.tagRow.active && u.view && u.view.active).sort((a, b) => b.view.y - a.view.y);
  for (const u of list) {
    u.tagRow.y = -u.topY - 19;
    for (let i = 0; i < 2; i++) {
      const box = tagBox(u);
      if (!box || !placed.some((o) => Phaser.Geom.Rectangle.Overlaps(o, box))) break;
      u.tagRow.y -= 30;
    }
    const box = tagBox(u);
    if (box) placed.push(box);
  }
}
