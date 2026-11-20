"""Contact sheet of the aura photographs (dev/browser/auras.cjs): one row per pose, one cell per facing.
   ~/.fabien-tools/venv/bin/python -I dev/browser/aura_sheet.py <dir> <who> <look> <out.jpg> [cell size]"""
import json, sys
from PIL import Image, ImageDraw
d, who, look, out = sys.argv[1:5]
cell = int(sys.argv[5]) if len(sys.argv) > 5 else 220
meta = json.load(open('%s/_%s_%s.json' % (d, who, look)))
poses = []
for m in meta:
    if m['pose'] not in poses: poses.append(m['pose'])
fac = ['downLeft', 'downRight', 'upLeft', 'upRight']
sheet = Image.new('RGB', (len(fac) * cell + 80, len(poses) * cell), (30, 30, 30))
dr = ImageDraw.Draw(sheet)
for i, m in enumerate(meta):
    im = Image.open('%s/_%s_%s_%02d.png' % (d, who, look, i)).convert('RGB').resize((cell, cell), Image.LANCZOS)
    x = 80 + fac.index(m['facing']) * cell; y = poses.index(m['pose']) * cell
    sheet.paste(im, (x, y)); dr.text((x + 3, y + 3), m['key'].split(':')[1][:22], fill=(255, 255, 0))
for r, p in enumerate(poses): dr.text((4, r * cell + cell // 2), p, fill=(255, 255, 255))
sheet.save(out, quality=88)
