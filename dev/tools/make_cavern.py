# Phase 11 (1 Nov): Suleiman's Hidden Cavern pictures for the board.
# Run from dev/:  python3 tools/make_cavern.py <his NEW CAVE MAP DESIGNS folder> <out dir>
#
#  - ground: each of his ground sheets (FLOOR, sand, rubble, Sigil Floor,
#    Shallow pool) is four squares with black gutters; each square becomes one
#    look of that ground (cave_<kind>_<0..3>.jpg). The first sigil square (the
#    ring) is also kept big (cave_sigilring.jpg) to lay across the platform.
#  - walls: his sunlit and shadowed rock walls (cave_wall_lit.jpg, cave_wall_dark.jpg)
#    for the sides of the tiles and the cavern walls.
#  - props: the eight props from "Props for level design" (cave_<prop>.png),
#    cut at twice the size they are drawn so they stay sharp when the camera
#    zooms in. Prints each one's feet position (originX) and size.
#  - his tall cavern painting (cave_backdrop.jpg).
import sys, os, json
SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/incoming/cave/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '../public/art/terrain/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from fxcut import cut
from PIL import Image
import numpy as np

os.makedirs(OUT, exist_ok=True)

def runs(v):
    out, s, p = [], None, None
    for x in v:
        if s is None:
            s = x
        elif x != p + 1:
            out.append((s, p)); s = x
        p = x
    if s is not None:
        out.append((s, p))
    return out

def squares(path):
    """The four squares of a 2 by 2 sheet, between its black gutters."""
    a = np.array(Image.open(path).convert('L')).astype(int)
    rows = runs(np.where(a.mean(1) < 25)[0]); cols = runs(np.where(a.mean(0) < 25)[0])
    ys = [(rows[0][1] + 6, rows[1][0] - 6), (rows[1][1] + 6, rows[2][0] - 6)]
    xs = [(cols[0][1] + 6, cols[1][0] - 6), (cols[1][1] + 6, cols[2][0] - 6)]
    return [(x0, y0, x1, y1) for (y0, y1) in ys for (x0, x1) in xs]

GROUND = {'floor': 'floor.png', 'sand': 'sand.png', 'rubble': 'rubble.png', 'sigil': 'sigil.png', 'water': 'pool.jpeg'}
for kind, f in GROUND.items():
    im = Image.open(SRC + f).convert('RGB')
    for i, box in enumerate(squares(SRC + f)):
        sq = im.crop(box)
        sq.resize((256, 256), Image.LANCZOS).save(OUT + 'cave_%s_%d.jpg' % (kind, i), quality=86)
        if kind == 'sigil' and i == 0:
            sq.resize((512, 512), Image.LANCZOS).save(OUT + 'cave_sigilring.jpg', quality=88)

walls = Image.open(SRC + 'walls.jpeg').convert('RGB')
walls.crop((8, 8, 792, 792)).resize((384, 384), Image.LANCZOS).save(OUT + 'cave_wall_lit.jpg', quality=86)
walls.crop((808, 8, 1592, 792)).resize((384, 384), Image.LANCZOS).save(OUT + 'cave_wall_dark.jpg', quality=86)

# props: box on his sheet, and how wide its base is drawn on the board (game pixels)
PROPS = {
    'stalagmiteTall': ((22, 22, 337, 561), 120),
    'pillar': ((1036, 81, 1304, 562), 84),
    'stalagmiteShort': ((353, 207, 635, 563), 100),
    'rockPile': ((655, 233, 1017, 553), 112),
    'pots': ((1305, 302, 1514, 544), 74),
    'brazier': ((148, 558, 303, 985), 52),
    'rockPool': ((845, 571, 1511, 995), 150),
    'bones': ((407, 701, 782, 940), 100),
}
man = {}
for name, (box, width) in PROPS.items():
    k = 2 * width / (box[2] - box[0])  # cut at twice the board size
    out = OUT + 'cave_%s.png' % name
    ox, size = cut(SRC + 'props.jpeg', box, out, k, strokes=False, keep=0.05, floor=True)
    im = Image.open(out)
    a = im.getchannel('A')
    q = im.convert('RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(a)
    q.save(out, optimize=True)
    man[name] = {'originX': ox, 'size': list(size)}
    print(name, ox, size, os.path.getsize(out) // 1024, 'KB')

bd = Image.open(SRC + 'backdrop.jpeg').convert('RGB')
bd.save(OUT + 'cave_backdrop.jpg', quality=82)
json.dump(man, open(OUT + 'cave_props.json', 'w'), indent=1)
