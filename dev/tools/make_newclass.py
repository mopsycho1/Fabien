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
# 1.125 (27 Nov): his standing 4 with its legs back by hand is 166, the new tallest: 79 x 166/162 = 81, drawn as big as before.
HEIGHT = {'leol': 114, 'thief': 81}   # Leol 92: at 100 he was as broad as the Bull Commander; 92 keeps him a big lion warrior, a little over the humans
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

# 1.125 (27 Nov, Baiyee: "try cleaning them by hand once, by eye on a contact sheet next to his sheet"). Where the colour clean-up
# and the person model both failed, areas marked by eye on the untouched cell (10 px grid, picture pixels before the crop):
# "erase" clears the tile's back rim left as pale strips, "body" puts back legs, trousers and paws from the untouched cut.
# Pixels within 2 px of a "body" outline in the paving's colours are left out (the outline drawn by eye can graze the tile).
# "fill" puts back holes closed in on every side (the colour clean-up took cream cloth inside the body).
HAND = {
    'thief_stand_1.png': {'erase': [[(0, 115), (38, 115), (38, 165), (0, 165)], [(112, 112), (160, 112), (160, 165), (112, 165)]],
                          'body': [[(38, 123), (52, 123), (54, 133), (48, 140), (48, 148), (46, 160), (40, 162), (32, 160), (32, 148), (34, 138), (36, 130)],
                                   [(98, 112), (110, 112), (112, 122), (122, 124), (128, 128), (129, 135), (124, 138), (108, 137), (100, 134), (98, 124)]]},
    'thief_stand_2.png': {'erase': [[(0, 118), (41, 118), (41, 146), (0, 146)], [(134, 118), (158, 118), (158, 150), (134, 150)]]},   # (legs whole; rim strips only)
    'thief_stand_3.png': {'erase': [[(0, 115), (42, 115), (42, 160), (0, 160)], [(130, 115), (160, 115), (160, 160), (130, 160)]],
                          'body': [[(44, 110), (55, 110), (56, 124), (52, 134), (45, 139), (30, 140), (26, 136), (30, 130), (40, 126), (44, 120)],
                                   [(112, 118), (127, 120), (128, 135), (130, 145), (133, 152), (131, 160), (118, 160), (116, 150), (117, 138), (113, 128)]]},
    'thief_stand_4.png': {'erase': [[(0, 122), (16, 122), (40, 138), (40, 165), (0, 165)], [(106, 115), (160, 115), (160, 170), (118, 170)]],
                          'body': [[(30, 104), (42, 110), (38, 118), (32, 124), (30, 132), (26, 138), (18, 138), (16, 130), (20, 122), (26, 112)],
                                   [(89, 124), (106, 124), (105, 140), (104, 150), (112, 153), (117, 158), (115, 165), (100, 166), (88, 165), (87, 155), (90, 145)]]},
    'thief_weak_1.png': {'erase': [[(0, 112), (36, 112), (40, 148), (0, 148)], [(152, 110), (190, 110), (190, 150), (152, 150)]],
                         'body': [[(38, 110), (58, 108), (60, 125), (58, 140), (62, 150), (60, 159), (45, 160), (40, 152), (42, 140), (40, 125)],
                                  [(113, 98), (133, 98), (136, 108), (148, 118), (152, 128), (140, 134), (120, 133), (114, 122), (112, 108)]]},
    'thief_weak_2.png': {'erase': [[(0, 112), (46, 112), (46, 148), (0, 148)], [(146, 112), (195, 112), (195, 150), (146, 150)]],
                         'body': [[(50, 110), (73, 110), (76, 130), (74, 145), (80, 152), (78, 162), (45, 162), (42, 153), (52, 145), (50, 130)],
                                  [(145, 105), (160, 108), (166, 118), (165, 128), (152, 130), (144, 122)]], 'fill': True},
    'thief_slash_1.png': {'erase': [[(0, 100), (50, 100), (52, 140), (0, 140)], [(178, 100), (225, 100), (225, 140), (208, 140), (206, 127), (185, 112)]],
                          'body': [[(68, 72), (110, 74), (122, 78), (128, 90), (128, 105), (124, 115), (112, 118), (100, 112), (85, 108), (80, 115), (76, 130), (78, 145), (78, 160), (70, 166), (55, 165), (52, 152), (55, 140), (58, 120), (62, 105), (65, 90)],
                                   [(118, 105), (132, 102), (140, 112), (140, 125), (128, 128), (118, 120)]]},
    'thief_slash_2.png': {'erase': [[(0, 98), (50, 98), (56, 112), (56, 140), (0, 140)]],
                          'body': [[(55, 85), (85, 80), (100, 95), (100, 115), (95, 125), (98, 140), (100, 152), (95, 160), (70, 160), (62, 152), (70, 140), (70, 120), (58, 110), (53, 95)],
                                   [(155, 100), (175, 100), (182, 112), (180, 122), (165, 122), (155, 112)]], 'fill': True},
    'thief_slash_3.png': {'erase': [[(0, 98), (28, 98), (30, 108), (0, 130)], [(186, 90), (225, 90), (225, 125), (186, 125)], [(165, 115), (186, 115), (186, 125), (165, 125)]],
                          'body': [[(65, 70), (108, 72), (112, 85), (105, 100), (90, 100), (80, 110), (78, 125), (78, 140), (75, 152), (58, 152), (55, 140), (60, 125), (60, 105), (64, 90)],
                                   [(150, 80), (170, 82), (180, 95), (185, 108), (182, 115), (165, 115), (155, 105), (150, 92)]]},
    # 1.126 (28 Nov): what the rim rule leaves. Victory 1 and 3: the shadow on the tile round his boots goes, his shins and boots
    # come back. Fallen 1, 3, 4 and trap 2: tile corners left at the sides. (Leol's Hammer Strike: the bits left are his paws and
    # the hammer, kept.)
    'thief_victory_1.png': {'erase': [[(48, 129), (94, 129), (94, 170), (48, 170)], [(119, 138), (150, 138), (150, 175), (119, 175)], [(0, 149), (48, 149), (48, 175), (0, 175)]],
                            'body': [[(30, 118), (48, 118), (48, 130), (46, 142), (38, 148), (24, 148), (22, 140), (30, 130)],
                                     [(100, 118), (113, 118), (113, 132), (116, 148), (117, 162), (108, 164), (100, 162), (99, 150), (100, 138)]]},
    'thief_victory_3.png': {'erase': [[(0, 143), (80, 143), (80, 180), (0, 180)], [(58, 134), (82, 134), (82, 143), (58, 143)],
                                      [(101, 128), (160, 128), (160, 180), (113, 180), (113, 150), (101, 140)]],
                            'body': [[(38, 120), (58, 120), (58, 138), (50, 143), (38, 140)],
                                     [(82, 124), (101, 124), (101, 140), (108, 150), (113, 160), (110, 168), (82, 168), (80, 155), (82, 140)]]},
    'thief_fallen_1.png': {'erase': [[(8, 75), (38, 75), (38, 114), (8, 114)]]},
    'thief_fallen_3.png': {'erase': [[(6, 75), (32, 75), (32, 110), (6, 110)], [(200, 78), (220, 78), (220, 110), (200, 110)]]},
    'thief_fallen_4.png': {'erase': [[(6, 74), (25, 74), (25, 106), (6, 106)], [(185, 74), (206, 74), (206, 106), (185, 106)]]},
    'thief_trap_2.png': {'erase': [[(12, 95), (38, 95), (38, 137), (12, 137)]]},
    # trap 4: his forearm and hand lie along the edge (the rule took them): put back, the strip with its tufts above them goes.
    'thief_trap_4.png': {'erase': [[(140, 80), (178, 80), (178, 104), (162, 104), (150, 97), (141, 89)]],
                         'body': [[(119, 80), (126, 78), (140, 90), (150, 98), (160, 106), (164, 116), (162, 126), (150, 128), (144, 120), (132, 108), (118, 96)]]},
    # Leol's Hammer Strike 1: the steel hammer head on the tile (lost since the first cut, 1.113) put back.
    'leol_hstrike_1.png': {'body': [[(111, 113), (125, 108), (139, 114), (139, 141), (126, 148), (111, 142)]],
                           'erase': [[(12, 104), (24, 104), (24, 122), (12, 122)], [(124, 90), (142, 90), (142, 103), (124, 103)]]},   # (two slivers of rim)
    'leol_down_1.png': {'erase': [[(0, 100), (30, 100), (36, 130), (0, 130)], [(203, 100), (230, 100), (230, 140), (203, 140)]],
                        'body': [[(32, 95), (45, 80), (70, 70), (78, 55), (95, 35), (110, 20), (130, 5), (175, 2), (190, 15), (195, 45), (190, 70), (180, 82), (185, 105),
                                  (200, 118), (202, 126), (190, 130), (172, 128), (168, 110), (160, 96), (145, 92), (128, 96), (126, 112), (124, 126), (122, 138), (105, 140),
                                  (100, 128), (98, 112), (90, 112), (75, 114), (62, 112), (60, 125), (55, 132), (42, 130), (36, 122), (38, 110), (30, 105)]]},
}
# 1.126 (28 Nov, Baiyee: the Thief's guard, dodge, hurt, victory, trap and kneel pictures and Leol's Hammer Strike, "the same way
# as 1.125"). Their strips are the tile's two BACK edges, a "^" behind him, often drawn as a doubled line with grass tufts. Rule,
# checked by eye on a contact sheet: in a band along those edges (UP px above to DOWN px below, read from the slab's corners), a
# column's pixels go when nothing of the figure continues above or below the band (legs, robes, daggers and the hammer cross the
# band; the strips do not); at the side corners the front edges' tips too. The few bits it leaves are marked in HAND below.
RIM_STRIPS = {'thief_parry_2.png', 'thief_parry_3.png', 'thief_parry_4.png', 'thief_dodge_1.png', 'thief_dodge_2.png', 'thief_hurt_2.png',
              'thief_hurt_3.png', 'thief_hurt_4.png', 'thief_victory_1.png', 'thief_victory_2.png', 'thief_victory_3.png', 'thief_trap_1.png',
              'thief_trap_2.png', 'thief_trap_4.png', 'thief_down_1.png', 'thief_fallen_1.png', 'thief_fallen_2.png', 'thief_fallen_3.png',
              'thief_fallen_4.png', 'leol_hstrike_1.png', 'leol_hstrike_2.png', 'leol_hstrike_3.png', 'leol_hstrike_4.png'}
def rim_strips(a, raw, up=7, down=14, gap=3, reach=10):
    from detile import slab_geometry
    from scipy import ndimage as nd
    g = slab_geometry(raw)
    if not g: return a
    xl, lt, xr, rt, xf, yft, yt, th = g
    H, W = a.shape[:2]
    sol = a[..., 3] > 20
    out = a.copy()
    back_y = lambda x: lt + (yt - lt) * (x - xl) / (xf - xl) if x <= xf else yt + (rt - yt) * (x - xf) / (xr - xf)
    front_y = lambda x: lt + (yft - lt) * (x - xl) / (xf - xl) if x <= xf else yft + (rt - yft) * (x - xf) / (xr - xf)
    for x in range(max(0, int(xl) - 3), min(W, int(xr) + 4)):
        xc = min(max(x, xl), xr)
        bands = [back_y(xc)] + ([front_y(xc)] if x < xl + 16 or x > xr - 16 else [])
        for yb in bands:
            y0, y1 = int(round(yb - up)), int(round(yb + down))
            y0c, y1c = max(0, y0), min(H, y1 + 1)
            if y1c <= y0c or not sol[y0c:y1c, x].any(): continue
            above = sol[max(0, y0 - gap - reach):max(0, y0 - gap), x].any()
            below = sol[min(H, y1 + gap):min(H, y1 + gap + reach), x].any()
            if not above and not below: out[y0c:y1c, x, 3] = 0
    s = out[..., 3] > 20; lab, k = nd.label(s)   # specks left apart from the figure go
    if k > 1:
        sz = nd.sum(s, lab, range(1, k + 1))
        for i in range(1, k + 1):
            if sz[i - 1] < 0.01 * sz.max(): out[lab == i, 3] = 0
    return out

def hand_clean(a, raw, h):
    from scipy import ndimage as nd
    H, W = raw.shape[:2]
    def poly(pts):
        m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(pts, fill=1); return np.array(m) > 0
    a = a.copy()
    for pts in h.get('erase', []): a[poly(pts), 3] = 0
    body = np.zeros((H, W), bool)
    for pts in h.get('body', []): body |= poly(pts)
    body &= raw[..., 3] > 20
    # the paving's colours: what the clean-up took that no "body" area covers, below the kept figure's middle
    kept = a[..., 3] > 20
    ys = np.nonzero(kept.any(1))[0]
    floor = (raw[..., 3] > 128) & ~kept & ~body
    if len(ys): floor[: (ys[0] + ys[-1]) // 2] = False
    q = raw[..., :3].astype(int) // 16; key = q[..., 0] * 256 + q[..., 1] * 16 + q[..., 2]
    if floor.sum() > 50:
        hist = np.bincount(key[floor], minlength=4096)
        common = hist >= max(3, np.percentile(hist[hist > 0], 50))
        rim = body & ~nd.binary_erosion(body, iterations=2)
        body &= ~(rim & common[key])
    a[body & ~kept] = raw[body & ~kept]
    if h.get('fill'):
        sol = a[..., 3] > 20; holes = nd.binary_fill_holes(sol) & ~sol & (raw[..., 3] > 20)
        a[holes] = raw[holes]
    # specks the erase left apart from the figure (a tip of the rim) go
    sol = a[..., 3] > 20; lab, n = nd.label(sol)
    if n > 1:
        sz = nd.sum(sol, lab, range(1, n + 1))
        for i in range(1, n + 1):
            if sz[i - 1] < 0.005 * sz.max(): a[lab == i, 3] = 0
    return a

# detile front: how far above the tile's front edges everything is cleared (share of the half width). Lying poses lie ON the slab top,
# a little higher; the barricade is not a figure (its own frame stands on the tile edges): no clearing.
FRONT = {'barricade': None}   # detile: how common a colour must be in the tile samples (see detile.py)

def cut_cell(sheet, i, cl, box, prefix):
    """One figure: cut from the untouched sheet, floor cleared, body put back. Gives back (picture, untouched cut), not cropped."""
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
    return a, raw

def cut_all(prefix):
    out = {}
    only = os.environ.get('ONLY', '').split(',') if os.environ.get('ONLY') else None   # ONLY=thief_stand_1.png,... re-cuts just those
    for sheet in [n for n in SHEETS if n.startswith(prefix + '_')]:
        parts, files = L.raw(sheet)
        names = []
        for i, (cl, box) in enumerate(parts):
            name = '%s_%d.png' % (sheet, i + 1)
            if only and name not in only: continue
            a, raw = cut_cell(sheet, i, cl, box, prefix)
            if name in RIM_STRIPS: a = rim_strips(a, raw)   # 1.126: the tile's back edges
            if name in HAND: a = hand_clean(a, raw, HAND[name])   # 1.125: cleaned by hand
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
        if os.environ.get('ONLY') and os.path.basename(f) not in os.environ['ONLY'].split(','): continue
        if os.path.basename(f).split('_')[0] in (sys.argv[2:] or ['leol', 'thief']) and 'barricade' not in f:
            im = Image.open(f).convert('RGBA'); b = Image.fromarray(strip_lines.strip(np.array(im))); bb = b.getbbox(); b = b.crop(bb) if bb else b; b.save(f, optimize=True)
