"""Effects stay put (roadmap 18.3, Battle 1.0 milestone M3, checklist C1).

A flipbook slides when its frames are different sizes and the point that should
stay still (the foot of a flame, the middle of a ring) sits at a different place
in each. This tool is align_flame.py made general: for every family listed in
dev/tools/fx_anchors.json it finds that point in each frame and puts all the
frames on ONE same-size canvas with the point at the place the game's code
already uses for the sprite's origin. So no game code changes.

Run from the project folder with the tools Python:
    python dev/tools/align_fx.py audit                 how far each anchor moves now
    python dev/tools/align_fx.py sheet <out.jpg> [family ...]   frames laid over their anchor, to judge by eye
    python dev/tools/align_fx.py fix [family ...]      re-cut in place (safe to run twice)
    python dev/tools/align_fx.py fix --from <folder> ...   read the frames from another folder (a backup), write public/art/fx
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(HERE, '..', '..', 'public', 'art', 'fx')
CFG = json.load(open(os.path.join(HERE, 'fx_anchors.json')))['families']
LIMIT = 3.0   # percent of the frame's width (checklist C1)

def files(name, folder=FX):
    c = CFG[name]; first = c.get('first', 0); sep = c.get('sep', '_')
    return [os.path.join(folder, '%s%s%d.png' % (name, sep, first + i)) for i in range(c['frames'])]

def anchor_point(im, kind):
    """The anchor of one frame, in its own pixels (x, y)."""
    px = np.asarray(im.convert('RGBA')).astype(float)
    a = px[..., 3]
    bright = px[..., :3].max(axis=2)
    H, W = a.shape
    if (a > 250).mean() > 0.95:
        a = bright          # drawn on solid black (the game adds it as light): what counts is how bright a pixel is
    solid = a > 40
    if kind == 'core':
        # the bright heart of an orb or a burning symbol: the middle of the brightest tenth of its pixels
        lum = bright * (px[..., 3] / 255.0)
        cut = np.percentile(lum[lum > 40], 90) if (lum > 40).any() else 0
        w = np.where(lum >= cut, lum, 0.0)
        return (w.sum(0) * (np.arange(W) + 0.5)).sum() / w.sum(), (w.sum(1) * (np.arange(H) + 0.5)).sum() / w.sum()
    if not solid.any():
        return W / 2, H / 2
    ys = np.where(solid.any(axis=1))[0]; xs = np.where(solid.any(axis=0))[0]
    left, right, top, bottom = xs[0], xs[-1] + 1, ys[0], ys[-1] + 1
    if kind == 'tip':
        # a thrown spear drawn flying right, with pale shock arcs round it: the row of the shaft is the
        # heaviest row, and the tip is the last DARK pixel along it (the arcs in front are pale)
        rows = px[..., 3].sum(1)
        y = int(np.argmax(np.convolve(rows, np.ones(5) / 5, mode='same')))
        band = slice(max(0, y - 3), y + 4)
        dark = (px[band, :, 3] > 200) & (bright[band] < 185)
        cols = np.where(dark.sum(axis=0) >= 2)[0]
        return (cols[-1] + 1 if len(cols) else right), y + 0.5

    if kind == 'box':
        return (left + right) / 2, (top + bottom) / 2
    if kind == 'boxbase':
        return (left + right) / 2, bottom
    if kind == 'mass':
        t = a.sum()
        return (a.sum(0) * (np.arange(W) + 0.5)).sum() / t, (a.sum(1) * (np.arange(H) + 0.5)).sum() / t
    # base: the lowest row that holds real stuff (a quarter of the widest row), and the
    # middle of the weight in the tenth of the picture above it
    rows = a.sum(1)
    base_y = int(np.where(rows >= 0.25 * rows.max())[0].max())
    seg = a[max(0, base_y - max(6, H // 10)):base_y + 1]
    return (seg.sum(0) * (np.arange(W) + 0.5)).sum() / seg.sum(), base_y + 1

def drift(name, folder=FX):
    """How far the anchor moves across the frames, as the game draws them: (percent of width sideways,
    percent of width up and down, True if all frames are one size)."""
    c = CFG[name]; pts = []; sizes = set()
    for f in files(name, folder):
        im = Image.open(f); sizes.add(im.size)
        x, y = anchor_point(im, c['anchor'])
        # where the anchor lands on screen, measured from the sprite's origin, in picture pixels
        pts.append((x - c['originX'] * im.width, y - c['originY'] * im.height, im.width))
    w = max(p[2] for p in pts)
    dx = (max(p[0] for p in pts) - min(p[0] for p in pts)) / w * 100
    dy = (max(p[1] for p in pts) - min(p[1] for p in pts)) / w * 100
    return dx, dy, len(sizes) == 1

def cmd_audit(names):
    bad = 0
    for name in names or CFG:
        dx, dy, same = drift(name)
        ok = dx <= LIMIT and dy <= LIMIT
        bad += not ok
        print('%s %-14s %-8s sideways %5.1f%%  up and down %5.1f%%  %s' % ('PASS' if ok else 'FAIL', name, CFG[name]['anchor'], dx, dy, 'one canvas' if same else 'frames differ in size'))
    print('ALL PASSED' if not bad else 'FAILED: %d' % bad)
    return 1 if bad else 0

def cmd_fix(names, src=FX):
    for name in names or CFG:
        c = CFG[name]
        frames = [Image.open(f).convert('RGBA') for f in files(name, src)]
        pts = [anchor_point(im, c['anchor']) for im in frames]
        # room needed on each side of the anchor, over all frames
        l = max(p[0] for p in pts); r = max(im.width - p[0] for im, p in zip(frames, pts))
        t = max(p[1] for p in pts); b = max(im.height - p[1] for im, p in zip(frames, pts))
        ox, oy = c['originX'], c['originY']
        # the smallest canvas where the anchor is at (ox, oy) and every frame fits
        W = int(np.ceil(max(l / ox if ox > 0 else 0, r / (1 - ox) if ox < 1 else 0)))
        H = int(np.ceil(max(t / oy if oy > 0 else 0, b / (1 - oy) if oy < 1 else 0)))
        W += W % 2; H += H % 2
        for f, im, p in zip(files(name), frames, pts):
            # a frame drawn on solid black keeps a solid black canvas (the game adds it as light, black adds nothing)
            on_black = (np.asarray(im)[..., 3] > 250).mean() > 0.95
            canvas = Image.new('RGBA', (W, H), (0, 0, 0, 255) if on_black else (0, 0, 0, 0))
            canvas.paste(im, (int(round(ox * W - p[0])), int(round(oy * H - p[1]))))
            canvas.save(f)
        print('%-14s %d frames on one %d x %d canvas' % (name, len(frames), W, H))

def cmd_sheet(out, names, folder=FX):
    rows = []
    for name in names or CFG:
        c = CFG[name]
        frames = [Image.open(f).convert('RGBA') for f in files(name, folder)]
        k = 150 / max(max(im.width, im.height) for im in frames)
        cell = 170
        row = Image.new('RGB', (cell * (len(frames) + 1) + 150, cell), (30, 28, 34)); d = ImageDraw.Draw(row)
        ax, ay = (cell // 2, cell - 14) if c['originY'] > 0.8 else (cell // 2, cell // 2)
        over = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
        for i, im in enumerate(frames):
            s = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            pos = (int(150 + i * cell + ax - c['originX'] * s.width), int(ay - c['originY'] * s.height))
            row.paste(s, pos, s)
            x0 = 150 + i * cell + ax
            d.line((x0 - 6, ay, x0 + 6, ay), fill=(0, 255, 0)); d.line((x0, ay - 6, x0, ay + 6), fill=(0, 255, 0))
            # the measured anchor, in red
            px, py = anchor_point(im, c['anchor'])
            rx, ry = pos[0] + px * k, pos[1] + py * k
            d.ellipse((rx - 3, ry - 3, rx + 3, ry + 3), outline=(255, 60, 60))
            ghost = s.copy(); ghost.putalpha(ghost.getchannel('A').point(lambda v: v // len(frames) * 2))
            over.alpha_composite(ghost, (max(0, int(ax - c['originX'] * s.width)), max(0, int(ay - c['originY'] * s.height))))
        row.paste(over, (150 + len(frames) * cell, 0), over)
        dx, dy, _ = drift(name, folder)
        d.text((4, 6), name, fill=(255, 235, 150)); d.text((4, 24), c['anchor'], fill=(200, 200, 200))
        d.text((4, 42), 'x %.1f%%  y %.1f%%' % (dx, dy), fill=(120, 255, 120) if max(dx, dy) <= LIMIT else (255, 120, 120))
        rows.append(row)
    sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)), (0, 0, 0)); y = 0
    for r in rows:
        sheet.paste(r, (0, y)); y += r.height
    sheet.save(out, quality=85); print(out, sheet.size)

if __name__ == '__main__':
    args = sys.argv[1:]; cmd = args.pop(0) if args else ''
    src = FX
    if '--from' in args:
        i = args.index('--from'); src = args[i + 1]; del args[i:i + 2]
    if cmd == 'audit': sys.exit(cmd_audit(args))
    elif cmd == 'fix': cmd_fix(args, src)
    elif cmd == 'sheet': cmd_sheet(args[0], args[1:], src)
    else: print(__doc__)
