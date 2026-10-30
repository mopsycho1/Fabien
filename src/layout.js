// How big the game's screen is (roadmap 8.1).
//
// Since 30 Oct the game fills the screen in whatever shape it is: landscape
// on a computer or a phone held sideways (Suleiman's mockups), portrait on a
// phone held upright. One side of the screen is always 720 pixels inside the
// game; the other side stretches to match the shape of the window, so there
// are no black bars. Turning the phone switches between the two, and the
// battle screen lays itself out again without losing its place.

// The short side, in the game's own pixels.
export const SHORT_SIDE = 720;

// The game's size for a window of winW by winH (any units).
export function pickSize(winW, winH) {
  const w = Math.max(1, winW);
  const h = Math.max(1, winH);
  if (w >= h) {
    // landscape: 720 tall, between 960 and 1600 wide
    return { width: clamp(Math.round((SHORT_SIDE * w) / h), 960, 1600), height: SHORT_SIDE };
  }
  // portrait: 720 wide, between 1080 and 1600 tall
  return { width: SHORT_SIDE, height: clamp(Math.round((SHORT_SIDE * h) / w), 1080, 1600) };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// How big buttons and text should be. On a big computer screen one game pixel
// is more than one screen pixel, so everything is already big enough (1). On
// a phone the whole game is squeezed into a small screen, so the menus and
// cards grow (up to 1.45) to stay easy to read and tap.
export function uiScaleFor(scene) {
  const display = scene.scale.displaySize;
  const shown = Math.min(display.width / scene.scale.width, display.height / scene.scale.height);
  if (!Number.isFinite(shown) || shown <= 0) return 1;
  return clamp(0.62 / shown, 1, 1.45);
}

// Keeps the game the same shape as the window. When the shape changes enough
// (or the phone is turned), the game's size changes and every running scene
// gets a "layout" event to rebuild its screen.
export function followWindow(game) {
  let timer = null;
  const check = () => {
    const next = pickSize(window.innerWidth, window.innerHeight);
    const cur = { width: game.scale.width, height: game.scale.height };
    const turned = next.width > next.height !== cur.width > cur.height;
    const stretched = Math.abs(next.width - cur.width) + Math.abs(next.height - cur.height) > 24;
    if (!turned && !stretched) return;
    game.scale.setGameSize(next.width, next.height);
    for (const scene of game.scene.getScenes(true)) scene.events.emit('layout', next.width, next.height);
  };
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(check, 150);
  });
}

// On Android (and other browsers that allow it) the first tap on the title
// screen makes the game full screen, so the browser's bars don't take space.
// iPhones don't allow this for web pages; adding the game to the home screen
// does the same there.
export function tryFullscreen(scene) {
  const touch = scene.sys.game.device.input.touch;
  if (!touch || scene.scale.isFullscreen || !document.fullscreenEnabled) return;
  try {
    scene.scale.startFullscreen();
  } catch (e) {
    // not allowed here: carry on as we are
  }
}

// The title, story and end screens are still laid out for a 720 by 1280
// portrait screen. This fits that design inside whatever shape the screen
// is (in landscape it sits in the middle, a little smaller), and refits it
// when the phone is turned. The story scenes get their own landscape look
// with the painted stills later (roadmap, Later).
export function fitDesign(scene, designW = 720, designH = 1280) {
  const fit = () => {
    const cam = scene.cameras.main;
    cam.setSize(scene.scale.width, scene.scale.height);
    cam.setZoom(Math.min(scene.scale.width / designW, scene.scale.height / designH));
    cam.centerOn(designW / 2, designH / 2);
  };
  fit();
  scene.events.on('layout', fit);
  scene.events.once('shutdown', () => scene.events.off('layout', fit));
}
