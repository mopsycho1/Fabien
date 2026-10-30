import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { fitDesign } from '../layout.js';
import {
  slashArc,
  hitSpark,
  dustPuff,
  arrowShot,
  fireBurst,
  lightning,
  iceShards,
  earthSpikes,
  screenShake,
} from '../effects.js';

// A small test screen for the battle effects. It is not part of the game.
// Open the game with ?lab at the end of the address to see it, for example
//   http://localhost:5173/?lab
// Tap a button to play that effect in the middle of the screen.
export default class EffectsLab extends Phaser.Scene {
  constructor() {
    super('EffectsLab');
  }

  create() {
    fitDesign(this); // laid out for a 720 by 1280 screen, fitted to any shape (layout.js)
    this.cameras.main.setBackgroundColor('#2a1f16');

    this.add
      .text(GAME_WIDTH / 2, 70, 'Effects lab', { fontFamily: 'Georgia, serif', fontSize: '44px', color: '#ffe08a' })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 120, 'Tap a button to play the effect', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#a89a78' })
      .setOrigin(0.5);

    // A patch of ground to play the effects on
    this.add.ellipse(GAME_WIDTH / 2, 560, 300, 130, 0x8a6a3c).setStrokeStyle(3, 0x5a4020);
    this.add.circle(GAME_WIDTH / 2, 510, 20, 0x3fa7a0).setStrokeStyle(3, 0xffffff); // a stand-in unit

    const cx = GAME_WIDTH / 2;
    const cy = 505;
    const effects = [
      ['Slash', () => slashArc(this, cx + 30, cy, 1)],
      ['Hit spark', () => hitSpark(this, cx, cy)],
      ['Dust', () => dustPuff(this, cx, cy + 40)],
      ['Arrow', () => arrowShot(this, cx - 200, cy - 60, cx, cy, () => hitSpark(this, cx, cy))],
      ['Fire', () => fireBurst(this, cx, cy + 40)],
      ['Lightning', () => lightning(this, cx - 90, cy - 220, cx, cy)],
      ['Ice', () => iceShards(this, cx, cy + 30)],
      ['Earth', () => earthSpikes(this, cx, cy + 40)],
      ['Screen shake', () => screenShake(this, 0.008, 250)],
    ];

    effects.forEach(([name, run], i) => {
      const x = 130 + (i % 3) * 230;
      const y = 800 + Math.floor(i / 3) * 120;
      const rect = this.add.rectangle(x, y, 210, 90, 0x6b4f2a).setStrokeStyle(3, 0xe8d5a8).setInteractive({ useHandCursor: true });
      this.add.text(x, y, name, { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#e8d5a8' }).setOrigin(0.5);
      rect.on('pointerdown', run);
    });
  }
}
