// Mood (roadmap 18.59, Graphics 2.0, 26 Nov). Behind the "Mood" Settings switch.
// One pass of one small shader over the battlefield camera (never the HUD: that has its own camera and the HTML layer):
//   - a gentle depth blur toward the screen edges, so the eye rests on the middle of the fight
//   - soft bloom on glows only: the bright parts (fires, spell light, flashes) spill a little light round themselves;
//     the painted mid-tones are left alone (Phaser's own bloom has no threshold and hazes the whole picture)
//   - one colour grade for the whole battle: a touch warmer, richer and deeper, the same everywhere
//   - a soft vignette
// Plus dust: a few motes drifting up through each fire's light.
// Off when Effects is Light (also when the frame-rate watcher drops to Light), and without WebGL.
import Phaser from 'phaser';
import { lookOn, onLookChange } from './look2.js';
import { fxMode } from './spellArt.js';
import { flamePoints } from './boardArt.js';

const FRAG = `
#define SHADER_NAME FABIEN_MOOD_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uTexel;    // one screen pixel, in texture units
uniform float uScale;   // the screen's size against a 900 pixel tall one: blur and bloom keep their look on every screen
uniform float uAmount;  // 0 to 1: the look fades in
varying vec2 outTexCoord;

vec3 at(vec2 o) { return texture2D(uMainSampler, outTexCoord + o * uTexel).rgb; }

void main () {
  vec4 base = texture2D(uMainSampler, outTexCoord);
  vec3 c = base.rgb;
  vec2 d = (outTexCoord - 0.5) * vec2(1.0, 1.15);
  float far = length(d);

  // the depth blur: none in the middle, a soft blur out at the edges
  float edge = smoothstep(0.34, 0.66, far);
  // the bloom: the bright parts of eight spots on two rings, spread round
  vec3 glow = vec3(0.0);
  vec3 blur = vec3(0.0);
  float r1 = 5.0 * uScale, r2 = 12.0 * uScale, rb = 3.2 * uScale * edge;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982 + 0.39;
    vec2 dir = vec2(cos(a), sin(a));
    vec3 n = at(dir * r1), f = at(dir * r2);
    glow += max(n - 0.66, 0.0) * 1.0 + max(f - 0.66, 0.0) * 0.6;
    if (i < 6) blur += at(dir * rb);
  }
  c = mix(c, (blur + c * 2.0) / 8.0, edge);
  c += glow * (0.42 / 8.0) * vec3(1.0, 0.92, 0.8);

  // the grade: a little more colour and depth, a touch warmer in the lights, cooler in the deep shadows
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.1);
  c = (c - 0.5) * 1.06 + 0.5;
  c *= mix(vec3(0.96, 0.98, 1.03), vec3(1.04, 1.0, 0.92), smoothstep(0.08, 0.6, l));
  // the vignette
  c *= mix(1.0, 0.84, smoothstep(0.42, 0.86, far));

  gl_FragColor = vec4(mix(base.rgb, clamp(c, 0.0, 1.0), uAmount), base.a);
}`;

class MoodPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'FabienMood', fragShader: FRAG });
    this.amount = 1;
  }
  onPreRender() {
    const w = this.renderer.width, h = this.renderer.height;
    this.set2f('uTexel', 1 / w, 1 / h);
    this.set1f('uScale', Math.max(0.6, h / 900));
    this.set1f('uAmount', this.amount);
  }
}

export function moodOn(scene) {
  return lookOn('mood') && fxMode() !== 'light' && !!(scene && scene.renderer && scene.renderer.gl);
}

// Set up once per battle scene. Turns itself on and off with the switch and the Effects setting.
export function installMood(scene) {
  if (!scene.renderer || !scene.renderer.gl) return;
  const pipes = scene.renderer.pipelines;
  if (!pipes.postPipelineClasses.has('FabienMood')) pipes.addPostPipeline('FabienMood', MoodPipeline);
  const st = (scene.mood = { on: false, dust: [] });
  const cam = scene.cameras.main;

  const dustUp = () => {
    for (const e of st.dust) e.destroy();
    st.dust = [];
    if (!scene.textures.exists('fx-dot')) return;
    for (const p of flamePoints) {
      const e = scene.add.particles(p.x, p.y - 26, 'fx-dot', {
        x: { min: -46, max: 46 }, y: { min: -40, max: 30 },
        speedX: { min: -5, max: 5 }, speedY: { min: -11, max: -3 },
        lifespan: { min: 3200, max: 5200 },
        scale: { min: 0.07, max: 0.16 },
        alpha: { start: 0.55, end: 0 },
        tint: [0xffe2b0, 0xffcf8a, 0xfff0d0],
        frequency: 520, quantity: 1, blendMode: 'ADD', maxParticles: 9,
      });
      e.setDepth(74);
      if (scene.uiCam) e.cameraFilter |= scene.uiCam.id;
      st.dust.push(e);
    }
  };

  const apply = () => {
    const want = moodOn(scene);
    if (want === st.on) return;
    st.on = want;
    if (want) {
      cam.setPostPipeline('FabienMood');
      const p = cam.getPostPipeline('FabienMood');
      const pipe = Array.isArray(p) ? p[0] : p;
      if (pipe) { pipe.amount = 0; scene.tweens.add({ targets: pipe, amount: 1, duration: 600 }); }
      dustUp();
    } else {
      cam.removePostPipeline('FabienMood');
      for (const e of st.dust) e.destroy();
      st.dust = [];
    }
  };

  // the board is rebuilt when the camera turns: the fires move, so their dust follows
  if (scene.buildBoard && !scene.__moodBoardWrapped) {
    scene.__moodBoardWrapped = true;
    const orig = scene.buildBoard.bind(scene);
    scene.buildBoard = (...a) => { const r = orig(...a); if (st.on) dustUp(); return r; };
  }
  const unsub = onLookChange(apply);
  scene.events.on('update', apply); // (cheap: Effects set to Light turns it off at once)
  scene.events.once('shutdown', () => { unsub(); scene.events.off('update', apply); st.on = false; });
  apply();
}
