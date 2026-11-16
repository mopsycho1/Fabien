# Cuts Suleiman's clash meter (roadmap 8.21, his 15 Nov 19:11 sheet, photo 1556) into
# public/art/ui: clash_skull.png (the raven skull medallion), clash_bar.png (the empty bar of
# seven slots, red end on the left, gold middle, blue end on the right) and two fill pieces
# (clash_fill_red.png, clash_fill_blue.png: the inside of a filled slot from his filled bar).
# The slots' places in the bar go to src/data/clashMeter.json for the game.
#
#   ~/.fabien-tools/venv/bin/python -I dev/tools/make_clash_meter.py [<photo 1556>]
#
# The sheet is on white: background = white reached from the border (flood fill), the rest kept.
# The pieces are scaled as a whole in the game (never stretched), so they stay sharp.
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

HOME = os.path.expanduser('~')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HOME, 'Documents/Fabien Blueprint/INBOX/2026-11-16/x/00001556-PHOTO-2026-11-15-19-11-16.jpg')
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art', 'ui')

# where the pieces are on his 1536 by 1024 sheet (found by the blob search, 16 Nov)
SKULL = (46, 570, 433, 963)     # x0, y0, x1, y1
BAR = (474, 603, 1440, 754)     # the empty bar
FILLED_DY = 162                 # the filled bar is the same bar 162 pixels lower
# the seven slots inside the empty bar (sheet pixels): inside the thin gold lines
SLOT_X = [(659, 730), (747, 816), (834, 909), (922, 997), (1011, 1083), (1103, 1179), (1197, 1266)]
SLOT_Y = (633, 672)

im = Image.open(SRC).convert('RGB')
a = np.asarray(im).astype(np.int16)
white = a.min(axis=2) > 232
lab, _ = ndimage.label(white)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fg = ~np.isin(lab, list(border))


def piece(box, name, height=None):
    x0, y0, x1, y1 = box
    mask = fg[y0:y1, x0:x1]
    # only the biggest blob: bits of the pieces next to it (a tip, a brush stroke) are dropped
    ml, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, ml, range(1, n + 1))
        mask = ml == (int(np.argmax(sizes)) + 1)
    rgb = a[y0:y1, x0:x1].astype(np.float32)
    # a soft edge: the outermost ring of kept pixels fades by how white it is
    edge = mask & ~ndimage.binary_erosion(mask, iterations=2)
    alpha = mask.astype(np.float32)
    alpha[edge] = np.clip((255 - rgb.min(axis=2)[edge]) / 60.0, 0, 1)
    pic = Image.fromarray(np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8))
    if height:
        pic = pic.resize((round(pic.width * height / pic.height), height), Image.LANCZOS)
    pic.save(os.path.join(OUT, name))
    print(name, pic.size)
    return pic


piece(SKULL, 'clash_skull.png', height=256)
bar = piece(BAR, 'clash_bar.png')
# the fill pieces: the inside of the first red slot and the first blue slot of his filled bar
for name, (sx0, sx1) in (('clash_fill_red.png', SLOT_X[0]), ('clash_fill_blue.png', SLOT_X[4])):
    crop = im.crop((sx0, SLOT_Y[0] + FILLED_DY, sx1, SLOT_Y[1] + FILLED_DY))
    crop.save(os.path.join(OUT, name))
    print(name, crop.size)

meta = {
    'note': "Suleiman's clash meter (roadmap 8.21), cut by dev/tools/make_clash_meter.py. Slots are [x0, y0, x1, y1] in clash_bar.png pixels, left to right; the middle one (3) is the gold neutral slot. The bar's red end is on the left. width is how wide the bar is drawn over a clash, in board pixels; skull the medallion's height.",
    'bar': [bar.width, bar.height],
    'slots': [[x0 - BAR[0], SLOT_Y[0] - BAR[1], x1 - BAR[0], SLOT_Y[1] - BAR[1]] for x0, x1 in SLOT_X],
    'width': 170,
    'skull': 64,
}
with open(os.path.join(ROOT, 'src', 'data', 'clashMeter.json'), 'w') as f:
    json.dump(meta, f, indent=2)
print('clashMeter.json written')
