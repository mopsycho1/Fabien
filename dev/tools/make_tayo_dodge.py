"""Tayo's dodge, 21 Nov (roadmap 6.70): Suleiman's three sheets of 16 Nov ("Tayo dodging sheets.7z"): the dodge in four views
(sheet 1, "southeast and northeast", four figures on a grey stone tile, no plates), the same four views with the flame
Enchantment on his fist (sheet 3), and sheet 2 ("southwest and northwest"), which is sheet 1 flipped (its figure 2 is
sheet 1's figure 1 mirrored, and so on): only the true views are cut, the game mirrors by itself.
The sheets have no plates, so the facings were read from the pictures: the top row shows his face (the game's "down"
views), the bottom row his back ("up"); the left column is turned to the viewer's right, the right column to the left. The
pictures were matched by hand with his battle stance (tayo_n6b_battle_f3/f4) and the Enchant sheet follows sheet 1 figure by figure.

Uses the kings' cutter (kings_raw.raw, make_kings.final_cut, the tile wiper); his tile is the same pale grey-pink as theirs.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_tayo_dodge.py <work folder>
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import kings_sheets
B = kings_sheets.I19 + 'Tayo dodging sheets/Tayo dodging        sheet/'
SHEETS = {
    'tayo_dodge': (B + 'Tayo dodging southeast, and northeast perspective..png', 'grid'),
    'tayo_dodge_fire': (B + 'Tayo dodging with enchantment active.png', 'grid'),
}
kings_sheets.SHEETS.update(SHEETS)
sys.argv = [sys.argv[0], sys.argv[1]]
# Layra's cutter does the work: each figure cut from the untouched sheet (iso31.clean skipped the Enchant sheet's tile and
# would take bronze for floor), then a floor wipe by colour with this tile's own palette
import make_layra_new as L
mk = L.mk

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
# figures 1 to 4 (top left, top right, bottom left, bottom right) -> the game's facing
ORDER = ['downRight', 'downLeft', 'upRight', 'upLeft']
BASE = 0.5     # picture pixels per sheet pixel; the ruler (ruler_marks.json, pose_sizes.json) sets the drawn size

# his tile: pale grey-pink on top, darker on the side; measured on the raw cuts. Bronze armour and skin have a much bigger
# green-blue gap than the tile, so the gate keeps them.
TILES = np.array([[188, 148, 120], [172, 132, 108], [118, 86, 68], [96, 68, 54]], float)
def gate(rgb):
    return (rgb[..., 0] - rgb[..., 1] > 14) & (rgb[..., 1] - rgb[..., 2] > 4) & (rgb[..., 1] - rgb[..., 2] < 40)

def cut(sheet):
    parts, files = L.raw(sheet)
    names = []
    for i, facing in enumerate(ORDER):
        name = '%s_%s.png' % (sheet, facing)
        cl, box = parts[i]
        mk.final_cut(cl, box, OUT + name, BASE, keep=0.15)
        names.append(name)
    for n in names: L.wipe_floor(OUT + n, tiles=TILES, tol=24.0, warm_gate=gate)
    out = {}
    for facing, name in zip(ORDER, names):
        out[facing] = {'file': name, 'originX': mk.feet_x(OUT + name)}
        print(sheet, facing, Image.open(OUT + name).size, file=sys.stderr)
    return out

if __name__ == '__main__':
    got = {s: cut(s) for s in SHEETS}
    art = json.load(open(ART)); e = art['e1']
    e['poses']['dodge'] = got['tayo_dodge']
    e['enchanted']['poses']['dodge'] = got['tayo_dodge_fire']
    e['note_dodge'] = ('21 Nov (6.70, dev/tools/make_tayo_dodge.py): his dodge in four views, and the same with the flame Enchantment on his fist '
                       '(enchanted.poses.dodge). Replaces tayo_dodge.png, the single old picture the game used to fall back to.')
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json e1 written', file=sys.stderr)
