// Records moves as GIFs at game speed, in a real browser (size ruler check, roadmap 18.2;
// asked for 13 Nov). Each move is staged on the cavern board, played through the game's own
// buttons, and filmed straight off the game's canvas, frame by frame with the real time of
// each frame, so the GIF plays at the speed the player sees.
// Run with the preview up (npx vite build, then npx vite preview --port 4173):
//   node dev/browser/gifs.cjs <out dir> [phone|desktop] [name,name...]
// It writes <name>.gif and <name>_strip.jpg (every 3rd frame side by side, for a quick look),
// and prints, per move, the biggest sideways jump of the feet between two frames.
// Needs the tools Python for putting the GIF together (~/.fabien-tools/venv/bin/python).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { openBattle } = require('./lib/play.cjs');

// The moves. "set" runs inside the page and stages the board, then starts the move.
// Tiles are on the flat walkway along the near wall of the cavern (row 7), so nothing hides the figures.
// who and foe are unit ids from units.json (h1 Sudeen, h2 Gaha, h3 Layra, e1 Tayo, e2 the bull,
// e3 the archer, e4 Rabdul). One of:
//   skill  : a hero's skill id from spells.json, chosen and confirmed as the player would
//   cast   : any unit's skill id, cast straight at "foe" (or at the tile "tile")
//   attack : a plain attack
//   js     : anything else, as code run in the page with b (the scene), who, foe and done
// verse puts a Verse on "who" first; before is code run after staging (to set a status).
const MOVES = {
  sonic_throw: { who: 'h2', verse: 'swiftness', at: [2, 7], foe: 'e1', foeAt: [6, 7], skill: 'sonicJavelin' },
  sonic_whirl: { who: 'h2', verse: 'swiftness', at: [3, 7], foe: 'e1', foeAt: [5, 7], skill: 'sonicJavelin' },
  sonic_sweep: { who: 'h2', verse: 'swiftness', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'sonicJavelin', before: 'foe.status.offBalance = true;' },
  shield_ram: { who: 'h1', verse: 'stone', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'shieldRam' },
  furious_charge: { who: 'h1', verse: 'fury', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'furyCharge' },
  tayo_punch: { who: 'e1', at: [4, 7], foe: 'h2', foeAt: [3, 7], attack: true },
  tayo_earth_drive: { who: 'e1', at: [4, 7], foe: 'h2', foeAt: [3, 7], cast: 'earthDrive' },
  archer_shot: { who: 'e3', at: [6, 7], foe: 'h2', foeAt: [2, 7], attack: true },
  archer_shot_away: { who: 'e3', at: [4, 7], foe: 'h2', foeAt: [4, 4], attack: true },
};
// Every skill and status effect, for the effects pass (roadmap 18.23, checklist C5):
//   node dev/browser/gifs.cjs <out dir> phone effects
const EFFECTS = {
  lightning: { who: 'h3', at: [3, 7], foe: 'e1', foeAt: [6, 7], attack: true },
  thunderclap: { who: 'h3', at: [3, 7], foe: 'e1', foeAt: [6, 7], attack: true, before: "who.status.buff = { id: 'stone', turnsLeft: 3, power: 1 };" },
  wildfire: { who: 'h3', at: [3, 7], foe: 'e1', foeAt: [6, 7], attack: true, before: "who.status.buff = { id: 'fury', turnsLeft: 3, power: 1 };" },
  verse_swiftness: { who: 'h3', at: [3, 7], foe: 'h2', foeAt: [5, 7], cast: 'swiftness', hold: 1400 },
  verse_stone: { who: 'h3', at: [3, 7], foe: 'h1', foeAt: [5, 7], cast: 'stone', hold: 1400 },
  verse_fury: { who: 'h3', at: [3, 7], foe: 'h2', foeAt: [5, 7], cast: 'fury', hold: 1400 },
  slow: { who: 'h3', at: [3, 7], foe: 'e1', foeAt: [6, 7], cast: 'slow', hold: 1200 },
  husk: { who: 'h3', at: [3, 7], foe: 'e1', foeAt: [4, 7], cast: 'husk', tile: [1, 7] },
  meditate: { who: 'h3', at: [3, 7], foe: 'h2', foeAt: [5, 7], cast: 'meditate' },
  herbs: { who: 'h1', at: [3, 7], foe: 'h2', foeAt: [4, 7], cast: 'herbs', before: 'foe.hp = 12; b.updateHpBar(foe);' },
  spear_throw: { who: 'h2', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'spearThrow' },
  fury_dive: { who: 'h2', verse: 'fury', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'furyDive' },
  intercept: { who: 'h1', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'intercept' },
  blitz: { who: 'h1', verse: 'swiftness', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'blitz' },
  shield_ram: MOVES.shield_ram,
  furious_charge: MOVES.furious_charge,
  sonic_throw: MOVES.sonic_throw,
  sonic_whirl: MOVES.sonic_whirl,
  sonic_sweep: MOVES.sonic_sweep,
  double_hit: { who: 'e4', at: [4, 7], foe: 'h2', foeAt: [3, 7], cast: 'doubleHit' },
  enchant: { who: 'e4', at: [5, 7], foe: 'e1', foeAt: [3, 7], cast: 'enchant', hold: 1400 },
  earth_drive: MOVES.tayo_earth_drive,
  sonic_clap: { who: 'e1', at: [4, 7], foe: 'h2', foeAt: [3, 7], cast: 'clap', before: "b.placeUnit(b.units.find((u) => u.id === 'h1'), 5, 7);" },
  element_blast_fire: { who: 'e1', at: [6, 7], foe: 'h2', foeAt: [3, 7], cast: 'elementBlast', before: "who.status.enchant = { id: 'enchant', damage: 2, turnsLeft: 3 }; b.refreshStatusTags();" },
  element_blast_water: { who: 'e1', at: [6, 7], foe: 'h2', foeAt: [3, 7], cast: 'elementBlast', before: 'who.status.drenched = { turnsLeft: 2 }; b.refreshStatusTags();' },
  shield_toss: { who: 'e2', at: [6, 7], foe: 'h2', foeAt: [3, 7], cast: 'shieldToss' },
  poison_arrow: { who: 'e3', at: [6, 7], foe: 'h2', foeAt: [2, 7], js: "b.castSpell(who, foe, 'poisonArrow', () => setTimeout(() => b.releaseAim(who, done), 500));" },
  melee_hit: { who: 'e4', at: [4, 7], foe: 'h2', foeAt: [3, 7], attack: true },
  tayo_punch: MOVES.tayo_punch,
  archer_shot: MOVES.archer_shot,
  clash: { who: 'h2', at: [3, 7], foe: 'e1', foeAt: [4, 7], js: 'b.performEngage(who, foe, done);' },
  death: { who: 'e4', at: [4, 7], foe: 'h2', foeAt: [3, 7], js: 'foe.hp = 0; b.updateHpBar(foe); b.playDefeat(foe, -1); setTimeout(done, 2600);', revive: true },
  smoke_bomb: { who: 'e3', at: [4, 7], foe: 'h1', foeAt: [3, 7], cast: 'smokeBomb', tile: [6, 7], hold: 1200 },
};
// The three archer fixes of 14 Nov (roadmap 1.45 to 1.47), filmed by name:
//   node dev/browser/gifs.cjs <out dir> phone archer_faces,archer_dagger,archer_invisible
// "wide" films a bigger square (board pixels) centred on "who" instead of between the two.
const FIXES = {
  // she shoots a hero standing on each of her four sides, one after the other
  archer_faces: { who: 'e3', at: [4, 4], foe: 'h2', foeAt: [4, 6], wide: 310,
    js: "const spots = [[4, 6], [2, 4], [4, 2], [6, 4]]; let i = 0; const next = () => { if (i >= spots.length) return done(); b.placeUnit(foe, spots[i][0], spots[i][1]); foe.hp = foe.maxHp; b.updateHpBar(foe); i++; setTimeout(() => b.performAttack(who, foe, () => setTimeout(next, 500)), 350); }; next();" },
  // a hero walks up to her: she draws the dagger; on her turn she stabs him, then steps back
  archer_dagger: { who: 'e3', at: [4, 7], foe: 'h2', foeAt: [1, 7], wide: 420,
    js: "b.busy = false; b.activeUnit = foe; b.moveUnit(foe, 3, 7, () => setTimeout(() => { b.activeUnit = who; who.status.cooldowns = { smokeBomb: 3 }; who.hasActed = false; who.stepsUsed = 0; b.runEnemyTurn(); setTimeout(done, 4200); }, 1100));" },
  // Smoke Bomb: she fades to a faint shape; the hero taps her and opens Attack, and she cannot be chosen
  archer_invisible: { who: 'e3', at: [4, 7], foe: 'h2', foeAt: [3, 7], wide: 400, hold: 600,
    js: "b.castSpell(who, { col: 5, row: 8 }, 'smokeBomb', () => { b.busy = false; b.activeUnit = foe; foe.hasActed = false; b.refreshButtons(); b.markActive && b.markActive(); setTimeout(() => b.handleTap(5, 8), 800); setTimeout(() => { b.cancelMode(); b.startAttack(); }, 2200); setTimeout(() => { b.cancelMode(); b.activeUnit = who; done(); }, 3800); });" },
};

(async () => {
  const out = process.argv[2] || '.'; const view = process.argv[3] || 'phone';
  // the 4th word: nothing = the size-ruler moves, "effects" = every skill and status effect, or a list of names
  const LIST = process.argv[4] === 'effects' || process.env.EFFECTS ? EFFECTS : { ...EFFECTS, ...MOVES, ...FIXES };
  const names = process.argv[4] && process.argv[4] !== 'effects' ? process.argv[4].split(',') : Object.keys(process.argv[4] === 'effects' ? EFFECTS : MOVES);
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  await page.waitForTimeout(1200);
  const report = [];
  for (const name of names) {
    const move = LIST[name];
    if (!move) { console.log('no such move: ' + name); continue; }
    const result = await page.evaluate(async ({ move }) => {
      const game = window.__game; const b = game.scene.getScene('BattleScene');
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const idle = async (max = 9000) => { const t = Date.now(); await sleep(120); while ((b.busy || b.inCinematic) && Date.now() - t < max) await sleep(30); };
      const U = (id) => b.units.find((u) => u.id === id);
      const realEnd = b.__realEnd || (b.__realEnd = b.endTurn); b.endTurn = () => {}; // turns stand still while we film
      // ---- stage the board: everyone fresh, the two actors on their tiles, the rest out of the way ----
      const spots = [[0, 0], [8, 0], [0, 2], [8, 2], [0, 4], [8, 4], [1, 1], [7, 1]]; let k = 0;
      const who = U(move.who), foe = U(move.foe), sage = U('h3');
      for (const u of b.units) {
        if (!u.alive) continue;
        u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null;
        u.status.buff = null; u.status.offBalance = false; u.status.cooldowns = {}; u.aiming = null; u.markedBy = null; u.knockPending = false;
        const at = u === who ? move.at : u === foe ? move.foeAt : spots[k++];
        b.placeUnit(u, at[0], at[1]);
      }
      for (const sp of (b.spikes || []).slice()) if (b.removeSpike) b.removeSpike(sp);
      b.busy = false; b.cancelMode(); b.refreshStatusTags && b.refreshStatusTags();
      // a Verse first, cast by Layra from next to the hero (her own animation is not filmed)
      if (move.verse) {
        sage.mp = sage.maxMp; b.placeUnit(sage, move.at[0], 8); b.activeUnit = sage;
        b.busy = true; await new Promise((res) => b.castSpell(sage, who, move.verse, res)); b.busy = false;
        await sleep(900); await idle();
        b.placeUnit(sage, 0, 6);
      }
      who.accuracy = 999; // a filmed blow should land (the game still caps the chance at 95 in 100)
      if (move.before) { new Function('b', 'who', 'foe', move.before)(b, who, foe); b.refreshStatusTags(); }
      who.hasActed = false; b.activeUnit = who; b.busy = false; b.cancelMode(); b.refreshButtons && b.refreshButtons();
      b.showStanding(who); b.showStanding(foe);
      if (b.keepInView) b.keepInView(who);
      await sleep(700);

      // ---- film a square round the two of them. The square is fixed to the BOARD, not the
      // screen: the camera may pan during the move, and the picture must not swim with it ----
      const cam = b.cameras.main; const canvas = game.canvas;
      const k2 = canvas.width / game.scale.width; // canvas pixels per game pixel
      const mid = move.wide ? { x: who.view.x, y: who.view.y - 34 } : { x: (who.view.x + foe.view.x) / 2, y: (who.view.y + foe.view.y) / 2 - 34 }; // on the board
      const span = Math.max(Math.abs(who.view.x - foe.view.x), Math.abs(who.view.y - foe.view.y));
      const sideBoard = move.wide || span + 190; // board pixels: both figures, with room for a push behind the foe
      const OUT = move.wide ? 440 : 320; const shot = document.createElement('canvas'); shot.width = OUT; shot.height = OUT; const g = shot.getContext('2d');
      const frames = []; const track = []; let last = 0; let on = true;
      const grab = () => {
        if (!on) return;
        const now = performance.now();
        if (now - last < 38) return; // about 25 pictures a second (a GIF cannot show more)
        last = now;
        const side = sideBoard * cam.zoom * k2;
        const sx = (mid.x - cam.worldView.x) * cam.zoom * k2 - side / 2, sy = (mid.y - cam.worldView.y) * cam.zoom * k2 - side / 2;
        g.fillStyle = '#000'; g.fillRect(0, 0, OUT, OUT);
        g.drawImage(canvas, sx, sy, side, side, 0, 0, OUT, OUT);
        frames.push({ at: now, data: shot.toDataURL('image/jpeg', 0.9) });
        // the feet on screen (the sprite's anchor), the picture shown and its size: for the pop check
        const s = who.sprite;
        track.push({ at: now, x: who.view.x, y: who.view.y, key: s.texture.key, h: s.displayHeight, scale: s.scaleY / (who.artScale || 1), col: who.col, row: who.row });
      };
      game.events.on('postrender', grab);
      await sleep(350); // a moment of standing still before the move
      if (!b.__castTagged) { b.__castTagged = true; const o = b.castSpell.bind(b); b.castSpell = (...a) => { window.__lastCast = a[2]; return o(...a); }; }
      window.__lastCast = null;
      // ---- the move, through the game's own controls ----
      let finished = false; const done = () => { finished = true; b.busy = false; };
      const aim = move.tile ? { col: move.tile[0], row: move.tile[1] } : foe;
      if (move.skill) {
        b.onSpellButton(); b.chooseSpell(move.skill);
        b.handleTap(foe.col, foe.row); await sleep(60); b.handleTap(foe.col, foe.row);
        finished = true;
      } else if (move.cast) {
        b.busy = true; b.castSpell(who, aim, move.cast, done);
      } else if (move.js) {
        b.busy = true; new Function('b', 'who', 'foe', 'done', move.js)(b, who, foe, done);
      } else {
        b.busy = true; b.performAttack(who, foe, done);
      }
      { const t = Date.now(); while (!finished && Date.now() - t < 12000) await sleep(40); }
      await idle(12000);
      const tEnd = Date.now(); while (b.time.now < (b.knockUntil || 0) && Date.now() - tEnd < 4000) await sleep(40);
      await sleep(900 + (move.hold || 0)); // and a moment after, to see it settle (longer for a lasting look)
      on = false; game.events.off('postrender', grab);
      const home = { x: who.view.x, y: who.view.y };
      return { frames, track, zoom: cam.zoom, used: window.__lastCast || null, acted: who.hasActed || finished, endOff: Math.hypot(home.x - b.tileCentre(who).x, home.y - b.tileCentre(who).y) };
    }, { move });

    // ---- write the frames, then let Python make the GIF and the strip ----
    const dir = path.join(out, '_frames_' + name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    result.frames.forEach((f, i) => fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.jpg'), Buffer.from(f.data.split(',')[1], 'base64')));
    fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify(result.frames.map((f) => f.at)));
    execFileSync(process.env.HOME + '/.fabien-tools/venv/bin/python', [path.join(__dirname, 'gif_make.py'), dir, path.join(out, name + '.gif'), path.join(out, name + '_strip.jpg')]);
    fs.rmSync(dir, { recursive: true, force: true });
    // the pop check: a frame where the picture changed and the size of the figure jumped by more than 12 percent
    // while it was not being squashed on purpose is listed, with the two pictures
    const pops = [];
    for (let i = 1; i < result.track.length; i++) {
      const p = result.track[i - 1], q = result.track[i];
      if (p.key !== q.key && Math.abs(q.scale - 1) < 0.02 && Math.abs(p.scale - 1) < 0.02 && (q.h / p.h > 1.6 || q.h / p.h < 0.62)) pops.push(p.key.split(':')[1] + ' > ' + q.key.split(':')[1] + ' height x' + (q.h / p.h).toFixed(2));
    }
    const secs = ((result.frames[result.frames.length - 1].at - result.frames[0].at) / 1000).toFixed(1);
    const line = name + (result.used ? ' (' + result.used + ')' : '') + ': ' + result.frames.length + ' frames, ' + secs + ' s, acted ' + result.acted + ', ends ' + result.endOff.toFixed(1) + ' px from its tile middle' + (pops.length ? ' | big height changes: ' + pops.join('; ') : '');
    report.push({ name, ok: result.acted && result.endOff < 0.6, line });
    console.log((result.acted && result.endOff < 0.6 ? 'PASS ' : 'FAIL ') + line);
  }
  if (errors.length) console.log('page errors: ' + errors.slice(0, 3).join(' | '));
  const bad = report.filter((r) => !r.ok).length + errors.length;
  console.log(bad ? 'FAILED' : 'ALL PASSED (' + report.length + ' GIFs in ' + out + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
