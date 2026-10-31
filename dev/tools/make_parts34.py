# Cuts Suleiman's two three-quarter parts sheets (30 Oct) into one PNG per part.
import sys, json
sys.path.insert(0, 'tools')
from fxcut import cut
FRONT = {0: 'ref', 1: 'head', 2: 'head_turn', 7: 'neck', 3: 'chest', 4: 'chest_turn', 5: 'belly', 6: 'hips',
         8: 'near_upper', 9: 'near_fore', 10: 'far_upper', 11: 'far_fore', 12: 'near_hand_open', 17: 'near_hand_grip', 13: 'far_hand_grip',
         14: 'mantle_near', 15: 'mantle_far', 16: 'near_thigh', 18: 'near_shin', 19: 'near_foot', 20: 'far_thigh', 21: 'far_shin', 22: 'far_foot',
         23: 'cape_lo', 24: 'cape_li', 25: 'cape_ri', 26: 'cape_ro', 27: 'skirt_front_l', 28: 'skirt_front_c', 29: 'skirt_front_r',
         30: 'skirt_back_l', 31: 'skirt_back_c', 32: 'skirt_back_r', 33: 'spear'}
BACK = {0: 'ref', 1: 'head', 2: 'head_turn', 7: 'neck', 3: 'chest', 4: 'chest_turn', 5: 'belly', 6: 'hips',
        8: 'near_upper', 9: 'near_fore', 10: 'far_upper', 11: 'far_fore', 12: 'near_hand_open', 16: 'near_hand_grip', 17: 'far_hand_grip',
        13: 'mantle_near', 14: 'mantle_far', 15: 'near_thigh', 18: 'near_shin', 19: 'near_foot', 20: 'far_thigh', 21: 'far_shin', 22: 'far_foot',
        23: 'cape_lo', 24: 'cape_li', 25: 'cape_ri', 26: 'cape_ro', 27: 'skirt_back_l', 28: 'skirt_back_c', 29: 'skirt_back_r',
        30: 'skirt_front_l', 31: 'skirt_front_c', 32: 'skirt_front_r', 33: 'spear'}
boxes = json.load(open(sys.argv[1]))
for view, names in (('front', FRONT), ('back', BACK)):
    meta = {}
    for i, name in names.items():
        x0, y0, x1, y1 = boxes[view][i][:4]
        o, size = cut('rig2/%s.png' % view, (max(0, x0 - 3), max(0, y0 - 3), x1 + 3, y1 + 3), 'rig2/%s/%s.png' % (view, name), 1, strokes=False, keep=0.05)
        meta[name] = {'w': size[0], 'h': size[1], 'box': [x0, y0, x1, y1]}
    json.dump(meta, open('rig2/%s/meta.json' % view, 'w'), indent=1)
    print(view, len(meta))
