# His game cursor (31 Oct 09:25, roadmap 8.17): four states from the right
# column of his sheet (default, hover, click/active, busy/loading), cut and
# shrunk to cursor size. Prints each one's hot spot (the arrow's tip).
# Run from dev/:  python3 tools/cut_cursor31.py <out dir>
import sys, os, json
OUT = sys.argv[1] if len(sys.argv) > 1 else '../public/art/ui/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from fxcut import cut
from PIL import Image
import numpy as np

SRC = '/home/claude/incoming/2026-10-31-iso/092502.jpg'
# each box stops above the thin gold line that divides his column
BOXES = {'default': (970, 62, 1140, 240), 'hover': (970, 268, 1140, 458), 'press': (970, 488, 1140, 680), 'busy': (970, 706, 1140, 930)}
SIZE = 40  # pixels tall
spots = {}
for name, box in BOXES.items():
    tmp = OUT + 'cursor_' + name + '.png'
    cut(SRC, box, tmp, 1.0, strokes=True, keep=0.001 if name == 'busy' else 0.05)
    im = Image.open(tmp).convert('RGBA')
    k = SIZE / im.height
    im = im.resize((max(1, round(im.width * k)), SIZE), Image.LANCZOS)
    im.save(tmp, optimize=True)
    # the tip: the solid, stone-coloured pixel furthest up and left (not the gold rings or the glow)
    a = np.array(im).astype(int)
    rgb = a[..., :3]
    chroma = rgb.max(-1) - rgb.min(-1)
    body = (a[..., 3] > 200) & (chroma < 95)
    ys, xs = np.where(body)
    i = np.argmin(xs + ys)
    spots[name] = [int(xs[i]), int(ys[i]), im.width, im.height]
json.dump(spots, open(OUT + 'cursor.json', 'w'))
print(spots)
