"""WebP twins for the game's PNG pictures (roadmap 18.47, lossy since 18.48).

  ~/.fabien-tools/venv/bin/python -I dev/tools/make_webp.py          # make or refresh every twin that is out of date
  ~/.fabien-tools/venv/bin/python -I dev/tools/make_webp.py --check  # only look: exit 1 if a twin is missing or stale
  ~/.fabien-tools/venv/bin/python -I dev/tools/make_webp.py --verify # also decode every pair and measure the difference

Every PNG under public/art gets a same-named .webp beside it. The game fetches the WebP (src/artUrl.js);
the PNG stays the master (the Python tools and the jsdom tests read it, since node-canvas cannot read
WebP). Each twin is lossy WebP at quality 90 (alpha kept at 100), unless that looks different from the
PNG (a mean error over 14 or an edge error over 72 on the colour as it shows, that is colour times
opacity, 0 to 255; q90 pictures sit at 2 to 12 on the mean, checked by eye on a contact sheet): then quality 95, then lossless. A tiny picture (PNG under 12 KB) stays lossless. The tier of each picture is in dev/tools/webp_manifest.json. The list of what was
converted, with the hash of each PNG, is dev/tools/webp_manifest.json: that is how a re-cut PNG is
noticed. Run this after any cutter that writes a PNG, then commit the .webp files with it.
The mouse cursors (ui/cursor_*.png) stay PNG: the browser reads those from CSS.
"""
import hashlib, io, json, os, sys
import numpy as np
from multiprocessing import Pool
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'public', 'art')
MANIFEST = os.path.join(ROOT, 'dev', 'tools', 'webp_manifest.json')


def pngs():
    out = []
    for dp, _, fs in os.walk(ART):
        for f in fs:
            if f.endswith('.png') and not f.startswith('cursor_'):
                out.append(os.path.relpath(os.path.join(dp, f), ART))
    return sorted(out)


def sha(rel):
    with open(os.path.join(ART, rel), 'rb') as fh:
        return hashlib.sha1(fh.read()).hexdigest()


SETTINGS = 'lossy-q90-v2'  # change this when the way twins are made changes: every twin is then made again
MEAN_MAX, EDGE_MAX = 14.0, 72  # how far a lossy picture may differ (colour times opacity, 0 to 255); judged by eye on dev/tools/webp_sheet.py


def shown(im):
    """The picture as it shows on screen: colour times opacity (what is under a see-through pixel never shows)."""
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    return a[..., :3] * (a[..., 3:4] / 255), a[..., 3]


def looks_same(a, b):
    """True if b (decoded twin) is close enough to a (the PNG). Returns (ok, mean error, edge error)."""
    pa, aa = shown(a)
    pb, ab = shown(b)
    d = np.abs(pa - pb).max(axis=2)
    seen = aa > 8  # only pixels that show
    if not seen.any():
        return True, 0.0, 0.0
    mean = float(d[seen].mean())
    edge = float(np.percentile(d[seen], 99.9))
    alpha = float(np.abs(aa - ab).max())
    return (mean <= MEAN_MAX and edge <= EDGE_MAX and alpha <= 16), mean, edge


def encode(im, **kw):
    b = io.BytesIO()
    im.save(b, 'WEBP', **kw)
    b.seek(0)
    return b


def convert(rel):
    src = os.path.join(ART, rel)
    dst = src[:-4] + '.webp'
    im = Image.open(src)
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    pick, tier = None, 'lossless'
    if os.path.getsize(src) > 12000:  # (a tiny picture gains nothing from lossy)
        for q in (90, 95):
            b = encode(im, quality=q, alpha_quality=100, method=5)
            ok, _, _ = looks_same(im, Image.open(b))
            b.seek(0)
            if ok:
                pick, tier = b, 'q%d' % q
                break
    if pick is None:
        pick = encode(im, lossless=True, quality=100, method=6)
    with open(dst, 'wb') as fh:
        fh.write(pick.getvalue())
    return rel, tier


def same_pixels(rel):
    a = Image.open(os.path.join(ART, rel)).convert('RGBA')
    b = Image.open(os.path.join(ART, rel[:-4] + '.webp')).convert('RGBA')
    if a.size != b.size:
        return rel, 'size'
    ok, mean, edge = looks_same(a, b)
    return rel, None if ok else 'mean %.1f edge %.0f' % (mean, edge)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    files = pngs()
    same = man.get('_settings') == SETTINGS
    todo = [r for r in files if not same or man.get(r) != sha(r) or not os.path.exists(os.path.join(ART, r[:-4] + '.webp'))]
    gone = [r for r in man if not r.startswith('_') and r not in files]
    if mode == '--check':
        for r in todo[:20]:
            print('STALE or missing WebP:', r)
        for r in gone[:20]:
            print('PNG gone, WebP left over:', r)
        print('webp check:', 'OK' if not todo and not gone else 'FAILED (%d stale, %d left over)' % (len(todo), len(gone)))
        sys.exit(0 if not todo and not gone else 1)
    tiers = {}
    with Pool() as pool:
        for i, (rel, tier) in enumerate(pool.imap_unordered(convert, todo, 4)):
            tiers[rel] = tier
            if i % 200 == 199:
                print(i + 1, 'of', len(todo))
    counts = {}
    for t in tiers.values():
        counts[t] = counts.get(t, 0) + 1
    print('tiers:', counts)
    for r in gone:
        w = os.path.join(ART, r[:-4] + '.webp')
        if os.path.exists(w):
            os.remove(w)
    old = man
    man = {r: sha(r) for r in files}
    man['_settings'] = SETTINGS
    man['_tiers'] = {**(old.get('_tiers', {}) if same else {}), **tiers}
    json.dump(man, open(MANIFEST, 'w'), indent=0, sort_keys=True)
    png = sum(os.path.getsize(os.path.join(ART, r)) for r in files)
    web = sum(os.path.getsize(os.path.join(ART, r[:-4] + '.webp')) for r in files)
    print('converted %d, removed %d; %d pictures: PNG %.1f MB, WebP %.1f MB (%.0f percent)' % (len(todo), len(gone), len(files), png / 1048576, web / 1048576, 100 * web / png))
    if mode == '--verify':
        with Pool() as pool:
            bad = [x for x in pool.imap_unordered(same_pixels, files, 8) if x[1]]
        print('look check:', 'every twin within the limit (mean %.0f, edge %d)' % (MEAN_MAX, EDGE_MAX) if not bad else 'DIFFERENT: %s' % bad[:10])
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
