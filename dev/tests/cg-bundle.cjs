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
  bakeSoftFrames: () => bakeSoftFrames,
  boardPlacement: () => boardPlacement,
  hasClashGif: () => hasClashGif,
  loadClashGifs: () => loadClashGifs,
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
var FEATHER_X = 0.09;
var FEATHER_Y = 0.12;
var FEET = 0.84;
var FIGURE = 0.62;
var BIGGER = 1.2;
var softKey = (name, i) => "clashgif:soft:" + name + ":" + i;
function bakeSoftFrames(scene, name) {
  const g = clashGifs_default.gifs[name];
  for (let i = 1; i <= g.frames; i++) {
    if (scene.textures.exists(softKey(name, i))) continue;
    if (!scene.textures.exists(key(name, i))) return false;
    const src = scene.textures.get(key(name, i)).getSourceImage();
    const w = src.width, h = src.height;
    const tex = scene.textures.createCanvas(softKey(name, i), w, h);
    const ctx = tex.getContext();
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    let grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(FEATHER_X, "rgba(0,0,0,1)");
    grad.addColorStop(1 - FEATHER_X, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(FEATHER_Y, "rgba(0,0,0,1)");
    grad.addColorStop(1 - FEATHER_Y, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }
  return true;
}
function boardPlacement(gahaView, bullView, gahaBodyH, g) {
  const scale = gahaBodyH * BIGGER / (g.h * FIGURE);
  return { x: (gahaView.x + bullView.x) / 2, y: (gahaView.y + bullView.y) / 2, scale, flip: gahaView.x > bullView.x };
}
function playClashGif(scene, name, a, b, onDone) {
  const g = clashGifs_default.gifs[name];
  const gaha = a.id === CLASH_GIF_PAIR[0] ? a : b;
  const bull = gaha === a ? b : a;
  if (!bakeSoftFrames(scene, name) || !gaha.view || !bull.view) {
    onDone();
    return;
  }
  const place = boardPlacement(gaha.view, bull.view, gaha.topY - 12, g);
  const delay = (i) => Array.isArray(g.ms) ? g.ms[i] : g.ms;
  const depth = Math.max(gaha.view.depth, bull.view.depth) + 60;
  const img = scene.add.image(place.x, place.y + 6, softKey(name, 1)).setOrigin(0.5, FEET).setScale(place.scale).setFlipX(place.flip).setDepth(depth).setAlpha(0);
  const hidden = [gaha, bull].map((u) => ({ u, alpha: u.view.alpha }));
  hidden.forEach(({ u }) => u.view.setAlpha(0));
  const restore = () => hidden.forEach(({ u, alpha }) => {
    if (u.view && u.view.active) u.view.setAlpha(alpha);
  });
  scene.tweens.add({ targets: img, alpha: 1, duration: 140, ease: "Quad.easeOut" });
  let step = 0;
  const next = () => {
    if (!img.active) {
      restore();
      return;
    }
    step++;
    if (step < g.frames) {
      img.setTexture(softKey(name, step + 1));
      scene.time.delayedCall(delay(step), next);
    } else {
      scene.time.delayedCall(220, () => {
        restore();
        scene.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => {
          img.destroy();
          onDone();
        } });
      });
    }
  };
  scene.time.delayedCall(delay(0) + 140, next);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CLASH_GIF_PAIR,
  bakeSoftFrames,
  boardPlacement,
  hasClashGif,
  loadClashGifs,
  pickClashGif,
  playClashGif
});
