// How the board marks who is who (21 Nov, Baiyee, from Suleiman's mock-up). "tiles" (the default): a gold diamond outline on
// the tile of the fighter whose turn it is, a red one under each enemy (with a small red health bar over its head), a faint
// pale one under each ally. "rings": the old thin ring on the ground, in the team's colour. Settings has the choice; it is
// remembered on the device.
const KEY = 'fabien.markers';

export function markerMode() {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'tiles' || saved === 'rings') return saved;
  } catch (e) { /* no storage (private window): the default */ }
  return 'tiles';
}

export function setMarkerMode(mode) {
  try { window.localStorage.setItem(KEY, mode); } catch (e) { /* not remembered, still works */ }
}

// The look of a tile marker for a state: line colour and width, fill, and how bright.
export const TILE_LOOK = {
  active: { color: 0xffd36b, width: 4, fill: 0.2, alpha: 1, glow: 0.4 },
  target: { color: 0xff6b5a, width: 3.5, fill: 0.2, alpha: 1, glow: 0.3 },
  enemy: { color: 0xe0503f, width: 2.2, fill: 0.07, alpha: 0.9, glow: 0.12 },
  hero: { color: 0xe8dcc0, width: 1.6, fill: 0.03, alpha: 0.5, glow: 0 },
};
