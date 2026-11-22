"""The Bull Commander's Horn Charge pictures (roadmap 6.73, wired with 19.5 in Batch 7, 21 Nov).

Suleiman's 19 Nov email "Bull commander updated sheets.7z" (INBOX/2026-11-19/email/Bull commander updated sheets/...):
  Bull charge.png                 1254 square, NW and SW and SE (the NE cell is empty)  -> charge, plain look
  Bull charge bloodied.png        1254 square, NW NE / SW SE, a pale grey ground        -> charge, Bloodied look
  Bull charge enchanted.png       1254 square, NW NE / SW SE, flame ring, flaming mace  -> charge, under Enchant
  Bull charge north east pov.png  one big north-east view                               -> not used (the game mirrors NW)
The enemy faces the heroes with upLeft and downLeft and the game mirrors the other two, so only NW and SW are cut.

Cutting is make_bull_flame.py's (the same sheet size, the same pink-tan floor tile): each quadrant is cleaned by its
clean_tan (tile, shadow and label go white), cut by fxcut.cut and its thin tile lines trimmed. The bloodied sheet's
pale grey ground is turned white first. SIZE: one scale for all three sheets, SCALE (the flame sheets' 0.40), checked
on a contact sheet next to his battle stance (dev/tools/charge_sheet.py is not needed: pose_size.py audit does it).
The ruler's head finder is fooled by horns and bronze: the families are pinned in ruler_marks.json by hand.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_bull_charge.py <work folder> [<sheet folder>]
then  ruler.py measure, make_webp.py (CLAUDE.md).
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import ConvexHull
from fxcut import cut

WORK = sys.argv[1].rstrip('/') + '/'
SRC = (sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/Documents/Fabien Blueprint/INBOX/2026-11-19/email/Bull commander updated sheets/Bull commander updated sheets")).rstrip('/') + '/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PUB = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
os.makedirs(WORK, exist_ok=True)

SHEETS = {'plain': 'Bull charge.png', 'bloodied': 'Bull charge bloodied.png', 'enchanted': 'Bull charge enchanted.png'}
QUADS = {'NW': (0, 0), 'SW': (0, 1)}
FACING = {'NW': 'upLeft', 'SW': 'downLeft'}
SCALE = 0.40


def whiten_ground(src, out):
    """The bloodied sheet's ground is a pale warm grey (about 235, 230, 228): every pale, nearly colourless pixel goes white."""
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    pale = (a.min(-1) > 212) & (a.max(-1) - a.min(-1) < 16)
    a[pale] = 255
    Image.fromarray(a.astype(np.uint8)).save(out)
    return out


def clean_tan(src, out):
    """make_bull_flame.py's cleaner: the floor tile (a smooth pink tan diamond in the lower half), its shadow and the
    label under it go white, then the tile's thin edge and grid lines."""
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    grey = a.mean(-1)
    var = ndimage.uniform_filter(grey ** 2, 5) - ndimage.uniform_filter(grey, 5) ** 2
    smooth = np.sqrt(np.maximum(var, 0)) < 7
    tan = (r - g > 26) & (r - g < 58) & (g - b > 6) & (g - b < 34) & (grey > 105) & (grey < 225) & smooth
    tan[: int(H * 0.45)] = False
    lab, n = ndimage.label(ndimage.binary_closing(tan, iterations=2))
    big = []
    if n:
        sizes = ndimage.sum(tan, lab, range(1, n + 1))
        big = [i + 1 for i, v in enumerate(sizes) if v > 500]
    if not big:
        from iso31 import clean
        clean(src, out, n=1)
        return out
    ys, xs = np.nonzero(np.isin(lab, big) & tan)
    hull = np.stack([xs, ys], 1)[ConvexHull(np.stack([xs, ys], 1)).vertices]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon([tuple(p) for p in hull], fill=255)
    inside = ndimage.binary_dilation(np.array(m) > 0, iterations=3)
    dark = (grey < 150) & (a.max(-1) - a.min(-1) < 50) & smooth
    wipe = inside & (tan | dark | ((r - g > 20) & smooth & (grey > 95)))
    wipe = ndimage.binary_dilation(wipe, iterations=1) & inside
    a[wipe] = 255
    near = ndimage.binary_dilation(inside, iterations=14)
    rest = near & (a.min(-1) < 235)
    solid = ndimage.binary_opening(rest, structure=np.ones((5, 5), bool))
    lines = rest & ~ndimage.binary_dilation(solid, iterations=2)
    a[ndimage.binary_dilation(lines, iterations=1) & near & ~solid] = 255
    a[int(ys.max()) + 5:] = 255
    Image.fromarray(a.astype(np.uint8)).save(out)
    return out


def clean_charge(src, out):
    """These charge sheets' tiles are cracked and dusty (the smooth-tile test of clean_tan finds too little). The tile is
    found as the convex hull of the tan pixels in the lower half (smooth or not); inside it the pixels near the tile's own
    colour (its median), the pale dust, and the dark cracks and shadow go white; outside it nothing changes. What is left of
    the tile breaks into small pieces that fxcut.cut drops (it keeps pieces at least 15 percent of the biggest)."""
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    grey = a.mean(-1)
    sat = a.max(-1) - a.min(-1)
    tan = (r - g > 28) & (r - g < 70) & (g - b > 8) & (g - b < 34) & (grey > 110) & (grey < 205)
    low = np.zeros_like(tan); low[int(H * 0.55):] = True
    seed = tan & low
    lab, n = ndimage.label(ndimage.binary_closing(seed, iterations=3))
    if not n:
        return clean_tan(src, out)
    sizes = ndimage.sum(seed, lab, range(1, n + 1))
    keep = [i + 1 for i, v in enumerate(sizes) if v > max(400, sizes.max() * 0.05)]
    ys, xs = np.nonzero(np.isin(lab, keep) & seed)
    hull = np.stack([xs, ys], 1)[ConvexHull(np.stack([xs, ys], 1)).vertices]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon([tuple(p) for p in hull], fill=255)
    inside = ndimage.binary_dilation(np.array(m) > 0, iterations=6)
    # the tile is bright and pink (blue about 0.63 of red, grey about 150); his bronze legs are darker (grey about 80)
    br = b / np.maximum(r, 1)
    pink = (br > 0.53) & (grey > 118) & (r - g > 22) & (r - g < 72)
    dust = (a.min(-1) > 150) & (sat < 75)
    wipe = inside & (pink | dust | (tan & (grey > 118)))
    a[wipe] = 255
    # bits of tile left between the wiped pixels are thin: open them away inside the diamond
    rest = inside & (a.min(-1) < 235)
    solid = ndimage.binary_opening(rest, structure=np.ones((7, 7), bool))
    a[rest & ~ndimage.binary_dilation(solid, iterations=1)] = 255
    a[min(H - 1, int(ys.max()) + 8):] = 255   # the label under the tile
    Image.fromarray(a.astype(np.uint8)).save(out)
    return out


def trim_lines(path):
    im = Image.open(path).convert('RGBA'); al = np.array(im.getchannel('A')) > 40
    solid = ndimage.binary_opening(al, structure=np.ones((5, 5), bool))
    thin = al & ~ndimage.binary_dilation(solid, iterations=3)
    thin[: int(al.shape[0] * 0.65)] = False
    if thin.any():
        a = np.array(im); a[ndimage.binary_dilation(thin, iterations=1) & ~solid, 3] = 0
        Image.fromarray(a).save(path, optimize=True)


def main():
    art = json.load(open(ART))
    bull = art['e2']
    made = {}
    for look, sheet in SHEETS.items():
        src = SRC + sheet
        if look == 'bloodied':
            src = whiten_ground(src, WORK + 'bloodied_white.png')
        im = Image.open(src).convert('RGB')
        hw, hh = im.width // 2, im.height // 2
        made[look] = {}
        for key, (qx, qy) in QUADS.items():
            p = WORK + 'q_%s_%s.png' % (look, key)
            im.crop((qx * hw, qy * hh, (qx + 1) * hw, (qy + 1) * hh)).save(p)
            c = clean_charge(p, p.replace('.png', '_clean.png'))
            q = Image.open(c)
            f = 'bull_charge_%s_%s.png' % (look, FACING[key])
            ox, size = cut(c, (0, 0, q.width, q.height), PUB + f, SCALE, strokes=False, keep=0.15, floor=True)
            trim_lines(PUB + f)
            made[look][FACING[key]] = {'file': f, 'originX': ox}
            print(look, key, FACING[key], size, 'originX', ox)
    json.dump(made, open(WORK + 'made.json', 'w'), indent=1)
    # wire: pose "charge" in each look (plain poses, the Enchant look's poses, the Bloodied look's buffPoses)
    bull['poses']['charge'] = made['plain']
    bull['enchanted'].setdefault('poses', {})['charge'] = made['enchanted']
    bull.setdefault('buffPoses', {}).setdefault('bloodied', {})['charge'] = made['bloodied']
    bull['note_charge'] = "Horn Charge (6.73, 19.5; Batch 7): dev/tools/make_bull_charge.py cut his 19 Nov charge sheets, NW and SW (the rest mirrored): poses.charge (plain), enchanted.poses.charge (flame ring), buffPoses.bloodied.charge. The big north-east view is not used. The impact GIFs are fx sfx_horn_dust and sfx_horn_fire."
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False)


main()
