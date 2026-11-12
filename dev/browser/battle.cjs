// Page-error battle run (roadmap 18.5, checklist H3): a test player plays one full
// battle in a real browser and the script lists every page error it saw.
// Run with the preview up (npx vite build, then npx vite preview --port 4173):
//   node dev/browser/battle.cjs            phone (390 x 844) then desktop (1440 x 900)
//   node dev/browser/battle.cjs phone      one of them only
//   node dev/browser/battle.cjs both 5     5 battles on each screen (checklist H3), two at a time
// Prints one PASS or FAIL line per screen and ends with "ALL PASSED" when no page
// error happened and every battle reached its end. A battle takes 3 to 10 minutes.
const { openBattle, startPlayer, waitForEnd } = require('./lib/play.cjs');

(async () => {
  const views = process.argv[2] && process.argv[2] !== 'both' ? [process.argv[2]] : ['phone', 'desktop'];
  const rounds = Number(process.argv[3]) || 1;
  let bad = 0;
  // the screens play side by side to save time; rounds follow one another
  for (let round = 1; round <= rounds; round++) await Promise.all(views.map(async (view) => {
    const { browser, page, errors } = await openBattle(view);
    await startPlayer(page);
    const end = await waitForEnd(page);
    await browser.close();
    const ok = errors.length === 0 && end.over;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + view + ': ' + end.turns + ' turns, ' + (end.over ? 'battle finished' : 'battle did NOT finish')
      + ' (heroes left ' + end.heroesLeft + ', enemies left ' + end.enemiesLeft + '), ' + errors.length + ' page errors');
    for (const e of errors.slice(0, 10)) console.log('  page error: ' + e);
  }));
  console.log(bad ? 'FAILED' : 'ALL PASSED');
  process.exit(bad ? 1 : 0);
})();
