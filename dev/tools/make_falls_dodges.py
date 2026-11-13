"""Falls and dodges (roadmap ART2 = 18.18 and ART3 = 13.44; Suleiman's email of 13 Nov, INBOX/2026-11-13b).

What came and what this cuts:
  Sudeen's fall sheet   4 sheets of 4 stages (standing, in the air, landed, getting up). Two are true views and two are
                        their twins flipped, so only the true ones are cut (the game mirrors): "Warrior's Fall and
                        Recovery Sequence" is the down-right view, "Warrior Turnaround, Leap, Crash, Recover" the up-right.
  Gaha's fall sheet     Gaha_Fall_512 (and its mirror) is the front view that is already in the game (checked: the three
                        pictures match gaha_fall_air, _land and _rise at 92 to 95 percent), so nothing is recut. The new
                        one is the BACK view, "Gaha's Four-Stage Spearfall Sequence" (up-right; its mirror is not cut).
                        Its stages: standing, in the air, hands and knees, curled up. The curled picture still has the
                        spear on the ground, so it is the landing (the crash), and hands and knees is the push up.
  Layra's dodge sheet   four views of a dodge (new: she had none).
  The archer's dodge    four views, replacing her old single dodge picture.
Four-view order on these sheets, the same as every four-view sheet from him so far: up-left, up-right, down-left, down-right.

Every sheet is sized by the character's standing picture: the head found in the sheet (the ruler's head finder, ruler_lib)
is made the size of the standing head, so the new pictures come in at the right size before the size ruler checks them.

Run from the project folder with the tools Python:
    ~/.fabien-tools/venv/bin/python dev/tools/make_falls_dodges.py <work folder> [<email folder>]
Writes public/art/<name>.png and puts them in src/data/art.json ("poses"), then run  ruler.py measure  and  ruler.py audit.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from sheet4 import raw_cut, final_cut
from ruler import model_for
from ruler_lib import find_head

WORK = sys.argv[1].rstrip('/') + '/'
EMAIL = (sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser('~/Documents/Fabien Blueprint/INBOX/2026-11-13b/email')).rstrip('/') + '/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
FOUR = ('upLeft', 'upRight', 'downLeft', 'downRight')

# sheet -> (file, character, what it is). "fall": cells are standing (the ruler), air, [then the two ground pictures]
SHEETS = {
    'sud_down': ("Sudeen's fall sheet/Sudeen/Warrior’s Fall and Recovery Sequence.png", 'h1', 'fall'),
    'sud_up': ("Sudeen's fall sheet/Sudeen/Warrior Turnaround_ Leap, Crash, Recover.png", 'h1', 'fall'),
    'gaha_back': ("Gaha's fall sheet/Gaha's sheet/Gaha’s Four-Stage Spearfall Sequence.png", 'h2', 'fall'),
    'layra_dodge': ('Layra dodge sheet/Layra dodge sheet/Pixel-Art Dodge Pose Sprite Sheet.png', 'h3', 'dodge'),
    'archer_dodge': ('archer dodge sheet/archer dodge sheet/Four-View Pixel Art Dodge Sprite Sheet.png', 'e3', 'dodge'),
}
# fall sheets: which cell is which picture (0-based), and the facing the sheet shows
FALL_CELLS = {
    'sud_down': {'air': 1, 'land': 2, 'rise': 3, 'facing': 'downRight', 'prefix': 'sudeen'},
    'sud_up': {'air': 1, 'land': 2, 'rise': 3, 'facing': 'upRight', 'prefix': 'sudeen'},
    'gaha_back': {'air': 1, 'land': 3, 'rise': 2, 'facing': 'upRight', 'prefix': 'gaha'},   # see the note above
}
DODGE_PREFIX = {'layra_dodge': 'layra', 'archer_dodge': 'archer'}

def feet_x_of(path):
    im = Image.open(path).convert('RGBA'); a = np.array(im)[..., 3] > 128; h = a.shape[0]
    cols = np.where(a[int(h * 0.94):].any(axis=0))[0]
    return round(float((cols[0] + cols[-1]) / 2 / a.shape[1]), 3)

cuts = {n: raw_cut(EMAIL + f, WORK, n) for n, (f, c, k) in SHEETS.items()}      # (cleaned sheet, boxes, raw files)
models = {}
def model(cid):
    if cid not in models: models[cid] = model_for(cid)
    return models[cid]

# the size of every sheet: its head against the standing head
scale = {}
for n, (f, cid, kind) in SHEETS.items():
    mdl, ref = model(cid)
    files = cuts[n][2]
    use = files[:1] if kind == 'fall' else files           # a fall sheet's first cell is its standing ruler
    radii = [h[2] for h in (find_head(Image.open(x).convert('RGBA'), mdl) for x in use) if h]
    assert radii, n + ': no head found'
    scale[n] = ref / float(np.median(radii))
    print('%s: head %s px on the sheet, standing head %.1f px: cut at %.3f' % (n, [round(r) for r in radii], ref, scale[n]), file=sys.stderr)

art = json.load(open(ART))
poses = lambda cid: art[cid].setdefault('poses', {})
made = []
for n, cells in FALL_CELLS.items():
    cid = SHEETS[n][1]
    for part in ('air', 'land', 'rise'):
        i = cells[part]
        name = '%s_fall_%s_%s.png' % (cells['prefix'], part, cells['facing'])
        # Gaha's spear lies apart from his body on the ground: keep small pieces too
        ox = final_cut(cuts[n][0], cuts[n][1][i], OUT + name, scale[n], keep=0.02 if cells['prefix'] == 'gaha' else 0.15)
        entry = {'file': name, 'originX': ox}
        cur = poses(cid).get('fall' + part.capitalize())
        if cur is not None and 'file' in cur:            # Gaha's front picture is already there: it becomes his down-right
            cur = {'downRight': cur}
        cur = cur or {}
        cur[cells['facing']] = entry
        poses(cid)['fall' + part.capitalize()] = cur
        made.append(name)
for n, prefix in DODGE_PREFIX.items():
    cid = SHEETS[n][1]
    dodge = {}
    for i, facing in enumerate(FOUR):
        name = '%s_dodge_%s.png' % (prefix, facing)
        ox = final_cut(cuts[n][0], cuts[n][1][i], OUT + name, scale[n])
        dodge[facing] = {'file': name, 'originX': ox}
        made.append(name)
    poses(cid)['dodge'] = dodge
art['h1']['note_falls'] = 'Fall set from Suleiman\'s 13 Nov sheets (dev/tools/make_falls_dodges.py): fallAir, fallLand, fallRise in two views; the game mirrors them for the other two.'
art['h3']['note_dodge'] = 'Layra\'s dodge, four views, from Suleiman\'s 13 Nov sheet (dev/tools/make_falls_dodges.py).'
json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
print('cut %d pictures, art.json updated' % len(made), file=sys.stderr)
print('\n'.join(made))
