#!/bin/bash
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$OUT_DIR/../.."
cat > harness-entry.js << 'EOT'
import Phaser from 'phaser';
import StartScene from './src/scenes/StartScene.js';
import DialogueScene from './src/scenes/DialogueScene.js';
import BattleScene from './src/scenes/BattleScene.js';
import EndScene from './src/scenes/EndScene.js';
import EffectsLab from './src/scenes/EffectsLab.js';
import * as effects from './src/effects.js';
import * as engagement from './src/engagement.js';
import * as status from './src/status.js';
import * as grid from './src/grid.js';
import * as combat from './src/combat.js';
import * as items from './src/items.js';
window.__effects = effects; window.__engagement = engagement; window.__status = status; window.__grid = grid; window.__combat = combat; window.__items = items;
window.__game = new Phaser.Game({ type: Phaser.CANVAS, parent: 'game', width: 720, height: 1280, backgroundColor: '#1a1410', banner: false, audio: { noAudio: true }, loader: { imageLoadType: 'HTMLImageElement' }, scene: [StartScene, DialogueScene, BattleScene, EndScene, EffectsLab] });
EOT
node_modules/.bin/esbuild harness-entry.js --bundle --format=iife --platform=browser --outfile=$OUT_DIR/bundle.js --log-level=error
rm -f harness-entry.js
