"""One sheet of a fighter's board photos from dev/browser/review_unit.cjs (1.113): a row per pose, the four facings across.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/review_sheet.py <photo dir> <unit id> <out.jpg> [cell width]
"""
import sys, os, glob
from PIL import Image, ImageDraw
d, uid, out = sys.argv[1:4]
W = int(sys.argv[4]) if len(sys.argv) > 4 else 260
F = ['upLeft', 'upRight', 'downLeft', 'downRight']
files = sorted(glob.glob(os.path.join(d, uid + '_*_*.png')))
poses = []
for f in files:
    p = os.path.basename(f)[len(uid) + 1:-4].rsplit('_', 1)[0]
    if p not in poses: poses.append(p)
order = ['standing', 'battle', 'weak', 'attack', 'windup', 'ready', 'guard', 'dodge', 'hurt', 'knocked', 'down', 'victory']
poses.sort(key=lambda p: order.index(p) if p in order else 99)
first = Image.open(files[0]); H = int(W * first.height / first.width)
sh = Image.new('RGB', (90 + 4 * W, len(poses) * (H + 4)), (20, 20, 20)); dr = ImageDraw.Draw(sh)
for c, fc in enumerate(F): dr.text((92 + c * W, 0), fc, fill=(255, 255, 255))
for r, p in enumerate(poses):
    dr.text((4, r * (H + 4) + H // 2), p, fill=(255, 255, 0))
    for c, fc in enumerate(F):
        f = os.path.join(d, '%s_%s_%s.png' % (uid, p, fc))
        if os.path.exists(f):
            im = Image.open(f).convert('RGB').resize((W, H)); sh.paste(im, (90 + c * W, r * (H + 4) + 2))
sh.save(out, quality=85); print(out, sh.size)
