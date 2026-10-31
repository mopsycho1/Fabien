# Cuts Suleiman's UI art (UI COMPONENTS, UI COMPONENTS 2, UI icons) into the
# pieces the battle screen uses, each at its exact size on the 720x1280 screen.
# Frames are "nine-sliced": corners keep their shape, the middle stretches.
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
UI = sys.argv[1]            # folder with comp1.jpg, comp2.jpg, icons.jpg
OUT = sys.argv[2]           # public/art/ui

def cutout(img, tol=34, seeds=()):
    """White background -> transparent: near-white areas touching the edge
    (plus any seed points, like the hole in a ring)."""
    a = np.array(img.convert('RGB')).astype(int)
    white = a.min(axis=2) > 255 - tol
    lab, n = ndimage.label(white)
    keep = set(np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]]))) - {0}
    for (x, y) in seeds:
        if lab[y, x]: keep.add(lab[y, x])
    bg = np.isin(lab, list(keep))
    solid = ~bg
    solid = ndimage.binary_erosion(solid, iterations=1)       # trim the light JPEG halo
    alpha = Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    out = Image.fromarray(a.astype(np.uint8)).convert('RGBA')
    out.putalpha(alpha)
    return out

def nine(img, xs, ys, out_w, out_h_parts):
    """xs = (x0, x1, x2, x3) cuts inside img, ys likewise. out_w = final width;
    out_h_parts = (top, middle, bottom) final heights. Left/right caps keep
    the top cap's scale."""
    x0, x1, x2, x3 = xs; y0, y1, y2, y3 = ys
    th, mh, bh = out_h_parts
    s = th / (y1 - y0)                          # corner scale from the top cap
    lw = round((x1 - x0) * s); rw = round((x3 - x2) * s); mw = out_w - lw - rw
    cols = [(x0, x1, lw), (x1, x2, mw), (x2, x3, rw)]
    rows = [(y0, y1, th), (y1, y2, mh), (y2, y3, bh)]
    out = Image.new('RGBA', (out_w, th + mh + bh), (0, 0, 0, 0))
    oy = 0
    for (ya, yb, h) in rows:
        ox = 0
        for (xa, xb, w) in cols:
            out.alpha_composite(img.crop((xa, ya, xb, yb)).resize((max(1, w), max(1, h)), Image.LANCZOS), (ox, oy))
            ox += w
        oy += h
    return out

def three(img, xs, out_w, out_h):
    """Horizontal-only slicing (buttons, the hint bar): caps keep their shape."""
    x0, x1, x2, x3 = xs
    s = out_h / img.height
    lw = round((x1 - x0) * s); rw = round((x3 - x2) * s); mw = out_w - lw - rw
    out = Image.new('RGBA', (out_w, out_h), (0, 0, 0, 0))
    ox = 0
    for (xa, xb, w) in [(x0, x1, lw), (x1, x2, mw), (x2, x3, rw)]:
        out.alpha_composite(img.crop((xa, 0, xb, img.height)).resize((max(1, w), out_h), Image.LANCZOS), (ox, 0))
        ox += w
    return out

c1 = Image.open(UI + '/comp1.jpg').convert('RGB')
c2 = Image.open(UI + '/comp2.jpg').convert('RGB')
ic = Image.open(UI + '/icons.jpg').convert('RGB')

# ---- top bar: 720 wide, the frame body 150 tall, drapes hanging below ----
tc = c1.copy()
tc.paste((255, 255, 255), (112, 312, 1188, 430))   # the bottom panel's top edge peeks into this crop: blank it
top = cutout(tc.crop((18, 5, 1518, 425)))
# cuts (relative to the crop): caps up to x 252 and from x 1272; top band to y 65, bottom from y 195
t = nine(top, (0, 252, 1272, 1500), (0, 65, 195, 420), 720, (31, 102, round((420 - 195) * 31 / 65)))
t.save(OUT + '/top.png'); print('top', t.size)

# ---- bottom panel: the four button slots are painted over with the leather
# from the left half (the game puts its own buttons there) ----
bp = c1.copy()
bp.paste(c1.crop((190, 352, 640, 736)), (693, 352))
bot = cutout(bp.crop((115, 318, 1185, 830)))
# caps to x 145 and from x 925 (relative); top band to y 82, bottom from y 382 (frame edge ~442, drapes to 512)
b = nine(bot, (0, 145, 925, 1070), (0, 82, 382, 512), 710, (49, 239, round((512 - 382) * 49 / 82)))
b.save(OUT + '/bottom.png'); print('bottom', b.size)

# ---- the hint bar ----
msg = cutout(c1.crop((38, 858, 1258, 978)))
m = three(msg, (0, 82, 1140, 1220), 648, 70)
m.save(OUT + '/hint.png'); print('hint', m.size)

# ---- button bars, three states, wide and short: kept at full size; the
# game cuts them to each button's size (hud.js, barPlate) ----
for state, box in (('normal', (18, 104, 532, 249)), ('glow', (543, 101, 1057, 252)), ('grey', (1066, 104, 1580, 249))):
    bar = cutout(c2.crop(box)); bar.save(OUT + '/bar_' + state + '.png'); print('bar', state, bar.size)
for state, box in (('normal', (123, 301, 537, 444)), ('glow', (592, 299, 1005, 446)), ('grey', (1061, 301, 1475, 444))):
    bar = cutout(c2.crop(box)); bar.save(OUT + '/barS_' + state + '.png'); print('barS', state, bar.size)
print('buttons done')

# ---- round frames ----
ring = cutout(c1.crop((1222, 428, 1503, 700)), seeds=[(140, 136)])
ring.resize((round(ring.width * 0.6), round(ring.height * 0.6)), Image.LANCZOS).save(OUT + '/ring.png'); print('ring', ring.size)
for state, box in (('normal', (412, 488, 618, 684)), ('glow', (692, 486, 903, 686)), ('grey', (977, 488, 1188, 684))):
    med = cutout(c2.crop(box))
    med.resize((round(med.width * 0.6), round(med.height * 0.6)), Image.LANCZOS).save(OUT + '/medal_' + state + '.png')
print('medals done')

# ---- the 14 icons: full medallions (for round buttons) and just the inner
# disc with the symbol (to sit in a button's socket) ----
names = [['walk', 'sword', 'spear', 'lightning', 'crossed', 'star', 'hourglass'],
         ['shield', 'run', 'gem', 'undo', 'redo', 'sound', 'mute']]
xs = [137, 360, 587, 804, 1027, 1245, 1467]; ys = [137, 370]
for r, row in enumerate(names):
    for i, name in enumerate(row):
        cx, cy = xs[i], ys[r]
        med = cutout(ic.crop((cx - 100, cy - 100, cx + 100, cy + 100)))
        med.resize((72, 72), Image.LANCZOS).save(OUT + '/icon_' + name + '.png')
        disc = ic.crop((cx - 70, cy - 70, cx + 70, cy + 70)).convert('RGBA')
        mask = Image.new('L', (140, 140), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).ellipse((2, 2, 138, 138), fill=255)
        disc.putalpha(mask.filter(ImageFilter.GaussianBlur(1)))
        disc.resize((56, 56), Image.LANCZOS).save(OUT + '/glyph_' + name + '.png')
print('icons done')
