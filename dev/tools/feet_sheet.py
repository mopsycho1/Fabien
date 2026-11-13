# Checklist B3 by eye: every picture of a character standing on a tile diamond, as the game
# places it (the red cross is the tile's middle). Run from the project folder with the tools Python:
#   python dev/tools/feet_sheet.py out.jpg src/data/art.json h2 [zoom] [title]
# Give an older copy of art.json to draw the "before" sheet.
import sys, os, json
sys.path.insert(0, 'dev/tools')
from PIL import Image, ImageDraw
from ruler_lib import inventory, ART_DIR
import ruler
art = json.load(open(sys.argv[2])); cid = sys.argv[3]; Z = float(sys.argv[4]) if len(sys.argv) > 4 else 1.4
e = art[cid]; base = ruler.draw_scale(e, ART_DIR) * 0.95 * Z; rl = e.get('ruler', {})
TW, TH = 112 * Z, 70 * Z
cells = []; seen = set()
for p in inventory(e):
    key = (p['file'], p['flip'])
    if key in seen: continue
    seen.add(key)
    im = Image.open(os.path.join(ART_DIR, p['file'])).convert('RGBA'); r = rl.get(p['file'], {})
    s = base * r.get('scale', 1.0)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    ox = p['originX']
    if 'footX' in r: ox = 1 - r['footX'] if p['flip'] else r['footX']
    if p['flip']: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    cells.append((p['label'], im, ox, r.get('feet', 1.0)))
CW = int(TW * 1.45); CH = int(max(c[1].height for c in cells) + TH * 0.7 + 22); cols = max(1, 1900 // CW)
rows = (len(cells) + cols - 1) // cols
out = Image.new('RGB', (cols * CW, rows * CH + 24), (52, 46, 42)); d = ImageDraw.Draw(out)
d.text((6, 4), sys.argv[5] if len(sys.argv) > 5 else cid, fill=(255, 235, 150))
for i, (label, im, ox, feet) in enumerate(cells):
    cx = (i % cols) * CW + CW // 2; cy = 24 + (i // cols) * CH + CH - int(TH * 0.5) - 16
    d.polygon([(cx, cy - TH / 2), (cx + TW / 2, cy), (cx, cy + TH / 2), (cx - TW / 2, cy)], fill=(96, 84, 70), outline=(150, 135, 110))
    d.line((cx - 4, cy, cx + 4, cy), fill=(255, 70, 70)); d.line((cx, cy - 4, cx, cy + 4), fill=(255, 70, 70))
    out.paste(im, (int(cx - im.width * ox), int(cy + 6 * Z - im.height * feet)), im)
    d.line((cx, cy + TH / 2 + 2, cx, cy + TH / 2 + 8), fill=(255, 70, 70), width=2)
    d.text(((i % cols) * CW + 4, cy + TH / 2 + 4), label.replace('poses.', '').replace('moves.', 'm.').replace('buffPoses.', 'bp.')[-22:], fill=(235, 235, 235))
out.save(sys.argv[1], quality=82); print(out.size)
