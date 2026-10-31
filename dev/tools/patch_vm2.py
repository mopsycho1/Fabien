# Verse moves round two (31 Oct): 3.14 Fury Dive, 3.15 Husk gust, 6.15/6.16 Sudeen's frames
p='/home/claude/fabien/src/scenes/BattleScene.js'
s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:80]); s=s.replace(a,b)

# targeting
rep("    const foesOnly = ['hex', 'throw', 'poison', 'toss', 'charge', 'double', 'javelin'].includes(spell.kind);",
    "    const foesOnly = ['hex', 'throw', 'poison', 'toss', 'charge', 'double', 'javelin', 'dive'].includes(spell.kind);")
rep("        u.alive && (spell.kind === 'charge' ? !!this.chargeTile(unit, u, spell) : distance(unit, u) <= this.spellReach(unit, u, spell)) &&",
    "        u.alive && (spell.kind === 'charge' ? !!this.chargeTile(unit, u, spell) : distance(unit, u) <= this.spellReach(unit, u, spell)) &&\n        (spell.kind !== 'dive' || !!this.sweepSpot(unit, u)) && // the dive needs a free tile next to the foe to land on")
rep("['throw', 'toss', 'charge', 'double', 'javelin'].includes(spell.kind) ? 0xe05a47","['throw', 'toss', 'charge', 'double', 'javelin', 'dive'].includes(spell.kind) ? 0xe05a47")
rep("charge: 'red', double: 'red', javelin: 'red',","charge: 'red', double: 'red', javelin: 'red', dive: 'red',")
rep("""    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'javelin') {""","""    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'dive') {
      const t = this.pendingTarget;
      const sp = spells[this.selectedSpell];
      const spot = this.sweepSpot(unit, t);
      const shaken = spot ? this.units.filter((u) => u.alive && u.side !== unit.side && distance(u, spot) === 1).map((u) => u.name) : [];
      text = sp.button + ' on ' + t.name + ': ' + Math.max(1, Math.round(getDamage(unit, t) * sp.damageShare)) + ' damage' + (shaken.length ? ', and ' + shaken.join(' and ') + ' knocked Off-Balance' : '') + '. Uses ' + sp.mp + ' MP.\\nTap again to leap.';
    } else if (this.mode === 'spellTarget' && this.pendingTarget && spells[this.selectedSpell].kind === 'javelin') {""")
rep("    if (spell.kind === 'javelin') return this.castSonicJavelin(caster, target, spell, onDone);",
    "    if (spell.kind === 'javelin') return this.castSonicJavelin(caster, target, spell, onDone);\n    if (spell.kind === 'dive') return this.castFuryDive(caster, target, spell, onDone);")

# the dive
rep("  // ---------- Sonic Javelin (Gaha under a Verse of Swiftness, roadmap 3.6 and 3.11) ----------\n", r'''  // ---------- Fury Dive (Gaha under a Verse of Fury, roadmap 3.14) ----------
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
          verseAura(this, end.x, end.y, 'fury');
          flameBurst(this, target.view.x, target.view.y);
          this.showImpact(user, target, { hit: true, damage: landed.damage, note: landed.note }, target.view.x - end.x, target.hp === 0);
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
''')

# Sudeen's frames in his charges (6.15, 6.16)
rep("""    // the charge: fast steps with after-images, shield up
    play('whoosh');
    const steps = spot.path.map((tile) => {""","""    // the charge: fast steps with after-images, shield up. Furious Charge and
    // Shield Ram use Suleiman's frames (roadmap 6.15, 6.16) where he has them:
    // ready, two charging pictures in turn, then the strike, burst and landing.
    play('whoosh');
    const frameMove = { strike: 'furiousCharge', knockback: 'shieldRam' }[effect];
    const run = frameMove && moveFrames(charger.id, frameMove, target.view.x >= charger.view.x ? 'right' : 'left');
    if (run) this.showFrame(charger, run.frames[0]);
    const steps = spot.path.map((tile, i) => {""")
rep("""          this.faceToward(charger, target.view.x - p.x, target.view.y - p.y);
          this.showPose(charger, 'guard', target.view.x - p.x);
        },""","""          this.faceToward(charger, target.view.x - p.x, target.view.y - p.y);
          if (run) this.showFrame(charger, run.frames[1 + (i % 2)]);
          else this.showPose(charger, 'guard', target.view.x - p.x);
        },""")
rep("""      this.faceToward(charger, dx, target.view.y - charger.view.y);
      this.showPose(charger, 'attack', dx);
      screenShake(this, effect === 'strike' ? 0.009 : 0.006, 160);""","""      this.faceToward(charger, dx, target.view.y - charger.view.y);
      if (!(run && this.playMove(charger, frameMove, dx, { from: 3 }))) this.showPose(charger, 'attack', dx);
      screenShake(this, effect === 'strike' ? 0.009 : 0.006, 160);""")
rep("""    if (steps.length === 0) slam();
    else this.tweens.chain({ targets: charger.view, tweens: steps, onComplete: slam });
  }""","""    const go = () => {
      if (steps.length === 0) slam();
      else this.tweens.chain({ targets: charger.view, tweens: steps, onComplete: slam });
    };
    if (run) this.time.delayedCall(140, go); // a moment in the ready picture first
    else go();
  }""")

# the Husk gust (3.15)
rep("""    this.addDecoy(caster, caster.col, caster.row);
    caster.hidden = true;""","""    this.addDecoy(caster, caster.col, caster.row);
    // Under Swiftness the decoy is wound up with wind: struck, it bursts in a
    // howling gust (roadmap 3.15). Wind swirls at its feet so you can tell.
    const swift = buffOf(caster) && buffOf(caster).id === 'swiftness';
    if (swift) {
      const decoy = this.decoys[this.decoys.length - 1];
      decoy.gust = true;
      swiftAura(this, { view: decoy.view });
    }
    caster.hidden = true;""")
rep("""  popDecoy(decoy) {
    if (!this.decoys.includes(decoy)) return;
    play('spell');""","""  popDecoy(decoy) {
    if (!this.decoys.includes(decoy)) return;
    if (decoy.gust) this.decoyGust(decoy);
    play('spell');""")
rep("""  strikeDecoy(attacker, decoy, onDone) {
    attacker.hasActed = true;
    this.refreshButtons();
    const fake = { isDecoy: true, decoy, view: { x: decoy.view.x, y: decoy.view.y }, centerY: decoy.owner.centerY };
    this.playAttack(attacker, fake, { hit: true, damage: 0 }, false);
    this.time.delayedCall(1100, onDone);
  }""","""  strikeDecoy(attacker, decoy, onDone) {
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
    verseAura(this, decoy.view.x, decoy.view.y, 'swiftness');
    this.floatText({ view: decoy.view, topY: decoy.owner.topY }, 'Gust!', '#9fd4ff', { pop: true, rise: 40 });
    blown.forEach(({ u, pushed }) => {
      const awayX = u.view.x - decoy.view.x;
      if (pushed.path.length) {
        this.floatText(u, 'Blown back!', '#9fd4ff', { rise: 46 });
        this.slideAlong(u, pushed.path);
      } else if (pushed.held) this.floatText(u, 'Held!', '#d9b77a', { rise: 46 });
      this.time.delayedCall(170 * Math.max(1, pushed.path.length) + 60, () => this.showFall(u, pushed.fall, awayX));
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
  }""")
open(p,'w').write(s)
print('ok')
