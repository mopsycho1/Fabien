// Graphics 2.0 switches (roadmap 18.56, Baiyee 26 Nov): every new look sits behind its own Settings row
// and was Off until Baiyee approved it. The choice is remembered on the device.
// 1.123 (Baiyee 27 Nov): Weapon streaks and Fighter lighting are approved and On by default ("on": true below); a player
// who switched one Off keeps it Off. Mood stays Off until switched on.
// For a look at everything at once, open the game with ?g2=all in the address (or ?g2=streaks,mood to pick some):
// that turns those on and remembers it. ?g2=off turns them all off again.

// The looks, in the order the Settings sheet shows them. name: the word on the row.
export const LOOKS = [
  { id: 'streaks', name: 'Weapon streaks', on: true }, // 18.57 (On by default since 1.123)
  { id: 'lighting', name: 'Fighter lighting', on: true }, // 18.58 (On by default since 1.123)
  { id: 'mood', name: 'Mood', on: false }, // 18.59
];

const KEY = 'fabien.look2.';
const listeners = new Set(); // (see onLookChange)
const state = {};
for (const l of LOOKS) {
  // what the player chose on this device, or the look's default when he never touched it
  try { const v = localStorage.getItem(KEY + l.id); state[l.id] = v === 'on' || (v !== 'off' && !!l.on); } catch (e) { state[l.id] = !!l.on; }
}
// the address can switch them (?g2=all, ?g2=off, ?g2=streaks,mood)
try {
  const q = new URLSearchParams(window.location.search).get('g2');
  if (q) {
    const want = q === 'all' ? LOOKS.map((l) => l.id) : q === 'off' ? [] : q.split(',');
    for (const l of LOOKS) setLook(l.id, want.includes(l.id));
  }
} catch (e) { /* no address (tests) */ }

// Is this new look switched on?
export function lookOn(id) {
  return !!state[id];
}

// Switch a look on or off and remember it.
export function setLook(id, on) {
  state[id] = !!on;
  try { localStorage.setItem(KEY + id, on ? 'on' : 'off'); } catch (e) { /* private window: just for now */ }
  for (const fn of listeners) fn(id, !!on);
}

// Code that must react when a look changes (the lights, the colour grade) listens here.
export function onLookChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
