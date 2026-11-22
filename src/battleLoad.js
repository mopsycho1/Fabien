// Loading a battle's pictures (roadmap 18.47). The title and the character select load almost
// nothing (the title is words only, the select loads the portraits). When Start battle is pressed,
// BattleScene.preload calls loadBattleArt: it fetches the pictures of the fighters picked plus the
// board, effects and HUD pictures every battle needs, and shows a loading bar while they come in.
// A second battle in the same visit finds everything in the cache and shows no bar.
import { preloadArt } from './art.js';
import { preloadBoardArt } from './boardArt.js';
import { preloadNormals } from './lighting.js';
import { preloadSpellArt } from './spellArt.js';
import { preloadUiArt } from './hud.js';
import { classPlateFiles } from './nameplate.js';
import { fieldedEntries } from './lineup.js';
import { artUrl, held } from './artUrl.js';
import art from './data/art.json';
import { allCharacters } from './lineup.js';

// ids: the fighters' ids. Everything not yet in the cache is queued (Phaser skips a key it already has).
export function queueBattleArt(scene, ids) {
  preloadArt(scene, ids);
  preloadBoardArt(scene);
  preloadNormals(scene); // bump pictures for the ?light test
  preloadSpellArt(scene); // lightning and Verse effects from the effect sheets
  preloadUiArt(scene); // Suleiman's battle-screen frames, buttons and icons
  for (const f of classPlateFiles()) scene.load.image(f.key, artUrl('./' + f.file)); // his class nameplates (M6)
}

// The select's own pictures: the portraits (SelectScene.preload and the background downloader both call this).
export function queueSelectArt(scene) {
  for (const c of allCharacters()) {
    const file = art[c.id] && art[c.id].portrait;
    if (file && !scene.textures.exists('sel:' + c.id)) scene.load.image('sel:' + c.id, artUrl('./art/' + file));
  }
}

// The fighters a battle will use, by id (the same list the battle builds its units from).
export function fighterIds(mapData, chosenLineUp) {
  return fieldedEntries(mapData, chosenLineUp).map((e) => e.id);
}

// A dark screen with a bar, drawn over the scene while its loader works; gone when it is done.
// Does nothing when the loader has nothing queued (everything was already in).
export function showLoadBar(scene) {
  if (!scene.load.list || scene.load.list.size === 0) return;
  const W = scene.scale.width, H = scene.scale.height;
  const u = Math.min(W, H) / 720; // a design pixel on this screen
  const back = scene.add.rectangle(W / 2, H / 2, W, H, 0x0d0907).setDepth(1000);
  const title = scene.add.text(W / 2, H / 2 - 60 * u, 'Getting the battle ready', { fontFamily: 'Georgia, serif', fontSize: Math.round(34 * u) + 'px', color: '#e8d5a8' }).setOrigin(0.5).setDepth(1001);
  const pct = scene.add.text(W / 2, H / 2 + 44 * u, 'Loading  0%', { fontFamily: 'Georgia, serif', fontSize: Math.round(26 * u) + 'px', color: '#a89a78' }).setOrigin(0.5).setDepth(1001);
  const frame = scene.add.rectangle(W / 2, H / 2, 404 * u, 16 * u, 0x2a1d12).setStrokeStyle(Math.max(1, 2 * u), 0xb88a4a).setDepth(1001);
  const bar = scene.add.rectangle(W / 2 - 200 * u, H / 2, 400 * u, 12 * u, 0xffe08a).setOrigin(0, 0.5).setScale(0, 1).setDepth(1002);
  scene.loadBarObjects = [back, title, pct, frame, bar];
  scene.load.on('progress', (v) => {
    scene.loadProgress = v;
    if (bar.active) bar.setScale(v, 1);
    if (pct.active) pct.setText('Loading  ' + Math.round(v * 100) + '%');
  });
  scene.load.once('complete', () => { for (const o of scene.loadBarObjects) o.destroy(); scene.loadBarObjects = null; });
}

// A picture that fails to download is asked for again, up to RETRIES times (22 Nov, video 1818: on a weak connection
// one fighter's standing picture failed and he fought the whole battle as a plain circle with his label, "H5").
// A failed blob from the background downloader is dropped and the server address is used instead.
export const RETRIES = 2;
export function retryFailedArt(scene) {
  scene.retryTries = new Map(); // fresh for every battle
  if (scene.retryOn) return;   // the scene keeps its loader between battles: one listener is enough
  scene.retryOn = true;
  scene.load.on('loaderror', (file) => {
    const tries = scene.retryTries;
    if (!file || (file.type !== 'image' && file.type !== 'spritesheet')) return;
    const n = (tries.get(file.key) || 0) + 1;
    if (n > RETRIES) return;
    tries.set(file.key, n);
    let url = file.url;
    for (const [raw, blob] of held) if (blob === url) { held.delete(raw); url = raw; break; }
    if (file.type === 'image') scene.load.image(file.key, url);
    else scene.load.spritesheet(file.key, url, file.config);
  });
}
