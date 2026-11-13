"""Waterfall v2 (roadmap 1.41, wired in 18.3, checklist C3).
Packs the three Blender loops in Fabien Blueprint/BLENDER TESTS/fire_water into one strip each
(12 frames side by side) in public/art/fx: waterfall_tall.png (256 x 352 a frame, the cavern's
two-level falls), waterfall.png (256 x 224, a one-level fall), splash_ring.png (272 x 168).
The frames are already on one canvas from one camera, so nothing is moved.
Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_water.py [<fire_water folder>]"""
import sys, os, glob
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Documents/Fabien Blueprint/BLENDER TESTS/fire_water')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'art', 'fx')
for name in ('waterfall_tall', 'waterfall', 'splash_ring'):
    frames = [Image.open(f).convert('RGBA') for f in sorted(glob.glob(os.path.join(SRC, name, '*.png')))]
    assert len(frames) == 12 and len({f.size for f in frames}) == 1, name + ': expected 12 frames of one size'
    w, h = frames[0].size
    strip = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * w, 0))
    strip.save(os.path.join(OUT, name + '.png'), optimize=True)
    print(name, len(frames), 'frames of', (w, h), '->', strip.size)
