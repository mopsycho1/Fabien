p='/home/claude/fabien/src/scenes/BattleScene.js'
s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:80]); s=s.replace(a,b)

# the cancel tag, built with the menu
rep("""    this.menuRows = [];
    this.menuSize = { w: 0, h: 0 };""","""    this.menuRows = [];
    this.menuSize = { w: 0, h: 0 };
    this.menuShown = null;

    // While a target is being picked, the menu shrinks to this small tag
    // ("✕ Thrust") in a corner, so the whole board can be tapped (roadmap 8.9).
    // Tapping it, or empty ground, goes back to the menu.
    this.pillBack = this.add.graphics();
    this.pillText = this.add.text(0, 0, '', textStyle(S(17), '#f1e6c8')).setOrigin(0, 0.5);
    this.pillHit = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.pillHit.on('pointerdown', () => {
      if (this.pill.visible && !this.busy) this.cancelMode();
    });
    this.pill = keep(this.add.container(0, 0, [this.pillBack, this.pillText, this.pillHit]).setDepth(5).setVisible(false));""")

# placement: replace placeMenu entirely
i=s.find("  // The menu stands beside the unit whose turn it is, on the side with room,")
j=s.find("  // Every frame: the info card follows its text", i)
assert i>0 and j>0
s = s[:i] + r'''  // The menu stands beside the unit whose turn it is, clear of the frame and
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
    const show = !!(turn && !picking && this.menuRows.length > 0);
    this.menu.setVisible(show);
    this.showPill(!!(turn && picking));
    if (show !== this.menuShown) {
      // a hidden menu must not catch taps meant for the board
      this.menuShown = show;
      for (const r of [...this.slots, ...this.halves, ...this.lowHalves]) if (r.hit.input) r.hit.input.enabled = show;
    }
    if (!show) return;
    const { W, H, s, m, cardW, infoW } = this.lay;
    const cam = this.cameras.main;
    const toScreen = (x, y) => ({ x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom });
    const at = toScreen(u.view.x, u.view.y - u.centerY);
    const { w, h } = this.menuSize;
    // what the menu should not cover: blue tiles, targets, everyone standing
    const points = [];
    for (const key of this.reachableKeys) {
      const [c, r] = key.split(',').map(Number);
      const p = tileToScreen(c, r);
      points.push({ ...toScreen(p.x, p.y), weight: 1 });
    }
    for (const t of this.targetsInRange) points.push({ ...toScreen(t.view.x, t.view.y - t.centerY), weight: 4 });
    for (const o of this.units) if (o.alive) points.push({ ...toScreen(o.view.x, o.view.y - o.centerY * 0.6), weight: o === u ? 8 : 2 });
    const topSafe = m + 100 * s;
    const fit = (x, y) => {
      x = Math.min(Math.max(x, m), W - m - w);
      // stay clear of the profile card and the info card at the bottom
      if (x < m + cardW + m && y + h > this.cardTop - m) y = this.cardTop - m - h;
      if (x + w > W - m - infoW - m && y + h > this.infoTop - m) y = this.infoTop - m - h;
      return { x, y: Math.min(Math.max(y, topSafe), H - m - h) };
    };
    const gap = 46 * s;
    const lift = 24 * s;
    const spots = [
      fit(at.x + gap, at.y - h / 2),
      fit(at.x - gap - w, at.y - h / 2),
      fit(at.x + gap, at.y - h - lift),
      fit(at.x - gap - w, at.y - h - lift),
      fit(at.x + gap, at.y + lift),
      fit(at.x - gap - w, at.y + lift),
      fit(W - m - w, Math.min(this.infoTop, H) - m - h),
      fit(m, this.cardTop - m - h),
    ];
    let best = null;
    spots.forEach((p, i) => {
      let covered = 0;
      for (const q of points) if (q.x > p.x - 8 && q.x < p.x + w + 8 && q.y > p.y - 8 && q.y < p.y + h + 8) covered += q.weight;
      const score = covered * 10 + i * 0.5; // beside the unit wins a tie
      if (!best || score < best.score) best = { ...p, score };
    });
    this.menu.setPosition(Math.round(best.x), Math.round(best.y));
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
      this.pillText.setText('✕   ' + name).setFontSize(Math.round(17 * s));
      const pw = Math.round(this.pillText.width + 36 * s);
      const ph = Math.round(44 * s);
      this.pillBack.clear();
      darkPanel(this.pillBack, 0, 0, pw, ph, s);
      this.pillText.setPosition(Math.round(18 * s), ph / 2);
      this.pillHit.setSize(pw, ph);
      this.pillHit.input.hitArea.setTo(0, 0, pw, ph);
      this.pillSize = { w: pw, h: ph };
    }
    // in the corner above the info card, where the board leaves room
    const { w, h } = this.pillSize;
    this.pill.setPosition(W - m - w, Math.min(this.infoTop, H) - m - h);
  }

  // The name on the cancel tag: the move or skill being aimed.
  pillName() {
    const u = this.activeUnit;
    if (this.mode === 'attack' || this.mode === 'approach') {
      const atk = activeMove(u, 'attack');
      return atk !== 'attack' ? spells[atk].button : u.attackName || 'Attack';
    }
    if (this.mode === 'engage') return 'Engage';
    if (this.selectedSpell && spells[this.selectedSpell]) return spells[this.selectedSpell].button;
    return 'Back';
  }

''' + s[j:]

# the modes in which a target is being picked
rep("const BAR_WIDTH = 48;","// The modes in which the player is picking a target on the board: the\n// command menu gets out of the way then (roadmap 8.9).\nconst TARGET_MODES = ['attack', 'engage', 'spellTarget', 'huskTile', 'approach'];\n\nconst BAR_WIDTH = 48;")
open(p,'w').write(s)
print('ok')
