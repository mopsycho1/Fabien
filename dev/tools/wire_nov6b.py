# Wires the pictures cut by make_nov6b.py into src/data/art.json (roadmap 6.27, 6.30, 6.32, 6.33, 4.6).
# Run from dev/:  python3 tools/wire_nov6b.py <out dir of make_nov6b.py> [<clash dir>]
# Facings: the sheets list figures NW, NE, SW, SE = f1 to f4. Rabdul and the bull face the heroes
# with their up-left and down-left pictures only (the game mirrors the rest); Tayo and the archer get all four.
import sys, json, shutil, os
OUT = sys.argv[1].rstrip('/') + '/'
CLASH = (sys.argv[2].rstrip('/') + '/') if len(sys.argv) > 2 else None
ART = '../src/data/art.json'
m = json.load(open(OUT + 'manifest.json'))
art = json.load(open(ART))
used = set()

def p(who, name, f):
    v = m[who][name][f]; used.add(v['file']); return dict(v)
def four(who, name):
    return {'upLeft': p(who, name, 'f1'), 'upRight': p(who, name, 'f2'), 'downLeft': p(who, name, 'f3'), 'downRight': p(who, name, 'f4')}
def two(who, name, up='f1', down='f3'):
    return {'upLeft': p(who, name, up), 'downLeft': p(who, name, down)}

# ---- Rabdul (e4)
r = art['e4']
r['weak'] = two('rabdul', 'weak')
r['poses']['down'] = two('rabdul', 'down')
r['poses']['victory'] = two('rabdul', 'victory')
# the double hit: the spear's two heads strike one after the other (his "use 2 and 3": figures 2 and 3)
r['moves'] = {'doubleHit': {'note': "Rabdul's double hit (roadmap 4.6): one head strikes, then the other. His 3 Nov 12:05 sheet, figures 2 and 3; flat frames, flipped to face the target.", 'frameMs': 420,
                            'frames': [p('rabdul', 'multi', 'f2'), p('rabdul', 'multi', 'f3')]}}
r['enchanted']['moves'] = {'doubleHit': {'note': "Same under his Enchant: the flame spear (3 Nov 12:07).", 'frameMs': 420,
                                        'frames': [p('rabdul', 'multiFire', 'f2'), p('rabdul', 'multiFire', 'f3')]}}
r['note_nov6b'] = "Nov set (roadmap 6.27): weakened, defeated, victory, the two-headed double hit (plain and flame)."

# ---- Tayo (e1): his own full sheet replaces the stand-in art (4.3)
t = art['e1']
t['standing'] = four('tayo', 'stand')
t['battle'] = four('tayo', 'battle')
t['weak'] = four('tayo', 'weak')
t['poses'].update({
    'ready': four('tayo', 'battle'), 'windup': four('tayo', 'battle'), 'attack': four('tayo', 'punch'),
    'guard': four('tayo', 'guard'), 'hurt': four('tayo', 'hurt'),
    'down': four('tayo', 'down'), 'victory': four('tayo', 'victory'),
})
t['enchanted'] = {
    'note': "Under Rabdul's Enchant (roadmap 6.30): flame gauntlets. His 3 Nov 03:47 to 12:12 sheets.",
    'standing': four('tayo', 'standFire'), 'battle': four('tayo', 'battleFire'),
    'poses': {'attack': four('tayo', 'punchFire'), 'guard': four('tayo', 'block'),
              'ready': four('tayo', 'battleFire'), 'windup': four('tayo', 'battleFire')},
}
t['note_nov6b'] = "Nov set (roadmap 6.30): neutral, battle, punch, guard, damage, weakened, defeated (does not fully collapse), victory, and the flame-imbued set. Replaces the stand-in art. Earth Drive pictures stay as they were."

# ---- the female archer (e3): replaces the 29 Oct art where they overlap (6.2)
a = art['e3']
a['standing'] = four('archer', 'stand')
a['battle'] = four('archer', 'battle')
a['weak'] = four('archer', 'wound1')
a['poses'].update({
    'ready': four('archer', 'battle'), 'windup': four('archer', 'primed'), 'attack': four('archer', 'fire2'),
    'guard': four('archer', 'dagger'), 'dagger': four('archer', 'dagger'), 'hurt': four('archer', 'hit'),
    'kneel': four('archer', 'wound2'), 'down': four('archer', 'down'), 'victory': four('archer', 'victory'),
})
a['note_nov6b'] = "Nov set (roadmap 6.32): standing, battle, bow primed, arrow released, dagger, hit, wounded, defeated, victory in four facings. The poison-aim crouches (1077, 1078) are cut but not used yet."

# ---- the bull commander (e2)
b = art['e2']
b['weak'] = two('bull', 'weak')
b['poses']['victory'] = two('bull', 'victory')
b['poses']['down'] = two('bull', 'down')
b['poses']['throw'] = two('bull', 'throw1')
b['poses']['throwRelease'] = two('bull', 'throw2', up='f3', down='f1')   # this sheet lists SW, SE, NW, NE
b['moves'] = {'shieldFlight': {'note': "The shield in flight (3 Nov 15:57), spun through its four pictures.", 'frameMs': 70,
                              'frames': [p('bull', 'shield', 'f%d' % i) for i in (1, 2, 3, 4)]}}
b['buffed'] = {'bloodied': two('bull', 'bl3')}
b['buffPoses'] = {'bloodied': {
    'ready': two('bull', 'bl3'), 'guard': two('bull', 'bl3'),
    'windup': two('bull', 'bl4'), 'attack': two('bull', 'bl5', up='f3', down='f1'),
    'throw': two('bull', 'bl1'), 'throwRelease': two('bull', 'bl6', up='f3', down='f1'),
}}
b['note_nov6b'] = "Nov set (roadmap 6.33): victory, weakened, defeated, shield throw and shield in flight, and the Bloodied Press look (stance, wind-up, strike, throw) that shows while he has Bloodied stacks."

# ---- clash banners
if CLASH:
    cm = json.load(open(CLASH + 'clashmanifest.json')) if os.path.exists(CLASH + 'clashmanifest.json') else json.load(open(CLASH + 'manifest.json'))
    os.makedirs('../public/art/clash', exist_ok=True)
    for who, key in (('rabdul', 'e4'), ('tayo', 'e1')):
        c = cm[who]
        shutil.copy(CLASH + 'clash%s_clash.webp' % who, '../public/art/clash/%s_clash.webp' % who)
        shutil.copy(CLASH + 'clash%s_clash_name.webp' % who, '../public/art/clash/%s_clash_name.webp' % who)
        art[key]['clash'] = {'file': 'clash/%s_clash.webp' % who, 'tip': c['tip'], 'name': {'file': 'clash/%s_clash_name.webp' % who, 'x': c['name']['x'], 'y': c['name']['y']}}

json.dump(art, open(ART, 'w'), indent=2)
for f in used: shutil.copy(OUT + f, '../public/art/' + f)
print(len(used), 'pictures copied')
