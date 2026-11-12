"""Puts the archer's full-quality pictures (make_archer_hq.py) into src/data/art.json (e3).
Run from dev/:  python3 tools/wire_archer_hq.py <work folder with manifest.json>

What changes (roadmap 18.26, 18.2):
- stand, battle, aim (windup), shot (attack), hit (hurt), wounded (weak), kneel, down and victory
  use the sharp pictures. Her old pictures for the same poses are deleted from public/art.
- The shot: the sharp sheet is his first "arrow let fly" sheet (1079). The old pictures came from
  its twin (1080), whose first two figures face the camera but were wired as her two views from
  behind, so she showed her front when shooting away from us. That is put right here.
- kneel: the "reversed" sheet is the wounded sheet flipped, so its figures are read in flipped order.
- No sharp sheet exists for: dagger and guard, Poison Arrow, Smoke Bomb, her flaming look, dodge.
  Those keep the old small pictures, drawn bigger by the size ruler ("ruler" in art.json).
- Old-style pictures out (Battle 1.0 M2): "knocked" uses her hit pictures, "crumple" is dropped
  (kneel, then down, is the fall now).
"""
import sys, json, os
work = sys.argv[1].rstrip('/') + '/'
m = json.load(open(work + 'manifest.json'))
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data', 'art.json')
art = json.load(open(path)); a = art['e3']
four = lambda name: {k: dict(m[name][k]) for k in ('upLeft', 'upRight', 'downLeft', 'downRight')}
a['standing'] = four('stand')
a['battle'] = four('battle')
a['weak'] = four('wound1')
p = a['poses']
p['ready'] = four('battle'); p['windup'] = four('primed'); p['attack'] = four('fire')
p['hurt'] = four('hit'); p['knocked'] = four('hit'); p['kneel'] = four('wound2')
p['down'] = four('down'); p['victory'] = four('victory')
p.pop('crumple', None)
a['height'] = 100
a['note_hq'] = ('12 Nov (roadmap 18.26, 18.2): stand, battle, aim, shot, hit, wounded, kneel, down and victory are cut again from '
                'Suleiman\'s full-quality Email sheets (archer_hq_*, standing 300 pixels tall; cut by dev/tools/make_archer_hq.py, wired by '
                'wire_archer_hq.py). Dagger, Poison Arrow, Smoke Bomb, the flaming look and dodge have no full-quality sheet yet: they are '
                'the old small pictures, drawn bigger by the size ruler. "knocked" uses her hit pictures; "crumple" is gone.')
json.dump(art, open(path, 'w'), indent=2, ensure_ascii=False); open(path, 'a').write('\n')
used = json.dumps(art)
gone = [f for f in os.listdir(os.path.join(os.path.dirname(path), '..', '..', 'public', 'art')) if f.startswith('archer_') and f.endswith('.png') and '"' + f + '"' not in used]
print('not used by art.json any more:', ' '.join(sorted(gone)))
