# Wires the pictures cut by make_nov6.py into src/data/art.json (roadmap 6.26, 6.28, 6.29, 1.14, 1.17).
# Run from dev/:  python3 tools/wire_nov6.py <out dir of make_nov6.py>
import sys, json, shutil
OUT = sys.argv[1].rstrip('/') + '/'
ART = '../src/data/art.json'
m = json.load(open(OUT + 'manifest.json'))
art = json.load(open(ART))
FOUR = ['upLeft', 'upRight', 'downLeft', 'downRight']

def four(who, name):
    return {f: m[who][name][f] for f in FOUR}
def single(who, name, key='single'):
    return m[who][name][key]

# Sudeen: one shield-bash look for every shield attack, the aura says which kind (his 2 Nov rule)
h1 = art['h1']
h1['buffed']['stone'] = four('sudeen', 'stone')
h1['buffed']['swiftness'] = four('sudeen', 'swift')
h1['weak'] = four('sudeen', 'weak')
h1['poses']['attack'] = four('sudeen', 'bash')
h1['poses']['windup'] = four('sudeen', 'bash2')
h1['poses']['down'] = single('sudeen', 'down')
h1['poses']['victory'] = single('sudeen', 'victory')
h1['note_nov6'] = "Nov set (roadmap 6.26, 1.17), true views in all four facings: Stone, Swift and weakened stances; the Shield Bash lunge is his attack for every shield strike (the aura shows the kind) and the second bash picture is the wind-up; defeated and victory."

# Gaha: his isometric pictures replace the old big renders (roadmap 1.14, 6.28)
h2 = art['h2']
h2['weak'] = four('gaha', 'weak')
h2['buffed']['stone'] = four('gaha', 'stoneGuard')
h2['buffed']['fury'] = four('gaha', 'furyStand')
h2['buffed']['swiftness'] = four('gaha', 'swiftStand')
h2['poses']['dodge'] = four('gaha', 'dodge')
h2['poses']['down'] = single('gaha', 'down')
h2['poses']['victory'] = single('gaha', 'victory')
h2['poses']['sonicClose'] = four('gaha', 'sonicClose')
h2['poses']['sonicWindup'] = four('gaha', 'sonicPrep')
h2['buffPoses'] = {
    'stone': {'attack': four('gaha', 'stoneAttack'), 'guard': four('gaha', 'stoneGuard')},
    'fury': {'attack': four('gaha', 'furyAttack')},
    'swiftness': {'attack': four('gaha', 'swiftAttack'), 'guard': four('gaha', 'swiftGuard'), 'dodge': four('gaha', 'swiftDodge')},
}
d = m['gaha']['furyDive']
fr = [d['f0'], d['f1'], d['f2'], d['f3'], d['f3']]  # wind-up, leap, dive, slam, landing (the landing crouch twice)
h2['moves']['furyDive'] = {'note': "Fury Dive (roadmap 3.14), isometric (his 2 Nov 22:17 sequence): wind-up, leap, dive, landing crouch.", 'frameMs': 120, 'frames': fr}
h2['auraPainted'] = ['fury']
h2['note_nov6'] = "Nov set (roadmap 6.28, 1.14): weakened, defeated, victory, Stone/Fury/Swift stances and their own attack, guard and dodge pictures (buffPoses), the dodge, Fury Dive, Sonic Javelin close range and wind-up. Facings are true views."

# Layra
h3 = art['h3']
h3['weak'] = four('layra', 'hurt')
h3['poses']['down'] = single('layra', 'down')
h3['poses']['victory'] = single('layra', 'victory')
h3['note_nov6'] = "Nov set (roadmap 6.29): damaged (weak) in four facings, defeated (his picture 4 of 3 and 4), victory."

json.dump(art, open(ART, 'w'), indent=2)
used = set()
for who in m.values():
    for s in who.values():
        for v in s.values(): used.add(v['file'])
import os
for f in used: shutil.copy(OUT + f, '../public/art/' + f)
print(len(used), 'pictures copied')
