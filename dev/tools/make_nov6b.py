# 6 Nov batch 2: Rabdul's, Tayo's, the female archer's and the bull's 2 to 5 Nov sets (roadmap 6.27, 6.30, 6.32, 6.33, 4.6).
# Run from dev/:  python3 tools/make_nov6b.py <chat dir> <out dir> [<blueprint dir>]
# Same four-figure sheets as make_nov6.py. Every figure is cut as f1..f4 (left to right);
# the wiring script decides which figure is which facing after a look at the contact sheet.
# Size: each character keeps the size he has in the game: a standing sheet is cut so its
# tallest figure is as tall as the old standing picture (STAND), every sheet uses that same scale.
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
# who -> (standing sheet file, pixel height of the tallest standing picture in the game)
STAND = {
    'rabdul': (OCT + '15-41-47.jpg', 224), 'bull': (OCT + '11-10-39.jpg', 224),
    'tayo': (None, 215), 'archer': (None, 112),
}
STAND_NUM = {'tayo': '1041', 'archer': '1072'}   # their stand sheets are new (Nov)
PICKS = {
    'rabdul': {'weak': '1016', 'down': '1018', 'victory': '1024', 'multi': '1086', 'multiFire': '1087'},
    'tayo': {'battle': '1040', 'stand': '1041', 'punch': '1042', 'guard': '1043', 'hurt': '1044', 'punchFire': '1045',
             'standFire': '1046', 'weak': '1047', 'down': '1049', 'victory': '1050', 'block': '1088', 'battleFire': '1048'},
    'archer': {'stand': '1072', 'dagger': '1073', 'battle': '1074', 'primed': '1075', 'readying': '1076', 'crouchA': '1077',
               'crouchB': '1078', 'fire1': '1079', 'fire2': '1080', 'wound1': '1081', 'wound2': '1082', 'hit': '1083',
               'down': '1084', 'victory': '1085'},
    'bull': {'victory': '1112', 'weak': '1113', 'down': '1114', 'throw1': '1131', 'throw2': '1132', 'shield': '1133',
             'bl1': '1135', 'bl2': '1136', 'bl3': '1137', 'bl4': '1138', 'bl5': '1139', 'bl6': '1140', 'bl7': '1141'},
}
TOPROW = {'1042', '1045'}  # 8-direction sheets: the four figures of the top row are the true isometric ones
RAW = {'1112', '1113', '1114'}
MULT = {}
if os.path.exists(OUT + 'mult.json'):
    MULT.update(json.load(open(OUT + 'mult.json')))

def src_of(num):
    return glob.glob(CHAT + '/0000' + num + '-*')[0]

def boxes(num):
    cl = OUT + 'clean/' + num + '.jpg'
    if not os.path.exists(cl):
        s = src_of(num)
        if num in TOPROW:
            im = Image.open(s); top = OUT + 'clean/' + num + '_top.jpg'
            im.crop((0, 0, im.width, im.height // 2)).save(top); s = top
        if num in RAW: Image.open(s).convert('RGB').save(cl, quality=95)  # the cleaner eats the bronze shield rim
        else: clean(s, cl, n=4)
    return cl, cells(cl, 4)

def base_of(who):
    f, px = STAND[who]
    f = f or src_of(STAND_NUM[who])
    cl = OUT + 'clean/stand_' + who + '.jpg'
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
    for name, num in picks.items():
        cl, bx = boxes(num)
        mult = MULT.get(num, 1.0)
        for i in range(4):
            out = OUT + '%s_n6b_%s_f%d.png' % (who, name, i + 1)
            ox, size = cut(cl, bx[i], out, base * mult, strokes=False, keep=0.15, floor=True)
            im = Image.open(out)
            # wipe the grey floor tile / chalky dust ring round the feet (bottom 30%), keep the big pieces only
            arr = np.array(im.convert('RGBA')).astype(int); h = arr.shape[0]
            rgb = arr[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
            zone = np.zeros(arr.shape[:2], bool); zone[int(h * 0.62):] = True
            floor = zone & (chroma < 75) & (lum > 105) & (lum < 232) & (rgb[..., 0] - rgb[..., 1] > -4) & (rgb[..., 0] - rgb[..., 1] < 45) & (rgb[..., 1] - rgb[..., 2] < 26)
            if who != 'bull': arr[floor, 3] = 0  # the bronze shield rim looks like floor to this test
            if who == 'bull' and num in RAW:
                # the pinkish floor tile: pale, low colour, and only where it joins the see-through outside
                r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
                tile = (r > 150) & (r < 225) & (g > 120) & (g < 195) & (b > 105) & (b < 185) & (r - b > 12) & (r - b < 60) & (r - g > 6) & (r - g < 40) & (chroma < 62) & (lum > 135)
                lab2, n2 = ndimage.label(tile)
                outside = ndimage.binary_dilation(arr[..., 3] < 30, iterations=2)
                touching = np.unique(lab2[outside & tile])
                arr[np.isin(lab2, touching[touching > 0]) & tile, 3] = 0
            lab, n = ndimage.label(ndimage.binary_dilation(arr[..., 3] > 40, iterations=2))
            if n > 1:
                sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
                arr[~np.isin(lab, [k + 1 for k, v in enumerate(sz) if v > 0.08 * max(sz)]), 3] = 0
            im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
            a = im.getchannel('A')
            q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
            q.putalpha(a); q.save(out, optimize=True)
            manifest[who].setdefault(name, {})['f%d' % (i + 1)] = {'file': os.path.basename(out), 'originX': ox}
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
print('done', sum(len(s) for w in manifest.values() for s in w.values()), 'pictures', file=sys.stderr)
