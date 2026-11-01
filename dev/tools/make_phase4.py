# Phase 4 (1 Nov): his enemy-skill sheets from 29 Oct (Fabien Blueprint/CHARACTER UPDATES).
# Run from dev/:  python3 tools/make_phase4.py <art dir>
#   4.1 Rabdul's Enchant: the effect sheet (ENCHANT RABDUL: fire ring, Shango's
#       sigil, the sigil flying, the flaming spear), Rabdul with his flaming
#       spear (ENCHANT RABDUL1), the bull with his flaming mace and shield
#       (bull attacking with flame weaponry 1 and 3), the archer's flaming bow
#       (Archer imbued with rabdul's enchantment)
#   4.2 Tayo's Earth Drive: his four frames (earth drive without effects) and
#       the rock spikes (multi directional reference for tayo's attack emerging)
# Figures are cut at their size in the game: each sheet's scale is set so the
# figure matches the height of that character's pictures already in the game.
import sys, os, json
ART = sys.argv[1] if len(sys.argv) > 1 else '../public/art/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from fxcut import cut
from iso31 import cells
from PIL import Image
import numpy as np

SRC = '/home/claude/incoming/2026-11-01/p4/'
TMP = '/home/claude/work/phase4/'
os.makedirs(TMP, exist_ok=True)
man = {}

def quant(path):
    im = Image.open(path)
    a = im.getchannel('A')
    q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(a)
    q.save(path, optimize=True)

def row_cells(src, y0, y1, n):
    """The n figures in one row of a sheet, split at the gaps between them."""
    strip = TMP + 'strip.jpg'
    Image.open(src).convert('RGB').crop((0, y0, Image.open(src).width, y1)).save(strip, quality=95)
    return [(x0, y0, x1, y1) for (x0, _, x1, _) in cells(strip, n)]

def k_for(src, box, height, keep=0.02):
    tmp = TMP + 'probe.png'
    cut(src, box, tmp, 1.0, strokes=False, keep=keep, floor=True)
    return height / Image.open(tmp).height

def figure(src, box, out, k, keep=0.02):
    ox, size = cut(src, box, ART + out, k, strokes=False, keep=keep, floor=True)
    quant(ART + out)
    return {'file': out, 'originX': ox}

def glow(src, box, out, width):
    """An effect on a WHITE sheet made see-through: colour to alpha from white."""
    im = Image.open(src).convert('RGB').crop(box)
    a = np.array(im).astype(float)
    c2a = (255 - a.min(-1)) / 255.0
    c2a[c2a < 0.06] = 0
    safe = np.maximum(c2a, 1e-3)[..., None]
    col = np.clip(255 - (255 - a) / safe, 0, 255)
    alpha = np.clip(c2a * 1.35, 0, 1)
    img = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
    img = img.crop(img.getbbox())
    k = width / img.width
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    img.save(ART + out, optimize=True)
    return list(img.size)

# ---------- 4.1 the Enchant effect (ENCHANT RABDUL: 6 columns, 4 rows of frames) ----------
E0 = SRC + 'enchant0.jpg'
man['fx'] = {}
for r in range(4):
    boxes = row_cells(E0, r * 256 + 2, r * 256 + 254, 6)
    for name, c, w in (('ring', 0, 170), ('sigil', 1, 150), ('comet', 2, 170)):
        man['fx']['enchant_%s_%d' % (name, r)] = glow(E0, boxes[c], 'fx/enchant_%s_%d.png' % (name, r), w)

# (Rabdul's own flaming-spear sheet, ENCHANT RABDUL1, can't be cut cleanly:
# each spear reaches into the next figure. Enchanted, he uses his isometric
# flaming spear attack, fireAttack, which is already in the game.)

# ---------- 4.1 the bull with his flaming mace and shield ----------
B1, B3 = SRC + 'bull_flame1.jpg', SRC + 'bull_flame3.jpg'
bb = row_cells(B1, 15, 468, 4)
kb = k_for(B1, bb[1], 226)  # as tall as his battle stance in the game (212), plus the flames
ba = row_cells(B3, 10, 452, 4)
man['e2'] = {
    'downLeft': figure(B1, bb[1], 'bull_ench_battle_downLeft.png', kb),
    'upLeft': figure(B1, bb[2], 'bull_ench_battle_upLeft.png', kb),
    'attack_downRight': figure(B3, ba[2], 'bull_ench_attack_downRight.png', kb),  # the lunge, facing right (mirrored for left)
}

# ---------- 4.1 the archer's flaming bow (8 views: 1 down-right, 4 up-right, 6 up-left, 7 down-left) ----------
A = SRC + 'archer_enchanted.jpg'
# the figures are unevenly spaced and the bows reach into the next one's
# space: wide boxes, keeping only the biggest piece (her and her own bow)
AB = {'downRight': (0, 30, 215, 505), 'upRight': (597, 30, 800, 505), 'upLeft': (975, 30, 1200, 505), 'downLeft': (1160, 30, 1390, 505)}
ka = k_for(A, AB['downLeft'], 126, keep=0.4)  # her aiming picture in the game is 118 tall, plus the flames
man['e3'] = {f: figure(A, b, 'archer_ench_%s.png' % f, ka, keep=0.4) for f, b in AB.items()}

# ---------- 4.2 Tayo's Earth Drive: 4 frames facing right ----------
T = SRC + 'drive_plain.jpg'
tb = row_cells(T, 90, 712, 4)
man['e1'] = [figure(T, b, 'tayo_drive_%d.png' % i, 0.4526, keep=0.05) for i, b in enumerate(tb)]

# ---------- 4.2 the rock spikes (row 1: five eruptions) ----------
D = SRC + 'drive_dirs.jpg'
for i, b in enumerate(row_cells(D, 0, 268, 5)):
    ox, size = cut(D, b, ART + 'fx/spike_%d.png' % i, 0.55, strokes=False, keep=0.01, floor=True)
    quant(ART + 'fx/spike_%d.png' % i)
    man['fx']['spike_%d' % i] = list(size)
json.dump(man, open(TMP + 'manifest.json', 'w'), indent=1)
print(json.dumps(man, indent=1))
