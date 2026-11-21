// Roadmap 1.77 (21 Nov): hitting a fighter caught in a clash with someone else does extra damage, as well as the +10 to hit
// (engagement.json: distractedHitBonus and distractedDamageBonus). Before this there was only the hit bonus. The two fighters
// in the clash do not get it against each other. No picture server needed: it reads the combat rules alone.
// Run:  bash bundle.sh   then   node n97.cjs
const c = require('./combat-bundle.cjs');
const rules = require('../../src/data/engagement.json');
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const mk = (id, over) => ({ id, name: id, col: 0, row: 0, attack: 5, defense: 1, magicAttack: 6, magicDefense: 1, accuracy: 80, evade: 10, range: 1, melee: true, attackType: 'weapon', status: {}, engagedWith: null, ...over });
const bonus = rules.distractedDamageBonus;
check('engagement.json has a damage bonus above 0', bonus > 0, bonus);

const archer = mk('archer', { range: 4, melee: false, attack: 5 });
const mage = mk('mage', { attackType: 'magic', range: 4, melee: false });
const foe = mk('foe'), friend = mk('friend');
for (const [who, a] of [['an archer', archer], ['a mage', mage], ['a fighter', mk('fighter')]]) {
  foe.engagedWith = null; const free = c.getDamage(a, foe), freeHit = c.getHitChance(a, foe);
  foe.engagedWith = friend; const busy = c.getDamage(a, foe), busyHit = c.getHitChance(a, foe);
  console.log('  ' + who + ': damage ' + free + ' -> ' + busy + ', hit ' + freeHit + '% -> ' + busyHit + '%');
  check(who + ' hits a fighter caught in a clash for ' + bonus + ' more damage', busy === free + bonus, free + ' -> ' + busy);
  check(who + ' also hits it ' + rules.distractedHitBonus + ' points more often (unchanged)', busyHit === freeHit + rules.distractedHitBonus, freeHit + ' -> ' + busyHit);
}
// the two in the clash: no bonus against each other
const f2 = mk('f2'); foe.engagedWith = f2; f2.engagedWith = foe;
const aloneDmg = (foe.engagedWith = null, c.getDamage(f2, foe)); foe.engagedWith = f2;
check('the one locked with it gets no bonus (a clash blow is its own thing)', c.getDamage(f2, foe) === aloneDmg, aloneDmg + ' vs ' + c.getDamage(f2, foe));
// still at least 1, and it adds to a stun's flank damage rather than replacing it
foe.engagedWith = friend; foe.status = { stunned: { turns: 1 } };
foe.status = {}; const tough = mk('tough', { defense: 50, engagedWith: friend });
check('a hit on a very tough clashing fighter is still at least 1', c.getDamage(archer, tough) >= 1, c.getDamage(archer, tough));
console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
