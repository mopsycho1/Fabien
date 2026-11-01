# Phase 4: puts the pictures cut by make_phase4.py into src/data/art.json.
# Run from dev/:  python3 tools/wire_phase4.py
import json
P = '../src/data/art.json'
art = json.load(open(P))
m = json.load(open('/home/claude/work/phase4/manifest.json'))
f = lambda file, ox: {'file': file, 'originX': ox}

# Enchanted looks ("enchanted" in art.json: used while Rabdul's Enchant is on the unit)
bull = m['e2']
bull_battle = {'downLeft': bull['downLeft'], 'upLeft': bull['upLeft']}
art['e2']['enchanted'] = {
    'note': "Under Rabdul's Enchant (roadmap 4.1): his 29 Oct sheets 'bull attacking with flame weaponry' 1 (stance) and 3 (the lunge, facing right; mirrored for left).",
    'battle': bull_battle,
    'poses': {'ready': bull_battle, 'windup': bull_battle, 'guard': bull_battle, 'attack': {'downRight': bull['attack_downRight']}},
}
ox = {'downRight': 0.5, 'upRight': 0.4, 'upLeft': 0.52, 'downLeft': 0.556}  # feet centres, measured
aim = {k: f(v['file'], ox[k]) for k, v in m['e3'].items()}
art['e3']['enchanted'] = {
    'note': "Under Rabdul's Enchant (roadmap 4.1): his 29 Oct sheet 'Archer imbued with rabdul's enchantment', her flaming bow drawn in four facings.",
    'battle': aim,
    'poses': {'ready': aim, 'windup': aim, 'attack': aim},
}
art['e4']['enchanted'] = {
    'note': "Under his own Enchant (roadmap 4.1): he strikes with his flaming spear (his 31 Oct isometric fireAttack).",
    'poses': {'attack': art['e4']['poses']['fireAttack']},
}
# Tayo's Earth Drive (roadmap 4.2): his four frames, facing right (mirrored for left)
art['e1'].setdefault('moves', {})['earthDrive'] = {
    'note': "Earth Drive (roadmap 4.2): fist raised, swinging down, punching the ground, the follow-through. His 29 Oct sheet 'earth drive without effects'.",
    'frameMs': 110,
    'frames': m['e1'],
}
json.dump(art, open(P, 'w'), indent=2, ensure_ascii=False)
open(P, 'a').write('\n')
print('ok')
