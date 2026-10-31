# Suleiman's isometric sheets (31 Oct): four figures in a row on white, each
# standing on a flat grey floor tile (a diamond) with a number printed under it.
#
# clean(src)  -> a copy of the sheet with the floor tiles, their shadows and the
#               printed numbers/labels painted white, so the usual cutter
#               (fxcut.cut) sees only the figure.
# cells(src)  -> the four boxes, split where the columns between figures are emptiest.
# measure()   -> how big the head is (used to keep a character the same size
#               from sheet to sheet).
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

def _floorlike(a, loose=False):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); lum = (r + g + b) / 3
    # the tile is a warm grey: red a little above green, green about equal to blue
    if loose:
        return (mx - mn < 50) & (lum > 80) & (g - b < 17) & (g - b > -8) & (r - g > -4)
    return (mx - mn < 48) & (lum > 100) & (lum < 246) & (g - b < 21) & (g - b > -6) & (r - g > 4) & (r - g < 40)

def clean(src, out, numbers=True, n=4):
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    fl = _floorlike(a)
    loose = _floorlike(a, loose=True)
    lum = a.mean(-1); chroma = a.max(-1) - a.min(-1)
    # the tile's darker edge lines and the figure's shadow on it
    shade = (chroma < 52) & (lum > 70) & (a[..., 1] - a[..., 2] < 17) & (a[..., 1] - a[..., 2] > -10)
    wipe = np.zeros((H, W), bool)
    yy, xx = np.mgrid[0:H, 0:W]
    tiles = []
    # one tile per figure: the warm grey pixels in the lower part of each figure's column
    for x0, _, x1, _ in cells(src, n):
        sub = fl[:, x0:x1].copy(); sub[: int(H * 0.5)] = False
        lab, k = ndimage.label(ndimage.binary_closing(sub, iterations=2))
        if not k:
            continue
        sizes = ndimage.sum(sub, lab, range(1, k + 1))
        big = [i + 1 for i, v in enumerate(sizes) if v > 400]
        if not big or sum(sizes) < 1500:
            continue
        ys, xs = np.where(np.isin(lab, big))
        # the tile is the lowest warm grey: its bottom corner is the lowest such
        # pixel; a tile is twice as wide as it is tall, so only look that far up
        ty1 = np.percentile(ys, 99.7)
        low = ys > ty1 - 150
        tx0, tx1 = np.percentile(xs[low], 0.5) + x0, np.percentile(xs[low], 99.5) + x0
        ty0 = ty1 - (tx1 - tx0) / 2
        if tx1 - tx0 < 60:
            continue
        tiles.append((int(tx0), int(ty0), int(tx1), int(ty1)))
        cx, cy = (tx0 + tx1) / 2, (ty0 + ty1) / 2
        hw, hh = (tx1 - tx0) / 2 + 30, (ty1 - ty0) / 2 + 14
        rh = (np.abs(xx - cx) / hw + np.abs(yy - cy) / hh) <= 1.0
        tile = rh & (loose | shade)
        # corners of the tile hidden from the estimate: anything of the tile's
        # colour joined to it, in a band just round the tile
        band = np.zeros((H, W), bool)
        band[int(max(0, ty0 - 10)):int(min(H, ty1 + 10)), int(max(0, tx0 - 60)):int(min(W, tx1 + 60))] = True
        lab3, k3 = ndimage.label((loose | shade) & band)
        if k3:
            hit = np.unique(lab3[tile & band]); hit = hit[hit > 0]
            tile |= np.isin(lab3, hit)
        wipe |= tile
    if numbers:
        # small dark marks in the bottom 14% of the sheet (the printed 1 2 3 4,
        # "NORTHEAST (NE)") and in the top 5% (a title)
        dark = (255 - a.min(-1)) > 40
        lab2, n2 = ndimage.label(ndimage.binary_dilation(dark, iterations=2))
        for i, sl in enumerate(ndimage.find_objects(lab2)):
            ys, xs = sl
            area = (lab2[sl] == i + 1).sum()
            if area < 2500 and (ys.start > H * 0.86 or ys.stop < H * 0.07):
                wipe[sl] |= lab2[sl] == i + 1
    a[wipe] = 255
    Image.fromarray(a.astype(np.uint8)).save(out, quality=97)
    return tiles

def cells(src, n=4, pad=0):
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    occ = ((255 - a.min(-1)) > 25).sum(0).astype(float)
    occ = ndimage.uniform_filter1d(occ, 9)
    cuts = [0]
    for k in range(1, n):
        c = W * k // n; lo, hi = c - W // (3 * n), c + W // (3 * n)
        cuts.append(lo + int(np.argmin(occ[lo:hi])))
    cuts.append(W)
    return [(max(0, cuts[i] - pad), 0, min(W, cuts[i + 1] + pad), H) for i in range(n)]

if __name__ == '__main__':
    print(clean(sys.argv[1], sys.argv[2]))
