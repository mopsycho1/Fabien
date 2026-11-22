"""Layra's channel effect (roadmap 1.97, 22 Nov). Suleiman will send his own channelling effect; until then the closest one we
have is Alagara's "Magical Arcane Charging Spiral" (6.90, cut to public/art/fx/sfx_arcane_charge_<n>.png). This makes a WHITE
copy of its frames (sfx_channel_<n>.png: the brightness kept, the colour taken out) so the game can tint it with the colour of the
spell she casts (a tint multiplies, so white becomes exactly that colour), and adds "channel" to fxSlots.json spells.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_channel_fx.py    (then make_webp.py)
"""
import json, os
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
FX = os.path.join(ROOT, 'public', 'art', 'fx')
SLOTS = os.path.join(ROOT, 'src', 'data', 'fxSlots.json')
slots = json.load(open(SLOTS))
src = slots['spells']['arcane_charge']
for i in range(src['frames']):
    a = np.array(Image.open(os.path.join(FX, 'sfx_arcane_charge_%d.png' % i)).convert('RGBA')).astype(float)
    lum = a[..., :3].max(-1)                       # its brightness (the brightest channel: the blue glow stays bright)
    lum = np.clip(lum * 1.15, 0, 255)
    out = np.dstack([lum, lum, lum, a[..., 3]]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(FX, 'sfx_channel_%d.png' % i), optimize=True)
slots['spells']['channel'] = dict(src, note='1.97: a white copy of arcane_charge (dev/tools/make_channel_fx.py), tinted by the spell Layra casts. Replace with his own channel effect when it comes.')
json.dump(slots, open(SLOTS, 'w'), indent=1, ensure_ascii=False); open(SLOTS, 'a').write('\n')
print('made', src['frames'], 'white channel frames')
