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
    # 20 and 21 Nov sheets (roadmap 6.83). Looked at on a numbered sheet: on nearly every new sheet
    # 1 faces up-left, 2 up-right, 3 down-left, 4 down-right; dev/tools/facing_check.py confirms the pairs.
    'alagara_stand': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
    'alagara_battle': {'upLeft': 1, 'downRight': 2, 'downLeft': 3, 'upRight': 4},
    'alagara_strike': {'downLeft': 1, 'upRight': 3},
    'alagara_ready': {'downLeft': 1, 'downRight': 2, 'upLeft': 1},   # injured: no back view
    'alagara_guard': {'downLeft': 3, 'upLeft': 1},
    'alagara_dodge': {'downLeft': 1, 'upRight': 3, 'upLeft': 4},   # 2 faces the same way as 1 (facing check): mirrored instead
    'alagara_hurt': {'downLeft': 3, 'upRight': 1},
    'alagara_down': {'downLeft': 3, 'upLeft': 1},
    'alagara_fury_stand': {'downRight': 1, 'upLeft': 2, 'downLeft': 3, 'upRight': 4},
    'alagara_fury_ready': {'upLeft': 1, 'upRight': 2, 'downLeft': 3},   # on these four sheets 4 points the same way as 3
    'alagara_fury_windup': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
    'alagara_fury': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
    'alagara_fury_guard': {'upLeft': 1, 'upRight': 2, 'downLeft': 3},
    'alagara_fury_dodge': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
    'alagara_swift_stand': {'downRight': 1, 'upLeft': 2, 'downLeft': 3, 'upRight': 4},
    'alagara_swift_ready': {'upLeft': 1, 'upRight': 2, 'downLeft': 3},
    'alagara_swift': {'downLeft': 1, 'downRight': 2, 'upLeft': 3, 'upRight': 4},
    'alagara_swift_guard': {'upLeft': 1, 'upRight': 2, 'downLeft': 3},
    'alagara_swift_dodge': {'upLeft': 1, 'upRight': 2, 'downLeft': 3, 'downRight': 4},
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
    'alagara': {3: (45, 0, 175, 118), 4: (60, 0, 185, 118)},   # the 21 Nov neutral: 3 and 4 are the front views
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
    # HAND_ALAGARA below holds his sizes from the 21 Nov size pass (1.85)
}

# Alagara's sizes, set by eye on 21 Nov (1.85): every family next to his 21 Nov standing picture at the size drawn,
# judged by the head and the sandals. The head finder reads his afro, the Fury flames and the Swift white hair badly
# (it often lands on the trousers), so the finder's reading is noted and the size is pinned.
HAND_ALAGARA = {
    'alagara_battle': 0.961,        # by eye 1.10 of standing at 1.057
    'alagara_ready': 0.850,         # by eye 1.35 of standing at 1.252, then 1.10 at 0.927 (second look)
    'alagara_guard': 0.816,         # by eye 1.00 of standing at 0.816
    'alagara_dodge': 1.077,         # by eye 1.12 of standing at 1.206
    'alagara_hurt': 0.981,          # by eye 1.12 of standing at 1.098
    'alagara_down': 1.043,          # by eye 1.15 of standing at 1.200
    'alagara_strike': 1.288,        # by eye 1.00 of standing at 1.288
    'alagara_claim_reach': 1.053,   # by eye 1.00 of standing at 1.053
    'alagara_claim_snatch': 0.993,  # by eye 1.00 of standing at 0.993
    'alagara_claim_store': 0.947,   # by eye 1.00 of standing at 0.947
    'alagara_mantle_prep': 1.179,   # by eye 1.05 of standing at 1.238
    'alagara_mantle_cast': 1.150,   # by eye 1.08 of standing at 1.242
    'alagara_gale': 1.058,          # by eye 1.05 of standing at 1.110
    'alagara_gale_fury': 0.970,     # by eye 1.05 of standing at 1.019
    'alagara_gale_swift': 1.126,    # by eye 1.20 of standing at 1.351
    'alagara_fury_stand': 1.001,    # by eye 1.00 of standing at 1.001
    'alagara_fury_ready': 1.376,    # by eye 1.15 of standing at 1.582
    'alagara_fury_windup': 1.050,   # by eye 1.30 of standing at 1.365
    'alagara_fury': 0.964,          # by eye 1.15 of standing at 1.108
    'alagara_fury_guard': 0.883,    # by eye 1.35 of standing at 1.192
    'alagara_fury_dodge': 1.135,    # by eye 1.15 of standing at 1.305
    'alagara_swift_stand': 1.001,   # by eye 1.00 of standing at 1.001
    'alagara_swift_ready': 1.346,   # by eye 1.05 of standing at 1.413
    'alagara_swift': 1.190,         # by eye 1.10 of standing at 1.309
    'alagara_swift_guard': 0.963,   # by eye 1.05 of standing at 1.011
    'alagara_swift_dodge': 1.143,   # by eye 1.05 of standing at 1.200
    'alagara_mantle_swift': 0.961,  # by eye 1.30 of standing at 1.250
}
HAND.update(HAND_ALAGARA)

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

def tile_colour(path):
    """The colour of the floor tile under the feet (the most common pale, grey-pink colour low in the
    picture), or None when there is no tile left."""
    a = np.array(Image.open(path).convert('RGBA')).astype(int); h = a.shape[0]
    b = a[int(h * .75):]; px = b[b[..., 3] > 200][:, :3]
    sat = px.max(1) - px.min(1); px = px[(sat < 50) & (px.mean(1) > 110)]
    if len(px) < 200: return None
    q = px // 8; keys, counts = np.unique(q, axis=0, return_counts=True)
    return px[(q == keys[counts.argmax()]).all(1)].mean(0)

def wipe_tile(path, T):
    """Takes away the floor tile and its shadow (6.83): pixels of the tile's hue (lighter or darker) in the
    lower part of the picture that reach the outside. His cream cloth is yellower, so it stays."""
    a = np.array(Image.open(path).convert('RGBA')).astype(float); h = a.shape[0]
    rgb = a[..., :3]; s = rgb.sum(-1) + 1e-6; n = rgb / s[..., None]; Tn = T / T.sum()
    d = np.abs(n - Tn).max(-1); br = s / T.sum()
    m = (d < 0.03) & (br > 0.42) & (br < 1.15) & (a[..., 3] > 0)
    m[:int(h * 0.55)] = False
    lab, k = ndimage.label(m)
    outside = ndimage.binary_dilation(a[..., 3] <= 30, iterations=2)
    hit = np.unique(lab[outside & m]); hit = hit[hit > 0]
    m = np.isin(lab, hit)
    m = (ndimage.binary_dilation(m, iterations=1) & (a[..., 3] > 0) & (d < 0.06)) | m
    a[m, 3] = 0
    solid = a[..., 3] > 128; lab, k = ndimage.label(solid)
    if k > 1:
        sizes = ndimage.sum(solid, lab, range(1, k + 1))
        for i in range(1, k + 1):
            if sizes[i - 1] < 0.01 * sizes.max(): a[lab == i, 3] = 0
    im = Image.fromarray(a.astype(np.uint8), 'RGBA'); im.crop(im.getbbox()).save(path, optimize=True)

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
                if sheet in ('alagara_mantle_swift', 'alagara_claim_store'): wipe_dust(OUT + name)
        # the floor tile and its shadow that iso31.clean leaves on some 20 Nov sheets: one tile colour per sheet
        names = sorted({'%s_f%d.png' % (sheet, fig) for fig in views.values()})
        tiles = [t for t in (tile_colour(f) for f in files) if t is not None]   # read on the full-size raw figures
        if tiles:
            T = np.median(np.array(tiles), axis=0)
            for n in names: wipe_tile(OUT + n, T)
        for facing, fig in views.items():
            name = '%s_f%d.png' % (sheet, fig)
            out[facing] = {'file': name, 'originX': feet_x(OUT + name)}
        sets[sheet[len(prefix) + 1:]] = out
    return sets

def write_gadara(art):
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

def write_alagara(art):
    a = king('alagara')
    ala = art.get('h5', {})
    ala.update({
        'note': 'King Alagara, the Vessel (Phase 10, roadmap 6.74, 6.83 and 10.17 to 10.22). Cut by dev/tools/make_kings.py from his '
                '21 Nov sheets (neutral with the gold fastenings, the saber battle stance), his 20 Nov sheets (dodge; Fury and Swift '
                'forms: neutral, battle stance, wind-up, attack, guard, dodge; Stone wears the Swift design), his 13 and 19 Nov '
                'sheets (guard, recoil, fallen, injured, Claim, Mantle, Gale Cut in three looks) and the 31 Oct drawn lunge (his '
                'plain attack: no attack sheet in the new look yet). His look follows his ACTIVE Verse ("buffed", "buffPoses").',
        'name': 'Alagara', 'height': 100,
        'standing': a['stand'], 'battle': a['battle'], 'weak': a['ready'],
        'poses': {
            'ready': a['battle'], 'guard': a['guard'], 'dodge': a['dodge'], 'windup': a['battle'], 'attack': a['strike'],
            'drawn': a['battle'], 'claimReach': a['claim_reach'], 'claimSnatch': a['claim_snatch'], 'claimStore': a['claim_store'],
            'chant': a['mantle_prep'], 'cast': a['mantle_cast'], 'gale': a['gale'],
            'hurt': a['hurt'], 'knocked': a['hurt'], 'down': a['down'],
        },
        # standing under a Verse: the form's neutral sheet (20 Nov); Stone uses the Swift design (Suleiman 20 Nov 15:36)
        'buffed': {'fury': a['fury_stand'], 'swiftness': a['swift_stand'], 'stone': a['swift_stand']},
        'buffPoses': {
            'fury': {'attack': a['fury'], 'windup': a['fury_windup'], 'ready': a['fury_ready'], 'guard': a['fury_guard'],
                     'dodge': a['fury_dodge'], 'gale': a['gale_fury']},
            # the Swift folder's "Winding up attack" is the Fury sheet again (same file): his Swift battle stance winds up
            'swiftness': {'attack': a['swift'], 'windup': a['swift_ready'], 'ready': a['swift_ready'], 'guard': a['swift_guard'],
                          'dodge': a['swift_dodge'], 'gale': a['gale_swift'], 'cast': a['mantle_swift'], 'chant': a['mantle_swift']},
            'stone': {'attack': a['swift'], 'windup': a['swift_ready'], 'ready': a['swift_ready'], 'guard': a['swift_guard'],
                      'dodge': a['swift_dodge'], 'gale': a['gale_swift'], 'cast': a['mantle_swift'], 'chant': a['mantle_swift']},
        },
        'auraPainted': ['fury', 'swiftness'],
        'clash': {'file': 'clash/alagara_clash.webp', 'tip': 0.894, 'name': {'file': 'clash/alagara_clash_name.webp', 'x': 0.535, 'y': 0.0267}},
    })
    art['h5'] = ala


if __name__ == '__main__':
    art = json.load(open(ART))
    which = sys.argv[2:] or ['gadara', 'alagara']   # cut one king only: make_kings.py <work> alagara
    if 'gadara' in which:
        write_gadara(art)
    if 'alagara' in which:
        write_alagara(art)
    json.dump(art, open(ART, 'w'), indent=2, ensure_ascii=False); open(ART, 'a').write('\n')
    print('art.json written for', which, file=sys.stderr)
