// Fighters side by side on the real board at game size (26 Nov, roadmap 1.112: "the Thief is drawn bigger than everyone else").
// Stands the named fighters on one row of tiles, in one look, photographs them and prints each one's drawn height on screen.
//   node dev/browser/size_row.cjs <out.png> <ids comma separated> [look: standing (default) | battle | a pose name] [zoom]
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const [out, idList, look, zoom] = process.argv.slice(2);
  const ids = idList.split(',');
  const all = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'];
  const hero = ids.slice(0, 4), enemy = all.filter((i) => !hero.includes(i)).slice(0, 4);
  const { browser, page } = await openBattle('desktop', { dsf: 2, lineUp: { hero, enemy: [...new Set([...ids.slice(4), ...enemy])].slice(0, 4), known: all } });
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(([ids, look, zoom]) => {
    const b = window.__game.scene.getScene('BattleScene');
    const park = [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [9, 0], [0, 1], [10, 1]];
    let k = 0;
    // a row of free tiles (the size does not depend on the height of the ground)
    for (const u of b.units) if (!ids.includes(u.id)) { const p = park[k++ % park.length]; b.placeUnit(u, p[0], p[1]); }
    for (const id of ids) { const u = b.units.find((x) => x.id === id); if (u) b.placeUnit(u, 10, 10 - ids.indexOf(id)); }
    let start = null;
    for (let r = 5; r < 9 && !start; r++) for (let c = 1; c + ids.length < 10 && !start; c++) {
      let ok = true;
      for (let i = 0; i < ids.length; i++) if (b.isBlocked(c + i, r)) ok = false;
      if (ok) start = [c, r];
    }
    ids.forEach((id, i) => { const u = b.units.find((x) => x.id === id); if (!u) return; b.placeUnit(u, start[0] + i, start[1]); u.facing = 'downRight'; });
    for (const id of ids) { const u = b.units.find((x) => x.id === id); if (!u) continue; if (look === 'standing') b.showStanding(u); else if (look === 'battle') b.showFrame ? b.showStanding(u) : 0; else b.showPose(u, look, 1); }
    const first = b.units.find((x) => x.id === ids[0]), last = b.units.find((x) => x.id === ids[ids.length - 1]);
    b.manualView = true; b.cameras.main.setZoom(zoom); b.cameras.main.centerOn((first.view.x + last.view.x) / 2, (first.view.y + last.view.y) / 2 - 50);
    return ids.map((id) => { const u = b.units.find((x) => x.id === id); return u ? id + ' ' + u.name + ': drawn ' + Math.round(u.sprite.displayHeight) + ' px tall (picture ' + u.sprite.texture.key.split(':')[1] + ', scale ' + u.sprite.scaleY.toFixed(2) + ', baseScale ' + (u.baseScale || 0).toFixed(2) + ')' : id + ' missing'; });
  }, [ids, look || 'standing', Number(zoom) || 2.2]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: out });
  console.log(rows.join('\n'));
  await browser.close();
})();
