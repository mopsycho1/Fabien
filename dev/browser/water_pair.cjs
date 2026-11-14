// Side by side GIF of the two waterfall styles in the game (roadmap 1.48): Suleiman's own
// on the left, the Blender loops on the right, on the phone board.
//   node dev/browser/water_pair.cjs <out dir>      (with the preview running)
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  for (const style of ['drawn', 'blender']) {
    const { browser, page } = await openBattle('phone', { water: style });
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('BattleScene'); b.busy = true; b.cancelMode();
      const cam = b.cameras.main; cam.stopFollow && cam.stopFollow();
      const falls = b.children.list.filter((o) => o.texture && /^water:waterfall/.test(o.texture.key)).sort((p, q) => q.y - p.y).slice(0, 2);
      cam.setZoom(Math.max(cam.zoom, 2.2)); cam.centerOn((falls[0].x + falls[1].x) / 2, falls[0].y + 10);
    });
    await page.waitForTimeout(300);
    const dir = path.join(out, '_pair_' + style); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 18; i++) { await page.screenshot({ path: path.join(dir, String(i).padStart(2, '0') + '.png'), clip: { x: 45, y: 300, width: 300, height: 300 } }); await page.waitForTimeout(45); }
    await browser.close();
  }
  const py = "import sys,glob\nfrom PIL import Image,ImageDraw\no=sys.argv[1]\na=sorted(glob.glob(o+'/_pair_drawn/*.png')); b=sorted(glob.glob(o+'/_pair_blender/*.png'))\nfr=[]\nfor x,y in zip(a,b):\n    p=Image.open(x).convert('RGB').resize((300,300)); q=Image.open(y).convert('RGB').resize((300,300))\n    s=Image.new('RGB',(606,324),(16,16,16)); s.paste(p,(0,24)); s.paste(q,(306,24)); d=ImageDraw.Draw(s); d.text((6,6),\"Suleiman's waterfall (in the game now)\",fill=(255,230,120)); d.text((312,6),'Blender loops (waterfall v2)',fill=(255,230,120)); fr.append(s)\nfr[0].save(o+'/waterfall_side_by_side.gif',save_all=True,append_images=fr[1:],duration=110,loop=0)\nprint('ALL PASSED', len(fr), 'frames')";
  console.log(execFileSync(process.env.HOME + '/.fabien-tools/venv/bin/python', ['-c', py, out]).toString().trim());
  for (const style of ['drawn', 'blender']) fs.rmSync(path.join(out, '_pair_' + style), { recursive: true, force: true });
})();
