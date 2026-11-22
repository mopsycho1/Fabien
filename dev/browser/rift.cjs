// Films Alagara's plain attack (his slash arc lands with the swing, 22 Nov photo 1768) and Radiant Rift (10.52) on the real board,
// a frame every 60 ms, into <out dir>/attack_*.png and rift_*.png. Run with the preview going: node dev/browser/rift.cjs <out dir>
const { openBattle } = require('./lib/play.cjs');
const fs = require('fs'); const path = require('path');
(async () => {
  const out = process.argv[2] || '/tmp/rift'; fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle('desktop', { lineUp: { hero: ['h5', 'h1', 'h2', 'h3'], enemy: ['e2', 'e4', 'e3', 'e5'], known: ['h1', 'h2', 'h3', 'h4', 'h5', 'e1', 'e2', 'e3', 'e4', 'e5'] } });
  const setup = async (dist, buff) => page.evaluate(({ dist, buff }) => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {}; b.endTurn = () => {}; b.busy = false;
    const a = b.units.find((u) => u.id === 'h5'); const f = b.units.find((u) => u.id === 'e2');
    const far = [[10, 10], [9, 10], [10, 9], [0, 10], [0, 9], [1, 10], [10, 0], [9, 0]];
    b.units.forEach((u, i) => { if (u !== a && u !== f) b.placeUnit(u, ...far[i % far.length]); u.engagedWith = null; });
    b.placeUnit(a, 3, 5); b.placeUnit(f, 3 + dist, 5); f.hp = f.maxHp = 300; a.status = { cooldowns: {} };
    if (buff) window.__statusFns && null;
    b.cameras.main.setZoom(1.6); b.cameras.main.centerOn(a.view.x + dist * 30, a.view.y - 40);
    return true;
  }, { dist, buff });
  const film = async (name, go, n = 26) => {
    await page.evaluate(go);
    for (let i = 0; i < n; i++) { await page.screenshot({ path: path.join(out, name + '_' + String(i).padStart(2, '0') + '.png'), clip: { x: 360, y: 180, width: 720, height: 520 } }); await page.waitForTimeout(60); }
  };
  await setup(1);
  await film('attack', () => { const b = window.__game.scene.getScene('BattleScene'); const a = b.units.find((u) => u.id === 'h5'); const f = b.units.find((u) => u.id === 'e2'); b.busy = true; b.performAttack(a, f, () => { b.busy = false; }); });
  await page.waitForTimeout(1200);
  await setup(4);
  await film('rift', () => { const b = window.__game.scene.getScene('BattleScene'); const a = b.units.find((u) => u.id === 'h5'); const f = b.units.find((u) => u.id === 'e2'); a.status.buff = { id: 'fury', turnsLeft: 3, power: 1 }; b.busy = true; b.castKingSkill(a, f, 'radiantRift', () => { b.busy = false; }); }, 26);
  console.log(errors.length ? 'FAILED ' + errors.join(' / ') : 'ALL PASSED');
  await browser.close();
})();
