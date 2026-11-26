"""Takes Suleiman's painted shadow and floor bits out from under a figure's feet (roadmap 1.103, 26 Nov: Suleiman still saw
"a bit of earth" under Layra; the game draws its own shadow, so a painted one reads as floor). feet_clean.py (1.86) is not
safe to run twice on her pictures: a second pass takes her olive trousers. This one only looks at the strip at the feet
(the bottom BAND of the picture) and only takes, where it reaches the outside of the figure:
  - grey shadow: low saturation, darker than mid grey, and NOT olive (her trousers are greener than they are blue);
  - pale sand: low saturation, light, warm (the floor tile's top); her sandals and skin are far stronger in colour.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/shadow_clean.py [--dry <out.jpg>] <picture.png> ...
      --check <picture.png> ...   prints how many floor pixels each picture still has (n117 runs it; under 40 is clean)
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

BAND = 0.18   # (0.30 with thin brown and tuft rules was tried: it took the dark outline along her skirt hems, 26 Nov)

def masks(a, band=BAND):
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(int); al = a[..., 3]
    sat = rgb.max(-1) - rgb.min(-1); mean = rgb.mean(-1)
    strip = np.zeros((h, w), bool); strip[int(h * (1 - band)):] = True
    olive = (rgb[..., 1] - rgb[..., 2]) > 12
    grey = (sat < 40) & (mean < 150) & ~olive
    sand = (sat < 62) & (mean >= 120) & (mean < 215) & ~olive
    cand = strip & (al > 0) & (grey | sand)
    lab, n = ndimage.label(cand)
    hit = np.unique(lab[ndimage.binary_dilation(al <= 10, iterations=2) & cand]); hit = hit[hit > 0]
    gone = np.isin(lab, hit)
    # loose specks left in the strip (not joined to the figure)
    rest = (al > 40) & ~gone
    lab2, n2 = ndimage.label(rest)
    if n2 > 1:
        sizes = ndimage.sum(rest, lab2, range(1, n2 + 1)); big = sizes.max()
        tops = ndimage.minimum(np.arange(h)[:, None].repeat(w, 1), lab2, range(1, n2 + 1))
        for i in range(1, n2 + 1):
            if sizes[i - 1] < 0.01 * big and tops[i - 1] >= int(h * (1 - band)): gone |= lab2 == i
    return gone

def clean(a):
    a = a.copy(); g = masks(a); a[g, 3] = 0
    return a, int(g.sum())

if __name__ == '__main__':
    args = sys.argv[1:]; dry = None
    if args and args[0] == '--check':
        for f in args[1:]: print('%s %d' % (f.split('/')[-1], int(masks(np.array(Image.open(f).convert('RGBA'))).sum())))
        sys.exit(0)
    if args and args[0] == '--dry': dry = args[1]; args = args[2:]
    tiles = []
    for f in args:
        a = np.array(Image.open(f).convert('RGBA'))
        if dry:
            g = masks(a); h, w = a.shape[:2]
            vis = Image.new('RGBA', (w, h), (30, 110, 60, 255)); vis.alpha_composite(Image.fromarray(a)); v = np.array(vis); v[g] = [255, 0, 255, 255]
            im = Image.fromarray(v).crop((0, int(h * 0.6), w, h)); im.thumbnail((240, 120)); tiles.append(im)
        else:
            out, n = clean(a)
            if n: Image.fromarray(out).save(f, optimize=True); print('cleaned %-44s %d pixels' % (f.split('/')[-1], n))
    if dry:
        cols = 6; rows = (len(tiles) + cols - 1) // cols
        sh = Image.new('RGB', (cols * 240, rows * 120), (0, 0, 0))
        for i, t in enumerate(tiles): sh.paste(t.convert('RGB'), ((i % cols) * 240, (i // cols) * 120))
        sh.save(dry)
