// Roadmap 1.61: Gaha's size while he throws Sonic Javelin under Swift, in all four directions. Every frame it notes
// the picture shown, the facing, and the drawn size against the size the picture should have (sprite.scaleX
// against unit.artScale) and against his Swift stance (drawn head height is not read: figures breathe).
// Prints, per direction, the biggest drawn height compared with his Swift battle stance, and any frame where the
// sprite scale is not the picture's scale (SIZE OFF), and fails a Sonic pose drawn over 8 percent taller than the
// stance (before 1.61 the north-east wind-up was 14 percent taller). Ends with ALL PASSED or FAILED.
//   node dev/browser/sonic_sizes.cjs [phone|desktop]     (preview running on 4173)
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const view = process.argv[2] || 'phone';
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  let bad = 0;
  // foe placements around Gaha at (5,5): along +col, -col, +row, -row, 3 tiles away
  for (const [dc, dr] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
    const r = await page.evaluate(async ([dc, dr]) => {
      const b = window.__game.scene.getScene('BattleScene');
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      while (b.busy || b.inCinematic) await sleep(100);
      b.runEnemyTurn = () => setTimeout(() => b.endTurn(), 50);
      const U = (id) => b.units.find((u) => u.id === id);
      const gaha = U('h2'), foe = U('e1');
      const spots = [[0, 0], [10, 0], [0, 10], [10, 10], [0, 1], [10, 1]]; let k = 0;
      for (const u of b.units) { if (!u.alive) continue; u.hp = u.maxHp; u.engagedWith = null; u.hasActed = false; u.hasMoved = false; u.status.cooldowns = {}; const p = u === gaha ? [5, 5] : u === foe ? [5 + dc, 5 + dr] : spots[k++]; b.placeUnit(u, p[0], p[1]); }
      b.busy = true; await new Promise((res) => b.castSpell(U('h3'), gaha, 'swiftness', res, true)); b.busy = false; await sleep(400);
      b.cancelMode(); b.activeUnit = gaha; b.showStanding(gaha); b.refreshButtons(); b.followUnit(gaha, 0, true);
      await sleep(300);
      const ref = gaha.sprite.displayHeight; // his Swift battle stance, as drawn now
      const refKey = gaha.sprite.texture.key;
      const log = []; let on = true;
      const tick = () => { if (!on) return; const s = gaha.sprite; log.push({ key: s.texture.key, facing: gaha.facing, h: s.displayHeight, ratio: s.scaleX / (gaha.artScale || 1) }); requestAnimationFrame(tick); };
      tick();
      gaha.accuracy = 999;
      b.busy = true;
      b.castSpell(gaha, foe, 'sonicJavelin', () => { b.busy = false; });
      const t = Date.now(); while (b.busy && Date.now() - t < 8000) await sleep(50);
      on = false;
      const keys = {};
      for (const f of log) { const kk = f.key.replace(/^h2:/, ''); keys[kk] = Math.max(keys[kk] || 0, f.h / ref); }
      const off = log.filter((f) => Math.abs(f.ratio - 1) > 0.04 && !/fx|whirl|throw_|sweep/.test(f.key));
      const tooBig = Object.entries(keys).filter(([k, v]) => /sonic/.test(k) && v > 1.08).map(([k, v]) => k + ' x' + v.toFixed(2));
      return { tooBig, dir: [dc, dr], facing: log.length ? log[Math.floor(log.length / 3)].facing : '', ref: refKey, tallest: Object.entries(keys).map(([k, v]) => k + ' x' + v.toFixed(2)).join(', '), sizeOff: off.slice(0, 3).map((f) => f.key + ' x' + f.ratio.toFixed(2)) };
    }, [dc, dr]);
    const fail = r.sizeOff.length || r.tooBig.length;
    if (fail) bad++;
    console.log((fail ? 'FAIL ' : 'PASS ') + JSON.stringify(r));
  }
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 2).join(' | ') : 'no page errors');
  console.log(bad || errors.length ? 'FAILED' : 'ALL PASSED');
  await browser.close();
})();
