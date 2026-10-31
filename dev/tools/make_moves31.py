# 31 Oct: Gaha's Fury Dive (roadmap 3.14) and Sudeen's Furious Charge and
# Shield Ram (6.15, 6.16), cut from Suleiman's 30 Oct sheets (white background).
# All frames face right; frames he drew facing left are mirrored.
# usage: python3 dev/tools/make_moves31.py dev/tools <incoming dir> <out dir>
import sys, json
from PIL import Image
sys.path.insert(0, sys.argv[1])
from fxcut import cut
SRC, OUT = sys.argv[2], sys.argv[3]
man = {}
def fig(name, sheet, box, scale, mirror=False, keep=0.15):
    path = OUT + '/' + name + '.png'
    origin, size = cut(SRC + '/' + sheet, box, path, scale, floor=True, keep=keep)
    im = Image.open(path).convert('RGBA')
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        origin = round(1 - origin, 3)
    im.quantize(256, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)
    man[name] = {'file': name + '.png', 'originX': origin}
G, GS = '06_gaha_fury_moves.jpg', 1.05
for i, (box, keep) in enumerate([((0, 10, 300, 245), 0.15), ((1270, 280, 1600, 480), 0.15), ((340, 480, 760, 690), 0.15), ((0, 470, 345, 690), 0.02), ((1170, 470, 1600, 690), 0.15)]):
    fig('gaha_dive_%d' % i, G, box, GS, keep=keep)  # wind-up, leap, dive, slam, landing
F, R, SS = '09_sudeen_furious.jpg', '10_sudeen_ram.jpg', 0.72
for i, (box, keep) in enumerate([((0, 30, 330, 290), 0.15), ((330, 60, 740, 290), 0.15), ((720, 40, 1140, 290), 0.15), ((1150, 20, 1536, 290), 0.15), ((390, 560, 1160, 890), 0.02), ((1170, 600, 1536, 890), 0.15)]):
    fig('sudeen_fc_%d' % i, F, box, SS, keep=keep)  # ready, charge, charge, leaping strike, fire explosion, landing
for i, (box, mirror, keep) in enumerate([((0, 30, 350, 300), False, 0.15), ((360, 60, 940, 300), False, 0.15), ((920, 30, 1600, 300), False, 0.15), ((0, 322, 560, 650), True, 0.02), ((550, 330, 1100, 650), True, 0.15), ((1100, 330, 1600, 650), False, 0.15)]):
    fig('sudeen_ram_%d' % i, R, box, SS, mirror=mirror, keep=keep)  # brace, charge, charge, impact, push, brace
json.dump(man, open(OUT + '/moves31_manifest.json', 'w'), indent=1)
print(json.dumps(man))
