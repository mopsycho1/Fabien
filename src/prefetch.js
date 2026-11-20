// Background download (roadmap 18.48). While the player reads the title, the story and the character
// select, the game quietly fetches the pictures a battle will need, so Start battle has little left
// to wait for. The bytes are kept as blobs (artUrl.js hands out their local address), so the loader
// does not ask the server again and it does not matter what cache headers the server sends.
// Order: the select's portraits, the board, effects and HUD pictures every battle uses, then the
// fighters of the line-up the select starts from (the remembered one). When the player changes the
// line-up, the fighters now picked jump to the front. Start battle pauses it (the loader takes over).
import { queueBattleArt, queueSelectArt, fighterIds } from './battleLoad.js';
import { held, setListing, webpOn } from './artUrl.js';
import { startingLineUp } from './lineup.js';
import cavernMap from './data/maps/cavern.json';

const PARALLEL = 4;          // a few at a time: enough to fill the pipe, few enough to leave room for the select's own loads
let waiting = [];            // addresses still to fetch, first = next
const asked = new Set();     // every address ever queued (never fetched twice)
let running = 0;
let paused = false;
let on = null;               // null until we know the browser can do it

// Can this browser keep downloads as blobs? (The jsdom test browser cannot: it simply does nothing.)
function canRun() {
  if (on === null) on = typeof window !== 'undefined' && typeof fetch === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && !window.__noPrefetch;
  return on;
}

// The server addresses a loader job would fetch: a pretend scene that only writes them down.
function listUrls(queue) {
  const urls = [];
  const pretend = {
    load: { image: (key, url) => urls.push(url), spritesheet: (key, url) => urls.push(url) },
    textures: { exists: () => false },
  };
  setListing(true);
  try { queue(pretend); } finally { setListing(false); }
  return urls;
}

function pump() {
  while (!paused && running < PARALLEL && waiting.length) {
    const url = waiting.shift();
    if (held.has(url)) continue;
    running++;
    fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => { if (blob) held.set(url, URL.createObjectURL(blob)); })
      .catch(() => { /* the loader will fetch it itself */ })
      .then(() => { running--; pump(); });
  }
}

// Adds addresses; front = true puts them ahead of what is waiting.
function enqueue(urls, front) {
  const fresh = [...new Set(urls)].filter((u) => !held.has(u) && (front || !asked.has(u))); // (two keys can share one file: fetch it once)
  for (const u of urls) asked.add(u);
  const set = new Set(fresh);
  waiting = front ? [...fresh, ...waiting.filter((u) => !set.has(u))] : [...waiting, ...fresh.filter((u) => !waiting.includes(u))];
  pump();
}

// Called when the title opens: everything the select and a battle share, then the remembered line-up.
export function startBackgroundDownload() {
  if (!canRun() || !webpOn()) return; // (?png is a testing view: leave it alone)
  paused = false;
  enqueue(listUrls(queueSelectArt), false);
  enqueue(listUrls((s) => queueBattleArt(s, [])), false); // shared pictures only (no fighters)
  enqueue(listUrls((s) => queueBattleArt(s, fighterIds(cavernMap, startingLineUp(cavernMap)))), false);
}

// Called by the select whenever the line-up changes: these fighters go first.
export function prefetchFighters(ids) {
  if (!canRun() || !webpOn() || paused) return;
  enqueue(listUrls((s) => queueBattleArt(s, ids)), true);
}

// Called by Start battle: stop starting new downloads (the loader fetches what is left, with a bar).
export function pauseBackgroundDownload() {
  paused = true;
  waiting = [];
}

// For the tests: forget everything.
export function resetBackgroundDownload() { waiting = []; asked.clear(); held.clear(); running = 0; paused = false; on = null; }
