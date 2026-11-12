"""Kofi the shaman, first cut (roadmap 6.38; Battle 1.0 M2 and M10b, 12 Nov).

His three pose sets from Suleiman's 8 Nov sheets: standing (1250), battle-ready
(1251) and preparing a spell (1254). Each is four views on white, 1600 x 533,
cells about 400 wide. Cut through the size ruler: his standing head is found in
the other two sheets and each sheet is scaled until the heads match, so he
comes into the game at one size (for M10b, the 4 v 4 fight).

Run from dev/ with the tools Python:
    ~/.fabien-tools/venv/bin/python tools/make_kofi.py <work folder> [<chat folder>]
Writes public/art/kofi_<set>_f1..f4.png and puts him in src/data/art.json as "h4"
(pictures only: he is not in units.json until M10b).

His four spirits (1398 to 1402) are WhatsApp copies and are NOT cut here:
full-quality versions are coming by email.
"""
import sys, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage
from sheet4 import raw_cut, sheet_heads
from bgremove import rembg_rgba

WORK = sys.argv[1].rstrip('/') + '/'
CHAT = (sys.argv[2] if len(sys.argv) > 2 else '/Users/motiago/Documents/Fabien Blueprint/INBOX/2026-11-12/unzipped').rstrip('/') + '/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
STAND_PX = 300          # his tallest standing picture, in pixels (sharp enough for a computer screen)
SHEETS = {'stand': '1250', 'battle': '1251', 'cast': '1254'}
# which way each of the four figures faces: 1 and 2 are seen from behind; 3 looks to our right, 4 to our left
FACINGS = ('upLeft', 'upRight', 'downRight', 'downLeft')
# the head (hair top to chin) in each standing figure as cut at the sheet's own size: left, top, right, bottom
HEAD_BOXES = [[75, 0, 170, 85], [40, 0, 135, 85], [40, 0, 130, 90], [55, 0, 145, 90]]

# a sheet's size set by hand (1 = as measured). cast: the tool reads 1.26 on the sheet and 1.11 on the finished cut
# (his top-knot spreads the hair); 1 / 1.19 sits between and looks right on the contact sheet.
HAND = {'cast': 1 / 1.19}

def mend(im, sheet, box, original):
    """The cutter takes pure white shut inside the figure for background (right for the gaps
    between feathers, wrong for Kofi's glowing lantern and pale robe). Holes that rembg says are
    part of him get their own pixels back from the sheet."""
    a = np.array(im); solid = a[..., 3] > 128
    holes = ndimage.binary_fill_holes(solid) & ~solid
    if not holes.any():
        return im
    white = Image.new('RGBA', im.size, (255, 255, 255, 255)); white.alpha_composite(im)
    flat = np.array(white.convert('RGB'))
    subject = np.array(rembg_rgba(white.convert('RGB')))[..., 3] > 128
    fill = holes & ndimage.binary_erosion(subject, iterations=2)
    # where the cut sits inside its cell of the sheet: slide it over the cell until it fits
    cell = np.array(sheet.crop(box).convert('RGB'))
    score = cv2.matchTemplate(cell, flat, cv2.TM_SQDIFF)
    _, _, (ox, oy), _ = cv2.minMaxLoc(score)
    # the pixels come from the sheet as Suleiman sent it (the cleaned copy has white paint where his shadow was)
    a[fill, :3] = np.array(original.crop(box).convert('RGB'))[oy:oy + im.height, ox:ox + im.width][fill]
    a[fill, 3] = 255
    return Image.fromarray(a)

def feet_x(im):
    """Where the feet are across the picture (0 to 1): the middle of what touches the ground."""
    a = np.array(im)[..., 3] > 128; h = a.shape[0]
    cols = np.where(a[int(h * 0.94):].any(axis=0))[0]
    return round(float((cols[0] + cols[-1]) / 2 / a.shape[1]), 3)

cuts = {n: raw_cut(glob.glob(CHAT + '0000' + num + '-*')[0], WORK, n) for n, num in SHEETS.items()}   # (cleaned sheet, boxes, files)
raw = {n: c[2] for n, c in cuts.items()}
heads = sheet_heads(raw, 'stand', HEAD_BOXES)
base = STAND_PX / max(Image.open(f).height for f in raw['stand'])
entry = {}
for name, files in raw.items():
    head, readings = heads[name]
    fix = 1.0 if 0.92 <= head <= 1.08 else 1 / head     # within 8 percent: the same size already
    fix = HAND.get(name, fix)
    print('%s: head %.2f of standing %s, cut at %.3f' % (name, head, readings, base * fix), file=sys.stderr)
    entry[name] = {}
    for i, f in enumerate(files):
        im = mend(Image.open(f).convert('RGBA'), Image.open(cuts[name][0]), cuts[name][1][i], Image.open(glob.glob(CHAT + '0000' + SHEETS[name] + '-*')[0]))
        im = im.resize((round(im.width * base * fix), round(im.height * base * fix)), Image.LANCZOS)
        im = im.crop(im.getbbox())
        q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        q.putalpha(im.getchannel('A'))
        file = 'kofi_%s_f%d.png' % (name, i + 1)
        q.save(OUT + file, optimize=True)
        entry[name][FACINGS[i]] = {'file': file, 'originX': feet_x(im)}

path = os.path.join(ROOT, 'src', 'data', 'art.json')
art = json.load(open(path))
art['h4'] = {
    'note': 'Kofi the shaman (roadmap 6.38), the 4th hero from M10b on. Pictures only for now: he is not in units.json yet. '
            'From Suleiman\'s 8 Nov sheets: standing (1250), battle-ready (1251), preparing a spell (1254), cut by dev/tools/make_kofi.py '
            'through the size ruler (standing 300 pixels tall, every sheet scaled to his standing head). Still to come from Suleiman: '
            'walk, attack and spell release, hurt, dodge, guard, fall, down, portrait, his effects, and full-quality spirits.',
    'name': 'Kofi',
    'height': 100,
    'standing': entry['stand'],
    'battle': entry['battle'],
    'poses': {'ready': entry['battle'], 'windup': entry['cast'], 'cast': entry['cast']},
}
json.dump(art, open(path, 'w'), indent=2, ensure_ascii=False); open(path, 'a').write('\n')
print('done: 12 pictures, art.json h4', file=sys.stderr)
