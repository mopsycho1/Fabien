import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { startStep } from '../story.js';
import { preloadArt } from '../art.js';
import { preloadBoardArt } from '../boardArt.js';
import { preloadSpellArt } from '../spellArt.js';
import { createHudTextures } from '../hud.js';
import { startAudio, play } from '../audio.js';

// The title screen. The game opens here on a dark screen: the title fades in,
// and nothing else happens until the player taps.
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  // Phaser calls preload() first. We load every character and terrain picture
  // here, once, so they are ready for all the scenes that follow.
  preload() {
    preloadArt(this);
    preloadBoardArt(this);
    preloadSpellArt(this); // lightning and Verse effects from the effect sheets
  }

  create() {
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
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 900, yoyo: true, repeat: -1 });

    // First tap: fade to black, then start the story
    this.input.on('pointerdown', () => this.begin());
  }

  begin() {
    if (this.starting) return;
    this.starting = true;
    startAudio(); // browsers only allow sound after a tap
    play('drum');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => startStep(this, 0));
  }
}
