"""Kofi's dodge, 21 Nov (roadmap 6.71): Suleiman's "Kofi's Isometric Dodge Pose Sheet" (19 Nov, 1448 by 1086, four figures in two
rows of two: a deep crouch, one lantern swung out, the poncho flying; no tile and no plates, but a grey drop shadow under each).
The top row shows his back (the game's "up" views), the bottom row his face ("down"); the left figure of each row leans to the
viewer's left. Facings read from the pictures: his feet and lantern follow the lean, and each front figure is the 180 degree
partner of the back figure on the other side (bottom left, down-left, against top right, up-right).

Layra's cutter does the work (each figure cut from the untouched sheet); the grey shadow is wiped here (low colour, mid grey,
reaching the outside), because his cream cloth is warmer and brighter than the shadow.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_kofi_dodge.py <work folder>
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage
import kings_sheets
SRC = kings_sheets.I19 + 'Kofi dodge sheet/Kofi updated sheets/Kofi’s Isometric Dodge Pose Sheet.png'
SHEETS = {'kofi_dodge': (SRC, 'grid')}
kings_sheets.SHEETS.update(SHEETS)
sys.argv = [sys.argv[0], sys.argv[1]]
import make_layra_new as L
mk = L.mk

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
ORDER = ['upLeft', 'upRight', 'downLeft', 'downRight']      # figures 1 to 4 (top left, top right, bottom left, bottom right)
BASE = 0.5      # the ruler (ruler_marks.json) sets the drawn size; his head cannot be read well on a crouch, so see pose_sizes.json

def wipe_shadow(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(float); h = a.shape[0]
    rgb = a[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); mean = rgb.mean(-1)
    m = (chroma < 24) & (mean > 105) & (mean < 220) & (a[..., 3] > 0)
    m[:int(h * 0.30)] = False
    lab, k = ndimage.label(m)
    outside = ndimage.binary_dilation(a[..., 3] <= 30, iterations=2)
    hit = np.unique(lab[outside & m]); hit = hit[hit > 0]
    sizes = ndimage.sum(m, lab, range(1, k + 1))
    big = [i + 1 for i, v in enumerate(sizes) if v >= 140]
    m = np.isin(lab, np.concatenate([hit, big]).astype(int))
    a[ndimage.binary_dilation(m, iterations=1) & (a[..., 3] > 0) & (chroma < 34) & (mean > 90) & (mean < 232), 3] = 0
    solid = a[..., 3] > 128; lab, k = ndimage.label(solid)
    if k > 1:
        sizes = ndimage.sum(solid, lab, range(1, k + 1))
        for i in range(1, k + 1):
            if sizes[i - 1] < 0.01 * sizes.max(): a[lab == i, 3] = 0
    im = Image.fromarray(a.astype(np.uint8), 'RGBA'); im.crop(im.getbbox()).save(path, optimize=True)

def cut():
    parts, files = L.raw('kofi_dodge')
    out = {}
    for i, facing in enumerate(ORDER):
        name = 'kofi_dodge_%s.png' % facing
        cl, box = parts[i]
        mk.final_cut(cl, box, OUT + name, BASE, keep=0.15)
        wipe_shadow(OUT + name)
        out[facing] = {'file': name, 'originX': mk.feet_x(OUT + name)}
        print('kofi_dodge', facing, Image.open(OUT + name).size, file=sys.stderr)
    return out

if __name__ == '__main__':
    got = cut()
    art = json.load(open(ART)); e = art['h4']
    e['poses']['dodge'] = got
    e['note_dodge'] = ('21 Nov (6.71, dev/tools/make_kofi_dodge.py): his dodge sheet in four views (a deep crouch, one lantern swung out). '
                       'It replaces the battle-stance pictures the dodge used before.')
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json h4 written', file=sys.stderr)
