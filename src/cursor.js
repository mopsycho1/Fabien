// Suleiman's game cursor (roadmap 8.17, his 31 Oct 09:25 sheet): the stone
// arrowhead with its tassel and coin, in four looks:
//   default  pointing
//   hover    glowing, over something you can tap (a button, a figure, a blue tile)
//   press    with rings, while the mouse button is held down
//   busy     with a dashed ring, while the game is busy (moves playing, the enemy's turn)
// Only on computers: phones and tablets have no cursor. The pictures are in
// public/art/ui (cursor_*.png); where each one's tip is (the spot that
// clicks) is in src/data/cursor.json, both made by dev/tools/cut_cursor31.py.
import spots from './data/cursor.json';

const BACKUP = { default: 'default', hover: 'pointer', press: 'pointer', busy: 'wait' };

function look(name) {
  const [x, y] = spots[name];
  return `url(./art/ui/cursor_${name}.png) ${x} ${y}, ${BACKUP[name]}`;
}

export function installCursor(game) {
  const os = game.device.os;
  if (os.android || os.iOS || os.iPad || os.iPhone || os.windowsPhone || os.kindle) return; // phones and tablets: no cursor
  const looks = { default: look('default'), hover: look('hover'), press: look('press'), busy: look('busy') };
  let pressed = false;
  let shown = null;
  let shownCss = null;
  const canvasOf = () => game.canvas;
  window.addEventListener('mousedown', () => (pressed = true));
  window.addEventListener('mouseup', () => (pressed = false));
  game.events.once('ready', () => game.input.setDefaultCursor(looks.default));
  game.events.on('poststep', () => {
    const canvas = canvasOf();
    if (!canvas || !game.input) return;
    const pointer = game.input.activePointer;
    let state = 'default';
    for (const scene of game.scene.getScenes(true)) {
      if (scene.cursorBusy && scene.cursorBusy()) {
        state = 'busy';
        break;
      }
      if (state !== 'default') continue;
      // a button or anything else that can be tapped under the mouse
      const over = scene.input ? scene.input.hitTestPointer(pointer).filter((o) => o.input && o.input.enabled) : [];
      if (over.length || (scene.cursorHover && scene.cursorHover(pointer.x, pointer.y))) state = 'hover';
    }
    if (state !== 'busy' && pressed) state = 'press';
    // Phaser sets its own hand over some buttons: put ours back when it does
    if (state !== shown || canvas.style.cursor !== shownCss) {
      canvas.style.cursor = looks[state];
      shown = state;
      shownCss = canvas.style.cursor;
    }
  });
}
