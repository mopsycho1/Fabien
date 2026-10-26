import art from './data/art.json';

// Character pictures. Which picture belongs to which unit is written in
// src/data/art.json, and the picture files live in the folder public/art.
// A unit with no entry in art.json is simply drawn as a colored circle, so the
// game keeps working while pictures are still being made.
//
// Units face one of four diagonal directions on the board:
//   downLeft, downRight (toward the player), upLeft, upRight (away)
// If a facing is missing, the mirror image of the opposite side is used.
//
// "standing" is the relaxed pose. "battle" (optional) is the same four
// facings in a fighting stance, shown instead whenever an enemy is within
// ALERT_RANGE tiles. A unit with no "battle" pictures just stays relaxed.
//
// "buffed" (optional) has a set of four facings for each Verse, for example
//   "buffed": { "stone": { ...four facings... }, "swiftness": { ... } }
// While that Verse is on the unit, those pictures replace its standing ones.
//
// "portraitHurt" (optional) is a face for when the unit is badly hurt (35%
// health or less). It replaces the calm face on the card and the turn bar.
//
// "poses" are action pictures, all drawn facing RIGHT on the screen:
//   attack, windup, ready (engaged stance), guard, dodge, cast
// Facing left uses the mirror image.
//
// A picture can be written as just a file name, or as
//   { "file": "...", "originX": 0.45, "flip": true }
// originX says where the body is across the picture (0 = left, 1 = right), so
// a lunge with a long sword still stands on the middle of its tile.
//
// "portrait" and "shout" are face pictures: a calm one for the menus and a
// battle cry for the big moments.

// Gives every picture to the loader, so they are ready before the game starts.
export function preloadArt(scene) {
  for (const [id, entry] of Object.entries(art)) {
    for (const file of allFiles(entry)) {
      scene.load.image(textureKey(id, file), './art/' + file);
    }
  }
}

function allFiles(entry) {
  const files = new Set();
  const buffed = Object.values(entry.buffed || {});
  for (const group of [entry.standing, entry.battle, ...buffed, entry.poses, entry.attack]) {
    for (const value of Object.values(group || {})) files.add(fileOf(value));
  }
  if (entry.portrait) files.add(entry.portrait);
  if (entry.shout) files.add(entry.shout);
  if (entry.portraitHurt) files.add(entry.portraitHurt);
  return [...files];
}

// The face picture for menus, or null. Pass the unit to get its hurt face
// when it is badly hurt (if it has one).
export const HURT_FACE_AT = 0.35;
export function portraitKey(id, unit = null) {
  const entry = art[id];
  if (!entry) return null;
  if (unit && entry.portraitHurt && unit.alive !== false && unit.hp / unit.maxHp <= HURT_FACE_AT) return textureKey(id, entry.portraitHurt);
  return entry.portrait ? textureKey(id, entry.portrait) : null;
}

// The battle-cry face picture for cut-ins (falls back to the calm one), or null.
export function shoutKey(id) {
  if (art[id] && art[id].shout) return textureKey(id, art[id].shout);
  return portraitKey(id);
}

function fileOf(value) {
  return typeof value === 'string' ? value : value.file;
}

function flipOf(value) {
  return typeof value === 'string' ? false : !!value.flip;
}

function originOf(value) {
  return typeof value === 'string' || value.originX === undefined ? 0.5 : value.originX;
}

// The name a picture is stored under inside Phaser.
export function textureKey(id, file) {
  return id + ':' + file;
}

// A frame is { key, flip, originX }. Flipping a frame mirrors where the body is too.
function makeFrame(id, value, mirrored) {
  const flip = mirrored ? !flipOf(value) : flipOf(value);
  const origin = originOf(value);
  return { key: textureKey(id, fileOf(value)), flip, originX: mirrored ? 1 - origin : origin };
}

// True if this unit has pictures.
export function hasArt(id) {
  return !!art[id] && !!art[id].standing;
}

// How tall (in pixels) the unit is drawn on the board when standing.
export function artHeight(id) {
  return (art[id] && art[id].height) || 96;
}

const OPPOSITE_SIDE = {
  downLeft: 'downRight',
  downRight: 'downLeft',
  upLeft: 'upRight',
  upRight: 'upLeft',
};

// How close (in tiles) an enemy must be before a unit switches from its
// relaxed standing pose to its battle stance.
export const ALERT_RANGE = 3;

// The standing picture for a facing, or null if there is none.
// alert = true asks for the battle stance, if the unit has one.
// buff is the id of a Verse on the unit (like "stone"): its pictures win.
export function standingFrame(id, facing, alert = false, buff = null) {
  const entry = art[id];
  if (!entry || !entry.standing) return null;
  let standing = alert && entry.battle ? entry.battle : entry.standing;
  if (buff && entry.buffed && entry.buffed[buff]) standing = entry.buffed[buff];
  if (standing[facing]) return makeFrame(id, standing[facing], false);
  const opposite = standing[OPPOSITE_SIDE[facing]];
  if (opposite) return makeFrame(id, opposite, true);
  const any = Object.values(standing)[0];
  return any ? makeFrame(id, any, false) : null;
}

// An action picture ("attack", "ready", ...) facing "left" or "right" on the
// screen, or null if the unit does not have that pose.
export function poseFrame(id, pose, side) {
  const entry = art[id];
  if (!entry) return null;
  const value = (entry.poses && entry.poses[pose]) || (pose === 'attack' && entry.attack && entry.attack.right);
  if (!value) return null;
  return makeFrame(id, value, side === 'left');
}

// Kept for older code: the attack pose.
export function attackFrame(id, side) {
  return poseFrame(id, 'attack', side);
}
