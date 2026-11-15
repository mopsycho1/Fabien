"""The Bull Commander under Enchant, full quality (Suleiman, 15 Nov email "Bull commander enchanted sheets.7z";
roadmap 4.1 flame looks, 18.29 Flame enchant sheets for everyone, 18.30 melee wind-ups).

Seven sheets (Suleiman: "have a wind up and strike sheet for the bull in his folder under the flame enchantment"):
  Bull Commander Isometric Battle Sheet.png               1254 square, NW NE / SW SE   -> flame battle stance (ready, guard)
  Bull Commander Isometric Character Sheet.png            2172 by 724, four numbered   -> flame standing (neutral)
  Horned Warrior_ Raise-to-Strike Concept Sheet.png       1254 square                   -> windup (mace raised)
  Horned Warrior’s Flaming Mace Strikes.png               1254 square                   -> attack (mace swung)
  Flaming Shield Directional Tile Set.png                 1254 square                   -> shield in flight, one picture per direction (cut, not wired)
  Flame-Wreathed Bull Commander Turnaround (+ mirrored)   2172 by 724, arms out         -> not used yet (no cast pose for him)
The enemy faces the heroes with upLeft and downLeft; the game mirrors for the other two, so only NW and SW are wired.

Cutting: a 2 by 2 sheet is split into four quadrants (a figure, its floor tile and its NW/NE/SW/SE label), each cleaned
by iso31.clean (tile, shadow and label go white) and cut by fxcut.cut. SIZE: the horn span (the width of the top of the
figure) is the same in every pose, but a raised mace or a flame over the horns spoils the reading (0.17 to 0.48 on the
strike and wind-up sheets), so only the two battle figures and the standing figures are measured against his plain
pictures, and the sheets drawn together (the four square ones) share that one scale. The ruler's head finder is fooled
by horns and bronze, so these families are pinned at 1.0 in ruler_marks.json and judged on a contact sheet.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_bull_flame.py <work folder> [<sheet folder>]
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from iso31 import cells
from scipy import ndimage
from scipy.spatial import ConvexHull
from PIL import ImageDraw
from fxcut import cut

WORK = sys.argv[1].rstrip('/') + '/'
SRC = (sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/Documents/Fabien Blueprint/INBOX/2026-11-15/Email/Bull commander enchanted sheets/Bull commander enchanted sheets")).rstrip('/') + '/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PUB = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
os.makedirs(WORK, exist_ok=True)

# the 2 by 2 sheets: (file, set name, plain picture to match the horns of)
QUAD = {
    'battle': ('Bull Commander Isometric Battle Sheet.png', 'bull_iso_battle'),
    'windup': ('Horned Warrior_ Raise-to-Strike Concept Sheet.png', 'bull_iso_battle'),  # his plain wind-up is his battle stance
    'strike': ('Horned Warrior’s Flaming Mace Strikes.png', 'bull_iso_attack'),
    'shield': ('Flaming Shield Directional Tile Set.png', None),
}
QUADS = {'NW': (0, 0), 'NE': (1, 0), 'SW': (0, 1), 'SE': (1, 1)}
FACING = {'NW': 'upLeft', 'NE': 'upRight', 'SW': 'downLeft', 'SE': 'downRight'}
ROW = ('Bull Commander Isometric Character Sheet.png', 'bull_iso_stand', {1: 'upLeft', 3: 'downLeft'})  # four numbered figures, NW NE SW SE

SCALE_2X2 = 0.40   # the four 1254 pixel sheets are drawn at one size: the horn span says 0.337 to 0.366, but flames over the horns widen it; by eye on a sheet next to his plain pictures 0.40 puts the heads the same size
SCALE_ROW = 0.43   # the 2172 by 724 character sheet: its standing figures match his plain stand at 0.418 to 0.439

def horn_span(path):
    """The width of the top 9 percent of a picture (the horns), in its own pixels."""
    a = np.array(Image.open(path).convert('RGBA'))[..., 3] > 128
    h = a.shape[0]
    xs = np.nonzero(a[:max(3, int(h * 0.09))].any(0))[0]
    return float(xs.max() - xs.min()) if len(xs) else 1.0

def plain_span(prefix, facing):
    return horn_span(PUB + '%s_%s.png' % (prefix, facing))


def clean_tan(src, out):
    """Paints the floor tile, its shadow and the label under it white. These sheets' tile is a warm pink tan (about
    185, 145, 125; iso31.clean looks for a warm grey and misses it). The tile is the biggest smooth tan piece in the
    lower half; its convex hull is the tile's diamond; inside it the smooth tan and the smooth dark shadow go, and
    everything below its bottom corner (the NW/SW label and its ornaments) goes."""
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
    if not big:  # this tile is not that colour: the grey-tile cleaner of the 31 Oct sheets
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
    # the tile's edge and its grid lines are thin: inside the diamond, anything that vanishes when the
    # picture is opened by 5 pixels and is not next to something solid is a line, not part of him
    near = ndimage.binary_dilation(inside, iterations=14)   # the tile's edge lines run a little outside the diamond
    rest = near & (a.min(-1) < 235)
    solid = ndimage.binary_opening(rest, structure=np.ones((5, 5), bool))
    lines = rest & ~ndimage.binary_dilation(solid, iterations=2)
    a[ndimage.binary_dilation(lines, iterations=1) & near & ~solid] = 255
    a[int(ys.max()) + 5:] = 255   # the label under the tile
    Image.fromarray(a.astype(np.uint8)).save(out)
    return out

def clean_cells(src, out, n):
    """The same for a row of n figures (the character sheet): each cell on its own."""
    im = Image.open(src).convert('RGB')
    bx = cells(src, n)
    res = Image.new('RGB', im.size, (255, 255, 255))
    for i, (x0, y0, x1, y1) in enumerate(bx):
        p = out.replace('.png', '_c%d.png' % i); im.crop((x0, y0, x1, y1)).save(p)
        clean_tan(p, p)
        res.paste(Image.open(p), (x0, y0))
    res.save(out)
    return out

def trim_lines(path):
    """A last pass on a picture of him: thin leftovers of the tile's edge in the bottom third (anything that vanishes
    when the picture is opened by 5 pixels and is not beside something solid) are made see-through."""
    im = Image.open(path).convert('RGBA'); al = np.array(im.getchannel('A')) > 40
    solid = ndimage.binary_opening(al, structure=np.ones((5, 5), bool))
    thin = al & ~ndimage.binary_dilation(solid, iterations=3)
    thin[: int(al.shape[0] * 0.65)] = False
    if thin.any():
        a = np.array(im); a[ndimage.binary_dilation(thin, iterations=1) & ~solid, 3] = 0
        out = Image.fromarray(a); out.save(path, optimize=True)

def raw(path, box, name):
    out = WORK + name + '_raw.png'
    cut(path, box, out, 1.0, strokes=False, keep=0.15, floor=True)
    return out

def quadrant(sheet, key, set_name):
    """One quadrant of a 2 by 2 sheet, cleaned (tile, shadow and label white), as a file."""
    im = Image.open(SRC + sheet).convert('RGB')
    hw, hh = im.width // 2, im.height // 2
    qx, qy = QUADS[key]
    p = WORK + 'q_%s_%s.png' % (set_name, key)
    q = im.crop((qx * hw, qy * hh, (qx + 1) * hw, (qy + 1) * hh)); q.save(p)
    c = p.replace('.png', '_clean.png')
    clean_tan(p, c)
    return c

def main():
    art = json.load(open(ART))
    e = art['e2']['enchanted']
    made = {}  # set name -> {facing: {file, originX}}
    scales = {}
    for name, (sheet, plain) in QUAD.items():
        made[name] = {}
        for key in ('NW', 'SW') if name != 'shield' else ('NW', 'NE', 'SW', 'SE'):
            c = quadrant(sheet, key, name)
            im = Image.open(c)
            r = raw(c, (0, 0, im.width, im.height), '%s_%s' % (name, key))
            facing = FACING[key]
            k = SCALE_2X2  # one scale for all four square sheets (see SIZE in the header)
            f = 'bull_flame_%s_%s.png' % (name, facing)
            ox, size = cut(c, (0, 0, im.width, im.height), PUB + f, k, strokes=False, keep=0.15, floor=(name != 'shield') or None)
            if name != 'shield':
                trim_lines(PUB + f)
            made[name][facing] = {'file': f, 'originX': ox}
            print(name, key, facing, 'scale', round(k, 3), size, 'originX', ox)
    # the four numbered figures of the character sheet: standing
    sheet, plain, picks = ROW
    made['stand'] = {}
    cl = WORK + 'row_clean.png'
    clean_cells(SRC + sheet, cl, 4)
    bx = cells(cl, 4)
    for fig, facing in picks.items():
        r = raw(cl, bx[fig - 1], 'stand_%d' % fig)
        k = SCALE_ROW
        f = 'bull_flame_stand_%s.png' % facing
        ox, size = cut(cl, bx[fig - 1], PUB + f, k, strokes=False, keep=0.15, floor=True)
        trim_lines(PUB + f)
        made['stand'][facing] = {'file': f, 'originX': ox}
        print('stand', fig, facing, 'scale', round(k, 3), size, 'originX', ox)
    json.dump(made, open(WORK + 'made.json', 'w'), indent=1)
    # wire: his flame look (Rabdul's Enchant). Only the two left-facing views; the game mirrors the others.
    two = lambda d: {k: d[k] for k in ('upLeft', 'downLeft')}
    e['note'] = "Under Rabdul's Enchant (roadmap 4.1): his 15 Nov full-quality flame sheets (dev/tools/make_bull_flame.py): battle stance (ready, guard), neutral standing, the raised mace (windup) and the swung mace (attack), up-left and down-left, the rest mirrored. The flaming shield in flight (bull_flame_shield_*, four directions) is wired as moves.shieldFlight with "directional" (18.31)."
    e['standing'] = two(made['stand'])
    e['battle'] = two(made['battle'])
    e['poses'] = {'ready': two(made['battle']), 'guard': two(made['battle']), 'windup': two(made['windup']), 'attack': two(made['strike'])}
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False)

main()
