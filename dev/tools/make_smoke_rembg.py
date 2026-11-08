# Roadmap 1.34 (again, 8 Nov): Suleiman's Smoke Bomb sheets cut with rembg instead of the
# colour threshold. rembg keeps the grey floor tile (it counts as part of the picture), so
# the tile is wiped afterwards with the tile finder from make_smoke.py (a diamond fitted to
# the tile's two lower edges, and its shade fitted as a smooth curve). The stage numbers
# under the pictures are cropped off first, and the base is faded so no wedge is left.
# Run (needs the rembg venv):
#   ~/.fabien-tools/venv/bin/python dev/tools/make_smoke_rembg.py <cloud sheet png> <clear sheet png> <out dir>
# It writes smoke_cloud_0..5.png, smoke_clear_0..3.png and smoke.json (the anchors) to <out dir>.
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bgremove import rembg_rgba
from PIL import ImageDraw

# the tile finder from make_smoke.py (that script runs on import, so its two helpers are copied by text)
BG = 247.0
_src = open(os.path.join(HERE, 'make_smoke.py')).read()
_src = _src[_src.index('def tile_hull'):_src.index('def cut_smoke(')]
exec(_src)

CLOUD, CLEAR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
SPLITS = {'cloud': [0, 175, 365, 605, 945, 1265, 1600], 'clear': [0, 400, 795, 1195, 1600]}
NUMBERS_Y = {'cloud': 385, 'clear': 410}   # the stage numbers start below these rows
SCALE_TILE = 172.0                          # the tile is this wide in the saved pictures (2 x the game's 86)

def cut_one(rgb, key):
    a = rgb.astype(float)
    hull, tilepx = tile_hull(a)
    alpha = np.array(rembg_rgba(Image.fromarray(rgb)).getchannel('A')).astype(float) / 255
    H, W = alpha.shape
    cx = cy = None
    if hull is not None:
        lum = a.mean(-1)
        B = fit_plane(lum, hull, tilepx)
        ys, xs = np.nonzero(hull)
        cx, cy = (xs.max() + xs.min()) / 2, (ys.max() + ys.min()) / 2
        tw = xs.max() - xs.min() + 1
        yy = np.mgrid[0:H, 0:W][0]
        chroma = a.max(-1) - a.min(-1)
        outer = ndimage.binary_dilation(hull, iterations=9)
        # the tile is painted very flat; the cloud is puffy. Local spread of the brightness (5 x 5):
        mean = ndimage.uniform_filter(lum, 5)
        spread = np.sqrt(np.maximum(ndimage.uniform_filter(lum * lum, 5) - mean * mean, 0))
        flat = spread < 3.0
        # the tile: flat, about the tile's shade (or the darker slab edge), low colour
        tile = outer & flat & (lum > B - 40) & (lum < B + 24) & (chroma < 50)
        tile = ndimage.binary_opening(tile, iterations=2)
        tile = ndimage.binary_dilation(tile, iterations=1) & outer & (lum < B + 30)   # take the soft rim too
        alpha = np.where(tile, 0, alpha)
        # the tile's thin outline and slab: anything line-thin close to the outline goes
        solid = alpha > 0.1
        thick = ndimage.binary_dilation(ndimage.binary_opening(solid, iterations=9 if key == 'cloud' else 6), iterations=3)   # the body: lines are too thin to survive
        edge = outer & ~ndimage.binary_erosion(hull, iterations=2)
        alpha = np.where(edge & ~thick, 0, alpha)   # faint fringes too, not only solid pixels
        alpha = np.where(edge & (lum < B + 12) & (chroma < 60), 0, alpha)
        # small holes left in the cloud where its shade matched the tile: fill them from the picture
        solid = alpha > 0.1
        holes = ndimage.binary_fill_holes(solid) & ~solid
        lab, n = ndimage.label(holes)
        for i in range(1, n + 1):
            if (lab == i).sum() < (1500 if key == 'cloud' else 250):
                alpha[lab == i] = 1.0
        # the cloud's foot is soft: fade it out over the last stretch around the tile's middle
        if key == 'cloud':
            fade = np.clip(1 - (yy - (cy - 8)) / 30.0, 0, 1) ** 1.1
            alpha = np.where(yy > cy - 8, alpha * fade, alpha)
    else:
        tw = None
    # keep only pieces with some body: a piece that is gone after a 3 px opening is a line or a speck
    solid = alpha > 0.1
    body = ndimage.binary_opening(solid, iterations=3)
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=2))
    good = [i for i in range(1, n + 1) if body[lab == i].any()]
    alpha = np.where(np.isin(lab, good), alpha, 0)
    alpha[alpha < 0.05] = 0
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA'), cx, cy, tw

man = {}
for key, path, name in (('cloud', CLOUD, 'smoke_cloud'), ('clear', CLEAR, 'smoke_clear')):
    sheet = np.array(Image.open(path).convert('RGB'))
    sp = SPLITS[key]
    cuts = []
    for i in range(len(sp) - 1):
        cuts.append(cut_one(sheet[:NUMBERS_Y[key], sp[i]:sp[i + 1]], key))
    widths = [c[3] for c in cuts if c[3]]
    ref = np.median(sorted(widths)[-3:]) if key == 'cloud' else np.median(widths)
    s = SCALE_TILE / ref
    man[key] = []
    for i, (img, cx, cy, tw) in enumerate(cuts):
        bb = img.getbbox()
        # keep the anchor (the tile's middle) inside the crop; if the tile was not found, use the box's lower middle
        if cx is None:
            cx, cy = (bb[0] + bb[2]) / 2, bb[3]
        img = img.crop(bb)
        ax, ay = cx - bb[0], cy - bb[1]
        w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
        img = img.resize((w, h), Image.LANCZOS)
        fn = '%s_%d.png' % (name, i)
        img.save(os.path.join(OUT, fn), optimize=True)
        man[key].append({'file': fn, 'ax': round(ax * s / w, 3), 'ay': round(ay * s / h, 3), 'w': w, 'h': h})
        print(fn, w, 'x', h, 'anchor', man[key][-1]['ax'], man[key][-1]['ay'])
json.dump(man, open(os.path.join(OUT, 'smoke.json'), 'w'), indent=1)
