import Phaser from 'phaser';
import art from '../data/art.json';
import jobs from '../data/jobs.json';
import spells from '../data/spells.json';
import bios from '../data/bios.json';
import cavernMap from '../data/maps/cavern.json';
import yobaMap from '../data/maps/yoba.json';
const MAPS = { cavern: cavernMap, yoba: yobaMap };
import { framePanel, goldDiamond } from '../battleCard.js';
import { textStyle } from '../hud.js';
import { playTrack, play } from '../audio.js';
import { allCharacters, startingLineUp, saveLineUp, forgetLineUp, defaultLineUp, testMode, setTestMode, MAX_PER_SIDE } from '../lineup.js';
import { queueSelectArt, fighterIds } from '../battleLoad.js';
import { prefetchFighters } from '../prefetch.js';

// The character select (roadmap 18.30): a screen before every battle where the tester picks who fights.
// Every character in units.json is a card (portrait, name, class, a short line), so one added later shows
// by itself; one with no portrait gets a placeholder. Two sides, Heroes and Enemies, up to 4 each: tap a
// card to add or remove it. "Start battle" starts the battle with exactly that line-up on the map.
// The roster is one shared pool (20 Nov): both sides list every character, so a hero can be put on the
// enemies' side and an enemy on the heroes'. A small tag on each card shows its home side (HERO or ENEMY) and
// does not limit where it can go. A character stands on one side only: tapping it on the other side moves it.
// The enemy AI plays whoever is on its side; the player plays whoever is on his.
// The last line-up is remembered on the device; "Reset to default" goes back to the map's own.
// With Test mode off, the enemy side is locked to the map's default (for the story later). Test mode is on by
// default; its switch is on this screen (under the title) as well as in the battle's Settings.
// Laid out on the real screen size: on a phone the two sides are stacked, on a wide screen side by side.
// Started by story.js with { stepIndex, map }; window.__skipSelect (browser checks) goes straight on.
const GOLD = 0xe4c27c;
const HERO = 0x4fb3a5;
const ENEMY = 0xc4573f;

export default class SelectScene extends Phaser.Scene {
  constructor() {
    super('SelectScene');
  }

  init(data) {
    this.stepIndex = data && data.stepIndex !== undefined ? data.stepIndex : null;
    // the map, picked as the battle picks it: the story's, else the one a test asks for, else the Hidden Cavern
    const asked = (data && data.map) || (typeof window !== 'undefined' && window.__mapName) || 'cavern';
    this.mapName = MAPS[asked] ? asked : 'cavern';
  }

  preload() {
    // the portraits only (the battle loads everything else)
    queueSelectArt(this);
  }

  create() {
    // the map's own line-up is the default (its "alsoFighting" and "sittingOut")
    const mapData = MAPS[this.mapName] || cavernMap;
    this.mapData = mapData;
    if (window.__skipSelect) return this.startBattle(startingLineUp(mapData));
    playTrack('theme');
    this.cameras.main.setBackgroundColor('#140f0b');
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.pick = startingLineUp(mapData);
    this.lockEnemies();
    prefetchFighters(fighterIds(mapData, this.pick)); // (18.48)
    this.draw();
    const onLayout = () => this.draw();
    this.events.on('layout', onLayout);
    this.events.once('shutdown', () => this.events.off('layout', onLayout));
    // a long list scrolls with a drag or the mouse wheel
    this.input.on('pointermove', (p) => {
      if (!p.isDown || this.maxScroll <= 0) return;
      this.dragged = (this.dragged || 0) + Math.abs(p.velocity.y);
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY - (p.y - p.prevPosition.y), 0, this.maxScroll);
    });
    this.input.on('wheel', (p, o, dx, dy) => { this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + dy, 0, Math.max(0, this.maxScroll)); });
  }

  // Test mode off (the story): the enemy side is the map's own, and none of those characters can be on the heroes' side
  lockEnemies() {
    if (testMode()) return;
    this.pick.enemy = defaultLineUp(this.mapData).enemy;
    this.pick.hero = this.pick.hero.filter((id) => !this.pick.enemy.includes(id));
  }

  // Draws the whole screen again (after every tap, and when the window changes shape)
  draw() {
    if (this.layer) this.layer.destroy(true);
    this.cardHits = [];
    const layer = (this.layer = this.add.container(0, 0));
    const W = this.scale.width, H = this.scale.height;
    const wide = W > H;
    const k = wide ? Math.min(W / 1600, H / 720) : W / 720; // one unit of design size, in game pixels
    const S = (n) => Math.round(n * k);
    const m = S(wide ? 22 : 18);
    // text sizes: never under 11.5 real pixels on the screen (checklist D4); real = game pixels times the shown scale
    const shown = this.scale.displaySize ? this.scale.displaySize.width / W : 1;
    const least = Math.ceil(11.5 / (shown || 1));
    const F = { big: Math.max(S(wide ? 30 : 34), least + 4), mid: Math.max(S(wide ? 24 : 27), least + 1), small: Math.max(S(wide ? 20 : 23), least) };
    this.cameras.main.setSize(W, H);
    this.cameras.main.setZoom(1);
    const add = (o) => { layer.add(o); return o; };

    // the title
    const tg = add(this.add.graphics());
    add(this.add.text(W / 2, m + S(22), 'CHOOSE YOUR FIGHTERS', textStyle(F.big, '#e4c27c')).setOrigin(0.5).setLetterSpacing(2));
    const tw = this.layer.list[this.layer.list.length - 1].width;
    goldDiamond(tg, W / 2 - tw / 2 - S(22), m + S(22), S(6));
    goldDiamond(tg, W / 2 + tw / 2 + S(22), m + S(22), S(6));
    const test = testMode();
    // the Test mode switch: tap it to turn Test mode on or off (it was only in the battle's Settings before)
    const tl = add(this.add.text(W / 2, m + S(56), test ? 'Test mode: ON, any character on either side  (tap to switch off)' : 'Test mode: OFF, the enemies are set  (tap to switch on)', textStyle(F.small, test ? '#e4c27c' : '#bfae88')).setOrigin(0.5));
    const thw = Math.max(tl.width + S(24), S(300)), thh = Math.max(S(40), Math.ceil(46 / (shown || 1)));
    const th = add(this.add.rectangle(W / 2 - thw / 2, tl.y - thh / 2, thw, thh, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true })); // (top left origin, like the cards and buttons)
    th.label = 'Test mode';
    th.on('pointerup', (ptr) => {
      if (Math.abs(ptr.y - ptr.downY) > 12) return;
      setTestMode(!testMode());
      this.lockEnemies();
      play('click');
      this.draw();
    });

    // the two sides
    const top = m + S(84);
    const footH = S(92);
    const chars = allCharacters();
    const sides = [
      // both sides list everyone (one shared pool); with Test mode off, the set enemies leave the heroes' list
      { side: 'hero', title: 'HEROES', color: HERO, list: chars.filter((c) => test || !this.pick.enemy.includes(c.id)), locked: false },
      { side: 'enemy', title: 'ENEMIES', color: ENEMY, list: test ? chars : chars.filter((c) => this.pick.enemy.includes(c.id)), locked: !test },
    ];
    const cols = wide ? 2 : 1; // a phone: one column of wide cards; a wide screen: two columns a side
    const gap = S(12);
    const colW = wide ? (W - 3 * m) / 2 : W - 2 * m;
    const cardW = (colW - gap * (cols - 1)) / cols;
    // cards fill the height there is (bigger portraits on a tall phone), within limits
    const rowsPer = sides.map((sd) => Math.ceil(sd.list.length / cols));
    const free = H - top - footH - m - (wide ? S(42) : 2 * S(42) + S(10));
    const rowCount = wide ? Math.max(...rowsPer) : rowsPer[0] + rowsPer[1];
    // 1.122 (27 Nov): on a wide screen the cards may get as short as 72 design px, so twelve a side still fit above the footer
    // on a 1366 x 768 or 1280 x 720 laptop window (at 110 the footer, with Start battle, fell below the screen there)
    const cardH = Phaser.Math.Clamp(Math.floor(free / rowCount) - gap, S(wide ? 72 : 120), S(wide ? 190 : 170));
    let y = top, bottom = top;
    sides.forEach((sd, i) => {
      const x0 = wide ? m + i * (colW + m) : m;
      let yy = wide ? top : y;
      const chosen = this.pick[sd.side];
      const head = add(this.add.graphics());
      head.fillStyle(sd.color, 0.9).fillRect(x0, yy + S(30), colW, Math.max(2, S(2)));
      add(this.add.text(x0, yy + S(14), sd.title, textStyle(F.mid, '#f3e7c6')).setOrigin(0, 0.5).setLetterSpacing(2));
      add(this.add.text(x0 + colW, yy + S(14), chosen.length + ' / ' + MAX_PER_SIDE + (sd.locked ? '  (set)' : ''), textStyle(F.small, chosen.length ? '#e4c27c' : '#ff8a6a')).setOrigin(1, 0.5));
      yy += S(42);
      sd.list.forEach((c, j) => {
        const cx = x0 + (j % cols) * (cardW + gap);
        const cy = yy + Math.floor(j / cols) * (cardH + gap);
        this.drawCard(add, c, cx, cy, cardW, cardH, S, F, sd, chosen.includes(c.id), this.pick[sd.side === 'hero' ? 'enemy' : 'hero'].includes(c.id));
      });
      const rows = Math.ceil(sd.list.length / cols);
      const end = yy + rows * (cardH + gap);
      if (!wide) y = end + S(10);
      bottom = Math.max(bottom, end);
    });

    // the footer: Reset to default, Start battle.
    // 1.122 (Suleiman 27 Nov, desktop: stuck on the select): the footer stood under the cards, so when the cards ran past the
    // bottom of a laptop window (1366 x 768, 1280 x 720: twelve a side since Leol and the Thief came) Start battle was off the
    // screen and only the mouse wheel, with nothing to say so, could reach it. Now the footer is pinned to the bottom of the
    // screen (it does not scroll), on a dark band that takes the taps; the cards scroll under it when they do not fit.
    const fy = H - m - footH;
    const band = add(this.add.rectangle(0, fy - S(8), W, H - fy + S(8), 0x140f0b, 0.94).setOrigin(0, 0).setScrollFactor(0).setInteractive());
    band.label = 'footer';
    this.footTop = fy - S(8); // (where the pinned footer begins on the screen: cards above it can be tapped)
    const bandLine = add(this.add.graphics().setScrollFactor(0));
    bandLine.fillStyle(GOLD, 0.35).fillRect(m, fy - S(8), W - 2 * m, 1);
    const footerFrom = layer.list.length; // (everything added from here on is the footer: pinned to the screen)
    const ready = this.pick.hero.length > 0 && this.pick.enemy.length > 0;
    const bw = Math.min(S(300), (W - 3 * m) / 2), bh = Math.max(S(64), 44 / (this.scale.displayScale ? 1 : 1));
    this.button(add, W / 2 - m / 2 - bw, fy + (footH - bh) / 2, bw, bh, 'Reset to default', true, F, S, () => {
      forgetLineUp();
      this.pick = defaultLineUp(this.mapData);
      play('cancel');
      this.draw();
    });
    this.startButton = this.button(add, W / 2 + m / 2, fy + (footH - bh) / 2, bw, bh, ready ? 'Start battle' : 'Pick both sides', ready, F, S, () => {
      if (!ready) return;
      play('select');
      saveLineUp(this.pick);
      this.startBattle(this.pick);
    }, true);
    for (const o of layer.list.slice(footerFrom)) o.setScrollFactor(0);
    // the cards scroll under the pinned footer: as far as the last card standing just above it
    this.maxScroll = Math.max(0, bottom + S(8) - (fy - S(8)));
    this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, 0, this.maxScroll);
  }

  // One character card: portrait (or a placeholder), name, class, a short line; gold edge and a tick when chosen
  // "away" is true when the character is on the other side now (the card is dim; a tap moves it here)
  drawCard(add, c, x, y, w, h, S, F, sd, on, away) {
    const g = add(this.add.graphics());
    framePanel(g, x, y, w, h, S(1) || 1, { alpha: on ? 0.86 : 0.62, line: on ? GOLD : 0x6a5434 });
    if (on) g.fillStyle(sd.color, 0.16).fillRect(x + 2, y + 2, w - 4, h - 4);
    const p = Math.min(h - S(16), Math.round(w * 0.4)); // the portrait: square, never more than 40 percent of the card
    const px = x + S(8), py = y + S(8);
    const key = 'sel:' + c.id;
    if (this.textures.exists(key)) {
      const img = add(this.add.image(px + p / 2, py + p / 2, key));
      const src = this.textures.get(key).getSourceImage();
      const scale = Math.max(p / src.width, p / src.height);
      img.setScale(scale);
      const shape = this.make.graphics({ add: false }).fillRect(px, py, p, p);
      img.setMask(shape.createGeometryMask());
      if (!on) img.setAlpha(away ? 0.3 : 0.55);
    } else {
      // no portrait yet: a placeholder diamond with the first letter
      g.fillStyle(sd.color, 0.35).fillRect(px, py, p, p);
      goldDiamond(g, px + p / 2, py + p / 2, p * 0.3, on ? GOLD : 0x8a7350);
      add(this.add.text(px + p / 2, py + p / 2, c.name.charAt(0), textStyle(F.big, '#f3e7c6')).setOrigin(0.5));
    }
    g.lineStyle(Math.max(1, S(1.5)), on ? GOLD : 0x5a4630, 1).strokeRect(px, py, p, p);
    // the home tag: a small pill on the foot of the portrait (HERO or ENEMY), whichever side the card is on
    const homeCol = c.side === 'enemy' ? ENEMY : HERO;
    const tag = add(this.add.text(px + p / 2, py + p - S(3), c.side === 'enemy' ? 'ENEMY' : 'HERO', textStyle(F.small, '#f3e7c6')).setOrigin(0.5, 1).setLetterSpacing(1));
    tag.setBackgroundColor(c.side === 'enemy' ? '#7d3326' : '#2d6f6a').setPadding(S(5), 0, S(5), 0);
    tag.setAlpha(on ? 1 : 0.8);
    tag.homeSide = c.side;
    const tx = px + p + S(10), tw = x + w - tx - S(8);
    // a long name wraps (never shrinks under the smallest readable size)
    const name = add(this.add.text(tx, py, c.name, textStyle(F.mid, on ? '#f3e7c6' : '#bfae88', { wordWrap: { width: tw } })).setLineSpacing(-4));
    const below = name.height - F.mid * 1.3 > 4 ? name.height - F.mid * 1.15 : 0; // the extra height of a wrapped name
    const job = jobs[c.job] ? jobs[c.job].name : c.job;
    add(this.add.text(tx, py + below + F.mid * 1.3, job, textStyle(F.small, on ? '#e4c27c' : '#9c8a66')));
    // the short line: Suleiman's from bios.json, else the skills by their button names
    const b = bios.characters && bios.characters[c.id];
    let line = (b && b.line) || ((jobs[c.job] && jobs[c.job].spells) || []).map((id) => (spells[id] ? spells[id].button || spells[id].name : id)).join(' · ');
    if (away) line = 'Fighting on the ' + (sd.side === 'hero' ? 'enemies' : 'heroes') + ' side. Tap to bring it here.';
    const ly = py + below + F.mid * 1.3 + F.small * 1.35;
    const lines = Math.max(1, Math.floor((y + h - S(8) - ly) / (F.small * 1.2)));
    const lt = add(this.add.text(tx, ly, line, textStyle(F.small, '#d8c8a4', { wordWrap: { width: tw }, maxLines: lines })).setLineSpacing(-2));
    if (lt.getWrappedText(line).length > lines) lt.setText(lt.getWrappedText(line).slice(0, lines).join('\n').replace(/[\s·,]+$/, '') + '…');
    if (on) {
      // the tick in the corner
      g.fillStyle(GOLD, 1).fillCircle(x + w - S(14), y + S(14), S(9));
      g.lineStyle(Math.max(2, S(2.5)), 0x1a1208, 1).beginPath().moveTo(x + w - S(19), y + S(14)).lineTo(x + w - S(15), y + S(18)).lineTo(x + w - S(9), y + S(10)).strokePath();
    }
    const hit = add(this.add.rectangle(x, y, w, h, 0x000000, 0.001).setOrigin(0, 0));
    if (sd.locked) return;
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerup', (ptr) => {
      if (Math.abs(ptr.y - ptr.downY) > 12) return; // a drag to scroll, not a tap
      this.toggle(sd.side, c.id);
    });
    hit.charId = c.id;
    hit.side = sd.side; // (which column the card is in)
    (this.cardHits = this.cardHits || []).push(hit);
  }

  // Adds a character to a side, or takes it off. A character already on the other side moves over (a full side says so)
  toggle(side, id) {
    const other = side === 'hero' ? 'enemy' : 'hero';
    const list = this.pick[side];
    const i = list.indexOf(id);
    if (i >= 0) {
      list.splice(i, 1);
      play('cancel');
    } else if (list.length >= MAX_PER_SIDE) {
      play('cancel');
      this.flash((side === 'hero' ? 'Heroes' : 'Enemies') + ' are full: tap one to take it out first');
      return;
    } else {
      this.pick[other] = this.pick[other].filter((x) => x !== id); // one character, one side
      list.push(id);
      play('select');
    }
    this.draw();
    prefetchFighters(fighterIds(this.mapData, this.pick)); // the fighters now picked download first (18.48)
  }

  flash(text) {
    const W = this.scale.width;
    const t = this.add.text(W / 2, this.cameras.main.scrollY + this.scale.height * 0.5, text, textStyle(Math.max(22, Math.round(W / 34)), '#ffd27a', { backgroundColor: '#140f0bdd', padding: { x: 14, y: 10 } })).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 400, onComplete: () => t.destroy() });
  }

  button(add, x, y, w, h, label, enabled, F, S, onTap, main = false) {
    const g = add(this.add.graphics());
    framePanel(g, x, y, w, h, S(1) || 1, { alpha: enabled ? 0.9 : 0.5, line: enabled ? GOLD : 0x5a4630 });
    if (main && enabled) g.fillStyle(0x8a5a1c, 0.55).fillRect(x + 3, y + 3, w - 6, h - 6);
    add(this.add.text(x + w / 2, y + h / 2, label, textStyle(F.mid, enabled ? '#f3e7c6' : '#8a7a5c')).setOrigin(0.5));
    const hit = add(this.add.rectangle(x, y, w, h, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true }));
    hit.on('pointerup', (ptr) => { if (Math.abs(ptr.y - ptr.downY) <= 12) onTap(); });
    hit.label = label;
    return hit;
  }

  startBattle(lineUp) {
    const chosen = { hero: [...lineUp.hero], enemy: [...lineUp.enemy] };
    this.scene.start('BattleScene', { stepIndex: this.stepIndex, map: this.mapName, lineUp: chosen });
  }
}
