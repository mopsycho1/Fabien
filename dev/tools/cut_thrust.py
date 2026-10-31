# Cuts row 1 of "TEST FOR GAHAS SPRITE WITH SKELETON" into six transparent frames.
# Each frame keeps its place in its column, so the six line up when played.
import sys, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
sys.path.insert(0, sys.argv[3])
from cutter import background_mask
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); rgb = np.array(im)
bg = background_mask(rgb)
fg = ndimage.binary_erosion(~bg, iterations=1)
boxes = [[17, 120, 169, 323], [199, 151, 379, 322], [397, 150, 563, 307], [591, 141, 801, 326], [804, 154, 987, 330], [1000, 110, 1191, 333]]
COL = 202; TOP = 95; meta = []
for k, (x0, y0, x1, y1) in enumerate(boxes):
    x0 -= 4; y0 -= 4; x1 += 4; y1 += 4
    a = fg[y0:y1, x0:x1]
    lab, n = ndimage.label(a)
    if n > 1:
        sizes = ndimage.sum(a, lab, range(1, n + 1))
        a = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(sizes) * 0.15])
    alpha = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    crop = im.crop((x0, y0, x1, y1)).convert('RGBA'); crop.putalpha(alpha)
    crop.save(f'{out}/thrust_{k}.png')
    meta.append({'x': x0 - k * COL, 'y': y0 - TOP, 'w': x1 - x0, 'h': y1 - y0})
json.dump(meta, open(f'{out}/thrust.json', 'w'))
print(meta)
