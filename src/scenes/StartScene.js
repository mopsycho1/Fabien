import { readSave } from '../saveGame.js';
import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { startStep } from '../story.js';
import { createHudTextures } from '../hud.js';
import { fitDesign } from '../layout.js';
import { startAudio, play, playTrack } from '../audio.js';
import { tryFullscreen } from '../layout.js';

// The title screen. The game opens here on a dark screen: the title fades in,
// and nothing else happens until the player taps.
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
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

    // Nothing is loaded for the title (18.47): it is words and drawn shapes only, so it is ready at once.
    // The character select loads the portraits, and Start battle loads the picked fighters' pictures
    // with a loading bar (BattleScene.preload, src/battleLoad.js). Before 18.47 the title fetched all
    // 1050 files (39 MB) first.
    this.artReady = true;
    this.loadSeconds = 0;
    if (this.offerContinue()) prompt.setText('or tap anywhere else for a new game');
    pulse.resume();

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
    if (this.starting) return;
    this.starting = true;
    startAudio(); // browsers only allow sound after a tap
    playTrack('theme'); // Suleiman's theme (roadmap A.1)
    tryFullscreen(this); // Android: full screen, so the browser's bars don't take room
    play('drum');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => startStep(this, 0));
  }
}
