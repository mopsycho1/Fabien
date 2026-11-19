"""Facing check for four-view pictures (roadmap 1.64, Suleiman 18 Nov: "characters facing the wrong way ... especially
when I send a mirrored version ... we need to equip it with a means of doing so").

Every four-view set in src/data/art.json (upLeft, upRight, downLeft, downRight) should hold two pairs of mirror
images: the left view of a pair is (roughly) the right view flipped. If a "left" and a "right" picture look more
alike as they are than when one is flipped, both face the same way, and one of them is wrong (the archer's bow sheets
both pointed right, 1.45). The game's own "flip": true is applied first, as the game draws it.

  ~/.fabien-tools/venv/bin/python -I dev/tools/facing_check.py              check every set: fails on a NEW pair that faces one way
  ~/.fabien-tools/venv/bin/python -I dev/tools/facing_check.py remember     write today's pairs into facing_known.json
  (ruler.py measure runs the check at its end, so every new cut is checked.)
  ~/.fabien-tools/venv/bin/python -I dev/tools/facing_check.py sheet <out.jpg> [id or file prefix ...]
        a contact sheet: each set in one row, labelled NW (upLeft), NE (upRight), SW (downLeft), SE (downRight)
        as the game uses them, with the check's verdict. Look at it after every new cut.

The measure: the figures' outlines (solid pixels) cut to their box and brought to one size, then how much they
overlap as they are against how much they overlap with one flipped. Ends with ALL PASSED or FAILED (suspects).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = json.load(open(os.path.join(ROOT, 'src/data/art.json')))
VIEWS = ['upLeft', 'upRight', 'downLeft', 'downRight']
COMPASS = {'upLeft': 'NW', 'upRight': 'NE', 'downLeft': 'SW', 'downRight': 'SE'}
MARGIN = 0.03   # same-way overlap must beat the mirrored overlap by this much to be called a suspect
# Known on 19 Nov (dev/tools/facing_known.json): the pairs found when the check was built. They are to be looked at
# and fixed (roadmap 1.66), or marked right by eye ("ok"). The check fails only on pairs NOT in that list, so a new
# cut that faces the wrong way is caught at once. "id path pair": "fix" or "ok".
KNOWN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'facing_known.json')
KNOWN = json.load(open(KNOWN_PATH)) if os.path.exists(KNOWN_PATH) else {}


def sets():
    """Every four-view set: (id, path, {view: {file, flip}})."""
    out = []
    def walk(cid, o, path):
        if isinstance(o, dict):
            if all(v in o and isinstance(o[v], dict) and 'file' in o[v] for v in VIEWS):
                out.append((cid, path, {v: o[v] for v in VIEWS}))
                return
            for k, v in o.items():
                walk(cid, v, path + '/' + k)
    for cid, entry in ART.items():
        if isinstance(entry, dict):
            walk(cid, entry, '')
    return out


def picture(cell):
    p = cell['file'] if os.path.isabs(cell['file']) else os.path.join(ROOT, 'public/art', cell['file'])
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGBA')
    return ImageOps.mirror(im) if cell.get('flip') else im


def outline(im, size=(48, 72)):
    a = np.array(im)[:, :, 3] > 80
    ys, xs = np.where(a)
    if len(xs) == 0:
        return None
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return np.array(Image.fromarray((a * 255).astype('uint8')).resize(size)) > 127


def overlap(a, b):
    return (a & b).sum() / max(1, (a | b).sum())


def judge(cells):
    """For the up pair and the down pair: (same-way overlap, mirrored overlap, suspect?)."""
    res = {}
    for left, right in (('upLeft', 'upRight'), ('downLeft', 'downRight')):
        a, b = picture(cells[left]), picture(cells[right])
        if a is None or b is None or cells[left]['file'] == cells[right]['file']:
            res[left[:-4] or 'up'] = None
            continue
        oa, ob = outline(a), outline(b)
        if oa is None or ob is None:
            res[left] = None
            continue
        same, mirrored = overlap(oa, ob), overlap(oa, ob[:, ::-1])
        res['up' if left == 'upLeft' else 'down'] = (same, mirrored, same > mirrored + MARGIN)
    return res


def suspects():
    """Every pair whose two pictures face one way: [(key, line)]."""
    out = []
    for cid, path, cells in sets():
        for pair, r in judge(cells).items():
            if r and r[2]:
                out.append(('%s %s %s' % (cid, path, pair), '%s %s (%s pair: %s and %s) face one way: %.2f as they are, %.2f mirrored' % (
                    cid, path, pair, cells[pair + 'Left']['file'], cells[pair + 'Right']['file'], r[0], r[1])))
    return out


def selftest():
    """Proves the measure: a set whose right views are its left views flipped passes; one whose right views are its
    left views as they are (both facing one way) is caught. Built from Gaha's Swift stance, cut in temp files."""
    import tempfile
    base = ART['h2']['buffed']['swiftness']
    tmp = tempfile.mkdtemp()
    def cells(flipped):
        out = {}
        for left, right in (('upLeft', 'upRight'), ('downLeft', 'downRight')):
            im = picture(base[left])
            a, b = os.path.join(tmp, left + '.png'), os.path.join(tmp, right + ('_m' if flipped else '_s') + '.png')
            im.save(a)
            (ImageOps.mirror(im) if flipped else im).save(b)
            out[left], out[right] = {'file': a}, {'file': b}
        return out
    good = judge(cells(True))
    bad = judge(cells(False))
    ok = not any(r[2] for r in good.values() if r) and all(r and r[2] for r in bad.values())
    print(('PASS' if ok else 'FAIL') + ' self test: mirrored pairs pass, same-way pairs are caught')
    return 0 if ok else 1


def check(remember=False):
    found = suspects()
    if remember:
        known = {k: KNOWN.get(k, 'fix') for k, _ in found}
        json.dump(known, open(KNOWN_PATH, 'w'), indent=1, sort_keys=True)
        print('remembered', len(known), 'pairs in', KNOWN_PATH)
        return 0
    new = [line for k, line in found if k not in KNOWN]
    todo = sum(1 for k, _ in found if KNOWN.get(k) == 'fix')
    for line in new:
        print('WRONG WAY?', line)
    print('%d sets checked, %d known pairs still to fix (roadmap 1.66)' % (len(sets()), todo))
    print('FAILED (%d new pairs face one way: look with "sheet")' % len(new) if new else 'ALL PASSED')
    return 1 if new else 0


def sheet(out, wanted):
    rows = [(cid, path, cells) for cid, path, cells in sets()
            if not wanted or cid in wanted or any(cells[v]['file'].startswith(w) for v in VIEWS for w in wanted)]
    H, W = 150, 110
    img = Image.new('RGB', (W * 4 + 260, max(1, len(rows)) * (H + 26)), (52, 44, 36))
    d = ImageDraw.Draw(img)
    for i, (cid, path, cells) in enumerate(rows):
        y0 = i * (H + 26)
        verdict = judge(cells)
        sus = [p for p, r in verdict.items() if r and r[2]]
        d.text((4, y0 + 4), cid + ' ' + path[-34:], fill=(255, 220, 150))
        d.text((4, y0 + 20), ('CHECK: ' + ', '.join(sus) + ' pair faces one way') if sus else 'ok', fill=(255, 110, 90) if sus else (150, 220, 150))
        for j, v in enumerate(VIEWS):
            im = picture(cells[v])
            x0 = 260 + j * W
            if im is not None:
                bb = im.getbbox() or (0, 0, im.width, im.height)
                im = im.crop(bb)
                k = min((W - 8) / im.width, (H - 8) / im.height)
                im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))))
                img.paste(im, (x0 + (W - im.width) // 2, y0 + H - im.height), im)
            d.text((x0 + 4, y0 + H + 4), COMPASS[v] + ' ' + v + (' (flip)' if cells[v].get('flip') else ''), fill=(255, 255, 255))
    img.save(out)
    print('wrote', out, len(rows), 'sets')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'sheet':
        sheet(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) > 1 and sys.argv[1] == 'selftest':
        sys.exit(selftest())
    else:
        sys.exit(check(remember=len(sys.argv) > 1 and sys.argv[1] == 'remember'))
