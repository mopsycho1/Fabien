# Wires the 8 Nov archer pictures (make_smoke.py's output) into the game (roadmap 13.26, 13.29).
# Run from the repo root:  python3 dev/tools/wire_smoke.py <make_smoke out dir>
#   copies the archer pictures to public/art, the smoke to public/art/fx, writes src/data/smoke.json
#   (where the middle of each smoke picture's tile is) and edits the archer (e3) in src/data/art.json.
import sys, os, json, shutil
SRC = sys.argv[1].rstrip('/') + '/'
man = json.load(open(SRC + 'manifest.json'))
for group in ('throw', 'poison'):
    for f in man[group].values(): shutil.copy(SRC + f['file'], 'public/art/' + f['file'])
for group in ('cloud', 'clear'):
    for f in man[group].values(): shutil.copy(SRC + f['file'], 'public/art/fx/' + f['file'])

# the smoke: file names and where the middle of the (removed) floor tile is, as a share of the picture
smoke = {k: [{'file': man[k]['f%d' % i]['file'], 'ax': man[k]['f%d' % i]['ax'], 'ay': man[k]['f%d' % i]['ay']} for i in range(len(man[k]))] for k in ('cloud', 'clear')}
smoke['note'] = ('Smoke Bomb pictures (his 8 Nov sheets, roadmap 13.26), cut see-through by dev/tools/make_smoke.py. '
                 '"cloud" is the 6 stages of the cloud growing, "clear" the 4 frames of it blowing away. '
                 'ax and ay say where the middle of the tile is in each picture (0 to 1), so it stands on a board tile.')
json.dump(smoke, open('src/data/smoke.json', 'w'), indent=1)

art = json.load(open('src/data/art.json'))
a = art['e3']
def four(name):
    f = man[name]
    return {k: {'file': f[n]['file'], 'originX': f[n]['originX']} for k, n in (('upLeft', 'f1'), ('upRight', 'f2'), ('downLeft', 'f3'), ('downRight', 'f4'))}
# her kneeling Poison Arrow, four views (replaces the single old picture), for aiming and the poisoned-aim pose
a['poses']['poison'] = four('poison')
# the throw: his four frames face down-left, the game draws moves facing right, so they are flipped
a.setdefault('moves', {})['smokeThrow'] = {'frameMs': 110, 'frames': [{'file': man['throw']['f%d' % i]['file'], 'originX': man['throw']['f%d' % i]['originX'], 'flip': True} for i in (1, 2, 3, 4)]}
a['note_nov8'] = 'Poison Arrow crouch redrawn in four views and the Smoke Bomb throw (his 8 Nov sheets, roadmap 13.26, 13.29).'
json.dump(art, open('src/data/art.json', 'w'), indent=2, ensure_ascii=False)
print('wired')
