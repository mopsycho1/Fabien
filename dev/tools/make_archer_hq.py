"""The archer at full quality (roadmap 18.26, ART4; Battle 1.0 M2, 12 Nov).

Suleiman's Email sheets are the same archer sheets as his 3 Nov WhatsApp ones,
at 2172 x 724 instead of 1600 x 533 (the two sets were matched picture by
picture). This cuts them again, sharp, and they replace her blurry pictures.

Run from dev/ with the tools Python:
    ~/.fabien-tools/venv/bin/python tools/make_archer_hq.py <work folder> [<Email/unzipped folder>]
It writes public/art/archer_hq_<set>_f1..f4.png and <work folder>/manifest.json;
tools/wire_archer_hq.py then puts them in art.json.

Size: her standing sheet is the ruler. Its tallest figure is cut STAND_PX tall
(the old pictures were 112: too small for a computer screen), and every other
sheet is cut at that same scale times SHEET_SCALE. Measured 12 Nov by laying
her standing head over the other sheets: battle 0.98, aim 0.98, shot 0.95 of
the standing head, so they are the same size within the 8 percent rule and
need no correction. The cells are 543 pixels wide, not 512: the cell boxes are
found per sheet (sheet4.raw_cut), nothing assumes a cell size.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage
from sheet4 import raw_cut, final_cut

WORK = sys.argv[1].rstrip('/') + '/'
SRC = (sys.argv[2] if len(sys.argv) > 2 else '/Users/motiago/Documents/Fabien Blueprint/INBOX/2026-11-12/Email/unzipped').rstrip('/') + '/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'art') + '/'
STAND_PX = 300

# set name -> (Email file, the WhatsApp sheet it replaces, which facing each of the four figures is)
NORMAL = ('upLeft', 'upRight', 'downLeft', 'downRight')
MIRROR = ('downLeft', 'downRight', 'upLeft', 'upRight')   # a "reversed" sheet is its twin flipped left to right
SHEETS = {
    'stand':   ('Four-View African Archer Turnaround', '1072', NORMAL),
    'battle':  ('Four-View Horned Archer Character Sheet', '1074', NORMAL),
    'primed':  ('Ornate Archer Turnaround Sheet', '1075', NORMAL),
    'fire':    ('Four Views of the Archer Warrior', '1079', NORMAL),
    'hit':     ('Four-View Archer Recoil Study', '1083', NORMAL),
    'down':    ('Fallen Warrior Archer_ Four Views', '1084', NORMAL),
    'victory': ('Triumphant Archer Victory Sheet', '1085', NORMAL),
    'wound1':  ('Wounded Archer Four-View Character Sheet', '1081', NORMAL),
    'wound2':  ('Wounded archer reversed', '1082', MIRROR),
}
# set name -> a correction for a sheet drawn at another size than the standing one. By eye, 12 Nov, on the
# ruler's contact sheet: the two wounded sheets are drawn bigger (a kneeling figure nearly as tall as the
# standing one), the victory sheet a little smaller.
SHEET_SCALE = {'wound1': 0.86, 'wound2': 0.86, 'victory': 1.08}

def wipe_floor(path):
    """What is left of the grey floor shadow round the feet (the bottom third) is made see-through,
    and loose crumbs are dropped. Same rule as the 6 Nov cutter (make_nov6b.py)."""
    arr = np.array(Image.open(path).convert('RGBA')).astype(int); h = arr.shape[0]
    rgb = arr[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
    zone = np.zeros(arr.shape[:2], bool); zone[int(h * 0.62):] = True
    floor = zone & (chroma < 75) & (lum > 105) & (lum < 232) & (rgb[..., 0] - rgb[..., 1] > -4) & (rgb[..., 0] - rgb[..., 1] < 45) & (rgb[..., 1] - rgb[..., 2] < 26)
    arr[floor, 3] = 0
    lab, n = ndimage.label(ndimage.binary_dilation(arr[..., 3] > 40, iterations=2))
    if n > 1:
        sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        arr[~np.isin(lab, [k + 1 for k, v in enumerate(sz) if v > 0.08 * max(sz)]), 3] = 0
    im = Image.fromarray(arr.astype(np.uint8))
    im = im.crop(im.getbbox())
    # saved small: 255 colours, the see-through edge kept as it is
    q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(im.getchannel('A')); q.save(path, optimize=True)
    return im

raw = {name: raw_cut(SRC + f + '.png', WORK, name) for name, (f, _, _) in SHEETS.items()}
base = STAND_PX / max(Image.open(f).height for f in raw['stand'][2])
print('scale', round(base, 4), file=sys.stderr)
manifest = {}
for name, (f, old, facings) in SHEETS.items():
    cl, boxes, _ = raw[name]
    manifest[name] = {}
    for i, box in enumerate(boxes):
        file = 'archer_hq_%s_f%d.png' % (name, i + 1)
        before = Image.open(raw[name][2][i]).size
        ox = final_cut(cl, box, OUT + file, base * SHEET_SCALE.get(name, 1.0))
        cut_w = Image.open(OUT + file).width
        im = wipe_floor(OUT + file)
        manifest[name][facings[i]] = {'file': file, 'originX': round(ox, 3)}
        if im.width != cut_w: print('note: %s got narrower in the floor wipe (%d to %d), check its originX' % (file, cut_w, im.width), file=sys.stderr)
json.dump(manifest, open(WORK + 'manifest.json', 'w'), indent=1)
print('done', sum(len(v) for v in manifest.values()), 'pictures', file=sys.stderr)
