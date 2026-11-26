"""Hands sheet (roadmap 1.107, 26 Nov): one fighter's poses in the four facings exactly as the game picks them (a missing facing is the
other side mirrored; "M" marks a mirrored picture), so you can check that the weapon and shield stay in the same hands from pose to
pose in each facing. A mirror swaps the hands: in one facing, every pose should come from the same side of the mirror.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/hands_sheet.py <id> <poses comma separated: standing,battle,attack,guard...> <out.jpg>
"""

import json, sys
from PIL import Image, ImageDraw, ImageOps
art = json.load(open('src/data/art.json'))[sys.argv[1]]
poses = sys.argv[2].split(','); out = sys.argv[3]
MIRROR = {'upLeft': 'upRight', 'upRight': 'upLeft', 'downLeft': 'downRight', 'downRight': 'downLeft'}
def pick(group, facing):
    v = group.get(facing); flip = False
    if v is None: v = group.get(MIRROR[facing]); flip = True
    if v is None: return None
    f = v['file'] if isinstance(v, dict) else v
    if isinstance(v, dict) and v.get('flip'): flip = not flip
    im = Image.open('public/art/' + f).convert('RGBA')
    return (ImageOps.mirror(im) if flip else im), f + (' M' if flip else '')
def group(p):
    return art[p] if p in ('standing', 'battle', 'weak') else art['poses'][p]
F = ['upLeft', 'upRight', 'downLeft', 'downRight']; W = 250; H = 260
sh = Image.new('RGB', (len(poses) * W + 90, 4 * H), (30, 40, 30)); d = ImageDraw.Draw(sh)
for r, fc in enumerate(F):
    d.text((4, r * H + 120), fc, fill=(255, 255, 0))
    for c, p in enumerate(poses):
        got = pick(group(p), fc)
        if not got: continue
        im, name = got; im.thumbnail((W - 6, H - 22))
        bg = Image.new('RGBA', (W, H), (60, 90, 60, 255)); bg.alpha_composite(im, ((W - im.width) // 2, H - im.height - 2))
        sh.paste(bg.convert('RGB'), (90 + c * W, r * H)); d.text((92 + c * W, r * H + 2), p + ': ' + name.replace('sudeen_', '')[:30], fill=(255, 255, 255))
sh.save(out, quality=90)
