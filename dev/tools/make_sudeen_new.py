"""Sudeen's new sheets, 20 Nov (roadmap 6.81, "Sudeen updated sheets.7z" and "Sudeen Expression Sheet Grid.7z"):
  - the Four-View Warrior sheet (scimitar and shield shown, no tile): his battle stance, which now shows his weapon (1.62);
  - the Isometric Slash Action Poses (four views on a tile, scimitar out, shield up): his attack;
  - the Isometric Herb Pouch Toss (four views on a tile): the pose for Herbs;
  - the two shield-bash sheets (four small views each on a tile; the "mirrored pov" one is the same flipped, so only the
    first is cut): his Shield Bash picture;
  - the Expression Sheet Grid (nine heads): the calm face, the hurt face and the battle cry.
Facings come from the pictures: on the cards with plates the plate names the way he faces (NE, NW show his back); on the
Four-View sheet and the bash sheet there are none, so they were read from the pictures (see VIEWS).
Layra's cutter does the work (L.raw: each figure cut from the untouched sheet; L.wipe_floor: the tile wiped by colour).

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_sudeen_new.py <work folder> [faces]
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import kings_sheets
B = kings_sheets.B + 'INBOX/2026-11-20/email/'
SHEETS = {
    'sudeen_n_battle': (B + 'Sudeen updated sheets_x/Sudeen updated sheets/Sudeen’s Four-View Warrior Sheet.png', 'grid'),
    'sudeen_n_slash':  (B + 'Sudeen updated sheets_x/Sudeen updated sheets/Sudeen Isometric Slash Action Poses.png', 'grid'),
    'sudeen_n_herb':   (B + 'Sudeen updated sheets_x/Sudeen updated sheets/Sudeen Isometric Herb Toss Sheet.png', 'grid'),
    'sudeen_n_bash':   (B + 'Sudeen updated sheets_x/Sudeen updated sheets/Sudeen bashing with his shield.png', 'grid'),
}
kings_sheets.SHEETS.update(SHEETS)
FACES = B + 'Sudeen Expression Sheet Grid_x/Sudeen Expression Sheet Grid.png'
sys.argv = [sys.argv[0], sys.argv[1]]
import make_layra_new as L
mk = L.mk

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
# figure 1 to 4 (top left, top right, bottom left, bottom right) -> the game's facing
VIEWS = {
    # 22 Nov (1.95): the slash sheet's compass plates are mirrored (the figure on the "Northeast" plate lunges to the screen's
    # up-left), so the figures are read by the way the lunge and the blade point, never by the plates
    'sudeen_n_slash': {1: 'upLeft', 2: 'upRight', 3: 'downLeft', 4: 'downRight'},
    'sudeen_n_herb':  {1: 'upRight', 2: 'upLeft', 3: 'downRight', 4: 'downLeft'},   # plates NE, NW, SE, SW
    'sudeen_n_battle': {1: 'downRight', 2: 'downLeft', 3: 'upLeft', 4: 'upRight'},   # no plates: top row his face, bottom row his back (looked at)
    # 22 Nov (1.95): figure 1 shows his FACE (a second down-right drawing), it was cut as up-right; only figure 2 is a back view,
    # so the game mirrors it for up-right
    'sudeen_n_bash':  {2: 'upLeft', 3: 'downRight', 4: 'downLeft'},
}
BASE = 0.5
# picture pixels per sheet pixel, per sheet: his sheets are drawn at different sizes (the ruler measured the heads first, then the sheets were cut at that size so the ruler scale is about 1)
SIZE = {'sudeen_n_battle': 0.275, 'sudeen_n_slash': 0.37, 'sudeen_n_herb': 0.38, 'sudeen_n_bash': 0.31}
TILES = np.array([[197, 135, 98, 28], [172, 112, 80, 24], [140, 90, 60, 20], [90, 55, 38, 14]], float)   # tile top, joints, side face, dark side (own tolerance: his dark trousers)
def gate(rgb):
    return (rgb[..., 0] - rgb[..., 1] > 18) & (rgb[..., 1] - rgb[..., 2] > 8) & (rgb[..., 1] - rgb[..., 2] < 52)

from scipy import ndimage
SHADOW_CHROMA = 30
def wipe_shadow(path):
    """The Four-View sheet has a grey drop shadow under each figure, no tile (as Kofi's dodge sheet, make_kofi_dodge.py)."""
    a = np.array(Image.open(path).convert('RGBA')).astype(float); h = a.shape[0]
    rgb = a[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); mean = rgb.mean(-1)
    m = (chroma < SHADOW_CHROMA) & (mean > 105) & (mean < 220) & (a[..., 3] > 0)
    m[:int(h * 0.30)] = False
    lab, k = ndimage.label(m)
    outside = ndimage.binary_dilation(a[..., 3] <= 30, iterations=2)
    hit = np.unique(lab[outside & m]); hit = hit[hit > 0]
    sizes = ndimage.sum(m, lab, range(1, k + 1))
    big = [i + 1 for i, v in enumerate(sizes) if v >= 140]
    m = np.isin(lab, np.concatenate([hit, big]).astype(int))
    a[ndimage.binary_dilation(m, iterations=1) & (a[..., 3] > 0) & (chroma < SHADOW_CHROMA + 10) & (mean > 90) & (mean < 232), 3] = 0
    solid = a[..., 3] > 128; lab, k = ndimage.label(solid)
    if k > 1:
        sizes = ndimage.sum(solid, lab, range(1, k + 1))
        for i in range(1, k + 1):
            if sizes[i - 1] < 0.01 * sizes.max(): a[lab == i, 3] = 0
    im = Image.fromarray(a.astype(np.uint8), 'RGBA'); im.crop(im.getbbox()).save(path, optimize=True)

def cut(sheet, tile=True):
    parts, files = L.raw(sheet)
    out = {}
    for fig, facing in VIEWS[sheet].items():
        name = '%s_%s.png' % (sheet, facing)
        cl, box = parts[fig - 1]
        mk.final_cut(cl, box, OUT + name, SIZE.get(sheet, BASE), keep=0.15)
        if tile:
            L.wipe_floor(OUT + name, tiles=TILES, tol=24.0, warm_gate=gate)
            wipe_shadow(OUT + name)      # the soft grey-pink shadow the tile throws on the card
        else: wipe_shadow(OUT + name)
        out[facing] = {'file': name, 'originX': mk.feet_x(OUT + name)}
        print(sheet, facing, Image.open(OUT + name).size, file=sys.stderr)
    return out

# the nine heads of the Expression Sheet Grid (3 by 3 on a parchment card), in the sheet's own pixels, each just inside its frame
# and above the word label (looked at on the sheet)
FACE_NAMES = ['neutral', 'happy', 'angry', 'hurt', 'pained', 'determined', 'surprised', 'confident', 'thoughtful']
FACE_X = [(40, 430), (435, 830), (835, 1225)]
FACE_Y = [(95, 408), (480, 783), (868, 1160)]
WIDE = 160
def faces():
    from bgremove import rembg_rgba
    sheet = Image.open(FACES).convert('RGB'); print('faces sheet', sheet.size, file=sys.stderr)
    for i, name in enumerate(FACE_NAMES):
        x0, x1 = FACE_X[i % 3]; y0, y1 = FACE_Y[i // 3]
        rgba = rembg_rgba(sheet.crop((x0, y0, x1, y1)))
        # the word plate under each head is a separate piece: only the biggest piece (head and scarf) stays
        a = np.array(rgba); lab, k = ndimage.label(a[..., 3] > 40)
        if k > 1:
            sizes = ndimage.sum(a[..., 3] > 40, lab, range(1, k + 1)); a[lab != int(np.argmax(sizes)) + 1, 3] = 0
        rgba = Image.fromarray(a, 'RGBA')
        al = np.array(rgba.getchannel('A')); ys, xs = np.nonzero(al > 128)
        rgba = rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        rgba = rgba.resize((WIDE, round(rgba.height * WIDE / rgba.width)), Image.LANCZOS)
        q = rgba.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        q.putalpha(rgba.getchannel('A')); q.save(OUT + 'sudeen_face_%s.png' % name, optimize=True)
        print('sudeen_face_%s.png' % name, q.size, file=sys.stderr)

if __name__ == '__main__':
    if os.environ.get('FACES'):
        faces(); sys.exit()
    if os.environ.get('RAW'):
        for s in SHEETS: L.raw(s)
        sys.exit()
    got = {s: cut(s, tile=s != 'sudeen_n_battle') for s in SHEETS}
    # 1.107 (26 Nov): floor planks and lines left loose under his slash (pieces not joined to him, low in the picture; the sword's
    # tip can be a loose piece too, but it is higher up) and specks
    from scipy import ndimage as nd
    for f in sorted(os.listdir(OUT)):
        if not f.startswith('sudeen_n_slash_') or not f.endswith('.png'): continue
        a = np.array(Image.open(OUT + f).convert('RGBA')); h, w = a.shape[:2]
        sol = a[..., 3] > 40; lab, n = nd.label(sol)
        if n < 2: continue
        sz = nd.sum(sol, lab, range(1, n + 1)); tops = nd.minimum(np.arange(h)[:, None].repeat(w, 1), lab, range(1, n + 1))
        for i in range(1, n + 1):
            if sz[i - 1] < sz.max() and (sz[i - 1] < 12 or (tops[i - 1] > 0.65 * h and sz[i - 1] < 0.1 * sz.max())): a[lab == i, 3] = 0
        Image.fromarray(a).save(OUT + f, optimize=True)
    # the two back views of the Four-View sheet are the same side from two angles (the facing check says so, 0.68 against 0.34
    # mirrored), not a left and a right: the up-right picture is the up-left one mirrored, as the game does for his other poses
    got['sudeen_n_battle']['upRight'] = dict(got['sudeen_n_battle']['upLeft'], flip=True)
    # 1.107 (26 Nov, Suleiman 23 Nov: "sudeen's weapon placement is inconsistent so his attack and block animations swap the placement
    # of his weapons"). A mirrored picture swaps his hands, so in one facing every pose must come from the same side of the mirror, or
    # the sword and shield jump hands between poses. Read with dev/tools/facing_sheet.py and a hands sheet (shield side per facing):
    # up-left and down-right are drawn true in every pose; up-right and down-left are mirrors for his block and wind-up. So:
    #   - the slash's true up-right (shield on screen-left) went: up-right is the up-left slash mirrored, like his block;
    #   - the Four-View sheet's true down-left (shield on screen-right) went: down-left is the down-right stance mirrored, like his
    #     slash, block and wind-up (his sheet's down-left slash is itself drawn with the shield in his right hand, 1.107 note).
    got['sudeen_n_slash'].pop('upRight', None)
    got['sudeen_n_battle'].pop('downLeft', None)
    art = json.load(open(ART)); e = art['h1']
    e['battle'] = got['sudeen_n_battle']
    e['poses']['ready'] = got['sudeen_n_battle']
    e['poses']['dodge'] = got['sudeen_n_battle']
    e['poses']['attack'] = got['sudeen_n_slash']
    e['poses']['heal'] = got['sudeen_n_herb']
    e['poses']['cast'] = got['sudeen_n_herb']
    e['poses']['slipStrike'] = got['sudeen_n_bash']
    e['poses']['push'] = got['sudeen_n_bash']
    e['portrait'] = 'sudeen_face_neutral.png'; e['portraitHurt'] = 'sudeen_face_pained.png'; e['shout'] = 'sudeen_face_angry.png'
    e['note_n20'] = ('20 Nov sheets, wired 21 Nov (6.81, dev/tools/make_sudeen_new.py): the Four-View Warrior sheet is his battle stance with the scimitar '
                     'showing (ready and dodge too; answers 1.62), the Slash Action Poses his attack, the Herb Pouch Toss his heal and cast, the bash sheet his '
                     'Shield Bash pictures (slipStrike, push; the "mirrored pov" sheet is the same flipped and is not cut). Faces from the Expression Sheet '
                     'Grid: neutral is the portrait, pained (damaged) the hurt face, angry the battle cry; happy, hurt, determined, surprised, confident and '
                     'thoughtful are cut too (sudeen_face_*.png) for mood faces later.')
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json h1 written', file=sys.stderr)
