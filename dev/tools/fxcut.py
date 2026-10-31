# Cuts frames from a sheet on a white background.
# - "figure" frames (Gaha): the solid figure is found by flood-filling the white
#   from the edges (cutter.background_mask); light effect strokes (sonic rings,
#   swirls) are kept too, with "colour to alpha" from white, so they stay see-through.
# - "fx" frames: the same, for effect pictures (spear in flight, rocks and dust).
# Each frame keeps only the pieces that belong to it: the biggest solid piece and
# anything at least `keep` times its size; light strokes are kept unless they
# belong to a dropped solid piece (a neighbour's spear tip).
# Returns, for figure frames, originX = where the feet are across the picture.
import sys, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
sys.path.insert(0, sys.argv[1] if len(sys.argv) > 1 else 'tools')
from cutter import background_mask

_cache = {}
def sheet(path):
    if path not in _cache:
        im = Image.open(path).convert('RGB'); rgb = np.array(im)
        _cache[path] = (im, rgb, background_mask(rgb))
    return _cache[path]

def cut(path, box, out, scale, strokes=True, keep=0.15, floor=None, erase=(), min_alpha=0.10, gain=None):
    im, rgb, bg = sheet(path)
    x0, y0, x1, y1 = box
    a = rgb[y0:y1, x0:x1].astype(float)
    solid = ~bg[y0:y1, x0:x1]
    for ex0, ey0, ex1, ey1 in erase:
        solid[ey0 - y0:ey1 - y0, ex0 - x0:ex1 - x0] = False
        a[ey0 - y0:ey1 - y0, ex0 - x0:ex1 - x0] = 255
    # near-white holes enclosed by the figure (gaps between feathers) are background too
    pure = np.sqrt(((255 - a) ** 2).sum(-1)) < 24
    hl, hn = ndimage.label(pure & solid)
    if hn:
        hs = ndimage.sum(np.ones_like(hl), hl, range(1, hn + 1))
        solid[np.isin(hl, [i + 1 for i, v in enumerate(hs) if v >= 6])] = False
    solid = ndimage.binary_opening(solid, iterations=1)
    lab, n = ndimage.label(solid)
    keepmask = np.zeros_like(solid)
    if n:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        big = [i + 1 for i, s in enumerate(sizes) if s >= max(sizes) * keep]
        keepmask = np.isin(lab, big)
        dropped = solid & ~keepmask
    else:
        dropped = solid
    # colour to alpha from white: how far the darkest channel is from white
    c2a = (255 - a.min(-1)) / 255.0
    c2a[c2a < min_alpha] = 0
    if not strokes:
        c2a[:] = 0
    # strokes that touch a dropped piece belong to the neighbour
    grown = ndimage.binary_dilation(dropped, iterations=3)
    c2a[grown] = 0
    fig = ndimage.binary_erosion(keepmask, iterations=1).astype(float)
    if gain:  # a see-through effect: no solid parts, light strokes made a little stronger
        fig[:] = 0
        safe0 = np.maximum(c2a, 1e-3)[..., None]
        col0 = 0.5 * np.clip(255 - (255 - a) / safe0, 0, 255) + 0.5 * a  # keep some of the cream
        alpha0 = np.clip(c2a * gain, 0, 1)
        rgba = np.dstack([col0, alpha0 * 255]).astype(np.uint8)
        img = Image.fromarray(rgba, 'RGBA'); bb = img.getbbox(); img = img.crop(bb)
        if scale != 1:
            img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
        img.save(out, optimize=True)
        return 0.5, img.size
    fig = np.array(Image.fromarray((fig * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))) / 255.0
    alpha = np.maximum(fig, c2a)
    # colour: solid pixels as they are; stroke pixels un-blended from white
    safe = np.maximum(c2a, 1e-3)[..., None]
    unmix = np.clip(255 - (255 - a) / safe, 0, 255)
    w = (fig >= c2a)[..., None]
    col = np.where(w, a, unmix)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    # trim: to the figure's feet at the bottom (floor), to everything elsewhere
    bb = img.getbbox()
    if floor is not None:
        ys = np.where(keepmask.any(1))[0]
        bottom = (ys.max() + 2) if len(ys) else img.height
        bb = (bb[0], bb[1], bb[2], min(bb[3], bottom))
    img = img.crop(bb)
    km = keepmask[bb[1]:bb[3], bb[0]:bb[2]]
    if scale != 1:
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    img.save(out, optimize=True)
    # where the feet stand: middle of the solid columns in the bottom 12% of the figure
    h = km.shape[0]; band = km[int(h * 0.88):]
    cols = band.sum(0).astype(float)
    origin = float((np.arange(len(cols)) * cols).sum() / cols.sum()) / km.shape[1] if cols.sum() else 0.5
    return round(origin, 3), img.size
