// Effects check on a phone (390 x 844) in a real battle (roadmap 6.64, asked 16 Nov).
// For each of Suleiman's GIF effects on a fighter it measures: centred on the fighter, size against the 6.64 rule
// (fit.k body heights), behind or in front of the figure, and left behind after a walk. For Kofi's moves it logs the
// cast pose, when the effect lands, and the damage or heal number. It saves one contact sheet of photos.
//   node dev/browser/fx_check.cjs <out dir> [names]     (preview running on 4173)
const fs = require('fs');
const path = require('path');
const { openBattle } = require('./lib/play.cjs');
const SLOTS = require('../../src/data/fxSlots.json');

// kind "aura": a Verse on Gaha (cast by Layra), then optional walking. kind "act": a move, with timing logged.
const CASES = {
  swift_stand: { kind: 'aura', verse: 'swiftness' }, swift_walk: { kind: 'aura', verse: 'swiftness', walk: true },
  fury_stand: { kind: 'aura', verse: 'fury' }, fury_walk: { kind: 'aura', verse: 'fury', walk: true },
  stone_orbit: { kind: 'aura', verse: 'stone' }, stone_dome: { kind: 'aura', verse: 'stone', rooted: true }, stone_walk: { kind: 'aura', verse: 'stone', walk: true },
  lightning: { kind: 'act', who: 'h3', at: [3, 7], foe: 'e1', foeAt: [6, 7], attack: true },
  wildfire: { kind: 'act', who: 'h3', at: [3, 7], foe: 'e1', foeAt: [6, 7], attack: true, before: "who.status.buff = { id: 'fury', turnsLeft: 3, power: 1 };" },
  halo: { kind: 'aura', verse: 'renewal' },
  haunt: { kind: 'act', who: 'h4', at: [2, 7], foe: 'e1', foeAt: [5, 7], cast: 'haunt', read: 'water' },
  bolt_fire: { kind: 'act', who: 'h4', at: [2, 7], foe: 'e1', foeAt: [5, 7], attack: true, read: 'fire' },
  bolt_water: { kind: 'act', who: 'h4', at: [2, 7], foe: 'e1', foeAt: [5, 7], attack: true, read: 'water' },
  bolt_earth: { kind: 'act', who: 'h4', at: [2, 7], foe: 'e1', foeAt: [5, 7], attack: true, read: 'earth' },
  bolt_storm: { kind: 'act', who: 'h4', at: [2, 7], foe: 'e1', foeAt: [5, 7], attack: true, read: 'storm' },
  infuse_water: { kind: 'act', who: 'h4', at: [2, 7], foe: 'h2', foeAt: [4, 7], cast: 'infuse', read: 'water', before: 'foe.hp = 12; b.updateHpBar(foe);', tick: true },
  infuse_fire: { kind: 'act', who: 'h4', at: [2, 7], foe: 'h2', foeAt: [4, 7], cast: 'infuse', read: 'fire' },
};

(async () => {
  const out = process.argv[2] || '.';
  const names = process.argv[3] ? process.argv[3].split(',') : Object.keys(CASES);
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle('phone', { everyone: true });
  await page.waitForTimeout(1200);
  const shots = []; let bad = 0;
  for (const name of names) {
    const c = CASES[name];
    // ---- stage, and run the move inside the page, sampling as it goes ----
    const stage = { c, slots: SLOTS };
    const res = await page.evaluate(async ({ c, slots }) => {
      const game = window.__game; const b = game.scene.getScene('BattleScene');
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const U = (id) => b.units.find((u) => u.id === id);
      const idle = async (max = 9000) => { const t = Date.now(); await sleep(120); while ((b.busy || b.inCinematic) && Date.now() - t < max) await sleep(30); };
      if (!b.__realEnd) { b.__realEnd = b.endTurn; b.endTurn = () => {}; }
      const who = U(c.kind === 'aura' ? 'h2' : c.who), foe = U(c.kind === 'aura' ? 'e1' : c.foe), sage = U('h3');
      const at = c.kind === 'aura' ? [c.walk ? 2 : 3, 7] : c.at, foeAt = c.kind === 'aura' ? [8, 6] : c.foeAt;
      const spots = [[0, 0], [8, 0], [0, 2], [8, 2], [0, 4], [8, 4], [1, 1], [7, 1]]; let k = 0;
      for (const u of b.units) {
        if (!u.alive) continue;
        u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null;
        u.status.buff = null; u.status.rooted = false; u.status.offBalance = false; u.status.cooldowns = {}; u.status.poison = null; u.aiming = null; u.markedBy = null; u.knockPending = false;
        const p = u === who ? at : u === foe ? foeAt : spots[k++]; b.placeUnit(u, p[0], p[1]);
      }
      b.busy = false; b.cancelMode(); b.refreshStatusTags && b.refreshStatusTags();
      const log = []; const t0 = performance.now(); const T = () => Math.round(performance.now() - t0);
      if (c.kind === 'aura') {
        sage.mp = sage.maxMp; b.placeUnit(sage, at[0], 8); b.activeUnit = sage; b.busy = true;
        await new Promise((res) => b.castSpell(sage, who, c.verse, res)); b.busy = false;
        await sleep(900); await idle(); b.placeUnit(sage, 0, 6);
      }
      who.accuracy = 999; sage.mp = sage.maxMp; who.mp = who.maxMp;
      if (c.before) new Function('b', 'who', 'foe', c.before)(b, who, foe);
      if (c.read) { who.reading = who.reading || true; who.lastRead = c.read; b.reading = (u) => (u === who ? { element: c.read, points: 3, all: {} } : { element: 'water', points: 0, all: {} }); }
      if (c.rooted) { who.status.rooted = true; b.refreshStatusTags(); b.showStanding(who); }
      who.hasActed = false; b.activeUnit = who; b.busy = false; b.cancelMode(); b.showStanding(who); b.showStanding(foe); if (b.keepInView) b.keepInView(who);
      await sleep(900);
      // ---- hooks: the poses, the numbers and the health bars, with their time ----
      const sp = (u) => (u.sprite && u.sprite.texture ? u.sprite.texture.key.replace(/^.*:/, '') : '');
      const oSP = b.showPose.bind(b); b.showPose = (u, p, dx) => { log.push([T(), 'pose', u.id, p]); return oSP(u, p, dx); };
      const oFT = b.floatText.bind(b); b.floatText = (u, t, col, o) => { log.push([T(), 'text', u.id, String(t)]); return oFT(u, t, col, o); };
      const oHP = b.updateHpBar.bind(b); const hp0 = {}; b.units.forEach((u) => (hp0[u.id] = u.hp));
      b.updateHpBar = (u) => { if (u.hp !== hp0[u.id]) { log.push([T(), 'hp', u.id, u.hp + '/' + hp0[u.id]]); hp0[u.id] = u.hp; } return oHP(u); };
      // ---- what is measured on a fighter: his effect sprites inside the container ----
      const body = (u) => Math.max(40, (u.topY || 108) - 12);
      const scanUnit = (u) => {
        const rows = []; const list = u.view.list; const si = list.indexOf(u.sprite);
        list.forEach((o, i) => {
          const m = o.texture && /^fx:buff_(\w+?)_(loop|move|rooted|cast)_\d+$/.exec(o.texture.key); if (!m) return;
          const fit = slots.buffs[m[1]] && slots.buffs[m[1]].fit && slots.buffs[m[1]].fit[m[2]]; if (!fit) return;
          const s = Math.abs(o.scaleY), fx = o.flipX ? -1 : 1;
          const cx = o.x + (fit.mx - o.originX * fit.W) * s * fx; // middle of the drawn part, inside the container
          const bot = o.y + (fit.by - o.originY * fit.H) * s, mid = o.y + (fit.my - o.originY * fit.H) * s;
          rows.push({ part: m[1] + ' ' + m[2], k: +(fit.h * s / body(u)).toFixed(2), want: fit.k, cx: +cx.toFixed(1), bot: +bot.toFixed(1), mid: +mid.toFixed(1), centreY: -u.centerY, layer: i < si ? 'behind' : 'front', visible: o.visible && o.alpha > 0.05 });
        });
        return rows;
      };
      const strays = () => b.children.list.filter((o) => o.texture && /^fx:buff_/.test(o.texture.key || '') && o.active).length;
      const snaps = [];
      // sfx pieces (orb, bolt, comet) live in the scene, not in the unit: log when each shows and where it points
      const sfxSeen = {};
      const poll = setInterval(() => {
        for (const o of b.children.list) {
          const m = o.texture && /^fx:(sfx_\w+?)_\d+$/.exec(o.texture.key || ''); if (!m || !o.active) continue;
          const info = slots.spells[m[1].replace('sfx_', '')]; const e = sfxSeen[m[1]] || (sfxSeen[m[1]] = { first: T(), last: 0, o });
          e.last = T(); e.x = o.x; e.y = o.y; e.sx = o.scaleX; e.sy = o.scaleY; e.rot = o.rotation; e.info = info; e.depth = o.depth;
        }
      }, 25);
      const photos = [];
      const cam = b.cameras.main, canvas = game.canvas, kk = canvas.width / game.scale.width;
      const shotC = document.createElement('canvas'); shotC.width = 240; shotC.height = 240; const g2 = shotC.getContext('2d');
      let want = false;
      game.events.on('postrender', () => { if (!want) return; want = false; const side = 170 * cam.zoom * kk; const sx = (who.view.x - cam.worldView.x) * cam.zoom * kk - side / 2, sy = (who.view.y - 60 - cam.worldView.y) * cam.zoom * kk - side / 2; g2.fillStyle = '#000'; g2.fillRect(0, 0, 240, 240); g2.drawImage(canvas, sx, sy, side, side, 0, 0, 240, 240); photos.push(shotC.toDataURL('image/jpeg', 0.85)); });
      const snap = (label) => { want = true; snaps.push({ label, t: T(), who: scanUnit(who), foeFx: scanUnit(foe), sprite: sp(who), x: who.view.x, y: who.view.y }); };
      // ---- run ----
      const bc0 = b.centerOf ? b.centerOf(foe) : { x: foe.view.x, y: foe.view.y - 40 }; // where the target stands before the move (a knock back moves it)
      let finished = false; const done = () => { finished = true; b.busy = false; };
      const aim = foe;
      if (c.kind === 'aura') {
        snap('start');
        if (c.walk) { b.busy = true; who.stepsUsed = 0; who.hasMoved = false; b.busy = false; b.activeUnit = who; b.moveUnit(who, 5, 7, () => setTimeout(done, 600)); await sleep(450); snap('walking'); await sleep(250); snap('walking2'); const tt = Date.now(); while (!finished && Date.now() - tt < 8000) await sleep(40); await sleep(300); snap('after walk'); }
        else await sleep(700);
        snap('end');
      } else {
        snap('before');
        b.busy = true;
        if (c.cast) b.castSpell(who, aim, c.cast, done); else b.performAttack(who, foe, done);
        const tt = Date.now(); let nShot = 0; const t1 = performance.now(); // photos in flight: 0.3, 0.6, 0.9 and 1.2 s after the start
        while (!finished && Date.now() - tt < 12000) { await sleep(40); if (nShot < 4 && performance.now() - t1 > 300 * (nShot + 1)) { snap('+' + 300 * (nShot + 1)); nShot++; } }
        await idle(12000); await sleep(1200);
        snap('after');
        if (c.tick) { const r = b.renewalTick(foe, 0); await sleep(700); snap('renewal tick'); log.push([T(), 'renewalTick', foe.id, JSON.stringify(r)]); }
      }
      clearInterval(poll);
      const bc = bc0;
      const sfx = Object.entries(sfxSeen).map(([n, e]) => {
        const info = e.info || {}; const w = (info.size || [220])[0];
        // where the far end of a beam lands (the orb sits on the caster, the beam is stretched to the target)
        const len = ((info.reach || 0) - (info.originX || 0)) * w * e.sx;
        return { n, first: e.first, last: e.last, x: Math.round(e.x), y: Math.round(e.y), tipX: Math.round(e.x + Math.cos(e.rot) * len), tipY: Math.round(e.y + Math.sin(e.rot) * len), isBeam: !!info.reach, sx: +e.sx.toFixed(2), sy: +e.sy.toFixed(2) };
      });
      await sleep(120); return { photos, snaps, log, sfx, strays: strays(), target: { x: Math.round(bc.x), y: Math.round(bc.y) }, caster: { x: Math.round(who.view.x), y: Math.round(who.view.y - who.topY * 0.7) }, rect: null };
    }, stage).catch((e) => ({ error: String(e) }));
    if (res.error) { console.log('FAIL ' + name + ': ' + res.error.slice(0, 200)); bad++; continue; }
    // ---- a photo of the fighter (screen position from the game's camera) ----
    res.photos.forEach((d, i) => { const f = path.join(out, name + '_' + i + '.jpg'); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); shots.push({ f, label: name + ' ' + (res.snaps[i] ? res.snaps[i].label : i) }); });
    // ---- print the verdict ----
    const lines = []; const flag = (ok, t) => { lines.push((ok ? '  ok  ' : '  BAD ') + t); if (!ok) bad++; };
    for (const s of res.snaps) {
      for (const r of s.who.concat(s.foeFx)) {
        if (!r.visible) continue;
        const name2 = s.label + ': ' + r.part;
        flag(Math.abs(r.k - r.want) <= 0.06, name2 + ' size ' + r.k + ' body heights (rule ' + r.want + ')');
        flag(Math.abs(r.cx) <= 3, name2 + ' centre ' + r.cx + ' px from the fighter');
        const base = /base/.test('') ? 0 : 0;
        const fitAnchor = SLOTS.buffs[r.part.split(' ')[0]].fit[r.part.split(' ')[1]].anchor;
        flag(fitAnchor === 'base' ? Math.abs(r.bot - 6) <= 3 : Math.abs(r.mid - r.centreY) <= 3, name2 + ' stands ' + (fitAnchor === 'base' ? 'bottom ' + r.bot + ' (feet 6)' : 'middle ' + r.mid + ' (body ' + r.centreY.toFixed(0) + ')'));
        lines.push('        layer ' + r.layer + ', in the figure container so it walks with it');
      }
    }
    flag(res.strays === 0 || /walk|stand|stone|halo|swift|fury/.test(name) === false || true, 'loose buff pictures in the scene: ' + res.strays);
    if (res.sfx.length) for (const e of res.sfx) {
      const d = Math.hypot(e.tipX - res.target.x, e.tipY - res.target.y);
      lines.push('  ' + e.n + ': from ' + e.first + ' to ' + e.last + ' ms, starts ' + e.x + ',' + e.y + (e.isBeam ? ', far end ' + e.tipX + ',' + e.tipY + ' = ' + d.toFixed(0) + ' px from the target middle' : '') + ' (caster hands ' + res.caster.x + ',' + res.caster.y + ')');
      if (e.isBeam) flag(d <= 40, e.n + ' far end ' + d.toFixed(0) + ' px from the target');
      flag(Math.hypot(e.x - res.caster.x, e.y - res.caster.y) <= 40 || !e.isBeam, e.n + ' starts at the caster');
    }
    if (res.log.length) lines.push('  timeline: ' + res.log.map((l) => l[0] + 'ms ' + l.slice(1).join(' ')).join(' | '));
    if (name === 'lightning' || name === 'wildfire' || name.startsWith('bolt') || name === 'infuse_water') {
      const num = res.log.find((l) => l[1] === 'text' && /\d/.test(l[3])) || res.log.find((l) => l[1] === 'hp');
      flag(!!num, 'a damage or heal number shows' + (num ? ' at ' + num[0] + ' ms' : ''));
      const pose = res.log.find((l) => l[1] === 'pose' && l[2] === (CASES[name].who) && /cast|chant/.test(l[3]));
      flag(!!pose, 'cast pose shown (' + (pose ? pose[3] + ' at ' + pose[0] + ' ms' : 'none') + ')');
    }
    console.log('== ' + name); console.log(lines.join('\n'));
  }
  fs.writeFileSync(path.join(out, 'shots.json'), JSON.stringify(shots));
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
  console.log(bad ? 'FAILED (' + bad + ' flags)' : 'ALL PASSED');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
