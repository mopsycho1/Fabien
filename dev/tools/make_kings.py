"""The two kings' pictures (roadmap 6.74 King Alagara, 6.75 Gadara the Greater; Phase 10).

Every sheet is in kings_sheets.py. kings_raw.py cuts each figure at its sheet's own size into a
work folder; this script picks the true views, sizes each sheet through the size ruler's head
finder (the head is as big as in his standing picture) and writes public/art/<name>_f<n>.png and
the "e5" (Gadara) and "h5" (Alagara) entries of src/data/art.json.

WHICH WAY THE FIGURES FACE (looked at on a numbered contact sheet, 20 Nov). Only true views are
cut; the game mirrors the other side. Suleiman's two-by-two skill sheets for Gadara are front
views on top (1 faces down-left) and back views below (3 faces up-left). Several of Alagara's
skill sheets (Claim, Weak) have no back view at all: the front view stands in for the back.

SIZES. The standing picture is STAND_PX tall. Every other sheet is scaled so his head is as big
as in the standing picture (ruler_lib.find_head with the head boxes below). Where the head finder
reads nonsense (more than 30 percent off the sheet's height ratio), HAND gives the size and says why.
After this, run ruler.py measure: the game draws each picture at the ruler's scale.

Run:  ~/.fabien-tools/venv/bin/python -I dev/tools/make_kings.py <work folder>
(after kings_raw.py <work folder>)
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage
from kings_raw import raw
from sheet4 import final_cut
from ruler_lib import head_model, find_head

WORK = sys.argv[1].rstrip('/') + '/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'art') + '/'
ART = os.path.join(ROOT, 'src', 'data', 'art.json')
STAND_PX = 300

# sheet: {facing: figure number (1 to 4)}; two true views, the game mirrors the rest
VIEWS = {
    'gadara_stand': {'downLeft': 4, 'downRight': 1, 'upLeft': 2, 'upRight': 3},
    'gadara_battle': {'downLeft': 1, 'downRight': 4, 'upLeft': 2, 'upRight': 3},
    'gadara_guard': {'downLeft': 1, 'upLeft': 3},
    'gadara_strike': {'downLeft': 1, 'upRight': 3},
    'gadara_mask': {'downRight': 1, 'upLeft': 3},
    'gadara_unleash': {'downLeft': 4, 'upLeft': 3},
    'gadara_hurt': {'downLeft': 3, 'upLeft': 2},
    'gadara_weak': {'downLeft': 3, 'upLeft': 2},
    'gadara_down': {'downLeft': 1, 'upRight': 2},
    'gadara_cleave_rear': {'downLeft': 1, 'upLeft': 3},
    'gadara_cleave_land': {'downLeft': 1, 'upLeft': 3},
    'gadara_hook_reach': {'downLeft': 1, 'upLeft': 3},
    'gadara_hook_pull': {'downLeft': 1, 'upLeft': 3},
    'gadara_sunder_slash': {'downLeft': 1, 'upLeft': 3},
    'alagara_stand': {'downLeft': 1, 'downRight': 4, 'upLeft': 2, 'upRight': 3},
    'alagara_battle': {'downLeft': 1, 'downRight': 2, 'upRight': 3},
    'alagara_strike': {'downLeft': 1, 'upRight': 3},
    'alagara_ready': {'downLeft': 1, 'downRight': 2, 'upLeft': 1},   # injured: no back view
    'alagara_guard': {'downLeft': 3, 'upLeft': 1},
    'alagara_hurt': {'downLeft': 3, 'upRight': 1},
    'alagara_down': {'downLeft': 3, 'upLeft': 1},
    'alagara_fury': {'downLeft': 1, 'upLeft': 3},
    'alagara_swift': {'downLeft': 1, 'upLeft': 3},
    'alagara_claim_reach': {'downLeft': 2, 'upLeft': 2},
    'alagara_claim_snatch': {'downLeft': 1, 'upLeft': 1},
    'alagara_claim_store': {'downLeft': 1, 'upLeft': 1},
    'alagara_mantle_prep': {'downRight': 2, 'upLeft': 1},
    'alagara_mantle_cast': {'downRight': 1, 'upLeft': 2},
    'alagara_mantle_swift': {'downLeft': 3, 'upLeft': 1},
    'alagara_gale': {'downLeft': 2, 'upLeft': 1},
    'alagara_gale_fury': {'downLeft': 2, 'upLeft': 3},
    'alagara_gale_swift': {'downLeft': 2, 'upLeft': 3},
}
# head boxes in the RAW standing figures (sheet size): left, top, right, bottom; hair top to chin
HEADS = {
    'gadara': {1: (120, 20, 230, 150), 4: (120, 25, 225, 150)},
    'alagara': {1: (30, 0, 200, 155), 4: (90, 0, 265, 150)},
}
# sheets whose size is set by hand (against the standing sheet), with the reason
HAND = {
    'gadara_hurt': 0.95,    # reads 1.33: his head thrown back and the staff across it; drawn as tall as standing
    'gadara_weak': 0.92,    # reads 3.73: the staff over the head is taken for it; same sheet set as hurt, a little hunched
    'gadara_down': 0.95,    # lying down: the same 13 Nov set as hurt
    'gadara_mask': 1.1,
    'gadara_cleave_land': 1.0,   # reads 0.79 but drew a third too big next to the rearing frame on the feet sheet
    'gadara_hook_pull': 1.0,     # reads 0.68 (the hand over the head); same set as the reach, judged on the feet sheet
    'gadara_hook_reach': 1.0,
    'alagara_down': 1.2,         # lying: the head reads small; a body as long as he is tall
    'alagara_mantle_swift': 1.25,
    'alagara_gale_swift': 1 / 0.74,   # reads 0.39: his white Swift hair hides the head; same set as the Fury Gale Cut (0.74)
    'alagara_swift': 1 / 0.66,        # reads 0.61: the white hair again; the Fury sheet of the same set reads 0.68    # reads 0.60: the hand and mask cover the face; upright, drawn at 0.78 of the standing height
}

def wipe_dust(path):
    """Fury and Swift sheets have a pale grey dust splash painted on the floor by his feet: the
    cutter keeps it. Pale, grey (not cream or orange) pixels in the bottom fifth go; then specks."""
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(int); h = a.shape[0]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1)
    pale = (al > 0) & (mx - mn < 62) & (a[..., :3].mean(-1) > 105)
    pale[: int(h * 0.70)] = False
    # only pale patches that reach the outside of the figure (the dust); his trouser pattern is inside
    lab, n = ndimage.label(pale)
    outside = ndimage.binary_dilation(al <= 30, iterations=2)
    hit = np.unique(lab[outside & pale]); hit = hit[hit > 0]
    pale = np.isin(lab, hit)
    a[ndimage.binary_dilation(pale, iterations=2) & (al < 200) | pale, 3] = 0
    solid = a[..., 3] > 128
    lab, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        for i in range(1, n + 1):
            if sizes[i - 1] < 0.01 * sizes.max(): a[lab == i, 3] = 0
    out = Image.fromarray(a.astype(np.uint8), 'RGBA'); out = out.crop(out.getbbox()); out.save(path, optimize=True)

def feet_x(path):
    m = np.array(Image.open(path).convert('RGBA'))[..., 3] > 40; hh = m.shape[0]
    cols = np.where(m[int(hh * 0.90):].any(axis=0))[0]
    if not len(cols): return 0.5
    return round(float((cols[0] + cols[-1]) / 2 / m.shape[1]), 3)

def king(prefix):
    stand_parts, stand_files = raw(prefix + '_stand')
    pairs = [(Image.open(stand_files[i - 1]).convert('RGBA'), box) for i, box in HEADS[prefix].items()]
    model = head_model(pairs)
    ref = float(np.mean([find_head(im, model)[2] for im, _ in pairs]))
    base = STAND_PX / max(Image.open(f).height for f in stand_files)
    stand_h = np.median([Image.open(f).height for f in stand_files])
    sets = {}
    for sheet, views in VIEWS.items():
        if not sheet.startswith(prefix + '_'): continue
        parts, files = raw(sheet)
        got = [find_head(Image.open(f).convert('RGBA'), model) for f in files]
        radii = [h[2] for h in got if h]
        head = float(np.median(radii)) / ref if radii else None
        tall = np.median([Image.open(f).height for f in files]) / stand_h   # how tall the sheet is drawn, as a check
        if sheet in HAND: k, why = HAND[sheet], 'hand'
        elif sheet.endswith('_stand') or head is None: k, why = 1.0, 'standing' if head else 'no head found'
        else: k, why = 1 / head, 'head %.2f' % head
        print('%-22s head %s  height ratio %.2f  -> %.3f (%s)' % (sheet, head and round(head, 2), tall, base * k, why), file=sys.stderr)
        out = {}
        for facing, fig in views.items():
            name = '%s_f%d.png' % (sheet, fig)
            if not os.path.exists(OUT + name) or True:
                cl, box = parts[fig - 1]
                keep = 0.02 if sheet.endswith('_down') else 0.15
                final_cut(cl, box, OUT + name, base * k, keep=keep)
                if sheet in ('alagara_fury', 'alagara_swift', 'alagara_mantle_swift', 'alagara_claim_store'): wipe_dust(OUT + name)
            out[facing] = {'file': name, 'originX': feet_x(OUT + name)}
        sets[sheet[len(prefix) + 1:]] = out
    return sets

if __name__ == '__main__':
    art = json.load(open(ART))
    g = king('gadara')
    gad = art.get('e5', {})
    gad.update({
        'note': 'Gadara the Greater, the Hollow King (Phase 10, roadmap 6.75 and 10.23 to 10.29). Cut by dev/tools/make_kings.py '
                'from his 31 Oct isometric photos (standing, battle, guard, attack, mask on, staff raised), his 13 Nov hurt, '
                'injured and defeated sheets and his 19 Nov skill sheets (Heavy Cleave rearing and landing, Snare Hook reach '
                'and pull, Sunder Boon slash). True views only; the game mirrors the other side.',
        'name': 'Gadara', 'height': 118,
        'standing': g['stand'], 'battle': g['battle'], 'weak': g['weak'],
        'poses': {
            'ready': g['battle'], 'guard': g['guard'], 'dodge': g['guard'], 'windup': g['cleave_rear'], 'attack': g['strike'],
            'bladeAttack': g['cleave_land'], 'cleaveWindup': g['cleave_rear'], 'cleave': g['cleave_land'],
            'hookReach': g['hook_reach'], 'hookPull': g['hook_pull'], 'sunderWindup': g['cleave_rear'], 'sunder': g['sunder_slash'],
            'mask': g['mask'], 'chant': g['mask'], 'cast': g['unleash'], 'unleash': g['unleash'],
            'hurt': g['hurt'], 'knocked': g['hurt'], 'down': g['down'],
        },
        # the mask on while Singularity charges (BattleScene's look "masked"); the blade end's own strike (look "blade")
        'buffed': {'masked': g['mask']},
        'buffPoses': {'blade': {'attack': g['cleave_land'], 'windup': g['cleave_rear']}, 'masked': {'ready': g['mask'], 'unleash': g['unleash']}},
        'clash': {'file': 'clash/gadara_clash.webp', 'tip': 0.894, 'name': {'file': 'clash/gadara_clash_name.webp', 'x': 0.535, 'y': 0.0267}},
    })
    art['e5'] = gad
    a = king('alagara')
    ala = art.get('h5', {})
    ala.update({
        'note': 'King Alagara, the Vessel (Phase 10, roadmap 6.74 and 10.17 to 10.22). Cut by dev/tools/make_kings.py from his '
                '13 Nov sheets (neutral, guard, recoil, fallen, injured), his 31 Oct isometric photos (hand on the hilt = Drawn '
                'Blade, the drawn lunge) and his 19 Nov sheets (attacks under Fury and Swift, Claim, Mantle, Gale Cut in three '
                'looks). His look follows his ACTIVE Verse ("buffed", "buffPoses"); the Echo shows only in the interface.',
        'name': 'Alagara', 'height': 100,
        'standing': a['stand'], 'battle': a['battle'], 'weak': a['ready'],
        'poses': {
            'ready': a['battle'], 'guard': a['guard'], 'dodge': a['guard'], 'windup': a['battle'], 'attack': a['strike'],
            'drawn': a['battle'], 'claimReach': a['claim_reach'], 'claimSnatch': a['claim_snatch'], 'claimStore': a['claim_store'],
            'chant': a['mantle_prep'], 'cast': a['mantle_cast'], 'gale': a['gale'],
            'hurt': a['hurt'], 'knocked': a['hurt'], 'down': a['down'],
        },
        'buffed': {'fury': a['fury'], 'swiftness': a['swift']},
        'buffPoses': {
            'fury': {'attack': a['fury'], 'gale': a['gale_fury'], 'ready': a['fury']},
            'swiftness': {'attack': a['swift'], 'gale': a['gale_swift'], 'cast': a['mantle_swift'], 'chant': a['mantle_swift'], 'ready': a['swift']},
        },
        'auraPainted': ['fury', 'swiftness'],
        'clash': {'file': 'clash/alagara_clash.webp', 'tip': 0.894, 'name': {'file': 'clash/alagara_clash_name.webp', 'x': 0.535, 'y': 0.0267}},
    })
    art['h5'] = ala
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json: e5 (Gadara) and h5 (Alagara) written', file=sys.stderr)
