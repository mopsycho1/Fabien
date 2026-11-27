// The Blender board (Graphics 2.0 step 3, ?map=blender) next to today's board.
//   node dev/browser/board3d.cjs <out dir> [phone|desktop|both]      (with the preview running)
// For each screen and each look (drawn = today's, blender = the render) it:
//   1. photographs the turn view and the whole board (and, for the render, the other 3 camera turns)
//   2. clicks (desktop: real mouse moves over the whole board) and checks each lands on the tile
//      whose picture is on top under the pointer (read from the drawn top-layer pieces)
//   3. taps a blue move tile (phone: a real touch; desktop: a real click) and checks the fighter walks there
//   4. reads the frame rate for 5 seconds in the turn view and the whole board view
//      (THROTTLE=4 slows the processor 4 times, as a cheap phone)
// Ends with ALL PASSED or FAILED.
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');

const cavern = require('../../src/data/maps/cavern.json');
// a tile's top centre in the world at the first camera turn (grid.js tileToScreen)
const tileCentre = (c, r) => ({ x: 360 + (c - r) * 56, y: 400 + (c + r) * 35 - cavern.heights[r][c] * 28 });
const out = process.argv[2] || '.';
const which = process.argv[3] || 'both';
const views = which === 'both' ? ['phone', 'desktop'] : [which];
fs.mkdirSync(out, { recursive: true });

async function fps(page, ms = 5000) {
  return page.evaluate(async (ms) => {
    let frames = 0; const t0 = performance.now();
    await new Promise((res) => { const tick = () => { frames++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    return Math.round((frames * 1000) / (performance.now() - t0));
  }, ms);
}

// a world point -> where it is on the page
async function pagePoint(page, wx, wy) {
  const box = await page.locator('canvas').boundingBox();
  const p = await page.evaluate(([wx, wy]) => {
    const b = window.__game.scene.getScene('BattleScene');
    const cam = b.cameras.main;
    const sx = (wx - cam.worldView.x) * cam.zoom + cam.x;
    const sy = (wy - cam.worldView.y) * cam.zoom + cam.y;
    return { sx, sy, w: b.scale.width, h: b.scale.height };
  }, [wx, wy]);
  return { x: box.x + (p.sx * box.width) / p.w, y: box.y + (p.sy * box.height) / p.h };
}

(async () => {
  let bad = 0;
  const report = [];
  for (const view of views) {
    for (const style of ['drawn', 'blender']) {
      const { browser, page, errors } = await openBattle(view, { map: style });
      if (process.env.THROTTLE) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE) }); }
      const tag = `${style}_${view}`;
      await page.waitForTimeout(800);
      // is the render really on screen (or really not)?
      const on = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        const base = b.boardObjects.find((o) => o.texture && /^board3d:base/.test(o.texture.key));
        const pieces = b.boardObjects.filter((o) => o.texture && /^board3d:top/.test(o.texture.key)).length;
        return { base: !!base, at: base ? [Math.round(base.x), Math.round(base.y), +base.scaleX.toFixed(4)] : null, pieces };
      });
      const shownOk = style === 'blender' ? on.base && on.pieces >= 100 : !on.base;
      if (!shownOk) bad++;
      console.log((shownOk ? 'PASS ' : 'FAIL ') + tag + ' board pictures ' + JSON.stringify(on));
      await page.screenshot({ path: `${out}/${tag}_play.png` });
      const fpsPlay = await fps(page);

      // 3. a real tap on a blue move tile: the fighter must walk to that tile
      const move = await page.evaluate(() => {
        const b = window.__game.scene.getScene('BattleScene');
        const u = b.activeUnit;
        if (b.mode !== 'idle') b.cancelMode();
        b.startMove();
        const keys = [...b.reachableKeys].map((k) => k.split(',').map(Number)).filter(([c, r]) => !(c === u.col && r === u.row) && !b.getUnitAt(c, r));
        // the furthest reachable tile with nothing standing in front of it
        keys.sort((a, z) => (Math.abs(z[0] - u.col) + Math.abs(z[1] - u.row)) - (Math.abs(a[0] - u.col) + Math.abs(a[1] - u.row)));
        return { id: u.id, from: [u.col, u.row], tiles: keys.slice(0, 6) };
      });
      let moved = null;
      for (const [c, r] of move.tiles) {
        const world = tileCentre(c, r); // (the camera has not turned yet)
        // only a tile whose middle is not hidden by a taller tile or a fighter in front
        const clear = await page.evaluate(([c, r, x, y]) => { const b = window.__game.scene.getScene('BattleScene'); const t = b.tileAtPoint(x, y); return !b.getUnitAt(c, r) && t.col === c && t.row === r; }, [c, r, world.x, world.y]);
        if (!clear) continue;
        const p = await pagePoint(page, world.x, world.y);
        const onCanvas = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.tagName === 'CANVAS'; }, [p.x, p.y]);
        if (!onCanvas) continue;
        if (view === 'desktop') await page.mouse.click(p.x, p.y); else await page.touchscreen.tap(p.x, p.y);
        await page.waitForTimeout(2500);
        const now = await page.evaluate((id) => { const u = window.__game.scene.getScene('BattleScene').units.find((x) => x.id === id); return [u.col, u.row]; }, move.id);
        moved = { to: [c, r], now };
        break;
      }
      const moveOk = moved && moved.now[0] === moved.to[0] && moved.now[1] === moved.to[1];
      if (!moveOk) bad++;
      console.log((moveOk ? 'PASS ' : 'FAIL ') + tag + ' tapped a move tile: ' + JSON.stringify(moved));

      // the whole board
      await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); if (b.mode !== 'idle') b.cancelMode(); const cam = b.cameras.main; if (!(b.follow && cam.zoom <= b.home.zoom * 1.04)) b.toggleWholeBoard(); });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${tag}_whole.png` });
      const fpsWhole = await fps(page);

      // 2. clicks over the whole board (desktop: the mouse; the render only): the tile picked must be
      // the tile whose picture is on top under the pointer
      if (view === 'desktop' && style === 'blender') {
        const pts = await page.evaluate(() => {
          const b = window.__game.scene.getScene('BattleScene');
          const pieces = b.boardObjects.filter((o) => o.texture && /^board3d:top/.test(o.texture.key));
          const shown = (x, y) => {
            let top = null;
            for (const o of pieces) {
              const lx = (x - o.x) / o.scaleX, ly = (y - o.y) / o.scaleY;
              if (lx < 0 || ly < 0 || lx >= o.frame.width || ly >= o.frame.height) continue;
              const a = b.textures.getPixelAlpha(Math.floor(lx), Math.floor(ly), o.texture.key, o.frame.name);
              if (a > 200 && (!top || o.depth > top.depth)) top = o;
            }
            return top ? top.frame.name : null;
          };
          const list = [];
          for (let y = 300; y < 1200; y += 14) for (let x = -300; x < 1020; x += 14) {
            const s = shown(x, y);
            if (!s) continue;
            // leave out points within 3 pixels of another tile's picture (edges) or on a fighter
            if ([[-3, 0], [3, 0], [0, -3], [0, 3]].some(([dx, dy]) => shown(x + dx, y + dy) !== s)) continue;
            if (b.figureAt(x, y) || b.units.some((u) => u.alive && b.bodyContains(u, x, y))) continue;
            if (b.sites && b.sites.some((st) => st.sprite && st.sprite.getBounds && st.sprite.getBounds().contains(x, y))) continue;
            list.push({ x, y, s });
          }
          return list;
        });
        let tested = 0, wrong = 0;
        const wrongs = [];
        for (const q of pts) {
          const p = await pagePoint(page, q.x, q.y);
          const onCanvas = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.tagName === 'CANVAS'; }, [p.x, p.y]);
          if (!onCanvas) continue;
          await page.mouse.move(p.x, p.y);
          const t = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.hoverBoard(); return b.hoverTile ? b.hoverTile.col + ':' + b.hoverTile.row : null; });
          tested++;
          if (t !== q.s) { wrong++; if (wrongs.length < 8) wrongs.push({ at: [q.x, q.y], shown: q.s, picked: t }); }
        }
        const ok = tested > 500 && wrong <= tested * 0.005;
        if (!ok) bad++;
        console.log((ok ? 'PASS ' : 'FAIL ') + `${tag} mouse over the board: ${tested - wrong} of ${tested} points picked the tile shown` + (wrongs.length ? ' ' + JSON.stringify(wrongs) : ''));
        report.push({ tag, clicks: [tested - wrong, tested] });
      }

      // the render's other three camera turns
      if (style === 'blender') {
        for (let k = 1; k <= 3; k++) {
          await page.evaluate(() => window.__game.scene.getScene('BattleScene').rotateCamera(1));
          for (let i = 0; i < 60; i++) { await page.waitForTimeout(200); if (!(await page.evaluate(() => window.__game.scene.getScene('BattleScene').rotating))) break; }
          await page.waitForTimeout(700);
          await page.screenshot({ path: `${out}/${tag}_whole_turn${k}.png` });
          const n = await page.evaluate(() => window.__game.scene.getScene('BattleScene').boardObjects.filter((o) => o.texture && /^board3d:/.test(o.texture.key)).length);
          if (n < 100) { bad++; console.log('FAIL ' + tag + ' turn ' + k + ': the render is not on the board'); }
        }
      }
      console.log(`${tag} fps turn view ${fpsPlay}, whole board ${fpsWhole}` + (errors.length ? ' ERRORS ' + errors.slice(0, 2).join(' || ') : ''));
      if (errors.length) bad++;
      report.push({ tag, fpsPlay, fpsWhole });
      await browser.close();
    }
  }
  fs.writeFileSync(`${out}/board3d_report.json`, JSON.stringify(report, null, 1));
  console.log(bad ? 'FAILED' : 'ALL PASSED (pictures in ' + out + ')');
  process.exit(bad ? 1 : 0);
})();
