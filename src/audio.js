// Sound effects and battle music, all made in code with the Web Audio API.
// There are no sound files: each sound is built from simple waves and noise.
//
// Browsers only allow sound after the player taps something, so the game
// calls startAudio() on the first tap (the title screen).
// If the browser has no Web Audio (or it fails), every function here quietly
// does nothing, so the game never breaks because of sound.

let ctx = null;        // the audio system
let master = null;     // overall volume
let sfxBus = null;     // volume for sound effects
let musicBus = null;   // volume for music
let noise = null;      // one second of random noise, reused for whooshes and hits
let muted = false;
let music = null;      // the running music loop, if any

const SETTINGS_KEY = 'fabien-sound-muted';

try {
  muted = localStorage.getItem(SETTINGS_KEY) === '1';
} catch (e) {
  muted = false;
}

// Call on the player's first tap.
export function startAudio() {
  try {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.32;
      musicBus.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    ctx = null;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(SETTINGS_KEY, value ? '1' : '0');
  } catch (e) {
    // no saved settings in this browser; that is fine
  }
  if (master) master.gain.setTargetAtTime(value ? 0 : 0.7, ctx.currentTime, 0.05);
}

// ---------- Building blocks ----------

function ready() {
  return !!ctx && ctx.state !== 'closed';
}

// A tone that starts at one pitch and slides to another, then fades out.
function tone({ type = 'sine', from = 440, to = from, start = 0, length = 0.2, volume = 0.3, bus = sfxBus, attack = 0.005 }) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(bus);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

// A burst of noise through a filter: whooshes, hits, scrapes, sand.
function hiss({ start = 0, length = 0.2, volume = 0.3, filter = 'bandpass', from = 1000, to = from, q = 1, bus = sfxBus }) {
  const t = ctx.currentTime + start;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(f).connect(gain).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + length + 0.05);
}

// ---------- Sound effects ----------
// Each one is a short recipe. play('clash') plays the sound called "clash".

const SOUNDS = {
  // Steel on steel: a bright noise burst with ringing metal overtones
  clash() {
    hiss({ length: 0.12, volume: 0.5, from: 4500, to: 2500, q: 2 });
    for (const [f, v] of [[1870, 0.12], [2730, 0.09], [4100, 0.06], [5230, 0.04]]) {
      tone({ type: 'sine', from: f, to: f * 0.985, length: 0.7, volume: v });
    }
    tone({ type: 'triangle', from: 160, to: 70, length: 0.18, volume: 0.25 });
  },
  // A blade cutting the air
  slash() {
    hiss({ length: 0.18, volume: 0.35, from: 900, to: 4200, q: 1.4 });
  },
  // The quick rush of air as a fighter dashes in
  whoosh() {
    hiss({ length: 0.14, volume: 0.32, from: 600, to: 2600, q: 0.9 });
  },
  // A blow that really lands: a deep punch, a crack, and a bright edge
  impact() {
    tone({ type: 'sine', from: 180, to: 42, length: 0.24, volume: 0.75 });
    tone({ type: 'square', from: 90, to: 50, length: 0.08, volume: 0.12 });
    hiss({ length: 0.07, volume: 0.45, filter: 'highpass', from: 2400, to: 900 });
    hiss({ start: 0.02, length: 0.16, volume: 0.3, filter: 'lowpass', from: 1500, to: 200 });
  },
  // A body crashing down, then embers crackling as it burns away
  crash() {
    tone({ type: 'sine', from: 110, to: 30, length: 0.55, volume: 0.8 });
    hiss({ length: 0.35, volume: 0.4, filter: 'lowpass', from: 900, to: 100 });
    for (let i = 0; i < 7; i++) hiss({ start: 0.45 + i * 0.09 + Math.random() * 0.05, length: 0.03, volume: 0.12, filter: 'highpass', from: 3500 });
  },
  // A blow landing on a body
  hit() {
    tone({ type: 'sine', from: 140, to: 48, length: 0.18, volume: 0.55 });
    hiss({ length: 0.08, volume: 0.25, filter: 'lowpass', from: 1800, to: 400 });
  },
  // A heavy shield or club blow
  bash() {
    tone({ type: 'sine', from: 95, to: 38, length: 0.3, volume: 0.7 });
    hiss({ length: 0.2, volume: 0.35, filter: 'lowpass', from: 900, to: 150 });
  },
  // A bowstring and the arrow leaving
  arrow() {
    tone({ type: 'triangle', from: 260, to: 180, length: 0.12, volume: 0.25 });
    hiss({ start: 0.02, length: 0.22, volume: 0.18, from: 2500, to: 6000, q: 3 });
  },
  // The Sage's crackling bolt
  spark() {
    tone({ type: 'sawtooth', from: 1200, to: 180, length: 0.22, volume: 0.12 });
    hiss({ length: 0.25, volume: 0.22, filter: 'highpass', from: 3000, to: 1200 });
  },
  // A spell landing: a rising chime
  spell() {
    [660, 880, 1320, 1760].forEach((f, i) => tone({ type: 'sine', from: f, start: i * 0.07, length: 0.6, volume: 0.12 }));
    hiss({ length: 0.6, volume: 0.06, filter: 'highpass', from: 5000, to: 8000 });
  },
  // A swing that misses
  miss() {
    hiss({ length: 0.22, volume: 0.25, from: 2200, to: 600, q: 1.2 });
  },
  // Feet on sand
  step() {
    hiss({ length: 0.06, volume: 0.12, filter: 'lowpass', from: 700, to: 300 });
  },
  // A fighter falling
  fall() {
    tone({ type: 'sine', from: 120, to: 40, length: 0.5, volume: 0.5 });
    hiss({ start: 0.12, length: 0.45, volume: 0.25, filter: 'lowpass', from: 600, to: 120 });
  },
  // Tapping a button
  click() {
    tone({ type: 'triangle', from: 540, to: 520, length: 0.06, volume: 0.12 });
  },
  // Choosing something on the board
  select() {
    tone({ type: 'sine', from: 760, to: 1040, length: 0.09, volume: 0.12 });
  },
  // Cancelling
  cancel() {
    tone({ type: 'sine', from: 520, to: 340, length: 0.1, volume: 0.1 });
  },
  // A unit's turn begins
  turn() {
    tone({ type: 'triangle', from: 392, length: 0.12, volume: 0.1 });
    tone({ type: 'triangle', from: 587, start: 0.08, length: 0.18, volume: 0.1 });
  },
  // The banner sweeping across for a cut-in
  cutin() {
    hiss({ length: 0.45, volume: 0.28, from: 300, to: 3000, q: 0.8 });
    tone({ type: 'sawtooth', from: 110, to: 220, length: 0.4, volume: 0.06 });
  },
  // A big talking-drum hit
  drum() {
    tone({ type: 'sine', from: 180, to: 90, length: 0.35, volume: 0.6 });
    hiss({ length: 0.05, volume: 0.15, filter: 'highpass', from: 2000 });
  },
  // A gust of wind over the sand
  wind() {
    hiss({ length: 2.4, volume: 0.07, filter: 'bandpass', from: 300, to: 900, q: 0.6 });
  },
  // Winning
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', from: f, start: i * 0.14, length: 0.5, volume: 0.18 }));
    tone({ type: 'triangle', from: 1047, start: 0.6, length: 1.2, volume: 0.2 });
    [0, 0.14, 0.28, 0.6].forEach((s) => hiss({ start: s, length: 0.05, volume: 0.12, filter: 'highpass', from: 3000 }));
  },
  // Losing
  defeat() {
    [392, 349, 311, 262].forEach((f, i) => tone({ type: 'sine', from: f, start: i * 0.3, length: 0.6, volume: 0.16 }));
  },
};

export function play(name) {
  if (!ready() || muted) return;
  const recipe = SOUNDS[name];
  if (!recipe) return;
  try {
    recipe();
  } catch (e) {
    // a sound failing should never stop the game
  }
}

// ---------- Battle music ----------
// A looping rhythm: a deep drum, a talking drum answering it, a shaker, a low
// drone and a short plucked melody now and then. It is played by scheduling
// notes a little ahead of time.

const BPM = 100;
const STEP = 60 / BPM / 4; // one sixteenth note, in seconds
// 16 steps per bar. 1 = play on that step.
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];
const TALK = [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0];
const SHAKE = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1];
const SCALE = [220, 247, 277, 330, 370, 440]; // a pentatonic scale on A

export function startBattleMusic() {
  if (!ready() || music) return;
  let step = 0;
  let nextTime = ctx.currentTime + 0.1;
  let bar = 0;

  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  drone.type = 'sawtooth';
  drone.frequency.value = 55;
  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 220;
  droneGain.gain.value = 0.06;
  drone.connect(droneFilter).connect(droneGain).connect(musicBus);
  drone.start();

  const note = (fn, at) => {
    const offset = at - ctx.currentTime;
    fn(Math.max(0, offset));
  };

  const tick = () => {
    while (nextTime < ctx.currentTime + 0.25) {
      const s = step % 16;
      if (KICK[s]) note((o) => tone({ type: 'sine', from: 110, to: 45, start: o, length: 0.3, volume: 0.5, bus: musicBus }), nextTime);
      if (TALK[s]) note((o) => tone({ type: 'sine', from: 260 + (s % 3) * 40, to: 160, start: o, length: 0.16, volume: 0.22, bus: musicBus }), nextTime);
      if (SHAKE[s]) note((o) => hiss({ start: o, length: 0.04, volume: s % 4 === 0 ? 0.08 : 0.04, filter: 'highpass', from: 6000, bus: musicBus }), nextTime);
      // a short melody on some bars
      if (bar % 4 >= 2 && s % 4 === 0 && Math.random() < 0.7) {
        const f = SCALE[Math.floor(Math.random() * SCALE.length)];
        note((o) => tone({ type: 'triangle', from: f, start: o, length: 0.35, volume: 0.07, bus: musicBus }), nextTime);
      }
      nextTime += STEP;
      step += 1;
      if (step % 16 === 0) bar += 1;
    }
  };
  const timer = setInterval(tick, 60);
  music = { timer, drone, droneGain };
}

export function stopMusic() {
  if (!music) return;
  clearInterval(music.timer);
  try {
    music.droneGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
    music.drone.stop(ctx.currentTime + 1);
  } catch (e) {
    // already stopped
  }
  music = null;
}
