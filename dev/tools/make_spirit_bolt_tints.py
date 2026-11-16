"""Kofi's comet in his other elements (roadmap 1.55).

Suleiman drew one teal Spirit Projectile (sfx_spirit_bolt, his Water / Tide Bolt). Until he draws the others, Kofi's
Ember, Stone and Gale bolts use that comet tinted by element: fire red, stone gold, gale pale. The tint is a hue
change made here on the frames (a plain game tint would multiply teal by red and go dark; the game draws these with
ADD blending). Writes public/art/fx/sfx_spirit_bolt_<element>_<n>.png and copies the comet's entry in
src/data/fxSlots.json ("spells") for each, so the game finds them like any other drawn spell.
Run: ~/.fabien-tools/venv/bin/python -I dev/tools/make_spirit_bolt_tints.py   (then fx_fit.py)
"""
import colorsys
import json
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
FX = os.path.join(ROOT, 'public', 'art', 'fx')
SLOTS = os.path.join(ROOT, 'src', 'data', 'fxSlots.json')

# element: (hue in degrees, saturation multiplier, brightness multiplier)
TINTS = {
    'fire': (8, 1.0, 1.0),      # red
    'earth': (42, 1.0, 1.0),    # gold
    'storm': (205, 0.28, 1.12),  # pale blue-white
}


def tint_frame(im, hue, sat_k, val_k):
    px = im.load()
    out = Image.new('RGBA', im.size)
    po = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = px[x, y]
            if a == 0:
                po[x, y] = (0, 0, 0, 0)
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # keep the hot white core white: only the coloured parts take the new hue
            s = min(1.0, s * sat_k)
            v = min(1.0, v * val_k)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, s, v)
            po[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out


def main():
    data = json.load(open(SLOTS))
    base = data['spells']['spirit_bolt']
    for element, (hue, sat_k, val_k) in TINTS.items():
        name = 'spirit_bolt_' + element
        for i in range(base['frames']):
            im = Image.open(os.path.join(FX, 'sfx_spirit_bolt_%d.png' % i)).convert('RGBA')
            tint_frame(im, hue, sat_k, val_k).save(os.path.join(FX, 'sfx_%s_%d.png' % (name, i)))
        entry = {k: v for k, v in base.items() if k != 'fit'}   # fx_fit.py measures the fit again
        data['spells'][name] = entry
        print('wrote', name, base['frames'], 'frames')
    json.dump(data, open(SLOTS, 'w'), indent=1)
    open(SLOTS, 'a').write('\n')


if __name__ == '__main__':
    main()
