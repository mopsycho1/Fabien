// Roadmap 18.48 (20 Nov): the battle's pictures download quietly in the background from the title on.
// The test browser has no fetch of its own, so this test gives the page a pretend fetch and a pretend
// blob maker and watches what the downloader asks for, in what order, and what artUrl then hands out.
// Run:  node n96.cjs
const { start } = require('./boot.cjs');
const art = require('../../src/data/art.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w } = await start();
  const P = w.__prefetch, U = w.__artUrl;
  const standing = (id) => { const e = art[id].standing; const v = Object.values(e)[0]; return (v.file || v).replace(/\.png$/, '.webp'); };
  const gahaFile = '/art/' + standing('h2'), archerFile = '/art/' + standing('e3');

  // pretend fetch: remembers the order, how many run at once, and can hold the answers back
  let log = [], now = 0, most = 0, hold = false, fail = null; const waiting = [];
  w.fetch = (url) => new Promise((resolve, reject) => {
    log.push(url); now++; most = Math.max(most, now);
    const done = () => { now--; if (fail && fail.test(url)) reject(new Error('offline')); else resolve({ ok: true, blob: async () => ({ url }) }); };
    if (hold) waiting.push(done); else setTimeout(done, 2);
  });
  let blobs = 0; w.URL.createObjectURL = (b) => 'blob:fake/' + (++blobs) + b.url.split('/').pop();
  const reset = () => { P.resetBackgroundDownload(); log = []; now = 0; most = 0; blobs = 0; hold = false; fail = null; waiting.length = 0; };
  const release = async () => { while (waiting.length) { waiting.shift()(); await sleep(10); } };
  const settle = async () => { for (let i = 0; i < 400; i++) { await sleep(20); if (now === 0 && !waiting.length && i > 5) break; } };

  // 1. a browser that cannot do it (no fetch): nothing happens and nothing breaks
  const realFetch = w.fetch; w.fetch = undefined; P.resetBackgroundDownload();
  P.startBackgroundDownload(); await sleep(50);
  check('a browser with no fetch just does nothing (the loader fetches as before)', log.length === 0 && U.held.size === 0);
  w.fetch = realFetch;

  // 2. ?png or the test browser's own no-WebP switch: left alone
  reset(); w.__noWebp = true; P.startBackgroundDownload(); await sleep(50);
  check('the PNG test view is left alone', log.length === 0);

  // 3. the normal run: order, parallel limit, no repeats
  reset(); w.__noWebp = false;
  P.startBackgroundDownload(); await settle();
  const firstIdx = (re) => log.findIndex((u) => re.test(u));
  check('it downloaded a lot (the shared pictures and the fighters)', log.length > 600, log.length);
  const portraits = Object.values(art).map((e) => e.portrait).filter(Boolean).map((f) => '/art/' + f.replace(/\.png$/, '.webp'));
  check('the select portraits come first', log.slice(0, 4).every((u) => portraits.some((p) => u.endsWith(p))) && firstIdx(/terrain\//) > 3, log.slice(0, 2).join(' '));
  check('the shared board, effects and HUD pictures come before the fighters', firstIdx(/\/art\/terrain\//) < firstIdx(new RegExp(archerFile.replace(/[.]/g, '\\.'))) && firstIdx(/\/art\/ui\//) < firstIdx(new RegExp(gahaFile.replace(/[.]/g, '\\.'))));
  check('never more than 4 at once', most <= 4, most);
  check('no picture is fetched twice', new Set(log).size === log.length, log.length - new Set(log).size);
  check('the Blender waterfall loops are not fetched (only Suleiman\'s own)', !log.some((u) => /\/fx\/waterfall(_tall)?\.webp$/.test(u)) && log.some((u) => /\/fx\/waterfall_s\.webp$/.test(u)));
  check('every download is held as a local blob address', U.held.size === log.length && blobs === log.length);

  // 4. artUrl: the blob when held, the server address when not
  const held = [...U.held.keys()][0];
  check('artUrl hands out the blob for a held picture', U.artUrl(held.replace(/\.webp$/, '.png')) === U.held.get(held), U.artUrl(held.replace(/\.webp$/, '.png')));
  check('artUrl gives the server address for a picture not held', U.artUrl('./art/never_asked.png') === './art/never_asked.webp');

  // 5. a changed line-up jumps to the front, and Start battle stops new downloads
  reset(); w.__noWebp = false; hold = true;
  P.startBackgroundDownload(); await sleep(60);
  const before = log.length;
  P.prefetchFighters(['e3']);
  await release(); await sleep(60);
  const next = log.slice(before, before + 12);
  check('the newly picked fighter (the Archer) goes to the front of the line', next.some((u) => u.endsWith(archerFile)), next.slice(0, 3).join(' '));
  reset(); w.__noWebp = false; hold = true;
  P.startBackgroundDownload(); await sleep(40);
  const started = log.length; P.pauseBackgroundDownload(); await release(); await sleep(80);
  check('Start battle: no new downloads begin (only the ones already running finish)', log.length === started && started <= 4, log.length + ' of ' + started);

  // 6. a failed download is skipped quietly and the loader gets the server address
  reset(); w.__noWebp = false; fail = /\/ui\//;
  P.startBackgroundDownload(); await settle();
  const uiFile = log.find((u) => /\/ui\//.test(u));
  check('a failed download breaks nothing: no blob, the server address stays', !U.held.has(uiFile) && U.held.size > 500 && U.held.size < log.length);

  P.resetBackgroundDownload(); w.__noWebp = true;
  console.log(fails === 0 ? 'ALL PASSED' : 'FAILED ' + fails);
  process.exit(fails ? 1 : 0);
})();
