"""SUPERSEDED 21 Nov (6.87): the kings' faces now come from Suleiman's expression sheets (dev/tools/make_expressions.py).
Kept only as the record of how the 10.36 stand-ins were made; running it would overwrite art.json's portraits.

The two kings' portraits (roadmap 10.36): head and shoulders cut from their neutral sheets.

  ~/.fabien-tools/venv/bin/python -I dev/tools/make_king_portraits.py [work folder]

The kings have no face sheets (the other fighters' faces come from expression sheets), so the portrait is
cropped from the neutral stance, at the sheet's own size, from the view that shows the face best. It goes
through kings_raw.py first (the white floor tile is removed and the figure cut out, the same as the game
pictures). The crop boxes below are by eye; the result is a see-through picture about 150 to 260 pixels
wide, framed like the others: the head high in the picture, the shoulders cut straight at the bottom.
Writes public/art/alagara_face.png and gadara_face.png and puts "portrait" into art.json for h5 and e5.
Then run make_webp.py for the WebP twins.
"""
import json, os, subprocess, sys, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'public', 'art')

# (sheet name, id in art.json, figure number on the sheet, crop box (left, top, right, bottom), output file)
KINGS = [
    ('alagara_stand', 'h5', 4, (55, 0, 290, 238), 'alagara_face.png'),   # faces the viewer's right, both eyes show
    ('gadara_stand', 'e5', 1, (80, 0, 252, 168), 'gadara_face.png'),     # the staff's hook stops at the box edge
]

def main():
    work = (sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='kingfaces_')).rstrip('/') + '/'
    subprocess.check_call([sys.executable, '-I', os.path.join(HERE, 'kings_raw.py'), work] + [k[0] for k in KINGS])
    art = json.load(open(os.path.join(ROOT, 'src', 'data', 'art.json')))
    for sheet, uid, n, box, out in KINGS:
        im = Image.open(work + '%s_raw%d.png' % (sheet, n)).convert('RGBA')
        face = im.crop(box)
        face.save(os.path.join(ART, out))
        print(out, face.size)
        art[uid]['portrait'] = out
    # art.json is written the way the other cutters write it (two spaces)
    json.dump(art, open(os.path.join(ROOT, 'src', 'data', 'art.json'), 'w'), indent=2, ensure_ascii=False)
    open(os.path.join(ROOT, 'src', 'data', 'art.json'), 'a').write('\n')

if __name__ == '__main__':
    main()
