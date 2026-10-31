# Phase 9 (31 Oct): puts the new isometric pictures (cut by make_iso31.py) into
# art.json, scales the old pictures each character keeps so they stay the same
# size next to the new ones, and lists old pictures nothing uses any more.
# Run from the repo root: python3 dev/tools/wire_iso31.py <cut dir>
import sys, os, json, shutil
from PIL import Image

CUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/work/iso/out/'
ART = 'public/art/'
art = json.load(open('src/data/art.json'))
man = json.load(open(CUT + 'manifest.json'))

def fileset(cid, name):
    return {f: dict(v) for f, v in man[cid][name].items()}

def one(cid, name):
    (f, v), = man[cid][name].items()
    return dict(v)

def files_of(entry):
    """Every picture file a unit's entry draws on the board (not its portraits)."""
    out = set()
    def walk(v):
        if isinstance(v, str):
            if v.endswith('.png'): out.add(v)
        elif isinstance(v, dict):
            if 'file' in v: out.add(v['file'])
            for k, w in v.items():
                if k not in ('portrait', 'portraitHurt', 'shout', 'file'): walk(w)
        elif isinstance(v, list):
            for w in v: walk(w)
    for k, v in entry.items():
        if k in ('portrait', 'portraitHurt', 'shout', 'note') or k.startswith('note'):
            continue
        walk(v)
    return out

before = {cid: files_of(art[cid]) for cid in man}
# how big the old pictures are drawn now: height / tallest standing picture
def tallest(entry):
    return max(Image.open(ART + (v if isinstance(v, str) else v['file'])).height for v in entry['standing'].values())
old_scale = {cid: art[cid]['height'] / tallest(art[cid]) for cid in man}

ISO = 'From Suleiman\'s isometric re-render (31 Oct, roadmap Phase 9): one picture facing up and one facing down per pose, the other two facings mirrored.'

# ---- Gaha
g = art['h2']
g['standing'] = fileset('h2', 'stand')
g['battle'] = fileset('h2', 'battle')
g['poses'].update({
    'ready': fileset('h2', 'battle'), 'windup': fileset('h2', 'battle'),
    'guard': fileset('h2', 'guard'), 'attack': fileset('h2', 'attack'), 'hurt': fileset('h2', 'hurt'),
    'throw': one('h2', 'throw'), 'throwRelease': one('h2', 'release'),
})
g['buffed']['swiftness'] = fileset('h2', 'swift')
g['buffed']['stone'] = fileset('h2', 'stone')
g['walk'] = {'frameMs': 75, 'upLeft': [one('h2', 'walk0'), one('h2', 'walk1'), one('h2', 'walk2')]}
g['note_iso'] = ISO + ' Walk: his 3 frames walking away to the upper left (19:33), played 1, 2, 3, 2; mirrored for the upper right. Spear Throw: his wind-up and release (21:47).'

# ---- Sudeen
s = art['h1']
s['standing'] = fileset('h1', 'stand')
s['battle'] = fileset('h1', 'battle')
s['poses'].update({
    'ready': fileset('h1', 'battle'), 'windup': fileset('h1', 'battle'),
    'guard': fileset('h1', 'guard'), 'attack': fileset('h1', 'attack'), 'hurt': fileset('h1', 'hurt'),
    'heal': fileset('h1', 'heal'),
})
s['note_iso'] = ISO

# ---- Layra
l = art['h3']
l['standing'] = fileset('h3', 'stand')
l['battle'] = fileset('h3', 'guard')
l['poses'].update({
    'ready': fileset('h3', 'guard'), 'guard': fileset('h3', 'guard'), 'attack': fileset('h3', 'guard'),
    'chant': fileset('h3', 'chant'), 'cast': fileset('h3', 'cast'), 'meditate': fileset('h3', 'meditate'),
    'hurt': fileset('h3', 'hurt'),
})
l['buffed'] = {b: fileset('h3', 'blessed') for b in ('swiftness', 'fury', 'stone')}
l['note_iso'] = ISO + ' Battle stance and staff strike: "defending herself" (12:59). Casting is two steps: concentrating (12:36), then casting (12:41). Under any Verse: his blessing stance (12:53).'

# ---- Rabdul
r = art['e4']
r['standing'] = fileset('e4', 'stand')
r['battle'] = fileset('e4', 'battle')
r['poses'] = {
    'ready': fileset('e4', 'battle'), 'windup': fileset('e4', 'battle'), 'guard': fileset('e4', 'battle'),
    'attack': fileset('e4', 'attack'), 'dodge': fileset('e4', 'dodge'), 'hurt': fileset('e4', 'hurt'),
    'chant': fileset('e4', 'chant'), 'cast': fileset('e4', 'cast'), 'fireAttack': fileset('e4', 'fire'),
}
r['note_iso'] = ISO + ' chant, cast and fireAttack (preparing and completing his enchantment, the flaming spear) are for Enchant (roadmap 4.1).'

# ---- the bull commander
b = art['e2']
b['standing'] = fileset('e2', 'stand')
b['battle'] = fileset('e2', 'battle')
b['poses'].update({
    'ready': fileset('e2', 'battle'), 'windup': fileset('e2', 'battle'), 'guard': fileset('e2', 'battle'),
    'attack': fileset('e2', 'attack'), 'hurt': fileset('e2', 'hurt'),
})
b['note_iso'] = ISO + ' Battle stance and guard: "guarding" (11:20).'

# copy the new pictures in
for cid in man:
    for name, fac in man[cid].items():
        for v in fac.values():
            shutil.copy(CUT + v['file'], ART + v['file'])

# old pictures each character keeps: rescale them if the new pictures are drawn at a new density
report = []
for cid in man:
    new_scale = art[cid]['height'] / tallest(art[cid])
    k = old_scale[cid] / new_scale
    kept = [f for f in files_of(art[cid]) if '_iso_' not in f]
    if abs(k - 1) > 0.03:
        for f in kept:
            im = Image.open(ART + f)
            im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).save(ART + f, optimize=True)
    report.append('%s scale %.3f -> %.3f (old pictures x%.2f): kept %s' % (cid, old_scale[cid], new_scale, k, sorted(kept)))

json.dump(art, open('src/data/art.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/art.json', 'a').write('\n')
unused = sorted(set().union(*before.values()) - set().union(*(files_of(art[c]) for c in art if isinstance(art[c], dict))))
print('\n'.join(report))
print('no longer used:', unused)
json.dump(unused, open(CUT + 'unused.json', 'w'))
