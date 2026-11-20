"""Old next to new contact sheet for the lossy WebP twins (roadmap 18.48).

  ~/.fabien-tools/venv/bin/python -I dev/tools/webp_sheet.py <out.jpg> [how many worst] [how many random]

Each row: the PNG master on black, the WebP twin on black, then the 3x zoom of the place where they
differ most (master on the left half, twin on the right half), and the numbers. Black shows glows
(the effects are drawn with ADD blending); the zoom shows the edges. Picks the worst pictures by edge
error plus a few random ones, so the sheet shows the limit and the typical case.
"""
import os, random, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from make_webp import ART, pngs, shown

out = sys.argv[1]
worst_n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
rand_n = int(sys.argv[3]) if len(sys.argv) > 3 else 6
rows = []
random.seed(11)
files = pngs()
for rel in files:
    a = Image.open(os.path.join(ART, rel)).convert('RGBA')
    b = Image.open(os.path.join(ART, rel[:-4] + '.webp')).convert('RGBA')
    pa, aa = shown(a); pb, ab = shown(b)
    d = np.abs(pa - pb).max(axis=2)
    seen = aa > 8
    if not seen.any():
        continue
    rows.append((float(np.percentile(d[seen], 99.9)), float(d[seen].mean()), rel, d))
rows.sort(key=lambda r: -r[0])
pick = rows[:worst_n] + random.sample(rows[worst_n:], rand_n)
cell = 260
sheet = Image.new('RGB', (cell * 4, (cell + 24) * len(pick)), (20, 20, 20))
dr = ImageDraw.Draw(sheet)
for i, (edge, mean, rel, d) in enumerate(pick):
    a = Image.open(os.path.join(ART, rel)).convert('RGBA')
    b = Image.open(os.path.join(ART, rel[:-4] + '.webp')).convert('RGBA')
    y0 = i * (cell + 24)
    dr.text((4, y0 + 4), '%s   edge %.0f  mean %.2f  %d KB -> %d KB' % (rel, edge, mean, os.path.getsize(os.path.join(ART, rel)) // 1024, os.path.getsize(os.path.join(ART, rel[:-4] + '.webp')) // 1024), fill=(230, 230, 230))
    for k, im in enumerate((a, b)):
        bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im)
        t = bg.convert('RGB'); t.thumbnail((cell - 4, cell - 4))
        sheet.paste(t, (k * cell + 2, y0 + 22))
    # zoom on the place that differs most: left half master, right half twin
    yy, xx = np.unravel_index(np.argmax(d), d.shape)
    r = 40
    box = (max(0, min(a.width - 2 * r, xx - r)), max(0, min(a.height - 2 * r, yy - r)))
    box = (box[0], box[1], box[0] + 2 * r, box[1] + 2 * r)
    z = Image.new('RGB', (4 * r, 2 * r), (0, 0, 0))
    for k, im in enumerate((a, b)):
        bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im)
        z.paste(bg.convert('RGB').crop(box), (k * 2 * r, 0))
    z = z.resize((cell * 2 - 8, int((cell * 2 - 8) / 2)), Image.NEAREST)
    sheet.paste(z, (2 * cell + 4, y0 + 22))
sheet.save(out, quality=88)
print('wrote', out, len(pick), 'pictures')
