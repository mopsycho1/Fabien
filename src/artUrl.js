// Where a picture is fetched from (roadmap 18.47 and 18.48). Every PNG in public/art has a WebP twin
// (dev/tools/make_webp.py, high-quality lossy) that looks the same and is about 3 times smaller, so
// the game fetches the twin. A picture the background downloader (prefetch.js) already has is handed
// out as a local blob address, so the loader does not fetch it again. The PNG stays the master: the Python tools and the jsdom tests (whose canvas cannot read
// WebP, window.__noWebp) use it, and so does a page opened with ?png in the address.
// Pass the address as the loader gets it, './art/x/y.png'. JPEG and WebP files go through unchanged.
export function webpOn() {
  if (typeof window === 'undefined') return false;
  return !window.__noWebp && !/[?&]png\b/.test(window.location.search || '');
}

export function artUrlRaw(path) {
  return webpOn() && path.endsWith('.png') ? path.slice(0, -4) + '.webp' : path;
}

// address on the server -> blob address of the bytes the background downloader already holds
export const held = new Map();
let listing = false; // true while prefetch.js is only listing what a battle needs (it wants the server addresses)
export function setListing(on) { listing = on; }

export function artUrl(path) {
  const raw = artUrlRaw(path);
  return !listing && held.has(raw) ? held.get(raw) : raw;
}
