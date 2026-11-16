import clashGifs from './data/clashGifs.json';

// Suleiman's clash GIFs (roadmap 6.62): painted scenes of Gaha and the Bull Commander trading
// spear and mace blows, on a flat brown floor. They are not see-through, so each one is shown as a
// framed panel in the clash scene (the floor stays inside the frame), at his own frame delay.
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
export function hasClashGif(a, b) {
  const ids = [a.id, b.id];
  return ids.includes(CLASH_GIF_PAIR[0]) && ids.includes(CLASH_GIF_PAIR[1]);
}

// Queues every frame of the three GIFs, if the pair is in this battle (the loader is started by the caller).
// Returns how many pictures it queued.
export function loadClashGifs(scene, units) {
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

// The window the panel fills, from the layout: as tall as the clash banners (about half the screen on
// a wide window, a third when the phone is upright), as wide as its picture is, never wider than
// 94 percent of the screen. Returns { x, y, w, h } with (x, y) the middle.
export function panelWindow(lay, name) {
  const g = clashGifs.gifs[name];
  const { W, H, portrait } = lay;
  let h = H * (portrait ? 0.3 : 0.52);
  let w = h * (g.w / g.h);
  if (w > W * 0.94) {
    w = W * 0.94;
    h = w * (g.h / g.w);
  }
  return { x: W / 2, y: Math.round(H * (portrait ? 0.42 : 0.44)), w, h };
}

// Plays one GIF once as a framed panel in the clash window, then calls onDone.
// "ui" puts a picture on the screen layer (the scene's own this.ui).
export function playClashGif(scene, name, ui, onDone) {
  const g = clashGifs.gifs[name];
  const win = panelWindow(scene.lay, name);
  const delay = (i) => (Array.isArray(g.ms) ? g.ms[i] : g.ms);
  const depth = 258;
  const img = ui(scene.add.image(win.x, win.y, key(name, 1)).setDepth(depth).setDisplaySize(win.w, win.h).setAlpha(0));
  // the frame: a dark rim, a gold line and a thin light line inside, drawn round the picture
  const fx = win.x - win.w / 2;
  const fy = win.y - win.h / 2;
  const frame = ui(scene.add.graphics().setDepth(depth + 1).setAlpha(0));
  frame.lineStyle(10, 0x1a1410, 0.95).strokeRect(fx - 5, fy - 5, win.w + 10, win.h + 10);
  frame.lineStyle(4, 0xe8c070, 1).strokeRect(fx - 2, fy - 2, win.w + 4, win.h + 4);
  frame.lineStyle(1, 0xfff0c8, 0.7).strokeRect(fx + 3, fy + 3, win.w - 6, win.h - 6);
  const parts = [img, frame];
  scene.tweens.add({ targets: parts, alpha: 1, duration: 120, ease: 'Quad.easeOut' });
  let step = 0;
  const next = () => {
    if (!img.active) return;
    step++;
    if (step < g.frames) {
      img.setTexture(key(name, step + 1));
      scene.time.delayedCall(delay(step), next);
    } else {
      // the last frame stays a moment, then the panel fades
      scene.time.delayedCall(220, () => {
        scene.tweens.add({ targets: parts, alpha: 0, duration: 160, onComplete: () => { parts.forEach((o) => o.destroy()); onDone(); } });
      });
    }
  };
  scene.time.delayedCall(delay(0) + 120, next);
}
