// 1.52: the MP line after Kofi's Infuse. A fighter with no MP of his own who gets Fury or Stone is lent 3 MP for his
// changed move; once he has spent it, the hint used to read "Choose a skill (0 MP from the Verse of Fury)". It now
// says the Verse's MP is spent. Also checks no "+0 MP" or "0 MP from" text is shown after an Infuse in any reading.
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n82.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const kofi = U('h4'), sudeen = U('h1');
  b.endTurn = () => {};
  const texts = () => { const all = [...b.children.list]; for (const o of [...all]) if (o.list) all.push(...o.list); return all.filter((o) => o.type === 'Text' && o.visible).map((o) => o.text); };
  const bad = [];
  for (const el of ['fire', 'earth', 'storm', 'water']) {
    for (const u of b.units) { u.engagedWith = null; u.hasActed = false; u.status.buff = null; u.status.cooldowns = {}; u.mp = u.maxMp; }
    b.placeUnit(kofi, 5, 5); b.placeUnit(sudeen, 5, 6);
    b.reading = () => ({ element: el });
    b.activeUnit = kofi; b.cancelMode(); b.refreshButtons();
    b.onSpellButton(); b.chooseSpell('infuse'); b.handleTap(sudeen.col, sudeen.row); b.handleTap(sudeen.col, sudeen.row);
    for (let i = 0; i < 50; i++) { await sleep(40); for (const t of texts()) if (/\+\s*0\s*MP|\b0 MP from/.test(t)) bad.push(el + ': ' + t); }
    b.busy = false;
  }
  check('no "+0 MP" or "0 MP from" line during or after an Infuse, in any reading', bad.length === 0, bad.slice(0, 3).join(' | '));
  // Sudeen under Fury (from Infuse) spends his lent MP, then opens his skills
  for (const u of b.units) { u.status.buff = null; }
  St.applyBuff(sudeen, 'fury', 1);
  const lent0 = St.lentMp(sudeen);
  b.activeUnit = sudeen; b.cancelMode(); b.refreshButtons(); b.onSpellButton(); b.refreshStatus();
  check('with the lent MP: the line says how much MP the Verse lent', lent0 > 0 && /\(3 MP from the Verse of Fury\)/.test(b.statusText.text), b.statusText.text);
  sudeen.status.buff.lent.mp = 0; b.cancelMode(); b.onSpellButton(); b.refreshStatus();
  check('spent: the line says the Verse\'s MP is spent, not "0 MP"', /MP is spent/.test(b.statusText.text) && !/0 MP from/.test(b.statusText.text), b.statusText.text);
  const real = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', real.length === 0, real.join('|').slice(0, 200));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
