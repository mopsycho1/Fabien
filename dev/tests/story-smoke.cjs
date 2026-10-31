const { start } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const allTexts = (sc) => { const out = []; const walk = (o) => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; sc.children.list.forEach(walk); return out; };
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const active = () => game.scene.getScenes(true).map((s) => s.sys.settings.key).join(',');
  const S = (k) => game.scene.getScene(k);
  const waitFor = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(20); } return false; };
  check('opens on the title screen', active() === 'StartScene');
  S('StartScene').begin();
  check('tap -> prologue', await waitFor(() => active() === 'DialogueScene' && S('DialogueScene').ready));
  S('DialogueScene').leave();
  check('prologue -> battle (story step 1) with the new line-up', await waitFor(() => active() === 'BattleScene' && S('BattleScene').slots) && S('BattleScene').stepIndex === 1 && S('BattleScene').units.map((u) => u.jobName).join() === 'Guardian,Spearman,Sage,Spearman,Warlord,Ranger');
  const b = S('BattleScene');
  for (const u of b.units.filter((x) => x.side === 'enemy')) { u.hp = 0; b.defeat(u); }
  b.battleOver = true; b.showResult(b.checkBattleEnd());
  await sleep(200);
  await waitFor(() => b.resultButtons.length > 0, 4000);
  check('victory shows Continue', b.resultButtons[0].label.text === 'Continue');
  b.resultButtons[0].hit.emit('pointerdown');
  check('Continue -> the ship scene', await waitFor(() => active() === 'DialogueScene' && S('DialogueScene').sceneId === 'ship'));
  game.scene.start('EffectsLab');
  check('the effects lab still opens', await waitFor(() => active().includes('EffectsLab')));
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no errors', real.length === 0, real.join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
