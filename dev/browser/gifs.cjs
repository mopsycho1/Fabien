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
const MOVES = {
  // who and foe are unit ids from units.json (h1 Sudeen, h2 Gaha, h3 Layra, e1 Tayo, e3 the archer).
  // skill: the id of the Verse-changed move in spells.json, chosen as the Skills menu would.
  sonic_throw: { who: 'h2', verse: 'swiftness', at: [2, 7], foe: 'e1', foeAt: [6, 7], skill: 'sonicJavelin' },
  sonic_whirl: { who: 'h2', verse: 'swiftness', at: [3, 7], foe: 'e1', foeAt: [5, 7], skill: 'sonicJavelin' },
  sonic_sweep: { who: 'h2', verse: 'swiftness', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'sonicJavelin', offBalance: true },
  shield_ram: { who: 'h1', verse: 'stone', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'shieldRam' },
  furious_charge: { who: 'h1', verse: 'fury', at: [2, 7], foe: 'e1', foeAt: [5, 7], skill: 'furyCharge' },
  tayo_punch: { who: 'e1', at: [4, 7], foe: 'h2', foeAt: [3, 7], attack: true },
  tayo_earth_drive: { who: 'e1', at: [4, 7], foe: 'h2', foeAt: [3, 7], cast: 'earthDrive' },
  archer_shot: { who: 'e3', at: [6, 7], foe: 'h2', foeAt: [2, 7], attack: true },
  archer_shot_away: { who: 'e3', at: [4, 7], foe: 'h2', foeAt: [4, 4], attack: true },
};

(async () => {
  const out = process.argv[2] || '.'; const view = process.argv[3] || 'phone';
  const names = process.argv[4] ? process.argv[4].split(',') : Object.keys(MOVES);
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle(view);
  await page.waitForTimeout(1200);
  const report = [];
  for (const name of names) {
    const move = MOVES[name];
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
      if (move.offBalance) { foe.status.offBalance = true; b.refreshStatusTags(); }
      who.hasActed = false; b.activeUnit = who; b.busy = false; b.cancelMode(); b.refreshButtons && b.refreshButtons();
      b.showStanding(who); b.showStanding(foe);
      if (b.keepInView) b.keepInView(who);
      await sleep(700);

      // ---- film a square round the two of them. The square is fixed to the BOARD, not the
      // screen: the camera may pan during the move, and the picture must not swim with it ----
      const cam = b.cameras.main; const canvas = game.canvas;
      const k2 = canvas.width / game.scale.width; // canvas pixels per game pixel
      const mid = { x: (who.view.x + foe.view.x) / 2, y: (who.view.y + foe.view.y) / 2 - 34 }; // on the board
      const span = Math.max(Math.abs(who.view.x - foe.view.x), Math.abs(who.view.y - foe.view.y));
      const sideBoard = span + 190; // board pixels: both figures, with room for a push behind the foe
      const OUT = 320; const shot = document.createElement('canvas'); shot.width = OUT; shot.height = OUT; const g = shot.getContext('2d');
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
      if (move.skill) {
        b.onSpellButton(); b.chooseSpell(move.skill);
        b.handleTap(foe.col, foe.row); await sleep(60); b.handleTap(foe.col, foe.row);
      } else if (move.cast) {
        b.busy = true; b.castSpell(who, foe, move.cast, () => { b.busy = false; });
      } else {
        b.busy = true; b.performAttack(who, foe, () => { b.busy = false; });
      }
      await idle(12000);
      const tEnd = Date.now(); while (b.time.now < (b.knockUntil || 0) && Date.now() - tEnd < 4000) await sleep(40);
      await sleep(900); // and a moment after, to see it settle
      on = false; game.events.off('postrender', grab);
      const home = { x: who.view.x, y: who.view.y };
      return { frames, track, zoom: cam.zoom, used: window.__lastCast || null, acted: who.hasActed, endOff: Math.hypot(home.x - b.tileCentre(who).x, home.y - b.tileCentre(who).y) };
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
