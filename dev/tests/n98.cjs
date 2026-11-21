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
  // 1. a hurt friend beside him: Renewal (Water) goes to the most hurt one
  setReading('water'); stage();
  b.placeUnit(mates[0], 5, 6); mates[0].hp = Math.round(mates[0].maxHp * 0.4);
  let pick = b.shamanChoice(k);
  check('water: a hurt friend in reach gets Infuse (Renewal)', pick && pick.id === 'infuse' && pick.target === mates[0], pick && pick.id + ' on ' + pick.target.name);
  // 2. himself on low health, nobody else near
  stage(); k.hp = Math.round(k.maxHp * 0.3);
  pick = b.shamanChoice(k);
  check('water: Kofi on low health with nobody near infuses himself', pick && pick.id === 'infuse' && pick.target === k, pick && pick.id + ' on ' + pick.target.name);
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
  // 6. Stone: the fighter nearest a foe, when hurt in the fight
  setReading('earth'); stage(); b.placeUnit(foes[0], 5, 8); b.placeUnit(mates[0], 5, 7); mates[0].hp = Math.round(mates[0].maxHp * 0.5);
  pick = b.shamanChoice(k);
  check('earth: a hurt friend in the fight gets the Stone Verse', pick && pick.id === 'infuse' && pick.target === mates[0], pick && pick.target.name);
  // 7. Fury: the hardest hitter in the fight
  setReading('fire'); stage(); b.placeUnit(foes[0], 5, 8); b.placeUnit(mates[0], 5, 7); b.placeUnit(mates[1], 4, 7);
  mates[0].attack = 3; mates[1].attack = 9;
  pick = b.shamanChoice(k);
  check('fire: the hardest hitter in the fight gets Fury', pick && pick.id === 'infuse' && pick.target === mates[1], pick && pick.target.name);
  // 8. someone under a Verse already is passed over
  mates[1].status.buff = { id: 'fury', turnsLeft: 2, power: 1 };
  pick = b.shamanChoice(k);
  check('a friend who already wears a Verse is passed over', !pick || pick.target !== mates[1], pick && pick.target.name);
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
