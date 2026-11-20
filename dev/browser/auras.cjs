// 10.37 (20 Nov): where the weapon auras sit, in a real browser. Stages a king on the cavern board and photographs a square
// round him in every facing and pose, with his aura on, so the aura can be judged against the weapon on a contact sheet.
//   node dev/browser/auras.cjs <out dir> [gadara|alagara|both] [phone|desktop]      (with the preview running)
// It writes <out>/aura_<who>_<look>.png: one row per pose, one cell per facing, the crop labelled; and prints how far the
// aura's middle is from the weapon (the "weaponAt" mark in art.json) for every picture that has one: the check for 10.37.
const fs = require('fs');
const { openBattle } = require('./lib/play.cjs');
const LOOKS = {
  gadara: { id: 'e5', looks: [{ name: 'blade', before: "who.grip = 'blade';" }, { name: 'fork', before: "who.grip = 'fork';" }] },
  alagara: { id: 'h5', looks: [{ name: 'swiftness', before: "who.status.buff = { id: 'swiftness', turnsLeft: 4, power: 1 };" }, { name: 'fury', before: "who.status.buff = { id: 'fury', turnsLeft: 4, power: 1 };" }, { name: 'stone', before: "who.status.buff = { id: 'stone', turnsLeft: 4, power: 1 };" }] },
};
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
  const which = !process.argv[3] || process.argv[3] === 'both' ? ['gadara', 'alagara'] : [process.argv[3]];
  const view = process.argv[4] || 'desktop';
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  await page.waitForTimeout(1000);
  const report = {};
  for (const who of which) {
    for (const look of LOOKS[who].looks) {
      const res = await page.evaluate(async ({ id, look }) => {
        const game = window.__game, b = game.scene.getScene('BattleScene');
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        b.endTurn = () => {}; b.busy = false;
        const who = b.units.find((u) => u.id === id);
        let k = 0; for (const u of b.units) if (u !== who) b.placeUnit(u, [0, 8, 0, 8, 0, 8, 1, 7, 2][k++ % 9], [0, 0, 2, 2, 4, 4, 1, 1, 0][k % 9]);
        b.placeUnit(who, 4, 7); b.activeUnit = who; b.cancelMode();
        new Function('b', 'who', look.before)(b, who);
        b.refreshStatusTags(); b.keepInView && b.keepInView(who); await sleep(600);
        const poses = ['stand', 'ready', 'attack', 'windup', 'cleave', 'hookReach', 'hookPull', 'sunder', 'guard', 'hurt'];
        const facings = ['downLeft', 'downRight', 'upLeft', 'upRight'];
        const cam = b.cameras.main, k2 = game.canvas.width / game.scale.width;
        const S = 300; const shots = [];
        for (const pose of poses) for (const facing of facings) {
          who.facing = facing;
          const right = facing.endsWith('Right');
          if (pose === 'stand') b.showStanding(who); else b.showPose(who, pose, right ? 10 : -10);
          await sleep(120);
          const wa = who.drawnAura_blade && who.drawnAura_blade.objects[0]; if (wa && wa.anims) { wa.anims.stop(); wa.setTexture('fx:buff_blade_loop_4'); } // (the brightest frame, so every cell can be judged)
          const p = { x: who.view.x, y: who.view.y - 45 };
          const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
          // the canvas can only be read right after a render, so the picture is taken in the game's own post-render moment
          await new Promise((res) => game.events.once('postrender', () => {
            g.fillStyle = '#222'; g.fillRect(0, 0, S, S);
            const sx = (p.x - cam.worldView.x) * cam.zoom * k2 - S / 2, sy = (p.y - cam.worldView.y) * cam.zoom * k2 - S / 2; // (centre of the crop in canvas pixels, minus half)
            const Z = 150 * k2; g.drawImage(game.canvas, sx + S / 2 - Z / 2, sy + S / 2 - Z / 2, Z, Z, 0, 0, S, S); res(); // (a 150 pixel square of the board, enlarged)
          }));
          shots.push({ pose, facing, key: who.sprite.texture.key, data: c.toDataURL('image/png') });
        }
        who.facing = 'downLeft'; b.showStanding(who);
        return { shots, poses, facings };
      }, { id: LOOKS[who].id, look });
      fs.writeFileSync(out + '/_' + who + '_' + look.name + '.json', JSON.stringify(res.shots.map((s) => ({ pose: s.pose, facing: s.facing, key: s.key }))));
      res.shots.forEach((s, i) => fs.writeFileSync(out + '/_' + who + '_' + look.name + '_' + String(i).padStart(2, '0') + '.png', Buffer.from(s.data.split(',')[1], 'base64')));
      console.log('shot ' + who + ' ' + look.name + ': ' + res.shots.length);
    }
  }
  await browser.close();
  console.log(errors.length ? 'page errors: ' + errors.slice(0, 2).join(' | ') : 'no page errors');
})();
