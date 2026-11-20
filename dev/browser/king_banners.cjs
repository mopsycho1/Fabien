// Roadmap 10.35: the kings' clash banners (Suleiman's 31 Oct "clash sheets", cut in 8.15) show when they clash.
// Opens a clash of each king against a hero in a real browser and checks the banner pair was drawn, then photographs it.
// Run with the preview up:  node dev/browser/king_banners.cjs <out dir> [phone|desktop]
const { openBattle } = require('./lib/play.cjs');
(async () => {
  const out = process.argv[2] || '.';
  const view = process.argv[3] || 'phone';
  const { browser, page, errors } = await openBattle(view, { everyone: true });
  let bad = 0;
  for (const [king, foe] of [['e5', 'h2'], ['h5', 'e1']]) {
    const res = await page.evaluate(async ([kid, fid]) => {
      const b = window.__game.scene.getScene('BattleScene');
      b.runEnemyTurn = () => {}; b.endTurn = () => {};
      const k = b.units.find((u) => u.id === kid), f = b.units.find((u) => u.id === fid);
      const seen = [];
      const o = b.bannerClash.bind(b);
      b.bannerClash = (h, e, ha, fa, done) => { seen.push([ha.key, fa.key].join(' + ')); return o(h, e, ha, fa, done); };
      b.placeUnit(k, 5, 5); b.placeUnit(f, 6, 5);
      await new Promise((r) => setTimeout(r, 300));
      b.clashBanner(k, f, () => {});
      await new Promise((r) => setTimeout(r, 700));
      b.bannerClash = o;
      return { name: k.name, seen, has: Object.keys(b.textures.list).filter((t) => t.startsWith(kid + ':clash/')) };
    }, [king, foe]);
    await page.screenshot({ path: out + '/banner_' + king + '_' + view + '.png' });
    const ok = res.seen.length === 1 && res.seen[0].includes(king + ':clash/') && res.has.length >= 2;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + res.name + "'s banner in a clash: " + (res.seen[0] || 'the plain banner') + ' (loaded: ' + res.has.join(', ') + ')');
    await page.waitForTimeout(2500);
  }
  for (const e of errors.slice(0, 5)) console.log('  page error: ' + e);
  await browser.close();
  console.log(bad || errors.length ? 'FAILED' : 'ALL PASSED');
  process.exit(bad || errors.length ? 1 : 0);
})();
