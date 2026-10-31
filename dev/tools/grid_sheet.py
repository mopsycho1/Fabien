# Lays parts side by side with a grid (every 10px, labelled every 20px) at a zoom, to read joint coordinates.
import sys
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]; z = float(sys.argv[3]); names = sys.argv[4:]
imgs = [Image.open(f'{d}/{n}.png').convert('RGBA') for n in names]
imgs = [i.resize((int(i.width * z), int(i.height * z)), Image.LANCZOS) for i in imgs]
W = sum(i.width + 50 for i in imgs) + 10; H = max(i.height for i in imgs) + 60
c = Image.new('RGBA', (W, H), (40, 40, 48, 255)); dr = ImageDraw.Draw(c); x = 30
for n, im in zip(names, imgs):
    c.alpha_composite(im, (x, 40))
    w0, h0 = im.width / z, im.height / z
    for g in range(0, int(w0) + 1, 10):
        col = (255, 255, 0, 255) if g % 50 == 0 else (120, 220, 255, 255)
        dr.line((x + g * z, 40, x + g * z, 40 + im.height), fill=col if g % 50 == 0 else (90, 160, 200), width=1)
        if g % 20 == 0: dr.text((x + g * z - 6, 28), str(g), fill=col)
    for g in range(0, int(h0) + 1, 10):
        col = (255, 255, 0, 255) if g % 50 == 0 else (120, 220, 255, 255)
        dr.line((x, 40 + g * z, x + im.width, 40 + g * z), fill=col if g % 50 == 0 else (90, 160, 200), width=1)
        if g % 20 == 0: dr.text((x - 26, 40 + g * z - 5), str(g), fill=col)
    dr.text((x, 8), n, fill=(255, 255, 255)); x += im.width + 50
c.convert('RGB').save(out, quality=92)
