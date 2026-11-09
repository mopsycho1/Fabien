# Cuts Suleiman's 8 flame frames (chat 1308, on black, roadmap 6.41) into a looping flame.
# Run: ~/.fabien-tools/venv/bin/python dev/tools/make_flame.py <1308.jpg> <out contact sheet.png>
# The picture is on pure black, so the colour-threshold route is right (not rembg): the
# alpha is the brightest channel, and the colour is divided by it so the edges stay see-through
# and glow (they add up nicely over the stone). Every frame uses the SAME crop box, cut at the
# same height, so the base of the flame does not jitter when the frames play in a loop.
import sys
import numpy as np
from PIL import Image

src = Image.open(sys.argv[1]).convert('RGB')
rgb = np.asarray(src).astype(float)
W, H = src.size
N = 8
cw = W // N                      # 200 px per frame
# the flames sit in the middle band; one box for all frames, with the base at the same row
top, bot = 120, 345
a = rgb.max(-1) / 255.0
a = np.clip((a - 0.05) / 0.95, 0, 1)             # kill JPEG noise in the black
col = np.where(a[..., None] > 0, rgb / np.maximum(a[..., None], 1e-3), 0)
col = np.clip(col, 0, 255)
out = np.dstack([col, a * 255]).astype(np.uint8)
frames = []
for i in range(N):
    f = Image.fromarray(out[top:bot, i * cw:(i + 1) * cw], 'RGBA')
    frames.append(f)
    f.save(f'public/art/fx/flame_f{i + 1}.png')
print('frame size', frames[0].size)

# contact sheet: the frames over stone-dark, over the cave blue, and small like a lamp
sheet = Image.new('RGB', (cw * N, (bot - top) * 2 + 140), (40, 36, 44))
for i, f in enumerate(frames):
    sheet.paste(Image.new('RGB', f.size, (38, 34, 46)), (i * cw, 0))
    sheet.paste(f, (i * cw, 0), f)
    sheet.paste(Image.new('RGB', f.size, (120, 110, 100)), (i * cw, bot - top))
    sheet.paste(f, (i * cw, bot - top), f)
    s = f.resize((f.width * 3 // 10, f.height * 3 // 10), Image.LANCZOS)
    sheet.paste(s, (i * cw + 70, (bot - top) * 2 + 20), s)
sheet.save(sys.argv[2])
