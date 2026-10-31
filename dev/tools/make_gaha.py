import sys, json; sys.path.insert(0, 'tools')
from cutter import components, cut
from PIL import Image, ImageDraw
U = '/mnt/user-data/uploads/Gaha/'
OUT = 'gaha_out/'
SMALL = 0.5          # the 1600 x 639 sheets
def big_scale(standing_h): return SMALL * 382 / standing_h   # the 1536 x 1024 sheets, matched to his standing height
B = {}
for name in ['GAHA SHEET', 'GAHA SHEET 2', 'Gaha under the effects of stone and fury', 'Gaha under the effects of swift', 'Gaha hurt:defeated 1', 'Gaha hurt:defeated2', 'Gaha celebrating victory']:
    B[name] = components(U + name + '.jpeg')[1]
battle_cols = [(0,190),(185,385),(372,565),(555,748),(715,898),(870,1068),(1052,1243),(1228,1428),(1418,1600)]
man = {}
def go(key, src, box, scale, flip=False):
    o = cut(U + src + '.jpeg', box, OUT + 'gaha_' + key + '.png', scale=scale, flip=flip)
    man[key] = o
rel = B['GAHA SHEET']
stand_h = rel[1][3] - rel[1][1]
print('standing height on sheet', stand_h)
for key, i in [('stand_downRight', 1), ('stand_downLeft', 7), ('stand_upRight', 3), ('stand_upLeft', 5)]:  # 3 = back turned right, 5 = back turned left
    go(key, 'GAHA SHEET', rel[i], SMALL)
for key, c in [('battle_downRight', 1), ('battle_downLeft', 7), ('battle_upRight', 3), ('battle_upLeft', 5)]:
    a, b = battle_cols[c]; go(key, 'Gaha Neutral and Battle ready', (a, 10, b, 410), SMALL * 1.04)
st = B['Gaha under the effects of stone and fury']
for key, i in [('stone_downRight', 1), ('stone_downLeft', 7), ('stone_upRight', 3), ('stone_upLeft', 5)]:
    go(key, 'Gaha under the effects of stone and fury', st[i], SMALL)
sw = B['Gaha under the effects of swift']
for key, i in [('swift_downRight', 1), ('swift_downLeft', 7), ('swift_upRight', 3), ('swift_upLeft', 5)]:
    go(key, 'Gaha under the effects of swift', sw[i], SMALL * 1.2)  # he is drawn smaller on this sheet
p2 = B['GAHA SHEET 2']
# action poses, all facing right (his face toward the spear tip): 10 the full thrust,
# 7 coiled to strike, 11 braced low, 1 the spear raised overhead to throw
for key, box in [('attack', (436, 309, 783, 464)), ('windup', (1368, 86, 1596, 299)), ('guard', (771, 308, 1063, 461)), ('throw', (212, 18, 439, 307))]:
    go(key, 'GAHA SHEET 2', box, SMALL * 1.25)  # he is drawn smaller on this sheet
# bloodied, for when he is badly hurt (GAHA SHEET 4, same turnaround order)
w4 = [b for b in components(U + 'GAHA SHEET 4.jpeg', min_area=6000)[1] if b[1] < 200]
for key, i in [('weak_downRight', 1), ('weak_downLeft', 7), ('weak_upRight', 3), ('weak_upLeft', 5)]:
    go(key, 'GAHA SHEET 4', w4[i], SMALL)
go('dodge', 'GAHA SHEET 2', (1098, 352, 1294, 460), SMALL * 1.25)
d1 = B['Gaha hurt:defeated 1']; d2 = B['Gaha hurt:defeated2']; ce = B['Gaha celebrating victory']
bs = big_scale(d1[0][3] - d1[0][1])
go('hurt', 'Gaha hurt:defeated 1', d1[1], bs)
go('knocked', 'Gaha hurt:defeated 1', (1110, 263, 1530, 640), bs)
go('down', 'Gaha hurt:defeated2', d2[4], bs)
go('victory', 'Gaha celebrating victory', ce[0], big_scale(ce[4][3] - ce[4][1]) * 1.2)
# faces
go('face', 'GAHA SHEET', rel[8], 1.25)
go('shout', 'Gaha celebrating victory', ce[6], 0.7)
go('face_hurt', 'Gaha hurt:defeated 1', d1[4], 0.62)
json.dump(man, open(OUT + 'manifest.json', 'w'), indent=1)
# preview
tiles = [(k, Image.open(OUT + 'gaha_' + k + '.png')) for k in man]
W = 1900; x = 10; y = 30; rowh = 0
bg = Image.new('RGBA', (W, 1300), (40, 30, 22, 255)); d = ImageDraw.Draw(bg)
for k, t in tiles:
    if x + t.width > W - 10: x = 10; y += rowh + 30; rowh = 0
    bg.alpha_composite(t, (x, y)); d.text((x, y - 14), k, fill='white')
    ox = x + t.width * man[k]; d.line([(ox, y + t.height - 4), (ox, y + t.height + 6)], fill='red', width=2)
    x += t.width + 16; rowh = max(rowh, t.height)
bg.crop((0, 0, W, y + rowh + 10)).save(OUT + 'preview.png')
print(json.dumps(man))
