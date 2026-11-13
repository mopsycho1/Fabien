"""The size ruler (roadmap 18.2, Battle 1.0 milestone M2).

Every character should look the same size in every picture. The pictures were
cut from many sheets, each drawn at its own size, so a crouch could come out
with a head half as big again as the standing figure. This tool measures the
head in every picture against the head of the standing picture and writes, in
src/data/art.json, how much each picture must be scaled when it is drawn:

    "ruler": { "gaha_thrust_0.png": { "scale": 1.2 },
               "gaha_rooted_upRight.png": { "scale": 1.3, "feet": 0.93 } }

"scale" 1.2 = draw this picture 1.2 times bigger. "feet" 0.93 = the ground is
93 percent of the way down the picture (the rest is dust or a weapon tip below
the feet). "footX" 0.41 = the feet are 41 percent of the way across the picture
(checklist B3, 13 Nov): the game puts that point on the middle of the tile, so
the feet do not jump sideways when the picture changes. Pictures that are
already right are left out.
The game reads this in src/art.js and BattleScene.showFrame.

Run with the tools Python (~/.fabien-tools/venv/bin/python), from the project folder:
    python dev/tools/ruler.py measure            measure everyone, write art.json
    python dev/tools/ruler.py measure h2         only Gaha
    python dev/tools/ruler.py audit              check: every head within 8 percent (B1),
                                                 every foot point within 3 pixels (B3)
    python dev/tools/ruler.py sheets <folder> [<old project copy>]
                                                 before and after contact sheets

Hand corrections live in dev/tools/ruler_marks.json (see its note).
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
from ruler_lib import (ROOT, ART_JSON, ART_DIR, load_art, inventory, open_art, alpha_box,
                       head_model, find_head, family, foot_point, NO_FEET)

HERE = os.path.dirname(os.path.abspath(__file__))
HEADS = json.load(open(os.path.join(HERE, 'ruler_heads.json')))
MARKS = json.load(open(os.path.join(HERE, 'ruler_marks.json')))
LOW, HIGH = 0.92, 1.08     # checklist B1: every head within 8 percent of the standing head

def model_for(cid, art_dir=ART_DIR):
    pairs = [(Image.open(os.path.join(art_dir, f)).convert('RGBA'), b) for f, b in HEADS[cid].items()]
    model = head_model(pairs)
    found = [find_head(im, model) for im, _ in pairs]
    radii = [h[2] for h in found if h]
    if not radii:
        raise SystemExit(cid + ': no head found in the standing pictures; check the boxes in ruler_heads.json')
    return model, float(np.mean(radii))

def measure(cid, entry):
    """Returns { file: { family, head (size against standing, or None), scale, feet, by } }."""
    model, ref = model_for(cid)
    marks = MARKS.get(cid, {})
    files = []
    for p in inventory(entry):
        if p['file'] not in files:
            files.append(p['file'])
    fam_of = lambda f: marks.get('family', {}).get(f, family(f))   # a hand-made family, or the one in the file name
    head = {}
    for f in files:
        h = find_head(open_art(f), model)
        head[f] = (h[2] / ref) if h else None
    out = {}
    for f in files:
        fam = fam_of(f)
        mates = [head[g] for g in files if fam_of(g) == fam and head[g]]
        hand = marks.get('scale', {})
        if f in hand or fam in hand:
            scale, by = hand.get(f, hand.get(fam)), 'hand'
        elif mates:
            scale, by = 1 / float(np.median(mates)), 'measured'
        else:
            scale, by = 1.0, 'no head found'
        if by == 'measured' and LOW <= 1 / scale <= HIGH:
            scale = 1.0   # already within 8 percent: left alone (the measuring is not much finer than that)
        feet = marks.get('feet', {}).get(f, marks.get('feet', {}).get(fam, 1.0))
        out[f] = {'family': fam, 'head': head[f], 'scale': round(scale, 2), 'feet': feet, 'by': by}
    return out

FOOT_OK = 3.0      # checklist B3: the foot point within 3 pixels of the tile's middle, at the size drawn on the board
FOOT_WRITE = 1.0   # an anchor less than a pixel out is left as the cutter made it

def measure_feet(cid, entry, result):
    """Checklist B3. Works out where the feet are in every picture and adds "footX" to result
    (a share of the picture's width, counted in the file as it is stored, not mirrored).
    Returns the list of every use of every picture, for the audit:
        { label, file, err (pixels on the board, before), after (pixels, after), by }
      - a still picture (standing, battle, weak, a pose): its own foot point.
      - the frames of a move: the body is MEANT to travel from frame to frame (a lunge,
        a leap), so the whole move is shifted by one amount, the one that puts the FIRST
        frame's feet on the tile. A walk is shifted by its middle frame.
      - hand marks in ruler_marks.json, "footX": a number for a picture or a family, or
        "keep" to leave the cutter's anchor alone."""
    base = draw_scale(entry, ART_DIR)
    marks = MARKS.get(cid, {}).get('footX', {})
    uses = []
    for p in inventory(entry):
        im = open_art(p['file']); r = result[p['file']]
        fx, _ = foot_point(im, r['feet'], any(k in p['file'] for k in NO_FEET))
        now = 1 - p['originX'] if p['flip'] else p['originX']      # the anchor today, in the file as stored
        px = im.width * base * r['scale']                           # the picture's width on the board
        uses.append({'label': p['label'], 'set': p['set'], 'file': p['file'], 'found': fx, 'now': now, 'px': px,
                     'move': p['label'].startswith('moves.'), 'walk': p['label'].startswith('walk')})
    # one shift for all the frames of a move
    shift = {}
    for u in uses:
        if u['move'] or u['walk']:
            shift.setdefault(u['set'], []).append(u)
    for u in uses:
        hand = marks.get(u['file'], marks.get(result[u['file']]['family']))
        if hand == 'keep':
            u['want'], u['by'] = u['now'], 'hand (kept)'
        elif hand is not None:
            u['want'], u['by'] = float(hand), 'hand'
        elif u['move'] or u['walk']:
            frames = shift[u['set']]
            lead = frames[len(frames) // 2] if u['walk'] else frames[0]
            u['want'], u['by'] = u['now'] + (lead['found'] - lead['now']) * lead['px'] / u['px'], 'move'
        else:
            u['want'], u['by'] = u['found'], 'measured'
        u['err'] = (u['now'] - u['found']) * u['px']
    # one anchor per file (a file used twice gets the anchor of its first still use, else its first use)
    for u in sorted(uses, key=lambda u: u['move'] or u['walk']):
        r = result[u['file']]
        if 'footX' not in r:
            r['footX'] = round(u['want'], 3) if abs(u['want'] - u['now']) * u['px'] > FOOT_WRITE else None
    for u in uses:
        anchor = result[u['file']]['footX']
        u['after'] = ((anchor if anchor is not None else u['now']) - u['found']) * u['px']
    return uses

def write_ruler(art, cid, result):
    """Puts the "ruler" list of one character into art.json (only pictures that need a change)."""
    ruler = {}
    for f, r in result.items():
        e = {}
        if r['scale'] != 1.0: e['scale'] = r['scale']
        if r['feet'] != 1.0: e['feet'] = r['feet']
        if r.get('footX') is not None: e['footX'] = r['footX']
        if e: ruler[f] = e
    art[cid].pop('ruler', None); art[cid].pop('note_ruler', None)
    if ruler:
        art[cid]['ruler'] = ruler
        art[cid]['note_ruler'] = ('Size ruler (roadmap 18.2): how much each picture is scaled when drawn so the head is the same size '
                                  'as in the standing picture ("scale"), where the ground is down the picture ("feet", 1 = the bottom edge), and where the feet are across it ("footX", checklist B3: that point sits on the middle of the tile). '
                                  'Written by dev/tools/ruler.py; hand corrections go in dev/tools/ruler_marks.json, not here.')

def table(cid, result):
    fams = {}
    for f, r in result.items():
        fams.setdefault(r['family'], []).append((f, r))
    for fam, rows in fams.items():
        r0 = rows[0][1]
        heads = ' '.join('%.2f' % r['head'] if r['head'] else ' ?  ' for _, r in rows)
        print('  %-30s draw at %.2f  (%s)  heads now: %s' % (fam, r0['scale'], r0['by'], heads))

def cmd_measure(ids):
    art = load_art()
    for cid in ids or [c for c in art if c in HEADS]:
        result = measure(cid, art[cid])
        measure_feet(cid, art[cid], result)
        write_ruler(art, cid, result)
        changed = sum(1 for r in result.values() if r['scale'] != 1.0)
        moved = sum(1 for r in result.values() if r.get('footX') is not None)
        print('%s: %d pictures, %d rescaled, %d with a new foot point' % (cid, len(result), changed, moved))
        table(cid, result)
    json.dump(art, open(ART_JSON, 'w'), indent=2, ensure_ascii=False)
    open(ART_JSON, 'a').write('\n')

def cmd_audit(ids):
    """Checklist B1: after the ruler, is every head within 8 percent of the standing head?
    A family is judged by its middle picture (one picture alone is measured to about 5 percent).
    Prints the pose table of checklist B4 too."""
    art = load_art(); bad = 0
    for cid in ids or [c for c in art if c in HEADS]:
        result = measure(cid, art[cid])
        ruler = art[cid].get('ruler', {})
        fams = {}
        for f, r in result.items():
            if r['head']:
                fams.setdefault(r['family'], []).append(r['head'] * ruler.get(f, {}).get('scale', 1.0))
        out = {fam: float(np.median(v)) for fam, v in fams.items()}
        hand = [fam for fam in {r['family'] for r in result.values()} if any(r['by'] == 'hand' for r in result.values() if r['family'] == fam)]
        fails = {fam: v for fam, v in out.items() if not LOW <= v <= HIGH and fam not in hand}
        bad += len(fails)
        print('%s: %d families, %d outside %.2f to %.2f, %d set by hand' % (cid, len(out), len(fails), LOW, HIGH, len(hand)))
        for fam, v in fails.items():
            print('   FAIL %-28s head %.2f of standing' % (fam, v))
        # checklist B3: the foot point of every picture within 3 pixels of the tile's middle
        ruler_now = art[cid].get('ruler', {})
        uses = measure_feet(cid, art[cid], result)
        for u in uses:   # judged against what art.json holds today, not what a new measure would write
            anchor = ruler_now.get(u['file'], {}).get('footX', u['now'])
            u['after'] = (anchor - u['found']) * u['px']
        still = [u for u in uses if u['by'] == 'measured']
        off = [u for u in still if abs(u['after']) > FOOT_OK]
        lead_off = []
        sets = {}
        for u in uses:
            if u['by'] == 'move': sets.setdefault(u['set'], []).append(u)
        for name, frames in sets.items():
            lead = frames[len(frames) // 2] if frames[0]['walk'] else frames[0]
            if abs(lead['after']) > FOOT_OK: lead_off.append(lead)
        by_hand = sorted({u['file'] for u in uses if u['by'].startswith('hand')})
        was = sum(1 for u in still if abs(u['err']) > FOOT_OK)
        bad += len(off) + len(lead_off)
        print('   feet: %d still pictures, %d more than %g px from the tile middle (%d before the foot points); %d moves, %d starting off the tile; %d set by hand'
              % (len(still), len(off), FOOT_OK, was, len(sets), len(lead_off), len(by_hand)))
        for u in off + lead_off:
            print('   FAIL feet %-34s %-38s %+.1f px' % (u['label'], u['file'], u['after']))
        poses = art[cid].get('poses', {})
        core = ['windup', 'attack', 'guard', 'dodge', 'hurt', 'fallAir', 'down', 'fallRise', 'victory']
        have = {'stand': 'standing' in art[cid], 'battle': 'battle' in art[cid], 'weak': 'weak' in art[cid], 'walk': 'walk' in art[cid]}
        have.update({p: p in poses for p in core})
        print('   poses missing: ' + (', '.join(k for k, v in have.items() if not v) or 'none'))
    print('ALL PASSED' if not bad else 'FAILED: %d' % bad)
    return 1 if bad else 0

# ---------------------------------------------------------------------------
# Contact sheets: every picture as the game draws it, old on top, new below.
# ---------------------------------------------------------------------------
ZOOM = float(os.environ.get('RULER_ZOOM', 2))   # the sheets are drawn at twice the size on the board, so they can be judged on a phone

def draw_scale(entry, art_dir):
    """The one scale the game gives a character: its tallest standing picture is "height" pixels."""
    tallest = max(Image.open(os.path.join(art_dir, (v if isinstance(v, str) else v['file']))).height for v in entry['standing'].values())
    return entry.get('height', 96) / tallest

def strip(cid, entry, art_dir, title, width=1800, check=None):
    """One half of a sheet: all pictures on ground lines, with a line at the standing head height."""
    base = draw_scale(entry, art_dir) * ZOOM
    ruler = entry.get('ruler', {})
    seen = []; tiles = []
    for p in inventory(entry):
        if p['file'] in seen:
            continue
        seen.append(p['file'])
        im = Image.open(os.path.join(art_dir, p['file'])).convert('RGBA')
        r = ruler.get(p['file'], {})
        s = base * r.get('scale', 1.0)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        below = round(im.height * (1 - r.get('feet', 1.0)))    # how much of the picture hangs under the ground
        if check:
            # checking by eye: a circle the size of the STANDING head, laid on the head found here.
            # When the scale is right the circle hugs the hair.
            h = find_head(im, check[0])
            if h:
                rr = check[1] * base
                ImageDraw.Draw(im).ellipse((h[0] - rr, h[1] - rr, h[0] + rr, h[1] + rr), outline=(0, 255, 0, 255))
        ox = p['originX']
        if 'footX' in r: ox = 1 - r['footX'] if p['flip'] else r['footX']   # the measured foot point (B3)
        if p['flip']: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        tiles.append((p['label'], im, below, ox))
    stand_h = round(entry.get('height', 96) * ZOOM)
    row_h = max(max(im.height - below for _, im, below, _ in tiles), stand_h) + 8
    rows = [[]]; x = 8
    for t in tiles:
        if x + t[1].width + 8 > width and rows[-1]:
            rows.append([]); x = 8
        rows[-1].append((x, t)); x += t[1].width + 8
    drop = max(t[2] for t in tiles) + 20   # room under the ground line for what hangs below, and the names
    out = Image.new('RGBA', (width, 30 + len(rows) * (row_h + drop + 6)), (58, 50, 44, 255))
    d = ImageDraw.Draw(out); d.text((8, 8), title, fill=(255, 235, 150))
    for i, row in enumerate(rows):
        ground = 30 + i * (row_h + drop + 6) + row_h
        d.line((0, ground, width, ground), fill=(120, 200, 120, 255))                       # the ground
        d.line((0, ground - stand_h, width, ground - stand_h), fill=(200, 120, 120, 255))   # top of the standing figure
        for x, (label, im, below, ox) in row:
            out.alpha_composite(im, (x, ground - im.height + below))
            d.text((x + 8, ground + drop - 13), label.replace('poses.', '').replace('moves.', '')[-(max(6, im.width // 6)):], fill=(235, 235, 235))
            d.line((x + im.width * ox, ground, x + im.width * ox, ground + 5), fill=(255, 80, 80, 255), width=2)  # the tile's middle
    return out

def cmd_sheets(folder, old_root, ids):
    os.makedirs(folder, exist_ok=True)
    art = load_art()
    old_art = json.load(open(os.path.join(old_root, 'src', 'data', 'art.json'))) if old_root else None
    names = {u['id']: u['name'] for u in json.load(open(os.path.join(ROOT, 'src', 'data', 'units.json')))}
    for cid in ids or list(art):
        if 'standing' not in art[cid]:
            continue
        name = {'e3': 'Archer'}.get(cid) or names.get(cid, art[cid].get('name', cid))   # units.json still calls her "Enemy 3"
        halves = []
        if old_art and cid in old_art and not os.environ.get('RULER_CHECK'):
            old = dict(old_art[cid]); old.pop('ruler', None)
            halves.append(strip(cid, old, os.path.join(old_root, 'public', 'art'), name + ': BEFORE (one size for every picture). Green = ground, red = top of the standing figure. Drawn at %g times board size.' % ZOOM))
        halves.append(strip(cid, art[cid], ART_DIR, name + ': AFTER the size ruler' + ('' if halves else ' (new, no before)'),
                            check=model_for(cid) if os.environ.get('RULER_CHECK') and cid in HEADS else None))
        sheet = Image.new('RGB', (halves[0].width, sum(h.height for h in halves) + 8 * (len(halves) - 1)), (20, 20, 20)); y = 0
        for h in halves:
            sheet.paste(h.convert('RGB'), (0, y)); y += h.height + 8
        path = os.path.join(folder, 'ruler_%s_%s.jpg' % (cid, name.split()[0].lower()))
        sheet.save(path, quality=88); print(path, sheet.size)

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'measure': cmd_measure(sys.argv[2:])
    elif cmd == 'audit': sys.exit(cmd_audit(sys.argv[2:]))
    elif cmd == 'sheets':
        rest = sys.argv[3:]; old = rest.pop(0) if rest and os.path.isdir(rest[0]) else None
        cmd_sheets(sys.argv[2], old, rest)
    else: print(__doc__)
