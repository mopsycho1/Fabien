# Contact sheet of the fx_check.cjs photos (one tile per snapshot, label under it).
#   ~/.fabien-tools/venv/bin/python -I dev/browser/fx_sheet.py <photo dir> <out.jpg> [name,name...]
import json, sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
want = sys.argv[3].split(',') if len(sys.argv) > 3 else None
shots = [s for s in json.load(open(os.path.join(d, 'shots.json'))) if not want or s['label'].split(' ')[0] in want]
cols = 6; W = 240; H = 262
rows = (len(shots) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * H), (20, 20, 24)); g = ImageDraw.Draw(sheet)
for i, s in enumerate(shots):
    x, y = (i % cols) * W, (i // cols) * H
    sheet.paste(Image.open(s['f']), (x, y)); g.text((x + 6, y + 245), s['label'], fill=(235, 235, 235))
sheet.save(out, quality=88)
print(len(shots), 'tiles', sheet.size)
