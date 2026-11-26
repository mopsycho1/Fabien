"""Takes the floor tile out of a cut figure that stands on one (Leol's and the Thief's sheets, 22 Nov; parts 6 and 7).
Their tiles are terracotta stone, close to Leol's fur and the Thief's skin, so colour alone is not enough. The tile's SHAPE:
  1. the slab is the wide part at the bottom of the cut: its left and right corners are the outermost solid pixels in the
     bottom BAND of the picture, its front corner the lowest solid pixel; the back corner follows (a diamond).
  2. its own colours are sampled at its left, right and front corners (where no figure stands), as a set of colour bins,
     plus the same hue darker (the figure's shadow on it).
  3. pixels INSIDE the diamond in those colours, joined to the diamond's edge through such pixels, go; small specks after.
Use: from detile import detile; rgba_array = detile(rgba_array)   (or run on files: detile.py [--dry out.jpg] files...)
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

BAND = 0.42
def _poly_mask(h, w, pts):
    from PIL import ImageDraw
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=1)
    return np.array(m).astype(bool)

def detile(a, band=BAND, bins=16, dark=0.45, common=120, debug=False, front=None):
    # front: clear everything under the tile's two front edges, raised by this share of the half width (26 Nov: the Thief's
    # lit edges and slab sides survived the colour rules; the figure stands ON the tile, so nothing of it is under those edges)
    # common: a colour is the tile's when it is at least 1/common of the corner samples (120 for Leol, whose sling and tail cross
    # the tile's corners; 400 for the Thief, whose tiles are more varied)
    a = a.copy(); h, w = a.shape[:2]; al = a[..., 3]; rgb = a[..., :3].astype(int)
    solid = al > 128
    top = int(h * (1 - band))
    ys, xs = np.nonzero(solid[top:]); ys = ys + top
    if not len(ys): return (a, None) if debug else a
    xl = xs.min(); yl = int(np.median(ys[xs <= xl + 1]))
    xr = xs.max(); yr = int(np.median(ys[xs >= xr - 1]))
    # an isometric tile is twice as wide as it is tall: its back and front corners follow from the side corners
    # (measuring the outline's slopes was tried: the figure's legs bend the lines, 22 Nov)
    half = (xr - xl) / 2.0; mid = (yl + yr) / 2.0
    xt = xb = (xl + xr) / 2.0; yt = mid - half / 2.0; ybt = mid + half / 2.0; xbt = xb
    th = half * 0.30                     # the slab's thickness (its side faces under the top), generous
    yb = ybt + th; yl2, yr2 = yl + th, yr + th
    pts = [(xl, yl), (xt, yt), (xr, yr), (xr, yr2), (xb, yb), (xl, yl2)]
    # nothing of the figure is under the tile's lower edges: clear that wedge and everything below (the compass plate)
    if front is not None:
        m = half * front
        under = _poly_mask(h, w, [(xl - 2, yl - m), (xbt, ybt - m), (xr + 2, yr - m), (xr + 2, h + 5), (xl - 2, h + 5)])
        under |= _poly_mask(h, w, [(-5, yl2 - half * 0.10), (xb, yb - half * 0.10), (w + 5, yr2 - half * 0.10), (w + 5, h + 5), (-5, h + 5)])
    else:
        under = _poly_mask(h, w, [(-5, yl2 - half * 0.10), (xb, yb - half * 0.10), (w + 5, yr2 - half * 0.10), (w + 5, h + 5), (-5, h + 5)])
    a[under, 3] = 0; al = a[..., 3]
    inside = _poly_mask(h, w, pts) & (al > 0)
    # sample the tile at its three outer corners
    samp = np.zeros((h, w), bool)
    r = max(4, int((xr - xl) * 0.12))
    for cx, cy in ((int(xl + r), int(yl + th / 2)), (int(xr - r), int(yr + th / 2)), (int(xb), int(ybt - r / 2))):
        samp[max(0, cy - r // 2):cy + r // 2, max(0, cx - r):cx + r] = True
    samp &= inside & solid
    px = rgb[samp]
    if len(px) < 30: return (a, None) if debug else a
    q = (px // (256 // bins)); keys, counts = np.unique(q, axis=0, return_counts=True)
    keep = keys[counts >= max(3, len(px) // common)]   # only the tile's common colours (a sling or tail crossing a corner is rarer)
    table = np.zeros((bins + 2,) * 3, bool)
    for k in keep:
        table[tuple(np.clip(k, 0, bins - 1))] = True
    qa = np.clip(rgb // (256 // bins), 0, bins - 1)
    cand = table[qa[..., 0], qa[..., 1], qa[..., 2]] & inside
    # the same hue darker: the shadow on the tile
    T = px.mean(0); Tn = T / T.sum(); s = rgb.sum(-1) + 1e-6; n = rgb / s[..., None]
    hue = np.abs(n - Tn).max(-1) < 0.02
    br = s / T.sum()
    cand |= inside & hue & (br > dark) & (br < 0.95)   # only darker than the tile (its shadow), never the figure's own colours
    # joined to the diamond's edge (or the outside)
    edge = ndimage.binary_dilation(~_poly_mask(h, w, pts) | (al <= 20), iterations=2)
    lab, k = ndimage.label(cand)
    hit = np.unique(lab[edge & cand]); hit = hit[hit > 0]
    gone = np.isin(lab, hit)
    gone = (ndimage.binary_dilation(gone, iterations=1) & inside & (al < 255)) | gone   # the soft rim
    a[gone, 3] = 0
    # the tile's lit front edges (side corners down to the front corner, and the slab's lower rim): a narrow strip along them,
    # sparing strong colours (feet, fur)
    from PIL import ImageDraw
    strip = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(strip); wid = max(3, int(half * 0.08))
    for seg in (((xl, yl), (xt, yt)), ((xt, yt), (xr, yr)), ((xl, yl), (xbt, ybt)), ((xbt, ybt), (xr, yr)), ((xl, yl2), (xb, yb)), ((xb, yb), (xr, yr2)), ((xl, yl), (xl, yl2)), ((xr, yr), (xr, yr2))):
        dr.line([tuple(map(float, seg[0])), tuple(map(float, seg[1]))], fill=1, width=wid)
    strip = np.array(strip).astype(bool)
    dull = (rgb.max(-1) - rgb.min(-1)) < 45   # tile edges are dull stone; fur, leather and cloth are stronger
    a[strip & dull, 3] = 0
    # the figure's shadow on the tile: dark and grey (his sandals are a warmer brown)
    al = a[..., 3]; sat = rgb.max(-1) - rgb.min(-1)
    shade = inside & (al > 0) & (rgb.mean(-1) < 115) & (sat < 36)
    lab, k = ndimage.label(shade)
    edge2 = ndimage.binary_dilation(al <= 20, iterations=2)
    hit = np.unique(lab[edge2 & shade]); hit = hit[hit > 0]
    a[np.isin(lab, hit), 3] = 0
    # thin lines left in the bottom band (the tile's edges): one or two pixels wide
    al = a[..., 3]; bandm = np.zeros((h, w), bool); bandm[top:] = True
    sol = al > 60
    thick = ndimage.binary_opening(sol, structure=np.ones((3, 3)))
    a[bandm & sol & ~thick, 3] = 0
    if front is not None:
        # the tile's BACK edges (side corners up to the back corner) show as lines beside and behind the feet (26 Nov): in a band
        # along them, what a wide opening wipes out (thinner than a leg) goes
        bk = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(bk); bw = max(6, int(half * 0.16))
        dr.line([(float(xl), float(yl)), (float(xt), float(yt)), (float(xr), float(yr))], fill=1, width=bw)
        bk = np.array(bk).astype(bool)
        sol = a[..., 3] > 40
        k = max(5, int(half * 0.07))
        thick = ndimage.binary_dilation(ndimage.binary_opening(sol, structure=np.ones((k, k))), iterations=1)
        a[bk & sol & ~thick, 3] = 0
        # shadows and tile bits that are not joined to the figure (a leaping Thief's shadow, a blot under the victory pose)
        sol = a[..., 3] > 100; lab, n = ndimage.label(sol)
        if n > 1:
            sizes = ndimage.sum(sol, lab, range(1, n + 1)); big = sizes.max()
            tops = ndimage.minimum(np.arange(h)[:, None].repeat(w, 1), lab, range(1, n + 1))
            for i in range(1, n + 1):
                if sizes[i - 1] < 0.25 * big and tops[i - 1] > int(h * 0.6): a[lab == i, 3] = 0
    # loose bits: tiny anywhere, or small and wholly in the bottom band (the compass plate, tile corners)
    sol = a[..., 3] > 100; lab, k = ndimage.label(sol)
    if k > 1:
        sizes = ndimage.sum(sol, lab, range(1, k + 1)); big = sizes.max()
        tops = ndimage.minimum(np.arange(h)[:, None].repeat(w, 1), lab, range(1, k + 1))
        for i in range(1, k + 1):
            if sizes[i - 1] < 0.004 * big or (sizes[i - 1] < 0.08 * big and tops[i - 1] > top): a[lab == i, 3] = 0
    return (a, gone) if debug else a

if __name__ == '__main__':
    args = sys.argv[1:]; dry = None
    if args and args[0] == '--dry': dry = args[1]; args = args[2:]
    tiles = []
    for f in args:
        a = np.array(Image.open(f).convert('RGBA'))
        out, gone = detile(a, debug=True)
        if dry:
            vis = a.copy()
            if gone is not None: vis[gone] = [255, 0, 255, 255]
            row = []
            for x in (vis, out):
                c = Image.fromarray(x); bg = Image.new('RGBA', c.size, (30, 90, 40, 255)); bg.alpha_composite(c); bg.thumbnail((300, 300)); row.append(bg)
            tiles.append(row)
        else:
            Image.fromarray(out).save(f, optimize=True)
    if dry:
        sh = Image.new('RGB', (1240, 310 * ((len(tiles) + 1) // 2)), (0, 0, 0))
        for i, (p, q) in enumerate(tiles):
            x = (i % 2) * 620; y = (i // 2) * 310
            sh.paste(p.convert('RGB'), (x, y)); sh.paste(q.convert('RGB'), (x + 305, y))
        sh.save(dry)


def slab_geometry(a):
    """The tile slab's corners read from the picture's outline (26 Nov). Suleiman's figures stand on an opaque slab on a clear
    ground: the outermost columns of the slab are its side corners, and the vertical run of solid pixels there is the slab's
    thickness; its lowest point is the front corner's bottom. Returns (xl, ylt, xr, yrt, xf, yft, yt, th) or None."""
    h, w = a.shape[:2]
    sol = a[..., 3] > 128
    lab, n = ndimage.label(sol)
    if n == 0: return None
    sizes = ndimage.sum(sol, lab, range(1, n + 1)); M = lab == (1 + int(np.argmax(sizes)))   # the plate is a separate piece
    lowhalf = np.zeros_like(M); lowhalf[h // 2:] = True
    ys, xs = np.nonzero(M & lowhalf)
    if not len(xs): return None
    # the side corners: the outermost columns that end in a slab-thick run of solid pixels, low enough down (a dagger or a
    # hand held out past the tile is thin, and higher up)
    W = xs.max() - xs.min() + 1; ylow = ys.max()
    cand = []
    for x in range(xs.min(), xs.max() + 1):
        col = np.nonzero(M[:, x])[0]
        if not len(col): continue
        b = col.max(); n = 0
        while b - n >= 0 and M[b - n, x]: n += 1
        if n >= max(4, 0.04 * W) and b >= ylow - 0.42 * W: cand.append(x)
    if len(cand) < 2: return None
    xl, xr = min(cand), max(cand)
    def run(x):   # the bottom run of solid pixels in a column (a dagger held above the corner is not counted)
        col = np.nonzero(M[:, x])[0]
        if not len(col): return (None, None)
        b = col.max(); t = b
        while t - 1 >= 0 and M[t - 1, x]: t -= 1
        return (t, b)
    lt, lb = run(min(xr, xl + 2)); rt, rb = run(max(xl, xr - 2))
    if lt is None or rt is None: return None
    th = ((lb - lt) + (rb - rt)) / 2.0
    # the front corner: where the slab's two lower edges meet. Each edge's slope is read near its side corner (the compass plate
    # can hang over the middle of the bottom edge, so the lowest pixel is not used)
    def low(x):
        col = np.nonzero(M[:, x])[0]
        return col.max() if len(col) else None
    span = max(4, int((xr - xl) * 0.15))   # (the plate can start at a fifth of the width)
    def fit(x0, x1):
        X = [x for x in range(x0, x1) if low(x) is not None]
        return np.polyfit(X, [low(x) for x in X], 1)
    aL, bL = fit(xl + 2, xl + span); aR, bR = fit(xr - span, xr - 1)
    if abs(aL - aR) < 1e-3: return None
    xf = (bR - bL) / (aL - aR); ybot = aL * xf + bL
    yft = ybot - th
    mid = (lt + rt) / 2.0
    yt = 2 * mid - yft
    return xl, lt, xr, rt, xf, yft, yt, th


def deslab(a, rim=0.05, bins=16, common=400, dark=0.45, hue=False, geom=None, colour=True):
    """Takes the whole slab out from under a figure (used for Leol and the Thief, 26 Nov):
    1. everything under the slab's top face (its side faces, the plate) goes;
    2. a rim band along the top face's four edges goes where it is thinner than a leg (the lit edges);
    3. inside the top face, the tile's own colours joined to its edge go (as in detile), then loose bits."""
    # geom: the slab read from the untouched cut (when detile has already run, the outline no longer shows it);
    # colour=False: skip step 3 (detile did the top face; its rules spare the Thief's cream trousers, 26 Nov)
    g = geom or slab_geometry(a)
    if g is None: return a
    from PIL import ImageDraw
    a = a.copy(); h, w = a.shape[:2]; rgb = a[..., :3].astype(int)
    xl, ylt, xr, yrt, xf, yft, yt, th = g
    half = (xr - xl) / 2.0; r = max(2.0, half * rim)
    top = [(xl, ylt), (xf, yt), (xr, yrt), (xf, yft)]
    # 1. under the front edges (raised by the rim): the side faces and the plate
    under = _poly_mask(h, w, [(xl - 3, ylt - r), (xf, yft - r), (xr + 3, yrt - r), (xr + 3, h + 5), (xl - 3, h + 5)])
    a[under, 3] = 0
    # 2. the rim along the back edges and the corners: thinner-than-a-leg pieces
    band = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(band)
    dr.line([tuple(map(float, p)) for p in (top[0], top[1], top[2])], fill=1, width=int(max(5, r * 2)))
    for p in (top[0], top[2]): dr.ellipse([p[0] - r * 2, p[1] - r * 2, p[0] + r * 2, p[1] + r * 2], fill=1)
    band = np.array(band).astype(bool)
    sol = a[..., 3] > 40
    k = max(4, int(half * 0.035))   # (a leg crossing the back edge is thicker; 0.07 cut knees through, 26 Nov)
    thick = ndimage.binary_dilation(ndimage.binary_opening(sol, structure=np.ones((k, k))), iterations=1)
    a[band & sol & ~thick, 3] = 0
    # 3. the top face's own colours, sampled near its left, right and front corners
    inside = _poly_mask(h, w, top) & (a[..., 3] > 0)
    samp = np.zeros((h, w), bool); s = max(4, int(half * 0.12))
    for cx, cy in ((xl + 2 * s, ylt), (xr - 2 * s, yrt), (xf, yft - s)):
        samp[max(0, int(cy) - s // 2):int(cy) + s // 2, max(0, int(cx) - s):int(cx) + s] = True
    samp &= inside
    px = rgb[samp]
    if colour and len(px) >= 30:
        q = px // (256 // bins); keys, counts = np.unique(q, axis=0, return_counts=True)
        keep = keys[counts >= max(3, len(px) // common)]
        table = np.zeros((bins + 2,) * 3, bool)
        for kk in keep: table[tuple(np.clip(kk, 0, bins - 1))] = True
        qa = np.clip(rgb // (256 // bins), 0, bins - 1)
        cand = table[qa[..., 0], qa[..., 1], qa[..., 2]] & inside
        T = px.mean(0); Tn = T / T.sum(); ss = rgb.sum(-1) + 1e-6; nn = rgb / ss[..., None]
        if hue: cand |= inside & (np.abs(nn - Tn).max(-1) < 0.02) & (ss / T.sum() > dark) & (ss / T.sum() < 1.05)   # (off by default: it took his cream trousers and sandals, 26 Nov)
        sat = rgb.max(-1) - rgb.min(-1)
        cand |= inside & (rgb.mean(-1) < 115) & (sat < 36)   # the figure's grey shadow on the tile
        edge = ndimage.binary_dilation(~_poly_mask(h, w, top) | (a[..., 3] <= 20), iterations=2)
        lab, n = ndimage.label(cand)
        hit = np.unique(lab[edge & cand]); hit = hit[hit > 0]
        gone = np.isin(lab, hit)
        gone |= ndimage.binary_dilation(gone, iterations=1) & inside & (a[..., 3] < 255)
        a[gone, 3] = 0
    # thin bits left low down, then loose pieces (not joined to the figure) in the lower part
    sol = a[..., 3] > 60
    low = np.zeros((h, w), bool); low[int(yt):] = True
    a[low & sol & ~ndimage.binary_opening(sol, structure=np.ones((3, 3))), 3] = 0
    sol = a[..., 3] > 100; lab, n = ndimage.label(sol)
    if n > 1:
        sizes = ndimage.sum(sol, lab, range(1, n + 1)); big = sizes.max()
        tops = ndimage.minimum(np.arange(h)[:, None].repeat(w, 1), lab, range(1, n + 1))
        for i in range(1, n + 1):
            # a shadow or blot lies low on the top face; a foot or a hand is never wholly in its front half
            if sizes[i - 1] < 0.004 * big or (sizes[i - 1] < 0.25 * big and tops[i - 1] > (ylt + yrt) / 2.0 + th * 0.5): a[lab == i, 3] = 0
    a[a[..., 3] <= 40, 3] = 0
    return a
