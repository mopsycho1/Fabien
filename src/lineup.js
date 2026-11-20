// The line-up for a battle (roadmap 18.30, the character select): who fights on each side.
//
// Every character in src/data/units.json can be picked, so one added later shows up by itself.
// Each has a home side in units.json ("hero" or "enemy"), shown as a tag; it does not limit where it can go:
// the roster is one shared pool and any character can fight on either side (20 Nov). Up to MAX_PER_SIDE a side.
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
  const exists = new Set(chars.map((c) => c.id));
  // Any character can stand on either side (20 Nov): a saved id only has to still exist, and be on one side only
  const out = { hero: [], enemy: [] };
  const used = new Set();
  for (const side of ['hero', 'enemy']) {
    for (const id of saved[side]) {
      if (!exists.has(id) || used.has(id) || out[side].length >= MAX_PER_SIDE) continue;
      out[side].push(id);
      used.add(id);
    }
  }
  const known = new Set(saved.known || []);
  for (const c of chars) {
    if (known.has(c.id) || !def[c.side].includes(c.id) || used.has(c.id)) continue;
    // a character added since the last saved line-up joins its side's default team
    if (out[c.side].length >= MAX_PER_SIDE) out[c.side][MAX_PER_SIDE - 1] = c.id;
    else out[c.side].push(c.id);
    used.add(c.id);
  }
  return out;
}

// Which side each picked character fights on: { id: 'hero' | 'enemy' } (the battle uses this, so a character
// from one side can stand on the other)
export function sidesOf(lineUp) {
  const out = {};
  if (!lineUp) return out;
  for (const id of lineUp.hero || []) out[id] = 'hero';
  for (const id of lineUp.enemy || []) out[id] = 'enemy';
  return out;
}

// Test mode: the enemy side can be picked. On unless the tester switched it off.
export function testMode() {
  try { return window.localStorage.getItem(TEST_KEY) !== 'off'; } catch (e) { return true; }
}
export function setTestMode(on) {
  try { window.localStorage.setItem(TEST_KEY, on ? 'on' : 'off'); } catch (e) { /* not remembered */ }
}

// Who is on the board for a battle, as units.json entries with their side for this battle (18.47).
// The battle builds its fighters from this list, and the loader reads the same list to fetch only
// those fighters' pictures, so the two can never disagree.
//   chosenLineUp: what the character select picked ({ hero, enemy }), or null for the map's own team.
// (the bot tests can name who sits out instead: window.__bench, a list of ids; window.__sides moves a
// character to the other side.)
export function fieldedEntries(mapData, chosenLineUp) {
  const bench = typeof window !== 'undefined' ? window.__bench : null;
  const sides = typeof window !== 'undefined' ? window.__sides : null;
  const fallback = !chosenLineUp && !bench ? defaultLineUp(mapData) : null;
  const picked = chosenLineUp ? [...chosenLineUp.hero, ...chosenLineUp.enemy] : fallback ? [...fallback.hero, ...fallback.enemy] : null;
  const benched = (entry) =>
    sitsOut(entry.id) ||
    (bench
      ? bench.includes(entry.id)
      : picked
        ? !picked.includes(entry.id)
        : (entry.bench && !(mapData.alsoFighting || []).includes(entry.id)) || (mapData.sittingOut || []).includes(entry.id));
  const lineSides = sidesOf(chosenLineUp);
  return unitData
    .filter((entry) => !benched(entry))
    .map((entry) => {
      const side = (sides && sides[entry.id]) || lineSides[entry.id] || entry.side;
      return side !== entry.side ? { ...entry, side } : entry;
    });
}
