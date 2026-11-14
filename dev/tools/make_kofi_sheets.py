"""Kofi's 13 Nov sheets (roadmap 6.38, M10b): his casting pictures in his four elements,
his hurt reaction and his defeated picture. From "Kofi's Sheets.7z" in the 13 Nov email
(INBOX/2026-11-13/email), eleven sheets, four figures each, on white, 2172 by 724.

What each sheet is (seen on a contact sheet):
  channel (hands round a glowing orb)      release (one arm thrown out)
  water / spirit, green   "Kofi’s Blue-Gold Spellcaster Turnaround"     "Four-View Teal Robe Casting Sequence"
  fire, red               "Kofi’s Ember Spellcasting Views"             "Ember-Robes Spellcasting Turnaround"
  storm, pale ribbons     "Isometric Wind Spellcaster Character Sheet"  "Kofi’s Fourfold Casting Stance"
  earth, gold and stones  "Kofi’s Fourfold Spellcasting Concept Sheet"  "Kofi’s Spellcasting Turnaround Sheet"
  hurt: "Four-View Hurt Reaction Character Sheet" (its "mirrored" twin is not needed: the game mirrors)
  down: "Kofi’s Shattered Dream Lantern Turnaround" (kneeling, the lantern broken beside him)

WHICH WAY THE FIGURES FACE. On all eight casting sheets the four figures are: 1 front, arm to
our right; 2 from behind, arm to our right; 3 front, arm to our right again; 4 from behind, arm
to our left. So there is no drawn down-left view: the game mirrors figure 3 for it ("flip").
(The archer's bow sheets were wired wrongly for the same reason, roadmap 1.45: look first.)

Sizes: ONE scale for all ten sheets (SCALE below). The size ruler's head finder is fooled here:
the glowing orbs beside his head and his spread top-knot read as a head a third too big, and
differently on every sheet (0.17 to 0.37). All ten sheets come from one email at one cell size,
and he stands upright in the casting pictures, about 640 pixels tall against 300 in the game's
standing picture, so 0.455 puts them at his standing size. Checked by eye on a sheet next to
his standing picture; the head readings are still printed, for information.

Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_kofi_sheets.py <work folder> [<sheets folder>]
then  ruler.py measure  and  ruler.py audit.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from sheet4 import raw_cut, final_cut
from ruler import model_for
from ruler_lib import find_head

WORK = sys.argv[1].rstrip('/') + '/'
SRC = (sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/Documents/Fabien Blueprint/INBOX/2026-11-13/email/Kofi's Sheets/Kofi's Sheets")).rstrip('/') + '/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')

CAST = {  # element: (channel sheet, release sheet)
    'water': ('Kofi’s Blue-Gold Spellcaster Turnaround.png', 'Four-View Teal Robe Casting Sequence.png'),
    'fire': ('Kofi’s Ember Spellcasting Views.png', 'Ember-Robes Spellcasting Turnaround.png'),
    'storm': ('Isometric Wind Spellcaster Character Sheet.png', 'Kofi’s Fourfold Casting Stance.png'),
    'earth': ('Kofi’s Fourfold Spellcasting Concept Sheet.png', 'Kofi’s Spellcasting Turnaround Sheet.png'),
}
# figure (0-based) -> the facing it is wired as; (2, True) = figure 3 mirrored
CAST_VIEWS = {'downRight': (0, False), 'upRight': (1, False), 'downLeft': (2, True), 'upLeft': (3, False)}
HURT = ('Four-View Hurt Reaction Character Sheet.png', {'upRight': 0, 'upLeft': 1, 'downLeft': 2, 'downRight': 3})
DOWN = ('Kofi’s Shattered Dream Lantern Turnaround.png', {'upLeft': 0, 'upRight': 1, 'downRight': 2, 'downLeft': 3})

model, ref = model_for('h4')

def wipe_floor(path, keep_small=False):
    """The painted floor shadow under him is a flat tan (about 165, 140, 120). Where the cutter
    left a sliver of it beside his feet, it is wiped here: only in the bottom quarter of the
    picture, only that flat colour (his sandals are a deeper brown, his robe a paler cream), and
    only pieces that reach the outside of the figure. Then loose specks go and the picture is
    trimmed. Returns where the feet are across it (0 to 1)."""
    from scipy import ndimage
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(int); h, w = a.shape[:2]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3].copy()   # (a copy: 'al' is the picture before anything is wiped)
    tan = (al > 40) & (r > 135) & (r < 196) & (r - b > 34) & (r - b < 64) & (r - g > 14) & (r - g < 40)
    tan[: int(h * 0.74)] = False
    # flat: the same colour as its neighbours (cloth and skin are painted with strokes)
    grey = (r + g + b) / 3.0
    rough = ndimage.generic_filter(grey, np.std, size=5)
    tan &= rough < 9
    lab, n = ndimage.label(tan)
    if n:
        sizes = ndimage.sum(tan, lab, range(1, n + 1))
        outside = ndimage.binary_dilation(al <= 40, iterations=3)
        for i in range(1, n + 1):
            piece = lab == i
            if sizes[i - 1] >= 30 and (piece & outside).any():
                a[ndimage.binary_dilation(piece, iterations=1) & tan | piece, 3] = 0
    # the shadow's thin outline is left where the fill was wiped: near the wiped area, anything
    # too thin to be part of him (it vanishes when shaved by 2 pixels) goes too
    wiped = (al > 40) & (a[..., 3] == 0)
    if wiped.any():
        zone = ndimage.binary_dilation(wiped, iterations=7)
        zone[: int(h * 0.74)] = False
        left = a[..., 3] > 0
        thin = left & ~ndimage.binary_opening(left, iterations=2) & zone
        a[thin, 3] = 0
    solid = a[..., 3] > 128
    lab, n = ndimage.label(solid)
    if n > 1 and not keep_small:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        for i in range(1, n + 1):
            if sizes[i - 1] < 0.004 * solid.sum(): a[lab == i, 3] = 0
    out = Image.fromarray(a.astype(np.uint8), 'RGBA'); out = out.crop(out.getbbox()); out.save(path, optimize=True)
    m = np.array(out)[..., 3] > 128; hh = m.shape[0]
    cols = np.where(m[int(hh * 0.94):].any(axis=0))[0]
    return round(float((cols[0] + cols[-1]) / 2 / m.shape[1]), 3)
SCALE = 0.455   # every sheet of this batch (see "Sizes" above)

def sheet(name, file):
    cl, boxes, raws = raw_cut(SRC + file, WORK, name)
    radii = [h[2] for h in (find_head(Image.open(x).convert('RGBA'), model) for x in raws) if h]
    return cl, boxes, (ref / float(np.median(radii)) if radii else None), [round(r) for r in radii]

art = json.load(open(ART)); kofi = art['h4']; poses = kofi['poses']
made = []
elements = {}
for el, (chan, rel) in CAST.items():
    elements[el] = {}
    for pose, file in (('chant', chan), ('cast', rel)):
        name = 'kofi_%s_%s' % (el, pose)
        cl, boxes, scale, radii = sheet(name, file)
        print('%s: the head finder reads %s (it would cut at %s); cut at %.3f' % (name, radii, scale and round(scale, 3), SCALE), file=sys.stderr)
        scale = SCALE
        views = {}
        for facing, (i, flip) in CAST_VIEWS.items():
            out = '%s_f%d.png' % (name, i + 1)
            final_cut(cl, boxes[i], OUT + out, scale)
            ox = wipe_floor(OUT + out)
            views[facing] = {'file': out, 'originX': round(1 - ox, 3) if flip else ox}
            if flip: views[facing]['flip'] = True
            made.append(out)
        elements[el][pose] = views
for pose, (file, views_of), keep in (('hurt', HURT, 0.15), ('down', DOWN, 0.02)):
    name = 'kofi_' + pose
    cl, boxes, scale, radii = sheet(name, file)
    scale = SCALE
    print('%s: cut at %.3f' % (name, scale), file=sys.stderr)
    views = {}
    for facing, i in views_of.items():
        out = '%s_f%d.png' % (name, i + 1)
        final_cut(cl, boxes[i], OUT + out, scale, keep=keep)
        views[facing] = {'file': out, 'originX': wipe_floor(OUT + out, keep_small=pose == 'down')}
        made.append(out)
    poses[pose] = views
poses['knocked'] = poses['hurt']
# his plain casting pictures are the water / spirit set (green, his lantern's own colour);
# the other elements are picked by his Reading (see "elementPoses" in art.js)
poses['chant'] = elements['water']['chant']
poses['cast'] = elements['water']['cast']
poses['attack'] = elements['water']['cast']
kofi['elementPoses'] = {el: {'chant': v['chant'], 'cast': v['cast'], 'attack': v['cast']} for el, v in elements.items()}
kofi['note_sheets'] = ('13 Nov sheets (dev/tools/make_kofi_sheets.py): chant (channel) and cast (release) in his four elements under '
                       '"elementPoses" (water, fire, storm, earth), hurt, down. No down-left casting view was drawn: it is figure 3 mirrored.')
json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
print('cut %d pictures, art.json updated' % len(made), file=sys.stderr)
