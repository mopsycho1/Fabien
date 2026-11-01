# The clean-up batch (1 Nov): his pictures from 30 Oct and 1 Nov that were
# waiting to be wired in. Run from dev/:  python3 tools/make_cleanup.py <art dir>
#   9.6  Empower aura (30 Oct 19:21, the version on black, drawn glowing)
#   9.8  Sudeen's dodge and slip strike (30 Oct 20:00)
#   9.9  Gaha's clash poses: Press (21:14), Guard (20:15 second), Slip (21:03)
#   9.10 the element rising round Layra as she concentrates (30 Oct 18:26:
#        earth, purple, wind rows) and fire (18:33), and his fire beam for Wildfire
#   9.16 Sonic Javelin: wind-up (1 Nov 08:32), close range (08:22), the flying
#        spear and the impact (08:14)
#   9.17 Layra injured (1 Nov 09:21)
# Characters are cut at their size in the game: figures are matched by the
# size of their hair (sheet.hair), which is how the earlier sheets were matched.
import sys, os, json
ART = sys.argv[1] if len(sys.argv) > 1 else '../public/art/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from fxcut import cut
from sheet import hair
from iso31 import clean, cells
from PIL import Image
import numpy as np

O30 = '/home/claude/incoming/2026-10-30/PHOTO-2026-10-30-'
N1 = '/home/claude/incoming/2026-11-01/'
TMP = '/home/claude/work/cleanup/'
os.makedirs(TMP, exist_ok=True)
man = {}

def quant(path):
    im = Image.open(path)
    a = im.getchannel('A')
    q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(a)
    q.save(path, optimize=True)

def figure(src, box, out, target_hair, strokes=False, keep=0.15):
    """A character cut so its hair measures target_hair (his size in the game)."""
    tmp = TMP + 'probe.png'
    cut(src, box, tmp, 1.0, strokes=strokes, keep=keep, floor=True)
    h = hair(tmp) or 1
    k = target_hair / h
    ox, size = cut(src, box, out, k, strokes=strokes, keep=keep, floor=True)
    quant(out)
    return {'file': os.path.basename(out), 'originX': ox}, k

def k_for_height(src, box, height, strokes=False, keep=0.15):
    """The scale that makes this figure "height" pixels tall."""
    tmp = TMP + 'probe.png'
    cut(src, box, tmp, 1.0, strokes=strokes, keep=keep, floor=True)
    return height / Image.open(tmp).height

def figure_at(src, box, out, k, strokes=False, keep=0.15, slab=False):
    ox, size = cut(src, box, out, k, strokes=strokes, keep=keep, floor=True)
    if slab:
        # his 1 Nov sheets stand on a pale grey floor slab: clear what's left of it round the feet
        im = Image.open(out).convert('RGBA'); arr = np.array(im).astype(int); h = arr.shape[0]
        rgb = arr[..., :3]; chroma = rgb.max(-1) - rgb.min(-1); lum = rgb.mean(-1)
        zone = np.zeros(arr.shape[:2], bool); zone[int(h * 0.7):] = True
        a = arr[..., 3]; a[zone & (chroma < 66) & (lum > 85)] = 0; arr[..., 3] = a  # (sandals and legs are a stronger brown)
        Image.fromarray(arr.astype(np.uint8), 'RGBA').save(out)
    quant(out)
    return {'file': os.path.basename(out), 'originX': ox}

def glow(src, box, out, width, rotate=0, slab=False):
    """An effect on a WHITE sheet made see-through: colour to alpha from white."""
    im = Image.open(src).convert('RGB').crop(box)
    if rotate:
        im = im.rotate(rotate, resample=Image.BICUBIC, expand=True, fillcolor=(255, 255, 255))
    a = np.array(im).astype(float)
    c2a = (255 - a.min(-1)) / 255.0
    c2a[c2a < 0.06] = 0
    safe = np.maximum(c2a, 1e-3)[..., None]
    col = np.clip(255 - (255 - a) / safe, 0, 255)  # the colour as painted, un-blended from the white
    alpha = np.clip(c2a * 1.35, 0, 1)                # a little stronger, so it reads on a dark board
    if slab:  # the pale grey floor slab under it goes
        chroma = a.max(-1) - a.min(-1)
        alpha[(chroma < 14) & (a.mean(-1) > 170)] = 0
    img = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
    img = img.crop(img.getbbox())
    k = width / img.width
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    img.save(out, optimize=True)
    return img.size, k

# ---------- 9.6 Empower aura: the version on black, drawn glowing ----------
emp = Image.open(O30 + '19-21-42.jpg').convert('RGB')
a = np.array(emp).astype(int)
ys, xs = np.where(a.max(-1) > 40)
emp = emp.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
emp = emp.resize((300, round(emp.height * 300 / emp.width)), Image.LANCZOS)
emp.save(ART + 'fx/empower_aura.jpg', quality=84)
man['empower'] = list(emp.size)

# ---------- 9.10 the element rising (his 18:26 rows, 18:33 fire) ----------
def split_row(src, y0, y1, n):
    strip = TMP + 'strip.jpg'
    Image.open(src).convert('RGB').crop((0, y0, 1536, y1)).save(strip, quality=95)
    return [(x0 + 6, y0 + 4, x1 - 6, y1 - 4) for (x0, _, x1, _) in cells(strip, n)]
for row, name in enumerate(['earth', 'hex', 'wind']):
    for col, box in enumerate(split_row(O30 + '18-26-14.jpg', row * 341, row * 341 + 341, 4)[:3]):
        glow(O30 + '18-26-14.jpg', box, ART + 'fx/rise_%s_%d.png' % (name, col), 150)
for col, box in enumerate(split_row(O30 + '18-33-20.jpg', 0, 341, 3)[:2]):
    glow(O30 + '18-33-20.jpg', box, ART + 'fx/rise_fire_%d.png' % col, 150)
# the beam (row 1, the fullest one): its head is on the left, so it flies left as drawn
size, _ = glow(O30 + '18-33-20.jpg', split_row(O30 + '18-33-20.jpg', 341, 682, 3)[2], ART + 'fx/fire_beam.png', 170)
man['fire_beam'] = list(size)

# ---------- 9.8 Sudeen (20:00): his figures face left as drawn ----------
SUD_HAIR = 34  # his guard picture in the game measures 34 (sheet.hair)
sud = O30 + '20-00-50.jpg'
man['h1'] = {}
for name, box in {'slipStrike_downLeft': (60, 60, 760, 520), 'dodge_upRight': (800, 40, 1520, 500), 'dodge_downLeft': (820, 500, 1530, 1010)}.items():
    man['h1'][name], _ = figure(sud, box, ART + 'sudeen_cu_%s.png' % name, SUD_HAIR)

# ---------- 9.9 Gaha's clash poses, 9.16 his Sonic Javelin ----------
# each of his sheets is scaled so its down-right figure is as tall as the
# matching pose in the game (guard 162, the lunge 150, the low dodge 140)
man['h2'] = {}
SHEETS = {
    'clashPress': (O30 + '21-14-09.jpg', (790, 0, 1536, 470), (780, 500, 1536, 1024), 150),
    'clashGuard': (O30 + '20-15-24 2.jpg', (790, 10, 1460, 520), (790, 520, 1440, 1024), 162),
    'clashSlip': (O30 + '21-03-16.jpg', (770, 0, 1536, 480), (770, 500, 1536, 1024), 140),
}
for name, (src, up, down, h) in SHEETS.items():
    k = k_for_height(src, down, h)
    man['h2'][name + '_upRight'] = figure_at(src, up, ART + 'gaha_cu_%s_upRight.png' % name, k)
    man['h2'][name + '_downRight'] = figure_at(src, down, ART + 'gaha_cu_%s_downRight.png' % name, k)
# Sonic Javelin: his 1 Nov sheets stand on a floor slab: clear it first;
# the wind-up as tall as his throw picture (180), the rest at the same scale
cl = TMP + 'sonic_windup_0832.jpg'
clean(N1 + 'sonic_windup_0832.jpg', cl, n=1)
W0 = Image.open(cl)
k_spear = k_for_height(cl, (0, 0, W0.width, W0.height), 185, keep=0.02)
man['h2']['sonicWindup_downRight'] = figure_at(cl, (0, 0, W0.width, W0.height), ART + 'gaha_cu_sonicWindup.png', k_spear, keep=0.02, slab=True)
cl = TMP + 'sonic_close_range_0822.jpg'
clean(N1 + 'sonic_close_range_0822.jpg', cl, n=1)
C0 = Image.open(cl)
man['h2']['sonicClose_downRight'] = figure_at(cl, (0, 0, C0.width, C0.height), ART + 'gaha_cu_sonicClose.png', k_spear, strokes=True, keep=0.02, slab=True)
# the flying spear: turned level (it flies at about 20 degrees up on his sheet), tip to the right
sp = Image.open(N1 + 'sonic_flying_spear_0814.jpg').convert('RGB').size
size, _ = glow(N1 + 'sonic_flying_spear_0814.jpg', (20, 60, 1500, 820), ART + 'fx/sonic_spear.png', round(1300 * k_spear), rotate=-21)
man['sonic_spear'] = list(size)
size, _ = glow(N1 + 'sonic_impact_0814.jpg', (30, 40, 1520, 1000), ART + 'fx/sonic_impact.png', round(1490 * k_spear), slab=True)
man['sonic_impact'] = list(size)

# ---------- 9.17 Layra injured (09:21), at her iso size ----------
lay_clean = '/home/claude/work/iso/out/clean/123015.jpg'
cl_stand = TMP + 'layra_stand.jpg'
if not os.path.exists(lay_clean):
    clean('/home/claude/incoming/2026-10-31-iso/123015.jpg', cl_stand)
    lay_clean = cl_stand
bx = cells(lay_clean, 4)
raw = []
for f in (2, 4):
    cut(lay_clean, bx[f - 1], TMP + 'p.png', 1.0, strokes=False, keep=0.15, floor=True)
    raw.append(Image.open(TMP + 'p.png').height)
base = 200 / max(raw)
inj = TMP + 'layra_injured.jpg'
clean(N1 + 'layra_injured_0921.jpg', inj)
bx = cells(inj, 4)
man['h3'] = {}
for fig, facing in ((2, 'upRight'), (4, 'downRight')):
    out = ART + 'layra_iso_hurt2_%s.png' % facing
    ox, size = cut(inj, bx[fig - 1], out, base, strokes=False, keep=0.15, floor=True)
    quant(out)
    man['h3']['hurt_' + facing] = {'file': os.path.basename(out), 'originX': ox}

json.dump(man, open(TMP + 'manifest.json', 'w'), indent=1)
print(json.dumps(man, indent=1))
