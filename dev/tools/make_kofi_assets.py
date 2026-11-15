"""Kofi's missing assets (Suleiman, 15 Nov email "Kofi's missing assets.7z"; roadmap 6.38, 17.12).

Two pictures:
  "Kofi's clash sheet.png" (1672 by 941): his clash banner. Cut by cut_banners31.py (the same
      cutter as every other fighter's banner: panel out, cream paper see-through, back edge faded,
      name plate patch for the flipped side). Run with CREAM_CHROMA=60 (his paper is peachy).
  "Kofi's Ten Expressions Character Sheet.png" (1536 by 1024): ten heads on white, five a row:
      neutral, determined, worried, surprised, joyful / angry, hurt, exhausted, fearful, defeated.
      The white goes (rembg), each head is cut to its edge and sized like the other faces (about 160
      pixels wide). Wired: neutral = portrait, angry = shout (the cut-in cry), hurt = portraitHurt.
      The other seven are cut too (public/art/kofi_face_<name>.png) for mood faces later; they are
      not named in art.json, so the game does not load them.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_kofi_assets.py <work folder> [<sheet folder>]
"""
import sys, os, json, subprocess, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage
from bgremove import rembg_rgba

WORK = sys.argv[1].rstrip('/') + '/'
SRC = (sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/Documents/Fabien Blueprint/INBOX/2026-11-15/Email/Kofi's missing assets/Kofi's missing assets")).rstrip('/') + '/'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
PUB = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
os.makedirs(WORK, exist_ok=True)

# ---- the ten heads ----
NAMES = [['neutral', 'determined', 'worried', 'surprised', 'joyful'],
         ['angry', 'hurt', 'exhausted', 'fearful', 'defeated']]
FACE_SCALE = 0.55  # 289 pixel heads on the sheet become about 159 pixels wide, like the other faces
sheet = Image.open(SRC + 'Kofi’s Ten Expressions Character Sheet.png').convert('RGB')
a = np.array(sheet).astype(int)
lab, n = ndimage.label(ndimage.binary_closing(a.min(-1) < 235, iterations=6))
boxes = []
for o in ndimage.find_objects(lab):
    h = o[0].stop - o[0].start; w = o[1].stop - o[1].start
    if w > 250 and h > 300:  # a head (the word labels under them are thin)
        boxes.append((o[1].start, o[0].start, o[1].stop, o[0].stop))
assert len(boxes) == 10, len(boxes)
boxes.sort(key=lambda b: (0 if b[1] < 300 else 1, b[0]))
for i, b in enumerate(boxes):
    name = NAMES[i // 5][i % 5]
    crop = sheet.crop((b[0] - 8, b[1] - 8, b[2] + 8, b[3] + 8))
    rgba = rembg_rgba(crop)
    # trim to the head and shoulders
    ys, xs = np.nonzero(np.array(rgba.getchannel('A')) > 128)
    rgba = rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    rgba = rgba.resize((round(rgba.width * FACE_SCALE), round(rgba.height * FACE_SCALE)), Image.LANCZOS)
    f = 'kofi_face.png' if name == 'neutral' else 'kofi_face_%s.png' % name
    q = rgba.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(rgba.getchannel('A'))
    q.save(PUB + f, optimize=True)
    print(name, f, q.size)

# ---- the clash banner ----
env = dict(os.environ, CLASH_SRC='kofi=' + SRC + "Kofi's clash sheet.png", CREAM_CHROMA='60')
subprocess.check_call([sys.executable, '-I', os.path.join(HERE, 'cut_banners31.py'), WORK + 'clash/'], env=env)
os.makedirs(PUB + 'clash', exist_ok=True)
for f in ('kofi_clash.webp', 'kofi_clash_name.webp'):
    shutil.copy(WORK + 'clash/' + f, PUB + 'clash/' + f)
cm = json.load(open(WORK + 'clash/manifest.json'))['kofi']

# ---- wire it ----
art = json.load(open(ART))
k = art['h4']
k['portrait'] = 'kofi_face.png'
k['shout'] = 'kofi_face_angry.png'
k['portraitHurt'] = 'kofi_face_hurt.png'
k['clash'] = {'file': 'clash/kofi_clash.webp', 'tip': cm['tip'],
              'name': {'file': 'clash/kofi_clash_name.webp', 'x': cm['name']['x'], 'y': cm['name']['y']}}
k.pop('note_portrait', None)
k['note_expressions'] = "Kofi's ten expressions (his 15 Nov sheet, dev/tools/make_kofi_assets.py): neutral is the portrait, angry the cut-in cry (shout), hurt the hurt face. The other seven (determined, worried, surprised, joyful, exhausted, fearful, defeated) are cut as kofi_face_<name>.png but not named here, so they are not loaded; wire them when mood faces want them."
k['note_clash'] = "His own clash banner from his 15 Nov clash sheet. His clash poses (Press, Guard, Slip, dodge) still reuse the casting pose and the battle-ready pose until Suleiman draws them."
json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False)
print('wired')
