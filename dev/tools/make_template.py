# The art template for Suleiman (roadmap 18.61, Graphics 2.0, 26 Nov).
# One reference picture he can give his image tool, so every new sheet comes in on our canvas:
#   - four cells in a row, in the order up-left, up-right, down-left, down-right (no labels)
#   - in each, one tile of the cavern at its real isometric angle (112 by 70 in the game, about 32 degrees)
#   - a marked ground line through the middle of the tile, where the feet stand
#   - a faint line at the top of the head of a standard fighter (88 game pixels: Sudeen, Gaha, Layra)
#   - a grey size figure at that standard height, turned the way the cell faces (back views show no face)
#   - plain grey ground
# Everything is drawn 4 times the game's size, so there is room for detail; the cutters shrink it.
#
#   ~/.fabien-tools/venv/bin/python -I dev/tools/make_template.py "<out folder>"
# writes fabien_art_template.png (the reference), fabien_art_template_HOWTO.pdf (one page) and the same text as .txt.
import math, os, sys, json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
board = json.load(open(os.path.join(ROOT, 'src/data/maps/cavern.json')))
B = board.get('board', board)
K = 4                                   # drawn 4 times the game's size
TW, TH = B.get('tileWidth', 112) * K, B.get('tileHeight', 70) * K   # one tile: 448 by 280
FIG = 88 * K                            # a standard fighter, feet to the top of the head: 352
CW, CH = 640, 720                       # one cell
FEET_Y = 560                            # the ground line: the middle of the tile, where the feet stand
GREY = (128, 128, 128)
TILE_FILL, TILE_EDGE = (138, 138, 138), (100, 100, 100)
FIG_FILL, FIG_DARK, FIG_LIGHT = (92, 92, 92), (78, 78, 78), (112, 112, 112)
LINE = (60, 60, 60)
FACINGS = [('up', -1), ('up', 1), ('down', -1), ('down', 1)]   # up-left, up-right, down-left, down-right


def tile(d, cx, cy):
    pts = [(cx, cy - TH / 2), (cx + TW / 2, cy), (cx, cy + TH / 2), (cx - TW / 2, cy)]
    d.polygon(pts, fill=TILE_FILL, outline=TILE_EDGE)
    d.line(pts + [pts[0]], fill=TILE_EDGE, width=3)


def figure(d, cx, feet, side, lr):
    # A plain mannequin. The way it faces: the feet step out along the tile's edge toward that corner, the head and
    # chest lean a little that way, and a front view shows a lighter face and chest; a back view a darker back.
    top = feet - FIG
    head_r = FIG * 0.075
    lean = lr * FIG * 0.045
    # the isometric step: toward up-left is (-56, -35) on the tile, and so on
    sx, sy = lr * TW / 2, (-1 if side == 'up' else 1) * TH / 2
    n = math.hypot(sx, sy); sx, sy = sx / n, sy / n
    # legs
    hip_y = feet - FIG * 0.47
    for k, off in ((-1, -FIG * 0.055), (1, FIG * 0.055)):
        fx = cx + off + sx * (FIG * 0.09 if k == lr else -FIG * 0.03)
        fy = feet + sy * (FIG * 0.06 if k == lr else -FIG * 0.02)
        d.line([(cx + off * 0.7, hip_y), (fx, fy - 6)], fill=FIG_DARK if side == 'up' else FIG_FILL, width=int(FIG * 0.075))
        d.ellipse([fx - 14 + sx * 10, fy - 10, fx + 14 + sx * 10, fy + 4], fill=FIG_DARK)  # a foot pointing the way it faces
    # body
    sh_y = top + FIG * 0.2
    sw = FIG * 0.16
    body = [(cx - sw + lean, sh_y), (cx + sw + lean, sh_y), (cx + sw * 0.7, hip_y + 8), (cx - sw * 0.7, hip_y + 8)]
    d.polygon(body, fill=FIG_DARK if side == 'up' else FIG_FILL)
    if side == 'down':  # the chest, lit, on the side it turns to
        d.polygon([(cx + lean + lr * sw * 0.1, sh_y + 10), (cx + lean + lr * sw * 0.95, sh_y + 10), (cx + lr * sw * 0.6, hip_y - 10), (cx + lr * sw * 0.05, hip_y - 10)], fill=FIG_LIGHT)
    # arms
    for k in (-1, 1):
        d.line([(cx + k * sw + lean, sh_y + 6), (cx + k * sw * 1.15 + sx * 8, hip_y + 10)], fill=FIG_DARK, width=int(FIG * 0.05))
    # neck and head
    hx, hy = cx + lean * 1.6, top + head_r
    d.rectangle([hx - head_r * 0.35, hy + head_r * 0.6, hx + head_r * 0.35, sh_y + 2], fill=FIG_FILL)
    d.ellipse([hx - head_r, hy - head_r, hx + head_r, hy + head_r], fill=FIG_DARK if side == 'up' else FIG_FILL)
    if side == 'down':  # the face, turned toward its side
        fx = hx + lr * head_r * 0.35
        d.ellipse([fx - head_r * 0.55, hy - head_r * 0.6, fx + head_r * 0.55, hy + head_r * 0.75], fill=FIG_LIGHT)
        d.polygon([(fx + lr * head_r * 0.5, hy - 4), (fx + lr * head_r * 0.85, hy + 6), (fx + lr * head_r * 0.5, hy + 12)], fill=FIG_LIGHT)  # the nose


def make(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    im = Image.new('RGB', (CW * 4, CH), GREY)
    d = ImageDraw.Draw(im)
    for i, (side, lr) in enumerate(FACINGS):
        cx = i * CW + CW // 2
        tile(d, cx, FEET_Y)
        # the ground line, across the cell, through the middle of the tile
        d.line([(i * CW + 24, FEET_Y), ((i + 1) * CW - 24, FEET_Y)], fill=LINE, width=3)
        # the standard height: a faint dashed line at the top of the head
        for x in range(i * CW + 24, (i + 1) * CW - 24, 24):
            d.line([(x, FEET_Y - FIG), (x + 12, FEET_Y - FIG)], fill=(105, 105, 105), width=2)
        figure(d, cx, FEET_Y, side, lr)
    # thin gaps between the cells (the cutters split on them)
    for i in range(1, 4):
        d.line([(i * CW, 0), (i * CW, CH)], fill=(118, 118, 118), width=2)
    png = os.path.join(out_dir, 'fabien_art_template.png')
    im.save(png)
    print('template ->', png, im.size)
    return png


HOWTO = [
    ('Fabien art template: how to use it', 'h1'),
    ('What it is', 'h2'),
    ('One reference picture for your image tool (fabien_art_template.png, 2560 by 720). It is our canvas: '
     'one cavern tile at the game\'s own isometric angle, the ground line, and a grey figure at the standard height of '
     'a fighter (Sudeen, Gaha and Layra are this tall). It is drawn 4 times the game\'s size.', 'p'),
    ('The four cells, left to right', 'h2'),
    ('Up-left, up-right, down-left, down-right. The same order as your four-view sheets. "Up" is the fighter\'s back '
     'to us (no face), "down" is the front. Please keep this order and do not add labels.', 'p'),
    ('How to give it to the tool', 'h2'),
    ('1. Attach the template as the layout or composition reference (not the style reference).', 'p'),
    ('2. Ask for: "the same four cells, same canvas size, same camera angle and ground line; replace the grey figure '
     'with <the character> in <the pose>, at the same height; keep the plain grey background; no text, no tile, no shadow".', 'p'),
    ('3. Attach your character art as the style reference as usual.', 'p'),
    ('The rules that make cutting easy', 'h2'),
    ('- Feet on the ground line, in the middle of the cell. The game stands every picture on its feet.', 'p'),
    ('- Top of the head on the dashed line for a fighter of standard size. A big one (the Bull, Gadara) may go above it; '
     'tell us how much taller he should be.', 'p'),
    ('- Plain grey ground, nothing else: no floor, no tile, no shadow, no glow. We add lights and shadows in the game.', 'p'),
    ('- Weapons and capes may reach into the next cell\'s side, but never across the thin line between cells.', 'p'),
    ('- A left view should be its right view flipped: if the tool mirrors a view, that is fine, we mirror it back.', 'p'),
    ('- Effects (slashes, magic) still as GIFs on pure black, as before.', 'p'),
    ('Where it lives', 'h2'),
    ('Fabien Blueprint/TEMPLATE. Remade by dev/tools/make_template.py if the tiles ever change size.', 'p'),
]


def howto(out_dir):
    W, H = 1240, 1754  # A4 at 150 dots per inch
    page = Image.new('RGB', (W, H), (250, 247, 240))
    d = ImageDraw.Draw(page)
    fonts = {
        'h1': ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 44),
        'h2': ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 30),
        'p': ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 25),
    }
    y, margin = 80, 90
    # the template itself, small, at the top
    t = Image.open(os.path.join(out_dir, 'fabien_art_template.png'))
    t.thumbnail((W - 2 * margin, 400))
    for text, kind in HOWTO[:1]:
        d.text((margin, y), text, font=fonts[kind], fill=(40, 30, 20)); y += 70
    page.paste(t, (margin, y)); y += t.size[1] + 40
    for text, kind in HOWTO[1:]:
        f = fonts[kind]
        if kind == 'h2':
            y += 14
        words, line = text.split(' '), ''
        for w in words:
            test = (line + ' ' + w).strip()
            if d.textlength(test, font=f) > W - 2 * margin:
                d.text((margin, y), line, font=f, fill=(40, 30, 20)); y += f.size + 10; line = w
            else:
                line = test
        d.text((margin, y), line, font=f, fill=(40, 30, 20)); y += f.size + (16 if kind == 'h2' else 12)
    pdf = os.path.join(out_dir, 'fabien_art_template_HOWTO.pdf')
    page.save(pdf, 'PDF', resolution=150)
    txt = os.path.join(out_dir, 'fabien_art_template_HOWTO.txt')
    open(txt, 'w').write('\n\n'.join(t for t, k in HOWTO) + '\n')
    print('how-to ->', pdf, 'bottom of text at', y, 'of', H)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), 'Fabien Blueprint', 'TEMPLATE')
    make(out)
    howto(out)
