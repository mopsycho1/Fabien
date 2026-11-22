// 22 Nov, part 2 quick changes. Run with FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_BENCH=h4,e1.
//   1.98  Bulwark Shield is called Aegis everywhere a player reads it
//   1.99  Rending Draw is a skill in every one of Alagara's forms (no Verse needed)
//   1.100 long skill lists show by category: Alagara (Forms, Techniques, Spells), Gadara always; a category with one skill
//         shows that skill itself; inside a category only its skills
//   1.101 the clash films are off by default (Settings switch), and a plain clash beat hands back in about 1.0 s (was 1.5 s)
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const spellsJson = require('../../src/data/spells.json');
(async () => {
  check('1.98 the shield is called Aegis', spellsJson.bulwarkShield.name === 'Aegis' && spellsJson.bulwarkShield.button === 'Aegis' && !JSON.stringify(spellsJson).includes('Bulwark Shield'));
  check('1.99 Rending Draw is not tied to Fury', !spellsJson.rendingDraw.verseSkill);
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const S = w.__status, E = w.__engagement;
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const ala = b.units.find((u) => u.id === 'h5'), gad = b.units.find((u) => u.id === 'e5');
  const labels = (u) => b.spellMenu(u).map((r) => r.label.trim());
  // 1.99
  check('1.99 Rend with no Verse', !b.kingBlock(ala, 'rendingDraw'), b.kingBlock(ala, 'rendingDraw'));
  S.applyBuff(ala, 'swiftness');
  check('1.99 Rend in Swift form', !b.kingBlock(ala, 'rendingDraw'));
  // 1.100
  b.activeUnit = ala; b.spellGroup = null;
  let top = labels(ala);
  check('1.100 Alagara: Forms and Techniques as categories', top.some((l) => /^Forms\s+>/.test(l)) && top.some((l) => /^Techniques\s+>/.test(l)), top.join(' | '));
  check('1.100 Alagara: no more than 4 rows at the top', top.length <= 4, top.length);
  b.openSpellGroup('Techniques'); const tech = labels(ala); b.spellGroup = null;
  check('1.100 inside Techniques: Drawn Blade, Gale Cut, Rending Draw', ['Drawn Blade', 'Gale Cut', 'Rending Draw'].every((n) => tech.some((l) => l.startsWith(n))) && tech.length === 3, tech.join(' | '));
  // in Swift form his Spells holds only Radiant Rift (Aegis needs Stone): a one-skill category shows the skill itself
  check('1.100 a one-skill category shows the skill itself (Spells: Radiant Rift)', top.some((l) => l.startsWith('Radiant Rift')) && !top.some((l) => /^Spells\s+>/.test(l)), top.join(' | '));
  S.applyBuff(ala, 'stone'); // Aegis shows only under Stone: then Spells holds two
  top = labels(ala);
  check('1.100 under Stone, Spells (Aegis, Radiant Rift) is a category', top.some((l) => /^Spells\s+>/.test(l)), top.join(' | '));
  b.activeUnit = gad; const gtop = labels(gad);
  check('1.100 Gadara: grouped (Techniques)', gtop.some((l) => /^Techniques\s+>/.test(l)), gtop.join(' | '));
  const sud = b.units.find((u) => u.id === 'h1');
  check('1.100 a short list stays as it is (Sudeen)', !labels(sud).some((l) => />$/.test(l)), labels(sud).join(' | '));
  // 1.101
  check('1.101 clash films off by default', w.__clashFilmsOff !== false && !w.localStorage.getItem('fabien.clashFilms'));
  const rows = (b.settingsRows || []).map((r) => r.text);
  check('1.101 Settings has a Clash films switch', rows.some((t) => /Clash films: Off/.test(t)), rows.join(' | '));
  const gaha = b.units.find((u) => u.id === 'h2'), bull = b.units.find((u) => u.id === 'e2');
  b.placeUnit(gaha, 4, 5); b.placeUnit(bull, 5, 5);
  for (const u of [gaha, bull]) { u.status = null; u.hp = u.maxHp = 300; }
  E.startDuel(gaha, bull);
  b.busy = true; let done = 0; const t0 = Date.now();
  b.duelBeat(gaha, 'guard', bull, 'guard', false, false, () => { done = Date.now() - t0; b.busy = false; });
  while (!done && Date.now() - t0 < 6000) await sleep(20);
  check('1.101 a plain clash beat hands back in about 1.0 s (was 1.5 s)', done > 0 && done < 1150, done + ' ms');
  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' / '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
