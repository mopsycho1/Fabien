"""Kofi's four spirits at full quality (Suleiman, 15 Nov email "Spirit Sprite sheets.7z"; roadmap 6.38,
6.39 Call Spirit). CUT ONLY: nothing in the game summons them yet (Call Spirit comes later), but they
sit in art.json as sp_ember, sp_tide, sp_stone and sp_gale so the size ruler and the contact sheets cover them.

The four sheets (each 2172 by 724, four cells of 543, the spirit turning round on a flat tan floor diamond, white ground):
  Spirit Flame Turntable Sheet.png               -> sp_ember  (Flame)
  Tide Spirit Rotation Concept Sheet.png         -> sp_tide
  Battle-Ready Rock Golem Turnaround.png         -> sp_stone  (Earth)
  Wind Spirit Concept Turnaround.png             -> sp_gale   (Gale)
They are the WhatsApp 1398 to 1402 designs again at 543 pixel cells (the old ones were 400, soft).

How a picture is made:
  1. the floor diamond (flat tan, low in the cell) is found and painted white; its middle is where the spirit "stands";
  2. rembg takes the white ground off (colour cutting loses the pale wind wisps);
  3. one scale for all sixteen (SCALE: Kofi's casting sheets are 640 pixels tall on their sheet and come out at 300 in
     the game, so 0.455 puts a spirit about three quarters of his height; a floating spirit is smaller than a man);
  4. the picture is cut from the top of the spirit down to the diamond's middle, so the bottom edge of the picture is
     the ground and the spirit hovers above it by the gap it has on the sheet. originX is the diamond's middle.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_spirits.py <work folder> [<sheet folder>]
then  ruler.py measure sp_  and  ruler.py audit.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage
from bgremove import rembg_rgba

WORK = sys.argv[1].rstrip('/') + '/'
SRC = (sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/Documents/Fabien Blueprint/INBOX/2026-11-15/Email/spirits_and_kofi_zip/Spirit Sprite sheets/Spirit Sprite sheets")).rstrip('/') + '/'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
PUB = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
os.makedirs(WORK, exist_ok=True)

SCALE = 0.455
SHEETS = {  # id: (sheet, the name in the picture files)
    'sp_ember': ('Spirit Flame Turntable Sheet.png', 'ember'),
    'sp_tide': ('Tide Spirit Rotation Concept Sheet.png', 'tide'),
    'sp_stone': ('Battle-Ready Rock Golem Turnaround.png', 'stone'),
    'sp_gale': ('Wind Spirit Concept Turnaround.png', 'gale'),
}

def diamond(cell):
    """The floor diamond: flat tan in the lower part of the cell. Returns (mask, middle x, middle y)."""
    a = np.array(cell).astype(int); H, W = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    tan = (r > 185) & (r < 238) & (r - b > 14) & (r - b < 60) & (g > 160) & (np.abs((r - g) - 22) < 22)
    tan[: int(H * 0.72)] = False
    lab, n = ndimage.label(ndimage.binary_closing(tan, iterations=2))
    sizes = ndimage.sum(tan, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    m = ndimage.binary_dilation(lab == k, iterations=4)
    ys, xs = np.nonzero(lab == k)
    return m, float(xs.mean()), float(ys.mean())

def main():
    art = json.load(open(ART))
    for sid, (fn, nm) in SHEETS.items():
        sheet = Image.open(SRC + fn).convert('RGB')
        cw = sheet.width // 4
        files = {}
        for i in range(4):
            cell = sheet.crop((i * cw, 0, (i + 1) * cw, sheet.height))
            m, dx, dy = diamond(cell)
            a = np.array(cell); a[m] = 255
            rgba = rembg_rgba(Image.fromarray(a))
            al = np.array(rgba.getchannel('A')) > 24
            ys, xs = np.nonzero(al)
            top, left, right = ys.min(), xs.min(), xs.max() + 1
            # from the top of the spirit to the diamond's middle; wide enough for the spirit and for the middle
            x0 = int(min(left, dx - 4)); x1 = int(max(right, dx + 4))
            h = int(round(dy)) - top
            canvas = Image.new('RGBA', (x1 - x0, h), (0, 0, 0, 0))
            keep = rgba.crop((x0, top, x1, min(int(round(dy)), ys.max() + 1)))
            canvas.paste(keep, (0, 0))
            ox = (dx - x0) / canvas.width
            out = canvas.resize((round(canvas.width * SCALE), round(canvas.height * SCALE)), Image.LANCZOS)
            q = out.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
            q.putalpha(out.getchannel('A'))
            f = '%s_f%d.png' % (sid, i + 1)
            q.save(PUB + f, optimize=True)
            files[i + 1] = {'file': f, 'originX': round(ox, 3)}
            print(sid, i + 1, q.size, 'gap under spirit', round((dy - ys.max()) * SCALE), 'px', 'originX', round(ox, 3))
        # the turntable's four cells; which way each faces is for Call Spirit to settle (see the note)
        art[sid] = {
            'name': {'sp_ember': 'Ember Spirit', 'sp_tide': 'Tide Spirit', 'sp_stone': 'Stone Spirit', 'sp_gale': 'Gale Spirit'}[sid],
            'height': 80,
            'unwired': True,
            'note': "One of Kofi's four spirits (roadmap 6.38, 6.39), Suleiman's 15 Nov full-quality sheet, cut by dev/tools/make_spirits.py. CUT ONLY: nothing summons it yet (Call Spirit comes later), so \"unwired\" keeps the game from loading its pictures (src/art.js preloadArt); take that line out when Call Spirit is built. The sheet is a turntable of four cells; by eye: cells 1 and 3 show the mask (the front), 2 and 4 are from behind with the mask edge on the right (2) and on the left (4), so they are wired as downLeft, upRight, downRight, upLeft. Check the turn again when Call Spirit is built. The picture ends at the middle of the floor diamond, so the bottom edge is the ground and the spirit hovers by its own gap.",
            'standing': {'downLeft': files[1], 'upRight': files[2], 'downRight': files[3], 'upLeft': files[4]},
        }
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False)

main()
