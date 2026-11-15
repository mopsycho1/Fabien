"""Measures how big each of Suleiman's GIF effects really is, so the game can size it to the fighter (roadmap 6.64).

The pictures in public/art/fx are the 439 px GIF canvas cut to half size, so a picture is much bigger than the effect
drawn in it, and the game used to show every one at one fixed scale. This reads the frames of every effect named in
src/data/fxSlots.json ("buffs": loop, move, rooted, cast; "spells": orb, bolt, strike, lance) and writes into the same
file a "fit" for each: the size of what is DRAWN (the middle value over the frames of the box round the visible pixels,
alpha above 40 of 255):
  h, w      height and width of the drawn effect, in the picture's own pixels
  mx, my    where the middle of that box sits in the picture (pixels from its top-left)
  by        where the bottom of the drawn effect sits (the ring on the floor)
  W, H      the picture's size
The game then sets scale = (height wanted) / h, with the height wanted taken from the fighter's body height (the ruler's
height, unit.topY - 12): src/spellArt.js fitScale. What is wanted (k, anchor, layer) is also stored in "fit" and is the one
thing to edit by hand; this tool keeps those values when it is run again.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/fx_fit.py
"""
import json
import os
import statistics
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SLOTS = os.path.join(ROOT, 'src', 'data', 'fxSlots.json')
FX = os.path.join(ROOT, 'public', 'art', 'fx')

# What is wanted of each effect (used only the first time; after that the file's own values stay).
#   k      how tall the drawn effect should be, in body heights (auras 1.2 to 1.4)
#   anchor "base": the bottom of the drawing stands on the feet; "centre": its middle sits on the middle of the body
#   layer  "behind" the body, "front" of it (the Rooted dome overlays Gaha, Suleiman 15 Nov), or "split": all of it behind and
#          its lower (near) half again in front, for the ring of orbiting stones
WANT_BUFF = {
    ('swiftness', 'loop'): dict(k=1.3, anchor='base', layer='behind'),
    ('swiftness', 'move'): dict(k=1.2, anchor='centre', layer='behind'),
    ('fury', 'loop'): dict(k=1.3, anchor='base', layer='behind'),
    ('fury', 'move'): dict(k=1.2, anchor='centre', layer='behind'),
    ('stone', 'loop'): dict(k=1.3, anchor='centre', layer='split'),
    ('stone', 'rooted'): dict(k=1.3, anchor='base', layer='front'),
}
# Projectiles: "tiles" = how wide the drawn effect should be across the board, in tiles (about one).
WANT_SPELL = {
    'lightning_orb': dict(tiles=1.0), 'wildfire_orb': dict(tiles=1.0),
    'lightning_bolt': dict(tiles=0.8), 'wildfire_lance': dict(tiles=0.8),   # across the beam (its thickness)
    'lightning_strike': dict(tiles=1.0),                                   # the width of the bolt that comes down
}


def measure(name, n):
    boxes = []
    size = None
    for i in range(n):
        im = Image.open(os.path.join(FX, '%s_%d.png' % (name, i))).convert('RGBA')
        size = im.size
        ys, xs = np.where(np.array(im)[:, :, 3] > 40)
        if len(xs):
            boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    med = lambda vals: statistics.median(vals)
    return {
        'h': round(med([b[3] - b[1] for b in boxes])), 'w': round(med([b[2] - b[0] for b in boxes])),
        'mx': round(med([(b[0] + b[2]) / 2 for b in boxes])), 'my': round(med([(b[1] + b[3]) / 2 for b in boxes])),
        'by': round(med([b[3] for b in boxes])), 'W': size[0], 'H': size[1],
    }


def main():
    data = json.load(open(SLOTS))
    for vid, slot in data['buffs'].items():
        for part in ('loop', 'move', 'rooted'):
            n = slot.get(part, 0)
            if not n:
                continue
            fit = slot.setdefault('fit', {})
            old = fit.get(part, {})
            want = {k: old.get(k, v) for k, v in WANT_BUFF.get((vid, part), dict(k=1.3, anchor='base', layer='behind')).items()}
            fit[part] = {**measure('buff_%s_%s' % (vid, part), n), **want}
            print(vid, part, fit[part])
    for name, spell in data['spells'].items():
        old = spell.get('fit', {})
        want = {k: old.get(k, v) for k, v in WANT_SPELL.get(name, dict(tiles=1.0)).items()}
        spell['fit'] = {**measure('sfx_' + name, spell['frames']), **want}
        print(name, spell['fit'])
    json.dump(data, open(SLOTS, 'w'), indent=1)
    open(SLOTS, 'a').write('\n')


if __name__ == '__main__':
    main()
