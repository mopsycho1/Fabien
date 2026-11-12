"""Shared helpers for the size ruler (roadmap 18.2, Battle 1.0 milestone M2).

The ruler answers one question for every picture of a character:
"how much bigger or smaller is the body here than in the standing picture?"
It does that by finding the HEAD (the one body part that keeps its size in
every pose) and comparing it with the head of the standing picture.
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART_JSON = os.path.join(ROOT, 'src', 'data', 'art.json')
ART_DIR = os.path.join(ROOT, 'public', 'art')

def load_art():
    return json.load(open(ART_JSON))

def is_pic(v):
    """A picture is a file name, or { file, originX, flip }."""
    return isinstance(v, str) or (isinstance(v, dict) and 'file' in v)

def pic(v):
    if isinstance(v, str):
        return {'file': v, 'originX': 0.5, 'flip': False}
    return {'file': v['file'], 'originX': v.get('originX', 0.5), 'flip': bool(v.get('flip'))}

# parts of an art.json entry that are faces, banners or notes, not body pictures
SKIP = ('name', 'portrait', 'portraitHurt', 'shout', 'hurtFaces', 'clash', 'height', 'auraPainted', 'ruler', 'headTurn')

def inventory(entry):
    """Every body picture of one character, in art.json order.
    Returns a list of { set, label, file, originX, flip }.
    "set" is the group the picture belongs to (standing, poses.attack,
    moves.thrust, ...): pictures of one set were drawn together, at one size."""
    out = []
    def walk(v, path):
        if is_pic(v):
            p = pic(v)
            # the last word is the facing or the frame number; the rest names the set
            p['set'] = '.'.join(path[:-1]) if len(path) > 1 and (path[-1] in FACINGS or path[-1].isdigit()) else '.'.join(path)
            p['label'] = '.'.join(path)
            out.append(p)
        elif isinstance(v, dict):
            for k, x in v.items():
                if k.startswith('note') or k in ('frameMs', 'chargeFrames', 'strikeFrom', 'strikeTo'):
                    continue
                walk(x, path + [k] if k != 'frames' else path)
        elif isinstance(v, list):
            for i, x in enumerate(v):
                walk(x, path + [str(i)])
    for k, v in entry.items():
        if k in SKIP or k.startswith('note'):
            continue
        walk(v, [k])
    return out

FACINGS = ('upLeft', 'upRight', 'downLeft', 'downRight')

def open_art(file):
    return Image.open(os.path.join(ART_DIR, file)).convert('RGBA')

def alpha_box(im, thresh=24):
    """The box round everything that is not see-through: (left, top, right, bottom)."""
    a = np.asarray(im)[:, :, 3] > thresh
    ys = np.where(a.any(axis=1))[0]; xs = np.where(a.any(axis=0))[0]
    if not len(ys):
        return (0, 0, im.width, im.height)
    return (int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1)

# ---------------------------------------------------------------------------
# Finding the head.
# The tool learns the head's colours (hair, mostly) from the boxes drawn on the
# standing pictures (dev/tools/ruler_heads.json), then looks for the biggest
# compact patch of those colours near the top of any other picture.
# The size of that patch, against the same patch in the standing pictures, is
# how big the body is drawn there. (Laying the standing head over each picture
# and looking for the best fit was tried first; it fails, because every sheet
# paints the head a little differently.)
# ---------------------------------------------------------------------------
import re
import cv2
from scipy import ndimage

BINS = 20          # colours are sorted into 20 x 20 x 20 boxes
HEAD_AT = 0.6      # a pixel counts as "head" from this likelihood

def _bin(rgb):
    return np.minimum(rgb.astype(int) * BINS // 256, BINS - 1)

def head_model(images_and_boxes):
    """images_and_boxes: [(RGBA image, (left, top, right, bottom) of the head)].
    Returns a table: for each colour, how likely it belongs to the head."""
    pos = np.zeros((BINS,) * 3); neg = np.zeros((BINS,) * 3)
    for im, b in images_and_boxes:
        a = np.asarray(im); solid = a[:, :, 3] > 128
        inbox = np.zeros(solid.shape, bool); inbox[b[1]:b[3], b[0]:b[2]] = True
        for table, sel in ((pos, solid & inbox), (neg, solid & ~inbox)):
            c = _bin(a[:, :, :3][sel]); np.add.at(table, (c[:, 0], c[:, 1], c[:, 2]), 1)
    pos = ndimage.gaussian_filter(pos, 0.6); neg = ndimage.gaussian_filter(neg, 0.6)
    pos /= pos.sum(); neg /= neg.sum()
    return pos / (pos + neg + 1e-9)

def find_head(im, model):
    """Returns (x, y, radius) of the head in a picture, or None."""
    a = np.asarray(im); solid = a[:, :, 3] > 128
    if not solid.any():
        return None
    c = _bin(a[:, :, :3])
    likely = ndimage.uniform_filter(model[c[:, :, 0], c[:, :, 1], c[:, :, 2]] * solid, 3)
    mask = ndimage.binary_opening(likely > HEAD_AT, iterations=1)
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=2))
    rows = np.where(solid.any(axis=1))[0]; top, bottom = rows[0], rows[-1]
    best = None
    for k in range(1, n + 1):
        sel = (lab == k) & mask; area = sel.sum()
        if area < 30:
            continue
        ys, xs = np.where(sel)
        how_low = (ys.mean() - top) / max(1, bottom - top)   # 0 = top of the figure
        hull = cv2.contourArea(cv2.convexHull(np.stack([xs, ys], 1).astype(np.int32)))
        compact = area / max(hull, 1)
        # big, high up and compact wins (trousers and boots are low; a cloak is ragged)
        score = area * np.exp(-how_low / 0.35) * min(1, compact / 0.5)
        if best is None or score > best[0]:
            best = (score, float(xs.mean()), float(ys.mean()), float(np.sqrt(max(hull, area) / np.pi)))
    return best[1:] if best else None

def family(file):
    """Pictures drawn together on one sheet share a name: gaha_thrust_0..5 are
    the family gaha_thrust. One sheet is drawn at one size, so a family gets one scale."""
    return re.sub(r'_(upLeft|upRight|downLeft|downRight|f\d+|\d+|single)\.png$', '', file).replace('.png', '')
