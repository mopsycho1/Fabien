# Crops a horizontal band of a sheet and draws x ticks every 25 px (labels every 100), to pick frame boxes.
import sys
from PIL import Image, ImageDraw
src, out, y0, y1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
x0 = int(sys.argv[5]) if len(sys.argv) > 5 else 0
x1 = int(sys.argv[6]) if len(sys.argv) > 6 else None
im = Image.open(src).convert('RGB')
x1 = x1 or im.width
band = im.crop((x0, y0, x1, y1))
c = Image.new('RGB', (band.width, band.height + 20), (255, 255, 255)); c.paste(band, (0, 20)); d = ImageDraw.Draw(c)
for x in range(0, band.width, 25):
    X = x + x0
    d.line((x, 20 if X % 100 else 0, x, c.height), fill=(255, 0, 0) if X % 100 == 0 else (120, 180, 255), width=1)
    if X % 100 == 0: d.text((x + 2, 2), str(X), fill=(200, 0, 0))
for y in range(0, band.height, 25):
    Y = y + y0
    d.line((0, y + 20, 8 if Y % 100 else 20, y + 20), fill=(0, 120, 0), width=2)
    if Y % 100 == 0: d.text((22, y + 14), str(Y), fill=(0, 120, 0))
c.save(out, quality=90)
