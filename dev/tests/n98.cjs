// Roadmap 1.78 (21 Nov): Kofi's AI never used Infuse or Haunt (the enemy turn had no branch for them, so only his free
// Spirit Bolt ever fired, even on low health). Now shamanChoice picks Infuse (a hurt friend, himself too) or Haunt (a foe).
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_SIDES='{"h4":"enemy"}' node n98.cjs   (the picture server and bundle.sh first)
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors: all } = await start();
  const errors = all.filter((e) => !/focus\(\)/.test(e));
  const b = await battle(game); await sleep(500);
  const k = b.units.find((u) => u.id === 'h4');
  check('Kofi fights on the enemy side', k.side === 'enemy', k.side);
  const mates = b.units.filter((u) => u.side === 'enemy' && u !== k);
  const foes = b.units.filter((u) => u.side === 'hero');
  const read = (el) => { b.reading = b.reading; k.lastRead = el; };
  // a reading we can set: stand him where one element wins by a clear margin
  const setReading = (el) => { const real = b.reading.bind(b); b.reading = (u, at) => (u === k ? { element: el, points: 5, all: {} } : real(u, at)); };
  const stage = (kolo = [5, 5]) => {
    for (const u of b.units) { u.alive = true; u.hp = u.maxHp; u.engagedWith = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.mp = u.maxMp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null }; u.hidden = false; }
    const ring = [[0, 0], [10, 0], [0, 10], [10, 10], [1, 0], [0, 1], [9, 10], [10, 9]];
    let i = 0; for (const u of b.units) if (u !== k) b.placeUnit(u, ...ring[i++]);
    b.placeUnit(k, ...kolo);
    b.activeUnit = k; b.busy = false;
  };
  // 1. (13.72, 27 Nov: Call Spirit replaced Infuse) a hurt friend: a Tide Spirit beside him (plain floor, read as water)
  const dist = (p, q) => Math.abs(p.col - q.col) + Math.abs(p.row - q.row);
  setReading('water'); stage();
  b.placeUnit(mates[0], 5, 6); mates[0].hp = Math.round(mates[0].maxHp * 0.4);
  let pick = b.shamanChoice(k);
  check('water: a hurt friend in reach gets a Tide Spirit beside him', pick && pick.id === 'callSpirit' && dist(pick.target, mates[0]) <= 1 && b.spiritKindAt(k, pick.target) === 'tide', pick && pick.id + ' ' + JSON.stringify(pick.target));
  // 2. himself on low health, nobody else near: a Tide Spirit beside himself
  stage([5, 1]); k.hp = Math.round(k.maxHp * 0.3); /* (plain floor round him, away from the others) */
  pick = b.shamanChoice(k);
  check('water: Kofi on low health with nobody near calls a Tide Spirit beside himself', pick && pick.id === 'callSpirit' && dist(pick.target, k) <= 1, pick && pick.id + ' ' + JSON.stringify(pick.target));
  // 3. everyone healthy, a foe within 4: Haunt on the foe
  stage(); b.placeUnit(foes[0], 5, 8);
  pick = b.shamanChoice(k);
  check('water: nobody hurt, a foe in reach: Haunt', pick && pick.id === 'haunt' && pick.target === foes[0], pick && pick.id);
  // 4. a foe already Disoriented is not hexed again
  foes[0].status.disoriented = { turnsLeft: 2, by: 'haunt' };
  pick = b.shamanChoice(k);
  check('a foe who is already hexed is not chosen again', !pick, pick && pick.id);
  // 5. no MP: nothing
  stage(); b.placeUnit(foes[0], 5, 8); k.mp = 0;
  check('no MP: no skill', b.shamanChoice(k) === null);
  // 6. (13.72) Infuse is not his any more: whatever he reads, no choice names it
  let named = false;
  for (const el of ['water', 'earth', 'fire', 'storm']) { setReading(el); stage(); b.placeUnit(foes[0], 5, 8); b.placeUnit(mates[0], 5, 7); mates[0].hp = Math.round(mates[0].maxHp * 0.5); const p = b.shamanChoice(k); if (p && p.id === 'infuse') named = true; }
  check('Infuse is gone from his choices (Call Spirit took its place)', !named && !k.spells.includes('infuse'));
  // 9. the whole enemy turn: a real cast happens, MP is spent, the turn ends
  setReading('water'); stage(); b.placeUnit(foes[0], 5, 8);
  const mp0 = k.mp; let ended = false; b.endTurn = () => { ended = true; };
  b.enemySecondWalk = false; b.busy = true; b.enemyAttack(k);
  for (let i = 0; i < 60 && !ended; i++) await sleep(200);
  check('the enemy turn runs Haunt for real: 2 MP spent, the turn ends', ended && k.mp === mp0 - 2, 'mp ' + mp0 + ' -> ' + k.mp );
  check('no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
