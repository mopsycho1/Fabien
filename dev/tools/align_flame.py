# Roadmap 1.42: the 8 flame frames (6.41) jumped around when they looped, because the flame drifted
# sideways and up and down inside each frame's cell. This puts all 8 frames on one same-size canvas with
# the flame's base at the SAME bottom-centre point. Run it in place (safe to run twice):
#   ~/.fabien-tools/venv/bin/python dev/tools/align_flame.py <contact sheet out.png>
# The base is found from the picture itself: the lowest row that holds real flame (a quarter of the widest row),
# and the middle of the flame over the 24 rows above it. Then each frame is shifted so that point lands on
# (ANCHOR_X, ANCHOR_Y). boardArt.js sets the sprite origin to the same point (FLAME_ORIGIN_X / FLAME_ORIGIN_Y).
import sys
import numpy as np
from PIL import Image

N, W, H = 8, 200, 225
ANCHOR_X, ANCHOR_Y = 100, 205          # base of the fire on the canvas
frames = []
for i in range(1, N + 1):
    im = Image.open(f'public/art/fx/flame_f{i}.png').convert('RGBA')
    a = np.asarray(im)[..., 3].astype(float)
    rows = a.sum(1)
    base_y = int(np.where(rows >= 0.25 * rows.max())[0].max())
    seg = a[max(0, base_y - 24):base_y + 1]
    base_x = (seg * np.arange(W)).sum() / seg.sum()
    dx, dy = round(ANCHOR_X - base_x), ANCHOR_Y - base_y
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.paste(im, (dx, dy))
    assert canvas.getbbox() and np.asarray(canvas)[..., 3].sum() > 0.99 * a.sum(), 'flame cut off by the canvas edge'
    canvas.save(f'public/art/fx/flame_f{i}.png')
    frames.append(canvas)
    print(i, 'base was', round(base_x, 1), base_y, 'shift', dx, dy)

# contact sheet: the frames side by side with the anchor column and base row drawn in green
sheet = Image.new('RGB', (W * N, H), (38, 34, 46))
for i, f in enumerate(frames):
    sheet.paste(f, (i * W, 0), f)
px = sheet.load()
for i in range(N):
    for y in range(H):
        px[i * W + ANCHOR_X, y] = (0, 255, 0)
    for x in range(W):
        px[i * W + x, ANCHOR_Y] = (0, 255, 0)
sheet.save(sys.argv[1])
