"""Cuts Suleiman's three Gaha-against-Bull clash GIFs (roadmap 6.62) into frames for the game.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_clash_gifs.py [<folder with the GIFs>]

These are painted scenes on a flat brown floor (NOT black, so they are not effect GIFs and
make_gif_fx.py cannot cut them). The floor stays: the game shows each one as a framed panel.
Frames are saved as JPEG (no see-through needed, about a tenth of the size of PNG) in
public/art/clashgif/<name>_<n>.jpg, and the sizes and his own frame delay go to
src/data/clashGifs.json. Nothing else is changed.
"""
import glob, json, os, sys
from PIL import Image, ImageSequence

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/Documents/Fabien Blueprint/INBOX/2026-11-15b/clash_gifs/clash gifs')
OUT = os.path.join(ROOT, 'public', 'art', 'clashgif')
# file name in his folder -> short name in the game, and what it shows
FILES = {
    'Gaha and Bull Commander’s Combat Dance.gif': ('dance', 'Gaha and the Bull circle each other, then trade a blow'),
    'Gaha’s Spear Strike Animation.gif': ('strike', 'Gaha drives the spear in; the spark where it meets the mace'),
    'Isometric Spear and Mace Duel.gif': ('duel', 'spear and mace trade blows, a wide view'),
}

os.makedirs(OUT, exist_ok=True)
data = {'note': 'Suleiman 15 Nov, clash GIFs (roadmap 6.62). Frames are public/art/clashgif/<name>_<n>.jpg; ms is his own frame delay. '
                'Shown by src/clashGif.js as a framed panel when Gaha clashes with the Bull Commander.', 'gifs': {}}
for fname, (name, what) in FILES.items():
    path = os.path.join(SRC, fname)
    if not os.path.exists(path):
        # his folder uses a curly apostrophe; fall back to a loose match
        hits = [p for p in glob.glob(os.path.join(SRC, '*.gif')) if p.replace('’', "'").endswith(fname.replace('’', "'"))]
        if not hits:
            raise SystemExit('missing: ' + fname)
        path = hits[0]
    im = Image.open(path)
    frames, delays = [], []
    for fr in ImageSequence.Iterator(im):
        delays.append(fr.info.get('duration', 140))
        frames.append(fr.convert('RGB'))
    for old in glob.glob(os.path.join(OUT, name + '_*.jpg')):
        os.remove(old)
    for i, fr in enumerate(frames):
        fr.save(os.path.join(OUT, '%s_%d.jpg' % (name, i + 1)), quality=88, optimize=True)
    data['gifs'][name] = {'frames': len(frames), 'w': im.size[0], 'h': im.size[1], 'ms': delays[0] if len(set(delays)) == 1 else delays, 'what': what}
    print(name, im.size, len(frames), 'frames', delays[0], 'ms')
json.dump(data, open(os.path.join(ROOT, 'src', 'data', 'clashGifs.json'), 'w'), indent=2, ensure_ascii=False)
print('total', sum(os.path.getsize(p) for p in glob.glob(os.path.join(OUT, '*.jpg'))) // 1024, 'KB')
