"""Layra's blessed look, 21 Nov (roadmap 6.86): Suleiman's three floating sheets (four views each, two rows of two):
floating neutral = her look under any Verse ("buffed"), concentrating while floating = her chant and releasing while
floating = her cast under a Verse ("buffPoses"). They replace the 31 Oct blessing stance (layra_iso_blessed_*).

Uses the kings' cutter (kings_raw.raw: clean, split the rows, cut each figure; make_kings.final_cut, the tile wiper)
with these sheets added. Sizes: set by eye next to her standing picture (SIZE), judged by the head and the feet,
because the head finder has no model for Layra's sheets at this size.

Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_layra_bless.py <work folder>
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import kings_sheets
B = kings_sheets.B + 'INBOX/2026-11-21/email/unzipped/Layra updated blessing sheets/Layra updated blessing sheets/'
SHEETS = {
    'layra_bless_float': (B + 'Layra Floating Neutral.png', 'grid'),
    'layra_bless_chant': (B + 'Layra concentrating spell while floating.png', 'grid'),
    'layra_bless_cast': (B + 'Layra Releasing spell while floating.png', 'grid'),
}
kings_sheets.SHEETS.update(SHEETS)
sys.argv = [sys.argv[0], sys.argv[1]]          # make_kings reads the work folder from argv[1]
import make_kings as mk                        # (its main part does not run on import)
from kings_raw import raw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
# facing: figure (1 to 4); looked at on a numbered sheet, then dev/tools/facing_check.py
VIEWS = {
    'layra_bless_float': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
    'layra_bless_chant': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
    'layra_bless_cast': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
}
# the cut size: picture pixels per sheet pixel, set by eye against her standing picture (200 pixels tall)
SIZE = {'layra_bless_float': 0.36, 'layra_bless_chant': 0.36, 'layra_bless_cast': 0.36}

def cut(sheet):
    parts, files = raw(sheet)
    out = {}
    for facing, fig in VIEWS[sheet].items():
        name = '%s_f%d.png' % (sheet, fig)
        cl, box = parts[fig - 1]
        mk.final_cut(cl, box, OUT + name, SIZE[sheet], keep=0.15)
    names = sorted({'%s_f%d.png' % (sheet, fig) for fig in VIEWS[sheet].values()})
    tiles = [t for t in (mk.tile_colour(f) for f in files) if t is not None]
    if tiles:
        T = np.median(np.array(tiles), axis=0)
        for n in names: mk.wipe_tile(OUT + n, T)
    for facing, fig in VIEWS[sheet].items():
        name = '%s_f%d.png' % (sheet, fig)
        out[facing] = {'file': name, 'originX': mk.feet_x(OUT + name)}
        print(sheet, facing, Image.open(OUT + name).size, file=sys.stderr)
    return out

if __name__ == '__main__':
    got = {s: cut(s) for s in SHEETS}
    art = json.load(open(ART)); e = art['h3']
    look, chant, cast = got['layra_bless_float'], got['layra_bless_chant'], got['layra_bless_cast']
    e['buffed'] = {v: look for v in ('swiftness', 'fury', 'stone')}
    e['buffPoses'] = {v: {'ready': look, 'chant': chant, 'cast': cast} for v in ('swiftness', 'fury', 'stone')}
    e['note_bless'] = ('21 Nov (6.86, dev/tools/make_layra_bless.py): under any Verse she floats (his 21 Nov floating neutral), '
                       'and concentrates and releases her spells floating (buffPoses chant and cast). Replaces the 31 Oct blessing stance.')
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json h3 written', file=sys.stderr)
