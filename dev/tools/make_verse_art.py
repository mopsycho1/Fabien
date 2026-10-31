# Suleiman's 30 Oct (17:58) sheets: the death effect (6.11), the Fury and Earth's
# Bulwark looks (6.18), Gaha under Fury (6.14) and Gaha rooted (6.17).
# All are painted on white. Effects keep only their light strokes (see-through);
# figures keep the solid body plus the strokes around it.
# usage (from the scratchpad): python3 tools/make_verse_art.py <out dir>
import sys, json, os
sys.path.insert(0, 'tools')
from fxcut import cut
O = sys.argv[1]
os.makedirs(O + '/fx', exist_ok=True)
D = 'art31/'
man = {}
def fx(key, src, box, scale=0.5, **kw):
    man['fx:' + key] = cut(D + src, box, O + '/fx/' + key + '.png', scale, **kw)
def fig(key, src, box, scale, **kw):
    man[key] = cut(D + src, box, O + '/' + key + '.png', scale, floor=True, keep=0.0, **kw)

# 6.11 Sigil Dissolve: 8 stages, 4 to a row
for i in range(8):
    c, r = i % 4, i // 4
    y0, y1 = ((0, 383), (387, 769))[r]
    fx('death_%d' % i, '01_death.jpg', (c * 400 + 4, y0, c * 400 + 396, y1), keep=0.0, gain=1.25)

# 6.18 Fury lands: his 7 stages, from the ring to the burst and back (Fury sheet, row 1)
FURY = [(26, 213), (231, 417), (432, 639), (653, 861), (873, 1080), (1092, 1317), (1326, 1519)]
for i, (x0, x1) in enumerate(FURY):
    fx('fury_cast_%d' % i, '03_fury_sheet.jpg', (x0, 20, x1, 296), keep=0.0, gain=1.6)
# the turning ring under a unit while Fury lasts (his top view, stage 2)
fx('fury_ground', '02_fury_stages.jpg', (226, 588, 401, 830), keep=0.0, gain=1.0)

# 6.18 Earth's Bulwark lands: his tamer sheet, row 1 (4 stages)
EARTH = [(29, 354), (402, 717), (775, 1106), (1159, 1507)]
for i, (x0, x1) in enumerate(EARTH):
    fx('earth_cast_%d' % i, '08_earth_tamer.jpg', (x0, 30, x1, 303), keep=0.0, gain=1.6)
# the crystals that float round the unit while it lasts (his elements)
for i, box in enumerate([(44, 580, 95, 689), (250, 610, 306, 681), (160, 647, 209, 719), (82, 660, 123, 722)]):
    fx('earth_crystal_%d' % i, '08_earth_tamer.jpg', box, scale=0.5, keep=0.0, strokes=True)

# 6.14 Gaha under Fury (front and back views; the other two are their mirror images)
fig('gaha_fury_downLeft', '05_gaha_fury_turn.jpg', (0, 0, 390, 649), 0.36)
fig('gaha_fury_upRight', '05_gaha_fury_turn.jpg', (825, 0, 1190, 649), 0.36)
# 6.17 Gaha rooted: low guard in a dome of crystals (3/4 front and back, both facing right)
fig('gaha_rooted_downRight', '11_gaha_rooted.jpg', (792, 493, 1502, 989), 0.33)
fig('gaha_rooted_upRight', '11_gaha_rooted.jpg', (22, 493, 757, 989), 0.33)
json.dump(man, open(O + '/manifest.json', 'w'), indent=1)
print(json.dumps(man))
