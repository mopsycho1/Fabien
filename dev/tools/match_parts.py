# Finds where each part sits in the sheet's own reference figure: the scale,
# turn and place where the part's picture best matches the reference.
# Coarse search at half size, then a fine search around the best guess.
import sys, json, os
import numpy as np, cv2
from PIL import Image
view = sys.argv[1]
D = 'rig2/' + view + '/'
meta = json.load(open(D + 'meta.json'))
STIFF = ('head', 'head_turn', 'neck', 'chest', 'chest_turn', 'belly', 'hips', 'mantle', 'skirt', 'cape')
def load(name, k=1.0):
    im = Image.open(D + name + '.png').convert('RGBA')
    if k != 1: im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    a = np.array(im).astype(np.float32)
    rgb = a[..., :3] * (a[..., 3:] / 255) + 255 * (1 - a[..., 3:] / 255)
    return rgb.astype(np.uint8), (a[..., 3] > 128).astype(np.uint8)
B = 60
def prep(k):
    r, _ = load('ref', k)
    b = int(B * k)
    return cv2.copyMakeBorder(r, b, b, b, b, cv2.BORDER_CONSTANT, value=(255, 255, 255)), b
def search(rgb, m, ref, b, scales, turns):
    best = None
    h, w = m.shape
    for s in scales:
        for th in turns:
            M = cv2.getRotationMatrix2D((w / 2, h / 2), th, s)
            cos, sin = abs(M[0, 0]), abs(M[0, 1])
            nw, nh = int(h * sin + w * cos) + 2, int(h * cos + w * sin) + 2
            if nw >= ref.shape[1] or nh >= ref.shape[0] or nw < 4 or nh < 4: continue
            M[0, 2] += nw / 2 - w / 2; M[1, 2] += nh / 2 - h / 2
            t = cv2.warpAffine(rgb, M, (nw, nh), borderValue=(255, 255, 255))
            tm = cv2.warpAffine(m * 255, M, (nw, nh), borderValue=0)
            if tm.sum() == 0: continue
            r = cv2.matchTemplate(ref, t, cv2.TM_CCOEFF_NORMED, mask=cv2.merge([tm, tm, tm]))
            r[~np.isfinite(r)] = -1
            _, v, _, loc = cv2.minMaxLoc(r)
            if best is None or v > best[0]:
                best = (float(v), float(s), th, loc[0] + nw / 2 - b, loc[1] + nh / 2 - b)
    return best
refH, bH = prep(0.5); refF, bF = prep(1.0)
path = D + 'match.json'
out = json.load(open(path)) if os.path.exists(path) else {}
for name in [n for n in meta if n not in ('ref', 'spear')]:
    if name in out: continue
    stiff = name.startswith(STIFF)
    turns = range(-15, 16, 5) if stiff else range(-60, 61, 10)
    rgbH, mH = load(name, 0.5)
    c = search(rgbH, mH, refH, bH, np.arange(0.34, 0.70, 0.04), turns)
    rgbF, mF = load(name, 1.0)
    f = search(rgbF, mF, refF, bF, np.arange(c[1] - 0.03, c[1] + 0.031, 0.01), range(c[2] - 6, c[2] + 7, 2))
    out[name] = {'score': round(f[0], 3), 'scale': round(f[1], 3), 'turn': f[2], 'cx': round(f[3], 1), 'cy': round(f[4], 1)}
    print(view, name, out[name], flush=True)
    json.dump(out, open(path, 'w'), indent=1)
