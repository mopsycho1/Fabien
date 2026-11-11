# Joins flame142.cjs clips into one contact sheet: row 1 brazier frames 1 to 8, row 2 lamp frames 1 to 8.
# python3 dev/browser/flame142_sheet.py <dir> <out.png>
import sys
from PIL import Image
d = sys.argv[1]
first = Image.open(f'{d}/clip_brazier_1.png'); w, h = first.size
S = 2
sheet = Image.new('RGB', (w * 8 * S, h * 2 * S))
for r, kind in enumerate(['brazier', 'lamp']):
    for fr in range(1, 9):
        try: im = Image.open(f'{d}/clip_{kind}_{fr}.png').convert('RGB')
        except FileNotFoundError: continue
        sheet.paste(im.resize((w * S, h * S), Image.LANCZOS), ((fr - 1) * w * S, r * h * S))
sheet.save(sys.argv[2])
