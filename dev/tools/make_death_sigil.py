# The flat sigil the new death dissolve glows on the ground (roadmap 16.2, the reworked deaths): the ring of
# his Sigil Dissolve (first frame, public/art/fx/death_0.png) without the runes standing above it.
# Run from the repo root:  python3 dev/tools/make_death_sigil.py
from PIL import Image
import numpy as np
im = Image.open('public/art/fx/death_0.png').convert('RGBA')
a = np.array(im)
top, bottom = 64, 123
ring = a[top:bottom].copy()
# fade the top few rows so no thin rune strokes are cut hard
h = ring.shape[0]
fade = np.clip(np.arange(h) / 10.0, 0, 1)[:, None]
ring[..., 3] = (ring[..., 3] * fade).astype(np.uint8)
out = Image.fromarray(ring, 'RGBA')
out = out.crop(out.getbbox())
out.save('public/art/fx/death_sigil.png', optimize=True)
print(out.size)
