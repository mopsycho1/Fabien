# Gaha's Sonic Javelin (roadmap 3.6 / 3.11) and the Swift looks (3.10), cut
# from Suleiman's sheets. Figure frames go to out/, effect frames to out/fx/.
import sys, json
sys.path.insert(0, 'tools')
from fxcut import cut
A = 'sonic/sheetA.png'      # "Sonic Javelin being depicted" (rows: up close, throw, throw, sweep)
M = 'sonic/more.jpg'        # "MORE SONIC JAVELIN" (the throw, the spear in flight, impacts)
SA = 183 / 249              # his height on the game's standing picture / on sheet A
SM = 183 / 232              # ... / on the MORE sheet
O = 'sonic/out/'
man = {}
def fig(key, src, box, scale, **kw):
    man[key] = cut(src, box, O + 'gaha_' + key + '.png', scale, floor=True, **kw)
def fx(key, src, box, scale, **kw):
    man['fx:' + key] = cut(src, box, O + 'fx/' + key + '.png', scale, **kw)
# Up close: dash in, raise the spear, bring it down in a whirl (sheet A row 1)
for i, (x0, x1) in enumerate([(195, 412), (400, 640), (620, 830), (805, 1000), (1000, 1250), (1240, 1525)]):
    fig('sj_whirl_%d' % i, A, (x0, 10, x1, 356), SA, erase=[(x1 - 18, 10, x1, 356)] if i in (0,) else ())
# The throw (MORE row 1, frames 1 to 6)
THROW_ERASE = {3: [(1040, 178, 1120, 336)], 4: [(1300, 150, 1345, 336)]}  # the next frame's feathers
for i, (x0, x1) in enumerate([(190, 380), (330, 590), (550, 860), (815, 1120), (1035, 1345), (1300, 1575)]):
    fig('sj_throw_%d' % i, M, (x0, 18, x1, 336), SM, strokes=False, erase=THROW_ERASE.get(i, ()))
# The follow-up: crouch, sweep low, recover (sheet A row 4)
for i, (x0, x1) in enumerate([(15, 305), (315, 665), (1270, 1525)]):
    fig('sj_sweep_%d' % i, A, (x0, 790, x1, 1000), SA)
# Effects
for i, (x0, x1) in enumerate([(5, 248), (255, 552), (580, 832)]):
    fx('sj_spear_%d' % i, M, (x0, 355, x1, 565), SM)
for i, (x0, x1) in enumerate([(10, 392), (395, 800)]):
    fx('sj_impact_%d' % i, M, (x0, 562, x1, 792), SM)
fx('sj_rings', M, (1020, 600, 1370, 770), SM)
for i, (x0, x1) in enumerate([(625, 930), (920, 1265)]):
    fx('sj_burst_%d' % i, A, (x0, 790, x1, 1000), SA, keep=0.02)
# while dashing, the body (not the back foot) is over the tile
for i in range(3): man['sj_whirl_%d' % i] = [0.45, man['sj_whirl_%d' % i][1]]
json.dump(man, open(O + 'manifest.json', 'w'), indent=1)
print(json.dumps(man))
# The Swift looks (3.10): a swirl at the feet while Swift is on, a trail while moving
SW = 'sonic/swirl.jpg'; TR = 'sonic/trail.jpg'
for i, (x0, x1) in enumerate([(15, 260), (278, 523), (540, 798), (815, 1071), (1085, 1324), (1343, 1584)]):
    fx('swift_swirl_%d' % i, SW, (x0, 90, x1, 440), 0.5, keep=0.0, gain=2.0)
for i, (x0, x1) in enumerate([(20, 235), (250, 505), (512, 782), (790, 1085), (1086, 1332), (1374, 1592)]):
    fx('swift_trail_%d' % i, TR, (x0, 150, x1, 375), 0.5, keep=0.0, gain=2.0)
json.dump(man, open(O + 'manifest.json', 'w'), indent=1)
