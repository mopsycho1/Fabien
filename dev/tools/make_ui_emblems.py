# Cuts Suleiman's action emblems (roadmap 6.53, his 15 Nov "New Ui sheets") into
# public/art/ui/emblem_<name>.png, one round medallion each, WITHOUT the word under it
# (too small to read on a phone; the game writes its own word beside the emblem).
#
#   ~/.fabien-tools/venv/bin/python -I dev/tools/make_ui_emblems.py [<sheets folder>]
#
# How: the sheets are on plain white. Background = white pixels reached from the
# border (flood fill), so light parts inside a medallion stay. Each medallion is the
# biggest blob in its column; the words and the little diamonds under them are
# separate smaller blobs and are left out. Edges are softened (colour to alpha on
# the last near-white ring of pixels), then the medallion is saved at SIZE square.
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

HOME = os.path.expanduser('~')
DEFAULT = os.path.join(HOME, 'Documents/Fabien Blueprint/INBOX/2026-11-15/Email/New Ui sheets/New Ui sheets')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'art', 'ui')
SIZE = 160

# sheet file -> emblem names from left to right
SHEETS = {
    'Fantasy RPG Emblem Badge Set.png': ['meditate', 'husk', 'hexes', 'blessings', 'skills'],
    'Golden Medallion Excavation Icon.png': ['digup'],
    'Golden Spirit Beast Summon Emblem.png': ['summon'],
    'Haunt and Infuse Medallions.png': ['haunt', 'infuse'],
    'Press and Empower Emblems.png': ['press', 'empower'],
}


def cut(path, names):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    whiteish = (a.min(axis=2) > 232)
    # background: the white region touching the border
    lab, _ = ndimage.label(whiteish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    fg = ~bg
    fl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, fl, range(1, n + 1))
    # the medallions are the len(names) biggest blobs
    order = np.argsort(sizes)[::-1][:len(names)]
    boxes = []
    for i in order:
        sl = ndimage.find_objects((fl == i + 1).astype(np.uint8))[0]
        boxes.append((sl[1].start, sl, i + 1))
    boxes.sort()
    for name, (_, sl, idx) in zip(names, boxes):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        mask = ndimage.binary_fill_holes(fl[y0:y1, x0:x1] == idx)
        rgb = a[y0:y1, x0:x1].astype(np.float32)
        # soft edge: how far from white the pixel is, only on the outline band
        dist = (255 - rgb.min(axis=2)) / 60.0
        edge = mask & ~ndimage.binary_erosion(mask, iterations=2)
        alpha = np.where(mask, 1.0, 0.0)
        alpha[edge] = np.clip(dist[edge], 0, 1)
        rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
        pic = Image.fromarray(rgba, 'RGBA')
        side = max(pic.width, pic.height)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(pic, ((side - pic.width) // 2, (side - pic.height) // 2))
        sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
        sq.save(os.path.join(OUT, 'emblem_' + name + '.png'))
        print('emblem_' + name, pic.size)


folder = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
for f, names in SHEETS.items():
    cut(os.path.join(folder, f), names)
