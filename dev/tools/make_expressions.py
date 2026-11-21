"""Expression sheets, 21 Nov (roadmap 6.87): Alagara and Gadara (five heads, front row used; the lower row is the same
faces in profile), Leol (five) and the Thief (fifteen). Each head is a framed panel on a parchment card: its box is set
by hand below (looked at on the sheet, in the sheet's own pixels, just inside the frame and above the word label),
the parchment goes (rembg), the head is trimmed to its edge and sized about 160 pixels wide like the other faces.

Wired: the kings' calm face (portrait: Neutral), hurt face (portraitHurt: Hurt) and battle cry (shout: Angry); they
replace the stand-ins cut from their standing pictures (10.36). Leol and the Thief are not in the game yet (Phase 19):
their faces are cut to public/art and listed in art.json "unwired" notes only when they join.

Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_expressions.py
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from bgremove import rembg_rgba

SRC = os.path.expanduser('~/Documents/Fabien Blueprint/INBOX/2026-11-21/email/unzipped/Character expression sheets/Character expression sheets/')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PUB = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
WIDE = 160

def row(x_edges, y0, y1, names, pad=6):
    return {n: (x_edges[i] + pad, y0, x_edges[i + 1] - pad, y1) for i, n in enumerate(names)}

FIVE = ['neutral', 'smiling', 'hurt', 'angry', 'weakened']
# sheet file, prefix, {name: (left, top, right, bottom)} in the sheet's pixels
SHEETS = [
    ('Alagara Expression Profile Sheet.png', 'alagara_face',
     row([23, 367, 713, 1059, 1406, 1755], 84, 488, FIVE)),
    ('Gadara Warrior Expression Profile.png', 'gadara_face',
     row([23, 367, 713, 1059, 1406, 1755], 60, 488, FIVE)),
    ("Leol’s Lion Warrior Expression Sheet.png", 'leol_face', {
        'neutral': (31, 12, 492, 476), 'smiling': (497, 12, 958, 476), 'hurt': (958, 12, 1428, 476),
        'angry': (93, 525, 662, 990), 'weakened': (703, 525, 1272, 990)}),
    ("The Thief’s Expression Sheet.png", 'thief_face', {
        **row([400, 623, 850, 1066, 1293, 1520], 62, 316, ['neutral', 'curious', 'wary', 'alert', 'surprised'], 8),
        **row([400, 623, 850, 1066, 1293, 1520], 366, 618, ['confident', 'amused', 'enthusiastic', 'angry', 'defiant'], 8),
        **row([400, 623, 850, 1066, 1293, 1520], 670, 932, ['thinking', 'concerned', 'hurt', 'exhausted', 'victorious'], 8)}),
]

def cut(sheet, box, out):
    crop = sheet.crop(box)
    rgba = rembg_rgba(crop)
    al = np.array(rgba.getchannel('A'))
    ys, xs = np.nonzero(al > 128)
    rgba = rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = WIDE / rgba.width
    rgba = rgba.resize((WIDE, round(rgba.height * k)), Image.LANCZOS)
    q = rgba.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(rgba.getchannel('A'))
    q.save(out, optimize=True)
    return q.size

if __name__ == '__main__':
    only = sys.argv[1:]
    for f, prefix, boxes in SHEETS:
        if only and prefix.split('_')[0] not in only: continue
        sheet = Image.open(SRC + f).convert('RGB')
        for name, box in boxes.items():
            out = '%s_%s.png' % (prefix, name)
            print(out, cut(sheet, box, PUB + out), file=sys.stderr)
    art = json.load(open(ART))
    for cid, p in (('h5', 'alagara_face'), ('e5', 'gadara_face')):
        e = art[cid]
        e['portrait'] = p + '_neutral.png'; e['portraitHurt'] = p + '_hurt.png'; e['shout'] = p + '_angry.png'
        e['note_expressions'] = ('21 Nov expression sheet (6.87, dev/tools/make_expressions.py): Neutral is the portrait, Hurt the hurt '
                                 'face, Angry the battle cry (shout). Smiling and Weakened are cut too (%s_smiling.png, '
                                 '%s_weakened.png) for mood faces later. They replace the stand-ins of 10.36.') % (p, p)
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json: h5 and e5 faces', file=sys.stderr)
