# For limb parts: the long axis of the picture and the middle of each end
# (the joints), so the rig can hang them pivot-to-tip.
import sys, json
import numpy as np
from PIL import Image, ImageDraw
D = sys.argv[1]; names = sys.argv[3:]; out = sys.argv[2]
res = {}
tiles = []
for n in names:
    im = Image.open(D + '/' + n + '.png').convert('RGBA')
    a = np.array(im)[..., 3] > 128
    ys, xs = np.nonzero(a)
    pts = np.stack([xs, ys], 1).astype(float)
    c = pts.mean(0)
    u, s, vt = np.linalg.svd(pts - c, full_matrices=False)
    ax = vt[0]
    if ax[1] < 0: ax = -ax          # pointing down the picture
    t = (pts - c) @ ax
    lo, hi = np.percentile(t, 3), np.percentile(t, 97)
    top = pts[t < lo + (hi - lo) * 0.08].mean(0)
    bot = pts[t > hi - (hi - lo) * 0.08].mean(0)
    res[n] = {'pivot': [round(top[0]), round(top[1])], 'tip': [round(bot[0]), round(bot[1])]}
    d = ImageDraw.Draw(im)
    for p, col in ((top, (0, 255, 255, 255)), (bot, (255, 0, 255, 255))):
        d.ellipse((p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4), outline=col, width=2)
    d.line((top[0], top[1], bot[0], bot[1]), fill=(255, 255, 0, 255), width=1)
    tiles.append(im)
W = sum(t.width + 10 for t in tiles); H = max(t.height for t in tiles)
c = Image.new('RGBA', (W, H), (50, 50, 60, 255)); x = 0
for t in tiles: c.alpha_composite(t, (x, 0)); x += t.width + 10
c.convert('RGB').save(out, quality=88)
print(json.dumps(res))
