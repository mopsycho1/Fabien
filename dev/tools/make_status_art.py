# Status art from Suleiman's 30 Oct sheets (roadmap 6.7, 6.9, 6.10, 6.12, 6.13).
#   icons/<name>.png   64x64 status icons shown over units (his "status effects" sheet;
#                      the three Verses use his Swift, Fury and Earth's Bulwark cards)
#   cards/<id>.png     his status cards, frame included, 180 px tall (the small pop on a unit)
#   ui/glyph_charge.png, ui/glyph_bag.png   56x56 button glyphs (Engage, Items)
#   fx/bulwark_crystal_<i>.png   floating crystals for the Earth's Bulwark aura (black, drawn as light)
# usage: python3 make_status_art.py <blueprint dir> <public/art dir>
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

D, OUT = sys.argv[1], sys.argv[2]
CU = os.path.join(D, 'CHARACTER UPDATES')
sheet = Image.open(os.path.join(CU, 'status effects.jpeg')).convert('RGB')
fury = Image.open(os.path.join(D, 'fury.jpeg')).convert('RGB')
offb = Image.open(os.path.join(CU, 'off balance.jpeg')).convert('RGB')
swe = Image.open(os.path.join(CU, "swift & earth's bulwark.jpeg")).convert('RGB')
pre = Image.open(os.path.join(CU, 'skirmish and empower.jpeg')).convert('RGB')
bag = Image.open(os.path.join(CU, 'Items UI.jpeg')).convert('RGB')
for sub in ('icons', 'cards', 'ui', 'fx'):
    os.makedirs(os.path.join(OUT, sub), exist_ok=True)

def save(im, path, colors=256):
    # 256 colours keeps the files small; alpha survives the quantize
    if im.mode == 'RGBA':
        im.quantize(colors, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)
    else:
        im.quantize(colors).save(path, optimize=True)

# ---------- icons (frames read off the 1536x1024 sheet; the gold border is trimmed) ----------
BOX = {
    'poison': (22, 57, 208, 275), 'stunned': (225, 57, 405, 275), 'offbalance': (422, 57, 638, 275),
    'exposed': (654, 57, 848, 275), 'hidden': (868, 57, 1066, 275), 'echo': (1084, 57, 1276, 275),
    'meditating': (1293, 57, 1512, 275),
    'aiming': (24, 362, 194, 578), 'marked': (212, 362, 410, 578), 'burn': (428, 362, 603, 578),
    'disoriented': (619, 362, 828, 578), 'enchanted': (846, 362, 1056, 578), 'bloodied': (1073, 362, 1271, 578),
    'charge': (1288, 362, 1512, 578), 'bulwark': (1150, 692, 1374, 916),
}
def square(box, inset=0.07):
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    side = min(x1 - x0, y1 - y0) * (1 - 2 * inset)
    return (round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2))
for name, box in BOX.items():
    save(sheet.crop(square(box)).resize((64, 64), Image.LANCZOS), os.path.join(OUT, 'icons', name + '.png'))
# the Verses: the middle of his cards (his sheet's three Verse icons were the wrongly named ones)
VERSE = {'swiftness': (swe, (100, 60, 700, 660)), 'stone': (swe, (900, 60, 1500, 660)), 'fury': (fury, (90, 80, 1170, 1160))}
for name, (im, box) in VERSE.items():
    save(im.crop(box).resize((64, 64), Image.LANCZOS), os.path.join(OUT, 'icons', name + '.png'))

# ---------- cards (frame included) ----------
CARD = {
    'offbalance': (offb, (92, 91, 1162, 1162)), 'fury': (fury, (24, 21, 1230, 1214)),
    'swiftness': (swe, (30, 27, 765, 686)), 'stone': (swe, (829, 27, 1570, 686)),
    'press': (pre, (29, 26, 771, 685)), 'empower': (pre, (827, 26, 1570, 685)),
}
for name, (im, box) in CARD.items():
    c = im.crop(box)
    h = 180
    save(c.resize((round(c.width * h / c.height), h), Image.LANCZOS), os.path.join(OUT, 'cards', name + '.png'))

# ---------- button glyphs: his symbol on the dark disc his other glyphs use ----------
DISC = np.array([40, 21, 8], float)
def disc_mask(n, r):
    big = Image.new('L', (n * 4, n * 4), 0)
    ImageDraw.Draw(big).ellipse((n * 2 - r * 4, n * 2 - r * 4, n * 2 + r * 4, n * 2 + r * 4), fill=255)
    return big.resize((n, n), Image.LANCZOS)
def glyph(sym, name, add=True):
    s = np.array(sym.resize((56, 56), Image.LANCZOS)).astype(float)
    if add:   # light on black (the Charge streaks): add it onto the disc
        rgb = np.clip(DISC + s * 1.15, 0, 255)
    else:     # already painted on its own dark disc (the bag)
        rgb = s
    out = Image.fromarray(rgb.astype('uint8')).convert('RGBA')
    out.putalpha(disc_mask(56, 27))
    save(out, os.path.join(OUT, 'ui', 'glyph_' + name + '.png'))
# Charge: the middle of his Charge icon, its dark background pulled down to black
cx0, cy0, cx1, cy1 = square(BOX['charge'], 0.1)
ch = np.array(sheet.crop((cx0, cy0, cx1, cy1))).astype(float)
ch = np.clip((ch - 22) * 1.25, 0, 255)
glyph(Image.fromarray(ch.astype('uint8')), 'charge')
# Bag: the inside of his round Items icon (centre 634,569; the ring starts at radius 384)
glyph(bag.crop((634 - 378, 569 - 378, 634 + 378, 569 + 378)), 'bag', add=False)

# ---------- Earth's Bulwark crystals (from his Earth's Bulwark card), as light on black ----------
CRYSTALS = [(916, 82, 968, 178), (1436, 84, 1476, 154), (1466, 196, 1520, 306)]
for i, box in enumerate(CRYSTALS):
    c = np.array(swe.crop(box)).astype(float)
    # the card's dark brown background goes to black so the crystal can be added as light
    lum = c.mean(-1, keepdims=True)
    k = np.clip((lum - 70) / 90, 0, 1)
    c = c * k
    im = Image.fromarray(c.astype('uint8'))
    save(im.resize((im.width // 2 * 2, im.height // 2 * 2)), os.path.join(OUT, 'fx', 'bulwark_crystal_%d.png' % i))
print('done')
