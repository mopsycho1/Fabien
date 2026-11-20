"""Before and after sheet for a facing fix (roadmap 1.66): every four-view set that changed between an older
art.json and today's, the old views on the left and the new on the right (a red * marks a changed view).

  ~/.fabien-tools/venv/bin/python -I dev/tools/facing_before_after.py <older art.json> <out folder>
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import facing_check as fc
from PIL import Image, ImageDraw

before = json.load(open(sys.argv[1])); outdir = sys.argv[2]; os.makedirs(outdir, exist_ok=True)
now = json.load(open(os.path.join(fc.ROOT, 'src/data/art.json')))


def sets_of(art):
    fc.ART = art
    return {(c, p): cells for c, p, cells in fc.sets()}


B, A = sets_of(before), sets_of(now)
keys = [k for k in A if k in B and A[k] != B[k]]
rows, seen = [], {}
for k in keys:  # sets that share the same pictures before and after are drawn once
    sig = json.dumps([B[k], A[k]], sort_keys=True)
    if sig in seen:
        seen[sig][0].append(k[0] + ' ' + k[1]); continue
    seen[sig] = ([k[0] + ' ' + k[1]], B[k], A[k]); rows.append(seen[sig])
W, H, PER = 120, 150, 9
for pg in range(0, len(rows), PER):
    rr = rows[pg:pg + PER]
    img = Image.new('RGB', (W * 8 + 40, len(rr) * (H + 34) + 30), (52, 44, 36)); d = ImageDraw.Draw(img)
    d.text((10, 8), 'BEFORE (as cut)', fill=(255, 150, 130))
    d.text((W * 4 + 40, 8), 'AFTER (the true view kept, the other side mirrored)', fill=(150, 230, 150))
    for i, (names, b, a) in enumerate(rr):
        y0 = 30 + i * (H + 34)
        d.text((4, y0), ', '.join(names)[:150], fill=(255, 220, 150))
        for half, cells in ((0, b), (1, a)):
            for j, v in enumerate(fc.VIEWS):
                im = fc.picture(cells[v]); x0 = half * (W * 4 + 30) + 5 + j * W
                img.paste(Image.new('RGB', (W - 4, H), (205, 205, 205) if half == 0 else (190, 210, 190)), (x0, y0 + 14))
                if im is not None:
                    im = im.crop(im.getbbox()); k = min((W - 10) / im.width, (H - 6) / im.height)
                    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
                    img.paste(im, (x0 + (W - 4 - im.width) // 2, y0 + 14 + H - im.height), im)
                changed = half == 1 and a[v] != b[v]
                d.text((x0 + 3, y0 + 16), fc.COMPASS[v] + (' *' if changed else ''), fill=(200, 0, 0) if changed else (0, 0, 0))
    f = os.path.join(outdir, 'facing_before_after_%d.jpg' % (pg // PER + 1)); img.save(f, quality=90); print(f)
print(len(rows), 'rows')
