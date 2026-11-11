# Puts the crops from dev/browser/knock.cjs on contact sheets, one row per case:
#   python3 dev/browser/knock_sheet.py <out dir>
# Writes knock_sheet_1.png and knock_sheet_2.png (four cases each) in that folder.
import sys, glob, os
from PIL import Image, ImageDraw
d = sys.argv[1]
names = sorted(set(os.path.basename(f).rsplit('_', 2)[0] for f in glob.glob(d + '/*_[0-9][0-9]_*.png')))
cw = 190
for part in range(0, len(names), 4):
    rows = names[part:part + 4]
    sheet = Image.new('RGB', (cw * 12, len(rows) * (cw + 18)), (24, 20, 16)); dr = ImageDraw.Draw(sheet)
    for r, name in enumerate(rows):
        for c, f in enumerate(sorted(glob.glob(d + '/' + name + '_[0-9][0-9]_*.png'))[:12]):
            sheet.paste(Image.open(f).convert('RGB').resize((cw, cw)), (c * cw, r * (cw + 18) + 18))
            dr.text((c * cw + 4, r * (cw + 18) + 3), (name + '  ' if c == 0 else '') + os.path.basename(f).rsplit('_', 1)[1][:-4] + ' ms', fill=(255, 224, 138))
    sheet.save(d + '/knock_sheet_%d.png' % (part // 4 + 1)); print(sheet.size)
