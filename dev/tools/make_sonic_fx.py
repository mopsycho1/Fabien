# Gaha's Sonic Javelin flight trail (5 Nov 15:41, sheet 1126): 4 fire-streak stages on a pale floor tile.
# Cut as colour-to-alpha effects, levelled (the streak rises about 27 degrees on his sheet), same crop for
# all four so they line up, at the same pixels-per-sheet-pixel as his figures (0.397). Roadmap 6.28, 9.16.
# Run from dev/: python3 tools/make_sonic_fx.py <sheet 1126.jpg> <out dir>
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2].rstrip('/') + '/'
K = 0.397
CELLS = [(0, 60, 400, 420), (400, 60, 800, 420), (800, 60, 1200, 420), (1200, 60, 1600, 420)]
frames = []
for box in CELLS:
    im = Image.open(src).convert('RGB').crop(box).rotate(-27, resample=Image.BICUBIC, expand=True, fillcolor=(247, 247, 247))
    a = np.array(im).astype(float)
    c2a = (255 - a.min(-1)) / 255.0
    chroma = a.max(-1) - a.min(-1)
    c2a[c2a < 0.06] = 0
    c2a *= np.clip((chroma - 30) / 40.0, 0, 1)            # the pinkish floor tile goes: only properly coloured flame stays
    safe = np.maximum(c2a, 1e-3)[..., None]
    col = np.clip(255 - (255 - a) / safe, 0, 255)
    alpha = np.clip(c2a * 1.35, 0, 1)
    frames.append(np.dstack([col, alpha * 255]).astype(np.uint8))
h = max(f.shape[0] for f in frames); w = max(f.shape[1] for f in frames)
canvas = [np.zeros((h, w, 4), np.uint8) for _ in frames]
for c, f in zip(canvas, frames): c[:f.shape[0], :f.shape[1]] = f
box = None
for c in canvas:
    b = Image.fromarray(c).getbbox()
    if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
for i, c in enumerate(canvas):
    im = Image.fromarray(c).crop(box)
    im = im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS)
    im.save(out + 'sonic_trail_%d.png' % i, optimize=True)
    print(i, im.size)
