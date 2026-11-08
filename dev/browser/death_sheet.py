# Puts the crops from dev/browser/death.cjs on one contact sheet: python3 dev/browser/death_sheet.py <out dir>
import sys, glob, os
from PIL import Image, ImageDraw
d = sys.argv[1]
rows = []
for name in ('fall', 'slam'):
    fs = sorted(f for f in glob.glob(d + '/%s_[0-9][0-9]_*.png' % name))
    if fs: rows.append((name, fs))
cw = 300; W = 6
sheet_h = 0; tiles = []
for name, fs in rows:
    ims = [(Image.open(f).convert('RGB'), os.path.basename(f).rsplit('_', 1)[1][:-4]) for f in fs]
    h = max(im.height * cw // im.width for im, _ in ims)
    n = (len(ims) + W - 1) // W
    tiles.append((name, ims, h, n)); sheet_h += n * (h + 16) + 24
sheet = Image.new('RGB', (cw * W, sheet_h), (24, 20, 16)); y = 0; dr = ImageDraw.Draw(sheet)
for name, ims, h, n in tiles:
    dr.text((6, y + 4), name, fill=(255, 224, 138)); y += 24
    for i, (im, t) in enumerate(ims):
        r = i // W; c = i % W
        sheet.paste(im.resize((cw, im.height * cw // im.width)), (c * cw, y + r * (h + 16) + 14))
        dr.text((c * cw + 4, y + r * (h + 16) + 1), t + ' ms', fill=(200, 200, 200))
    y += n * (h + 16)
sheet.save(d + '/death_sheet.png'); print(sheet.size)
