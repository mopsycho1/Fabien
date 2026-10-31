import sys, json
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]; keys = sys.argv[3:]
man = json.load(open(d + '/manifest.json'))
ims = []
for k in keys:
    p = d + '/fx/' + k[3:] + '.png' if k.startswith('fx:') else d + '/gaha_' + k + '.png'
    if k == 'stand': p = '/home/claude/fabien/public/art/gaha_stand_downRight.png'
    ims.append((k, Image.open(p).convert('RGBA')))
W = sum(i.width + 14 for _, i in ims) + 10; H = max(i.height for _, i in ims) + 40
c = Image.new('RGBA', (W, H), (74, 58, 44, 255)); dr = ImageDraw.Draw(c); x = 10
for k, im in ims:
    y = H - 10 - im.height
    c.alpha_composite(im, (x, y))
    o = man.get(k, [0.5])[0] if k != 'stand' else 0.5
    dr.line((x + im.width * o, H - 14, x + im.width * o, H - 2), fill=(255, 40, 40), width=2)
    dr.text((x, 4), k.replace('sj_', ''), fill=(255, 255, 255))
    x += im.width + 14
c.convert('RGB').save(out, quality=88)
