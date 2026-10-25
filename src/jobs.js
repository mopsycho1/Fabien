// Jobs: a job is a bundle of battle numbers (health, attack, speed, and so on).
// Instead of typing every number for every unit, a unit in units.json just
// says which job it has. The numbers for each job live in src/data/jobs.json.

// Used for any number a job or unit forgot to give, so a typo in the data
// files cannot break a battle.
//   attack, defense         : weapons (swords, spears, arrows) and armour against them
//   magicAttack, magicDefense: spells (lightning) and the will to resist them
//   mp                      : magic points, spent on spells (0 for units with no spells)
const DEFAULT_STATS = {
  hp: 20,
  mp: 0,
  attack: 5,
  defense: 1,
  magicAttack: 1,
  magicDefense: 1,
  accuracy: 80,
  evade: 10,
  speed: 8,
  move: 3,
  range: 1,
};

// Builds the full set of numbers for one unit.
//   entry : one unit from units.json
//   jobs  : the whole table from jobs.json
//
// The numbers are put together in this order:
//   1. the defaults above
//   2. the unit's job (from jobs.json)
//   3. anything the unit lists itself (for one-off differences)
//
// It returns a new object with everything the battle needs, plus the job's
// name and badge letter for showing on screen.
export function buildUnit(entry, jobs) {
  const job = jobs[entry.job];

  if (!job) {
    console.warn('units.json: unit "' + entry.id + '" has job "' + entry.job + '", which is not in jobs.json');
  }

  const stats = { ...DEFAULT_STATS, ...(job ? job.stats : {}) };

  // Anything the unit lists itself wins over the job
  for (const key of Object.keys(DEFAULT_STATS)) {
    if (entry[key] !== undefined) stats[key] = entry[key];
  }

  return {
    ...entry,
    ...stats,
    jobName: job ? job.name : 'Unknown',
    badge: job ? job.badge : '?',
    attackEffect: job && job.attackEffect ? job.attackEffect : 'slash', // how its attack looks: slash, bash, arrow or spark
    attackType: job && job.attackType === 'magic' ? 'magic' : 'weapon', // magic uses magicAttack against magicDefense
    maxMp: stats.mp, // a full pool of magic points
    contest: job && job.contest ? { ...job.contest } : null, // engagement style and numbers (melee jobs only)
    stances: job && job.stances ? { ...job.stances } : null, // which clash stances this job is strong or weak in
    stance: null, // the stance it last fought with in a clash
    spells: job && job.spells ? [...job.spells] : [], // spells this job can cast
    attackName: job && job.attackName ? job.attackName : 'Attack', // the name on the attack button
    chain: job && job.chain ? { ...job.chain } : null, // lightning that jumps to a second enemy
    closePenalty: job && job.closePenalty ? job.closePenalty : 0, // harder to aim at someone right next to you
    engagedWith: null, // the unit it is locked in an engagement with, if any
    status: { offBalance: false, buff: null, hex: null, cooldowns: {} },
  };
}
