# 31 Oct quick batch: 8.10 to 8.14 in BattleScene.js
p='/home/claude/fabien/src/scenes/BattleScene.js'
s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:80]); s=s.replace(a,b)

# 8.10 Meditate on the main menu; 8.11 "Verses"
rep("""    } else if (unit.spells && unit.spells.length > 0) {
      c.set(unit.maxMp > 0 ? 'Spell' : 'Skills', 'star', free, () => this.onSpellButton(), { accent: GOLD }); // no MP pool: skills, not spells
    } else {""","""    } else if (unit.spells && unit.spells.length > 0) {
      // A caster's magic is her Verses (Suleiman, 31 Oct: Blessings and Hexes);
      // a rest like Meditate gets its own row next to it (roadmap 8.10, 8.11)
      const word = unit.maxMp > 0 ? 'Verses' : 'Skills';
      const rest = unit.spells.find((id) => spells[id].kind === 'rest');
      if (rest) {
        c.set(null);
        this.halves[0].set(word, 'star', free, () => this.onSpellButton(), { accent: GOLD });
        const r = spells[rest];
        this.halves[1].set(r.button, 'hourglass', free && canAfford(unit, rest), () => this.chooseSpell(rest), { selected: this.selectedSpell === rest, accent: Phaser.Display.Color.HexStringToColor(r.color).color });
      } else {
        c.set(word, 'star', free, () => this.onSpellButton(), { accent: GOLD }); // no MP pool: skills, not spells
      }
    } else {""")
rep("""    if (this.spellGroup) return unit.spells.filter((id) => spells[id].group === this.spellGroup).map((id) => entry(id));

    const list = [];
    const seen = new Set();
    for (const id of unit.spells) {""","""    if (this.spellGroup) return unit.spells.filter((id) => spells[id].group === this.spellGroup).map((id) => entry(id));

    const list = [];
    const seen = new Set();
    for (const id of unit.spells) {
      if (spells[id].kind === 'rest') continue; // Meditate has its own row on the main menu (8.10)""")
rep("""      this.selectedSpell = id;
      this.mode = 'spell';
      this.refreshStatus();
      return;""","""      // (the main menu stays, with the row lit: tap it again to rest)
      this.selectedSpell = id;
      this.mode = 'rest';
      this.refreshButtons();
      this.refreshStatus();
      return;""")
rep("""    } else if (this.mode === 'spell' && this.selectedSpell) {
      const spell = spells[this.selectedSpell];""","""    } else if ((this.mode === 'spell' || this.mode === 'rest') && this.selectedSpell) {
      const spell = spells[this.selectedSpell];""")
rep("""      text = (this.spellGroup ? 'Choose a ' + this.spellGroup : 'Choose a spell') + '  (' + unit.mp + ' MP)';""","""      text = (this.spellGroup ? 'Choose from the ' + this.spellGroup : 'Choose a Verse') + '  (' + unit.mp + ' MP)';""")
rep("""    if (this.mode === 'spell') {
      this.cancelMode();
      return;
    }

    // Choosing a target: first tap shows the odds, second tap attacks""","""    if (this.mode === 'spell' || this.mode === 'rest') {
      this.cancelMode();
      return;
    }

    // Choosing a target: first tap shows the odds, second tap attacks""")
rep("    const header = this.mode === 'spell' || this.spellGroup ? this.spellGroup || 'Skills' : '';",
    "    const caster = this.activeUnit && this.activeUnit.maxMp > 0 && !isMelee(this.activeUnit);\n    const header = this.mode === 'spell' || this.spellGroup ? this.spellGroup || (caster ? 'Verses' : 'Skills') : '';")

# 8.12 CT: "Next turn" instead of the bar
rep("""    // CT: how close its next turn is (100 = its turn now)
    const ct = unit === this.activeUnit ? 100 : Math.max(0, Math.min(100, Math.round(unit.ct)));
    bar('CT', ct, 100, 0xe8b04a, String(ct));""","""    // When it acts next (roadmap 8.12): CT, the turn meter, decides it, so the
    // card says how many turns away that is. Nothing for the unit acting now.
    if (unit !== this.activeUnit && unit.alive) {
      const wait = this.turnsUntil(unit);
      items.push(this.add.text(tx, y, 'Next turn', textStyle(S(13), '#d8c8a4')).setOrigin(0, 0.5));
      items.push(this.add.text(w - pad, y, wait === 1 ? 'next' : wait ? 'in ' + wait : 'later', textStyle(S(14), '#e8b04a', { fontStyle: 'bold' })).setOrigin(1, 0.5));
      y += S(19);
    }""")

# 8.13 victory: his two frames, no jump
rep("""        this.showPose(u, poseFrame(u.id, 'victory', 'right') ? 'victory' : 'attack', foeSide); // a victory pose if it has one
        this.tweens.add({ targets: u.idleTargets, y: '-=18', duration: 150, yoyo: true, repeat: 2, ease: 'Sine.easeOut' });""","""        // two frames, no jump (Suleiman 31 Oct, roadmap 8.13): ready, then the victory pose
        const cheer = poseFrame(u.id, 'victory', 'right') ? 'victory' : 'attack';
        this.showPose(u, 'ready', foeSide);
        this.time.delayedCall(260, () => u.alive && this.showPose(u, cheer, foeSide));""")

# 8.14 turn-order numbers and the vertical timeline in landscape
i=s.find("  refreshTurnStrip() {"); j=s.find("  // Top right: the ground and height of the tile in focus", i)
assert i>0 and j>0
s=s[:i]+r'''  // The turn order (roadmap 8.2, 8.14): the unit acting now in his glowing
  // medal, then the next ones. Across the top in portrait; in landscape a
  // column down the left, like Final Fantasy Tactics' Combat Timeline. Each
  // unit also carries its place in the order as a small number over its head.
  refreshTurnStrip() {
    this.turnStripLayer.removeAll(true);
    const { s, m, portrait } = this.lay;
    const y0 = this.stripY;
    let count = 6;
    if (!portrait) {
      // as many as fit above the profile card
      const room = Math.min(this.cardTop, this.lay.H - 200 * s) - m - (y0 + 50 * s);
      count = Math.max(2, Math.min(8, Math.floor(room / (42 * s))));
    }
    const lineup = [this.activeUnit, ...previewTurns(this.units, count)];
    lineup.forEach((unit, i) => {
      const now = i === 0;
      const x = portrait ? (now ? m + 30 * s : m + 96 * s + (i - 1) * 46 * s) : m + 30 * s;
      const y = portrait ? y0 : now ? y0 : y0 + 50 * s + (i - 1) * 42 * s;
      const medal = now
        ? medalPortrait(this, x, y, 27 * s, unit, portraitKey(unit.id, unit), { active: true })
        : portraitMedallion(this, x, y, 18 * s, unit, portraitKey(unit.id, unit), { active: false });
      this.turnStripLayer.add(medal);
      if (!now) {
        // its number, matching the one over its head
        this.turnStripLayer.add(this.add.text(x + (portrait ? 13 : -24) * s, y + (portrait ? -16 : 0) * s, String(i + 1), textStyle(Math.round(13 * s), '#ffe08a', { fontStyle: 'bold' })).setOrigin(0.5));
      }
      if (now) {
        const arrow = this.add.graphics();
        arrow.fillStyle(UI.gold, 1);
        if (portrait) arrow.fillTriangle(x + 40 * s, y, x + 48 * s, y - 7 * s, x + 48 * s, y + 7 * s);
        else arrow.fillTriangle(x, y + 36 * s, x - 7 * s, y + 28 * s, x + 7 * s, y + 28 * s);
        this.turnStripLayer.add(arrow);
      }
    });
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
        u.view.add(u.orderNumber);
      }
      const place = next.indexOf(u);
      const show = u.alive && u !== this.activeUnit && place >= 0;
      u.orderNumber.setVisible(show).setText(show ? String(place + 2) : '');
    }
  }

'''+s[j:]
# the title's underline only makes sense across the top
rep("""    const line = keep(this.add.graphics());
    line.lineStyle(1, UI.bronze, 0.8);
    line.lineBetween(m, this.stripY + S(38), m + S(400), this.stripY + S(38));""","""    const line = keep(this.add.graphics());
    line.lineStyle(1, UI.bronze, 0.8);
    if (this.lay.portrait) line.lineBetween(m, this.stripY + S(38), m + S(400), this.stripY + S(38));""")
open(p,'w').write(s)
print('ok')
