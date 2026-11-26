"""Float check (roadmap 1.89, 22 Nov: "some of the characters look like they're floating"). The game stands every picture on its
tile at "feet" (ruler, 1 = the bottom edge, src/art.js). Any see-through rows between the lowest solid pixel and that line make
the figure hang in the air. This lists every picture of every fighter whose feet are more than LIMIT board pixels above it.
Airborne pictures (leaps, falls in the air, Layra's blessed floating) are meant to float and are listed apart.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/float_audit.py [--fix]    (--fix trims the empty rows at the bottom of a picture)
"""
import json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
ART = json.load(open(os.path.join(ROOT, 'src', 'data', 'art.json')))
LIMIT = 2.0
AIR = ('leap', 'fallAir', 'air', 'bless', 'float', 'jump', 'dive', 'hover')
def pictures(entry, path=''):
    if isinstance(entry, str) and entry.endswith('.png'):
        yield path, entry; return
    if isinstance(entry, list):
        for i, v in enumerate(entry): yield from pictures(v, path + '.' + str(i))
        return
    if isinstance(entry, dict):
        if 'file' in entry and isinstance(entry['file'], str) and entry['file'].endswith('.png'):
            yield path, entry['file']; return
        for k, v in entry.items():
            if k in ('portrait', 'portraitHurt', 'shout', 'clash', 'ruler', 'hurtFaces', 'props') or k.startswith('note'): continue   # (props: Leol's barricade, not a figure)
            yield from pictures(v, path + '.' + k)
def run(fix=False):
    bad = []; seen = set()
    for cid, e in ART.items():
        if not isinstance(e, dict) or e.get('unwired') or 'standing' not in e: continue
        tallest = max(Image.open(os.path.join(ROOT, 'public', 'art', v['file'])).height for v in e['standing'].values() if isinstance(v, dict))
        board = (e.get('height', 100) * 1.0) / tallest        # board pixels per picture pixel (before the ruler's scale)
        ruler = e.get('ruler', {})
        for path, f in pictures(e):
            if (cid, f) in seen: continue
            seen.add((cid, f))
            p = os.path.join(ROOT, 'public', 'art', f)
            if not os.path.exists(p): continue
            a = np.array(Image.open(p).convert('RGBA'))[..., 3]
            rows = np.nonzero((a > 128).sum(1) >= 2)[0]
            if not len(rows): continue
            r = ruler.get(f, {}); feet = r.get('feet', 1.0); scale = r.get('scale', 1.0)
            gap = (feet * a.shape[0] - 1 - rows[-1]) * board * scale
            air = any(w.lower() in (path + f).lower() for w in AIR)
            if gap > LIMIT: bad.append((cid, path, f, round(gap, 1), air, feet))
    return bad
if __name__ == '__main__':
    fix = '--fix' in sys.argv
    bad = run()
    for cid, path, f, gap, air, feet in sorted(bad, key=lambda b: -b[3]):
        print('%s %-4s %-40s %-46s %5.1f px above the ground%s' % ('AIR ' if air else 'FLOAT', cid, path[:40], f, gap, '' if feet == 1.0 else ' (feet %s)' % feet))
        if fix and not air and feet == 1.0:
            p = os.path.join(ROOT, 'public', 'art', f); im = Image.open(p).convert('RGBA'); a = np.array(im)[..., 3]
            rows = np.nonzero((a > 128).sum(1) >= 2)[0]; im.crop((0, 0, im.width, rows[-1] + 1)).save(p, optimize=True)
    n = sum(1 for b in bad if not b[4])
    print('%d floating, %d airborne (meant to)' % (n, len(bad) - n))
    sys.exit(1 if n and not fix else 0)
