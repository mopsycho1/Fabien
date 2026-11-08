# Roadmap 1.33: the archer's kneeling Poison Arrow pictures (13.30) were drawn too big.
# Scales all four facings by one factor so the kneeling figure is two-thirds of her
# standing height (her standing picture is 110 px tall). Run once; it resizes in place,
# so do not run it again (it would shrink them twice).
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '..', 'public', 'art')
STAND_H = 110          # archer_n6b_stand_f1.png height
TARGET_H = STAND_H * 2 / 3
FILES = ['archer_poison_f1.png', 'archer_poison_f2.png', 'archer_poison_f3.png', 'archer_poison_f4.png']

heights = [Image.open(os.path.join(ART, f)).height for f in FILES]
scale = TARGET_H / (sum(heights) / len(heights))
print('scale', round(scale, 3))
for f in FILES:
    path = os.path.join(ART, f)
    im = Image.open(path).convert('RGBA')
    w = max(1, round(im.width * scale))
    h = max(1, round(im.height * scale))
    im.resize((w, h), Image.LANCZOS).save(path)
    print(f, im.size, '->', (w, h))
