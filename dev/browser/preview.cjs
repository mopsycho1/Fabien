// Skill previews (roadmap 18.4, checklist G4): one picture per skill of what the board shows
// after the first tap, before the second confirms. Run with the preview server up:
//   node dev/browser/preview.cjs <out dir> [phone|desktop]
// It writes preview_<skill>.png and one sheet, preview_sheet.jpg (needs the tools Python).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { openBattle } = require('./lib/play.cjs');
const SCENES = [
  ['sonic_throw', 'h2', [2, 7], 'e1', [6, 7], 'swiftness', 'sonicJavelin'],
  ['sonic_whirl', 'h2', [3, 7], 'e1', [5, 7], 'swiftness', 'sonicJavelin'],
  ['sonic_sweep', 'h2', [2, 7], 'e1', [5, 7], 'swiftness', 'sonicJavelin', 'foe.status.offBalance = true;'],
  ['shield_ram', 'h1', [2, 7], 'e1', [5, 7], 'stone', 'shieldRam'],
  ['shield_ram_fall', 'h1', [3, 4], 'e1', [5, 4], 'stone', 'shieldRam'],
  ['blitz', 'h1', [2, 7], 'e1', [5, 7], 'swiftness', 'blitz'],
  ['intercept', 'h1', [2, 7], 'e1', [5, 7], null, 'intercept'],
  ['fury_dive', 'h2', [2, 7], 'e1', [5, 7], 'fury', 'furyDive'],
  ['spear_throw', 'h2', [2, 7], 'e1', [5, 7], null, 'spearThrow'],
  ['husk', 'h3', [3, 7], 'e1', [4, 7], null, 'husk'],
];
(async () => {
  const out = process.argv[2] || '.'; const view = process.argv[3] || 'phone';
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openBattle(view);
  await page.waitForTimeout(1000);
  let bad = 0; const shots = [];
  for (const [name, whoId, at, foeId, foeAt, verse, skill, before] of SCENES) {
    const info = await page.evaluate(async ({ whoId, at, foeId, foeAt, verse, skill, before }) => {
      const b = window.__game.scene.getScene('BattleScene');
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      b.endTurn = () => {};
      const U = (id) => b.units.find((u) => u.id === id);
      const who = U(whoId), foe = U(foeId), sage = U('h3');
      const spots = [[0, 0], [8, 0], [0, 2], [8, 2], [0, 4], [8, 4]]; let k = 0;
      for (const u of b.units) {
        u.hp = u.maxHp; u.engagedWith = null; u.engagement = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null;
        u.status.buff = null; u.status.offBalance = false; u.status.cooldowns = {};
        const t = u === who ? at : u === foe ? foeAt : spots[k++]; b.placeUnit(u, t[0], t[1]);
      }
      b.busy = false; b.cancelMode();
      if (verse) { sage.mp = sage.maxMp; b.activeUnit = sage; b.busy = true; await new Promise((res) => b.castSpell(sage, who, verse, res)); b.busy = false; await sleep(1300); }
      if (before) new Function('b', 'who', 'foe', before)(b, who, foe);
      who.hasActed = false; if (who.maxMp) who.mp = who.maxMp; b.activeUnit = who; b.busy = false; b.cancelMode(); b.refreshButtons(); b.refreshStatusTags();
      if (b.keepInView) b.keepInView(who);
      await sleep(500);
      b.onSpellButton(); b.chooseSpell(skill);
      if (skill === 'husk') { const [c, r] = [...b.reachableKeys].map((q) => q.split(',').map(Number)).sort((p, q) => p[0] - q[0])[0]; b.handleTap(c, r); }
      else b.handleTap(foe.col, foe.row);
      await sleep(350);
      const p = b.previewPlan;
      return p ? { label: p.label, end: p.end ? p.end.col + ',' + p.end.row : null, hits: p.hits.length, pushes: p.pushes.map((q) => q.to.col + ',' + q.to.row + (q.levels ? ' fall ' + q.levels : '') + (q.slam ? ' slam' : '')), drawn: b.previewItems.length } : null;
    }, { whoId, at, foeId, foeAt, verse, skill, before: before || null });
    const file = path.join(out, 'preview_' + name + '.png');
    await page.screenshot({ path: file }); shots.push(file);
    await page.evaluate(() => window.__game.scene.getScene('BattleScene').cancelMode());
    if (!info || !info.drawn) bad++;
    console.log((info && info.drawn ? 'PASS ' : 'FAIL ') + name + ': ' + JSON.stringify(info));
  }
  if (errors.length) { bad++; console.log('page errors: ' + errors.slice(0, 2).join(' | ')); }
  try {
    execFileSync(process.env.HOME + '/.fabien-tools/venv/bin/python', ['-c', `
import sys
from PIL import Image
files = sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
w = 380; ims = [i.resize((w, int(i.height * w / i.width))) for i in ims]
per = 5; rows = (len(ims) + per - 1) // per; h = ims[0].height
sheet = Image.new('RGB', (per * w, rows * h), (0, 0, 0))
for k, i in enumerate(ims): sheet.paste(i, ((k % per) * w, (k // per) * h))
sheet.save(sys.argv[1], quality=85)`, path.join(out, 'preview_sheet.jpg'), ...shots]);
  } catch (e) { console.log('(no sheet: ' + e.message.split('\n')[0] + ')'); }
  console.log(bad ? 'FAILED' : 'ALL PASSED (' + SCENES.length + ' pictures and preview_sheet.jpg in ' + out + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
