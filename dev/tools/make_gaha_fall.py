# 11 Nov: Gaha's fall set (ART2, roadmap 18.18 and 18.1), from Suleiman's sheet 1350.
# The sheet is one row of four cells: (1) Gaha standing, the ruler; (2) in the air, thrown
# back; (3) landed on hands and knees; (4) pushing up to stand. One view (facing down-right).
# Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_gaha_fall.py <sheet.jpg> <out dir>
# How it works:
#   - rembg takes the white page away (dev/tools/bgremove.py)
#   - the grey painted floor shadow is wiped (grey, mid-bright pixels in the lower part)
#   - small loose bits are dropped
#   - every cell is shrunk by ONE number: his standing picture in the game (200 pixels tall)
#     divided by the ruler figure's height on this sheet, so he is the same size as always
# It prints each picture's size and "originX" (where his weight sits, across the picture)
# for art.json.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
import numpy as np
from scipy import ndimage
from bgremove import rembg_rgba

SRC, OUT = sys.argv[1], sys.argv[2].rstrip('/') + '/'
GAME_STAND = 200           # height of public/art/gaha_iso_stand_downRight.png
NAMES = ['ruler', 'gaha_fall_air', 'gaha_fall_land', 'gaha_fall_rise']
os.makedirs(OUT, exist_ok=True)

def clean(cell):
    arr = np.array(rembg_rgba(cell)).astype(int)
    rgb = arr[..., :3]
    chroma = rgb.max(-1) - rgb.min(-1)
    lum = rgb.mean(-1)
    # the floor shadow: grey (hardly any colour), neither dark nor white
    shadow = (chroma < 26) & (lum > 120) & (lum < 236)
    arr[shadow, 3] = 0
    arr[arr[..., 3] < 60, 3] = 0
    # keep the big pieces only (the figure and his spear), drop specks and shadow crumbs
    lab, n = ndimage.label(ndimage.binary_dilation(arr[..., 3] > 0, iterations=2))
    if n > 1:
        sizes = ndimage.sum(arr[..., 3] > 0, lab, range(1, n + 1))
        keep = [i + 1 for i, v in enumerate(sizes) if v > 0.05 * sizes.max()]
        arr[~np.isin(lab, keep), 3] = 0
    im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    return im.crop(im.getbbox())

sheet = Image.open(SRC).convert('RGB')
w, h = sheet.size
cut = [clean(sheet.crop((i * w // 4, 0, (i + 1) * w // 4, h))) for i in range(4)]
scale = GAME_STAND / cut[0].height
print('ruler figure', cut[0].height, 'px tall on the sheet, scale', round(scale, 4))
for name, im in zip(NAMES, cut):
    small = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    a = np.array(small.getchannel('A')) > 40
    # where his weight sits: the middle of the lowest fifth of the picture (feet, knees, hands)
    cols = np.where(a[int(small.height * 0.8):].any(0))[0]
    origin = round(float((cols.min() + cols.max()) / 2 / small.width), 3)
    alpha = small.getchannel('A')
    q = small.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(alpha)
    q.save(OUT + name + '.png', optimize=True)
    print(name, q.size, 'originX', origin)
