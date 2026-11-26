"""Sudeen's Ward icon (roadmap 6.93, 26 Nov): Suleiman's "Ward_ Golden Shield Triad" (email "Ward Ui and New Enchantment effect for
Rabdul's spell.7z") has a big card on the left and three small shields on the right: INACTIVE, ACTIVE and COOLDOWN, on black.
Baiyee chose (26 Nov) to use it for Sudeen's Ward, not Rabdul's Spear Ward. Cut here:
  public/art/ui/emblem_ward.png (active), emblem_ward_off.png (inactive), emblem_ward_cd.png (cooldown, kept for later): 160 square,
  the menu emblems; public/art/icons/ward.png and ward_off.png: 64 square, the status tag over him.
The black ground goes by a flood from the edges through near-black pixels (the shields' own dark insides are enclosed, so they
stay), with a soft edge. Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_ward_icon.py   (then make_webp.py)
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

B = os.path.expanduser('~/Documents/Fabien Blueprint/INBOX/2026-11-26/email/')
SRC = B + "Ward Ui and New Enchantment effect for Rabdul's spell/Ward_ Golden Shield Triad.png"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
# the three small shields on the 1672 x 941 sheet (left, top, right, bottom), read on a contact sheet; the cooldown one has its
# orange ring arc round it, kept
BOXES = {'off': (905, 360, 1125, 625), 'on': (1150, 355, 1380, 625), 'cd': (1400, 360, 1640, 625)}

def cut(box):
    im = Image.open(SRC).convert('RGB').crop(box)
    a = np.array(im).astype(int)
    dark = a.max(-1) < 26
    lab, n = ndimage.label(dark)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); edge = edge[edge > 0]
    bg = np.isin(lab, edge)
    # a soft edge: alpha rises over two pixels from the background, and faint glow keeps its brightness as alpha
    dist = ndimage.distance_transform_edt(~bg)
    alpha = np.clip(dist / 2.0, 0, 1)
    glow = np.clip((a.max(-1) - 10) / 60.0, 0, 1)
    alpha = np.where(dist < 3, np.minimum(alpha, np.maximum(glow, alpha * 0.4)), alpha)
    rgba = np.dstack([a, (alpha * 255).astype(int)]).astype(np.uint8)
    out = Image.fromarray(rgba, 'RGBA')
    bb = out.getbbox()
    if bb: out = out.crop(bb)
    # square, centred
    s = max(out.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.alpha_composite(out, ((s - out.width) // 2, (s - out.height) // 2))
    return sq

if __name__ == '__main__':
    for name, box in BOXES.items():
        sq = cut(box)
        tag = {'on': 'ward', 'off': 'ward_off', 'cd': 'ward_cd'}[name]
        sq.resize((160, 160), Image.LANCZOS).save(os.path.join(ROOT, 'public/art/ui/emblem_' + tag + '.png'), optimize=True)
        if name != 'cd': sq.resize((64, 64), Image.LANCZOS).save(os.path.join(ROOT, 'public/art/icons/' + tag + '.png'), optimize=True)
        print(tag, sq.size, file=sys.stderr)
