import { readSave } from '../saveGame.js';
import { classPlateFiles } from '../nameplate.js';
import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { startStep } from '../story.js';
import { preloadArt } from '../art.js';
import { preloadNormals } from '../lighting.js';
import { preloadBoardArt } from '../boardArt.js';
import { preloadSpellArt } from '../spellArt.js';
import { createHudTextures, preloadUiArt } from '../hud.js';
import { fitDesign } from '../layout.js';
import { startAudio, play, playTrack } from '../audio.js';
import { tryFullscreen } from '../layout.js';

// The title screen. The game opens here on a dark screen: the title fades in,
// and nothing else happens until the player taps.
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  // Nothing is loaded before the title shows (M16, checklist H4): the title is words only, so
  // it is on screen at once, and the battle's pictures (about 860 files, 38 MB) load behind
  // it with a progress bar. "Tap to begin" appears when they are all in.
  loadEverything() {
    preloadArt(this);
    preloadBoardArt(this);
    preloadNormals(this); // bump pictures for the ?light test
    preloadSpellArt(this); // lightning and Verse effects from the effect sheets
    preloadUiArt(this); // Suleiman's battle-screen frames, buttons and icons
    for (const f of classPlateFiles()) this.load.image(f.key, './' + f.file); // his class nameplates, once they are named in nameplates.json (M6)
  }

  create() {
    fitDesign(this, 720, 1280, [380, 980]); // laid out for a 720 by 1280 screen; a wide screen closes in on the part that is used (M8)
    this.cameras.main.setBackgroundColor('#0d0907');
    this.cameras.main.fadeIn(900, 0, 0, 0); // fade up from black
    this.starting = false;

    // woven cloth bands framing the title
    createHudTextures(this);
    this.add.tileSprite(GAME_WIDTH / 2, 430, 560, 18, 'ui-woven');
    this.add.tileSprite(GAME_WIDTH / 2, 700, 560, 18, 'ui-woven');

    this.titleText = this.add
      .text(GAME_WIDTH / 2, 520, 'Fabien', {
        fontFamily: 'Georgia, serif',
        fontSize: '110px',
        color: '#ffe08a',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 630, 'Of Gods & Men', {
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
        color: '#e8d5a8',
      })
      .setOrigin(0.5);

    // "Tap to begin" slowly pulses
    const prompt = this.add
      .text(GAME_WIDTH / 2, 900, 'Tap to begin', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#a89a78',
      })
      .setOrigin(0.5);
    const pulse = this.tweens.add({ targets: prompt, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, paused: true });

    // The pictures load now, behind the title, with a bar (M16). Coming back to the title
    // later in the same visit, they are already there.
    this.artReady = false;
    const ready = () => {
      this.artReady = true;
      this.registry.set('artLoaded', true);
      this.loadSeconds = (performance.now() - this.loadStart) / 1000;
      prompt.setText('Tap to begin');
      pulse.resume();
      if (this.loadBar) { this.loadBar.destroy(); this.loadBack.destroy(); }
      if (this.offerContinue()) prompt.setText('or tap anywhere else for a new game');
    };
    this.loadStart = performance.now();
    if (this.registry.get('artLoaded')) ready();
    else {
      prompt.setText('Loading  0%');
      this.loadBack = this.add.rectangle(GAME_WIDTH / 2, 950, 404, 16, 0x2a1d12).setStrokeStyle(2, 0xb88a4a);
      this.loadBar = this.add.rectangle(GAME_WIDTH / 2 - 200, 950, 400, 12, 0xffe08a).setOrigin(0, 0.5).setScale(0, 1);
      this.load.on('progress', (v) => { this.loadProgress = v; if (this.loadBar.active) this.loadBar.setScale(v, 1); prompt.setText('Loading  ' + Math.round(v * 100) + '%'); });
      this.load.once('complete', ready);
      this.loadEverything();
      this.load.start();
    }

    // First tap: fade to black, then start the story (taps on the Continue button are its own)
    this.input.on('pointerdown', (pointer, over) => { if (!over || over.length === 0) this.begin(); });
    // keyboard on a computer (M8): Enter or Space does what a tap does
    for (const k of ['ENTER', 'SPACE']) { const key = 'keydown-' + k; const fn = () => this.begin(); this.input.keyboard?.on(key, fn); this.events.once('shutdown', () => this.input.keyboard?.off(key, fn)); }

  }

  // A battle saved on this device (M16): a button to go straight back into it, at the start
  // of the turn that was being played. A plain tap anywhere else starts a new game.
  offerContinue() {
    const save = readSave();
    if (!save) return false;
    const back = this.add.rectangle(GAME_WIDTH / 2, 800, 470, 70, 0x3a2a18).setStrokeStyle(3, 0xffe08a).setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, 800, 'Continue the battle  (turn ' + (save.turnCount + 1) + ')', { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#ffe08a' }).setOrigin(0.5);
    this.continueButton = back;
    back.on('pointerdown', () => {
      if (this.starting) return;
      this.starting = true;
      startAudio();
      tryFullscreen(this);
      play('drum');
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('BattleScene', { stepIndex: save.stepIndex, map: save.map, resume: true }));
    });
    return true;
  }

  begin() {
    if (this.starting || !this.artReady) return; // (not while the pictures are still loading)
    this.starting = true;
    startAudio(); // browsers only allow sound after a tap
    playTrack('theme'); // Suleiman's theme (roadmap A.1)
    tryFullscreen(this); // Android: full screen, so the browser's bars don't take room
    play('drum');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => startStep(this, 0));
  }
}
