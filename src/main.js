import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import StartScene from './scenes/StartScene.js';
import DialogueScene from './scenes/DialogueScene.js';
import BattleScene from './scenes/BattleScene.js';
import EndScene from './scenes/EndScene.js';
import EffectsLab from './scenes/EffectsLab.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',            // the <div id="game"> in index.html
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1410',
  scale: {
    mode: Phaser.Scale.FIT,  // shrink or grow to fit any screen, keeping the shape
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // The first scene in this list starts first. StartScene then hands over to
  // the story (see src/data/story.json).
  // Adding ?lab to the web address opens the effects test screen first
  scene: window.location.search.includes('lab')
    ? [EffectsLab, StartScene, DialogueScene, BattleScene, EndScene]
    : [StartScene, DialogueScene, BattleScene, EndScene, EffectsLab],
  loader: { imageLoadType: 'HTMLImageElement' }, // load pictures straight from their files
});
