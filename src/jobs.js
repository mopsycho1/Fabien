// Jobs: a job is a bundle of battle numbers (health, attack, speed, and so on).
// Instead of typing every number for every unit, a unit in units.json just
// says which job it has. The numbers for each job live in src/data/jobs.json.

// Used for any number a job or unit forgot to give, so a typo in the data
// files cannot break a battle.
const DEFAULT_STATS = {
  hp: 20,
  attack: 5,
  defense: 1,
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
    attackEffect: job && job.attackEffect ? job.attackEffect : 'slash', // how its attack looks: slash, bash or arrow
    contest: job && job.contest ? { ...job.contest } : null, // engagement style and numbers (melee jobs only)
    spells: job && job.spells ? [...job.spells] : [], // spells this job can cast
    engagedWith: null, // the unit it is locked in an engagement with, if any
    status: { offBalance: false, buff: null },
  };
}
