"""Removes thin tile-edge lines left under a figure's feet (Leol and the Thief, 19.1 and 19.2; 26 Nov).
The detile step takes the tile's face but sometimes leaves its thin edges: lines 1 to 4 pixels wide running out
from the feet. In the bottom part of the picture, anything an opening (erode then dilate) wipes out goes, unless it
joins the figure above. Then the picture is cropped to what is left.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/strip_lines.py [--dry <out dir>] <png> ...
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

def strip(a, part=0.30, k=5):
    h = a.shape[0]
    y0 = int(h * (1 - part))
    solid = a[:, :, 3] > 40
    body = nd.binary_opening(solid, structure=np.ones((k, k)))
    body = nd.binary_dilation(body, iterations=2) & solid   # give back the edges the opening shaved
    keep = solid.copy()
    keep[y0:] = body[y0:]
    # a piece in the bottom part that no longer touches the figure goes too
    lab, n = nd.label(keep)
    if n > 1:
        sizes = nd.sum(keep, lab, range(1, n + 1))
        big = 1 + int(np.argmax(sizes))
        for i in range(1, n + 1):
            if i != big and sizes[i - 1] < 0.02 * sizes.max():
                keep[lab == i] = False
    out = a.copy()
    out[~keep & solid, 3] = 0
    out[a[:, :, 3] <= 40, 3] = np.where(keep[a[:, :, 3] <= 40], out[a[:, :, 3] <= 40, 3], 0)
    return out

if __name__ == '__main__':
    args = sys.argv[1:]
    dry = None
    if args and args[0] == '--dry': dry = args[1]; args = args[2:]
    for f in args:
        im = Image.open(f).convert('RGBA')
        b = Image.fromarray(strip(np.array(im)))
        bb = b.getbbox()
        if bb: b = b.crop(bb)
        b.save(os.path.join(dry, os.path.basename(f)) if dry else f, optimize=True)
