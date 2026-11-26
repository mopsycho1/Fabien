"""Leol the Slinger and the Thief (roadmap 19.1, 19.2, art 6.76 and 6.77; cut 22 Nov). Suleiman's 19 Nov sheets, four figures each
(two rows of two), each on a terracotta floor tile, most with compass plates (NOT trusted: read by the figure, see FACING).

Steps per sheet: make_layra_new.raw (each figure from the untouched sheet), make_kings.final_cut at BASE (picture pixels per sheet
pixel), then detile.detile (the tile, its shadow, its edges and the plate go). The size ruler then sizes every pose by its head.
Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_newclass.py <work folder> [raw]   ("raw" only cuts figures and a contact sheet)
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import kings_sheets
I19 = kings_sheets.B + 'INBOX/2026-11-19/email/'
LE = I19 + "Leol's character sheets/Leol's character sheets/"
TH = I19 + 'Male Thief character sheets/Male Thief character sheets/'
SHEETS = {
    'leol_stand':   LE + 'Lion Warrior Isometric Turntable.png',
    'leol_battle':  LE + 'Isometric Lion Warrior Sprite Sheet.png',
    'leol_weak':    LE + 'Battle-Worn Lion Warrior Views.png',
    'leol_down':    LE + 'Defeated Lion Warrior with Slingshot.png',
    'leol_hurt':    LE + 'Leol taking a hit with slingshot equipped.png',
    'leol_hhurt':   LE + 'Leol taking a hit with hamemr equipped.png',
    'leol_shot':    LE + 'Roaring Lion Warrior Sling Follow-Through Views.png',
    'leol_dodge':   LE + 'Leol’s Sling Dodge Poses.png',
    'leol_hdodge':  LE + 'Leol’s Four-Way Hammer Dodge.png',
    'leol_hguard':  LE + 'Leol’s Four-View Hammer Guard Sheet.png',
    'leol_hstrike': LE + 'Lion Warrior Hammer Strike Sprites.png',
    'leol_hraise':  LE + 'Leol’s Four Hammer-Raising Poses.png',
    'leol_hweak':   LE + 'Wounded Lion Warrior Hammer Turnaround.png',
    'leol_victory': LE + 'Leol’s Four-Way Victory Celebration.png',
    'leol_barricade': LE + 'Skill assets/Isometric Wooden Spike Barricade Tile Set.png',   # the wall (19.1), four views on a tile
    'thief_stand':  TH + 'thief neutral stance.png',
    'thief_battle': TH + 'thief battle stance.png',
    'thief_weak':   TH + 'Battle-Worn Thief Isometric Sheet.png',
    'thief_down':   TH + 'Defeated thief Isometric Turnaround.png',
    'thief_fallen': TH + 'thief fallen.png',
    'thief_hurt':   TH + 'Thief taking damage.png',
    'thief_slash':  TH + 'Isometric Thief Warrior Slashing Turnaround.png',
    'thief_ambush': TH + 'Isometric Dagger Ambush Sprite Sheet.png',
    'thief_dodge':  TH + 'Isometric Dodge Pose Sheet.png',
    'thief_parry':  TH + 'Isometric Thief Parry Pose Sheet.png',
    'thief_trap':   TH + 'Thief laying trap.png',
    'thief_steal':  TH + 'Thief performing steal.png',
    'thief_victory': TH + 'Isometric Victory Poses_ Four Directions.png',
}
kings_sheets.SHEETS.update({k: (v, 'grid') for k, v in SHEETS.items()})
WORK = sys.argv[1].rstrip('/') + '/'
sys.argv = [sys.argv[0], WORK]
import make_layra_new as L
mk = L.mk
from detile import detile, deslab

if __name__ == '__main__' and len(sys.argv) > 1 and 'raw' in os.environ.get('MODE', 'raw'):
    pass

def raw_sheet(names, out):
    cells = []
    for n in names:
        parts, files = L.raw(n)
        for i, f in enumerate(files):
            im = Image.open(f).convert('RGBA'); bg = Image.new('RGBA', im.size, (40, 110, 60, 255)); bg.alpha_composite(im); bg.thumbnail((170, 170))
            cells.append(('%s %d' % (n.split('_', 1)[1], i + 1), bg))
    cols = 8; rows = (len(cells) + cols - 1) // cols
    sh = Image.new('RGB', (cols * 180, rows * 190), (0, 0, 0)); d = ImageDraw.Draw(sh)
    for i, (t, im) in enumerate(cells):
        x = (i % cols) * 180; y = (i // cols) * 190
        sh.paste(im.convert('RGB'), (x + 5, y + 16)); d.text((x + 4, y + 2), t, fill=(255, 255, 0))
    sh.save(out)

if __name__ == '__main__' and os.environ.get('MODE') == 'raw':
    raw_sheet([n for n in SHEETS if n.startswith('leol')], WORK + 'raw_leol.jpg')
    raw_sheet([n for n in SHEETS if n.startswith('thief')], WORK + 'raw_thief.jpg')
    print('raw contact sheets in', WORK)

# picture pixels per sheet pixel: his figures stand about 470 sheet pixels tall on these 1448 by 1086 sheets; 0.40 makes a standing
# picture about 190 tall (the size ruler then sizes every pose by its head, and art.json "height" sets the drawn size)
BASE = 0.40
# How tall each one's tallest standing picture is drawn on the board (art.json "height"; the size ruler sizes every other pose by
# the head from it). 1.112 (26 Nov, Baiyee: "the Thief is drawn bigger than everyone else"): his standing sheet is a deep crouch,
# so the 100 a standing fighter gets drew his crouch as tall as a standing man and his head about 1.25 times the Bull's. Sized by eye
# beside Sudeen, Gaha and Leol at game size (dev/browser/size_row.cjs): 70 puts his head with the humans' (n99 checks it).
HEIGHT = {'leol': 92, 'thief': 70}   # Leol 92: at 100 he was as broad as the Bull Commander; 92 keeps him a big lion warrior, a little over the humans
ART_ID = {'leol': 'h6', 'thief': 'e6'}

def set_heights():
    art_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data', 'art.json')
    art = json.load(open(art_path))
    for k, h in HEIGHT.items(): art[ART_ID[k]]['height'] = h
    json.dump(art, open(art_path, 'w'), indent=2, ensure_ascii=False); open(art_path, 'a').write('\n')
COMMON = {'leol': 120, 'thief': 400}
# detile front: how far above the tile's front edges everything is cleared (share of the half width). Lying poses lie ON the slab top,
# a little higher; the barricade is not a figure (its own frame stands on the tile edges): no clearing.
FRONT = {'barricade': None}   # detile: how common a colour must be in the tile samples (see detile.py)

def cut_all(prefix):
    out = {}
    for sheet in [n for n in SHEETS if n.startswith(prefix + '_')]:
        parts, files = L.raw(sheet)
        names = []
        for i, (cl, box) in enumerate(parts):
            name = '%s_%d.png' % (sheet, i + 1)
            # keep=0.02: a sling's cord or a dagger can be apart from the body
            mk.final_cut(cl, box, L.OUT + name, BASE, keep=0.02)
            a = np.array(Image.open(L.OUT + name).convert('RGBA'))
            if sheet.endswith('barricade'): a = detile(a, common=COMMON[prefix])
            else:
                # 26 Nov: detile takes the top face; deslab then takes the slab's sides, rims and plate, read from the untouched cut
                from detile import slab_geometry
                g = slab_geometry(a)
                a = deslab(detile(a, common=COMMON[prefix]), geom=g, colour=False) if g and not sheet.endswith('ambush') else detile(a, common=COMMON[prefix])
                # (the ambush is a leap above the tile: its outline is not the slab's)
                # loose pieces low down (a shadow or blood under the victory pose)
                from scipy import ndimage as nd
                bb = Image.fromarray(a).getbbox()
                if bb:
                    sol = a[..., 3] > 20; lab, n = nd.label(sol)
                    if n > 1:
                        sz = nd.sum(sol, lab, range(1, n + 1)); tops = nd.minimum(np.arange(a.shape[0])[:, None].repeat(a.shape[1], 1), lab, range(1, n + 1))
                        for i in range(1, n + 1):
                            if sz[i - 1] < 0.25 * sz.max() and tops[i - 1] > bb[1] + 0.72 * (bb[3] - bb[1]): a[lab == i, 3] = 0
            im = Image.fromarray(a); bb = im.getbbox()
            if bb: im = im.crop(bb)
            im.save(L.OUT + name, optimize=True)
            names.append(name)
        out[sheet] = names
        print(sheet, [Image.open(L.OUT + n).size for n in names], file=sys.stderr)
    return out

if __name__ == '__main__' and os.environ.get('MODE') == 'heights':
    set_heights(); print('heights written', HEIGHT, file=sys.stderr)

if __name__ == '__main__' and os.environ.get('MODE') == 'cut':
    set_heights()
    for p in sys.argv[2:] or ['leol', 'thief']:
        cut_all(p)
    # thin tile-edge lines left under the feet (strip_lines.py)
    import glob, strip_lines
    for f in sorted(glob.glob(L.OUT + '*_[1-4].png')):
        if os.path.basename(f).split('_')[0] in (sys.argv[2:] or ['leol', 'thief']) and 'barricade' not in f:
            im = Image.open(f).convert('RGBA'); b = Image.fromarray(strip_lines.strip(np.array(im))); bb = b.getbbox(); b = b.crop(bb) if bb else b; b.save(f, optimize=True)
