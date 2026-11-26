# Where the weapon is on every strike picture (roadmap 18.57, Graphics 2.0, 26 Nov).
# The weapon streak in the game starts at this point and follows it through the swing.
#
#   ~/.fabien-tools/venv/bin/python -I dev/tools/weapon_tips.py [sheet <out.jpg>]
#
# It reads every strike pose in src/data/art.json (attack, lungeAttack, dagger, hammerStrike, in every Verse form
# and look), finds the weapon tip and writes src/data/weaponTips.json: per fighter, per picture file, [x, y] as a
# share of the picture's width and height, counted in the file as stored (the game mirrors it when it flips).
# The finder: the drawn pixel that reaches furthest the way the fighter faces, leaning a little up for a back view
# and down for a front view, skipping the bottom 14 percent (the feet). Where that is wrong (a mace held high,
# a fist), the point is pinned by hand in PINS below, read off the sheet. "sheet" draws every picture with its tip.
import json, sys, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, 'src/data/art.json')
OUT = os.path.join(ROOT, 'src/data/weaponTips.json')
PICS = os.path.join(ROOT, 'public/art')
STRIKES = {'attack', 'lungeAttack', 'dagger', 'hammerStrike'}
FACINGS = ['upLeft', 'upRight', 'downLeft', 'downRight']
# Fighters whose own drawn slash plays instead (Alagara, photo 1768): no streak, so no tips.
SKIP = {'h5'}
# Hand pins, in the file as stored: file -> [x, y] (share of width, height). Read off the sheet, 26 Nov.
PINS = {
    'bull_iso_attack_upLeft.png': [0.57, 0.06],     # the mace head held high over his right shoulder
    'bull_iso_attack_downLeft.png': [0.10, 0.07],   # the mace head, top left
    'tayo_n6b_punch_f3.png': [0.04, 0.27],          # the leading fist, not the foot
    'tayo_n6b_punch_f4.png': [0.70, 0.30],
}


def find_tip(im, right, up):
    a = im.split()[-1]
    w, h = im.size
    step = max(1, w // 300)
    px = a.load()
    rows = [y for y in range(0, h, step) if any(px[x, y] > 128 for x in range(0, w, step * 2))]
    if not rows:
        return None
    top, bot = min(rows), max(rows)
    dx = 1 if right else -1
    dy = -0.25 if up else 0.25
    best, score = None, -1e18
    for y in range(top, int(bot - (bot - top) * 0.14), step):
        for x in range(0, w, step):
            if px[x, y] > 128:
                v = x * dx + y * dy
                if v > score:
                    score, best = v, (x, y)
    return [round(best[0] / w, 3), round(best[1] / h, 3)]


def strike_sets(entry, path=''):
    # every facing set under a strike pose name, anywhere in the fighter's entry (forms, looks)
    if not isinstance(entry, dict):
        return
    for k, v in entry.items():
        if k in STRIKES and isinstance(v, dict) and not v.get('file'):
            yield path + k, v
        elif isinstance(v, dict):
            yield from strike_sets(v, path + k + '.')


def main():
    art = json.load(open(ART))
    tips, cells = {}, []
    for uid, entry in art.items():
        if not isinstance(entry, dict) or uid in SKIP or uid == 'ruler':
            continue
        for name, fset in strike_sets(entry):
            for f in FACINGS:
                val = fset.get(f)
                if not val:
                    continue
                file = val if isinstance(val, str) else val.get('file')
                flip = isinstance(val, dict) and bool(val.get('flip'))
                if not file or not os.path.exists(os.path.join(PICS, file)):
                    continue
                if file in tips.get(uid, {}):
                    continue
                im = Image.open(os.path.join(PICS, file)).convert('RGBA')
                right = f.endswith('Right') != flip  # the way the figure faces in the file as stored
                tip = PINS.get(file) or find_tip(im, right, f.startswith('up'))
                if tip:
                    tips.setdefault(uid, {})[file] = tip
                    cells.append((uid, name, f, file, im, tip, file in PINS))
    json.dump({'note': 'Weapon tip per strike picture (roadmap 18.57): [x, y] as a share of the picture, in the file as stored. Made by dev/tools/weapon_tips.py; pins by hand are in its PINS.', 'tips': tips}, open(OUT, 'w'), indent=1)
    print('weapon tips:', sum(len(v) for v in tips.values()), 'pictures,', len(tips), 'fighters ->', os.path.relpath(OUT, ROOT))
    if len(sys.argv) > 2 and sys.argv[1] == 'sheet':
        cw, ch = 230, 250
        cols = 8
        sheet = Image.new('RGB', (cols * cw, ((len(cells) + cols - 1) // cols) * ch), (60, 60, 60))
        for i, (uid, name, f, file, im, tip, pinned) in enumerate(cells):
            t = im.copy(); t.thumbnail((220, 220))
            c = Image.new('RGB', (cw, ch), (70, 70, 70)); c.paste(t, (5, 5), t)
            d = ImageDraw.Draw(c)
            x, y = 5 + tip[0] * t.size[0], 5 + tip[1] * t.size[1]
            d.ellipse([x - 6, y - 6, x + 6, y + 6], outline=(0, 255, 255) if pinned else (255, 0, 0), width=3)
            d.text((4, 228), uid + ' ' + name[-14:] + ' ' + f, fill=(255, 255, 0))
            sheet.paste(c, ((i % cols) * cw, (i // cols) * ch))
        sheet.save(sys.argv[2], quality=80)
        print('sheet ->', sys.argv[2])


main()
