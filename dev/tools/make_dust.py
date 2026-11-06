# Cuts the four dust rings from Suleiman's 6 Nov 04:48:36 sheet (roadmap 13.18, 1.17)
# into public/art/fx/dust_ring_0..3.png. The sheet is a 2 by 2 grid on white;
# the rings are painted (not light), so they are drawn normally in the game.
# Run from dev/tools:  python3 make_dust.py <path to 00001162-PHOTO-2026-11-06-04-48-36.jpg>
import sys, os
from fxcut import cut

SRC = sys.argv[1]
OUT = os.path.join('..', '..', 'public', 'art', 'fx')
W, H = 1536, 1024
# the four quadrants: top-left, top-right, bottom-left, bottom-right
BOXES = [(0, 0, W // 2, H // 2), (W // 2, 0, W, H // 2), (0, H // 2, W // 2, H), (W // 2, H // 2, W, H)]

for i, box in enumerate(BOXES):
    # keep = 0.02: the dust is many small pieces, keep nearly all of them;
    # the rock flecks stay with the ring they belong to
    size, img_size = cut(SRC, box, os.path.join(OUT, 'dust_ring_%d.png' % i), 0.5, strokes=True, keep=0.02)
    print('dust_ring_%d' % i, img_size)
