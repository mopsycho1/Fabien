// Fighter lighting (roadmap 18.58, Graphics 2.0, 26 Nov). Behind the "Fighter lighting" Settings switch.
// The torches, braziers and spell effects light the fighters through Phaser's Light2D pipeline: each fighter picture
// has a normal map (dev/tools/make_normals.py --all, public/art/normals, half size) that says which way each bit of
// the body faces, so a fire on his left warms his left side. Only the fighters take this light: the painted board
// keeps the light Suleiman's tiles already have (boardArt.js lightAt), so the cost is a dozen sprites, not the screen.
// Soft and warm: a low warm ambient, gentle torch light with a slow flicker, short flashes from effects.
// Off when Effects is Light (also when the frame-rate watcher drops to Light), and on a canvas (non-WebGL) renderer.
// The older ?light test (lighting.js, 1.38) is separate and wins when it is in the address.
import Phaser from 'phaser';
import { lookOn, onLookChange } from './look2.js';
import { fxMode } from './spellArt.js';
import { flamePoints } from './boardArt.js';
import { artUrl } from './artUrl.js';
import { lightingOn as oldTestOn } from './lighting.js';
import art from './data/art.json';

const SKIP = new Set(['props', 'name', 'portrait', 'portraitHurt', 'shout', 'hurtFaces', 'clash', 'height', 'auraPainted', 'ruler', 'headTurn', 'walkStyle', 'unwired', 'weapon', 'swingFx', 'channelFx']);
const AMBIENT = 0xd6cdc4;   // a little under full, a touch warm: a fighter away from any fire is slightly dimmer
const TORCH = { color: 0xffc28a, intensity: 0.75, radius: 280 };

// Is the look on now? (switch on, Effects Full, WebGL)
export function fighterLightOn(scene) {
  return lookOn('lighting') && fxMode() !== 'light' && !oldTestOn() && !!(scene && scene.renderer && scene.renderer.gl);
}

// Every picture file a fighter shows in battle (the same list make_normals.py --all made maps for).
function filesOf(id) {
  const out = new Set();
  const walk = (o, top) => {
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        if (top && (SKIP.has(k) || k.startsWith('note'))) continue;
        walk(v, false);
      }
    } else if (typeof o === 'string' && o.endsWith('.png')) out.add(o);
  };
  walk(art[id], true);
  return [...out];
}

// Queue the normal maps of these fighters (only when the look is on: nothing is downloaded otherwise).
export function queueNormals(scene, ids) {
  if (!lookOn('lighting') || oldTestOn()) return 0;
  let n = 0;
  for (const id of ids) {
    for (const f of filesOf(id)) {
      const key = 'nrm:' + f;
      if (scene.textures.exists(key)) continue;
      scene.load.image(key, artUrl('./art/normals/' + f));
      n++;
    }
  }
  return n;
}

// Give every fighter texture its normal map (texture keys are "<id>:<file>").
function attachNormals(scene) {
  for (const u of scene.units || []) {
    for (const f of filesOf(u.id)) {
      const tex = scene.textures.exists(u.id + ':' + f) && scene.textures.get(u.id + ':' + f);
      const nrm = scene.textures.exists('nrm:' + f) && scene.textures.get('nrm:' + f);
      if (tex && nrm && !tex.dataSource.length) tex.setDataSource(nrm.getSourceImage());
    }
  }
}

// Phaser's Light2D does not know about flipped pictures: a mirrored fighter got his bumps the wrong way round
// (problem 2 of the 1.38 test). The shader turns every normal by one matrix per sprite; here a flipped sprite's
// matrix also mirrors the normal's left and right.
function patchFlip(pipeline) {
  if (!pipeline || pipeline.__flipPatched) return;
  pipeline.__flipPatched = true;
  const setGameObject = pipeline.setGameObject;
  pipeline.setGameObject = function (gameObject, frame) {
    this.__flip = !!gameObject.flipX;
    return setGameObject.call(this, gameObject, frame);
  };
  pipeline.setNormalMapRotation = function (rotation) {
    const flip = !!this.__flip;
    if (rotation === this.currentNormalMapRotation && flip === this.__lastFlip && this.vertexCount !== 0) return;
    if (this.vertexCount > 0) this.flush();
    const m = this.inverseRotationMatrix;
    const c = Math.cos(-rotation || 0), s = Math.sin(-rotation || 0);
    m[0] = c * (flip ? -1 : 1); m[1] = s * (flip ? -1 : 1);
    m[3] = -s; m[4] = c;
    this.setMatrix3fv('uInverseRotationMatrix', false, m);
    this.currentNormalMapRotation = rotation;
    this.__lastFlip = flip;
  };
}

// Set up once per battle scene. Turns itself on and off with the switch and the Effects setting.
export function installFighterLight(scene) {
  if (oldTestOn() || !scene.renderer || !scene.renderer.gl) return;
  const st = (scene.fighterLight = { on: false, torches: [], flashes: new Set(), auras: new Map() });
  const lm = scene.lights;

  const torchesUp = () => {
    for (const t of st.torches) lm.removeLight(t.light);
    st.torches = flamePoints.map((p, i) => ({ light: lm.addLight(p.x, p.y - 10, TORCH.radius, TORCH.color, TORCH.intensity), seed: i * 1.7 }));
  };

  const apply = () => {
    const want = fighterLightOn(scene);
    if (want === st.on) return;
    st.on = want;
    if (want) {
      if (queueNormals(scene, (scene.units || []).map((u) => u.id)) > 0) {
        scene.load.once('complete', () => { attachNormals(scene); });
        scene.load.start();
      }
      attachNormals(scene);
      lm.enable().setAmbientColor(AMBIENT);
      patchFlip(scene.renderer.pipelines.get('Light2D'));
      torchesUp();
    } else {
      for (const t of st.torches) lm.removeLight(t.light);
      st.torches = [];
      for (const a of st.auras.values()) lm.removeLight(a);
      st.auras.clear();
      lm.disable();
      for (const u of scene.units || []) if (u.sprite && u.sprite.active) u.sprite.resetPipeline();
    }
  };

  // the board is rebuilt when the camera turns: the fires move, so their lights follow
  if (scene.buildBoard && !scene.__lightBoardWrapped) {
    scene.__lightBoardWrapped = true;
    const orig = scene.buildBoard.bind(scene);
    scene.buildBoard = (...a) => { const r = orig(...a); if (st.on) torchesUp(); return r; };
  }

  // a short light where an effect plays (fxLayers impacts, Suleiman's GIF effects, lightning)
  scene.events.on('fxlight', (x, y, color = 0xffd9a0, power = 1, ms = 360) => {
    if (!st.on || st.flashes.size >= 4) return; // a few at once is plenty, and keeps phones smooth
    const light = lm.addLight(x, y, 170 + 70 * power, color, 0.9 * power);
    st.flashes.add(light);
    scene.tweens.add({ targets: light, intensity: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => { lm.removeLight(light); st.flashes.delete(light); } });
  });
  scene.events.on('bolt', (x, y) => scene.events.emit('fxlight', x, y - 30, 0xbfd8ff, 1.6, 420));

  const unsub = onLookChange(apply);
  scene.events.on('fxmode', apply);
  scene.events.once('shutdown', () => { unsub(); scene.events.off('fxmode', apply); st.on = false; });

  scene.events.on('update', (time) => {
    apply(); // (cheap: Effects set to Light from Settings, or by the frame-rate watcher, turns it off at once)
    if (!st.on) return;
    for (const t of st.torches) { // a slow, gentle flicker
      t.light.intensity = TORCH.intensity * (1 + 0.1 * Math.sin(time / 330 + t.seed) + 0.05 * Math.sin(time / 101 + t.seed * 3));
    }
    for (const u of scene.units || []) {
      const s = u.sprite;
      if (s && s.active && (!s.pipeline || s.pipeline.name !== 'Light2D')) s.setPipeline('Light2D');
      // a fighter burning with Fury or Enchant lights himself a little
      const burning = u.alive && (u.furyAura || u.enchantAura);
      let a = st.auras.get(u);
      if (burning && !a) { a = lm.addLight(0, 0, 120, 0xff8a3c, 0.6); st.auras.set(u, a); }
      if (!burning && a) { lm.removeLight(a); st.auras.delete(u); a = null; }
      if (a && u.view) { a.x = u.view.x; a.y = u.view.y - (u.centerY || 40); a.intensity = 0.55 + 0.1 * Math.sin(time / 170 + u.col); }
    }
  });
  apply();
}
