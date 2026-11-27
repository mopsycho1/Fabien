"""The Blender cavern board (Graphics 2.0 step 3): turns the renders of dev/blender/cavern_board.py
into the game's pictures and checks that every tile lines up.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_board3d.py <render dir> [rotations 0,1,2,3]

For each camera turn it writes
  public/art/board3d/base_r<n>.webp   the whole board (drawn under everything)
  public/art/board3d/top_r<n>.webp    the top layer: each tile block cut out on its own, packed in one
                                      picture; the game draws each piece at its tile's depth, so a
                                      fighter behind a taller tile is hidden by it as before
and src/data/board3d.json (where each piece goes, every flame).

Checks (printed, PASS or FAIL):
  centres  the middle of each tile's top in the render shows the tile a tap there picks
  taps     a tap anywhere on the board picks (grid.js screenToTile) the tile the render shows there
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.abspath(sys.argv[1])
ROTS = [int(r) for r in sys.argv[2].split(',')] if len(sys.argv) > 2 else [0, 1, 2, 3]
OUT = os.path.join(ROOT, 'public', 'art', 'board3d')
DATA = os.path.join(ROOT, 'src', 'data', 'board3d.json')
os.makedirs(OUT, exist_ok=True)

meta = json.load(open(os.path.join(SRC, 'meta.json')))
MAP = json.load(open(os.path.join(ROOT, 'src', 'data', 'maps', 'cavern.json')))
N = MAP['board']['size']
TW, TH, LH, BASE = (MAP['board'][k] for k in ('tileWidth', 'tileHeight', 'levelHeight', 'baseDepth'))
H = MAP['heights']
X0, Y0, WG, HG = meta['region']
K = meta['k']


def to_view(c, r, rot):
    n = N - 1
    return [(c, r), (n - r, c), (n - c, n - r), (r, n - c)][rot]


def from_view(vc, vr, rot):
    n = N - 1
    return [(vc, vr), (vr, n - vc), (n - vc, n - vr), (n - vr, vc)][rot]


def tile_to_screen(c, r, rot):
    vc, vr = to_view(c, r, rot)
    return 360 + (vc - vr) * TW / 2, 400 + (vc + vr) * TH / 2 - H[r][c] * LH


def outline(c, r, rot):
    x, y = tile_to_screen(c, r, rot)
    hw, hh, d = TW / 2, TH / 2, BASE + H[r][c] * LH
    return [(x, y - hh), (x + hw, y), (x + hw, y + d), (x, y + hh + d), (x - hw, y + d), (x - hw, y)]


def inside(px, py, pts):
    ins = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
            ins = not ins
        j = i
    return ins


def screen_to_tile(x, y, rot):
    """grid.js screenToTile, line for line: nearest tiles first."""
    for s in range((N - 1) * 2, -1, -1):
        for vc in range(N):
            vr = s - vc
            if vr < 0 or vr >= N: continue
            c, r = from_view(vc, vr, rot)
            if inside(x, y, outline(c, r, rot)):
                return c, r
    return None


def decode_ids(ids):
    a = ids.astype(np.int32)
    is_tile = a[..., 2] > 100
    tid = np.rint((a[..., 0] - 8) / 16).astype(np.int32) + 16 * np.rint((a[..., 1] - 8) / 16).astype(np.int32)
    return np.where(is_tile, tid, 0)


def edge_fade(img):
    """Soften the render's left, right and top edges into the game's own cave backdrop."""
    a = np.asarray(img).astype(np.float32)
    h, w = a.shape[:2]
    m = int(70 * K)
    ramp = lambda n: np.clip(np.arange(n) / m, 0, 1)
    fx = np.minimum(ramp(w), ramp(w)[::-1])
    fy = ramp(h)
    a[..., 3] *= fx[None, :] * fy[:, None]
    return Image.fromarray(a.astype(np.uint8))


def pack(pieces, width):
    """Shelf packing, tallest first. pieces: list of (key, image). Returns {key: (x, y)}, size."""
    order = sorted(pieces, key=lambda p: -p[1].height)
    x = y = shelf = 0
    at = {}
    for key, im in order:
        if x + im.width > width:
            x, y, shelf = 0, y + shelf + 2, 0
        at[key] = (x, y)
        x += im.width + 2
        shelf = max(shelf, im.height)
    return at, (width, y + shelf)


data = json.load(open(DATA)) if os.path.exists(DATA) else {}
data.update({'k': K, 'region': [X0, Y0, WG, HG], 'note': 'Made by dev/tools/make_board3d.py from the Blender renders (dev/blender/cavern_board.py). Pieces: [col, row, x in the top picture, y, width, height, game x, game y]. Shown with ?map=blender.'})
data.setdefault('rotations', {})
bad = 0
for rot in ROTS:
    beauty = Image.open(os.path.join(SRC, 'beauty_r%d.png' % rot)).convert('RGBA')
    tid = decode_ids(np.asarray(Image.open(os.path.join(SRC, 'ids_r%d.png' % rot)).convert('RGB')))
    beauty = edge_fade(beauty)
    beauty.save(os.path.join(OUT, 'base_r%d.webp' % rot), quality=90, method=6)
    px = np.asarray(beauty)

    # --- check 1: each tile's top centre shows that tile
    miss = []
    for r in range(N):
        for c in range(N):
            x, y = tile_to_screen(c, r, rot)
            ix, iy = int((x - X0) * K), int((y - Y0) * K)
            # (a low tile behind a taller one is partly hidden, as in the game: compare with the game's own pick)
            t = screen_to_tile(x, y, rot)
            near = {tid[iy + dy, ix + dx] for dx in (-3, 0, 3) for dy in (-3, 0, 3)}
            if len(near) > 1: continue   # exactly on the line between two tiles
            if tid[iy, ix] != t[1] * N + t[0] + 1:
                miss.append((c, r, int(tid[iy, ix])))
    # --- check 2: taps over the whole board land on the tile the picture shows there
    tested = wrong = 0
    wrong_img = Image.new('RGB', (WG // 2, HG // 2))
    for gy in range(Y0, Y0 + HG, 3):
        for gx in range(X0, X0 + WG, 3):
            ix, iy = int((gx - X0) * K), int((gy - Y0) * K)
            shown = tid[iy, ix]
            if shown == 0: continue
            # leave out a 2 pixel band at the edges of tiles (bevels and the anti-aliased line)
            ok_near = {tid[min(max(iy + dy, 0), tid.shape[0] - 1), min(max(ix + dx, 0), tid.shape[1] - 1)] for dx in (-3, 0, 3) for dy in (-3, 0, 3)}
            if len(ok_near) > 1: continue
            tested += 1
            t = screen_to_tile(gx, gy, rot)
            if not t or t[1] * N + t[0] + 1 != shown:
                wrong += 1
                wrong_img.putpixel(((gx - X0) // 2, (gy - Y0) // 2), (255, 0, 0))
    ok = not miss and wrong <= tested * 0.002
    bad += 0 if ok else 1
    print('%s rotation %d: centres %d of %d right%s; taps %d of %d on the tile shown (%.2f%% off)' % (
        'PASS' if ok else 'FAIL', rot, N * N - len(miss), N * N, (' missed ' + str(miss[:6])) if miss else '', tested - wrong, tested, 100 * wrong / max(1, tested)))
    if wrong: wrong_img.save(os.path.join(SRC, 'tap_wrong_r%d.png' % rot))

    # --- the top layer: every tile block on its own
    pieces = []
    for t in range(1, N * N + 1):
        ys, xs = np.nonzero(tid == t)
        if not len(xs): continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        crop = px[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(tid[y0:y1, x0:x1] == t, crop[..., 3], 0)
        pieces.append(((t, int(x0), int(y0)), Image.fromarray(crop)))
    at, size = pack(pieces, 2048)
    atlas = Image.new('RGBA', size, (0, 0, 0, 0))
    out = []
    for (t, x0, y0), im in pieces:
        ax, ay = at[(t, x0, y0)]
        atlas.paste(im, (ax, ay))
        c, r = (t - 1) % N, (t - 1) // N
        out.append([c, r, ax, ay, im.width, im.height, round(X0 + x0 / K, 2), round(Y0 + y0 / K, 2)])
    atlas.save(os.path.join(OUT, 'top_r%d.webp' % rot), quality=90, method=6)
    data['rotations'][str(rot)] = {'base': 'art/board3d/base_r%d.webp' % rot, 'top': 'art/board3d/top_r%d.webp' % rot,
                                    'pieces': out, 'flames': meta['flames'][str(rot)]}
    print('  base %dx%d %d KB, top layer %dx%d %d KB, %d pieces' % (beauty.width, beauty.height, os.path.getsize(os.path.join(OUT, 'base_r%d.webp' % rot)) // 1024,
                                                                  size[0], size[1], os.path.getsize(os.path.join(OUT, 'top_r%d.webp' % rot)) // 1024, len(out)))

json.dump(data, open(DATA, 'w'), separators=(',', ':'))
print('ALL PASSED' if not bad else 'FAILED')
sys.exit(1 if bad else 0)
