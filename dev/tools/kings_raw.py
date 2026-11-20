"""Step 1 of cutting the kings (6.74, 6.75): every figure of every sheet cut at the sheet's own size
into a work folder, plus one numbered contact sheet, to decide which way each figure faces.
A "grid" sheet (two rows of two) is split into its two rows first, then each row is cut like the
four-in-a-row sheets (two cells per row).

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/kings_raw.py <work folder> [names...]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from iso31 import clean, cells
from fxcut import cut
from kings_sheets import SHEETS

WORK = sys.argv[1].rstrip('/') + '/'
os.makedirs(WORK, exist_ok=True)
only = sys.argv[2:]

def clean_keep_inside(src, out, n):
    """iso31.clean paints the floor tile white, but it also takes bits of his grey-patterned
    trousers for floor. A painted patch that does not reach the sheet's own white background is
    inside the figure: it gets its pixels back."""
    import numpy as np
    from scipy import ndimage
    clean(src, out, n=n)
    o = np.array(Image.open(src).convert('RGB')).astype(int); c = np.array(Image.open(out).convert('RGB')).astype(int)
    wiped = (c.min(-1) >= 254) & (o.min(-1) < 245)
    white = o.min(-1) >= 240
    lab, k = ndimage.label(wiped)
    if k:
        touch = np.unique(lab[ndimage.binary_dilation(white, iterations=2) & wiped]); touch = touch[touch > 0]
        inside = wiped & ~np.isin(lab, touch)
        c[inside] = o[inside]
    Image.fromarray(c.astype(np.uint8)).save(out)

def raw(name):
    """Returns the cleaned sheet (or sheets) and the four figure boxes, as [(sheet, box)]; cuts each to WORK."""
    src, layout = SHEETS[name]
    parts = []
    if layout == 'row':
        cl = WORK + name + '_clean.png'
        if not os.path.exists(cl): clean_keep_inside(src, cl, 4)
        parts = [(cl, b) for b in cells(cl, 4)]
    else:
        im = Image.open(src).convert('RGB'); w, h = im.size
        for r in range(2):
            strip = WORK + '%s_row%d.png' % (name, r)
            cl = WORK + '%s_row%d_clean.png' % (name, r)
            if not os.path.exists(cl):
                im.crop((0, r * h // 2, w, (r + 1) * h // 2)).save(strip)
                clean_keep_inside(strip, cl, 2)
            parts += [(cl, b) for b in cells(cl, 2)]
    files = []
    for i, (cl, b) in enumerate(parts):
        out = WORK + '%s_raw%d.png' % (name, i + 1)
        if not os.path.exists(out):
            cut(cl, b, out, 1.0, strokes=False, keep=0.15, floor=True)
        files.append(out)
    return parts, files

if __name__ == '__main__':
    rows = []
    for name in SHEETS:
        if only and name not in only: continue
        _, files = raw(name)
        rows.append((name, files))
        print(name, [Image.open(f).size for f in files], file=sys.stderr)
    # one contact sheet: a row per sheet, figures 1 to 4, 180 pixels tall each
    H = 190; W = 180
    sheet = Image.new('RGB', (160 + W * 4, H * len(rows)), (60, 60, 60)); d = ImageDraw.Draw(sheet)
    for r, (name, files) in enumerate(rows):
        d.text((4, r * H + 80), name, fill=(255, 255, 0))
        for i, f in enumerate(files):
            im = Image.open(f).convert('RGBA'); im.thumbnail((W - 6, H - 16))
            sheet.paste(im, (160 + i * W, r * H + 14), im); d.text((160 + i * W, r * H + 2), str(i + 1), fill=(255, 255, 255))
    sheet.save(WORK + 'raw_contact.jpg', quality=85)
