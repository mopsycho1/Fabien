"""The clash burst (roadmap 16.4): Suleiman's six burst stages on black (chat 1390, 12 Nov).
Cuts the tall strip into six frames, public/art/fx/clash_burst_0.png to 5, each on solid black
(the game adds it as light). The numbers 1 to 6 printed down the left side are cut away.
Then dev/tools/align_fx.py puts the six on one canvas with the bright heart in the middle
("clash_burst" in fx_anchors.json).
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_clash_burst.py <1390 picture>
      ~/.fabien-tools/venv/bin/python dev/tools/align_fx.py fix clash_burst"""
import sys, os
import numpy as np
from PIL import Image

src = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'art', 'fx')
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
bright = a.max(axis=2)
LEFT = 280                                   # the numbers sit left of this
rows = (bright[:, LEFT:] > 40).sum(axis=1)
bands = []; on = False
for y, v in enumerate(rows):
    if v > 12 and not on: on, y0 = True, y
    if v <= 12 and on:
        on = False
        if y - y0 > 20: bands.append((y0, y))
# a stage whose sparks leave a thin dark gap is still one stage: join bands less than 40 rows apart
joined = [bands[0]]
for b in bands[1:]:
    if b[0] - joined[-1][1] < 40: joined[-1] = (joined[-1][0], b[1])
    else: joined.append(b)
bands = joined
assert len(bands) == 6, 'expected six stages, found %d' % len(bands)
for i, (y0, y1) in enumerate(bands):
    top = (bands[i - 1][1] + y0) // 2 if i else max(0, y0 - 40)
    bot = (y1 + bands[i + 1][0]) // 2 if i < 5 else min(im.height, y1 + 40)
    cell = a[top:bot, LEFT:].copy()
    cell[cell.max(axis=2) < 14] = 0          # the JPEG's faint grey noise goes to true black
    cols = np.where((cell.max(axis=2) > 30).any(axis=0))[0]      # trim the empty black at the sides
    cell = cell[:, max(0, cols[0] - 12):cols[-1] + 13]
    out = Image.fromarray(cell.astype('uint8')).convert('RGBA')
    out.save(os.path.join(OUT, 'clash_burst_%d.png' % i))
    print(i, 'rows', top, bot, out.size)
