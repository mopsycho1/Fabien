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
import * as spellArt from './src/spellArt.js';
import * as knockback from './src/knockback.js';
import * as enemyAi from './src/enemyAi.js';
import * as artLib from './src/art.js';
import * as fxLayers from './src/fxLayers.js';
import * as codeWalk from './src/codeWalk.js';
import * as ending from './src/ending.js';
import * as saveGame from './src/saveGame.js';
import * as tooltip from './src/tooltip.js';
import SelectScene from './src/scenes/SelectScene.js';
import * as lineup from './src/lineup.js';
import * as artUrlLib from './src/artUrl.js';
import * as battleLoad from './src/battleLoad.js';
window.__artUrl = artUrlLib; window.__battleLoad = battleLoad; // loading (18.47)
import unitList from './src/data/units.json';
window.__lineup = lineup; window.__unitList = unitList; // the character select (18.30)
window.__tooltip = tooltip; window.__effects = effects; window.__engagement = engagement; window.__status = status; window.__grid = grid; window.__combat = combat; window.__items = items; window.__fx = spellArt; window.__knockback = knockback; window.__ai = enemyAi; window.__art = artLib; window.__layers = fxLayers; window.__walk = codeWalk; window.__ending = ending; window.__save = saveGame;
window.__game = new Phaser.Game({ type: Phaser.CANVAS, parent: 'game', width: 720, height: 1280, backgroundColor: '#1a1410', banner: false, audio: { noAudio: true }, loader: { imageLoadType: 'HTMLImageElement' }, scene: [StartScene, DialogueScene, SelectScene, BattleScene, EndScene, EffectsLab] });
EOT
node_modules/.bin/esbuild harness-entry.js --bundle --format=iife --platform=browser --outfile=$OUT_DIR/bundle.js --log-level=error
rm -f harness-entry.js
# The rules on their own, for the tests that need no screen (duel-rules, duel-odds, archer, echo, n28).
# These two files used to be built by hand and went stale (found 13 Nov): now they are rebuilt every time.
node_modules/.bin/esbuild src/engagement.js --bundle --format=cjs --platform=node --outfile=$OUT_DIR/eng-bundle.cjs --log-level=error
node_modules/.bin/esbuild src/combat.js --bundle --format=cjs --platform=node --outfile=$OUT_DIR/combat-bundle.cjs --log-level=error
node_modules/.bin/esbuild src/clashGif.js --bundle --format=cjs --platform=node --outfile=$OUT_DIR/cg-bundle.cjs --log-level=error
