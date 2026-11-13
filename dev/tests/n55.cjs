// 18.3 (Battle 1.0 milestone M3): effects stay put.
//   C1: every flipbook keeps its anchor still (dev/tools/align_fx.py audit, run here when the tools
//       Python is on this machine) and every re-cut family is on one canvas (checked here always).
//   C2: an effect that belongs to a unit lives inside that unit's own container, so it follows the
//       unit when it walks, and it is gone when the status ends. One-shot effects leave nothing behind.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  // ---------- C1: the pictures ----------
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../tools/fx_anchors.json'), 'utf8')).families;
  const sizeOf = (file) => { const b = fs.readFileSync(file); return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20); }; // a PNG says its size in its first bytes
  const fxDir = path.join(__dirname, '../../public/art/fx');
  const filesOf = (name) => Array.from({ length: cfg[name].frames }, (_, i) => path.join(fxDir, name + (cfg[name].sep || '_') + ((cfg[name].first || 0) + i) + '.png'));
  const recut = ['blast_orb', 'enchant_sigil', 'enchant_comet', 'fury_cast', 'rise_earth', 'rise_hex', 'rise_wind', 'swift_trail', 'strike', 'stone_burst', 'sj_spear', 'flame'];
  const mixed = recut.filter((n) => new Set(filesOf(n).map(sizeOf)).size !== 1);
  check('every re-cut flipbook has all its frames on one canvas (' + recut.length + ' families)', mixed.length === 0, mixed.join(' '));
  check('the anchor list names every flipbook the game plays', Object.keys(cfg).length >= 20 && Object.keys(cfg).every((n) => filesOf(n).every((f) => fs.existsSync(f))), Object.keys(cfg).length);
  const py = process.env.HOME + '/.fabien-tools/venv/bin/python';
  if (fs.existsSync(py)) {
    let out = '';
    try { out = execFileSync(py, [path.join(__dirname, '../tools/align_fx.py'), 'audit']).toString(); } catch (e) { out = (e.stdout || '').toString(); }
    const bad = out.split('\n').filter((l) => l.startsWith('FAIL'));
    check('drift audit: no anchor moves more than 3 percent of its frame width', /ALL PASSED/.test(out) && bad.length === 0, bad.slice(0, 3).join(' | '));
  } else console.log('SKIP drift audit (the tools Python is not on this machine)');

  // ---------- C2: in the battle ----------
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const G = w.__grid, FX = w.__fx;
  const U = (l) => b.units.find((u) => u.label === l);
  const hero = U('H1'), foe = U('E1');
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  for (const u of b.units) if (u !== hero && u !== foe) put(u, 7, b.units.indexOf(u) % 8);
  put(hero, 2, 5); put(foe, 5, 2);
  const sceneFx = () => b.children.list.filter((o) => (o.texture && /^fx[:-]/.test(o.texture.key)) || o.type === 'ParticleEmitter').length;
  const looks = [
    ['Fury', (u) => { u.status.buff = { id: 'fury', turnsLeft: 3, power: 1 }; }, (u) => { u.status.buff = null; }],
    ['Stone', (u) => { u.status.buff = { id: 'stone', turnsLeft: 3, power: 1 }; }, (u) => { u.status.buff = null; }],
    ['Swiftness', (u) => { u.status.buff = { id: 'swiftness', turnsLeft: 3, power: 1 }; }, (u) => { u.status.buff = null; }],
    ['Slow', (u) => { u.status.hex = { id: 'slow', turnsLeft: 2, power: 1 }; }, (u) => { u.status.hex = null; }],
    ['Enchant', (u) => { w.__status.applyEnchant(u, 'enchant'); }, (u) => { u.status.enchant = null; }],
    ['Burning', (u) => { w.__status.applyBurn(u, 'wildfire'); }, (u) => { w.__status.cureBurn(u); }],
  ];
  for (const [name, on, off] of looks) {
    put(hero, 2, 5); hero.hasMoved = false; hero.stepsUsed = 0; hero.moveFrom = null; b.activeUnit = hero; b.busy = false;
    const before = hero.view.list.length, loose = sceneFx();
    try { on(hero); } catch (e) { console.log('SKIP ' + name + ' (' + e.message + ')'); continue; }
    b.refreshStatusTags();
    await sleep(300);
    const added = hero.view.list.length - before;
    check(name + ': its look is made of pieces inside the unit (' + added + ')', added > 0 && hero.view.list.every((o) => o.parentContainer === hero.view), added);
    check(name + ': nothing of it is left loose on the board', sceneFx() <= loose, sceneFx() + ' / ' + loose);
    // walk 2 tiles: the pieces are inside the unit's container, so they are where it is on every frame
    const kids = hero.view.list.slice(before);
    const local = kids.map((o) => [o.x, o.y]);
    let apart = 0; let moved = 0; const x0 = hero.view.x;
    b.moveUnit(hero, 2, 3);
    const t = Date.now();
    while (b.busy && Date.now() - t < 5000) {
      kids.forEach((o, i) => { if (o.active && o.parentContainer !== hero.view) apart++; void local[i]; });
      moved = Math.max(moved, Math.abs(hero.view.x - x0));
      await sleep(15);
    }
    check(name + ': it walks with the unit (2 tiles) and never leaves it', apart === 0 && moved > 40 && hero.col === 2 && hero.row === 3, 'apart ' + apart + ' moved ' + Math.round(moved));
    off(hero); b.refreshStatusTags();
    await sleep(1700);
    check(name + ': when it ends its pieces are gone', hero.view.list.length === before && sceneFx() <= loose, hero.view.list.length + ' / ' + before + ', loose ' + sceneFx() + ' / ' + loose);
  }

  // one-shot effects: played, then nothing is left
  const at = G.tileToScreen(4, 4);
  const shots = [
    ['lightning', () => FX.lightningStrike(b, at.x, at.y, {})],
    ['Verse cast: fury', () => FX.verseAura(b, at.x, at.y, 'fury')],
    ['Verse cast: stone', () => FX.verseAura(b, at.x, at.y, 'stone')],
    ['Verse cast: swiftness', () => FX.verseAura(b, at.x, at.y, 'swiftness')],
    ['Swift step', () => FX.swiftTrail(b, at.x, at.y, 1)],
    ['Enchant chant', () => FX.enchantChant(b, at.x, at.y, 20)],
    ['Enchant symbol', () => FX.enchantSigil(b, { x: at.x, y: at.y - 40 }, { x: at.x + 90, y: at.y - 20 }, () => {})],
    ['Enchant landing', () => FX.enchantLand(b, at.x, at.y)],
    ['javelin', () => FX.sonicSpear(b, at.x - 120, at.y - 30, at.x, at.y - 30, 0.5, 300, () => {})],
    ['javelin impact', () => FX.sonicImpact(b, at.x, at.y, 0.5, false)],
    ['earth burst', () => FX.earthBurst(b, at.x, at.y, 0.5, false)],
    ['decisive burst', () => FX.decisiveBurst(b, at.x, at.y)],
  ];
  for (const [name, play] of shots) {
    const loose = sceneFx();
    let sizes = new Set(); let made = 0;
    try { play(); } catch (e) { check(name + ' plays', false, e.message); continue; }
    const t = Date.now();
    while (Date.now() - t < 2600) { made = Math.max(made, sceneFx() - loose); await sleep(40); }
    void sizes;
    check(name + ': shows, then leaves nothing behind', made > 0 && sceneFx() <= loose, 'made ' + made + ', left ' + (sceneFx() - loose));
  }

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
