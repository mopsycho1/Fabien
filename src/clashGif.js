import clashGifs from './data/clashGifs.json';

// Suleiman's clash GIFs (roadmap 6.62): painted scenes of Gaha and the Bull Commander trading
// spear and mace blows, on a flat brown floor. They are not see-through, so each one is shown as a
// framed panel in the clash scene (the floor stays inside the frame), at his own frame delay. (6.80: now played on the board, see below.)
//
// When it plays: when a clash between the pair opens, after the two banners have slammed and gone.
// Which one: the three take turns (never the same one twice in a row).
// Nothing here changes a number in the battle: it is a cut-in, like the banners.
// The frames are public/art/clashgif/<name>_<n>.jpg (dev/tools/make_clash_gifs.py cuts them),
// loaded in the background once a battle with both fighters has started.

// the pair they show: [a hero's art id, an enemy's art id]
export const CLASH_GIF_PAIR = ['h2', 'e2'];
const NAMES = Object.keys(clashGifs.gifs);
const key = (name, i) => 'clashgif:' + name + ':' + i;
let lastName = null;

// True if this clash is Gaha against the Bull Commander (either way round).
// Settings: Clash films (1.101, 22 Nov, Suleiman: "we can actually just get rid of the gifs and speed up the animations we have
// currently to give the illusion of fluid combat"). Off by default; a player can switch them back on. Remembered on the device.
const MODE_KEY = 'fabien.clashFilms';
export function clashFilmsOn() {
  try { return window.localStorage.getItem(MODE_KEY) === 'on'; } catch (e) { return false; }
}
export function setClashFilms(on) {
  try { window.localStorage.setItem(MODE_KEY, on ? 'on' : 'off'); } catch (e) { /* not remembered, still works */ }
}

export function hasClashGif(a, b) {
  if (!clashFilmsOn()) return false;
  const ids = [a.id, b.id];
  return ids.includes(CLASH_GIF_PAIR[0]) && ids.includes(CLASH_GIF_PAIR[1]);
}

// Queues every frame of the three GIFs, if the pair is in this battle (the loader is started by the caller).
// Returns how many pictures it queued.
export function loadClashGifs(scene, units) {
  if (!clashFilmsOn()) return 0; // switched off: nothing to fetch
  const ids = units.map((u) => u.id);
  if (!CLASH_GIF_PAIR.every((id) => ids.includes(id))) return 0;
  let queued = 0;
  for (const name of NAMES) {
    for (let i = 1; i <= clashGifs.gifs[name].frames; i++) {
      if (scene.textures.exists(key(name, i))) continue;
      scene.load.image(key(name, i), './art/clashgif/' + name + '_' + i + '.jpg');
      queued++;
    }
  }
  return queued;
}

// True when every frame of this GIF is loaded.
function ready(scene, name) {
  for (let i = 1; i <= clashGifs.gifs[name].frames; i++) if (!scene.textures.exists(key(name, i))) return false;
  return true;
}

// The next GIF in turn that is loaded, or null.
export function pickClashGif(scene) {
  const loaded = NAMES.filter((n) => ready(scene, n));
  if (loaded.length === 0) return null;
  const others = loaded.filter((n) => n !== lastName);
  const pool = others.length ? others : loaded;
  lastName = pool[Math.floor(Math.random() * pool.length)];
  return lastName;
}

// 6.80 (decided 19 Nov, Baiyee: "over the two fighters on the board, no separate panel"): the GIF no longer plays as a framed
// panel on the screen layer. It plays IN the battlefield, on the two fighters' own tiles: the real fighters are hidden for the
// length of the clip and his painted pair stands in their place, as big as the game's own fighters (a little bigger, it is a
// moment), with the edges of the painting feathered so the brown floor melts into the cavern's instead of ending in a frame.
// Gaha is on the painting's left; when the real Gaha stands to the right of the Bull on the screen the picture is mirrored.
const FEATHER_X = 0.09;    // how much of the width fades at each side
const FEATHER_Y = 0.12;    // and of the height at the top and the bottom
const FEET = 0.84;         // where the painted fighters' feet are down the picture (the middle of the pair stands on the real tiles' middle)
const FIGURE = 0.62;       // how much of the picture's height the painted Gaha fills (his spear included)
const BIGGER = 1.2;        // drawn this much bigger than the game's own Gaha
const softKey = (name, i) => 'clashgif:soft:' + name + ':' + i;

// Bakes the feathered copy of every frame of a GIF (once). Returns true when all are there.
export function bakeSoftFrames(scene, name) {
  const g = clashGifs.gifs[name];
  for (let i = 1; i <= g.frames; i++) {
    if (scene.textures.exists(softKey(name, i))) continue;
    if (!scene.textures.exists(key(name, i))) return false;
    const src = scene.textures.get(key(name, i)).getSourceImage();
    const w = src.width, h = src.height;
    const tex = scene.textures.createCanvas(softKey(name, i), w, h);
    const ctx = tex.getContext();
    ctx.drawImage(src, 0, 0);
    // two linear fades multiplied together: left and right, then top and bottom (destination-in keeps the picture where alpha is 1)
    ctx.globalCompositeOperation = 'destination-in';
    let grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(FEATHER_X, 'rgba(0,0,0,1)');
    grad.addColorStop(1 - FEATHER_X, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(FEATHER_Y, 'rgba(0,0,0,1)');
    grad.addColorStop(1 - FEATHER_Y, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }
  return true;
}

// Where and how big the painting stands on the board: { x, y, scale, flip } for the two fighters on the screen (their
// views' feet), the picture's size and the height of the game's own Gaha. Pure, so the tests can check it.
export function boardPlacement(gahaView, bullView, gahaBodyH, g) {
  const scale = (gahaBodyH * BIGGER) / (g.h * FIGURE);
  return { x: (gahaView.x + bullView.x) / 2, y: (gahaView.y + bullView.y) / 2, scale, flip: gahaView.x > bullView.x };
}

// Plays one GIF once over the two fighters, then calls onDone. "a" and "b" are the two units of the clash.
export function playClashGif(scene, name, a, b, onDone) {
  const g = clashGifs.gifs[name];
  const gaha = a.id === CLASH_GIF_PAIR[0] ? a : b;
  const bull = gaha === a ? b : a;
  if (!bakeSoftFrames(scene, name) || !gaha.view || !bull.view) { onDone(); return; }
  const place = boardPlacement(gaha.view, bull.view, gaha.topY - 12, g);
  const delay = (i) => (Array.isArray(g.ms) ? g.ms[i] : g.ms);
  const depth = Math.max(gaha.view.depth, bull.view.depth) + 60;   // over the fighters and their effects, under the screen layer (250)
  const img = scene.add.image(place.x, place.y + 6, softKey(name, 1)).setOrigin(0.5, FEET).setScale(place.scale).setFlipX(place.flip).setDepth(depth).setAlpha(0);
  // the real fighters step out for the length of the clip (their own views carry their bars and rings)
  const hidden = [gaha, bull].map((u) => ({ u, alpha: u.view.alpha }));
  hidden.forEach(({ u }) => u.view.setAlpha(0));
  const restore = () => hidden.forEach(({ u, alpha }) => { if (u.view && u.view.active) u.view.setAlpha(alpha); });
  scene.tweens.add({ targets: img, alpha: 1, duration: 140, ease: 'Quad.easeOut' });
  let step = 0;
  const next = () => {
    if (!img.active) { restore(); return; }
    step++;
    if (step < g.frames) {
      img.setTexture(softKey(name, step + 1));
      scene.time.delayedCall(delay(step), next);
    } else {
      // the last frame stays a moment, then the painting fades into the real fighters
      scene.time.delayedCall(220, () => {
        restore();
        scene.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => { img.destroy(); onDone(); } });
      });
    }
  };
  scene.time.delayedCall(delay(0) + 140, next);
}
