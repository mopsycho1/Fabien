// Who acts next? This file answers that, using the system Final Fantasy
// Tactics uses, called "CT" (charge time).
//
// Every unit has a CT meter that starts at 0 and a speed number.
// Time moves forward in small ticks. On every tick, each unit's CT goes up by
// its speed. The first unit to reach 100 gets a turn. After its turn starts,
// it pays 100 CT and begins charging again.
//
// So a unit with speed 10 gets a turn every 10 ticks, and a unit with speed 5
// gets one every 20 ticks. Fast units act more often. That is all "speed" means.

export const TURN_COST = 100;

// Finds a unit that is ready (CT of 100 or more). If several are ready, the one
// with the most CT goes first. If they are tied, the one earlier in the list goes first.
function findReadyUnit(units) {
  let best = null;
  for (const unit of units) {
    if (unit.alive && unit.ct >= TURN_COST && (best === null || unit.ct > best.ct)) {
      best = unit;
    }
  }
  return best;
}

// Moves time forward until someone is ready, then starts that unit's turn.
// This CHANGES the units' CT numbers. It returns the unit whose turn it is.
export function startNextTurn(units) {
  if (!units.some((unit) => unit.alive && unit.speed > 0)) {
    throw new Error('No unit can ever act. Check the speed numbers.');
  }

  let actor = findReadyUnit(units);
  while (actor === null) {
    for (const unit of units) {
      if (unit.alive) unit.ct += unit.speed; // one tick passes
    }
    actor = findReadyUnit(units);
  }

  actor.ct -= TURN_COST;
  return actor;
}

// Shows who will act in the next few turns, WITHOUT changing the real units.
// It plays the future on copies, so the real CT numbers stay untouched.
// "count" is how many upcoming turns to list.
export function previewTurns(units, count) {
  const copies = units.map((unit) => ({
    unit,                // remember which real unit this copy belongs to
    speed: unit.speed,
    ct: unit.ct,
    alive: unit.alive,
  }));

  const upcoming = [];
  for (let i = 0; i < count; i++) {
    const actorCopy = startNextTurn(copies);
    upcoming.push(actorCopy.unit);
  }
  return upcoming;
}
