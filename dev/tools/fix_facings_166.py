"""Roadmap 1.66 (20 Nov): the 45 picture pairs the facing check (1.64) found facing one way.

Each set was judged by eye against Suleiman's original sheets (face, chest, weapon hand). His sheets are right; our
labels were wrong. Mostly his two front views (or two back views) are nearly the same drawing, so both of our
pictures face one way. The fix: keep the picture that faces its own direction and show it mirrored ("flip") for the
other side, as the game already does when a view is missing.
Sudeen's shield bash sheets (1009, 1011) are not four views but four frames of one move: 1009 all from the back
(facing NW), 1011 all from the front (facing SE). Gaha's weak sheet (1019) runs front, side, back, front, so the
"up" views were cut from front pictures. Tayo's weak front views were swapped.

Run once on the 19 Nov art.json:  python3 dev/tools/fix_facings_166.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'src/data/art.json')
art = json.load(open(P))

MIRROR = {'upLeft': 'upRight', 'upRight': 'upLeft', 'downLeft': 'downRight', 'downRight': 'downLeft'}

# id, path, the view that faces its own way (its picture is kept and mirrored for the other side of the pair)
KEEP = [
    ('h1', 'poses/guard', 'downRight'), ('h1', 'buffed/stone', 'downRight'), ('h1', 'buffed/swiftness', 'downRight'),
    ('h1', 'weak', 'upLeft'), ('h1', 'weak', 'downLeft'),
    ('h2', 'poses/dodge', 'upRight'), ('h2', 'poses/dodge', 'downLeft'),
    ('h2', 'poses/clashSlip', 'upRight'), ('h2', 'poses/clashSlip', 'downLeft'),
    ('h2', 'poses/sonicRelease', 'downRight'), ('h2', 'buffPoses/swiftness/dodge', 'downLeft'),
    ('h3', 'poses/dodge', 'upLeft'), ('h3', 'poses/dodge', 'downRight'), ('h3', 'weak', 'downLeft'),
    ('e3', 'standing', 'downLeft'), ('e3', 'poses/kneel', 'downLeft'), ('e3', 'weak', 'downLeft'),
    ('e3', 'poses/victory', 'upLeft'), ('e3', 'poses/victory', 'downRight'),
    ('e1', 'standing', 'downRight'), ('e1', 'poses/hurt', 'downLeft'), ('e1', 'poses/knocked', 'downLeft'),
    ('e1', 'poses/victory', 'downRight'), ('e1', 'enchanted/standing', 'downRight'),
    ('e1', 'enchanted/poses/guard', 'downRight'),
] + [('h4', p, 'downLeft') for p in ('standing', 'battle', 'poses/ready', 'poses/windup', 'poses/clashPress',
                                       'poses/clashGuard', 'poses/clashSlip', 'poses/guard', 'poses/dodge')] + [
    ('h4', 'poses/hurt', 'upRight'), ('h4', 'poses/hurt', 'downRight'),
    ('h4', 'poses/knocked', 'upRight'), ('h4', 'poses/knocked', 'downRight'),
]

# sets whose true picture for a view is another file: id, path, view, file (then mirrored as above)
SET = [
    # Sudeen's bash: back frames (1009) for the up views, front frames (1011) for the down views
    ('h1', 'poses/slipStrike', 'upLeft', 'sudeen_n6_bash_upLeft.png'),
    ('h1', 'poses/slipStrike', 'downRight', 'sudeen_n6_bash2_downLeft.png'),
    ('h1', 'poses/push', 'upLeft', 'sudeen_n6_bash_upRight.png'),
    ('h1', 'poses/push', 'downRight', 'sudeen_n6_bash2_downRight.png'),
    # Gaha weak (1019): figure 3 is the back view (facing NE), figures 1 and 4 the fronts (SW, SE)
    ('h2', 'weak', 'upRight', 'gaha_n6_weak_downLeft.png'),
    ('h2', 'weak', 'downLeft', 'gaha_n6_weak_upLeft.png'),
    ('h2', 'weak', 'downRight', 'gaha_n6_weak_downRight.png'),
    # Tayo weak: his figure 4 drops his head to the left (SW), figure 3 looks right (SE)
    ('e1', 'weak', 'downLeft', 'tayo_n6b_weak_f4.png'),
    ('e1', 'weak', 'downRight', 'tayo_n6b_weak_f3.png'),
]


def node(cid, path):
    o = art[cid]
    for k in path.split('/'):
        o = o[k]
    return o


def cell_of(o, view, file):
    """A cell for this view: the other view's settings if it already holds that file, else a plain one."""
    for v in MIRROR:
        c = o[v]
        if c['file'] == file and not c.get('flip'):
            return {k: val for k, val in c.items() if k != 'flip'}
    return {'file': file}


for cid, path, view, file in SET:
    o = node(cid, path)
    o[view] = cell_of(o, view, file)
for cid, path, view, file in SET:
    if (cid, path, view) in [(a, b, c) for a, b, c, _ in SET if MIRROR[c] == view]:
        continue  # both sides of this pair set by hand (Tayo weak)
    o = node(cid, path)
    if not any(a == cid and b == path and MIRROR[view] == c for a, b, c, _ in SET):
        KEEP.append((cid, path, view))

for cid, path, view in KEEP:
    o = node(cid, path)
    keep = dict(o[view])
    other = dict(keep)
    other['flip'] = not keep.get('flip', False)
    if not other['flip']:
        del other['flip']
    o[MIRROR[view]] = other

# the size ruler lists pictures per character: drop the ones no view uses any more (ruler.cjs checks this)
for cid, e in art.items():
    if isinstance(e, dict) and 'ruler' in e:
        text = json.dumps({k: v for k, v in e.items() if k != 'ruler'})
        for f in [f for f in e['ruler'] if '"' + f + '"' not in text]:
            del e['ruler'][f]

json.dump(art, open(P, 'w'), indent=2, ensure_ascii=False)
open(P, 'a').write('\n')
print('fixed', len(KEEP), 'pairs')
