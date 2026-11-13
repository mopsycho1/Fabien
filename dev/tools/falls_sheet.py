"""Before and after contact sheet for the poses that change in a batch (roadmap 18.18, 13.44).
Every picture stands on a tile diamond exactly as the game places it (size ruler scale, ground line,
foot point, mirrored for the facings that are not drawn). Rows are poses, columns the four facings;
the top block is BEFORE (an older copy of art.json), the bottom block AFTER (today's).
Run from the project folder with the tools Python:
    python dev/tools/falls_sheet.py <out.jpg> <character id> <older art.json> [pose pose ...]
Default poses: standing fallAir fallLand fallRise dodge knocked down."""
import sys, os, json
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ruler_lib import ART_DIR
import ruler

OPP = {'upLeft': 'upRight', 'upRight': 'upLeft', 'downLeft': 'downRight', 'downRight': 'downLeft'}
FACINGS = ('downLeft', 'downRight', 'upLeft', 'upRight')
ZOOM = float(os.environ.get('ZOOM', 2.2))   # drawn this many times bigger than on the board, to judge on a screen
TW, TH = 112 * ZOOM, 70 * ZOOM      # the cavern's tile

def value_for(art, cid, pose):
    e = art[cid]
    if pose == 'standing': return e['standing']
    return (e.get('poses') or {}).get(pose)

def pick(value, facing):
    """(entry, mirrored) as the game's pickFacing / poseFrame do."""
    if value is None: return None
    if 'file' in value: return value, facing.endswith('Left')
    if facing in value: return value[facing], False
    if OPP[facing] in value: return value[OPP[facing]], True
    first = next(iter(value.values())); return first, facing.endswith('Left')

def cell(art, cid, value, facing, base):
    got = pick(value, facing)
    if not got: return None
    v, mirrored = got
    rule = (art[cid].get('ruler') or {}).get(v['file'], {})
    im = Image.open(os.path.join(ART_DIR, v['file'])).convert('RGBA')
    s = base * rule.get('scale', 1.0)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    flipped = bool(v.get('flip'))
    foot = rule.get('footX')
    origin = v.get('originX', 0.5) if foot is None else (1 - foot if flipped else foot)
    if mirrored: origin = 1 - origin
    if flipped != mirrored: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im, origin, rule.get('feet', 1.0)

def block(art, cid, poses, title):
    entry = art[cid]
    base = ruler.draw_scale(entry, ART_DIR) * 0.95 * ZOOM
    cw, ch = int(125 * ZOOM), int(125 * ZOOM)
    out = Image.new('RGB', (cw * 4, 22 + ch * len(poses)), (52, 46, 42)); d = ImageDraw.Draw(out)
    d.text((6, 5), title, fill=(255, 235, 150))
    for r, pose in enumerate(poses):
        value = value_for(art, cid, pose)
        for c, facing in enumerate(FACINGS):
            cx, cy = c * cw + cw // 2, 22 + r * ch + ch - int(36 * ZOOM)
            d.polygon([(cx, cy - TH / 2), (cx + TW / 2, cy), (cx, cy + TH / 2), (cx - TW / 2, cy)], fill=(96, 84, 70), outline=(150, 135, 110))
            d.line((cx - 4, cy, cx + 4, cy), fill=(255, 70, 70)); d.line((cx, cy - 4, cx, cy + 4), fill=(255, 70, 70))
            got = cell(art, cid, value, facing, base) if value else None
            if got:
                im, origin, feet = got
                out.paste(im, (int(cx - im.width * origin), int(cy + 6 * ZOOM - im.height * feet)), im)
            else:
                d.text((cx - 20, cy - 40), 'none', fill=(180, 120, 120))
        d.text((c * cw + 6, 22 + r * ch + 4), pose, fill=(235, 235, 235))
    for c, facing in enumerate(FACINGS):
        d.text((c * cw + 90, 5), facing, fill=(200, 200, 200))
    return out

if __name__ == '__main__':
    out, cid, old = sys.argv[1:4]
    poses = sys.argv[4:] or ['standing', 'fallAir', 'fallLand', 'fallRise', 'dodge', 'knocked', 'down']
    new = json.load(open(ruler.ART_JSON)); before = json.load(open(old))
    a = block(before, cid, poses, cid + ': BEFORE'); b = block(new, cid, poses, cid + ': AFTER')
    sheet = Image.new('RGB', (a.width, a.height + b.height + 6), (0, 0, 0)); sheet.paste(a, (0, 0)); sheet.paste(b, (0, a.height + 6))
    sheet.save(out, quality=85); print(out, sheet.size)
