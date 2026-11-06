"""Shrink Sudeen's Shield Ram and Furious Charge frames to match his isometric set (roadmap 1.24).
Measured on shield size next to his Nov bash picture: ram about 2.07x too big, charge about 1.65x.
Run once from the repo root. originX is a fraction of the width, so it stays the same."""
from PIL import Image
FACTORS = {'sudeen_ram_%d.png': 0.48, 'sudeen_fc_%d.png': 0.60}
for pattern, k in FACTORS.items():
    for i in range(6):
        p = 'public/art/' + pattern % i
        im = Image.open(p).convert('RGBA')
        im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).save(p, optimize=True)
        print(p, im.size)
