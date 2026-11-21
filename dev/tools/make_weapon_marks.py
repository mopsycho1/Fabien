"""Where Gadara's sword-staff is in each of his pictures (roadmap 10.37), so his weapon aura lies on it.

  ~/.fabien-tools/venv/bin/python -I dev/tools/make_weapon_marks.py

Each picture gets two points, the two ends of the staff, in the picture's own pixels: [x1, y1, x2, y2] (the hook end and
the butt end; the aura is the same at both ends, so the order does not matter). They were read by eye from labelled grid
sheets of every picture (20 Nov). Where the staff is partly hidden behind the head or a shoulder the hidden end is
carried on in the same line. Written to art.json "e5" -> "weapon" ("weapon" is in ruler_lib.SKIP: it is not a picture).
The aura's own axis (the bright line of the "Dark Energy for weapon" loop, measured on its six frames: centre, angle and
length in the 254 pixel frame) is in fxSlots.json buffs.blade.weaponAxis (put there by hand: that file's layout is its own). src/spellArt.js weaponAuraFx reads both.
A new picture of his with the staff in it needs a line here, then run this again (n94 fails when one is missing).
"""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

MARKS = {
    'gadara_stand_f4.png': [5, 25, 165, 97], 'gadara_stand_f1.png': [170, 22, 5, 98], 'gadara_stand_f2.png': [150, 25, 2, 92], 'gadara_stand_f3.png': [8, 22, 155, 100],
    'gadara_battle_f1.png': [165, 15, 5, 98], 'gadara_battle_f4.png': [25, 15, 180, 100], 'gadara_battle_f2.png': [145, 18, 3, 78], 'gadara_battle_f3.png': [8, 22, 170, 92],
    'gadara_weak_f3.png': [170, 20, 3, 120], 'gadara_weak_f2.png': [150, 22, 35, 75],
    'gadara_guard_f1.png': [185, 15, 15, 200], 'gadara_guard_f3.png': [215, 15, 148, 80],
    'gadara_cleave_rear_f1.png': [57, 8, 195, 78], 'gadara_cleave_rear_f3.png': [31, 45, 172, 10],
    'gadara_strike_f1.png': [172, 55, 5, 175], 'gadara_strike_f3.png': [185, 70, 244, 72],
    'gadara_cleave_land_f1.png': [120, 145, 15, 200], 'gadara_cleave_land_f3.png': [118, 112, 5, 172],
    'gadara_hook_reach_f1.png': [124, 66, 18, 96], 'gadara_hook_reach_f3.png': [125, 45, 15, 28],
    'gadara_hook_pull_f1.png': [106, 58, 20, 33], 'gadara_hook_pull_f3.png': [105, 60, 178, 18],
    'gadara_sunder_slash_f1.png': [152, 85, 15, 182], 'gadara_sunder_slash_f3.png': [230, 32, 17, 160],
    'gadara_mask_f1.png': [28, 8, 28, 230], 'gadara_mask_f3.png': [150, 6, 155, 240],
    'gadara_unleash_f4.png': [186, 8, 92, 200], 'gadara_unleash_f3.png': [22, 10, 105, 175],
    'gadara_hurt_f3.png': [178, 22, 12, 113], 'gadara_hurt_f2.png': [165, 22, 75, 68],
    'gadara_down_f1.png': [3, 131, 120, 185], 'gadara_down_f2.png': [228, 102, 20, 52],
    # 21 Nov victory (6.85): back views show the whole staff; in the front views it is behind him, carried on in its line
    'gadara_victory_f1.png': [165, 12, 65, 138], 'gadara_victory_f2.png': [20, 10, 112, 115],
    'gadara_victory_f3.png': [172, 10, 62, 92], 'gadara_victory_f4.png': [24, 10, 132, 96],
}

def main():
    p = os.path.join(ROOT, 'src', 'data', 'art.json')
    art = json.load(open(p))
    art['e5']['weapon'] = MARKS
    json.dump(art, open(p, 'w'), indent=2, ensure_ascii=False); open(p, 'a').write('\n')
    print(len(MARKS), 'pictures marked')

if __name__ == '__main__':
    main()
