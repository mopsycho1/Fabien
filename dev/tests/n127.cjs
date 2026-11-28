// 6.99 (Baiyee 28 Nov, the Lens of Juiciness): Call Spirit as an event. The summon dims the board, eases the camera in,
// cracks the tile with runes in the spirit's colour, raises the spirit its own way, sweeps its name banner across with
// a sting and a flash, then the first move: about 3 seconds the first time in a battle, about 1.5 after; a tap speeds it
// up. The spirit fades back into its element. The wait: the icon fills turn by turn, and on the turn it is ready a chime,
// "Spirit ready" over Kofi and a pulsing row and Verses button.
// Run:  FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH= node n127.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { game, errors, w } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const kofi = U('h4'), bull = U('e2');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyWrapUp = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null, used: {} });
  const park = () => { b.time.removeAllEvents(); b.tweens.killAll(); b.busy = false; for (const sp of [...(b.spirits || [])]) b.removeSpirit(sp); let i = 0; for (const u of b.units) { u.status = fresh(); u.hasActed = false; b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++; } };
  const S = w.__spellsAll.callSpirit.spirits;
  check('the spirits\' colours: Ember orange, Tide blue, Stone gold-brown, Gale pale green', S.ember.color === '#ff8a3c' && S.tide.color === '#6ab8ff' && S.stone.color === '#c9a060' && S.gale.color === '#b4f0b4', [S.ember.color, S.tide.color, S.stone.color, S.gale.color].join(' '));

  // ---------- the first summon of the battle ----------
  park(); b.placeUnit(kofi, 2, 7); b.placeUnit(bull, 3, 5); b.activeUnit = kofi; kofi.mp = 9;
  const said = []; const ft = b.floatText.bind(b); b.floatText = (u, t, ...r) => { said.push(t); return ft(u, t, ...r); };
  const homeZoom = b.cameras.main.zoom;
  const poses = []; const spz = b.showPose.bind(b); b.showPose = (u, pose, ...r) => { if (u === kofi) poses.push(pose); return spz(u, pose, ...r); };
  let done = false; const t0 = Date.now();
  b.castSpell(kofi, { col: 3, row: 6 }, 'callSpirit', () => { done = Date.now() - t0; });
  await sleep(150);
  check('it is a cut-in: the battle waits, a tap would speed it up', b.inCinematic === true && !!b.summoning && b.summoning.first === true);
  check('Kofi raises his lantern (his chant pose)', poses[0] === 'chant', poses.join(','));
  await sleep(450);
  const dim = b.children.list.find((o) => o.type === 'Rectangle' && o.width >= 8000);
  check('the board dims a little', !!dim && dim.alpha > 0.15 && dim.alpha < 0.5, dim && dim.alpha.toFixed(2));
  check('the camera eases in', b.cameras.main.zoom > homeZoom * 1.05, homeZoom.toFixed(2) + ' to ' + b.cameras.main.zoom.toFixed(2));
  const runes = b.children.list.filter((o) => o.type === 'Graphics' && o.depth >= 79 && o.depth < 80);
  check('the tile cracks with runes (a ring and cracks, glowing)', runes.length >= 2, runes.length);
  await sleep(1000);
  const sp = b.spiritOf(kofi);
  check('the Ember Spirit has risen by now', sp && sp.kind === 'ember');
  const banner = b.children.list.find((o) => o.type === 'Container' && o.list && o.list.some((c) => c.type === 'Text' && c.text === 'EMBER SPIRIT'));
  check('its name banner sweeps across: EMBER SPIRIT', !!banner || said.includes('EMBER SPIRIT'));
  const t = Date.now(); while (!done && Date.now() - t < 8000) await sleep(30);
  b.showPose = spz;
  check('...then casts (his cast pose)', poses.includes('cast'), poses.join(','));
  check('the first summon takes about 3 seconds before its first move (2.7 to 4.5 s with the move)', done >= 2700 && done <= 4600, done);
  check('...its first move came (Ember Lash)', said.includes('Ember Lash'));
  check('...the cut-in is over and the camera is back', !b.inCinematic && Math.abs(b.cameras.main.zoom - homeZoom) < 0.05, b.cameras.main.zoom.toFixed(2));
  check('...the dimming is gone', !dim.active || dim.alpha < 0.05);

  // ---------- later summons: about half ----------
  park(); b.placeUnit(kofi, 2, 7); b.placeUnit(bull, 7, 7); kofi.mp = 9; b.activeUnit = kofi;
  done = false; const t1 = Date.now();
  b.castSpell(kofi, { col: 2, row: 5 }, 'callSpirit', () => { done = Date.now() - t1; });
  await sleep(100);
  check('a later summon is the short one', b.summoning && b.summoning.first === false);
  let tt = Date.now(); while (!done && Date.now() - tt < 8000) await sleep(30);
  check('...about 1.5 seconds before its move (1.2 to 2.6 s with the move)', done >= 1200 && done <= 2600, done);

  // ---------- a tap skips it ----------
  park(); b.placeUnit(kofi, 2, 7); b.placeUnit(bull, 7, 7); kofi.mp = 9; b.activeUnit = kofi; b.spiritShowSeen = false;
  done = false; const t2 = Date.now();
  b.castSpell(kofi, { col: 3, row: 7 }, 'callSpirit', () => { done = Date.now() - t2; });
  await sleep(120); b.skipCinematic();
  tt = Date.now(); while (!done && Date.now() - tt < 8000) await sleep(30);
  check('a tap speeds even the first summon up (under 1.5 s)', done && done < 1500, done);
  check('...and the game runs at its own speed again after', b.tweens.timeScale === 1 || b.tweens.timeScale === (b.speed.enemy || 1), b.tweens.timeScale);

  // ---------- it fades back into its element ----------
  for (const kind of ['ember', 'tide', 'stone', 'gale']) {
    park(); b.placeUnit(kofi, 2, 7);
    const s2 = b.addSpirit(kofi, kind, { col: 4, row: 8 }, true);
    const before = b.children.list.length;
    b.removeSpirit(s2, 'Fades');
    await sleep(120);
    const bits = b.children.list.length - before;
    check(kind + ': it fades into its element (a few particles, never a flood)', bits >= 2 && bits <= 40 && s2.view.active, bits);
    await sleep(1100);
    check('...and is gone after', !s2.view.active);
  }

  // ---------- the wait ----------
  park(); b.placeUnit(kofi, 2, 7); kofi.spiritWaitWas = undefined; kofi.spiritReadyTurn = null;
  St.startCooldown(kofi, 'callSpirit');
  const total = St.cooldownOf(kofi, 'callSpirit');
  b.activeUnit = kofi; b.turnCount += 1; b.tickSpirits(kofi);
  const row = () => b.spellMenu(kofi).find((e) => /Call Spirit/.test(e.label));
  check('just used: its icon is empty (filled 0)', row().fill === 0, row().fill);
  kofi.status.cooldowns.callSpirit = total - 1; b.turnCount += 1; b.tickSpirits(kofi);
  check('a turn later it has filled a third', Math.abs(row().fill - 1 / total) < 0.01, row().fill);
  check('...no pulse yet', !row().pulse);
  said.length = 0;
  delete kofi.status.cooldowns.callSpirit; b.turnCount += 1; kofi.mp = 9; kofi.hasActed = false;
  b.tickSpirits(kofi); await sleep(500);
  check('ready again: "Spirit ready" over Kofi', said.includes('Spirit ready'), said.join('|'));
  check('...the row is full and pulses', row().fill === 1 && row().pulse === true);
  b.cancelMode(); b.refreshButtons();
  const verses = b.slots.find((s) => s.label && /Verses|Skills/.test(s.label.text));
  check('...and the Verses button pulses too', !!verses && verses.pulse === true, verses && verses.label.text);
  b.turnCount += 1; b.tickSpirits(kofi);
  check('the next turn it is just ready (no chime again, no pulse)', !row().pulse);
  b.floatText = ft;

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
