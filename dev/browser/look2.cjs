// Graphics 2.0 check (18.56 to 18.60): the battle with the new looks off, then on, photographed at the same moment,
// and the frame rate of each (5 seconds of idle board with the breathing, fires and auras running).
// Run with the preview up (npx vite build, then npx vite preview --port 4173):
//   node dev/browser/look2.cjs <out dir> [phone|desktop|both] [looks]
// looks: the ?g2= value for "on" (default all). Writes <view>_off.png, <view>_on.png, <view>_pair.jpg (side by side)
// and prints the frame rates. THROTTLE=4 slows the processor 4 times (about a mid-range phone). Ends with ALL PASSED unless a page error happened or the frame rate fell under
// 80 percent of the plain one.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { openBattle } = require('./lib/play.cjs');

const out = process.argv[2] || 'look2_out';
const which = process.argv[3] || 'both';
const looks = process.argv[4] || 'all';
const views = which === 'both' ? ['phone', 'desktop'] : [which];
fs.mkdirSync(out, { recursive: true });
const base = 'http://localhost:' + (process.env.PORT || 4173) + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stage the same moment: Gaha and Sudeen beside a fire, the camera on them, a Fury aura on one.
async function stage(page) {
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('BattleScene');
    b.runEnemyTurn = () => {};
    const gaha = b.units.find((u) => u.id === 'h2'), sud = b.units.find((u) => u.id === 'h1'), foe = b.units.find((u) => u.side === 'enemy' && u.alive);
    if (gaha) b.placeUnit(gaha, 3, 7);
    if (sud) b.placeUnit(sud, 4, 6);
    if (foe) b.placeUnit(foe, 5, 7);
    for (const u of [gaha, sud, foe]) if (u) b.showStanding(u);
    if (gaha && b.centerCameraOn) b.centerCameraOn(gaha);
  });
}

async function fps(page, ms = 5000) {
  return page.evaluate(async (ms) => {
    let frames = 0; const t0 = performance.now();
    await new Promise((res) => { const tick = () => { frames++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    return Math.round((frames * 1000) / (performance.now() - t0));
  }, ms);
}

(async () => {
  let bad = 0;
  for (const view of views) {
    const res = {};
    for (const mode of ['off', 'on']) {
      process.env.GAME_URL = base + '?g2=' + (mode === 'off' ? 'off' : looks);
      const { browser, page, errors } = await openBattle(view);
      // THROTTLE=4: Chrome slows the processor 4 times, about a mid-range phone (the frame rate check, 18.58)
      if (process.env.THROTTLE) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE) }); }
      await sleep(1500);
      await stage(page);
      await sleep(2500);
      const shot = path.join(out, view + '_' + mode + '.png');
      await page.screenshot({ path: shot });
      res[mode] = await fps(page);
      const lit = await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); return { light: !!(b.fighterLight && b.fighterLight.on), lit: b.units.filter((u) => u.sprite && u.sprite.pipeline && u.sprite.pipeline.name === 'Light2D').length, lights: b.lights && b.lights.lights ? b.lights.lights.length : 0, mood: !!(b.mood && b.mood.on) }; });
      console.log(view, mode, 'fps', res[mode], JSON.stringify(lit), errors.length ? 'ERRORS ' + errors.slice(0, 2).join(' || ') : '');
      if (errors.length) bad++;
      if (mode === 'on' && lit.light) { // Effects: Light turns the lighting off, Full turns it back on (18.58)
        const fx = async () => { await page.evaluate(() => { const b = window.__game.scene.getScene('BattleScene'); b.settingsRows.find((r) => /^Effects/.test(r.text)).emit('pointerdown'); }); await sleep(400); return page.evaluate(() => !!window.__game.scene.getScene('BattleScene').fighterLight.on); };
        const offNow = await fx(), backOn = await fx();
        const ok = !offNow && backOn;
        if (!ok) bad++;
        console.log((ok ? 'PASS ' : 'FAIL ') + view + ' Effects Light turns the fighter lighting off, Full turns it on', JSON.stringify({ offNow, backOn }));
      }
      await browser.close();
    }
    if (res.on < res.off * 0.8) { bad++; console.log('FAIL', view, 'frame rate fell', res.off, '->', res.on); }
    try {
      execFileSync(process.env.HOME + '/.fabien-tools/venv/bin/python', ['-c', `
from PIL import Image
a=Image.open('${path.join(out, view + '_off.png')}').convert('RGB'); b=Image.open('${path.join(out, view + '_on.png')}').convert('RGB')
s=Image.new('RGB',(a.width+b.width+8,max(a.height,b.height)),(0,0,0)); s.paste(a,(0,0)); s.paste(b,(a.width+8,0)); s.save('${path.join(out, view + '_pair.jpg')}',quality=85)`]);
    } catch (e) { console.log('pair sheet failed', e.message); }
  }
  console.log(bad ? 'FAILED ' + bad : 'ALL PASSED');
  process.exit(bad ? 1 : 0);
})();
