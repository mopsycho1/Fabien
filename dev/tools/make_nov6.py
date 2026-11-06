# 6 Nov batch: Sudeen's, Gaha's and Layra's 2 to 5 Nov sets (roadmap 6.26, 6.28, 6.29, 1.14, 1.17).
# Run from dev/:  python3 tools/make_nov6.py <chat dir> <out dir> [<blueprint dir>]
#   <chat dir> is the unzipped WhatsApp export (files named 0000NNNN-PHOTO-....jpg).
# The sheets are in the same four-figure format as the 31 Oct ones (figures 1 to 4 from
# the left, ordered NW, NE, SW, SE), so the 31 Oct cleaner and cutter are reused.
# Size: each character keeps the size he has in the game. His 31 Oct standing sheet
# gives the pixels-per-sheet-pixel (base); every Nov sheet is cut at the same base.
# Writes the pictures and manifest.json (file names and originX) to <out dir>.
import sys, os, json, glob
CHAT = sys.argv[1]
OUT = sys.argv[2].rstrip('/') + '/'
BP = (sys.argv[3] if len(sys.argv) > 3 else '/Users/motiago/Documents/Fabien Blueprint/')
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from iso31 import clean, cells
from fxcut import cut
from PIL import Image
import numpy as np
from scipy import ndimage

os.makedirs(OUT + 'clean/', exist_ok=True)
OCT = BP + 'NEW ISOMETRIC SHEETS AND OTHERS/PHOTO-2026-10-31-'
# the 31 Oct standing sheets and the pixel height each tallest standing picture has in the game
STAND = {'sudeen': ('11-36-26', 174), 'gaha': ('10-44-29', 200), 'layra': ('12-30-15', 200)}
ALL = [(1, 'upLeft'), (2, 'upRight'), (3, 'downLeft'), (4, 'downRight')]  # figures 1 to 4

# name -> (chat number, [(figure, facing)])
PICKS = {
    'sudeen': {
        'stone': ('1002', ALL), 'swift': ('1004', ALL), 'weak': ('1007', ALL),
        'bash': ('1009', ALL), 'bash2': ('1011', ALL),
        'down': ('1015', [(4, 'single')]), 'victory': ('1091', [(2, 'single')]),
    },
    'gaha': {
        'weak': ('1019', ALL), 'down': ('1022', [(4, 'single')]), 'victory': ('1028', [(4, 'single')]),
        'stoneAttack': ('1030', ALL), 'stoneGuard': ('1089', ALL),
        'furyStand': ('1035', ALL), 'furyAttack': ('1036', ALL),
        'swiftDodge': ('1117', ALL), 'swiftGuard': ('1118', ALL), 'swiftAttack': ('1119', ALL), 'swiftStand': ('1120', ALL),
        'dodge': ('1103', ALL), 'sonicClose': ('1123', ALL), 'sonicPrep': ('1127', ALL),
        'furyDive': ('1037', [(1, 'f0'), (2, 'f1'), (3, 'f2'), (4, 'f3')]),
    },
    'layra': {
        'hurt': ('1025', ALL), 'down': ('1026', [(4, 'single'), (3, 'single3')]), 'victory': ('1027', [(4, 'single')]),
    },
}
MULT = {'1103': 0.75}  # the dodge sheet is drawn bigger
if os.path.exists(OUT + 'mult.json'):
    MULT.update(json.load(open(OUT + 'mult.json')))
# sheets laid out in a 2 by 2 grid
GRID = {'1103'}

def src_of(num):
    return glob.glob(CHAT + '/0000' + num + '-*')[0]

def boxes(num):
    if num in GRID:
        im = Image.open(src_of(num)); w, h = im.size
        return src_of(num), [(0, 0, w // 2, h // 2), (w // 2, 0, w, h // 2), (0, h // 2, w // 2, h), (w // 2, h // 2, w, h)]
    cl = OUT + 'clean/' + num + '.jpg'
    if not os.path.exists(cl):
        clean(src_of(num), cl, n=4)
    return cl, cells(cl, 4)

def base_of(who):
    stamp, px = STAND[who]
    f = OCT + stamp + '.jpg'
    cl = OUT + 'clean/oct_' + who + '.jpg'
    if not os.path.exists(cl):
        clean(f, cl, n=4)
    tmp = OUT + 'tmp.png'
    hs = []
    for b in cells(cl, 4):
        cut(cl, b, tmp, 1.0, strokes=False, keep=0.15, floor=True); hs.append(Image.open(tmp).height)
    return px / max(hs)

manifest = {}
for who, picks in PICKS.items():
    base = base_of(who)
    print(who, 'base', round(base, 3), file=sys.stderr)
    manifest[who] = {}
    for name, (num, figs) in picks.items():
        cl, bx = boxes(num)
        mult = MULT.get(num, 1.0)
        for fig, facing in figs:
            out = OUT + '%s_n6_%s_%s.png' % (who, name, facing)
            ox, size = cut(cl, bx[fig - 1], out, base * mult, strokes=False, keep=0.15, floor=True)
            im = Image.open(out)
            # wipe the grey floor tile / chalky dust ring left round the feet (bottom 30%)
            arr = np.array(im.convert('RGBA')).astype(int); h = arr.shape[0]
            rgb = arr[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
            zone = np.zeros(arr.shape[:2], bool); zone[int(h * 0.62):] = True
            floor = zone & (chroma < 75) & (lum > 105) & (lum < 232) & (rgb[..., 0] - rgb[..., 1] > -4) & (rgb[..., 0] - rgb[..., 1] < 45) & (rgb[..., 1] - rgb[..., 2] < 26)
            arr[floor, 3] = 0
            # drop the specks of tile left over: keep only the big connected pieces
            lab, n = ndimage.label(ndimage.binary_dilation(arr[..., 3] > 40, iterations=2))
            if n > 1:
                sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
                arr[~np.isin(lab, [i + 1 for i, v in enumerate(sz) if v > 0.08 * max(sz)]), 3] = 0
            im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
            a = im.getchannel('A')
            q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
            q.putalpha(a); q.save(out, optimize=True)
            manifest[who].setdefault(name, {})[facing] = {'file': os.path.basename(out), 'originX': ox}
            print('%s %-12s %s fig%d %-10s %s %dKB' % (who, name, num, fig, facing, size, os.path.getsize(out) // 1024), file=sys.stderr)
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
