"""Gaha's wind-up and throw sheets (Suleiman, 15 Nov 13:05 email "Wind up and throw sheets for Gaha.7z"; roadmap 6.52, 18.29).

Two sheets, 2172 by 724, four views each, on white, each figure on a floor diamond:
  "Four-View Spear Warrior Concept Sheet.png"        the wind-up: spear raised over the shoulder, free arm out
  "Four-Panel Warrior Spear Throw Sprite Sheet.png"  the release: arm thrown out, the spear leaving his hand
They are wired as his drawn wind-up: before his Spear Throw (poses "throw" = the wind-up, "throwRelease" = the release)
and before his melee strike ("strikeWindup" = the wind-up; BattleScene.playAttack shows it for the draw back).

WHICH CELL IS WHICH FACING (looked at on a contact sheet; the order is NOT the usual up-left, up-right, down-left, down-right):
cells 1 and 2 are seen from the front, 3 and 4 from behind. In all four the spear and the free arm point the same way, which
is the way he faces: cells 1, 2 and 3 point left, cell 4 points right. So: cell 2 = down-left (its body is turned more, the
3/4 view; cell 1 is more face-on), cell 3 = up-left, cell 4 = up-right, and down-right is cell 2 flipped.
(Check this when you look at a battle: if he throws away from the target, swap the views in art.json.)

SIZE: each sheet is scaled so the head found in its figures (the ruler's head finder, ruler_lib) is the size of his standing
head, like the falls (make_falls_dodges.py). Run ruler.py measure h2 and audit after.

Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_gaha_windup.py <work folder> [<sheet folder>]
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import sheet4
from sheet4 import raw_cut, final_cut
from ruler import model_for
from ruler_lib import find_head

WORK = sys.argv[1].rstrip('/') + '/'
SRC = (sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/Documents/Fabien Blueprint/INBOX/2026-11-15/Email/Wind up and throw sheets for Gaha/Wind up and throw sheets for Gaha")).rstrip('/') + '/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')

SHEETS = {'wind': 'Four-View Spear Warrior Concept Sheet.png', 'release': 'Four-Panel Warrior Spear Throw Sprite Sheet.png'}
# facing -> (cell, flipped). The down-right view is the down-left cell flipped (the game mirrors it by "flip").
VIEWS = {'downLeft': (1, False), 'upLeft': (2, False), 'upRight': (3, False), 'downRight': (1, True)}

# The cells are 543 wide and the figures' spears and arms reach the cell edges, so the split by emptiest column (iso31.cells)
# cuts the released spear of view 3 off: split into four equal cells instead.
def equal_cells(cl, n):
    W, H = Image.open(cl).size
    return [(i * W // n, 0, (i + 1) * W // n, H) for i in range(n)]
sheet4.cells = equal_cells

def feet_x(path, flip):
    a = np.array(Image.open(path).convert('RGBA'))[..., 3] > 128; h = a.shape[0]
    cols = np.where(a[int(h * 0.94):].any(axis=0))[0]
    x = float((cols[0] + cols[-1]) / 2 / a.shape[1])
    return round(1 - x if flip else x, 3)

cuts = {n: raw_cut(SRC + f, WORK, n) for n, f in SHEETS.items()}
mdl, ref = model_for('h2')
scale = {}
for n in SHEETS:
    radii = [h[2] for h in (find_head(Image.open(x).convert('RGBA'), mdl) for x in cuts[n][2]) if h]
    assert radii, n + ': no head found'
    scale[n] = ref / float(np.median(radii))
    print('%s: heads %s px, standing head %.1f px: scale %.3f' % (n, [round(r) for r in radii], ref, scale[n]), file=sys.stderr)

art = json.load(open(ART))
poses = art['h2'].setdefault('poses', {})
made = {}
for n in SHEETS:
    made[n] = {}
    for facing, (cell, flip) in VIEWS.items():
        name = 'gaha_%s_%s.png' % (n, facing)
        x0, y0, x1, y1 = cuts[n][1][cell]
        # the released spear (a loose piece) is left out on purpose: the game draws its own spear flying (castThrow), so keeping it
        # would show two. A neighbour's feathers reaching over the cell edge are small loose pieces too and go the same way.
        erase = []
        final_cut(cuts[n][0], cuts[n][1][cell], OUT + name, scale[n], keep=0.15, erase=erase)
        entry = {'file': name, 'originX': feet_x(OUT + name, flip)}   # a flipped picture counts the point from the other side (as Kofi's)
        if flip:
            entry['flip'] = True
        made[n][facing] = entry
        print(name, entry, file=sys.stderr)
poses['throw'] = made['wind']
poses['throwRelease'] = made['release']
poses['strikeWindup'] = made['wind']
art['h2']['note_windup'] = "15 Nov (roadmap 6.52, 18.29): his drawn wind-up and release, four views each (dev/tools/make_gaha_windup.py). throw = the wind-up before Spear Throw, throwRelease = the release, strikeWindup = the same wind-up shown before his melee strike. Down-right is the down-left picture flipped."
json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
print('wired')
