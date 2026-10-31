# Phase 9 (31 Oct): Suleiman's isometric re-render of the five battle characters.
# Run from dev/:  python3 tools/make_iso31.py <sheets dir> <out dir>
#
# For every pose we take one figure facing up (away from the camera) and one
# facing down (towards it); the game mirrors them for the other two facings,
# as Suleiman suggested ("reverse the image of them facing northeast so it
# looks like northwest"). Heroes use his north-east and south-east figures
# (they mostly face up-right, towards the enemy); enemies use north-west and
# south-west.
#
# His later sheets (11:03 on) are drawn in the order NW, NE, SW, SE; the
# earlier Gaha sheets SW, NW, NE, SE; the attack sheet he labelled SE, NE, NW,
# SW. Figures are numbered 1 to 4 from the left.
#
# Size: each character keeps the size it has in the game. Its tallest standing
# picture is cut to STAND_PX pixels; every other sheet of the character is cut
# at the same pixels-per-sheet-pixel, times a per-sheet correction (MULT) where
# a sheet draws him bigger or smaller (measured by head size, then by eye).
import sys, os, json
sys.argv = sys.argv[:1] + sys.argv[1:]
SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/incoming/2026-10-31-iso/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/work/iso/out/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from iso31 import clean, cells
from fxcut import cut
from sheet import hair
from PIL import Image
import numpy as np

os.makedirs(OUT, exist_ok=True)
os.makedirs(OUT + 'clean/', exist_ok=True)

# character: (file prefix, tallest standing picture in pixels)
CHARS = {
    'h1': ('sudeen', 174),
    'h2': ('gaha', 200),
    'h3': ('layra', 200),
    'e4': ('rabdul', 224),
    'e2': ('bull', 224),
}
UP, DOWN = 'up', 'down'
# set name -> (sheet, [(figure, facing), ...])
PICKS = {
    'h2': {
        'stand': ('104429', [(3, 'upRight'), (4, 'downRight')]),
        'battle': ('105102', [(3, 'upRight'), (1, 'downRight')]),
        'guard': ('105453', [(3, 'upRight'), (1, 'downRight')]),
        'attack': ('105845', [(2, 'upRight'), (1, 'downRight')]),
        'swift': ('110646', [(2, 'upRight'), (4, 'downRight')]),
        'stone': ('131122', [(2, 'upLeft'), (4, 'downRight')]),
        'hurt': ('200649', [(2, 'upLeft'), (4, 'downRight')]),
        'walk0': ('193319', [(1, 'upLeft')]),
        'walk1': ('193319', [(2, 'upLeft')]),
        'walk2': ('193319', [(3, 'upLeft')]),
        'throw': ('214736', [(1, 'downRight')]),
        'release': ('214737', [(1, 'downRight')]),
    },
    'h1': {
        'stand': ('113626', [(2, 'upRight'), (4, 'downRight')]),
        'battle': ('114113', [(2, 'upRight'), (4, 'downRight')]),
        'guard': ('114343', [(2, 'upRight'), (4, 'downRight')]),
        'heal': ('115140', [(2, 'upRight'), (4, 'downRight')]),
        'attack': ('120319', [(2, 'upRight'), (3, 'downRight')]),
        'hurt': ('212355', [(1, 'upRight'), (4, 'downRight')]),
    },
    'h3': {
        'stand': ('123015', [(2, 'upRight'), (4, 'downRight')]),
        'chant': ('123614', [(2, 'upRight'), (4, 'downRight')]),
        'cast': ('124145', [(2, 'upRight'), (4, 'downRight')]),
        'meditate': ('124556', [(2, 'upRight'), (4, 'downRight')]),
        'blessed': ('125333', [(2, 'upRight'), (4, 'downRight')]),
        'guard': ('125947', [(2, 'upRight'), (4, 'downRight')]),
        'hurt': ('201557', [(2, 'upRight'), (4, 'downRight')]),
    },
    'e4': {
        'stand': ('154147', [(1, 'upLeft'), (3, 'downLeft')]),
        'battle': ('155502', [(1, 'upLeft'), (3, 'downLeft')]),
        'dodge': ('155911', [(1, 'upLeft'), (3, 'downLeft')]),
        'chant': ('160454', [(1, 'upLeft'), (3, 'downLeft')]),
        'cast': ('161040', [(1, 'upLeft'), (3, 'downLeft')]),
        'attack': ('161804', [(1, 'upLeft'), (3, 'downLeft')]),
        'fire': ('162419', [(1, 'upLeft'), (3, 'downLeft')]),
        'hurt': ('195130', [(1, 'upLeft'), (3, 'downLeft')]),
    },
    'e2': {
        'stand': ('111039', [(1, 'upLeft'), (3, 'downLeft')]),
        'battle': ('112000', [(1, 'upLeft'), (3, 'downLeft')]),
        'attack': ('112342', [(1, 'upLeft'), (3, 'downLeft')]),
        'hurt': ('213458', [(1, 'upLeft'), (3, 'downLeft')]),
    },
}
# sheets that draw the character bigger (>1) or smaller (<1) than his standing sheet
MULT = {
    '214736': 0.6, '214737': 0.6,  # his two big spear-throw pictures
    '124556': 0.9,                 # Layra meditating is drawn bigger
    '193319': 1.05, '131122': 1.05,  # Gaha walking and under Earth's Bulwark, a little smaller
}
if os.path.exists(OUT + 'mult.json'):
    MULT.update(json.load(open(OUT + 'mult.json')))
# sheets with one figure (his two spear-throw pictures) and the 3-frame walk
SINGLE = {'214736', '214737'}
COUNT = {'193319': 3}

def boxes(sheet):
    cl = OUT + 'clean/' + sheet + '.jpg'
    if not os.path.exists(cl):
        clean(SRC + sheet + '.jpg', cl, n=1 if sheet in SINGLE else COUNT.get(sheet, 4))
    if sheet in SINGLE:
        im = Image.open(cl); return cl, [(0, 0, im.width, im.height)]
    return cl, cells(cl, COUNT.get(sheet, 4))

def raw_height(sheet, fig):
    """The figure's height in sheet pixels (cut at scale 1)."""
    cl, bx = boxes(sheet)
    tmp = OUT + 'tmp.png'
    cut(cl, bx[fig - 1], tmp, 1.0, strokes=False, keep=0.15, floor=True)
    h = Image.open(tmp).height
    return h, hair(tmp)

manifest = {}
report = []
for cid, picks in PICKS.items():
    prefix, stand_px = CHARS[cid]
    # how big his standing figures are on their sheet
    sh, fs = picks['stand']
    meas = [raw_height(sh, f) for f, _ in fs]
    base = stand_px / max(h for h, _ in meas)
    head0 = np.mean([hd for _, hd in meas if hd]) if any(hd for _, hd in meas) else 0
    manifest[cid] = {}
    for name, (sheet, figs) in picks.items():
        cl, bx = boxes(sheet)
        mult = MULT.get(sheet, 1.0)
        for fig, facing in figs:
            out = OUT + '%s_iso_%s_%s.png' % (prefix, name, facing)
            ox, size = cut(cl, bx[fig - 1], out, base * mult, strokes=False, keep=0.15, floor=True)
            im = Image.open(out)
            if sheet in SINGLE:
                # his big single pictures stand on a slanted floor slab: clear its
                # light grey corner left by the right foot
                arr = np.array(im.convert('RGBA')).astype(int); h, w = arr.shape[:2]
                rgb = arr[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
                zone = np.zeros((h, w), bool); zone[int(h * 0.7):, int(w * 0.6):] = True
                arr[zone & (chroma < 45) & (lum > 120), 3] = 0
                im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
            # 256 colours keeps the files small
            a = im.getchannel('A')
            q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
            q.putalpha(a); q.save(out, optimize=True)
            manifest[cid].setdefault(name, {})[facing] = {'file': os.path.basename(out), 'originX': ox}
            hd = hair(out) / (base * mult) if head0 else 0
            report.append('%s %-8s %s fig%d %-9s %s mult %.2f head %.1f (stand %.1f) %dKB' % (
                cid, name, sheet, fig, facing, size, mult, hd, head0, os.path.getsize(out) // 1024))
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
print('\n'.join(report))
