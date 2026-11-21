"""Pose sizes (roadmap 18.52, after 1.85: Alagara was drawn far bigger than everyone at low health).

The question for every picture of every fighter: is the BODY drawn at the same size as in the standing
picture, within 10 percent? A crouch or a fall is shorter than standing, so height alone cannot answer it.
The body size is read from the head (dev/tools/ruler_lib.find_head, the size ruler's head finder), times
the scale the game draws the picture at. Where the head finder cannot read a family (the kings' afro and
flame hair, glowing orbs, a head hidden by an arm: its readings disagree with each other), the size
judged by eye is pinned in dev/tools/pose_sizes.json "eye" (a family next to the standing picture at the
size drawn, judged by the head and the feet).

A second, simpler check runs in the test without Python (dev/tests/n99.cjs): no picture is drawn more than
10 percent TALLER than standing, unless pose_sizes.json "tall" gives the reason (a weapon over the head).

Run:  ~/.fabien-tools/venv/bin/python dev/tools/pose_size.py audit [ids]
      ~/.fabien-tools/venv/bin/python dev/tools/pose_size.py table [ids]   (every family's numbers)
      ~/.fabien-tools/venv/bin/python dev/tools/pose_size.py pin [ids]     (after sizing by eye: store each family's height)
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from ruler_lib import ROOT, load_art
import ruler

LOW, HIGH = 0.90, 1.10
AGREE = 0.15          # a family's head readings must agree within 15 percent of their middle to be trusted
SIZES = os.path.join(ROOT, 'dev', 'tools', 'pose_sizes.json')

DRIFT = 0.05         # a family sized by eye fails if its drawn height moves more than 5 percent: look again

def drawn_heights(cid, art):
    """{family: drawn height against standing (middle picture)}: picture height x the scale the game draws it at."""
    from ruler_lib import inventory, family, open_art
    e = art[cid]; r = e.get('ruler', {})
    h = lambda f: open_art(f).height * r.get(f, {}).get('scale', 1.0)
    st = sorted(h(p['file']) for p in inventory(e) if p['label'].startswith('standing'))
    st = st[len(st) // 2]
    out = {}
    for p in inventory(e):
        out.setdefault(family(p['file']), []).append(h(p['file']) / st)
    return {k: float(np.median(v)) for k, v in out.items()}

def families(cid, art):
    """{family: {'heads': [head x scale per picture], 'scale': s}} for one fighter."""
    res = ruler.measure(cid, art[cid])
    ruler_now = art[cid].get('ruler', {})
    out = {}
    for f, r in res.items():
        fam = out.setdefault(r['family'], {'heads': [], 'files': []})
        fam['files'].append(f)
        if r['head']:
            fam['heads'].append(r['head'] * ruler_now.get(f, {}).get('scale', 1.0))
    return out

def judge(cid, fams, eye, skip=(), heights={}):
    """Returns [(family, size or None, how, ok)]."""
    rows = []
    for fam, v in fams.items():
        if fam in skip: continue
        if fam in eye:
            size = eye[fam]['size']; was = eye[fam].get('h'); now = heights.get(fam)
            if was and now and abs(now / was - 1) > DRIFT:
                rows.append((fam, size, 'sized by eye at height %.2f, now %.2f: the picture changed, look again and pin it anew' % (was, now), False)); continue
            rows.append((fam, size, 'eye: ' + eye[fam].get('why', ''), LOW <= size <= HIGH)); continue
        hs = v['heads']
        if not hs:
            rows.append((fam, None, 'no head found and no size by eye', False)); continue
        mid = float(np.median(hs))
        agree = all(abs(h / mid - 1) <= AGREE for h in hs)
        if not agree:
            rows.append((fam, mid, 'head readings disagree (%s): needs a size by eye' % ' '.join('%.2f' % h for h in hs), False)); continue
        rows.append((fam, mid, 'head', LOW <= mid <= HIGH))
    return rows

def main(cmd, ids):
    art = load_art()
    sizes = json.load(open(SIZES)); eye_all = sizes.get('eye', {}); skip_all = sizes.get('skip', {})
    ids = ids or [c for c in art if c in ruler.HEADS]
    bad = 0
    for cid in ids:
        rows = judge(cid, families(cid, art), eye_all.get(cid, {}), skip_all.get(cid, {}), drawn_heights(cid, art))
        fails = [r for r in rows if not r[3]]
        bad += len(fails)
        print('%s: %d families, %d off' % (cid, len(rows), len(fails)))
        for fam, size, how, ok in rows:
            if cmd == 'table' or not ok:
                print('   %s %-30s %s  %s' % ('ok  ' if ok else 'FAIL', fam, '%.2f' % size if size else ' ?  ', how))
    print('ALL PASSED' if not bad else 'FAILED: %d' % bad)
    return 1 if bad else 0

def pin(ids):
    """Writes each eye record's drawn height ("h"), after looking: pose_size.py pin [ids]"""
    art = load_art(); sizes = json.load(open(SIZES))
    for cid, recs in sizes.get('eye', {}).items():
        if ids and cid not in ids: continue
        hs = drawn_heights(cid, art)
        for fam, rec in recs.items():
            if fam in hs: rec['h'] = round(hs[fam], 3)
    json.dump(sizes, open(SIZES, 'w'), indent=1, ensure_ascii=False); open(SIZES, 'a').write('\n')
    print('pinned the drawn heights')

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'pin':
        pin(sys.argv[2:]); sys.exit(0)
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'audit', sys.argv[2:]))
