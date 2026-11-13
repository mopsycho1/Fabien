"""Cuts Suleiman's four-figure sheets (four views or four frames in a row, on
white, each with a painted floor shadow and a number under it) at full quality,
and sizes every sheet by the standing sheet: the size ruler at the source
(roadmap 18.2, 18.26; Battle 1.0 art rules, Part 4).

Used by make_archer_hq.py and make_kofi.py. Steps:
  1. raw_cut: clean the sheet (iso31.clean paints shadows and numbers white),
     split it into its four cells (iso31.cells: the cell size is found per
     sheet, so 543 pixel cells work as well as 512 or 400), cut each figure.
  2. head sizes: the ruler's head finder (ruler_lib) on every figure; a sheet's
     head size is the middle one of its four, against the standing sheet's.
  3. final cut: every sheet scaled so the head is as big as in the standing
     sheet, and the tallest standing figure is `stand_px` pixels tall.
"""
import os, sys, json
import numpy as np
from PIL import Image
from iso31 import clean, cells
from fxcut import cut
from ruler_lib import head_model, find_head

def raw_cut(src, work, name):
    """Cuts the four figures of one sheet at the sheet's own size. Returns their boxes and the cleaned sheet."""
    os.makedirs(work, exist_ok=True)
    cl = os.path.join(work, name + '_clean.png')
    if not os.path.exists(cl):
        clean(src, cl, n=4)
    boxes = cells(cl, 4)
    files = []
    for i, b in enumerate(boxes):
        out = os.path.join(work, '%s_raw%d.png' % (name, i + 1))
        if not os.path.exists(out):
            cut(cl, b, out, 1.0, strokes=False, keep=0.15, floor=True)
        files.append(out)
    return cl, boxes, files

def sheet_heads(raw, stand, head_boxes):
    """raw: { sheet name: [4 raw cut files] }. head_boxes: the head box in each raw standing figure.
    Returns { sheet name: (head size against standing, [the four readings]) }."""
    pairs = [(Image.open(f).convert('RGBA'), b) for f, b in zip(raw[stand], head_boxes)]
    model = head_model(pairs)
    ref = float(np.mean([find_head(im, model)[2] for im, _ in pairs]))
    out = {}
    for name, files in raw.items():
        got = [find_head(Image.open(f).convert('RGBA'), model) for f in files]
        vals = [h[2] / ref for h in got if h]
        out[name] = (float(np.median(vals)) if vals else 1.0, [round(v, 2) for v in vals])
    return out

def final_cut(cl, box, out, scale, keep=0.15):
    """One figure at its final size, saved small (255 colours). Returns originX (where the feet are across it).
    keep: pieces smaller than this share of the biggest piece are dropped (a weapon lying on the ground, apart
    from the body, needs a small number such as 0.02)."""
    ox, size = cut(cl, box, out, scale, strokes=False, keep=keep, floor=True)
    im = Image.open(out).convert('RGBA'); a = im.getchannel('A')
    q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(a); q.save(out, optimize=True)
    return ox
