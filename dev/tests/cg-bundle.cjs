var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/clashGif.js
var clashGif_exports = {};
__export(clashGif_exports, {
  CLASH_GIF_PAIR: () => CLASH_GIF_PAIR,
  hasClashGif: () => hasClashGif,
  loadClashGifs: () => loadClashGifs,
  panelWindow: () => panelWindow,
  pickClashGif: () => pickClashGif,
  playClashGif: () => playClashGif
});
module.exports = __toCommonJS(clashGif_exports);

// src/data/clashGifs.json
var clashGifs_default = {
  note: "Suleiman 15 Nov, clash GIFs (roadmap 6.62). Frames are public/art/clashgif/<name>_<n>.jpg; ms is his own frame delay. Shown by src/clashGif.js as a framed panel when Gaha clashes with the Bull Commander.",
  gifs: {
    dance: {
      frames: 9,
      w: 507,
      h: 336,
      ms: 140,
      what: "Gaha and the Bull circle each other, then trade a blow"
    },
    strike: {
      frames: 8,
      w: 439,
      h: 439,
      ms: 150,
      what: "Gaha drives the spear in; the spark where it meets the mace"
    },
    duel: {
      frames: 6,
      w: 720,
      h: 358,
      ms: 150,
      what: "spear and mace trade blows, a wide view"
    }
  }
};

// src/clashGif.js
var CLASH_GIF_PAIR = ["h2", "e2"];
var NAMES = Object.keys(clashGifs_default.gifs);
var key = (name, i) => "clashgif:" + name + ":" + i;
var lastName = null;
function hasClashGif(a, b) {
  const ids = [a.id, b.id];
  return ids.includes(CLASH_GIF_PAIR[0]) && ids.includes(CLASH_GIF_PAIR[1]);
}
function loadClashGifs(scene, units) {
  const ids = units.map((u) => u.id);
  if (!CLASH_GIF_PAIR.every((id) => ids.includes(id))) return 0;
  let queued = 0;
  for (const name of NAMES) {
    for (let i = 1; i <= clashGifs_default.gifs[name].frames; i++) {
      if (scene.textures.exists(key(name, i))) continue;
      scene.load.image(key(name, i), "./art/clashgif/" + name + "_" + i + ".jpg");
      queued++;
    }
  }
  return queued;
}
function ready(scene, name) {
  for (let i = 1; i <= clashGifs_default.gifs[name].frames; i++) if (!scene.textures.exists(key(name, i))) return false;
  return true;
}
function pickClashGif(scene) {
  const loaded = NAMES.filter((n) => ready(scene, n));
  if (loaded.length === 0) return null;
  const others = loaded.filter((n) => n !== lastName);
  const pool = others.length ? others : loaded;
  lastName = pool[Math.floor(Math.random() * pool.length)];
  return lastName;
}
function panelWindow(lay, name) {
  const g = clashGifs_default.gifs[name];
  const { W, H, portrait } = lay;
  let h = H * (portrait ? 0.3 : 0.52);
  let w = h * (g.w / g.h);
  if (w > W * 0.94) {
    w = W * 0.94;
    h = w * (g.h / g.w);
  }
  return { x: W / 2, y: Math.round(H * (portrait ? 0.42 : 0.44)), w, h };
}
function playClashGif(scene, name, ui, onDone) {
  const g = clashGifs_default.gifs[name];
  const win = panelWindow(scene.lay, name);
  const delay = (i) => Array.isArray(g.ms) ? g.ms[i] : g.ms;
  const depth = 258;
  const img = ui(scene.add.image(win.x, win.y, key(name, 1)).setDepth(depth).setDisplaySize(win.w, win.h).setAlpha(0));
  const fx = win.x - win.w / 2;
  const fy = win.y - win.h / 2;
  const frame = ui(scene.add.graphics().setDepth(depth + 1).setAlpha(0));
  frame.lineStyle(10, 1709072, 0.95).strokeRect(fx - 5, fy - 5, win.w + 10, win.h + 10);
  frame.lineStyle(4, 15253616, 1).strokeRect(fx - 2, fy - 2, win.w + 4, win.h + 4);
  frame.lineStyle(1, 16773320, 0.7).strokeRect(fx + 3, fy + 3, win.w - 6, win.h - 6);
  const parts = [img, frame];
  scene.tweens.add({ targets: parts, alpha: 1, duration: 120, ease: "Quad.easeOut" });
  let step = 0;
  const next = () => {
    if (!img.active) return;
    step++;
    if (step < g.frames) {
      img.setTexture(key(name, step + 1));
      scene.time.delayedCall(delay(step), next);
    } else {
      scene.time.delayedCall(220, () => {
        scene.tweens.add({ targets: parts, alpha: 0, duration: 160, onComplete: () => {
          parts.forEach((o) => o.destroy());
          onDone();
        } });
      });
    }
  };
  scene.time.delayedCall(delay(0) + 120, next);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CLASH_GIF_PAIR,
  hasClashGif,
  loadClashGifs,
  panelWindow,
  pickClashGif,
  playClashGif
});
