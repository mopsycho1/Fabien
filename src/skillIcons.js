// One small icon per skill, by its element (HUD polish, 20 Nov: "fire, earth, lightning, spirit and so on").
// The pictures are small vector glyphs drawn here (no files to load): a dark rounded tile with a thin edge and the
// glyph in the element's own colour (the colours of the effects, fxLayers.js). The HTML HUD puts one in front of
// every skill in the list and in the skill panel (src/domHud.js). Suleiman can swap any of them for his own art later:
// the one place to change is ELEMENT_ART below.
import spells from './data/spells.json';

// colour of each element (the glow colour of its effects, src/fxLayers.js)
export const ELEMENT_COLOR = {
  fire: '#ff7a2e', water: '#5fc8c0', earth: '#c98f4e', lightning: '#9db8ff', wind: '#bfe9ff', spirit: '#ffd27a',
  heal: '#9fe07a', poison: '#8fdc5a', hex: '#b070ff', steel: '#ffd9a0', sound: '#ffe9c4',
};

// The glyph of each element, drawn in a 24 by 24 box (stroke or fill in the element's colour).
const ELEMENT_ART = {
  fire: '<path d="M12 2.5C13 6.5 18 8.5 18 14.2A6 6 0 0 1 6 14.2C6 11.4 7.8 9.8 9 7.6C9.6 9.2 10.6 10.2 11.6 10.4C11 7.6 11 5 12 2.5Z" fill="currentColor"/>',
  water: '<path d="M12 3C12 3 5.5 10.2 5.5 14.8A6.5 6.5 0 0 0 18.5 14.8C18.5 10.2 12 3 12 3Z" fill="currentColor"/><path d="M9 15.5A3 3 0 0 0 12 18.2" stroke="#0b1a1a" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  earth: '<path d="M3.5 18L8 8L13.5 5.5L20.5 12L18.5 19.5H6.5Z" fill="currentColor"/><path d="M8 8L11.2 14.4L20.5 12M11.2 14.4L6.5 19.5" stroke="#1a1008" stroke-width="1.2" fill="none" stroke-linejoin="round"/>',
  lightning: '<path d="M13.6 2L5.4 13.6H11L9.4 22L18.6 10H12.6Z" fill="currentColor"/>',
  wind: '<path d="M3 8.5H14.2A2.6 2.6 0 1 0 11.6 5.9M3 13H18A2.8 2.8 0 1 1 15.2 15.8M3 17.8H10.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  spirit: '<path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8Z" fill="currentColor"/>',
  heal: '<path d="M4.5 19.5C4.5 9.5 10.5 4 20 4C20 13.5 14.5 19.5 4.5 19.5Z" fill="currentColor"/><path d="M5 19L13.5 10.5" stroke="#10200a" stroke-width="1.3" stroke-linecap="round"/>',
  poison: '<path d="M12 3C12 3 6 9.6 6 13.8A6 6 0 0 0 18 13.8C18 9.6 12 3 12 3Z" fill="currentColor"/><circle cx="10" cy="14" r="1.3" fill="#0f1c08"/><circle cx="13.6" cy="16" r="1" fill="#0f1c08"/>',
  hex: '<path d="M2 12C6 6.2 18 6.2 22 12C18 17.8 6 17.8 2 12Z" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#1a0c2a"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  steel: '<path d="M18.6 3.2L20.8 3.4L20.6 5.6L9.6 16.6L7.4 14.4Z" fill="currentColor"/><path d="M5.2 15.6L8.4 18.8M4 20L7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sound: '<path d="M9 8.4A5 5 0 0 1 9 15.6M13 5.6A9 9 0 0 1 13 18.4M17 3A13 13 0 0 1 17 21" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="5" cy="12" r="1.8" fill="currentColor"/>',
};

// Which element a skill is. A skill's own "element" in spells.json when it names one of ours; else by its id or
// its kind. Moves with a weapon (spear throw, lunge, charge...) are "steel"; the kings' Verse skills follow the Verse.
const BY_ID = {
  swiftness: 'wind', stone: 'earth', fury: 'fire', slow: 'hex', renewal: 'heal',
  herbs: 'heal', poison: 'poison', haunt: 'spirit', infuse: 'spirit', husk: 'wind', smoke: 'wind', meditate: 'spirit',
  galeCut: 'wind', rendingDraw: 'fire', unmoved: 'earth', singularity: 'hex', claim: 'spirit', mantle: 'spirit',
  verseSwap: 'spirit', enchant: 'spirit', earthDrive: 'earth', clap: 'sound',
};
const BY_KIND = { heal: 'heal', poison: 'poison', hex: 'hex', haunt: 'spirit', infuse: 'spirit', buff: 'spirit', rest: 'spirit', escape: 'wind', smoke: 'wind', enchant: 'spirit',
  earthDrive: 'earth', clap: 'sound', sunder: 'steel', cleave: 'steel', hook: 'steel', grip: 'steel', drawn: 'steel', gale: 'wind', rending: 'fire', unmoved: 'earth',
  singularity: 'hex', claim: 'spirit', mantle: 'spirit', swap: 'spirit' };
export function skillElement(id) {
  const sp = spells[id] || {};
  if (BY_ID[id]) return BY_ID[id];
  if (sp.element && ELEMENT_ART[sp.element]) return sp.element;
  if (BY_KIND[sp.kind]) return BY_KIND[sp.kind];
  return 'steel';
}

// The icon as an inline picture of the given size (page pixels, or any CSS length).
export function skillIconSvg(el, size) {
  const c = ELEMENT_COLOR[el] || ELEMENT_COLOR.steel;
  const art = ELEMENT_ART[el] || ELEMENT_ART.steel;
  const d = typeof size === 'number' ? size + 'px' : size;
  return '<svg class="sk" viewBox="0 0 24 24" style="width:' + d + ';height:' + d + ';color:' + c + '"><rect x="0.6" y="0.6" width="22.8" height="22.8" rx="4" fill="rgba(14,10,6,0.78)" stroke="' + c + '" stroke-opacity="0.55" stroke-width="1"/><g transform="translate(2.6 2.6) scale(0.78)">' + art + '</g></svg>';
}
