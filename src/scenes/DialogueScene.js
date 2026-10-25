import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { startStep } from '../story.js';
import dialogue from '../data/dialogue.json';     // every line of story text
import characters from '../data/characters.json'; // names and colors of the speakers
import { createHudTextures, bronzePanel } from '../hud.js';
import { play } from '../audio.js';

// Layout of the text box, in pixels
const BOX_TOP = 700;
const TEXT_LEFT = 60;
const TEXT_TOP = 780;
const TEXT_WIDTH = 600;
const TEXT_MAX_HEIGHT = 370;  // if a line needs more room than this, the text shrinks to fit
const BASE_FONT_SIZE = 30;
const TYPE_DELAY = 22;        // milliseconds between letters appearing

// Plays one dialogue scene from dialogue.json: one line at a time.
// Tap to show the whole line at once. Tap again for the next line.
export default class DialogueScene extends Phaser.Scene {
  constructor() {
    super('DialogueScene');
  }

  // Phaser gives us the data that story.js sent: which step, and which scene.
  init(data) {
    this.stepIndex = data.stepIndex;
    this.sceneId = data.sceneId;
  }

  create() {
    const sceneData = dialogue[this.sceneId];

    // If the scene is missing or empty, say so and move on instead of freezing
    if (!sceneData || !sceneData.lines || sceneData.lines.length === 0) {
      console.warn('dialogue.json: scene "' + this.sceneId + '" is missing or has no lines');
      startStep(this, this.stepIndex + 1);
      return;
    }

    this.lines = sceneData.lines;
    this.lineIndex = 0;
    this.typing = false;     // true while letters are still appearing
    this.typedCount = 0;     // how many letters are showing
    this.fullText = '';      // the whole current line
    this.typer = null;       // the timer that adds letters
    this.ready = false;      // false until the screen has faded in and the first line starts
    this.leaving = false;    // true once the scene is fading out

    this.cameras.main.setBackgroundColor(sceneData.background || '#1a1410');

    // The place name at the top
    this.placeText = this.add
      .text(330, 70, sceneData.place || '', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#c9b98f',
        align: 'center',
        wordWrap: { width: 460 }, // long place names wrap instead of running under Skip
      })
      .setOrigin(0.5);

    // Placeholder portrait: a colored circle with the speaker's first letter.
    // Real art can replace this later.
    this.portrait = this.add
      .circle(GAME_WIDTH / 2, 400, 120, 0x666666)
      .setStrokeStyle(6, 0xe8d5a8)
      .setVisible(false);
    this.portraitLetter = this.add
      .text(GAME_WIDTH / 2, 400, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '110px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setVisible(false);

    // The text box
    createHudTextures(this);
    bronzePanel(this, 40, BOX_TOP, 640, 500);

    this.nameText = this.add.text(TEXT_LEFT, BOX_TOP + 35, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      color: '#ffe08a',
    });

    this.bodyText = this.add.text(TEXT_LEFT, TEXT_TOP, '', {
      fontFamily: 'Georgia, serif',
      fontSize: BASE_FONT_SIZE + 'px',
      color: '#f1e6c8',
      wordWrap: { width: TEXT_WIDTH },
    });

    // A little triangle in the corner that pulses to say "tap to continue"
    const arrow = this.add.triangle(650, 1165, 0, 0, 26, 0, 13, 18, 0xe8d5a8);
    this.tweens.add({ targets: arrow, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // Skip button: jumps past the rest of this scene
    const skipRect = this.add
      .rectangle(645, 70, 110, 56, 0x3a2a18)
      .setStrokeStyle(3, 0xe8d5a8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(645, 70, 'Skip', { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#e8d5a8' })
      .setOrigin(0.5);
    skipRect.on('pointerdown', () => this.leave());

    // Any tap on the screen moves the story along
    // (taps on the Skip button are handled by the button, so we ignore them here)
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (currentlyOver.length > 0) return;
      this.advance();
    });

    // Fade up from black, then start the first line once the screen is clear
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.time.delayedCall(700, () => {
      this.ready = true;
      this.showLine(0);
    });
  }

  // Puts one line of the scene on screen.
  showLine(i) {
    const line = this.lines[i];
    const isNarration = !line.speaker; // no speaker means the story is describing something
    const speaker = line.speaker ? characters[line.speaker] : null;

    if (line.speaker && !speaker) {
      console.warn('dialogue.json: speaker "' + line.speaker + '" is not in characters.json');
    }

    // A line can change the place name shown at the top
    if (line.place) {
      this.placeText.setText(line.place);
    }

    // Portrait and name only for someone speaking
    const name = speaker ? speaker.name : line.speaker || '';
    this.portrait.setVisible(!isNarration);
    this.portraitLetter.setVisible(!isNarration);
    if (!isNarration) {
      const color = speaker ? Phaser.Display.Color.HexStringToColor(speaker.color).color : 0x666666;
      this.portrait.setFillStyle(color);
      this.portraitLetter.setText(name.charAt(0));
    }
    this.nameText.setText(name);

    this.startTyping(line.text, isNarration);
  }

  // Makes the text appear one letter at a time.
  startTyping(text, isNarration) {
    this.fullText = text;

    // Narration is in slanted, softer text. Speech is upright and brighter.
    this.bodyText.setFontStyle(isNarration ? 'italic' : 'normal');
    this.bodyText.setColor(isNarration ? '#cfc3a0' : '#f1e6c8');

    // Measure the whole line first. If it is too tall for the box, shrink the
    // letters a little until it fits.
    let size = BASE_FONT_SIZE;
    this.bodyText.setFontSize(size + 'px');
    this.bodyText.setText(text);
    while (this.bodyText.height > TEXT_MAX_HEIGHT && size > 20) {
      size -= 2;
      this.bodyText.setFontSize(size + 'px');
    }

    // Now start from an empty box and add letters
    this.bodyText.setText('');
    this.typedCount = 0;
    this.typing = true;

    if (this.typer) this.typer.remove();
    this.typer = this.time.addEvent({
      delay: TYPE_DELAY,
      loop: true,
      callback: () => {
        this.typedCount++;
        this.bodyText.setText(this.fullText.slice(0, this.typedCount));
        if (this.typedCount >= this.fullText.length) {
          this.finishTyping();
        }
      },
    });
  }

  // Shows the whole line right now.
  finishTyping() {
    if (this.typer) {
      this.typer.remove();
      this.typer = null;
    }
    this.typedCount = this.fullText.length;
    this.bodyText.setText(this.fullText);
    this.typing = false;
  }

  // What a tap does: finish the line if it is still typing, otherwise go on.
  advance() {
    if (!this.ready || this.leaving) return; // ignore taps during the fades

    if (this.typing) {
      this.finishTyping();
      return;
    }

    this.lineIndex++;
    play('click');
    if (this.lineIndex >= this.lines.length) {
      this.leave(); // scene finished: fade out, then on to the next step
      return;
    }
    this.showLine(this.lineIndex);
  }

  // Fades to black, then starts the next step of the story.
  leave() {
    if (this.leaving) return;
    this.leaving = true;

    if (this.typer) {
      this.typer.remove();
      this.typer = null;
    }

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => startStep(this, this.stepIndex + 1));
  }
}
