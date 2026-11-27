"""Float check (roadmap 1.89, 22 Nov: "some of the characters look like they're floating"). The game stands every picture on its
tile at "feet" (ruler, 1 = the bottom edge, src/art.js). Any see-through rows between the lowest solid pixel and that line make
the figure hang in the air. This lists every picture of every fighter whose feet are more than LIMIT board pixels above it.
Airborne pictures (leaps, falls in the air, Layra's blessed floating) are meant to float and are listed apart.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/float_audit.py [--fix]    (--fix trims the empty rows at the bottom of a picture)
Feet kept (1.119, 27 Nov: "Leol has no feet, the Thief is missing his legs"): a floor clean-up that takes the feet with the tile
makes a picture SHORTER. Every fighter's upright pictures (standing, battle stance, weak) have their height pinned in
dev/tools/stand_heights.json; a picture more than SHORT shorter than its pin fails. After a recut that is meant to change a height,
look at it next to its sheet, then:  float_audit.py --pin-heights
No tile strips (1.125, 27 Nov): a floor clean-up that leaves the tile's rim as pale strips by the feet makes a picture WIDER (the
Thief's standing 1 was 153 px wide with its strips, 115 without). Every fighter picture's width is pinned in dev/tools/pic_widths.json
(written by the same --pin-heights); one more than WIDE wider than its pin fails.
"""
import json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
ART = json.load(open(os.path.join(ROOT, 'src', 'data', 'art.json')))
LIMIT = 2.0
SHORT = 0.06   # 1.119: an upright picture may not lose more than 6 percent of its height (its feet) without a new pin
HEIGHTS = os.path.join(ROOT, 'dev', 'tools', 'stand_heights.json')
WIDE = 0.08   # 1.125: a picture may not grow more than 8 percent wider (a tile strip back) without a new pin
WIDTHS = os.path.join(ROOT, 'dev', 'tools', 'pic_widths.json')
UPRIGHT = ('.standing', '.battle', '.weak')
def upright_heights():
    """{picture: height in pixels} for every fighter's standing, battle stance and weak pictures."""
    out = {}
    for cid, e in ART.items():
        if not isinstance(e, dict) or e.get('unwired') or e.get('summonOf') or 'standing' not in e: continue  # (Kofi's spirits hover by design, 13.72)
        for path, f in pictures(e):
            if not path.startswith(UPRIGHT): continue
            p = os.path.join(ROOT, 'public', 'art', f)
            if os.path.exists(p): out[f] = Image.open(p).height
    return out
def lost_feet():
    """[(picture, pinned height, height now)] for upright pictures more than SHORT shorter than pinned."""
    pins = json.load(open(HEIGHTS)) if os.path.exists(HEIGHTS) else {}
    return [(f, pins[f], h) for f, h in sorted(upright_heights().items()) if f in pins and h < pins[f] * (1 - SHORT)]
def all_widths():
    """{picture: width in pixels} for every picture of every fighter."""
    out = {}
    for cid, e in ART.items():
        if not isinstance(e, dict) or e.get('unwired') or e.get('summonOf') or 'standing' not in e: continue  # (Kofi's spirits hover by design, 13.72)
        for path, f in pictures(e):
            p = os.path.join(ROOT, 'public', 'art', f)
            if os.path.exists(p): out[f] = Image.open(p).width
    return out
def strips_back():
    """[(picture, pinned width, width now)] for pictures more than WIDE wider than pinned."""
    pins = json.load(open(WIDTHS)) if os.path.exists(WIDTHS) else {}
    return [(f, pins[f], w) for f, w in sorted(all_widths().items()) if f in pins and w > pins[f] * (1 + WIDE)]
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
        if not isinstance(e, dict) or e.get('unwired') or e.get('summonOf') or 'standing' not in e: continue  # (Kofi's spirits hover by design, 13.72)
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
    if '--pin-heights' in sys.argv:
        hs = upright_heights(); json.dump(dict(sorted(hs.items())), open(HEIGHTS, 'w'), indent=1); open(HEIGHTS, 'a').write('\n')
        ws = all_widths(); json.dump(dict(sorted(ws.items())), open(WIDTHS, 'w'), indent=1); open(WIDTHS, 'a').write('\n')
        print('pinned the heights of %d upright pictures and the widths of %d pictures' % (len(hs), len(ws))); sys.exit(0)
    lost = lost_feet()
    for f, was, now in lost: print('SHORT %-46s %d px, pinned %d: has it lost its feet? Look, then --pin-heights' % (f, now, was))
    wide = strips_back()
    for f, was, now in wide: print('WIDE  %-46s %d px, pinned %d: is a tile strip back by the feet? Look, then --pin-heights' % (f, now, was))
    fix = '--fix' in sys.argv
    bad = run()
    for cid, path, f, gap, air, feet in sorted(bad, key=lambda b: -b[3]):
        print('%s %-4s %-40s %-46s %5.1f px above the ground%s' % ('AIR ' if air else 'FLOAT', cid, path[:40], f, gap, '' if feet == 1.0 else ' (feet %s)' % feet))
        if fix and not air and feet == 1.0:
            p = os.path.join(ROOT, 'public', 'art', f); im = Image.open(p).convert('RGBA'); a = np.array(im)[..., 3]
            rows = np.nonzero((a > 128).sum(1) >= 2)[0]; im.crop((0, 0, im.width, rows[-1] + 1)).save(p, optimize=True)
    n = sum(1 for b in bad if not b[4])
    print('%d floating, %d airborne (meant to); %d upright pictures shorter than pinned (1.119); %d pictures wider than pinned (1.125)' % (n, len(bad) - n, len(lost), len(wide)))
    sys.exit(1 if (n and not fix) or lost or wide else 0)
