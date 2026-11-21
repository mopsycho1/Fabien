"""Layra's new set, 21 Nov (roadmap 6.69): Suleiman's ten sheets of 16 Nov ("Layra updated character sheets.7z", four views each,
two rows of two, on a floor tile with a compass plate under each). They replace her whole old set: standing, battle
stance, blocking (guard), dodge, preparing spell (chant), releasing spell (cast), taking damage (hurt), near defeat
(weak), fallen (kneeling: down, the fall's last stage) and defeated (lying down).

Uses the kings' cutter (kings_raw.raw, make_kings.final_cut, the tile wiper). The order of the four figures is NOT the
same on every sheet (the plates say which way each faces), so ORDER lists the compass plate of figures 1 to 4 per sheet,
read off the plates; a facing is then NE = upRight, NW = upLeft, SE = downRight, SW = downLeft.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_layra_new.py <work folder> [raw]    ("raw" only cuts the figures)
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage
import kings_sheets
B = kings_sheets.I19 + 'Layra updated character sheets/Layra updated character sheets/'
SHEETS = {
    'layra_n_stand':   (B + 'Layra Neutral.png', 'grid'),
    'layra_n_battle':  (B + 'Layra Battle Stance.png', 'grid'),
    'layra_n_block':   (B + 'Layra Blocking.png', 'grid'),
    'layra_n_dodge':   (B + 'Layra dodging.png', 'grid'),
    'layra_n_chant':   (B + 'Layra preparing spell..png', 'grid'),
    'layra_n_cast':    (B + 'Layra releasing spell.png', 'grid'),
    'layra_n_hurt':    (B + 'Layra taking damage.png', 'grid'),
    'layra_n_weak':    (B + 'Layra near defeat..png', 'grid'),
    'layra_n_fallen':  (B + 'Layra’s fallen Isometric Sprite Sheet.png', 'grid'),
    'layra_n_down':    (B + 'Layra’s Defeated Isometric Views.png', 'grid'),
}
kings_sheets.SHEETS.update(SHEETS)
sys.argv = [sys.argv[0], sys.argv[1]]
import make_kings as mk
from kings_raw import raw as _kings_raw
from iso31 import cells
from fxcut import cut as fx_cut

def raw(name):
    """Like kings_raw.raw but WITHOUT iso31.clean: that painted the grey of her trousers white (it takes them for floor).
    The two rows of the sheet are cut apart and each figure is cut from the untouched sheet; her own tile wiper
    (wipe_floor, below) takes the floor away afterwards."""
    src = kings_sheets.SHEETS[name][0]
    im = Image.open(src).convert('RGB'); w, h = im.size
    parts, files = [], []
    for r in range(2):
        strip = mk.WORK + '%s_row%d_plain.png' % (name, r)
        im.crop((0, r * h // 2, w, (r + 1) * h // 2)).save(strip)
        parts += [(strip, b) for b in cells(strip, 2)]
    for i, (cl, b) in enumerate(parts):
        out = mk.WORK + '%s_plain%d.png' % (name, i + 1)
        fx_cut(cl, b, out, 1.0, strokes=False, keep=0.15, floor=True)
        files.append(out)
    return parts, files

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
# Her plates are NOT one rule. On stand, battle, chant and cast the top row (plates NE and NW) shows her FRONT, so there the plate
# names the camera's side: front NE = she faces down-right, front NW = down-left, back SE = up-right, back SW = up-left (the
# opposite figure of the front one). On block, dodge, hurt, weak, fallen and down the plate is the way she faces: SE and SW show
# her front (down-right, down-left), NE and NW her back (up-right, up-left), which is the game's own naming. Found by looking:
# in the game "down" is the view that shows her face (her old standing pictures).
F_FACES = {'NE': 'upRight', 'NW': 'upLeft', 'SE': 'downRight', 'SW': 'downLeft'}
F_CAMERA = {'NE': 'downRight', 'NW': 'downLeft', 'SE': 'upRight', 'SW': 'upLeft'}
CAMERA_SHEETS = ('layra_n_stand', 'layra_n_battle', 'layra_n_chant', 'layra_n_cast')
def facing(sheet, plate):
    return (F_CAMERA if sheet in CAMERA_SHEETS else F_FACES)[plate]
# the compass plate of figures 1 to 4 (top left, top right, bottom left, bottom right), read off each sheet
ORDER = {
    'layra_n_stand':  ['NE', 'NW', 'SE', 'SW'],
    'layra_n_battle': ['NE', 'NW', 'SE', 'SW'],
    'layra_n_block':  ['SE', 'SW', 'NW', 'NE'],
    'layra_n_dodge':  ['SE', 'SW', 'NW', 'NE'],
    'layra_n_chant':  ['NE', 'NW', 'SE', 'SW'],
    'layra_n_cast':   ['NE', 'NW', 'SE', 'SW'],
    'layra_n_hurt':   ['SE', 'SW', 'NW', 'NE'],
    'layra_n_weak':   ['SW', 'NE', 'SE', 'NW'],
    'layra_n_fallen': ['SE', 'SW', 'NW', 'NE'],
    'layra_n_down':   ['SE', 'SW', 'NW', 'NE'],
}
# the cut size: picture pixels per sheet pixel. One size for the whole set, then set by eye per sheet (SIZE) where he drew
# a pose bigger or smaller; checked next to the neutral on a contact sheet and by dev/tools/ruler.py
BASE = 0.48
SIZE = {}

# the colours of her floor tile, measured on the neutral sheet: lit top, grout line, side face, shadow under her
TILES = np.array([[195, 143, 98], [172, 128, 90], [118, 82, 60]], float)
TOL = 24.0
BIG_PATCH = 140      # pixels; the smallest patch of tile left on her side of the picture that is still wiped

def tile_colours(a):
    """Her tile is not the same brown on every sheet (a lighter pinker one on the block and dodge sheets), so each picture
    finds its own: the rim of the picture in its lower third, away from the middle where she stands, is all tile. Three
    colour clusters of it (lit top, grout, side face) are the tile colours."""
    from scipy.cluster.vq import kmeans2
    h, w = a.shape[:2]; solid = a[..., 3] > 200
    rim = solid & (ndimage.distance_transform_edt(solid) <= 7)
    yy, xx = np.mgrid[0:h, 0:w]
    zone = rim & (yy > h * 0.62) & (np.abs(xx - w / 2) > 0.22 * w)
    px = a[..., :3][zone]
    if len(px) < 60: return TILES
    np.random.seed(1)
    cen, lab = kmeans2(px, 3, minit='++', seed=1)
    return cen

def wipe_floor(path, **kw):
    _wipe_once(path, **kw)

def _wipe_once(path, tiles=None, tol=None, warm_gate=None):
    """Takes away the floor tile, its shadow and the compass plate. The kings' wiper looks for a pale grey tile; hers is a
    brown one, so this one has its own colours. Pixels near a tile colour in the lower part that can be reached from the
    outside through tile-coloured pixels go (her skin, leather, trousers and cloth are other colours, so they stay);
    then every piece that hangs below the feet (the plate) and the specks go."""
    a = np.array(Image.open(path).convert('RGBA')).astype(float); h = a.shape[0]
    rgb = a[..., :3]
    tiles = TILES if tiles is None else tiles   # (tile_colours(a) found a colour per picture, but the rim is mostly side face and shadow: worse)
    tol = TOL if tol is None else tol
    dist = np.min([np.sqrt(((rgb - t) ** 2).sum(-1)) for t in tiles], axis=0)
    # the tile is warm (red well above green); her olive trousers are not, and are as dark as the tile's side face
    warm = (rgb[..., 0] - rgb[..., 1] > 22) & (rgb[..., 1] - rgb[..., 2] > 10) if warm_gate is None else warm_gate(rgb)
    # moss and grass on the tile: yellow-green (her orange cloth and gold are redder)
    moss = (rgb[..., 1] > 118) & (rgb[..., 2] < 100) & (rgb[..., 0] - rgb[..., 1] < 35) & (rgb[..., 0] - rgb[..., 1] > -15)
    m = (((dist < tol) & warm) | moss) & (a[..., 3] > 0)
    m[:int(h * 0.45)] = False
    lab, k = ndimage.label(m)
    outside = ndimage.binary_dilation(a[..., 3] <= 30, iterations=2)
    hit = np.unique(lab[outside & m]); hit = hit[hit > 0]
    # a patch of tile cut off from the outside by a dark grout line or her shadow goes too when it is big (a flagstone)
    sizes = ndimage.sum(m, lab, range(1, k + 1))
    big = [i + 1 for i, v in enumerate(sizes) if v >= BIG_PATCH]
    m = np.isin(lab, np.concatenate([hit, big]).astype(int))
    a[ndimage.binary_dilation(m, iterations=1) & (a[..., 3] > 0) & (dist < tol + 14) & warm, 3] = 0
    solid = a[..., 3] > 128; lab, k = ndimage.label(solid)
    if k > 1:
        sizes = ndimage.sum(solid, lab, range(1, k + 1)); main = int(np.argmax(sizes)) + 1
        ys = np.where((lab == main).any(1))[0]; main_bottom = ys.max()
        for i, sl in enumerate(ndimage.find_objects(lab), 1):
            if i == main: continue
            low = sl[0].start > h * 0.62
            px = a[..., :3][lab == i]; golden = 12 < (px[:, 0] - px[:, 1]).mean() < 55 and px[:, 2].mean() < 105
            if sizes[i - 1] < 0.01 * sizes.max() or sl[0].start >= main_bottom - 2 or (low and golden and sizes[i - 1] < 0.04 * sizes.max()):
                a[lab == i, 3] = 0
    # a plate that touches her feet's last rows: the width jumps up and the rows are cream (a plate is a pale label)
    wid = (a[..., 3] > 40).sum(1)
    for y in range(int(h * 0.75), h):
        if y >= 4 and wid[y] >= 36 and wid[y] > 2 * max(1, wid[y - 4]):
            reg = a[y:, :, :3][a[y:, :, 3] > 40]
            if len(reg) and reg.mean() > 170:
                a[y:, :, 3] = 0; break
    # the compass plate: a short wide piece in the last rows, cut off from the rest by empty rows
    rows = (a[..., 3] > 20).any(1); runs = []; st = None
    for y, v in enumerate(rows):
        if v and st is None: st = y
        if not v and st is not None: runs.append((st, y)); st = None
    if st is not None: runs.append((st, len(rows)))
    for r0, r1 in runs[1:]:
        if r1 - r0 < 4: a[r0:r1, :, 3] = 0       # a thin stray line (the edge of a plate)
    if len(runs) > 1 and (runs[-1][1] - runs[-1][0]) < 0.14 * h and runs[-1][0] > 0.8 * h: a[runs[-1][0]:, :, 3] = 0
    im = Image.fromarray(a.astype(np.uint8), 'RGBA'); im.crop(im.getbbox()).save(path, optimize=True)

def cut(sheet):
    parts, files = raw(sheet)
    out = {}
    names = []
    for i, plate in enumerate(ORDER[sheet]):
        name = '%s_%s.png' % (sheet, facing(sheet, plate))
        cl, box = parts[i]
        mk.final_cut(cl, box, OUT + name, SIZE.get(sheet, BASE), keep=0.15)
        names.append(name)
    for n in names: wipe_floor(OUT + n)
    for i, plate in enumerate(ORDER[sheet]):
        name = names[i]
        out[facing(sheet, plate)] = {'file': name, 'originX': mk.feet_x(OUT + name)}
        print(sheet, plate, Image.open(OUT + name).size, file=sys.stderr)
    return out

# which of her art.json slots each sheet fills: "standing" and "battle" are top-level, "weak" too, the rest are poses
SLOTS = {
    'layra_n_stand': ['standing'],
    'layra_n_battle': ['battle', 'poses.ready', 'poses.attack'],
    'layra_n_block': ['poses.guard'],
    'layra_n_dodge': ['poses.dodge'],
    'layra_n_chant': ['poses.chant', 'poses.meditate'],
    'layra_n_cast': ['poses.cast'],
    'layra_n_hurt': ['poses.hurt', 'poses.knocked'],
    'layra_n_weak': ['weak'],
    'layra_n_fallen': ['poses.kneel'],       # on hands and knees: the landing after a knock-back fall (knockback.js)
    'layra_n_down': ['poses.down'],
}

if __name__ == '__main__':
    got = {s: cut(s) for s in SHEETS}
    art = json.load(open(ART)); e = art['h3']
    for sheet, slots in SLOTS.items():
        for slot in slots:
            if slot.startswith('poses.'): e['poses'][slot[6:]] = got[sheet]
            else: e[slot] = got[sheet]
    e['note_n16'] = ('16 Nov sheets, wired 21 Nov (6.69, dev/tools/make_layra_new.py): standing, battle stance (also ready and her staff strike), '
                     'blocking (guard), dodge, preparing (chant and meditate), releasing (cast), taking damage (hurt, knocked), near defeat (weak), '
                     'fallen on hands and knees (kneel, the landing of a fall) and defeated (down), all in four true views. Her victory is still the '
                     '2 Nov picture, her blessing looks the 21 Nov floating sheets (6.86).')
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json h3 written', file=sys.stderr)
