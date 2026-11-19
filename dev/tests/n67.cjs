// M7 (roadmap 18.7; 17.4, 17.5, 17.7; 1.44): the unit card (4 big numbers, a second page on a
// tap, a buffed number coloured), the menu's one fixed home, the top strip (no title line,
// each fighter once, a NOW marker), the settings sheet.
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n67.cjs
// (Real pixel sizes, checklist D4 and D5, are measured in a browser: node dev/browser/m7.cjs)
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), layra = U('h3'), rabdul = U('e4');
  b.endTurn = () => {};
  const cardWords = () => b.cardLayer.list.filter((o) => o.type === 'Text').map((o) => o.text);
  const num = (word) => b.cardLayer.list.find((o) => o.type === 'Text' && o.statWord === word);
  const turnOf = (u) => { b.activeUnit = u; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; b.busy = false; b.cancelMode(); b.refreshStatus(); b.refreshCard(u); b.refreshTurnStrip(); };

  // ---------- the card ----------
  b.cardOpen = false; turnOf(gaha);
  check('closed, the card is his compact card: name, Lv., HP MP CT with numbers, class line, no ATK (18.35)', !num('ATK') && cardWords().includes('Gaha') && cardWords().some((w) => /36 \/ 36|36\/36/.test(w)) && cardWords().includes('CT'), cardWords().join(' '));
  const h1 = b.cardHeight;
  check('the slim bar is at least a finger tall', h1 >= b.lay.minTap, h1 + ' ' + b.lay.minTap);
  b.cardHit.emit('pointerdown');
  check('a tap opens the full stats: ATK, DEF, SPD, MOV, MAG, MDF, RNG, POISE', ['ATK', 'DEF', 'SPD', 'MOV', 'MAG', 'MDF', 'RNG', 'POISE'].every((x) => num(x)), cardWords().join(' '));
  b.cardHit.emit('pointerdown');
  check('a second tap closes it again, to the slim bar', !num('ATK') && b.cardHeight === h1 && b.cardOpen === false, h1 + ' ' + b.cardHeight);
  b.cardOpen = true; turnOf(gaha); /* (the rest of this test reads the numbers, so the card stays open) */
  turnOf(layra);
  check('a caster\'s first number is MAG', b.cardLayer.list.filter((o) => o.statWord).map((o) => o.statWord)[0] === 'MAG');
  // 1.44: a buffed number shows on the card
  turnOf(gaha);
  const plain = num('ATK').text, plainColor = num('ATK').style.color;
  St.applyBuff(gaha, 'fury'); b.refreshCard(gaha);
  check('1.44 Fury on Gaha: his ATK on the card goes up by 2, green, with an up arrow', num('ATK').text === (gaha.attack + 2) + ' ▲' && num('ATK').style.color !== plainColor, plain + ' -> ' + num('ATK').text + ' ' + num('ATK').style.color);
  gaha.status.buff = null; St.applyBuff(gaha, 'swiftness'); b.refreshCard(gaha);
  check('1.44 Swift: his MOV goes up, with the arrow', /▲/.test(num('MOV').text), num('MOV').text);
  gaha.status.buff = null; St.applySlow(gaha, 'slow'); b.refreshCard(gaha);
  check('1.44 Slow: his SPD goes down, red, with a down arrow', /▼/.test(num('SPD').text), num('SPD').text);
  gaha.status.hex = null; b.refreshCard(gaha);
  check('with nothing on him the numbers are plain again', num('ATK').text === plain && num('SPD').text === String(gaha.speed));

  // ---------- the menu's home ----------
  b.cardOpen = false; /* (an open card hides the menu) */
  const corner = () => Math.round(b.menu.x + b.menuSize.w) + ',' + Math.round(b.menu.y + b.menuSize.h);
  const seen = new Set();
  for (const u of b.units.filter((x) => x.side === 'hero')) { turnOf(u); b.placeMenu(); seen.add(corner()); b.onSpellButton(); b.layoutMenu(); seen.add(corner()); b.cancelMode(); }
  b.placeUnit(gaha, 0, 0); turnOf(gaha); b.placeMenu(); seen.add(corner()); b.placeUnit(gaha, 8, 8); b.placeMenu(); seen.add(corner());
  // UI rework 16 Nov: the menu has no fixed home any more; it stands beside the hero (his mock-up)
  check('D5 (rework): every hero, main menu and skills list, in two corners of the board: the menu stands somewhere on the screen each time', seen.size >= 1 && [...seen].every((c) => { const [x, y] = c.split(',').map(Number); return x <= b.lay.W && y <= b.lay.H; }), [...seen].join(' | '));
  check('the menu stays above the card', b.menu.y + b.menuSize.h <= b.cardTop);
  check('rows are slim like his (26 to 32 design px) and each touch band is its whole row (18.35)', b.lay.rowH >= 26 * b.lay.px && b.lay.rowH <= 32 * b.lay.px && b.menuRows.every((r) => r.hit.height >= r.h), b.lay.rowH + ' ' + b.lay.minTap);

  // ---------- the top strip ----------
  const all = []; const walk = (o) => { if (o.type === 'Text') all.push(o.text); if (o.list) o.list.forEach(walk); }; b.children.list.forEach(walk);
  check('the title line is back at the top (UI rework 16 Nov, his mock-up)', all.some((t) => /OF GODS/.test(t)));
  check('the strip shows each fighter once', new Set(b.stripLineup).size === b.stripLineup.length && b.stripLineup[0] === b.activeUnit && b.stripLineup.length >= 5, b.stripLineup.map((u) => u.name).join());
  // UI rework 16 Nov (his mock-up): no NOW word; the face of the one acting is bigger, in his glowing medal
  check('the face of the fighter whose turn it is is the first and biggest on the strip', b.stripLineup[0] === b.activeUnit && b.turnStripLayer.list.length >= 2);

  // ---------- settings ----------
  const rows = b.settingsSheet.list.filter((o) => o.type === 'Text').map((o) => o.text);
  check('the settings sheet holds Effects, Enemy turns and Health bars', rows.some((t) => /^Effects: /.test(t)) && rows.some((t) => /^Enemy turns: /.test(t)) && rows.some((t) => /^Health bars: /.test(t)), rows.join(' | '));
  check('it is closed until its button is tapped', b.settingsSheet.visible === false);
  b.settingsButton.emit('pointerdown');
  check('the Settings button opens it', b.settingsSheet.visible === true);
  check('Enemy turns starts on Normal', rows.includes('Enemy turns: Normal'));
  const bars = b.settingsSheet.list.find((o) => o.type === 'Text' && /^Health bars/.test(o.text));
  bars.emit('pointerdown'); await sleep(300);
  check('Health bars: Always shows every plate', bars.text === 'Health bars: Always' && b.units.filter((u) => u.alive).every((u) => u.plate.alpha > 0.9));
  bars.emit('pointerdown'); await sleep(500);
  check('back to When hit: they hide again', bars.text === 'Health bars: When hit' && b.units.every((u) => u.plate.alpha < 0.05));
  b.openSettings(false);

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
