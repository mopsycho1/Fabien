# Cuts the sand impact effect (Suleiman 7 Nov 07:51, chat 1210, roadmap 6.37): four isometric
# views (NE, NW, SE, SW) of a swirl of sand and rocks thrown up from a stone tile.
# The sheet draws the stone tile under the swirl; the game has its own ground, so the tile
# is taken out: the tile (the biggest dark-brown piece) goes see-through, the loose rocks
# stay solid, the pale sand and the light strokes keep their see-through look.
# Run from dev/:  python3 tools/make_sand_impact.py <1210 picture> <out dir>
# Writes <out>/sand_impact_ne|nw|se|sw.png and info.json (where the tile centre is, as fractions).
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2].rstrip('/') + '/'
os.makedirs(OUT, exist_ok=True)
# quadrants without the printed labels (they sit under each view): NE, NW, SE, SW
BOXES = {'ne': (0, 0, 768, 445), 'nw': (768, 0, 1536, 445), 'se': (0, 512, 768, 880), 'sw': (768, 512, 1536, 880)}
im = np.array(Image.open(SRC).convert('RGB')).astype(float)
info = {}
for name, (x0, y0, x1, y1) in BOXES.items():
    a = im[y0:y1, x0:x1]
    lum = a.mean(-1); chroma = a.max(-1) - a.min(-1); mn = a.min(-1)
    solid = (lum < 178) & (chroma > 22)
    solid = ndimage.binary_opening(solid, iterations=1)
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    tile = lab == (1 + int(np.argmax(sizes)))
    tile = ndimage.binary_fill_holes(ndimage.binary_closing(tile, iterations=3))
    # the tile's printed edge: a band round its outline goes too (it would show as a white line)
    edge = ndimage.binary_dilation(tile, iterations=4) & ~ndimage.binary_erosion(tile, iterations=3)
    tile = ndimage.binary_dilation(tile, iterations=4)
    rocks = solid & ~tile
    # the effect over plain white: colour to alpha (pale pixels become see-through)
    al = np.clip((255 - mn) / 150.0, 0, 1)
    col = np.where(al[..., None] > 0.02, (a - 255 * (1 - al[..., None])) / np.maximum(al[..., None], 0.02), a)
    # over the tile: only the bright strokes stay (its own colour, faded in with the brightness)
    over = tile & ~rocks
    # over the tile: only the glow stays, found by its colour (a saturated pale gold, brighter
    # and yellower than any stone); the tile's own highlights are less yellow
    rb = a[..., 0] - a[..., 2]
    al_t = np.clip((rb - 80) / 30.0, 0, 1) * np.clip((lum - 188) / 25.0, 0, 1)
    al_t = ndimage.gaussian_filter(al_t, 1.6) * 1.15
    al_t = np.clip(al_t, 0, 0.92)
    al_t[edge] = 0
    al = np.where(over, al_t, al)
    col = np.where(over[..., None], a, col)
    al = np.where(rocks, 1.0, al)
    col = np.where(rocks[..., None], a, col)
    # the tile's soft grey drop shadow on the white page: low colour, near the tile
    near = ndimage.binary_dilation(tile, iterations=16) & ~rocks & ~over
    al[near & (chroma < 30) & (lum < 236)] = 0
    # the printed tile edge shadow and the page's faint grey: drop very faint pixels
    al[al < 0.06] = 0
    rgba = np.dstack([np.clip(col, 0, 255), al * 255]).astype(np.uint8)
    img = Image.fromarray(rgba)
    bb = img.getbbox()
    # tile centre on the cropped picture: middle of the tile's top face
    ty, tx = np.nonzero(tile)
    cx = (tx.min() + tx.max()) / 2; top = ty.min(); bot = ty.max()
    cy = top + (bot - top) * 0.36   # the top face is the upper part of the block
    img = img.crop(bb)
    img.save(OUT + 'sand_impact_%s.png' % name, optimize=True)
    info[name] = {'w': img.width, 'h': img.height, 'cx': round((cx - bb[0]) / img.width, 3), 'cy': round((cy - bb[1]) / img.height, 3), 'tileW': int(tx.max() - tx.min())}
    print(name, info[name], os.path.getsize(OUT + 'sand_impact_%s.png' % name) // 1024, 'KB')
json.dump(info, open(OUT + 'info.json', 'w'), indent=1)
