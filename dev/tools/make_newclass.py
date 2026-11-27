"""Leol the Slinger and the Thief (roadmap 19.1, 19.2, art 6.76 and 6.77; cut 22 Nov). Suleiman's 19 Nov sheets, four figures each
(two rows of two), each on a terracotta floor tile, most with compass plates (NOT trusted: read by the figure, see FACING).

Steps per sheet: make_layra_new.raw (each figure from the untouched sheet), make_kings.final_cut at BASE (picture pixels per sheet
pixel), then detile.detile (the tile, its shadow, its edges and the plate go). The size ruler then sizes every pose by its head.
Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_newclass.py <work folder> [raw]   ("raw" only cuts figures and a contact sheet)
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import kings_sheets
I19 = kings_sheets.B + 'INBOX/2026-11-19/email/'
LE = I19 + "Leol's character sheets/Leol's character sheets/"
TH = I19 + 'Male Thief character sheets/Male Thief character sheets/'
SHEETS = {
    'leol_stand':   LE + 'Lion Warrior Isometric Turntable.png',
    'leol_battle':  LE + 'Isometric Lion Warrior Sprite Sheet.png',
    'leol_weak':    LE + 'Battle-Worn Lion Warrior Views.png',
    'leol_down':    LE + 'Defeated Lion Warrior with Slingshot.png',
    'leol_hurt':    LE + 'Leol taking a hit with slingshot equipped.png',
    'leol_hhurt':   LE + 'Leol taking a hit with hamemr equipped.png',
    'leol_shot':    LE + 'Roaring Lion Warrior Sling Follow-Through Views.png',
    'leol_dodge':   LE + 'Leol’s Sling Dodge Poses.png',
    'leol_hdodge':  LE + 'Leol’s Four-Way Hammer Dodge.png',
    'leol_hguard':  LE + 'Leol’s Four-View Hammer Guard Sheet.png',
    'leol_hstrike': LE + 'Lion Warrior Hammer Strike Sprites.png',
    'leol_hraise':  LE + 'Leol’s Four Hammer-Raising Poses.png',
    'leol_hweak':   LE + 'Wounded Lion Warrior Hammer Turnaround.png',
    'leol_victory': LE + 'Leol’s Four-Way Victory Celebration.png',
    'leol_barricade': LE + 'Skill assets/Isometric Wooden Spike Barricade Tile Set.png',   # the wall (19.1), four views on a tile
    'thief_stand':  TH + 'thief neutral stance.png',
    'thief_battle': TH + 'thief battle stance.png',
    'thief_weak':   TH + 'Battle-Worn Thief Isometric Sheet.png',
    'thief_down':   TH + 'Defeated thief Isometric Turnaround.png',
    'thief_fallen': TH + 'thief fallen.png',
    'thief_hurt':   TH + 'Thief taking damage.png',
    'thief_slash':  TH + 'Isometric Thief Warrior Slashing Turnaround.png',
    'thief_ambush': TH + 'Isometric Dagger Ambush Sprite Sheet.png',
    'thief_dodge':  TH + 'Isometric Dodge Pose Sheet.png',
    'thief_parry':  TH + 'Isometric Thief Parry Pose Sheet.png',
    'thief_trap':   TH + 'Thief laying trap.png',
    'thief_steal':  TH + 'Thief performing steal.png',
    'thief_victory': TH + 'Isometric Victory Poses_ Four Directions.png',
}
kings_sheets.SHEETS.update({k: (v, 'grid') for k, v in SHEETS.items()})
WORK = sys.argv[1].rstrip('/') + '/'
sys.argv = [sys.argv[0], WORK]
import make_layra_new as L
mk = L.mk
from detile import detile, deslab

if __name__ == '__main__' and len(sys.argv) > 1 and 'raw' in os.environ.get('MODE', 'raw'):
    pass

def raw_sheet(names, out):
    cells = []
    for n in names:
        parts, files = L.raw(n)
        for i, f in enumerate(files):
            im = Image.open(f).convert('RGBA'); bg = Image.new('RGBA', im.size, (40, 110, 60, 255)); bg.alpha_composite(im); bg.thumbnail((170, 170))
            cells.append(('%s %d' % (n.split('_', 1)[1], i + 1), bg))
    cols = 8; rows = (len(cells) + cols - 1) // cols
    sh = Image.new('RGB', (cols * 180, rows * 190), (0, 0, 0)); d = ImageDraw.Draw(sh)
    for i, (t, im) in enumerate(cells):
        x = (i % cols) * 180; y = (i // cols) * 190
        sh.paste(im.convert('RGB'), (x + 5, y + 16)); d.text((x + 4, y + 2), t, fill=(255, 255, 0))
    sh.save(out)

if __name__ == '__main__' and os.environ.get('MODE') == 'raw':
    raw_sheet([n for n in SHEETS if n.startswith('leol')], WORK + 'raw_leol.jpg')
    raw_sheet([n for n in SHEETS if n.startswith('thief')], WORK + 'raw_thief.jpg')
    print('raw contact sheets in', WORK)

# picture pixels per sheet pixel: his figures stand about 470 sheet pixels tall on these 1448 by 1086 sheets; 0.40 makes a standing
# picture about 190 tall (the size ruler then sizes every pose by its head, and art.json "height" sets the drawn size)
BASE = 0.40
# How tall each one's tallest standing picture is drawn on the board (art.json "height"; the size ruler sizes every other pose by
# the head from it). 1.112 (26 Nov, Baiyee: "the Thief is drawn bigger than everyone else"): his standing sheet is a deep crouch,
# so the 100 a standing fighter gets drew his crouch as tall as a standing man and his head about 1.25 times the Bull's. Sized by eye
# beside Sudeen, Gaha and Leol at game size (dev/browser/size_row.cjs): 70 puts his head with the humans' (n99 checks it).
# 1.119 (27 Nov): with their feet and legs back their tallest standing pictures are taller (Leol 139 to 172 px, the Thief 144 to
# 162), so the heights grew by the same ratio (92 x 172/139, 70 x 162/144): the bodies are drawn exactly as big as before.
HEIGHT = {'leol': 114, 'thief': 79}   # Leol 92: at 100 he was as broad as the Bull Commander; 92 keeps him a big lion warrior, a little over the humans
ART_ID = {'leol': 'h6', 'thief': 'e6'}

def set_heights():
    art_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data', 'art.json')
    art = json.load(open(art_path))
    for k, h in HEIGHT.items(): art[ART_ID[k]]['height'] = h
    json.dump(art, open(art_path, 'w'), indent=2, ensure_ascii=False); open(art_path, 'a').write('\n')
COMMON = {'leol': 120, 'thief': 400}
# deslab rim: how far above the slab's front edges everything is cleared (share of the half width). 1.113 (26 Nov): Leol's tiles
# kept their lit front rim as long pale bars by his feet at 0.05
RIM = {'leol': 0.09, 'thief': 0.05}
BACK = {'leol': 0.10, 'thief': 0.0}   # deslab back: the band along the slab's back edges cleared by the edge's own colour (1.113)
# (not on the Hammer Strike: its steel head lies on the tile and is the same grey as the tile's lit edge; restoring it by colour
# picked his trousers instead, 26 Nov. That sheet keeps its edges until a cleaner cut: logged in 1.113)
NO_BACK = ('leol_hstrike', 'leol_hraise', 'leol_down')   # (hammer raise and down: the band took his legs in one view, 26 Nov)

def restore_steel(raw, a, min_px=30):
    """1.113 (26 Nov): the hammer's steel head lying on the tile (Hammer Strike) was taken with the tile (it is grey, like the tile's
    shadow and lit edges). Put back from the untouched cell the biggest patch of cool grey (steel: low saturation, blue about as
    strong as red; the tile is warm terracotta) in the lower half, with what is inside its box that is not tile-coloured (its
    copper rivets), when it is near what is kept of him."""
    from scipy import ndimage as nd
    rgb = raw[..., :3].astype(int); h = raw.shape[0]
    sat = rgb.max(-1) - rgb.min(-1); mean = rgb.mean(-1)
    steel = (raw[..., 3] > 128) & (sat < 34) & (mean > 45) & (mean < 235) & (rgb[..., 2] >= rgb[..., 0] - 14)
    steel[: h // 2] = False
    lab, n = nd.label(nd.binary_closing(steel, iterations=2) & (raw[..., 3] > 128))
    if not n: return a
    sz = nd.sum(np.ones_like(lab), lab, range(1, n + 1)); k = 1 + int(np.argmax(sz))
    if sz[k - 1] < min_px: return a
    ys, xs = np.nonzero(lab == k)
    y0, y1, x0, x1 = max(0, ys.min() - 2), ys.max() + 3, max(0, xs.min() - 2), xs.max() + 3
    box = np.zeros(steel.shape, bool); box[y0:y1, x0:x1] = True
    tile = (rgb[..., 0] - rgb[..., 2] > 30) & (sat > 30) & (sat < 95) & (mean > 85) & (mean < 205)   # warm terracotta
    patch = box & (raw[..., 3] > 128) & ~(tile & ~nd.binary_dilation(lab == k, iterations=1))
    if not (nd.binary_dilation(patch, iterations=6) & (a[..., 3] > 128)).any(): return a
    a = a.copy(); a[patch] = raw[patch]
    return a

DEBUG_NAME = ['']
NO_BODY = ('thief_victory_2.png',)   # 1.119: judged by eye, the model's answer brought a patch of the sandy floor back: today's cut kept
BAND = 8   # 1.119: the band of untouched picture round the kept figure shown to the model when the whole picture fails
def add_body(a, raw, g, min_alpha=128, clean=0.12):
    """1.119 (Suleiman 27 Nov: "Leol has no feet", "the Thief is missing his legs"). The floor clean-up (detile, deslab) goes by
    colour, and Leol's paws and fur and the Thief's cream trousers and sandals are the colour of the terracotta tile, so it took them
    with the tile. A person-segmentation model (rembg u2net_human_seg) tells the figure from the floor by shape, not colour: what it
    calls body is put back from the untouched cut. It sometimes drops a weapon or a sling cord, so nothing the colour clean-up kept
    is taken away (the result is both together).
    The model does not always leave the tile out (at this small size it can see figure and tile as one shape), so it is asked
    several ways (bigger, with a margin round it) and the answer that keeps the least of the slab's SIDE faces wins: feet stand on
    the top of the tile and never cover its sides, so an answer that keeps the sides has kept the tile. If every answer keeps more
    than "clean" of the sides (a fighter lying on the tile), the picture stays as the colour clean-up left it.
    Only solid body (model alpha min_alpha or more), joined to what is kept and above the slab's sides, comes back."""
    from bgremove import rembg_rgba
    from scipy import ndimage as nd
    from detile import _poly_mask
    if g is None: return a
    h, w = raw.shape[:2]
    xl, ylt, xr, yrt, xf, yft, yt, th = g
    sides = _poly_mask(h, w, [(xl, ylt + 2), (xf, yft + 2), (xr, yrt + 2), (xr, yrt + th), (xf, yft + th), (xl, ylt + th)]) & (raw[..., 3] > 128)
    below = _poly_mask(h, w, [(xl - 3, ylt + 1), (xf, yft + 1), (xr + 3, yrt + 1), (xr + 3, h + 5), (xl - 3, h + 5)])
    if sides.sum() < 20: return a
    base = Image.new('RGBA', (w, h), (0, 0, 0, 255)); base.alpha_composite(Image.fromarray(raw)); base = base.convert('RGB')
    best = None
    for scale, pad in [(3, 0.3), (1, 0.0), (3, 0.0), (1, 0.4), (2, 0.2)]:
        im = base.resize((w * scale, h * scale), Image.LANCZOS)
        p = int(max(im.size) * pad)
        big = Image.new('RGB', (im.width + 2 * p, im.height + 2 * p), (0, 0, 0)); big.paste(im, (p, p))
        m = np.array(rembg_rgba(big, 'u2net_human_seg'))[..., 3][p:p + im.height, p:p + im.width]
        m = np.array(Image.fromarray(m).resize((w, h), Image.BILINEAR)) >= min_alpha
        side = (m & sides).sum() / float(sides.sum())
        if best is None or side < best[0]: best = (side, m)
        if side < 0.02: break
    kept = a[..., 3] > 20
    how = 'whole'
    if best[0] > clean:
        # Every answer kept the tile (the Thief's grassy tile with its plate reads as "a man on a platform"). Ask again, showing
        # the model only what is kept with a band of BAND pixels of the untouched picture round it, the rest black: it then sees
        # the broken legs on black and joins them up. Only that band can come back.
        band = nd.binary_dilation(kept, iterations=BAND) & ~below
        inp = raw.copy(); inp[~(band | kept), 3] = 0
        im = Image.new('RGBA', (w, h), (0, 0, 0, 255)); im.alpha_composite(Image.fromarray(inp)); im = im.convert('RGB').resize((w * 3, h * 3), Image.LANCZOS)
        p = int(max(im.size) * 0.3)
        big = Image.new('RGB', (im.width + 2 * p, im.height + 2 * p), (0, 0, 0)); big.paste(im, (p, p))
        m = np.array(rembg_rgba(big, 'u2net_human_seg'))[..., 3][p:p + im.height, p:p + im.width]
        best = (best[0], (np.array(Image.fromarray(m).resize((w, h), Image.BILINEAR)) >= min_alpha) & band)
        how = 'band'
    if os.environ.get('DEBUG_BODY'): print('add_body', DEBUG_NAME[0], 'side %.2f' % best[0], how, file=sys.stderr)
    body = best[1] & (raw[..., 3] > 20) & ~below
    lab, n = nd.label(body | kept)
    if not n: return a
    near = set(np.unique(lab[kept])) - {0}   # pieces of body joined to what is kept
    back = body & ~kept & np.isin(lab, list(near))
    # A wedge of paving can come back joined to a foot. The paving's colours are learnt from the top of the tile the model left
    # out; restored pixels in those colours that make a solid patch (still there after an opening of radius 2) are paving, not a
    # paw: a paw breaks up under it (its outline and the fur's shading are not paving colours).
    top = _poly_mask(h, w, [(xl, ylt), (xf, yt), (xr, yrt), (xf, yft)])
    floor = top & ~best[1] & (raw[..., 3] > 128)
    if floor.sum() > 50:
        q = (raw[..., :3].astype(int) // 16)
        key = q[..., 0] * 256 + q[..., 1] * 16 + q[..., 2]
        hist = np.bincount(key[floor], minlength=4096)
        common = hist >= max(3, np.percentile(hist[hist > 0], 40))
        paving = back & common[key]
        disk = np.array([[0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0]], bool)
        patch = nd.binary_dilation(nd.binary_opening(paving, structure=disk), iterations=1) & back & (common[key] | top)
        back &= ~patch
        # (pieces cut off by that, no longer joined to the figure, go too)
        lab, n = nd.label(back | kept)
        near = set(np.unique(lab[kept])) - {0}
        back &= np.isin(lab, list(near))
    a = a.copy(); a[back] = raw[back]
    return a

# detile front: how far above the tile's front edges everything is cleared (share of the half width). Lying poses lie ON the slab top,
# a little higher; the barricade is not a figure (its own frame stands on the tile edges): no clearing.
FRONT = {'barricade': None}   # detile: how common a colour must be in the tile samples (see detile.py)

def cut_all(prefix):
    out = {}
    for sheet in [n for n in SHEETS if n.startswith(prefix + '_')]:
        parts, files = L.raw(sheet)
        names = []
        for i, (cl, box) in enumerate(parts):
            name = '%s_%d.png' % (sheet, i + 1)
            DEBUG_NAME[0] = name
            # keep=0.02: a sling's cord or a dagger can be apart from the body
            mk.final_cut(cl, box, L.OUT + name, BASE, keep=0.02)
            a = np.array(Image.open(L.OUT + name).convert('RGBA'))
            raw = a.copy()
            if sheet.endswith('barricade'): a = detile(a, common=COMMON[prefix])
            else:
                # 26 Nov: detile takes the top face; deslab then takes the slab's sides, rims and plate, read from the untouched cut
                from detile import slab_geometry
                g = slab_geometry(a)
                if os.environ.get('DEBUG'): print('DEBUG', name, a.shape[:2], 'slab' if g else 'NO SLAB', file=sys.stderr); Image.fromarray(raw).save(WORK + 'dbg_' + name)
                a = deslab(detile(a, common=COMMON[prefix]), geom=g, colour=False, rim=0.05 if sheet in NO_BACK else RIM[prefix], raw=raw, back=0 if sheet in NO_BACK else BACK[prefix]) if g and not sheet.endswith('ambush') else detile(a, common=COMMON[prefix])
                # (the ambush is a leap above the tile: its outline is not the slab's)
                if not sheet.endswith('ambush') and name not in NO_BODY: a = add_body(a, raw, g)   # 1.119: the feet and legs the colour clean-up took with the tile
                # loose pieces low down (a shadow or blood under the victory pose)
                from scipy import ndimage as nd
                bb = Image.fromarray(a).getbbox()
                if bb:
                    sol = a[..., 3] > 20; lab, n = nd.label(sol)
                    if n > 1:
                        sz = nd.sum(sol, lab, range(1, n + 1)); tops = nd.minimum(np.arange(a.shape[0])[:, None].repeat(a.shape[1], 1), lab, range(1, n + 1))
                        for i in range(1, n + 1):
                            if sz[i - 1] < 0.25 * sz.max() and tops[i - 1] > bb[1] + 0.72 * (bb[3] - bb[1]): a[lab == i, 3] = 0
            im = Image.fromarray(a); bb = im.getbbox()
            if bb: im = im.crop(bb)
            im.save(L.OUT + name, optimize=True)
            names.append(name)
        out[sheet] = names
        print(sheet, [Image.open(L.OUT + n).size for n in names], file=sys.stderr)
    return out

if __name__ == '__main__' and os.environ.get('MODE') == 'heights':
    set_heights(); print('heights written', HEIGHT, file=sys.stderr)

if __name__ == '__main__' and os.environ.get('MODE') == 'cut':
    set_heights()
    for p in sys.argv[2:] or ['leol', 'thief']:
        cut_all(p)
    # thin tile-edge lines left under the feet (strip_lines.py)
    import glob, strip_lines
    for f in sorted(glob.glob(L.OUT + '*_[1-4].png')):
        if os.path.basename(f).split('_')[0] in (sys.argv[2:] or ['leol', 'thief']) and 'barricade' not in f:
            im = Image.open(f).convert('RGBA'); b = Image.fromarray(strip_lines.strip(np.array(im))); bb = b.getbbox(); b = b.crop(bb) if bb else b; b.save(f, optimize=True)
