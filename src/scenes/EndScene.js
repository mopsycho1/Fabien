import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';

// The last screen, shown when the story runs out of steps.
export default class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1410');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add
      .text(GAME_WIDTH / 2, 460, 'End of Chapter 1', {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        color: '#ffe08a',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 560, 'To be continued...', {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        color: '#e8d5a8',
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(GAME_WIDTH / 2, 760, 300, 96, 0x6b4f2a)
      .setStrokeStyle(4, 0xe8d5a8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2, 760, 'Start over', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#e8d5a8',
      })
      .setOrigin(0.5);

    // Back to the title screen
    button.on('pointerdown', () => this.scene.start('StartScene'));
  }
}
