// Knock-back trace (roadmap 1.68): pushes a fighter in a real browser and logs, every frame, where its
// figure is drawn and whether it can be seen. A figure that vanishes, or jumps more than one tile in one
// frame, fails. Run with the preview up:  node dev/browser/knock_trace.cjs [phone|desktop] [verbose]
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const view = process.argv[2] || 'phone';
  const verbose = process.argv[3] === 'verbose';
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  // pusher and pushed: a hero beside an enemy on open ground, the push goes 2 tiles
  const cases = [{ id: 'h1', at: [5, 5], by: [4, 5], n: 2 }, { id: 'e1', at: [5, 5], by: [5, 4], n: 1 }, { id: 'h2', at: [6, 5], by: [6, 6], n: 2 }];
  let bad = 0;
  for (const c of cases) {
    const res = await page.evaluate(async (c) => {
      const b = window.__game.scene.getScene('BattleScene');
      b.runEnemyTurn = () => {}; b.endTurn = () => {};
      const u = b.units.find((x) => x.id === c.id);
      let n = 0;
      for (const o of b.units) if (o !== u) { o.col = n++; o.row = 10; }
      u.alive = true; u.hp = u.maxHp; u.col = c.at[0]; u.row = c.at[1];
      b.placeEveryone(); b.showStanding(u);
      await new Promise((r) => setTimeout(r, 600));
      const frames = [];
      let on = true;
      const tick = () => {
        if (!on) return;
        const s = u.sprite;
        frames.push({ t: Math.round(performance.now()), x: Math.round(u.view.x), y: Math.round(u.view.y),
          vis: u.view.visible && u.view.alpha > 0.05 && !!s && s.visible && s.alpha > 0.05 && s.active,
          a: +(u.view.alpha * (s ? s.alpha : 0)).toFixed(2), tex: s && s.texture ? s.texture.key : '-', sx: s ? +s.scaleX.toFixed(2) : 0 });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const pushed = b.pushLoser(u, { col: c.by[0], row: c.by[1] }, c.n);
      b.knockBack(u, pushed, (u.col - c.at[0]) - (u.row - c.at[1]) || 1, { text: 'Knocked back!', color: '#ff9a6a' });
      await new Promise((r) => setTimeout(r, 1800));
      on = false;
      return { name: u.name, path: pushed.path.length, frames };
    }, c);
    const f = res.frames;
    let hidden = f.filter((x) => !x.vis).length, maxJump = 0;
    for (let i = 1; i < f.length; i++) maxJump = Math.max(maxJump, Math.hypot(f[i].x - f[i - 1].x, f[i].y - f[i - 1].y));
    const ok = hidden === 0 && maxJump < 30 && res.path > 0;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + res.name + ' pushed ' + res.path + ' tiles: ' + f.length + ' frames, ' + hidden + ' hidden, biggest jump in one frame ' + Math.round(maxJump) + ' px');
    if (verbose || !ok) for (const x of f.slice(0, 60)) console.log('   ', JSON.stringify(x));
  }
  for (const e of errors.slice(0, 5)) console.log('  page error: ' + e);
  await browser.close();
  console.log(bad ? 'FAILED' : 'ALL PASSED');
  process.exit(bad ? 1 : 0);
})();
