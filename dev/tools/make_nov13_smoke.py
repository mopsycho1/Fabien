# Roadmap 1.34: the Smoke Bomb's dissipating frames are tinted a warm grey and a little
# darker, to suit the cave. This reads the raw cut frames from dev/tools/smoke_raw/ (never
# changed) and writes the game's frames to public/art/fx/. (The growing cloud was tried as
# cut frames with a fade at the bottom; the grey floor-tile wedge still showed, so it is
# particles now, see src/smokeArt.js.) The sprite's alpha (60 to 70%) is set there too.
# Run from the repo root:  python3 dev/tools/make_nov13_smoke.py
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'smoke_raw')
OUT = os.path.join(HERE, '..', '..', 'public', 'art', 'fx')
TINT = np.array([0.90, 0.84, 0.76])  # warm grey: a little red, less blue
DARKEN = 0.84      # a cave is darker than the page the art was drawn on

def process(name):
    im = np.asarray(Image.open(os.path.join(RAW, name)).convert('RGBA')).astype(float)
    lum = 0.299 * im[:, :, 0] + 0.587 * im[:, :, 1] + 0.114 * im[:, :, 2]
    for c in range(3):
        im[:, :, c] = np.clip(lum * TINT[c] * DARKEN, 0, 255)
    Image.fromarray(im.astype(np.uint8)).save(os.path.join(OUT, name))
    print(name, im.shape[1], 'x', im.shape[0])

for i in range(4):
    process('smoke_clear_%d.png' % i)
