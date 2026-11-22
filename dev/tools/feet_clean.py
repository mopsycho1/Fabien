"""Takes the floor left under a fighter's feet out of finished pictures (roadmap 1.86, 22 Nov: Suleiman saw bits of tile under
Layra's and Gaha's feet). Their sheets stand each figure on a floor tile; the cutters (make_layra_new.wipe_floor and the kings'
wiper) take most of it away by colour but leave the tile's shadow, its pale top, its dark front edge and a faint outline.

How it works, on the bottom band of the picture only (BAND, the feet and the floor; the body above is never touched):
  1. faint pixels (alpha under FAINT) go: the tile's outline was cut out at low alpha.
  2. floor colours go where they reach the outside of the figure: grey shadow (low saturation, the sandals and skin are orange)
     and the tile's pale pink-beige top.
  3. what is left in the band must hang down from the legs: a flood from the solid pixels just above the band, through what
     is left. Bits that are not joined to the legs (the tile's front corner, loose specks) go.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/feet_clean.py [--dry <out.jpg>] <picture.png> ...
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

BAND = 0.40      # bottom part of the picture that holds the feet
FAINT = 110      # alpha under this in the band goes
RUN = 0.13       # a run of floor colour this wide (part of the picture width) is a patch, not a leg
import os
ORANGE_SAT = int(os.environ.get('ORANGE_SAT', 92))   # how strong a colour must be to count as sandal or skin (Gaha's damaged sheets: 110)
SAT_MAX = 46     # grey shadow: max minus min of the colour under this
def clean(a, band=BAND):
    a = a.copy(); h, w = a.shape[:2]; top = int(h * (1 - band))
    rgb = a[..., :3].astype(int); al = a[..., 3].astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    inband = np.zeros((h, w), bool); inband[top:] = True
    # 1. faint
    gone = inband & (al > 0) & (al < FAINT)
    # 2. floor colours that reach the outside
    sat = rgb.max(-1) - rgb.min(-1)
    orange = (r - b > 55) & (r > 90) & (sat >= ORANGE_SAT)   # sandals and skin: strong colour (a light brown shadow is weaker)
    dark = rgb.mean(-1) < 48                          # a boot in deep shade (Gaha's back foot) is never floor; shadows are lighter
    grey = (sat < SAT_MAX) & ~orange & ~dark
    pale = (r > 165) & (g > 115) & (b > 80) & (r - g < 70) & (g - b < 55)   # the tile's top face (pink beige)
    soft = (rgb.mean(-1) < 175) & (sat < ORANGE_SAT) & ~orange & ~dark   # Gaha's tile shadow, a light warm brown
    dull = (rgb.mean(-1) < 125) & (r - b < 60) & (sat < 70) & ~dark                   # a warm brown shadow (Gaha's tile)
    floor = inband & (al > 0) & (grey | pale | dull | soft) & ~gone
    # the floor lies at the feet, never above them: in a column with sandal (orange, solid) in the band, only what is below
    # the sandal's top can be floor; in other columns only what is below the soles (Layra's shadow is the grey of her trousers)
    sandal = orange & (al >= 200); sandal[:int(h * 0.76)] = False   # the feet are in the bottom quarter (Layra's cape is orange too)
    # and joined to the legs (the tile's warm edges are orange too, but they are joined only through floor colours)
    body = (al >= 200) & ~(grey | pale | dull | soft) | sandal
    body[:int(h * 0.76)] = al[:int(h * 0.76)] >= 200   # above the feet everything is the figure (her grey trousers too)
    blab, bn = ndimage.label(body)
    legs = np.unique(blab[:int(h * 0.70)]); legs = legs[legs > 0]
    sandal &= np.isin(blab, legs)
    ys, xs = np.nonzero(sandal)
    if len(ys):
        mid = int(np.percentile(ys, 80))   # near the soles: her shaded back leg (no orange) stays
        lim = np.full(w, mid)
        cols = np.unique(xs); tops = np.array([ys[xs == x].min() for x in cols])
        # between the feet the line runs from one sandal top to the other; outside them, the soles
        inside = (np.arange(w) > cols.min()) & (np.arange(w) < cols.max())
        lim[inside] = np.interp(np.arange(w)[inside], cols, tops).astype(int)
        lim[cols] = tops
        rows = np.arange(h)[:, None]
        floor &= rows >= lim[None, :]
    # a wide flat patch of floor colour (wider than a leg) in the feet rows is floor even above the line, except straight
    # above a sandal (the leg); the shadow between the feet is the grey of Layra's trousers, but it lies flat and wide
    cand = inband & (al > 0) & (grey | pale | dull | soft) & ~gone
    if len(ys):
        feet_top = int(np.percentile(ys, 5))
        wide = np.zeros_like(cand)
        for y in range(max(top, feet_top - int(h * 0.04)), h):
            row = cand[y]; x = 0
            while x < w:
                if row[x]:
                    e = x
                    while e < w and row[e]: e += 1
                    if e - x >= RUN * w: wide[y, x:e] = True
                    x = e
                else: x += 1
        legcols = ndimage.binary_dilation(np.isin(np.arange(w), cols), iterations=2)
        wide &= ~(legcols[None, :] & (np.arange(h)[:, None] < lim[None, :]))
        floor |= wide
    lab, n = ndimage.label(floor)
    outside = ndimage.binary_dilation((al <= 20) | gone, iterations=2)
    hit = np.unique(lab[outside & floor]); hit = hit[hit > 0]
    gone |= np.isin(lab, hit)
    # thin lines (the tile's edges, one or two pixels wide) that are not sandal
    left = inband & (al >= FAINT) & ~gone
    thick = ndimage.binary_opening(left, structure=np.ones((3, 3)))
    gone |= left & ~thick & ~orange
    # 3. keep only what hangs from the legs
    solid = (al >= FAINT) & ~gone
    seed = np.zeros_like(solid); seed[max(0, top - 3):top + 1] = solid[max(0, top - 3):top + 1]
    lab, n = ndimage.label(solid)
    ids = np.unique(lab[seed]); ids = ids[ids > 0]
    keep = np.isin(lab, ids) if len(ids) else solid
    gone |= inband & (al > 0) & ~keep
    a[gone, 3] = 0
    return a, gone

if __name__ == '__main__':
    args = sys.argv[1:]; dry = None
    if args and args[0] == '--dry': dry = args[1]; args = args[2:]
    tiles = []
    for f in args:
        a = np.array(Image.open(f).convert('RGBA'))
        out, gone = clean(a)
        if dry:
            h = a.shape[0]; t = int(h * 0.5)
            vis = a.copy(); vis[gone] = [255, 0, 255, 255]
            row = []
            for x in (vis, out):
                c = Image.fromarray(x[t:]); bg = Image.new('RGBA', c.size, (30, 90, 40, 255)); bg.alpha_composite(c)
                row.append(bg.resize((c.width * 3, c.height * 3), Image.NEAREST))
            tiles.append(row)
        else:
            im = Image.fromarray(out); im = im.crop(im.getbbox()) if False else im   # keep the canvas: anchors and the ruler stay
            im.save(f, optimize=True)
            print('cleaned %-40s %d pixels' % (f.split('/')[-1], int(gone.sum())))
    if dry:
        W = max(r[0].width for r in tiles) * 2 + 10; H = sum(r[0].height + 6 for r in tiles)
        cols = 2; colH = (H + 1) // 2 + 200
        sh = Image.new('RGB', (W * cols, colH), (0, 0, 0)); x = y = 0
        for r in tiles:
            if y + r[0].height > colH: x += W; y = 0
            sh.paste(r[0].convert('RGB'), (x, y)); sh.paste(r[1].convert('RGB'), (x + r[0].width + 10, y)); y += r[0].height + 6
        sh.save(dry)
