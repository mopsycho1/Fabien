# helpers: cut a list of parts and make a labelled preview
import sys, json; sys.path.insert(0, 'tools')
from cutter import cut
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

def hair(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    a = im[..., 3] > 128; lum = im[..., 0] * 0.3 + im[..., 1] * 0.59 + im[..., 2] * 0.11
    dark = a & (lum < 50) & (np.abs(im[..., 0] - im[..., 2]) < 45)
    lab, n = ndimage.label(ndimage.binary_closing(dark, iterations=3))
    if n == 0: return 0
    sizes = ndimage.sum(dark, lab, range(1, n + 1)); objs = ndimage.find_objects(lab)
    c = [(s, o) for s, o in zip(sizes, objs) if o[0].start < a.shape[0] * 0.4]
    return round(float(max(c, key=lambda t: t[0])[0]) ** 0.5, 1) if c else 0

def make(prefix, parts, out, preview, measure=True, keep=0.15):
    man = {}
    for k, part in parts.items():
        src, box, scale, flip = part[:4]
        erase = part[4] if len(part) > 4 else ()
        man[k] = cut(src, box, out + prefix + '_' + k + '.png', scale=scale, flip=flip, keep=keep, erase=erase)
    tiles = [(k, Image.open(out + prefix + '_' + k + '.png')) for k in man]
    W = 1900; x = 10; y = 30; rowh = 0
    bg = Image.new('RGBA', (W, 2400), (40, 30, 22, 255)); d = ImageDraw.Draw(bg)
    for k, t in tiles:
        if x + t.width > W - 10: x = 10; y += rowh + 30; rowh = 0
        bg.alpha_composite(t, (x, y)); d.text((x, y - 14), k + (' h%s' % hair(out + prefix + '_' + k + '.png') if measure else ''), fill='white')
        ox = x + t.width * man[k]; d.line([(ox, y + t.height - 4), (ox, y + t.height + 6)], fill='red', width=2)
        x += t.width + 16; rowh = max(rowh, t.height)
    bg.crop((0, 0, W, y + rowh + 10)).save(preview)
    json.dump(man, open(out + 'manifest.json', 'w'), indent=1)
    return man
