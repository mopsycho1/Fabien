# Phase 6 leftovers (6.1 to 6.4), from Suleiman's sheets in Fabien Blueprint.
# Run from dev/:  python3 tools/make_phase6.py <art dir> [<blueprint dir>]
#   6.1 Rabdul: hurt (CHARACTER UPDATES/Rabdul defeated 1), stagger-and-fall
#       (Rabdul defeated4), four hurt faces (also defeated4)
#   6.2 the archer's fall: six pictures + four hurt faces (Archer fully defeated.)
#   6.3 Gaha's thrust, frame by frame (TEST FOR GAHAS SPRITE WITH SKELETON, rows 3 and 4)
#   6.4 Sudeen's head turnaround (Suddeen battle ready, bottom row)
# Prints a JSON of file names and originX for art.json.
import sys, os, json
ART = sys.argv[1] if len(sys.argv) > 1 else '../public/art/'
BP = sys.argv[2] if len(sys.argv) > 2 else '/Users/motiago/Documents/Fabien Blueprint/'
sys.argv = sys.argv[:1]
sys.path.insert(0, 'tools')
from cutter import cut
from sheet import hair
from PIL import Image

CU = BP + 'CHARACTER UPDATES/'
man = {}

def one(src, box, name, scale, keep=0.05, erase=()):
    ox = cut(src, box, ART + name + '.png', scale=scale, keep=keep, erase=erase)
    ox = ox[0] if isinstance(ox, (tuple, list)) else ox
    man[name] = round(float(ox), 3)

# ---- Rabdul (his height: hurt 8-direction sheet cut at the scale that matches his standing picture)
R = 0.42
D1 = CU + 'Rabdul defeated 1.jpeg'
for name, box in {'hurt_downLeft': (10, 10, 315, 500), 'hurt_upLeft': (10, 515, 335, 1000), 'hurt_upRight': (1185, 10, 1515, 500)}.items():
    one(D1, box, 'rabdul_' + name, R)
D4 = CU + 'Rabdul defeated4.jpeg'
# the fall: hunched at the chest, on one knee, on hands and knees, lying
for name, box in {'fall_0': (15, 20, 375, 575), 'fall_1': (385, 70, 745, 585), 'fall_2': (700, 360, 1095, 610), 'fall_3': (1080, 425, 1525, 635)}.items():
    one(D4, box, 'rabdul_' + name, R)
for i, box in enumerate([(40, 640, 360, 985), (395, 640, 715, 985), (760, 640, 1105, 985), (1140, 640, 1495, 985)]):
    one(D4, box, 'rabdul_face_hurt%d' % i, 0.5)

# ---- the archer's fall (1600x800 sheet; her standing picture is about 112 tall, hers is 342 here)
AR = 0.327
A1 = CU + 'Archer fully defeated..jpeg'
for i, box in enumerate([(15, 125, 215, 480), (170, 180, 415, 450), (395, 260, 670, 505), (685, 335, 935, 495), (935, 345, 1230, 505), (1215, 320, 1595, 510)]):
    one(A1, box, 'archer_fall_%d' % i, AR)
for i, box in enumerate([(10, 530, 215, 740), (222, 530, 425, 740), (428, 530, 632, 740), (635, 530, 840, 740)]):
    one(A1, box, 'archer_face_fall%d' % i, 0.8)

# ---- Gaha's thrust: row 3 faces right and down (frames 0 to 5), row 4 faces right and up
G = CU + 'TEST FOR GAHAS SPRITE WITH SKELETON.jpeg'
ROWS = {'thrust': (675, 905), 'thrustUp': (955, 1215)}
COLS = [(10, 195), (195, 395), (380, 565), (555, 805), (785, 1000), (1000, 1214)]
probe = '/tmp/_probe.png'
# one scale for every frame: the full thrust (frame 3) as tall as his existing attack picture
cut(G, (COLS[3][0], ROWS['thrust'][0], COLS[3][1], ROWS['thrust'][1]), probe, scale=1.0, keep=0.05)
k = Image.open(ART + 'gaha_iso_attack_downRight.png').height / Image.open(probe).height
print('gaha scale', k, file=sys.stderr)
for row, (y0, y1) in ROWS.items():
    for i, (x0, x1) in enumerate(COLS):
        one(G, (x0, y0, x1, y1), 'gaha_%s_%d' % (row, i), k)

# ---- Sudeen's head turnaround (seven heads, bottom row)
S = BP + 'CHARACTERS/Suddeen/Suddeen battle ready.jpeg'
for i, (x0, x1) in enumerate([(10, 195), (205, 405), (415, 615), (620, 830), (835, 1045), (1050, 1260), (1290, 1500)]):
    one(S, (x0, 722, x1, 975), 'sudeen_head_%d' % i, 0.92)

json.dump(man, open('/tmp/_phase6.json', 'w'), indent=1)
print(json.dumps(man))
