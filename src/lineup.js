// The line-up for a battle (roadmap 18.30, the character select): who fights on each side.
//
// Every character in src/data/units.json can be picked, so one added later shows up by itself.
// Each keeps its own side from units.json ("hero" or "enemy"), up to MAX_PER_SIDE a side.
// The default is the map's own line-up (today's 4 v 4 on the cavern): everyone not benched, with the
// map's "alsoFighting" and "sittingOut" applied, as the battle used to work it out.
// The last line-up is remembered on this device. A character added since then joins its side's
// default team, taking the last place if the side is full. "Reset to default" goes back to the map's.
// Test mode (Settings, on for now) lets the tester pick the enemies; story mode will lock them later.
import unitData from './data/units.json';

export const MAX_PER_SIDE = 4;
// (the rule tests keep the battles they were written for: window.__sitOut lists characters left out, the two
// kings unless a test asks for them; see dev/tests/boot.cjs)
export const sitsOut = (id) => typeof window !== 'undefined' && Array.isArray(window.__sitOut) && window.__sitOut.includes(id);
const SAVE_KEY = 'fabien.lineup';
const TEST_KEY = 'fabien.testMode';

// Every character, in units.json order: { id, name, job, side }
export function allCharacters() {
  return unitData.map((u) => ({ id: u.id, name: u.name, job: u.job, side: u.side === 'enemy' ? 'enemy' : 'hero' }));
}

// The map's own line-up: { hero: [ids], enemy: [ids] }, at most MAX_PER_SIDE a side. When more can fight than
// there is room for, the newest character (the last in units.json) takes the last place: a character added later
// joins its side's default team, replacing the last default when the side is full.
export function defaultLineUp(mapData = {}) {
  const out = { hero: [], enemy: [] };
  for (const u of unitData) {
    const benched = (u.bench && !(mapData.alsoFighting || []).includes(u.id)) || (mapData.sittingOut || []).includes(u.id) || sitsOut(u.id);
    const side = u.side === 'enemy' ? 'enemy' : 'hero';
    if (benched) continue;
    if (out[side].length < MAX_PER_SIDE) out[side].push(u.id);
    else out[side][MAX_PER_SIDE - 1] = u.id;
  }
  return out;
}

// What the device remembers: { hero, enemy, known } or null
function readSaved() {
  try {
    const s = JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null');
    return s && Array.isArray(s.hero) && Array.isArray(s.enemy) ? s : null;
  } catch (e) {
    return null;
  }
}

export function saveLineUp(lineUp) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ hero: lineUp.hero, enemy: lineUp.enemy, known: allCharacters().map((c) => c.id) }));
  } catch (e) { /* private window: just not remembered */ }
}

export function forgetLineUp() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to forget */ }
}

// The line-up to start from: the remembered one (characters that no longer exist dropped, newcomers added
// to their side's default team), or the map's default.
export function startingLineUp(mapData = {}) {
  const def = defaultLineUp(mapData);
  const saved = readSaved();
  if (!saved) return def;
  const chars = allCharacters();
  const sideOf = Object.fromEntries(chars.map((c) => [c.id, c.side]));
  const out = {};
  for (const side of ['hero', 'enemy']) out[side] = saved[side].filter((id) => sideOf[id] === side).slice(0, MAX_PER_SIDE);
  const known = new Set(saved.known || []);
  for (const c of chars) {
    if (known.has(c.id) || !def[c.side].includes(c.id) || out[c.side].includes(c.id)) continue;
    // a character added since the last saved line-up joins its side's default team
    if (out[c.side].length >= MAX_PER_SIDE) out[c.side][MAX_PER_SIDE - 1] = c.id;
    else out[c.side].push(c.id);
  }
  return out;
}

// Test mode: the enemy side can be picked. On unless the tester switched it off.
export function testMode() {
  try { return window.localStorage.getItem(TEST_KEY) !== 'off'; } catch (e) { return true; }
}
export function setTestMode(on) {
  try { window.localStorage.setItem(TEST_KEY, on ? 'on' : 'off'); } catch (e) { /* not remembered */ }
}
