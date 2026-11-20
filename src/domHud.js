// The battle HUD drawn in HTML and CSS over the game (Job 2 of 20 Nov, roadmap 18.44).
//
// Why: the game is drawn in a canvas 720 pixels on its short side, then stretched to the
// screen. Small words and thin gold lines drawn in that canvas went soft when stretched
// (a desktop at 1440 x 900 stretches it by a quarter). Words written in HTML are drawn by
// the browser at the screen's own sharpness, Retina included.
//
// How: nothing in the game's logic moves. BattleScene still builds its HUD objects (the
// menu, its rows, the card, the turn strip...), still decides where each one goes, and
// the tests still read them. Those objects are simply no longer drawn on the canvas
// (BattleScene.ui hides them). Every frame this overlay copies what they show, at the
// same place and size, and a tap on an HTML row calls the very same handler the canvas
// row had. So the overlay is a skin: it reads the same state and calls the same code.
//
// Look: Final Fantasy Tactics: War of the Lions, bigger and grander. Dark see-through
// panels (about 80 percent), a gold frame with small corner ornaments, a faint texture
// inside; Cinzel for the title and headings, Cormorant Garamond for the rest; his
// emblems as pictures in the rows; a glowing gold pointer on the chosen row.
import { skillWords, emblemFor } from './battleCard.js';
import { portraitKey } from './art.js';
import { previewTurns } from './turnOrder.js';
import clashMeterData from './data/clashMeter.json';
import { artUrl } from './artUrl.js';

// Our icon names that use another of his glyph pictures (as hud.js GLYPH_FOR)
const GLYPH_FOR = { back: 'undo' };

// The tests run the game in jsdom (no real browser): there the overlay is not made,
// and the canvas HUD stays drawn as before.
export function domHudWanted() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  if (/jsdom/i.test(navigator.userAgent || '')) return false;
  return true;
}

// ---------- the look (one style sheet, put in the page once) ----------

// a faint grain inside every panel (a small noise picture made by the browser, no file)
const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.85 0 0 0 0 0.7 0 0 0 0 0.45 0 0 0 0.09 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";
// a small gold corner ornament: an L of two lines with a diamond at the corner
const CORNER = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M1 13 V1 H13' fill='none' stroke='%23e4c27c' stroke-width='1.4'/><path d='M4 9 V4 H9' fill='none' stroke='%23e4c27c' stroke-width='0.8' opacity='0.7'/><path d='M1 -1.6 L3.6 1 L1 3.6 L-1.6 1 Z' transform='translate(0 0)' fill='%23ffe3a0'/></svg>\")";

const CSS = `
#fabien-hud { position: absolute; left: 0; top: 0; pointer-events: none; overflow: hidden; z-index: 5;
  font-family: 'Cormorant Garamond', Garamond, 'Times New Roman', serif; color: #efe3c2;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; user-select: none; -webkit-user-select: none; }
#fabien-hud * { box-sizing: border-box; }
#fabien-hud .abs { position: absolute; }
#fabien-hud .hide { display: none !important; }
/* the framed panel */
#fabien-hud .fp { position: absolute; border-radius: calc(var(--u) * 3);
  background: ${GRAIN}, linear-gradient(180deg, rgba(26,19,12,0.84), rgba(10,7,5,0.80));
  border: max(1px, calc(var(--u) * 1.1)) solid rgba(201,163,90,0.9);
  box-shadow: inset 0 0 0 calc(var(--u) * 2.5) rgba(0,0,0,0.35), inset 0 0 0 calc(var(--u) * 3.2) rgba(228,194,124,0.16),
    0 calc(var(--u) * 3) calc(var(--u) * 14) rgba(0,0,0,0.55); }
#fabien-hud .fp > .c { position: absolute; width: calc(var(--u) * 11); height: calc(var(--u) * 11); background: ${CORNER} no-repeat center / contain; pointer-events: none;
  filter: drop-shadow(0 0 calc(var(--u) * 1.5) rgba(255,200,110,0.45)); }
#fabien-hud .fp > .c.tl { left: calc(var(--u) * -2.5); top: calc(var(--u) * -2.5); }
#fabien-hud .fp > .c.tr { right: calc(var(--u) * -2.5); top: calc(var(--u) * -2.5); transform: scaleX(-1); }
#fabien-hud .fp > .c.bl { left: calc(var(--u) * -2.5); bottom: calc(var(--u) * -2.5); transform: scaleY(-1); }
#fabien-hud .fp > .c.br { right: calc(var(--u) * -2.5); bottom: calc(var(--u) * -2.5); transform: scale(-1, -1); }
#fabien-hud .tap { pointer-events: auto; cursor: pointer; }
#fabien-hud .cinzel { font-family: 'Cinzel', 'Trajan Pro', Georgia, serif; }
#fabien-hud .gold { color: #e4c27c; }
#fabien-hud .dim { color: #bfae86; }
#fabien-hud .rule { height: 1px; background: linear-gradient(90deg, rgba(201,163,90,0), rgba(201,163,90,0.55) 15%, rgba(201,163,90,0.55) 85%, rgba(201,163,90,0)); }
#fabien-hud .dia { display: inline-block; width: calc(var(--u) * 6); height: calc(var(--u) * 6); transform: rotate(45deg); border: max(1px, calc(var(--u) * 0.9)) solid #e4c27c;
  box-shadow: inset 0 0 0 calc(var(--u) * 1.2) #120c08, inset 0 0 0 calc(var(--u) * 3) #e4c27c; flex: none; }

/* title and turn strip */
#fabien-hud .title { display: flex; align-items: center; gap: calc(var(--u) * 7); white-space: nowrap; letter-spacing: 0.22em; color: #d9c592;
  text-shadow: 0 1px 2px #000, 0 0 calc(var(--u) * 6) rgba(0,0,0,0.8); }
#fabien-hud .title .sig { width: calc(var(--u) * 14); height: calc(var(--u) * 14); border-radius: 50%; border: max(1px, calc(var(--u) * 0.8)) solid rgba(228,194,124,0.7); display: flex; align-items: center; justify-content: center; }
#fabien-hud .medal { position: absolute; border-radius: 50%; overflow: hidden; transform: translate(-50%, -50%);
  border: max(1px, calc(var(--u) * 1.3)) solid #a87b3a; box-shadow: 0 0 0 max(1px, calc(var(--u) * 0.8)) #1a120a, 0 calc(var(--u) * 2) calc(var(--u) * 6) rgba(0,0,0,0.7); }
#fabien-hud .medal img, #fabien-hud .port img, #fabien-hud .dmd img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 28%; display: block; }
#fabien-hud .medal.hero { background: radial-gradient(circle at 50% 35%, #3c7a74, #142826); }
#fabien-hud .medal.enemy { background: radial-gradient(circle at 50% 35%, #8a3a2b, #2a100b); }
#fabien-hud .medal.hero:not(.now) { border-color: #5fa49b; }
#fabien-hud .medal.enemy:not(.now) { border-color: #c0624c; }
#fabien-hud .medal.now { border: calc(var(--u) * 2.4) solid #e4c27c;
  box-shadow: 0 0 0 calc(var(--u) * 1.2) #4a3416, 0 0 0 calc(var(--u) * 2.4) #c9a35a, 0 0 calc(var(--u) * 14) rgba(255,205,110,0.75), 0 0 calc(var(--u) * 4) rgba(255,230,160,0.9);
  animation: fh-glow 2.4s ease-in-out infinite; }
@keyframes fh-glow { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.12); } }
#fabien-hud .arrow { position: absolute; width: 0; height: 0; transform: translate(-50%, -50%);
  border-top: calc(var(--u) * 4.5) solid transparent; border-bottom: calc(var(--u) * 4.5) solid transparent; border-left: calc(var(--u) * 5) solid #e4c27c;
  filter: drop-shadow(0 0 calc(var(--u) * 2) rgba(255,200,100,0.7)); }
#fabien-hud .stripline { position: absolute; height: 1px; background: linear-gradient(90deg, rgba(201,163,90,0.7), rgba(201,163,90,0.35) 80%, rgba(201,163,90,0)); }

/* the diamond list down the left */
#fabien-hud .dmd { position: absolute; transform: translate(-50%, -50%); clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
#fabien-hud .dmd .in { position: absolute; inset: calc(var(--u) * 1.6); clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
#fabien-hud .dmd.hero { background: #5fc2b8; } #fabien-hud .dmd.hero .in { background: #2e5f5b; }
#fabien-hud .dmd.enemy { background: #d8604a; } #fabien-hud .dmd.enemy .in { background: #6e2e22; }
#fabien-hud .dmd.now { background: #ffe08a; filter: drop-shadow(0 0 calc(var(--u) * 5) rgba(255,210,120,0.8)); }
#fabien-hud .dmd.dead { opacity: 0.32; filter: grayscale(1); }

/* the turn and terrain panel */
#fabien-hud .turnp { padding: calc(var(--u) * 6) calc(var(--u) * 9); display: flex; flex-direction: column; justify-content: center; gap: calc(var(--u) * 2); }
#fabien-hud .turnp .top { display: flex; align-items: center; gap: calc(var(--u) * 6); }
#fabien-hud .turnp .num { color: #f3e7c6; text-shadow: 0 0 calc(var(--u) * 6) rgba(255,210,130,0.35); }
#fabien-hud .turnp .row2 { display: flex; align-items: center; justify-content: space-between; }
#fabien-hud .turnp svg { flex: none; filter: drop-shadow(0 calc(var(--u) * 1.5) calc(var(--u) * 2) rgba(0,0,0,0.7)); }

/* the unit card */
#fabien-hud .card { display: flex; gap: calc(var(--u) * 8); padding: calc(var(--u) * 6); }
#fabien-hud .card .port { position: relative; flex: none; border: max(1px, calc(var(--u) * 1.3)) solid #c9a35a; border-radius: calc(var(--u) * 1.5);
  box-shadow: 0 0 0 max(1px, calc(var(--u) * 1.4)) #1a120a, 0 0 0 calc(var(--u) * 2.4) rgba(201,163,90,0.45), inset 0 0 calc(var(--u) * 10) rgba(0,0,0,0.6); overflow: hidden; }
#fabien-hud .card .port.hero { background: linear-gradient(#2e5f5b, #120c08); } #fabien-hud .card .port.enemy { background: linear-gradient(#6e2e22, #120c08); }
#fabien-hud .card .port.now { border-color: #ffe08a; box-shadow: 0 0 0 max(1px, calc(var(--u) * 1.4)) #1a120a, 0 0 0 calc(var(--u) * 2.4) #e4c27c, 0 0 calc(var(--u) * 10) rgba(255,210,120,0.55); }
#fabien-hud .card .port .noface { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; }
#fabien-hud .card .icons { position: absolute; left: calc(var(--u) * 2); bottom: calc(var(--u) * 2); display: flex; gap: calc(var(--u) * 1.5); }
#fabien-hud .card .icons img { width: calc(var(--u) * 13); height: calc(var(--u) * 13); filter: drop-shadow(0 0 2px #000); }
#fabien-hud .card .body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
#fabien-hud .card .namerow { display: flex; align-items: baseline; justify-content: space-between; gap: calc(var(--u) * 4); white-space: nowrap; }
#fabien-hud .card .name { color: #f6ead0; letter-spacing: 0.03em; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px #000, 0 0 calc(var(--u) * 8) rgba(255,215,140,0.25); line-height: 1.05; }
#fabien-hud .card .bars { display: flex; flex-direction: column; gap: calc(var(--u) * 2.4); }
#fabien-hud .bar { display: grid; grid-template-columns: calc(var(--u) * 19) 1fr auto; align-items: center; column-gap: calc(var(--u) * 5); line-height: 1; }
#fabien-hud .bar .w { color: #cdbb92; font-weight: 600; letter-spacing: 0.04em; }
#fabien-hud .bar .t { position: relative; height: max(3px, calc(var(--u) * 4.2)); background: rgba(0,0,0,0.65); border-radius: 99px; box-shadow: inset 0 0 0 1px rgba(201,163,90,0.35); overflow: hidden; }
#fabien-hud .bar .f { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 99px; }
#fabien-hud .bar .n { color: #f1e6c8; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; text-align: right; min-width: calc(var(--u) * 34); }
#fabien-hud .card .job { display: flex; align-items: center; gap: calc(var(--u) * 6); color: #c9b07a; white-space: nowrap; overflow: hidden; border-top: 1px solid rgba(201,163,90,0.22); padding-top: calc(var(--u) * 3); }
#fabien-hud .card.open { flex-direction: column; gap: calc(var(--u) * 4); }
#fabien-hud .card.open .stats { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid rgba(201,163,90,0.3); padding-top: calc(var(--u) * 4); }
#fabien-hud .card.open .stat { display: flex; align-items: baseline; justify-content: center; gap: calc(var(--u) * 4); }
#fabien-hud .card.open .stat b { color: #f1e6c8; font-weight: 700; } #fabien-hud .card.open .stat b.up { color: #9fdc8a; } #fabien-hud .card.open .stat b.down { color: #ff8a6a; }
#fabien-hud .card.open .chips { display: flex; gap: calc(var(--u) * 4); flex-wrap: nowrap; overflow: hidden; align-items: center; }
#fabien-hud .card.open .chip { display: flex; align-items: center; gap: calc(var(--u) * 2); padding: 0 calc(var(--u) * 5); border: 1px solid #8a6a3a; border-radius: calc(var(--u) * 4); background: rgba(0,0,0,0.5); white-space: nowrap; }
#fabien-hud .card.open .chip img { width: calc(var(--u) * 13); height: calc(var(--u) * 13); }

/* the command menu and the lists */
#fabien-hud .menu { transform-origin: 0 0; }
#fabien-hud .menu .grip { position: absolute; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: calc(var(--u) * 3); cursor: grab; touch-action: none; }
#fabien-hud .menu .grip i { width: calc(var(--u) * 2); height: calc(var(--u) * 2); border-radius: 50%; background: #c9a35a; opacity: 0.6; }
#fabien-hud .menu .grip.pinned i { background: #ffd27a; opacity: 0.95; }
#fabien-hud .mrow { position: absolute; display: flex; align-items: center; gap: calc(var(--u) * 6); padding: 0 calc(var(--u) * 7) 0 calc(var(--u) * 5); white-space: nowrap; touch-action: manipulation; }
#fabien-hud .mrow + .mrow::before { content: ''; position: absolute; left: calc(var(--u) * 4); right: calc(var(--u) * 4); top: 0; height: 1px; background: rgba(201,163,90,0.15); }
#fabien-hud .mrow .ic { position: relative; flex: none; display: flex; align-items: center; justify-content: center; }
#fabien-hud .mrow .ic img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 calc(var(--u) * 1.2) rgba(0,0,0,0.9)); }
#fabien-hud .mrow .ic .ring { position: absolute; inset: -18%; border-radius: 50%; opacity: 0.55; }
#fabien-hud .mrow .wd { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-weight: 600; letter-spacing: 0.02em; color: #f1e6c8; text-shadow: 0 1px 2px #000; }
#fabien-hud .mrow .ct { color: #e8dcc0; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; }
#fabien-hud .mrow.off .wd { color: #7d6e58; } #fabien-hud .mrow.off .ct { opacity: 0.5; } #fabien-hud .mrow.off .ic img { opacity: 0.4; }
#fabien-hud .mrow.lit, #fabien-hud .mrow.cur:not(.off) { background: linear-gradient(90deg, rgba(201,163,90,0.30), rgba(201,163,90,0.10) 70%, rgba(201,163,90,0.04));
  box-shadow: inset 0 1px 0 rgba(228,194,124,0.35), inset 0 -1px 0 rgba(228,194,124,0.35); }
#fabien-hud .mrow.lit .wd, #fabien-hud .mrow.cur:not(.off) .wd { color: #fff4d6; }
/* the War of the Lions pointer: a glowing gold arrowhead just outside the row, gently moving */
#fabien-hud .mrow .ptr { position: absolute; left: calc(var(--u) * -11); top: 50%; width: 0; height: 0; display: none;
  border-top: calc(var(--u) * 5.5) solid transparent; border-bottom: calc(var(--u) * 5.5) solid transparent; border-left: calc(var(--u) * 7.5) solid #ffd77a;
  filter: drop-shadow(0 0 calc(var(--u) * 3) rgba(255,205,100,0.95)) drop-shadow(0 0 1px #5a3a10); transform: translateY(-50%); animation: fh-ptr 0.9s ease-in-out infinite; }
#fabien-hud .mrow.lit .ptr, #fabien-hud .mrow.cur:not(.off) .ptr { display: block; }
@keyframes fh-ptr { 0%,100% { margin-left: 0; } 50% { margin-left: calc(var(--u) * -2.5); } }

/* the cancel tag, the hint, the skill panel, the settings */
#fabien-hud .pill { display: flex; align-items: center; justify-content: center; gap: calc(var(--u) * 8); white-space: nowrap; }
#fabien-hud .pill .x { color: #ff9c7a; font-weight: 700; }
#fabien-hud .hint { text-align: center; color: #efe3c2; font-weight: 600; transition: opacity 0.3s;
  text-shadow: 0 0 calc(var(--u) * 2) #000, 0 1px 2px #000, 0 0 calc(var(--u) * 8) rgba(0,0,0,0.85); }
#fabien-hud .skill { padding: calc(var(--u) * 6) calc(var(--u) * 8); display: flex; flex-direction: column; justify-content: space-between; }
#fabien-hud .skill .top { display: flex; align-items: center; gap: calc(var(--u) * 8); }
#fabien-hud .skill .em { position: relative; flex: none; display: flex; align-items: center; justify-content: center; }
#fabien-hud .skill .em .ring { position: absolute; inset: -15%; border-radius: 50%; }
#fabien-hud .skill .em img { position: relative; width: 100%; height: 100%; filter: drop-shadow(0 0 2px #000); }
#fabien-hud .skill .nm { flex: 1; min-width: 0; line-height: 1.15; }
#fabien-hud .skill .nm .n { color: #f6ead0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#fabien-hud .skill .grid { display: grid; gap: max(1px, calc(var(--u) * 0.8)); flex: none; }
#fabien-hud .skill .grid i { display: block; background: rgba(255,255,255,0.07); }
#fabien-hud .skill .grid i.c { background: #ffe08a; transform: scale(0.55); }
#fabien-hud .skill .foot { display: flex; align-items: center; gap: calc(var(--u) * 6); white-space: nowrap; overflow: hidden; border-top: 1px solid rgba(201,163,90,0.22); padding-top: calc(var(--u) * 3); }
#fabien-hud .btn { display: flex; align-items: center; justify-content: center; letter-spacing: 0.06em; color: #e8d5a8; }
#fabien-hud .btn:hover { color: #fff4d6; }
#fabien-hud .veil { position: absolute; inset: 0; background: rgba(0,0,0,0.55); pointer-events: auto; }
#fabien-hud .sheet { display: flex; flex-direction: column; align-items: stretch; padding: calc(var(--u) * 14) calc(var(--u) * 16); gap: calc(var(--u) * 6); pointer-events: auto; }
#fabien-hud .sheet h2 { margin: 0 0 calc(var(--u) * 4); text-align: center; font-weight: 600; letter-spacing: 0.18em; color: #e4c27c; }
#fabien-hud .sheet .opt { display: flex; align-items: center; justify-content: center; min-height: 44px; border: 1px solid rgba(201,163,90,0.45); border-radius: calc(var(--u) * 3); background: rgba(42,29,18,0.85); font-weight: 600; color: #e8d5a8; cursor: pointer; }
#fabien-hud .sheet .opt:hover { background: rgba(74,52,24,0.9); color: #fff4d6; }
#fabien-hud .tipp { padding: calc(var(--u) * 8) calc(var(--u) * 10); z-index: 3; background: ${GRAIN}, linear-gradient(180deg, rgba(30,22,14,0.95), rgba(14,10,7,0.95)); }
/* the clash meter over two locked fighters */
#fabien-hud .clash { position: absolute; transform: translate(-50%, -50%); pointer-events: none; }
#fabien-hud .clash img { position: absolute; left: 50%; transform: translateX(-50%); }
`;

function injectStyle() {
  if (document.getElementById('fabien-hud-style')) return;
  const st = document.createElement('style');
  st.id = 'fabien-hud-style';
  st.textContent = CSS;
  document.head.appendChild(st);
}

// HTML-safe text
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
const CORNERS = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>';

export class DomHud {
  constructor(scene) {
    this.scene = scene;
    this.urls = new Map(); // texture key -> picture address
    this.keys = {};        // panel -> what it shows now (redrawn only when this changes)
    injectStyle();
    const root = document.createElement('div');
    root.id = 'fabien-hud';
    const host = scene.game.canvas.parentElement || document.body;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(root);
    this.root = root;
    const el = (cls) => { const d = document.createElement('div'); d.className = cls; root.appendChild(d); return d; };
    // back to front: the board-side things first, the sheet last
    this.clashBox = el('abs');
    this.title = el('abs title cinzel');
    this.strip = el('abs');
    this.list = el('abs');
    this.turnp = el('fp turnp');
    this.settingsBtn = el('fp btn tap cinzel');
    this.hint = el('abs hint');
    this.card = el('fp card tap');
    this.skill = el('fp skill');
    this.side = el('fp menu');
    this.menu = el('fp menu');
    this.pill = el('fp pill tap');
    this.tipBox = el('fp tipp hide');
    this.sheetBox = el('abs hide');
    this.bindEvents();
    // the web fonts (Cinzel, Cormorant) may arrive after the first drawing: then everything is drawn and
    // fitted again, since the words take a different width in them
    // (every weight the HUD uses is asked for now, so none arrives later in the middle of play: a font
    // arriving late redrew the menu under the mouse and put a tooltip away, found by hud.cjs)
    if (document.fonts && document.fonts.load) {
      const faces = ['400', '600', '700'].map((w) => w + ' 16px Cinzel').concat(['500', '600', '700'].map((w) => w + ' 16px "Cormorant Garamond"'), ['italic 500 16px "Cormorant Garamond"']);
      Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null))).then(() => { if (this.root) this.keys = {}; });
    }
  }

  destroy() {
    if (this.root) this.root.remove();
    this.root = null;
  }

  // ---------- helpers ----------

  // The address of a picture the game has loaded (its texture key), for an <img>.
  url(key) {
    if (!key) return null;
    if (this.urls.has(key)) return this.urls.get(key);
    const tx = this.scene.textures;
    let u = null;
    if (tx.exists(key)) {
      const img = tx.get(key).getSourceImage();
      if (img && img.src) u = img.src;
      else if (img && img.toDataURL) { try { u = img.toDataURL(); } catch (e) { u = null; } }
    }
    this.urls.set(key, u);
    return u;
  }

  uiUrl(name) { return artUrl('./art/ui/' + name + '.png'); }

  // The picture for a menu row: his emblem, else his glyph for the icon (as MenuRow.draw).
  rowIcon(r) {
    const tx = this.scene.textures;
    if (r.emblem && tx.exists('ui:emblem_' + r.emblem)) return this.uiUrl('emblem_' + r.emblem);
    const g = r.iconName && (GLYPH_FOR[r.iconName] || r.iconName);
    if (g && tx.exists('ui:glyph_' + g)) return this.uiUrl('glyph_' + g);
    return null;
  }

  // Redraws a panel only when what it shows has changed.
  html(name, el, key, build) {
    if (this.keys[name] === key) return false;
    this.keys[name] = key;
    el.innerHTML = build();
    return true;
  }

  // Places an element at a box given in game pixels.
  box(el, x, y, w, h) {
    const k = this.k;
    el.style.left = Math.round(x * k) + 'px';
    el.style.top = Math.round(y * k) + 'px';
    if (w !== undefined) el.style.width = Math.round(w * k) + 'px';
    if (h !== undefined) el.style.height = Math.round(h * k) + 'px';
  }

  show(el, on) { el.classList.toggle('hide', !on); }

  // A game point (game pixels) from a page event.
  gamePoint(e) {
    const r = this.scene.game.canvas.getBoundingClientRect();
    const s = this.scene.scale;
    return { x: (e.clientX - r.left) * s.width / (r.width || 1), y: (e.clientY - r.top) * s.height / (r.height || 1) };
  }

  // ---------- taps: every HTML control calls the same handler as its canvas twin ----------

  bindEvents() {
    const sc = this.scene;
    // Phaser watches the whole window for a finger or button going down OUTSIDE its canvas, and reads
    // it as a tap on empty ground (pointerdownoutside: cancel). A press on a HUD panel is not that, so
    // it stops here. (Found by turn_clicks on a phone: the row's tap ran, then the "outside" tap undid it.)
    for (const t of ['touchstart', 'mousedown']) this.root.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
    // is the mouse over one of the panels? (the root itself lets the mouse through, so only panels see it)
    this.overPanel = false;
    this.root.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') this.overPanel = true; });
    this.root.addEventListener('pointerout', (e) => { if (!e.relatedTarget || !this.root.contains(e.relatedTarget)) this.overPanel = false; });
    // a pointer event as Phaser's handlers expect it (x, y in game pixels; a mouse is not a touch)
    const ptr = (e) => ({ ...this.gamePoint(e), wasTouch: e.pointerType !== 'mouse', isDown: true });
    const rowOf = (e, rows) => { const t = e.target.closest('.mrow'); return t ? rows()[Number(t.dataset.i)] : null; };
    for (const [panel, rows] of [[this.menu, () => this.menuRowsShown || []], [this.side, () => this.sideRowsShown || []]]) {
      panel.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.grip')) return;
        const r = rowOf(e, rows);
        if (!r) return;
        e.preventDefault();
        r.hit.emit('pointerdown', ptr(e));
      });
      panel.addEventListener('pointerup', (e) => { const r = rowOf(e, rows); if (r) r.hit.emit('pointerup', ptr(e)); });
      // a mouse resting on a row: the pointer moves there, and the row's tooltip (as the canvas row)
      panel.addEventListener('pointerover', (e) => {
        const t = e.target.closest('.mrow');
        if (!t || e.pointerType !== 'mouse') return;
        this.cursor = { panel, i: Number(t.dataset.i) };
        this.paintCursor();
        const r = rows()[Number(t.dataset.i)];
        // the same row, redrawn under a mouse that has not left it, is not a new hover
        if (!r || (this.hovered && this.hovered.r === r && this.hovered.word === r.label.text)) return;
        this.hovered = { r, word: r.label.text };
        r.hit.emit('pointerover', ptr(e));
      });
      panel.addEventListener('pointerout', (e) => {
        const t = e.target.closest('.mrow');
        if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
        if (!t.isConnected) return; // (redrawn away under the mouse: not a leave)
        const r = rows()[Number(t.dataset.i)];
        this.hovered = null;
        if (r) r.hit.emit('pointerout', ptr(e));
      });
    }
    // the grip: drag the menu anywhere (8.16), double tap sends it home. The drag is followed here,
    // so it keeps going over the board; BattleScene.grabMenu and dragMenu do the rest, as before.
    this.menu.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.grip')) return;
      e.preventDefault();
      try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
      sc.grabMenu(ptr(e));
      const move = (ev) => sc.dragMenu(ptr(ev));
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        sc.dropMenu();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
    this.pill.addEventListener('pointerdown', (e) => { e.preventDefault(); if (sc.pillHit) sc.pillHit.emit('pointerdown', ptr(e)); });
    this.card.addEventListener('pointerdown', (e) => { e.preventDefault(); if (sc.cardHit) sc.cardHit.emit('pointerdown', ptr(e)); });
    this.list.addEventListener('pointerdown', (e) => {
      const t = e.target.closest('[data-unit]');
      if (!t) return;
      e.preventDefault();
      const u = sc.units.find((x) => x.id === t.dataset.unit);
      if (u && u.alive && !sc.busy) sc.inspect(u);
    });
    this.settingsBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (sc.settingsButton) sc.settingsButton.emit('pointerdown', ptr(e)); });
    this.sheetBox.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const opt = e.target.closest('[data-opt]');
      if (opt) { const lab = (sc.settingsRows || [])[Number(opt.dataset.opt)]; if (lab) lab.emit('pointerdown', ptr(e)); this.keys.sheet = null; return; }
      if (!e.target.closest('.sheet') && sc.openSettings) sc.openSettings(false); // a tap outside closes it
    });
  }

  // ---------- every frame ----------

  sync() {
    const sc = this.scene;
    if (!this.root || !sc.lay) return;
    const r = sc.game.canvas.getBoundingClientRect();
    const host = this.root.parentElement.getBoundingClientRect();
    this.k = r.width / sc.scale.width || 1; // page pixels per game pixel
    const L = sc.lay;
    const st = this.root.style;
    st.left = Math.round(r.left - host.left) + 'px';
    st.top = Math.round(r.top - host.top) + 'px';
    st.width = Math.round(r.width) + 'px';
    st.height = Math.round(r.height) + 'px';
    // sizes for the style sheet: one design pixel, and the letter sizes, in page pixels
    const u = (L.px * this.k).toFixed(3);
    if (this.keys.size !== u) {
      this.keys.size = u;
      st.setProperty('--u', u + 'px');
      for (const [n, v] of Object.entries(L.F)) st.setProperty('--f-' + n, (v * this.k).toFixed(2) + 'px');
      this.keys = { size: u }; // redraw everything at the new size
    }
    // a clash banner or the result fill the screen: the HUD steps aside (it would sit over them)
    const hidden = !!(sc.inCinematic || sc.resultShown);
    this.root.style.visibility = hidden ? 'hidden' : 'visible';
    this.syncTop();
    this.syncList();
    this.syncTurnPanel();
    this.syncCard();
    this.syncSkill();
    this.syncMenus();
    this.syncHint();
    this.syncSettings();
    this.syncClash();
    this.syncTip();
  }

  // A tooltip (tooltip.js showTip places it; scene.tip holds it while it shows)
  syncTip() {
    const t = this.scene.tip;
    const on = !!(t && t.active && t.tip);
    this.show(this.tipBox, on);
    if (!on) return;
    this.box(this.tipBox, t.x, t.y, t.tipW);
    this.html('tip', this.tipBox, t.tip.title + '|' + t.tip.body, () => CORNERS + '<div class="cinzel" style="font-size:var(--f-mid);color:#ffe08a;font-weight:600;margin-bottom:calc(var(--u)*4)">' + esc(t.tip.title) + '</div><div style="font-size:var(--f-small);line-height:1.3">' + esc(t.tip.body).replace(/\n/g, '<br>') + '</div>');
  }

  // Top left: the title and the turn strip (as BattleScene.refreshTurnStrip lays them out)
  syncTop() {
    const sc = this.scene, L = sc.lay, k = this.k;
    const fs = (n) => (L.F[n] * k).toFixed(2) + 'px';
    const tt = sc.titleText;
    this.show(this.title, !!tt);
    if (tt) {
      this.box(this.title, tt.x, tt.y - L.F.small * 0.75);
      this.title.style.marginLeft = (-L.px * 21 * k) + 'px';
      const room = Math.round(((sc.turnGeo ? sc.turnGeo.x : L.W) - tt.x - L.px * 6) * k);
      if (this.html('title', this.title, tt.text + '|' + room, () => '<span class="sig"><span class="dia"></span></span><span>' + esc(tt.text.replace(/\s+·\s+/, '  ·  ')) + '</span>')) {
        // a narrow screen: the letters come closer, then smaller, until the title ends before the turn panel
        this.title.style.fontSize = fs('small');
        const words = this.title.lastChild;
        let sp = 0.22, f = L.F.small * k;
        const left = () => words.getBoundingClientRect().right - this.title.getBoundingClientRect().left + L.px * 21 * k;
        while (left() > room + L.px * 21 * k && sp > 0.04) { sp -= 0.03; words.style.letterSpacing = sp + 'em'; }
        while (left() > room + L.px * 21 * k && f > 9) { f -= 0.5; this.title.style.fontSize = f + 'px'; }
      }
    }
    const line = sc.stripLineup || [];
    const geo = sc.stripGeo || null;
    const key = line.map((u) => u && u.id + (u.alive ? '' : '-') + portraitKey(u.id, u)).join(',') + '|' + JSON.stringify(geo);
    this.html('strip', this.strip, key, () => {
      if (!geo) return '';
      let h = '';
      const dot = (x, y) => '<i class="arrow" style="left:' + Math.round(x * k) + 'px;top:' + Math.round(y * k) + 'px"></i>';
      for (const a of geo.arrows) h += dot(a, geo.y);
      line.forEach((unit, i) => {
        if (!unit) return;
        const g = geo.medals[i];
        if (!g) return;
        const d = Math.round(2 * g.r * k);
        const src = this.url(portraitKey(unit.id, unit));
        h += '<div class="medal ' + (unit.side === 'hero' ? 'hero' : 'enemy') + (i === 0 ? ' now' : '') + '" style="left:' + Math.round(g.x * k) + 'px;top:' + Math.round(geo.y * k) + 'px;width:' + d + 'px;height:' + d + 'px">' + (src ? '<img src="' + src + '" alt="">' : '') + '</div>';
      });
      h += '<div class="stripline" style="left:' + Math.round(geo.lineX0 * k) + 'px;top:' + Math.round(geo.lineY * k) + 'px;width:' + Math.round((geo.lineX1 - geo.lineX0) * k) + 'px"></div>';
      return h;
    });
  }

  // Down the left on a wide screen: every fighter as a diamond (refreshUnitList)
  syncList() {
    const sc = this.scene, k = this.k;
    const geo = sc.listGeo || [];
    const key = geo.map((g) => g.id + ':' + g.x + ':' + g.y + ':' + g.d + ':' + g.state + portraitKey(g.id, g.unit)).join('|');
    this.html('list', this.list, key, () => geo.map((g) => {
      const d = Math.round(2 * g.d * k);
      const src = this.url(portraitKey(g.id, g.unit));
      return '<div class="dmd tap ' + g.state + '" data-unit="' + esc(g.id) + '" style="left:' + Math.round(g.x * k) + 'px;top:' + Math.round(g.y * k) + 'px;width:' + d + 'px;height:' + d + 'px"><div class="in">' + (src ? '<img src="' + src + '" alt="">' : '') + '</div></div>';
    }).join(''));
  }

  // Top right: the turn number, the ground in focus, its height and a small block of it
  syncTurnPanel() {
    const sc = this.scene, L = sc.lay;
    const g = sc.turnGeo;
    this.show(this.turnp, !!g);
    if (!g) return;
    this.box(this.turnp, g.x, g.y, g.w, g.h);
    const t = sc.tileInfo || { ground: '', elev: '', top: 0x887755, side: 0x554433 };
    const turn = sc.turnText ? sc.turnText.text : '';
    const key = turn + '|' + t.ground + '|' + t.elev + '|' + t.top + '|' + t.side;
    this.html('turnp', this.turnp, key, () => {
      const w = 34, top = hex(t.top), side = hex(t.side);
      const dark = hex(((t.side >> 16 & 255) * 0.75) << 16 | ((t.side >> 8 & 255) * 0.75) << 8 | (t.side & 255) * 0.75);
      const svg = '<svg viewBox="0 0 34 28" style="width:calc(var(--u)*' + w + ');height:calc(var(--u)*28)"><path d="M1 9 L17 17 L17 27 L1 19 Z" fill="' + side + '"/><path d="M33 9 L17 17 L17 27 L33 19 Z" fill="' + dark + '"/><path d="M17 1 L33 9 L17 17 L1 9 Z" fill="' + top + '" stroke="rgba(255,230,176,0.45)" stroke-width="0.8"/></svg>';
      return CORNERS + '<div class="top"><span class="cinzel dim" style="font-size:var(--f-small);letter-spacing:0.18em">TURN</span><span class="cinzel num" style="font-size:var(--f-big)">' + esc(turn) + '</span><span class="rule" style="flex:1"></span></div>'
        + '<div class="row2"><div><div style="font-size:var(--f-mid);font-weight:600">' + esc(t.ground) + '</div><div class="cinzel dim" style="font-size:var(--f-small);letter-spacing:0.12em">' + esc(t.elev) + '</div></div>' + svg + '</div>';
    });
  }

  // Bottom left: the unit card, closed (portrait, name, Lv., bars, class) or open (the numbers)
  syncCard() {
    const sc = this.scene;
    const L = sc.cardLayer;
    const unit = sc.cardUnit;
    const on = !!(unit && L && L.list.length && sc.cardHeight);
    this.show(this.card, on);
    if (!on) return;
    const w = sc.cardOpen && sc.lay.portrait ? sc.lay.W - 2 * sc.lay.m : sc.lay.cardW;
    this.box(this.card, L.x, L.y, w, sc.cardHeight);
    const d = sc.cardData(unit, sc.cardViewing);
    const key = JSON.stringify(d) + '|' + w;
    this.html('card', this.card, key, () => (d.open ? this.openCard(d) : this.closedCard(d)));
    this.card.classList.toggle('open', !!d.open);
  }

  barHtml(word, value, max, color, numbers) {
    const f = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    return '<div class="bar" style="font-size:var(--f-small)"><span class="w">' + word + '</span><span class="t"><span class="f" style="width:' + (f * 100).toFixed(1) + '%;background:linear-gradient(180deg,' + color + ',' + color + 'b0);box-shadow:0 0 6px ' + color + '80"></span></span><span class="n">' + esc(numbers) + '</span></div>';
  }

  portrait(d, size) {
    const src = d.face ? this.url(d.face) : null;
    const icons = (d.icons || []).map((i) => '<img src="' + i + '" alt="">').join('');
    return '<div class="port ' + d.side + (d.active ? ' now' : '') + '" style="width:' + size + ';height:' + size + '">' + (src ? '<img src="' + src + '" alt="">' : '<div class="noface cinzel" style="font-size:var(--f-small)">' + esc(d.name) + '</div>') + (icons ? '<div class="icons">' + icons + '</div>' : '') + '</div>';
  }

  closedCard(d) {
    const sc = this.scene;
    // the portrait: as tall as the card allows, but never more than 40 percent of its width (the bars need room)
    const ps = 'min(calc(' + Math.round(sc.cardHeight * this.k) + 'px - var(--u) * 12), ' + Math.round(sc.lay.cardW * this.k * 0.4) + 'px)';
    const bars = this.barHtml('HP', d.hp, d.maxHp, d.hpColor, d.hp + ' / ' + d.maxHp)
      + (d.mp ? this.barHtml('MP', d.mp.mp, d.mp.max, d.mp.color, d.mp.mp + ' / ' + d.mp.max) : this.barHtml('MP', 0, 0, '#4f8fe8', '-'))
      + this.barHtml('CT', d.ct, 100, '#e0a944', String(d.ct));
    return CORNERS + this.portrait(d, ps) + '<div class="body">'
      + '<div class="namerow"><span class="name cinzel" style="font-size:var(--f-name)">' + esc(d.name) + '</span>' + (d.roomy ? '' : '<span class="dim" style="font-size:var(--f-small)">Lv. ' + d.level + '</span>') + '</div>'
      + (d.roomy ? '<div class="dim" style="font-size:var(--f-small);margin-top:calc(var(--u)*-2)">Lv. ' + d.level + (d.viewing ? '  ·  viewing' : '') + '</div>' : '')
      + '<div class="bars">' + bars + '</div>'
      + '<div class="job" style="font-size:var(--f-small)"><span class="dia"></span><span>' + esc(d.job) + (!d.roomy && d.viewing ? '  (viewing)' : '') + '</span></div>'
      + '</div>';
  }

  openCard(d) {
    const stat = ([w, v, base]) => {
      const up = base !== null && base !== undefined && v > base, down = base !== null && base !== undefined && v < base;
      return '<div class="stat"><span class="dim" style="font-size:var(--f-small)">' + w + '</span><b class="' + (up ? 'up' : down ? 'down' : '') + '" style="font-size:var(--f-big)">' + esc(v) + (up ? ' ▲' : down ? ' ▼' : '') + '</b></div>';
    };
    const top = '<div style="display:flex;gap:calc(var(--u)*8);align-items:center">' + this.portrait(d, 'calc(var(--u)*44)')
      + '<div style="flex:1;min-width:0"><div class="namerow"><span class="name cinzel" style="font-size:var(--f-name)">' + esc(d.name) + '</span><span style="font-size:var(--f-small);color:' + (d.side === 'hero' ? '#7fd6cf' : '#ff8a6a') + '">' + (d.side === 'hero' ? 'ALLY' : 'FOE') + '</span></div>'
      + '<div class="gold" style="font-size:var(--f-small)">' + esc(d.job) + (d.viewing ? '  ·  viewing' : '') + '</div>'
      + '<div class="bars" style="margin-top:calc(var(--u)*3)">' + this.barHtml('HP', d.hp, d.maxHp, d.hpColor, d.hp + ' / ' + d.maxHp) + (d.mp ? this.barHtml('MP', d.mp.mp, d.mp.max, d.mp.color, d.mp.mp + ' / ' + d.mp.max) : '') + '</div></div></div>';
    const rows = d.pages.map((p) => '<div class="stats">' + p.map(stat).join('') + '</div>').join('');
    const chips = d.buffLine
      ? '<span style="font-size:var(--f-small);color:' + d.buffLine.color + '">' + esc(d.buffLine.text) + '</span>'
      : d.chips.map((c) => '<span class="chip" style="font-size:var(--f-small);color:' + c.color + '">' + (c.icon ? '<img src="' + c.icon + '" alt="">' : '') + esc(c.text) + '</span>').join('');
    return CORNERS + top + rows + '<div class="chips">' + chips + (d.next ? '<span style="margin-left:auto;font-size:var(--f-small)" class="dim">Next turn: <b style="color:#e8b04a">' + esc(d.next) + '</b></span>' : '') + '<span class="dim" style="margin-left:' + (d.next ? 'calc(var(--u)*8)' : 'auto') + ';font-size:var(--f-small);font-style:italic">Tap: close</span></div>';
  }

  // Bottom right (or under the list): the skill being chosen
  syncSkill() {
    const sc = this.scene;
    const L = sc.skillLayer;
    const id = sc.selectedSpell;
    const on = !!(L && L.list.length && id);
    this.show(this.skill, on);
    if (!on) return;
    this.box(this.skill, L.x, L.y, sc.lay.skillW, sc.skillPanelH);
    const drawn = this.html('skill', this.skill, id + '|' + sc.skillPanelH + '|' + sc.lay.skillW, () => {
      const k = skillWords(id);
      const rows = k.grid, cols = Math.max(...rows.map((r) => r.length));
      const cell = 'calc(var(--u)*' + Math.max(4, Math.floor(30 / Math.max(3, rows.length, cols))) + ')';
      const cells = rows.map((r) => [...r.padEnd(cols, '.')].map((c) => (c === 'x' ? '<i style="background:' + k.color + ';box-shadow:0 0 4px ' + k.color + '"></i>' : c === 'c' ? '<i class="c"></i>' : '<i></i>')).join('')).join('');
      return CORNERS + '<div class="top"><div class="em" style="width:calc(var(--u)*30);height:calc(var(--u)*30)"><span class="ring" style="background:radial-gradient(circle,' + k.color + '90,' + k.color + '00 70%)"></span><img src="' + this.uiUrl('emblem_' + emblemFor(id)) + '" alt=""></div>'
        + '<div class="nm"><div class="n" style="font-size:var(--f-name);font-weight:700">' + esc(k.name) + '</div><div class="dim" style="font-size:var(--f-small)">MP ' + (k.mp || 0) + '</div></div>'
        + '<div class="grid" style="grid-template-columns:repeat(' + cols + ',' + cell + ');grid-auto-rows:' + cell + '">' + cells + '</div></div>'
        + '<div class="foot" style="font-size:var(--f-small)"><span style="color:#d8c8a4">' + esc(k.area) + '</span>' + (k.effect ? '<span style="color:#7a6848">|</span><span style="color:' + k.color + ';overflow:hidden;text-overflow:ellipsis">' + esc(k.effect) + '</span>' : '') + '</div>';
    });
    if (drawn) {
      // a long name shrinks (down to the small letters) so it is never cut short
      const n = this.skill.querySelector('.nm .n');
      let f = sc.lay.F.name * this.k;
      const floor = sc.lay.portrait ? 12 : 16; // (Baiyee's smallest letters: 12 on a phone, 16 on a desktop)
      while (n && n.scrollWidth > n.clientWidth + 1 && f > floor) { f = Math.max(floor, f - 0.5); n.style.fontSize = f + 'px'; }
    }
  }

  // The command menu beside the unit, the main commands beside an open list, and the cancel tag
  syncMenus() {
    const sc = this.scene;
    const L = sc.lay;
    const menuOn = !!(sc.menu && sc.menu.visible);
    this.show(this.menu, menuOn);
    if (menuOn) {
      this.menuRowsShown = sc.menuRows;
      this.drawMenu('menu', this.menu, sc.menu, sc.menuRows, sc.menuSize, true);
    } else this.menuRowsShown = [];
    const sideOn = !!(menuOn && sc.sideMenu && sc.sideMenu.visible && sc.sideSize);
    this.show(this.side, sideOn);
    if (sideOn) {
      const rows = sc.sideRows.filter((r) => r.view.visible);
      this.sideRowsShown = rows;
      this.drawMenu('side', this.side, sc.sideMenu, rows, sc.sideSize, false);
    } else this.sideRowsShown = [];
    const pillOn = !!(sc.pill && sc.pill.visible && sc.pillSize);
    this.show(this.pill, pillOn);
    if (pillOn) {
      this.box(this.pill, sc.pill.x, sc.pill.y, sc.pillSize.w, sc.pillSize.h);
      const name = sc.pillName();
      this.html('pill', this.pill, name, () => CORNERS + '<span class="x" style="font-size:var(--f-mid)">✕</span><span style="font-size:var(--f-mid);font-weight:600">' + esc(name) + '</span>');
    }
  }

  drawMenu(name, el, cont, rows, size, withGrip) {
    const sc = this.scene, k = this.k;
    this.box(el, cont.x, cont.y, size.w, size.h);
    el.style.transform = cont.scaleX !== 1 || cont.scaleY !== 1 ? 'scale(' + cont.scaleX + ',' + cont.scaleY + ')' : '';
    el.style.opacity = String(cont.alpha);
    const key = rows.map((r) => [r.label.text, r.word.text, r.cost.text, r.enabled, r.selected, r.emblem, r.iconName, r.ringColor, r.x, r.y, r.w, r.h].join('~')).join('|') + '|' + size.w + 'x' + size.h + '|' + !!sc.menuPin;
    this.html(name, el, key, () => {
      let h = CORNERS;
      if (withGrip) {
        const g = sc.menuGripHit;
        const band = rows.length ? rows[0].y : 0;
        h += '<div class="grip tap' + (sc.menuPin ? ' pinned' : '') + '" style="top:' + Math.round(Math.min(0, g.y) * k) + 'px;height:' + Math.round((band - Math.min(0, g.y)) * k) + 'px;padding-top:' + Math.round(-Math.min(0, g.y) * k) + 'px"><i></i><i></i><i></i><i></i><i></i></div>';
      }
      rows.forEach((r, i) => {
        const icon = this.rowIcon(r);
        const d = Math.round((r.iconSize || 13 * sc.lay.px) * k * 1.25);
        const ring = r.ringColor !== null && r.ringColor !== undefined && r.emblem ? '<span class="ring" style="background:radial-gradient(circle,' + hex(r.ringColor) + 'cc,' + hex(r.ringColor) + '00 72%)"></span>' : '';
        h += '<div class="mrow tap' + (r.enabled ? '' : ' off') + (r.selected ? ' lit' : '') + '" data-i="' + i + '" data-word="' + esc(r.label.text.split('  ')[0]) + '" style="left:' + Math.round(r.x * k) + 'px;top:' + Math.round(r.y * k) + 'px;width:' + Math.round(r.w * k) + 'px;height:' + Math.round(r.h * k) + 'px">'
          + '<i class="ptr"></i><span class="ic" style="width:' + d + 'px;height:' + d + 'px">' + ring + (icon ? '<img src="' + icon + '" alt="">' : '') + '</span>'
          + '<span class="wd" style="font-size:var(--f-mid)">' + esc(r.word.text) + '</span>' + (r.cost.text ? '<span class="ct" style="font-size:var(--f-small)">' + esc(r.cost.text) + '</span>' : '') + '</div>';
      });
      return h;
    });
    // the pointer: on the row the mouse rests on; else, in a list, on its first row that can be used
    if (this.cursor && this.cursor.panel === el && this.cursor.key !== this.keys[name]) this.cursor = null;
    if (this.cursor && this.cursor.panel === el) this.cursor.key = this.keys[name];
    this.paintCursor();
  }

  paintCursor() {
    for (const el of [this.menu, this.side]) {
      const rows = el.querySelectorAll('.mrow');
      let cur = this.cursor && this.cursor.panel === el ? this.cursor.i : -1;
      // a list (the main commands stand beside it) starts with the pointer on its first usable row
      if (cur < 0 && el === this.menu && !this.side.classList.contains('hide')) cur = [...rows].findIndex((r) => !r.classList.contains('off'));
      rows.forEach((r, i) => r.classList.toggle('cur', i === cur));
    }
  }

  // The hint line above the card (BattleScene.fitStatus places it)
  syncHint() {
    const sc = this.scene, t = sc.statusText;
    const on = !!(t && t.text && t.alpha > 0.01);
    this.show(this.hint, on);
    if (!on) return;
    const L = sc.lay;
    const ww = L.infoW;
    const x = L.portrait ? t.x : (L.W - ww) / 2;
    this.box(this.hint, x, t.y, ww);
    this.hint.style.opacity = String(Math.min(1, t.alpha / 0.85));
    this.hint.style.textAlign = L.portrait ? 'left' : 'center';
    this.hint.style.fontSize = 'var(--f-mid)';
    this.html('hint', this.hint, t.text, () => esc(t.text).replace(/\n/g, '<br>'));
  }

  // The settings button under the turn panel, and the settings sheet
  syncSettings() {
    const sc = this.scene;
    const g = sc.settingsGeo;
    this.show(this.settingsBtn, !!g);
    if (g) {
      this.box(this.settingsBtn, g.x, g.y, g.w, g.h);
      this.settingsBtn.style.fontSize = 'var(--f-small)';
      this.html('setbtn', this.settingsBtn, 'Settings', () => CORNERS + 'Settings');
    }
    const open = !!(sc.settingsSheet && sc.settingsSheet.visible);
    this.show(this.sheetBox, open);
    this.sheetBox.style.inset = '0';
    if (!open) { this.keys.sheet = null; return; }
    const labels = (sc.settingsRows || []).map((l) => l.text);
    const L = sc.lay;
    const w = Math.min(L.W - 2 * L.m, L.px * 300);
    this.html('sheet', this.sheetBox, labels.join('|') + '|' + w, () => '<div class="veil"></div><div class="fp sheet" style="left:50%;top:50%;transform:translate(-50%,-50%);width:' + Math.round(w * this.k) + 'px">' + CORNERS + '<h2 class="cinzel" style="font-size:var(--f-big)">SETTINGS</h2>'
      + labels.map((t, i) => '<div class="opt" data-opt="' + i + '" style="font-size:var(--f-mid)">' + esc(t) + '</div>').join('') + '</div>');
  }

  // His clash meter over every pair of locked fighters (BattleScene.clashMeter draws the same on the canvas)
  syncClash() {
    const sc = this.scene, k = this.k;
    const cam = sc.cameras.main;
    const M = clashMeterData;
    const pairs = [];
    const done = new Set();
    const tex = sc.textures;
    if (tex.exists('ui:clash_skull') && tex.exists('ui:clash_bar')) {
      for (const u of sc.units || []) {
        const v = u.engagedWith;
        if (!u.alive || !v || !u.view || !v.view || done.has(u) || sc.inCinematic) continue;
        done.add(u); done.add(v);
        pairs.push([u, v]);
      }
    }
    const key = pairs.map(([u, v]) => u.id + v.id + ':' + (u.engagement ? u.engagement.track + (u.engagement.first && u.engagement.first.id) : '') + ':' + (u.view.x > v.view.x)).join('|');
    const zoomK = cam.zoom * k; // world pixels to page pixels
    this.html('clash', this.clashBox, key + '|' + zoomK.toFixed(3), () => pairs.map(([u, v], i) => {
      const s = M.width / M.bar[0] * zoomK;
      const duel = sc.stanceDuelOn() && u.engagement;
      let h = '<div class="clash" data-pair="' + i + '">';
      const barW = M.bar[0] * s, barH = M.bar[1] * s;
      if (duel) {
        const enemy = u.side !== 'hero' ? u : v, hero = enemy === u ? v : u;
        const flip = enemy.view.x > hero.view.x;
        h += '<img src="' + this.uiUrl('clash_bar') + '" style="top:' + (6 * zoomK - barH / 2).toFixed(1) + 'px;width:' + barW.toFixed(1) + 'px;height:' + barH.toFixed(1) + 'px;' + (flip ? 'transform:translateX(-50%) scaleX(-1)' : '') + '">';
        const first = u.engagement.first, other = first === u ? v : u, track = u.engagement.track;
        const leader = track > 0 ? first : track < 0 ? other : null;
        if (leader) {
          const leftSide = leader.view.x <= (leader === u ? v : u).view.x;
          const fill = leader.side === 'hero' ? 'clash_fill_blue' : 'clash_fill_red';
          for (let n = 1; n <= Math.min(Math.abs(track), 3); n++) {
            const slot = M.slots[leftSide ? 3 - n : 3 + n];
            const sx = ((slot[0] + slot[2]) / 2 - M.bar[0] / 2) * s, sy = 6 * zoomK + ((slot[1] + slot[3]) / 2 - M.bar[1] / 2) * s;
            const w = (slot[2] - slot[0]) * s, hh = (slot[3] - slot[1]) * s;
            h += '<img src="' + this.uiUrl(fill) + '" style="left:calc(50% + ' + (sx - w / 2).toFixed(1) + 'px);transform:none;top:' + (sy - hh / 2).toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + hh.toFixed(1) + 'px">';
          }
        }
      }
      const skH = M.skull * zoomK;
      const skTop = duel ? 6 * zoomK - M.bar[1] * s * 0.12 - skH * 0.92 : -skH / 2;
      h += '<img src="' + this.uiUrl('clash_skull') + '" style="top:' + skTop.toFixed(1) + 'px;height:' + skH.toFixed(1) + 'px">';
      return h + '</div>';
    }).join(''));
    // follow the camera every frame
    const boxes = this.clashBox.children;
    pairs.forEach(([u, v], i) => {
      const el = boxes[i];
      if (!el) return;
      const mx = (u.view.x + v.view.x) / 2;
      const my = Math.min(u.view.y - u.topY, v.view.y - v.topY) - 50;
      const v0 = cam.worldView;
      el.style.left = ((mx - v0.x) * zoomK + cam.x * k).toFixed(1) + 'px';
      el.style.top = ((my - v0.y) * zoomK + cam.y * k).toFixed(1) + 'px';
    });
  }
}
