import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from '../config.js';
import {
  tileToScreen,
  screenToTile,
  isInsideGrid,
  setTileHeights,
  getHeight,
  tileSideDepth,
  depthFor,
  pointInTileTop,
  setRotation,
  getRotation,
  toView,
} from '../grid.js';
import { getReachableTiles, getPath } from '../movement.js';
import { startNextTurn, previewTurns } from '../turnOrder.js';
import { getHitChance, getDamage, getTargetsInRange, inReach, rollAttack, usesCloseWeapon, distance, isDistracted, chainTarget, chainDamage, setHeightLookup, heightAccuracy } from '../combat.js';
import terrain from '../data/terrain.json'; // height rules: accuracy, falls, pushes
import { chooseMoveTile, isCaster } from '../enemyAi.js';
import { lightningStrike, verseAura, speedStreak, slowCast, slowAura } from '../spellArt.js';
import { takeHit, afterBeat, pushResist, pushExtra, autoPick, holdingSignature } from '../signature.js';
import { startStep } from '../story.js';
import { buildUnit } from '../jobs.js';
import { hasArt, artHeight, standingFrame, standingKeys, poseFrame, portraitKey, shoutKey, moodFaceKey, ALERT_RANGE, HURT_FACE_AT } from '../art.js';
import { createHudTextures, bronzePanel, framePanel, diamondPortrait, framedPortrait, CommandButton, portraitMedallion, roundPortrait, drawIcon, textStyle, UI } from '../hud.js';
import { createAtmosphere } from '../atmosphere.js';
import { play, startBattleMusic, stopMusic, isMuted, setMuted } from '../audio.js';
import { createBoardTextures, drawTileBlock, drawUnderside, drawBackdrop, drawScenery, setBoardSetting } from '../boardArt.js';
import { slashArc, hitSpark, dustPuff, arrowShot, screenShake, lightning, buffAura, clashFlash, heavySlash, impactBurst, groundRing, emberBurst, lightColumn } from '../effects.js';
import {
  isMelee,
  styleOf,
  engageTargets,
  startEngagement,
  endEngagement,
  resolveContest,
  lossResponse,
  pushDistance,
  displacementPath,
  breakAwayContest,
  escapeTile,
  contestParts,
  sumParts,
  contestEdge,
  isStanceDuel,
  engagementRules,
  startDuel,
  endDuel,
  momentumOf,
  resetMomentum,
  poiseOf,
  refillPoise,
  stanceName,
  stanceAffinity,
  autoStance,
  resolveBeat,
  aiStance,
  answerStance,
  openingHeightBonus,
} from '../engagement.js';
import { applyOffBalance, clearOffBalance, isOffBalance, applyBuff, buffOf, tickBuff, statusTags, statMod, moveOf, applySlow, applyExposed, clearExposed, canAfford, spendMp, restoreMp, affinityTimes, startCooldown, cooldownOf, applyPoison, isPoisoned, curePoison, tickPoison, applyStun, isStunned, clearStun } from '../status.js';
import unitData from '../data/units.json'; // the list of units lives in its own file
import jobs from '../data/jobs.json';       // the numbers for each job
import mapData from '../data/map.json';     // the height of every tile
import spells from '../data/spells.json';   // the Sage's spells

// Says when a spell can be used, from its "use" tag in spells.json.
function useText(spell) {
  if (spell.use === 'enemy' || spell.use === 'ally') return spell.cooldown ? 'ready again after ' + spell.cooldown + ' turns' : 'a skill';
  if (spell.use === 'both') return 'works in a clash too';
  if (spell.use === 'engagement') return 'only in a clash';
  return 'not during a clash';
}

// One color for each side
const SIDE_COLORS = { hero: 0x3fa7a0, enemy: 0xb5523b };
const GOLD = 0xffe08a;
const BAR_WIDTH = 48;    // width of a unit's health bar, in pixels
const HERO_BAR = 0x6fcf7f;  // heroes' health bars are green
const ENEMY_BAR = 0xd9483b; // enemies' are red (as in Suleiman's mock)
const LOW_BAR = 0xe8823a;   // a hero's bar turns orange when low
// The rows of the command list, top to bottom (see layoutCommands)
const ROWS = [989, 1050, 1111, 1172, 1233];
const UNIT_RADIUS = 22;  // size of a unit's circle
const UNIT_LIFT = 26;    // how far above its tile the circle floats, so it looks like it stands on it
const HIT_RADIUS = 26;   // how close a tap must be to a unit's circle to count as tapping that unit (a little bigger than the circle)
const ENGAGE_COLOR = 0xff9a2e; // orange: engagements
// A caster hidden by Husk is drawn as light (see hiddenLook): this strong
// (1 = full) and this warm gold. Light adds to what is behind her, so the
// floor always shows through.
const HIDDEN_ALPHA = 0.6;
const HIDDEN_GLOW = 0xffc46a;
const STYLE_NAMES = { overpower: 'Overpower', defence: 'Defence', evasion: 'Evasion' };

// The helpers the engagement rules use: real dice, and the real tile heights
const CONTEST_CTX = { random: (...a) => Math.random(...a), heightOf: (col, row) => getHeight(col, row) };

// A Phaser "scene" is one screen of the game. This one is the battle screen.
export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  // Phaser calls init() first. story.js tells us which step of the story this
  // battle is, so we know where to go when it is won.
  // (null means the battle was started on its own, outside the story.)
  init(data) {
    this.stepIndex = data && data.stepIndex !== undefined ? data.stepIndex : null;
  }

  // Phaser calls create() once, when the scene starts.
  create() {
    // Two cameras. The main one films the battlefield and can zoom, pan and
    // shake. The UI camera films only the interface, which always stays still.
    // Every new object is hidden from the UI camera unless this.ui() marks it.
    this.uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.events.on('addedtoscene', (go) => {
      go.cameraFilter |= this.uiCam.id;
    });
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.uiCam.fadeIn(500, 0, 0, 0);

    setTileHeights(mapData.heights); // tell grid.js how high each tile is
    setHeightLookup(getHeight);       // and the attack rules, for shooting from high ground
    // The battle's speed factors (see setSpeed). A restarted battle starts at normal speed.
    this.speed = { base: 1, skip: 1, hitStop: 1, slowMo: 1 };
    this.inHitStop = false;
    this.inCinematic = false;
    this.setSpeed('base', 1);

    setBoardSetting(mapData.setting); // "cave" or "wasteland" (see map.json)
    createBoardTextures(this); // paint the ground textures once
    drawBackdrop(this);        // the cave's darkness, or the sky
    createAtmosphere(this, mapData.setting); // light and dust in a cave; clouds, sun, sand and embers outside
    setRotation(0);            // a new battle starts with the camera on its first side
    this.rotating = false;
    this.buildBoard();         // the tiles, the floor around them and the scenery

    // Things the scene remembers between taps
    //   mode: what the player is doing right now
    //     'idle'   = nothing chosen
    //     'move'   = choosing a tile to walk to (blue squares)
    //     'attack' = choosing someone to attack (red squares)
    //     'engage' = choosing an enemy to engage (orange squares)
    //     'spell'  = choosing which spell to cast (the buttons change)
    //     'spellTarget' = choosing who gets the spell (gold squares)
    this.mode = 'idle';
    this.busy = false;              // true while something is moving or attacking
    this.battleOver = false;        // true once one side has been wiped out
    this.turnCount = 0;             // how many turns have been played
    this.highlights = [];           // the colored squares currently on screen
    this.reachableKeys = new Set(); // tiles the unit may walk to, written like "3,5"
    this.targetsInRange = [];       // the enemies the active hero can attack
    this.pendingTarget = null;      // the enemy picked, waiting for a second tap
    this.selectedSpell = null;      // the spell picked, waiting for a target
    this.spellGroup = null;         // a group of spells opened in the menu, like 'Verse'
    this.pendingTile = null;        // the tile picked for Husk, waiting for a second tap
    this.approach = null;           // tap-to-attack: { target, tile, options, optionKeys } while previewing
    this.stanceMenu = 'main';       // in a clash: 'main' (Press, Guard, Slip, More) or 'more'
    this.empower = false;           // in a clash: spend 1 Poise to empower the next stance
    this.decoys = [];               // Husk decoys (see addDecoy)
    // clash stances: 'auto' (the default, from engagement.json) or 'manual', remembered on this device
    let savedChoice = null;
    try {
      savedChoice = window.localStorage.getItem('fabien.stanceChoice');
    } catch (e) {
      savedChoice = null;
    }
    this.stanceChoice = savedChoice === 'auto' || savedChoice === 'manual' ? savedChoice : engagementRules.stanceChoice || 'auto';
    this.engageMarks = [];          // the lines and icons drawn between engaged units
    this.inCinematic = false;       // true while a cut-in or clash plays (a tap speeds it up)
    this.viewing = null;            // a unit the player tapped to look at
    this.idleLifeOn = true;         // units glance around between turns
    this.resultButtons = [];

    // Build every unit from the list in src/data/units.json.
    // buildUnit fills in each unit's numbers from its job (see jobs.js).
    // (a unit with "bench": true in units.json sits this battle out)
    this.units = unitData.filter((entry) => !entry.bench).map((entry) => this.createUnit(buildUnit(entry, jobs)));

    createHudTextures(this);
    this.buildHud();

    // Listen for every tap (phone) or click (computer) on the game.
    // "currentlyOver" lists the buttons under the finger. If there is one,
    // the button handles the tap, so we skip it here.
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      // During a cut-in or clash, any tap speeds it up
      if (this.inCinematic) {
        this.skipCinematic();
        return;
      }
      if (currentlyOver.length > 0) return;
      // where the finger is on the battlefield, allowing for any camera zoom or pan
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const { col, row } = this.tileAtPoint(world.x, world.y);
      this.handleTap(col, row);
    });

    // On a wide computer screen there are dark margins to the left and right
    // of the game. Those clicks land on the web page, not on the game, so
    // Phaser reports them with this separate event. We treat them as a tap
    // far outside the board, which cancels the current choice.
    this.input.on('pointerdownoutside', () => {
      this.handleTap(-1, -1);
    });

    this.events.once('shutdown', () => stopMusic());
    startBattleMusic();
    this.startIdleLife();

    // Start the battle: work out who goes first
    this.startTurn();
  }

  // Marks an interface object (and everything inside it) as part of the UI:
  // filmed by the still UI camera, not by the moving battlefield camera.
  ui(go) {
    const mark = (o) => {
      o.cameraFilter = this.cameras.main.id;
      if (o.list) o.list.forEach(mark);
    };
    mark(go);
    return go;
  }

  // ---------- The interface ----------

  // Builds the frame around the battle, in the slim style of Suleiman's mock:
  // the title and turn counter across the top, the turn order as diamond
  // portraits, and at the bottom a hint line, the card of the unit in focus,
  // and the list of commands.
  buildHud() {
    const W = GAME_WIDTH;

    // Top: a dark fade, so the title and the faces read over the cave
    const fade = this.add.graphics();
    for (let i = 0; i < 18; i++) {
      fade.fillStyle(0x0b0806, 0.94 * (1 - i / 18));
      fade.fillRect(0, i * 10, W, 10);
    }
    this.ui(fade);

    // Title on the left: FABIEN  ◆  OF GODS & MEN
    const title = this.ui(this.add.text(26, 32, 'FABIEN', textStyle(25, '#e8cf9a', { strokeThickness: 0 })).setOrigin(0, 0.5).setLetterSpacing(7));
    const gem = this.add.graphics();
    const gx = 26 + title.width + 16;
    gem.lineStyle(1.5, UI.bronzeLight, 1);
    gem.strokePoints([{ x: gx, y: 26 }, { x: gx + 6, y: 32 }, { x: gx, y: 38 }, { x: gx - 6, y: 32 }], true);
    gem.fillStyle(UI.bronzeLight, 1);
    gem.fillCircle(gx, 32, 1.5);
    this.ui(gem);
    this.ui(this.add.text(gx + 18, 33, 'OF GODS & MEN', textStyle(15, '#cdb27a', { strokeThickness: 0 })).setOrigin(0, 0.5).setLetterSpacing(4));

    // Right: the turn counter, then sound on and off
    this.turnCounter = this.ui(this.add.text(W - 78, 32, 'Turn 1', textStyle(17, '#d8c8a4', { strokeThickness: 0 })).setOrigin(1, 0.5));
    const sep = this.add.graphics();
    sep.lineStyle(1, UI.bronze, 0.7);
    sep.lineBetween(W - 64, 20, W - 64, 44);
    this.ui(sep);
    const mx = W - 38;
    const my = 32;
    const muteIcon = this.add.graphics();
    const drawMute = () => {
      muteIcon.clear();
      drawIcon(muteIcon, isMuted() ? 'mute' : 'sound', mx, my, 26, UI.bronzeLight);
    };
    drawMute();
    const muteHit = this.add.circle(mx, my, 26, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    muteHit.on('pointerdown', () => {
      setMuted(!isMuted());
      drawMute();
      play('click');
    });
    this.ui(muteIcon);
    this.ui(muteHit);

    // thin gold lines under the title and under the turn order
    const lines = this.add.graphics();
    lines.lineStyle(1, UI.bronze, 0.6);
    lines.lineBetween(20, 58, W - 20, 58);
    lines.lineStyle(1, UI.bronze, 0.3);
    lines.lineBetween(20, 164, W - 20, 164);
    this.ui(lines);
    this.turnStripLayer = this.ui(this.add.container(0, 0));

    // Turn the camera: two round buttons at the bottom corners of the board
    // (or Q and E on a keyboard)
    const turnButton = (x, dir) => {
      const g = this.add.graphics();
      g.fillStyle(0x0d0906, 0.85);
      g.fillCircle(x, 818, 30);
      g.lineStyle(1.5, UI.bronzeLight, 0.85);
      g.strokeCircle(x, 818, 30);
      // a curved arrow going round
      g.lineStyle(3, UI.bronzeLight, 1);
      g.beginPath();
      g.arc(x, 818, 14, dir > 0 ? Math.PI * 1.1 : Math.PI * 1.9, dir > 0 ? Math.PI * 0.35 : Math.PI * 0.65, dir < 0);
      g.strokePath();
      const ax = x + (dir > 0 ? 14 * Math.cos(Math.PI * 0.35) : 14 * Math.cos(Math.PI * 0.65));
      const ay = 818 + 14 * Math.sin(Math.PI * 0.35);
      g.fillStyle(UI.bronzeLight, 1);
      g.fillTriangle(ax - 6, ay - 3, ax + 6, ay - 3, ax + (dir > 0 ? -2 : 2), ay + 7);
      const hit = this.add.circle(x, 818, 34, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.rotateCamera(dir));
      this.ui(g);
      this.ui(hit);
    };
    turnButton(50, -1);
    turnButton(W - 50, 1);
    this.input.keyboard?.on('keydown-Q', () => this.rotateCamera(-1));
    this.input.keyboard?.on('keydown-E', () => this.rotateCamera(1));

    // A small map of the board by the left button: the gold dot is the
    // board's first corner, so you can tell which side you are looking from
    this.compass = this.ui(this.add.graphics());
    this.refreshCompass();

    // The hint line above the bottom panel, with an "i" in front of the words
    const ribbon = this.add.graphics();
    ribbon.fillStyle(0x0d0906, 0.88);
    ribbon.fillRoundedRect(36, 866, W - 72, 66, 10);
    ribbon.lineStyle(1.5, UI.bronze, 0.9);
    ribbon.strokeRoundedRect(36, 866, W - 72, 66, 10);
    ribbon.lineStyle(1, UI.bronzeDark, 0.9);
    ribbon.strokeRoundedRect(40, 870, W - 80, 58, 8);
    this.ui(ribbon);
    this.infoIcon = this.ui(this.add.graphics());
    this.statusText = this.ui(
      this.add.text(W / 2 + 14, 899, '', textStyle(22, '#f1e6c8', { align: 'center', wordWrap: { width: W - 150 } })).setOrigin(0.5)
    );
    // whenever the words change, the "i" moves to sit just in front of them
    const setWords = this.statusText.setText.bind(this.statusText);
    this.statusText.setText = (words) => {
      setWords(words);
      const ix = Math.max(64, this.statusText.x - this.statusText.width / 2 - 24);
      this.infoIcon.clear();
      drawIcon(this.infoIcon, 'info', ix, 899, 26, UI.bronzeLight);
      return this.statusText;
    };

    // Bottom: a dark base, the unit card (left) and the commands (right)
    const base = this.add.graphics();
    base.fillStyle(0x0b0806, 0.97);
    base.fillRect(0, 944, W, GAME_HEIGHT - 944);
    base.lineStyle(1, UI.bronze, 0.5);
    base.lineBetween(0, 944, W, 944);
    this.ui(base);
    this.ui(framePanel(this, 12, 952, 390, 318, { ornament: true }));
    this.ui(framePanel(this, 410, 952, 298, 318));

    // The card of the unit in focus is drawn by refreshCard
    this.cardLayer = this.ui(this.add.container(0, 0));

    // The commands: four rows the game fills as the situation changes (the
    // last is End turn or Back), plus Items just above it
    this.slots = [0, 1, 2, 4].map((row) => {
      const button = new CommandButton(this, 559, ROWS[row], 278, 54);
      this.ui(button.view);
      return button;
    });
    this.itemsButton = new CommandButton(this, 559, ROWS[3], 278, 54);
    this.ui(this.itemsButton.view);
    // Two half buttons that share the third row, for fighters with skills: Engage | Skills
    this.halves = [559 - 72, 559 + 72].map((x) => {
      const button = new CommandButton(this, x, ROWS[2], 134, 54, { compact: true });
      this.ui(button.view);
      button.set(null);
      return button;
    });
    this.moveButton = this.slots[0];
    this.attackButton = this.slots[1];
    this.endButton = this.slots[3];
  }

  // The commands that are showing stack from the top, so a menu with fewer
  // choices (a clash, a list of spells) has no gaps.
  layoutCommands() {
    const [a, b, c, d] = this.slots;
    const third = this.halves[0].view.visible || this.halves[1].view.visible ? this.halves : [c];
    const rows = [[a], [b], third, [this.itemsButton], [d]].filter((row) => row.some((button) => button.view.visible));
    rows.forEach((row, i) => row.forEach((button) => button.setY(ROWS[i])));
  }

  // The card for one unit, as in the mock: a framed portrait, name, job and
  // style, health (and magic for casters), numbers in two rows, and conditions.
  refreshCard(unit, viewing = false) {
    const L = this.cardLayer;
    L.removeAll(true);
    if (!unit) return;

    L.add(framedPortrait(this, 38, 968, 112, 164, unit, portraitKey(unit.id, unit)));
    const x = 168;
    L.add(this.add.text(x, 964, unit.name, textStyle(29, '#f1e6c8', { strokeThickness: 0 })));
    const role = isMelee(unit) ? STYLE_NAMES[styleOf(unit)] : unit.attackType === 'magic' ? 'Magic' : unit.spells && unit.spells.length ? 'Support' : 'Ranged';
    L.add(this.add.text(x, 1004, unit.jobName + '  ·  ' + role, textStyle(17, '#a89a78', { strokeThickness: 0 })));
    L.add(
      this.add
        .text(390, 968, (viewing ? 'viewing · ' : '') + (unit.side === 'hero' ? 'ALLY' : 'FOE'), textStyle(13, unit.side === 'hero' ? '#7fd6cf' : '#ff8a6a', { strokeThickness: 0 }))
        .setOrigin(1, 0)
    );

    // a long rounded bar, green for health (orange when low, red for an enemy)
    const bar = (y, frac, color) => {
      const g = this.add.graphics();
      g.fillStyle(UI.ink, 1);
      g.fillRoundedRect(x, y, 216, 14, 7);
      g.fillStyle(color, 1);
      if (frac > 0) g.fillRoundedRect(x + 2, y + 2, Math.max(10, 212 * frac), 10, 5);
      g.lineStyle(1.5, UI.bronze, 1);
      g.strokeRoundedRect(x, y, 216, 14, 7);
      return g;
    };
    const frac = Math.max(0, unit.hp / unit.maxHp);
    L.add(bar(1038, frac, unit.side === 'enemy' ? ENEMY_BAR : frac <= 0.35 ? LOW_BAR : HERO_BAR));
    L.add(this.add.text(x, 1060, 'HP   ' + unit.hp + ' / ' + unit.maxHp, textStyle(18, '#f1e6c8', { strokeThickness: 0 })));
    // magic only for units that have it (the mock's MP bar on Gaha was left out: he has none)
    if (unit.maxMp > 0) {
      L.add(bar(1094, unit.mp / unit.maxMp, 0x4f8fe0));
      L.add(this.add.text(x, 1116, 'MP   ' + unit.mp + ' / ' + unit.maxMp, textStyle(18, '#8fbfff', { strokeThickness: 0 })));
    }

    // The numbers as they are right now, spells included (a Verse of Stone shows in DEF)
    const div = this.add.graphics();
    div.lineStyle(1, UI.bronzeDark, 1);
    div.lineBetween(28, 1148, 388, 1148);
    L.add(div);
    const now = (stat) => unit[stat] + statMod(unit, stat);
    const last = unit.contest && isStanceDuel() ? 'POISE ' + poiseOf(unit) + '/' + engagementRules.poise.max : unit.maxMp > 0 ? 'MP ' + unit.mp + '/' + unit.maxMp : '';
    const grid = [
      ['ATK ' + now('attack'), 'DEF ' + now('defense'), 'MAG ' + now('magicAttack'), 'MDF ' + now('magicDefense')],
      ['SPD ' + unit.speed, 'MOV ' + moveOf(unit), 'RNG ' + unit.range, last],
    ];
    grid.forEach((row, r) =>
      row.forEach((words, c) => {
        if (words) L.add(this.add.text(32 + c * 92, 1160 + r * 30, words, textStyle(16, '#cdbb94', { strokeThickness: 0 })).setLetterSpacing(1));
      })
    );

    // conditions as small chips (a spell on the unit shows its turns left)
    let cx = 30;
    const buff = buffOf(unit);
    for (const tag of statusTags(unit)) {
      const words = buff && tag.text === buff.short ? tag.text + ' ' + buff.turnsLeft : tag.text;
      const t = this.add.text(0, 0, words, textStyle(13, tag.color, { fontStyle: 'bold', strokeThickness: 0 }));
      const w = t.width + 12;
      if (cx + w > 392) break; // no room for more
      const chip = this.add.graphics();
      chip.fillStyle(UI.ink, 1);
      chip.fillRoundedRect(cx, 1226, w, 24, 5);
      chip.lineStyle(1, UI.bronze, 1);
      chip.strokeRoundedRect(cx, 1226, w, 24, 5);
      t.setPosition(cx + 6, 1230);
      L.add([chip, t]);
      cx += w + 5;
    }
    this.ui(L);
  }

  // Draws the whole board, one tile block at a time.
  // We go from the far corner to the near corner, so tiles in front are drawn
  // over tiles behind them.
  // Draws everything that belongs to the board (and changes when the camera
  // turns): the floor around it, the tiles, and the scenery. It remembers what
  // it drew, so turning the camera can clear it and draw it again.
  buildBoard() {
    const before = new Set(this.children.list);
    drawUnderside(this); // the cave floor around the board, or the rock hanging under it
    this.drawBoard();
    drawScenery(this, mapData); // cliffs behind the board, the sigil wall, sandfalls
    this.boardObjects = this.children.list.filter((o) => !before.has(o));
  }

  // Turns the camera a quarter turn around the board: dir 1 = clockwise
  // (the board turns left), -1 = the other way. The battle itself does not
  // change at all, only where things are drawn: a quick fade, the board is
  // drawn again from the new side, and every figure moves to its tile.
  rotateCamera(dir) {
    if (this.rotating || this.busy || this.inCinematic || this.battleOver) return;
    this.rotating = true;
    play('select');
    const cam = this.cameras.main;
    cam.fadeOut(110, 10, 6, 4);
    cam.once('camerafadeoutcomplete', () => {
      setRotation(getRotation() + dir);
      for (const o of this.boardObjects) {
        this.tweens.killTweensOf(o);
        o.destroy();
      }
      this.buildBoard();
      this.placeEveryone();
      cam.fadeIn(170, 10, 6, 4);
      this.rotating = false;
      this.refreshCompass();
    });
  }

  // The little board diamond by the turn button, with a dot on the corner
  // where the map's first tile is.
  refreshCompass() {
    const g = this.compass;
    if (!g) return;
    const cx = 108;
    const cy = 818;
    g.clear();
    g.fillStyle(UI.ink, 0.85);
    g.fillPoints([{ x: cx, y: cy - 13 }, { x: cx + 22, y: cy }, { x: cx, y: cy + 13 }, { x: cx - 22, y: cy }], true);
    g.lineStyle(2, UI.bronze, 1);
    g.strokePoints([{ x: cx, y: cy - 13 }, { x: cx + 22, y: cy }, { x: cx, y: cy + 13 }, { x: cx - 22, y: cy }], true);
    const { vc, vr } = toView(0, 0);
    const n = GRID_SIZE - 1;
    const fx = (vc - vr) / n; // -1 .. 1 across
    const fy = (vc + vr) / n - 1; // -1 .. 1 down
    g.fillStyle(GOLD, 1);
    g.fillCircle(cx + fx * 15, cy + fy * 9, 4);
  }

  // Puts every figure, decoy and marker back on its tile (after the camera turns).
  placeEveryone() {
    for (const u of this.units) {
      if (!u.view || !u.view.active) continue;
      const p = tileToScreen(u.col, u.row);
      u.view.setPosition(p.x, p.y).setDepth(depthFor(u.col, u.row) + 1);
    }
    for (const d of this.decoys) {
      const p = tileToScreen(d.col, d.row);
      d.view.setPosition(p.x, p.y).setDepth(depthFor(d.col, d.row) + 1);
    }
    for (const u of this.units) if (u.alive) this.faceNearestOpponent(u);
    this.refreshEngagementMarks();
    // the colored tiles of the current choice are drawn again from the new side
    const mode = this.mode;
    if (mode === 'move') {
      this.cancelMode();
      this.startMove();
    } else if (mode === 'attack') {
      this.cancelMode();
      this.startAttack();
    } else if (mode !== 'idle' && mode !== 'spell') {
      this.cancelMode();
    }
  }

  drawBoard() {
    // (each piece sets its own drawing depth, so the order here does not matter)
    for (let sum = 0; sum <= (GRID_SIZE - 1) * 2; sum++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const row = sum - col;
        if (row < 0 || row >= GRID_SIZE) continue;
        drawTileBlock(this, col, row, mapData);
      }
    }
  }

  // Works out which tile a tap landed on.
  //
  // Figures are taller than their tiles, so a figure standing in front can
  // cover the tile (and the figure) behind it. To make sure you can always
  // reach the one you mean:
  //   1. While choosing a target (attack, engage, spell), a unit you can
  //      actually choose wins: first the one you can see under your finger
  //      (drawn in front), then the one on the tile under your finger, then
  //      any choosable figure under your finger, even one standing behind.
  //   2. An enemy you can see under your finger (drawn in front) means that
  //      enemy, even where it overlaps your own unit or a blue tile: tapping
  //      it attacks it.
  //   3. While choosing where to walk, a blue tile under your finger wins.
  //   4. Otherwise the unit whose turn it is wins (so you can always select it),
  //      then the figure drawn in front under your finger, then the tile itself.
  tileAtPoint(x, y) {
    const tile = screenToTile(x, y);
    const onTile = isInsideGrid(tile.col, tile.row) ? this.getUnitAt(tile.col, tile.row) : undefined;
    // Every figure under the finger, the one whose middle is closest to the finger first
    // (so tapping the visible part of a figure behind another one picks the one behind)
    const closeness = (u) => Math.hypot(x - u.view.x, y - (u.view.y - u.centerY));
    const bodies = this.units
      .filter((u) => u.alive && this.bodyContains(u, x, y))
      .sort((a, b) => closeness(a) - closeness(b));
    const at = (u) => ({ col: u.col, row: u.row });
    // The figure the player actually sees under the finger: checked against the
    // real pictures (front to back), or failing that, the tap boxes
    const seen = this.figureAt(x, y) || bodies.slice().sort((a, b) => b.view.depth - a.view.depth)[0];
    const active = this.activeUnit;

    if (this.targetsInRange.length > 0 && (this.mode === 'attack' || this.mode === 'engage' || this.mode === 'spellTarget' || this.mode === 'approach')) {
      if (seen && this.targetsInRange.includes(seen)) return at(seen);
      // A tap on a choosable figure's body (above its feet) means that figure,
      // even when the top of a raised tile behind it is under the same spot.
      const torso = bodies.find((u) => this.targetsInRange.includes(u) && this.torsoContains(u, x, y));
      if (torso) return at(torso);
      if (onTile && this.targetsInRange.includes(onTile)) return tile;
      const target = bodies.find((u) => this.targetsInRange.includes(u));
      if (target) return at(target);
      // The target's tile may be partly hidden behind a taller block in front of it
      const hiddenTile = this.targetsInRange.find((u) => pointInTileTop(x, y, u.col, u.row));
      if (hiddenTile) return at(hiddenTile);
    }

    // An enemy you can see under your finger means that enemy, even where it
    // overlaps your own unit's figure or a blue tile: tapping it attacks it.
    // Only when it really can be attacked this turn, though. After attacking
    // (or when it is out of reach) the blue tile behind it wins instead.
    const canStrike = (u) => active.side === 'hero' && !active.hasActed && !active.engagedWith && this.approachTiles(active, u).length > 0;
    if (seen && active && seen.side !== active.side && (this.mode === 'idle' || this.mode === 'move' || this.mode === 'approach') && canStrike(seen)) {
      return at(seen);
    }

    if (this.mode === 'move' || this.mode === 'huskTile' || this.mode === 'approach') {
      if (this.reachableKeys.has(tile.col + ',' + tile.row)) return tile;
      // A blue tile partly hidden behind a taller block in front of it
      for (const key of this.reachableKeys) {
        const [col, row] = key.split(',').map(Number);
        if (!this.getUnitAt(col, row) && pointInTileTop(x, y, col, row)) return { col, row };
      }
    }

    if (active && active.alive && (onTile === active || bodies.includes(active))) return at(active);
    if (seen) return at(seen);
    return tile;
  }

  // The figure whose picture is actually drawn at (x, y), checking the
  // figures from front to back, so the one you see is the one you get. A
  // fingertip is bigger than a mouse pointer, so a tap a few pixels off a
  // figure's edge still counts. Returns undefined if no figure is there.
  figureAt(x, y) {
    const order = this.units.filter((u) => u.alive && u.view.active).sort((a, b) => b.view.depth - a.view.depth);
    for (const reach of [0, 6, 12]) {
      const spots = reach === 0 ? [[0, 0]] : [[reach, 0], [-reach, 0], [0, reach], [0, -reach], [reach * 0.7, reach * 0.7], [-reach * 0.7, reach * 0.7], [reach * 0.7, -reach * 0.7], [-reach * 0.7, -reach * 0.7]];
      for (const u of order) {
        if (spots.some(([dx, dy]) => this.drawnAt(u, x + dx, y + dy))) return u;
      }
    }
    return undefined;
  }

  // True if this unit's picture has a solid (not see-through) pixel at (x, y).
  // A unit drawn as a circle counts its circle.
  drawnAt(unit, x, y) {
    const s = unit.sprite;
    if (!s) return Math.hypot(x - unit.view.x, y - (unit.view.y - unit.centerY)) <= unit.hitRadius * 0.8;
    const sx = unit.view.x + s.x;
    const sy = unit.view.y + s.y;
    let lx = (x - sx) / s.scaleX + s.originX * s.width;
    const ly = (y - sy) / s.scaleY + s.originY * s.height;
    if (s.flipX) lx = s.width - lx;
    if (lx < 0 || ly < 0 || lx >= s.width || ly >= s.height) return false;
    return this.textures.getPixelAlpha(Math.floor(lx), Math.floor(ly), s.texture.key, s.frame.name) > 80;
  }

  // True if the point (x, y) is on this unit's figure.
  // A picture is treated as a tall narrow box from its feet to its head;
  // a circle unit as its circle.
  // The upper part of a figure: its body above the feet. Taps here clearly mean
  // the figure, while taps around its feet may mean the tile it stands on.
  torsoContains(unit, x, y) {
    if (!this.bodyContains(unit, x, y)) return false;
    if (unit.sprite) return y <= unit.view.y - unit.topY * 0.25;
    return Math.hypot(x - unit.view.x, y - (unit.view.y - unit.centerY)) <= unit.hitRadius * 0.6;
  }

  bodyContains(unit, x, y) {
    const dx = x - unit.view.x;
    if (unit.sprite) {
      const top = unit.view.y - unit.topY + 6;
      const bottom = unit.view.y + 10;
      return Math.abs(dx) <= unit.bodyHalfWidth && y >= top && y <= bottom;
    }
    const dy = y - (unit.view.y - unit.centerY);
    return dx * dx + dy * dy <= unit.hitRadius * unit.hitRadius;
  }

  // Makes a unit from one entry in units.json.
  //
  // On screen a unit is a "container": a group of pieces that move together.
  // The pieces are the colored circle, its label, and a health bar.
  // To move a unit we move the container, and everything inside follows.
  //
  // Besides what is in units.json, each unit keeps its battle numbers:
  //   maxHp    : its full health (hp goes down as it is hurt)
  //   ct       : its turn meter (see turnOrder.js)
  //   alive    : false once it is defeated
  //   hasMoved : true once it has walked this turn (it may still have steps left)
  //   stepsUsed: how many tiles it has walked this turn
  //   hasActed : true once it has attacked this turn
  createUnit(data) {
    const { x, y } = tileToScreen(data.col, data.row);

    // Heroes start facing the enemies (up and to the right), enemies face back
    const facing = data.side === 'hero' ? 'upRight' : 'downLeft';

    // A soft shadow on the tile, so the unit looks like it is standing on it
    const shadow = this.add.ellipse(0, 0, 46, 20, 0x000000, 0.3);

    // If this unit has pictures (see src/art.js) and they loaded, it is drawn
    // as a picture. Otherwise it is a colored circle.
    const frame = hasArt(data.id) ? standingFrame(data.id, facing) : null;
    const usePicture = !!frame && this.textures.exists(frame.key);

    let body;
    let labelText = null;
    let sprite = null;
    let artScale = 1;
    let ringColor = 0xffffff;
    let topY;     // how far above the tile the figure reaches (the health bar sits here)
    let centerY;  // how far above the tile the middle of the figure is
    let hitRadius = HIT_RADIUS;
    let bodyHalfWidth = 0;

    if (usePicture) {
      const height = artHeight(data.id) * (mapData.figureScale || 1); // map.json can shrink everyone to leave more room

      // A ring on the ground in the side's color. It turns gold on this unit's turn.
      ringColor = SIDE_COLORS[data.side];
      body = this.add.ellipse(0, 2, 62, 28).setStrokeStyle(3, ringColor);

      // The picture stands on the tile: its feet are at the tile's middle
      sprite = this.add.image(0, 6, frame.key).setOrigin(frame.originX, 1);
      // Every picture of this unit is drawn at one size, set so its TALLEST
      // standing picture is "height" pixels (so it never depends on which way
      // it happens to face first: a side view without the staff overhead is shorter)
      const tallest = Math.max(...standingKeys(data.id).filter((k) => this.textures.exists(k)).map((k) => this.textures.get(k).getSourceImage().height));
      artScale = height / (Number.isFinite(tallest) && tallest > 0 ? tallest : sprite.height);
      sprite.setScale(artScale).setFlipX(frame.flip);

      topY = height + 12;
      centerY = height * 0.55;
      hitRadius = Math.max(HIT_RADIUS, height * 0.38);
      bodyHalfWidth = height * 0.2; // pictures are tapped as a narrow box, so they cover less of their neighbours
    } else {
      body = this.add
        .circle(0, -UNIT_LIFT, UNIT_RADIUS, SIDE_COLORS[data.side])
        .setStrokeStyle(3, 0xffffff);

      // unit.label is the short text from units.json (like "H1").
      // This is the Phaser object that draws it.
      labelText = this.add
        .text(0, -UNIT_LIFT, data.label, {
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      topY = UNIT_LIFT + UNIT_RADIUS + 12;
      centerY = UNIT_LIFT;
    }

    // Health bar above the figure: a dark bar behind, a green bar in front.
    // Origin (0, 0.5) means "grow to the right from the left edge".
    const barBack = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 9, 0x2a1d12).setOrigin(0, 0.5);
    const hpFill = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 9, 0x6fcf7f).setOrigin(0, 0.5);

    // A small badge in the corner shows the unit's job at a glance (G, S, R...)
    const badgeX = usePicture ? 34 : UNIT_RADIUS - 2;
    const badgeY = usePicture ? -6 : -UNIT_LIFT + UNIT_RADIUS - 2;
    const badgeBack = this.add.circle(badgeX, badgeY, 10, 0x1a1410).setStrokeStyle(2, 0xe8d5a8);
    const badgeText = this.add
      .text(badgeX, badgeY, data.badge, { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#ffe08a' })
      .setOrigin(0.5);

    // The unit is drawn above its own tile, but behind any tiles in front of it
    // A row of small tags above the health bar: ENGAGED, OFF-BAL, and spells
    const tagRow = this.add.container(0, -topY - 19);

    const pieces = [shadow, body, sprite, labelText, barBack, hpFill, badgeBack, badgeText, tagRow].filter(Boolean);
    const view = this.add.container(x, y, pieces).setDepth(depthFor(data.col, data.row) + 1);

    // Idle motion: the figure breathes, rising and settling a little, so it
    // never looks frozen. Each unit starts at a different moment.
    const idleTargets = sprite ? [sprite] : [body, labelText];
    const idleTween = this.tweens.add({
      targets: idleTargets,
      ...(sprite ? { scaleY: artScale * 1.035 } : { scaleX: 1.06, scaleY: 1.08 }),
      duration: 850 + Math.random() * 450,
      delay: Math.random() * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return {
      ...data,
      maxHp: data.hp,
      ct: 0,
      alive: true,
      hasMoved: false,
      hasActed: false,
      facing,
      view,
      body,
      sprite,
      artScale,
      ringColor,
      topY,
      centerY,
      hitRadius,
      bodyHalfWidth,
      hpFill,
      tagRow,
      idleTargets,
      idleTween,
    };
  }

  // ---------- Turns ----------

  // Works out who acts next and sets up the screen for their turn.
  startTurn() {
    if (this.battleOver) return;

    this.turnCount++;
    this.activeUnit = startNextTurn(this.units);
    clearOffBalance(this.activeUnit); // it has found its footing again
    clearExposed(this.activeUnit);    // and it is on guard again after Meditating
    restoreMp(this.activeUnit, 1);     // magic points come back slowly, 1 a turn
    const poisoned = tickPoison(this.activeUnit); // poison bites at the start of the turn (never the last point)
    if (poisoned > 0) {
      this.updateHpBar(this.activeUnit);
      this.floatText(this.activeUnit, 'Poison -' + poisoned, '#9fdc6a', { pop: true });
    }
    if (this.activeUnit.contest) refillPoise(this.activeUnit); // and so does Poise, for fighters
    this.stanceMenu = 'main';
    this.empower = false;
    this.wakeDecoy(this.activeUnit); // a decoy nobody struck is ready to echo her next spell
    for (const unit of this.units) if (unit.engagedWith) unit.lastEngagedTurn = this.turnCount;
    for (const unit of this.units) this.faceNearestOpponent(unit);
    this.refreshStatusTags();
    this.activeUnit.hasMoved = false;
    this.activeUnit.hasActed = false;
    this.activeUnit.moveFrom = null;
    this.activeUnit.stepsUsed = 0; // steps walked so far this turn (see stepsLeft)
    this.viewing = null;

    this.cancelMode(); // clears any leftover choice and refreshes the screen
    this.refreshTurnStrip();
    this.markActive();

    // A stunned unit loses this turn (Shield Toss, Intercept)
    const dazed = this.activeUnit;
    if (isStunned(dazed)) {
      clearStun(dazed);
      dazed.hasActed = true;
      dazed.hasMoved = true;
      dazed.stepsUsed = Infinity;
      this.busy = true;
      this.refreshButtons();
      this.refreshStatusTags();
      this.statusText.setText(dazed.name + ' is stunned and loses the turn.');
      this.floatText(dazed, 'Stunned', '#ffe08a');
      this.time.delayedCall(1100, () => {
        this.busy = false;
        if (!this.battleOver && this.activeUnit === dazed) this.endTurn();
      });
      return;
    }

    // An archer who took aim last turn lets the Poison Arrow fly first
    const archer = this.activeUnit;
    if (archer.aiming) {
      this.busy = true;
      this.releaseAim(archer, () => {
        this.busy = false;
        if (this.battleOver) return;
        this.refreshButtons();
        this.refreshStatus();
        if (archer.side === 'enemy') this.time.delayedCall(400, () => this.activeUnit === archer && this.endTurn());
      });
      return;
    }

    // A Sage in meditation spends this whole turn in it, then wakes with her MP back
    const sage = this.activeUnit;
    if (sage.meditating) {
      const restore = sage.meditating.restore;
      sage.meditating = null;
      restoreMp(sage, restore);
      sage.hasActed = true;
      sage.hasMoved = true;
      sage.stepsUsed = Infinity;
      this.busy = true;
      this.refreshButtons();
      this.refreshStatusTags();
      this.statusText.setText(sage.name + ' finishes meditating.');
      buffAura(this, sage.view.x, sage.view.y, 0x7fd6c4);
      this.floatText(sage, '+' + restore + ' MP', '#7fd6c4', { pop: true });
      this.time.delayedCall(1100, () => {
        this.busy = false;
        this.showStanding(sage);
        if (!this.battleOver && this.activeUnit === sage) this.endTurn();
      });
      return;
    }

    // Enemies play by themselves, after a short pause so you can follow it.
    if (this.activeUnit.side === 'enemy') {
      this.time.delayedCall(600, () => this.runEnemyTurn());
    } else {
      play('turn');
    }
  }

  // The unit whose turn it is gives a little hop, and its ring on the ground pulses.
  markActive() {
    if (this.activePulse) {
      this.activePulse.stop();
      if (this.pulsedRing && this.pulsedRing.active) this.pulsedRing.setScale(1);
      this.activePulse = null;
      this.pulsedRing = null;
    }
    const unit = this.activeUnit;
    if (unit.sprite) {
      this.pulsedRing = unit.body;
      this.activePulse = this.tweens.add({ targets: unit.body, scaleX: 1.18, scaleY: 1.18, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.tweens.add({ targets: unit.idleTargets, y: '-=12', duration: 110, yoyo: true, ease: 'Sine.easeOut' });
  }

  // Finishes the current turn and starts the next one.
  endTurn() {
    if (this.battleOver) return;
    tickBuff(this.activeUnit); // spells on this unit get one turn shorter
    if (!this.activeUnit.engagedWith && this.activeUnit.alive) this.showStanding(this.activeUnit); // a Verse may have worn off
    // an echo she did not use fades away (a decoy made THIS turn stays, to fool the enemy)
    if (this.decoys.some((d) => d.owner === this.activeUnit && d.woken)) this.removeDecoys(this.activeUnit);
    this.cancelMode();
    this.startTurn();
  }

  // Redraws the turn order across the top as diamond portraits: the unit
  // acting now (large, with a gold line under it), then the next 6.
  refreshTurnStrip() {
    this.turnStripLayer.removeAll(true);
    const lineup = [this.activeUnit, ...previewTurns(this.units, 6)];
    const y = 108;
    lineup.forEach((unit, i) => {
      const now = i === 0;
      const x = now ? 70 : 170 + (i - 1) * 76;
      this.turnStripLayer.add(diamondPortrait(this, x, y, now ? 42 : 31, unit, portraitKey(unit.id, unit), { active: now }));
      if (now) {
        const g = this.add.graphics();
        g.fillStyle(UI.gold, 1);
        g.fillTriangle(x + 52, y - 7, x + 61, y, x + 52, y + 7); // ▸ who is next
        g.lineStyle(5, UI.gold, 0.18);
        g.lineBetween(x - 36, 159, x + 36, 159);
        g.lineStyle(1.5, UI.gold, 0.9);
        g.lineBetween(x - 36, 159, x + 36, 159);
        g.fillStyle(UI.gold, 1);
        g.fillPoints([{ x, y: 155 }, { x: x + 4, y: 159 }, { x, y: 163 }, { x: x - 4, y: 159 }], true);
        this.turnStripLayer.add(g);
      }
    });
    // a thin line trailing off after the last face
    const tail = this.add.graphics();
    const from = 170 + (lineup.length - 2) * 76 + 46;
    for (let i = 0; i < 10; i++) {
      tail.lineStyle(1, UI.bronze, 0.6 * (1 - i / 10));
      tail.lineBetween(from + i * 10, y, from + i * 10 + 10, y);
    }
    this.turnStripLayer.add(tail);
    this.turnCounter.setText('Turn ' + this.round);
    this.ui(this.turnStripLayer);
  }

  // Outlines: red-orange on the enemy picked for attack, gold on the unit
  // whose turn it is, white on everyone else.
  refreshOutlines() {
    for (const unit of this.units) {
      if (!unit.alive) continue;

      if (unit === this.pendingTarget) {
        unit.body.setStrokeStyle(6, 0xff6b5a);
      } else if (unit === this.activeUnit) {
        unit.body.setStrokeStyle(6, GOLD);
      } else {
        unit.body.setStrokeStyle(3, unit.ringColor);
      }
    }
  }

  // Updates the line of text under the board.
  refreshStatus() {
    if (this.battleOver) return; // the result screen has taken over

    const unit = this.activeUnit;
    let text;

    if (this.mode === 'attack' && this.pendingTarget) {
      // Show the odds before the player commits
      const target = this.pendingTarget;
      const notes = [];
      if (isDistracted(target, unit)) notes.push('distracted');
      if (isOffBalance(target)) notes.push('off-balance');
      if (unit.closePenalty && distance(unit, target) <= 1) notes.push('too close to aim');
      if (usesCloseWeapon(unit, target)) notes.push('with the ' + unit.closeWeapon.name.toLowerCase());
      const hAcc = heightAccuracy(unit, target);
      if (hAcc) notes.push((hAcc > 0 ? '+' : '') + hAcc + '% ' + (hAcc > 0 ? 'from high ground' : 'shooting uphill'));
      const next = chainTarget(unit, target, this.units);
      const jump = next ? ' Jumps to ' + next.name + ' for ' + chainDamage(unit, next) + '.' : '';
      text =
        target.name + ': ' + getHitChance(unit, target) + '% to hit, ' +
        getDamage(unit, target) + ' damage' + (notes.length ? ' (' + notes.join(', ') + ')' : '') + '.' + jump +
        '\nTap again to attack.';
    } else if (this.mode === 'approach') {
      // The odds from the tile the unit will stand on
      const a = this.approach;
      const from = { ...unit, col: a.tile.col, row: a.tile.row };
      const notes = [];
      if (isDistracted(a.target, unit)) notes.push('distracted');
      if (isOffBalance(a.target)) notes.push('off-balance');
      if (unit.closePenalty && distance(from, a.target) <= 1) notes.push('too close to aim');
      if (usesCloseWeapon(from, a.target)) notes.push('with the ' + unit.closeWeapon.name.toLowerCase());
      const hAcc = heightAccuracy(from, a.target);
      if (hAcc) notes.push((hAcc > 0 ? '+' : '') + hAcc + '% ' + (hAcc > 0 ? 'from high ground' : 'shooting uphill'));
      const next = chainTarget(from, a.target, this.units);
      const jump = next ? ' Jumps to ' + next.name + ' for ' + chainDamage(unit, next) + '.' : '';
      text =
        a.target.name + ': ' + getHitChance(from, a.target) + '% to hit, ' + getDamage(unit, a.target) + ' damage' +
        (notes.length ? ' (' + notes.join(', ') + ')' : '') + '.' + jump +
        '\nTap it again to go' + (a.options.length > 1 ? ', or a blue tile to stand elsewhere.' : '.');
    } else if (this.mode === 'attack') {
      text = 'Tap a red tile to choose a target';
    } else if (this.mode === 'engage' && this.pendingTarget && isStanceDuel()) {
      const target = this.pendingTarget;
      const bonus = openingHeightBonus(unit, target, CONTEST_CTX);
      text =
        'Engage ' + target.name + ' (' + target.jobName + ')? You open with Press' +
        (bonus ? ', +' + bonus + ' from high ground' : '') + '.' +
        (target.range > 1 ? ' Caught, it cannot shoot.' : '') + '\nTap again.';
    } else if (this.mode === 'engage' && this.pendingTarget) {
      // Show both sides' numbers before the dice, so the choice is an informed one
      const target = this.pendingTarget;
      const mine = sumParts(contestParts(unit, 'press', target, CONTEST_CTX));
      const theirs = sumParts(contestParts(target, 'hold', unit, CONTEST_CTX));
      text =
        'Engage ' + target.name + ' (' + STYLE_NAMES[styleOf(target)] + ')?\n' +
        'You ' + mine + ' vs them ' + theirs + ', plus dice. Tap again.';
    } else if (this.mode === 'engage') {
      text = 'Tap an orange tile to engage';
    } else if (this.mode === 'spell' && this.selectedSpell) {
      const spell = spells[this.selectedSpell];
      text = spell.name + ': ' + spell.text + '\nTap ' + spell.button + ' again.';
    } else if (this.mode === 'spell' && (isMelee(unit) || !unit.maxMp)) {
      text = 'Choose a skill';
    } else if (this.mode === 'spell') {
      text = (this.spellGroup ? 'Choose a ' + this.spellGroup : 'Choose a spell') + '  (' + unit.mp + ' MP)';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'throw') {
      const t = this.pendingTarget;
      const extra = this.spellReach(unit, t, spells.spearThrow) - spells.spearThrow.range;
      text =
        'Spear Throw at ' + t.name + ': ' + getHitChance({ ...unit, range: 3 }, t) + '% to hit, ' + getDamage(unit, t) +
        ' damage, knocked back a tile' + (extra > 0 ? ' (+' + extra + ' reach from high ground)' : '') + '.\nTap again to throw.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'charge') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      const what = isOffBalance(t) ? 'knocked back ' + sp.push + ' (Off-Balance)' : 'stunned 1 turn';
      text = 'Charge ' + t.name + ': ' + this.skillHit(unit, t, sp) + ' damage, ' + what + '.\nTap again to charge.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'double') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      text = 'Double Hit on ' + t.name + ': ' + sp.hits + ' strikes, ' + getHitChance(unit, t) + '% each, ' + this.skillHit(unit, t, sp) + ' damage each.\nTap again to strike.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'toss') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      text = 'Toss at ' + t.name + ': ' + getHitChance(unit, t) + '%, ' + this.skillHit(unit, t, sp) + ' damage, stunned 1 turn.\nTap again to throw.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'poison') {
      const t = this.pendingTarget;
      const p = spells.poisonArrow;
      text =
        'Aim at ' + t.name + ': flies next turn if still in reach. ' + getHitChance({ ...unit, closeWeapon: null }, t) + '% to hit, ' +
        this.poisonHit(unit, t, p) + ' now, then ' + p.poison + ' a turn for ' + p.turns + ' turns.\nTap again to take aim.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'heal') {
      const t = this.pendingTarget;
      text = 'Herbs on ' + t.name + ': +' + Math.min(spells.herbs.heal, t.maxHp - t.hp) + ' health. Tap again.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget) {
      const spell = spells[this.selectedSpell];
      const double = affinityTimes(this.pendingTarget, this.selectedSpell) > 1;
      text =
        spell.name + ' on ' + this.pendingTarget.name + ' (' + useText(spell) + '). Tap again.\n' +
        (double ? 'Double effect on ' + spell.affinity.who + '! ' : '') + spell.text;
    } else if (this.mode === 'spellTarget' && spells[this.selectedSpell].kind === 'heal') {
      const self = this.targetsInRange.includes(unit);
      text = (self ? 'Tap Herbs again to use them on yourself,\nor tap a green tile to heal an ally.' : 'Tap a green tile to heal an ally.');
    } else if (this.mode === 'spellTarget') {
      const kind = spells[this.selectedSpell].kind;
      text = 'Tap a ' + ({ hex: 'purple', throw: 'red', toss: 'red', charge: 'red', double: 'red', heal: 'green', poison: 'green' }[kind] || 'gold') + ' tile: who gets ' + spells[this.selectedSpell].name + '?';
    } else if (this.mode === 'huskTile') {
      text = this.pendingTile ? 'Slip away to this tile? Tap it again.' : 'Tap a green tile to slip away to';
    } else if (unit.engagedWith && isStanceDuel()) {
      const m = momentumOf(unit);
      const lead = m > 0 ? ' (you lead)' : m < 0 ? ' (they lead)' : '';
      text =
        (unit.side === 'hero' ? 'Locked with ' : unit.name + ' is locked with ') + unit.engagedWith.name +
        '. Momentum ' + (m > 0 ? '+' : '') + m + lead + '.' +
        (unit.side === 'hero'
          ? this.stanceChoice === 'auto' && !unit.hasActed
            ? '\nAuto picks ' + stanceName(this.autoStanceFor(unit)) + (unit.signature && this.autoStanceFor(unit) === unit.signature.stance ? ' (' + unit.signature.name + ')' : '') + (this.empower ? ', Empowered' : '') + '.'
            : this.stanceMenu === 'more'
            ? '\nEmpower: +3 to your stance for 1 Poise' + (this.empower ? ' (on)' : '')
            : '\nGuard beats Press, Press beats Slip, Slip beats Guard' + (this.empower ? ' (Empowered)' : '')
          : '');
    } else if (unit.engagedWith) {
      text =
        (unit.side === 'hero' ? 'Your turn: ' : 'Enemy turn: ') + unit.name +
        '\nLocked with ' + unit.engagedWith.name;
    } else {
      text = (unit.side === 'hero' ? 'Your turn: ' : 'Enemy turn: ') + unit.name + ' (' + unit.jobName + ')';
    }

    this.statusText.setText(text);
    this.refreshButtons();

    // The card shows the target being chosen, a unit being looked at, or whoever is acting
    if (this.pendingTarget) this.refreshCard(this.pendingTarget, true);
    else if (this.viewing) this.refreshCard(this.viewing, true);
    else this.refreshCard(unit);
  }

  // The four commands change with the situation.
  refreshButtons() {
    const unit = this.activeUnit;
    const isHero = unit.side === 'hero';
    const free = isHero && !unit.hasActed;
    const [a, b, c, d] = this.slots;
    for (const half of this.halves) half.set(null); // only used by fighters with skills (below)

    if (this.battleOver) {
      for (const slot of this.slots) slot.set(null);
      return;
    }

    // Choosing a spell: the spells (or groups of spells, like Verse) and Back
    if (isHero && (this.mode === 'spell' || this.mode === 'spellTarget' || this.mode === 'huskTile')) {
      const entries = this.spellMenu(unit);
      [a, b, c].forEach((slot, i) => {
        const e = entries[i];
        if (e) slot.set(e.label, 'gem', e.enabled, e.onTap, { selected: e.selected, accent: e.accent });
        else slot.set(null);
      });
      d.set('Back', 'back', true, () => this.spellBack());
      return;
    }

    // Locked in a stance duel: pick a stance (or More: Auto, Break away, Empower)
    if (unit.engagedWith && isStanceDuel()) {
      const star = (s) => (stanceAffinity(unit, s) === 'strong' ? '  *' : '');
      // Already acted this turn: the stances are spent, so offer End turn
      // (a safety net; normally the turn ends by itself after a beat)
      const doneAlready = isHero && unit.hasActed && !this.busy;
      // Auto (the default): one Fight button picks the stance for you
      if (this.stanceChoice === 'auto' && !doneAlready) {
        const pick = this.autoStanceFor(unit);
        a.set('Fight: ' + stanceName(pick) + star(pick), 'press', free, () => this.onStance(pick), { accent: ENGAGE_COLOR, selected: this.empower });
        b.set('Break away', 'run', free, () => this.onStance('break'));
        c.set('Empower  ' + poiseOf(unit) + ' Poise', 'gem', free && poiseOf(unit) > 0, () => this.toggleEmpower(), { selected: this.empower, accent: 0xffd27a });
        d.set('Manual  >', 'gem', isHero, () => this.setStanceChoice('manual'));
        return;
      }
      if (this.stanceMenu === 'more' && !doneAlready) {
        a.set('Auto mode', 'star', isHero, () => this.setStanceChoice('auto'), { accent: GOLD });
        b.set('Break away', 'run', free, () => this.onStance('break'));
        c.set('Empower  ' + poiseOf(unit) + ' Poise', 'gem', free && poiseOf(unit) > 0, () => this.toggleEmpower(), { selected: this.empower, accent: 0xffd27a });
        d.set('Back', 'back', isHero, () => this.openStanceMenu('main'));
      } else {
        a.set('Press' + star('press'), 'press', free, () => this.onStance('press'), { accent: ENGAGE_COLOR, selected: this.empower });
        b.set('Guard' + star('guard'), 'shield', free, () => this.onStance('guard'), { accent: 0xd9b77a, selected: this.empower });
        c.set('Slip' + star('slip'), 'run', free, () => this.onStance('slip'), { accent: 0x9fd4ff, selected: this.empower });
        if (doneAlready) d.set('End turn', 'hourglass', true, () => this.onEndButton());
        else d.set('More  >', 'gem', free, () => this.openStanceMenu('more'));
      }
      return;
    }

    // Locked in an engagement: Press the fight, or try to Break away
    if (unit.engagedWith) {
      a.set('Press', 'press', free, () => this.onPressButton(), { accent: ENGAGE_COLOR });
      b.set('Break away', 'run', free, () => this.onBreakButton());
      c.set(null);
      d.set('End turn', 'hourglass', isHero, () => this.onEndButton());
      return;
    }

    // Normal turn: Move, Attack, Engage or Spell, End turn
    // Once it has walked, the first button undoes the walk (until it acts).
    // After acting, any steps it has left can still be used: "Move  3 left".
    if (isHero && unit.hasMoved && !unit.hasActed && unit.moveFrom) {
      a.set('Undo move', 'back', !this.busy, () => this.undoMove());
    } else {
      const left = this.stepsLeft(unit);
      const label = unit.hasMoved && left > 0 ? 'Move  ' + left + ' left' : 'Move';
      a.set(label, 'run', isHero && left > 0, () => this.onMoveButton(), { selected: this.mode === 'move' });
    }
    b.set(unit.attackName, unit.attackType === 'magic' ? 'star' : 'sword', free, () => this.onAttackButton(), { selected: this.mode === 'attack', accent: unit.attackType === 'magic' ? 0x9fd4ff : 0xff8a6a });
    if (isMelee(unit) && unit.spells && unit.spells.length > 0) {
      // a fighter with skills (Spear Throw, Herbs): Engage and Skills share the row
      c.set(null);
      this.halves[0].set('Engage', 'crossed', free && engageTargets(unit, this.units).length > 0, () => this.onEngageButton(), {
        selected: this.mode === 'engage',
        accent: ENGAGE_COLOR,
      });
      this.halves[1].set('Skills', 'star', free, () => this.onSpellButton(), { accent: GOLD });
    } else if (isMelee(unit)) {
      c.set('Engage', 'crossed', free && engageTargets(unit, this.units).length > 0, () => this.onEngageButton(), {
        selected: this.mode === 'engage',
        accent: ENGAGE_COLOR,
      });
    } else if (unit.spells && unit.spells.length > 0) {
      c.set(unit.maxMp > 0 ? 'Spell' : 'Skills', 'star', free, () => this.onSpellButton(), { accent: GOLD }); // no MP pool: skills, not spells
    } else {
      c.set(null);
    }
    d.set('End turn', 'hourglass', isHero, () => this.onEndButton());
  }

  // Shows a unit's card for a few seconds, when the player taps it.
  inspect(unit) {
    play('select');
    this.viewing = unit;
    this.statusText.setText(unit.name + ' (' + unit.jobName + ')' + (unit.contest ? ', ' + STYLE_NAMES[styleOf(unit)] + ' style' : ''));
    this.refreshCard(unit, true);
    if (this.inspectTimer) this.inspectTimer.remove();
    this.inspectTimer = this.time.delayedCall(4000, () => {
      this.viewing = null;
      this.refreshStatus();
    });
  }

  // Shows a short message in the status line, then goes back to normal.
  showMessage(text) {
    this.statusText.setText(text);
    this.time.delayedCall(1200, () => this.refreshStatus());
  }

  // ---------- Buttons ----------

  onAttackButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || unit.hasActed) return;

    // Tapping Attack again cancels attack mode
    if (this.mode === 'attack') {
      this.cancelMode();
      return;
    }

    this.cancelMode();
    this.startAttack();
  }

  onMoveButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || this.stepsLeft(unit) === 0) return;
    if (this.mode === 'move') {
      this.cancelMode();
      return;
    }
    this.cancelMode();
    this.startMove();
    this.refreshButtons();
  }

  onEngageButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || unit.hasActed) return;
    if (this.mode === 'engage') {
      this.cancelMode();
      return;
    }
    this.cancelMode();
    this.targetsInRange = engageTargets(unit, this.units);
    if (this.targetsInRange.length === 0) {
      this.showMessage('No enemy fighter next to you');
      return;
    }
    this.mode = 'engage';
    this.showHighlights(this.targetsInRange.map((t) => ({ col: t.col, row: t.row })), ENGAGE_COLOR);
    this.refreshStatus();
  }

  onSpellButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || unit.hasActed) return;
    this.cancelMode();
    this.mode = 'spell';
    this.refreshStatus();
  }

  // The buttons in the spell menu. Spells that share a "group" in spells.json
  // (like the three Verses) sit behind one button that opens them.
  spellMenu(unit) {
    const entry = (id) => {
      const spell = spells[id];
      const wait = cooldownOf(unit, id);
      return {
        label: spell.button + (wait ? '  (' + wait + ')' : spell.mp ? '  ' + spell.mp + ' MP' : ''),
        enabled: canAfford(unit, id) && !this.busy,
        onTap: () => this.chooseSpell(id),
        selected: this.selectedSpell === id,
        accent: Phaser.Display.Color.HexStringToColor(spell.color).color,
      };
    };
    if (this.spellGroup) return unit.spells.filter((id) => spells[id].group === this.spellGroup).map(entry);

    const list = [];
    const seen = new Set();
    for (const id of unit.spells) {
      const group = spells[id].group;
      if (!group) {
        list.push(entry(id));
      } else if (!seen.has(group)) {
        seen.add(group);
        list.push({
          label: group + '  >',
          enabled: unit.spells.some((s) => spells[s].group === group && canAfford(unit, s)),
          onTap: () => this.openSpellGroup(group),
          selected: false,
          accent: GOLD,
        });
      }
    }
    return list;
  }

  openSpellGroup(group) {
    play('select');
    this.spellGroup = group;
    this.selectedSpell = null;
    this.refreshStatus();
  }

  // Back: from a target to the list, from a group to the top, then out.
  spellBack() {
    if (this.mode === 'spellTarget' || this.mode === 'huskTile' || this.selectedSpell) {
      play('cancel');
      this.clearHighlights();
      this.pendingTarget = null;
      this.pendingTile = null;
      this.selectedSpell = null;
      this.targetsInRange = [];
      this.reachableKeys.clear();
      this.mode = 'spell';
      this.refreshOutlines();
      this.refreshStatus();
      return;
    }
    if (this.spellGroup) {
      play('cancel');
      this.spellGroup = null;
      this.refreshStatus();
      return;
    }
    this.cancelMode();
  }

  // A spell was picked. What happens next depends on its kind:
  //   buff   : gold tiles on anyone in range, friend or foe
  //   hex    : purple tiles on enemies in range
  //   escape : green tiles where the caster can slip away to (Husk)
  //   rest   : nothing to choose; tap the button again to Meditate
  chooseSpell(id) {
    const unit = this.activeUnit;
    const spell = spells[id];
    if (!canAfford(unit, id)) {
      this.showMessage(cooldownOf(unit, id) ? spell.button + ' is ready again in ' + cooldownOf(unit, id) + ' turns' : 'Not enough MP');
      return;
    }
    // Herbs tapped a second time: use it on yourself (tap an ally's tile to heal them instead)
    if (spell.kind === 'heal' && this.selectedSpell === id && this.mode === 'spellTarget') {
      if (unit.hp < unit.maxHp || isPoisoned(unit)) {
        this.pendingTarget = unit;
        this.confirmSpell();
      } else {
        this.showMessage(unit.name + ' is unhurt. Tap an ally to heal them.');
      }
      return;
    }
    play('select');
    this.clearHighlights();
    this.pendingTarget = null;
    this.pendingTile = null;
    this.targetsInRange = [];
    this.reachableKeys.clear();

    if (spell.kind === 'rest') {
      if (this.selectedSpell === id) {
        this.confirmSpell();
        return;
      }
      this.selectedSpell = id;
      this.mode = 'spell';
      this.refreshStatus();
      return;
    }

    this.selectedSpell = id;
    if (spell.kind === 'escape') {
      this.mode = 'huskTile';
      const tiles = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        for (let row = 0; row < GRID_SIZE; row++) {
          const d = distance(unit, { col, row });
          if (d > 0 && d <= spell.range && !this.isBlocked(col, row)) tiles.push({ col, row });
        }
      }
      this.reachableKeys = new Set(tiles.map((t) => t.col + ',' + t.row));
      this.showHighlights(tiles, 0x8fd18a);
      this.refreshStatus();
      return;
    }

    this.mode = 'spellTarget';
    const foesOnly = ['hex', 'throw', 'poison', 'toss', 'charge', 'double'].includes(spell.kind);
    const friendsOnly = spell.kind === 'heal';
    this.targetsInRange = this.units.filter(
      (u) =>
        u.alive && (spell.kind === 'charge' ? !!this.chargeTile(unit, u, spell) : distance(unit, u) <= this.spellReach(unit, u, spell)) &&
        (!foesOnly || u.side !== unit.side) && (!friendsOnly || u.side === unit.side) &&
        (spell.kind !== 'heal' || u.hp < u.maxHp || isPoisoned(u))
    );
    if (this.targetsInRange.length === 0 && spell.kind === 'heal') {
      this.showMessage('Nobody next to you needs healing');
      this.selectedSpell = null;
      this.mode = 'spell';
      return;
    }
    if (this.targetsInRange.length === 0) {
      this.showMessage('No enemy in reach');
      this.selectedSpell = null;
      this.mode = 'spell';
      return;
    }
    const color = spell.kind === 'hex' ? 0xb48cff : ['throw', 'toss', 'charge', 'double'].includes(spell.kind) ? 0xe05a47 : spell.kind === 'heal' || spell.kind === 'poison' ? 0x9fdc8a : GOLD;
    this.showHighlights(this.targetsInRange.map((t) => ({ col: t.col, row: t.row })), color);
    this.refreshOutlines();
    this.refreshStatus();
  }

  // How far a spell or skill reaches from the caster to this target. A Spear
  // Throw from higher ground reaches rangePerLevel tiles further for each
  // level the thrower stands above the target (spells.json).
  spellReach(caster, target, spell) {
    const lift = Math.max(0, getHeight(caster.col, caster.row) - getHeight(target.col, target.row));
    return spell.range + lift * (spell.rangePerLevel || 0);
  }

  onPressButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || unit.hasActed || !unit.engagedWith) return;
    this.cancelMode();
    this.busy = true;
    this.pressEngagement(unit, () => {
      this.busy = false;
      this.refreshStatus();
    });
  }

  onBreakButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || unit.hasActed || !unit.engagedWith) return;
    this.cancelMode();
    this.busy = true;
    this.tryBreakAway(unit, () => {
      this.busy = false;
      this.refreshStatus();
    });
  }

  // ---------- Stance duel buttons ----------

  // The stance a hero on Auto fights with: its signature (or best) stance,
  // switching to the counter when the foe's last stance would beat it.
  autoStanceFor(unit) {
    return autoPick(unit, unit.engagedWith, engagementRules.beats, autoStance(unit));
  }

  // Auto or Manual stances in a clash. Remembered on this device.
  setStanceChoice(choice) {
    play('select');
    this.stanceChoice = choice;
    this.stanceMenu = 'main';
    this.empower = false;
    try {
      window.localStorage.setItem('fabien.stanceChoice', choice);
    } catch (e) {
      // private browsing: it just will not be remembered
    }
    this.refreshStatus();
  }

  openStanceMenu(which) {
    play(which === 'more' ? 'select' : 'cancel');
    this.stanceMenu = which;
    this.refreshStatus();
  }

  toggleEmpower() {
    if (poiseOf(this.activeUnit) <= 0) return;
    play('select');
    this.empower = !this.empower;
    this.stanceMenu = 'main'; // back to the stances, now empowered
    this.refreshStatus();
  }

  // The player picked a stance: this turn's beat.
  onStance(stance) {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || unit.hasActed || !unit.engagedWith) return;
    const foe = unit.engagedWith;
    // The foe answers at the same moment, so it cannot see your choice: an
    // enemy answers by its class habits; a hero keeps the stance it last used
    const foeStance = foe.side === 'enemy' ? answerStance(foe, CONTEST_CTX) : foe.stance || autoStance(foe);
    const empowered = this.empower && poiseOf(unit) > 0;
    this.empower = false;
    this.stanceMenu = 'main';
    this.cancelMode();
    this.busy = true;
    this.duelBeat(unit, stance, foe, foeStance, empowered, false, () => {
      this.busy = false;
      this.time.delayedCall(250, () => {
        if (!this.battleOver && this.activeUnit === unit) this.endTurn();
      });
    });
  }

  onEndButton() {
    if (this.activeUnit.side === 'hero' && !this.busy && !this.battleOver) {
      this.endTurn();
    }
  }

  // ---------- Taps ----------

  // Called every time the player taps the board. Decides what the tap means.
  handleTap(col, row) {
    // Ignore taps while something is moving or attacking, or after the battle
    if (this.busy || this.battleOver) return;

    // Tapped outside the board: cancel the current choice
    if (!isInsideGrid(col, row)) {
      this.cancelMode();
      return;
    }

    const unit = this.activeUnit;

    const tapped = this.getUnitAt(col, row);

    // Previewing a walk-up attack: the enemy again goes, a blue tile changes
    // where to stand, another enemy changes the target, anything else cancels
    if (this.mode === 'approach' && unit.side === 'hero') {
      const a = this.approach;
      if (tapped === a.target) {
        this.confirmApproach();
        return;
      }
      if (a.optionKeys.has(col + ',' + row)) {
        this.chooseApproachTile({ col, row });
        return;
      }
      if (tapped && tapped.side !== unit.side && this.startApproach(tapped)) return;
      this.cancelMode();
      return;
    }

    // Tapping an enemy you can reach (on your turn, before acting): get ready
    // to walk up to it and attack, in one go
    if ((this.mode === 'idle' || this.mode === 'move') && unit.side === 'hero' && tapped && tapped.side !== unit.side) {
      if (this.startApproach(tapped)) return;
    }

    // Tapping any other unit, when nothing is being chosen, shows its details
    if (this.mode === 'idle' && tapped && tapped !== unit) {
      this.inspect(tapped);
      return;
    }

    // The player can only act on a hero's turn
    if (unit.side !== 'hero') return;

    // Choosing who to engage: first tap shows the numbers, second tap engages
    if (this.mode === 'engage') {
      const target = this.getUnitAt(col, row);
      if (target && this.targetsInRange.includes(target)) {
        if (target === this.pendingTarget) {
          this.confirmEngage();
        } else {
          this.previewAttack(target);
        }
        return;
      }
      this.cancelMode();
      return;
    }

    // Choosing who gets a spell: first tap explains it, second tap casts it
    if (this.mode === 'spellTarget') {
      const target = this.getUnitAt(col, row);
      if (target && this.targetsInRange.includes(target)) {
        if (target === this.pendingTarget) {
          this.confirmSpell();
        } else {
          this.previewAttack(target);
        }
        return;
      }
      this.cancelMode();
      return;
    }
    // Choosing where Husk slips away to: first tap picks the tile, second casts
    if (this.mode === 'huskTile') {
      if (this.reachableKeys.has(col + ',' + row)) {
        if (this.pendingTile && this.pendingTile.col === col && this.pendingTile.row === row) {
          this.confirmSpell();
        } else {
          play('select');
          this.pendingTile = { col, row };
          const tiles = [...this.reachableKeys].map((k) => k.split(',').map(Number)).map(([c, r]) => ({ col: c, row: r }));
          this.showHighlights(tiles, 0x8fd18a);
          this.showHighlights([{ col, row }], 0xffe08a, { keep: true, alpha: 0.85 });
          this.refreshStatus();
        }
        return;
      }
      this.cancelMode();
      return;
    }
    if (this.mode === 'spell') {
      this.cancelMode();
      return;
    }

    // Choosing a target: first tap shows the odds, second tap attacks
    if (this.mode === 'attack') {
      const target = this.getUnitAt(col, row);
      if (target && this.targetsInRange.includes(target)) {
        if (target === this.pendingTarget) {
          this.confirmAttack();
        } else {
          this.previewAttack(target);
        }
        return;
      }
      this.cancelMode();
      return;
    }

    // Tapped the active hero: start choosing a move, or cancel if already choosing
    if (col === unit.col && row === unit.row) {
      if (this.mode === 'move') {
        this.cancelMode();
      } else {
        this.startMove();
      }
      return;
    }

    // Choosing a move and the tap is on a blue tile: walk there
    if (this.mode === 'move' && this.reachableKeys.has(col + ',' + row)) {
      this.moveUnit(unit, col, row);
      return;
    }

    // Any other tap: cancel
    this.cancelMode();
  }

  // The living unit standing on a tile, or undefined if the tile is empty.
  getUnitAt(col, row) {
    return this.units.find((u) => u.alive && u.col === col && u.row === row);
  }

  // True if a living unit is standing on the tile.
  isBlocked(col, row) {
    return this.getUnitAt(col, row) !== undefined || this.isDecoyAt(col, row);
  }

  // True if a Husk decoy's swarm is on the tile.
  isDecoyAt(col, row) {
    return this.decoys.some((d) => d.col === col && d.row === row);
  }

  // ---------- Choosing a move ----------

  // Shows blue squares on every tile the active unit can walk to.
  startMove() {
    const unit = this.activeUnit;

    // A unit may walk as many tiles as its Move each turn, split into as many
    // walks as it likes, but not at all while locked in an engagement
    if (this.stepsLeft(unit) === 0) return;
    if (unit.engagedWith) {
      this.showMessage('Locked with ' + unit.engagedWith.name + '. Press or Break away.');
      return;
    }

    this.mode = 'move';
    const tiles = getReachableTiles(unit.col, unit.row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r));
    this.reachableKeys = new Set(tiles.map((t) => t.col + ',' + t.row));
    this.showHighlights(tiles, 0x4aa3ff);
    play('select');
    this.refreshButtons();
  }

  // Walks a unit to a tile, one tile at a time along the shortest path, with a
  // little hop and a footstep on each tile. Its column and row change right
  // away (that is what the rules care about); the figure then walks over.
  // "onDone" is optional: something to do once it has arrived.
  moveUnit(unit, col, row, onDone) {
    this.cancelMode();
    this.busy = true;

    let path = getPath(unit.col, unit.row, col, row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r));
    if (path.length === 0) path = [{ col, row }];

    // Undo move goes back to where it stood at the start of the turn
    if (!unit.moveFrom) unit.moveFrom = { col: unit.col, row: unit.row, facing: unit.facing };
    unit.col = col;
    unit.row = row;
    unit.hasMoved = true;
    unit.stepsUsed = (unit.stepsUsed || 0) + path.length;

    let prev = { x: unit.view.x, y: unit.view.y };
    let prevTile = null;
    const steps = path.map((tile) => {
      const p = tileToScreen(tile.col, tile.row);
      const fromTile = prevTile;
      const fromPoint = prev;
      prev = p;
      prevTile = tile;
      return {
        x: p.x,
        y: p.y,
        duration: 150,
        ease: 'Sine.easeInOut',
        onStart: () => {
          this.faceToward(unit, p.x - fromPoint.x, p.y - fromPoint.y);
          const fromDepth = fromTile ? depthFor(fromTile.col, fromTile.row) : unit.view.depth - 1;
          unit.view.setDepth(Math.max(fromDepth, depthFor(tile.col, tile.row)) + 1);
          this.tweens.add({ targets: unit.idleTargets, y: '-=9', duration: 75, yoyo: true, ease: 'Sine.easeOut' });
          const buff = buffOf(unit);
          if (buff && buff.id === 'swiftness') speedStreak(this, fromPoint.x, fromPoint.y, p.x - fromPoint.x); // wind trails under Swiftness
          play('step');
        },
      };
    });
    this.tweens.chain({
      targets: unit.view,
      tweens: steps,
      onComplete: () => {
        unit.view.setDepth(depthFor(col, row) + 1); // settle into its new place in the drawing order
        dustPuff(this, unit.view.x, unit.view.y);
        this.faceNearestOpponent(unit); // on arriving, look at the nearest enemy
        // everyone else may now be closer to (or further from) an enemy: relaxed or battle stance
        for (const u of this.units) if (u !== unit && u.alive && !u.engagedWith) this.showStanding(u);
        this.busy = false;
        this.refreshStatus();
        if (onDone) onDone();
        // A hero with steps to spare sees where else it can still go
        else if (unit === this.activeUnit && unit.side === 'hero' && this.stepsLeft(unit) > 0 && !this.battleOver) this.startMove();
      },
    });
  }

  // How many more tiles a unit can walk this turn.
  stepsLeft(unit) {
    return Math.max(0, moveOf(unit) - (unit.stepsUsed || 0));
  }

  // ---------- Walk up and attack (tap an enemy) ----------

  // Every tile the unit could attack this target from this turn: where it
  // stands now, or anywhere it can still walk to, within its attack range.
  approachTiles(unit, target) {
    const here = { col: unit.col, row: unit.row };
    const spots = [here, ...getReachableTiles(unit.col, unit.row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r))];
    return spots.filter((t) => {
      return inReach({ ...unit, col: t.col, row: t.row }, target);
    });
  }

  // Picks the best of those tiles. Fighters take the shortest walk and like
  // high ground, and avoid being surrounded. Ranged units (archers, the Sage)
  // stand as far back as their range allows, away from other enemies.
  bestApproachTile(unit, target, options) {
    const foes = this.units.filter((u) => u.alive && u.side !== unit.side);
    const score = (t) => {
      const steps = distance(unit, t);
      const nextToFoes = foes.filter((f) => distance(t, f) === 1).length;
      let s = getHeight(t.col, t.row) * 2 - steps;
      if (unit.range > 1 && !unit.melee) s += distance(t, target) * 3 - nextToFoes * 6;
      else if (unit.range > 1) s += distance(t, target) - 1 - Math.max(0, nextToFoes - 1) * 2; // a spear likes to strike from its full reach
      else s -= Math.max(0, nextToFoes - 1) * 2;
      return s;
    };
    return options.reduce((best, t) => (score(t) > score(best) ? t : best));
  }

  // First tap on an enemy: show where the unit will stand, the path, and the odds.
  // Returns false (and does nothing) if the enemy is out of reach this turn.
  startApproach(target) {
    const unit = this.activeUnit;
    if (unit.hasActed || unit.engagedWith || this.busy || !target.alive) return false;
    const options = this.approachTiles(unit, target);
    if (options.length === 0) return false;
    this.clearHighlights();
    this.reachableKeys = new Set(options.map((t) => t.col + ',' + t.row));
    this.mode = 'approach';
    this.approach = {
      target,
      options,
      optionKeys: this.reachableKeys,
      tile: this.bestApproachTile(unit, target, options),
    };
    this.pendingTarget = target;
    this.targetsInRange = [target];
    play('select');
    this.showApproach();
    return true;
  }

  // The player tapped a different blue tile to stand on.
  chooseApproachTile(tile) {
    play('select');
    this.approach.tile = tile;
    this.showApproach();
  }

  // Draws the choice: faint blue where it could stand, gold where it will
  // stand, small gold steps along the way, and the target outlined in red.
  showApproach() {
    const unit = this.activeUnit;
    const a = this.approach;
    this.showHighlights(a.options, 0x4aa3ff, { alpha: 0.38 });
    this.showHighlights([a.tile], 0xffd27a, { keep: true, alpha: 0.7 });
    this.showHighlights([{ col: a.target.col, row: a.target.row }], 0xe05a47, { keep: true, alpha: 0.5 });
    const path = getPath(unit.col, unit.row, a.tile.col, a.tile.row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r));
    for (const step of path.slice(0, -1)) {
      const p = tileToScreen(step.col, step.row);
      const dot = this.add.circle(p.x, p.y, 6, 0xffd27a, 0.9).setDepth(depthFor(step.col, step.row) + 0.6);
      this.highlights.push(dot);
    }

    // Two markers that float above every figure, so a unit standing in front
    // can never hide them: a gold arrow over the tile to stand on, and a red
    // target sign over the chosen enemy's head.
    const spot = tileToScreen(a.tile.col, a.tile.row);
    this.highlights.push(this.tileEdge(a.tile, 0xffd27a));
    this.highlights.push(this.floatingMarker(spot.x, spot.y - 30, 'arrow', 0xffd27a));
    this.highlights.push(this.floatingMarker(a.target.view.x, a.target.view.y - a.target.topY - 46, 'target', 0xff6b5a));
    this.refreshOutlines();
    this.refreshStatus();
  }

  // A bright outline around a tile's top.
  tileEdge(tile, color) {
    const { x, y } = tileToScreen(tile.col, tile.row);
    const hw = TILE_WIDTH / 2 - 4;
    const hh = TILE_HEIGHT / 2 - 3;
    const g = this.add.graphics().setDepth(depthFor(tile.col, tile.row) + 0.55);
    g.lineStyle(3, color, 1);
    g.strokePoints([{ x, y: y - hh }, { x: x + hw, y }, { x, y: y + hh }, { x: x - hw, y }], true);
    return g;
  }

  // A small bobbing marker drawn above everything on the board.
  //   'arrow'  : a down-pointing arrow (stand here)
  //   'target' : a ring with four ticks (this one)
  floatingMarker(x, y, kind, color) {
    const g = this.add.graphics().setDepth(78).setPosition(x, y);
    g.lineStyle(3, 0x1a1410, 0.9);
    g.fillStyle(color, 1);
    if (kind === 'arrow') {
      g.fillTriangle(-15, -14, 15, -14, 0, 8);
      g.strokeTriangle(-15, -14, 15, -14, 0, 8);
    } else {
      g.lineStyle(6, 0x1a1410, 0.9);
      g.strokeCircle(0, 0, 11);
      g.lineStyle(3, color, 1);
      g.strokeCircle(0, 0, 11);
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) g.lineBetween(dx * 6, dy * 6, dx * 17, dy * 17);
    }
    this.tweens.add({ targets: g, y: y - 7, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return g;
  }

  // Second tap on the enemy: walk to the tile (if needed), then attack.
  confirmApproach() {
    const unit = this.activeUnit;
    const { target, tile } = this.approach;
    const strike = () => {
      this.busy = true;
      this.performAttack(unit, target, () => {
        this.busy = false;
      });
    };
    if (tile.col === unit.col && tile.row === unit.row) {
      this.approach = null;
      this.mode = 'idle';
      this.pendingTarget = null;
      this.clearHighlights();
      this.refreshOutlines();
      strike();
      return;
    }
    this.moveUnit(unit, tile.col, tile.row, strike); // moveUnit tidies up the choice itself
  }

  // Undo move: back to where the unit started this turn, with all its steps
  // back (only before it acts).
  undoMove() {
    const unit = this.activeUnit;
    if (this.busy || unit.hasActed || !unit.moveFrom) return;
    play('cancel');
    this.cancelMode();
    const from = unit.moveFrom;
    unit.col = from.col;
    unit.row = from.row;
    unit.hasMoved = false;
    unit.stepsUsed = 0; // every step comes back
    unit.moveFrom = null;
    const p = tileToScreen(from.col, from.row);
    unit.view.setDepth(depthFor(from.col, from.row) + 1);
    this.tweens.add({ targets: unit.view, x: p.x, y: p.y, duration: 160, ease: 'Sine.easeOut' });
    unit.facing = from.facing;
    this.showStanding(unit);
    this.refreshStatus();
  }

  // ---------- Choosing an attack ----------

  // Shows red squares on every enemy the active unit can hit.
  startAttack() {
    const unit = this.activeUnit;
    if (unit.engagedWith) return; // locked units cannot make ordinary attacks
    this.targetsInRange = getTargetsInRange(unit, this.units);

    if (this.targetsInRange.length === 0) {
      this.showMessage('No enemy in range');
      return;
    }

    this.mode = 'attack';
    // For ranged attacks, a faint red area shows how far it reaches; the enemies in it are bright red
    if (unit.range > 1) {
      const area = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        for (let row = 0; row < GRID_SIZE; row++) {
          const d = distance(unit, { col, row });
          if (d > 0 && inReach(unit, { col, row })) area.push({ col, row });
        }
      }
      this.showHighlights(area, 0xe05a47, { alpha: 0.16 });
    }
    this.showHighlights(this.targetsInRange.map((t) => ({ col: t.col, row: t.row })), 0xe05a47, { keep: unit.range > 1 });
    this.refreshStatus();
  }

  // First tap on an enemy: pick it and show the odds.
  previewAttack(target) {
    play('select');
    this.pendingTarget = target;
    this.refreshOutlines();
    this.refreshStatus();
  }

  // Second tap on the same enemy: attack.
  confirmAttack() {
    const attacker = this.activeUnit;
    const target = this.pendingTarget;

    this.cancelMode();
    this.busy = true;
    this.performAttack(attacker, target, () => {
      this.busy = false;
    });
  }

  // ---------- Attacking (used by heroes and enemies) ----------

  // Rolls the attack and shows what happened.
  // "onDone" runs after a short pause, once the player has seen the result.
  // A blow that defeats its target gets a cut-in and slow motion.
  performAttack(attacker, target, onDone) {
    attacker.hasActed = true;
    const result = rollAttack(attacker, target);

    // The numbers change right away. The pictures and effects catch up a
    // moment later, when the blow lands (see playAttack and showImpact).
    if (result.hit) {
      const landed = this.landHit(target, result.damage); // a signature stance may soften it
      result.damage = landed.damage;
      result.note = landed.note;
      target.hp = Math.max(0, target.hp - result.damage);

      if (target.hp === 0) {
        this.defeat(target);
      }
    }
    const lethal = result.hit && target.hp === 0;

    // Lightning jumps to a second enemy near the first, if the first bolt hit
    let jump = null;
    if (result.hit && attacker.chain) {
      const next = chainTarget(attacker, target, this.units);
      if (next) {
        const hit = Math.random() * 100 < getHitChance(attacker, next);
        let damage = hit ? chainDamage(attacker, next) : 0;
        if (hit) {
          damage = this.landHit(next, damage).damage;
          next.hp = Math.max(0, next.hp - damage);
          if (next.hp === 0) this.defeat(next);
        }
        jump = { target: next, result: { hit, damage } };
      }
    }
    // Husk echo: the decoy nobody struck fires a second bolt at the same target
    let echo = null;
    const echoDecoy = attacker.echoReady ? this.decoys.find((d) => d.owner === attacker) : null;
    if (echoDecoy) {
      attacker.echoReady = false;
      echo = { decoy: echoDecoy, target: null, result: null };
      if (target.alive) {
        const hit = Math.random() * 100 < getHitChance(attacker, target);
        let damage = hit ? getDamage(attacker, target) : 0;
        if (hit) {
          damage = this.landHit(target, damage).damage;
          target.hp = Math.max(0, target.hp - damage);
          if (target.hp === 0) this.defeat(target);
        }
        echo.target = target;
        echo.result = { hit, damage };
      }
    }
    const playEcho = () => {
      if (!echo) return;
      this.time.delayedCall(jump ? 820 : 420, () => {
        const from = { x: echo.decoy.view.x, y: echo.decoy.view.y - attacker.centerY };
        if (echo.target) {
          const to = this.centerOf(echo.target);
          lightning(this, from.x, from.y, to.x, to.y);
          lightningStrike(this, echo.target.view.x, echo.target.view.y);
          play('spark');
          this.floatText({ view: echo.decoy.view, topY: attacker.topY }, 'Echo!', '#c9a8ff', { pop: true });
          this.time.delayedCall(120, () => this.showImpact(attacker, echo.target, echo.result, to.x - from.x, echo.target.hp === 0));
        }
        this.time.delayedCall(300, () => this.burstDecoys(attacker));
      });
    };
    const playJump = () => {
      if (!jump) return;
      this.time.delayedCall(380, () => {
        const a = this.centerOf(target);
        const b = this.centerOf(jump.target);
        lightning(this, a.x, a.y, b.x, b.y);
        play('spark');
        this.time.delayedCall(120, () => this.showImpact(attacker, jump.target, jump.result, b.x - a.x));
      });
    };

    this.refreshButtons();

    // Did that attack wipe out a whole side?
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;

    // Pause so the player sees the result, then either show the final
    // screen or carry on with the turn.
    const finish = () =>
      this.time.delayedCall(lethal ? 1500 : 800, () => {
        if (outcome) {
          this.busy = false; // nothing is happening any more; the battleOver flag blocks taps
          this.showResult(outcome);
        } else {
          onDone();
        }
      });

    if (lethal) {
      this.beginCinematic();
      this.cutIn(attacker, 'FINISHING BLOW', () => {
        this.playAttack(attacker, target, result, true);
        playJump();
        playEcho();
        if (echo) this.time.delayedCall(500, finish);
        else finish();
      });
    } else {
      this.playAttack(attacker, target, result, false);
      playJump();
      playEcho();
      const extra = (jump ? 450 : 0) + (echo ? 600 : 0);
      if (extra) this.time.delayedCall(extra, finish);
      else finish();
    }
  }

  // A blow is about to land on a unit: its signature stance may soak or soften
  // it (and builds up its stacks). Returns { damage, note }.
  // A hit that does damage also breaks a Sage's meditation and an archer's aim.
  landHit(target, damage) {
    const landed = takeHit(target, damage);
    if (landed.damage > 0) this.interrupt(target);
    return landed;
  }

  // Breaks a meditation trance (no MP comes back) or an archer's aim (the
  // arrow never flies). She stays Exposed until her next turn.
  interrupt(unit) {
    let word = null;
    if (unit.meditating) {
      unit.meditating = null;
      word = 'Trance broken';
    }
    if (unit.aiming) {
      if (unit.aiming.target.markedBy === unit) unit.aiming.target.markedBy = null;
      unit.aiming = null;
      word = 'Aim broken';
    }
    if (!word) return;
    this.time.delayedCall(520, () => {
      if (!unit.alive) return;
      this.floatText(unit, word, '#e8d5a8', { rise: 52 });
      this.refreshStatusTags();
      if (!this.inCinematic) this.showStanding(unit);
    });
  }

  // Shrinks the green health bar to match the unit's health.
  // A badly hurt unit gets a slow red glow at its feet.
  updateHpBar(unit) {
    const fraction = unit.hp / unit.maxHp;
    const weakNow = fraction > 0 && fraction <= HURT_FACE_AT;
    if (weakNow !== !!unit.wasWeak) {
      unit.wasWeak = weakNow;
      this.time.delayedCall(450, () => unit.alive && !this.inCinematic && this.showStanding(unit)); // after the flinch: weakened, or upright again after healing
    }
    unit.hpFill.setScale(fraction, 1);
    unit.hpFill.setFillStyle(fraction <= 0.35 ? 0xe05a47 : 0x6fcf7f); // red when low
    if (fraction > 0 && fraction <= 0.3 && !unit.lowGlow && unit.view.active) {
      unit.lowGlow = this.add.ellipse(0, 2, 74, 32, 0xff3b2e, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      unit.view.addAt(unit.lowGlow, 1);
      this.tweens.add({ targets: unit.lowGlow, alpha: 0.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // A unit with no health left stops taking turns. (This only changes the
  // numbers. The fall is drawn by playDefeat, when the blow lands.)
  defeat(unit) {
    unit.alive = false;
    if (unit.aiming && unit.aiming.target.markedBy === unit) unit.aiming.target.markedBy = null; // her aim dies with her
    unit.aiming = null;
    unit.meditating = null;
    if (unit.status) unit.status.stunned = false;
    if (unit.engagedWith) {
      endDuel(unit); // a fallen unit cannot stay locked in a fight
      this.refreshEngagementMarks();
      this.refreshStatusTags();
    }
    this.refreshTurnStrip(); // take it out of the turn order bar
  }

  // ---------- Attack animation ----------

  // The middle of a unit's body on the screen. Effects aim here.
  centerOf(unit) {
    return { x: unit.view.x, y: unit.view.y - unit.centerY };
  }

  // Turns a unit to face the nearest unit on the other side.
  faceNearestOpponent(unit) {
    if (!unit.alive) return;

    // Locked in an engagement: always face that foe
    if (unit.engagedWith) {
      const foe = unit.engagedWith;
      this.faceToward(unit, foe.view.x - unit.view.x, foe.view.y - unit.view.y);
      return;
    }

    const foes = this.units.filter((u) => u.alive && u.side !== unit.side);
    if (foes.length === 0) return;

    let nearest = foes[0];
    for (const foe of foes) {
      if (distance(unit, foe) < distance(unit, nearest)) nearest = foe;
    }
    this.faceToward(unit, nearest.view.x - unit.view.x, nearest.view.y - unit.view.y);
  }

  // Turns a unit to face a direction on the screen (dx and dy are distances in pixels).
  faceToward(unit, dx, dy) {
    const wasRight = unit.facing.endsWith('Right');
    const wasUp = unit.facing.startsWith('up');

    const right = Math.abs(dx) < 2 ? wasRight : dx > 0;
    const up = Math.abs(dy) < 2 ? wasUp : dy < 0;

    unit.facing = (up ? 'up' : 'down') + (right ? 'Right' : 'Left');
    this.showStanding(unit);
  }

  // Shows one picture on a unit. "frame" is { key, flip } from art.js.
  // Returns true if the picture was shown.
  showFrame(unit, frame) {
    if (!unit.sprite || !unit.sprite.active || !frame || !this.textures.exists(frame.key)) return false;
    unit.sprite.setTexture(frame.key);
    unit.sprite.setFlipX(frame.flip);
    unit.sprite.setOrigin(frame.originX, 1);
    return true;
  }

  // At rest. A unit locked in an engagement stays in its fighting stance.
  // Otherwise it stands relaxed, or in its battle stance when an enemy is near.
  // Badly hurt units stand weakened (if they have the pictures); a Sage in
  // meditation stays kneeling in it.
  showStanding(unit) {
    if (unit.meditating && this.showFrame(unit, poseFrame(unit.id, 'meditate', 'right', unit.facing))) return;
    if (unit.aiming && this.showFrame(unit, poseFrame(unit.id, 'poison', unit.aiming.target.view.x >= unit.view.x ? 'right' : 'left'))) return;
    if (unit.engagedWith && unit.engagedWith.view) {
      const foe = unit.engagedWith.view;
      const dy = foe.y - unit.view.y;
      const up = Math.abs(dy) < 2 ? unit.facing.startsWith('up') : dy < 0;
      const facing = (up ? 'up' : 'down') + (foe.x >= unit.view.x ? 'Right' : 'Left');
      if (this.showFrame(unit, poseFrame(unit.id, 'ready', facing.endsWith('Right') ? 'right' : 'left', facing))) return;
    }
    const buff = buffOf(unit);
    const weak = unit.hp > 0 && unit.hp / unit.maxHp <= HURT_FACE_AT;
    this.showFrame(unit, standingFrame(unit.id, unit.facing, this.isAlert(unit), buff ? buff.id : null, weak));
  }

  // True when an enemy (as this unit sees it) is within ALERT_RANGE tiles.
  isAlert(unit) {
    if (!this.units) return false;
    return this.units.some((o) => o.alive && o.side !== unit.side && !o.hidden && distance(o, unit) <= ALERT_RANGE);
  }

  // An action picture (attack, windup, ready, guard, dodge, cast) facing a direction.
  // dx > 0 means toward the right of the screen. Falls back to standing if missing.
  // A pose drawn in four facings uses the unit's up or down (set by faceToward)
  // with dx's left or right, so it looks at its target.
  showPose(unit, pose, dx) {
    const right = dx >= 0;
    const facing = (unit.facing && unit.facing.startsWith('up') ? 'up' : 'down') + (right ? 'Right' : 'Left');
    if (!this.showFrame(unit, poseFrame(unit.id, pose, right ? 'right' : 'left', facing))) this.showStanding(unit);
  }

  // The attack picture, if the unit has one. dx says which way it is swinging.
  showAttackPose(unit, dx) {
    this.showPose(unit, 'attack', dx);
  }

  // Plays an attack. Close fighters lunge into the target. Archers loose an arrow.
  playAttack(attacker, target, result, lethal = false) {
    const from = { x: attacker.view.x, y: attacker.view.y };
    const dx = target.view.x - from.x;
    const dy = target.view.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    // an archer right next to its target fights with its dagger instead of the bow
    const close = !target.isDecoy && usesCloseWeapon(attacker, target);
    const style = close ? 'slash' : attacker.attackEffect;
    const strikePose = close ? attacker.closeWeapon.pose : 'attack';
    const readyPose = close ? 'ready' : 'windup';

    this.faceToward(attacker, dx, dy);
    this.showPose(attacker, strikePose, dx);

    // striking a Husk decoy bursts it instead of hurting anyone
    const impact = target.isDecoy ? () => this.popDecoy(target.decoy) : () => this.showImpact(attacker, target, result, dx, lethal);
    if (lethal) this.focusCamera((attacker.view.x + target.view.x) / 2, (attacker.view.y + target.view.y) / 2 - 50, 1.35, 220);

    if (style === 'spark') {
      const start = this.centerOf(attacker);
      const end = this.centerOf(target);
      this.time.delayedCall(140, () => {
        lightning(this, start.x, start.y - 20, end.x, end.y);
        // a bolt crashes down on the target (from Layra's effect sheet)
        if (!target.isDecoy) lightningStrike(this, target.view.x, target.view.y, { big: lethal });
        play('spark');
      });
      this.time.delayedCall(260, impact);
      this.time.delayedCall(460, () => this.showStanding(attacker));
      return;
    }

    if (style === 'arrow') {
      const start = this.centerOf(attacker);
      const end = this.centerOf(target);
      this.time.delayedCall(140, () => {
        play('arrow');
        arrowShot(this, start.x, start.y, end.x, end.y, impact);
      });
      this.time.delayedCall(420, () => this.showStanding(attacker));
      return;
    }

    // Close fighters: wind up, dash in leaving after-images, strike, step back
    this.showPose(attacker, readyPose, dx);
    this.tweens.add({
      targets: attacker.view,
      x: from.x - (dx / dist) * 8, // draw back a little first
      y: from.y - (dy / dist) * 4,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => {
        play('whoosh');
        this.showPose(attacker, strikePose, dx);
        this.time.addEvent({ delay: 22, repeat: 3, callback: () => this.afterimage(attacker) });
        this.tweens.add({
          targets: attacker.view,
          x: from.x + (dx / dist) * 30,
          y: from.y + (dy / dist) * 15,
          duration: 90,
          ease: 'Quad.easeIn',
          onComplete: () => {
            impact();
            this.tweens.add({
              targets: attacker.view,
              x: from.x,
              y: from.y,
              delay: 140,
              duration: 220,
              ease: 'Quad.easeOut',
              onComplete: () => this.showStanding(attacker),
            });
          },
        });
      },
    });
  }

  // A fading copy of a unit where it is now, for a sense of speed.
  afterimage(unit) {
    if (!unit.view || !unit.view.active) return;
    let ghost;
    if (unit.sprite) {
      ghost = this.add.image(unit.view.x + unit.sprite.x, unit.view.y + unit.sprite.y, unit.sprite.texture.key);
      ghost.setOrigin(unit.sprite.originX, unit.sprite.originY).setScale(unit.sprite.scaleX, unit.sprite.scaleY).setFlipX(unit.sprite.flipX);
    } else {
      ghost = this.add.circle(unit.view.x, unit.view.y - unit.centerY, 22, SIDE_COLORS[unit.side]);
    }
    ghost.setDepth(unit.view.depth - 0.1).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 240, onComplete: () => ghost.destroy() });
  }

  // Freezes the action for a split second when a blow lands, so it feels heavy.
  // It slows the scene's clock almost to a stop, then lets it run again.
  hitStop(ms) {
    if (this.inHitStop) return;
    this.inHitStop = true;
    ms /= this.speed.base * this.speed.skip; // shorter when the action is sped up
    this.setSpeed('hitStop', 0.03);
    // Real time, because the scene's own clock is nearly stopped
    window.setTimeout(() => {
      this.setSpeed('hitStop', 1);
      this.inHitStop = false;
    }, ms);
  }

  // The camera jolts in a little toward a hit, then settles.
  cameraPunch(power) {
    if (this.inCinematic) return;
    const cam = this.cameras.main;
    cam.zoomTo(1 + 0.03 * power, 50, 'Quad.easeOut', true);
    this.time.delayedCall(70, () => {
      if (!this.inCinematic) cam.zoomTo(1, 220, 'Quad.easeOut', true);
    });
  }

  // Thrown back by a blow, away from the attacker, then steadies.
  knockback(unit, dx, power) {
    const push = (dx >= 0 ? 1 : -1) * 14 * power;
    const x0 = unit.view.x;
    this.tweens.add({ targets: unit.view, x: x0 + push, duration: 90, ease: 'Quad.easeOut', yoyo: true, hold: 120 });
    dustPuff(this, unit.view.x + push, unit.view.y);
  }

  // What happens at the moment a blow lands (or misses).
  showImpact(attacker, target, result, dx, lethal = false) {
    if (!target.view || !target.view.active) return;

    const spot = this.centerOf(target);
    const style = usesCloseWeapon(attacker, target) ? 'slash' : attacker.attackEffect; // a dagger cuts

    if (!result.hit) {
      play('miss');
      this.floatText(target, 'Miss', '#e8d5a8');
      this.sidestep(target, dx);
      return;
    }
    const dir = dx >= 0 ? 1 : -1;
    const power = Math.min(2, 0.8 + result.damage / 8) * (lethal ? 1.3 : 1);
    const color = style === 'spark' ? 0x9fd4ff : 0xffd27a;

    this.hitStop(lethal ? 150 : result.damage >= 8 ? 95 : 65);
    play(style === 'bash' ? 'bash' : 'impact');

    if (style === 'slash') heavySlash(this, spot.x, spot.y, dir, color);
    if (style === 'bash') {
      dustPuff(this, target.view.x, target.view.y);
      screenShake(this, 0.004, 120);
    }
    impactBurst(this, spot.x, spot.y, dir, color, power);
    groundRing(this, target.view.x, target.view.y, color, 0.6 + 0.3 * power);

    this.flashUnit(target);
    this.updateHpBar(target);
    this.floatText(target, result.damage > 0 ? '-' + result.damage : 'Blocked', result.damage >= 9 ? '#ffcf5a' : '#ff6b5a', { pop: true, big: result.damage >= 9 });
    if (result.note) this.floatText(target, result.note, '#ffd27a', { rise: 52 }); // a signature stance at work
    this.refreshStatusTags(); // stacks and Charge may have changed
    this.cameraPunch(power);

    // Big hits and finishing blows shake the screen
    if (result.damage >= 9 || target.hp === 0) screenShake(this, 0.005 * power, 160);

    if (target.hp === 0) {
      this.playDefeat(target, dx);
    } else {
      this.showPose(target, 'hurt', -dx); // flinch, facing the attacker
      this.knockback(target, dx, power);
      this.time.delayedCall(420, () => {
        if (target.alive) this.showStanding(target);
      });
    }
    if (lethal) this.finisherSlowMotion();
  }

  // The finishing blow: a white flash, the world slows right down for a moment,
  // then the camera eases back out.
  finisherSlowMotion() {
    const flash = this.ui(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.55).setDepth(240));
    this.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
    screenShake(this, 0.008, 220);
    this.setSpeed('slowMo', 0.35);
    this.time.delayedCall(260, () => {
      this.setSpeed('slowMo', 1);
      this.resetCamera(360);
      this.time.delayedCall(300, () => this.endCinematic());
    });
  }

  // The unit flashes white for a moment when it is hit.
  flashUnit(unit) {
    if (unit.sprite) {
      unit.sprite.setTintFill(0xffffff);
      this.time.delayedCall(90, () => {
        if (unit.sprite && unit.sprite.active) unit.sprite.clearTint();
        if (unit.hidden) this.hiddenLook(unit, true); // still hidden: keep her gold
      });
    } else {
      unit.body.setFillStyle(0xffffff);
      this.time.delayedCall(90, () => {
        if (unit.body && unit.body.active) unit.body.setFillStyle(SIDE_COLORS[unit.side]);
      });
    }
  }

  // Knocked back a little, away from the attacker, and back again.
  recoil(unit, dx) {
    this.tweens.add({
      targets: unit.view,
      x: unit.view.x + (dx >= 0 ? 10 : -10),
      duration: 70,
      yoyo: true,
    });
  }

  // A quick step out of the way, for an attack that misses.
  sidestep(unit, dx) {
    this.tweens.add({
      targets: unit.view,
      x: unit.view.x + (dx >= 0 ? 12 : -12),
      y: unit.view.y - 6,
      duration: 110,
      yoyo: true,
    });
  }

  // The fall. The fighter is thrown back away from the blow, crashes down
  // with dust and a shockwave, lies still for a moment, then burns away into
  // rising embers. dx is the direction the blow came from (as in showImpact).
  playDefeat(unit, dx = 0) {
    if (!unit.view || !unit.view.active) return;
    if (unit.idleTween) unit.idleTween.stop();
    const away = dx >= 0 ? 1 : -1;
    const view = unit.view;

    // the health bar, badge and tags go at once; only the figure is left
    for (const piece of view.list) if (!unit.idleTargets.includes(piece)) piece.setVisible(false);

    const hasDown = !!poseFrame(unit.id, 'down', 'right');
    this.showPose(unit, 'knocked', -dx);
    const x0 = view.x;
    const y0 = view.y;
    const flight = { p: 0 };
    this.tweens.add({
      targets: flight,
      p: 1,
      duration: 380,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        view.x = x0 + away * 36 * flight.p;
        view.y = y0 - Math.sin(flight.p * Math.PI) * 28;
        if (!hasDown) view.angle = away * 85 * flight.p; // no lying-down picture: topple over
      },
      onComplete: () => {
        // the crash
        play('crash');
        if (hasDown) this.showPose(unit, 'down', -dx);
        dustPuff(this, view.x, view.y);
        groundRing(this, view.x, view.y, 0xe8c08a, 1.2);
        screenShake(this, 0.006, 170);
        this.tweens.add({ targets: view, y: view.y - 6, duration: 80, yoyo: true });

        // a moment later, it burns away
        this.time.delayedCall(520, () => {
          if (!view.active) return;
          const embers = unit.side === 'enemy' ? [0xff7a2e, 0xffb04a, 0xffd27a] : [0x9fd4ff, 0xffffff, 0x7fd6cf];
          emberBurst(this, view.x, view.y, embers, 46, unit.sprite ? 50 : 40);
          lightColumn(this, view.x, view.y, unit.side === 'enemy' ? 0xff9a4a : 0x9fd4ff);
          this.tweens.add({ targets: view, alpha: 0.25, duration: 60, yoyo: true, repeat: 2 });
          this.tweens.add({ targets: view, alpha: 0, delay: 360, duration: 520, onComplete: () => view.destroy() });
        });
      },
    });
  }

  // Text that floats up from a unit and fades, like "-7" or "Miss".
  floatText(unit, text, color, options = {}) {
    const big = !!options.big;
    const label = this.add
      .text(unit.view.x, unit.view.y - unit.topY - 20 - (options.rise || 0), text, {
        fontFamily: 'Georgia, serif',
        fontSize: big ? '54px' : '40px',
        fontStyle: 'bold',
        color,
        stroke: '#1a1410',
        strokeThickness: big ? 8 : 6,
      })
      .setOrigin(0.5)
      .setDepth(80); // above every tile and unit

    if (!options.pop) {
      this.tweens.add({
        targets: label,
        y: label.y - 60,
        alpha: 0,
        duration: 900,
        onComplete: () => label.destroy(),
      });
      return;
    }

    // Damage numbers pop: they burst out big, bounce up and to the side,
    // hold for a beat so you can read them, then float away.
    const drift = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 14);
    label.setScale(0.3);
    this.tweens.add({ targets: label, scale: big ? 1.35 : 1.15, duration: 130, ease: 'Back.easeOut' });
    this.tweens.add({ targets: label, scale: 1, delay: 130, duration: 120 });
    this.tweens.add({ targets: label, x: label.x + drift, y: label.y - 34, duration: 260, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: label,
      y: label.y - 70,
      alpha: 0,
      delay: 620,
      duration: 380,
      onComplete: () => label.destroy(),
    });
  }

  // ---------- Winning and losing ----------

  // Looks at who is still standing.
  // Returns 'victory' if no enemies are left, 'defeat' if no heroes are left,
  // and null if the battle goes on.
  checkBattleEnd() {
    const heroesLeft = this.units.some((u) => u.alive && u.side === 'hero');
    const enemiesLeft = this.units.some((u) => u.alive && u.side === 'enemy');

    if (!enemiesLeft) return 'victory';
    if (!heroesLeft) return 'defeat';
    return null;
  }

  // The end of the battle. The side still standing celebrates for a moment,
  // then the result panel appears.
  showResult(outcome) {
    const won = outcome === 'victory';
    stopMusic();
    play(won ? 'victory' : 'defeat');
    this.statusText.setText('');
    for (const slot of this.slots) slot.set(null);
    this.resetCamera(300);

    const survivors = this.units.filter((u) => u.alive && u.side === (won ? 'hero' : 'enemy'));
    survivors.forEach((u, i) => {
      this.time.delayedCall(i * 140, () => {
        const foeSide = won ? 1 : -1;
        this.showPose(u, poseFrame(u.id, 'victory', 'right') ? 'victory' : 'attack', foeSide); // a victory pose if it has one
        this.tweens.add({ targets: u.idleTargets, y: '-=18', duration: 150, yoyo: true, repeat: 2, ease: 'Sine.easeOut' });
      });
    });
    this.time.delayedCall(1000, () => this.showResultPanel(won));
  }

  showResultPanel(won) {
    const W = GAME_WIDTH;
    const cover = this.ui(this.add.rectangle(W / 2, GAME_HEIGHT / 2, W, GAME_HEIGHT, 0x000000, 0).setDepth(300));
    this.tweens.add({ targets: cover, fillAlpha: 0.8, duration: 300 });

    const panel = this.ui(bronzePanel(this, 60, 380, W - 120, 540).setDepth(301));
    const title = this.ui(
      this.add
        .text(W / 2, 480, won ? 'Victory' : 'Defeat', textStyle(92, won ? '#ffe08a' : '#ff6b5a', { fontStyle: 'bold' }))
        .setOrigin(0.5)
        .setDepth(302)
        .setScale(0.6)
    );
    this.tweens.add({ targets: title, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.ui(this.add.text(W / 2, 568, won ? 'All enemies defeated.' : 'All heroes have fallen.', textStyle(30)).setOrigin(0.5).setDepth(302));
    this.ui(this.add.text(W / 2, 612, 'Turns played: ' + this.turnCount, textStyle(24, '#a89a78')).setOrigin(0.5).setDepth(302));
    this.ui(this.add.tileSprite(W / 2, 652, 420, 18, 'ui-woven').setDepth(302));

    let y = 730;
    const addButton = (label, icon, onTap) => {
      const button = new CommandButton(this, W / 2, y, 420, 76);
      button.set(label, icon, true, onTap);
      button.view.setDepth(303);
      this.ui(button.view);
      this.resultButtons.push(button);
      y += 100;
    };

    // After a win, "Continue" moves the story on to the next step
    if (won && this.stepIndex !== null) addButton('Continue', 'press', () => startStep(this, this.stepIndex + 1));
    // Restarting the scene builds a brand new battle from units.json
    addButton(won ? 'Play again' : 'Try again', 'back', () => this.scene.restart({ stepIndex: this.stepIndex }));
  }

  // ---------- Enemy turns ----------

  // An enemy's whole turn: walk toward the heroes if needed, attack if
  // someone is in range, then end the turn.
  runEnemyTurn() {
    const unit = this.activeUnit;

    // Locked in an engagement: press the fight, or try to get away if losing
    if (unit.engagedWith) {
      this.enemyEngagedTurn(unit);
      return;
    }

    // It plans with what it can see: a hidden caster's decoy instead of her.
    // Her real tile still blocks the way, even if they do not know why.
    const hiddenAt = (c, r) => this.units.some((u) => u.alive && u.hidden && u.col === c && u.row === r);
    const tile = chooseMoveTile(unit, this.enemyEyes(), hiddenAt);

    if (tile) {
      this.moveUnit(unit, tile.col, tile.row, () => this.enemyAttack(unit));
    } else {
      this.enemyAttack(unit);
    }
  }

  // Attacks the weakest hero in range, if any, then ends the turn.
  enemyAttack(unit) {
    // A Defence fighter (like a Guardian) tries to pin a hero fighter in an
    // engagement, to tie it up while its allies strike.
    // It only pins when an ally is close enough to take advantage of it.
    const allyNear = (t) => this.units.some((o) => o.alive && o.side === unit.side && o !== unit && distance(o, t) <= o.move + o.range);
    // After an engagement ends it waits one of its own turns before pinning
    // again, so it does not lock the same hero down turn after turn.
    const rested = !unit.lastEngagedTurn || this.turnCount - unit.lastEngagedTurn > 6;
    const seen = this.enemyEyes();
    const pins = engageTargets(unit, seen).filter((t) => !t.isDecoy && allyNear(t));
    // (tanks with a signature stance, like the Bruiser and the Warlord, want clashes too)
    if ((styleOf(unit) === 'defence' || unit.signature) && rested && pins.length > 0) {
      pins.sort((a, b) => b.attack - a.attack); // the most dangerous one
      this.busy = true;
      this.performEngage(unit, pins[0], () => {
        this.busy = false;
        this.time.delayedCall(300, () => this.endTurn());
      });
      return;
    }

    // A Shield Toss from a distance: stun a foe it cannot reach this turn (a caster first)
    if (unit.spells.includes('shieldToss') && canAfford(unit, 'shieldToss') && getTargetsInRange(unit, seen).length === 0) {
      const reach = spells.shieldToss.range;
      const marks = seen
        .filter((t) => t.side !== unit.side && t.alive && !t.isDecoy && !isStunned(t) && distance(unit, t) >= 2 && distance(unit, t) <= reach)
        .sort((a, b) => isCaster(b) - isCaster(a) || b.attack - a.attack);
      if (marks.length > 0) {
        this.busy = true;
        spendMp(unit, 'shieldToss');
        startCooldown(unit, 'shieldToss');
        unit.hasActed = true;
        this.castShieldToss(unit, marks[0], spells.shieldToss, () => {
          this.busy = false;
          this.time.delayedCall(300, () => this.endTurn());
        });
        return;
      }
    }

    const targets = getTargetsInRange(unit, seen);

    if (targets.length === 0) {
      this.time.delayedCall(400, () => this.endTurn());
      return;
    }

    // Exploit openings first: Off-Balance targets, then distracted (engaged) ones,
    // then casters (fragile and dangerous), then whoever has the least health.
    const opening = (t) => (isOffBalance(t) ? 2 : 0) + (isDistracted(t, unit) ? 1 : 0);
    targets.sort((a, b) => opening(b) - opening(a) || isCaster(b) - isCaster(a) || a.hp - b.hp);
    // An archer with Poison Arrow ready poisons the healthiest foe in reach that is not poisoned yet
    if (unit.spells.includes('poisonArrow') && canAfford(unit, 'poisonArrow')) {
      const reach = spells.poisonArrow.range;
      const marks = targets.filter((t) => !t.isDecoy && !isPoisoned(t) && distance(unit, t) <= reach).sort((a, b) => b.hp - a.hp);
      if (marks.length > 0) {
        this.busy = true;
        spendMp(unit, 'poisonArrow');
        startCooldown(unit, 'poisonArrow');
        unit.hasActed = true;
        this.castPoisonArrow(unit, marks[0], spells.poisonArrow, () => {
          this.busy = false;
          this.time.delayedCall(300, () => this.endTurn());
        });
        return;
      }
    }
    this.busy = true;
    const done = () => {
      this.busy = false;
      this.time.delayedCall(300, () => this.endTurn());
    };
    if (targets[0].isDecoy) this.strikeDecoy(unit, targets[0].decoy, done); // fooled by Husk
    else if (unit.spells.includes('doubleHit') && canAfford(unit, 'doubleHit') && distance(unit, targets[0]) <= spells.doubleHit.range) {
      spendMp(unit, 'doubleHit');
      startCooldown(unit, 'doubleHit');
      unit.hasActed = true;
      this.castDoubleHit(unit, targets[0], spells.doubleHit, done);
    } else this.performAttack(unit, targets[0], done);
  }

  // An enemy's turn while locked: Press, unless it is hurt and the odds are against it.
  enemyEngagedTurn(unit) {
    if (isStanceDuel()) {
      this.enemyDuelTurn(unit);
      return;
    }
    const foe = unit.engagedWith;
    const edge = contestEdge(unit, foe, CONTEST_CTX);
    const hurt = unit.hp < unit.maxHp * 0.35;
    unit.hasActed = true;
    this.busy = true;
    const done = () => {
      this.busy = false;
      this.time.delayedCall(300, () => this.endTurn());
    };
    if (hurt && edge < 0) this.tryBreakAway(unit, done);
    else this.pressEngagement(unit, done);
  }

  // An enemy's turn in a stance duel. It breaks away when badly hurt and
  // losing; otherwise it picks a stance by its class habits, sometimes reading
  // the hero's last stance. It empowers when it has Poise to spare.
  enemyDuelTurn(unit) {
    const foe = unit.engagedWith;
    const hurt = unit.hp < unit.maxHp * 0.35;
    // An archer cannot shoot while caught, so unless it is winning it tries to get free
    const archerWantsOut = unit.range > 1 && momentumOf(unit) <= 0 && Math.random() * 100 < (engagementRules.rangedBreakChance || 0);
    const stance = (hurt && momentumOf(unit) <= -1) || archerWantsOut ? 'break' : aiStance(unit, foe, CONTEST_CTX);
    const foeStance = foe.stance || autoStance(foe);
    const empowered = stance !== 'break' && poiseOf(unit) >= 2 && (momentumOf(unit) >= 1 || Math.random() < 0.3);
    unit.hasActed = true;
    this.busy = true;
    this.duelBeat(unit, stance, foe, foeStance, empowered, false, () => {
      this.busy = false;
      this.time.delayedCall(300, () => this.endTurn());
    });
  }

  // Pushes the loser of a clash away from the winner, and works out any fall.
  //   - it cannot be shoved up a step of more than pushClimbLimit levels (a wall)
  //   - a push that goes downhill carries one tile further
  //   - every level it drops on the way costs fallDamagePerLevel health
  // Changes the loser's tile and health straight away; returns what happened.
  pushLoser(loser, winner, steps) {
    steps = Math.max(0, steps - pushResist(loser)); // Bulwark: a warden in Guard is hard to move
    if (steps === 0) return { path: [], fall: null, held: true };
    const isFree = (c, r, fc, fr) =>
      isInsideGrid(c, r) && !this.isBlocked(c, r) && getHeight(c, r) - getHeight(fc, fr) <= terrain.pushClimbLimit;
    let path = displacementPath(loser, winner, steps, isFree);
    if (path.length > 0 && getHeight(path[0].col, path[0].row) < getHeight(loser.col, loser.row)) {
      path = displacementPath(loser, winner, steps + terrain.downhillPushExtra, isFree); // downhill: further
    }
    let levels = 0;
    let prev = { col: loser.col, row: loser.row };
    for (const step of path) {
      levels += Math.max(0, getHeight(prev.col, prev.row) - getHeight(step.col, step.row));
      prev = step;
    }
    if (path.length > 0) {
      loser.col = path[path.length - 1].col;
      loser.row = path[path.length - 1].row;
    }
    const fall = levels > 0 ? { levels, damage: levels * terrain.fallDamagePerLevel } : null;
    if (fall) {
      loser.hp = Math.max(0, loser.hp - fall.damage);
      if (loser.hp === 0) this.defeat(loser);
      else this.interrupt(loser); // a fall breaks a trance or an aim too
    }
    return { path, fall };
  }

  // Shows a fall at the end of a push: a thud, dust, and the damage.
  showFall(unit, fall, awayX) {
    if (!fall || !unit.view || !unit.view.active) return;
    play('crash');
    dustPuff(this, unit.view.x, unit.view.y);
    groundRing(this, unit.view.x, unit.view.y, 0xe8c08a, 1);
    screenShake(this, 0.006, 160);
    this.updateHpBar(unit);
    this.floatText(unit, 'Fall -' + fall.damage, '#ff9a5a', { pop: true, big: fall.damage >= 8 });
    if (unit.hp === 0) this.playDefeat(unit, awayX);
  }

  // One beat of a stance duel: work it out, then show it.
  duelBeat(actor, stance, holder, holderStance, empowered, opening, onDone) {
    actor.hasActed = true;
    this.refreshButtons();
    const beat = resolveBeat(actor, stance, holder, holderStance, CONTEST_CTX, empowered, opening);
    const outcome = this.applyBeat(beat);
    if (opening) {
      this.beginCinematic();
      play('drum');
      this.cutIn(actor, 'ENGAGE!', () => this.playBeat(outcome, true, onDone));
    } else {
      this.playBeat(outcome, false, onDone);
    }
  }

  // Changes the board for a beat's result (the animation shows it afterwards):
  //   a clean break away: the duel ends and the runner steps off
  //   a decisive beat (momentum reached 3): the loser is thrown Off-Balance
  //     and pushed back (its class may hold its ground or slip the Off-Balance),
  //     the winner lands a free strike, and the momentum starts again from 0
  applyBeat(beat) {
    const out = { beat, response: null, path: [], ended: false, strike: null, escape: null };
    const isFree = (c, r) => isInsideGrid(c, r) && !this.isBlocked(c, r);

    if (beat.kind === 'break' && beat.success) {
      const foe = beat.holder;
      endDuel(beat.actor);
      out.ended = true;
      out.escape = escapeTile(beat.actor, foe, isFree);
      if (out.escape) {
        beat.actor.col = out.escape.col;
        beat.actor.row = out.escape.row;
      }
      return out;
    }

    // Signature stances: extra blows (Bloodied Press, Counter!) and Bulwark's standoff
    out.sig = [];
    for (const fx of afterBeat(beat)) {
      if (fx.kind === 'hit' && fx.to.alive && fx.from.alive) {
        const landed = this.landHit(fx.to, fx.damage);
        fx.to.hp = Math.max(0, fx.to.hp - landed.damage);
        out.sig.push({ ...fx, damage: landed.damage, note: landed.note });
        if (fx.to.hp === 0) {
          this.defeat(fx.to);
          out.ended = true;
        }
      } else if (fx.kind === 'heal') {
        out.sig.push(fx);
      }
    }
    if (out.ended) return out;
    if (!beat.decisive) return out;

    const { winner, loser } = beat;
    resetMomentum(winner);
    out.response = lossResponse(loser, CONTEST_CTX);
    if (!out.response.slipped) applyOffBalance(loser);

    // the free strike, which always lands
    if (engagementRules.decisiveStrike) {
      const landed = this.landHit(loser, getDamage(winner, loser));
      loser.hp = Math.max(0, loser.hp - landed.damage);
      out.strike = { hit: true, damage: landed.damage, note: landed.note };
      if (loser.hp === 0) {
        this.defeat(loser);
        out.ended = true;
        return out;
      }
    }

    if (!out.response.held) {
      const winStance = winner === beat.actor ? beat.actorStance : beat.holderStance;
      const pushed = this.pushLoser(loser, winner, (engagementRules.decisivePush[styleOf(winner)] || 1) + pushExtra(winner, winStance));
      out.path = pushed.path;
      out.fall = pushed.fall;
      if (!loser.alive) {
        out.ended = true;
        return out;
      }
    }
    if (distance(winner, loser) > 1) {
      endDuel(winner);
      out.ended = true;
    }
    return out;
  }

  // The beat animation: both fighters show their stance, close in, the blades
  // meet, then the result. A decisive beat adds the free strike and the push.
  playBeat(outcome, opening, onDone) {
    const { beat, response, path, ended, strike, escape } = outcome; // (outcome.fall: a fall at the end of the push)
    const a = beat.actor;
    const b = beat.holder;
    const aHome = { x: a.view.x, y: a.view.y };
    const bHome = { x: b.view.x, y: b.view.y };
    const dx = bHome.x - aHome.x;
    const dy = bHome.y - aHome.y;
    const mid = { x: (aHome.x + bHome.x) / 2, y: (aHome.y - a.centerY + bHome.y - b.centerY) / 2 };
    const headY = Math.min(aHome.y - a.topY, bHome.y - b.topY);
    const stancePose = { press: 'windup', guard: 'guard', slip: 'dodge', break: 'dodge' };

    this.beginCinematic();
    this.focusCamera(mid.x, mid.y + 30, opening || beat.decisive ? 1.35 : 1.18, 260);
    this.faceToward(a, dx, dy);
    this.faceToward(b, -dx, -dy);
    this.showPose(a, stancePose[beat.actorStance], dx);
    this.showPose(b, stancePose[beat.holderStance], -dx);
    this.showDuelFaces(beat); // both faces at the screen edges

    const steps = [];
    const at = (ms, fn) => steps.push([ms, fn]);
    const stanceColor = { press: '#ff9a6a', guard: '#e8c690', slip: '#9fd4ff', break: '#cfe8ff' };

    // both stances appear above the fighters
    at(80, () => {
      this.floatText(a, stanceName(beat.actorStance).toUpperCase() + (beat.empowered ? '+' : ''), stanceColor[beat.actorStance]);
      this.floatText(b, stanceName(beat.holderStance).toUpperCase(), stanceColor[beat.holderStance]);
    });

    if (beat.kind === 'break') {
      at(380, () => {
        play(beat.success ? 'miss' : 'bash');
        this.showPose(b, 'attack', -dx);
        if (beat.success) {
          this.banner(mid.x, headY - 70, 'Broke free!', '#9fd4ff', a.label + ' ' + Math.round(beat.actorScore) + '  vs  ' + Math.round(beat.holderScore) + ' ' + b.label);
          this.duelFacesMood({ winner: a });
          if (escape) this.slideAlong(a, [escape]);
        } else {
          this.banner(mid.x, headY - 70, 'Held fast!', '#ff6b5a', a.label + ' ' + Math.round(beat.actorScore) + '  vs  ' + Math.round(beat.holderScore) + ' ' + b.label);
          this.duelFacesMood({ winner: b });
          this.recoil(a, -dx);
        }
        this.refreshEngagementMarks();
      });
    } else {
      // close in and the blades meet
      at(380, () => {
        this.showPose(a, beat.actorStance === 'press' ? 'attack' : 'ready', dx);
        this.showPose(b, beat.holderStance === 'press' ? 'attack' : 'ready', -dx);
        this.tweens.add({ targets: a.view, x: aHome.x + dx * 0.2, y: aHome.y + dy * 0.2, duration: 110, yoyo: true, ease: 'Quad.easeIn' });
        this.tweens.add({ targets: b.view, x: bHome.x - dx * 0.2, y: bHome.y - dy * 0.2, duration: 110, yoyo: true, ease: 'Quad.easeIn' });
      });
      at(490, () => {
        clashFlash(this, mid.x, mid.y);
        screenShake(this, 0.004, 120);
        play('clash');
        this.refreshEngagementMarks(); // the momentum bar moves
      });
      at(700, () => {
        let title = 'Even';
        let color = '#e8d5a8';
        if (beat.winner) {
          const winStance = beat.winner === a ? beat.actorStance : beat.holderStance;
          const loseStance = beat.winner === a ? beat.holderStance : beat.actorStance;
          const beaten = engagementRules.beats[winStance] === loseStance;
          title = beaten ? stanceName(winStance) + ' beats ' + stanceName(loseStance) + '!' : beat.winner.name + ' wins the beat';
          color = beat.winner.side === 'hero' ? '#9fe0c8' : '#ff8a6a';
        }
        if (beat.decisive) {
          title = 'DECISIVE!';
          color = '#ffe08a';
        }
        this.banner(mid.x, headY - 70, title, color, a.label + ' ' + Math.round(beat.actorScore) + '  vs  ' + Math.round(beat.holderScore) + ' ' + b.label);
        this.duelFacesMood(beat);
        if (!beat.winner) {
          this.showPose(a, 'ready', dx);
          this.showPose(b, 'ready', -dx);
        }
      });
    }

    // signature stances: extra blows and standoff heals
    (outcome.sig || []).forEach((fx, i) => {
      at(880 + i * 260, () => {
        if (fx.kind === 'hit') {
          this.floatText(fx.from, fx.word, fx.word === 'Counter!' ? '#ffd27a' : '#ff6b5a', { rise: 46 });
          this.showImpact(fx.from, fx.to, { hit: true, damage: fx.damage, note: fx.note }, fx.to.view.x - fx.from.view.x, fx.to.hp === 0);
        } else {
          play('spell');
          this.floatText(fx.unit, 'Standoff +' + fx.amount, '#9fdc8a', { rise: 46 });
          this.updateHpBar(fx.unit);
        }
      });
    });

    // a decisive beat: the free strike, then the loser's reaction and push.
    // (No reaction when a signature blow, like a Counter!, already ended the fight.)
    if (beat.decisive && response) {
      const winner = beat.winner;
      const loser = beat.loser;
      const awayX = loser.view.x - winner.view.x;
      at(1050, () => {
        if (strike) this.showImpact(winner, loser, strike, -awayX >= 0 ? -1 : 1, false);
      });
      // the loser's reaction, once the banner has gone
      at(1500, () => {
        if (loser.alive) {
          const above = { rise: 46 }; // above the damage number from the strike
          if (response.held) this.floatText(loser, 'Held ground!', '#d9b77a', above);
          else if (response.slipped) this.floatText(loser, 'Slipped!', '#9fd4ff', above);
          else this.floatText(loser, 'Off-balance!', '#ff6b5a', above);
          if (path.length > 0) this.slideAlong(loser, path);
        }
        if (outcome.fall) this.time.delayedCall(170 * Math.max(1, path.length) + 40, () => this.showFall(loser, outcome.fall, awayX));
      });
      if (ended && loser.alive && !outcome.fall) at(1850, () => this.floatText(winner, 'Broken off', '#e8d5a8'));
    }

    const last = beat.decisive ? 2300 : beat.kind === 'break' ? 1100 : 1300;
    at(last - 380, () => {
      this.resetCamera(300);
      this.hideDuelFaces();
    });
    at(last, () => {
      for (const u of [a, b]) if (u.alive) this.faceNearestOpponent(u);
      this.refreshEngagementMarks();
      this.refreshStatusTags();
      this.endCinematic();
      if (this.checkBattleEnd()) {
        this.battleOver = true;
        this.busy = false;
        this.showResult(this.checkBattleEnd());
      }
    });
    at(last + 200, () => {
      if (!this.battleOver) onDone();
    });

    for (const [ms, fn] of steps) this.time.delayedCall(ms, fn);
  }

  // ---------- Engagements ----------

  // The player picked an enemy twice: engage it.
  confirmEngage() {
    const attacker = this.activeUnit;
    const target = this.pendingTarget;
    this.cancelMode();
    this.busy = true;
    this.performEngage(attacker, target, () => {
      this.busy = false;
      this.refreshStatus();
      // In the stance duel the opening beat is this turn's action, and a
      // locked unit cannot walk, so the turn is over
      if (isStanceDuel()) {
        this.time.delayedCall(250, () => {
          if (!this.battleOver && this.activeUnit === attacker) this.endTurn();
        });
      }
    });
  }

  // Starts an engagement. It costs the attacker's action, locks both units
  // together, and opens with a cut-in and a contest.
  performEngage(attacker, target, onDone) {
    if (isStanceDuel()) {
      // The opening beat: the one engaging drives in with Press; the other
      // answers by its class habits (an enemy) or its last stance (a hero)
      startDuel(attacker, target);
      const answer = target.side === 'enemy' ? answerStance(target, CONTEST_CTX) : target.stance || autoStance(target);
      this.duelBeat(attacker, 'press', target, answer, false, true, onDone);
      return;
    }
    attacker.hasActed = true;
    startEngagement(attacker, target);
    this.refreshButtons();
    const contest = this.runContest(attacker, target);
    this.beginCinematic();
    play('drum');
    this.cutIn(attacker, 'ENGAGE!', () => this.playContest(contest, true, onDone));
  }

  // An engaged unit spends its turn to force a new contest.
  pressEngagement(unit, onDone) {
    unit.hasActed = true;
    this.refreshButtons();
    const contest = this.runContest(unit, unit.engagedWith);
    this.playContest(contest, false, onDone);
  }

  // Works out a contest and everything that follows from it, straight away.
  // (The animation in playContest only shows what has already been decided.)
  runContest(presser, holder) {
    const result = resolveContest(presser, holder, CONTEST_CTX);
    let response = null;
    let path = [];
    let fall = null;
    let ended = false;

    if (result.loser) {
      const loser = result.loser;
      response = lossResponse(loser, CONTEST_CTX);
      if (!response.slipped) applyOffBalance(loser);
      if (!response.held) {
        const pushed = this.pushLoser(loser, result.winner, pushDistance(result));
        path = pushed.path;
        fall = pushed.fall;
      }
      // Pushed out of reach (or fell to its death): the engagement is over
      if (!loser.alive || distance(presser, holder) > 1) {
        endDuel(presser);
        ended = true;
      }
    }
    return { result, response, path, ended, fall };
  }

  // The engagement animation. It plays out what runContest decided:
  //   wind up, both lunge, the blades meet, the result, then the loser's
  //   reaction and push back. A tap anywhere speeds it up.
  playContest(contest, opening, onDone) {
    const { result, response, path, ended, fall } = contest;
    const a = result.presser;
    const b = result.holder;
    const aHome = { x: a.view.x, y: a.view.y };
    const bHome = { x: b.view.x, y: b.view.y };
    const dx = bHome.x - aHome.x;
    const dy = bHome.y - aHome.y;
    const mid = { x: (aHome.x + bHome.x) / 2, y: (aHome.y - a.centerY + bHome.y - b.centerY) / 2 };

    this.beginCinematic();
    this.focusCamera(mid.x, mid.y + 30, 1.35, 300);
    this.faceToward(a, dx, dy);
    this.faceToward(b, -dx, -dy);
    this.showPose(a, 'windup', dx);
    this.showPose(b, 'ready', -dx);

    const steps = [];
    const at = (ms, fn) => steps.push([ms, fn]);

    // Both lunge toward the middle and the blades meet
    at(300, () => {
      this.showPose(a, 'attack', dx);
      this.showPose(b, 'attack', -dx);
      this.tweens.add({ targets: a.view, x: aHome.x + dx * 0.22, y: aHome.y + dy * 0.22, duration: 120, yoyo: true, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: b.view, x: bHome.x - dx * 0.22, y: bHome.y - dy * 0.22, duration: 120, yoyo: true, ease: 'Quad.easeIn' });
    });
    at(420, () => {
      clashFlash(this, mid.x, mid.y);
      screenShake(this, 0.005, 140);
      play('clash');
    });

    // The result
    at(700, () => {
      const words = { advantage: 'Advantage!', stalemate: 'Stalemate', reversal: 'Reversal!' };
      const colors = { advantage: '#ffe08a', stalemate: '#e8d5a8', reversal: '#ff6b5a' };
      const headY = Math.min(aHome.y - a.topY, bHome.y - b.topY);
      this.banner(mid.x, headY - 70, words[result.outcome], colors[result.outcome],
        a.label + ' ' + result.pressScore + '  vs  ' + result.holdScore + ' ' + b.label);
      if (result.outcome === 'stalemate') {
        this.showPose(a, 'ready', dx);
        this.showPose(b, 'ready', -dx);
      }
    });

    // The loser's reaction and push back
    if (result.loser) {
      const loser = result.loser;
      const winner = result.winner;
      const awayX = loser.view.x - winner.view.x;
      at(1250, () => {
        play(response.held ? 'bash' : response.slipped ? 'miss' : 'hit');
        this.showPose(winner, 'attack', -awayX);
        if (response.held) {
          this.showPose(loser, 'guard', -awayX);
          this.floatText(loser, 'Held ground!', '#d9b77a');
        } else if (response.slipped) {
          this.showPose(loser, 'dodge', -awayX);
          this.floatText(loser, 'Slipped!', '#9fd4ff');
        } else {
          this.flashUnit(loser);
          this.floatText(loser, 'Off-balance!', '#ff6b5a');
        }
        if (path.length > 0) this.slideAlong(loser, path);
        else if (!response.held) this.recoil(loser, awayX);
        if (fall) this.time.delayedCall(170 * Math.max(1, path.length) + 40, () => this.showFall(loser, fall, awayX));
      });
      if (ended) at(1650, () => this.floatText(winner, 'Broken off', '#e8d5a8'));
    }

    // Back to rest
    const last = result.loser ? 2150 : 1350;
    at(last - 450, () => this.resetCamera(320));
    at(last, () => {
      for (const u of [a, b]) this.faceNearestOpponent(u);
      this.refreshEngagementMarks();
      this.refreshStatusTags();
      this.endCinematic();
    });
    at(last + 250, onDone);

    for (const [ms, fn] of steps) this.time.delayedCall(ms, fn);
  }

  // Slides a unit through a list of tiles with a little hop at each one.
  slideAlong(unit, path) {
    const tweens = path.map((tile) => {
      const { x, y } = tileToScreen(tile.col, tile.row);
      return { x, y, duration: 170, ease: 'Quad.easeOut', onStart: () => unit.view.setDepth(depthFor(tile.col, tile.row) + 1) };
    });
    this.tweens.chain({ targets: unit.view, tweens });
    this.tweens.add({ targets: unit.idleTargets, y: '-=8', duration: 85, yoyo: true, repeat: path.length - 1 });
  }

  // An engaged unit spends its turn trying to get loose.
  tryBreakAway(unit, onDone) {
    const foe = unit.engagedWith;
    unit.hasActed = true;
    this.refreshButtons();
    const attempt = breakAwayContest(unit, foe, CONTEST_CTX);
    let tile = null;
    if (attempt.success) {
      endDuel(unit);
      const isFree = (c, r) => isInsideGrid(c, r) && !this.isBlocked(c, r);
      tile = escapeTile(unit, foe, isFree);
      if (tile) {
        unit.col = tile.col;
        unit.row = tile.row;
      }
    }

    this.beginCinematic();
    const dx = foe.view.x - unit.view.x;
    this.showPose(unit, 'dodge', -dx);
    this.showPose(foe, 'attack', -dx);
    this.time.delayedCall(250, () => {
      play(attempt.success ? 'miss' : 'bash');
      if (attempt.success) {
        this.floatText(unit, 'Broke free!', '#9fd4ff');
        if (tile) this.slideAlong(unit, [tile]);
      } else {
        this.floatText(unit, 'Held fast!', '#ff6b5a');
        this.recoil(unit, -dx);
      }
    });
    this.time.delayedCall(800, () => {
      this.faceNearestOpponent(unit);
      this.faceNearestOpponent(foe);
      this.refreshEngagementMarks();
      this.refreshStatusTags();
      this.endCinematic();
    });
    this.time.delayedCall(1000, onDone);
  }

  // ---------- Spells ----------

  confirmSpell() {
    const caster = this.activeUnit;
    const target = this.pendingTarget || this.pendingTile || caster;
    const id = this.selectedSpell;
    this.cancelMode();
    this.busy = true;
    this.castSpell(caster, target, id, () => {
      this.busy = false;
      this.refreshStatus();
    });
  }

  // Casts a spell. It costs the caster's action and the spell's MP.
  // target is a unit (buff or hex), a tile (Husk), or the caster (Meditate).
  castSpell(caster, target, id, onDone) {
    const spell = spells[id];
    spendMp(caster, id);
    startCooldown(caster, id);
    caster.hasActed = true;
    if (spell.kind === 'throw') return this.castThrow(caster, target, spell, onDone);
    if (spell.kind === 'poison') return this.castPoisonArrow(caster, target, spell, onDone);
    if (spell.kind === 'toss') return this.castShieldToss(caster, target, spell, onDone);
    if (spell.kind === 'charge') return this.castIntercept(caster, target, spell, onDone);
    if (spell.kind === 'double') return this.castDoubleHit(caster, target, spell, onDone);
    if (spell.kind === 'heal') return this.castHeal(caster, target, spell, onDone);
    if (spell.kind === 'escape') return this.castHusk(caster, target, onDone);
    if (spell.kind === 'rest') return this.castMeditate(caster, spell, onDone);

    // Husk echo: the decoy nobody struck casts it too, so it works twice as well
    const echoed = caster.echoReady && this.decoys.some((d) => d.owner === caster);
    const power = echoed ? 2 : 1;
    if (echoed) caster.echoReady = false;
    if (spell.kind === 'hex') applySlow(target, id, power);
    else applyBuff(target, id, power);
    this.refreshButtons();
    if (echoed) {
      const decoy = this.decoys.find((d) => d.owner === caster);
      this.time.delayedCall(250, () => {
        lightning(this, decoy.view.x, decoy.view.y - caster.centerY, target.view.x, target.view.y - target.centerY);
        this.floatText({ view: decoy.view, topY: caster.topY }, 'Echo x2', '#c9a8ff', { pop: true });
      });
      this.time.delayedCall(650, () => this.burstDecoys(caster));
    }

    const color = Phaser.Display.Color.HexStringToColor(spell.color).color;
    // a Verse reaches out to the ally; Slow is a curse thrown with the staff
    this.showPose(caster, spell.kind === 'hex' ? 'attack' : 'cast', target.view.x - caster.view.x);
    this.time.delayedCall(250, () => {
      play('spell');
      if (spell.kind === 'hex' && slowCast(this, target.view.x, target.view.y)) {
        // the gravity effect from the Slow sheet
      } else if (!verseAura(this, target.view.x, target.view.y, id)) buffAura(this, target.view.x, target.view.y, color);
      const times = (spell.kind === 'buff' ? affinityTimes(target, id) : 1) * power;
      this.floatText(target, spell.button + (times > 1 ? ' x' + times : ''), spell.color, times > 1 ? { pop: true } : {});
      this.refreshStatusTags();
      if (spell.kind === 'buff' && !target.engagedWith) this.showStanding(target); // some units look different under a Verse
      if (spell.kind === 'hex') this.refreshTurnStrip(); // its next turn has moved back
    });
    this.time.delayedCall(800, () => this.showStanding(caster));
    this.time.delayedCall(950, onDone);
  }

  // Spear Throw: the spear flies at an enemy. A hit hurts it and knocks it
  // back a tile, away from the thrower (off a ledge, it falls). A knock that
  // carries it out of a clash breaks the clash.
  castThrow(thrower, target, spell, onDone) {
    const result = rollAttack({ ...thrower, range: spell.range }, target);
    const dx = target.view.x - thrower.view.x;
    this.faceToward(thrower, dx, target.view.y - thrower.view.y);
    this.showPose(thrower, poseFrame(thrower.id, 'throw', 'right') ? 'throw' : 'windup', dx); // the spear raised to throw
    let pushed = null;
    if (result.hit) {
      const landed = this.landHit(target, result.damage);
      result.damage = landed.damage;
      result.note = landed.note;
      target.hp = Math.max(0, target.hp - result.damage);
      if (target.hp === 0) this.defeat(target);
      else {
        pushed = this.pushLoser(target, thrower, spell.push || 1);
        if (target.engagedWith && distance(target, target.engagedWith) > 1) {
          endDuel(target);
          this.refreshEngagementMarks();
        }
      }
    }
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();
    this.time.delayedCall(220, () => {
      this.showPose(thrower, 'attack', dx);
      play('arrow');
      const a = this.centerOf(thrower);
      const b = this.centerOf(target);
      arrowShot(this, a.x, a.y, b.x, b.y, () => {
        this.showImpact(thrower, target, result, dx, target.hp === 0);
        if (pushed && pushed.path.length) {
          this.time.delayedCall(120, () => {
            this.slideAlong(target, pushed.path);
            this.time.delayedCall(170 * pushed.path.length + 60, () => this.showFall(target, pushed.fall, dx));
          });
        }
      });
    });
    this.time.delayedCall(700, () => this.showStanding(thrower));
    this.time.delayedCall(1400, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  }

  // Damage of a skill that hits for a share of a normal blow (Shield Toss, Intercept).
  skillHit(user, target, spell) {
    return Math.max(1, Math.round(getDamage(user, target) * (spell.damageShare || 1)));
  }

  // Where Intercept's charge ends: a free tile right next to the target that
  // the user can run to within the skill's range (or where it already stands).
  // Returns { col, row, path } or null.
  chargeTile(user, target, spell) {
    const blocked = (c, r) => this.isBlocked(c, r);
    const options = [{ col: user.col, row: user.row }, ...getReachableTiles(user.col, user.row, spell.range, blocked)];
    let best = null;
    for (const t of options) {
      if (distance(t, target) !== 1) continue;
      const path = t.col === user.col && t.row === user.row ? [] : getPath(user.col, user.row, t.col, t.row, spell.range, blocked);
      if (!best || path.length < best.path.length) best = { col: t.col, row: t.row, path };
    }
    return best;
  }

  // Shield Toss: the shield spins across and slams the target, which is
  // stunned for a turn if it is hit.
  castShieldToss(thrower, target, spell, onDone) {
    const hit = Math.random() * 100 < getHitChance(thrower, target);
    let damage = 0;
    let note = null;
    if (hit) {
      const landed = this.landHit(target, this.skillHit(thrower, target, spell));
      damage = landed.damage;
      note = landed.note;
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) this.defeat(target);
      else applyStun(target);
    }
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();
    const dx = target.view.x - thrower.view.x;
    this.faceToward(thrower, dx, target.view.y - thrower.view.y);
    this.showPose(thrower, 'windup', dx);
    this.time.delayedCall(260, () => {
      this.showPose(thrower, 'attack', dx);
      play('whoosh');
      const a = this.centerOf(thrower);
      const b = this.centerOf(target);
      const shield = this.add.graphics().setDepth(79).setPosition(a.x, a.y);
      shield.fillStyle(0x8a6a3c, 1).fillCircle(0, 0, 13);
      shield.lineStyle(3, 0xd9b77a, 1).strokeCircle(0, 0, 13);
      shield.fillStyle(0xd9b77a, 1).fillCircle(0, 0, 4);
      this.tweens.add({ targets: shield, angle: 720, duration: 560 });
      this.tweens.add({
        targets: shield,
        x: b.x,
        y: b.y,
        duration: 280,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.showImpact(thrower, target, { hit, damage, note }, dx, target.hp === 0);
          if (hit && target.alive) {
            this.floatText(target, 'Stunned!', '#ffe08a', { rise: 46 });
            this.refreshStatusTags();
          }
          this.tweens.add({ targets: shield, x: a.x, y: a.y, duration: 280, ease: 'Quad.easeOut', onComplete: () => shield.destroy() });
        },
      });
    });
    this.time.delayedCall(1000, () => thrower.alive && this.showStanding(thrower));
    this.time.delayedCall(1500, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  }

  // Intercept: a charge across the field, shield first. The slam always lands:
  // half damage, and the target is stunned for a turn, or knocked back if it
  // was Off-Balance. The charge uses up the rest of the unit's steps.
  castIntercept(charger, target, spell, onDone) {
    const spot = this.chargeTile(charger, target, spell);
    if (!spot) {
      onDone();
      return;
    }
    const knock = isOffBalance(target);
    charger.col = spot.col;
    charger.row = spot.row;
    charger.hasMoved = true;
    charger.stepsUsed = Infinity;
    const landed = this.landHit(target, this.skillHit(charger, target, spell));
    target.hp = Math.max(0, target.hp - landed.damage);
    let pushed = null;
    if (target.hp === 0) this.defeat(target);
    else if (knock) {
      pushed = this.pushLoser(target, charger, spell.push);
      if (target.engagedWith && distance(target, target.engagedWith) > 1) {
        endDuel(target);
        this.refreshEngagementMarks();
      }
    } else applyStun(target);
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();

    // the charge: fast steps with after-images, shield up
    play('whoosh');
    const steps = spot.path.map((tile) => {
      const p = tileToScreen(tile.col, tile.row);
      return {
        x: p.x,
        y: p.y,
        duration: 85,
        onStart: () => {
          charger.view.setDepth(depthFor(tile.col, tile.row) + 1);
          this.afterimage(charger);
          this.faceToward(charger, target.view.x - p.x, target.view.y - p.y);
          this.showPose(charger, 'guard', target.view.x - p.x);
        },
      };
    });
    const slam = () => {
      const dx = target.view.x - charger.view.x;
      this.faceToward(charger, dx, target.view.y - charger.view.y);
      this.showPose(charger, 'attack', dx);
      screenShake(this, 0.006, 160);
      this.showImpact(charger, target, { hit: true, damage: landed.damage, note: landed.note }, dx, target.hp === 0);
      if (target.alive && !knock) {
        this.floatText(target, 'Stunned!', '#ffe08a', { rise: 46 });
        this.refreshStatusTags();
      }
      if (pushed && pushed.path.length) {
        this.time.delayedCall(140, () => {
          this.floatText(target, 'Knocked back!', '#ff9a6a', { rise: 46 });
          this.slideAlong(target, pushed.path);
          this.time.delayedCall(170 * pushed.path.length + 60, () => this.showFall(target, pushed.fall, dx));
        });
      }
      this.time.delayedCall(600, () => {
        charger.view.setDepth(depthFor(charger.col, charger.row) + 1);
        if (charger.alive) this.showStanding(charger);
      });
      this.time.delayedCall(1300, () => {
        if (outcome) {
          this.busy = false;
          this.showResult(outcome);
        } else onDone();
      });
    };
    if (steps.length === 0) slam();
    else this.tweens.chain({ targets: charger.view, tweens: steps, onComplete: slam });
  }

  // Double Hit: both heads of the spear, one after the other. Each strike
  // rolls to hit on its own and does a share of a normal hit.
  castDoubleHit(user, target, spell, onDone) {
    const strikes = [];
    for (let i = 0; i < (spell.hits || 2) && target.alive; i++) {
      const hit = Math.random() * 100 < getHitChance(user, target);
      let damage = 0;
      let note = null;
      if (hit) {
        const landed = this.landHit(target, this.skillHit(user, target, spell));
        damage = landed.damage;
        note = landed.note;
        target.hp = Math.max(0, target.hp - damage);
        if (target.hp === 0) this.defeat(target);
      }
      strikes.push({ hit, damage, note, lethal: hit && target.hp === 0 });
    }
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();
    const dx = target.view.x - user.view.x;
    const dy = target.view.y - user.view.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.faceToward(user, dx, dy);
    this.floatText(user, spell.name, spell.color);
    strikes.forEach((strike, i) => {
      this.time.delayedCall(i * 420, () => {
        if (!user.view || !user.view.active) return;
        play('whoosh');
        this.showPose(user, i === 0 ? 'windup' : 'attack', dx);
        this.afterimage(user);
        const home = { x: user.view.x, y: user.view.y };
        this.tweens.add({ targets: user.view, x: home.x + (dx / dist) * 20, y: home.y + (dy / dist) * 10, duration: 90, yoyo: true, ease: 'Quad.easeIn' });
        this.time.delayedCall(100, () => this.showImpact(user, target, strike, dx, strike.lethal));
      });
    });
    const end = strikes.length * 420 + 650;
    this.time.delayedCall(end - 250, () => user.alive && this.showStanding(user));
    this.time.delayedCall(end, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  }

  // How much a Poison Arrow hurts on landing: a share of a bow shot (never the dagger).
  poisonHit(shooter, target, spell) {
    return Math.max(1, Math.round(getDamage({ ...shooter, closeWeapon: null }, target) * spell.damageShare));
  }

  // Poison Arrow, part 1: she crouches, dips an arrow and takes aim at the
  // target (AIMING over her, MARKED over it). That is her whole turn. The
  // arrow flies at the start of her next turn (see releaseAim), if the target
  // is still within reach and she is not caught in a clash.
  castPoisonArrow(shooter, target, spell, onDone) {
    shooter.aiming = { target, spellId: 'poisonArrow' };
    target.markedBy = shooter;
    shooter.hasMoved = true;
    shooter.stepsUsed = Infinity;
    this.faceToward(shooter, target.view.x - shooter.view.x, target.view.y - shooter.view.y);
    this.showStanding(shooter); // crouched, dipping the arrow
    play('select');
    this.floatText(shooter, 'Aiming', spell.color);
    this.floatText(target, 'Marked', spell.color, { rise: 30 });
    this.refreshStatusTags();
    this.refreshButtons();
    this.time.delayedCall(900, () => {
      onDone();
      if (shooter.side === 'hero' && this.activeUnit === shooter && !this.battleOver) this.endTurn();
    });
  }

  // Poison Arrow, part 2, at the start of the archer's next turn: the arrow
  // flies if it still can. Calls onDone once it has played out.
  releaseAim(shooter, onDone) {
    const { target, spellId } = shooter.aiming;
    const spell = spells[spellId];
    shooter.aiming = null;
    if (target.markedBy === shooter) target.markedBy = null;
    shooter.hasActed = true; // the shot is this turn's action (she may still move)
    this.refreshStatusTags();
    const why = !target.alive ? null : shooter.engagedWith ? 'Aim broken' : distance(shooter, target) > this.spellReach(shooter, target, spell) ? 'Out of reach' : null;
    if (!target.alive || why) {
      if (why) this.floatText(shooter, why, '#e8d5a8');
      this.showStanding(shooter);
      this.time.delayedCall(800, onDone);
      return;
    }
    this.shootPoisonArrow(shooter, target, spell, onDone);
  }

  // The arrow itself. A hit does a little damage now and poisons the target
  // for a few turns (see tickPoison).
  shootPoisonArrow(shooter, target, spell, onDone) {
    const bow = { ...shooter, closeWeapon: null };
    const hit = Math.random() * 100 < getHitChance(bow, target);
    let damage = 0;
    let note = null;
    if (hit) {
      const landed = this.landHit(target, this.poisonHit(shooter, target, spell));
      damage = landed.damage;
      note = landed.note;
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) this.defeat(target);
      else applyPoison(target, 'poisonArrow');
    }
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();
    const dx = target.view.x - shooter.view.x;
    this.faceToward(shooter, dx, target.view.y - shooter.view.y);
    this.showPose(shooter, 'poison', dx); // dipping the arrow
    play('select');
    this.time.delayedCall(380, () => {
      this.showPose(shooter, 'poisonShot', dx);
      play('arrow');
      const a = this.centerOf(shooter);
      const b = this.centerOf(target);
      arrowShot(this, a.x, a.y, b.x, b.y, () => {
        this.showImpact(bow, target, { hit, damage, note }, dx, target.hp === 0);
        if (hit && target.alive) {
          buffAura(this, target.view.x, target.view.y, 0x9fdc6a);
          this.floatText(target, 'Poisoned', '#9fdc6a', { rise: 46 });
          this.refreshStatusTags();
        }
      });
    });
    this.time.delayedCall(900, () => shooter.alive && this.showStanding(shooter));
    this.time.delayedCall(1500, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  }

  // Herbs: a little health back for the unit itself or an ally next to it.
  castHeal(healer, target, spell, onDone) {
    const amount = Math.min(spell.heal, target.maxHp - target.hp);
    target.hp += amount;
    const cured = isPoisoned(target);
    curePoison(target); // the herbs draw out poison too
    if (cured) this.time.delayedCall(350, () => this.floatText(target, 'Cured', '#9fdc6a', { rise: 46 }));
    this.refreshStatusTags();
    this.updateHpBar(target);
    this.refreshButtons();
    if (target !== healer) this.faceToward(healer, target.view.x - healer.view.x, target.view.y - healer.view.y);
    this.showPose(healer, 'heal', target.view.x - healer.view.x || 1); // the herb pouch held up
    this.time.delayedCall(800, () => healer.alive && this.showStanding(healer));
    play('spell');
    buffAura(this, target.view.x, target.view.y, Phaser.Display.Color.HexStringToColor(spell.color).color);
    this.floatText(target, '+' + amount, spell.color, { pop: true });
    if (target.lowGlow && target.hp / target.maxHp > 0.3) {
      target.lowGlow.destroy();
      target.lowGlow = null;
    }
    this.time.delayedCall(900, onDone);
  }

  // Husk: the caster leaves a decoy that looks exactly like her and slips away
  // to the chosen tile, faded and hidden. Enemies cannot see the real caster:
  // they chase and strike the decoy instead (see enemyEyes). The trick lasts
  // until the decoy is struck or until the caster's next turn.
  // It always breaks free of a clash.
  castHusk(caster, tile, onDone) {
    this.removeDecoys(caster); // one decoy at a time
    if (caster.engagedWith) {
      endDuel(caster);
      this.refreshEngagementMarks();
    }
    this.addDecoy(caster, caster.col, caster.row);
    caster.hidden = true;
    caster.col = tile.col;
    caster.row = tile.row;
    caster.hasMoved = true;
    caster.stepsUsed = Infinity; // vanishing uses up the rest of her steps
    this.refreshButtons();
    play('spell');
    this.huskSwarm(caster.view.x, caster.view.y - caster.centerY, 14);
    this.tweens.add({
      targets: caster.view,
      alpha: 0,
      duration: 160,
      onComplete: () => {
        const p = tileToScreen(tile.col, tile.row);
        caster.view.setPosition(p.x, p.y).setDepth(depthFor(tile.col, tile.row) + 1);
        this.huskSwarm(p.x, p.y - caster.centerY, 10);
        this.tweens.add({ targets: caster.view, alpha: HIDDEN_ALPHA, duration: 220 });
        this.hiddenLook(caster, true);
        this.faceNearestOpponent(caster);
        this.floatText(caster, 'Hidden', spells.husk.color);
        this.refreshStatusTags();
      },
    });
    this.time.delayedCall(800, onDone);
  }

  // A puff of dark insects, for Husk vanishing and decoys bursting.
  huskSwarm(x, y, count) {
    const swarm = this.add.particles(x, y, 'fx-dot', {
      speed: { min: 60, max: 170 },
      lifespan: 650,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x1a1410, 0x3a2a1a, 0x2a3a20],
      emitting: false,
    }).setDepth(79);
    swarm.explode(count);
    this.time.delayedCall(800, () => swarm.destroy());
  }

  // The decoy: a solid copy of the unit, ring and shadow and all, standing on
  // the tile it vanished from. It looks just like the real one.
  addDecoy(owner, col, row) {
    const p = tileToScreen(col, row);
    const pieces = [this.add.ellipse(0, 0, 46, 20, 0x000000, 0.3)];
    if (owner.sprite) {
      pieces.push(this.add.ellipse(0, 2, 62, 28).setStrokeStyle(3, owner.ringColor));
      const img = this.add.image(0, 6, owner.sprite.texture.key).setOrigin(owner.sprite.originX, 1);
      img.setScale(owner.artScale).setFlipX(owner.sprite.flipX);
      pieces.push(img);
      // it breathes like a living unit
      this.tweens.add({ targets: img, scaleY: owner.artScale * 1.035, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      pieces.push(this.add.circle(0, -UNIT_LIFT, UNIT_RADIUS, SIDE_COLORS[owner.side]).setStrokeStyle(3, 0xffffff));
    }
    // her health bar and job badge too, so nothing gives it away
    const fraction = owner.hp / owner.maxHp;
    pieces.push(this.add.rectangle(-BAR_WIDTH / 2, -owner.topY, BAR_WIDTH, 9, 0x2a1d12).setOrigin(0, 0.5));
    pieces.push(this.add.rectangle(-BAR_WIDTH / 2, -owner.topY, BAR_WIDTH * fraction, 9, fraction <= 0.35 ? 0xe05a47 : 0x6fcf7f).setOrigin(0, 0.5));
    const bx = owner.sprite ? 34 : UNIT_RADIUS - 2;
    const by = owner.sprite ? -6 : -UNIT_LIFT + UNIT_RADIUS - 2;
    pieces.push(this.add.circle(bx, by, 10, 0x1a1410).setStrokeStyle(2, 0xe8d5a8));
    pieces.push(this.add.text(bx, by, owner.badge, { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#ffe08a' }).setOrigin(0.5));
    const view = this.add.container(p.x, p.y, pieces).setDepth(depthFor(col, row) + 1);
    this.decoys.push({ owner, col, row, view });
  }

  // The decoy is struck: it bursts into the swarm, and the caster shows herself.
  // How a caster looks while Husk hides her: see-through and lit gold, as if
  // she were made of light (the look Suleiman spotted when she stood hidden in
  // the cave's beam of daylight). The light is added on top of what is behind
  // her, so she glows on any tile, not only in the beam.
  hiddenLook(unit, on) {
    const sprite = unit.sprite;
    if (!sprite || !sprite.active) return;
    if (on) {
      sprite.setBlendMode(Phaser.BlendModes.ADD).setTint(HIDDEN_GLOW);
    } else {
      sprite.setBlendMode(Phaser.BlendModes.NORMAL).clearTint();
    }
  }

  popDecoy(decoy) {
    if (!this.decoys.includes(decoy)) return;
    play('spell');
    this.huskSwarm(decoy.view.x, decoy.view.y - decoy.owner.centerY, 24);
    this.floatText({ view: decoy.view, topY: decoy.owner.topY }, 'Fooled!', spells.husk.color, { pop: true });
    this.removeDecoys(decoy.owner);
  }

  // The start of the caster's turn and her decoy is still standing: nobody
  // struck it. She shows herself, and the decoy waits to echo her next spell
  // this turn (a second bolt of Lightning, or a Verse or Slow twice as strong).
  wakeDecoy(owner) {
    const decoy = this.decoys.find((d) => d.owner === owner);
    if (!decoy) return;
    owner.hidden = false;
    this.hiddenLook(owner, false);
    owner.echoReady = true;
    decoy.woken = true;
    if (owner.view && owner.view.active) this.tweens.add({ targets: owner.view, alpha: 1, duration: 300 });
    decoy.view.list.forEach((part) => part.setTint && part.setTint(0xd8c4ff)); // a violet sheen: it is charged
    this.floatText({ view: decoy.view, topY: owner.topY }, 'Echo ready', '#c9a8ff');
    this.refreshStatusTags();
  }

  // The decoy bursts into the swarm after echoing a spell.
  burstDecoys(owner) {
    for (const decoy of this.decoys.filter((d) => d.owner === owner)) this.huskSwarm(decoy.view.x, decoy.view.y - owner.centerY, 22);
    this.removeDecoys(owner);
  }

  // The decoy vanishes (struck, after echoing a spell, or at the end of its
  // owner's next turn), and the caster is in plain sight again.
  removeDecoys(owner) {
    for (const decoy of this.decoys.filter((d) => d.owner === owner)) {
      const view = decoy.view;
      this.tweens.add({ targets: view, alpha: 0, duration: 300, onComplete: () => view.destroy() });
    }
    this.decoys = this.decoys.filter((d) => d.owner !== owner);
    owner.echoReady = false;
    if (owner.hidden) {
      owner.hidden = false;
      this.hiddenLook(owner, false);
      if (owner.view && owner.view.active && owner.alive) this.tweens.add({ targets: owner.view, alpha: 1, duration: 300 });
    }
    this.refreshStatusTags();
  }

  // The board as the enemies see it. A hidden caster is not there at all:
  // in her place stands her decoy, which they treat as the real thing.
  // Each decoy is a copy of its owner, moved to the decoy's tile and marked
  // with isDecoy, so the usual enemy logic chases it without knowing.
  enemyEyes() {
    const seen = [];
    for (const u of this.units) {
      if (!u.hidden) {
        seen.push(u);
        continue;
      }
      const decoy = this.decoys.find((d) => d.owner === u);
      if (decoy) seen.push({ ...u, col: decoy.col, row: decoy.row, isDecoy: true, decoy });
    }
    return seen;
  }

  // An enemy attacks a decoy: the usual attack, but the blow pops the decoy.
  strikeDecoy(attacker, decoy, onDone) {
    attacker.hasActed = true;
    this.refreshButtons();
    const fake = { isDecoy: true, decoy, view: { x: decoy.view.x, y: decoy.view.y }, centerY: decoy.owner.centerY };
    this.playAttack(attacker, fake, { hit: true, damage: 0 }, false);
    this.time.delayedCall(1100, onDone);
  }

  // Meditate: get MP back, but stand Exposed until the next turn. Ends the turn.
  // Meditate: she sinks into a trance. Her NEXT turn is spent meditating too
  // (she cannot act), and only then does her MP come back. She is Exposed the
  // whole time, so allies may need to guard her. (See startTurn.)
  castMeditate(caster, spell, onDone) {
    applyExposed(caster, spell.exposed);
    caster.meditating = { restore: spell.restore };
    caster.hasMoved = true;
    this.showStanding(caster); // the meditation picture, held until she wakes
    this.refreshButtons();
    play('spell');
    buffAura(this, caster.view.x, caster.view.y, Phaser.Display.Color.HexStringToColor(spell.color).color);
    this.floatText(caster, 'Meditating', spell.color);
    this.refreshStatusTags();
    this.time.delayedCall(900, () => {
      onDone();
      if (this.activeUnit === caster && !this.battleOver) this.endTurn();
    });
  }

  // ---------- Showing engagements and conditions ----------

  // The orange line between two locked units, and crossed blades above them.
  refreshEngagementMarks() {
    for (const mark of this.engageMarks) mark.destroy();
    this.engageMarks = [];

    const done = new Set();
    for (const u of this.units) {
      const v = u.engagedWith;
      if (!u.alive || !v || done.has(u)) continue;
      done.add(u);
      done.add(v);

      const ground = this.add.graphics().setDepth(Math.max(depthFor(u.col, u.row), depthFor(v.col, v.row)) + 0.6);
      ground.lineStyle(8, ENGAGE_COLOR, 0.3);
      ground.lineBetween(u.view.x, u.view.y, v.view.x, v.view.y);
      ground.lineStyle(3, 0xffd08a, 0.9);
      ground.lineBetween(u.view.x, u.view.y, v.view.x, v.view.y);

      const mx = (u.view.x + v.view.x) / 2;
      const my = Math.min(u.view.y - u.topY, v.view.y - v.topY) - 50; // above both health bars and tags
      const icon = this.add.graphics().setDepth(85);
      icon.fillStyle(0x1a1410, 0.85);
      icon.fillCircle(mx, my, 16);
      icon.lineStyle(2, ENGAGE_COLOR, 1);
      icon.strokeCircle(mx, my, 16);
      icon.lineStyle(4, 0xffe08a, 1);
      icon.lineBetween(mx - 9, my - 9, mx + 9, my + 9);
      icon.lineBetween(mx + 9, my - 9, mx - 9, my + 9);

      // In a stance duel, the momentum bar under the crossed blades: 7 pips,
      // filling from the middle toward the side that is winning, in its colour
      if (isStanceDuel() && u.engagement) {
        const max = engagementRules.momentum.max;
        const first = u.engagement.first;
        const other = first === u ? v : u;
        const track = u.engagement.track; // from "first"'s side
        const firstOnLeft = first.view.x <= other.view.x;
        const pip = 11;
        for (let i = -max; i <= max; i++) {
          const px = mx + i * (pip + 3);
          const py = my + 26;
          // pip i counts toward the left side when i < 0, the right side when i > 0
          const towardFirst = firstOnLeft ? i < 0 : i > 0;
          const filled = i !== 0 && Math.abs(i) <= Math.abs(track) && (track > 0 ? towardFirst : !towardFirst);
          const leader = track > 0 ? first : other;
          icon.fillStyle(filled ? SIDE_COLORS[leader.side] : i === 0 ? 0xe8d5a8 : 0x1a1410, filled || i === 0 ? 1 : 0.85);
          icon.fillRect(px - pip / 2, py - 4, pip, 8);
          icon.lineStyle(1, 0xe8d5a8, 0.7);
          icon.strokeRect(px - pip / 2, py - 4, pip, 8);
        }
      }

      this.engageMarks.push(ground, icon);
    }
  }

  // The small tags above every unit's health bar.
  refreshStatusTags() {
    for (const unit of this.units) {
      if (!unit.tagRow || !unit.tagRow.active) continue;
      unit.tagRow.removeAll(true);
      // Over the unit: ENGAGED is left out (the crossed blades already show it).
      // A status with a picture (like Slow) shows its icon instead of the word.
      const tags = unit.alive ? statusTags(unit).filter((t) => t.text !== 'ENGAGED') : [];
      const items = tags.map((t) => {
        if (t.icon && this.textures.exists('icon:' + t.icon)) {
          return { w: 26, make: (cx) => [this.add.image(cx, 0, 'icon:' + t.icon).setDisplaySize(26, 26)] };
        }
        const text = this.add.text(0, 0, t.text, { fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: t.color }).setOrigin(0.5);
        const w = text.width + 10;
        return { w, make: (cx) => [this.add.rectangle(cx, 0, w, 18, 0x1a1410, 0.85), text.setPosition(cx, 0)] };
      });
      let x = -items.reduce((sum, it) => sum + it.w + 4, -4) / 2;
      for (const it of items) {
        unit.tagRow.add(it.make(x + it.w / 2));
        x += it.w + 4;
      }
      // a slowed unit carries the Slow aura until the hex wears off
      const slowed = unit.alive && unit.status && unit.status.hex && unit.status.hex.id === 'slow';
      if (slowed && !unit.slowAura) unit.slowAura = slowAura(this, unit) || [];
      if (!slowed && unit.slowAura) {
        for (const o of unit.slowAura) o.destroy();
        unit.slowAura = null;
      }
    }
  }

  // A big word that pops up and fades, with a small line under it.
  banner(x, y, text, color, sub) {
    const big = this.add
      .text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '46px', fontStyle: 'bold', color, stroke: '#1a1410', strokeThickness: 7 })
      .setOrigin(0.5)
      .setDepth(88)
      .setScale(0.6);
    const small = this.add
      .text(x, y + 38, sub || '', { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#f1e6c8', stroke: '#1a1410', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(88);
    this.tweens.add({ targets: big, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [big, small], alpha: 0, delay: 480, duration: 260, onComplete: () => { big.destroy(); small.destroy(); } });
  }

  // While a cut-in or clash plays, taps speed it up instead of doing anything else.
  beginCinematic() {
    if (this.inCinematic) return;
    this.inCinematic = true;
    this.skipped = false;
  }

  skipCinematic() {
    if (!this.inCinematic || this.skipped) return;
    this.skipped = true;
    this.setSpeed('skip', 5);
  }

  // How fast the battle runs. Several things change the speed, sometimes at
  // the same moment: skipping a cut-in (5 times faster), the finishing-blow
  // slow motion, and the split-second freeze when a blow lands. Each keeps its
  // own factor, and the real speed is all of them multiplied together, so one
  // can never undo or trap another. "base" is the normal speed (1).
  setSpeed(name, factor) {
    this.speed[name] = factor;
    const total = Object.values(this.speed).reduce((a, b) => a * b, 1);
    this.tweens.timeScale = total;
    this.time.timeScale = total;
  }

  endCinematic() {
    if (!this.inCinematic) return;
    // Never hand control back with the camera still zoomed in
    const cam = this.cameras.main;
    cam.panEffect.reset();
    cam.zoomEffect.reset();
    cam.setZoom(1);
    cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.setSpeed('skip', 1);
    this.setSpeed('slowMo', 1);
    this.inCinematic = false;
    this.skipped = false;
  }

  // ---------- Camera ----------

  // Eases the battlefield camera in on a point. The interface does not move.
  focusCamera(x, y, zoom = 1.3, duration = 260) {
    const cam = this.cameras.main;
    // keep the view inside the painted backdrop
    const halfW = GAME_WIDTH / (2 * zoom);
    const halfH = GAME_HEIGHT / (2 * zoom);
    const cx = Math.min(Math.max(x, halfW), GAME_WIDTH - halfW);
    const cy = Math.min(Math.max(y, halfH), GAME_HEIGHT - halfH);
    cam.pan(cx, cy, duration, 'Sine.easeInOut', true);
    cam.zoomTo(zoom, duration, 'Sine.easeInOut', true);
  }

  // Back to the normal view of the whole board.
  resetCamera(duration = 320) {
    const cam = this.cameras.main;
    cam.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, duration, 'Sine.easeInOut', true);
    cam.zoomTo(1, duration, 'Sine.easeInOut', true, (c, progress) => {
      if (progress === 1) {
        c.setZoom(1);
        c.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      }
    });
  }

  // ---------- Cut-ins ----------

  // A band sweeps across the screen with the unit's face and a big word,
  // like "ENGAGE!" or "FINISHING BLOW". Then onDone runs.
  cutIn(unit, words, onDone) {
    play('cutin');
    const W = GAME_WIDTH;
    const cy = 560;
    const h = 176;
    const color = unit.side === 'hero' ? UI.hero : UI.enemy;
    const layer = this.add.container(W, 0).setDepth(250);

    const band = this.add.graphics();
    band.fillStyle(0x000000, 0.35);
    band.fillRect(-W, cy - h / 2 - 40, W * 3, h + 80);
    band.fillStyle(UI.ink, 0.95);
    band.fillPoints([{ x: -40, y: cy - h / 2 + 18 }, { x: W + 40, y: cy - h / 2 - 18 }, { x: W + 40, y: cy + h / 2 - 18 }, { x: -40, y: cy + h / 2 + 18 }], true);
    band.fillStyle(color, 0.9);
    band.fillPoints([{ x: -40, y: cy - h / 2 + 18 }, { x: W + 40, y: cy - h / 2 - 18 }, { x: W + 40, y: cy - h / 2 - 8 }, { x: -40, y: cy - h / 2 + 28 }], true);
    layer.add(band);
    const topWeave = this.add.tileSprite(W / 2, cy - h / 2 - 2, W + 100, 18, 'ui-woven').setAngle(-2.9);
    const bottomWeave = this.add.tileSprite(W / 2, cy + h / 2 + 2, W + 100, 18, 'ui-woven').setAngle(-2.9);
    layer.add([topWeave, bottomWeave]);

    // the face: the battle-cry picture if there is one, otherwise a big token
    const faceKey = shoutKey(unit.id);
    let face;
    if (faceKey && this.textures.exists(faceKey)) {
      face = this.add.image(-120, cy + 4, faceKey).setOrigin(0.5, 0.5);
      face.setScale(196 / face.height);
    } else {
      face = this.add.image(-120, cy, roundPortrait(this, unit, null, 128)).setDisplaySize(150, 150);
    }
    layer.add(face);

    const big = this.add.text(W - 36, cy - 26, words, textStyle(50, '#ffe08a', { fontStyle: 'bold' })).setOrigin(1, 0.5).setLetterSpacing(2);
    const name = this.add.text(W - 40, cy + 34, unit.name + '  ·  ' + unit.jobName, textStyle(24)).setOrigin(1, 0.5);
    layer.add([big, name]);
    this.ui(layer);

    this.tweens.add({ targets: layer, x: 0, duration: 180, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: face, x: 150, duration: 300, delay: 60, ease: 'Back.easeOut' });
    this.tweens.add({ targets: topWeave, tilePositionX: -200, duration: 900 });
    this.tweens.add({ targets: bottomWeave, tilePositionX: 200, duration: 900 });
    this.time.delayedCall(200, () => screenShake(this, 0.003, 120));
    this.time.delayedCall(720, () => {
      this.tweens.add({ targets: layer, x: -W, duration: 180, ease: 'Cubic.easeIn', onComplete: () => layer.destroy() });
    });
    this.time.delayedCall(840, onDone);
  }

  // ---------- Life between turns ----------

  // Every so often a unit that is waiting glances at its foes: a short
  // fighting stance, then back to standing. It keeps the board feeling alive.
  // Locked fighters never stand still: between turns they trade slow blows,
  // blocks and dodges, as if time had slowed around the clash. Purely for show:
  // nothing here changes the fight. A pair rests while one of them is taking
  // its turn, or while anything else is playing.
  startClashLife() {
    this.clashLifeOn = this.clashLifeOn !== false;
    this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        if (!this.clashLifeOn || this.busy || this.inCinematic || this.battleOver || this.rotating) return;
        const now = this.time.now;
        const done = new Set();
        for (const a of this.units) {
          const b = a.engagedWith;
          if (!b || !a.alive || !b.alive || done.has(a.engagement) || !a.sprite || !b.sprite) continue;
          done.add(a.engagement);
          const pair = a.engagement || {};
          if (a === this.activeUnit || b === this.activeUnit) continue; // their turn: they wait for your choice
          if ((pair.nextExchange || 0) > now) continue;
          pair.nextExchange = now + 1500 + Math.random() * 1300;
          if (pair.nextExchange - now < 1500) continue;
          this.clashExchange(Math.random() < 0.5 ? a : b);
        }
      },
    });
  }

  // One exchange: the striker lunges, the other blocks (sparks) or dodges.
  clashExchange(striker) {
    const foe = striker.engagedWith;
    if (!foe) return;
    const dx = foe.view.x - striker.view.x;
    const dir = dx >= 0 ? 1 : -1;
    const block = Math.random() < 0.6;
    this.showPose(striker, 'attack', dx);
    this.showPose(foe, block ? 'guard' : 'dodge', -dx);
    this.tweens.add({ targets: striker.sprite, x: dir * 12, duration: 260, yoyo: true, ease: 'Sine.easeInOut' });
    if (block) {
      this.time.delayedCall(240, () => {
        if (!foe.view.active) return;
        const mid = { x: (striker.view.x + foe.view.x) / 2, y: (striker.view.y + foe.view.y) / 2 - (striker.centerY + foe.centerY) / 2 };
        hitSpark(this, mid.x, mid.y, 0xffe08a, 6);
      });
      this.tweens.add({ targets: foe.sprite, x: dir * 4, delay: 230, duration: 120, yoyo: true });
    } else {
      this.tweens.add({ targets: foe.sprite, x: dir * 10, y: foe.sprite.y - 3, duration: 240, yoyo: true, ease: 'Sine.easeInOut' });
    }
    this.time.delayedCall(700, () => {
      for (const u of [striker, foe]) {
        if (u.alive && u.sprite && u.sprite.active) {
          u.sprite.x = 0;
          if (!this.busy && !this.inCinematic) this.showStanding(u);
        }
      }
    });
  }

  // During a clash beat, both fighters' faces slide in at the edges of the
  // screen, hero on the left and enemy on the right, and change with the
  // result: a battle cry for the winner, a pained face for the loser.
  showDuelFaces(beat) {
    this.hideDuelFaces();
    const hero = beat.actor.side === 'hero' ? beat.actor : beat.holder;
    const enemy = hero === beat.actor ? beat.holder : beat.actor;
    const make = (unit, x, from) => {
      const face = portraitMedallion(this, 0, 0, 50, unit, moodFaceKey(unit.id, 'calm', unit));
      const name = this.add.text(0, 66, unit.name, textStyle(18, '#f1e6c8', { align: 'center' })).setOrigin(0.5, 0).setStroke('#1a1410', 5);
      const box = this.ui(this.add.container(from, 640, [face, name]).setDepth(230));
      this.tweens.add({ targets: box, x, duration: 220, ease: 'Back.easeOut' });
      return { unit, box, img: face.list[1] };
    };
    this.duelFaces = [make(hero, 72, -90), make(enemy, GAME_WIDTH - 72, GAME_WIDTH + 90)];
  }

  // The result is in: each face shows how it went for that side.
  duelFacesMood(beat) {
    for (const f of this.duelFaces || []) {
      let mood = 'calm';
      if (beat.winner) mood = beat.winner === f.unit ? 'win' : 'lose';
      const key = moodFaceKey(f.unit.id, mood, f.unit);
      if (f.img && f.img.active) f.img.setTexture(roundPortrait(this, f.unit, key, 128)).setDisplaySize(100, 100);
      if (mood !== 'calm') this.tweens.add({ targets: f.box, scale: 1.12, duration: 110, yoyo: true });
    }
  }

  hideDuelFaces() {
    for (const f of this.duelFaces || []) {
      const box = f.box;
      const out = box.x < GAME_WIDTH / 2 ? -90 : GAME_WIDTH + 90;
      this.tweens.add({ targets: box, x: out, duration: 200, ease: 'Quad.easeIn', onComplete: () => box.destroy() });
    }
    this.duelFaces = [];
  }

  startIdleLife() {
    this.startClashLife();
    this.time.addEvent({
      delay: 1300,
      loop: true,
      callback: () => {
        if (!this.idleLifeOn || this.busy || this.inCinematic || this.battleOver) return;
        if (Math.random() < 0.4) return;
        const calm = this.units.filter((u) => u.alive && u.sprite && !u.engagedWith && u !== this.activeUnit);
        if (calm.length === 0) return;
        const u = calm[Math.floor(Math.random() * calm.length)];
        const foes = this.units.filter((f) => f.alive && f.side !== u.side);
        if (foes.length === 0) return;
        let near = foes[0];
        for (const f of foes) if (distance(u, f) < distance(u, near)) near = f;
        const dx = near.view.x - u.view.x;
        const look = (u.facing && u.facing.startsWith('up') ? 'up' : 'down') + (dx >= 0 ? 'Right' : 'Left');
        if (this.showFrame(u, poseFrame(u.id, 'ready', dx >= 0 ? 'right' : 'left', look))) {
          this.time.delayedCall(800, () => {
            if (u.alive && !u.engagedWith && !this.busy && !this.inCinematic && u !== this.activeUnit) this.showStanding(u);
          });
        }
      },
    });
  }

  // ---------- Highlights ----------

  // Draws colored diamonds on a list of tiles, replacing any shown before.
  // Each one sits on top of its tile, just under the units standing on it.
  // options: { alpha: how solid (0.6), keep: true to add to the squares already shown }
  showHighlights(tiles, color, options = {}) {
    if (!options.keep) this.clearHighlights();
    const alpha = options.alpha !== undefined ? options.alpha : 0.6;

    for (const tile of tiles) {
      const { x, y } = tileToScreen(tile.col, tile.row);
      const hw = TILE_WIDTH / 2 - 4;
      const hh = TILE_HEIGHT / 2 - 3;

      const diamond = this.add.graphics().setDepth(depthFor(tile.col, tile.row) + 0.5);
      diamond.fillStyle(color, alpha);
      diamond.beginPath();
      diamond.moveTo(x, y - hh);
      diamond.lineTo(x + hw, y);
      diamond.lineTo(x, y + hh);
      diamond.lineTo(x - hw, y);
      diamond.closePath();
      diamond.fillPath();

      this.highlights.push(diamond);
    }
  }

  clearHighlights() {
    for (const diamond of this.highlights) {
      this.tweens.killTweensOf(diamond); // markers bob up and down
      diamond.destroy();
    }
    this.highlights = [];
  }

  // Cancels whatever the player was choosing and refreshes the screen.
  cancelMode() {
    if (this.mode !== 'idle' && this.activeUnit && this.activeUnit.side === 'hero') play('cancel');
    this.mode = 'idle';
    this.selectedSpell = null;
    this.spellGroup = null;
    this.pendingTarget = null;
    this.pendingTile = null;
    this.approach = null;
    this.targetsInRange = [];
    this.reachableKeys.clear();
    this.clearHighlights();
    this.refreshOutlines();
    this.refreshStatus();
  }
}
