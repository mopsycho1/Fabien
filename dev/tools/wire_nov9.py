# Wires the pictures cut by make_nov9.py into src/data/art.json and public/art (roadmap 6.36), and
# the archer's and Layra's clash banners (6.35). Run from dev/:
#   python3 tools/wire_nov9.py <make_nov9 out dir> <clash dir (cut_banners31 out)>
# Which figure is which facing was read off the contact sheet (not the order printed on the
# sheets): a figure showing his back with the shield on the left is up-left, back with the
# shield on the right is up-right, face showing with the sword out to the right is down-right,
# to the left is down-left. 1199 and 1202 are mirror copies of each other, as are 1200 and 1201.
import sys, json, shutil, os
OUT = sys.argv[1].rstrip('/') + '/'
CLASH = sys.argv[2].rstrip('/') + '/'
ART = '../src/data/art.json'
PUB = '../public/art/'
m = json.load(open(OUT + 'manifest.json'))
art = json.load(open(ART))

def pic(key, name, facing):
    f = 'sudeen_n9_%s_%s.png' % (name, facing)
    shutil.copy(OUT + m[key]['file'], PUB + f)
    return {'file': f, 'originX': m[key]['originX']}
def four(name, up_left, up_right, down_left, down_right):
    return {'upLeft': pic(up_left, name, 'upLeft'), 'upRight': pic(up_right, name, 'upRight'),
            'downLeft': pic(down_left, name, 'downLeft'), 'downRight': pic(down_right, name, 'downRight')}

s = art['h1']
# Fury attack: the swept blade (1199, 1202) and the raised blade as the wind-up (1200, 1201)
s['buffPoses'] = {'fury': {
    'attack': four('furyAttack', 's1199_1', 's1202_2', 's1202_1', 's1199_2'),
    'windup': four('furyWindup', 's1200_1', 's1201_2', 's1201_1', 's1200_2'),
}}
# base attack (1204): only two facings drawn (down-left and up-right); the game mirrors the others
s['poses']['attack'] = {'downLeft': pic('s1204_3', 'attack', 'downLeft'), 'upRight': pic('s1204_4', 'attack', 'upRight')}
s['poses']['windup'] = {'downLeft': pic('s1204_1', 'windup', 'downLeft'), 'upRight': pic('s1204_2', 'windup', 'upRight')}
# Fury stance: 1206 is labelled on the sheet (NE, NW, SE, SW); 1207 is its mirror copy
s['buffed']['fury'] = four('furyStand', 's1206_2', 's1206_1', 's1206_4', 's1206_3')
# Furious Charge: wind-up, drive forward, shield impact, follow-through (1209, flipped to face right)
fr = []
for i in range(1, 5):
    f = 'sudeen_n9_fc_%d.png' % (i - 1)
    shutil.copy(OUT + m['s1209_%d' % i]['file'], PUB + f)
    fr.append({'file': f, 'originX': m['s1209_%d' % i]['originX']})
s['moves']['furiousCharge'] = {
    'note': "Furious Charge (roadmap 6.36), Suleiman's 7 Nov sequence: wind-up, drive forward, shield impact, follow-through. Faces right; left is the mirror image. chargeFrames are shown in turn while he runs; strikeFrom to strikeTo are the frames of the hit (impact, follow-through) before his shield push.",
    'frameMs': 110, 'chargeFrames': [1], 'strikeFrom': 2, 'strikeTo': 4, 'frames': fr}
s['note_nov9'] = "9 Nov set (roadmap 6.36): Fury attack (swept blade) and wind-up (raised blade) in four facings under buffPoses, Fury stance in four facings, base-form attack and wind-up (two facings, the rest mirrored), the four-frame Furious Charge."

# clash banners (6.35): the female archer (e3) and Layra (h3). The archer's sheet has no name plate.
cm = json.load(open(CLASH + 'manifest.json'))
os.makedirs(PUB + 'clash', exist_ok=True)
for who, key in (('archer', 'e3'), ('layra', 'h3')):
    c = cm[who]
    shutil.copy(CLASH + who + '_clash.webp', PUB + 'clash/%s_clash.webp' % who)
    entry = {'file': 'clash/%s_clash.webp' % who, 'tip': c['tip']}
    if who == 'layra':
        shutil.copy(CLASH + who + '_clash_name.webp', PUB + 'clash/%s_clash_name.webp' % who)
        entry['name'] = {'file': 'clash/%s_clash_name.webp' % who, 'x': c['name']['x'], 'y': c['name']['y']}
    art[key]['clash'] = entry
json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False)
