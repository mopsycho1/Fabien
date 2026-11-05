# Puts the phase 6 pictures (make_phase6.py) into src/data/art.json.
# Run from the repo root: python3 dev/tools/wire_phase6.py /tmp/_phase6.json
import json, sys
man = json.load(open(sys.argv[1]))
P = 'src/data/art.json'
art = json.load(open(P))
def f(name): return {'file': name + '.png', 'originX': man[name]}
def both(name): return {'downLeft': f(name), 'upLeft': f(name)}  # one picture, mirrored for the right-hand facings

# 6.1 Rabdul (e4)
e4 = art['e4']
e4['poses']['hurt'] = {'downLeft': f('rabdul_hurt_downLeft'), 'upLeft': f('rabdul_hurt_upLeft'), 'upRight': f('rabdul_hurt_upRight')}
for pose, n in {'knocked': 0, 'kneel': 1, 'crumple': 2, 'down': 3}.items():
    e4['poses'][pose] = both('rabdul_fall_%d' % n)
e4['portraitHurt'] = 'rabdul_face_hurt1.png'
e4['hurtFaces'] = ['rabdul_face_hurt%d.png' % i for i in range(4)]  # not loaded yet: grit, wince, eyes shut, lying
e4['note_hurt'] = "Hurt in three facings (the others are mirrored), the fall in four pictures (knocked, kneel, crumple, down), and a hurt face; from 'Rabdul defeated 1' and 'Rabdul defeated4' (6.1)."

# 6.2 the archer (e3): hurt, then the fall
e3 = art['e3']
e3['poses']['hurt'] = both('archer_fall_0')
for pose, n in {'knocked': 1, 'kneel': 2, 'crumple': 4, 'down': 5}.items():
    e3['poses'][pose] = both('archer_fall_%d' % n)
e3['portraitHurt'] = 'archer_face_fall1.png'
e3['hurtFaces'] = ['archer_face_fall%d.png' % i for i in range(4)]
e3['note_fall'] = "Her fall from 'Archer fully defeated' (6.2): the old hurt, knocked and down pictures are replaced."

# 6.3 Gaha's thrust, frame by frame (h2): row 3 faces down-right, row 4 up-right
h2 = art['h2']
for move in ('thrust', 'thrustUp'):
    h2['moves'][move] = {'frameMs': 50, 'frames': [f('gaha_%s_%d' % (move, i)) for i in range(6)]}

# 6.4 Sudeen's new head turnaround (h1)
h1 = art['h1']
h1['portrait'] = 'sudeen_head_0.png'
h1['shout'] = 'sudeen_head_6.png'
h1['headTurn'] = ['sudeen_head_%d.png' % i for i in range(7)]  # front-right round the back to front-left (not loaded yet)

json.dump(art, open(P, 'w'), indent=2, ensure_ascii=False)
open(P, 'a').write('\n')
