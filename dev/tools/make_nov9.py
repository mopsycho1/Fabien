# 9 Nov batch: Sudeen's Fury attack sheets (1199 to 1202), base attack (1204), Fury stances
# (1206, 1207) and the Furious Charge frames (1209) (roadmap 6.36).
# Run from dev/:  python3 tools/make_nov9.py <chat dir> <out dir> [<blueprint dir>]
# All these sheets are 2 by 2 grids (figures 1 to 4 in reading order), so they are cut
# straight from the original (no floor-tile cleaner). Every figure is written as
# <out>/s<chat>_<figure>.png at Sudeen's game size; assign.json (written by hand after
# the contact sheet check) says which figure is which facing. cut() keeps the picture
# facing as drawn; the Furious Charge frames are drawn facing left, so they are flipped.
import sys, os, json, glob
CHAT = sys.argv[1]
OUT = sys.argv[2].rstrip('/') + '/'
BP = (sys.argv[3] if len(sys.argv) > 3 else '/Users/motiago/Documents/Fabien Blueprint/')
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from iso31 import clean, cells
from fxcut import cut
from PIL import Image, ImageOps
import numpy as np
from scipy import ndimage

os.makedirs(OUT, exist_ok=True)
OCT = BP + 'NEW ISOMETRIC SHEETS AND OTHERS/PHOTO-2026-10-31-'
STAND = ('11-36-26', 174)  # his 31 Oct standing sheet and the pixel height of its tallest picture
SHEETS = ['1199', '1200', '1201', '1202', '1204', '1206', '1207', '1209']
FLIP = {'1209'}

def src_of(num):
    return glob.glob(CHAT + '/0000' + num + '-*')[0]

def grid(num):
    w, h = Image.open(src_of(num)).size
    return [(0, 0, w // 2, h // 2), (w // 2, 0, w, h // 2), (0, h // 2, w // 2, h), (w // 2, h // 2, w, h)]

def base_of():
    stamp, px = STAND
    cl = OUT + 'oct_clean.jpg'
    clean(OCT + stamp + '.jpg', cl, n=4)
    tmp = OUT + 'tmp.png'; hs = []
    for b in cells(cl, 4):
        cut(cl, b, tmp, 1.0, strokes=False, keep=0.15, floor=True); hs.append(Image.open(tmp).height)
    return px / max(hs)

def tidy(out):
    # wipe the grey floor shadow round the feet, drop specks, quantize (as make_nov8 does)
    im = Image.open(out)
    arr = np.array(im.convert('RGBA')).astype(int); h = arr.shape[0]
    rgb = arr[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
    zone = np.zeros(arr.shape[:2], bool); zone[int(h * 0.62):] = True
    floor = zone & (chroma < 75) & (lum > 105) & (lum < 232) & (rgb[..., 0] - rgb[..., 1] > -4) & (rgb[..., 0] - rgb[..., 1] < 45) & (rgb[..., 1] - rgb[..., 2] < 26)
    arr[floor, 3] = 0
    lab, n = ndimage.label(ndimage.binary_dilation(arr[..., 3] > 40, iterations=2))
    if n > 1:
        sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        arr[~np.isin(lab, [i + 1 for i, v in enumerate(sz) if v > 0.08 * max(sz)]), 3] = 0
    im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    a = im.getchannel('A')
    q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(a); q.save(out, optimize=True)

base = base_of()
mult = json.load(open(OUT + 'mult.json')) if os.path.exists(OUT + 'mult.json') else {}
manifest = {}
for num in SHEETS:
    for i, b in enumerate(grid(num), 1):
        out = OUT + 's%s_%d.png' % (num, i)
        ox, size = cut(src_of(num), b, out, base * mult.get(num, 1.0), strokes=False, keep=0.15, floor=True)
        if num in FLIP:  # drawn facing left: flip so the move faces right like his other moves
            im = ImageOps.mirror(Image.open(out)); im.save(out); ox = 1 - ox
        tidy(out)
        manifest['s%s_%d' % (num, i)] = {'file': os.path.basename(out), 'originX': round(ox, 3)}
        print(num, i, size, file=sys.stderr)
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
