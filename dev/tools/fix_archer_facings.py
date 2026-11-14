"""The archer's front-view bow pictures pointed the wrong way (roadmap 1.45, 14 Nov).
Run from anywhere:  python3 dev/tools/fix_archer_facings.py   (safe to run twice)

Seen on a contact sheet: on Suleiman's full-quality sheets the two views from behind are
up-left then up-right, as the game expects, but the two front views are not down-left then
down-right:
- battle stance and the shot: BOTH front figures point the bow to the right
- the aim (bow primed): the third figure points right and the fourth points left
So with a hero down-left of her (where heroes usually stand) she aimed and shot to the right.
The fix, in src/data/art.json (e3):
- battle (and "ready") down-left: the third figure, mirrored
- the shot ("attack") down-left: the third figure, mirrored
- the aim ("windup"): the two front figures swap places
- the Poison Arrow shot was one front picture for every direction: from behind she now uses
  her full-quality shot pictures (up-left and up-right)
"""
import json, os
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data', 'art.json')
art = json.load(open(path)); a = art['e3']; p = a['poses']

def mirror(entry):
    """The same picture drawn flipped; its anchor is counted from the other edge."""
    if entry.get('flip'): return entry
    out = dict(entry); out['flip'] = True
    if 'originX' in out: out['originX'] = round(1 - out['originX'], 3)
    return out

for group in (a['battle'], p['ready'], p['attack']):
    group['downLeft'] = mirror(group['downLeft'])
if p['windup']['downLeft']['file'].endswith('_f3.png'):
    p['windup']['downLeft'], p['windup']['downRight'] = p['windup']['downRight'], p['windup']['downLeft']
if 'file' in p['poisonShot']:
    p['poisonShot'] = {'upLeft': dict(p['attack']['upLeft']), 'upRight': dict(p['attack']['upRight']), 'downRight': p['poisonShot']}
a['note_facings'] = ('14 Nov (roadmap 1.45): her front-view bow pictures pointed right in both down views. Down-left battle and shot are '
                     'the third figure mirrored ("flip"), the aim swaps its two front figures, and the Poison Arrow shot uses the '
                     'full-quality shot from behind. See dev/tools/fix_archer_facings.py. Test: dev/tests/n60.cjs.')
json.dump(art, open(path, 'w'), indent=2, ensure_ascii=False); open(path, 'a').write('\n')
print('done')
