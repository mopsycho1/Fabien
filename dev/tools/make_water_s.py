"""Suleiman's own waterfall (roadmap 1.48; his GIF of 13 Nov, "Animated Waterfall Stream Frames.gif":
6 frames on black, 508 by 508, a column of falling water with a splash at its foot).
Makes two strips of 6 frames in public/art/fx:
  waterfall_s_tall.png  for a drop of two levels or more
  waterfall_s.png       for a drop of one level
His column is five times as tall as it is wide, and our drops are short (a two-level drop is
about twice as tall as the stream is wide). Squeezing the whole column into that would crush
his brush strokes, so each frame is the TOP of his column (as long as the drop needs, at his
own scale) with his splash from the BOTTOM joined on under it, faded together over 24 rows.
Black becomes see-through: how bright a pixel is becomes how solid it is.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_water_s.py [<the gif>]"""
import sys, os
from PIL import Image
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Documents/Fabien Blueprint/INBOX/2026-11-13b/email/Animated Waterfall Stream Frames.gif')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'art', 'fx')
X0, X1 = 190, 318   # the column, with its spray, across his picture
FOOT = 72           # the last rows: the splash
JOIN = 24           # rows over which the body fades into the splash
BODY = {'waterfall_s_tall': 150, 'waterfall_s': 58}  # rows of falling water above the splash

gif = Image.open(SRC)
frames = []
for i in range(gif.n_frames):
    gif.seek(i)
    frames.append(np.asarray(gif.convert('RGB'), dtype=np.float32)[:, X0:X1, :])
H = frames[0].shape[0]
bottom = max(int(np.where(f.max(axis=(1, 2)) > 40)[0].max()) for f in frames) + 1  # the last painted row
for name, body in BODY.items():
    cells = []
    for f in frames:
        top = f[:body + JOIN]
        foot = f[bottom - FOOT - JOIN:bottom]
        ramp = np.linspace(0, 1, JOIN, dtype=np.float32)[:, None, None]
        join = top[body:] * (1 - ramp) + foot[:JOIN] * ramp
        rgb = np.concatenate([top[:body], join, foot[JOIN:]], axis=0)
        # the very top row of his column is cut square by the picture edge: fade the first rows in
        lum = rgb.max(axis=2) / 255.0
        alpha = np.clip(lum * 1.7, 0, 1) ** 0.85
        alpha[:6] *= np.linspace(0.35, 1, 6, dtype=np.float32)[:, None]
        colour = np.clip(rgb / np.maximum(lum, 0.25)[:, :, None], 0, 255)  # un-darken: the alpha carries the darkness now
        cells.append(np.dstack([colour, alpha * 255]).astype(np.uint8))
    h, w = cells[0].shape[:2]
    strip = Image.new('RGBA', (w * len(cells), h), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(Image.fromarray(c, 'RGBA'), (i * w, 0))
    strip.save(os.path.join(OUT, name + '.png'), optimize=True)
    print(name, len(cells), 'frames of', (w, h), '| lip x', round(w / 2 - 1), '| fall height', h - 16)
