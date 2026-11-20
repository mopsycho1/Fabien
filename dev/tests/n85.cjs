// 18.30 the character select: the line-up rules and the battle using them.
//  - the default is the map's 4 v 4; the last line-up is remembered; a character added later appears on its side,
//    joins its side's default team, and takes the last place when that side is full
//  - the battle fields exactly the chosen line-up; a character with no start tile on the map gets a free tile on its side
//  - the select screen draws a card for everyone (a placeholder when there is no portrait) and Start battle passes the line-up
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n85.cjs
const { start } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  await sleep(500);
  const L = w.__lineup, units = w.__unitList;
  const cavern = require('../../src/data/maps/cavern.json');
  w.localStorage.removeItem('fabien.lineup');
  const def = L.defaultLineUp(cavern);
  check('the default is the map\'s 4 v 4', def.hero.join() === 'h1,h2,h3,h4' && def.enemy.length === 4, JSON.stringify(def));
  L.saveLineUp({ hero: ['h2', 'h3'], enemy: ['e1'] });
  check('the last line-up is remembered', JSON.stringify(L.startingLineUp(cavern)) === JSON.stringify({ hero: ['h2', 'h3'], enemy: ['e1'] }));
  // a character added later (a fifth hero, no portrait, no start tile)
  units.push({ id: 'h9', name: 'Newcomer', job: 'scout', side: 'hero', level: 1 });
  check('a new character in units.json is on the list', L.allCharacters().some((c) => c.id === 'h9' && c.side === 'hero'));
  check('...and joins its side\'s team when there is room', L.startingLineUp(cavern).hero.join() === 'h2,h3,h9', L.startingLineUp(cavern).hero.join());
  units.pop(); L.saveLineUp({ hero: ['h1', 'h2', 'h3', 'h4'], enemy: ['e1'] }); units.push({ id: 'h9', name: 'Newcomer', job: 'scout', side: 'hero', level: 1 });
  check('...and takes the last place when the side is full', L.startingLineUp(cavern).hero.join() === 'h1,h2,h3,h9', L.startingLineUp(cavern).hero.join());
  // the battle with a chosen line-up, the newcomer included
  w.__bench = undefined; delete w.__bench;
  game.scene.start('BattleScene', { stepIndex: null, map: 'cavern', lineUp: { hero: ['h2', 'h9'], enemy: ['e3'] } });
  let b = null; for (let i = 0; i < 900 && !(b && b.units && b.units.length); i++) { await sleep(100); b = game.scene.getScene('BattleScene'); }
  await sleep(800);
  const ids = b.units.map((u) => u.id).sort().join();
  check('the battle fields exactly the chosen line-up', ids === 'e3,h2,h9', ids);
  const nine = b.units.find((u) => u.id === 'h9');
  const starts = Object.values(cavern.starts).map((t) => t.join());
  check('the newcomer (no start tile on the map) stands on a free tile on the heroes\' side', !!nine && !starts.includes(nine.col + ',' + nine.row) && nine.row >= 7, nine && nine.col + ',' + nine.row);
  // the select screen: a card for everyone, a placeholder for the newcomer, Start battle passes the line-up
  w.localStorage.removeItem('fabien.lineup');
  game.scene.stop('BattleScene');
  game.scene.start('SelectScene', { stepIndex: null, map: 'cavern' });
  let s = null; for (let i = 0; i < 50 && !(s && s.cardHits && s.cardHits.length); i++) { await sleep(100); s = game.scene.getScene('SelectScene'); }
  check('the select screen has a card for every character', units.every((u) => s.cardHits.some((h) => h.charId === u.id)), s.cardHits.map((h) => h.charId).join());
  check('the newcomer has no portrait and still shows (placeholder letter)', s.layer.list.some((o) => o.type === 'Text' && o.text === 'N'));
  s.toggle('enemy', 'e4'); s.toggle('enemy', 'e2');
  let started = null; const orig = s.scene.start.bind(s.scene); s.scene.start = (k, d) => { started = { k, d }; };
  s.startButton.emit('pointerup', { y: 0, downY: 0 });
  check('Start battle passes the picked line-up to the battle', started && started.k === 'BattleScene' && started.d.lineUp.enemy.join() === 'e1,e3', started && JSON.stringify(started.d.lineUp));
  check('...and remembers it', JSON.parse(w.localStorage.getItem('fabien.lineup')).enemy.join() === 'e1,e3');
  s.scene.start = orig;
  // test mode off locks the enemies to the map's
  L.setTestMode(false); s.scene.restart({ stepIndex: null, map: 'cavern' }); await sleep(600); s = game.scene.getScene('SelectScene');
  const setEnemies = L.defaultLineUp(cavern).enemy;
  check('with Test mode off the set enemies cannot be tapped, on either side', !s.cardHits.some((h) => setEnemies.includes(h.charId)) && s.pick.enemy.join() === setEnemies.join());
  L.setTestMode(true);
  // any character on either side (20 Nov): both sides list everyone, a tap moves a character over, a saved line-up keeps it
  s.scene.restart({ stepIndex: null, map: 'cavern' }); await sleep(600); s = game.scene.getScene('SelectScene');
  const tappable = (side) => s.cardHits.filter((h) => h.side === side).map((h) => h.charId);
  check('both sides list every character', units.every((u) => tappable('hero').includes(u.id) && tappable('enemy').includes(u.id)), tappable('hero').length + ' / ' + tappable('enemy').length);
  s.pick = { hero: ['h1'], enemy: ['e2'] };
  s.toggle('hero', 'e2');
  check('tapping an enemy on the heroes\' side moves it there', s.pick.hero.join() === 'h1,e2' && s.pick.enemy.length === 0, JSON.stringify(s.pick));
  s.toggle('enemy', 'h1');
  check('...and a hero on the enemies\' side', s.pick.hero.join() === 'e2' && s.pick.enemy.join() === 'h1', JSON.stringify(s.pick));
  s.pick = { hero: ['h1', 'h2', 'h3', 'e4'], enemy: ['e2'] };
  s.toggle('hero', 'e2');
  check('a full side refuses, and the character stays where it was', s.pick.enemy.join() === 'e2' && s.pick.hero.length === 4, JSON.stringify(s.pick));
  s.pick = { hero: ['e2', 'e3'], enemy: ['h1', 'h4'] };
  L.saveLineUp(s.pick);
  check('a saved line-up keeps characters on the far side', JSON.stringify(L.startingLineUp(cavern)) === JSON.stringify(s.pick), JSON.stringify(L.startingLineUp(cavern)));
  check('every card shows its home side tag', s.layer.list.filter((o) => o.homeSide).length >= units.length * 2);
  L.saveLineUp({ hero: ['h1', 'h2'], enemy: ['e1'] });
  w.localStorage.removeItem('fabien.lineup');
  units.pop();
  const real = errors.filter((e) => !/Not implemented/.test(String(e)));
  check('no page errors', real.length === 0, real.join('|').slice(0, 200));
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
