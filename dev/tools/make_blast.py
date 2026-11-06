# Tayo's Element Blast pictures (roadmap 13.4, 13.17), from Suleiman's 6 Nov 04:40 sheets.
# Poses (four views each, 1 to 4 = upLeft, upRight, downLeft, downRight like his other sheets):
#   blastWind   = 00001159 wide stance, fists drawn back (wind-up)
#   blastCharge = 00001160 arms open wide (gathering, while the dust rings spin)
#   blastPunch  = 00001157 fists forward (the release)
# The orb = 00001158, a 2 by 2 sheet of four fireball orbs (public/art/fx/blast_orb_0 to 3).
# Run from dev/:  python3 tools/make_blast.py <inbox dir 2026-11-06> <out dir for pose pictures>
import sys, os, glob, json
INB = sys.argv[1]; OUT = sys.argv[2].rstrip('/') + '/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from iso31 import clean, cells
from fxcut import cut
from PIL import Image
os.makedirs(OUT + 'clean/', exist_ok=True)
tmp = OUT + 'tmp.png'
def one(n): return glob.glob(INB + '/0000%s-*' % n)[0]
def prep(src, name):
    cl = OUT + 'clean/' + name + '.jpg'
    clean(src, cl, n=4)
    return cl, cells(cl, 4)
# same scale as his normal standing sheet (tallest figure = 215 px), like make_gauntlet.py
cl, bx = prep(one('1041'), 'stand')
hs = []
for b in bx:
    cut(cl, b, tmp, 1.0, strokes=False, keep=0.15, floor=True); hs.append(Image.open(tmp).height)
base = 215 / max(hs)
man = {}
for pose, n in (('blastWind', '1159'), ('blastCharge', '1160'), ('blastPunch', '1157')):
    cl, bx = prep(one(n), pose)
    man[pose] = {}
    for i, f in enumerate(['upLeft', 'upRight', 'downLeft', 'downRight']):
        out = OUT + 'tayo_n6d_%s_f%d.png' % (pose, i + 1)
        ox, size = cut(cl, bx[i], out, base, strokes=False, keep=0.15, floor=True)
        man[pose][f] = {'file': os.path.basename(out), 'originX': ox}
        print(out, size, ox)
# the four orbs: a 2 by 2 grid, light swirls kept (they are drawn additively in the game)
W, H = 1536, 1024
for i, box in enumerate([(0, 0, W // 2, H // 2), (W // 2, 0, W, H // 2), (0, H // 2, W // 2, H), (W // 2, H // 2, W, H)]):
    size, img = cut(one('1158'), box, '../public/art/fx/blast_orb_%d.png' % i, 0.5, strokes=True, keep=0.02)
    print('orb', i, img)
json.dump(man, open(OUT + 'blast.json', 'w'), indent=1)
# the white-hot centre of each orb was cut out as "background": find the round ball
# (opening removes the thin swirls), and paint a warm white core back over its middle
import numpy as np
from scipy import ndimage
for i in range(4):
    p = '../public/art/fx/blast_orb_%d.png' % i
    a = np.array(Image.open(p).convert('RGBA'))
    solid = ndimage.binary_fill_holes(a[..., 3] > 40)
    r = int(min(a.shape[:2]) * 0.2)
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]
    ball = ndimage.binary_opening(solid, structure=(xx * xx + yy * yy) <= r * r)
    cy, cx = ndimage.center_of_mass(ball)
    Y, X = np.ogrid[:a.shape[0], :a.shape[1]]
    core = ((X - cx) ** 2 + (Y - cy) ** 2) <= (r * 0.6) ** 2
    a[core & (a[..., 3] < 255)] = (255, 244, 205, 255)
    Image.fromarray(a).save(p)
