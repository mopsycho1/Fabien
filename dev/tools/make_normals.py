"""Makes "normal maps" (the bump pictures that let light slide over a drawing)
from Suleiman's pictures. His drawing is never touched: the normal map is a
separate picture saved next to it in public/art/normals/.

How it guesses the shape (roadmap 1.38):
  height = a little of the picture's brightness (folds, armour edges)
         + a lot of "how far from the outline" (so the body looks round)
Then the slope of that height becomes the colour: red = slope left/right,
green = slope up/down, blue = facing us. Transparent pixels stay flat.

Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_normals.py gaha_iso_stand_upRight.png ...
      ~/.fabien-tools/venv/bin/python -I dev/tools/make_normals.py --all
--all (roadmap 18.58, Graphics 2.0): every fighter picture in src/data/art.json, saved at HALF size (the light shader
stretches the normal map over the picture: it is smooth, so half is plenty, and a quarter of the bytes). A picture
whose normal map is newer than it is skipped. Then run make_webp.py for the WebP twins the game loads.
"""
import sys
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ART = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'art')
OUT = os.path.join(ART, 'normals')


def normal_map(path, strength=2.2, round_weight=0.65):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32) / 255.0
    alpha = a[..., 3]
    mask = alpha > 0.5
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])
    # brightness only counts where the drawing is (avoids a halo at the outline)
    lum = np.where(mask, lum, lum[mask].mean() if mask.any() else 0.5)
    lum = ndi.gaussian_filter(lum, 1.2)
    # roundness: distance from the outline, rooted so it rises quickly then flattens
    dist = ndi.distance_transform_edt(mask)
    dist = np.sqrt(dist / max(dist.max(), 1.0))
    dist = ndi.gaussian_filter(dist, 2.0)
    height = (1 - round_weight) * lum + round_weight * dist
    gy, gx = np.gradient(height)
    nx = -gx * strength * 10
    ny = gy * strength * 10   # image rows go down, light's "up" is the other way
    nz = np.ones_like(nx)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    rgb = np.stack([nx / n, ny / n, nz / n], axis=-1) * 0.5 + 0.5
    rgb[~mask] = [0.5, 0.5, 1.0]  # flat outside the figure
    out = np.dstack([rgb, alpha])
    return Image.fromarray((out * 255).astype(np.uint8), 'RGBA')


def fighter_pictures():
    # every picture file a fighter shows in battle (art.json), not portraits, shouts or clash art
    import json
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from ruler_lib import SKIP
    art = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'art.json')))
    files = set()

    def walk(o, top):
        if isinstance(o, dict):
            for k, v in o.items():
                if top and (k in SKIP or k.startswith('note')):
                    continue
                walk(v, False)
        elif isinstance(o, list):
            for v in o:
                walk(v, False)
        elif isinstance(o, str) and o.endswith('.png') and os.path.exists(os.path.join(ART, o)):
            files.add(o)
    for uid, e in art.items():
        if isinstance(e, dict) and uid != 'ruler':
            walk(e, True)
    return sorted(files)


if __name__ == '__main__' and sys.argv[1:2] == ['--all']:
    os.makedirs(OUT, exist_ok=True)
    made = 0
    pics = fighter_pictures()
    for name in pics:
        src, dst = os.path.join(ART, name), os.path.join(OUT, name)
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        nm = normal_map(src)
        nm = nm.resize((max(1, nm.width // 2), max(1, nm.height // 2)), Image.LANCZOS)
        nm.save(dst, optimize=True)
        made += 1
    print('normal maps:', made, 'made,', len(pics) - made, 'up to date,', len(pics), 'fighter pictures')
elif __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name in sys.argv[1:]:
        normal_map(os.path.join(ART, name)).save(os.path.join(OUT, name))
        print('normal map:', name)
