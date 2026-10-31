# Suleiman's clash banner (30 Oct 20:28, roadmap 8.6): the two angled panels
# with the crack between them. White around it and the cream inside the two
# panels become see-through; the panels' outlines are saved (as polygons) so
# the game can clip each fighter's face to its panel.
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import ConvexHull
sys.path.insert(0, sys.argv[1] + '/tools')
from cutter import background_mask
src, out_png, out_json = sys.argv[2], sys.argv[3], sys.argv[4]
im = Image.open(src).convert('RGB')
rgb = np.array(im)
box = (20, 0, 1585, 465)
rgb = rgb[box[1]:box[3], box[0]:box[2]]
bg = background_mask(rgb)
a = rgb.astype(int)
cream = (a[..., 0] > 205) & (a[..., 1] > 195) & (a[..., 2] > 170) & ~bg
lab, n = ndimage.label(cream)
sizes = ndimage.sum(cream, lab, range(1, n + 1))
big = [i + 1 for i in np.argsort(-sizes)[:2]]
alpha = np.where(bg, 0, 255).astype(np.uint8)
panels = []
for k in big:
    m = ndimage.binary_closing(lab == k, iterations=3)
    m = ndimage.binary_fill_holes(m)
    alpha[ndimage.binary_dilation(m, iterations=1)] = 0
    ys, xs = np.nonzero(m)
    pts = np.stack([xs, ys], 1)
    hull = pts[ConvexHull(pts).vertices]
    panels.append(hull)
# keep only the biggest solid piece's neighbourhood (drop stray specks)
rgba = np.dstack([rgb, alpha])
img = Image.fromarray(rgba, 'RGBA')
bb = img.getbbox()
img = img.crop(bb)
scale = 1200 / img.width
img = img.resize((1200, round(img.height * scale)), Image.LANCZOS)
img.quantize(256, method=Image.Quantize.FASTOCTREE).save(out_png, optimize=True)
polys = []
for hull in panels:
    p = [[round((x - bb[0]) * scale, 1), round((y - bb[1]) * scale, 1)] for x, y in hull]
    polys.append(p)
polys.sort(key=lambda p: min(q[0] for q in p))  # left panel first
json.dump({'size': list(img.size), 'panels': polys}, open(out_json, 'w'))
print(img.size, [len(p) for p in polys], [min(q[0] for q in p) for p in polys], [max(q[0] for q in p) for p in polys])
