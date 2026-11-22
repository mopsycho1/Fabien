"""Facing sheet (roadmap 1.95, 22 Nov: "Claude keeps depicting him attacking in the wrong direction ... we need a lasting solution").
Draws the poses of one fighter in the four facings EXACTLY as the game picks them (a missing facing is its mirror, "M"), so a
wrong view stands out next to the others: a lunge, a blade, a shield arm or a face pointing the other way. Suleiman's compass
plates are not always right (the 20 Nov Sudeen slash sheet has them mirrored): read every new sheet off this, never off its plates.
Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/facing_sheet.py <out.jpg> <id> <pose list, e.g. standing,battle,poses.attack>
"""
import json, sys
from PIL import Image, ImageDraw
art=json.load(open('src/data/art.json'))
cid=sys.argv[2]; poses=sys.argv[3].split(','); out=sys.argv[1]
MIR={'upLeft':'upRight','upRight':'upLeft','downLeft':'downRight','downRight':'downLeft'}
e=art[cid]; rows=[]
for p in poses:
    parts=p.split('.'); src=e
    for k in parts: src=src.get(k,{}) if isinstance(src,dict) else {}
    cells=[]
    for fac in ['upLeft','upRight','downLeft','downRight']:
        v=src.get(fac); mir=False
        if not isinstance(v,dict): v=src.get(MIR[fac]); mir=True
        if not isinstance(v,dict): cells.append((fac,None)); continue
        im=Image.open('public/art/'+v['file']).convert('RGBA')
        if bool(v.get('flip'))!=mir: im=im.transpose(Image.FLIP_LEFT_RIGHT)
        im.thumbnail((220,220)); cells.append((fac+(' M' if mir else ''),im))
    rows.append((p,cells))
sh=Image.new('RGB',(4*230+90,len(rows)*240),(40,60,40)); d=ImageDraw.Draw(sh)
for y,(p,cells) in enumerate(rows):
    d.text((2,y*240+110),p[:14],fill=(255,255,0))
    for x,(n,im) in enumerate(cells):
        if im: sh.paste(im,(90+x*230,y*240+14),im)
        d.text((90+x*230,y*240+2),n,fill=(255,255,255))
sh.save(out)
