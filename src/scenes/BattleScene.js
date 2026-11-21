import { writeSave, readSave, clearSave, applySave } from '../saveGame.js';
import { endingRules, parFor, rateWin, recordBest, battleTally } from '../ending.js';
import { teamColor, figureShadows, addRim, syncRims, drawPath, boardRules } from '../boardRead.js';
import { spellTip, unitTip, buttonTip, showTip, hideTip, hoverTipStart, hoverTipEnd, TIP_HOLD_MS } from '../tooltip.js';
import { buildPlate, flashPlate, holdPlate, settlePlate, setPlateNumber, plateRules, spreadTagRows, plateMode, setPlateMode, drainChunk, clearChunk } from '../nameplate.js';
import { damageSize, turnBanner, dropTurnBanner } from '../weight.js';
import { staysOnUnit, placeLabel, laneCallout, resetCallouts } from '../callouts.js';
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRID_SIZE, TILE_WIDTH, TILE_HEIGHT, setBoardShape } from '../config.js';
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
import { getHitChance, getDamage, getTargetsInRange, inReach, rollAttack, usesCloseWeapon, holdsDagger, distance, isDistracted, chainTarget, chainDamage, setHeightLookup, heightAccuracy, hasClearShot, drenchedEffect, skyfallOn } from '../combat.js';
import terrain from '../data/terrain.json'; // height rules: accuracy, falls, pushes, line of sight
import conditions from '../data/conditions.json'; // stun, disoriented
import relayRules from '../data/relay.json'; // Relay Strike numbers
import { chooseMoveTile, chooseAfterTile, isCaster } from '../enemyAi.js';
import { smokeCloud } from '../smokeArt.js';
import { impactLayers, floorLight, lightNearby, chargeUp, energyWaves, afterglow, hitLevel, FEEL, elementOf } from '../fxLayers.js'; // the layers round every effect (roadmap 18.23)
import { planSkill, planAttack, planHusk, drawPlan } from '../preview.js'; // skills show what they will do (roadmap 18.4)
import { playKnockback } from '../knockback.js'; // every push is drawn there (roadmap 18.1)
import { buffCastFx, hasBuffLoop, hasBuffPart, buffLoopFx, weaponAuraFx, buffMoveFx, buffFuseFx, sfxHas, sfxInfo, sfxChannel, sfxBeam, sfxStrike, sandImpact, lightningStrike, verseAura, speedStreak, slowCast, slowAura, swiftAura, swiftTrail, furyAura, bulwarkAura, fxMode, setFxMode, fxSetActive, fxWatchFrameRate, goldDissolve, hasSonicArt, sonicSpear, sonicTrail, sonicRing, sonicImpact, earthBurst, fireball, flameBurst, burnAura, empowerAura, elementRise, enchantChant, enchantSigil, enchantLand, enchantAura, verseKinds, stepEffect, hitEffect, raiseSpike, crumbleSpike, elementOrb, elementHold, clashSparks, clashRing, decisiveBurst, fxEmitter } from '../spellArt.js';
import { hasClashGif, loadClashGifs, pickClashGif, playClashGif } from '../clashGif.js'; // Gaha against the Bull Commander: his clash GIFs (6.62)
import { takeHit, afterBeat, pushResist, pushExtra, autoPick, holdingSignature, riposteStep } from '../signature.js';
import { startStep } from '../story.js';
import { buildUnit } from '../jobs.js';
import { kingMethods, KING_KINDS, KING_SELF_KINDS } from '../kingsScene.js'; // the two kings' moves and AI (Phase 10)
import { feedMask, forkSecond, gripBonus, gripAttackName, KING_RULES } from '../kings.js';
import { hasArt, artHeight, standingFrame, standingKeys, poseFrame, moveFrames, walkFrames, walkStyle, clashArt, textureKey, hasPaintedAura, portraitKey, shoutKey, moodFaceKey, ALERT_RANGE, HURT_FACE_AT, setLookLookup, setBuffLookup, setElementLookup, artHasLook, artHasWeak } from '../art.js';
import { codeStep, sandStep, settle, dropWalk } from '../codeWalk.js';
import { drawUnitCard, drawSkillPanel, CARD, CARD_ROOMY, SKILL_PANEL, goldDiamond, emblemFor, framePanel, diamondPortrait, tileBlock } from '../battleCard.js';
import { createHudTextures, bronzePanel, CommandButton, MenuRow, darkPanel, portraitMedallion, roundPortrait, drawIcon, textStyle, UI, hasUiArt, ringPortrait, medalPortrait, iconImage } from '../hud.js';
import { createAtmosphere } from '../atmosphere.js';
import { uiScaleFor, isPhone } from '../layout.js';
import { skillElement } from '../skillIcons.js';
import { DomHud, domHudWanted } from '../domHud.js'; // the HUD in HTML over the canvas, sharp on every screen (18.44)
import clashData from '../data/clashBanner.json';
import { play, startBattleMusic, stopMusic, isMuted, setMuted } from '../audio.js';
import { installLighting } from '../lighting.js';
import { createBoardTextures, drawTileBlock, drawUnderside, drawBackdrop, drawScenery, drawCavern, drawSite, prepareLights, setBoardSetting, terrainAt, groundName, groundColors } from '../boardArt.js';
import { slashArc, hitSpark, dustPuff, dustRing, splash, arrowShot, screenShake, lightning, buffAura, clashFlash, heavySlash, impactBurst, groundRing, emberBurst, lightColumn, shockRing } from '../effects.js';
import {
  isMelee,
  canBeCaught,
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
  breakChance,
  openingHeightBonus,
} from '../engagement.js';
import { ITEMS, heldItems, giveItem, itemHelps, applyItem, enemyItemChoice, enemyAllyItemChoice } from '../items.js';
import { applyOffBalance, clearOffBalance, isOffBalance, applyBuff, buffOf, hexOf, tickBuff, statusTags, statMod, moveOf, applySlow, applyExposed, clearExposed, canAfford, usesLeft, spendMp, restoreMp, affinityTimes, startCooldown, cooldownOf, applyPoison, isPoisoned, curePoison, tickPoison, applyStun, isStunned, clearStun, applyDisoriented, isDisoriented, hexChance, setDominionLookup, applyBlinded, isBlinded, activeMove, mpShown, moveRules, settleRooted, isRooted, clearRooted, rootedShare, applyBurn, cureBurn, tickBurn, tickRenewal, isBurning, hasOwnMp, verseMovesOf, applyDrenched, isDrenched, dryOff, applyEnchant, isEnchanted, spendElement } from '../status.js';
import unitData from '../data/units.json'; // the list of units lives in its own file
import jobs from '../data/jobs.json';       // the numbers for each job
import { testMode, setTestMode, fieldedEntries } from '../lineup.js';
import { queueBattleArt, fighterIds, showLoadBar } from '../battleLoad.js';
import { pauseBackgroundDownload } from '../prefetch.js';
import { artUrl } from '../artUrl.js';
import cavernMap from '../data/maps/cavern.json'; // Suleiman's Hidden Cavern (Phase 11)
import yobaMap from '../data/maps/yoba.json';     // the first cave map (kept for the rule tests)
// The maps a battle can be fought on. A battle in story.json can name one
// ("map": "cavern"); the game uses the Hidden Cavern otherwise.
const MAPS = { cavern: cavernMap, yoba: yobaMap };
let mapData = cavernMap; // the map of the battle being played (set in create)
import clashMeterData from '../data/clashMeter.json'; // his clash meter's slots (roadmap 8.21)
import spells from '../data/spells.json';   // the Sage's spells

// Says when a spell can be used, from its "use" tag in spells.json.
function useText(spell) {
  if (spell.use === 'enemy' || spell.use === 'ally' || spell.use === 'area') return spell.cooldown ? 'ready again after ' + spell.cooldown + ' turns' : 'a skill';
  if (spell.use === 'both') return 'works in a clash too';
  if (spell.use === 'engagement') return 'only in a clash';
  return 'not during a clash';
}

// One color for each side
const SIDE_COLORS = { hero: 0x3fa7a0, enemy: 0xb5523b };
const GOLD = 0xffe08a;
const SANDY = new Set(['sand', 'dust', 'cracked', 'caveSand', 'floor', 'rubble', 'rock']); // ground a heavy hit throws sand up from (6.37)
const SPIKE_LEVELS = 3;  // an Earth Drive spike counts as a block this many levels tall, for arrows (roadmap 4.2)
// The modes in which the player is picking a target on the board: the
// command menu gets out of the way then (roadmap 8.9).
const TARGET_MODES = ['attack', 'engage', 'spellTarget', 'huskTile', 'approach', 'itemTarget'];

const BAR_WIDTH = 48;    // width of a unit's health bar, in pixels
const UNIT_RADIUS = 22;  // size of a unit's circle
const UNIT_LIFT = 26;    // how far above its tile the circle floats, so it looks like it stands on it
const HIT_RADIUS = 26;   // how close a tap must be to a unit's circle to count as tapping that unit (a little bigger than the circle)
const ENGAGE_COLOR = 0xff9a2e; // orange: engagements
// A caster hidden by Husk is drawn as light (see hiddenLook): this strong
// (1 = full) and this warm gold. Light adds to what is behind her, so the
// floor always shows through.
const ENEMY_FAST = 2;        // how many times faster an enemy turn plays when the player picks Fast (18.11)
const ENEMY_THINK_MS = 400; // the pause before an enemy acts
const PACE_KEY = 'fabien.enemyPace';
const READ_NAMES = { fire: 'Fire', water: 'Water', earth: 'Earth', storm: 'Storm' }; // Kofi's four elements (6.38)
const CHANNEL_MS = 280; // how long a caster channels a plain spell attack before casting (13.10)
const DOUBLE_WINDUP_MS = 110; // the lean before each of Rabdul's two strikes (18.29)
const SHIELD_FACINGS = ['upLeft', 'upRight', 'downLeft', 'downRight']; // the order of the bull's four flaming shield pictures (18.31)
const WINDUP_LEAN_DEG = 6; // how far a melee fighter leans back in the wind-up before the blow, when it has no drawn wind-up (18.29)
const HIDDEN_ALPHA = 0.6;
const HIDDEN_ALPHA_FOE = 0.3; // a hidden enemy: only a faint shape (roadmap 1.47)
const HIDDEN_GREY = 0x8f9bb0;
const HIDDEN_GLOW = 0xffc46a;
const STYLE_NAMES = { overpower: 'Overpower', defence: 'Defence', evasion: 'Evasion' };

// The helpers the engagement rules use: real dice, and the real tile heights
const CONTEST_CTX = { random: (...a) => Math.random(...a), heightOf: (col, row) => getHeight(col, row) };

// A Phaser "scene" is one screen of the game. This one is the battle screen.
// The menu's dragged spot (8.16), kept on the device as fractions of the screen so it fits any
// size. No storage (private window): it simply starts at home.
const MENU_PIN_KEY = 'fabien.menuPin';
function loadMenuPin() {
  try {
    const p = JSON.parse(window.localStorage.getItem(MENU_PIN_KEY) || 'null');
    return p && Number.isFinite(p.fx) && Number.isFinite(p.fy) ? { fx: p.fx, fy: p.fy } : null;
  } catch (e) { return null; }
}
function saveMenuPin(pin) {
  try {
    if (pin) window.localStorage.setItem(MENU_PIN_KEY, JSON.stringify(pin));
    else window.localStorage.removeItem(MENU_PIN_KEY);
  } catch (e) { /* not remembered, still works */ }
}

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  // Phaser calls init() first. story.js tells us which step of the story this
  // battle is, so we know where to go when it is won.
  // (null means the battle was started on its own, outside the story.)
  init(data) {
    this.stepIndex = data && data.stepIndex !== undefined ? data.stepIndex : null;
    // which map: the battle's own (story.json), else the Hidden Cavern; the
    // test scripts can ask for another one (window.__mapName)
    const asked = (data && data.map) || (typeof window !== 'undefined' && window.__mapName) || 'cavern';
    this.mapName = MAPS[asked] ? asked : 'cavern';
    this.resumeAsked = !!(data && data.resume); // "Continue the battle" on the title screen (M16)
    // the line-up picked on the character select (18.30): { hero: [ids], enemy: [ids] }, or null for the map's own
    this.chosenLineUp = data && data.lineUp ? data.lineUp : null;
  }

  // Phaser calls preload() before create(): the pictures of the fighters picked plus the board,
  // effects and HUD pictures load here, with a loading bar (18.47, src/battleLoad.js).
  preload() {
    pauseBackgroundDownload(); // the loader takes over from the quiet download (18.48)
    const asked = this.mapName;
    queueBattleArt(this, fighterIds(MAPS[asked], this.chosenLineUp));
    showLoadBar(this);
  }

  // Phaser calls create() once, when the scene starts.
  create() {
    // Two cameras. The main one films the battlefield and can zoom, pan and
    // shake. The UI camera films only the interface, which always stays still.
    // Every new object is hidden from the UI camera unless this.ui() marks it.
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.events.on('addedtoscene', (go) => {
      go.cameraFilter |= this.uiCam.id;
    });
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.uiCam.fadeIn(500, 0, 0, 0);

    mapData = MAPS[this.mapName];
    setBoardShape(mapData.board);    // how many tiles, and how big (each map has its own)
    setTileHeights(mapData.heights); // tell grid.js how high each tile is
    // and the attack rules, for shooting from high ground. A spike of Tayo's
    // Earth Drive counts as a tall block there, so it stops arrows (roadmap 4.2).
    setHeightLookup((c, r) => getHeight(c, r) + (this.spikeAt(c, r) ? SPIKE_LEVELS : 0));
    // a unit under Rabdul's Enchant shows its flaming weapon (art.json "enchanted", roadmap 4.1)
    setLookLookup((id) => {
      const u = this.units && this.units.find((x) => x.id === id);
      return u && u.alive && isEnchanted(u) ? 'enchanted' : null;
    });
    // Kofi's casting pictures follow the element he reads (art.json "elementPoses", roadmap 6.38)
    setElementLookup((id) => {
      const u = this.units && this.units.find((x) => x.id === id);
      return u && u.alive && u.reading ? this.reading(u).element : null;
    });
    // a unit under a Verse can have its own attack, guard and dodge pictures (art.json "buffPoses")
    setBuffLookup((id) => {
      const u = this.units && this.units.find((x) => x.id === id);
      if (u && u.alive && u.channel) return 'masked'; // Gadara with the mask on, Singularity charging (Phase 10)
      if (u && u.alive && u.grip === 'blade') return 'blade'; // Gadara holding the blade end: its own strike pictures
      const b = u && u.alive ? buffOf(u) : null;
      return b ? b.id : (u && u.alive && u.fury > 0 ? 'bloodied' : null); // Bloodied Press stacks have their own look
    });
    // Gadara's Dominion (Phase 10): a foe's buff within 2 tiles of him is a step weaker
    setDominionLookup((u) => !!(this.units && u && u.side && this.units.some((g) => g.alive && g.dominion && g.side !== u.side && distance(g, u) <= KING_RULES.gadara.dominion.radius)));
    // The battle's speed factors (see setSpeed). A restarted battle starts at normal speed.
    this.speed = { base: 1, skip: 1, hitStop: 1, slowMo: 1 };
    this.inHitStop = false;
    this.inCinematic = false;
    this.setSpeed('base', 1);
    this.enemyFast = false;
    try { this.enemyFast = window.localStorage.getItem(PACE_KEY) === 'fast'; } catch (e) { /* no storage: normal speed */ }

    setBoardSetting(mapData.setting); // "cave" or "wasteland" (see map.json)
    createBoardTextures(this); // paint the ground textures once
    this.computeLayout();      // the screen's shape: where the frame goes and where the board camera sits (Phase 8)
    this.redrawBackdrop();     // the cave's darkness, or the sky, as wide as the screen sees
    createAtmosphere(this, mapData.setting); // light and dust in a cave; clouds, sun, sand and embers outside
    this.fitVignette();
    this.goHome();             // the board camera fits the board into the free space
    setRotation(0);            // a new battle starts with the camera on its first side
    this.rotating = false;
    // Things to dig up (roadmap 5.3): the map's buried pots and bones, plus the
    // satchels fallen units leave. boardArt draws them; a pot blocks its tile until dug.
    this.sites = (mapData.digsites || []).map((d) => ({ col: d.col, row: d.row, prop: d.prop, items: [d.item], blocking: true, dug: false, sprite: null }));
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
    this.resultShown = false;       // the result panel is not up (1.76: it stayed true after Play again, so the HTML HUD stayed hidden)
    this.turnCount = 0;            // how many turns have been played
    this.damageTaken = {}; // damage each fighter has taken, by id (the result screen, M12)
    resetCallouts(this); // the callout lane and the words over heads start empty (M6)
    this.lastEnemyClashTurn = undefined; // the turn an enemy last started a clash (the side-wide wait, 18.15)
    this.relayQueue = null;         // pushes made by the skill being cast, for Relay Strike (see collectRelays)
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
    this.decoys = [];
    this.smokes = [];               // Smoke Bomb clouds standing on tiles until their thrower's next turn (13.26)
    this.spikes = [];               // Tayo's Earth Drive spikes standing as walls (see castEarthDrive)               // Husk decoys (see addDecoy)
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
    this.autoMove = true;           // roadmap 8.5: on your turn the blue tiles show at once; tap one to walk
    this.idleLifeOn = true;         // units glance around between turns
    this.resultButtons = [];

    // Build every unit from the list in src/data/units.json.
    // buildUnit fills in each unit's numbers from its job (see jobs.js).
    // (a unit with "bench": true in units.json sits this battle out)
    // (the map says where each unit starts: "starts" in its file)
    // A character the map has no start tile for (one added later, 18.30) stands on a free tile on its own side:
    // the nearest free tile to its side's start tiles, so it lines up with its team.
    const taken = new Set(Object.values(mapData.starts || {}).map((t) => t[0] + ',' + t[1]));
    const startAt = (entry) => {
      const home = unitData.find((u) => u.id === entry.id);
      const swapped = home && home.side !== entry.side; // (moved to the other side, by the select or a balance run: no start tile of its own there)
      const at = !swapped && mapData.starts && mapData.starts[entry.id];
      if (at) return { ...entry, col: at[0], row: at[1] };
      const mine = unitData.filter((u) => u.side === entry.side && mapData.starts && mapData.starts[u.id]).map((u) => mapData.starts[u.id]);
      if (!mine.length) return entry;
      let best = null, bestD = Infinity;
      for (let c = 0; c < GRID_SIZE; c++) for (let r = 0; r < GRID_SIZE; r++) {
        if (taken.has(c + ',' + r) || (mapData.digsites || []).some((d) => d.col === c && d.row === r)) continue; // (units are not built yet: start tiles and pots are what blocks)
        const d = Math.min(...mine.map((t) => Math.abs(t[0] - c) + Math.abs(t[1] - r)));
        if (d < bestD) { bestD = d; best = [c, r]; }
      }
      if (!best) return entry;
      taken.add(best[0] + ',' + best[1]);
      return { ...entry, col: best[0], row: best[1] };
    };
    // (who fights: the character select's line-up, else the map's own team; lineup.js fieldedEntries,
    // which the loader reads too, so only these fighters' pictures were fetched, 18.47)
    this.lineUp = { alsoFighting: mapData.alsoFighting || [], sittingOut: mapData.sittingOut || [] };
    this.units = fieldedEntries(mapData, this.chosenLineUp).map((entry) => this.createUnit(buildUnit(startAt(entry), jobs)));
    for (const u of this.units) if (u.grip) u.attackName = gripAttackName(u); // Gadara: Fork Strike or Blade Strike

    installLighting(this); // only with ?light in the address (roadmap 1.38)
    createHudTextures(this);
    this.buildHud();
    this.loadClashArt(); // his clash banners, in the background (roadmap 8.15)
    // A small gold diamond floats over the unit whose turn it is (roadmap 8.4)
    this.activeMarker = this.add.graphics().setDepth(77);
    // 20 Nov polish (his mock-up): a small gold arrow pointing down at the fighter whose turn it is (it was a diamond)
    const ARROW = [{ x: -7, y: -6 }, { x: 7, y: -6 }, { x: 0, y: 7 }];
    this.activeMarker.fillStyle(GOLD, 1).fillPoints(ARROW, true);
    this.activeMarker.lineStyle(1.5, 0x2a1a0c, 0.9).strokePoints(ARROW, true);
    this.markerBob = { v: 0 };
    this.tweens.add({ targets: this.markerBob, v: 1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // The phone was turned or the window resized (layout.js): lay everything out again
    const onLayout = () => this.relayout();
    this.events.on('layout', onLayout);
    this.events.once('shutdown', () => this.events.off('layout', onLayout));

    // Listen for every tap (phone) or click (computer) on the game.
    // "currentlyOver" lists the buttons under the finger. If there is one,
    // the button handles the tap, so we skip it here.
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      hideTip(this); // any new press puts the last tooltip away
      dropTurnBanner(this); // and the turn banner (M9)
      this.startUnitHold(pointer, currentlyOver);
      // During a cut-in or clash, any tap speeds it up
      if (this.inCinematic) {
        this.skipCinematic();
        return;
      }
      if (currentlyOver.length > 0) return;
      // a map whose camera follows: the tap happens when the finger lifts (it may be a drag)
      if (this.follow) {
        this.boardDown(pointer);
        return;
      }
      // where the finger is on the battlefield, allowing for any camera zoom or pan
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const { col, row } = this.tileAtPoint(world.x, world.y);
      this.handleTap(col, row);
    });
    // dragging, pinching and the mouse wheel (roadmap 11.5)
    this.input.addPointer(1); // two fingers at once, for the pinch
    this.input.on('pointermove', (pointer) => this.follow && this.boardMove(pointer));
    this.input.on('pointerup', (pointer) => this.follow && this.boardUp(pointer));
    this.input.on('pointermove', (pointer) => { if (this.unitHold && Math.hypot(pointer.x - this.unitHold.x, pointer.y - this.unitHold.y) > 10) this.stopUnitHold(); });
    this.input.on('pointerup', () => this.stopUnitHold());
    this.events.once('shutdown', () => { this.stopUnitHold(); hideTip(this); });
    this.input.on('wheel', (pointer, over, dx, dy) => {
      if (this.follow) this.zoomAt(pointer.x, pointer.y, this.cameras.main.zoom * Math.pow(1.0015, -dy));
    });

    // On a wide computer screen there are dark margins to the left and right
    // of the game. Those clicks land on the web page, not on the game, so
    // Phaser reports them with this separate event. We treat them as a tap
    // far outside the board, which cancels the current choice.
    this.input.on('pointerdownoutside', () => {
      this.handleTap(-1, -1);
    });
    // dragging the menu by its grip (roadmap 8.16)
    // Where the player last dragged it is remembered on the device (15 Nov).
    this.menuPin = loadMenuPin();
    this.menuDrag = null;
    this.input.on('pointermove', (pointer) => this.dragMenu(pointer));
    this.input.on('pointerup', () => this.dropMenu());

    this.events.once('shutdown', () => stopMusic());
    startBattleMusic();
    this.startIdleLife();

    // Start the battle: work out who goes first. Coming back to a saved battle (M16), the
    // fighters first get their saved numbers back, then the turn that was being played starts again.
    if (this.resumeAsked) this.resumeBattle();
    this.startTurn();
  }

  // A finger held still on a fighter for half a second: a tooltip lists its statuses and
  // what each does (roadmap 13.49). The press then does not count as a tap.
  startUnitHold(pointer, currentlyOver) {
    this.stopUnitHold();
    if (this.inCinematic || this.battleOver || (currentlyOver && currentlyOver.length > 0)) return;
    const hold = { x: pointer.x, y: pointer.y };
    hold.timer = setTimeout(() => {
      this.unitHold = null;
      if (this.inCinematic || this.battleOver) return;
      const world = this.cameras.main.getWorldPoint(hold.x, hold.y);
      const { col, row } = this.tileAtPoint(world.x, world.y);
      const unit = this.getUnitAt(col, row);
      if (!unit || !unit.alive || (unit.hidden && unit.side !== 'hero')) return;
      if (this.press) this.press.moved = true; // not a tap any more
      flashPlate(this, unit, plateRules.tapMs);
      showTip(this, unitTip(unit), hold.x, hold.y);
    }, TIP_HOLD_MS);
    this.unitHold = hold;
  }

  stopUnitHold() {
    if (this.unitHold) clearTimeout(this.unitHold.timer);
    this.unitHold = null;
  }

  // Marks an interface object (and everything inside it) as part of the UI:
  // filmed by the still UI camera, not by the moving battlefield camera.
  ui(go) {
    const mark = (o) => {
      o.cameraFilter = this.cameras.main.id;
      if (o.list) o.list.forEach(mark);
    };
    mark(go);
    // Drawn by the HTML overlay instead (18.44, src/domHud.js): seen by no camera, so it is not
    // drawn on the canvas and real taps pass it by. It still exists: the game and the tests read it.
    if (go.domHidden && this.domHud) go.cameraFilter = this.cameras.main.id | this.uiCam.id;
    return go;
  }

  // ---------- The interface ----------

  // The sizes of the frame for the screen as it is now (roadmap 8.1, 8.2):
  // how big the interface is drawn (s), the margin (m), the card and info
  // widths, and where the board camera sits so the whole board fits in the
  // space the frame leaves free (this.home).
  computeLayout() {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = uiScaleFor(this);
    const portrait = H > W;
    // "real" is how many real screen pixels one game pixel takes here (M7). No button is lower than
    // 44 real pixels (minTap). Since the second pass of the UI rework (16 Nov, Baiyee: "match his
    // mock-ups closely") the text is small and elegant like his: 11 real pixels at least (minText).
    const real = this.scale.displaySize.width / W || 1;
    const minText = Math.ceil((portrait ? 10 : 11.5) / real);
    const minTap = Math.ceil(44 / real);
    // px: game pixels per design pixel. The new panels are drawn in design pixels: real screen
    // pixels on a phone, a fifth bigger on a wide screen. F: the letter sizes (11, 12, 13.5, 15).
    // 18.44 (20 Nov, Baiyee: "blurry and tiny on desktop"): sizes are a share of the screen. On a wide
    // screen the unit card is 25 percent of the width and everything else grows with it (body text 16 to
    // 19 real pixels on a laptop or a 1440 x 900 screen); on an upright phone a design pixel is 1.1 real
    // pixels (body text 13), and the board keeps over three quarters of the height.
    // 20 Nov, polish pass (Baiyee, from Suleiman's mock-ups): the whole HUD at 55 to 60 percent of what it was
    // (HUD_K: 0.64 on an upright phone, 0.58 on a wide screen), so the board has the screen. Panels shrink by that;
    // the LETTERS do not shrink with them: they stop at a floor, 10.5 real pixels on a phone, 11.5 on a desktop.
    const HUD_K = portrait ? 0.64 : 0.58;
    const f = (css) => Math.round(css / real); // real (page) pixels to game pixels
    const pxK = portrait ? HUD_K / real : HUD_K * Math.max(1 / real, (W * 0.25) / CARD_ROOMY.w);
    // the letters: a floor in real pixels (the panels were drawn for 12 design pixels of small text)
    const F = portrait
      ? { small: f(10.5), mid: f(11), name: f(13), big: f(15.5) }
      : { small: Math.max(f(11.5), Math.round(12 * pxK)), mid: Math.max(f(12.5), Math.round(13.5 * pxK)), name: Math.max(f(15), Math.round(16 * pxK)), big: Math.max(f(18), Math.round(19 * pxK)) };
    // A panel cannot shrink below what its words need: a design pixel is the bigger of the 55 to 60 percent one and
    // 0.9 of what the small text asks for (the panels are tightened to match, so they stay slim)
    const px = Math.max(pxK, 0.9 * F.small / 12);
    const m = Math.round(6 * px);
    const cardW = Math.round((portrait ? CARD : CARD_ROOMY).w * px);
    const skillW = Math.round((portrait ? SKILL_PANEL.w : 220) * px); // (18.44: on a wide screen about as wide as the card)
    const menuW = Math.round(150 * px);
    const infoW = Math.round(portrait ? W - 2 * m : Math.min(420 * px, W - cardW - skillW - 4 * m));
    this.lay = { W, H, s, m, portrait, cardW, infoW, real, px, F, minText, minTap, rowH: Math.round((portrait ? 28 : 26) * px), menuW, skillW, top: 0, bottom: H };
    // The board's corners leave the screen's corners free, which is where the
    // frame goes; in portrait the cards sit under the board instead.
    const b = this.boardBounds();
    // the top bar (his mock-up): the title, then the turn strip of round faces, a thin line under it
    const titleSize = F.small;
    const stripR = Math.round((portrait ? 19 : 22) * px); // the medal of the one acting (18.44: bigger, as his)
    this.lay.titleSize = titleSize;
    this.lay.stripR = stripR;
    this.lay.stripY = m + Math.round(18 * px) + Math.round(4 * px) + stripR;
    const top = portrait ? this.lay.stripY + stripR + Math.round(4 * px) : m;
    const bottom = portrait ? H - this.cardMetrics().slimH - m - Math.round(3 * px) : H - m; // above the card
    // (the floor was 0.7; the 11 by 11 cavern, roadmap 14.2, needs about 0.56 to show whole on an upright phone)
    const zoom = Math.max(0.5, Math.min(1.6, (W - 2 * m) / (b.x1 - b.x0), (bottom - top) / (b.y1 - b.y0)));
    this.lay.top = top;       // the board's free space on the screen: under the turn strip...
    this.lay.bottom = bottom; // ...and above the cards (the follow camera centres in it, roadmap 17.1)
    const freeY = (top + bottom) / 2;
    this.home = { zoom, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 - (freeY - H / 2) / zoom };
    // The camera that follows (roadmap 11.5, maps with "camera": "follow"):
    // when the whole board would leave its tiles too small to read on this
    // screen, the battle is played zoomed in on the unit whose turn it is.
    // A tile is then at least MIN_TILE real screen pixels wide.
    const shown = this.scale.displaySize.width / W || 1; // real screen pixels per game pixel
    // On an upright phone the figures were too small to read at 70 (about 45 pixels tall), and a third
    // of the screen was empty rock, so the view sits closer there (roadmap 17.1). Pinch or the little map still pull back.
    // On a wide screen the 9 by 9 board showed whole with tiles about 130 real pixels wide (fighters 99 to 127
    // pixels tall, checklist E1). The 11 by 11 cavern (roadmap 14.2) would shrink them to fit, so a wide
    // screen keeps that tile size and follows the unit too; the wheel or the little map shows the whole board.
    const MIN_TILE = portrait ? 104 : 130; // (20 Nov polish: on a phone the camera sits a little closer, 104 was 88, now the HUD takes less room)
    this.follow = mapData.camera === 'follow';
    const want = MIN_TILE / (TILE_WIDTH * shown);
    this.playZoom = this.follow ? Math.min(2.2, Math.max(zoom, want)) : zoom;
    this.zoomRange = [zoom, Math.max(this.playZoom * 1.5, zoom * 1.6)];
    if (!this.follow || !this.rest) this.rest = { ...this.home, zoom: this.playZoom };
    else this.rest.zoom = Math.min(Math.max(this.rest.zoom, this.zoomRange[0]), this.zoomRange[1]);
  }

  // Keeps a camera centre (x, y) at this zoom over the board: the view may
  // not wander off it (it shows a little past the edges, so the corners can
  // come out from under the cards). Returns the centre to use.
  clampView(x, y, zoom) {
    const b = this.boardBounds();
    const pad = 150;
    const { W, H, top, bottom } = this.lay;
    const halfW = W / (2 * zoom);
    // Up and down, the view that counts is the free space between the turn strip and the cards
    // (roadmap 17.1): "up" and "down" are how far that space reaches above and below the camera's centre.
    const up = (H / 2 - top) / zoom;
    const down = (bottom - H / 2) / zoom;
    const padY = Math.min(pad, 24 / zoom); // little spare rock above and below: the cards and the strip already frame the board
    const fit = (v, lo, hi, before, after) => (hi - lo <= before + after ? (lo + hi) / 2 + (before - after) / 2 : Math.min(Math.max(v, lo + before), hi - after));
    return { x: fit(x, b.x0 - pad, b.x1 + pad, halfW, halfW), y: fit(y, b.y0 - padY, b.y1 + padY, up, down) };
  }

  // How far the camera's centre sits below a point that should show in the middle of the free
  // space (the cards take more room at the bottom than the turn strip does at the top).
  freeShift(zoom) {
    return (this.lay.H / 2 - (this.lay.top + this.lay.bottom) / 2) / zoom;
  }

  // The camera turns to the unit whose turn it is (or a unit that has just
  // moved out of view). A view the player has dragged or pinched stays put
  // until the next turn begins.
  followUnit(unit, duration = 380, force = false) {
    if (!this.follow || !unit || !unit.view || (this.manualView && !force)) return;
    const zoom = this.rest.zoom;
    const c = this.clampView(unit.view.x, unit.view.y - unit.centerY * 0.5 + this.freeShift(zoom), zoom);
    this.rest = { zoom, x: c.x, y: c.y };
    if (this.inCinematic) return;
    const cam = this.cameras.main;
    cam.pan(c.x, c.y, duration, 'Sine.easeInOut', true);
    if (Math.abs(cam.zoom - zoom) > 0.001) cam.zoomTo(zoom, duration, 'Sine.easeInOut', true);
  }

  // After a unit moves: if it has walked to the edge of the view, follow it.
  keepInView(unit) {
    if (!this.follow || this.manualView || !unit || !unit.view) return;
    const v = this.cameras.main.worldView;
    const x = unit.view.x;
    const y = unit.view.y - unit.centerY;
    const inside = x > v.x + v.width * 0.18 && x < v.right - v.width * 0.18 && y > v.y + v.height * 0.18 && y < v.bottom - v.height * 0.25;
    if (!inside) this.followUnit(unit, 300);
  }

  // ---------- Looking around: drag, pinch, mouse wheel (roadmap 11.5) ----------

  // A finger (or the mouse) goes down on the board. On a map whose camera
  // follows, nothing happens yet: it might be the start of a drag. Two
  // fingers start a pinch.
  boardDown(pointer) {
    const cam = this.cameras.main;
    if (this.press && this.press.id !== pointer.id) {
      // a second finger: pinch to zoom
      const a = this.press;
      this.pinch = { a: a.id, b: pointer.id, dist: Math.hypot(pointer.x - a.cx, pointer.y - a.cy) || 1, zoom: cam.zoom };
      a.moved = true;
      return;
    }
    this.press = { id: pointer.id, x: pointer.x, y: pointer.y, cx: pointer.x, cy: pointer.y, sx: cam.scrollX, sy: cam.scrollY, moved: false };
  }

  // The finger moves: drag the view, or pinch it closer or further.
  boardMove(pointer) {
    const p = this.press;
    if (!p || this.menuDrag || this.inCinematic) return;
    const cam = this.cameras.main;
    if (this.pinch) {
      const other = this.input.manager.pointers.find((q) => q.id === (pointer.id === this.pinch.a ? this.pinch.b : this.pinch.a));
      if (pointer.id === p.id) { p.cx = pointer.x; p.cy = pointer.y; }
      const o = other && other.isDown ? other : null;
      if (!o) return;
      const ax = pointer.id === p.id ? pointer.x : p.cx;
      const ay = pointer.id === p.id ? pointer.y : p.cy;
      const dist = Math.hypot(o.x - ax, o.y - ay) || 1;
      this.zoomAt((ax + o.x) / 2, (ay + o.y) / 2, (this.pinch.zoom * dist) / this.pinch.dist);
      return;
    }
    if (pointer.id !== p.id || !pointer.isDown) return;
    const dx = pointer.x - p.x;
    const dy = pointer.y - p.y;
    if (!p.moved && Math.hypot(dx, dy) < 12 * this.lay.s) return; // still a tap
    p.moved = true;
    this.manualView = true;
    const zoom = cam.zoom;
    const c = this.clampView(p.sx + this.lay.W / 2 - dx / zoom, p.sy + this.lay.H / 2 - dy / zoom, zoom);
    cam.centerOn(c.x, c.y);
    this.rest = { zoom, x: c.x, y: c.y };
  }

  // The finger lifts: if it never moved, it was a tap on the board.
  boardUp(pointer) {
    const p = this.press;
    if (!p || p.id !== pointer.id) {
      if (this.pinch && (pointer.id === this.pinch.a || pointer.id === this.pinch.b)) this.pinch = null;
      return;
    }
    this.press = null;
    this.pinch = null;
    if (p.moved || this.inCinematic) return;
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const { col, row } = this.tileAtPoint(world.x, world.y);
    this.handleTap(col, row);
  }

  // The arrow keys (roadmap 14.2): slide the view one step (a fifth of the screen) left, right, up or down.
  // Like a drag, the view then stays where the player put it until the next turn begins.
  panBy(dx, dy) {
    if (!this.follow || this.inCinematic) return;
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    const step = (Math.min(this.lay.W, this.lay.H) * 0.2) / zoom;
    const from = this.rest && this.manualView ? this.rest : { x: cam.midPoint.x, y: cam.midPoint.y };
    const c = this.clampView(from.x + dx * step, from.y + dy * step, zoom);
    this.rest = { zoom, x: c.x, y: c.y };
    this.manualView = true;
    cam.pan(c.x, c.y, 140, 'Sine.easeOut', true);
  }

  // Zooms the board camera to "zoom" (kept between the whole board and close
  // up), keeping the spot under the screen point (sx, sy) where it is.
  zoomAt(sx, sy, zoom) {
    if (!this.follow || this.inCinematic) return;
    const cam = this.cameras.main;
    const z = Math.min(Math.max(zoom, this.zoomRange[0]), this.zoomRange[1]);
    const { W, H } = this.lay;
    const before = { x: cam.scrollX + W / 2 + (sx - W / 2) / cam.zoom, y: cam.scrollY + H / 2 + (sy - H / 2) / cam.zoom };
    const cx = before.x - (sx - W / 2) / z;
    const cy = before.y - (sy - H / 2) / z;
    const c = this.clampView(cx, cy, z);
    cam.setZoom(z);
    cam.centerOn(c.x, c.y);
    this.rest = { zoom: z, x: c.x, y: c.y };
    this.manualView = true;
  }

  // The little map top right: the whole board, or back to the unit.
  toggleWholeBoard() {
    if (!this.follow || this.inCinematic || this.busy) return;
    const cam = this.cameras.main;
    play('select');
    if (cam.zoom > this.home.zoom * 1.04) {
      this.rest = { ...this.home };
      this.manualView = true;
      cam.pan(this.home.x, this.home.y, 300, 'Sine.easeInOut', true);
      cam.zoomTo(this.home.zoom, 300, 'Sine.easeInOut', true);
    } else {
      this.manualView = false;
      this.rest.zoom = this.playZoom;
      this.followUnit(this.activeUnit, 300, true);
    }
  }

  // Where the board is in the world: every tile, plus room for the figures
  // standing on the far tiles and the blocks' sides hanging below.
  boardBounds() {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const p = tileToScreen(c, r);
        x0 = Math.min(x0, p.x - TILE_WIDTH / 2);
        x1 = Math.max(x1, p.x + TILE_WIDTH / 2);
        y0 = Math.min(y0, p.y - TILE_HEIGHT / 2);
        y1 = Math.max(y1, p.y + TILE_HEIGHT / 2);
      }
    }
    return { x0, x1, y0: y0 - 84, y1: y1 + 34 };
  }

  // The board camera's normal view (the whole board, fitted to the screen).
  goHome() {
    const cam = this.cameras.main;
    const view = this.follow && this.rest ? this.rest : this.home; // a map whose camera follows rests on the unit's view
    cam.setZoom(view.zoom);
    cam.centerOn(view.x, view.y);
  }

  // The backdrop reaches as far left and right as the screen can see.
  redrawBackdrop() {
    for (const o of this.backdropParts || []) o.destroy();
    const half = this.scale.width / (2 * this.home.zoom) + 80;
    const before = new Set(this.children.list);
    drawBackdrop(this, Math.min(0, this.home.x - half), Math.max(GAME_WIDTH, this.home.x + half));
    this.backdropParts = this.children.list.filter((o) => !before.has(o));
  }

  // The dark edges of the screen, sized to the screen.
  fitVignette() {
    if (!this.vignette) return;
    const { W, H } = this.lay;
    this.vignette.setPosition(-W * 0.1, -H * 0.1).setDisplaySize(W * 1.2, H * 1.2);
  }

  // The screen changed shape (the phone was turned): lay everything out again.
  relayout() {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.uiCam.setSize(this.scale.width, this.scale.height);
    this.computeLayout();
    this.redrawBackdrop();
    this.fitVignette();
    this.buildHud();
    if (!this.inCinematic) this.goHome();
    if (this.activeUnit) {
      this.refreshTurnStrip();
      this.refreshButtons();
      this.refreshCard(this.viewing || this.activeUnit, !!this.viewing);
      this.refreshStatus();
    }
  }

  destroyHud() {
    for (const o of this.hudParts || []) o.destroy();
    this.hudParts = [];
  }

  // Builds the frame around the battle, as in Suleiman's 30 Oct mockups:
  // the turn order top left, the turn number and the tile in focus top right
  // (with the camera and sound buttons under it), the unit's profile bottom
  // left, an info card bottom right, and the command menu that floats beside
  // the unit whose turn it is.
  buildHud() {
    this.destroyHud();
    const { W, H, s, m } = this.lay;
    const S = (n) => Math.round(n * s);
    const keep = (o) => {
      this.ui(o);
      this.hudParts.push(o);
      return o;
    };
    const T = (n) => Math.max(S(n), this.lay.minText); // letters: never under 11 real pixels (M7)
    this.stripY = this.lay.stripY;
    // 18.44: the HUD in HTML over the canvas (src/domHud.js), made once. The parts it draws are marked
    // with dom(): still built here and read by the game and the tests, but no longer drawn on the canvas.
    if (!this.domHud && domHudWanted()) {
      this.domHud = new DomHud(this);
      this.events.once('shutdown', () => { if (this.domHud) this.domHud.destroy(); this.domHud = null; });
    }
    const dom = (o) => { o.domHidden = true; return o; };

    // Top left (his mock-up): the title with his small sigil, then the turn strip, a thin gold line under it
    const P = this.lay.px, F = this.lay.F, D = (n) => Math.round(n * P);
    const tg = keep(dom(this.add.graphics()));
    const ty = m + D(8);
    goldDiamond(tg, m + D(5), ty, D(4.5));
    tg.lineStyle(1, 0xe4c27c, 0.6).strokeCircle(m + D(5), ty, D(6.5));
    this.titleText = keep(dom(this.add.text(m + D(16), ty, 'FABIEN  ·  OF GODS & MEN', textStyle(F.small, '#d9c592')).setOrigin(0, 0.5).setLetterSpacing(Math.max(1, D(1.6)))));
    const line = keep(dom(this.add.graphics()));
    this.stripLine = line;
    this.turnStripLayer = keep(dom(this.add.container(0, 0)));
    // Down the left on a wide screen: every fighter as a diamond, heroes then enemies (see refreshUnitList)
    this.unitListLayer = keep(dom(this.add.container(0, 0)));

    // Top right: the turn number, the ground in focus and its height, and a picture of it (his mock-up)
    const bw = D(this.lay.portrait ? 124 : 150), bh = D(68); // (20 Nov polish: tall enough for TURN, the ground and its height at the small-letter floor) // (18.44: roomier on a wide screen)
    const bx = W - m - bw;
    this.turnGeo = { x: bx, y: m, w: bw, h: bh };
    framePanel(keep(dom(this.add.graphics())), bx, m, bw, bh, P);
    const turnWord = keep(dom(this.add.text(bx + D(8), m + D(11), 'TURN', textStyle(F.small, '#bfae86')).setLetterSpacing(Math.max(1, D(1.5))).setOrigin(0, 0.5)));
    // the title never runs under this panel: on a narrow screen it loses its letter spacing
    if (this.titleText.x + this.titleText.width > bx - D(6)) this.titleText.setLetterSpacing(0).setText('FABIEN · OF GODS & MEN');
    this.turnText = keep(dom(this.add.text(turnWord.x + turnWord.width + D(6), m + D(11), '01', textStyle(F.big, '#f3e7c6')).setOrigin(0, 0.5)));
    const rule = keep(dom(this.add.graphics()));
    rule.lineStyle(1, 0xc9a35a, 0.35).lineBetween(this.turnText.x + D(24), m + D(11), bx + bw - D(8), m + D(11));
    this.tileText = keep(dom(this.add.text(bx + D(8), m + D(27), '', textStyle(F.mid, '#e8dcc0')).setOrigin(0, 0.5)));
    this.elevText = keep(dom(this.add.text(bx + D(8), m + D(40), '', textStyle(F.small, '#bfae86')).setLetterSpacing(Math.max(1, D(1))).setOrigin(0, 0.5)));
    this.tilePic = keep(dom(this.add.graphics()));
    this.tilePicAt = { x: bx + bw - D(24), y: m + D(31), w: D(30) };

    // Under it: turn the camera (his curved arrows) either side of the little
    // map of the board, and sound on or off
    const r = Math.round(11 * P); // (small, as his; the touch circle stays a finger wide)
    const iy = m + bh + D(6) + r;
    const round = (x, icon, onTap, y = iy) => {
      const pic = iconImage(this, x, y, icon, r * 2);
      if (pic) keep(pic);
      else {
        const g = keep(this.add.graphics());
        g.fillStyle(UI.ink, 0.9).fillCircle(x, y, r).lineStyle(2, UI.bronze, 1).strokeCircle(x, y, r);
        drawIcon(g, icon, x, y, r * 1.1, UI.bronzeLight);
      }
      const hit = keep(this.add.circle(x, y, Math.max(r + 4, this.lay.minTap / 2), 0x000000, 0.001).setInteractive({ useHandCursor: true }));
      hit.on('pointerdown', onTap);
      return pic;
    };
    const muteX = W - m - r;
    const soundPics = [round(muteX, 'sound', () => toggleSound()), iconImage(this, muteX, iy, 'mute', r * 2)];
    if (soundPics[1]) keep(soundPics[1]);
    const toggleSound = () => {
      setMuted(!isMuted());
      showSound();
      play('click');
    };
    const showSound = () => {
      if (soundPics[0]) soundPics[0].setVisible(!isMuted());
      if (soundPics[1]) soundPics[1].setVisible(isMuted());
    };
    showSound();
    // Settings (M7, 17.7): the Effects and Enemy turns pills that floated here are rows of one
    // sheet now, opened by this button, with the new Health bars choice (M6). Every choice is
    // remembered on the device.
    // a slim button (his style); its touch area is a finger tall and wide, invisible
    const setW = D(22), setH = D(22); // (a small gear since 20 Nov; the word is only on the canvas copy the tests read)
    const setX = W - m - setW, setY = iy + r + D(6);
    this.settingsGeo = { x: setX, y: setY, w: setW, h: setH };
    framePanel(keep(dom(this.add.graphics())), setX, setY, setW, setH, P);
    keep(dom(this.add.text(setX + setW / 2, setY + setH / 2, 'Settings', textStyle(F.small, '#e8d5a8')).setOrigin(0.5)));
    const tapH = Math.max(setH, this.lay.minTap), tapW = Math.max(setW, this.lay.minTap);
    const setHit = keep(dom(this.add.rectangle(setX - (tapW - setW) / 2, setY - (tapH - setH) / 2, tapW, tapH, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true })));
    this.settingsButton = setHit;
    const sheet = keep(dom(this.add.container(0, 0).setDepth(350).setVisible(false)));
    this.settingsSheet = sheet;
    const rowH2 = Math.max(S(48), this.lay.minTap + S(6));
    const sheetW = Math.min(W - 2 * m, Math.max(S(380), T(15) * 20));
    const sheetRows = [];
    const sheetH = S(56) + 5 * rowH2 + S(14);
    const sx0 = Math.round((W - sheetW) / 2), sy0 = Math.round((H - sheetH) / 2);
    const veil = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0).setInteractive(); // taps outside close it
    const panel = this.add.graphics();
    darkPanel(panel, sx0, sy0, sheetW, sheetH, s);
    sheet.add([veil, panel, this.add.text(W / 2, sy0 + S(28), 'SETTINGS', textStyle(T(15), '#e4c27c')).setOrigin(0.5).setLetterSpacing(2)]);
    const openSheet = (on) => {
      sheet.setVisible(on);
      if (on) hideTip(this); // a menu opening puts the tooltip away
      for (const o of [veil, ...sheetRows]) if (o.input) o.input.enabled = on;
      play('click');
    };
    this.openSettings = openSheet;
    veil.on('pointerdown', () => openSheet(false));
    setHit.on('pointerdown', () => openSheet(!sheet.visible));
    const sheetRow = (i, onTap) => {
      const y = sy0 + S(56) + i * rowH2;
      const label = this.add.text(W / 2, y + rowH2 / 2, '', { fontFamily: 'Georgia, serif', fontSize: T(15) + 'px', fontStyle: 'bold', color: '#e8d5a8', backgroundColor: '#2a1d12', fixedWidth: sheetW - S(32), align: 'center', padding: { x: 6, y: Math.round((rowH2 - S(6) - T(15) * 1.2) / 2) } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      label.on('pointerdown', onTap);
      sheet.add(label); sheetRows.push(label);
      return label;
    };
    // Effects: Full / Light (roadmap 16.1): Light turns the looping looks off.
    const fxLabel = sheetRow(0, () => { setFxMode(fxMode() === 'light' ? 'full' : 'light'); showFx(); play('click'); });
    const showFx = () => fxLabel.setText('Effects: ' + (fxMode() === 'light' ? 'Light' : 'Full'));
    this.events.on('fxmode', showFx);
    showFx();
    // Enemy turns: Normal / Fast (roadmap 18.11, M11): Fast plays every enemy turn at double
    // speed. Normal is the default (Baiyee, 14 Nov); the player's choice is remembered.
    const paceLabel = sheetRow(1, () => { this.setEnemyFast(!this.enemyFast); showPace(); play('click'); });
    const showPace = () => paceLabel.setText('Enemy turns: ' + (this.enemyFast ? 'Fast' : 'Normal'));
    showPace();
    // Health bars: When hit / Always (M6)
    const barsLabel = sheetRow(2, () => { setPlateMode(plateMode() === 'always' ? 'hit' : 'always'); showBars(); for (const u of this.units) settlePlate(this, u); play('click'); });
    const showBars = () => barsLabel.setText('Health bars: ' + (plateMode() === 'always' ? 'Always' : 'When hit'));
    showBars();
    // Test mode (18.30): on, the character select lets the tester pick the enemies too; off locks them to the
    // map's own (for the story later). On by default for now. Takes effect at the next character select.
    const testLabel = sheetRow(3, () => { setTestMode(!testMode()); showTest(); play('click'); });
    const showTest = () => testLabel.setText('Test mode: ' + (testMode() ? 'On (pick enemies)' : 'Off'));
    showTest();
    sheetRow(4, () => openSheet(false)).setText('Close');
    this.settingsRows = sheetRows; // (the HTML sheet shows these words and taps these rows, 18.44)
    for (const o of [veil, ...sheetRows]) if (o.input) o.input.enabled = false;
    this.ui(sheet);
    fxWatchFrameRate(this);
    const rx = muteX - r * 2 - S(16);
    if (isPhone(this)) {
      // On a phone the turn buttons sit halfway down the two sides of the
      // screen, under the thumbs (roadmap 8.18, Suleiman 31 Oct 09:44); the
      // little map of the board stays up here. In landscape the left one
      // stands just right of the turn order column.
      const ry = Math.round(H / 2);
      const lx = this.lay.portrait ? m + r : m + S(92);
      const rxSide = W - m - r;
      round(lx, 'undo', () => this.rotateCamera(-1), ry);
      round(rxSide, 'redo', () => this.rotateCamera(1), ry);
      this.rotateSpots = [{ x: lx, y: ry }, { x: rxSide, y: ry }];
      this.compassPos = { x: rx, y: iy };
    } else {
      round(rx, 'redo', () => this.rotateCamera(1));
      this.compassPos = { x: rx - r - S(30), y: iy };
      round(rx - r * 2 - S(40), 'undo', () => this.rotateCamera(-1));
      this.rotateSpots = [];
    }
    this.compass = keep(this.add.graphics());
    // tap the little map: the whole board, or back to the unit (roadmap 11.5)
    const compassHit = keep(this.add.circle(this.compassPos.x, this.compassPos.y, Math.round(26 * s), 0x000000, 0.001).setInteractive({ useHandCursor: true }));
    compassHit.on('pointerdown', () => this.toggleWholeBoard());
    this.refreshCompass();
    if (!this.keysBound) {
      this.keysBound = true;
      this.input.keyboard?.on('keydown-Q', () => this.rotateCamera(-1));
      this.input.keyboard?.on('keydown-E', () => this.rotateCamera(1));
      // M8 (checklist E3): Esc cancels, Enter confirms, Space ends the turn
      this.input.keyboard?.on('keydown-ESC', () => this.keyCancel());
      // Roadmap 14.2: the arrow keys look around the board (held down, they keep going)
      this.input.keyboard?.on('keydown-LEFT', () => this.panBy(-1, 0));
      this.input.keyboard?.on('keydown-RIGHT', () => this.panBy(1, 0));
      this.input.keyboard?.on('keydown-UP', () => this.panBy(0, -1));
      this.input.keyboard?.on('keydown-DOWN', () => this.panBy(0, 1));
      this.input.keyboard?.on('keydown-ENTER', () => this.keyConfirm());
      this.input.keyboard?.on('keydown-SPACE', () => this.keyEndTurn());
    }

    // Bottom left: the unit's profile (see refreshCard)
    this.cardLayer = keep(dom(this.add.container(0, 0)));
    this.cardTop = H;

    // Bottom right: the skill panel (UI rework 16 Nov), shown while a skill is chosen
    this.skillLayer = keep(dom(this.add.container(0, 0)));
    this.skillTop = H;

    // Bottom right: the info card (hints, and the preview of a move or skill)
    this.infoPanel = keep(dom(this.add.graphics()));
    this.statusText = keep(dom(this.add.text(0, 0, '', textStyle(S(19), '#f1e6c8', { wordWrap: { width: this.lay.infoW - S(24) }, lineSpacing: S(2) }))));
    this.infoText = null;
    this.infoTop = H;

    // The command menu beside the active unit (roadmap 8.3). Its rows are the
    // same command slots as before: four rows, and two rows that can hold
    // two commands each (Engage | Skills, Items | End turn).
    this.menuPanel = this.add.graphics();
    this.menuHeader = this.add.text(0, 0, '', textStyle(S(14), '#e4c27c')).setOrigin(0, 0.5).setLetterSpacing(1);
    const row = () => new MenuRow(this);
    this.slots = [row(), row(), row(), row()];
    this.halves = [row(), row()];
    this.lowHalves = [row(), row()];
    for (const b of [...this.halves, ...this.lowHalves]) b.set(null);
    // The grip along its top edge: drag it to put the menu anywhere (roadmap
    // 8.16, Suleiman 31 Oct 09:43 "see if you can make the battle ui movable").
    // It stays where you put it for the rest of the battle; double-tap the
    // grip to send it back beside the unit.
    this.menuGrip = this.add.graphics();
    this.menuGripHit = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.001).setOrigin(0, 0).setInteractive();
    this.menuGripHit.on('pointerdown', (pointer) => this.grabMenu(pointer));
    this.menu = keep(dom(this.add.container(0, 0, [this.menuPanel, this.menuGrip, this.menuGripHit, this.menuHeader, ...[...this.slots, ...this.halves, ...this.lowHalves].map((b) => b.view)]).setDepth(5)));
    // UI rework 16 Nov: while the skills or items list is open, the main commands stay beside it
    // (as in his mock-up). These rows copy the main menu; a tap on another command closes the list first.
    this.sidePanel = this.add.graphics();
    this.sideRows = [0, 1, 2, 3, 4, 5].map(() => new MenuRow(this));
    for (const r of this.sideRows) r.set(null);
    this.sideMenu = keep(dom(this.add.container(0, 0, [this.sidePanel, ...this.sideRows.map((r) => r.view)]).setDepth(5).setVisible(false)));
    this.mainSpec = null;
    this.menuRows = [];
    this.menuSize = { w: 0, h: 0 };
    this.menuShown = null;

    // While a target is being picked, the menu shrinks to this small tag
    // ("✕ Thrust") in a corner, so the whole board can be tapped (roadmap 8.9).
    // Tapping it, or empty ground, goes back to the menu.
    this.pillBack = this.add.graphics();
    this.pillText = this.add.text(0, 0, '', textStyle(S(17), '#f1e6c8')).setOrigin(0, 0.5);
    this.pillHit = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.pillHit.on('pointerdown', () => {
      if (!this.pill.visible || this.busy) return;
      // 1.70: from a skill's or an item's target the tag goes back to that list (its group and page kept)
      if (this.mode === 'spellTarget' || this.mode === 'huskTile') this.spellBack();
      else if (this.mode === 'itemTarget') this.itemBack();
      else this.cancelMode();
    });
    this.pill = keep(dom(this.add.container(0, 0, [this.pillBack, this.pillText, this.pillHit]).setDepth(5).setVisible(false)));
    this.moveButton = this.slots[0];
    this.attackButton = this.slots[1];
    this.endButton = this.slots[3];
  }

  // The commands in use, top to bottom, in a small dark panel (roadmap 8.3).
  layoutMenu() {
    if (!this.menu || !this.lay) return;
    const { s, rowH, menuW } = this.lay;
    const rows = [];
    const add = (b) => b.view.visible && rows.push(b);
    const [a, b, c, d] = this.slots;
    add(a);
    add(b);
    if (c.view.visible) add(c);
    else this.halves.forEach(add);
    if (d.view.visible) add(d);
    else this.lowHalves.forEach(add);
    // with tap-to-move (8.5) the blue tiles are always there, so Move leaves the menu
    const walk = this.autoMove ? rows.findIndex((r) => r.iconName === 'walk') : -1;
    if (walk >= 0) {
      rows[walk].view.setVisible(false);
      rows.splice(walk, 1);
    }
    const caster = this.activeUnit && this.activeUnit.maxMp > 0 && !isMelee(this.activeUnit);
    const header = this.mode === 'item' || this.mode === 'itemTarget' ? 'Items' : this.mode === 'spell' || this.spellGroup ? this.spellGroup || (caster ? 'Verses' : 'Skills') : '';
    // His mock-up (second pass, 16 Nov): a slim column of short rows, a small emblem and the word,
    // and the list beside it just as slim with the MP number at the right. No title over a list
    // (the lit row of the main menu beside it says which list it is). Rows are 30 design pixels
    // apart; each row's touch area is its whole band, with no gaps, so it is easy to hit.
    const P = this.lay.px, D = (n) => Math.round(n * P);
    const pad = D(2);
    const gripH = D(6);
    const word = this.lay.F.mid;
    const icon = Math.round(word * 0.9); // (the HTML row draws it a quarter bigger: a little taller than the word)
    // his list has no Back row: while the main commands stand beside it, the lit row closes it
    // (a group of skills, like Blessings, keeps Back: it goes up to the whole list)
    // 20 Nov polish: no Back row anywhere while the main commands stand beside the list: a tap outside goes back one step
    if (header && this.mainSpec && this.mainSpec.unit === this.activeUnit) {
      const back = rows.findIndex((r) => r.label.text === 'Back');
      if (back >= 0 && rows.length > 1) { rows[back].view.setVisible(false); if (rows[back].hit.input) rows[back].hit.input.enabled = false; rows.splice(back, 1); }
    }
    let need = 0;
    for (const r of rows) {
      r.word.setFontSize(word);
      r.cost.setFontSize(this.lay.F.small);
      need = Math.max(need, r.word.width + (r.cost.text ? r.cost.width + D(7) : 0));
    }
    // (20 Nov polish: a slim column, about 15 percent of a phone's width: 4 left, the picture, 3.5, the word, 5 right)
    const mW = Math.round(2 * pad + D(4) + icon * 1.25 + D(3.5) + need + D(5));
    const rH = this.lay.rowH;
    const colW = mW - 2 * pad;
    rows.forEach((r, i) => {
      r.compact = true;
      r.compactFont = word;
      r.iconSize = icon;
      r.costFont = this.lay.F.small;
      r.place(pad, pad + gripH + i * rH, colW, rH, P, this.lay.minText);
    });
    const h = pad * 2 + gripH + rows.length * rH;
    this.menuHeader.setText('').setVisible(false);
    this.menuPanel.clear();
    framePanel(this.menuPanel, 0, 0, mW, h, P);
    // faint lines between the rows, as his
    this.menuPanel.lineStyle(1, 0xc9a35a, 0.13);
    for (let i = 1; i < rows.length; i++) this.menuPanel.lineBetween(pad + D(4), pad + gripH + i * rH, mW - pad - D(4), pad + gripH + i * rH);
    // the grip: a short row of small gold dots along the top (brighter when it has been moved)
    this.menuGrip.clear().fillStyle(this.menuPin ? 0xffd27a : UI.bronzeLight, this.menuPin ? 0.9 : 0.5);
    for (let i = -2; i <= 2; i++) this.menuGrip.fillCircle(mW / 2 + i * D(4), pad + gripH / 2, Math.max(1, D(0.9)));
    // the grip's touch area reaches above the panel, so a thumb can catch it (the rows are never under it)
    const gripBand = pad + gripH;
    const above = Math.max(0, Math.ceil(26 / this.lay.real) - gripBand);
    this.menuGripHit.setPosition(0, -above).setSize(mW, gripBand + above);
    if (this.menuGripHit.input) this.menuGripHit.input.hitArea.setTo(0, 0, mW, gripBand + above);
    this.menuRows = rows;
    this.menuSize = { w: mW, h };
    this.ui(this.menu);
    // the main commands, remembered so they can stand beside a list
    if (!header) this.mainSpec = { unit: this.activeUnit, font: word, w: mW, rows: rows.map((r) => ({ label: r.label.text, icon: r.iconName, enabled: r.enabled, onTap: r.onTap, emblem: r.emblem, accent: r.accent, shown: r.shown })) };
    this.layoutSideMenu(header, pad, gripH);
    this.placeMenu();
  }

  // The main commands beside an open list (UI rework 16 Nov). The row of the open list is lit;
  // a tap on it closes the list, a tap on another command closes the list and does that.
  layoutSideMenu(header, pad, gripH) {
    const spec = this.mainSpec;
    const on = !!(header && spec && spec.unit === this.activeUnit);
    this.sideSize = null;
    for (const r of this.sideRows) { r.set(null); if (r.hit.input) r.hit.input.enabled = false; }
    this.sidePanel.clear();
    if (!on) return;
    const P = this.lay.px;
    const rH = this.lay.rowH;
    const open = header === 'ITEMS' || header === 'Items' ? 'Items' : null;
    spec.rows.slice(0, this.sideRows.length).forEach((d, i) => {
      const r = this.sideRows[i];
      const word = d.label.split('  ')[0];
      const lit = open ? word === open : word === 'Skills' || word === 'Verses';
      const tap = lit ? () => (this.spellGroup ? this.spellBack() : this.cancelMode()) : () => { this.cancelMode(); if (d.onTap) d.onTap(); };
      r.set(d.label, d.icon, d.enabled, tap, { selected: lit, accent: d.accent, emblem: d.emblem, shown: d.shown });
      r.compact = true;
      r.compactFont = spec.font;
      r.iconSize = Math.round(this.lay.F.mid * 0.9);
      r.costFont = this.lay.F.small;
      r.place(pad, pad + gripH + i * rH, spec.w - 2 * pad, rH, P, this.lay.minText);
    });
    const h = pad * 2 + gripH + Math.min(spec.rows.length, this.sideRows.length) * rH;
    framePanel(this.sidePanel, 0, 0, spec.w, h, P);
    this.sidePanel.lineStyle(1, 0xc9a35a, 0.13);
    for (let i = 1; i < Math.min(spec.rows.length, this.sideRows.length); i++) this.sidePanel.lineBetween(pad + 4 * P, pad + gripH + i * rH, spec.w - pad - 4 * P, pad + gripH + i * rH);
    this.sideSize = { w: spec.w, h };
    this.ui(this.sideMenu);
  }

  // The menu stands beside the unit whose turn it is, clear of the frame and
  // covering as little of the board as it can (roadmap 8.9): it tries each
  // side of the unit, then the two corners above the cards, and takes the
  // spot that hides the fewest blue tiles, targets and characters. While a
  // target is being picked it shrinks to the small cancel tag. Hidden while
  // things move or on the enemy's turn.
  placeMenu() {
    if (!this.menu) return;
    const u = this.activeUnit;
    const turn = u && u.side === 'hero' && u.alive && !this.busy && !this.battleOver && !this.inCinematic && !this.rotating;
    const picking = TARGET_MODES.includes(this.mode);
    const show = !!(turn && !picking && this.menuRows.length > 0 && this.cardOpen !== true);
    this.menu.setVisible(show);
    this.showPill(!!(turn && picking));
    if (show !== this.menuShown) {
      // a hidden menu must not catch taps meant for the board
      this.menuShown = show;
      for (const r of [...this.slots, ...this.halves, ...this.lowHalves]) if (r.hit.input) r.hit.input.enabled = show;
      if (this.menuGripHit.input) this.menuGripHit.input.enabled = show;
    }
    const side = !!(show && this.sideSize);
    this.sideMenu.setVisible(side);
    for (const r of this.sideRows) if (r.hit.input) r.hit.input.enabled = side && r.view.visible;
    if (!show) return;
    const { W, H, s, m } = this.lay;
    const { w, h } = this.menuSize;
    const P = this.lay.px;
    const gap2 = Math.round(5 * P); // between the main commands and the list
    const sw = side ? this.sideSize.w + gap2 : 0;
    const total = sw + w;
    const tallest = Math.max(h, side ? this.sideSize.h : 0);
    // the lowest the menu may reach: above the card and the skill panel
    const floor = Math.min(this.cardTop || H, this.lay.portrait ? this.skillTop || H : H) - m;
    let x, y, onLeft = false;
    if (this.menuPin) {
      // put somewhere by hand (8.16): it stays there (remembered on the device), kept on the screen
      x = this.menuPin.fx * W;
      y = this.menuPin.fy * H;
    } else {
      // His mock-up: tucked right beside the unit whose turn it is, level with its chest, on its
      // outer side (toward the nearer edge of the screen), so neither the menu nor the list covers
      // the middle of the board. In a clash: the side away from the foe, so the meter stays in sight.
      const cam = this.cameras.main;
      const v = cam.worldView;
      const ux = (u.view.x - v.x) * cam.zoom;
      const uy = (u.view.y - u.centerY - v.y) * cam.zoom;
      const gap = TILE_WIDTH * 0.3 * cam.zoom;
      const foe = u.engagedWith && u.engagedWith.view;
      const wantLeft = foe ? foe.x > u.view.x : ux < W / 2;
      // A few spots beside the unit (right or left; at its chest, or higher up): take the one that
      // hides the fewest blue tiles, targets and figures (as 8.9), preferring the outer side.
      const feetY = (u.view.y - v.y) * cam.zoom;
      const tileH = TILE_HEIGHT * cam.zoom;
      const spots = [];
      for (const left of [false, true]) for (const yy of [uy - tallest * 0.4, feetY - tallest - tileH * 0.3, feetY - tallest - tileH * 1.1]) spots.push({ left, x: left ? ux - gap - total : ux + gap, y: yy });
      const scr = (wx, wy) => ({ x: (wx - v.x) * cam.zoom, y: (wy - v.y) * cam.zoom });
      const marks = [];
      for (const k of this.reachableKeys || []) { const [c, r] = k.split(',').map(Number); const p = tileToScreen(c, r); marks.push({ ...scr(p.x, p.y), w: 1 }); }
      for (const o of this.units) if (o.alive && o.view) marks.push({ ...scr(o.view.x, o.view.y - o.centerY), w: 3 });
      let best = null;
      for (const sp of spots) {
        const cx = Math.min(Math.max(sp.x, m), W - m - total), cy = Math.min(Math.max(sp.y, this.lay.top), floor - tallest);
        let score = (sp.left !== wantLeft ? (foe ? 6 : 0.5) : 0) + Math.abs(cx - sp.x) / 40; // (a spot pushed back onto the screen counts against it)
        for (const q of marks) if (q.x > cx - 4 && q.x < cx + total + 4 && q.y > cy - 4 && q.y < cy + tallest + 4) score += q.w;
        if (!best || score < best.score - 0.01) best = { ...sp, score };
      }
      onLeft = best.left;
      x = best.x;
      y = best.y;
    }
    x = Math.min(Math.max(x, m), W - m - total);
    y = Math.min(Math.max(y, this.lay.top), floor - tallest);
    y = Math.max(y, m);
    // the list always opens to the right of the main commands, as in War of the Lions (18.44)
    const mainX = x;
    const listX = x + sw;
    if (side) this.sideMenu.setPosition(Math.round(mainX), Math.round(y));
    this.menu.setPosition(Math.round(listX), Math.round(y));
    this.placeSkillPanel();
  }

  // The skill panel: bottom right; on a wide screen, while the skills list is open, just under the
  // list (Baiyee 16 Nov, following ui_target.png: "the skill panel by the skills list").
  // 18.44 (20 Nov): always bottom right on a wide screen (Baiyee's layout); on an upright phone just above
  // the card, at the right, so the card can take the bottom's width.
  placeSkillPanel() {
    const L = this.skillLayer;
    if (!L || !L.list.length) return;
    const { W, H, m, portrait, skillW } = this.lay;
    const h = this.skillPanelH || 0;
    const y = portrait ? Math.min(this.cardTop || H, H - m - this.cardClosedH()) - Math.round(4 * this.lay.px) - h : H - m - h;
    L.setPosition(Math.round(W - m - skillW), Math.round(y));
    this.skillTop = y;
  }

  // The bottom right corner of the menu's home: above the card on an upright phone, above the
  // info box's place on a wide screen. It depends only on the screen, so it never moves.
  menuHome() {
    const { W, H, s, m, portrait } = this.lay;
    return { x: W - m, y: H - 2 * m - Math.max(this.cardClosedH(), Math.round(SKILL_PANEL.h * this.lay.px)) }; // (the cancel tag stands above the skill panel)
  }

  // How tall the unit card is when closed (it is always the same, so the menu can stand on it).
  cardClosedH() {
    return this.cardMetrics().closedH;
  }

  // The menu's grip was pressed (8.16): start dragging it. A second tap on it
  // soon after sends the menu back beside the unit.
  grabMenu(pointer) {
    const now = this.time.now;
    if (this.lastGripTap && now - this.lastGripTap < 350) {
      this.lastGripTap = 0;
      this.menuDrag = null;
      this.menuPin = null;
      saveMenuPin(null); // back home, and remembered that way
      play('click');
      this.layoutMenu();
      return;
    }
    this.lastGripTap = now;
    const lead = this.sideMenu && this.sideMenu.visible ? this.sideMenu : this.menu; // (the group's left edge)
    this.menuDrag = { px: pointer.x, py: pointer.y, mx: lead.x, my: lead.y, moved: false };
  }

  // The finger (or mouse) moves while holding the grip: the menu follows it.
  dragMenu(pointer) {
    const d = this.menuDrag;
    if (!d || !pointer.isDown) return;
    const dx = pointer.x - d.px;
    const dy = pointer.y - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // a tap, not a drag yet
    if (!d.moved) {
      d.moved = true;
      this.menuPin = { fx: d.mx / this.lay.W, fy: d.my / this.lay.H };
      this.layoutMenu(); // the grip lights up
    }
    this.menuPin = { fx: (d.mx + dx) / this.lay.W, fy: (d.my + dy) / this.lay.H };
    this.placeMenu();
  }

  // The grip is let go: a menu that was dragged stays there, remembered on the device.
  dropMenu() {
    if (this.menuDrag && this.menuDrag.moved) saveMenuPin(this.menuPin);
    this.menuDrag = null;
  }

  // The small cancel tag shown while a target is being picked (roadmap 8.9).
  showPill(on) {
    if (!this.pill) return;
    this.pill.setVisible(on);
    if (this.pillHit.input) this.pillHit.input.enabled = on;
    if (!on) return;
    const { W, H, s, m } = this.lay;
    const name = this.pillName();
    if (this.pillText.text !== '✕   ' + name) {
      // a slim tag in his style; its touch area is a finger tall, invisible
      const P = this.lay.px;
      this.pillText.setText('✕   ' + name).setFontSize(this.lay.F.mid);
      const pw = Math.round(this.pillText.width + 20 * P);
      const ph = Math.round(24 * P);
      this.pillBack.clear();
      framePanel(this.pillBack, 0, 0, pw, ph, P);
      this.pillText.setPosition(Math.round(10 * P), ph / 2);
      const tap = Math.max(ph, this.lay.minTap);
      this.pillHit.setPosition(0, (ph - tap) / 2).setSize(pw, tap);
      this.pillHit.input.hitArea.setTo(0, 0, pw, tap);
      this.pillSize = { w: pw, h: ph };
    }
    // in the corner above the info card, where the board leaves room
    const { w, h } = this.pillSize;
    const home = this.menuHome(); // the cancel tag stands where the menu stood
    this.pill.setPosition(home.x - w, home.y - h);
  }

  // The name on the cancel tag: the move or skill being aimed.
  pillName() {
    const u = this.activeUnit;
    if (this.mode === 'attack' || this.mode === 'approach') {
      const atk = this.attackMove(u, this.mode === 'approach' && this.approach ? this.approach.tile : null);
      return atk !== 'attack' ? spells[atk].button : u.attackName || 'Attack';
    }
    if (this.mode === 'engage') return 'Engage';
    if (this.selectedSpell && spells[this.selectedSpell]) return spells[this.selectedSpell].button;
    return 'Back';
  }

  // Every frame: the info card follows its text, the menu follows the unit,
  // the gold marker bobs over the unit whose turn it is, and on your turn the
  // blue tiles come back by themselves (roadmap 8.5).
  update() {
    if (!this.lay) return;
    syncRims(this.units); // the coloured rims stay on their figures (M10)
    this.hoverPath();     // on a computer: the walking line to the tile under the mouse (M10)
    this.hoverBoard();    // ...and the tile and the fighter under it (M8)
    if (this.statusText && this.statusText.text !== this.infoText) this.fitStatus();
    this.placeMenu();
    if (this.domHud) this.domHud.sync(); // the HTML HUD copies what the HUD objects show (18.44)
    const u = this.activeUnit;
    // breathing rests during actions (moves, attacks, cinematics) and resumes after
    const still = !!(this.busy || this.inCinematic || this.battleOver);
    if (still !== this.breathPaused) {
      this.breathPaused = still;
      for (const v of this.units) if (v.alive && v.idleTween && v.idleTween.isPlaying !== undefined) still ? v.idleTween.pause() : v.idleTween.resume();
    }
    if (this.activeMarker) {
      const on = u && u.alive && u.view && u.view.active && !this.inCinematic && !this.battleOver;
      this.activeMarker.setVisible(!!on);
      if (on) this.activeMarker.setPosition(u.view.x, u.view.y - u.topY - 34 - this.markerBob.v * 7);
    }
    if (this.autoMove && this.mode === 'idle' && !this.busy && !this.battleOver && !this.inCinematic && !this.rotating) {
      if (u && u.side === 'hero' && u.alive && !u.engagedWith && this.stepsLeft(u) > 0) this.startMove(true);
    }
  }

  // The sizes the unit card is built from (M7). Closed, the card is always the same height,
  // so the menu can stand on it and never move.
  cardMetrics() {
    const { s, minText, portrait } = this.lay;
    const S = (n) => Math.round(n * s);
    const T = (n) => Math.max(S(n), minText); // letters: never under 11 real pixels
    const pad = S(12), r = S(36), nameSize = T(23), small = T(13), big = T(19);
    const line = small + S(6);
    // upright phone: name and class share one line (the card is wide); wide screen: two lines
    const h0 = portrait ? Math.round(nameSize * 1.35) : Math.round(nameSize * 1.15 + small * 1.3);
    const topH = Math.max(h0 + 3 * line, 2 * r + S(20));
    const statsH = S(6) + small + big + S(8);
    const chipsH = Math.max(S(24), small + S(8)) + S(6);
    // the slim bar the card is while closed (15 Nov): a small face, the name and a thin HP bar
    const slimH = Math.round((portrait ? CARD : CARD_ROOMY).h * this.lay.px); // the closed card (UI rework 16 Nov, src/battleCard.js)
    return { S, T, pad, r, nameSize, small, big, line, h0, topH, statsH, chipsH, slimH, closedH: slimH };
  }

  // The unit's profile along the bottom (roadmap 8.2, his 30 Oct mockups; reworked in M7,
  // 17.4): face, name, class, HP and MP bars, then FOUR numbers big enough to read (attack
  // or magic, defence, speed, move), and its conditions as his icons with words. Tap the
  // card for the rest (the other numbers, Poise, how long a Verse lasts); tap again to close.
  // A number a Verse or a hex has changed is coloured, with an arrow (roadmap 1.44).
  refreshCard(unit, viewing = false) {
    const L = this.cardLayer;
    L.removeAll(true);
    this.cardUnit = unit; this.cardViewing = viewing;
    if (!unit || !this.lay) return;
    const { s, m, H, W, portrait } = this.lay;
    const w = portrait && this.cardOpen ? W - 2 * m : this.lay.cardW; // open on a phone: the full width, for the numbers
    const { S, T, pad, r, nameSize, small, big, line, h0, topH, statsH, chipsH, closedH } = this.cardMetrics();
    const open = !!this.cardOpen;
    if (!open) return this.drawSlimCard(unit, viewing);
    const items = [];
    items.push(ringPortrait(this, pad + r + S(2), pad + r + S(8), r, unit, portraitKey(unit.id, unit), { active: unit === this.activeUnit }));
    const tx = pad + 2 * r + S(34); // clear of the ring's tassels
    const nameText = this.add.text(tx, pad - S(2), unit.name, textStyle(nameSize, '#ffe08a'));
    items.push(nameText);
    const role = isMelee(unit) ? STYLE_NAMES[styleOf(unit)] : unit.attackType === 'magic' ? 'Magic' : unit.spells && unit.spells.length ? 'Support' : 'Ranged';
    const roleText = this.add.text(tx, pad + Math.round(nameSize * 1.15), unit.jobName + '  ·  ' + role, textStyle(small, '#e4c27c'));
    if (portrait) roleText.setPosition(tx + nameText.width + S(14), pad - S(2) + nameSize - small); // on the name's line
    items.push(roleText);
    items.push(this.add.text(w - pad, pad + S(2), unit.side === 'hero' ? 'ALLY' : 'FOE', textStyle(small, unit.side === 'hero' ? '#7fd6cf' : '#ff8a6a')).setOrigin(1, 0));

    // The bars: a small word, the bar, and the numbers at its end (1.9)
    let y = pad + h0 + Math.round(line / 2);
    const bars = this.add.graphics();
    items.push(bars);
    const barX = tx + Math.round(small * 2.4);
    const barW = w - pad - Math.round(small * 4.6) - barX;
    const bar = (word, value, max, color, numbers) => {
      items.push(this.add.text(tx, y, word, textStyle(small, '#d8c8a4')).setOrigin(0, 0.5));
      bars.fillStyle(UI.ink, 1).fillRoundedRect(barX, y - S(5), barW, S(10), S(3));
      if (value > 0) bars.fillStyle(color, 1).fillRoundedRect(barX + 1, y - S(4), (barW - 2) * Math.min(1, value / max), S(8), S(2));
      bars.lineStyle(1, UI.bronze, 0.9).strokeRoundedRect(barX, y - S(5), barW, S(10), S(3));
      const hex = '#' + color.toString(16).padStart(6, '0');
      items.push(this.add.text(w - pad, y, numbers, textStyle(small, word === 'HP' ? '#f1e6c8' : hex, { fontStyle: 'bold' })).setOrigin(1, 0.5));
      y += line;
    };
    const frac = Math.max(0, unit.hp / unit.maxHp);
    bar('HP', unit.hp, unit.maxHp, frac <= 0.35 ? 0xe05a47 : 0x6fcf7f, unit.hp + '/' + unit.maxHp);
    const mpNow = mpShown(unit);
    if (mpNow) bar('MP', mpNow.mp, mpNow.max, mpNow.lent ? Phaser.Display.Color.HexStringToColor(buffOf(unit).color).color : 0x5aa8ff, mpNow.mp + '/' + mpNow.max);
    // When it acts next (roadmap 8.12): CT, the turn meter, decides it, so the
    // card says how many turns away that is. Nothing for the unit acting now.
    if (unit !== this.activeUnit && unit.alive) {
      const wait = this.turnsUntil(unit);
      items.push(this.add.text(tx, y, 'Next turn', textStyle(small, '#d8c8a4')).setOrigin(0, 0.5));
      items.push(this.add.text(w - pad, y, wait === 1 ? 'next' : wait ? 'in ' + wait : 'later', textStyle(small, '#e8b04a', { fontStyle: 'bold' })).setOrigin(1, 0.5));
    }
    y = pad + topH;

    // The numbers as they are right now. Each is [word, value now, value without Verses and hexes].
    const now = (stat) => unit[stat] + statMod(unit, stat);
    const hexNow = hexOf(unit);
    const speedNow = unit.speed - (hexNow && hexNow.speedLoss ? hexNow.speedLoss : 0);
    const magic = unit.attackType === 'magic';
    const atk = ['ATK', now('attack'), unit.attack], mag = ['MAG', now('magicAttack'), unit.magicAttack];
    const main = [magic ? mag : atk, ['DEF', now('defense'), unit.defense], ['SPD', speedNow, unit.speed], ['MOV', moveOf(unit), unit.move]];
    const rest = [magic ? atk : mag, ['MDF', now('magicDefense'), unit.magicDefense], ['RNG', unit.range, unit.range]];
    if (unit.contest && isStanceDuel()) rest.push(['POISE', poiseOf(unit) + '/' + engagementRules.poise.max, null]);
    const row = (stats) => {
      const colW = (w - 2 * pad) / 4;
      bars.lineStyle(1, UI.bronzeDark, 0.9).lineBetween(pad, y, w - pad, y);
      stats.forEach(([word, value, base], i) => {
        const cx = pad + colW * (i + 0.5);
        // changed by a Verse or a hex: green and an up arrow, or red and a down arrow (1.44)
        const up = base !== null && value > base, down = base !== null && value < base;
        const label = this.add.text(0, y + S(6) + small + big / 2, word, textStyle(small, '#a89a78')).setOrigin(0, 0.5);
        const num = this.add.text(0, y + S(6) + small + big / 2, String(value) + (up ? ' ▲' : down ? ' ▼' : ''), textStyle(big, up ? '#9fdc8a' : down ? '#ff8a6a' : '#f1e6c8', { fontStyle: 'bold' })).setOrigin(0, 0.5);
        num.statWord = word; // (tests find a number by its word)
        const total = label.width + S(8) + num.width;
        label.setX(cx - total / 2); num.setX(cx - total / 2 + label.width + S(8));
        label.setY(y + statsH / 2 + S(2)); num.setY(y + statsH / 2 + S(2));
        items.push(label, num);
      });
      y += statsH;
    };
    // The card never changes height (the menu stands on it): a tap turns the page to the
    // other numbers, a second tap turns it back. (cardOpen 'all' shows both rows: old tests.)
    row(main);
    if (open) row(rest);

    // Conditions as small chips: his icon and the word (roadmap 6.7). If the
    // row gets too long for the card, the chips with an icon drop the word.
    const chipH = chipsH - S(6);
    const hintText = this.add.text(w - pad, y + chipH / 2, 'Tap: close', textStyle(small, '#a89a78', { fontStyle: 'italic' })).setOrigin(1, 0.5);
    items.push(hintText);
    const chipRoom = w - 2 * pad - hintText.width - S(10);
    const buff = buffOf(unit);
    const chips = statusTags(unit).map((tag) => ({ tag, icon: tag.icon && this.textures.exists('icon:' + tag.icon) }));
    if (open && buff && this.cardOpen !== 'all') {
      // the second page says how long the Verse lasts, where the chips were
      items.push(this.add.text(pad, y + chipH / 2, (buff.effect || buff.name) + ': ' + buff.turnsLeft + ' turn' + (buff.turnsLeft === 1 ? '' : 's') + ' left', textStyle(small, buff.color)).setOrigin(0, 0.5));
    } else if (chips.length) {
      chips.forEach((c) => (c.text = this.add.text(0, 0, c.tag.text, textStyle(small, c.tag.color, { fontStyle: 'bold' }))));
      const widthOf = (c, withWord) => (c.icon ? (withWord ? c.text.width + chipH + S(7) : chipH) : c.text.width + S(14));
      const roomy = chips.reduce((sum, c) => sum + widthOf(c, true) + S(5), 0) <= chipRoom;
      let x = pad;
      for (const c of chips) {
        const showWord = roomy || !c.icon;
        const cw = widthOf(c, showWord);
        if (x + cw > pad + chipRoom) {
          c.text.destroy();
          continue;
        }
        const chip = this.add.graphics();
        chip.fillStyle(UI.ink, 1).fillRoundedRect(x, y, cw, chipH, S(5));
        chip.lineStyle(1, UI.bronze, 1).strokeRoundedRect(x, y, cw, chipH, S(5));
        items.push(chip);
        if (c.icon) items.push(this.add.image(x + chipH / 2, y + chipH / 2, 'icon:' + c.tag.icon).setDisplaySize(chipH - S(5), chipH - S(5)));
        if (showWord) items.push(c.text.setPosition(x + (c.icon ? chipH + S(1) : S(7)), y + chipH / 2).setOrigin(0, 0.5));
        else c.text.destroy();
        x += cw + S(5);
      }
    }
    y += chipsH;
    if (this.cardOpen === 'all' && buff) {
      items.push(this.add.text(pad, y - S(2), (buff.effect || buff.name) + ': ' + buff.turnsLeft + ' turn' + (buff.turnsLeft === 1 ? '' : 's') + ' left', textStyle(small, buff.color)));
      y += line;
    }
    if (viewing) items.push(this.add.text(w - pad, pad + S(2) + small * 1.2, 'viewing', textStyle(small, '#a89a78', { fontStyle: 'italic' })).setOrigin(1, 0));

    const h = y + pad - S(4);
    const back = this.add.graphics();
    darkPanel(back, 0, 0, w, h, s);
    // the whole card is one button: more, or less
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => { this.cardOpen = this.cardOpen === 'all' ? 'all' : !this.cardOpen; play('select'); this.refreshCard(this.cardUnit, this.cardViewing); });
    this.cardHit = hit;
    L.add([back, ...items, hit]);
    L.setPosition(m, H - m - h);
    this.cardTop = H - m - h;
    this.cardHeight = h;
    this.ui(L);
  }


  // The card while closed (15 Nov, Baiyee: minimalist): a slim bar along the bottom with a small
  // round face, the name, a thin HP bar (and a thinner MP bar for a caster) and the conditions as
  // small icons. Tap it to open the full numbers; tap again to close.
  drawSlimCard(unit, viewing) {
    // UI rework 16 Nov (Suleiman's mock-up): Final Fantasy Tactics style. A square portrait,
    // name and level, class, and the HP, MP and CT bars (src/battleCard.js). Tap it for the full numbers.
    const L = this.cardLayer;
    const { s, m, H, cardW: w, minText } = this.lay;
    const role = isMelee(unit) ? STYLE_NAMES[styleOf(unit)] : unit.attackType === 'magic' ? 'Magic' : unit.spells && unit.spells.length ? 'Support' : 'Ranged';
    const mpNow = mpShown(unit);
    unit.mpShown = mpNow ? { ...mpNow, color: mpNow.lent ? Phaser.Display.Color.HexStringToColor(buffOf(unit).color).color : null } : null;
    const { items, h } = drawUnitCard(this, unit, this.lay.px, this.lay.F, { active: unit === this.activeUnit, viewing, faceKey: portraitKey(unit.id, unit), jobLine: unit.jobName + '  ·  ' + role, roomy: !this.lay.portrait });
    // conditions: small icons along the bottom of the portrait
    const d = Math.round(13 * this.lay.px);
    let cx = Math.round(6 * this.lay.px) + d / 2;
    for (const tag of statusTags(unit)) {
      if (!tag.icon || !this.textures.exists('icon:' + tag.icon)) continue;
      items.push(this.add.image(cx, Math.round((this.lay.portrait ? 50 : 77) * this.lay.px) - d / 2 - 1, 'icon:' + tag.icon).setDisplaySize(d, d));
      cx += d + 2;
    }
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => { this.cardOpen = true; play('select'); this.refreshCard(this.cardUnit, this.cardViewing); });
    this.cardHit = hit;
    L.add([...items, hit]);
    L.setPosition(m, H - m - h);
    this.cardTop = H - m - h;
    this.cardHeight = h;
    this.ui(L);
  }

  // What the unit card shows, for the HTML card (18.44, src/domHud.js): the same values the canvas
  // card is built from (refreshCard and drawSlimCard), as plain data.
  cardData(unit, viewing = false) {
    const role = isMelee(unit) ? STYLE_NAMES[styleOf(unit)] : unit.attackType === 'magic' ? 'Magic' : unit.spells && unit.spells.length ? 'Support' : 'Ranged';
    const mpNow = mpShown(unit);
    const buff = buffOf(unit);
    const active = unit === this.activeUnit;
    const frac = Math.max(0, unit.hp / unit.maxHp);
    const iconUrl = (tag) => (tag.icon && this.textures.exists('icon:' + tag.icon) && this.domHud ? this.domHud.url('icon:' + tag.icon) : null);
    const tags = statusTags(unit);
    const d = {
      name: unit.name, level: unit.level || 1, side: unit.side === 'hero' ? 'hero' : 'enemy', active, viewing: !!viewing,
      face: portraitKey(unit.id, unit), job: unit.jobName + '  ·  ' + role, roomy: !this.lay.portrait,
      hp: Math.max(0, unit.hp), maxHp: unit.maxHp, hpColor: frac <= 0.35 ? '#e05a47' : '#5cc46a',
      mp: mpNow ? { mp: mpNow.mp, max: mpNow.max, color: mpNow.lent ? buff.color : '#4f8fe8' } : null,
      ct: active ? 100 : Math.max(0, Math.min(100, Math.round(unit.ct || 0))),
      icons: tags.map(iconUrl).filter(Boolean),
      open: !!this.cardOpen,
    };
    if (!d.open) return d;
    const now = (stat) => unit[stat] + statMod(unit, stat);
    const hexNow = hexOf(unit);
    const speedNow = unit.speed - (hexNow && hexNow.speedLoss ? hexNow.speedLoss : 0);
    const magic = unit.attackType === 'magic';
    const atk = ['ATK', now('attack'), unit.attack], mag = ['MAG', now('magicAttack'), unit.magicAttack];
    const rest = [magic ? atk : mag, ['MDF', now('magicDefense'), unit.magicDefense], ['RNG', unit.range, unit.range]];
    if (unit.contest && isStanceDuel()) rest.push(['POISE', poiseOf(unit) + '/' + engagementRules.poise.max, null]);
    d.pages = [[magic ? mag : atk, ['DEF', now('defense'), unit.defense], ['SPD', speedNow, unit.speed], ['MOV', moveOf(unit), unit.move]], rest];
    d.buffLine = buff ? { text: (buff.effect || buff.name) + ': ' + buff.turnsLeft + ' turn' + (buff.turnsLeft === 1 ? '' : 's') + ' left', color: buff.color } : null;
    d.chips = tags.map((t) => ({ text: t.text, color: t.color, icon: iconUrl(t) }));
    if (!active && unit.alive) { const wait = this.turnsUntil(unit); d.next = wait === 1 ? 'next' : wait ? 'in ' + wait : 'later'; }
    return d;
  }

  // In a stance duel (the clash meter has its bar then): for the HTML clash meter (18.44)
  stanceDuelOn() {
    return isStanceDuel();
  }

  // The skill panel, bottom right (UI rework 16 Nov): shown while a skill is chosen.
  refreshSkillPanel() {
    if (!this.skillLayer || !this.lay) return;
    const L = this.skillLayer;
    L.removeAll(true);
    const id = this.selectedSpell;
    const u = this.activeUnit;
    const show = !!(id && spells[id] && u && u.side === 'hero' && !this.battleOver);
    this.skillTop = this.lay.H;
    if (!show) return;
    const { s, m, W, H, cardW, skillW, portrait, minText } = this.lay;
    const { items, h } = drawSkillPanel(this, id, this.lay.px, this.lay.F);
    L.add(items);
    this.skillPanelH = portrait ? h : Math.round(80 * this.lay.px); // (the HTML panel's box, 18.44)
    this.placeSkillPanel();
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
    prepareLights(mapData); // where the fires are, as the camera sees them (the Hidden Cavern is lit only by fire)
    drawUnderside(this); // the cave floor around the board, or the rock hanging under it
    this.drawBoard();
    drawScenery(this, mapData); // cliffs behind the board, the sigil wall, sandfalls
    drawCavern(this, mapData);  // the Hidden Cavern: its walls, ledge and props, waterfalls, lamps (Phase 11)
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
    if (!g || !this.compassPos) return;
    const cx = this.compassPos.x;
    const cy = this.compassPos.y;
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
    if (this.redrawTelegraphs) this.redrawTelegraphs(); // Singularity's marked tiles follow the camera
    for (const u of this.units) {
      if (!u.view || !u.view.active) continue;
      const p = tileToScreen(u.col, u.row);
      u.view.setPosition(p.x, p.y).setDepth(depthFor(u.col, u.row) + 1);
    }
    for (const d of this.decoys) {
      const p = tileToScreen(d.col, d.row);
      d.view.setPosition(p.x, p.y).setDepth(depthFor(d.col, d.row) + 1);
    }
    for (const sp of this.spikes) {
      if (!sp.view || !sp.view.active) continue;
      const p = tileToScreen(sp.col, sp.row);
      sp.view.setPosition(p.x, p.y).setDepth(depthFor(sp.col, sp.row) + 1); // its base is the tile's middle, like a unit's feet (1.35)
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

    if (this.targetsInRange.length > 0 && (this.mode === 'attack' || this.mode === 'engage' || this.mode === 'spellTarget' || this.mode === 'approach' || this.mode === 'itemTarget')) {
      // The tile of a target behind, covered only by the edge of the figure in
      // front (a shield, a mace, a spear, not its body): the target on the tile
      // (the tile it stands on: the diamond round its feet)
      const onFeet = (u) => Math.abs(x - u.view.x) / (TILE_WIDTH / 2) + Math.abs(y - u.view.y) / (TILE_HEIGHT / 2) <= 1;
      const behind = seen && !this.torsoContains(seen, x, y) && this.targetsInRange.find((u) => u !== seen && onFeet(u));
      const tileWins = !!behind;
      if (tileWins) return at(behind);
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
    // (M10, 17.6: a small dark patch where the feet touch, and a wider soft one that darkens the floor a little)
    const [floorShade, shadow] = figureShadows(this);

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
      ringColor = teamColor(data.side); // (M10: the side's colour from board.json, also the rim round the figure)
      body = this.add.ellipse(0, 2, 62, 28, ringColor, boardRules.ring.fill).setStrokeStyle(boardRules.ring.width, ringColor, boardRules.ring.alpha); // thin and soft (15 Nov)

      // The picture stands on the tile: its feet are at the tile's middle
      sprite = this.add.image(0, 6, frame.key).setOrigin(frame.originX, frame.originY || 1);
      // Every picture of this unit is drawn at one size, set so its TALLEST
      // standing picture is "height" pixels (so it never depends on which way
      // it happens to face first: a side view without the staff overhead is shorter)
      const tallest = Math.max(...standingKeys(data.id).filter((k) => this.textures.exists(k)).map((k) => this.textures.get(k).getSourceImage().height));
      artScale = height / (Number.isFinite(tallest) && tallest > 0 ? tallest : sprite.height);
      // (the size ruler, roadmap 18.2, then corrects single pictures cut too big or too small: frame.scale)
      sprite.setScale(artScale * (frame.scale || 1)).setFlipX(frame.flip);

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
    const barBack = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 5, 0x2a1d12).setOrigin(0, 0.5);
    const hpFill = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 5, 0x6fcf7f).setOrigin(0, 0.5);

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

    // The plate over its head (health bar, number, turn place): hidden until it is hit, tapped
    // or can be targeted (M6, src/nameplate.js)
    const plate = buildPlate(this, { topY, barBack, hpFill, job: data.job, hp: data.hp, maxHp: data.hp });
    // UI rework 16 Nov (his mock-up): a small gold diamond at the bar's left end; an enemy's bar is red
    const tip = this.add.graphics();
    tip.fillStyle(0x120c08, 1).fillPoints([{ x: 0, y: -6 }, { x: 6, y: 0 }, { x: 0, y: 6 }, { x: -6, y: 0 }], true);
    tip.lineStyle(1.5, UI.bronzeLight, 1).strokePoints([{ x: 0, y: -5 }, { x: 5, y: 0 }, { x: 0, y: 5 }, { x: -5, y: 0 }], true);
    tip.setPosition(barBack.x - 9, barBack.y);
    plate.addAt(tip, 0);
    if (data.side !== 'hero') hpFill.setFillStyle(0xd8453a);
    const pieces = [floorShade, shadow, body, sprite, labelText, plate, badgeBack, badgeText, tagRow].filter(Boolean);
    const view = this.add.container(x, y, pieces).setDepth(depthFor(data.col, data.row) + 1);
    // less over the characters (roadmap 8.4): the job badge goes; the profile card says it
    if (usePicture) [badgeBack, badgeText].forEach((o) => o && o.setVisible(false));
    // a rim of light in the side's colour round the figure, so it stands out from the cave (M10, 17.6)
    const rims = sprite ? addRim(this, view, sprite, ringColor) : null;

    // Idle motion: the figure breathes, rising and settling a little, so it
    // never looks frozen. Each unit starts at a different moment.
    // A picture breathes through a number going 0 to 1 and back ("breath"), not through a
    // fixed height: its resting size changes with the picture it shows (the size ruler, 18.2).
    const idleTargets = sprite ? [sprite] : [body, labelText];
    const breath = { v: 0 };
    const idleTween = this.tweens.add({
      targets: sprite ? breath : idleTargets,
      ...(sprite ? { v: 1 } : { scaleX: 1.06, scaleY: 1.08 }),
      duration: 850 + Math.random() * 450,
      delay: Math.random() * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      // (unit.squash: the code walk's footfall squash, see codeWalk.js)
      onUpdate: () => { if (sprite && sprite.active) sprite.scaleY = unit.artScale * (1 + 0.035 * breath.v) * (1 - (unit.squash || 0)); },
    });

    const unit = {
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
      baseScale: artScale,                              // the one size for all this unit's pictures
      frameScale: usePicture ? frame.scale || 1 : 1,    // the size ruler's correction for the picture shown now
      // the size the picture shown now is drawn at, at rest (what squashes and bounces return to)
      get artScale() { return this.baseScale * this.frameScale; },
      ringColor,
      topY,
      centerY,
      hitRadius,
      bodyHalfWidth,
      hpFill,
      plate,
      rims,
      tagRow,
      idleTargets,
      idleTween,
    };
    return unit;
  }

  // ---------- Turns ----------

  // Kofi's Renewal (Infuse in Water, 1.49, 1.51): at the start of the blessed unit's turn it heals a little and
  // loses one weak status. It used to show only a small "+2" word, so it read as "heals nobody"; now it
  // lights the ground and the unit like the herb heal does, and says "Renewal". "wait" delays it past a poison or burn word.
  // True when this skill heals its target: Herbs, or Kofi's Infuse while it would give Renewal (1.65 uses it).
  healsTarget(caster, id) {
    const spell = spells[id];
    if (spell.kind === 'heal') return true;
    return spell.kind === 'infuse' && spell.verses[this.reading(caster).element] === 'renewal';
  }

  // "cast": the first heal, the moment Renewal is given (1.79: it used to wait for the start of the unit's next
  // turn). The Verse's own cast light is already playing then, so only the number and the cure show.
  renewalTick(unit, wait = 0, cast = false) {
    const renewed = tickRenewal(unit, !!unit.engagedWith);
    if (!(renewed.heal > 0 || renewed.cured)) return renewed;
    this.updateHpBar(unit);
    this.time.delayedCall(wait, () => {
      if (!unit.alive) return;
      if (renewed.heal > 0 && cast) this.floatText(unit, '+' + renewed.heal + ' Renewal', '#7fd6c4', { pop: true });
      else if (renewed.heal > 0) {
        const glow = elementOf('heal').glow;
        floorLight(this, unit.view.x, unit.view.y, glow, { size: 1.4, peak: 0.6, ms: 800 });
        lightNearby(this, unit.view.x, unit.view.y - unit.centerY, glow, { radius: 70, peak: 0.6, ms: 600 });
        afterglow(this, unit.view.x, unit.view.y - 8, 'heal', { level: 3, depth: unit.view.depth + 2 });
        buffCastFx(this, unit.view.x, unit.view.y, 'renewal', unit); // his healing spiral rises from the feet (6.63)
        this.floatText(unit, '+' + renewed.heal + ' Renewal', '#7fd6c4', { pop: true });
      }
      if (renewed.cured) this.time.delayedCall(350, () => unit.alive && this.floatText(unit, 'Cured', '#9fdc6a', { rise: 46 }));
    });
    return renewed;
  }

  // Works out who acts next and sets up the screen for their turn.
  startTurn() {
    if (this.battleOver) return;
    hideTip(this);
    if (this.cardOpen === true) this.cardOpen = false; // a new turn: the card is the slim bar again
    // Saved on the device between turns (M16, checklist H2): closing the page loses at most
    // the turn being played. (Tests switch it off with window.__noSave.)
    if (!(typeof window !== 'undefined' && window.__noSave)) writeSave(this);

    for (const u of this.units) if (u.knockPending && !u.knock) u.knockPending = false; // (a push never drawn: its body goes by its tile again, 1.68)
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
    const burned = tickBurn(this.activeUnit); // so does a burn (Layra's Wildfire)
    if (burned > 0) {
      this.updateHpBar(this.activeUnit);
      const burnt = this.activeUnit;
      this.time.delayedCall(poisoned > 0 ? 450 : 0, () => this.floatText(burnt, 'Burn -' + burned, '#ff8a3c', { pop: true }));
    }
    this.renewalTick(this.activeUnit, poisoned > 0 || burned > 0 ? 900 : 0); // Kofi's Renewal heals at the start of the turn (1.49, 1.51)
    this.refreshWater(); // anyone standing in the water is Drenched (roadmap 11.4)
    // Tayo's spikes stand for 2 of his turns, then crumble (roadmap 4.2)
    this.tickSpikes(this.activeUnit);
    this.manualView = false;
    // Fast enemy turns (roadmap 18.11): everything an enemy does on its own turn runs at double
    // speed when the player has asked for it. A hero's turn is always at normal speed.
    this.setSpeed('enemy', this.enemyFast && this.activeUnit.side === 'enemy' ? ENEMY_FAST : 1);
    this.followUnit(this.activeUnit); // the camera turns to whoever acts (roadmap 11.5)
    const wasRooted = isRooted(this.activeUnit);
    clearRooted(this.activeUnit); // Gaha's planted feet: until his next turn
    if (wasRooted && !this.activeUnit.engagedWith) this.showStanding(this.activeUnit); // out of his rooted guard
    if (this.activeUnit.contest) refillPoise(this.activeUnit); // and so does Poise, for fighters
    this.stanceMenu = 'main';
    this.empower = false;
    this.wakeDecoy(this.activeUnit); // a decoy nobody struck is ready to echo her next spell
    this.wakeSmoke(this.activeUnit); // her Smoke Bomb clears and she shows herself (13.26)
    this.activeUnit.weaponSwitched = false; // one free weapon switch a turn (13.29)
    this.activeUnit.gripSwitched = false; // Gadara: one free Reverse Grip a turn (Phase 10)
    this.spellPage = 0; // the skills list opens on its first page
    if (this.activeUnit.attune) this.activeUnit.attune.swapped = false; // Alagara: one free Verse swap a turn
    this.activeUnit.surgeStone = false; // (a Stone Surge lasts only the turn it came in)
    for (const unit of this.units) if (unit.engagedWith) unit.lastEngagedTurn = this.turnCount;
    this.readyCloseWeapons(); // archers: dagger out for a foe next to them, bow otherwise (1.46)
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
    turnBanner(this, this.activeUnit); // a short sweep in the side's colour: whose turn it is (M9, 17.15)

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

    // Gadara's Singularity, cast last turn, resolves now (Phase 10). Then he has his turn (Exposed).
    const king = this.activeUnit;
    if (king.channel) {
      this.busy = true;
      this.resolveSingularity(king, () => {
        this.busy = false;
        if (this.battleOver || !king.alive || this.activeUnit !== king) return;
        this.refreshButtons();
        this.refreshStatus();
        if (king.side === 'enemy') this.time.delayedCall(ENEMY_THINK_MS, () => this.activeUnit === king && this.runEnemyTurn());
      });
      return;
    }

    // An archer who took aim last turn lets the Poison Arrow fly first.
    // Not at a foe that has come right next to her, though: there is no room to draw a bow
    // (13.29). The aim is dropped, and she has her whole turn (her AI then uses the dagger, 1.46).
    const archer = this.activeUnit;
    if (archer.aiming && archer.aiming.target.alive && !archer.engagedWith && distance(archer, archer.aiming.target) <= 1) {
      if (archer.aiming.target.markedBy === archer) archer.aiming.target.markedBy = null;
      archer.aiming = null;
      this.floatText(archer, 'Too close', '#e8d5a8');
      this.showStanding(archer);
      this.refreshStatusTags();
    }
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

    // Enemies play by themselves, after a short pause so you can follow it
    // (0.4 s, it was 0.6: long enough for the camera to reach it, roadmap 18.11).
    if (this.activeUnit.side === 'enemy') {
      this.time.delayedCall(ENEMY_THINK_MS, () => this.runEnemyTurn());
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
    this.stopUnitHold(); hideTip(this); // a turn ending puts any tooltip away
    // a pushed unit is still flying or getting up: the turn ends when it has come to rest
    const wait = (this.knockUntil || 0) - this.time.now;
    if (wait > 0) {
      if (!this.endTurnWaiting) {
        this.endTurnWaiting = true;
        this.time.delayedCall(wait + 20, () => { this.endTurnWaiting = false; this.endTurn(); });
      }
      return;
    }
    this.settleBodies(); // nobody starts a turn standing between two tiles (roadmap 13.47)
    spreadTagRows(this.units);
    // Gaha under a Verse of Stone who didn't move this turn stands his ground
    if (this.activeUnit.alive && settleRooted(this.activeUnit)) this.floatText(this.activeUnit, 'Rooted', '#d9b77a');
    // still in the water: still soaked; out of it: a turn drier (roadmap 11.4)
    if (this.activeUnit.alive) {
      if (this.inWater(this.activeUnit)) applyDrenched(this.activeUnit, terrain.water.drenchedTurns);
      else dryOff(this.activeUnit);
    }
    tickBuff(this.activeUnit); // spells on this unit get one turn shorter
    if (!this.activeUnit.engagedWith && this.activeUnit.alive) this.showStanding(this.activeUnit); // a Verse may have worn off
    // an echo she did not use fades away (a decoy made THIS turn stays, to fool the enemy)
    if (this.decoys.some((d) => d.owner === this.activeUnit && d.woken)) this.removeDecoys(this.activeUnit);
    this.cancelMode();
    this.startTurn();
  }

  // Redraws the turn order across the top: the unit acting now (large), then the next 6.
  // The turn order (roadmap 8.2, 8.14): the unit acting now in his glowing
  // medal, then the next ones. Across the top in portrait; in landscape a
  // column down the left, like Final Fantasy Tactics' Combat Timeline. Each
  // unit also carries its place in the order as a small number over its head.
  refreshTurnStrip() {
    this.turnStripLayer.removeAll(true);
    const { m, W, stripR, px: P } = this.lay;
    const D = (n) => Math.round(n * P);
    const y = this.stripY;
    // His mock-up: one row of round faces under the title. The one acting now is bigger, in his
    // glowing medal, with a small gold arrow either side; then each fighter once, in the order of
    // their next turn (M7, 17.7), as many as fit left of the turn panel.
    const r = Math.round(stripR * 0.66); // the next ones smaller (18.44)
    const step = 2 * r + D(8);
    const startX = m + D(11) + stripR;
    const room = W - m - (this.turnGeo ? this.turnGeo.w : D(118)) - D(10) - (startX + stripR + D(12));
    const count = Math.max(2, Math.min(7, Math.floor(room / step)));
    const lineup = [this.activeUnit];
    for (const u of previewTurns(this.units, this.units.length * 3)) if (!lineup.includes(u) && lineup.length <= count) lineup.push(u);
    this.stripLineup = lineup;
    const arrows = this.add.graphics();
    const a = D(3);
    // where each part is, for the HTML strip (18.44, src/domHud.js)
    const geo = { y, arrows: [], medals: [] };
    const arrow = (x) => { geo.arrows.push(x); arrows.fillStyle(0xe4c27c, 0.95).fillTriangle(x - a, y - a * 1.5, x + a, y, x - a, y + a * 1.5); };
    arrow(m + a);
    let x = startX;
    lineup.forEach((unit, i) => {
      geo.medals.push({ x, r: i === 0 ? stripR : r - 2 });
      const now = i === 0;
      const medal = now
        ? medalPortrait(this, x, y, stripR, unit, portraitKey(unit.id, unit), { active: true })
        : portraitMedallion(this, x, y, r - 2, unit, portraitKey(unit.id, unit), { active: false });
      this.turnStripLayer.add(medal);
      if (now) {
        arrow(x + stripR + D(6));
        x += stripR + D(12) + r;
      } else x += step;
    });
    const endX = x - step + r + D(7);
    arrow(endX);
    this.turnStripLayer.add(arrows);
    if (this.stripLine) this.stripLine.clear().lineStyle(1, 0xc9a35a, 0.45).lineBetween(m, y + stripR + D(4), endX + D(14), y + stripR + D(4));
    Object.assign(geo, { lineX0: m, lineX1: endX + D(14), lineY: y + stripR + D(4) });
    this.stripGeo = geo;
    this.refreshUnitList();
    this.ui(this.turnStripLayer);
    if (this.turnText) this.turnText.setText(String(Math.max(1, this.turnCount)).padStart(2, '0'));
    this.refreshTileInfo();
    this.refreshOrderNumbers();
  }

  // How many turns from now a unit acts (1 = the very next turn), or 0 if
  // it is further off than the preview looks.
  turnsUntil(unit) {
    const next = previewTurns(this.units, this.units.length * 2);
    return next.indexOf(unit) + 1;
  }

  // The small number over each unit's head: its place in the turn order
  // (the unit acting now has the gold marker instead). Roadmap 8.14.
  refreshOrderNumbers() {
    const next = previewTurns(this.units, this.units.length * 2);
    for (const u of this.units) {
      if (!u.view || !u.view.active) continue;
      if (!u.orderNumber) {
        u.orderNumber = this.add.text(-BAR_WIDTH / 2 - 9, -u.topY, '', { fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold', color: '#ffe08a', stroke: '#1a1410', strokeThickness: 4 }).setOrigin(0.5);
        (u.plate || u.view).add(u.orderNumber); // on the plate: it shows and hides with the health bar (M6)
      }
      const place = next.indexOf(u);
      const show = u.alive && u !== this.activeUnit && place >= 0;
      u.orderNumber.setVisible(show).setText(show ? String(place + 2) : '');
    }
  }

  // Down the left side (UI rework 16 Nov): every fighter as a small diamond, heroes first, in
  // hero teal and enemy red; the one acting now has a gold edge, the fallen are dimmed.
  // A tap on one shows its card (as a tap on the figure does).
  refreshUnitList() {
    const L = this.unitListLayer;
    if (!L) return;
    L.removeAll(true);
    this.listGeo = [];
    const { m, portrait, H, px: P } = this.lay;
    if (portrait) return; // (Baiyee 16 Nov: on a phone the board needs the room; his phone mock-up has no list)
    const D = (n) => Math.round(n * P);
    const d = D(15); // half the diamond's height (18.44: bigger)
    const gap = D(5);
    const list = [...this.units.filter((u) => u.side === 'hero'), ...this.units.filter((u) => u.side !== 'hero')];
    const y0 = this.stripY + this.lay.stripR + D(16) + d;
    const x = m + d + D(2);
    list.forEach((u, i) => {
      const y = y0 + i * (2 * d + gap);
      if (y > (this.cardTop || H) - d - D(8)) return; // (above the card)
      this.listGeo.push({ id: u.id, unit: u, x, y, d, state: (u.side === 'hero' ? 'hero' : 'enemy') + (u === this.activeUnit ? ' now' : '') + (u.alive ? '' : ' dead') });
      const g = this.add.graphics();
      const pts = (k) => [{ x, y: y - d - k }, { x: x + d + k, y }, { x, y: y + d + k }, { x: x - d - k, y }];
      g.fillStyle(0x000000, 0.35).fillPoints(pts(D(2)), true);
      const img = this.add.image(x, y, diamondPortrait(this, u, portraitKey(u.id, u), 96)).setDisplaySize(2 * d, 2 * d);
      const edge = this.add.graphics();
      edge.lineStyle(Math.max(1, P), u === this.activeUnit ? 0xffe08a : u.side === 'hero' ? 0x5fc2b8 : 0xd8604a, 0.95).strokePoints(pts(0.5), true);
      if (!u.alive) { img.setAlpha(0.3).setTint(0x777777); edge.setAlpha(0.35); }
      const hit = this.add.zone(x, y, Math.max(2 * d, this.lay.minTap * 0.8), 2 * d + gap).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => { if (u.alive && !this.busy) this.inspect(u); });
      L.add([g, img, edge, hit]);
    });
    this.ui(L);
  }

  // Top right: the ground and height of the tile in focus (the target being
  // looked at, else the unit whose turn it is), as in his mockup.
  refreshTileInfo() {
    if (!this.tileText || !this.activeUnit) return;
    const t = this.hoverTile || this.pendingTarget || (this.approach && this.approach.tile) || this.activeUnit; // (the tile under the mouse first, M8)
    const ground = groundName(terrainAt(mapData, t.col, t.row));
    this.tileText.setText(ground);
    const gc = groundColors(terrainAt(mapData, t.col, t.row));
    this.tileInfo = { ground, elev: 'ELEV ' + String(getHeight(t.col, t.row)).padStart(2, '0'), top: gc.top, side: gc.side }; // (for the HTML panel, 18.44)
    if (this.elevText) this.elevText.setText('ELEV ' + String(getHeight(t.col, t.row)).padStart(2, '0'));
    // and a small picture of that ground (UI rework 16 Nov)
    if (this.tilePic && this.tilePicAt) {
      const c = groundColors(terrainAt(mapData, t.col, t.row));
      const p = this.tilePicAt;
      tileBlock(this.tilePic.clear(), p.x, p.y, p.w, c.top, c.side);
    }
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
        unit.body.setStrokeStyle(boardRules.ring.width, unit.ringColor, boardRules.ring.alpha);
      }
    }
  }

  // Updates the line of text under the board.
  // What the chosen skill will do, drawn on the board between the first tap and
  // the second (roadmap 18.4, checklist G4): where the unit ends up, who is hit,
  // where a pushed unit lands. Redrawn whenever the choice changes; gone when
  // nothing is being chosen. The drawing is in src/preview.js.
  refreshPreview() {
    for (const o of this.previewItems || []) { this.tweens.killTweensOf(o); o.destroy(); }
    this.previewItems = [];
    this.previewPlan = null;
    const unit = this.activeUnit;
    if (this.battleOver || this.busy || !unit || unit.side !== 'hero') return;
    let plan = null;
    if (this.mode === 'spellTarget' && this.pendingTarget) plan = planSkill(this, unit, this.pendingTarget, this.selectedSpell);
    else if (this.mode === 'attack' && this.pendingTarget) plan = planAttack(this, unit, this.pendingTarget);
    else if (this.mode === 'huskTile' && this.pendingTile) plan = planHusk(this, unit, this.pendingTile);
    if (!plan) return;
    this.previewPlan = plan; // (tests and the browser check read this)
    this.previewItems = drawPlan(this, unit, plan);
  }

  refreshStatus() {
    this.refreshPreview();
    this.refreshSkillPanel();
    // only the one being tapped shows its health while a target is chosen (16 Nov: with the bars set to "when hit" it
    // used to show every foe in range); pointing at one with the mouse flashes it too (boardMove). Hides again when it is let go.
    for (const u of this.units || []) holdPlate(this, u, TARGET_MODES.includes(this.mode) && u === this.pendingTarget);
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
      const wet = drenchedEffect(unit, target);
      if (wet) notes.push(wet === 'more' ? 'Drenched: lightning hits harder' : 'Drenched: fire does less');
      const atk = this.attackMove(unit);
      const fire = atk !== 'attack' && spells[atk].element === 'fire';
      const next = fire || (unit.reading && !(atk !== 'attack' && spells[atk].jump)) ? null : chainTarget(unit, target, this.units); // fire doesn't jump; Kofi's bolt jumps only as a Gale Bolt
      const jump = next ? ' Jumps to ' + next.name + ' for ' + chainDamage(unit, next) + '.' : '';
      const verse = atk === 'attack' ? '' : spells[atk].push ? ' Knocked back a tile.' : fire ? (isDrenched(target) ? ' Too wet to catch fire.' : ' Sets it alight: ' + spells[atk].burn + ' a turn for ' + spells[atk].turns + ' turns.') : spells[atk].drench ? ' Leaves it Drenched.' : '';
      text =
        (atk !== 'attack' ? spells[atk].button + ' at ' : '') + target.name + ': ' + getHitChance(unit, target) + '% to hit, ' +
        getDamage(unit, target) + ' damage' + (notes.length ? ' (' + notes.join(', ') + ')' : '') + '.' + jump + verse +
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
      // Kofi: the bolt he would fire from THAT tile (1.50), named, since the ground there may read differently
      const atk = this.attackMove(unit, a.tile);
      const bolt = atk !== 'attack' && unit.reading ? spells[atk] : null;
      const next = unit.reading && !(bolt && bolt.jump) ? null : chainTarget(from, a.target, this.units);
      const jump = next ? ' Jumps to ' + next.name + ' for ' + chainDamage(unit, next) + '.' : '';
      const boltText = bolt ? bolt.button + ' from there' + (bolt.element === 'fire' ? (isDrenched(a.target) ? ' (too wet to catch fire)' : ' (sets it alight)') : bolt.drench ? ' (leaves it Drenched)' : bolt.push ? ' (knocks it back)' : '') + '. ' : '';
      text = boltText +
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
    } else if (this.mode === 'item') {
      text = 'Choose an item (it takes your action)' + (this.sitesNear(unit).length ? '\nSomething is buried or dropped close by: tap Dig up.' : '');
    } else if (this.mode === 'itemTarget' && this.pendingTarget) {
      const it = ITEMS[this.selectedItem];
      text = it.name + (this.pendingTarget === unit ? ' on yourself' : ' on ' + this.pendingTarget.name) + ': ' + it.text + ' Tap again.';
    } else if (this.mode === 'itemTarget') {
      const it = ITEMS[this.selectedItem];
      text = it.name + ': ' + it.text + '\nTap a green tile (yours or an ally next to you), or tap ' + it.name + ' again for yourself.';
    } else if ((this.mode === 'spell' || this.mode === 'rest') && this.selectedSpell) {
      const spell = spells[this.selectedSpell];
      text = 'Tap ' + spell.button + ' again.'; // what it does is on the skill panel now (UI rework 16 Nov); a long press gives the full text
    } else if (this.mode === 'spell' && (isMelee(unit) || !unit.maxMp)) {
      // MP a Verse lent him (Layra's, or Kofi's Infuse). Once his changed move has spent it, the line says so instead
      // of "0 MP from the Verse of Fury" (roadmap 1.52: the misleading MP line seen after an Infuse).
      const lent = mpShown(unit);
      const verse = lent && lent.lent && buffOf(unit) ? buffOf(unit).name : null;
      text = 'Choose a skill' + (verse ? (lent.mp > 0 ? '  (' + lent.mp + ' MP from the ' + verse + ')' : '  (the ' + verse + "'s MP is spent)") : '');
    } else if (this.mode === 'spell') {
      text = (this.spellGroup ? 'Choose from the ' + this.spellGroup : 'Choose a Verse') + '  (' + unit.mp + ' MP)';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'throw') {
      const t = this.pendingTarget;
      const extra = this.spellReach(unit, t, spells.spearThrow) - spells.spearThrow.range;
      text =
        'Spear Throw at ' + t.name + ': ' + getHitChance({ ...unit, range: 3 }, t) + '% to hit, ' + getDamage(unit, t) +
        ' damage, knocked back a tile' + (extra > 0 ? ' (+' + extra + ' reach from high ground)' : '') + '.\nTap again to throw.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'charge') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      const effect = sp.effect || 'lock';
      const ally = t.engagedWith && t.engagedWith.side === unit.side ? t.engagedWith : null;
      const what =
        effect === 'knockback' ? 'knocked back ' + sp.push + ' tiles'
        : effect === 'stun' ? 'stunned 1 turn'
        : effect === 'strike' ? 'full force, no clash'
        : canBeCaught(t) ? 'locked in a clash with you' + (ally ? ', and ' + ally.name + ' is free' : '')
        : 'too slippery to lock in a clash';
      text = sp.button + ' at ' + t.name + ': ' + this.skillHit(unit, t, sp) + ' damage, ' + what + '.' + (sp.verse ? ' Uses ' + sp.mp + ' MP.' : '') + '\nTap again to charge.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'lunge') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      const spot = this.lungeSpot(unit, t, sp);
      const run = spot ? spot.path.length : 0;
      text = 'Lunge at ' + t.name + ': run ' + run + ' tile' + (run === 1 ? '' : 's') + ', then Thrust ' + getHitChance(unit, t) + '% to hit, ' + (getDamage(unit, t) + run * sp.bonusPerTile) + ' damage (+' + run * sp.bonusPerTile + ' from the run).\nTap again to lunge.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'dive') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      const spot = this.sweepSpot(unit, t);
      const shaken = spot ? this.units.filter((u) => u.alive && u.side !== unit.side && distance(u, spot) === 1).map((u) => u.name) : [];
      text = sp.button + ' on ' + t.name + ': ' + Math.max(1, Math.round(getDamage(unit, t) * sp.damageShare)) + ' damage' + (shaken.length ? ', and ' + shaken.join(' and ') + ' knocked Off-Balance' : '') + '. Uses ' + sp.mp + ' MP.\nTap again to leap.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'javelin') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      const plan = this.javelinForm(unit, t, sp);
      if (plan.form === 'sweep') {
        text = 'Sonic Javelin: zip to ' + t.name + ' (reeling) and sweep low: ' + Math.round(getDamage(unit, t) * sp.sweepShare) + ' damage.';
      } else if (plan.form === 'whirl') {
        text = 'Sonic Javelin: dash in and whirl down on ' + t.name + ': ' + getDamage(unit, t) + ' damage, knocked back a tile.';
      } else {
        const hits = this.javelinLine(unit, t, sp).hits;
        text = hits.length > 1
          ? 'Sonic Javelin through ' + hits.map((u) => u.name).join(' and ') + ': ' + hits.map((u) => getDamage(unit, u)).join(' and ') + ' damage, each knocked back a tile.'
          : 'Sonic Javelin at ' + t.name + ': ' + getDamage(unit, t) + ' damage, knocked back a tile.';
      }
      text += ' Never misses, ' + sp.mp + ' MP. Tap again.';
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
      // what this Verse would change for that unit (roadmap 3.2): a move, or a way of fighting
      const t = this.pendingTarget;
      const extras = [];
      if (spell.kind === 'buff') {
        for (const m of verseMovesOf(t, this.selectedSpell)) {
          const base = spells[m].verse.of === 'attack' ? t.attackName : spells[spells[m].verse.of].button;
          extras.push(base + ' becomes ' + spells[m].button + '.');
        }
        for (const key of ['stillGuard', 'freeClimb']) {
          const e = spell[key];
          if (e && (!e.jobs || e.jobs.includes(t.job))) extras.push(e.text);
        }
      }
      text =
        spell.name + ' on ' + t.name + ' (' + useText(spell) + '). Tap again.\n' +
        (double ? 'Double effect on ' + spell.affinity.who + '! ' : '') + spell.text + (extras.length ? ' ' + extras.join(' ') : '');
    } else if (this.mode === 'spellTarget' && spells[this.selectedSpell].kind === 'heal') {
      const self = this.targetsInRange.includes(unit);
      text = (self ? 'Tap Herbs again to use them on yourself,\nor tap a green tile to heal an ally.' : 'Tap a green tile to heal an ally.');
    } else if (this.mode === 'spellTarget') {
      const kind = spells[this.selectedSpell].kind;
      text = 'Tap a lit tile: who gets ' + spells[this.selectedSpell].name + '?'; // (the tiles are in the skill's colour)
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
      // Kofi: what he reads here, so the player knows what his spells will do
      if (unit.reading) { const read = this.reading(unit); text += '\nReads ' + READ_NAMES[read.element] + (read.points ? ' ' + read.points : ' (faint)') + ': ' + spells[this.readingMove(unit)].name; }
    }

    this.statusText.setText(text);
    this.fitStatus();
    this.refreshButtons();

    // The card shows the target being chosen, a unit being looked at, or whoever is acting
    if (this.pendingTarget) this.refreshCard(this.pendingTarget, true);
    else if (this.viewing) this.refreshCard(this.viewing, true);
    else this.refreshCard(unit);
  }

  // The four commands change with the situation.
  // Fills in the commands for the unit whose turn it is, then lays out the menu.
  refreshButtons() {
    this.setButtons();
    this.layoutMenu();
  }

  setButtons() {
    const unit = this.activeUnit;
    const isHero = unit.side === 'hero';
    const free = isHero && !unit.hasActed;
    const [a, b, c, d] = this.slots;
    for (const half of [...this.halves, ...this.lowHalves]) half.set(null); // half buttons: only in some situations (below)

    if (this.battleOver) {
      for (const slot of this.slots) slot.set(null);
      return;
    }

    // Choosing an item (or Dig up): the bag, three buttons at a time, and Back
    if (isHero && (this.mode === 'item' || this.mode === 'itemTarget')) {
      const entries = this.itemMenu(unit);
      const paged = entries.length > 3;
      const shown = paged ? entries.slice(this.itemPage * 2, this.itemPage * 2 + 2) : entries;
      [a, b].forEach((slot, i) => {
        const e = shown[i];
        if (e) slot.set(e.label, 'bag', e.enabled, e.onTap, { selected: e.selected, accent: e.accent, tip: e.tip });
        else slot.set(null);
      });
      if (paged) c.set('More  >', 'gem', true, () => { this.itemPage = (this.itemPage + 1) % Math.ceil(entries.length / 2); this.refreshStatus(); });
      else if (shown[2]) c.set(shown[2].label, 'bag', shown[2].enabled, shown[2].onTap, { selected: shown[2].selected, accent: shown[2].accent });
      else c.set(null);
      d.set('Back', 'back', true, () => this.itemBack());
      return;
    }

    // Choosing a spell: the spells (or groups of spells, like Verse) and Back
    if (isHero && (this.mode === 'spell' || this.mode === 'spellTarget' || this.mode === 'huskTile')) {
      const entries = this.spellMenu(unit);
      // more than three (the kings): two at a time and More (like the bag)
      const paged = entries.length > 3;
      const pages = Math.ceil(entries.length / 2);
      const page = paged ? (this.spellPage || 0) % pages : 0;
      const shown = paged ? entries.slice(page * 2, page * 2 + 2) : entries;
      [a, b, c].forEach((slot, i) => {
        const e = shown[i];
        if (paged && i === 2) slot.set('More  >', 'gem', true, () => { this.spellPage = (page + 1) % pages; this.refreshStatus(); });
        else if (e) slot.set(e.label, 'gem', e.enabled, e.onTap, { selected: e.selected, accent: e.accent, tip: e.tip, emblem: e.emblem, ring: e.ring, el: e.el });
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
      // Break Away is a roll (BATTLE_SYSTEMS 4): the row shows the chance to get free, worked out before he picks it
      // (roadmap 1.67), with Empower counted when it is switched on
      const breakLabel = 'Break away  ' + breakChance(unit, unit.engagedWith, CONTEST_CTX, this.empower && poiseOf(unit) > 0) + '%';
      // Auto (the default): one Fight button picks the stance for you
      if (this.stanceChoice === 'auto' && !doneAlready) {
        const pick = this.autoStanceFor(unit);
        a.set('Fight: ' + stanceName(pick) + star(pick), 'press', free, () => this.onStance(pick), { accent: ENGAGE_COLOR, selected: this.empower });
        b.set(breakLabel, 'run', free, () => this.onStance('break'));
        c.set('Empower  ' + poiseOf(unit) + ' Poise', 'gem', free && poiseOf(unit) > 0, () => this.toggleEmpower(), { selected: this.empower, accent: 0xffd27a });
        d.set('Manual  >', 'gem', isHero, () => this.setStanceChoice('manual'));
        return;
      }
      if (this.stanceMenu === 'more' && !doneAlready) {
        a.set('Auto mode', 'star', isHero, () => this.setStanceChoice('auto'), { accent: GOLD });
        b.set(breakLabel, 'run', free, () => this.onStance('break'));
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
      a.set(label, 'walk', isHero && left > 0, () => this.onMoveButton(), { selected: this.mode === 'move' });
    }
    const weaponIcon = unit.attackType === 'magic' ? 'lightning' : unit.jobName === 'Spearman' ? 'spear' : 'sword';
    // a Verse can change the attack itself (Layra: Thunderclap under Stone, Wildfire under Fury)
    const atk = this.attackMove(unit);
    const atkName = atk !== 'attack' ? spells[atk].button : unit.attackName;
    const atkAccent = atk !== 'attack' ? Phaser.Display.Color.HexStringToColor(spells[atk].color).color : unit.attackType === 'magic' ? 0x9fd4ff : 0xff8a6a;
    b.set(atkName, weaponIcon, free, () => this.onAttackButton(), { shown: atk === 'attack' ? 'Attack' : null, selected: this.mode === 'attack', accent: atkAccent, tip: atk !== 'attack' ? spellTip(atk) : { title: atkName, body: buttonTip('Attack').body } });
    if (isMelee(unit) && unit.spells && unit.spells.length > 0) {
      // a fighter with skills (Spear Throw, Herbs): Engage and Skills share the row
      c.set(null);
      this.halves[0].set('Engage', 'charge', free && engageTargets(unit, this.units).length > 0, () => this.onEngageButton(), {
        selected: this.mode === 'engage',
        accent: ENGAGE_COLOR,
      });
      this.halves[1].set('Skills', 'star', free, () => this.onSpellButton(), { accent: GOLD });
    } else if (isMelee(unit)) {
      c.set('Engage', 'charge', free && engageTargets(unit, this.units).length > 0, () => this.onEngageButton(), {
        selected: this.mode === 'engage',
        accent: ENGAGE_COLOR,
      });
    } else if (unit.spells && unit.spells.length > 0) {
      // A caster's magic is her Verses (Suleiman, 31 Oct: Blessings and Hexes);
      // a rest like Meditate gets its own row next to it (roadmap 8.10, 8.11)
      const word = unit.maxMp > 0 ? 'Verses' : 'Skills';
      const rest = unit.spells.find((id) => spells[id].kind === 'rest');
      if (rest) {
        c.set(null);
        this.halves[0].set(word, 'star', free, () => this.onSpellButton(), { accent: GOLD });
        const r = spells[rest];
        this.halves[1].set(r.button, 'hourglass', free && canAfford(unit, rest), () => this.chooseSpell(rest), { selected: this.selectedSpell === rest, accent: Phaser.Display.Color.HexStringToColor(r.color).color });
      } else if (unit.closeWeapon) {
        // an archer: Skills and Switch weapon share the row (roadmap 13.29)
        c.set(null);
        this.halves[0].set(word, 'star', free, () => this.onSpellButton(), { accent: GOLD });
        this.halves[1].set(holdsDagger(unit) ? 'To bow' : 'To dagger', 'sword', isHero && !this.busy && !unit.engagedWith && !unit.weaponSwitched, () => this.onSwitchWeaponButton(), { accent: 0xd9b77a });
      } else {
        c.set(word, 'star', free, () => this.onSpellButton(), { accent: GOLD }); // no MP pool: skills, not spells
      }
    } else {
      c.set(null);
    }
    // Row 4: Items | End turn. Items needs something in the bag or something to dig up nearby.
    d.set(null);
    const hasItems = heldItems(unit).length > 0 || this.sitesNear(unit).length > 0;
    this.lowHalves[0].set('Items', 'bag', free && hasItems, () => this.onItemsButton(), { accent: GOLD });
    this.lowHalves[1].set('End turn', 'hourglass', isHero, () => this.onEndButton());
  }

  // Shows a unit's card for a few seconds, when the player taps it.
  inspect(unit) {
    play('select');
    this.viewing = unit;
    flashPlate(this, unit, plateRules.tapMs); // tapped: its health shows for as long as its card
    this.statusText.setText(unit.name + ' (' + unit.jobName + ')' + (unit.contest ? ', ' + STYLE_NAMES[styleOf(unit)] + ' style' : ''));
    this.refreshCard(unit, true);
    if (this.inspectTimer) this.inspectTimer.remove();
    this.inspectTimer = this.time.delayedCall(4000, () => {
      this.viewing = null;
      this.refreshStatus();
    });
  }

  // The info card, bottom right: it grows to fit its text (up to a limit,
  // then the words get smaller) and hides when there is nothing to say.
  fitStatus() {
    const t = this.statusText;
    if (!t || !this.lay) return;
    const { W, H, m, infoW, portrait, F } = this.lay;
    // His mock-up has no hint box: the hint is a faint line of small text just above the unit card
    // (Baiyee 16 Nov), with a dark edge so it reads on the board. A long one wraps to a second line.
    const turnLine = /^(Your|Enemy) turn: /.test(t.text);
    t.setFontSize(F.mid).setStyle({ stroke: '#0b0806', strokeThickness: Math.max(2, Math.round(3 * this.lay.px)) });
    t.setWordWrapWidth(infoW);
    t.setColor('#efe3c2');
    this.infoText = t.text;
    this.infoPanel.clear();
    if (!t.text) {
      this.infoTop = H;
      return;
    }
    const x = portrait ? m : Math.round((W - t.width) / 2);
    const y = Math.min(this.cardTop, H - m - this.cardClosedH(), portrait && this.selectedSpell ? this.skillTop || H : H) - Math.round(5 * this.lay.px) - t.height;
    t.setPosition(Math.round(x), Math.round(y));
    this.infoTop = y;
    // fade: shown once per turn, gone after 2 seconds
    const key = this.turnCount + ':' + (this.activeUnit && this.activeUnit.id);
    if (turnLine && key !== this.turnLineKey) {
      this.turnLineKey = key; this.turnLineGone = false;
      if (this.turnLineTimer) this.turnLineTimer.remove();
      this.turnLineTimer = this.time.delayedCall(2000, () => {
        this.turnLineGone = true;
        this.tweens.add({ targets: [t, this.infoPanel], alpha: 0, duration: 300 });
      });
    }
    const hide = turnLine && this.turnLineGone;
    if (!hide) this.tweens.killTweensOf([t, this.infoPanel]);
    t.setAlpha(hide ? 0 : 0.85);
    this.refreshTileInfo();
  }

  // Shows a short message in the status line, then goes back to normal.
  showMessage(text) {
    this.statusText.setText(text);
    this.fitStatus();
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
      this.showMessage(isBlinded(unit) ? 'Blinded: you cannot see to grab anyone' : 'No enemy fighter next to you');
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

  // ---------- Items (roadmap Phase 5) ----------

  onItemsButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver || unit.hasActed) return;
    this.cancelMode();
    this.mode = 'item';
    this.refreshStatus();
  }

  // The buttons in the Items menu: each kind in the bag, then Dig up when
  // something is buried or dropped within reach.
  itemMenu(unit) {
    const list = heldItems(unit).map((id) => ({
      label: ITEMS[id].name + '  x' + unit.bag[id],
      enabled: !this.busy && this.itemTargets(unit, id).length > 0,
      onTap: () => this.chooseItem(id),
      selected: this.selectedItem === id,
      accent: Phaser.Display.Color.HexStringToColor(ITEMS[id].color).color,
      tip: { title: ITEMS[id].name, body: ITEMS[id].text },
    }));
    if (this.sitesNear(unit).length > 0) {
      list.push({ label: 'Dig up', enabled: !this.busy, onTap: () => this.digHere(), selected: false, accent: 0xe4c27c });
    }
    return list;
  }

  // Who an item could go to: the unit itself or an ally next to it, if it would help them.
  // Who an item can go to: an ally next to the user (or the user). Nobody locked in a clash uses or is handed
  // an item, hero or enemy (roadmap 1.65, Suleiman 17 Nov: "he can't be healing during clash").
  itemTargets(unit, id) {
    if (unit.engagedWith) return [];
    return this.units.filter((u) => u.alive && u.side === unit.side && !u.engagedWith && distance(unit, u) <= 1 && itemHelps(u, id));
  }

  chooseItem(id) {
    const unit = this.activeUnit;
    if (this.selectedItem === id && this.mode === 'itemTarget' && this.targetsInRange.includes(unit)) {
      // tapped a second time: use it on yourself
      this.pendingTarget = unit;
      this.confirmItem();
      return;
    }
    const targets = this.itemTargets(unit, id);
    if (targets.length === 0) {
      this.showMessage(ITEMS[id].name + ' would do nothing for anyone next to you');
      return;
    }
    play('select');
    this.clearHighlights();
    this.pendingTarget = null;
    this.selectedItem = id;
    this.mode = 'itemTarget';
    this.targetsInRange = targets;
    this.showHighlights(targets.map((t) => ({ col: t.col, row: t.row })), 0x9fdc8a);
    this.refreshOutlines();
    this.refreshStatus();
  }

  itemBack() {
    if (this.mode === 'itemTarget') {
      play('cancel');
      this.clearHighlights();
      this.pendingTarget = null;
      this.selectedItem = null;
      this.targetsInRange = [];
      this.mode = 'item';
      this.refreshOutlines();
      this.refreshStatus();
      return;
    }
    this.cancelMode();
  }

  confirmItem() {
    const user = this.activeUnit;
    const target = this.pendingTarget || user;
    const id = this.selectedItem;
    this.cancelMode();
    this.busy = true;
    const done = () => {
      this.busy = false;
      this.refreshStatus();
    };
    this.safeAction(() => this.useItem(user, target, id, done), done);
  }

  // Runs a hero's action (a skill, an attack, an item) so that a mistake inside it can never freeze the game
  // (roadmap 1.59: Gaha's Lunge threw on 16 Nov, the turn stayed busy and every button vanished for good).
  // If starting the action throws, the error goes to the console, any cut-in ends, and done() runs, so the
  // game is calm again and the menu comes back. The action still counts as used.
  safeAction(start, done) {
    try {
      start();
    } catch (e) {
      console.error('Fabien: an action failed and was stopped safely', e);
      this.endCinematic();
      done();
    }
  }

  // Uses one item: it takes the user's action. Works for heroes and enemies.
  useItem(user, target, id, onDone) {
    const it = ITEMS[id];
    user.hasActed = true;
    const out = applyItem(target, id, user);
    if (target !== user) this.faceToward(user, target.view.x - user.view.x, target.view.y - user.view.y);
    play('spell');
    buffAura(this, target.view.x, target.view.y, Phaser.Display.Color.HexStringToColor(it.color).color);
    const say = (text, delay = 0) => this.time.delayedCall(delay, () => this.floatText(target, text, it.color, { pop: true }));
    this.floatText(user, it.name, '#f1e6c8', { rise: 30 });
    if (out.heal) say('+' + out.heal, 250);
    if (out.mp) say('+' + out.mp + ' MP', 250);
    if (out.poise) say('Poise full', 250);
    if (out.cured) say('Cured', 450);
    this.updateHpBar(target);
    this.refreshStatusTags();
    this.refreshButtons();
    if (target.lowGlow && target.hp / target.maxHp > 0.3) {
      target.lowGlow.destroy();
      target.lowGlow = null;
    }
    this.time.delayedCall(1000, onDone);
  }

  // Dig up what is buried or dropped within reach (the nearest first). Takes the action.
  digHere() {
    const unit = this.activeUnit;
    const sites = this.sitesNear(unit).sort((a, b) => distance(unit, a) - distance(unit, b));
    if (sites.length === 0 || this.busy) return;
    this.cancelMode();
    this.busy = true;
    this.digUp(unit, sites[0], () => {
      this.busy = false;
      this.refreshStatus();
    });
  }

  digUp(unit, site, onDone) {
    unit.hasActed = true;
    site.dug = true;
    for (const id of site.items) giveItem(unit, id);
    const at = tileToScreen(site.col, site.row);
    if (site.col !== unit.col || site.row !== unit.row) this.faceToward(unit, at.x - unit.view.x, at.y - unit.view.y);
    play('select');
    if (site.sprite) this.tweens.add({ targets: site.sprite, alpha: 0, y: '-=14', duration: 500, onComplete: () => site.sprite && site.sprite.destroy() });
    this.floatText(unit, 'Found ' + site.items.map((id) => ITEMS[id].name).join(', '), '#ffe08a', { rise: 40 });
    this.refreshButtons();
    this.time.delayedCall(900, onDone);
  }

  // A fallen unit leaves what it carried in a satchel on its tile.
  dropBag(unit) {
    const items = [];
    for (const id of Object.keys(unit.bag || {})) for (let i = 0; i < unit.bag[id]; i++) items.push(id);
    if (items.length === 0) return;
    unit.bag = {};
    const site = { col: unit.col, row: unit.row, prop: 'bag', items, blocking: false, dug: false, sprite: null };
    this.sites.push(site);
    this.time.delayedCall(700, () => {
      if (site.dug) return;
      drawSite(this, site);
      if (site.sprite) this.boardObjects.push(site.sprite);
    });
  }

  // The buttons in the spell menu. Spells that share a "group" in spells.json
  // (like the three Verses) sit behind one button that opens them.
  spellMenu(unit) {
    // While a Verse is on the unit, a move it changes shows as the changed move
    // (Intercept as Shield Ram, Spear Throw as Sonic Javelin): roadmap 3.2
    const entry = (baseId) => {
      const id = activeMove(unit, baseId);
      const spell = spells[id];
      const wait = spell.verse ? 0 : cooldownOf(unit, id);
      const left = usesLeft(unit, id); // pouches left this battle (Herbs), or null
      // the kings (Phase 10): why a skill cannot be used now (Fork end, Mask 3/6, once a turn...)
      const block = this.kingBlock(unit, id);
      const free = spell.kind === 'grip' ? '  to ' + (unit.grip === 'blade' ? 'Fork' : 'Blade') : '';
      return {
        label: spell.button + free + (left !== null && spell.kind !== 'singularity' ? ' x' + left : '') + (wait ? '  (' + wait + ')' : block ? '  ' + block : spell.mp ? '  ' + spell.mp + ' MP' : ''),
        enabled: canAfford(unit, id) && !block && !this.busy,
        onTap: () => this.chooseSpell(id),
        selected: this.selectedSpell === id,
        accent: Phaser.Display.Color.HexStringToColor(spell.color).color,
        tip: spellTip(id), // long press: what the skill does (13.49)
        emblem: emblemFor(id), // his emblem, on a ring in the skill's colour (UI rework 16 Nov)
        el: skillElement(id), // a small icon by element in the HTML list (20 Nov polish)
        ring: Phaser.Display.Color.HexStringToColor(spell.color).color,
      };
    };
    if (this.spellGroup) return unit.spells.filter((id) => spells[id].group === this.spellGroup).map((id) => entry(id));

    const list = [];
    const seen = new Set();
    for (const id of unit.spells) {
      if (spells[id].kind === 'rest') continue; // Meditate has its own row on the main menu (8.10)
      if (spells[id].reaction) continue; // Alagara's Unmoved happens by itself
      if (spells[id].grip && spells[id].grip !== unit.grip) continue; // Gadara: only the skills of the end he holds
      if (spells[id].verseSkill && this.kingBlock(unit, id)) continue; // Alagara: a Verse skill only with its Verse
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
          emblem: group === 'Hexes' ? 'hexes' : group === 'Blessings' ? 'blessings' : 'skills',
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
      this.releaseCharge();
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
    // the kings (Phase 10): a reason it cannot be used now; Reverse Grip and Swap Verse are free and happen at once
    const kingWhy = this.kingBlock(unit, id);
    if (kingWhy) {
      this.showMessage(spell.button + ': ' + kingWhy);
      return;
    }
    if (spell.free) {
      this.useFreeKingAction(unit, id);
      return;
    }
    // a skill on himself (Singularity, Mantle): tap it again, or his own tile, to use it
    if (KING_SELF_KINDS.includes(spell.kind) && this.selectedSpell === id && this.mode === 'spellTarget' && canAfford(unit, id)) {
      this.pendingTarget = unit;
      this.confirmSpell();
      return;
    }
    if (!canAfford(unit, id)) {
      if (usesLeft(unit, id) === 0) {
        this.showMessage(spell.button + ': none left this battle');
        return;
      }
      this.showMessage(cooldownOf(unit, id) ? spell.button + ' is ready again in ' + cooldownOf(unit, id) + ' turns' : 'Not enough MP');
      return;
    }
    // Poison Arrow: a blinded archer cannot take aim, and it needs the bow in hand (Smoke Bomb, 13.26; Switch weapon, 13.29)
    if (spell.kind === 'poison') {
      if (isBlinded(unit)) {
        this.showMessage('Blinded: you cannot take aim');
        return;
      }
      if (holdsDagger(unit) && !this.switchWeapon(unit, 'bow')) {
        this.showMessage('Take the bow first (one switch a turn)');
        return;
      }
    }
    // Herbs tapped a second time: use it on yourself (tap an ally's tile to heal them instead)
    if (spell.kind === 'heal' && this.selectedSpell === id && this.mode === 'spellTarget') {
      if (unit.hp < unit.maxHp || isPoisoned(unit) || isBurning(unit)) {
        this.pendingTarget = unit;
        this.confirmSpell();
      } else {
        this.showMessage(unit.name + ' is unhurt. Tap an ally to heal them.');
      }
      return;
    }
    // A Verse tapped a second time: cast it on herself (roadmap 8.7), like Herbs
    if (spell.kind === 'buff' && this.selectedSpell === id && this.mode === 'spellTarget' && this.targetsInRange.includes(unit)) {
      this.pendingTarget = unit;
      this.confirmSpell();
      return;
    }
    play('select');
    this.releaseCharge();
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
      // (the main menu stays, with the row lit: tap it again to rest)
      this.selectedSpell = id;
      this.mode = 'rest';
      this.refreshButtons();
      this.refreshStatus();
      return;
    }

    this.selectedSpell = id;
    if (spell.kind === 'escape' || spell.kind === 'smoke') {
      this.mode = 'huskTile';
      let tiles = [];
      if (spell.kind === 'smoke') {
        // Smoke Bomb: she slips out of the cloud on foot, up to 2 tiles (or stays in it)
        tiles = [{ col: unit.col, row: unit.row }, ...getReachableTiles(unit.col, unit.row, spell.range, (c, r) => this.isBlocked(c, r), moveRules(unit))];
      } else {
        for (let col = 0; col < GRID_SIZE; col++) {
          for (let row = 0; row < GRID_SIZE; row++) {
            const d = distance(unit, { col, row });
            if (d > 0 && d <= spell.range && !this.isBlocked(col, row)) tiles.push({ col, row });
          }
        }
      }
      this.reachableKeys = new Set(tiles.map((t) => t.col + ',' + t.row));
      this.showHighlights(tiles, 0x8fd18a);
      this.refreshStatus();
      return;
    }

    this.mode = 'spellTarget';
    const foesOnly = ['haunt', 'hex', 'throw', 'poison', 'toss', 'charge', 'lunge', 'double', 'javelin', 'dive', 'elementBlast'].includes(spell.kind);
    const friendsOnly = spell.kind === 'heal' || spell.kind === 'infuse';
    this.targetsInRange = KING_KINDS.includes(spell.kind) ? this.kingTargets(unit, id) : this.units.filter(
      (u) =>
        u.alive && this.canSee(unit, u) && (spell.kind === 'charge' ? !!this.chargeTile(unit, u, spell) : spell.kind === 'lunge' ? !!this.lungeSpot(unit, u, spell) : distance(unit, u) <= this.spellReach(unit, u, spell)) &&
        (spell.kind !== 'dive' || !!this.sweepSpot(unit, u)) && // the dive needs a free tile next to the foe to land on
        this.clearShot(unit, u, spell) &&
        (!foesOnly || u.side !== unit.side) && (!friendsOnly || u.side === unit.side) &&
        (spell.kind !== 'heal' || u.hp < u.maxHp || isPoisoned(u) || isBurning(u)) &&
        // 1.65: no Renewal blessing on a fighter locked in a clash (it does not tick there). 1.69: Herbs may heal a locked
        // friend (the caster stands free beside him), which 1.65 had blocked by mistake
        !(spell.kind === 'infuse' && this.healsTarget(unit, id) && u.engagedWith)
    );
    if (this.targetsInRange.length === 0 && spell.kind === 'heal') {
      this.showMessage('Nobody in reach needs healing');
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
    // UI rework 16 Nov: the target tiles in the skill's own colour (fire orange, lightning violet...)
    const color = spell.color ? Phaser.Display.Color.HexStringToColor(spell.color).color : GOLD;
    // Singularity shows the area it will pull from (3 tiles round him), then his own tile to confirm
    const areaSkill = spell.kind === 'singularity' || spell.kind === 'mantle'; // Mantle shows the 3 tiles it reaches too (1.81)
    if (areaSkill) this.showHighlights(this.kingAreaTiles(unit, id), color, { alpha: 0.25 });
    this.showHighlights(this.targetsInRange.map((t) => ({ col: t.col, row: t.row })), color, { keep: areaSkill });
    this.holdCharge(unit, id);
    this.refreshOutlines();
    this.refreshStatus();
  }

  // Thrown and shot skills (Spear Throw, Shield Toss, Poison Arrow) need a
  // clear line to the target: a higher block in the way stops them, unless the
  // skill pierces ("pierce": true in spells.json). Magic is never stopped.
  clearShot(user, target, spell) {
    const missile = ['throw', 'toss', 'poison'].includes(spell.kind) && !spell.pierce;
    return !missile || hasClearShot(user, target);
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
      // 1.70: from a skill's or an item's target, back to that list (its group and page kept)
      if (this.mode === 'spellTarget' || this.mode === 'huskTile') this.spellBack();
      else if (this.mode === 'itemTarget') this.itemBack();
      else this.cancelMode();
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

    // Choosing who gets an item: first tap explains it, second tap uses it
    if (this.mode === 'itemTarget') {
      const target = this.getUnitAt(col, row);
      if (target && this.targetsInRange.includes(target)) {
        if (target === this.pendingTarget) this.confirmItem();
        else this.previewAttack(target);
        return;
      }
      this.itemBack(); // 1.70: back to the bag, not out of the whole menu
      return;
    }
    if (this.mode === 'item') {
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
      this.spellBack(); // 1.70: back to the skills list (same group and page), not out of the whole menu
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
      this.spellBack();
      return;
    }
    if (this.mode === 'spell' || this.mode === 'rest') {
      if (this.mode === 'spell' && this.spellGroup) this.spellBack(); // a group (Blessings) goes up to the whole list
      else this.cancelMode();
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
      if (this.mode === 'move' && this.autoMove) return; // the blue tiles stay (8.5)
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
    return this.getUnitAt(col, row) !== undefined || this.isDecoyAt(col, row) || !!this.spikeAt(col, row) || !!this.potAt(col, row);
  }

  // An undug pot or bone pile standing on a tile (it blocks the tile), or undefined.
  potAt(col, row) {
    return (this.sites || []).find((st) => st.blocking && !st.dug && st.col === col && st.row === row);
  }

  // The things to dig that this unit can reach: next to it, or under its feet.
  sitesNear(unit) {
    return (this.sites || []).filter((st) => !st.dug && distance(unit, st) <= 1);
  }

  // The Earth Drive spike standing on a tile, or undefined (roadmap 4.2).
  spikeAt(col, row) {
    return this.spikes && this.spikes.find((sp) => sp.col === col && sp.row === row);
  }

  // True if a Husk decoy's swarm is on the tile.
  isDecoyAt(col, row) {
    return this.decoys.some((d) => d.col === col && d.row === row);
  }

  // ---------- Choosing a move ----------

  // Shows blue squares on every tile the active unit can walk to.
  // quiet: shown by itself at the start of a turn (8.5), so no sound
  startMove(quiet = false) {
    const unit = this.activeUnit;

    // A unit may walk as many tiles as its Move each turn, split into as many
    // walks as it likes, but not at all while locked in an engagement
    if (this.stepsLeft(unit) === 0) return;
    if (unit.engagedWith) {
      this.showMessage('Locked with ' + unit.engagedWith.name + '. Press or Break away.');
      return;
    }

    this.mode = 'move';
    const tiles = getReachableTiles(unit.col, unit.row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r), moveRules(unit));
    this.reachableKeys = new Set(tiles.map((t) => t.col + ',' + t.row));
    this.showHighlights(tiles, 0x4aa3ff);
    if (!quiet) play('select');
    this.refreshButtons();
  }

  // Walks a unit to a tile, one tile at a time along the shortest path, with a
  // little hop and a footstep on each tile. Its column and row change right
  // away (that is what the rules care about); the figure then walks over.
  // "onDone" is optional: something to do once it has arrived.
  moveUnit(unit, col, row, onDone) {
    this.cancelMode();
    this.busy = true;

    let path = getPath(unit.col, unit.row, col, row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r), moveRules(unit));
    if (path.length === 0) path = [{ col, row }];
    // a hero's walk shows its line, which fades once he is on his way (M10, 17.11)
    if (unit.side === 'hero') {
      const line = drawPath(this, { x: unit.view.x, y: unit.view.y }, path, 79);
      this.lastPath = line;
      this.tweens.add({ targets: line, alpha: 0, delay: 200 + path.length * 90, duration: 300, onComplete: () => { if (this.lastPath === line) this.lastPath = null; line.destroy(); } });
    }

    // Undo move goes back to where it stood at the start of the turn
    if (!unit.moveFrom) unit.moveFrom = { col: unit.col, row: unit.row, facing: unit.facing };
    const startTile = { col: unit.col, row: unit.row }; // where the walk begins (the first tile it leaves)
    unit.col = col;
    unit.row = row;
    unit.hasMoved = true;
    unit.stepsUsed = (unit.stepsUsed || 0) + path.length;

    let prev = { x: unit.view.x, y: unit.view.y };
    let prevTile = null;
    // Walking frames (Gaha, roadmap S.4): his three pictures played 1, 2, 3, 2
    // while he is between tiles, two pictures a step; standing again when he stops
    const WALK_ORDER = [0, 1, 2, 1];
    let stride = 0;
    const STEP_MS = 190; // one tile; Linear so the figure glides through tile joins without stopping
    const steps = path.map((tile, i) => {
      const p = tileToScreen(tile.col, tile.row);
      const fromTile = prevTile;
      const fromPoint = prev;
      prev = p;
      prevTile = tile;
      return {
        x: p.x,
        y: p.y,
        duration: STEP_MS,
        ease: 'Linear',
        onStart: () => {
          this.faceToward(unit, p.x - fromPoint.x, p.y - fromPoint.y);
          const fromDepth = fromTile ? depthFor(fromTile.col, fromTile.row) : unit.view.depth - 1;
          unit.view.setDepth(Math.max(fromDepth, depthFor(tile.col, tile.row)) + 1);
          // a big leap when Layra hops up to a high spot under Swiftness; otherwise a glide
          const climb = fromTile ? getHeight(tile.col, tile.row) - getHeight(fromTile.col, fromTile.row) : 0;
          const leap = climb > terrain.climbLimit;
          const walk = !leap && !buffOf(unit) && walkFrames(unit.id, unit.facing);
          if (walk) {
            if (unit.gait) settle(this, unit); // it was walking in code the tile before: upright again for his own frames
            // walk frames play through the whole step (units without them keep their stance)
            const n = Math.max(2, Math.round(STEP_MS / walk.frameMs));
            for (let k = 0; k < n; k++) {
              const frame = walk.frames[WALK_ORDER[(stride + k) % 4]];
              this.time.delayedCall(k * walk.frameMs, () => unit.alive && this.showFrame(unit, frame));
            }
            stride += n;
          }
          // small step bob: one rise and fall per tile, tiny so it reads as a gait not a hop
          // Without walk pictures for this facing it walks in code (roadmap 18.13): two footfalls
          // with a lean, a squash and foot dust. Layra is carried by her sand instead (13.41).
          const ground = terrainAt(mapData, tile.col, tile.row) === 'water' ? 'water' : terrainAt(mapData, tile.col, tile.row) === 'caveSand' ? 'sand' : 'floor';
          if (leap) this.tweens.add({ targets: unit.idleTargets, y: '-=38', duration: 120, yoyo: true, ease: 'Sine.easeOut' });
          else if (walk) this.tweens.add({ targets: unit.idleTargets, y: '-=3', duration: STEP_MS / 2, yoyo: true, ease: 'Sine.easeOut' });
          else if (!unit.sprite) this.tweens.add({ targets: unit.idleTargets, y: '-=4', duration: STEP_MS / 2, yoyo: true, ease: 'Sine.easeOut' });
          else if (walkStyle(unit.id) === 'sand') sandStep(this, unit, { dx: p.x - fromPoint.x, ground });
          else codeStep(this, unit, { dx: p.x - fromPoint.x, ms: STEP_MS, ground });
          const buff = buffOf(unit);
          // his "in motion" effect (GIF frames, 15 Nov) goes with the unit for the whole walk, facing the way it goes now;
          // while it plays it replaces the Verse's own step marks
          const motionFx = buff && hasBuffPart(this, buff.id, 'move');
          if (motionFx) {
            if (!unit.moveFx) unit.moveFx = buffMoveFx(this, unit, buff.id, p.x - fromPoint.x);
            else if (unit.moveFx.objects[0] && unit.moveFx.objects[0].active) unit.moveFx.objects[0].setFlipX(p.x - fromPoint.x < 0);
          }
          // wind and feathers where it was, under Swiftness (his trail sheet; the older streak without it)
          if (!motionFx && buff && buff.id === 'swiftness' && !swiftTrail(this, fromPoint.x, fromPoint.y, p.x - fromPoint.x)) speedStreak(this, fromPoint.x, fromPoint.y, p.x - fromPoint.x);
          // the Verses leave a mark on the tile it leaves (16.1 step 6)
          const kinds = motionFx ? [] : verseKinds(unit);
          if (kinds.length) { const left = fromTile || startTile; stepEffect(this, kinds, fromPoint.x, fromPoint.y, p.x - fromPoint.x, depthFor(left.col, left.row)); }
          play('step');
        },
      };
    });
    this.tweens.chain({
      targets: unit.view,
      tweens: steps,
      onComplete: () => {
        if (unit.moveFx) { for (const o of unit.moveFx.objects) o.destroy(); unit.moveFx = null; } // his in-motion effect ends with the walk
        unit.view.setDepth(depthFor(col, row) + 1); // settle into its new place in the drawing order
        settle(this, unit); // the code walk ends: it straightens up and sinks a touch (18.13)
        if (this.inWater(unit)) splash(this, unit.view.x, unit.view.y);
        else dustPuff(this, unit.view.x, unit.view.y);
        this.refreshWater();
        this.keepInView(unit);
        this.faceNearestOpponent(unit); // on arriving, look at the nearest enemy
        this.readyCloseWeapons(); // an archer it stopped next to draws her dagger at once (1.46)
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
    if (!this.canSee(unit, target)) return []; // a hidden foe cannot be walked up to and struck (1.47)
    const here = { col: unit.col, row: unit.row };
    const spots = [here, ...getReachableTiles(unit.col, unit.row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r), moveRules(unit))];
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
    const path = getPath(unit.col, unit.row, a.tile.col, a.tile.row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r), moveRules(unit));
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
      const done = () => {
        this.busy = false;
      };
      this.safeAction(() => this.performAttack(unit, target, done), () => { done(); this.refreshStatus(); });
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
    this.readyCloseWeapons(); // an archer it had walked up to puts her dagger away again (1.46)
    this.refreshStatus();
  }

  // ---------- Choosing an attack ----------

  // Shows red squares on every enemy the active unit can hit.
  startAttack() {
    const unit = this.activeUnit;
    if (unit.engagedWith) return; // locked units cannot make ordinary attacks
    this.targetsInRange = getTargetsInRange(unit, this.units.filter((u) => this.canSee(unit, u)));

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
    this.aimCharge(target); // the held charge pose turns toward the pick
    this.refreshOutlines();
    this.refreshStatus();
  }

  // Second tap on the same enemy: attack.
  confirmAttack() {
    const attacker = this.activeUnit;
    const target = this.pendingTarget;

    this.cancelMode();
    this.busy = true;
    const done = () => {
      this.busy = false;
    };
    this.safeAction(() => this.performAttack(attacker, target, done), () => { done(); this.refreshStatus(); });
  }

  // ---------- Attacking (used by heroes and enemies) ----------

  // Rolls the attack and shows what happened.
  // "onDone" runs after a short pause, once the player has seen the result.
  // A blow that defeats its target gets a cut-in and slow motion.
  performAttack(attacker, target, onDone) {
    attacker.hasActed = true;
    const result = rollAttack(attacker, target);
    if (result.hit && !target.isDecoy) result.damage += gripBonus(attacker); // Gadara's Blade Strike: +2 (Phase 10)
    if (attacker.lungeBonus) { // Gaha's Lunge: 1 more damage for each tile he ran (castLunge sets it)
      if (result.hit) result.damage += attacker.lungeBonus;
      attacker.lungeBonus = 0;
    }
    const lead0 = target.isDecoy ? 0 : this.channelLead(attacker, target);
    // a Verse may have changed the attack (Layra: Thunderclap, Wildfire; roadmap 3.7 and 3.9)
    // Kofi's Spirit Bolt takes the element he reads (roadmap 6.38): Ember, Tide, Stone or Gale Bolt
    const moveId = this.readingMove(attacker) || activeMove(attacker, 'attack');
    const variant = moveId !== 'attack' && !target.isDecoy ? spells[moveId] : null;
    const fire = !!variant && variant.element === 'fire';
    if (fire) result.element = 'fire'; // Wildfire burns: the impact is drawn in fire's colours
    // Skyfall (6.65): her plain Lightning on a Drenched target comes down from the sky, for a little more damage
    if (result.hit && !variant && skyfallOn(attacker, target)) { result.skyfall = true; result.damage += terrain.water.skyfall.bonus; }

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
    let pushed = null;
    if (variant && result.hit && target.alive) {
      if (fire && !isDrenched(target)) applyBurn(target, moveId); // Wildfire: it burns for a few turns (not a Drenched unit: the fire hisses out)
      if (variant.drench) { applyDrenched(target, variant.drench); this.time.delayedCall(lead0 + 520, () => target.alive && this.floatText(target, 'Drenched', '#7fd6c4', { rise: 46 })); } // Tide Bolt
      if (variant.push) {
        pushed = this.pushLoser(target, attacker, variant.push); // Thunderclap: knocked a tile back
        if (target.engagedWith && distance(target, target.engagedWith) > 1) {
          endDuel(target);
          this.refreshEngagementMarks();
        }
      }
    }
    const playPush = () => {
      if (pushed && (pushed.path.length || pushed.fall)) {
        this.time.delayedCall(420, () => {
          this.knockBack(target, pushed, target.view.x - attacker.view.x, { text: 'Knocked back!', color: '#ff9a6a' });
        });
      }
      if (fire && result.hit && target.alive) this.time.delayedCall(520, () => { this.floatText(target, isDrenched(target) ? 'Too wet to burn' : 'Burning!', isDrenched(target) ? '#bfe8ff' : '#ff8a3c', { rise: 46 }); this.refreshStatusTags(); });
    };

    // Lightning jumps to a second enemy near the first, if the first bolt hit
    let jump = null;
    if (result.hit && attacker.chain && !fire && (!attacker.reading || (variant && variant.jump))) { // fire doesn't jump; Kofi's bolt jumps only as a Gale Bolt
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
    // Gadara's Fork Strike (Phase 10): the second prong hits the next foe straight behind the target, at half
    // damage, rolled on its own (an ally in the line is skipped, never hurt)
    let prong = null;
    const second = !target.isDecoy ? forkSecond(attacker, target, this.units) : null;
    if (second) {
      const hit = Math.random() * 100 < getHitChance(attacker, second);
      let damage = hit ? Math.max(1, Math.round(getDamage(attacker, second) * KING_RULES.gadara.fork.secondShare)) : 0;
      let note = null;
      if (hit) {
        const landed = this.landHit(second, damage);
        damage = landed.damage;
        note = landed.note;
        second.hp = Math.max(0, second.hp - damage);
        if (second.hp === 0) this.defeat(second);
      }
      prong = { target: second, result: { hit, damage, note } };
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
    // a caster gathers her spell first (channel, then cast: 13.10), so everything after it waits that long
    const lead = target.isDecoy ? 0 : this.channelLead(attacker, target, variant);
    const playEcho = () => {
      if (!echo) return;
      this.time.delayedCall(lead + (jump ? 820 : 420), () => {
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
    const playProng = () => {
      if (!prong) return;
      this.time.delayedCall(lead + 300, () => {
        const b = this.centerOf(prong.target);
        hitSpark(this, b.x, b.y);
        this.showImpact(attacker, prong.target, prong.result, prong.target.view.x - attacker.view.x, prong.target.hp === 0);
      });
    };
    const playJump = () => {
      if (!jump) return;
      this.time.delayedCall(lead + 380, () => {
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
      this.time.delayedCall(lead + (lethal ? 1500 : 800), () => {
        if (outcome) {
          this.busy = false; // nothing is happening any more; the battleOver flag blocks taps
          this.showResult(outcome);
        } else if (!result.hit && !target.isDecoy && this.canCounterstep(target, attacker)) {
          this.counterstep(target, attacker, (end) => (end ? this.endBattleFromRelay(end) : onDone())); // Gaha's passive
        } else {
          onDone();
        }
      });

    if (lethal) {
      this.beginCinematic();
      this.cutIn(attacker, 'FINISHING BLOW', () => {
        this.playAttack(attacker, target, result, true, variant);
        playJump();
        playProng();
        playEcho();
        if (echo) this.time.delayedCall(500, finish);
        else finish();
      });
    } else {
      this.playAttack(attacker, target, result, false, variant);
      playJump();
      playProng();
      playEcho();
      playPush();
      const extra = (jump ? 450 : 0) + (prong ? 400 : 0) + (echo ? 600 : 0) + (pushed && pushed.path.length ? 500 : 0);
      if (extra) this.time.delayedCall(extra, finish);
      else finish();
    }
  }

  // A blow is about to land on a unit: its signature stance may soak or soften
  // it (and builds up its stacks). Returns { damage, note }.
  // A hit that does damage also breaks a Sage's meditation and an archer's aim.
  landHit(target, damage) {
    if (isRooted(target) && damage > 0) damage = Math.max(1, Math.round(damage * rootedShare())); // Gaha standing his ground
    const landed = takeHit(target, damage);
    this.damageTaken[target.id] = (this.damageTaken[target.id] || 0) + (landed.damage || 0); // for the result screen (M12)
    if (landed.damage > 0) this.interrupt(target);
    if (landed.damage > 0) feedMask(target, KING_RULES.gadara.mask.hit); // Gadara's Mask Gauge: +1 for a hit taken
    if (landed.damage > 0 && target.hidden) this.revealHidden(target); // caught by an area attack: found out (1.47)
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
      if (isEnchanted(unit)) this.refreshStatusTags(); // the flame effect follows the look (1.56)
      this.time.delayedCall(450, () => unit.alive && !this.inCinematic && this.showStanding(unit)); // after the flinch: weakened, or upright again after healing
    }
    unit.hpFill.setScale(fraction, 1);
    // the plate shows for a moment whenever the health changes (M6: the bars are hidden otherwise)
    setPlateNumber(unit);
    const before = unit.shownHp === undefined ? unit.maxHp : unit.shownHp;
    if (before !== unit.hp) flashPlate(this, unit);
    // a hit leaves the lost health as a pale piece of bar that drains (M9); a heal clears it
    if (unit.hp < before) drainChunk(this, unit, before / unit.maxHp, fraction);
    else if (unit.hp > before) clearChunk(unit);
    unit.shownHp = unit.hp;
    unit.hpFill.setFillStyle(unit.side !== 'hero' ? 0xd8453a : fraction <= 0.35 ? 0xe05a47 : 0x6fcf7f); // heroes green (red when low), enemies red (UI rework 16 Nov)
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
    dropWalk(unit); // nothing of a walk in code is left on it (18.13)
    this.dropBag(unit); // what it carried waits in a satchel (roadmap 5.3)
    // his spikes fall with him (roadmap 4.2)
    for (const sp of this.spikes.filter((x) => x.owner === unit)) this.time.delayedCall(700, () => this.removeSpike(sp));
    if (unit.aiming && unit.aiming.target.markedBy === unit) unit.aiming.target.markedBy = null; // her aim dies with her
    unit.aiming = null;
    unit.meditating = null;
    unit.channel = null; // Gadara's Singularity dies with him
    this.clearTelegraph(unit);
    this.wakeSmoke(unit); // her cloud blows away with her
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

    const foes = this.units.filter((u) => u.alive && u.side !== unit.side && !u.hidden); // not toward a foe it cannot see (1.47)
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

  // True if the unit has pictures for this pose.
  hasPose(unit, pose) {
    return !!poseFrame(unit.id, pose, 'right');
  }

  // The picture for a stance in a clash: his close-up poses when the unit
  // has them (Gaha, roadmap 9.9), else the usual ones.
  clashPose(unit, stance) {
    const own = { press: 'clashPress', guard: 'clashGuard', slip: 'clashSlip', break: 'clashSlip' }[stance];
    if (own && this.hasPose(unit, own)) return own;
    return { press: 'windup', guard: 'guard', slip: 'dodge', break: 'dodge' }[stance];
  }

  // Shows one picture on a unit. "frame" is { key, flip } from art.js.
  // Returns true if the picture was shown.
  showFrame(unit, frame) {
    if (!unit.sprite || !unit.sprite.active || !frame || !this.textures.exists(frame.key)) return false;
    unit.sprite.setTexture(frame.key);
    unit.sprite.setFlipX(frame.flip);
    // The size ruler (roadmap 18.2): this picture's own scale and ground line. The sprite is
    // multiplied by new over old, so a squash or a breath that is under way keeps its shape.
    const scale = frame.scale || 1;
    const was = unit.frameScale || 1;
    if (scale !== was) {
      unit.sprite.setScale(unit.sprite.scaleX * scale / was, unit.sprite.scaleY * scale / was);
      unit.frameScale = scale;
    }
    unit.sprite.setOrigin(frame.originX, frame.originY || 1);
    if (unit.wading) this.cropWading(unit); // wading: the new picture's feet stay under the water too
    return true;
  }

  // At rest. A unit locked in an engagement stays in its fighting stance.
  // Otherwise it stands relaxed, or in its battle stance when an enemy is near.
  // Badly hurt units stand weakened (if they have the pictures); a Sage in
  // meditation stays kneeling in it.
  showStanding(unit) {
    if (unit.knock) return; // being knocked back: knockback.js is showing its pictures
    // choosing a target for a skill: the unit holds its charge pose (roadmap 13.12)
    if (unit.charging && this.showFrame(unit, poseFrame(unit.id, unit.charging.pose, unit.charging.dx >= 0 ? 'right' : 'left', unit.facing))) return;
    if (unit.meditating && this.showFrame(unit, poseFrame(unit.id, 'meditate', 'right', unit.facing))) return;
    if (unit.aiming) {
      // her kneeling Poison Arrow: four views (13.29), her up or down and the target's left or right
      const right = unit.aiming.target.view.x >= unit.view.x;
      const facing = (unit.facing && unit.facing.startsWith('up') ? 'up' : 'down') + (right ? 'Right' : 'Left');
      if (this.showFrame(unit, poseFrame(unit.id, 'poison', right ? 'right' : 'left', facing))) return;
    }
    // an archer holds her dagger when she has chosen it (Switch weapon), and in a clash
    if ((holdsDagger(unit) || (unit.closeWeapon && unit.engagedWith)) && this.showFrame(unit, this.daggerStance(unit, this.adjacentFoe(unit) || this.nearestFoe(unit)))) return;
    if (unit.engagedWith && unit.engagedWith.view) {
      const foe = unit.engagedWith.view;
      const dy = foe.y - unit.view.y;
      const up = Math.abs(dy) < 2 ? unit.facing.startsWith('up') : dy < 0;
      const facing = (up ? 'up' : 'down') + (foe.x >= unit.view.x ? 'Right' : 'Left');
      const side = facing.endsWith('Right') ? 'right' : 'left';
      // hurt units keep their weak look while in a clash (1.32): a weakReady pose if the art has one,
      // else their weak picture turned to face the foe. The ready pose has no weak version.
      if (unit.hp > 0 && unit.hp / unit.maxHp <= HURT_FACE_AT) {
        if (this.showFrame(unit, poseFrame(unit.id, 'weakReady', side, facing))) return;
        if (this.showFrame(unit, standingFrame(unit.id, facing, true, null, true, isRooted(unit)))) return;
      } else if (this.showFrame(unit, poseFrame(unit.id, 'ready', side, facing))) return;
    }
    const buff = buffOf(unit);
    const weak = unit.hp > 0 && unit.hp / unit.maxHp <= HURT_FACE_AT;
    // which look stands: Gadara's mask while Singularity charges (art.json "buffed.masked", the Hollow Rite pictures;
    // 10.33: only his poses used it, so he stood unmasked), a Verse, or the Bloodied Press stacks
    const lookId = unit.channel ? 'masked' : buff ? buff.id : (unit.fury > 0 ? 'bloodied' : null);
    // Gaha standing his ground under Earth's Bulwark shows his rooted guard (roadmap 6.17)
    this.showFrame(unit, standingFrame(unit.id, unit.facing, this.isAlert(unit), lookId, weak, isRooted(unit)));
  }

  // The foe standing next to a unit that has a close weapon (the archer's dagger), or null.
  adjacentFoe(unit) {
    if (!unit.closeWeapon || !this.units) return null;
    return this.units.find((o) => o.alive && o.side !== unit.side && !o.hidden && !o.isDecoy && distance(unit, o) <= 1) || null;
  }

  // The nearest foe on the other side (or null), for turning a held weapon toward it.
  nearestFoe(unit) {
    const foes = (this.units || []).filter((o) => o.alive && o.side !== unit.side && o.view && !o.hidden);
    foes.sort((a, b) => distance(unit, a) - distance(unit, b));
    return foes[0] || null;
  }

  // The dagger picture facing a foe (the unit's own up or down, the foe's left or right).
  daggerStance(unit, foe) {
    const right = foe ? foe.view.x >= unit.view.x : unit.facing && unit.facing.endsWith('Right');
    const facing = (unit.facing && unit.facing.startsWith('up') ? 'up' : 'down') + (right ? 'Right' : 'Left');
    return poseFrame(unit.id, unit.closeWeapon.pose, right ? 'right' : 'left', facing);
  }

  // True when an enemy (as this unit sees it) is close enough to fight:
  // within ALERT_RANGE tiles, or within the unit's own reach if that is
  // longer (an archer with a 5-tile bow is in the fight from 5 tiles away).
  isAlert(unit) {
    if (!this.units) return false;
    const reach = Math.max(ALERT_RANGE, unit.range || 0);
    return this.units.some((o) => o.alive && o.side !== unit.side && !o.hidden && distance(o, unit) <= reach);
  }

  // An action picture (attack, windup, ready, guard, dodge, cast) facing a direction.
  // dx > 0 means toward the right of the screen. Falls back to standing if missing.
  // A pose drawn in four facings uses the unit's up or down (set by faceToward)
  // with dx's left or right, so it looks at its target.
  showPose(unit, pose, dx) {
    // a target straight above or below on the screen: keep the side it already faces (1.45)
    const right = Math.abs(dx) < 2 && unit.facing ? unit.facing.endsWith('Right') : dx >= 0;
    const facing = (unit.facing && unit.facing.startsWith('up') ? 'up' : 'down') + (right ? 'Right' : 'Left');
    if (!this.showFrame(unit, poseFrame(unit.id, pose, right ? 'right' : 'left', facing))) this.showStanding(unit);
  }

  // The picture as a thrown spear leaves the hand: his release picture if the
  // unit has one, else its attack picture.
  releasePose(unit) {
    return poseFrame(unit.id, 'throwRelease', 'right') ? 'throwRelease' : 'attack';
  }

  // ---------- Kofi's Reading (roadmap 6.38, M10b; first version of Suleiman's kit) ----------

  // What Kofi reads in the ground and the people within 2 tiles of him: points for each of
  // his four elements, and the strongest one. That element colours his Spirit Bolt, Haunt
  // and Infuse, and his casting pictures. The points for each thing are in jobs.json
  // ("readingRules"). A tie keeps the element he had; nothing to read = water at strength 0.
  // "at" ({ col, row }) asks what he WOULD read from another tile (the preview of a walk then
  // an attack, 1.50): it changes nothing. The cause of 1.50: he reads where he stands when he
  // fires, so a fire reading at the start of his turn turned into a Tide Bolt on the tile he
  // walked to, and nothing on screen said so.
  reading(unit, at) {
    const rules = jobs[unit.job].readingRules;
    const col = at ? at.col : unit.col, row = at ? at.row : unit.row;
    const pts = { water: 0, earth: 0, fire: 0, storm: 0 };
    const near = (c, r) => Math.abs(c - col) + Math.abs(r - row) <= rules.radius;
    for (let c = col - rules.radius; c <= col + rules.radius; c++) {
      for (let r = row - rules.radius; r <= row + rules.radius; r++) {
        if (!near(c, r) || c < 0 || r < 0 || c >= GRID_SIZE || r >= GRID_SIZE) continue;
        const ground = terrainAt(mapData, c, r);
        if (ground === 'water') pts.water += rules.water.tile;
        if (ground === 'caveSand' || ground === 'rubble' || ground === 'sand') pts.earth += rules.earth.sandOrRubbleTile;
      }
    }
    for (const [c, r] of mapData.lamps || []) if (near(c, r)) pts.fire += rules.fire.lamp;
    for (const u of this.units || []) {
      if (!u.alive || u === unit || !near(u.col, u.row)) continue;
      const verse = buffOf(u) && buffOf(u).id;
      if (isDrenched(u)) pts.water += rules.water.drenchedUnit;
      if (verse === 'stone') pts.earth += rules.earth.stoneVerseUnit;
      if (isBurning(u) || isEnchanted(u)) pts.fire += rules.fire.burningOrEnchantedUnit;
      if (verse === 'fury') pts.fire += rules.fire.furyVerseUnit;
      if (verse === 'swiftness') pts.storm += rules.storm.swiftnessVerseUnit;
      if (u.element === 'lightning') pts.storm += rules.storm.lightningCaster;
    }
    if (getHeight(col, row) >= 2) pts.storm += rules.storm.highGround;
    const top = Math.max(...Object.values(pts));
    const best = rules.order.filter((e) => pts[e] === top);
    const element = top === 0 ? 'water' : best.includes(unit.lastRead) ? unit.lastRead : best[0];
    if (!at) unit.lastRead = element; // a what-if look must not change what he remembers
    return { element, points: top, all: pts };
  }

  // The Spirit Bolt his reading gives (a spells.json id like "spiritBoltFire"), or null for
  // anyone who does not read.
  readingMove(unit, at) {
    if (!unit.reading) return null;
    const el = this.reading(unit, at).element;
    return 'spiritBolt' + el[0].toUpperCase() + el.slice(1);
  }

  // The move the Attack button makes now: Kofi's bolt for what he reads (from the tile "at" if
  // given), otherwise what a Verse made of it, otherwise the plain attack ('attack').
  attackMove(unit, at) {
    return this.readingMove(unit, at) || activeMove(unit, 'attack');
  }

  // Haunt: a spirit mark on a foe. 2 damage at the start of each of its next 3 turns (the
  // same rules as poison: never the last point, Herbs lift it), and what Kofi reads adds
  // to it. Fire: it burns too. Water: Drenched. Earth: bound (slower). Storm: shaken (an aim
  // or a trance breaks, Off-Balance). Channel, then cast, like Slow.
  castHaunt(caster, target, spell, onDone) {
    const read = this.reading(caster).element;
    const dx = target.view.x - caster.view.x;
    this.faceToward(caster, dx, target.view.y - caster.view.y);
    const tone = { fire: 'fire', water: 'water', earth: 'earth', storm: 'lightning' }[read];
    this.showPose(caster, 'chant', dx);
    chargeUp(this, caster.view.x + Math.sign(dx || 1) * 12, caster.view.y - caster.topY * 0.7, tone, { ms: 420, size: 0.9, depth: caster.view.depth + 2 });
    play('select');
    // 13.60 (Suleiman 15 Nov): Haunt is a hex. It rolls against the target's magic defense; when it lands the target
    // is Disoriented (no more poison), plus what Kofi reads. A miss: the spirits are shaken off ("Resisted").
    const chance = hexChance(caster, target, spell.resist);
    const lands = Math.random() * 100 < chance;
    let word = null;
    if (lands) {
      applyDisoriented(target, this.activeUnit === target, spell.hexTurns, 'haunt');
      if (read === 'fire' && !isDrenched(target)) { applyBurn(target, spell.burnAs); word = ['Burning!', '#ff8a3c']; }
      if (read === 'water') { applyDrenched(target, spell.drench); word = ['Drenched', '#7fd6c4']; }
      if (read === 'earth') { applySlow(target, 'haunt'); word = ['Bound', '#d9b77a']; }
      if (read === 'storm') { applyOffBalance(target); word = ['Shaken', '#bfd8ff']; }
    }
    // 1.71 (Suleiman 19 Nov: "I miss the old haunt effect ... your original implementation was the right move"): the
    // first look is back. His cast picture, his teal spirit comet flies to the target and his Haunt smoke rises where
    // it lands; while the hex lasts the smoke stands round the haunted unit's feet (refreshStatusTags). This undoes 1.57.
    this.time.delayedCall(420, () => {
      if (!caster.alive) return onDone();
      this.showPose(caster, 'cast', dx);
      play('spell');
      const to = this.centerOf(target);
      const from = { x: caster.view.x + Math.sign(dx || 1) * 14, y: caster.view.y - caster.topY * 0.7 };
      const hasComet = sfxHas(this, 'spirit_bolt');
      if (hasComet) sfxBeam(this, 'spirit_bolt', from.x, from.y, to.x, to.y);
      else lightning(this, from.x, from.y, to.x, to.y);
      // the mark lands when the comet arrives (its hitMs), not when it leaves his hand
      const hit = hasComet ? sfxInfo('spirit_bolt').hitMs || 0 : 0;
      this.time.delayedCall(hit, () => {
        if (lands) {
          buffCastFx(this, target.view.x, target.view.y, 'haunt', target);
          floorLight(this, target.view.x, target.view.y, elementOf(tone).glow, { size: 1.4, peak: 0.6, ms: 700 });
          lightNearby(this, to.x, to.y, elementOf(tone).glow, { radius: 110, peak: 0.55, ms: 480 });
          afterglow(this, target.view.x, target.view.y - 10, tone, { level: 3, depth: target.view.depth + 2 });
          this.floatText(target, 'Haunted', spell.color, { pop: true });
          this.time.delayedCall(380, () => target.alive && this.floatText(target, 'Disoriented', '#e3a8ff', { rise: 46 }));
          if (word) this.time.delayedCall(800, () => target.alive && this.floatText(target, word[0], word[1], { rise: 60 }));
          if (read === 'storm') this.interrupt(target);
        } else {
          this.floatText(target, 'Resisted', '#e8d5a8', { pop: true });
        }
        this.refreshStatusTags();
        this.refreshTurnStrip();
      });
      this.time.delayedCall(520 + hit, () => caster.alive && this.showStanding(caster));
      this.time.delayedCall(900 + hit, onDone);
    });
  }

  // Channel, then cast (roadmap 13.10): how long a caster gathers a spell at her hands
  // before she lets it go, in milliseconds. 0 for anyone who is not casting (a fighter, an
  // archer) or has no "chant" picture. Short, because Lightning is cast every turn.
  channelLead(attacker, target, variant = null) {
    if (attacker.attackEffect !== 'spark' || !this.hasPose(attacker, 'chant')) return 0;
    if (target && usesCloseWeapon(attacker, target)) return 0;
    // with Suleiman's drawn orb (15 Nov) she gathers it for as long as he chose (fxSlots.json "lead")
    const drawn = this.drawnSpell(variant);
    return drawn && drawn.orb ? sfxInfo(drawn.orb).lead : CHANNEL_MS;
  }

  // His drawn Lightning (or Wildfire, for the fire variant) pieces, if all of them are loaded: { orb, beam, strike }
  // (strike is null for Wildfire: the lance lands on the target by itself), else null.
  drawnSpell(variant = null) {
    // All four of Kofi's bolts are his spirit comet (6.63, 1.55): Tide is Suleiman's teal one, Ember, Stone and Gale are
    // the same comet tinted red, gold and pale until he draws them (make_spirit_bolt_tints.py). No orb gathered, no strike
    // coming down, and never Layra's Wildfire or Lightning.
    if (variant && variant.reads) {
      const comet = { water: 'spirit_bolt', fire: 'spirit_bolt_fire', earth: 'spirit_bolt_earth', storm: 'spirit_bolt_storm' }[variant.reads];
      if (comet && sfxHas(this, comet)) return { orb: null, beam: comet, strike: null };
    }
    const fire = !!(variant && variant.element === 'fire');
    const names = fire ? { orb: 'wildfire_orb', beam: 'wildfire_lance', strike: null } : { orb: 'lightning_orb', beam: 'lightning_bolt', strike: 'lightning_strike' };
    return sfxHas(this, ...Object.values(names).filter(Boolean)) ? names : null;
  }

  // The attack picture, if the unit has one. dx says which way it is swinging.
  showAttackPose(unit, dx) {
    this.showPose(unit, 'attack', dx);
  }

  // The code wind-up (roadmap 18.29): the figure leans back about its feet, away from the target (dx says
  // where it is), for `ms`. Returns the sprite to hand to unlean() when the blow goes in, or null if there is none.
  // Clockwise is positive, so a target on the right means anticlockwise.
  leanBack(unit, dx, ms = 150) {
    const sprite = unit.sprite && unit.sprite.active ? unit.sprite : null;
    if (sprite) this.tweens.add({ targets: sprite, angle: (dx >= 0 ? -1 : 1) * WINDUP_LEAN_DEG, duration: ms, ease: 'Quad.easeOut' });
    return sprite;
  }

  // The lean snaps forward into the blow (ms), and the angle is always back to 0 at the end.
  unlean(sprite, ms = 70) {
    if (sprite && sprite.active) this.tweens.add({ targets: sprite, angle: 0, duration: ms, ease: 'Quad.easeIn', onComplete: () => { if (sprite.active) sprite.angle = 0; } });
  }

  // Plays an attack. Close fighters lunge into the target. Archers loose an arrow.
  // variant: a Verse-changed attack from spells.json (Wildfire throws fire).
  playAttack(attacker, target, result, lethal = false, variant = null) {
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
    // an archer draws and aims first, then lets fly (her "bow primed" picture, 1.45)
    const aimFirst = style === 'arrow' && this.hasPose(attacker, 'windup');
    // a caster channels first, like Slow (13.10): hands together and the spell gathering at
    // them, then she lets it go. "lead" is how long; every later moment waits for it.
    const lead = target.isDecoy ? 0 : this.channelLead(attacker, target, variant);
    const drawn = target.isDecoy ? null : this.drawnSpell(variant); // his drawn orb, beam and strike (15 Nov), or null
    if (lead) {
      const fire = variant && variant.element === 'fire';
      this.showPose(attacker, 'chant', dx);
      const hands = { x: attacker.view.x + Math.sign(dx || 1) * 10, y: attacker.view.y - attacker.topY * 0.72 };
      if (drawn && drawn.orb) sfxChannel(this, drawn.orb, hands.x, hands.y, { depth: attacker.view.depth + 2 });
      else chargeUp(this, hands.x, hands.y, (variant && variant.element) || (fire ? 'fire' : 'lightning'), { ms: lead, size: 0.75, depth: attacker.view.depth + 2 });
      play('select');
      this.time.delayedCall(lead, () => attacker.alive && this.showPose(attacker, strikePose, dx));
    } else this.showPose(attacker, aimFirst ? 'windup' : strikePose, dx);

    // striking a Husk decoy bursts it instead of hurting anyone
    const impact = target.isDecoy ? () => this.popDecoy(target.decoy) : () => this.showImpact(attacker, target, result, dx, lethal);
    if (lethal) this.focusCamera((attacker.view.x + target.view.x) / 2, (attacker.view.y + target.view.y) / 2 - 50, 1.35, 220);

    if (style === 'spark' && variant && variant.element === 'fire') {
      // Wildfire: a ball of fire, and flames burst up where it lands
      const start = this.centerOf(attacker);
      const end = this.centerOf(target);
      if (drawn) {
        // his fireball turns into a lance and flies to the target (it arrives hitMs after it starts)
        const hit = sfxInfo(drawn.beam).hitMs;
        this.time.delayedCall(lead, () => {
          play('whoosh');
          sfxBeam(this, drawn.beam, start.x, start.y - 20, end.x, end.y);
          this.time.delayedCall(hit, () => {
            if (!target.isDecoy) flameBurst(this, target.view.x, target.view.y);
            play('crash');
            impact();
          });
        });
        this.time.delayedCall(lead + hit + 450, () => this.showStanding(attacker));
        return;
      }
      this.time.delayedCall(lead + 120, () => {
        play('whoosh');
        fireball(this, start.x, start.y - 20, end.x, end.y, () => {
          if (!target.isDecoy) flameBurst(this, target.view.x, target.view.y);
          play('crash');
          impact();
        });
      });
      this.time.delayedCall(lead + 560, () => this.showStanding(attacker));
      return;
    }

    if (style === 'spark') {
      const start = this.centerOf(attacker);
      const end = this.centerOf(target);
      if (drawn) {
        // his bolt leaves her hands and his strike comes down on the target; the blow lands when the bolt gets there
        const sky = !!result.skyfall && !!drawn.strike;
        const hit = sky ? sfxInfo(drawn.strike).hitMs : sfxInfo(drawn.beam).hitMs;
        this.time.delayedCall(lead, () => {
          // two forms (6.65): the bolt flies from her hands; on a Skyfall the lightning comes down from the sky instead
          if (!sky) sfxBeam(this, drawn.beam, start.x, start.y - 20, end.x, end.y);
          else sfxStrike(this, drawn.strike, target.view.x, target.view.y, { big: lethal });
          play('spark');
        });
        this.time.delayedCall(lead + hit, () => {
          impact(); // the number lands when the bolt, or the strike, arrives
          if (sky) this.floatText(target, terrain.water.skyfall.word, terrain.water.skyfall.color, { rise: 46 });
        });
        this.time.delayedCall(lead + hit + 300, () => this.showStanding(attacker));
        return;
      }
      this.time.delayedCall(lead + 140, () => {
        lightning(this, start.x, start.y - 20, end.x, end.y);
        // a bolt crashes down on the target (from Layra's effect sheet)
        if (!target.isDecoy && result.skyfall) lightningStrike(this, target.view.x, target.view.y, { big: lethal }); // (only on a Skyfall, 6.65)
        if (result.skyfall) this.time.delayedCall(120, () => this.floatText(target, terrain.water.skyfall.word, terrain.water.skyfall.color, { rise: 46 }));
        play('spark');
      });
      this.time.delayedCall(lead + 260, impact);
      this.time.delayedCall(lead + 460, () => this.showStanding(attacker));
      return;
    }

    if (style === 'arrow') {
      const start = this.centerOf(attacker);
      const end = this.centerOf(target);
      this.time.delayedCall(aimFirst ? 200 : 140, () => {
        if (aimFirst && attacker.alive) this.showPose(attacker, strikePose, dx);
        play('arrow');
        arrowShot(this, start.x, start.y, end.x, end.y, impact);
      });
      this.time.delayedCall(aimFirst ? 520 : 420, () => this.showStanding(attacker));
      return;
    }

    // Close fighters: wind up, dash in leaving after-images, strike, step back
    // a fighter with a frame-by-frame thrust (Gaha, 6.3): frames 0 to 2 are the draw back,
    // 3 is the full thrust as the blow lands, 4 and 5 bring the spear home
    const up = attacker.facing && attacker.facing.startsWith('up');
    const thrust = !close && moveFrames(attacker.id, up ? 'thrustUp' : 'thrust', 'right') ? (up ? 'thrustUp' : 'thrust') : null;
    // The wind-up before the blow (roadmap 18.29). A fighter with a drawn wind-up ("strikeWindup" in art.json: Gaha,
    // 15 Nov) shows that picture for the draw back; every other melee fighter leans back in code until its frames come.
    const drawnWindup = !close && this.hasPose(attacker, 'strikeWindup');
    if (drawnWindup) this.showPose(attacker, 'strikeWindup', dx);
    else if (thrust) this.playMove(attacker, thrust, dx, { to: 3 });
    else this.showPose(attacker, readyPose, dx);
    const leanSprite = drawnWindup ? null : this.leanBack(attacker, dx, 150); // her dagger stab leans too
    // The body moves by offsets from the middle of the tile it stands on NOW, worked out every frame (roadmap 13.54,
    // as nudgeFromTile does for 13.47). These tweens used to go to fixed points measured from where the body was when
    // the attack began: an attacker pushed to another tile mid-swing (a counter, a Sonic Burst) was dragged back to
    // the old tile when the last tween ended, and a body that started a little off its tile came back there.
    // While a push is drawing the body (unit.knock) these leave it alone.
    const ux = dx / dist, uy = dy / dist;
    const reach = { d: 0 }; // how far along the line to the target: -8 drawn back, 30 at the blow, 0 home
    const place = () => {
      const v = attacker.view;
      if (!v || !v.active || attacker.knock) return;
      const home = this.bodyHome(attacker);
      v.setPosition(home.x + ux * reach.d, home.y + uy * reach.d * 0.5);
    };
    this.tweens.add({
      targets: reach,
      d: -8, // draw back a little first
      duration: 150,
      hold: 70, // anticipation: freeze at the top of the wind-up before the strike
      ease: 'Quad.easeOut',
      onUpdate: place,
      onComplete: () => {
        play('whoosh');
        this.unlean(leanSprite); // the lean snaps forward into the blow
        if (thrust) this.playMove(attacker, thrust, dx, { from: 3, to: 4 });
        else this.showPose(attacker, strikePose, dx);
        this.time.addEvent({ delay: 22, repeat: 3, callback: () => this.afterimage(attacker) });
        this.tweens.add({
          targets: reach,
          d: 30,
          duration: 90,
          ease: 'Quad.easeIn',
          onUpdate: place,
          onComplete: () => {
            impact();
            if (thrust) this.playMove(attacker, thrust, dx, { from: 4 }); // pull the spear back
            this.tweens.add({
              targets: reach,
              d: 0,
              delay: 140,
              duration: 220,
              ease: 'Quad.easeOut',
              onUpdate: place,
              onComplete: () => {
                reach.d = 0;
                place(); // exactly on the middle of its tile
                if (leanSprite && leanSprite.active) leanSprite.angle = 0; // never leave the lean on
                this.showStanding(attacker);
              },
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
    // The jolt is measured from the view the camera rests at. (It used to go to a zoom of exactly 1,
    // which threw a zoomed-in phone view back out after every hit: roadmap 17.1.)
    const base = this.follow && this.rest ? this.rest.zoom : this.home.zoom;
    cam.zoomTo(base * (1 + 0.03 * power), 50, 'Quad.easeOut', true);
    this.time.delayedCall(70, () => {
      if (!this.inCinematic) cam.zoomTo(base, 220, 'Quad.easeOut', true);
    });
  }

  // Thrown back by a blow, away from the attacker, then steadies.
  knockback(unit, dx, power) {
    const push = (dx >= 0 ? 1 : -1) * 14 * power;
    this.nudgeFromTile(unit, push, 0, { duration: 90, ease: 'Quad.easeOut', hold: 120 });
    dustPuff(this, unit.view.x + push, unit.view.y);
  }

  // A small there-and-back movement of a figure (a recoil, a sidestep), measured
  // from the MIDDLE OF ITS TILE and worked out again every frame.
  // Why (roadmap 13.47, the body left in the gap between blocks): these used to
  // start from wherever the body was at that instant and return there. A unit
  // hit while it was still flying from a push, getting up, or lunging in its own
  // attack came back to that half-way spot and stayed between two tiles.
  // Now the body always comes home to its tile, even if the tile changes while
  // this plays. While a push is being drawn (unit.knock) this leaves it alone.
  nudgeFromTile(unit, offX, offY, { duration = 100, ease = 'Linear', hold = 0 } = {}) {
    const view = unit.view;
    if (!view || !view.active) return;
    const o = { t: 0 };
    const place = () => {
      if (!view.active || unit.knock) return;
      const home = this.bodyHome(unit);
      view.setPosition(home.x + offX * o.t, home.y + offY * o.t);
    };
    this.tweens.add({ targets: o, t: 1, duration, ease, hold, yoyo: true, onUpdate: place, onComplete: () => { o.t = 0; place(); } });
  }

  // Where a unit's body is drawn from: the middle of its tile. But a push moves the unit on the board at once
  // (the rules), while its knockback is drawn later (a clash shows the strike first). Until the knockback starts
  // (unit.knockPending) the body still belongs on the tile it was pushed from. Roadmap 1.68: the lunges and recoils
  // measured from the NEW tile (13.54), so the body jumped there, then the knockback flew it in from the old one:
  // it seemed to vanish and reappear where it was sent.
  bodyHome(unit) {
    const t = unit.knockPending && unit.pushedFrom ? unit.pushedFrom : unit;
    return tileToScreen(t.col, t.row);
  }

  // Where the middle of a unit's tile is on the board, in pixels.
  tileCentre(unit) {
    return tileToScreen(unit.col, unit.row);
  }

  // Puts a unit on a tile at once, with no walk (the recording and photo tools
  // in dev/browser use it to stage a scene).
  placeUnit(unit, col, row) {
    unit.col = col;
    unit.row = row;
    const home = tileToScreen(col, row);
    if (unit.view && unit.view.active) unit.view.setPosition(home.x, home.y).setDepth(depthFor(col, row) + 1);
  }

  // Safety net for the same bug: at the end of every turn, any living figure
  // that is not on the middle of its tile (and is not being pushed) is put there.
  settleBodies() {
    for (const u of this.units) {
      if (!u.alive || u.knock || !u.view || !u.view.active) continue;
      const home = tileToScreen(u.col, u.row);
      if (Math.abs(u.view.x - home.x) > 0.5 || Math.abs(u.view.y - home.y) > 0.5) {
        u.view.setPosition(home.x, home.y).setDepth(depthFor(u.col, u.row) + 1);
      }
    }
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
      // a miss is a dodge (roadmap 13.44, BATTLE_SYSTEMS.md 11.1): the dodge picture, facing the
      // attacker, for a moment; units that have none just sidestep
      if (target.alive && !target.knock && this.hasPose(target, 'dodge')) {
        const token = (target.dodgeToken = {});
        this.showPose(target, 'dodge', -dx);
        this.time.delayedCall(520, () => {
          if (target.dodgeToken === token && target.alive && !target.knock && target.view && target.view.active) this.showStanding(target);
        });
      }
      return;
    }
    const dir = dx >= 0 ? 1 : -1;
    const power = Math.min(2, 0.8 + result.damage / 8) * (lethal ? 1.3 : 1);
    const color = style === 'spark' ? 0x9fd4ff : 0xffd27a;

    // How big this hit is (1 light to 4 finishing) and what it is made of (roadmap 18.23):
    // small hits stay small so the big ones feel big, and each element has its own colours.
    const level = result.level || hitLevel(result.damage, lethal);
    const kinds = verseKinds(attacker);
    const element = result.element || (style === 'spark' ? 'lightning' : isEnchanted(attacker) || kinds.includes('fury') ? 'fire' : kinds.includes('stone') ? 'earth' : kinds.includes('swiftness') ? 'wind' : style === 'bash' ? 'earth' : 'steel');
    const feel = FEEL[level];
    this.hitStop(feel.stop);
    play(style === 'bash' ? 'bash' : 'impact');
    impactLayers(this, { x: spot.x, y: spot.y, gx: target.view.x, gy: target.view.y, element, level, dir, depth: 80 });

    if (style === 'slash') heavySlash(this, spot.x, spot.y, dir, color);
    if (style === 'bash') {
      dustPuff(this, target.view.x, target.view.y);
      screenShake(this, 0.004, 120);
    }
    impactBurst(this, spot.x, spot.y, dir, color, power);
    groundRing(this, target.view.x, target.view.y, color, 0.6 + 0.3 * power);
    // a Verse on either of them flares at the target (16.1 step 7)
    const verses = [...verseKinds(attacker), ...verseKinds(target)];
    if (verses.length) hitEffect(this, verses, spot.x, spot.y, target.view.x, target.view.y, dir, depthFor(target.col, target.row));
    // a heavy hit on sand or floor throws the sand up (6.37)
    if ((lethal || result.damage >= 9) && SANDY.has(terrainAt(mapData, target.col, target.row))) sandImpact(this, target.view.x, target.view.y + 4, dir);

    this.flashUnit(target);
    this.updateHpBar(target);
    // the number is as big as the hit (M9, 17.13)
    this.floatText(target, result.damage > 0 ? '-' + result.damage : 'Blocked', result.damage >= 9 ? '#ffcf5a' : '#ff6b5a', { pop: true, big: result.damage >= 9, size: result.damage > 0 ? damageSize(result.damage) : 0 });
    if (result.note) this.floatText(target, result.note, '#ffd27a', { rise: 52 }); // a signature stance at work
    this.refreshStatusTags(); // stacks and Charge may have changed
    this.cameraPunch(feel.zoom);
    // the shake grows with the level of the hit (a light hit barely stirs the screen)
    screenShake(this, feel.shake, feel.shakeMs);

    if (target.knockPending) {
      this.showPose(target, 'hurt', -dx); // a push follows: the knockback draws the rest (and the death, if the fall kills)
    } else if (target.hp === 0) {
      this.playDefeat(target, dx);
    } else {
      this.showPose(target, 'hurt', -dx); // flinch, facing the attacker
      this.knockback(target, dx, power * 0.7); // small recoil, bigger for bigger blows
      this.time.delayedCall(420, () => {
        if (target.alive) this.showStanding(target);
      });
    }
    if (lethal) this.finisherSlowMotion();
  }

  // The finishing blow: a white flash, the world slows right down for a moment,
  // then the camera eases back out.
  finisherSlowMotion() {
    const flash = this.ui(this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xffffff, 0.55).setDepth(240));
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
    this.nudgeFromTile(unit, dx >= 0 ? 12 : -12, -6, { duration: 110 });
  }

  // The fall (roadmap 16.2, reworked 8 Nov): ONE continuous motion. The fighter is knocked back,
  // tilting as it flies, lands with a squash and a puff of dust and slides on a little; the
  // pictures of the fall melt into each other while it is still moving (no hard swap), and
  // the figure then dissolves in gold (goldDissolve).
  //   dx   : the direction the blow came from (as in showImpact)
  //   slam : a push that killed it against a wall (pushLoser's "fall" with slam.toward): it flies
  //          into the wall, squashes against it and slumps down it instead
  //   afterFall : true when it has just dropped off a ledge (knockback.js): no second flight, only a
  //            small bounce where it landed, then it lies down
  playDefeat(unit, dx = 0, slam = null, afterFall = false) {
    if (!unit.view || !unit.view.active) return;
    if (unit.knock) { unit.knock.cancelled = true; unit.knock = null; } // struck down while being pushed: the death takes over
    const reach = afterFall ? 0.3 : 1; // after a fall it has already flown: it only bounces a little and lies down
    if (unit.idleTween) unit.idleTween.stop();
    const view = unit.view;
    const sprite = unit.sprite;
    // the health bar, badge and tags go at once; only the figure is left
    for (const piece of view.list) if (!unit.idleTargets.includes(piece)) piece.setVisible(false);

    // which way it goes: away from the blow, or into the wall (screen direction toward it)
    let away = dx >= 0 ? 1 : -1;
    let wall = null;
    if (slam && slam.toward) {
      const len = Math.hypot(slam.toward.x, slam.toward.y) || 1;
      wall = { x: slam.toward.x / len, y: slam.toward.y / len };
      away = wall.x === 0 ? away : -Math.sign(wall.x); // it ends lying away from the wall
    }
    const lean = wall ? Math.sign(wall.x) || 1 : -away;   // which side the head goes to while it flies

    // the pictures of the fall, in order; each one fades into the next
    const hasDown = this.hasPose(unit, 'down');
    const names = (afterFall ? ['kneel', 'crumple', 'down'] : ['knocked', 'kneel', 'crumple', 'down']).filter((n) => this.hasPose(unit, n));
    const frameOf = (name) => {
      const right = -dx >= 0;
      const facing = (unit.facing && unit.facing.startsWith('up') ? 'up' : 'down') + (right ? 'Right' : 'Left');
      return poseFrame(unit.id, name, right ? 'right' : 'left', facing);
    };
    const ghosts = [];
    const fadeTo = (name) => {
      const frame = frameOf(name);
      if (!sprite || !sprite.active || !frame || !this.textures.exists(frame.key)) return;
      // the old picture stays under the new one as a ghost and fades out
      const ghost = this.add.image(sprite.x, sprite.y, sprite.texture.key).setOrigin(sprite.originX, sprite.originY).setFlipX(sprite.flipX);
      view.addAt(ghost, view.getIndex(sprite));
      ghost.rule = unit.frameScale || 1; // the old picture's own ruler scale (18.2), kept while it fades
      ghost.setScale(sprite.scaleX, sprite.scaleY);
      ghosts.push(ghost);
      this.showFrame(unit, frame);
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: 200 });
      this.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => { ghosts.splice(ghosts.indexOf(ghost), 1); ghost.destroy(); } });
    };
    // the hit picture melts out of whatever it was showing (a flinch, a stance) instead of snapping
    if (names.length && (afterFall || names[0] === 'knocked')) fadeTo(names[0]); else this.showPose(unit, 'knocked', -dx);
    // when each fade starts, as a share of the whole fall
    const starts = names.slice(1).map((n, i) => (wall ? 0.4 : 0.25) + (wall ? 0.4 : 0.45) * ((i + 0.5) / (names.length - 1)));
    let nextFade = 0;

    // the resting size, read fresh each time: it changes with the picture shown (size ruler, 18.2)
    const base = sprite ? { get sx() { return unit.artScale || sprite.scaleX; }, get sy() { return unit.artScale || sprite.scaleY; } } : null;
    const x0 = view.x;
    const y0 = view.y;
    const land = wall ? 0.3 : 0.45;   // the share of the fall at which it hits the ground or the wall
    let landed = false;
    const ease = (u) => 1 - (1 - u) * (1 - u);
    const flight = { p: 0 };
    this.tweens.add({
      targets: flight,
      p: 1,
      duration: wall ? 780 : 760,
      ease: 'Linear',
      onUpdate: () => {
        if (!view.active) return;
        const p = flight.p;
        if (!wall) {
          if (p < land) {
            const u = p / land;
            view.x = x0 + away * 30 * reach * ease(u);
            view.y = y0 - Math.sin(u * Math.PI) * 30 * reach;
            if (sprite) sprite.angle = lean * 26 * ease(u);   // the head goes back as it is knocked
          } else {
            const u = (p - land) / (1 - land);
            view.x = x0 + away * reach * (30 + 16 * ease(u));
            view.y = y0 - Math.sin(Math.min(1, u * 2.2) * Math.PI) * 7;   // one small bounce
            // lying down (a picture of it) or toppling over (no picture of it)
            if (sprite) sprite.angle = hasDown ? lean * 26 * (1 - ease(u)) : lean * (26 + 59 * u * u * (3 - 2 * u));
          }
        } else if (p < land) {
          // flying into the wall: leaning into it
          const u = p / land;
          view.x = x0 + wall.x * 16 * u * u;
          view.y = y0 + wall.y * 8 * u * u;
          if (sprite) sprite.angle = -lean * 10 * u;
        } else {
          // slumping down the wall: slides down a little and ends up lying away from it
          const u = (p - land) / (1 - land);
          view.x = x0 + wall.x * 16 * (1 - ease(Math.min(1, u * 3))) - wall.x * 10 * ease(u) + away * 8 * ease(u);
          view.y = y0 + wall.y * 8 * (1 - ease(Math.min(1, u * 3))) + 14 * u * u;
          if (sprite) sprite.angle = hasDown ? -lean * 10 * (1 - ease(u)) : away * 85 * u * u * (3 - 2 * u);
        }
        // the picture swaps are fades, started on the way
        while (nextFade < starts.length && p >= starts[nextFade]) fadeTo(names[++nextFade]);
        for (const g of ghosts) { const k = g.rule / (unit.frameScale || 1); g.setAngle(sprite.angle).setScale(sprite.scaleX * k, sprite.scaleY * k); }
        // the hit: a squash and the dust, once
        if (!landed && p >= land) {
          landed = true;
          if (wall) play('bash'); else if (!afterFall) play('crash'); // (after a fall the crash has just been heard)
          if (sprite && base) {
            const wide = wall ? Math.abs(wall.x) > Math.abs(wall.y) : false;
            // squashed flat on the ground, or flat against a wall left or right of it
            const sq = wall && wide ? { x: base.sx * 0.72, y: base.sy * 1.1 } : { x: base.sx * 1.16, y: base.sy * 0.8 };
            this.tweens.add({ targets: sprite, scaleX: sq.x, scaleY: sq.y, duration: 80, yoyo: true, ease: 'Quad.easeOut', onComplete: () => sprite.active && sprite.setScale(base.sx, base.sy) });
          }
          const px = view.x + (wall ? wall.x * 10 : 0);
          dustPuff(this, px, view.y);
          if (!wall) groundRing(this, view.x, view.y, 0xe8c08a, 1.2);
          else this.time.delayedCall(180, () => view.active && dustPuff(this, view.x, view.y + 6)); // and a second puff as it slides down
          screenShake(this, wall ? 0.005 : 0.006, 170);
        }
      },
      onComplete: () => {
        if (!view.active) return;
        for (const g of ghosts) g.destroy();
        if (sprite && sprite.active) { sprite.setAlpha(1); if (base) sprite.setScale(base.sx, base.sy); }
        // it lies still for a moment, then the dissolve (goldDissolve in spellArt.js)
        this.time.delayedCall(420, () => {
          if (!view.active) return;
          goldDissolve(this, unit);
          floorLight(this, unit.view.x, unit.view.y, elementOf('spirit').glow, { size: 1.6, peak: 0.5, ms: 1100 }); // the gold lights the ground as it goes (18.23)
        });
      },
    });
  }

  // Text that floats up from a unit and fades, like "-7" or "Miss".
  // A number or a short reaction stays over the fighter (moved clear of other words, kept
  // inside the screen); a longer callout goes to the lane under the turn strip with the
  // fighter's name (M6, 17.3: src/callouts.js).
  floatText(unit, text, color, options = {}) {
    if (!options.pop && !options.big && !staysOnUnit(text) && this.lay) {
      const from = unit.name ? unit : unit.owner || {};
      return laneCallout(this, from.name || '', from.side || 'hero', text, color);
    }
    const big = !!options.big;
    const label = this.add
      .text(unit.view.x, unit.view.y - unit.topY - 20 - (options.rise || 0), text, {
        fontFamily: 'Georgia, serif',
        fontSize: options.size ? options.size + 'px' : big ? '54px' : '40px',
        fontStyle: 'bold',
        color,
        stroke: '#1a1410',
        strokeThickness: big ? 8 : 6,
      })
      .setOrigin(0.5)
      .setDepth(80); // above every tile and unit
    placeLabel(this, label);

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

  // The end of the battle (M12, 17.10). It builds up: the last blow plays slowly, the board
  // dims, the side still standing celebrates, the word sweeps in with its sting of music,
  // then the numbers: turns against par with a rating (13.45), damage, who fell, the faces.
  showResult(outcome) {
    clearSave(); // the battle is over: nothing to come back to (M16)
    dropTurnBanner(this);
    this.resultShown = true; this.stopUnitHold(); hideTip(this);
    this.setSpeed('enemy', 1); // the ending always plays at normal speed
    const won = outcome === 'victory';
    stopMusic();
    this.statusText.setText('');
    for (const slot of [...this.slots, ...this.halves, ...this.lowHalves]) slot.set(null);
    // 1. the last blow, slowly (real time: the scene's own clock is the thing being slowed)
    this.setSpeed('finale', endingRules.slowTo);
    this.finaleTimer = setTimeout(() => { this.finaleTimer = null; if (this.sys.isActive()) this.setSpeed('finale', 1); }, endingRules.slowMs);
    this.events.once('shutdown', () => { if (this.finaleTimer) clearTimeout(this.finaleTimer); this.speed.finale = 1; });
    this.resetCamera(300);
    // 2. the board dims behind the fighters still standing
    const v = this.cameras.main.worldView;
    this.resultDim = this.add.rectangle(v.centerX, v.centerY, v.width * 3, v.height * 3, 0x000000, 0).setDepth(78.5);
    this.tweens.add({ targets: this.resultDim, fillAlpha: endingRules.dim, duration: 500 });

    const survivors = this.units.filter((u) => u.alive && u.side === (won ? 'hero' : 'enemy'));
    survivors.forEach((u, i) => {
      this.time.delayedCall(i * 140, () => {
        const foeSide = won ? 1 : -1;
        // two frames, no jump (Suleiman 31 Oct, roadmap 8.13): ready, then the victory pose
        const cheer = poseFrame(u.id, 'victory', 'right') ? 'victory' : 'attack';
        this.showPose(u, 'ready', foeSide);
        this.time.delayedCall(260, () => u.alive && this.showPose(u, cheer, foeSide));
      });
    });
    // 3. the word and the numbers
    this.time.delayedCall(700, () => this.showResultPanel(won));
  }

  showResultPanel(won) {
    this.resultShown = true; // (the HTML HUD steps aside for the result, 18.44)
    play(won ? 'victory' : 'defeat'); // the sting, as the word arrives
    // laid out around the middle of the screen, whatever its shape
    const W = this.scale.width;
    const H = this.scale.height;
    const least = this.lay ? this.lay.minText : 11;
    // On a wide screen (720 game pixels tall) the whole panel is drawn smaller so it fits: k (M8, E2)
    const linesTall = 170 + 45 + 36 + (won ? 58 + 36 + 60 : 30) + 30 + 36 + 33 + 102 + (won && this.stepIndex !== null ? 2 : 1) * 92 + 24;
    const k = Math.min(1, (H - 28) / linesTall);
    const K = (n) => Math.round(n * k);
    const F = (n) => Math.max(K(n), least); // letters never under 11 real pixels
    const cover = this.ui(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(300));
    this.tweens.add({ targets: cover, fillAlpha: 0.55, duration: 300 });

    // what happened
    const team = this.units.filter((u) => u.side === 'hero').length;
    const tally = battleTally(this.units, this.damageTaken || {});
    const par = parFor(this.mapName, team);
    const rating = won ? rateWin(this.turnCount, par) : null;
    const best = won ? recordBest(this.mapName, team, this.turnCount) : null;
    this.result = { won, turns: this.turnCount, par, rating, best, tally };

    // the panel is as tall as what it holds: more lines after a win, one or two buttons
    const buttons = won && this.stepIndex !== null ? 2 : 1;
    const lh = (n) => Math.round(F(n) * 1.5);
    const pw = Math.min(620, W - 60);
    const ph = Math.min(H - 16, K(170) + lh(30) + lh(24) + (rating ? (rating.banner ? K(58) : 0) + lh(24) + 2 * lh(20) : lh(20)) + K(30) + lh(24) + lh(22) + K(102) + buttons * K(92) + K(24));
    const px = W / 2 - pw / 2, py = Math.round(H / 2 - ph / 2);
    const parts = [];
    const add = (o) => { this.ui(o); parts.push(o); return o; };
    // the FFT frame of the UI rework (16 Nov), like every other panel of the battle screen
    const resultFrame = add(this.add.graphics().setDepth(301));
    framePanel(resultFrame, px, py, pw, ph, this.lay.px, { alpha: 0.85 });
    // the word sweeps in from the side, over a streak of light
    const streak = add(this.add.rectangle(-W, py + K(96), W * 1.2, 6, won ? 0xffe08a : 0xff6b5a, 0.9).setDepth(302));
    const title = add(this.add.text(-W / 2, py + K(96), won ? 'Victory' : 'Defeat', textStyle(K(96), won ? '#ffe08a' : '#ff6b5a', { fontStyle: 'bold' })).setOrigin(0.5).setDepth(303));
    this.tweens.add({ targets: title, x: W / 2, duration: 320, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: streak, x: W * 1.6, duration: 520, ease: 'Cubic.easeOut', onComplete: () => streak.setVisible(false) });
    screenShake(this, 0.004, 140);
    let y = py + K(170);
    const line = (text, size, color = '#f1e6c8', extra = {}) => { const t = add(this.add.text(W / 2, y, text, textStyle(F(size), color, extra)).setOrigin(0.5).setDepth(302).setAlpha(0)); y += Math.round(F(size) * 1.5); return t; };
    const rows = [];
    rows.push(line(won ? 'All enemies defeated.' : 'All heroes have fallen.', 30));
    // a Swift win: the gold banner (the bonus for beating par, 13.45)
    if (rating && rating.banner) {
      const band = add(this.add.rectangle(W / 2, y + K(16), pw - 80, K(44), 0xb8860b, 0.95).setStrokeStyle(2, 0xffe08a).setDepth(302).setAlpha(0));
      const word = add(this.add.text(W / 2, y + K(16), rating.banner, textStyle(F(24), '#fff4d6', { fontStyle: 'bold' })).setOrigin(0.5).setDepth(303).setAlpha(0).setLetterSpacing(3));
      rows.push(band, word); y += K(58);
    }
    rows.push(line('Turns played: ' + this.turnCount, 24, '#e8d5a8'));
    if (rating) {
      rows.push(line('Par ' + par + '   ·   ' + rating.name + '  ' + '★'.repeat(rating.stars) + '☆'.repeat(3 - rating.stars), 24, rating.id === 'swift' ? '#ffe08a' : rating.id === 'steady' ? '#9fdc8a' : '#d8c8a4', { fontStyle: 'bold' }));
      rows.push(line(rating.under >= 0 ? rating.under + ' under par. ' + rating.text : -rating.under + ' over par. ' + rating.text, 20, '#a89a78'));
      rows.push(line(best.isNew ? 'New best: ' + best.best + ' turns' : 'Best: ' + best.best + ' turns', 20, best.isNew ? '#ffe08a' : '#a89a78'));
    } else {
      rows.push(line('Par for a win here: ' + par + ' turns', 20, '#a89a78'));
    }
    rows.push(add(this.add.tileSprite(W / 2, y + 4, 420, 18, 'ui-woven').setDepth(302).setAlpha(0))); y += K(30);
    rows.push(line('Damage dealt ' + tally.dealt + '   ·   taken ' + tally.taken, 24));
    rows.push(line(tally.fallenHeroes.length ? 'Fell: ' + tally.fallenHeroes.join(', ') : 'No hero fell.', 22, tally.fallenHeroes.length ? '#ff9a8a' : '#9fdc8a'));
    // the heroes' faces: bright if standing, dark if fallen
    const r = K(30), gap = K(78), x0 = W / 2 - ((tally.heroes.length - 1) * gap) / 2;
    y += r + K(6);
    tally.heroes.forEach((u, i) => {
      const face = add(portraitMedallion(this, x0 + i * gap, y, r, u, portraitKey(u.id, u), { active: u.alive }).setDepth(302).setAlpha(0));
      face.fallen = !u.alive;
      rows.push(face);
    });
    y += r + K(30);
    // one after another, like a roll being read out
    rows.forEach((o, i) => this.tweens.add({ targets: o, alpha: o.fallen ? 0.35 : 1, delay: 260 + i * 90, duration: 200 }));
    this.resultRows = rows;

    const addButton = (label, icon, onTap) => {
      const button = new CommandButton(this, W / 2, y + K(30), K(420), K(76));
      button.set(label, icon, true, onTap);
      button.view.setDepth(303);
      this.ui(button.view);
      this.resultButtons.push(button);
      y += K(92);
    };

    // After a win, "Continue" moves the story on to the next step
    if (won && this.stepIndex !== null) addButton('Continue', 'press', () => startStep(this, this.stepIndex + 1));
    // Restarting the scene builds a brand new battle from units.json
    addButton(won ? 'Play again' : 'Try again', 'back', () => this.scene.restart({ stepIndex: this.stepIndex, map: this.mapName, lineUp: this.chosenLineUp })); // the same line-up again (18.30)
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

    // It looks after itself first: a healing item when hurt, a cure when poisoned (roadmap 5.4)
    const itemId = enemyItemChoice(unit);
    if (itemId) {
      this.busy = true;
      this.useItem(unit, unit, itemId, () => {
        this.busy = false;
        this.enemyWrapUp(unit);
      });
      return;
    }

    // ...and after an ally standing next to it who is badly hurt, poisoned or burning (roadmap 13.25)
    const mates = this.units.filter((o) => o.alive && o.side === unit.side && o !== unit && distance(unit, o) === 1);
    const gift = enemyAllyItemChoice(unit, mates);
    if (gift) {
      this.busy = true;
      this.useItem(unit, gift.target, gift.id, () => {
        this.busy = false;
        this.enemyWrapUp(unit);
      });
      return;
    }

    // It plans with what it can see: a hidden caster's decoy instead of her.
    // Her real tile still blocks the way, even if they do not know why.
    const hiddenAt = (c, r) => this.units.some((u) => u.alive && u.hidden && u.col === c && u.row === r) || !!this.spikeAt(c, r) || !!this.potAt(c, r);
    // Tayo with an element on him fires it down a line at once, without walking up first (roadmap 13.4)
    const mark = this.blastTarget(unit);
    if (mark && distance(unit, mark) >= 2) {
      this.busy = true;
      startCooldown(unit, 'elementBlast');
      unit.hasActed = true;
      this.castElementBlast(unit, mark, spells.elementBlast, () => {
        this.busy = false;
        this.enemyWrapUp(unit);
      });
      return;
    }
    // The archer throws a Smoke Bomb when a foe is next to her and she is hurt or cornered (13.26)
    const smokeTile = this.smokeChoice(unit);
    if (smokeTile) {
      this.busy = true;
      spendMp(unit, 'smokeBomb');
      startCooldown(unit, 'smokeBomb');
      unit.hasActed = true;
      this.castSmokeBomb(unit, smokeTile, () => {
        this.busy = false;
        this.enemyWrapUp(unit);
      });
      return;
    }
    // A foe stands next to the archer: she does not walk off to shoot it. She takes her
    // dagger and stabs first, then steps back with the steps she has left (1.46, 13.53).
    if (unit.closeWeapon && this.adjacentFoe(unit)) {
      this.enemyAttack(unit);
      return;
    }
    // Nobody to strike this turn: it forages (roadmap 13.48). It digs up what is buried or
    // dropped beside it, or walks to a spot it can reach this turn and digs there.
    const forage = this.forageChoice(unit);
    if (forage) {
      const dig = () => {
        this.busy = true;
        this.digUp(unit, forage.site, () => {
          this.busy = false;
          this.enemyWrapUp(unit);
        });
      };
      if (forage.tile) this.moveUnit(unit, forage.tile.col, forage.tile.row, dig);
      else dig();
      return;
    }
    const tile = chooseMoveTile(unit, this.enemyEyes(), hiddenAt);

    if (tile) {
      this.moveUnit(unit, tile.col, tile.row, () => this.enemyAttack(unit));
    } else {
      this.enemyAttack(unit);
    }
  }

  // Enemies forage too (roadmap 13.48, Suleiman 13 Nov). What an enemy would dig up this turn,
  // or null. It forages only when it cannot strike anyone this turn (no foe within its walk
  // plus its reach), and only for something it or its side can use: healing and cures always,
  // spirit water only if it has MP, a kola nut only if it fights in clashes.
  // Returns { site, tile }: tile is where to walk first, or null if it already stands beside it.
  forageChoice(unit) {
    if (unit.engagedWith || unit.hasActed) return null;
    const foes = this.enemyEyes().filter((o) => o.alive && o.side !== unit.side && !o.isDecoy);
    if (foes.some((f) => distance(unit, f) <= moveOf(unit) + unit.range)) return null;
    const useful = (st) => st.items.some((id) => ITEMS[id].heal || ITEMS[id].cure || (ITEMS[id].mp && unit.maxMp > 0) || (ITEMS[id].poise && !!unit.contest));
    const sites = (this.sites || []).filter((st) => !st.dug && useful(st));
    if (sites.length === 0) return null;
    const near = sites.filter((st) => distance(unit, st) <= 1).sort((a, b) => distance(unit, a) - distance(unit, b))[0];
    if (near) return { site: near, tile: null };
    const walk = getReachableTiles(unit.col, unit.row, moveOf(unit), (c, r) => this.isBlocked(c, r), moveRules(unit));
    let best = null;
    for (const st of sites) {
      for (const t of walk) {
        if (distance(t, st) > 1) continue;
        const steps = distance(unit, t);
        if (!best || steps < best.steps) best = { site: st, tile: t, steps };
      }
    }
    return best ? { site: best.site, tile: best.tile } : null;
  }

  // Where an enemy with a Smoke Bomb would slip to, or null if it should not throw one now:
  // only with a foe next to it, and only when it is hurt (60% health or less) or cornered (no
  // tile it can walk to is out of every foe's reach). It picks the tile furthest from the foes.
  smokeChoice(unit) {
    if (!unit.spells.includes('smokeBomb') || !canAfford(unit, 'smokeBomb') || unit.engagedWith) return null;
    const foes = this.enemyEyes().filter((o) => o.alive && o.side !== unit.side && !o.isDecoy);
    if (!foes.some((f) => distance(unit, f) === 1)) return null;
    const blocked = (c, r) => this.isBlocked(c, r);
    const walk = getReachableTiles(unit.col, unit.row, moveOf(unit), blocked, moveRules(unit));
    const cornered = !walk.some((t) => foes.every((f) => distance(t, f) >= 2));
    if (unit.hp / unit.maxHp > 0.6 && !cornered) return null;
    const out = [{ col: unit.col, row: unit.row }, ...getReachableTiles(unit.col, unit.row, spells.smokeBomb.range, blocked, moveRules(unit))];
    const room = (t) => Math.min(4, ...foes.map((f) => distance(t, f)));
    out.sort((a, b) => room(b) - room(a) || distance(unit, a) - distance(unit, b));
    return out[0];
  }

  // Attacks the weakest hero in range, if any, then ends the turn.
  enemyAttack(unit) {
    this.aiPickWeapon(unit); // her one free weapon switch: dagger next to a foe, bow otherwise (13.29)
    const finish = () => {
      this.busy = false;
      this.enemyWrapUp(unit);
    };
    // the two kings play their own kits (src/kingsScene.js)
    if ((unit.grip || unit.attune) && this.kingAiAct(unit, finish)) return;
    // Rabdul sets Shango's symbol on the weapon that will do most with it:
    // the hardest-hitting ally (or himself) who is in the fight (roadmap 4.1)
    if (unit.spells.includes('enchant') && canAfford(unit, 'enchant')) {
      const ally = this.enchantPick(unit);
      // his own weapon can wait when a foe is already in reach: he strikes now
      const strikeNow = ally === unit && getTargetsInRange(unit, this.enemyEyes()).length > 0;
      if (ally && !strikeNow) {
        this.busy = true;
        spendMp(unit, 'enchant');
        startCooldown(unit, 'enchant');
        unit.hasActed = true;
        this.castEnchant(unit, ally, spells.enchant, finish);
        return;
      }
    }
    // Tayo with an element on him fires it at a foe in a line (roadmap 13.4), full damage, before the spike
    const blastAt = this.blastTarget(unit);
    if (blastAt) {
      this.busy = true;
      startCooldown(unit, 'elementBlast');
      unit.hasActed = true;
      this.castElementBlast(unit, blastAt, spells.elementBlast, finish);
      return;
    }
    // Tayo claps when 2 or more foes are within 2 tiles (roadmap 13.31): a shockwave that knocks them all back
    // ...or when one of his Earth Drive rocks stands in reach with a foe beside it: the combo (13.38)
    if (unit.spells.includes('clap') && canAfford(unit, 'clap') && (this.clapFoes(unit).length >= 2 || this.clapCombo(unit))) {
      this.busy = true;
      startCooldown(unit, 'clap');
      unit.hasActed = true;
      this.castClap(unit, spells.clap, finish);
      return;
    }
    // Tayo drives a spike up under a foe right next to him: a caster first,
    // then the weakest (roadmap 4.2)
    if (unit.spells.includes('earthDrive') && canAfford(unit, 'earthDrive')) {
      const near = this.enemyEyes()
        .filter((t) => t.side !== unit.side && t.alive && !t.isDecoy && distance(unit, t) === 1)
        .sort((a, b) => isCaster(b) - isCaster(a) || a.hp - b.hp);
      if (near.length > 0) {
        this.busy = true;
        startCooldown(unit, 'earthDrive');
        unit.hasActed = true;
        this.castEarthDrive(unit, near[0], spells.earthDrive, finish);
        return;
      }
    }

    // A Defence fighter (like a Guardian) tries to pin a hero fighter in an
    // engagement, to tie it up while its allies strike.
    // It only pins when an ally is close enough to take advantage of it.
    const allyNear = (t) => this.units.some((o) => o.alive && o.side === unit.side && o !== unit && distance(o, t) <= o.move + o.range);
    // After an engagement ends it waits one of its own turns before pinning
    // again, so it does not lock the same hero down turn after turn.
    // The whole enemy side also shares one wait (roadmap 18.15, 14 Nov): after any enemy starts a
    // clash, no enemy starts another for "enemyClashGap" turns (engagement.json). Without it the
    // heroes spent more turns in stances than attacking and almost never won.
    const sideRested = this.lastEnemyClashTurn === undefined || this.turnCount - this.lastEnemyClashTurn >= (engagementRules.enemyClashGap || 0);
    const rested = sideRested && (!unit.lastEngagedTurn || this.turnCount - unit.lastEngagedTurn > 6);
    const seen = this.enemyEyes();
    const pins = engageTargets(unit, seen).filter((t) => !t.isDecoy && allyNear(t));
    // (tanks with a signature stance, like the Bruiser and the Warlord, want clashes too)
    if ((styleOf(unit) === 'defence' || unit.signature) && rested && pins.length > 0) {
      pins.sort((a, b) => b.attack - a.attack); // the most dangerous one
      this.busy = true;
      this.lastEnemyClashTurn = this.turnCount;
      this.performEngage(unit, pins[0], () => {
        this.busy = false;
        this.enemyWrapUp(unit);
      });
      return;
    }

    // A Shield Toss from a distance: stun a foe it cannot reach this turn (a caster first)
    if (unit.spells.includes('shieldToss') && canAfford(unit, 'shieldToss') && getTargetsInRange(unit, seen).length === 0) {
      const reach = spells.shieldToss.range;
      const marks = seen
        .filter((t) => t.side !== unit.side && t.alive && !t.isDecoy && !isStunned(t) && distance(unit, t) >= 2 && distance(unit, t) <= reach && hasClearShot(unit, t))
        .sort((a, b) => isCaster(b) - isCaster(a) || b.attack - a.attack);
      if (marks.length > 0) {
        this.busy = true;
        spendMp(unit, 'shieldToss');
        startCooldown(unit, 'shieldToss');
        unit.hasActed = true;
        this.castShieldToss(unit, marks[0], spells.shieldToss, () => {
          this.busy = false;
          this.enemyWrapUp(unit);
        });
        return;
      }
    }

    // A Lunge (Gaha) at a foe in a straight line, 3 or 4 tiles away, when nobody is in spear reach yet:
    // a caster first, then the weakest
    if (unit.spells.includes('lunge') && canAfford(unit, 'lunge') && !unit.engagedWith && getTargetsInRange(unit, seen).length === 0) {
      const marks = seen
        .filter((t) => t.side !== unit.side && t.alive && !t.isDecoy && this.lungeSpot(unit, t, spells.lunge))
        .sort((a, b) => isCaster(b) - isCaster(a) || a.hp - b.hp);
      if (marks.length > 0) {
        this.busy = true;
        startCooldown(unit, 'lunge');
        unit.hasActed = true;
        this.castLunge(unit, marks[0], spells.lunge, () => {
          this.busy = false;
          this.enemyWrapUp(unit);
        });
        return;
      }
    }

    // Kofi (1.78, Suleiman 21 Nov: "low health and not making use of his infusion abilities, not even casting Haunt"):
    // he used to have no choice here at all, so only his free Spirit Bolt ever went off. Now he blesses a friend or
    // himself with Infuse when that helps, and hexes a foe with Haunt, before he falls back on the bolt.
    const shaman = unit.reading ? this.shamanChoice(unit) : null;
    if (shaman) {
      this.busy = true;
      this.castSpell(unit, shaman.target, shaman.id, () => {
        this.busy = false;
        this.enemyWrapUp(unit);
      });
      return;
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
    if (unit.spells.includes('poisonArrow') && canAfford(unit, 'poisonArrow') && !isBlinded(unit) && !holdsDagger(unit)) { // (it needs the bow in hand)
      const reach = spells.poisonArrow.range;
      const marks = targets.filter((t) => !t.isDecoy && !isPoisoned(t) && distance(unit, t) <= reach).sort((a, b) => b.hp - a.hp);
      if (marks.length > 0) {
        this.busy = true;
        spendMp(unit, 'poisonArrow');
        startCooldown(unit, 'poisonArrow');
        unit.hasActed = true;
        this.castPoisonArrow(unit, marks[0], spells.poisonArrow, () => {
          this.busy = false;
          this.enemyWrapUp(unit);
        });
        return;
      }
    }
    this.busy = true;
    const done = () => {
      this.busy = false;
      this.enemyWrapUp(unit);
    };
    if (targets[0].isDecoy) {
      unit.stepsUsed = Infinity; // fooled by Husk: it does not walk on after striking the decoy (the trick must cost it the turn)
      this.strikeDecoy(unit, targets[0].decoy, done);
    }
    else if (unit.spells.includes('doubleHit') && distance(unit, targets[0]) <= spells.doubleHit.range && Math.random() < (spells.doubleHit.chance || 0)) {
      // the double hit is a chance on his normal attack (roadmap 4.6)
      unit.hasActed = true;
      this.castDoubleHit(unit, targets[0], spells.doubleHit, done);
    } else this.performAttack(unit, targets[0], done);
  }

  // The end of an enemy's turn (roadmap 13.53, act then move). A turn is one
  // action and up to "move" steps, in any order, for both sides. So an enemy
  // that has acted and still has steps left may use them now:
  //   - a ranged unit (the archer) backs away from the heroes, but only to a
  //     tile it can still shoot from; if it is taking aim (Poison Arrow) it
  //     keeps its target in reach and in clear sight
  //   - a close fighter that acted from a distance (Shield Toss, Element
  //     Blast, Enchant) walks up toward the heroes
  // It never walks out of a fight it is standing in, and the choice of tile is
  // in src/enemyAi.js (chooseAfterTile). Then the turn ends.
  enemyWrapUp(unit) {
    const end = () => this.time.delayedCall(300, () => this.endTurn());
    const cannot = () => this.battleOver || !unit.alive || unit !== this.activeUnit || unit.engagedWith || unit.knock || unit.hidden || unit.smokeHidden || this.stepsLeft(unit) <= 0;
    if (this.enemySecondWalk === false || cannot()) return end(); // (tests can switch the second walk off)
    this.time.delayedCall(260, () => {
      if (cannot() || this.busy) return end();
      const hiddenAt = (c, r) => this.units.some((u) => u.alive && u.hidden && u.col === c && u.row === r) || !!this.spikeAt(c, r) || !!this.potAt(c, r) || this.isDecoyAt(c, r);
      const aim = unit.aiming && unit.aiming.target && unit.aiming.target.alive ? { target: unit.aiming.target, range: (spells[unit.aiming.spellId] || {}).range || unit.range } : null;
      const tile = chooseAfterTile(unit, this.enemyEyes(), this.stepsLeft(unit), hiddenAt, aim);
      if (!tile) return end();
      this.moveUnit(unit, tile.col, tile.row, () => end());
    });
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
  // Changes the loser's tile and health straight away; returns what happened
  // ({ from, path, fall }), which knockBack then shows.
  // Works out a push WITHOUT changing anything: where the unit would end up.
  // pushLoser uses it for the real push, and the skill preview (src/preview.js,
  // roadmap 18.4) uses it to show the landing tile before the player confirms,
  // so the two can never disagree.
  //   winner : the unit, or just a tile { col, row }, the push comes from
  //   moved  : optional { unit, to }: plan as if that unit had already gone to
  //            the tile "to" (a charge ends next to the foe before it pushes)
  // Returns { held, path, levels, slam } (held: it cannot be pushed at all;
  // levels: how far it falls; slam: true if something stopped it short).
  pushPlan(loser, winner, steps, moved = null) {
    if (isRooted(loser) && steps > 0) return { held: true, rooted: true, path: [], levels: 0, slam: false };
    steps = Math.max(0, steps - pushResist(loser)); // Bulwark: a warden in Guard is hard to move
    if (steps === 0) return { held: true, path: [], levels: 0, slam: false };
    const blocked = (c, r) => {
      if (moved && moved.unit.col === c && moved.unit.row === r && !(moved.to.col === c && moved.to.row === r)) return this.isDecoyAt(c, r) || !!this.spikeAt(c, r) || !!this.potAt(c, r); // it has left this tile
      if (moved && moved.to.col === c && moved.to.row === r) return true; // and stands here now
      return this.isBlocked(c, r);
    };
    const isFree = (c, r, fc, fr) =>
      isInsideGrid(c, r) && !blocked(c, r) && getHeight(c, r) - getHeight(fc, fr) <= terrain.pushClimbLimit;
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
    return { held: false, path, levels, slam: path.length < steps };
  }

  pushLoser(loser, winner, steps) {
    if (this.unmovedCatch(loser, winner)) return { path: [], fall: null, held: true }; // Alagara's Unmoved (Stone)
    const plan = this.pushPlan(loser, winner, steps);
    if (plan.held) {
      // Gaha standing his ground under Stone: nothing moves him
      if (plan.rooted) this.time.delayedCall(420, () => loser.alive && this.floatText(loser, 'Rooted!', '#d9b77a', { rise: 46 }));
      return { path: [], fall: null, held: true };
    }
    const from = { col: loser.col, row: loser.row }; // where it stood (the knockback starts its flight here)
    const { path, levels } = plan;
    if (path.length > 0) {
      loser.col = path[path.length - 1].col;
      loser.row = path[path.length - 1].row;
    }
    let fall = levels > 0 ? { levels, damage: levels * terrain.fallDamagePerLevel } : null;
    // Pushed into a wall, higher ground or another unit before the push was
    // used up: it slams into it, takes impact damage and is Disoriented
    // (Suleiman, 29 Oct; conditions.json). "fall" carries it, so every place
    // that shows a fall shows the slam too.
    if (plan.slam) {
      const toward = tileToScreen(loser.col + Math.sign(loser.col - winner.col), loser.row + Math.sign(loser.row - winner.row));
      const here = tileToScreen(loser.col, loser.row);
      fall = { ...(fall || { levels: 0, damage: 0 }), slam: conditions.disoriented.impactDamage, toward: { x: toward.x - here.x, y: toward.y - here.y } };
      applyDisoriented(loser, this.activeUnit === loser);
    }
    if (fall) {
      loser.hp = Math.max(0, loser.hp - fall.damage - (fall.slam || 0));
      if (loser.hp === 0) this.defeat(loser);
      else {
        this.interrupt(loser); // a fall or a slam breaks a trance or an aim too
        this.breakChannel(loser, 'Slammed'); // and Gadara's Singularity
      }
    }
    if (this.relayQueue && (path.length > 0 || (fall && fall.slam)) && loser.hp > 0) this.relayQueue.push({ unit: loser, by: winner }); // Relay Strike may follow
    if (path.length > 0 || fall) { loser.knockPending = true; loser.pushedFrom = from; } // showImpact leaves the body to the knockback; drawn on its old tile till then (1.68)
    return { from, path, fall };
  }

  // ---------- Relay Strike (Suleiman's spec, roadmap 13.40) ----------
  // A skill that pushes starts collecting its pushes here; when the skill is
  // done the wrapped onDone plays the free follow-up strikes, then carries on.
  collectRelays(onDone) {
    this.relayQueue = [];
    return () => {
      const queue = this.relayQueue || [];
      this.relayQueue = null;
      if (queue.length === 0 || this.battleOver) return onDone();
      this.playRelays(queue, onDone);
    };
  }

  // Can this ally relay-strike this foe now? It must be on the pusher's side,
  // next to the foe, free (not in a clash, stunned or meditating), within reach
  // of its weapon, and not have relayed already this round (one full cycle of turns).
  canRelay(ally, foe) {
    if (!ally.alive || ally.isDecoy || ally.side === foe.side) return false;
    if (ally.engagedWith || isStunned(ally) || ally.meditating) return false;
    if (distance(ally, foe) !== 1 || getTargetsInRange(ally, [foe]).length === 0) return false;
    const cycle = this.units.filter((u) => u.alive).length;
    return ally.relayTurn === undefined || this.turnCount - ally.relayTurn >= cycle;
  }

  // Works out who relays for each push, then plays them one after another.
  playRelays(queue, done) {
    const steps = []; // { ally, foe, nth }
    for (const { unit: foe, by } of queue) {
      if (!foe.alive) continue;
      let nth = 0;
      for (const ally of this.units) {
        if (nth >= relayRules.perPush) break;
        if (ally === by || ally.side !== by.side || !this.canRelay(ally, foe)) continue;
        ally.relayTurn = this.turnCount; // used up for this round
        steps.push({ ally, foe, nth });
        nth++;
      }
    }
    const next = (i) => {
      if (i >= steps.length) return done();
      const { ally, foe, nth } = steps[i];
      if (!ally.alive || !foe.alive) return next(i + 1);
      this.relayStrike(ally, foe, nth, (outcome) => (outcome ? this.endBattleFromRelay(outcome) : next(i + 1)));
    };
    this.busy = true;
    next(0);
  }

  // ---------- Counterstep (Gaha's passive, roadmap 13.59) ----------
  // A close fighter misses him: he gets a free Thrust at 60 percent (full if the attacker is Off-Balance).
  // Once per round, never in a clash, Stunned or Meditating. It is a free strike, not an attack roll,
  // so it can never set off another Counterstep.
  canCounterstep(unit, foe) {
    // a melee attack only: a bow or a spell does not set it off (an archer's dagger does)
    if (!unit.counterstep || !unit.alive || !foe.alive || foe.side === unit.side || !(isMelee(foe) || holdsDagger(foe))) return false;
    if (unit.engagedWith || isStunned(unit) || unit.meditating || getTargetsInRange(unit, [foe]).length === 0) return false;
    const cycle = this.units.filter((u) => u.alive).length;
    return unit.counterTurn === undefined || this.turnCount - unit.counterTurn >= cycle;
  }

  counterstep(unit, foe, onDone) {
    unit.counterTurn = this.turnCount; // used up for this round
    this.relayStrike(unit, foe, 0, onDone, { word: 'Counterstep!', rules: relayRules.counterstep });
  }

  endBattleFromRelay(outcome) {
    this.battleOver = true;
    this.busy = false;
    this.showResult(outcome);
  }

  // One free strike: a "Relay!" callout, a short dash at the foe, the hit, back to place.
  // (opts.word and opts.share let Gaha's Counterstep use the same strike with its own word and numbers)
  relayStrike(ally, foe, nth, onDone, opts = {}) {
    const rules = opts.rules || relayRules;
    const share = (isOffBalance(foe) ? rules.offBalanceShare : rules.share) * (nth > 0 ? relayRules.secondShare : 1);
    const landed = this.landHit(foe, Math.max(1, Math.round(getDamage(ally, foe) * share)));
    foe.hp = Math.max(0, foe.hp - landed.damage);
    if (foe.hp === 0) this.defeat(foe);
    const outcome = this.checkBattleEnd();
    this.refreshButtons();
    const dx = foe.view.x - ally.view.x;
    const dy = foe.view.y - ally.view.y;
    this.faceToward(ally, dx, dy);
    this.floatText(ally, opts.word || 'Relay!', '#ffd27a', { rise: 44, pop: true });
    play('whoosh');
    this.showPose(ally, 'attack', dx);
    const home = tileToScreen(ally.col, ally.row); // its tile, not where it happens to be (13.47)
    this.tweens.add({ targets: ally.view, x: home.x + dx * 0.45, y: home.y + dy * 0.45, duration: 110, ease: 'Quad.easeIn', delay: 120,
      onComplete: () => {
        this.showImpact(ally, foe, { hit: true, damage: landed.damage, note: landed.note }, dx, foe.hp === 0);
        this.tweens.add({ targets: ally.view, x: home.x, y: home.y, duration: 160, delay: 90, ease: 'Quad.easeOut',
          onComplete: () => {
            if (ally.alive) this.showStanding(ally);
            this.time.delayedCall(foe.hp === 0 ? 700 : 260, () => onDone(outcome));
          } });
      } });
  }

  // Shows a push. Every push in the battle comes through here (roadmap 18.1);
  // the drawing itself is in src/knockback.js. The next turn waits until the
  // body has come to rest (see endTurn).
  //   pushed : what pushLoser returned ({ from, path, fall })
  //   awayX  : which way it was pushed on the screen (more than 0 = right)
  //   label  : optional words over its head, { text, color }
  knockBack(unit, pushed, awayX, label = null) {
    const ms = playKnockback(this, unit, pushed, awayX, label);
    // (the knockback's pictures run on the battle's speed, this wait on the real clock: at
    // fast enemy speed it must shrink with them, or every push would cost its full time)
    const total = Object.values(this.speed).reduce((a, b) => a * b, 1);
    this.knockUntil = Math.max(this.knockUntil || 0, this.time.now + ms / Math.max(1, total));
  }

  // One beat of a stance duel: work it out, then show it.
  duelBeat(actor, stance, holder, holderStance, empowered, opening, onDone) {
    actor.hasActed = true;
    this.refreshButtons();
    const beat = resolveBeat(actor, stance, holder, holderStance, CONTEST_CTX, empowered, opening);
    // Gadara's Mask Gauge: +1 for each clash beat he holds (wins, or stands even)
    for (const u of [actor, holder]) if (beat.kind !== 'break' && beat.loser !== u) feedMask(u, KING_RULES.gadara.mask.beat);
    const outcome = this.applyBeat(beat);
    if (opening) {
      this.beginCinematic();
      play('drum');
      this.clashBanner(actor, holder, () => this.playBeat(outcome, true, onDone));
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

    // Signature stances: extra blows (Bloodied Press, Counter!) and Bulwark's standoff. Not on a Break Away try
    // (roadmap 1.67): failing to break away costs momentum (BATTLE_SYSTEMS 4), not a hit. The bull's Bloodied
    // Press used to count his answer to a break as "a Press beat won" and hit the one trying to leave.
    out.sig = [];
    for (const fx of beat.kind === 'break' ? [] : afterBeat(beat)) {
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
    const winStance0 = winner === beat.actor ? beat.actorStance : beat.holderStance;
    // Gaha's Riposte: a decisive Slip win lets him step to a free tile and end the clash (no push),
    // and the foe is always left Off-Balance (the foe's own class cannot hold or slip it)
    const stepTo = riposteStep(winner, winStance0) ? this.riposteTile(winner, loser) : null;
    out.response = lossResponse(loser, CONTEST_CTX);
    if (stepTo) out.response = { ...out.response, held: false, slipped: false };
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

    if (stepTo) {
      winner.col = stepTo.col;
      winner.row = stepTo.row;
      endDuel(winner);
      out.ended = true;
      out.riposteStep = stepTo;
      return out;
    }

    if (!out.response.held) {
      const winStance = winner === beat.actor ? beat.actorStance : beat.holderStance;
      const pushed = this.pushLoser(loser, winner, (engagementRules.decisivePush[styleOf(winner)] || 1) + pushExtra(winner, winStance));
      out.from = pushed.from;
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

  // Gaha's Riposte step (roadmap 13.59): a free tile next to the winner (up or down one level at most).
  // One that keeps the foe in spear reach (a straight line, 2 tiles) wins over any other; returns { col, row } or null.
  riposteTile(winner, foe) {
    const climb = moveRules(winner).climb;
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dc, dr]) => ({ col: winner.col + dc, row: winner.row + dr }))
      .filter((t) => isInsideGrid(t.col, t.row) && !this.isBlocked(t.col, t.row) && Math.abs(getHeight(t.col, t.row) - getHeight(winner.col, winner.row)) <= climb);
    const reach = (t) => (inReach({ ...winner, col: t.col, row: t.row }, foe) ? 1 : 0);
    options.sort((a, b) => reach(b) - reach(a));
    return options[0] || null;
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
    // his close-up clash poses (roadmap 9.9) when the fighter has them
    const stancePose = (u, stance) => this.clashPose(u, stance);

    this.beginCinematic();
    this.focusCamera(mid.x, mid.y + 30, opening || beat.decisive ? 1.35 : 1.18, 260);
    this.faceToward(a, dx, dy);
    this.faceToward(b, -dx, -dy);
    this.showPose(a, stancePose(a, beat.actorStance), dx);
    this.showPose(b, stancePose(b, beat.holderStance), -dx);
    this.showDuelFaces(beat); // both faces at the screen edges

    const steps = [];
    const at = (ms, fn) => steps.push([ms, fn]);
    const stanceColor = { press: '#ff9a6a', guard: '#e8c690', slip: '#9fd4ff', break: '#cfe8ff' };

    // both stances appear above the fighters
    // (side: which way is away from the foe, for the small cards beside a fighter)
    const away = (u) => (u === a ? (dx > 0 ? -1 : 1) : dx > 0 ? 1 : -1);
    at(80, () => {
      this.floatText(a, stanceName(beat.actorStance).toUpperCase() + (beat.empowered ? '+' : ''), stanceColor[beat.actorStance]);
      this.floatText(b, stanceName(beat.holderStance).toUpperCase(), stanceColor[beat.holderStance]);
      // spending Poise to Empower shows his Empower card beside the fighter
      if (beat.empowered) {
        this.statusCard(a, 'empower', { label: 'Empower', color: '#ffd27a', side: away(a) });
        empowerAura(this, a); // his golden aura bursts up (roadmap 9.6)
      }
    });

    // 16.1 step 10: a flat gold ring under the two fighters, one pulse per beat (not on a break attempt)
    let ring = null;
    if (beat.kind !== 'break') at(120, () => { ring = clashRing(this, a, b); });

    if (beat.kind === 'break') {
      at(380, () => {
        play(beat.success ? 'miss' : 'bash');
        this.showPose(b, 'attack', -dx);
        if (beat.success) {
          this.banner(mid.x, headY - 70, 'Broke free!', '#9fd4ff', a.name + ' ' + Math.round(beat.actorScore) + '  vs  ' + Math.round(beat.holderScore) + ' ' + b.name);
          this.duelFacesMood({ winner: a });
          if (escape) this.slideAlong(a, [escape]);
        } else {
          // say plainly that it failed and that he is still locked (1.67: "Held fast!" alone read as a bug)
          this.banner(mid.x, headY - 70, 'Break Away failed: still locked', '#ff6b5a', a.name + ' ' + Math.round(beat.actorScore) + '  vs  ' + Math.round(beat.holderScore) + ' ' + b.name);
          this.duelFacesMood({ winner: b });
          this.recoil(a, -dx);
        }
        this.refreshEngagementMarks();
      });
    } else {
      // close in and the blades meet
      at(380, () => {
        // the blades meet: a Press strikes; Guard and Slip hold their close-up stance
        const meet = (u, stance) => (stance === 'press' ? (this.hasPose(u, 'clashPress') ? 'clashPress' : 'attack') : this.hasPose(u, this.clashPose(u, stance)) && this.clashPose(u, stance) !== 'dodge' ? this.clashPose(u, stance) : 'ready');
        this.showPose(a, meet(a, beat.actorStance), dx);
        this.showPose(b, meet(b, beat.holderStance), -dx);
        this.nudgeFromTile(a, dx * 0.2, dy * 0.2, { duration: 110, ease: 'Quad.easeIn' }); // from the tile, not from where the body is (13.54)
        this.nudgeFromTile(b, -dx * 0.2, -dy * 0.2, { duration: 110, ease: 'Quad.easeIn' });
      });
      at(490, () => {
        clashFlash(this, mid.x, mid.y);
        // 16.4: his gold burst, bigger, with waves of energy rolling out along the ground and the
        // two fighters lit by it; the opening and the decisive beat get the big one
        const bigBeat = opening || beat.decisive;
        clashSparks(this, mid.x, mid.y, 80, bigBeat);
        const feet = { x: (a.view.x + b.view.x) / 2, y: (a.view.y + b.view.y) / 2 };
        energyWaves(this, feet.x, feet.y, elementOf('spirit').glow, { count: bigBeat ? 3 : 2, size: bigBeat ? 1.25 : 0.85, gap: 85 });
        floorLight(this, feet.x, feet.y, elementOf('spirit').glow, { size: bigBeat ? 2.4 : 1.6, peak: 0.6, ms: 480 });
        lightNearby(this, mid.x, mid.y, elementOf('spirit').glow, { radius: bigBeat ? 200 : 130, peak: 0.6, ms: 360 });
        screenShake(this, 0.004, 120);
        play('clash');
        if (ring) ring.pulse(beat.winner, beat.decisive); // 16.1 step 10
        this.clashPunch(opening || beat.decisive); // 16.1 step 9: zoom punch, plus slow-mo on big beats
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
          // a Press that wins the beat shows his Press card beside the winner
          if (winStance === 'press') this.statusCard(beat.winner, 'press', { label: 'Press', color: '#ff9a6a', side: away(beat.winner) });
          // a Slip that wins: the dodge turns into a strike (Sudeen, roadmap 9.8)
          if (winStance === 'slip' && this.hasPose(beat.winner, 'slipStrike')) {
            const w = beat.winner;
            const wdx = (w === a ? dx : -dx);
            this.showPose(w, 'slipStrike', wdx);
            play('slash');
          }
        }
        if (beat.decisive) {
          title = 'DECISIVE!';
          color = '#ffe08a';
          this.decisiveFinish(beat); // 16.1 step 11: a bigger burst on the loser
        }
        this.banner(mid.x, headY - 70, title, color, a.name + ' ' + Math.round(beat.actorScore) + '  vs  ' + Math.round(beat.holderScore) + ' ' + b.name);
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
          else if (!this.statusCard(loser, 'offbalance', { label: 'Off-balance!', color: '#ff6b5a', side: away(loser) })) this.floatText(loser, 'Off-balance!', '#ff6b5a', above);
        }
        if (path.length > 0 || outcome.fall) this.knockBack(loser, { from: outcome.from, path, fall: outcome.fall }, awayX);
      });
      if (outcome.riposteStep) {
        at(1500, () => {
          this.floatText(winner, 'Riposte step!', '#9fd4ff', { rise: 46 });
          this.slideAlong(winner, [outcome.riposteStep]);
        });
      } else if (ended && loser.alive && !outcome.fall) at(1850, () => this.floatText(winner, 'Broken off', '#e8d5a8'));
    }

    const last = beat.decisive ? 2300 : beat.kind === 'break' ? 1100 : 1300;
    at(last - 380, () => {
      if (ring) ring.destroy();
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
    this.clashBanner(attacker, target, () => this.playContest(contest, true, onDone));
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
    let pushedFrom = null; // the tile the loser was pushed from
    let ended = false;

    if (result.loser) {
      const loser = result.loser;
      response = lossResponse(loser, CONTEST_CTX);
      if (!response.slipped) applyOffBalance(loser);
      if (!response.held) {
        const pushed = this.pushLoser(loser, result.winner, pushDistance(result));
        path = pushed.path;
        fall = pushed.fall;
        pushedFrom = pushed.from;
      }
      // Pushed out of reach (or fell to its death): the engagement is over
      if (!loser.alive || distance(presser, holder) > 1) {
        endDuel(presser);
        ended = true;
      }
    }
    return { result, response, path, ended, fall, pushedFrom };
  }

  // The engagement animation. It plays out what runContest decided:
  //   wind up, both lunge, the blades meet, the result, then the loser's
  //   reaction and push back. A tap anywhere speeds it up.
  playContest(contest, opening, onDone) {
    const { result, response, path, ended, fall, pushedFrom } = contest;
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
      this.nudgeFromTile(a, dx * 0.22, dy * 0.22, { duration: 120, ease: 'Quad.easeIn' }); // from the tile (13.54)
      this.nudgeFromTile(b, -dx * 0.22, -dy * 0.22, { duration: 120, ease: 'Quad.easeIn' });
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
        a.name + ' ' + result.pressScore + '  vs  ' + result.holdScore + ' ' + b.name);
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
          if (!this.statusCard(loser, 'offbalance', { label: 'Off-balance!', color: '#ff6b5a', side: awayX >= 0 ? 1 : -1 })) this.floatText(loser, 'Off-balance!', '#ff6b5a');
        }
        if (path.length > 0 || fall) this.knockBack(loser, { from: pushedFrom, path, fall }, awayX);
        else if (!response.held) this.recoil(loser, awayX);
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
      return { x, y, duration: 170, ease: 'Linear', onStart: () => unit.view.setDepth(depthFor(tile.col, tile.row) + 1) };
    });
    this.tweens.chain({ targets: unit.view, tweens, onComplete: () => this.refreshWater() });
    this.tweens.add({ targets: unit.idleTargets, y: '-=4', duration: 85, yoyo: true, repeat: path.length - 1 });
  }

  // ---------- Water (the Hidden Cavern, roadmap 11.4) ----------

  // True if the unit stands in water (map letter W).
  inWater(unit) {
    return terrainAt(mapData, unit.col, unit.row) === 'water';
  }

  // Everyone standing in water is Drenched (a word pops up the first time),
  // and the water puts out a burn. Wading figures stand in the water up to
  // their shins.
  refreshWater() {
    for (const u of this.units) {
      const wet = u.alive && !u.hidden && this.inWater(u);
      if (wet) {
        if (!isDrenched(u)) this.floatText(u, 'Drenched', '#7fd0ff', { rise: 40 });
        applyDrenched(u, terrain.water.drenchedTurns);
        if (isBurning(u)) {
          cureBurn(u);
          this.time.delayedCall(300, () => this.floatText(u, 'Put out', '#bfe8ff', { rise: 52 }));
        }
      }
      this.setWading(u, wet);
    }
    this.refreshStatusTags();
  }

  // Shows or hides a figure wading: sunk a little, its feet hidden under the
  // waterline, with rings spreading round it.
  setWading(unit, on) {
    if (!unit.sprite || !unit.view || !unit.view.active || !!unit.wading === on) return;
    const sink = Math.round(TILE_HEIGHT * 0.16);
    unit.wading = on;
    unit.sprite.y += on ? sink : -sink;
    if (unit.restY !== undefined) unit.restY += on ? sink : -sink; // (the code walk lifts the picture from this resting place, codeWalk.js)
    if (on) {
      const rings = this.add.graphics();
      rings.lineStyle(2, 0xbfeaff, 0.7).strokeEllipse(0, 6, 46, 14);
      rings.lineStyle(1.5, 0xbfeaff, 0.4).strokeEllipse(0, 6, 62, 19);
      const front = this.add.ellipse(0, 9, 40, 9, 0x3a8aa0, 0.35);
      unit.view.add([front, rings]);
      this.tweens.add({ targets: rings, scaleX: 1.15, scaleY: 1.15, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      unit.wadeParts = [front, rings];
    } else {
      for (const o of unit.wadeParts || []) o.destroy();
      unit.wadeParts = null;
    }
    this.cropWading(unit);
  }

  // The part of the figure under the water is not drawn.
  cropWading(unit) {
    const s = unit.sprite;
    if (!s || !s.frame) return;
    if (!unit.wading) {
      if (s.isCropped) s.setCrop();
      return;
    }
    const cut = Math.round(TILE_HEIGHT * 0.16) / Math.abs(s.scaleY || 1);
    s.setCrop(0, 0, s.frame.realWidth, Math.max(1, s.frame.realHeight * s.originY - cut)); // from the feet (originY: the ruler's ground line)
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
    this.refreshPreview(); // the skill starts: the preview goes
    const done = () => {
      this.busy = false;
      this.refreshStatus();
      // Intercept locked it in a clash: in the stance duel its turn is over
      if (caster.engagedWith && isStanceDuel() && caster.alive) {
        this.time.delayedCall(250, () => {
          if (!this.battleOver && this.activeUnit === caster) this.endTurn();
        });
      }
    };
    this.safeAction(() => this.castSpell(caster, target, id, done), done);
  }

  // Casts a spell. It costs the caster's action and the spell's MP.
  // target is a unit (buff or hex), a tile (Husk), or the caster (Meditate).
  // "free": the spell is cast as part of another one that has already been paid for (Kofi's
  // Infuse casts a Verse), so no MP, cooldown or action is taken again.
  castSpell(caster, target, id, onDone, free = false) {
    const spell = spells[id];
    if (!free) {
      spendMp(caster, id);
      startCooldown(caster, id);
      caster.hasActed = true;
    }
    if (spell.kind === 'haunt') return this.castHaunt(caster, target, spell, onDone);
    if (spell.kind === 'infuse') {
      // the blessing for what he reads, always a spirit's Verse that lasts (1.49): Stone, Swiftness, Fury or
      // Renewal (Water). It used to be a plain herb-pouch heal in Water, which threw a pouch at the ally.
      return this.castSpell(caster, target, spell.verses[this.reading(caster).element], onDone, true);
    }
    if (spell.kind === 'throw') return this.castThrow(caster, target, spell, onDone);
    if (spell.kind === 'poison') return this.castPoisonArrow(caster, target, spell, onDone);
    if (spell.kind === 'toss') return this.castShieldToss(caster, target, spell, onDone);
    if (spell.kind === 'elementBlast') return this.castElementBlast(caster, target, spell, onDone);
    if (spell.kind === 'charge') return this.castIntercept(caster, target, spell, onDone);
    if (spell.kind === 'lunge') return this.castLunge(caster, target, spell, onDone);
    if (spell.kind === 'javelin') return this.castSonicJavelin(caster, target, spell, onDone);
    if (spell.kind === 'dive') return this.castFuryDive(caster, target, spell, onDone);
    if (spell.kind === 'double') return this.castDoubleHit(caster, target, spell, onDone);
    if (spell.kind === 'heal') return this.castHeal(caster, target, spell, onDone);
    if (spell.kind === 'escape') return this.castHusk(caster, target, onDone);
    if (spell.kind === 'smoke') return this.castSmokeBomb(caster, target, onDone);
    if (spell.kind === 'rest') return this.castMeditate(caster, spell, onDone);
    if (spell.kind === 'enchant') return this.castEnchant(caster, target, spell, onDone);
    if (spell.kind === 'earthDrive') return this.castEarthDrive(caster, target, spell, onDone);
    if (spell.kind === 'clap') return this.castClap(caster, spell, onDone);
    if (KING_KINDS.includes(spell.kind)) return this.castKingSkill(caster, target, id, onDone); // the kings (Phase 10)

    // Husk echo: the decoy nobody struck casts it too, so it works twice as well
    const echoed = caster.echoReady && this.decoys.some((d) => d.owner === caster);
    const power = echoed ? 2 : 1;
    if (echoed) caster.echoReady = false;
    if (spell.kind === 'hex') applySlow(target, id, power);
    else applyBuff(target, id, power);
    // the moves this Verse changes, to announce them (Sonic Javelin, Shield Ram, ...)
    const changed = spell.kind === 'buff' ? [...(target.spells || []), 'attack'].map((m) => activeMove(target, m)).filter((m) => spells[m] && spells[m].verse) : [];
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
    // Two steps (roadmap 9.2): a caster with a "chant" picture first gathers the
    // Verse (hands together, eyes closed), then reaches out with it. Without
    // one: a Verse reaches out to the ally; Slow is a curse thrown with the staff.
    const dxT = target.view.x - caster.view.x;
    const lead = poseFrame(caster.id, 'chant', 'right') ? 420 : 0;
    // Renewal heals as soon as it is cast, then at the start of each of its turns (1.79, Suleiman 21 Nov)
    if (id === 'renewal') this.renewalTick(target, lead + 700, true);
    // the Verse gathers as light at her hands, then lights the ground and the fighters where it lands (18.23)
    const verseElement = { swiftness: 'wind', stone: 'earth', fury: 'fire', slow: 'hex', renewal: 'heal' }[id] || 'spirit';
    chargeUp(this, caster.view.x + Math.sign(dxT || 1) * 10, caster.view.y - caster.topY * 0.72, verseElement, { ms: lead + 250, size: 0.8, depth: caster.view.depth + 2 });
    if (lead) {
      this.showPose(caster, 'chant', dxT);
      elementRise(this, caster, id, lead); // the element gathers round her (roadmap 9.10)
      this.time.delayedCall(lead, () => caster.alive && this.showPose(caster, 'cast', dxT));
    } else this.showPose(caster, spell.kind === 'hex' ? 'attack' : 'cast', dxT);
    this.time.delayedCall(lead + 250, () => {
      play('spell');
      floorLight(this, target.view.x, target.view.y, elementOf(verseElement).glow, { size: 1.5, peak: 0.6, ms: 700 });
      lightNearby(this, target.view.x, target.view.y - target.centerY, elementOf(verseElement).glow, { radius: 150, peak: 0.55, ms: 520 });
      afterglow(this, target.view.x, target.view.y - 10, verseElement, { level: 3, depth: target.view.depth + 2 });
      if (spell.kind === 'hex' && slowCast(this, target.view.x, target.view.y)) {
        // the gravity effect from the Slow sheet
      } else if (!verseAura(this, target.view.x, target.view.y, id, target)) buffAura(this, target.view.x, target.view.y, color);
      const times = (spell.kind === 'buff' ? affinityTimes(target, id) : 1) * power;
      // a Verse shows his card for it on the ally (Swift, Fury, Earth's Bulwark); other spells float their name
      const named = (spell.effect || spell.button) + (times > 1 ? ' x' + times : '');
      if (!(spell.card && this.statusCard(target, spell.card, { label: named, color: spell.color }))) {
        this.floatText(target, spell.button + (times > 1 ? ' x' + times : ''), spell.color, times > 1 ? { pop: true } : {});
      }
      this.refreshStatusTags();
      if (spell.kind === 'buff' && !target.engagedWith) this.showStanding(target); // some units look different under a Verse
      if (spell.kind === 'hex') this.refreshTurnStrip(); // its next turn has moved back
    });
    // (after the card has shrunk away)
    changed.forEach((m, i) => this.time.delayedCall(lead + 1150 + i * 380, () => target.alive && this.floatText(target, spells[m].button + '!', spells[m].color, { pop: true })));
    this.time.delayedCall(lead + 800, () => this.showStanding(caster));
    this.time.delayedCall(lead + 950, onDone);
  }

  // Spear Throw: the spear flies at an enemy. A hit hurts it and knocks it
  // back a tile, away from the thrower (off a ledge, it falls). A knock that
  // carries it out of a clash breaks the clash.
  castThrow(thrower, target, spell, onDone) {
    onDone = this.collectRelays(onDone); // Relay Strike: allies hit pushed foes after the skill
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
      this.showPose(thrower, this.releasePose(thrower), dx);
      play('arrow');
      const a = this.centerOf(thrower);
      const b = this.centerOf(target);
      arrowShot(this, a.x, a.y, b.x, b.y, () => {
        this.showImpact(thrower, target, result, dx, target.hp === 0);
        if (pushed && (pushed.path.length || pushed.fall)) {
          this.time.delayedCall(120, () => this.knockBack(target, pushed, dx)); // (an empty path: it slammed into a wall where it stood)
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
  chargeTile(user, target, spell, range = spell.range) {
    const blocked = (c, r) => this.isBlocked(c, r);
    const rules = { climb: moveRules(user).climb }; // a charge climbs like a walk (no flying)
    const options = [{ col: user.col, row: user.row }, ...getReachableTiles(user.col, user.row, range, blocked, rules)];
    let best = null;
    for (const t of options) {
      if (distance(t, target) !== 1) continue;
      const path = t.col === user.col && t.row === user.row ? [] : getPath(user.col, user.row, t.col, t.row, range, blocked, rules);
      if (!best || path.length < best.path.length) best = { col: t.col, row: t.row, path };
    }
    return best;
  }

  // ---------- Lunge (Gaha, roadmap 13.59) ----------
  // Where a Lunge ends: the foe must stand in a straight line, minRange to range tiles away. He runs
  // until his spear (reach 2) just touches it, so 1 or 2 tiles, over free tiles he can step on.
  // Returns { col, row, path } or null. Not usable in a clash.
  lungeSpot(user, target, spell) {
    if (user.engagedWith || target.isDecoy || !target.alive || (user.col !== target.col && user.row !== target.row)) return null;
    const d = distance(user, target);
    if (d < spell.minRange || d > spell.range) return null;
    const dc = Math.sign(target.col - user.col);
    const dr = Math.sign(target.row - user.row);
    const climb = moveRules(user).climb;
    const path = [];
    let prev = { col: user.col, row: user.row };
    for (let i = 1; i <= d - spell.reach; i++) {
      const tile = { col: user.col + dc * i, row: user.row + dr * i };
      if (!isInsideGrid(tile.col, tile.row) || this.isBlocked(tile.col, tile.row) || Math.abs(getHeight(tile.col, tile.row) - getHeight(prev.col, prev.row)) > climb) return null;
      path.push(tile);
      prev = tile;
    }
    const end = path[path.length - 1] || { col: user.col, row: user.row }; // (a foe already 2 tiles away: no run, +0)
    return inReach({ ...user, col: end.col, row: end.row }, target) ? { col: end.col, row: end.row, path } : null;
  }

  // He runs, then Thrusts: the normal attack, with 1 more damage for each tile he ran. Moving cancels Rooted.
  castLunge(user, target, spell, onDone) {
    const spot = this.lungeSpot(user, target, spell);
    if (!spot) {
      onDone();
      return;
    }
    user.col = spot.col;
    user.row = spot.row;
    user.hasMoved = true; // moving cancels Rooted this turn; the run does not use up his Move (he may still walk after, 13.53)
    clearRooted(user);
    user.lungeBonus = spot.path.length * spell.bonusPerTile;
    play('whoosh');
    this.floatText(user, 'Lunge +' + user.lungeBonus, spell.color, { rise: 44, pop: true });
    const steps = spot.path.map((tile) => {
      const p = tileToScreen(tile.col, tile.row);
      return {
        x: p.x,
        y: p.y,
        duration: 85,
        onStart: () => {
          user.view.setDepth(depthFor(tile.col, tile.row) + 1);
          this.afterimage(user);
          this.faceToward(user, target.view.x - p.x, target.view.y - p.y);
        },
      };
    });
    // A foe exactly 2 tiles away means no run (steps is empty), and tweens.chain throws on an empty list: that threw
    // out of castLunge with the turn still busy and froze the game (found 16 Nov). So with no run he thrusts straight
    // away, and if the run cannot start for any reason he still thrusts: Lunge must never leave the game waiting.
    const thrust = () => this.performAttack(user, target, onDone);
    if (!steps.length) return thrust();
    try {
      this.tweens.chain({ targets: user.view, tweens: steps, onComplete: thrust });
    } catch (e) {
      thrust();
    }
  }

  // ---------- Rabdul's Enchant (roadmap 4.1) ----------

  // What Kofi does with his action besides the free Spirit Bolt (1.78): { id, target } for Infuse or Haunt, or null.
  //  - Infuse (blessing for what he reads, reach 3, himself too): a friend that is hurt gets the heal or the guard
  //    first (Renewal and Stone at 70 percent health or less, Swiftness to get a very hurt one out at 40 percent or
  //    less); otherwise the hardest hitter in the fight gets Fury or Swiftness, and the friend nearest a foe gets Stone.
  //    Nobody who already wears a Verse is given another (it would replace it).
  //  - Haunt (hex, reach 4): the most dangerous foe in reach that is not Disoriented yet, unless the bolt would
  //    finish somebody. He keeps 2 MP back for Infuse while a friend is there to use it.
  shamanChoice(unit) {
    const foes = this.units.filter((o) => o.alive && o.side !== unit.side && !o.hidden && !o.isDecoy);
    const inFight = (a) => !!a.engagedWith || foes.some((f) => distance(a, f) <= moveOf(a) + a.range + 1);
    const ratio = (a) => a.hp / a.maxHp;
    if (unit.spells.includes('infuse') && canAfford(unit, 'infuse')) {
      const sp = spells.infuse;
      const verse = sp.verses[this.reading(unit).element];
      const friends = this.units.filter((a) => a.alive && a.side === unit.side && !a.isDecoy && distance(unit, a) <= sp.range && !buffOf(a) &&
        !(verse === 'renewal' && a.engagedWith)); // (1.65: Renewal does not tick for a fighter locked in a clash)
      const byHurt = (list) => list.sort((a, b) => ratio(a) - ratio(b) || (b === unit) - (a === unit));
      let pick = null;
      if (verse === 'renewal') pick = byHurt(friends.filter((a) => ratio(a) <= 0.7))[0];
      else if (verse === 'stone') pick = byHurt(friends.filter((a) => ratio(a) <= 0.7 && inFight(a)))[0] || friends.filter(inFight).sort((a, b) => Math.min(...foes.map((f) => distance(a, f))) - Math.min(...foes.map((f) => distance(b, f))))[0];
      else if (verse === 'swiftness') pick = byHurt(friends.filter((a) => ratio(a) <= 0.4))[0] || friends.filter(inFight).sort((a, b) => b.attack - a.attack)[0];
      else pick = friends.filter(inFight).sort((a, b) => b.attack - a.attack)[0]; // Fury: the hardest hitter
      if (pick) return { id: 'infuse', target: pick };
    }
    if (unit.spells.includes('haunt') && canAfford(unit, 'haunt')) {
      const sp = spells.haunt;
      const spare = unit.mp - sp.mp >= (spells.infuse ? spells.infuse.mp : 0) || !this.units.some((a) => a.alive && a.side === unit.side && distance(unit, a) <= spells.infuse.range);
      const marks = foes.filter((t) => distance(unit, t) <= this.spellReach(unit, t, sp) && !isDisoriented(t) && getDamage(unit, t) < t.hp);
      if (spare && marks.length > 0) {
        marks.sort((a, b) => b.attack - a.attack || b.hp - a.hp);
        return { id: 'haunt', target: marks[0] };
      }
    }
    return null;
  }

  // Who Rabdul enchants: an ally (or himself) within reach of the spell, not
  // enchanted already, and in the fight (locked in a clash, or a foe close
  // enough to reach next turn). The hardest hitter first; himself last.
  enchantPick(unit) {
    const spell = spells.enchant;
    const foes = this.units.filter((o) => o.alive && o.side !== unit.side && !o.hidden);
    const inFight = (a) => !!a.engagedWith || foes.some((f) => distance(a, f) <= moveOf(a) + a.range + 1);
    const options = this.units.filter((a) => a.alive && a.side === unit.side && !isEnchanted(a) && distance(unit, a) <= spell.range && inFight(a));
    options.sort((a, b) => b.attack - a.attack || (a === unit) - (b === unit));
    return options[0] || null;
  }

  // He chants (his ring of fire rises), raises his hand and Shango's symbol
  // forms over it, then flies as a comet to the weapon and burns into it. The
  // weapon is enchanted from then on: its pictures change to the flaming ones
  // (art.json "enchanted") and the symbol glows at its feet.
  castEnchant(caster, target, spell, onDone) {
    const self = caster === target;
    const dx = self ? (caster.facing.endsWith('Right') ? 1 : -1) : target.view.x - caster.view.x;
    if (!self) this.faceToward(caster, dx, target.view.y - caster.view.y);
    this.focusCamera((caster.view.x + target.view.x) / 2, (caster.view.y + target.view.y) / 2 - 50, 1.15, 300);
    play('spell');
    this.showPose(caster, 'chant', dx);
    this.floatText(caster, spell.name, spell.color, { rise: 40 });
    enchantChant(this, caster.view.x, caster.view.y, caster.view.depth);
    this.time.delayedCall(640, () => {
      this.showPose(caster, 'cast', dx);
      const from = { x: caster.view.x + (dx >= 0 ? 16 : -16), y: caster.view.y - caster.topY + 6 };
      const to = this.centerOf(target);
      play('whoosh');
      enchantSigil(this, from, to, () => {
        applyEnchant(target, 'enchant', target === this.activeUnit);
        enchantLand(this, to.x, to.y);
        floorLight(this, target.view.x, target.view.y, elementOf('fire').glow, { size: 1.5, peak: 0.6, ms: 700 });
        lightNearby(this, to.x, to.y, elementOf('fire').glow, { radius: 150, peak: 0.55, ms: 480 });
        afterglow(this, target.view.x, target.view.y - 10, 'fire', { level: 3, depth: target.view.depth + 2 });
        flameBurst(this, target.view.x, target.view.y);
        play('spark');
        this.floatText(target, 'Enchanted +' + spell.damage, spell.color, { pop: true });
        this.refreshStatusTags();
        if (target.alive && !target.engagedWith) this.showStanding(target); // the flaming weapon
        this.time.delayedCall(520, () => {
          if (caster.alive) {
            this.faceNearestOpponent(caster);
            this.showStanding(caster);
          }
          onDone();
        });
      });
    });
  }

  // ---------- Tayo's Earth Drive (roadmap 4.2) ----------

  // He raises his fist and drives it into the ground: a spike of rock bursts
  // up under the foe in front of him. Half damage, and it is thrown back a
  // tile (a wall or a unit behind it: a slam, the usual push rules). The
  // spike stays on that tile as a wall for 2 of his turns (see startTurn):
  // nobody can walk through it and it stops arrows (setHeightLookup). If the
  // foe couldn't be moved, the spike breaks against it and no wall is left.
  castEarthDrive(user, target, spell, onDone) {
    onDone = this.collectRelays(onDone); // Relay Strike: allies hit pushed foes after the skill
    const tile = { col: target.col, row: target.row };
    const dx = target.view.x - user.view.x;
    this.faceToward(user, dx, target.view.y - user.view.y);
    const landed = this.landHit(target, this.skillHit(user, target, spell));
    target.hp = Math.max(0, target.hp - landed.damage);
    let pushed = null;
    if (target.hp === 0) this.defeat(target);
    else {
      pushed = this.pushLoser(target, user, spell.push || 1);
      if (target.engagedWith && distance(target, target.engagedWith) > 1) endDuel(target);
    }
    // the wall stays only where the tile is now clear
    const spike = this.isBlocked(tile.col, tile.row) ? null : { col: tile.col, row: tile.row, owner: user, turnsLeft: spell.turns, view: null };
    if (spike) this.spikes.push(spike);
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();

    // Roadmap 1.54: his old 29 Oct Earth Drive pictures (a different, smaller look) are out of art.json.
    // Roadmap 1.60 (Suleiman 16 Nov: "he just throws a punch"): Earth Drive is a ground pound again, from his
    // current sheet. He raises his fist (fistRaised, 1.73), slams it into the floor (groundPound: kneeling, fist
    // planted), a shockwave runs from his fist, and a beat later the rock erupts under the foe.
    // (A drawn 'earthDrive' move in art.json still wins, when Suleiman sends one.)
    const m = moveFrames(user.id, 'earthDrive', dx >= 0 ? 'right' : 'left');
    const frameMs = m ? m.frameMs : 110;
    const slamAt = frameMs * 3; // the fist meets the floor (a beat longer, 1.73: the raised fist has to be seen)
    const eruptAt = slamAt + 90; // the rock bursts up under the foe
    this.floatText(user, spell.name, spell.color, { rise: 40 });
    play('whoosh');
    const pose = (names) => names.find((n) => poseFrame(user.id, n, 'right', user.facing)) || 'attack';
    const drawnBack = pose(['fistRaised', 'windup']); // his raised fist (1.73: it was the arms-open rear-up of Element Blast, blastCharge)
    const pound = pose(['groundPound', 'attack']);
    const played = this.playMove(user, 'earthDrive', dx);
    if (!played) this.showPose(user, drawnBack, dx);
    this.time.delayedCall(slamAt, () => {
      if (!played && user.alive && !user.knock) this.showPose(user, pound, dx);
      // the slam at his fist: a short drop of the body, a ring and dust where the fist lands
      const fist = { x: user.view.x + (target.view.x - user.view.x) * 0.5, y: user.view.y + (target.view.y - user.view.y) * 0.5 };
      play('crash');
      screenShake(this, 0.006, 140);
      groundRing(this, fist.x, fist.y, elementOf('earth').glow, 0.9);
      dustPuff(this, fist.x, fist.y);
      energyWaves(this, fist.x, fist.y, elementOf('earth').glow, { count: 1, size: 0.55 });
      // the weight lands on the fist: a short squash through unit.squash, which the breathing reads (never a
      // tween of the sprite's own scale: a pose change rescales the sprite from where it is, and a tween that
      // ends on a fixed number then leaves him at the wrong size, found by the bot's SIZE OFF, 19 Nov)
      const squash = { v: 0.1 };
      user.squash = squash.v;
      this.tweens.add({ targets: squash, v: 0, duration: 160, ease: 'Quad.easeOut', onUpdate: () => { user.squash = squash.v; }, onComplete: () => { user.squash = 0; } });
    });
    this.time.delayedCall(eruptAt, () => {
      play('crash');
      screenShake(this, 0.008, 200);
      const p = tileToScreen(tile.col, tile.row);
      const rock = raiseSpike(this, p.x, p.y, depthFor(tile.col, tile.row) + 1.2, TILE_WIDTH * 1.05); // about as tall as a fighter: a wall to hide behind
      if (spike) spike.view = rock;
      else this.time.delayedCall(520, () => crumbleSpike(this, rock)); // it broke against the foe
      // the ground breaks: earth's light, a ring through the floor and dust that hangs (18.23)
      energyWaves(this, p.x, p.y, elementOf('earth').glow, { count: 1, size: 0.8 });
      afterglow(this, p.x, p.y, 'earth', { level: 4, depth: depthFor(tile.col, tile.row) + 1.3 });
      this.showImpact(user, target, { hit: true, damage: landed.damage, note: landed.note, element: 'earth', level: Math.max(3, hitLevel(landed.damage, target.hp === 0)) }, dx, target.hp === 0);
      if (pushed && (pushed.path.length || pushed.fall)) {
        this.time.delayedCall(120, () => this.knockBack(target, pushed, dx, { text: 'Thrown back!', color: '#d9a066' }));
      }
    });
    this.time.delayedCall(frameMs * 4 + 380, () => {
      if (user.alive && !user.knock) {
        this.faceNearestOpponent(user);
        this.showStanding(user); // up from the pound
      }
    });
    this.time.delayedCall(eruptAt + 1250, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  }

  // ---------- Tayo's Clap (roadmap 13.31) ----------

  // Every foe within the clap's reach (2 tiles around him), farthest first, so
  // the outer ones are knocked back before the inner ones are.
  // "all" = everyone really standing in the ring, hidden or not (who the shockwave hits);
  // without it, only those the user can see (what its AI decides on). Roadmap 1.47.
  clapFoes(user, all = false) {
    return (all ? this.units : this.enemyEyes())
      .filter((t) => t.side !== user.side && t.alive && !t.isDecoy && distance(user, t) <= spells.clap.range)
      .sort((a, b) => distance(user, b) - distance(user, a));
  }

  // True if a Sonic Burst now would burst one of his own rocks onto a foe he can see (13.38).
  clapCombo(user) {
    const seen = this.enemyEyes().filter((t) => t.side !== user.side && t.alive && !t.isDecoy);
    return this.spikes.some((sp) => sp.owner === user && distance(user, sp) <= spells.clap.range && seen.some((t) => distance(t, sp) <= 1));
  }

  // He claps his hands with all his might: a shockwave ring races out and dust
  // rolls up; every foe within 2 tiles takes a little damage and is knocked
  // back a tile (the usual push rules: a wall or a unit behind = a slam). The
  // numbers are worked out first, like Earth Drive; the picture catches up.
  // Drawn with his attack pictures until Suleiman sends clap art.
  castClap(user, spell, onDone) {
    onDone = this.collectRelays(onDone); // Relay Strike: allies hit pushed foes after the skill
    // The combo with Earth Drive (roadmap 13.38, Suleiman 9 Nov): the shockwave bursts every rock
    // of his within its reach, and each burst rock hurts the foes standing next to it. Worked
    // out first, where everyone stands now (the wave then throws them back).
    const rocks = this.spikes.filter((sp) => sp.owner === user && distance(user, sp) <= spell.range);
    const rockHits = [];
    for (const sp of rocks) {
      for (const t of this.units.filter((o) => o.alive && o.side !== user.side && distance(o, sp) <= 1)) {
        const landed = this.landHit(t, spell.rockDamage);
        t.hp = Math.max(0, t.hp - landed.damage);
        if (t.hp === 0) this.defeat(t);
        rockHits.push({ t, landed, sp });
      }
    }
    const foes = this.clapFoes(user, true).filter((t) => t.alive);
    const lead = foes[foes.length - 1] || (rockHits[0] && rockHits[0].t); // the nearest foe: he faces it
    const dx = lead ? lead.view.x - user.view.x : 1;
    if (lead) this.faceToward(user, dx, lead.view.y - user.view.y);
    const hits = foes.map((t) => {
      const landed = this.landHit(t, Math.max(1, Math.round(getDamage(user, t) * spell.damageShare)));
      t.hp = Math.max(0, t.hp - landed.damage);
      let pushed = null;
      if (t.hp === 0) this.defeat(t);
      else {
        pushed = this.pushLoser(t, user, spell.push);
        if (t.engagedWith && distance(t, t.engagedWith) > 1) endDuel(t);
      }
      return { t, landed, pushed, away: t.view.x - user.view.x };
    });
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();

    this.floatText(user, spell.name, spell.color, { rise: 40 });
    play('whoosh');
    this.showPose(user, 'attack', dx); // his attack frames stand in for the clap
    // the hands meet: the ring and the dust go out together
    this.time.delayedCall(220, () => {
      play('crash');
      screenShake(this, 0.01, 260);
      const base = tileToScreen(user.col, user.row);
      shockRing(this, base.x, base.y, TILE_WIDTH * 1.1, TILE_HEIGHT * 1.1);
      dustRing(this, base.x, base.y, 200);
      // sound: three pale rings rolling out, the floor and everyone near lit white-gold (18.23)
      energyWaves(this, base.x, base.y, elementOf('sound').glow, { count: 3, size: 1.5, gap: 80 });
      floorLight(this, base.x, base.y, elementOf('sound').glow, { size: 2.4, peak: 0.55, ms: 520 });
      lightNearby(this, base.x, base.y - 30, elementOf('sound').glow, { radius: 240, peak: 0.5, ms: 380, skip: user });
      // a burst of sand and dust thrown out along the ground (fxEmitter, so Light mode and the particle cap apply)
      const dust = fxEmitter(this, user, {
        texture: 'fx-dot',
        frequency: 25,
        maxParticles: 20,
        behindFigure: false,
        config: {
          x: { min: -14, max: 14 },
          y: { min: -10, max: 2 },
          speedX: { min: -260, max: 260 },
          speedY: { min: -70, max: 24 },
          scale: { start: 1.7, end: 0.3 },
          alpha: { start: 0.75, end: 0 },
          tint: [0xcdb48a, 0xe3d2aa, 0xb89c72],
          blendMode: 'NORMAL',
          lifespan: { min: 450, max: 750 },
        },
      });
      if (dust) this.time.delayedCall(260, () => dust.emitter.scene && dust.emitter.stop()); // one blast, not a loop
      if (dust) this.time.delayedCall(1000, () => dust.destroy());
    });
    // the wave reaches his rocks: each bursts, and the foes beside it are struck by the pieces
    rocks.forEach((sp) => {
      this.time.delayedCall(240 + 70 * distance(user, sp), () => {
        const at = tileToScreen(sp.col, sp.row);
        play('crash');
        dustRing(this, at.x, at.y, 120);
        emberBurst(this, at.x, at.y - 20, elementOf('earth').spark, 26, 70);
        floorLight(this, at.x, at.y, elementOf('earth').glow, { size: 1.3, peak: 0.6, ms: 420 });
        this.removeSpike(sp);
      });
    });
    rockHits.forEach(({ t, landed, sp }) => {
      this.time.delayedCall(300 + 70 * distance(user, sp), () => {
        this.showImpact(user, t, { hit: true, damage: landed.damage, note: 'Rock burst', element: 'earth' }, t.view.x - tileToScreen(sp.col, sp.row).x, t.hp === 0);
      });
    });
    // the wave reaches them: a hit, and each one flies back a tile
    hits.forEach(({ t, landed, pushed, away }) => {
      const reach = distance(user, t); // the near ones are hit first
      this.time.delayedCall(260 + 70 * reach, () => {
        this.showImpact(user, t, { hit: true, damage: landed.damage, note: landed.note, element: 'sound' }, away, t.hp === 0);
        if (pushed && (pushed.path.length || pushed.fall)) {
          this.time.delayedCall(120, () => this.knockBack(t, pushed, away, { text: 'Thrown back!', color: '#e8c08a' }));
        }
      });
    });
    this.time.delayedCall(1100, () => {
      if (user.alive) {
        this.faceNearestOpponent(user);
        this.showStanding(user);
      }
    });
    this.time.delayedCall(2100, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  }

  // The foe Tayo's Element Blast should hit, or null: he needs an element on him
  // (Enchanted or Drenched), the skill ready, and a foe in a straight line 1 to 3
  // tiles away with a clear shot. A caster first, then the weakest.
  blastTarget(unit) {
    if (!unit.spells || !unit.spells.includes('elementBlast') || !canAfford(unit, 'elementBlast')) return null;
    if (!isEnchanted(unit) && !isDrenched(unit)) return null;
    const reach = spells.elementBlast.range;
    const marks = this.enemyEyes()
      .filter((t) => t.side !== unit.side && t.alive && !t.isDecoy && (t.col === unit.col || t.row === unit.row) && distance(unit, t) <= reach && hasClearShot(unit, t))
      .sort((a, b) => isCaster(b) - isCaster(a) || a.hp - b.hp);
    return marks[0] || null;
  }

  // Tayo's Element Blast (roadmap 13.4, his 6 Nov art): the element on him
  // gathers in his fist, dust rings spin up round his feet, then he punches
  // and the orb flies down the line. Enchanted: fire, sets Burn. Drenched:
  // water (the orb is blue), leaves the target Drenched. It spends the element.
  castElementBlast(user, target, spell = spells.elementBlast, onDone) {
    const fire = isEnchanted(user);
    const dx = target.view.x - user.view.x;
    this.faceToward(user, dx, target.view.y - user.view.y);
    // the numbers first, like Earth Drive; the picture catches up
    const landed = this.landHit(target, this.skillHit(user, target, spell));
    target.hp = Math.max(0, target.hp - landed.damage);
    if (target.hp === 0) this.defeat(target);
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();

    this.floatText(user, fire ? 'Fire Blast' : 'Water Blast', fire ? '#ff8a3c' : '#7fd0ff', { rise: 40 });
    // wind-up, then arms open while the dust rings spin and the orb grows in his hand
    this.showPose(user, 'blastWind', dx);
    const base = tileToScreen(user.col, user.row);
    const hand = () => ({ x: user.view.x + Math.sign(dx || 1) * 34, y: user.view.y - user.centerY * 1.05 });
    let grow = null;
    this.time.delayedCall(240, () => {
      if (!user.alive) return;
      this.showPose(user, 'blastCharge', dx);
      play('whoosh');
      [0, 170, 340].forEach((t) => this.time.delayedCall(t, () => dustRing(this, base.x, base.y, 190)));
      const h = hand();
      grow = elementOrb(this, h.x, h.y, { water: !fire, scale: 0.08 });
      chargeUp(this, h.x, h.y, fire ? 'fire' : 'water', { ms: 540, size: 1.1 }); // the element is drawn into his fist (18.23)
      if (grow) this.tweens.add({ targets: grow, scale: 0.34, duration: 520, ease: 'Quad.easeOut' });
    });
    // the punch: the orb leaves his fist and flies to the target
    this.time.delayedCall(800, () => {
      if (user.alive) this.showPose(user, 'blastPunch', dx);
      play('whoosh');
      screenShake(this, 0.004, 120);
      // the element is spent the moment it is fired
      spendElement(user, fire);
      this.refreshStatusTags();
      const a = grow ? { x: grow.x, y: grow.y } : hand();
      const b = this.centerOf(target);
      const orb = grow || elementOrb(this, a.x, a.y, { water: !fire, scale: 0.34 });
      const land = () => {
        if (orb && orb.active) orb.destroy();
        const p = this.centerOf(target);
        if (fire) flameBurst(this, target.view.x, target.view.y); else splash(this, p.x, p.y);
        play('crash');
        screenShake(this, 0.007, 180);
        this.showImpact(user, target, { hit: true, damage: landed.damage, note: landed.note, element: fire ? 'fire' : 'water', level: Math.max(3, hitLevel(landed.damage, target.hp === 0)) }, dx, target.hp === 0);
        if (target.alive) {
          if (fire && !isDrenched(target)) {
            applyBurn(target, 'elementBlast'); // burns like Wildfire (not a Drenched unit: the fire hisses out)
            this.time.delayedCall(300, () => { this.floatText(target, 'Burning!', '#ff8a3c', { rise: 46 }); this.refreshStatusTags(); });
          } else if (fire) {
            this.time.delayedCall(300, () => this.floatText(target, 'Too wet to burn', '#bfe8ff', { rise: 46 }));
          } else {
            if (isBurning(target)) cureBurn(target); // water puts a burn out
            applyDrenched(target, terrain.water.drenchedTurns);
            this.time.delayedCall(300, () => { this.floatText(target, 'Drenched', '#7fd0ff', { rise: 46 }); this.refreshStatusTags(); });
          }
        }
      };
      if (!orb) { land(); return; }
      this.tweens.add({ targets: orb, x: b.x, y: b.y, scale: 0.4, duration: 130 + 90 * distance(user, target), ease: 'Quad.easeIn', onComplete: land });
    });
    this.time.delayedCall(1500, () => {
      if (user.alive) {
        this.faceNearestOpponent(user);
        this.showStanding(user);
      }
    });
    this.time.delayedCall(2300, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else onDone();
    });
  }

  // The start of a unit's turn: its spikes stand one turn less.
  tickSpikes(unit) {
    for (const sp of this.spikes.filter((x) => x.owner === unit)) {
      sp.turnsLeft -= 1;
      if (sp.turnsLeft <= 0) this.removeSpike(sp);
    }
  }

  // A spike crumbles back into the ground and the tile is free again.
  removeSpike(sp) {
    if (!this.spikes.includes(sp)) return;
    this.spikes = this.spikes.filter((x) => x !== sp);
    crumbleSpike(this, sp.view);
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
      else { applyStun(target); this.breakChannel(target, 'Stunned'); }
    }
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();
    const dx = target.view.x - thrower.view.x;
    this.faceToward(thrower, dx, target.view.y - thrower.view.y);
    this.showPose(thrower, poseFrame(thrower.id, 'throw', 'right') ? 'throw' : 'windup', dx);
    this.time.delayedCall(260, () => {
      this.showPose(thrower, this.releasePose(thrower), dx);
      play('whoosh');
      const a = this.centerOf(thrower);
      const b = this.centerOf(target);
      // his painted shield in flight (6.33), else the plain drawn one
      // under Enchant the flaming shield has a picture for each direction it can fly (18.31): then it is not spun
      const rightFlight = moveFrames(thrower.id, 'shieldFlight', 'right');
      const directional = rightFlight && rightFlight.directional ? rightFlight : null;
      const flight = directional || moveFrames(thrower.id, 'shieldFlight', dx >= 0 ? 'right' : 'left');
      const dyT = target.view.y - thrower.view.y;
      const flightPic = (ddx, ddy) => directional.frames[Math.max(0, SHIELD_FACINGS.indexOf((ddy < 0 ? 'up' : 'down') + (ddx >= 0 ? 'Right' : 'Left')))];
      let shield;
      if (directional) {
        const f = flightPic(dx, dyT);
        shield = this.add.image(a.x, a.y, f.key).setDepth(79).setScale((thrower.baseScale || 0.5) * (f.scale || 1));
      } else if (flight) {
        shield = this.add.image(a.x, a.y, flight.frames[0].key).setDepth(79).setScale((thrower.baseScale || 0.5) * (flight.frames[0].scale || 1));
        let n = 0;
        const spin = this.time.addEvent({ delay: flight.frameMs, loop: true, callback: () => { n++; const f = flight.frames[n % flight.frames.length]; shield.setTexture(f.key).setFlipX(f.flip); } });
        shield.once('destroy', () => spin.remove());
      } else {
        shield = this.add.graphics().setDepth(79).setPosition(a.x, a.y);
        shield.fillStyle(0x8a6a3c, 1).fillCircle(0, 0, 13);
        shield.lineStyle(3, 0xd9b77a, 1).strokeCircle(0, 0, 13);
        shield.fillStyle(0xd9b77a, 1).fillCircle(0, 0, 4);
        this.tweens.add({ targets: shield, angle: 720, duration: 560 });
      }
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
          if (directional) shield.setTexture(flightPic(-dx, -dyT).key); // on its way back it flies the other way
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

  // Intercept and the moves a Verse turns it into (roadmap 3.1 to 3.5): a
  // charge across the field, shield first. The slam always lands, for a share
  // of a normal blow, and then what happens depends on "effect" in spells.json:
  //   lock      : Intercept. The target is locked in a clash with the charger.
  //               If it was clashing with an ally, the charger takes over and
  //               the ally is free.
  //   knockback : Shield Ram (Stone). Shoved "push" tiles back (wall slam rule).
  //   strike    : Furious Charge (Fury). Just the hit, at full strength.
  //   stun      : Blitz (Swiftness). Stunned for a turn.
  // The charge uses up the rest of the unit's steps.
  castIntercept(charger, target, spell, onDone) {
    onDone = this.collectRelays(onDone); // Relay Strike: allies hit pushed foes after the skill
    const spot = this.chargeTile(charger, target, spell);
    if (!spot) {
      onDone();
      return;
    }
    const effect = spell.effect || 'lock';
    charger.col = spot.col;
    charger.row = spot.row;
    charger.hasMoved = true;
    charger.stepsUsed = Infinity;
    const landed = this.landHit(target, this.skillHit(charger, target, spell));
    target.hp = Math.max(0, target.hp - landed.damage);
    let pushed = null;
    let locked = false;
    let freed = null;
    if (target.hp === 0) this.defeat(target);
    else if (effect === 'knockback') {
      pushed = this.pushLoser(target, charger, spell.push || 2);
      if (target.engagedWith && distance(target, target.engagedWith) > 1) endDuel(target);
    } else if (effect === 'stun') {
      applyStun(target);
      this.breakChannel(target, 'Stunned'); // a Stun breaks Gadara's Singularity
    } else if (effect === 'lock' && canBeCaught(target) && !charger.engagedWith) {
      if (target.engagedWith) {
        freed = target.engagedWith; // an ally was clashing with it: Sudeen takes over
        endDuel(target);
      }
      if (isStanceDuel()) startDuel(charger, target);
      else startEngagement(charger, target);
      locked = true;
    }
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();

    // the charge: fast steps with after-images, shield up. Furious Charge and
    // Shield Ram use Suleiman's frames (roadmap 6.15, 6.16) where he has them:
    // ready, two charging pictures in turn, then the strike, burst and landing.
    play('whoosh');
    const frameMove = { strike: 'furiousCharge', knockback: 'shieldRam' }[effect];
    const run = frameMove && moveFrames(charger.id, frameMove, target.view.x >= charger.view.x ? 'right' : 'left');
    if (run) this.showFrame(charger, run.frames[0]);
    const steps = spot.path.map((tile, i) => {
      const p = tileToScreen(tile.col, tile.row);
      return {
        x: p.x,
        y: p.y,
        duration: 85,
        onStart: () => {
          charger.view.setDepth(depthFor(tile.col, tile.row) + 1);
          this.afterimage(charger);
          this.faceToward(charger, target.view.x - p.x, target.view.y - p.y);
          if (run) this.showFrame(charger, run.frames[run.chargeFrames[i % run.chargeFrames.length]]);
          else this.showPose(charger, 'guard', target.view.x - p.x);
        },
      };
    });
    const slam = () => {
      const dx = target.view.x - charger.view.x;
      this.faceToward(charger, dx, target.view.y - charger.view.y);
      // the strike: his shield-push pictures (roadmap 1.27) belong to Intercept and its variants; else the move's own frames
      // (the move's impact frame first, then the push; its old push and brace frames are not isometric)
      if (this.hasPose(charger, 'push')) {
        const hit = run ? this.playMove(charger, frameMove, dx, { from: run.strikeFrom, to: run.strikeTo }) : 0;
        if (hit) this.time.delayedCall(hit, () => charger.alive && !charger.engagedWith && this.showPose(charger, 'push', dx));
        else this.showPose(charger, 'push', dx);
      } else if (!(run && this.playMove(charger, frameMove, dx, { from: run.strikeFrom }))) this.showPose(charger, 'attack', dx);
      screenShake(this, effect === 'strike' ? 0.009 : 0.006, 160);
      if (effect === 'strike') this.cameraPunch(2);
      this.showImpact(charger, target, { hit: true, damage: landed.damage, note: landed.note }, dx, target.hp === 0);
      if (target.alive && effect === 'stun') {
        this.floatText(target, 'Stunned!', '#ffe08a', { rise: 46 });
        this.refreshStatusTags();
      }
      if (target.alive && locked) {
        clashFlash(this, (charger.view.x + target.view.x) / 2, (charger.view.y + target.view.y) / 2 - target.centerY);
        play('clash');
        this.floatText(target, 'Locked in!', '#ffb35c', { rise: 46 });
        if (freed && freed.alive) {
          this.time.delayedCall(300, () => this.floatText(freed, 'Free!', '#9fd4ff', { pop: true }));
          this.faceNearestOpponent(freed);
          this.showStanding(freed);
        }
        this.refreshEngagementMarks();
        this.refreshStatusTags();
      }
      if (pushed && (pushed.path.length || pushed.fall)) {
        this.time.delayedCall(140, () => this.knockBack(target, pushed, dx, { text: 'Knocked back!', color: '#ff9a6a' }));
      }
      this.time.delayedCall(600, () => {
        charger.view.setDepth(depthFor(charger.col, charger.row) + 1);
        if (charger.alive) {
          this.faceNearestOpponent(charger);
          this.showStanding(charger);
        }
        if (target.alive && locked) {
          this.faceNearestOpponent(target);
          this.showStanding(target);
        }
      });
      this.time.delayedCall(1300, () => {
        if (outcome) {
          this.busy = false;
          this.showResult(outcome);
        } else onDone();
      });
    };
    const go = () => {
      if (steps.length === 0) slam();
      else this.tweens.chain({ targets: charger.view, tweens: steps, onComplete: slam });
    };
    if (run) this.time.delayedCall(140, go); // a moment in the ready picture first
    else go();
  }

  // ---------- Fury Dive (Gaha under a Verse of Fury, roadmap 3.14) ----------
  // He leaps up to "range" tiles, over heads and walls, and slams down on the
  // free tile next to the foe nearest him: "damageShare" times a normal blow,
  // never misses, and every enemy next to where he lands is knocked
  // Off-Balance. Pictures: his "furyDive" move (wind-up, leap, dive, slam, landing).
  castFuryDive(user, target, spell, onDone) {
    const spot = this.sweepSpot(user, target);
    if (!spot) {
      onDone();
      return;
    }
    const start = { x: user.view.x, y: user.view.y };
    user.col = spot.col;
    user.row = spot.row;
    user.hasMoved = true;
    user.stepsUsed = Infinity;
    const landed = this.landHit(target, Math.max(1, Math.round(getDamage(user, target) * spell.damageShare)));
    target.hp = Math.max(0, target.hp - landed.damage);
    if (target.hp === 0) this.defeat(target);
    const shaken = this.units.filter((u) => u.alive && u.side !== user.side && distance(u, spot) === 1);
    for (const u of shaken) applyOffBalance(u);
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();

    const end = tileToScreen(spot.col, spot.row);
    const dx = (target.view.x - start.x) || 1;
    this.faceToward(user, dx, target.view.y - start.y);
    const m = moveFrames(user.id, 'furyDive', dx >= 0 ? 'right' : 'left');
    const show = (i, pose) => (m ? this.showFrame(user, m.frames[i]) : this.showPose(user, pose, dx));
    show(0, 'windup');
    play('spell');
    this.time.delayedCall(220, () => {
      // the leap: up in an arc, over anything in the way
      play('whoosh');
      show(1, 'dodge');
      user.view.setDepth(76);
      const arc = { p: 0 };
      const peak = 110;
      let lastTrail = 0;
      this.tweens.add({
        targets: arc,
        p: 1,
        duration: 460,
        ease: 'Sine.easeIn',
        onUpdate: () => {
          user.view.x = start.x + (end.x - start.x) * arc.p;
          user.view.y = start.y + (end.y - start.y) * arc.p - Math.sin(arc.p * Math.PI) * peak;
          if (arc.p > 0.45 && !arc.diving) {
            arc.diving = true;
            show(2, 'attack');
          }
          if (this.time.now - lastTrail > 70) {
            lastTrail = this.time.now;
            this.afterimage(user);
          }
        },
        onComplete: () => {
          user.view.setPosition(end.x, end.y).setDepth(depthFor(spot.col, spot.row) + 1);
          this.faceToward(user, target.view.x - end.x, target.view.y - end.y);
          show(3, 'attack');
          // the slam: fire bursts up and the ground shakes
          play('crash');
          screenShake(this, 0.012, 220);
          this.cameraPunch(2);
          dustPuff(this, end.x, end.y);
          groundRing(this, end.x, end.y, 0xff8a5c, 1.4);
          verseAura(this, end.x, end.y, 'fury', user);
          flameBurst(this, target.view.x, target.view.y);
          energyWaves(this, end.x, end.y, elementOf('fire').glow, { count: 2, size: 1.1 }); // he lands: rings of heat roll out (18.23)
          this.showImpact(user, target, { hit: true, damage: landed.damage, note: landed.note, element: 'fire', level: Math.max(3, hitLevel(landed.damage, target.hp === 0)) }, target.view.x - end.x, target.hp === 0);
          this.time.delayedCall(260, () => {
            for (const u of shaken) {
              if (!u.alive) continue;
              if (!this.statusCard(u, 'offbalance', { label: 'Off-balance!', color: '#ff6b5a' })) this.floatText(u, 'Off-balance!', '#ff6b5a', { rise: 46 });
            }
            this.refreshStatusTags();
          });
          this.time.delayedCall(380, () => user.alive && show(4, 'ready'));
          this.time.delayedCall(900, () => {
            if (user.alive) {
              this.faceNearestOpponent(user);
              this.showStanding(user);
            }
          });
          this.time.delayedCall(1500, () => {
            if (outcome) {
              this.busy = false;
              this.showResult(outcome);
            } else onDone();
          });
        },
      });
    });
  }

  // ---------- Sonic Javelin (Gaha under a Verse of Swiftness, roadmap 3.6 and 3.11) ----------
  // Three forms, one per row of Suleiman's sheet, picked by where the foe is:
  //   sweep : a foe that is Off-Balance or Disoriented (it was just knocked
  //           about): he zips next to it and sweeps low with a burst of earth,
  //           "sweepShare" times a normal blow
  //   whirl : "closeRange" tiles or closer: he dashes in and brings the spear
  //           down in a whirl; it is knocked back a tile
  //   throw : further: the javelin breaks the sound barrier and hits every
  //           enemy in its line (up to its reach), each knocked back a tile
  // It never misses, and higher blocks don't stop it (it pierces).

  // Which form it takes against this target: { form, spot } (spot = where he ends up).
  javelinForm(user, target, spell) {
    if (isOffBalance(target) || isDisoriented(target)) {
      const spot = this.sweepSpot(user, target);
      if (spot) return { form: 'sweep', spot };
    }
    if (distance(user, target) <= spell.closeRange) {
      const spot = this.chargeTile(user, target, spell, spell.closeRange);
      if (spot) return { form: 'whirl', spot };
    }
    return { form: 'throw' };
  }

  // A free tile next to the target to zip to (the one nearest him), or null.
  sweepSpot(user, target) {
    if (distance(user, target) === 1) return { col: user.col, row: user.row, path: [] };
    let best = null;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const t = { col: target.col + dc, row: target.row + dr };
      if (!isInsideGrid(t.col, t.row) || this.isBlocked(t.col, t.row)) continue;
      if (!best || distance(user, t) < distance(user, best)) best = t;
    }
    return best ? { ...best, path: [] } : null;
  }

  // The tiles the thrown javelin flies over, from the thrower through the
  // target to the end of its reach, and the enemies on them (nearest first).
  javelinLine(user, target, spell) {
    const reach = this.spellReach(user, target, spell);
    const dc = target.col - user.col;
    const dr = target.row - user.row;
    const len = Math.hypot(dc, dr) || 1;
    const tiles = [];
    const seen = new Set([user.col + ',' + user.row]);
    for (let t = 0.05; t < reach + 1; t += 0.05) {
      const col = Math.round(user.col + (dc / len) * t);
      const row = Math.round(user.row + (dr / len) * t);
      if (!isInsideGrid(col, row) || distance(user, { col, row }) > reach) break;
      const key = col + ',' + row;
      if (seen.has(key)) continue;
      seen.add(key);
      tiles.push({ col, row });
    }
    const hits = [];
    for (const tile of tiles) {
      const u = this.getUnitAt(tile.col, tile.row);
      if (u && u.side !== user.side) hits.push(u);
    }
    return { tiles, hits };
  }

  // Plays a move from art.json "moves" picture by picture, facing dx. "at"
  // runs things on given pictures ({ 3: fn }). Returns how long it takes in ms
  // (0 if the unit has no such move, and nothing happens).
  playMove(unit, move, dx, { from = 0, to, at = {} } = {}) {
    const m = moveFrames(unit.id, move, dx >= 0 ? 'right' : 'left');
    if (!m) return 0;
    const frames = m.frames.slice(from, to);
    frames.forEach((f, i) =>
      this.time.delayedCall(i * m.frameMs, () => {
        if (unit.alive) this.showFrame(unit, f);
        if (at[i]) at[i]();
      })
    );
    return frames.length * m.frameMs;
  }

  castSonicJavelin(user, target, spell, onDone) {
    onDone = this.collectRelays(onDone); // Relay Strike: allies hit pushed foes after the skill
    const plan = this.javelinForm(user, target, spell);
    const results = []; // { unit, damage, note, pushed }
    const strike = (u, damage, push) => {
      const landed = this.landHit(u, damage);
      u.hp = Math.max(0, u.hp - landed.damage);
      let pushed = null;
      if (u.hp === 0) this.defeat(u);
      else if (push) {
        pushed = this.pushLoser(u, user, push);
        if (u.engagedWith && distance(u, u.engagedWith) > 1) endDuel(u);
      }
      results.push({ unit: u, damage: landed.damage, note: landed.note, pushed });
    };

    let line = null;
    if (plan.form === 'throw') {
      line = this.javelinLine(user, target, spell);
      // push the far ones first, so the near ones have room to be shoved back
      const order = [...line.hits].reverse();
      for (const u of order) strike(u, getDamage(user, u), spell.push || 1);
      results.reverse(); // back to nearest first, for the animation
    } else {
      user.col = plan.spot.col;
      user.row = plan.spot.row;
      user.hasMoved = true;
      user.stepsUsed = Infinity;
      if (plan.form === 'whirl') strike(target, getDamage(user, target), spell.push || 1);
      else strike(target, Math.max(1, Math.round(getDamage(user, target) * spell.sweepShare)), 0);
    }
    const outcome = this.checkBattleEnd();
    if (outcome) this.battleOver = true;
    this.refreshButtons();

    const art = hasSonicArt(this);
    const scale = user.baseScale || 0.5;
    const showHit = (r, dx) => {
      this.showImpact(user, r.unit, { hit: true, damage: r.damage, note: r.note, element: 'sound' }, dx, r.unit.hp === 0);
      const pushed = r.pushed;
      if (pushed && (pushed.path.length || pushed.fall)) {
        this.time.delayedCall(160, () => this.knockBack(r.unit, pushed, dx));
      }
    };
    const finish = (ms) => {
      this.time.delayedCall(ms, () => {
        if (user.alive) {
          user.view.setDepth(depthFor(user.col, user.row) + 1);
          this.faceNearestOpponent(user);
          this.showStanding(user);
        }
      });
      this.time.delayedCall(ms + 700, () => {
        if (outcome) {
          this.busy = false;
          this.showResult(outcome);
        } else onDone();
      });
    };

    if (plan.form === 'throw') {
      const dx = target.view.x - user.view.x;
      this.faceToward(user, dx, target.view.y - user.view.y);
      const a = this.centerOf(user);
      const endTile = line.tiles[line.tiles.length - 1];
      const endP = tileToScreen(endTile.col, endTile.row);
      const end = { x: endP.x, y: endP.y - user.centerY };
      const flight = 70 * line.tiles.length;
      const release = () => {
        play('whoosh');
        screenShake(this, 0.004, 120);
        const angle = Math.atan2(end.y - a.y, end.x - a.x);
        // his 5 Nov release picture (6.28): the arm is thrown out as the spear leaves
        if (this.hasPose(user, 'sonicRelease')) this.showPose(user, 'sonicRelease', dx);
        if (art) {
          sonicSpear(this, a.x, a.y, end.x, end.y, scale, flight, () => sonicImpact(this, endP.x, endP.y, scale, end.x < a.x));
          sonicTrail(this, a.x, a.y, end.x, end.y, scale, flight);
        }
        else arrowShot(this, a.x, a.y, end.x, end.y, () => {});
        // each enemy in the line is hit as the javelin passes it
        const total = Math.hypot(end.x - a.x, end.y - a.y) || 1;
        for (const r of results) {
          const b = this.centerOf(r.unit);
          const when = (flight * Math.hypot(b.x - a.x, b.y - a.y)) / total;
          this.time.delayedCall(when, () => {
            if (art) sonicRing(this, b.x, b.y, angle, scale);
            showHit(r, dx);
          });
        }
      };
      // his wind-up (9.16): the spear drawn back, then at release his throw picture
      // (5 Nov 15:38, 6.28) takes over while the spear flies.
      if (this.hasPose(user, 'sonicWindup')) {
        this.showPose(user, 'sonicWindup', dx);
        this.time.delayedCall(300, release);
        finish(300 + flight + 420);
        return;
      }
      const ms = this.playMove(user, 'sonicThrow', dx, { at: { 3: release } });
      if (!ms) {
        this.showPose(user, 'throw', dx);
        this.time.delayedCall(220, () => {
          this.showPose(user, this.releasePose(user), dx);
          release();
        });
      }
      finish(Math.max(ms, 300) + flight + 200);
      return;
    }

    const dx0 = target.view.x - user.view.x;
    if (plan.form === 'whirl') {
      // dash in (the running pictures), then raise the spear and whirl it down
      const path = plan.spot.path;
      play('whoosh');
      const dashFrames = moveFrames(user.id, 'sonicWhirl', dx0 >= 0 ? 'right' : 'left');
      const tweens = path.map((tile, i) => {
        const p = tileToScreen(tile.col, tile.row);
        return {
          x: p.x,
          y: p.y,
          duration: 85,
          onStart: () => {
            user.view.setDepth(depthFor(tile.col, tile.row) + 1);
            this.afterimage(user);
            if (dashFrames) this.showFrame(user, dashFrames.frames[i % 3]);
            else this.showPose(user, 'dodge', target.view.x - p.x);
          },
        };
      });
      const whirl = () => {
        const dx = target.view.x - user.view.x;
        this.faceToward(user, dx, target.view.y - user.view.y);
        const r = results[0];
        // his 1 Nov close-range strike (roadmap 9.16)
        if (this.hasPose(user, 'sonicClose')) {
          this.showPose(user, 'sonicClose', dx);
          this.time.delayedCall(110, () => { play('hit'); screenShake(this, 0.007, 160); showHit(r, dx); });
          finish(650);
          return;
        }
        const ms = this.playMove(user, 'sonicWhirl', dx, {
          from: 3,
          at: { 2: () => { play('hit'); screenShake(this, 0.007, 160); showHit(r, dx); } },
        });
        if (!ms) {
          this.showPose(user, 'attack', dx);
          showHit(r, dx);
        }
        finish(Math.max(ms, 300) + 350);
      };
      if (tweens.length) this.tweens.chain({ targets: user.view, tweens, onComplete: whirl });
      else whirl();
      return;
    }

    // sweep: vanish, appear next to the reeling foe, sweep low, earth bursts up
    const from = { x: user.view.x, y: user.view.y };
    this.afterimage(user);
    swiftTrail(this, from.x, from.y, dx0);
    play('whoosh');
    this.tweens.add({
      targets: user.view,
      alpha: 0,
      duration: 90,
      onComplete: () => {
        const p = tileToScreen(user.col, user.row);
        user.view.setPosition(p.x, p.y);
        user.view.setDepth(depthFor(user.col, user.row) + 1);
        const dx = target.view.x - p.x || dx0;
        this.faceToward(user, dx, target.view.y - p.y);
        this.tweens.add({ targets: user.view, alpha: 1, duration: 80 });
        const r = results[0];
        const burst = () => {
          play('crash');
          screenShake(this, 0.008, 180);
          if (art) earthBurst(this, target.view.x, target.view.y, scale, dx < 0);
          else dustPuff(this, target.view.x, target.view.y);
          showHit(r, dx);
        };
        const ms = this.playMove(user, 'sonicSweep', dx, { at: { 1: burst } });
        if (!ms) {
          this.showPose(user, 'attack', dx);
          burst();
        }
        finish(Math.max(ms, 300) + 300);
      },
    });
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
    // each strike has its own wind-up (18.29): he leans back for DOUBLE_WINDUP_MS, then the blow goes in
    strikes.forEach((strike, i) => {
      this.time.delayedCall(i * 420, () => {
        if (!user.view || !user.view.active) return;
        const lean = this.leanBack(user, dx, DOUBLE_WINDUP_MS);
        this.time.delayedCall(DOUBLE_WINDUP_MS, () => {
          this.unlean(lean);
          if (!user.view || !user.view.active) return;
          play('whoosh');
          const dh = moveFrames(user.id, 'doubleHit', dx >= 0 ? 'right' : 'left'); // one head, then the other (4.6)
          if (!(dh && dh.frames[i] && this.showFrame(user, dh.frames[i]))) this.showPose(user, i === 0 ? 'windup' : 'attack', dx);
          this.afterimage(user);
          // measured from its tile every frame (13.47, 13.54): a plain yoyo tween came back to wherever the body was
          // when it started, and the second head starts while the first is still out, so it stopped off the tile
          this.nudgeFromTile(user, (dx / dist) * 20, (dy / dist) * 10, { duration: 90, ease: 'Quad.easeIn' });
          this.time.delayedCall(100, () => this.showImpact(user, target, strike, dx, strike.lethal));
        });
      });
    });
    const end = strikes.length * 420 + DOUBLE_WINDUP_MS + 650;
    this.time.delayedCall(end - 250, () => user.alive && this.showStanding(user));
    this.time.delayedCall(end, () => {
      if (outcome) {
        this.busy = false;
        this.showResult(outcome);
      } else if (target.alive && strikes.some((s) => !s.hit) && this.canCounterstep(target, user)) {
        this.counterstep(target, user, (end) => (end ? this.endBattleFromRelay(end) : onDone())); // a miss on Gaha: Counterstep (13.59)
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
    // A marked target that ducked behind a higher block can't be hit (Suleiman, 29 Oct)
    const why = !target.alive ? null : shooter.engagedWith ? 'Aim broken' : !this.canSee(shooter, target) ? 'Lost sight' : distance(shooter, target) <= 1 ? 'Too close' : distance(shooter, target) > this.spellReach(shooter, target, spell) ? 'Out of reach' : !this.clearShot(shooter, target, spell) ? 'Blocked' : null;
    if (!target.alive || why) {
      if (why) this.floatText(shooter, why, '#e8d5a8');
      if (why === 'Blocked') this.floatText(target, 'Behind cover', '#9fd4ff', { rise: 46 });
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
        this.showImpact(bow, target, { hit, damage, note, element: 'poison' }, dx, target.hp === 0);
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

  // Herbs: a little health back for the unit itself or an ally in reach.
  // For an ally he throws the pouch (roadmap 1.12, Suleiman 31 Oct 12:04):
  // up to 2 tiles, one further for each level he stands above them
  // (spells.json range and rangePerLevel); it flies in an arc, so walls don't stop it.
  castHeal(healer, target, spell, onDone) {
    const amount = Math.min(spell.heal, target.maxHp - target.hp);
    target.hp += amount;
    const cured = isPoisoned(target) || isBurning(target);
    curePoison(target); // the herbs draw out poison too
    cureBurn(target);   // and put out a burn
    this.refreshButtons();
    const dx = target.view.x - healer.view.x || 1;
    if (target !== healer) this.faceToward(healer, dx, target.view.y - healer.view.y);
    this.showPose(healer, 'heal', dx); // the herb pouch raised (his 11:51 pictures)
    // channel, then cast (13.10): the herbs' glow gathers at the pouch before it is thrown or used
    chargeUp(this, healer.view.x + Math.sign(dx) * 12, healer.view.y - healer.topY * 0.85, 'heal', { ms: 240, size: 0.6, depth: healer.view.depth + 2 });
    this.time.delayedCall(800, () => healer.alive && this.showStanding(healer));
    // where it lands: the healing shows there
    const land = () => {
      if (cured) this.time.delayedCall(350, () => this.floatText(target, 'Cured', '#9fdc6a', { rise: 46 }));
      this.refreshStatusTags();
      this.updateHpBar(target);
      play('spell');
      buffAura(this, target.view.x, target.view.y, Phaser.Display.Color.HexStringToColor(spell.color).color);
      // healing: soft green-gold light on the ground and on the one healed, motes rising after (18.23)
      floorLight(this, target.view.x, target.view.y, elementOf('heal').glow, { size: 1.4, peak: 0.6, ms: 800 });
      lightNearby(this, target.view.x, target.view.y - target.centerY, elementOf('heal').glow, { radius: 70, peak: 0.6, ms: 600 });
      energyWaves(this, target.view.x, target.view.y, elementOf('heal').glow, { count: 1, size: 0.55, ms: 600 });
      afterglow(this, target.view.x, target.view.y - 8, 'heal', { level: 4, depth: target.view.depth + 2 });
      this.floatText(target, '+' + amount, spell.color, { pop: true });
      if (target.lowGlow && target.hp / target.maxHp > 0.3) {
        target.lowGlow.destroy();
        target.lowGlow = null;
      }
    };
    let flight = 0;
    if (target !== healer && this.textures.exists('fx:herb_pouch')) {
      const tiles = distance(healer, target);
      flight = 240 + tiles * 90;
      const from = { x: healer.view.x + Math.sign(dx) * 12, y: healer.view.y - healer.topY * 0.85 };
      const to = this.centerOf(target);
      const peak = 46 + tiles * 16;
      const pouch = this.add.image(from.x, from.y, 'fx:herb_pouch').setDepth(Math.max(healer.view.depth, target.view.depth) + 2);
      const p = { t: 0 };
      this.time.delayedCall(240, () => { // (after the glow has gathered at the pouch)
        play('whoosh');
        this.tweens.add({
          targets: p,
          t: 1,
          duration: flight,
          ease: 'Linear',
          onUpdate: () => {
            pouch.setPosition(from.x + (to.x - from.x) * p.t, from.y + (to.y - from.y) * p.t - peak * 4 * p.t * (1 - p.t));
            pouch.setAngle(p.t * 300 * Math.sign(dx));
          },
          onComplete: () => {
            pouch.destroy();
            land();
          },
        });
      });
      flight += 140;
    } else this.time.delayedCall(240, land); // on himself: once the glow has gathered
    this.time.delayedCall(1000 + flight, onDone);
  }

  // ---------- Switch weapon (roadmap 13.29) ----------

  // True if "viewer" can pick "other" as a target: a hidden unit (Husk, Smoke Bomb) can only be
  // seen by its own side.
  canSee(viewer, other) {
    return other.side === viewer.side || !other.hidden;
  }

  // An archer changes between her bow (2 to 5 tiles) and her dagger (the next tile). Free,
  // but once a turn, and not in a clash. "to" names the weapon; without it she swaps.
  // Returns true if she is now holding it.
  switchWeapon(unit, to) {
    if (!unit.closeWeapon) return false;
    const want = to || (holdsDagger(unit) ? 'bow' : 'dagger');
    if (unit.weapon === want) return true;
    if (unit.weaponSwitched || unit.engagedWith) return false;
    unit.weapon = want;
    unit.weaponSwitched = true;
    play('select');
    this.floatText(unit, want === 'dagger' ? 'Dagger' : 'Bow', '#e8d5a8');
    this.showStanding(unit);
    this.refreshButtons();
    return true;
  }

  onSwitchWeaponButton() {
    const unit = this.activeUnit;
    if (unit.side !== 'hero' || this.busy || this.battleOver) return;
    this.cancelMode();
    this.switchWeapon(unit);
    this.refreshStatus();
  }

  // Between turns an archer holds the weapon that fits (roadmap 1.46): the dagger while a
  // foe she can see stands next to her, the bow otherwise. It is a reflex, so it is free and
  // does not use her one switch. Not for whoever's turn it is (the player, or her AI, chooses
  // then), not in a clash (she fights with the dagger there anyway), not while taking aim.
  readyCloseWeapons() {
    for (const unit of this.units) {
      if (!unit.alive || !unit.closeWeapon || unit === this.activeUnit || unit.engagedWith || unit.aiming || unit.knock) continue;
      const want = this.adjacentFoe(unit) ? 'dagger' : 'bow';
      if (unit.weapon === want) continue;
      unit.weapon = want;
      if (want === 'dagger') this.floatText(unit, 'Dagger', '#e8d5a8');
      this.showStanding(unit);
    }
  }

  // Her turn, before she acts: dagger for a foe next to her, bow otherwise (the one free switch).
  aiPickWeapon(unit) {
    if (!unit.closeWeapon || unit.engagedWith) return;
    const near = this.enemyEyes().some((o) => o.alive && o.side !== unit.side && !o.isDecoy && distance(unit, o) === 1);
    this.switchWeapon(unit, near ? 'dagger' : 'bow');
  }

  // ---------- Smoke Bomb (roadmap 13.26) ----------

  // She throws it at her feet. Enemies next to her are Blinded for 1 turn. Then she slips up to
  // 2 tiles away for free (none of her steps are used) and is Hidden for 1 turn: enemies cannot
  // target her. The cloud stays on the tile until her next turn, then blows away (wakeSmoke).
  // "tile" is where she slips to (her own tile to stay in the cloud).
  castSmokeBomb(caster, tile, onDone) {
    const spell = spells.smokeBomb;
    const from = { col: caster.col, row: caster.row };
    const at = tileToScreen(from.col, from.row);
    const foes = this.units.filter((u) => u.alive && u.side !== caster.side && !u.hidden && distance(u, from) === 1);
    const look = foes[0] || this.nearestFoe(caster);
    const dx = look ? look.view.x - caster.view.x : caster.facing.endsWith('Right') ? 1 : -1;
    // the way out of the cloud
    let path = [];
    if (tile && (tile.col !== from.col || tile.row !== from.row)) {
      path = getPath(from.col, from.row, tile.col, tile.row, spell.range, (c, r) => this.isBlocked(c, r), moveRules(caster));
    }
    // the bomb goes off at the throw picture
    const burst = () => {
      if (!caster.view || !caster.view.active) return;
      play('crash');
      dustPuff(this, at.x, at.y);
      screenShake(this, 0.004, 120);
      const cloud = smokeCloud(this, at.x, at.y, depthFor(from.col, from.row) + 2);
      this.smokes.push({ owner: caster, col: from.col, row: from.row, cloud });
      for (const foe of foes) {
        applyBlinded(foe, this.activeUnit === foe);
        this.floatText(foe, 'Blinded', '#e0d8cc', { pop: true });
        this.interrupt(foe); // it cannot hold an aim it cannot see
      }
      this.refreshStatusTags();
    };
    this.faceToward(caster, dx, 0);
    const ms = this.playMove(caster, 'smokeThrow', dx, { at: { 2: burst } });
    if (!ms) burst();
    this.time.delayedCall(Math.max(ms, 300) + 350, () => {
      if (!caster.alive || !caster.view || !caster.view.active) return onDone();
      // out of the cloud: hidden at once, then gone to her new tile
      caster.hidden = true;
      caster.smokeHidden = true;
      this.hiddenLook(caster, true);
      this.tweens.add({ targets: caster.view, alpha: this.hiddenAlpha(caster), duration: 220 });
      this.floatText(caster, 'Hidden', spell.color, { rise: 30 });
      if (path.length) {
        caster.col = path[path.length - 1].col;
        caster.row = path[path.length - 1].row;
        const last = tileToScreen(caster.col, caster.row);
        this.faceToward(caster, last.x - caster.view.x, last.y - caster.view.y);
        this.slideAlong(caster, path);
        this.time.delayedCall(path.length * 170 + 60, () => {
          caster.view.setDepth(depthFor(caster.col, caster.row) + 1);
          this.faceNearestOpponent(caster);
          this.keepInView(caster);
        });
      } else this.faceNearestOpponent(caster);
      this.refreshStatusTags();
      this.refreshButtons();
      this.time.delayedCall(path.length * 170 + 350, onDone);
    });
  }

  // Her next turn begins (or she falls): the cloud blows away and she shows herself again.
  wakeSmoke(unit) {
    const mine = this.smokes.filter((s) => s.owner === unit);
    for (const s of mine) if (s.cloud) s.cloud.clear();
    this.smokes = this.smokes.filter((s) => s.owner !== unit);
    if (!unit.smokeHidden) return;
    unit.smokeHidden = false;
    unit.hidden = false;
    this.hiddenLook(unit, false);
    if (unit.view && unit.view.active && unit.alive) this.tweens.add({ targets: unit.view, alpha: 1, duration: 300 });
    this.refreshStatusTags();
  }

  // Husk: the caster leaves a decoy that looks exactly like her and slips away
  // to the chosen tile, faded and hidden. Enemies cannot see the real caster:
  // they chase and strike the decoy instead (see enemyEyes). The trick lasts
  // until the decoy is struck or until the caster's next turn.
  // It always breaks free of a clash.
  castHusk(caster, tile, onDone) {
    this.removeDecoys(caster); // one decoy at a time
    // Marked (roadmap 1.26): an archer aiming at her loses her, as if she had been hit:
    // her aim breaks and the mark on Layra goes, so the arrow has nothing to fly at
    if (caster.markedBy) {
      const archer = caster.markedBy;
      caster.markedBy = null;
      if (archer.aiming && archer.aiming.target === caster) this.interrupt(archer);
      this.refreshStatusTags();
    }
    if (caster.engagedWith) {
      endDuel(caster);
      this.refreshEngagementMarks();
    }
    this.addDecoy(caster, caster.col, caster.row);
    // Under Swiftness the decoy is wound up with wind: struck, it bursts in a
    // howling gust (roadmap 3.15). Wind swirls at its feet so you can tell.
    const swift = buffOf(caster) && buffOf(caster).id === 'swiftness';
    if (swift) this.decoys[this.decoys.length - 1].gust = true; // (its wind swirl is drawn by copyVerseLook now)
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
        this.tweens.add({ targets: caster.view, alpha: this.hiddenAlpha(caster), duration: 220 });
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
      const img = this.add.image(0, 6, owner.sprite.texture.key).setOrigin(owner.sprite.originX, owner.sprite.originY);
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
    const decoy = { owner, col, row, view };
    this.decoys.push(decoy);
    this.copyVerseLook(decoy);
  }

  // A decoy copies her CURRENT look (1.53): not only the picture (the blessed one under a Verse) but the Verse's
  // own effect round her too, drawn from the same functions the real unit uses (Suleiman's GIF loop where he has
  // drawn one, otherwise the code's wind, flames or orbiting stones). They sit inside the decoy's container, so they
  // go with it and are destroyed with it. A stand-in object carries what those functions read from a unit.
  copyVerseLook(decoy) {
    const owner = decoy.owner;
    const verse = buffOf(owner) ? buffOf(owner).id : null;
    if (!verse || !owner.sprite) return;
    const img = decoy.view.list.find((o) => o.type === 'Image');
    const stand = { view: decoy.view, sprite: img, topY: owner.topY, centerY: owner.centerY, bodyHalfWidth: owner.bodyHalfWidth, hidden: false, id: owner.id, alive: true };
    if (hasBuffLoop(this, verse)) buffLoopFx(this, stand, verse);
    else if (verse === 'swiftness') swiftAura(this, stand);
    else if (verse === 'fury') furyAura(this, stand, { ribbons: !hasPaintedAura(owner.id, 'fury') });
    else if (verse === 'stone') bulwarkAura(this, stand);
    decoy.verseLook = verse;
  }

  // The decoy is struck: it bursts into the swarm, and the caster shows herself.
  // How a caster looks while Husk hides her: see-through and lit gold, as if
  // she were made of light (the look Suleiman spotted when she stood hidden in
  // the cave's beam of daylight). The light is added on top of what is behind
  // her, so she glows on any tile, not only in the beam.
  // A hidden ENEMY is drawn another way (roadmap 1.47): a faint grey shape, so the
  // player can only just make out where she went, and cannot mistake her for a target.
  hiddenLook(unit, on) {
    const sprite = unit.sprite;
    if (!sprite || !sprite.active) return;
    if (on && unit.side !== 'hero') {
      sprite.setBlendMode(Phaser.BlendModes.NORMAL).setTint(HIDDEN_GREY);
    } else if (on) {
      sprite.setBlendMode(Phaser.BlendModes.ADD).setTint(HIDDEN_GLOW);
    } else {
      sprite.setBlendMode(Phaser.BlendModes.NORMAL).clearTint();
    }
  }

  // How see-through a hidden unit is: the player's own hero stays easy to find,
  // an enemy is only a faint shape (roadmap 1.47).
  hiddenAlpha(unit) {
    return unit.side === 'hero' ? HIDDEN_ALPHA : HIDDEN_ALPHA_FOE;
  }

  // A hidden unit is found out (roadmap 1.47): an area attack caught it. Smoke Bomb: she
  // shows herself (her cloud stays until her turn). Husk: the trick is over, the decoy goes.
  revealHidden(unit) {
    if (!unit.hidden) return;
    if (this.decoys.some((d) => d.owner === unit)) this.removeDecoys(unit);
    unit.smokeHidden = false;
    unit.hidden = false;
    this.hiddenLook(unit, false);
    if (unit.view && unit.view.active && unit.alive) this.tweens.add({ targets: unit.view, alpha: 1, duration: 200 });
    if (unit.alive) this.floatText(unit, 'Revealed', '#e8d5a8', { rise: 46 });
    this.refreshStatusTags();
  }

  popDecoy(decoy) {
    if (!this.decoys.includes(decoy)) return;
    if (decoy.gust) this.decoyGust(decoy);
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
    const gust = decoy.gust;
    this.playAttack(attacker, fake, { hit: true, damage: 0 }, false);
    this.time.delayedCall(gust ? 2000 : 1100, () => !this.battleOver && onDone());
  }

  // The Husk gust (roadmap 3.15; Baiyee and Suleiman, 30 Oct): a decoy left
  // under Swiftness bursts in a howling wind when it is struck. Every enemy
  // next to it is blown 2 tiles away (falls and wall slams as for any push).
  // The wind itself does no harm, and allies are left alone (no friendly fire).
  decoyGust(decoy) {
    const at = { col: decoy.col, row: decoy.row };
    const blown = this.units
      .filter((u) => u.alive && u.side !== decoy.owner.side && distance(u, at) === 1)
      .map((u) => ({ u, pushed: this.pushLoser(u, at, 2) }));
    for (const { u } of blown) if (u.engagedWith && distance(u, u.engagedWith) > 1) endDuel(u);
    play('whoosh');
    screenShake(this, 0.008, 200);
    verseAura(this, decoy.view.x, decoy.view.y, 'swiftness', decoy.owner);
    this.floatText({ view: decoy.view, topY: decoy.owner.topY }, 'Gust!', '#9fd4ff', { pop: true, rise: 40 });
    blown.forEach(({ u, pushed }) => {
      const awayX = u.view.x - decoy.view.x;
      if (pushed.held) this.floatText(u, 'Held!', '#d9b77a', { rise: 46 });
      this.knockBack(u, pushed, awayX, { text: 'Blown back!', color: '#9fd4ff' });
    });
    this.time.delayedCall(700, () => {
      this.refreshEngagementMarks();
      this.refreshStatusTags();
      this.refreshTurnStrip();
    });
    const outcome = this.checkBattleEnd();
    if (outcome && !this.battleOver) {
      this.battleOver = true;
      this.time.delayedCall(1100, () => {
        this.busy = false;
        this.showResult(outcome);
      });
    }
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
    chargeUp(this, caster.view.x, caster.view.y - caster.topY * 0.6, 'spirit', { ms: 420, size: 0.9, depth: caster.view.depth + 2 }); // (13.10) calm gathers round her
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
      // His clash meter (roadmap 8.21, UI rework step 4): the raven skull over the bar of seven slots
      if (this.textures.exists('ui:clash_skull') && this.textures.exists('ui:clash_bar')) {
        const meter = this.clashMeter(u, v, mx, my);
        // drawn by the HTML HUD instead, sharp at any zoom (18.44): not drawn on the canvas
        if (this.domHud) meter.cameraFilter = this.cameras.main.id | this.uiCam.id;
        this.engageMarks.push(ground, meter);
        continue;
      }
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

  // Suleiman's clash meter over two locked fighters (roadmap 8.21): the skull medallion, and in a
  // stance duel the bar under it. The bar's red end points at the enemy and its blue end at the
  // hero; the slots fill from the gold middle toward whoever is winning, in their colour (blue
  // for a hero, red for an enemy), one slot per point of momentum. Sizes in src/data/clashMeter.json.
  clashMeter(u, v, mx, my) {
    const M = clashMeterData;
    const box = this.add.container(mx, my).setDepth(85);
    const k = M.width / M.bar[0];
    const duel = isStanceDuel() && u.engagement;
    const barY = 6;
    if (duel) {
      const enemy = u.side !== 'hero' ? u : v;
      const hero = enemy === u ? v : u;
      const flip = enemy.view.x > hero.view.x; // the red end goes on the enemy's side
      const bar = this.add.image(0, barY, 'ui:clash_bar').setScale(k).setFlipX(flip);
      box.add(bar);
      const first = u.engagement.first;
      const other = first === u ? v : u;
      const track = u.engagement.track; // from "first"'s side
      const leader = track > 0 ? first : track < 0 ? other : null;
      const n = Math.min(Math.abs(track), 3);
      if (leader) {
        const leftSide = leader.view.x <= (leader === u ? v : u).view.x;
        const fill = leader.side === 'hero' ? 'ui:clash_fill_blue' : 'ui:clash_fill_red';
        for (let i = 1; i <= n; i++) {
          const slot = M.slots[leftSide ? 3 - i : 3 + i];
          // the slot's middle, from the bar's middle, on the leader's side of the screen (the
          // slots are the same either way, so a mirrored bar needs nothing more)
          const sx = (slot[0] + slot[2]) / 2 - M.bar[0] / 2;
          const sy = (slot[1] + slot[3]) / 2 - M.bar[1] / 2;
          const piece = this.add.image(sx * k, barY + sy * k, fill).setDisplaySize((slot[2] - slot[0]) * k, (slot[3] - slot[1]) * k);
          box.add(piece);
        }
      }
    }
    const skull = this.add.image(0, duel ? barY - M.bar[1] * k * 0.12 : 0, 'ui:clash_skull');
    skull.setScale(M.skull / skull.height).setOrigin(0.5, duel ? 0.92 : 0.5);
    box.add(skull);
    return box;
  }

  // The small tags above every unit's health bar.
  refreshStatusTags() {
    for (const unit of this.units) {
      if (!unit.tagRow || !unit.tagRow.active) continue;
      unit.tagRow.removeAll(true);
      // Over the unit: ENGAGED is left out (the crossed blades already show it).
      // A status with a picture (like Slow) shows its icon instead of the word.
      const all = unit.alive ? statusTags(unit).filter((t) => t.text !== 'ENGAGED') : [];
      // At most 2 over a head, then "+2" (M6, 17.2): the stance word of a clash first, the rest
      // in order. A long press on the fighter lists them all (13.49).
      const stanceFirst = [...all.filter((t) => !t.icon && ['PRESS', 'GUARD', 'SLIP'].includes(t.text)), ...all.filter((t) => t.icon || !['PRESS', 'GUARD', 'SLIP'].includes(t.text))];
      const tags = stanceFirst.slice(0, plateRules.maxIcons);
      if (stanceFirst.length > tags.length) tags.push({ text: '+' + (stanceFirst.length - tags.length), color: '#f1e6c8' });
      const items = tags.map((t) => {
        if (t.icon && this.textures.exists('icon:' + t.icon)) {
          // his icon in a thin bronze frame, with a small number for stacks (Bloodied 2)
          return {
            w: 28,
            make: (cx) => {
              const frame = this.add.rectangle(cx, 0, 28, 28, 0x1a1410, 0.9).setStrokeStyle(1.5, 0xb88a4a, 1);
              const img = this.add.image(cx, 0, 'icon:' + t.icon).setDisplaySize(26, 26);
              img.iconKey = t.icon; // so a status card can find the icon it shrinks into
              const out = [frame, img];
              if (t.count) {
                out.push(this.add.text(cx + 10, 8, String(t.count), { fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold', color: '#ffe08a', stroke: '#1a1410', strokeThickness: 4 }).setOrigin(0.5));
              }
              return out;
            },
          };
        }
        const text = this.add.text(0, 0, t.text, { fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: t.color }).setOrigin(0.5);
        const w = text.width + 10;
        return { w, make: (cx) => [this.add.rectangle(cx, 0, w, 18, 0x1a1410, 0.85), text.setPosition(cx, 0)] };
      });
      unit.tagRow.rowWidth = items.reduce((sum, it) => sum + it.w + 4, -4);
      let x = -items.reduce((sum, it) => sum + it.w + 4, -4) / 2;
      for (const it of items) {
        unit.tagRow.add(it.make(x + it.w / 2));
        x += it.w + 4;
      }
      fxSetActive(this.activeUnit || null); // the active unit's loops get the full-strength places
      // a slowed unit carries the Slow aura until the hex wears off
      const slowed = unit.alive && unit.status && unit.status.hex && unit.status.hex.id === 'slow';
      if (slowed && !unit.slowAura) unit.slowAura = slowAura(this, unit) || [];
      if (!slowed && unit.slowAura) {
        for (const o of unit.slowAura) o.destroy();
        unit.slowAura = null;
      }
      // under Swiftness, wind and feathers swirl at its feet (roadmap 3.10)
      // his own looping buff effects, once he sends them (13.46): they replace ours below
      const verseNow = unit.alive && buffOf(unit) ? buffOf(unit).id : null;
      // Gaha standing his ground under Earth's Bulwark (Rooted) shows the dome he drew for it in place of the orbiting stones
      const rootedNow = verseNow === 'stone' && isRooted(unit) && hasBuffPart(this, 'stone', 'rooted');
      for (const id of ['swiftness', 'fury', 'stone', 'renewal']) this.keepAura(unit, 'drawnAura_' + id, verseNow === id && hasBuffLoop(this, id) && !(id === 'stone' && rootedNow), () => buffLoopFx(this, unit, id));
      // the figure itself lit in the Verse's colour, pulsing with the loop (fxSlots.json "fuse")
      for (const id of ['swiftness', 'fury', 'stone', 'renewal']) this.keepAura(unit, 'fuse_' + id, unit.alive && verseNow === id, () => buffFuseFx(this, unit, id));
      this.keepAura(unit, 'drawnAura_stoneRooted', unit.alive && rootedNow, () => buffLoopFx(this, unit, 'stone', 'rooted'));
      // Kofi's Haunt: the teal and violet smoke stands round the feet of a haunted unit while the hex lasts (6.63;
      // back on 20 Nov, 1.71: Suleiman wants his original look; 1.57 had made it play once only)
      this.keepAura(unit, 'drawnAura_haunt', unit.alive && !!unit.status && !!unit.status.disoriented && unit.status.disoriented.by === 'haunt' && hasBuffLoop(this, 'haunt'), () => buffLoopFx(this, unit, 'haunt'));
      this.keepAura(unit, 'drawnAura_enchant', unit.alive && isEnchanted(unit) && hasBuffLoop(this, 'enchant'), () => buffLoopFx(this, unit, 'enchant'));
      // Gadara holding the blade end: his purple weapon aura (6.75)
      this.keepAura(unit, 'drawnAura_blade', unit.alive && unit.grip === 'blade' && hasBuffLoop(this, 'blade'), () => weaponAuraFx(this, unit, 'blade') || buffLoopFx(this, unit, 'blade')); // (laid on his staff in every picture, 10.37)
      const swift = unit.alive && buffOf(unit) && buffOf(unit).id === 'swiftness' && !hasBuffLoop(this, 'swiftness');
      if (swift && !unit.swiftAura) unit.swiftAura = swiftAura(this, unit) || [];
      if (!swift && unit.swiftAura) {
        for (const o of unit.swiftAura) o.destroy();
        unit.swiftAura = null;
      }
      // under Fury or Earth's Bulwark, their own looks (roadmap 6.13)
      const verse = unit.alive && buffOf(unit) ? buffOf(unit).id : null;
      // (Gaha has the fire painted round him in his own Fury pictures, so no ribbons are added)
      this.keepAura(unit, 'furyAura', verse === 'fury' && !hasBuffLoop(this, 'fury'), () => furyAura(this, unit, { ribbons: !hasPaintedAura(unit.id, 'fury') }));
      this.keepAura(unit, 'bulwarkAura', verse === 'stone' && !hasBuffLoop(this, 'stone'), () => bulwarkAura(this, unit));
      // Rabdul's Enchant: Shango's symbol glowing at its feet (roadmap 4.1)
      // (badly hurt, his weak pose wins over the flame pictures, so the code flame is drawn on top instead: 1.56)
      const flameArt = artHasLook(unit.id, 'enchanted') && !(unit.wasWeak && artHasWeak(unit.id));
      if (unit.enchantAura && unit.enchantAuraArt !== flameArt) this.keepAura(unit, 'enchantAura', false, null); // the look changed: draw the aura again
      unit.hasEnchantedArt = flameArt; // its own flaming pictures to stand in
      unit.enchantAuraArt = flameArt;
      this.keepAura(unit, 'enchantAura', unit.alive && isEnchanted(unit) && !hasBuffLoop(this, 'enchant'), () => enchantAura(this, unit));
      // a burning unit gives off embers
      const burning = unit.alive && isBurning(unit);
      if (burning && !unit.burnAura) unit.burnAura = burnAura(this, unit);
      if (!burning && unit.burnAura) {
        for (const o of unit.burnAura) o.destroy();
        unit.burnAura = null;
      }
    }
    spreadTagRows(this.units); // icon rows of fighters standing together never sit on each other (D1)
  }

  // Starts or stops one of the looping looks on a unit (made by make(), which
  // returns { objects, tweens } or null when its pictures are missing).
  keepAura(unit, name, on, make) {
    if (on && !unit[name]) unit[name] = make() || { objects: [], tweens: [] };
    if (!on && unit[name]) {
      for (const t of unit[name].tweens) t.remove();
      for (const o of unit[name].objects) o.destroy();
      unit[name] = null;
    }
  }

  // One of Suleiman's status cards, small, on the character (roadmap 6.9):
  // it pops up over the unit's head with the status's name under it, holds
  // for a moment, then shrinks into the unit's row of icons and its icon
  // gives a little bounce. id: offbalance, swiftness, fury, stone, press,
  // empower. side: 0 = over the head; -1 or 1 = beside it (used in a clash,
  // away from the foe, so it doesn't cover the banner between them).
  // Cards for the same unit wait their turn. Returns false if the picture is missing.
  statusCard(unit, id, { label = '', color = '#f1e6c8', side = 0, icon = id } = {}) {
    if (!this.textures.exists('card:' + id) || !unit.alive) return false;
    const now = this.time.now;
    const wait = Math.max(0, (unit.cardFreeAt || 0) - now);
    unit.cardFreeAt = now + wait + 900;
    this.time.delayedCall(wait, () => {
      if (!unit.alive || !unit.view.active) return;
      const H = 80; // the card's height on the board
      const card = this.add.image(0, 0, 'card:' + id);
      const full = H / card.height;
      card.setScale(full * 0.35).setAlpha(0);
      // a flash of light over the card as it lands
      const shine = this.add.image(0, 0, 'card:' + id).setBlendMode(Phaser.BlendModes.ADD).setScale(full).setAlpha(0);
      const name = this.add
        .text(0, H / 2 + 14, label, { fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold', color, stroke: '#1a1410', strokeThickness: 5 })
        .setOrigin(0.5)
        .setAlpha(0);
      const group = this.add.container(0, 0, [card, shine, name]).setDepth(84);
      // It follows the unit (a pushed unit slides away with its card). p goes
      // from 0 (beside or over the unit) to 1 (in its row of icons).
      const move = { p: 0 };
      const place = () => {
        if (!unit.view.active) return;
        // over the head, or beside the body at chest height (in a clash the
        // banner sits above the fighters' heads, so the cards stay out of its way)
        const ax = unit.view.x + side * 80;
        const ay = side ? unit.view.y - unit.centerY - 6 : unit.view.y - unit.topY - 64;
        const tx = unit.view.x;
        const ty = unit.view.y - unit.topY - 19;
        group.setPosition(ax + (tx - ax) * move.p, ay + (ty - ay) * move.p);
      };
      place();
      this.events.on('update', place);
      this.events.once('shutdown', () => this.events.off('update', place));
      this.tweens.add({ targets: card, scale: full, alpha: 1, duration: 170, ease: 'Back.easeOut' });
      this.tweens.add({ targets: shine, alpha: { from: 0.7, to: 0 }, delay: 120, duration: 260 });
      this.tweens.add({ targets: name, alpha: 1, delay: 90, duration: 140 });
      this.tweens.add({ targets: name, alpha: 0, delay: 640, duration: 140 });
      // then it shrinks into the icon row above the health bar
      this.tweens.add({
        targets: move,
        p: 1,
        delay: 680,
        duration: 220,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          card.setScale(full * (1 - 0.82 * move.p)).setAlpha(1 - 0.8 * move.p);
          place();
        },
        onComplete: () => {
          this.events.off('update', place);
          group.destroy();
          this.bounceIcon(unit, icon);
        },
      });
    });
    return true;
  }

  // The icon a status card just shrank into gives a little bounce.
  bounceIcon(unit, icon) {
    if (!unit.tagRow || !unit.tagRow.active) return;
    const img = unit.tagRow.list.find((o) => o.iconKey === icon);
    if (!img) return;
    const sx = img.scaleX;
    const sy = img.scaleY;
    this.tweens.add({ targets: img, scaleX: sx * 1.45, scaleY: sy * 1.45, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
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
    // kept inside the screen (17.3): a clash at the board's edge used to cut the words
    const v = this.cameras.main.worldView;
    const half = Math.max(big.width, small.width) / 2 + 8;
    const cx = Phaser.Math.Clamp(x, v.x + half, v.right - half);
    const cy = Phaser.Math.Clamp(y, v.y + v.height * 0.14 + 30, v.bottom - 70);
    big.setPosition(cx, cy); small.setPosition(cx, cy + 38);
    this.tweens.add({ targets: big, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [big, small], alpha: 0, delay: 480, duration: 260, onComplete: () => { big.destroy(); small.destroy(); } });
  }

  // While a cut-in or clash plays, taps speed it up instead of doing anything else.
  beginCinematic() {
    dropTurnBanner(this);
    if (this.inCinematic) return;
    this.inCinematic = true;
    this.skipped = false;
  }

  skipCinematic() {
    if (!this.inCinematic || this.skipped) return;
    this.skipped = true;
    this.setSpeed('skip', 5);
  }

  // A clash contact (16.1 step 9): the camera pushes in 6% and eases back. The opening and decisive
  // beats also slow the world to 0.4 for about 180 ms (real time). Both go through setSpeed and the
  // camera only, so skipping a cut-in still works (endCinematic clears slowMo).
  clashPunch(big) {
    const cam = this.cameras.main;
    const z = cam.zoom;
    cam.zoomTo(z * 1.06, 70, 'Sine.easeOut', true);
    setTimeout(() => { if (this.scene.isActive()) cam.zoomTo(z, 170, 'Sine.easeInOut', true); }, 90);
    if (!big) return;
    this.setSpeed('slowMo', 0.4);
    setTimeout(() => { if (this.scene.isActive()) this.setSpeed('slowMo', 1); }, 180);
  }

  // The decisive beat's burst on the loser (16.1 step 11): sj_burst, big dust ring, double sparks, a
  // short shake, and the winner's own Verse hit effect layered on top if it has one.
  decisiveFinish(beat) {
    const loser = beat.loser, winner = beat.winner;
    if (!loser || !winner) return;
    const depth = depthFor(loser.col, loser.row) + 2;
    decisiveBurst(this, loser.view.x, loser.view.y, depth);
    energyWaves(this, loser.view.x, loser.view.y, elementOf('spirit').glow, { count: 3, size: 1.2 }); // 16.4: the waves spread from the burst
    afterglow(this, loser.view.x, loser.view.y, 'sand', { level: 4, depth });
    screenShake(this, 0.007, 200);
    const kinds = verseKinds(winner);
    if (kinds.length) {
      const dir = loser.view.x >= winner.view.x ? 1 : -1;
      hitEffect(this, kinds, loser.view.x, loser.view.y - loser.centerY, loser.view.x, loser.view.y, dir, depth);
    }
  }

  // How fast the battle runs. Several things change the speed, sometimes at
  // the same moment: skipping a cut-in (5 times faster), the finishing-blow
  // slow motion, and the split-second freeze when a blow lands. Each keeps its
  // own factor, and the real speed is all of them multiplied together, so one
  // can never undo or trap another. "base" is the normal speed (1).
  // Turns fast enemy turns on or off and remembers it (roadmap 18.11).
  setEnemyFast(on) {
    this.enemyFast = !!on;
    try { window.localStorage.setItem(PACE_KEY, on ? 'fast' : 'normal'); } catch (e) { /* private window: just not remembered */ }
    if (this.activeUnit) this.setSpeed('enemy', this.enemyFast && this.activeUnit.side === 'enemy' ? ENEMY_FAST : 1);
  }

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
    this.goHome();
    this.setSpeed('skip', 1);
    this.setSpeed('slowMo', 1);
    this.inCinematic = false;
    this.skipped = false;
  }

  // ---------- Camera ----------

  // Eases the battlefield camera in on a point. The interface does not move.
  // zoom is relative to the normal view (1.3 = 30% closer than the whole board).
  focusCamera(x, y, zoom = 1.3, duration = 260) {
    const cam = this.cameras.main;
    const base = this.follow && this.rest ? Math.max(this.home.zoom, this.rest.zoom) : this.home.zoom;
    const z = Math.min(zoom * base, this.zoomRange ? this.zoomRange[1] * 1.25 : Infinity);
    const b = this.boardBounds();
    const cx = Math.min(Math.max(x, b.x0), b.x1);
    const cy = Math.min(Math.max(y, b.y0), b.y1);
    cam.pan(cx, cy, duration, 'Sine.easeInOut', true);
    cam.zoomTo(z, duration, 'Sine.easeInOut', true);
  }

  // Back to the normal view of the whole board.
  resetCamera(duration = 320) {
    const cam = this.cameras.main;
    const view = this.follow && this.rest ? this.rest : this.home;
    cam.pan(view.x, view.y, duration, 'Sine.easeInOut', true);
    cam.zoomTo(view.zoom, duration, 'Sine.easeInOut', true, (c, progress) => {
      if (progress === 1) this.goHome();
    });
  }

  // ---------- Cut-ins ----------

  // Suleiman's clash banner (roadmap 8.6, his 30 Oct 20:28 elements): as a
  // clash starts, the two fighters' faces slam in from both sides in his
  // split frame (the hero on the red panel, the foe on the blue), with their
  // names; a flash and a shake where they meet, then they fly apart.
  clashBanner(a, b, onDone) {
    // Gaha against the Bull Commander: after the banners, one of Suleiman's clash GIFs plays as a framed panel (6.62).
    // Not at fast speed (the panel is a long cut-in), and only once its frames are loaded.
    if (hasClashGif(a, b) && this.speed.base * this.speed.skip <= 1) {
      const name = pickClashGif(this);
      if (name) {
        const after = onDone;
        onDone = () => playClashGif(this, name, (o) => this.ui(o), after);
      }
    }
    const hero = a.side === 'hero' ? a : b;
    const foe = hero === a ? b : a;
    // both fighters have their own banner (8.15), loaded: his banners face to face
    const ha = clashArt(hero.id);
    const fa = clashArt(foe.id);
    if (ha && fa && [ha.key, fa.key, fa.nameKey].filter(Boolean).every((k) => this.textures.exists(k))) return this.bannerClash(hero, foe, ha, fa, onDone);
    if (!this.textures.exists('ui:clash_frame')) return this.cutIn(a, 'ENGAGE!', onDone);
    play('cutin');
    const { W, H, s } = this.lay;
    const [fw, fh] = clashData.size;
    const k = Math.min(W * 0.98, 1120 * s) / fw;
    const cx = W / 2;
    const cy = Math.round(H * (this.lay.portrait ? 0.42 : 0.44));
    const left = cx - (fw * k) / 2;
    const top = cy - (fh * k) / 2;
    const split = fw * 0.505; // where his crack runs
    const sides = [hero, foe].map((unit, i) => {
      const poly = clashData.panels[i];
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const pcx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const objs = [];
      const key = shoutKey(unit.id);
      let face = null;
      let mask = null;
      if (key && this.textures.exists(key)) {
        face = this.ui(this.add.image(0, 0, key).setDepth(251));
        face.setScale(((maxY - minY) * 1.3 * k) / face.height);
        mask = this.make.graphics({}, false);
        face.setMask(mask.createGeometryMask());
        objs.push(face);
      }
      const frame = this.ui(this.add.image(0, 0, 'ui:clash_frame').setOrigin(0, 0).setScale(k).setDepth(252));
      if (i === 0) frame.setCrop(0, 0, split + 12, fh);
      else frame.setCrop(split - 12, 0, fw - split + 12, fh);
      objs.push(frame);
      const name = this.ui(
        this.add
          .text(0, 0, unit.name.toUpperCase(), textStyle(Math.round(30 * s), i === 0 ? '#ffd9a0' : '#cfe0ff', { fontStyle: 'bold' }))
          .setOrigin(i === 0 ? 0 : 1, 0)
          .setDepth(253)
          .setLetterSpacing(2)
      );
      objs.push(name);
      // puts this side at a sideways offset (dx), mask and all
      const place = (dx) => {
        frame.setPosition(left + dx, top);
        if (face) {
          face.setPosition(left + dx + pcx * k + (i === 0 ? -40 : 40) * k, top + ((minY + maxY) / 2) * k);
          mask.clear().fillStyle(0xffffff).fillPoints(poly.map(([x, y]) => ({ x: left + dx + x * k, y: top + y * k })), true);
        }
        name.setPosition(i === 0 ? left + dx + (Math.min(...xs) + 40) * k : left + dx + (Math.max(...xs) - 40) * k, top + (maxY - 10) * k);
      };
      return { objs, place, mask, dir: i === 0 ? -1 : 1 };
    });
    const t = { p: 1 };
    const placeAll = () => sides.forEach((side) => side.place(side.dir * t.p * W));
    placeAll();
    // slam in from both sides
    this.tweens.add({ targets: t, p: 0, duration: 200, ease: 'Cubic.easeOut', onUpdate: placeAll, onComplete: placeAll });
    this.time.delayedCall(200, () => {
      play('clash');
      screenShake(this, 0.006, 160);
      const flash = this.ui(this.add.rectangle(cx, cy, W, (fh * k) * 0.9, 0xffffff, 0.6).setDepth(254));
      this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
    });
    // then fly apart
    this.time.delayedCall(1000, () => {
      this.tweens.add({ targets: t, p: 1, duration: 220, ease: 'Cubic.easeIn', onUpdate: placeAll });
    });
    this.time.delayedCall(1240, () => {
      for (const side of sides) {
        side.objs.forEach((o) => o.destroy());
        if (side.mask) side.mask.destroy();
      }
      onDone();
    });
  }


  // His own clash banners (roadmap 8.15, 31 Oct): the hero's slams in from the
  // left, the foe's from the right (flipped, with its name plate laid over so
  // the name still reads the right way), their points meeting in the middle;
  // a flash and a shake where they meet, then they fly apart.
  bannerClash(hero, foe, ha, fa, onDone) {
    play('cutin');
    const { W, H, portrait } = this.lay;
    const cx = W / 2;
    const cy = Math.round(H * (portrait ? 0.42 : 0.44));
    const overlap = 18;
    const sides = [
      [ha, false, -1],
      [fa, true, 1],
    ].map(([art, flip, dir], i) => {
      const img = this.ui(this.add.image(0, 0, art.key).setOrigin(0, 0).setFlipX(flip).setDepth(252 + i * 2));
      // about half the screen tall (a third when the phone is upright)
      const k = (H * (portrait ? 0.3 : 0.52)) / img.height;
      img.setScale(k);
      const w = img.width * k;
      const h = img.height * k;
      // its point: on the left banner at tip across, on the flipped one at 1 - tip
      const left = flip ? cx - overlap - (1 - art.tip) * w : cx + overlap - art.tip * w;
      const top = cy - h / 2 + (flip ? 0.07 : -0.07) * h;
      let name = null;
      if (flip && art.nameKey) name = this.ui(this.add.image(0, 0, art.nameKey).setOrigin(0, 0).setScale(k).setDepth(253 + i * 2));
      const place = (dx) => {
        img.setPosition(left + dx, top);
        if (name) name.setPosition(left + dx + art.nameX * w, top + art.nameY * h);
      };
      return { objs: name ? [img, name] : [img], place, dir };
    });
    const t = { p: 1 };
    const placeAll = () => sides.forEach((side) => side.place(side.dir * t.p * W));
    placeAll();
    this.tweens.add({ targets: t, p: 0, duration: 200, ease: 'Cubic.easeOut', onUpdate: placeAll, onComplete: placeAll });
    this.time.delayedCall(200, () => {
      play('clash');
      screenShake(this, 0.006, 160);
      // a thin bright slash where the points meet, widening as it fades
      const flash = this.ui(this.add.rectangle(cx, cy, Math.round(W * 0.012), Math.round(H * 0.46), 0xfff6e0, 0.95).setAngle(14).setDepth(256).setBlendMode(Phaser.BlendModes.ADD));
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 5, duration: 200, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    });
    this.time.delayedCall(1000, () => {
      this.tweens.add({ targets: t, p: 1, duration: 220, ease: 'Cubic.easeIn', onUpdate: placeAll });
    });
    this.time.delayedCall(1240, () => {
      for (const side of sides) side.objs.forEach((o) => o.destroy());
      onDone();
    });
  }

  // His clash banners for the units in this battle, loaded in the background
  // once it has started so they don't slow the first load (roadmap 8.15).
  // Until a pair is loaded, a clash shows the shared banner with both faces.
  loadClashArt() {
    let queued = loadClashGifs(this, this.units); // his clash GIFs (6.62) are JPEG, so the test browser reads them too
    if (typeof window !== 'undefined' && window.__noWebp) { // the test browser can't read WebP
      if (queued) this.load.start();
      return;
    }
    for (const u of this.units) {
      const c = clashArt(u.id);
      if (!c) continue;
      for (const [key, file] of [[c.key, c.file], [c.nameKey, c.nameFile]]) {
        if (!key || this.textures.exists(key)) continue;
        this.load.image(key, artUrl('./art/' + file));
        queued++;
      }
    }
    if (queued) this.load.start();
  }

  // For his game cursor (cursor.js, roadmap 8.17): wait while things move or
  // on the enemy's turn...
  cursorBusy() {
    if (!this.lay || this.battleOver) return false;
    return !!(this.busy || this.inCinematic || this.rotating || (this.activeUnit && this.activeUnit.side !== 'hero'));
  }

  // ...and the hover look over anything that can be tapped on the board: a
  // figure, a blue tile, a target.
  cursorHover(x, y) {
    if (!this.lay || !this.units) return false;
    const w = this.cameras.main.getWorldPoint(x, y);
    if (this.figureAt(w.x, w.y)) return true;
    const t = screenToTile(w.x, w.y);
    return this.reachableKeys.has(t.col + ',' + t.row) || this.targetsInRange.some((u) => u.col === t.col && u.row === t.row);
  }

  // A band sweeps across the screen with the unit's face and a big word,
  // like "ENGAGE!" or "FINISHING BLOW". Then onDone runs.
  cutIn(unit, words, onDone) {
    play('cutin');
    const W = this.scale.width;
    const cy = Math.round(this.scale.height * 0.44);
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
      const box = this.ui(this.add.container(from, Math.round(this.scale.height * (this.lay.portrait ? 0.5 : 0.46)), [face, name]).setDepth(230));
      this.tweens.add({ targets: box, x, duration: 220, ease: 'Back.easeOut' });
      return { unit, box, img: face.list[1] };
    };
    this.duelFaces = [make(hero, 72, -90), make(enemy, this.scale.width - 72, this.scale.width + 90)];
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
      const out = box.x < this.scale.width / 2 ? -90 : this.scale.width + 90;
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
        // Only units already in battle stance glance about. A relaxed unit flicking
        // into the ready pose looked like a random stance switch (roadmap 1.13).
        // a unit under a blessing (or Bloodied) stays in its blessed look: it has no blessed "ready" picture to glance with.
        // Weak units (roadmap 1.31) and the archer (her stance and standing pictures differ from the plain ready one) never glance:
        // the glance flickered them between looks. The archer's stance only changes when a foe comes into or leaves her range.
        const calm = this.units.filter((u) => u.alive && u.sprite && !u.engagedWith && u !== this.activeUnit && !buffOf(u) && !(u.fury > 0) && !(u.hp / u.maxHp <= HURT_FACE_AT) && !u.closeWeapon && this.isAlert(u));
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
    // In the style of Final Fantasy Tactics (roadmap 8.19, Baiyee 1 Nov): each
    // tile a see-through pane with a small gap round it, a bright glowing edge,
    // and all of them breathing together
    const edge = Phaser.Display.Color.ValueToColor(color).lighten(28).color;
    const added = [];
    for (const tile of tiles) {
      const { x, y } = tileToScreen(tile.col, tile.row);
      const hw = TILE_WIDTH / 2 - Math.max(5, TILE_WIDTH * 0.06);
      const hh = TILE_HEIGHT / 2 - Math.max(3, TILE_HEIGHT * 0.06);
      const pts = [{ x, y: y - hh }, { x: x + hw, y }, { x, y: y + hh }, { x: x - hw, y }];
      const diamond = this.add.graphics().setDepth(depthFor(tile.col, tile.row) + 0.5);
      diamond.fillStyle(color, alpha * boardRules.tiles.fill).fillPoints(pts, true); // soft: the painted floor shows through (M10, 17.11)
      diamond.lineStyle(7, edge, 0.3).strokePoints(pts, true, true); // the glow round the edge
      diamond.lineStyle(2.2, edge, 0.95).strokePoints(pts, true, true); // the bright edge
      this.highlights.push(diamond);
      added.push(diamond);
    }
    if (added.length) this.tweens.add({ targets: added, alpha: 0.62, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Coming back to a saved battle (M16): the saved numbers go back on the fighters, and
  // the board is drawn to match: who stands where, who has fallen, what was dug up, Tayo's
  // rocks. Returns false if there was nothing (matching) to come back to.
  resumeBattle() {
    const save = readSave();
    if (!save || save.map !== this.mapName || !applySave(this, save)) return false;
    for (const u of this.units) {
      this.placeUnit(u, u.col, u.row);
      u.shownHp = u.hp; // (no flash: nothing just happened)
      this.updateHpBar(u);
      if (!u.alive) u.view.setVisible(false);
      else this.showStanding(u);
    }
    // dug sites, and satchels dropped by the fallen
    for (const s of save.sites || []) {
      let site = this.sites.find((x) => x.col === s.col && x.row === s.row && x.prop === s.prop);
      if (!site) { site = { ...s, sprite: null }; this.sites.push(site); if (!site.dug) { drawSite(this, site); if (site.sprite) this.boardObjects.push(site.sprite); } }
      site.items = s.items.slice();
      if (s.dug && !site.dug) { site.dug = true; if (site.sprite) site.sprite.destroy(); site.sprite = null; }
    }
    for (const s of save.spikes || []) {
      const p = tileToScreen(s.col, s.row);
      this.spikes.push({ col: s.col, row: s.row, owner: this.units.find((u) => u.id === s.owner) || null, turnsLeft: s.turnsLeft, view: raiseSpike(this, p.x, p.y, depthFor(s.col, s.row) + 1.2, TILE_WIDTH * 1.05) });
    }
    this.refreshEngagementMarks();
    this.refreshStatusTags();
    this.resumed = true;
    return true;
  }

  // ---------- Mouse and keyboard on a computer (M8, checklist E3) ----------

  // The tile under the mouse gets a thin outline and is named top right (ground and height);
  // a fighter under it shows its card and its health, until the mouse moves off.
  hoverBoard() {
    const p = this.input.activePointer;
    const mouse = p && !p.wasTouch && !this.sys.game.device.input.touch;
    let tile = null;
    if (mouse && !this.battleOver && !this.inCinematic && !this.rotating && !(this.settingsSheet && this.settingsSheet.visible) && this.input.hitTestPointer(p).length === 0) {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const t = this.tileAtPoint(world.x, world.y);
      if (isInsideGrid(t.col, t.row)) tile = t;
    }
    // the mouse over an HTML HUD panel (18.44) is not over the board: no tile, and the panel's own
    // tooltip (a menu row's) must not be put away by the board
    const overHud = !!(this.domHud && this.domHud.overPanel);
    if (overHud) tile = null;
    const key = tile ? tile.col + ',' + tile.row : overHud ? 'hud' : null;
    if (key === this.hoverKey) return;
    this.hoverKey = key;
    if (!overHud) hoverTipEnd(this); // the mouse moved to another tile: any tooltip goes
    if (this.hoverMark) this.hoverMark.destroy();
    this.hoverMark = null;
    this.hoverTile = tile;
    const was = this.hoverUnit;
    this.hoverUnit = null;
    if (tile) {
      const { x, y } = tileToScreen(tile.col, tile.row);
      const hw = TILE_WIDTH / 2 - 3, hh = TILE_HEIGHT / 2 - 2;
      this.hoverMark = this.add.graphics().setDepth(depthFor(tile.col, tile.row) + 0.55);
      this.hoverMark.lineStyle(2, 0xfff4d6, 0.85).strokePoints([{ x, y: y - hh }, { x: x + hw, y }, { x, y: y + hh }, { x: x - hw, y }], true, true);
      const unit = this.getUnitAt(tile.col, tile.row);
      if (unit && unit.alive && !(unit.hidden && unit.side !== 'hero')) {
        this.hoverUnit = unit;
        hoverTipStart(this, () => (this.hoverUnit === unit && unit.alive ? unitTip(unit) : null), p.x, p.y); // after half a second
        flashPlate(this, unit, 1500);
        if (!this.busy) this.refreshCard(unit, unit !== this.activeUnit);
      }
    }
    if (was && !this.hoverUnit && !this.busy) this.refreshCard(this.viewing || this.activeUnit, !!this.viewing);
    this.refreshTileInfo();
  }

  // Esc: put away a tooltip or the settings, or cancel the choice being made.
  keyCancel() {
    if (this.tip) return hideTip(this);
    if (this.settingsSheet && this.settingsSheet.visible) return this.openSettings(false);
    if (this.battleOver || this.busy || this.inCinematic || !this.activeUnit || this.activeUnit.side !== 'hero') return;
    if (this.mode === 'spell' || this.mode === 'spellTarget' || this.mode === 'huskTile') return this.spellBack();
    if (this.mode === 'item' || this.mode === 'itemTarget') return this.itemBack();
    this.cancelMode();
  }

  // Enter: confirm what is picked (the same as tapping the picked target or tile again).
  // On the result screen it presses the first button.
  keyConfirm() {
    if (this.battleOver) {
      const first = this.resultButtons && this.resultButtons[0];
      if (first) first.hit.emit('pointerdown');
      return;
    }
    if (this.busy || this.inCinematic || !this.activeUnit || this.activeUnit.side !== 'hero') return;
    if (this.mode === 'approach' && this.approach) return this.confirmApproach();
    const t = this.pendingTarget || this.pendingTile;
    if (t) return this.handleTap(t.col, t.row);
    if (this.mode === 'rest' && this.selectedSpell) return this.chooseSpell(this.selectedSpell);
  }

  // Space: end the turn.
  keyEndTurn() {
    if (this.battleOver || this.busy || this.inCinematic || !this.activeUnit || this.activeUnit.side !== 'hero') return;
    if (this.settingsSheet && this.settingsSheet.visible) return;
    this.onEndButton();
  }

  // On a computer, the walking line runs to the blue tile under the mouse (M10). A phone has
  // no mouse: there the line shows as the walk starts (see moveUnit).
  hoverPath() {
    const unit = this.activeUnit;
    const p = this.input.activePointer;
    const can = this.mode === 'move' && unit && unit.side === 'hero' && !this.busy && !this.inCinematic && p && !p.wasTouch && !this.sys.game.device.input.touch;
    let key = null, tile = null;
    if (can) {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      tile = this.tileAtPoint(world.x, world.y);
      key = tile.col + ',' + tile.row;
      if (!this.reachableKeys.has(key)) key = null;
    }
    if (key === this.pathKey) return;
    this.clearPath();
    if (!key) return;
    const path = getPath(unit.col, unit.row, tile.col, tile.row, this.stepsLeft(unit), (c, r) => this.isBlocked(c, r), moveRules(unit));
    if (path.length === 0) return;
    this.pathKey = key;
    this.pathLine = drawPath(this, { x: unit.view.x, y: unit.view.y }, path, 79);
  }

  clearPath() {
    if (this.pathLine) this.pathLine.destroy();
    this.pathLine = null;
    this.pathKey = null;
  }

  clearHighlights() {
    this.clearPath();
    for (const diamond of this.highlights) {
      this.tweens.killTweensOf(diamond); // markers bob up and down
      diamond.destroy();
    }
    this.highlights = [];
  }

  // Cancels whatever the player was choosing and refreshes the screen.
  // The pose a skill is held in while its target is being chosen (roadmap 13.12):
  // Gaha draws the javelin back, Layra gathers with her element rising, Tayo
  // gathers the orb, Gadara puts his mask on (10.38). Skills without a charge picture stay standing.
  chargePoseFor(unit, spell) {
    const has = (p) => this.hasPose(unit, p);
    if (spell.kind === 'javelin') return has('sonicWindup') ? 'sonicWindup' : null;
    if (spell.kind === 'throw' || spell.kind === 'toss') return has('throw') ? 'throw' : null;
    if (spell.kind === 'elementBlast') return has('blastCharge') ? 'blastCharge' : null;
    if (['buff', 'hex', 'enchant'].includes(spell.kind)) return has('chant') ? 'chant' : null;
    // Gadara's Singularity (10.38): the mask goes on as soon as the player picks it, and stays on through the confirm (the cast then
    // keeps it as his masked look). The AI has no choosing step, so it only ever showed the cast's own mask; the player never saw it.
    if (spell.kind === 'singularity') return has('mask') ? 'mask' : null;
    return null;
  }

  // Start the hold. dx says which way he faces (toward the picked target once there is one).
  holdCharge(unit, id) {
    this.releaseCharge();
    const spell = spells[id];
    const pose = spell && this.chargePoseFor(unit, spell);
    if (!pose) return;
    const dx = unit.facing && unit.facing.endsWith('Left') ? -1 : 1;
    unit.charging = { pose, dx };
    this.showStanding(unit);
    const stops = [];
    if (pose === 'chant') {
      const stop = elementHold(this, unit, id);
      if (stop) stops.push(stop);
    } else if (pose === 'blastCharge') {
      const fire = isEnchanted(unit); // as in the cast: Enchanted gives fire, else water
      const orb = elementOrb(this, unit.view.x + 34, unit.view.y - unit.centerY * 1.05, { water: !fire, scale: 0.22 });
      if (orb) { stops.push(() => orb.destroy()); unit.charging.orb = orb; }
    }
    this.chargeFx = { unit, stops };
  }

  // The player picked a target: turn toward it, keep the pose.
  aimCharge(target) {
    const unit = this.chargeFx && this.chargeFx.unit;
    if (!unit || !unit.charging || !target || !target.view) return;
    const dx = target.view.x - unit.view.x;
    unit.charging.dx = dx >= 0 ? 1 : -1;
    this.faceToward(unit, dx, target.view.y - unit.view.y);
    this.showStanding(unit);
    if (unit.charging.orb && unit.charging.orb.active) unit.charging.orb.x = unit.view.x + Math.sign(dx || 1) * 34;
  }

  // Confirmed or cancelled: the pose and its effect end (a cast then plays its own).
  releaseCharge() {
    const fx = this.chargeFx;
    if (!fx) return;
    this.chargeFx = null;
    fx.stops.forEach((s) => s());
    fx.unit.charging = null;
    if (fx.unit.alive) this.showStanding(fx.unit);
  }

  cancelMode() {
    this.releaseCharge();
    if (this.mode !== 'idle' && this.activeUnit && this.activeUnit.side === 'hero') play('cancel');
    this.mode = 'idle';
    this.selectedSpell = null;
    this.selectedItem = null;
    this.itemPage = 0;
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

// The two kings' moves, Singularity and their AI (Phase 10) live in src/kingsScene.js
Object.assign(BattleScene.prototype, kingMethods);
