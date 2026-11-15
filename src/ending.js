// The end of a battle (roadmap 18.12, M12; 17.10 and 13.45): the rules behind the result
// screen. The numbers are in src/data/ending.json. BattleScene draws the screen.
import rules from './data/ending.json';

export const endingRules = rules;

// The par for a map and a team size (how many fighters the hero side started with).
export function parFor(mapName, teamSize) {
  const table = rules.par[mapName] || rules.par.default;
  const size = String(Math.max(3, Math.min(4, teamSize)));
  return table[size] || rules.par.default[size];
}

// The rating of a win: { id, name, stars, banner, text, under } ("under" = turns under par,
// negative when over).
export function rateWin(turns, par) {
  const under = par - turns;
  const id = under >= rules.swiftUnder ? 'swift' : under >= 0 ? 'steady' : 'long';
  return { id, under, ...rules.ratings[id] };
}

// The best win on this device for a map and team size, and saving a better one.
// Returns { best, isNew }: best = the fewest turns ever (this win included).
export function recordBest(mapName, teamSize, turns) {
  const key = 'fabien.best.' + mapName + '.' + teamSize;
  let old = null;
  try { old = Number(window.localStorage.getItem(key)) || null; } catch (e) { /* no storage: nothing remembered */ }
  const isNew = old === null || turns < old;
  if (isNew) { try { window.localStorage.setItem(key, String(turns)); } catch (e) { /* fine */ } }
  return { best: isNew ? turns : old, isNew: isNew && old !== null };
}

// What the result screen says about the fight: damage each side dealt and who fell.
//   units: every unit of the battle; taken: { unitId: damage it took }
export function battleTally(units, taken) {
  const sum = (side) => units.filter((u) => u.side === side).reduce((n, u) => n + (taken[u.id] || 0), 0);
  return {
    dealt: sum('enemy'),          // what the heroes dealt is what the enemies took
    taken: sum('hero'),
    fallenHeroes: units.filter((u) => u.side === 'hero' && !u.alive).map((u) => u.name),
    fallenEnemies: units.filter((u) => u.side === 'enemy' && !u.alive).map((u) => u.name),
    heroes: units.filter((u) => u.side === 'hero'),
  };
}
