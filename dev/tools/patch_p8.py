p='/home/claude/fabien/src/scenes/BattleScene.js'
s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:80]); s=s.replace(a,b)
def between(start, end_marker):
    i=s.find(start); assert i>=0, start[:60]
    j=s.find(end_marker, i); assert j>=0, end_marker[:60]
    return i,j

# ---- imports
rep("import { createHudTextures, bronzePanel, CommandButton, portraitMedallion,","import { createHudTextures, bronzePanel, CommandButton, MenuRow, darkPanel, portraitMedallion,")
rep("import { createAtmosphere } from '../atmosphere.js';","import { createAtmosphere } from '../atmosphere.js';\nimport { uiScaleFor } from '../layout.js';\nimport clashData from '../data/clashBanner.json';")
rep("import { createBoardTextures, drawTileBlock, drawUnderside, drawBackdrop, drawScenery, setBoardSetting } from '../boardArt.js';","import { createBoardTextures, drawTileBlock, drawUnderside, drawBackdrop, drawScenery, setBoardSetting, terrainAt } from '../boardArt.js';")

# ---- create(): screen-sized cameras, layout, home view, backdrop that reaches the screen's sides
rep("    this.uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);","    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);")
rep("    drawBackdrop(this);        // the cave's darkness, or the sky\n    createAtmosphere(this, mapData.setting); // light and dust in a cave; clouds, sun, sand and embers outside",
    "    this.computeLayout();      // the screen's shape: where the frame goes and where the board camera sits (Phase 8)\n    this.redrawBackdrop();     // the cave's darkness, or the sky, as wide as the screen sees\n    createAtmosphere(this, mapData.setting); // light and dust in a cave; clouds, sun, sand and embers outside\n    this.fitVignette();\n    this.goHome();             // the board camera fits the board into the free space")
rep("    this.viewing = null;            // a unit the player tapped to look at\n",
    "    this.viewing = null;            // a unit the player tapped to look at\n    this.autoMove = true;           // roadmap 8.5: on your turn the blue tiles show at once; tap one to walk\n")
rep("""    createHudTextures(this);
    this.buildHud();
""","""    createHudTextures(this);
    this.buildHud();
    // A small gold diamond floats over the unit whose turn it is (roadmap 8.4)
    this.activeMarker = this.add.graphics().setDepth(77);
    this.activeMarker.fillStyle(GOLD, 1).fillPoints([{ x: 0, y: -9 }, { x: 7, y: 0 }, { x: 0, y: 9 }, { x: -7, y: 0 }], true);
    this.activeMarker.lineStyle(2, 0x2a1a0c, 1).strokePoints([{ x: 0, y: -9 }, { x: 7, y: 0 }, { x: 0, y: 9 }, { x: -7, y: 0 }], true);
    this.markerBob = { v: 0 };
    this.tweens.add({ targets: this.markerBob, v: 1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // The phone was turned or the window resized (layout.js): lay everything out again
    const onLayout = () => this.relayout();
    this.events.on('layout', onLayout);
    this.events.once('shutdown', () => this.events.off('layout', onLayout));
""")

# ---- buildHud: the whole frame, new
i,j = between("  // ---------- The interface ----------\n", "  // The card for one unit: face, name, job and style, health, numbers and conditions.")
s = s[:i] + r'''  // ---------- The interface ----------

  // The sizes of the frame for the screen as it is now (roadmap 8.1, 8.2):
  // how big the interface is drawn (s), the margin (m), the card and info
  // widths, and where the board camera sits so the whole board fits in the
  // space the frame leaves free (this.home).
  computeLayout() {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = uiScaleFor(this);
    const m = Math.round(14 * s);
    const portrait = H > W;
    const cardW = Math.round(Math.min(392 * s, portrait ? W * 0.56 : W * 0.36));
    const infoW = Math.round(portrait ? W - cardW - 3 * m : Math.min(470 * s, W - cardW - 3 * m));
    this.lay = { W, H, s, m, portrait, cardW, infoW, rowH: Math.round(42 * s), menuW: Math.round(236 * s) };
    // The board's corners leave the screen's corners free, which is where the
    // frame goes; in portrait the cards sit under the board instead.
    const b = this.boardBounds();
    const top = portrait ? m + 104 * s : m;
    const bottom = portrait ? H - 214 * s : H - m;
    const zoom = Math.max(0.7, Math.min(1.6, (W - 2 * m) / (b.x1 - b.x0), (bottom - top) / (b.y1 - b.y0)));
    const freeY = (top + bottom) / 2;
    this.home = { zoom, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 - (freeY - H / 2) / zoom };
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
    cam.setZoom(this.home.zoom);
    cam.centerOn(this.home.x, this.home.y);
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
    this.stripY = m + S(54);

    // Top left: the title and the turn order, with a thin gold line under it
    keep(this.add.text(m + S(4), m, 'FABIEN  ·  OF GODS & MEN', textStyle(S(13), '#e4c27c')).setLetterSpacing(2));
    const line = keep(this.add.graphics());
    line.lineStyle(1, UI.bronze, 0.8);
    line.lineBetween(m, this.stripY + S(38), m + S(400), this.stripY + S(38));
    this.turnStripLayer = keep(this.add.container(0, 0));

    // Top right: the turn number, and the tile in focus (its ground and height)
    const bw = S(214);
    const bh = S(72);
    const bx = W - m - bw;
    darkPanel(keep(this.add.graphics()), bx, m, bw, bh, s);
    keep(this.add.text(bx + S(14), m + S(12), 'TURN', textStyle(S(13), '#a89a78')).setLetterSpacing(2));
    this.turnText = keep(this.add.text(bx + S(66), m + S(2), '01', textStyle(S(28), '#ffe08a')));
    this.tileText = keep(this.add.text(bx + S(14), m + S(44), '', textStyle(S(14), '#e8d5a8')));

    // Under it: turn the camera (his curved arrows) either side of the little
    // map of the board, and sound on or off
    const r = S(21);
    const iy = m + bh + S(12) + r;
    const round = (x, icon, onTap) => {
      const pic = iconImage(this, x, iy, icon, r * 2);
      if (pic) keep(pic);
      else {
        const g = keep(this.add.graphics());
        g.fillStyle(UI.ink, 0.9).fillCircle(x, iy, r).lineStyle(2, UI.bronze, 1).strokeCircle(x, iy, r);
        drawIcon(g, icon, x, iy, r * 1.1, UI.bronzeLight);
      }
      const hit = keep(this.add.circle(x, iy, r + 4, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
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
    const rx = muteX - r * 2 - S(16);
    round(rx, 'redo', () => this.rotateCamera(1));
    this.compassPos = { x: rx - r - S(30), y: iy };
    round(rx - r * 2 - S(40), 'undo', () => this.rotateCamera(-1));
    this.compass = keep(this.add.graphics());
    this.refreshCompass();
    if (!this.keysBound) {
      this.keysBound = true;
      this.input.keyboard?.on('keydown-Q', () => this.rotateCamera(-1));
      this.input.keyboard?.on('keydown-E', () => this.rotateCamera(1));
    }

    // Bottom left: the unit's profile (see refreshCard)
    this.cardLayer = keep(this.add.container(0, 0));
    this.cardTop = H;

    // Bottom right: the info card (hints, and the preview of a move or skill)
    this.infoPanel = keep(this.add.graphics());
    this.statusText = keep(this.add.text(0, 0, '', textStyle(S(19), '#f1e6c8', { wordWrap: { width: this.lay.infoW - S(24) }, lineSpacing: S(2) })));
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
    this.menu = keep(this.add.container(0, 0, [this.menuPanel, this.menuHeader, ...[...this.slots, ...this.halves, ...this.lowHalves].map((b) => b.view)]).setDepth(5));
    this.menuRows = [];
    this.menuSize = { w: 0, h: 0 };
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
    const pad = Math.round(6 * s);
    const header = this.mode === 'spell' || this.spellGroup ? this.spellGroup || 'Skills' : '';
    const headH = header ? Math.round(24 * s) : 0;
    rows.forEach((r, i) => r.place(pad, pad + headH + i * rowH, menuW - 2 * pad, rowH, s));
    const h = pad * 2 + headH + rows.length * rowH;
    this.menuPanel.clear();
    darkPanel(this.menuPanel, 0, 0, menuW, h, s);
    this.menuHeader.setText(header.toUpperCase()).setPosition(pad + Math.round(10 * s), pad + headH / 2);
    this.menuRows = rows;
    this.menuSize = { w: menuW, h };
    this.ui(this.menu);
    this.placeMenu();
  }

  // The menu stands beside the unit whose turn it is, on the side with room,
  // clear of the frame. Hidden while things move or on the enemy's turn.
  placeMenu() {
    if (!this.menu) return;
    const u = this.activeUnit;
    const show = this.menuRows.length > 0 && u && u.side === 'hero' && u.alive && !this.busy && !this.battleOver && !this.inCinematic && !this.rotating;
    this.menu.setVisible(!!show);
    if (!show) return;
    const { W, H, s, m, cardW, infoW } = this.lay;
    const cam = this.cameras.main;
    const sx = (u.view.x - cam.worldView.x) * cam.zoom;
    const sy = (u.view.y - u.centerY - cam.worldView.y) * cam.zoom;
    const { w, h } = this.menuSize;
    const gap = 46 * s;
    let x = sx + gap;
    if (x + w > W - m) x = sx - gap - w;
    x = Math.min(Math.max(x, m), W - m - w);
    let y = sy - h / 2;
    // stay clear of the profile card and the info card at the bottom
    if (x < m + cardW + m && y + h > this.cardTop - m) y = this.cardTop - m - h;
    if (x + w > W - m - infoW - m && y + h > this.infoTop - m) y = this.infoTop - m - h;
    y = Math.min(Math.max(y, m + 100 * s), H - m - h);
    this.menu.setPosition(Math.round(x), Math.round(y));
  }

  // Every frame: the info card follows its text, the menu follows the unit,
  // the gold marker bobs over the unit whose turn it is, and on your turn the
  // blue tiles come back by themselves (roadmap 8.5).
  update() {
    if (!this.lay) return;
    if (this.statusText && this.statusText.text !== this.infoText) this.fitStatus();
    this.placeMenu();
    const u = this.activeUnit;
    if (this.activeMarker) {
      const on = u && u.alive && u.view && u.view.active && !this.inCinematic && !this.battleOver;
      this.activeMarker.setVisible(!!on);
      if (on) this.activeMarker.setPosition(u.view.x, u.view.y - u.topY - 34 - this.markerBob.v * 7);
    }
    if (this.autoMove && this.mode === 'idle' && !this.busy && !this.battleOver && !this.inCinematic && !this.rotating) {
      if (u && u.side === 'hero' && u.alive && !u.engagedWith && this.stepsLeft(u) > 0) this.startMove(true);
    }
  }

''' + s[j:]

# ---- the profile card, new
i,j = between("  // The card for one unit: face, name, job and style, health, numbers and conditions.", "  // Draws the whole board, one tile block at a time.")
old_card = s[i:j]
assert "this.ui(L);\n  }\n" in old_card
k = old_card.rfind("this.ui(L);\n  }\n") + len("this.ui(L);\n  }\n")
s = s[:i] + r'''  // The unit's profile, bottom left (roadmap 8.2, his 30 Oct mockups): face,
  // name, class, HP, MP (when it means something, 3.13) and CT bars, its
  // numbers in one neat row, and its conditions as his icons with words.
  refreshCard(unit, viewing = false) {
    const L = this.cardLayer;
    L.removeAll(true);
    if (!unit || !this.lay) return;
    const { s, m, H, cardW: w } = this.lay;
    const S = (n) => Math.round(n * s);
    const pad = S(12);
    const items = [];
    const r = S(38);
    items.push(ringPortrait(this, pad + r + S(4), pad + r + S(6), r, unit, portraitKey(unit.id, unit), { active: unit === this.activeUnit }));
    const tx = pad + 2 * r + S(20);
    items.push(this.add.text(tx, pad - S(2), unit.name, textStyle(S(23), '#ffe08a')));
    const role = isMelee(unit) ? STYLE_NAMES[styleOf(unit)] : unit.attackType === 'magic' ? 'Magic' : unit.spells && unit.spells.length ? 'Support' : 'Ranged';
    items.push(this.add.text(tx, pad + S(28), unit.jobName + '  ·  ' + role, textStyle(S(14), '#e4c27c')));
    items.push(this.add.text(w - pad, pad + S(4), unit.side === 'hero' ? 'ALLY' : 'FOE', textStyle(S(13), unit.side === 'hero' ? '#7fd6cf' : '#ff8a6a')).setOrigin(1, 0));

    // The bars: a small word, the bar, and the numbers at its end (1.9)
    let y = pad + S(54);
    const bars = this.add.graphics();
    items.push(bars);
    const barX = tx + S(28);
    const barW = w - pad - S(64) - barX;
    const bar = (word, value, max, color, numbers) => {
      items.push(this.add.text(tx, y, word, textStyle(S(13), '#d8c8a4')).setOrigin(0, 0.5));
      bars.fillStyle(UI.ink, 1).fillRoundedRect(barX, y - S(4), barW, S(8), S(3));
      if (value > 0) bars.fillStyle(color, 1).fillRoundedRect(barX + 1, y - S(3), (barW - 2) * Math.min(1, value / max), S(6), S(2));
      bars.lineStyle(1, UI.bronze, 0.9).strokeRoundedRect(barX, y - S(4), barW, S(8), S(3));
      const hex = '#' + color.toString(16).padStart(6, '0');
      items.push(this.add.text(w - pad, y, numbers, textStyle(S(14), word === 'HP' ? '#f1e6c8' : hex, { fontStyle: 'bold' })).setOrigin(1, 0.5));
      y += S(19);
    };
    const frac = Math.max(0, unit.hp / unit.maxHp);
    bar('HP', unit.hp, unit.maxHp, frac <= 0.35 ? 0xe05a47 : 0x6fcf7f, unit.hp + '/' + unit.maxHp);
    const mpNow = mpShown(unit);
    if (mpNow) bar('MP', mpNow.mp, mpNow.max, mpNow.lent ? Phaser.Display.Color.HexStringToColor(buffOf(unit).color).color : 0x5aa8ff, mpNow.mp + '/' + mpNow.max);
    // CT: how close its next turn is (100 = its turn now)
    const ct = unit === this.activeUnit ? 100 : Math.max(0, Math.min(100, Math.round(unit.ct)));
    bar('CT', ct, 100, 0xe8b04a, String(ct));
    y = Math.max(y, pad + 2 * r + S(14));

    // The numbers as they are right now, spells included, laid out in one row:
    // a small word on top, the number under it
    const now = (stat) => unit[stat] + statMod(unit, stat);
    const stats = [['ATK', now('attack')], ['DEF', now('defense')], ['MAG', now('magicAttack')], ['MDF', now('magicDefense')], ['SPD', unit.speed], ['MOV', moveOf(unit)], ['RNG', unit.range]];
    if (unit.contest && isStanceDuel()) stats.push(['POISE', poiseOf(unit) + '/' + engagementRules.poise.max]);
    const colW = (w - 2 * pad) / stats.length;
    bars.lineStyle(1, UI.bronzeDark, 0.9).lineBetween(pad, y - S(2), w - pad, y - S(2));
    stats.forEach(([word, value], i) => {
      const cx = pad + colW * (i + 0.5);
      items.push(this.add.text(cx, y + S(2), word, textStyle(S(11), '#a89a78')).setOrigin(0.5, 0));
      items.push(this.add.text(cx, y + S(15), String(value), textStyle(S(16), '#f1e6c8')).setOrigin(0.5, 0));
    });
    y += S(40);

    // Conditions as small chips: his icon and the word (roadmap 6.7). If the
    // row gets too long for the card, the chips with an icon drop the word.
    const chips = statusTags(unit).map((tag) => ({ tag, icon: tag.icon && this.textures.exists('icon:' + tag.icon) }));
    if (chips.length) {
      chips.forEach((c) => (c.text = this.add.text(0, 0, c.tag.text, textStyle(S(14), c.tag.color, { fontStyle: 'bold' }))));
      const widthOf = (c, withWord) => (c.icon ? (withWord ? c.text.width + S(31) : S(24)) : c.text.width + S(14));
      const roomy = chips.reduce((sum, c) => sum + widthOf(c, true) + S(5), 0) <= w - 2 * pad;
      let x = pad;
      for (const c of chips) {
        const showWord = roomy || !c.icon;
        const cw = widthOf(c, showWord);
        if (x + cw > w - pad) {
          c.text.destroy();
          continue;
        }
        const chip = this.add.graphics();
        chip.fillStyle(UI.ink, 1).fillRoundedRect(x, y, cw, S(24), S(5));
        chip.lineStyle(1, UI.bronze, 1).strokeRoundedRect(x, y, cw, S(24), S(5));
        items.push(chip);
        if (c.icon) items.push(this.add.image(x + S(12), y + S(12), 'icon:' + c.tag.icon).setDisplaySize(S(19), S(19)));
        if (showWord) items.push(c.text.setPosition(x + (c.icon ? S(25) : S(7)), y + S(3)));
        else c.text.destroy();
        x += cw + S(5);
      }
      y += S(30);
    }
    const buff = buffOf(unit);
    if (buff) {
      items.push(this.add.text(pad, y, (buff.effect || buff.name) + ': ' + buff.turnsLeft + ' turn' + (buff.turnsLeft === 1 ? '' : 's') + ' left', textStyle(S(14), buff.color)));
      y += S(20);
    }
    if (viewing) items.push(this.add.text(w - pad, y - S(18), 'viewing', textStyle(S(13), '#a89a78', { fontStyle: 'italic' })).setOrigin(1, 0));

    const h = y + pad - S(4);
    const back = this.add.graphics();
    darkPanel(back, 0, 0, w, h, s);
    L.add([back, ...items]);
    L.setPosition(m, H - m - h);
    this.cardTop = H - m - h;
    this.ui(L);
  }

''' + s[i+k:]

# ---- turn strip, compass, tile info
i,j = between("  refreshTurnStrip() {", "  // Outlines: red-orange")
s = s[:i] + r'''  refreshTurnStrip() {
    this.turnStripLayer.removeAll(true);
    const lineup = [this.activeUnit, ...previewTurns(this.units, 6)];
    const { s, m } = this.lay;
    const y = this.stripY;
    lineup.forEach((unit, i) => {
      const now = i === 0;
      const x = now ? m + 30 * s : m + 96 * s + (i - 1) * 46 * s;
      // the unit acting now sits in Suleiman's glowing medal
      const medal = now
        ? medalPortrait(this, x, y, 27 * s, unit, portraitKey(unit.id, unit), { active: true })
        : portraitMedallion(this, x, y, 18 * s, unit, portraitKey(unit.id, unit), { active: false });
      this.turnStripLayer.add(medal);
      if (now) {
        const arrow = this.add.graphics();
        arrow.fillStyle(UI.gold, 1);
        arrow.fillTriangle(x + 40 * s, y, x + 48 * s, y - 7 * s, x + 48 * s, y + 7 * s);
        this.turnStripLayer.add(arrow);
      }
    });
    this.ui(this.turnStripLayer);
    if (this.turnText) this.turnText.setText(String(Math.max(1, this.turnCount)).padStart(2, '0'));
    this.refreshTileInfo();
  }

  // Top right: the ground and height of the tile in focus (the target being
  // looked at, else the unit whose turn it is), as in his mockup.
  refreshTileInfo() {
    if (!this.tileText || !this.activeUnit) return;
    const t = this.pendingTarget || (this.approach && this.approach.tile) || this.activeUnit;
    const ground = terrainAt(mapData, t.col, t.row);
    this.tileText.setText(ground.charAt(0).toUpperCase() + ground.slice(1) + '   ·   ELEV ' + getHeight(t.col, t.row));
  }

''' + s[j:]
rep("""    const g = this.compass;
    if (!g) return;
    const cx = 108;
    const cy = 818;""","""    const g = this.compass;
    if (!g || !this.compassPos) return;
    const cx = this.compassPos.x;
    const cy = this.compassPos.y;""")

# ---- the info card follows its text
i,j = between("  // Long hints (a skill's full description) shrink to stay inside the hint bar.\n  fitStatus() {", "  // Shows a short message in the status line")
s = s[:i] + r'''  // The info card, bottom right: it grows to fit its text (up to a limit,
  // then the words get smaller) and hides when there is nothing to say.
  fitStatus() {
    const t = this.statusText;
    if (!t || !this.lay) return;
    const { W, H, m, s, infoW, portrait } = this.lay;
    let size = Math.round(19 * s);
    t.setFontSize(size);
    const maxH = (portrait ? 200 : 168) * s;
    while (t.height > maxH && size > 12) t.setFontSize(--size);
    this.infoText = t.text;
    this.infoPanel.clear();
    if (!t.text) {
      this.infoTop = H;
      return;
    }
    const pad = Math.round(12 * s);
    const h = t.height + 2 * pad;
    const x = W - m - infoW;
    const y = H - m - h;
    darkPanel(this.infoPanel, x, y, infoW, h, s);
    t.setPosition(x + pad, y + pad);
    this.infoTop = y;
    this.refreshTileInfo();
  }

''' + s[j:]

# ---- refreshButtons fills the slots, then lays out the menu
rep("  refreshButtons() {\n","  // Fills in the commands for the unit whose turn it is, then lays out the menu.\n  refreshButtons() {\n    this.setButtons();\n    this.layoutMenu();\n  }\n\n  setButtons() {\n")

# ---- tap-to-move
rep("  startMove() {\n    const unit = this.activeUnit;","  // quiet: shown by itself at the start of a turn (8.5), so no sound\n  startMove(quiet = false) {\n    const unit = this.activeUnit;")
rep("    this.showHighlights(tiles, 0x4aa3ff);\n    play('select');\n    this.refreshButtons();\n  }","    this.showHighlights(tiles, 0x4aa3ff);\n    if (!quiet) play('select');\n    this.refreshButtons();\n  }")
rep("""    if (col === unit.col && row === unit.row) {
      if (this.mode === 'move') {""","""    if (col === unit.col && row === unit.row) {
      if (this.mode === 'move' && this.autoMove) return; // the blue tiles stay (8.5)
      if (this.mode === 'move') {""")

# ---- double-tap a Verse: on herself (8.7)
rep("""    play('select');
    this.clearHighlights();
    this.pendingTarget = null;
    this.pendingTile = null;""","""    // A Verse tapped a second time: cast it on herself (roadmap 8.7), like Herbs
    if (spell.kind === 'buff' && this.selectedSpell === id && this.mode === 'spellTarget' && this.targetsInRange.includes(unit)) {
      this.pendingTarget = unit;
      this.confirmSpell();
      return;
    }
    play('select');
    this.clearHighlights();
    this.pendingTarget = null;
    this.pendingTile = null;""")

# ---- cameras: home view instead of the fixed 720 by 1280 centre
rep("""    cam.setZoom(1);
    cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.setSpeed('skip', 1);""","""    this.goHome();
    this.setSpeed('skip', 1);""")
i,j = between("  // Eases the battlefield camera in on a point. The interface does not move.", "  // ---------- Cut-ins ----------")
s = s[:i] + r'''  // Eases the battlefield camera in on a point. The interface does not move.
  // zoom is relative to the normal view (1.3 = 30% closer than the whole board).
  focusCamera(x, y, zoom = 1.3, duration = 260) {
    const cam = this.cameras.main;
    const z = zoom * this.home.zoom;
    const b = this.boardBounds();
    const cx = Math.min(Math.max(x, b.x0), b.x1);
    const cy = Math.min(Math.max(y, b.y0), b.y1);
    cam.pan(cx, cy, duration, 'Sine.easeInOut', true);
    cam.zoomTo(z, duration, 'Sine.easeInOut', true);
  }

  // Back to the normal view of the whole board.
  resetCamera(duration = 320) {
    const cam = this.cameras.main;
    cam.pan(this.home.x, this.home.y, duration, 'Sine.easeInOut', true);
    cam.zoomTo(this.home.zoom, duration, 'Sine.easeInOut', true, (c, progress) => {
      if (progress === 1) this.goHome();
    });
  }

''' + s[j:]

# ---- screen-sized cut-in, flash, result, duel faces
rep("""    play('cutin');
    const W = GAME_WIDTH;
    const cy = 560;""","""    play('cutin');
    const W = this.scale.width;
    const cy = Math.round(this.scale.height * 0.44);""")
rep("const flash = this.ui(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.55).setDepth(240));","const flash = this.ui(this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xffffff, 0.55).setDepth(240));")
i,j = between("  showResultPanel(won) {", "  // ---------- Enemy turns ----------")
block = s[i:j]
block = block.replace("""    const W = GAME_WIDTH;
    const cover = this.ui(this.add.rectangle(W / 2, GAME_HEIGHT / 2, W, GAME_HEIGHT, 0x000000, 0).setDepth(300));""","""    // laid out around the middle of the screen, whatever its shape
    const W = this.scale.width;
    const H = this.scale.height;
    const dy = Math.round(H / 2 - 640);
    const cover = this.ui(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(300));""")
block = block.replace("bronzePanel(this, 60, 380, W - 120, 540)","bronzePanel(this, W / 2 - Math.min(300, W / 2 - 60), 380 + dy, Math.min(600, W - 120), 540)")
block = block.replace(".text(W / 2, 480, won","\n        .text(W / 2, 480 + dy, won").replace("this.add.text(W / 2, 568,","this.add.text(W / 2, 568 + dy,").replace("this.add.text(W / 2, 612,","this.add.text(W / 2, 612 + dy,").replace("this.add.tileSprite(W / 2, 652,","this.add.tileSprite(W / 2, 652 + dy,").replace("    let y = 730;","    let y = 730 + dy;")
assert block.count("+ dy")>=6, block.count("+ dy")
s = s[:i] + block + s[j:]
rep("const box = this.ui(this.add.container(from, 640, [face, name]).setDepth(230));","const box = this.ui(this.add.container(from, Math.round(this.scale.height * (this.lay.portrait ? 0.5 : 0.46)), [face, name]).setDepth(230));")
rep("this.duelFaces = [make(hero, 72, -90), make(enemy, GAME_WIDTH - 72, GAME_WIDTH + 90)];","this.duelFaces = [make(hero, 72, -90), make(enemy, this.scale.width - 72, this.scale.width + 90)];")
rep("const out = box.x < GAME_WIDTH / 2 ? -90 : GAME_WIDTH + 90;","const out = box.x < this.scale.width / 2 ? -90 : this.scale.width + 90;")

# ---- quieter figures: thin HP bar, no badge (8.4)
rep("const barBack = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 9, 0x2a1d12).setOrigin(0, 0.5);","const barBack = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 5, 0x2a1d12).setOrigin(0, 0.5);")
rep("const hpFill = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 9, 0x6fcf7f).setOrigin(0, 0.5);","const hpFill = this.add.rectangle(-BAR_WIDTH / 2, -topY, BAR_WIDTH, 5, 0x6fcf7f).setOrigin(0, 0.5);")
rep("    const view = this.add.container(x, y, pieces).setDepth(depthFor(data.col, data.row) + 1);","    const view = this.add.container(x, y, pieces).setDepth(depthFor(data.col, data.row) + 1);\n    // less over the characters (roadmap 8.4): the job badge goes; the profile card says it\n    if (usePicture) [badgeBack, badgeText].forEach((o) => o && o.setVisible(false));")

# ---- his clash banner when a clash starts (8.6)
rep("      this.cutIn(actor, 'ENGAGE!', () => this.playBeat(outcome, true, onDone));","      this.clashBanner(actor, holder, () => this.playBeat(outcome, true, onDone));")
rep("    this.cutIn(attacker, 'ENGAGE!', () => this.playContest(contest, true, onDone));","    this.clashBanner(attacker, target, () => this.playContest(contest, true, onDone));")
rep("  // ---------- Cut-ins ----------\n", r'''  // ---------- Cut-ins ----------

  // Suleiman's clash banner (roadmap 8.6, his 30 Oct 20:28 elements): as a
  // clash starts, the two fighters' faces slam in from both sides in his
  // split frame (the hero on the red panel, the foe on the blue), with their
  // names; a flash and a shake where they meet, then they fly apart.
  clashBanner(a, b, onDone) {
    if (!this.textures.exists('ui:clash_frame')) return this.cutIn(a, 'ENGAGE!', onDone);
    play('cutin');
    const { W, H, s } = this.lay;
    const hero = a.side === 'hero' ? a : b;
    const foe = hero === a ? b : a;
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

''')
open(p,'w').write(s)
print('patched')
