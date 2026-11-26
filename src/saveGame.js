// Save and resume (roadmap 18.16, M16; checklist H2). The battle is saved on the device at
// the start of every turn. If the page is closed or reloaded, the title screen offers
// "Continue the battle", which comes back at the start of the turn that was being played.
//
// What is saved: every fighter's own numbers and conditions (health, MP, place, Verses,
// cooldowns, bag, clash, Poise...), the turn count, what has been dug up, Tayo's rocks.
// What is not: things that live only as pictures for a moment (a Husk decoy, a smoke cloud):
// a hidden fighter comes back visible.
const KEY = 'fabien.save.v1';

// Fields of a fighter that are pictures or working values, never saved.
const SKIP = new Set(['view', 'body', 'sprite', 'hpFill', 'plate', 'rims', 'tagRow', 'idleTargets', 'idleTween', 'orderNumber', 'lowGlow', 'knock', 'knockPending', 'pushedFrom', 'plateHold', 'plateUntil', 'shownHp', 'cardFreeAt', 'dodgeToken', 'hidden', 'smokeHidden', 'echoReady', 'wasWeak', 'restY', 'engagement',
  // sizes worked out from the pictures when the battle is built
  'artScale', 'baseScale', 'frameScale', 'topY', 'centerY', 'hitRadius', 'bodyHalfWidth', 'ringColor', 'hasEnchantedArt']);

// Turns a value into plain data. A reference to a fighter becomes { __unit: id }; pictures,
// tweens and functions are left out (undefined).
function pack(value, units, depth = 0) {
  if (value === null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value !== 'object' || depth > 5) return undefined;
  if (units.includes(value)) return { __unit: value.id };
  if (Array.isArray(value)) return value.map((v) => pack(v, units, depth + 1)).filter((v) => v !== undefined);
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && !(proto.constructor && proto.constructor.name === 'Object')) return undefined; // a Phaser object, not plain data
  const out = {};
  for (const k of Object.keys(value)) {
    const v = pack(value[k], units, depth + 1);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function unpack(value, byId) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => unpack(v, byId));
  if (value.__unit !== undefined) return byId[value.__unit] || null;
  const out = {};
  for (const k of Object.keys(value)) out[k] = unpack(value[k], byId);
  return out;
}

// The battle as plain data. Called by the battle between two turns.
export function snapshot(scene) {
  const units = scene.units;
  return {
    v: 1,
    map: scene.mapName,
    stepIndex: scene.stepIndex,
    turnCount: scene.turnCount,
    lastEnemyClashTurn: scene.lastEnemyClashTurn === undefined ? null : scene.lastEnemyClashTurn,
    damageTaken: { ...(scene.damageTaken || {}) },
    // who fights on which side (1.105): Continue must build the same fighters, or the save does not match them
    lineUp: { hero: units.filter((u) => u.side === 'hero').map((u) => u.id), enemy: units.filter((u) => u.side !== 'hero').map((u) => u.id) },
    units: units.map((u) => {
      const data = {};
      for (const k of Object.keys(u)) {
        if (SKIP.has(k)) continue;
        const v = pack(u[k], units);
        if (v !== undefined) data[k] = v;
      }
      // a clash is one object shared by the two in it: saved once, as its momentum track
      if (u.engagement && u.engagement.first === u) data.duelTrack = u.engagement.track;
      return { id: u.id, data };
    }),
    sites: (scene.sites || []).map((s) => ({ col: s.col, row: s.row, prop: s.prop, items: s.items.slice(), blocking: !!s.blocking, dug: !!s.dug })),
    spikes: (scene.spikes || []).map((s) => ({ col: s.col, row: s.row, owner: s.owner ? s.owner.id : null, turnsLeft: s.turnsLeft })),
  };
}

export function writeSave(scene) {
  try { window.localStorage.setItem(KEY, JSON.stringify(snapshot(scene))); return true; } catch (e) { return false; /* no storage, or full: the game goes on unsaved */ }
}

// The saved battle, or null. It must be this version and name every fighter by id.
export function readSave() {
  try {
    const save = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    return save && save.v === 1 && Array.isArray(save.units) ? save : null;
  } catch (e) { return null; }
}

export function clearSave() {
  try { window.localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
}

// Puts the saved numbers back on the fighters. Returns false (and changes nothing) if the
// save does not match the fighters on the board. The battle then draws what changed.
export function applySave(scene, save) {
  const byId = Object.fromEntries(scene.units.map((u) => [u.id, u]));
  if (save.units.length !== scene.units.length || save.units.some((s) => !byId[s.id])) return false;
  for (const s of save.units) {
    const u = byId[s.id];
    const data = unpack(s.data, byId);
    const track = data.duelTrack; delete data.duelTrack;
    for (const k of Object.keys(data)) {
      const d = Object.getOwnPropertyDescriptor(u, k);
      if (SKIP.has(k) || (d && !d.writable && !d.set)) continue; // (never a picture's field or a worked-out one)
      u[k] = data[k];
    }
    u.hidden = false; u.smokeHidden = false; u.echoReady = false;
    if (track !== undefined) u.savedTrack = track;
  }
  // the clashes: one shared object for each pair again
  for (const u of scene.units) {
    if (u.savedTrack === undefined) continue;
    const foe = u.engagedWith;
    if (foe && foe.alive && u.alive) { const e = { first: u, second: foe, track: u.savedTrack }; u.engagement = e; foe.engagement = e; }
    delete u.savedTrack;
  }
  for (const u of scene.units) if (u.engagedWith && (!u.engagement || !u.engagedWith.alive)) { u.engagedWith = null; u.engagement = null; }
  scene.turnCount = save.turnCount;
  scene.lastEnemyClashTurn = save.lastEnemyClashTurn === null ? undefined : save.lastEnemyClashTurn;
  scene.damageTaken = { ...(save.damageTaken || {}) };
  return true;
}
