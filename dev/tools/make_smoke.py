# 8 Nov batch: the archer's Smoke Bomb pictures (roadmap 13.26) and her new Poison Arrow crouch (13.29).
# Run from the repo root:  python3 dev/tools/make_smoke.py <inbox dir> <out dir>
#   <inbox dir> = Fabien Blueprint/INBOX/2026-11-08b (the four .heic / .png files; HEIC is
#   turned into PNG with the Mac tool `sips`). <out dir> gets the pictures and manifest.json.
#
# What it cuts:
#   archer_smoke_throw_f1..f4   the 4-frame throw (reach into pouch, throw, follow-through)
#   archer_poison_f1..f4        her kneeling Poison Arrow, four views (NW, NE, SW, SE)
#   smoke_cloud_0..5            the 6-stage cloud, SEE-THROUGH: the grey floor tile is removed
#   smoke_clear_0..3            the 4 frames of the smoke clearing, see-through too
# The smoke pictures come with a grey diamond floor tile under them. The tile is found
# (its colour shades from light to dark, so a plane is fitted to it), and the smoke is
# separated from it: over the tile, smoke is lighter than the tile; outside, it is darker
# than the white page. Everything is then re-coloured so the smoke blends on any floor.
import sys, os, json, glob, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.spatial import ConvexHull
from iso31 import clean, cells
from fxcut import cut

SRC = sys.argv[1]
OUT = sys.argv[2].rstrip('/') + '/'
sys.argv = sys.argv[:1]
os.makedirs(OUT + 'work/', exist_ok=True)
BG = 247.0  # the page colour of his sheets

NAMES = {'throw': 'new smoke bomb skill', 'cloud': 'smoke bomb effects',
         'clear': 'smoke dissapting or being blown away', 'poison': 'new poison arrow animation for archer'}

def png_of(key):
    """The sheet as a PNG (HEIC is converted with sips)."""
    src = [f for f in glob.glob(SRC + '/*') if os.path.basename(f).startswith(NAMES[key])][0]
    out = OUT + 'work/' + key + '.png'
    if not os.path.exists(out):
        subprocess.run(['sips', '-s', 'format', 'png', src, '--out', out], check=True, capture_output=True)
    return out

# ---------- the archer: how big she is in the game ----------
# Her battle stance picture (figure 4, facing down right) is 106 px tall in the game; the throw
# sheet's figure 4 is the same stance, so that one sets the scale for both of his new sheets.
GAME_STAND = 'public/art/archer_n6b_battle_f4.png'

def figures(key, n=4):
    cl = OUT + 'work/clean_' + key + '.jpg'
    if not os.path.exists(cl):
        clean(png_of(key), cl, n=n)
    return cl, cells(cl, n)

def archer_scale():
    cl, bx = figures('throw')
    tmp = OUT + 'work/tmp.png'
    cut(cl, bx[3], tmp, 1.0, strokes=False, keep=0.15, floor=True)
    return Image.open(GAME_STAND).height / Image.open(tmp).height

def cut_archer(key, base, name):
    cl, bx = figures(key)
    man = {}
    for i in range(4):
        out = OUT + '%s_f%d.png' % (name, i + 1)
        ox, size = cut(cl, bx[i], out, base, strokes=False, keep=0.15, floor=True)
        # the grey floor tile and chalky ring round the feet: same wipe as the 6 Nov cuts
        arr = np.array(Image.open(out).convert('RGBA')).astype(int); h = arr.shape[0]
        rgb = arr[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
        zone = np.zeros(arr.shape[:2], bool); zone[int(h * 0.62):] = True
        floor = zone & (chroma < 75) & (lum > 105) & (lum < 232) & (rgb[..., 0] - rgb[..., 1] > -4) & (rgb[..., 0] - rgb[..., 1] < 45) & (rgb[..., 1] - rgb[..., 2] < 26)
        arr[floor, 3] = 0
        lab, n = ndimage.label(ndimage.binary_dilation(arr[..., 3] > 40, iterations=2))
        if n > 1:
            sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
            arr[~np.isin(lab, [k + 1 for k, v in enumerate(sz) if v > 0.08 * max(sz)]), 3] = 0
        im = Image.fromarray(arr.astype(np.uint8), 'RGBA'); a = im.getchannel('A')
        q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        q.putalpha(a); q.save(out, optimize=True)
        man['f%d' % (i + 1)] = {'file': os.path.basename(out), 'originX': ox}
    return man

# ---------- the smoke ----------
def tile_hull(a):
    """The floor tile as a diamond. The smoke hides its top, but its two lower edges are
    clear against the white page: they give the bottom corner, the slope, and (where the
    edges end) the left and right corners; the top corner follows by symmetry.
    Returns (mask of the diamond, mask of tile-coloured pixels inside it) or (None, None)."""
    H, W = a.shape[:2]
    lum = a.mean(-1)
    fig = ndimage.binary_closing((BG - lum) > 6, iterations=2)
    lab, n = ndimage.label(fig)
    if n == 0:
        return None, None
    sz = ndimage.sum(fig, lab, range(1, n + 1))
    F = lab == (1 + int(np.argmax(sz)))
    cols = np.nonzero(F.any(0))[0]
    ylow = np.full(W, -1)
    for x in cols:
        ylow[x] = np.nonzero(F[:, x])[0].max()
    yb = ylow.max()
    xb = float(np.mean(np.nonzero(ylow >= yb - 1)[0]))
    # slope of each lower edge: the rows 8 to 45 above the bottom corner
    sl = {}
    for side in (-1, 1):
        xs = np.array([x for x in cols if side * (x - xb) > 0 and 8 <= yb - ylow[x] <= 45])
        if len(xs) < 5:
            return None, None
        sl[side] = np.polyfit(xs, ylow[xs], 1)  # ylow = m x + c
    edge = {side: [x for x in cols if side * (x - xb) > 0 and abs(ylow[x] - np.polyval(sl[side], x)) <= 3] for side in (-1, 1)}
    if not edge[-1] or not edge[1]:
        return None, None
    xl, xr = min(edge[-1]), max(edge[1])
    cx = (xl + xr) / 2.0
    hd_ = (xr - xl) / 2.0 * (abs(sl[-1][0]) + abs(sl[1][0])) / 2.0   # half height = half width * slope
    cy = yb - hd_
    poly = [(xl, cy), (cx, cy - hd_), (xr, cy), (cx, yb)]
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    hull = np.array(m) > 0
    r, b_ = a[..., 0], a[..., 2]
    chroma = a.max(-1) - a.min(-1)
    tilepx = hull & (lum > 95) & (lum < 200) & (chroma < 45) & (r - b_ > 3) & (r - b_ < 45)
    return hull, tilepx

def fit_plane(lum, hull, tilepx):
    """The tile's shade as a smooth curve (a quadratic in x and y: its corners are lighter than
    its middle), fitted to the pixels of the tile ring that are not smoke (robust: the
    brightest are dropped as it goes)."""
    inner = ndimage.binary_erosion(hull, iterations=3) & ~ndimage.binary_erosion(hull, iterations=22)
    ys, xs = np.nonzero(inner & tilepx)
    if len(ys) < 60:
        ys, xs = np.nonzero(hull & tilepx)
    def terms(x, y):
        x = np.asarray(x, float) / 100.0; y = np.asarray(y, float) / 100.0
        return np.stack([x * 0 + 1, x, y, x * x, x * y, y * y], -1)
    A = terms(xs, ys)
    z = lum[ys, xs]
    keep = np.ones(len(z), bool)
    for _ in range(5):
        coef = np.linalg.lstsq(A[keep], z[keep], rcond=None)[0]
        res = z - A @ coef
        keep = res < max(6, np.percentile(res[keep], 85))
    H, W = lum.shape
    yy, xx = np.mgrid[0:H, 0:W]
    return terms(xx, yy) @ coef

def cut_smoke(rgb, box, carry=True):
    """One smoke picture as RGBA, tile removed. Returns (image, anchor x, anchor y, tile width)
    with the anchor at the middle of where the tile was (so the game can stand it on a board tile)."""
    x0, y0, x1, y1 = box
    a = rgb[y0:y1, x0:x1].astype(float)
    lum = a.mean(-1)
    hull, tilepx = tile_hull(a)
    H, W = lum.shape
    if hull is None:
        hull = np.zeros((H, W), bool); tilepx = hull
        B = np.full((H, W), BG)
    else:
        B = fit_plane(lum, hull, tilepx)
        B = np.where(hull, B, BG)
        # the page labels (1, 2, 3 ...) sit under the tile: cut everything below it
        ys, xs = np.nonzero(hull)
        a[ys.max() + 3:] = BG; lum = a.mean(-1)
    # Smoke outside the tile is anything that differs from the page; over the tile it is what is
    # clearly lighter than the tile (the tile's own shading varies, and so does the smoke's
    # shadow on it, so a margin of 40 is left). Thin wedges at the tile's corners are dropped.
    MARGIN = 40.0
    hd = ndimage.binary_dilation(hull, iterations=9)  # the tile with a margin (its rim and corners)
    out_smoke = ((BG - lum) > 5) & ~hd
    thr = np.maximum(B + MARGIN, 192.0)   # the tile is never lighter than about 185; smoke over it is 200 and up
    in_smoke = ndimage.binary_opening(lum > thr, iterations=4) & hull
    solid = ndimage.binary_closing(out_smoke | in_smoke, iterations=3)
    # the cloud sits on the tile: with the tile counted as a wall, its white highlights are enclosed
    solid = (ndimage.binary_fill_holes(solid | hd) & ~hd) | in_smoke
    solid = ndimage.binary_opening(solid, iterations=2)
    lab, n = ndimage.label(solid)
    if n:
        sz = ndimage.sum(solid, lab, range(1, n + 1))
        solid = np.isin(lab, [i + 1 for i, s_ in enumerate(sz) if s_ >= 0.05 * max(sz)])
    # soft edge: how much smoke, from colour (darker than the page, or lighter than the tile)
    a_out = np.clip((BG - lum) / (BG - 214.0), 0, 1)
    a_in = np.clip((lum - thr) / np.maximum(236.0 - thr, 1.0), 0, 1)
    alpha = np.where(hull, a_in, a_out)
    alpha[alpha < 0.06] = 0
    alpha[hd & ~hull & ~solid] = 0
    # the smoke fills the tile right to its edge, which would leave a hard V along the front:
    # fade it out over the last 22 px inside the tile's outline, so the base is soft
    if hull.any():
        d = ndimage.distance_transform_edt(hull)
        fade = np.clip(d / 22.0, 0, 1) ** 0.9
        alpha = np.where(hull, alpha * fade, alpha)
    core = ndimage.binary_erosion(solid, iterations=3).astype(float)
    core = np.array(Image.fromarray((core * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))) / 255.0
    alpha = np.maximum(alpha, core * 0.97)
    alpha[~ndimage.binary_dilation(solid, iterations=3)] = 0  # stray specks and page marks
    # The cloud's lower part lies over the back half of the tile, shaded about as dark as the tile
    # itself, so it was cut away along the tile's back edges. Put it back: below each column of
    # cloud, carry the smoke on into the tile as far as its middle, fading softly to nothing.
    ext = np.zeros_like(alpha)
    ext_col = np.zeros_like(a)
    if hull.any() and carry:
        yy_, xx_ = np.mgrid[0:H, 0:W]
        top_y = np.where(hull.any(0), np.argmax(hull, 0), -1) - 11   # start above the tile's edge line
        ys_, xs_ = np.nonzero(hull)
        reach = 0.6 * (ys_.max() - ys_.min()) / 2.0 + 11
        has = np.zeros(W, bool)
        for x in range(W):
            if top_y[x] > 8:
                has[x] = bool(solid[max(top_y[x] - 8, 0):top_y[x], x].any())
                # the colour of the cloud just above the tile, carried straight down
                ext_col[:, x] = a[max(top_y[x] - 6, 0), x]
        # smooth the carried colours sideways so no stripes show
        ext_col = ndimage.uniform_filter1d(ext_col, 31, axis=1)
        dd = yy_ - top_y[None, :]
        inside = (hull | hd) & has[None, :] & (dd >= 0) & (dd < reach)
        e = 0.95 * np.clip(1 - (np.where(inside, dd, 0) / max(reach, 1)) ** 2.2, 0, 1) * inside
        ext = np.array(Image.fromarray((e * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))) / 255.0
        ext *= (hull | hd)
    use_ext = ext > alpha
    alpha = np.maximum(alpha, ext)
    # unmix the colour from what was behind (page or tile) so the smoke blends on any floor
    safe = np.maximum(alpha, 0.05)[..., None]
    col = np.clip((a - (1 - alpha[..., None]) * B[..., None]) / safe, 0, 255)
    col = np.where(alpha[..., None] > 0.97, a, col)
    col = np.where(use_ext[..., None], ext_col, col)  # the carried-on part: the cloud's own colour
    col = col * 0.92 + 0.08 * np.array([232, 226, 222])  # a touch of the cream, so edges stay warm
    img = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
    ys, xs = np.nonzero(hull)
    tw = (xs.max() - xs.min() + 1) if len(xs) else 0
    cx = (xs.max() + xs.min()) / 2 if len(xs) else W / 2
    cy = (ys.max() + ys.min()) / 2 if len(ys) else H
    bb = img.getbbox()
    return img.crop(bb), cx - bb[0], cy - bb[1], tw

# where the frames of the two smoke sheets roughly end (looked up on the sheets); the exact
# cut is the emptiest column within 15 px of each guess
SPLITS = {'cloud': [175, 365, 605, 945, 1265], 'clear': [400, 795, 1195]}

def smoke_boxes(key, rgb):
    occ = ((255 - rgb.min(-1)) > 25).sum(0).astype(float)
    # only the smoke and tile count, not the printed numbers under them
    occ = ((255 - rgb[:470].min(-1)) > 25).sum(0).astype(float)
    cuts = [0] + [g - 15 + int(np.argmin(occ[g - 15:g + 15])) for g in SPLITS[key]] + [rgb.shape[1]]
    return [(cuts[i], 0, cuts[i + 1], rgb.shape[0]) for i in range(len(cuts) - 1)]

def cut_smoke_sheet(key, n, name, scale_from):
    rgb = np.array(Image.open(png_of(key)).convert('RGB'))
    boxes = smoke_boxes(key, rgb)
    cuts = [cut_smoke(rgb, b, carry=(key == 'cloud')) for b in boxes]
    widths = [c[3] for c in cuts if c[3]]
    # one scale for the whole sheet: the tile of the biggest frames is one board tile wide
    ref = np.median(sorted(widths)[-3:]) if scale_from == 'big' else np.median(widths)
    man = {}
    for i, (img, ax, ay, tw) in enumerate(cuts):
        s = 86.0 / ref   # 86 = the tile width in the game; the game rescales to the real tile
        w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
        img = img.resize((w, h), Image.LANCZOS)
        out = OUT + '%s_%d.png' % (name, i)
        img.save(out, optimize=True)
        man['f%d' % i] = {'file': os.path.basename(out), 'ax': round(ax * s / w, 3), 'ay': round(ay * s / h, 3)}
    return man

manifest = {}
base = archer_scale()
print('archer scale', round(base, 3), file=sys.stderr)
manifest['throw'] = cut_archer('throw', base, 'archer_smoke_throw')
manifest['poison'] = cut_archer('poison', base, 'archer_poison')
manifest['cloud'] = cut_smoke_sheet('cloud', 6, 'smoke_cloud', 'big')
manifest['clear'] = cut_smoke_sheet('clear', 4, 'smoke_clear', 'all')
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
print('done', file=sys.stderr)
