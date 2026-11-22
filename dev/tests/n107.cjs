// Roadmap 10.51: Gadara on the heroes' side must always have a menu on his turn. Played as a real player would (the
// bot's king AI is not used here): his turn after an enemy's turn, his turn after an enemy's clash turn, and the turn
// his Singularity goes off. Each time his menu must show with at least one live button once things are still.
// Run:  FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1 FABIEN_SIDES='{"e5":"hero","h5":"enemy"}' node n107.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  b.setSpeed('base', 4);
  const U = (id) => b.units.find((u) => u.id === id);
  const gadara = U('e5'), rabdul = U('e4'), alagara = U('h5');
  const live = () => [...b.slots, ...b.halves, ...b.lowHalves].some((sl) => sl.enabled);
  const calm = async (ms = 12000) => { const t = Date.now(); while ((b.busy || b.inCinematic || b.endTurnWaiting) && Date.now() - t < ms) await sleep(30); await sleep(200); };
  // play turns until it is Gadara's; enemies play themselves, other heroes end their turn
  const untilGadara = async (limit = 40) => {
    for (let i = 0; i < limit && !b.battleOver; i++) {
      await calm();
      if (b.activeUnit === gadara && !b.busy) return true;
      if (b.activeUnit.side === 'hero' && !b.busy) { b.onEndButton(); await sleep(150); }
      else await sleep(150);
    }
    return b.activeUnit === gadara;
  };
  check('Gadara is on the heroes\' side', gadara && gadara.side === 'hero');
  check('Alagara is on the enemies\' side', alagara && alagara.side === 'enemy');

  // 1. a plain turn
  check('his turn comes', await untilGadara());
  check('1. plain turn: a live button', live());
  check('1. ...and the menu shows', b.menu.visible === true);

  // 2. his turn right after an enemy's clash turn: lock Rabdul in a clash with a hero, then play on
  b.onEndButton(); await sleep(200);
  const sudeen = U('h1');
  const E = w.__engagement;
  const free = (u) => { if (u.engagedWith) E.endDuel(u); };
  free(rabdul); free(sudeen);
  b.placeUnit(sudeen, gadara.col + 2 <= 10 ? gadara.col + 2 : gadara.col - 2, gadara.row);
  const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => ({ col: sudeen.col + dc, row: sudeen.row + dr })).find((t) => t.col >= 0 && t.col <= 10 && t.row >= 0 && t.row <= 10 && !b.isBlocked(t.col, t.row));
  b.placeUnit(rabdul, spot.col, spot.row);
  E.startDuel(rabdul, sudeen); b.refreshEngagementMarks();
  check('2. his turn comes again', await untilGadara());
  check('2. after the other turns (a clash among them): a live button', live());
  check('2. ...and the menu shows', b.menu.visible === true);

  // 3. Singularity: cast it as the player (tap it twice), end; the next turn it goes off first, then the menu
  free(gadara); b.refreshEngagementMarks();
  // foes within 3 tiles (so it catches someone) but none right next to him
  for (const f of b.units.filter((u) => u.alive && u.side === 'enemy')) if (Math.abs(f.col - gadara.col) + Math.abs(f.row - gadara.row) <= 1) { free(f); const t = [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 1], [-2, 1]].map(([dc, dr]) => ({ col: gadara.col + dc, row: gadara.row + dr })).find((q) => q.col >= 0 && q.col <= 10 && q.row >= 0 && q.row <= 10 && !b.isBlocked(q.col, q.row)); if (t) b.placeUnit(f, t.col, t.row); }
  b.cancelMode();
  gadara.mask = 6; gadara.singularityUsed = false; gadara.status.cooldowns = {}; gadara.hasActed = false;
  b.onSpellButton(); b.chooseSpell('singularity'); b.chooseSpell('singularity');
  await calm();
  check('3. Singularity is charging', !!gadara.channel, b.statusText && b.statusText.text);
  if (b.activeUnit === gadara && !b.battleOver) { b.onEndButton(); }
  check('3. his turn comes again', await untilGadara());
  await calm(); await sleep(400);
  check('3. it went off', !gadara.channel && gadara.singularityUsed === true);
  check('3. after it: a live button', live());
  check('3. ...and the menu shows', b.menu.visible === true);
  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
