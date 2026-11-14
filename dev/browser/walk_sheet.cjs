// Walk sheets (Battle 1.0 checklist A1, roadmap 18.13): every fighter walks 2 tiles in each of
// the four directions on the cavern's platform; the figure is photographed 8 times on the way
// (the picture follows it). One sheet per fighter: 4 rows (down-right, up-left, down-left,
// up-right), 8 frames each, the last one after it has stopped.
//   node dev/browser/walk_sheet.cjs <out dir> [phone|desktop]     (with the preview running)
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; const view = process.argv[3] || 'phone'; fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  const ids = await page.evaluate(() => window.__game.scene.getScene('BattleScene').units.map((u) => u.id));
  let bad = 0;
  for (const id of ids) {
    const rows = await page.evaluate(async (id) => {
      const game = window.__game; const b = game.scene.getScene('BattleScene'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      b.endTurn = () => {}; b.runEnemyTurn = () => {};
      const who = b.units.find((u) => u.id === id);
      const spots = [[0, 0], [8, 0], [0, 8], [8, 8], [0, 2], [8, 2], [1, 1], [7, 1]]; let k = 0;
      for (const u of b.units) if (u !== who) b.placeUnit(u, spots[k][0], spots[k++][1]);
      const cam = b.cameras.main; const canvas = game.canvas; const k2 = canvas.width / game.scale.width;
      const OUT = 150; const shot = document.createElement('canvas'); shot.width = OUT; shot.height = OUT; const g = shot.getContext('2d');
      const grab = () => {
        const side = 150 * cam.zoom * k2; // board pixels round the figure
        const sx = (who.view.x - cam.worldView.x) * cam.zoom * k2 - side / 2, sy = (who.view.y - 45 - cam.worldView.y) * cam.zoom * k2 - side / 2;
        g.fillStyle = '#000'; g.fillRect(0, 0, OUT, OUT); g.drawImage(canvas, sx, sy, side, side, 0, 0, OUT, OUT);
        return shot.toDataURL('image/jpeg', 0.9);
      };
      const rows = [];
      // the platform in the middle is flat: from its middle, 1 tile each way and back
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        b.placeUnit(who, 4 - dc, 4 - dr); who.stepsUsed = 0; who.hasMoved = false; who.moveFrom = null; who.status.buff = null;
        b.busy = false; b.cancelMode(); b.activeUnit = who; b.showStanding(who); await sleep(350);
        const frames = []; let done = false;
        b.moveUnit(who, 4 + dc, 4 + dr, () => { done = true; });
        const t0 = performance.now();
        for (let i = 0; i < 7; i++) { while (performance.now() - t0 < 25 + i * 55) await new Promise((r) => requestAnimationFrame(r)); frames.push(grab()); }
        const t1 = Date.now(); while (!done && Date.now() - t1 < 3000) await sleep(20);
        await sleep(450); await new Promise((r) => requestAnimationFrame(r)); frames.push(grab()); // (right after a frame is drawn: the canvas is blank between frames)
        rows.push({ frames, angle: who.sprite ? who.sprite.angle : 0, leftovers: who.sandRide ? 1 : 0 });
      }
      return rows;
    }, id);
    const dir = path.join(out, '_walk_' + id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    rows.forEach((row, r) => row.frames.forEach((f, i) => fs.writeFileSync(path.join(dir, r + '_' + i + '.jpg'), Buffer.from(f.split(',')[1], 'base64'))));
    const py = "import sys\nfrom PIL import Image,ImageDraw\nd,o=sys.argv[1],sys.argv[2]\ns=Image.new('RGB',(8*150+90,4*150),(20,20,20)); dr=ImageDraw.Draw(s)\nfor r,n in enumerate(['down-right','up-left','down-left','up-right']):\n    dr.text((4,r*150+70),n,fill=(255,230,120))\n    for i in range(8): s.paste(Image.open('%s/%d_%d.jpg'%(d,r,i)),(90+i*150,r*150))\ns.save(o,quality=88)";
    execFileSync(process.env.HOME + '/.fabien-tools/venv/bin/python', ['-c', py, dir, path.join(out, 'walk_' + id + '.jpg')]);
    fs.rmSync(dir, { recursive: true, force: true });
    const ok = rows.every((r) => Math.abs(r.angle) < 0.01 && !r.leftovers);
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + id + ': 4 walks, upright and nothing left on it after each');
  }
  if (errors.length) console.log('page errors: ' + errors.slice(0, 3).join(' | '));
  console.log(bad || errors.length ? 'FAILED' : 'ALL PASSED (sheets in ' + out + ')');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
