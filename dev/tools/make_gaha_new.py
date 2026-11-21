"""Gaha's new set, 21 Nov (roadmap 6.72): Suleiman's 18 Nov sheets ("Gaha updated character sheet.7z", all 1448 by 1086, four
figures in two rows of two on a tile): the new NEUTRAL turnaround (spear resting on his shoulder; his own wish: "the only
thing I'm gonna change is his neutral stance and his battle damaged stance"), BATTLE DAMAGED in two sheets (crouched, spear low,
blood on the blade, torn cloak; two drawings of each view, top and bottom row, the top row is used), the LUNGE LEAP (in the air,
spear forward) and the LUNGE ATTACK (the end of the lunge, spear thrust out).

Facings (no plates on the neutral and damaged sheets; the leap and attack sheets have plates, which here name the way he faces):
  neutral: top left = back, spear tip to the right = up-right; top right = front, tip right = down-right;
           bottom left = back, tip left = up-left; bottom right = front, tip left = down-left (each front is the 180 degree partner
           of the back on the other side, and the fronts match his old standing picture).
  damaged "southwest and northeast": figure 1 = front, tip left = down-left; figure 2 = back, tip right = up-right (3 and 4 the
           second drawing of the same).  "southeast and northwest": 1 = back, tip left = up-left; 2 = front, tip right = down-right.
  leap and attack: NW, NE, SW, SE as printed (the top row shows his back).

Layra's cutter does the work (L.raw: each figure cut from the untouched sheet; L.wipe_floor: the tile wiped by colour).
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_gaha_new.py <work folder> [raw]
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import kings_sheets
B = kings_sheets.I19 + 'Gaha updated character sheet/Gaha updated character sheet/'
SHEETS = {
    'gaha_n_stand':   (B + 'Gaha’s Four-Direction Character Turnaround neutral.png', 'grid'),
    'gaha_n_weakA':   (B + 'Gaha battle damaged, southwest and northeast.png', 'grid'),
    'gaha_n_weakB':   (B + 'Gaha battle damaged southeast and northwest.png', 'grid'),
    'gaha_n_leap':    (B + 'Skill and Effect-Lunge/Gaha lunge leap.png', 'grid'),
    'gaha_n_lunge':   (B + 'Skill and Effect-Lunge/Gaha lunge attack.png', 'grid'),
}
kings_sheets.SHEETS.update(SHEETS)
sys.argv = [sys.argv[0], sys.argv[1]]
import make_layra_new as L
mk = L.mk

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
# (figure number 1 to 4 = top left, top right, bottom left, bottom right) -> facing
VIEWS = {
    'gaha_n_stand': {1: 'upRight', 2: 'downRight', 3: 'upLeft', 4: 'downLeft'},
    'gaha_n_weakA': {1: 'downLeft', 2: 'upRight'},
    'gaha_n_weakB': {1: 'upLeft', 2: 'downRight'},
    'gaha_n_leap':  {1: 'upLeft', 2: 'upRight', 3: 'downLeft', 4: 'downRight'},
    'gaha_n_lunge': {1: 'upLeft', 2: 'upRight', 3: 'downLeft', 4: 'downRight'},
}
BASE = 0.445    # picture pixels per sheet pixel (0.5 times 0.89: so that the new standing is the ruler itself, scale 1); the ruler sets the drawn size (ruler_marks.json, pose_sizes.json)
# the tile: a pink-brown stone with a grid of joints (measured on the raw cuts), shadow darker; the spear, cloak and skin are
# a stronger orange or a deeper brown, so the warm gate (red over green, small green over blue) keeps them
TILES = np.array([[196, 138, 102, 24], [176, 125, 92, 24], [122, 72, 45, 14], [95, 54, 31, 10]], float)   # the 4th number: that colour's own tolerance (his dark trousers are near the dark side face)
LEAP_TILES = np.array([[203, 150, 118, 30], [173, 120, 100, 26], [140, 100, 88, 20]], float)
def gate(rgb):
    return (rgb[..., 0] - rgb[..., 1] > 20) & (rgb[..., 1] - rgb[..., 2] > 6) & (rgb[..., 1] - rgb[..., 2] < 40)

def gate_leap(rgb):    # the leap sheets' marker tile is a paler, greyer pink
    return (rgb[..., 0] - rgb[..., 1] > 10) & (rgb[..., 1] - rgb[..., 2] > 2) & (rgb[..., 1] - rgb[..., 2] < 40)

def cut(sheet):
    parts, files = L.raw(sheet)
    out = {}
    for fig, facing in VIEWS[sheet].items():
        name = '%s_%s.png' % (sheet, facing)
        cl, box = parts[fig - 1]
        # keep=0.02: the spear point and its feathers are apart from the body on some sheets
        mk.final_cut(cl, box, OUT + name, BASE, keep=0.02)
        L.wipe_floor(OUT + name, tiles=TILES if sheet != 'gaha_n_leap' else LEAP_TILES, tol=24.0, warm_gate=gate if sheet != 'gaha_n_leap' else gate_leap)
        if sheet == 'gaha_n_leap': L.floor_tidy(OUT + name, LEAP_TILES, gate_leap)   # airborne: the marker tile and its shadow lie below the feet (his boots are not tile coloured); on the other sheets the boots stand on the tile and the tidy step would cut the legs
        out[facing] = {'file': name, 'originX': mk.feet_x(OUT + name)}
        print(sheet, facing, Image.open(OUT + name).size, file=sys.stderr)
    return out

def mirrored(got):
    return got

if __name__ == '__main__':
    if len(sys.argv) > 1 and os.environ.get('RAW'):
        for s in SHEETS: L.raw(s)
        sys.exit()
    got = {s: cut(s) for s in SHEETS}
    art = json.load(open(ART)); e = art['h2']
    e['standing'] = got['gaha_n_stand']
    # The game draws every picture of a unit at height / tallest standing picture (BattleScene, artScale). The old standing was 200
    # tall and "height" 100, so one picture pixel was drawn at 0.5. His new standing is taller (a taller body, and a few specks of
    # tile under the feet), so "height" follows it: the pixel stays 0.5 and he is drawn exactly as big as before in the game.
    tallest = max(Image.open(OUT + v['file']).height for v in got['gaha_n_stand'].values())
    e['height'] = round(0.5 * tallest)
    weak = {}; weak.update(got['gaha_n_weakA']); weak.update(got['gaha_n_weakB'])
    e['weak'] = weak
    e['poses']['lungeLeap'] = got['gaha_n_leap']
    e['poses']['lungeAttack'] = got['gaha_n_lunge']
    e['note_n18'] = ('18 Nov sheets, wired 21 Nov (6.72, dev/tools/make_gaha_new.py): the new neutral (spear on the shoulder) is his standing in four '
                     'facings, the battle damaged sheets his weak look in four facings, the Lunge leap and Lunge attack sheets the poses lungeLeap and '
                     'lungeAttack (BattleScene.castLunge).')
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json h2 written', file=sys.stderr)
