# His individual clash banners (roadmap 8.15, 31 Oct): each is a 1600x900
# picture, the character in a slanted panel on the left with his name on a
# plate, on cream paper. This cuts the panel out (the cream goes see-through,
# his white frame stripes stay), fades its back edge so it can slide in from
# the side of the screen, and makes a mirrored copy for the right-hand side
# of a clash: the game flips it and lays a small patch with the name the
# right way round over the plate.
# Run from dev/:  python3 tools/cut_banners31.py <out dir>
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

OUT = sys.argv[1] if len(sys.argv) > 1 else '../public/art/clash/'
os.makedirs(OUT, exist_ok=True)
ISO = '/home/claude/incoming/2026-10-31-iso/'
SOURCES = {
    # Gaha's arrived only inside a screenshot of the chat (31 Oct 09:08)
    'gaha': ('/home/claude/incoming/2026-10-31/clash_ui_gaha_screenshot.png', 'shot'),
    'bull': (ISO + '112904.jpg', None),
    'sudeen': (ISO + '115802.jpg', None),
    'gadara': (ISO + '122232.jpg', None),
    'alagara': (ISO + '122433.jpg', None),
}
# CLASH_SRC="rabdul=/path/a.jpg;tayo=/path/b.jpg" cuts only those (Nov batch: Rabdul 1023, Tayo 1051)
if os.environ.get('CLASH_SRC'):
    SOURCES = {k: (v, None) for k, v in (kv.split('=', 1) for kv in os.environ['CLASH_SRC'].split(';'))}
HEIGHT = 400  # the banner's full height (900 on his sheet) in the game's picture

def cream(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = a.mean(-1)
    # warm paper: red above blue; his white stripes are neutral and stay
    return (lum > 205) & (r - b > 7) & (a.max(-1) - a.min(-1) < 34)

def load(path, kind):
    im = Image.open(path).convert('RGB')
    if kind == 'shot':
        # the banner inside the chat bubble: the cream area's bounds
        a = np.array(im.crop((1000, 1250, 2300, 2050))).astype(int)
        c = cream(a)
        rows = np.where(c.sum(1) > 200)[0]; cols = np.where(c.sum(0) > 120)[0]
        y0, y1 = rows.min() + 1250, rows.max() + 1250
        x1 = cols.max() + 1000
        h = y1 - y0; x0 = int(round(x1 - h * 1600 / 900))
        im = im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3)).resize((1600, 900), Image.LANCZOS)
    return im

def plate_text_box(a):
    """The name on the plate (top left): its gold letters' bounding box."""
    H, W = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    zone = np.zeros((H, W), bool); zone[int(H * 0.03):int(H * 0.15), int(W * 0.105):int(W * 0.31)] = True
    gold = zone & (r > 150) & (r - b > 60) & (g > 100)
    ys, xs = np.where(gold)
    return int(xs.min()) - 3, int(ys.min()) - 3, int(xs.max()) + 4, int(ys.max()) + 4, gold

def mirrored(im):
    """The banner flipped left to right, with the name put back the right way round."""
    a = np.array(im).astype(int); H, W = a.shape[:2]
    x0, y0, x1, y1, gold = plate_text_box(a)
    m = a[:, ::-1].copy()
    mgold = gold[:, ::-1]
    # wipe the mirrored letters with the plate's dark colour
    mx0, mx1 = W - x1, W - x0
    box = np.zeros((H, W), bool); box[y0:y1, mx0:mx1] = True
    letters = ndimage.binary_dilation(mgold, iterations=2) & box
    dark = box & ~letters & (a[:, ::-1].mean(-1) < 70)
    fill = np.median(m[dark], axis=0) if dark.any() else np.array([30, 25, 22])
    m[letters] = fill
    # the letters as drawn, unflipped, in the same place
    src = a[y0:y1, x0:x1]
    lmask = ndimage.binary_dilation(gold[y0:y1, x0:x1], iterations=1)
    tgt = m[y0:y1, mx0:mx1]
    tgt[lmask] = src[lmask]
    m[y0:y1, mx0:mx1] = tgt
    return Image.fromarray(m.astype(np.uint8))

def cut(im, out, back_left=True):
    a = np.array(im).astype(int); H, W = a.shape[:2]
    c = cream(a)
    lab, n = ndimage.label(c)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # small cream holes inside the splashes count as paper too
    holes = c & ~bg
    hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(holes, hl, range(1, hn + 1))
        bg |= np.isin(hl, [i + 1 for i, v in enumerate(hs) if v > 40])
    solid = ~bg
    # drop specks (the chat's arrow button, stray paint dots)
    lab2, n2 = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab2, range(1, n2 + 1))
    solid = np.isin(lab2, [i + 1 for i, v in enumerate(sizes) if v > 600])
    alpha = np.array(Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float)
    # the back edge fades out, so it can slide in from the side
    ramp = np.clip(np.arange(W) / (W * 0.14), 0, 1)
    if not back_left:
        ramp = ramp[::-1]
    alpha *= ramp[None, :]
    rgba = np.dstack([a, alpha]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getbbox()
    k = HEIGHT / H
    # keep the full height (so every banner lines up), trim the width
    img = img.crop((bb[0], 0, bb[2], H)).resize((round((bb[2] - bb[0]) * k), HEIGHT), Image.LANCZOS)
    # WebP: a fifth of the size of a PNG for a painting like this (every
    # current phone browser shows it); loaded in the background during a battle
    img.save(out, 'WEBP', quality=85, method=6)
    info = {'crop': [int(bb[0]), int(bb[2])], 'k': k}
    # where its point is: the furthest solid pixel across the middle of the panel
    sa = np.array(img.getchannel('A'))
    band = sa[int(HEIGHT * 0.40):int(HEIGHT * 0.52)] > 128
    cols = np.where(band.any(0))[0]
    tip = (cols.max() if back_left else cols.min()) / sa.shape[1]
    return {'file': os.path.basename(out), 'tip': round(float(tip), 3), 'size': list(img.size)}, info

def name_patch(im, info, out):
    """For the right-hand side the game flips the banner; this small picture of
    the plate with the name the right way round goes over the flipped name."""
    a = np.array(im).astype(int); H, W = a.shape[:2]
    x0, y0, x1, y1, _ = plate_text_box(a)
    m = np.array(mirrored(im)).astype(int)
    rgb = m[y0:y1, W - x1:W - x0]
    # see-through where it is paper, and faded like the banner's back edge
    alpha = (~cream(rgb)).astype(float)
    xs = x1 - np.arange(rgb.shape[1])  # each column's place on his (unflipped) sheet
    alpha *= np.clip(xs / (W * 0.14), 0, 1)[None, :]
    patch = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    k = info['k']; b0, b2 = info['crop']
    pw, ph = round((x1 - x0) * k), round((y1 - y0) * k)
    patch.resize((pw, ph), Image.LANCZOS).save(out, 'WEBP', quality=90, method=6)
    lw = round((b2 - b0) * k)
    # where it goes on the flipped banner (from its top left), as fractions of the banner
    u0 = lw - (x1 - b0) * k
    return {'file': os.path.basename(out), 'x': round(u0 / lw, 4), 'y': round(y0 * k / HEIGHT, 4)}

man = {}
for name, (path, kind) in SOURCES.items():
    im = load(path, kind)
    left, info = cut(im, OUT + name + '_clash.webp', True)
    man[name] = dict(left, name=name_patch(im, info, OUT + name + '_clash_name.webp'))
    print(name, man[name], os.path.getsize(OUT + name + '_clash.webp') // 1024, 'KB')
json.dump(man, open(OUT + 'manifest.json', 'w'), indent=1)
