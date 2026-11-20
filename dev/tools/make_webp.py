"""Lossless WebP twins for the game's PNG pictures (roadmap 18.47).

  ~/.fabien-tools/venv/bin/python -I dev/tools/make_webp.py          # make or refresh every twin that is out of date
  ~/.fabien-tools/venv/bin/python -I dev/tools/make_webp.py --check  # only look: exit 1 if a twin is missing or stale
  ~/.fabien-tools/venv/bin/python -I dev/tools/make_webp.py --verify # also decode every pair and compare the pixels

Every PNG under public/art gets a same-named .webp beside it. The game fetches the WebP (src/artUrl.js);
the PNG stays the master (the Python tools and the jsdom tests read it, since node-canvas cannot read
WebP). Lossless means the pixels are the same, so the look cannot change. The list of what was
converted, with the hash of each PNG, is dev/tools/webp_manifest.json: that is how a re-cut PNG is
noticed. Run this after any cutter that writes a PNG, then commit the .webp files with it.
The mouse cursors (ui/cursor_*.png) stay PNG: the browser reads those from CSS.
"""
import hashlib, json, os, sys
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


def convert(rel):
    src = os.path.join(ART, rel)
    dst = src[:-4] + '.webp'
    im = Image.open(src)
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    im.save(dst, 'WEBP', lossless=True, quality=100, method=6)
    return rel


def same_pixels(rel):
    a = Image.open(os.path.join(ART, rel)).convert('RGBA')
    b = Image.open(os.path.join(ART, rel[:-4] + '.webp')).convert('RGBA')
    if a.size != b.size:
        return rel, 'size'
    pa, pb = a.load(), b.load()
    for y in range(a.size[1]):
        for x in range(a.size[0]):
            p, q = pa[x, y], pb[x, y]
            if p[3] != q[3] or (p[3] and p[:3] != q[:3]):  # (colour under a see-through pixel does not show)
                return rel, 'pixel %d,%d' % (x, y)
    return rel, None


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    files = pngs()
    todo = [r for r in files if man.get(r) != sha(r) or not os.path.exists(os.path.join(ART, r[:-4] + '.webp'))]
    gone = [r for r in man if r not in files]
    if mode == '--check':
        for r in todo[:20]:
            print('STALE or missing WebP:', r)
        for r in gone[:20]:
            print('PNG gone, WebP left over:', r)
        print('webp check:', 'OK' if not todo and not gone else 'FAILED (%d stale, %d left over)' % (len(todo), len(gone)))
        sys.exit(0 if not todo and not gone else 1)
    with Pool() as pool:
        for i, _ in enumerate(pool.imap_unordered(convert, todo, 4)):
            if i % 200 == 199:
                print(i + 1, 'of', len(todo))
    for r in gone:
        w = os.path.join(ART, r[:-4] + '.webp')
        if os.path.exists(w):
            os.remove(w)
    man = {r: sha(r) for r in files}
    json.dump(man, open(MANIFEST, 'w'), indent=0, sort_keys=True)
    png = sum(os.path.getsize(os.path.join(ART, r)) for r in files)
    web = sum(os.path.getsize(os.path.join(ART, r[:-4] + '.webp')) for r in files)
    print('converted %d, removed %d; %d pictures: PNG %.1f MB, WebP %.1f MB (%.0f percent)' % (len(todo), len(gone), len(files), png / 1048576, web / 1048576, 100 * web / png))
    if mode == '--verify':
        with Pool() as pool:
            bad = [x for x in pool.imap_unordered(same_pixels, files, 8) if x[1]]
        print('pixel check:', 'every pair identical' if not bad else 'DIFFERENT: %s' % bad[:10])
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
