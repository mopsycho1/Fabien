// Roadmap 13.69, 13.77, 13.80 (27 Nov): the computer uses each fighter's whole kit, reads its friends' health and
// statuses, and plays by a style in data (src/data/aiStyles.json: aggressive, protector, support, skirmisher).
// The choices are side-free, so this test calls them straight on the heroes' fighters too.
// Run:  FABIEN_MAP=cavern FABIEN_NEW=1 FABIEN_KINGS=1 FABIEN_BENCH= node n120.cjs   (the picture server and bundle.sh first)
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const styles = require('../../src/data/aiStyles.json');
const units = require('../../src/data/units.json');
(async () => {
  const { w, game, errors: all } = await start();
  const errors = all.filter((e) => !/focus\(\)/.test(e));
  const b = await battle(game); await sleep(500);
  const by = (id) => b.units.find((u) => u.id === id);
  const layra = by('h3'), sudeen = by('h1'), gaha = by('h2'), kofi = by('h4'), leol = by('h6');
  const bull = by('e2'), archer = by('e3'), rabdul = by('e4'), tayo = by('e1');
  // everyone parked far off on the edge, then the few a check needs are placed on the flat rows 8 to 10
  const stage = () => {
    const park = [[0, 0], [1, 0], [2, 0], [8, 0], [9, 0], [10, 0], [0, 1], [10, 1], [0, 3], [10, 3], [0, 5], [10, 5]];
    let i = 0;
    for (const u of b.units) {
      u.alive = true; u.hp = u.maxHp; u.engagedWith = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.mp = u.maxMp;
      u.status = { offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null }; u.aiStrikeNext = false; u.hidden = false; u.aiStyle = undefined;
      b.placeUnit(u, ...park[i++]);
    }
    b.busy = false;
  };
  const seen = () => b.enemyEyes();

  // 1. the data: every fighter has a style, every style a text and its numbers
  check('every fighter in units.json has a play style', units.every((u) => styles.fighters[u.id] && styles.styles[styles.fighters[u.id].style]), units.filter((u) => !styles.fighters[u.id]).map((u) => u.id).join(','));
  check('the four styles each have a text, careAt, fallBackAt and focus', ['aggressive', 'protector', 'support', 'skirmisher'].every((s) => { const x = styles.styles[s]; return x && x.text && x.careAt > 0 && x.fallBackAt >= 0 && x.focus; }));

  // 2. Layra, the support (13.80)
  stage(); b.placeUnit(layra, 5, 10); b.placeUnit(sudeen, 5, 8); b.placeUnit(bull, 5, 7); sudeen.hp = Math.round(sudeen.maxHp * 0.5);
  let pick = b.sageChoice(layra, seen());
  check('Layra: a hurt friend a foe is striking gets Stone', pick && pick.id === 'stone' && pick.target === sudeen, pick && pick.id + ' on ' + pick.target.name);
  stage(); b.placeUnit(layra, 5, 10); b.placeUnit(sudeen, 4, 9); sudeen.hp = Math.round(sudeen.maxHp * 0.5);
  pick = b.sageChoice(layra, seen());
  check('Layra: a hurt friend nobody strikes: Swiftness on herself, for Healing Wind', pick && pick.id === 'swiftness' && pick.target === layra, pick && pick.id + ' on ' + pick.target.name);
  layra.status.buff = { id: 'swiftness', turnsLeft: 2, power: 1 }; layra.mp -= 3;
  check('...and under Swift her Attack is Healing Wind on him', b.healAttack(layra) === 'healingWind' && b.healTargets(layra, 'healingWind').includes(sudeen));
  stage(); b.placeUnit(layra, 5, 10); b.placeUnit(gaha, 4, 9); b.placeUnit(bull, 5, 6);
  pick = b.sageChoice(layra, seen());
  check('Layra: the hardest-hitting foe about to reach a friend is Slowed', pick && pick.id === 'slow' && pick.target === bull, pick && pick.id + ' on ' + pick.target.name);
  check('...and next turn she strikes (aiStrikeNext)', layra.aiStrikeNext === true);
  bull.status.hex = { id: 'slow', turnsLeft: 2 }; layra.aiStrikeNext = false; b.placeUnit(bull, 4, 8);
  pick = b.sageChoice(layra, seen());
  check('Layra: a friend in the fight (no Verse yet) gets Fury', pick && pick.id === 'fury' && pick.target === gaha, pick && pick.id + ' on ' + pick.target.name);
  stage(); b.placeUnit(layra, 5, 9); b.placeUnit(bull, 5, 8); b.placeUnit(gaha, 8, 9); layra.hp = Math.round(layra.maxHp * 0.4);
  pick = b.sageChoice(layra, seen());
  check('Layra: hurt with a foe next to her: Husk to a tile further off', pick && pick.id === 'husk' && Math.abs(pick.target.col - 5) + Math.abs(pick.target.row - 8) >= 2, pick && pick.id + ' ' + JSON.stringify(pick.target));
  stage(); b.placeUnit(layra, 5, 10); layra.mp = 1;
  pick = b.sageChoice(layra, seen());
  check('Layra: out of MP and no foe near: Meditate', pick && pick.id === 'meditate', pick && pick.id);

  // 3. Sudeen, the protector
  stage(); b.placeUnit(sudeen, 5, 10); b.placeUnit(gaha, 5, 8); gaha.hp = Math.round(gaha.maxHp * 0.4);
  pick = b.guardianChoice(sudeen);
  check('Sudeen: a friend at 40 percent within 2 tiles gets Herbs', pick && pick.id === 'herbs' && pick.target === gaha, pick && pick.id);
  stage(); b.placeUnit(sudeen, 2, 9); b.placeUnit(gaha, 6, 9); b.placeUnit(bull, 6, 8); gaha.hp = Math.round(gaha.maxHp * 0.4);
  pick = b.preWalkKit(sudeen);
  check('Sudeen: Intercept on the foe striking a hurt friend', pick && pick.id === 'intercept' && pick.target === bull, pick && pick.id + ' on ' + (pick.target && pick.target.name));
  const AS = w.__aiStyle;
  const order = AS.sortTargets(sudeen, [archer, bull], b.units, () => 1);
  check('a protector strikes the foe hurting a friend before a weaker one', order[0] === bull, order.map((t) => t.name).join(','));

  // 4. Gaha, the aggressive spearman
  stage(); b.placeUnit(gaha, 2, 9); b.placeUnit(archer, 5, 9);
  pick = b.preWalkKit(gaha);
  check('Gaha: a foe 3 tiles off in a line: Lunge before walking', pick && pick.id === 'lunge' && pick.target === archer, pick && pick.id);
  stage(); b.placeUnit(gaha, 4, 10); b.placeUnit(archer, 6, 9); gaha.status.cooldowns.lunge = 2;
  pick = b.spearChoice(gaha, seen());
  check('Gaha: nobody in spear reach, Lunge spent: Spear Throw', pick && pick.id === 'spearThrow' && pick.target === archer, pick && pick.id);
  const weak = { ...bull, hp: 2 }; const kills = AS.sortTargets(gaha, [archer, weak], b.units, (t) => (t === weak ? 5 : 1));
  check('everyone takes a kill first', kills[0] === weak);

  // 5. Kofi (13.77): walks to within reach of a hurt friend; a hurt fighter falls back
  stage(); b.placeUnit(kofi, 4, 10); b.placeUnit(sudeen, 8, 8); b.placeUnit(bull, 2, 0); sudeen.hp = Math.round(sudeen.maxHp * 0.3);
  const t = b.styleWalk(kofi, () => false);
  check('Kofi walks to a tile in Infuse reach of the hurt friend', t && !t.stay && Math.abs(t.col - 8) + Math.abs(t.row - 8) <= 3, JSON.stringify(t));
  stage(); b.placeUnit(sudeen, 5, 9); b.placeUnit(bull, 5, 8); b.placeUnit(kofi, 8, 10); sudeen.hp = 5; bull.hp = bull.maxHp;
  const back = b.styleWalk(sudeen, () => false);
  check('Sudeen at 5 health falls back, away from the foe', back && !back.stay && Math.abs(back.col - 5) + Math.abs(back.row - 8) > 1, JSON.stringify(back));
  stage(); b.placeUnit(gaha, 5, 9); b.placeUnit(bull, 5, 7); gaha.hp = 3; bull.hp = bull.maxHp;
  check('Gaha (aggressive) never falls back', !b.styleWalk(gaha, () => false));

  // 6. Leol saves a hurt friend with Smoke Pellet before he strikes
  stage(); b.placeUnit(leol, 4, 10); b.placeUnit(gaha, 6, 9); b.placeUnit(bull, 6, 8); b.placeUnit(tayo, 4, 9); gaha.hp = Math.round(gaha.maxHp * 0.45);
  pick = b.newClassChoice(leol, seen());
  check('Leol: Smoke Pellet over a hurt friend a foe is striking, before his hammer', pick && pick.id === 'smokePellet' && pick.target === gaha, pick && pick.id);

  // 7. a real turn: Layra played by the computer casts and ends the turn (aiBoth, the bot battles' switch)
  stage(); b.placeUnit(layra, 5, 10); b.placeUnit(sudeen, 4, 9); sudeen.hp = Math.round(sudeen.maxHp * 0.5);
  b.time.removeAllEvents(); /* (a turn the battle itself queued earlier must not run Layra a second time) */ b.aiBoth = true; b.activeUnit = layra; let ended = false; const realEnd = b.endTurn.bind(b); b.endTurn = () => { ended = true; };
  b.enemySecondWalk = false; const mp0 = layra.mp; const cs = b.castSpell.bind(b); b.castSpell = (c, t, id, ...r) => { if (process.env.DBG) console.log("CAST", c.name, id, t && t.name, new Error().stack.split("\n").slice(2,9).map((l) => l.trim().split(" ")[1]).join(" < ")); return cs(c, t, id, ...r); }; b.runEnemyTurn();
  for (let i = 0; i < 60 && !ended; i++) await sleep(200);
  check('a real computer turn for Layra: Swiftness cast, 3 MP spent, the turn ends', ended && layra.mp === mp0 - 3 && layra.status.buff && layra.status.buff.id === 'swiftness', 'mp ' + mp0 + ' -> ' + layra.mp);
  b.endTurn = realEnd; b.aiBoth = false;
  check('no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
