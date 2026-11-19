"""Size check by drawn area (roadmaps 1.61 and 1.63).

The size ruler sets each picture family's scale from the head. Where the head cannot be read (a turned-away
head, horns, bronze), a family can come out too big or too small. This compares a family's drawn size
(the square root of its opaque area at its ruler scale, the median of its views) with a reference family
of the same fighter, and fails any pair outside its allowed range. The pairs are in PAIRS below.

  ~/.fabien-tools/venv/bin/python -I dev/tools/size_check.py
Prints one line per pair and ends with ALL PASSED or FAILED.
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = json.load(open(os.path.join(ROOT, 'src/data/art.json')))

# (fighter, family, reference family, lowest, highest): the family's size against the reference.
# Poses with arms or a weapon held out cover more area than a stance, so their range sits a little higher.
PAIRS = [
    ('h2', 'gaha_n6_sonicPrep_', 'gaha_n6_swiftStand_', 0.95, 1.15),
    ('h2', 'gaha_n6_sonicClose_', 'gaha_n6_swiftStand_', 0.95, 1.15),
    ('h2', 'gaha_n6_sonicThrow_', 'gaha_n6_swiftStand_', 0.95, 1.15),
    ('e2', 'bull_flame_stand_', 'bull_iso_stand_', 0.92, 1.06),
    ('e2', 'bull_flame_battle_', 'bull_iso_battle_', 0.92, 1.08),
    ('e2', 'bull_flame_windup_', 'bull_iso_attack_', 0.92, 1.08),
    ('e2', 'bull_flame_strike_', 'bull_iso_attack_', 0.92, 1.08),
    ('e2', 'bull_n6b_throw1_', 'bull_iso_battle_', 0.85, 1.05),
    ('e2', 'bull_n6b_throw2_', 'bull_iso_battle_', 0.85, 1.05),
]


def size(cid, fam):
    ruler = ART[cid].get('ruler', {})
    files = sorted(f for f in os.listdir(os.path.join(ROOT, 'public/art')) if f.startswith(fam) and f.endswith('.png'))
    out = []
    for f in files:
        alpha = np.array(Image.open(os.path.join(ROOT, 'public/art', f)).convert('RGBA'))[:, :, 3] > 80
        out.append(alpha.sum() ** 0.5 * ruler.get(f, {}).get('scale', 1.0))
    return float(np.median(out)) if out else None


bad = 0
for cid, fam, ref, lo, hi in PAIRS:
    a, b = size(cid, fam), size(cid, ref)
    if not a or not b:
        print('FAIL %s: pictures not found' % fam); bad += 1; continue
    r = a / b
    ok = lo <= r <= hi
    bad += not ok
    print('%s %s x%.2f against %s (allowed %.2f to %.2f)' % ('PASS' if ok else 'FAIL', fam.rstrip('_'), r, ref.rstrip('_'), lo, hi))
print('FAILED' if bad else 'ALL PASSED')
sys.exit(1 if bad else 0)
