// Where a picture is fetched from (roadmap 18.47). Every PNG in public/art has a lossless WebP twin
// (dev/tools/make_webp.py) that looks the same and is about 40 percent smaller, so the game fetches
// the twin. The PNG stays the master: the Python tools and the jsdom tests (whose canvas cannot read
// WebP, window.__noWebp) use it, and so does a page opened with ?png in the address.
// Pass the address as the loader gets it, './art/x/y.png'. JPEG and WebP files go through unchanged.
export function webpOn() {
  if (typeof window === 'undefined') return false;
  return !window.__noWebp && !/[?&]png\b/.test(window.location.search || '');
}

export function artUrl(path) {
  return webpOn() && path.endsWith('.png') ? path.slice(0, -4) + '.webp' : path;
}
