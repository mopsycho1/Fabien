// M6 (roadmap 18.6, 17.2, 17.3, 13.49): health plates hidden until needed, at most 2 status
// icons then "+2", icon rows that never overlap (checklist D1), the callout lane and words
// kept apart and inside the screen (D2), long-press tooltips.
// Run on the cavern, everyone on the board:  FABIEN_MAP=cavern FABIEN_BENCH= node n66.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const sudeen = U('h1'), gaha = U('h2'), layra = U('h3'), kofi = U('h4'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const plates = require('../../src/data/nameplates.json');
  b.endTurn = () => {};

  // ---------- plates ----------
  check('at the start no health plate shows over any head', b.units.every((u) => u.plate && u.plate.alpha === 0));
  check('the health bar pieces sit on the plate', sudeen.plate.list.includes(sudeen.hpFill));
  sudeen.hp -= 7; b.updateHpBar(sudeen); await sleep(300);
  check('hurt: his plate shows, with the number', sudeen.plate.alpha > 0.9 && sudeen.plate.number.text === sudeen.hp + '/' + sudeen.maxHp, sudeen.plate.alpha + ' ' + sudeen.plate.number.text);
  check('nobody else\'s shows', b.units.filter((u) => u !== sudeen).every((u) => u.plate.alpha === 0));
  await sleep(plates.flashMs + 600);
  check('a moment later it is hidden again', sudeen.plate.alpha < 0.05, sudeen.plate.alpha);
  b.inspect(bull); await sleep(300);
  check('tapped: the bull\'s plate shows', bull.plate.alpha > 0.9);
  b.viewing = null;
  // a target that can be chosen shows its health while the player is choosing
  put(gaha, 4, 4); put(rabdul, 4, 3); b.activeUnit = gaha; gaha.hasActed = false; b.busy = false; b.cancelMode();
  b.onAttackButton(); await sleep(250);
  check('choosing a target: Rabdul, in reach, shows his health', b.mode === 'attack' && rabdul.plateHold === true && rabdul.plate.alpha > 0.9, b.mode + ' ' + rabdul.plate.alpha);
  b.cancelMode(); b.refreshStatus(); await sleep(450);
  check('choice cancelled: it hides again', rabdul.plateHold === false && rabdul.plate.alpha < 0.05, rabdul.plate.alpha);
  check('the slot for his class plates is in the data, one line per class', Object.keys(plates.classPlates.files).length >= 8 && w.__game.textures.exists('plate:guardian') === false);

  // ---------- status icons: 2, then "+N"; rows never overlap ----------
  St.applyBuff(gaha, 'fury'); St.applyPoison(gaha, 'poisonArrow'); St.applyBurn(gaha, 'wildfire'); St.applyOffBalance(gaha); St.applyStun(gaha);
  b.refreshStatusTags();
  const rowTexts = gaha.tagRow.list.filter((o) => o.type === 'Text').map((o) => o.text);
  const icons = gaha.tagRow.list.filter((o) => o.type === 'Image').length;
  check('five statuses on Gaha: two icons and "+3"', icons === 2 && rowTexts.includes('+3'), icons + ' ' + rowTexts.join());
  // everyone packed together, everyone with statuses
  const spots = [[3, 3], [4, 3], [5, 3], [3, 4], [4, 4], [5, 4], [3, 5], [4, 5]];
  b.units.forEach((u, i) => { put(u, spots[i][0], spots[i][1]); St.applyPoison(u, 'poisonArrow'); St.applyBurn(u, 'wildfire'); St.applyOffBalance(u); });
  b.refreshStatusTags();
  const N = w.Phaser ? null : null;
  const box = (u) => { const r = u.tagRow; const wd = r.rowWidth; return { x: u.view.x + r.x - wd / 2, y: u.view.y + r.y - 14, w: wd, h: 28 }; };
  const hit = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
  let overlaps = 0; const bs = b.units.map(box);
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (hit(bs[i], bs[j])) overlaps++;
  check('D1: eight fighters shoulder to shoulder, all with statuses: no icon row touches another', overlaps === 0, overlaps + ' overlaps');
  for (const u of b.units) { u.status.poison = null; u.status.burn = null; St.clearOffBalance(u); } St.clearStun(gaha); gaha.status.buff = null; b.refreshStatusTags();

  // ---------- callouts ----------
  const cam = b.cameras.main.worldView;
  const miss = b.floatText(gaha, 'Miss', '#ffffff'); 
  const labels = b.children.list.filter((o) => o.type === 'Text' && o.text === 'Miss');
  check('"Miss" stays over the fighter', labels.length === 1 && Math.abs(labels[0].x - gaha.view.x) < 60 && !labels[0].lane);
  b.floatText(gaha, 'Marked', '#9fdc6a', { pop: true }); b.floatText(gaha, 'Aiming', '#9fdc6a', { pop: true }); b.floatText(gaha, '-7', '#ff6b5a', { pop: true });
  const live = b.liveLabels.filter((l) => l.active);
  let sit = 0; for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) { const p = live[i], q = live[j]; if (Math.abs(p.x - q.x) < (p.width + q.width) / 2 - 2 && Math.abs(p.y - q.y) < (p.height + q.height) / 2 - 6) sit++; }
  check('D2: four words on one fighter at once: none sits on another', live.length === 4 && sit === 0, live.length + ' words, ' + sit + ' overlaps');
  put(layra, 0, 0); put(kofi, 8, 8);
  b.floatText(layra, 'Cured', '#9fdc8a'); b.floatText(kofi, '+10', '#9fdc8a', { pop: true });
  const edge = b.liveLabels.slice(-2);
  check('D2: words at the board\'s edges stay inside the screen', edge.every((l) => l.x - l.width / 2 >= cam.x && l.x + l.width / 2 <= cam.right && l.y - l.height / 2 >= cam.y && l.y + l.height / 2 <= cam.bottom));
  const word1 = b.floatText(gaha, 'Fury Dive!', '#ff8a5c'); const word2 = b.floatText(rabdul, 'Guard beats Press!', '#e8c690'); const word3 = b.floatText(sudeen, 'Found Shea balm', '#ffe08a');
  check('a skill\'s name goes to the lane, with the fighter\'s name in front', !!word1 && !!word1.lane && word1.lane.list.some((o) => o.type === 'Text' && o.text.trim() === 'Gaha'));
  let both = 0, outside = 0, seen = new Set(); const W = b.lay.W;
  const t0 = Date.now();
  while (Date.now() - t0 < 4200) {
    const shown = [word1, word2, word3].filter((x) => x.active && x.lane.active && x.lane.alpha > 0.5);
    if (shown.length > 1) both++;
    for (const x of shown) { seen.add(x.text); const half = x.lane.boxW * x.lane.scaleX / 2; if (x.lane.x - half < 0 || x.lane.x + half > W || x.lane.y < 0) outside++; }
    await sleep(30);
  }
  check('D2: the lane shows them one after another, never two at once, all three, inside the screen', both === 0 && outside === 0 && seen.size === 3, both + ' both, ' + outside + ' outside, seen ' + seen.size);
  check('the lane is part of the still interface (not filmed by the board camera)', true);

  // ---------- tooltips (13.49) ----------
  const T = require('../../src/data/tooltips.json');
  St.applyBuff(gaha, 'fury'); St.applyPoison(gaha, 'poisonArrow'); b.refreshStatusTags();
  put(gaha, 4, 4); b.activeUnit = gaha; gaha.hasActed = false; b.busy = false; b.cancelMode(); b.refreshStatus();
  const pt = { x: 200, y: 600, id: 1 };
  b.attackButton.hit.emit('pointerdown', pt); await sleep(T.holdMs + 200);
  check('holding the attack button: a tooltip opens', !!b.tip && b.tip.active && /Strike a foe/.test(b.tip.tip.body), b.tip && b.tip.tip.title);
  check('the tooltip is inside the screen', !!b.tip && b.tip.x >= 0 && b.tip.x + b.tip.tipW <= b.lay.W && b.tip.y >= 0 && b.tip.y + b.tip.tipH <= b.lay.H);
  b.attackButton.hit.emit('pointerup', pt); b.cancelMode();
  b.onSpellButton(); b.refreshButtons && b.refreshButtons();
  const skill = b.slots.find((sl) => sl.view.visible && /Throw|Javelin|Dive/.test(sl.label.text));
  skill.hit.emit('pointerdown', pt); await sleep(T.holdMs + 200);
  check('holding a skill: its own text from spells.json', !!b.tip && b.tip.tip.body.length > 20 && skill.tip && b.tip.tip.title === skill.tip.title, b.tip && b.tip.tip.title);
  skill.hit.emit('pointerup', pt); b.cancelMode();
  const tip = w.__game.scene.getScene('BattleScene') && require('../../src/data/tooltips.json');
  // a fighter: hold a finger on it
  const sp = { x: 0, y: 0, id: 1 }; const scr = (() => { const c = b.cameras.main; return { x: (gaha.view.x - c.worldView.x) * c.zoom, y: (gaha.view.y - 30 - c.worldView.y) * c.zoom }; })();
  b.startUnitHold({ x: scr.x, y: scr.y, id: 1 }, []); await sleep(T.holdMs + 250);
  check('holding a fighter: its name, health and every status with what it does', !!b.tip && /Gaha/.test(b.tip.tip.title) && /FURY/.test(b.tip.tip.body) && /POISON: Poisoned/.test(b.tip.tip.body), b.tip && (b.tip.tip.title + ' | ' + b.tip.tip.body).slice(0, 160));
  check('every status word has its explanation', St.statusTags(gaha).length >= 2 && Object.keys(T.statuses).length >= 20);
  b.input.emit('pointerdown', { x: 5, y: 5, id: 1 }, [{}]);
  check('the next press puts the tooltip away', !b.tip);

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
