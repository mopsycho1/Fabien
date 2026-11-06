# Tayo's flaming-gauntlet look (roadmap 13.3, 6 Nov 15:21 "gauntlet picture.png"): four views, 1 to 4 left to right.
# Run from dev/:  python3 tools/make_gauntlet.py <inbox dir 2026-11-06> <out dir>
# Cut at the same scale as his normal standing sheet (tallest figure = 215 px), like make_nov6b.py.
import sys, os, glob, json
INB = sys.argv[1]; OUT = sys.argv[2].rstrip('/') + '/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from iso31 import clean, cells
from fxcut import cut
from PIL import Image
os.makedirs(OUT + 'clean/', exist_ok=True)
def prep(src, name):
    cl = OUT + 'clean/' + name + '.jpg'
    clean(src, cl, n=4)
    return cl, cells(cl, 4)
tmp = OUT + 'tmp.png'
cl, bx = prep(glob.glob(INB + '/00001041-*')[0] if glob.glob(INB + '/00001041-*') else glob.glob(INB + '/*1041*')[0], 'stand')
hs = []
for b in bx:
    cut(cl, b, tmp, 1.0, strokes=False, keep=0.15, floor=True); hs.append(Image.open(tmp).height)
base = 215 / max(hs)
cl, bx = prep(INB + '/gauntlet picture.png', 'gauntlet')
man = {}
for i in range(4):
    out = OUT + 'tayo_n6c_gauntlet_f%d.png' % (i + 1)
    ox, size = cut(cl, bx[i], out, base, strokes=False, keep=0.15, floor=True)
    man['f%d' % (i + 1)] = {'file': os.path.basename(out), 'originX': ox}
    print(out, size, ox)
json.dump(man, open(OUT + 'gauntlet.json', 'w'), indent=1)
