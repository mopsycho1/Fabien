# The Hidden Cavern built in Blender from src/data/maps/cavern.json (Graphics 2.0 step 3).
#
# Run (Blender 5.2 is in /Applications):
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
#     --python dev/blender/cavern_board.py -- <out dir> [rotations 0,1,2,3] [px per game px 1.5] [samples 96]
#
# For each camera turn it writes into <out dir>:
#   beauty_r<n>.png  the board, lit by its fires (see-through where there is nothing)
#   ids_r<n>.png     the same view in flat colours: one colour per tile block (for the top layer cut)
#   meta.json        the camera's region in game pixels, the colour of each tile, every flame's place
# dev/tools/make_board3d.py turns these into the game's pictures.
#
# The camera is the game's own: an orthographic view turned 45 degrees and tilted so a tile is
# 112 by 70 game pixels and one level of height is 28. One Blender unit is one tile across, so
# a tile at view column vc and view row vr sits at X = vc, Y = -vr, and its top at Z = height * LU.
# Game pixel x = 360 + 56 (X + Y), y = 400 + 35 (X - Y) - 61.82 Z  (grid.js tileToScreen).
import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0]) if ARGS else os.path.join(ROOT, 'dev', 'blender', 'out')
ROTS = [int(r) for r in ARGS[1].split(',')] if len(ARGS) > 1 else [0, 1, 2, 3]
K = float(ARGS[2]) if len(ARGS) > 2 else 1.5          # render pixels per game pixel
SAMPLES = int(ARGS[3]) if len(ARGS) > 3 else 96
os.makedirs(OUT, exist_ok=True)

MAP = json.load(open(os.path.join(ROOT, 'src', 'data', 'maps', 'cavern.json')))
B = MAP['board']
N = B['size']
TW, TH, LH, BASE = B['tileWidth'], B['tileHeight'], B['levelHeight'], B['baseDepth']
CX, TOPY = 360, 400                                     # config.js BOARD_CENTER_X, BOARD_TOP_Y
SIN = TH / TW                                           # the camera's tilt: sin = 70 / 112
COS = math.sqrt(1 - SIN * SIN)
S = TW / math.sqrt(2)                                   # game pixels per unit across the screen
LU = LH / (S * COS)                                     # one level of height in units
BU = BASE / (S * COS)                                   # the block under a height 0 tile
HEIGHTS = MAP['heights']
TERRAIN = MAP['terrain']
TEX = os.path.join(ROOT, 'public', 'art', 'terrain')
# The region of the game world the render covers (game pixels): the board, the walls behind,
# the floor in front. Anything outside is the game's own cave backdrop.
X0, Y0, WG, HG = -400, -90, 1520, 1350


def to_view(col, row, rot):
    n = N - 1
    if rot == 1: return n - row, col
    if rot == 2: return n - col, n - row
    if rot == 3: return row, n - col
    return col, row


def from_view(vc, vr, rot):
    n = N - 1
    if rot == 1: return vr, n - vc
    if rot == 2: return n - vc, n - vr
    if rot == 3: return n - vr, vc
    return vc, vr


def game_px(X, Y, Z):
    return CX + 56 * (X + Y) * TW / 112, TOPY + (TH / 2) * (X - Y) - S * COS * Z


# ---------------------------------------------------------------- materials
def srgb_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def image(path):
    name = os.path.basename(path)
    return bpy.data.images.get(name) or bpy.data.images.load(path)


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def textured(name, file, rough=0.85, bump=0.35, box=None, tint=None, emit=0.0, zdark=None):
    """A material from one of Suleiman's pictures. box = scale for a world-space box projection
    (rock sides, props); otherwise the face's own UVs (tile tops)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = principled(m)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image(os.path.join(TEX, file))
    if box:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (box, box, box)
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
        tex.projection = 'BOX'
        tex.projection_blend = 0.25
    col = tex.outputs['Color']
    if tint:
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        nt.links.new(col, mix.inputs[6])
        mix.inputs[7].default_value = (*tint, 1)
        col = mix.outputs[2]
    if zdark:
        # darker higher up (the walls reach up into the dark): zdark = (z where it starts, z where it ends, darkest)
        tc2 = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(tc2.outputs['Object'], sep.inputs[0])
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = zdark[0]
        mr.inputs['From Max'].default_value = zdark[1]
        mr.inputs['To Min'].default_value = 1.0
        mr.inputs['To Max'].default_value = zdark[2]
        nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
        dm = nt.nodes.new('ShaderNodeMix')
        dm.data_type = 'RGBA'
        dm.blend_type = 'MULTIPLY'
        dm.inputs['Factor'].default_value = 1.0
        nt.links.new(col, dm.inputs[6])
        nt.links.new(mr.outputs['Result'], dm.inputs[7])
        col = dm.outputs[2]
    nt.links.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    if emit:
        nt.links.new(col, bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = emit
    if bump:
        bn = nt.nodes.new('ShaderNodeBump')
        bn.inputs['Strength'].default_value = bump
        bn.inputs['Distance'].default_value = 0.02
        nt.links.new(tex.outputs['Color'], bn.inputs['Height'])
        nt.links.new(bn.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def plain(name, rgb, rough=0.7, emit=None, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = principled(m)
    b.inputs['Base Color'].default_value = (*[srgb_lin(c) for c in rgb], 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*[srgb_lin(c) for c in emit[0]], 1)
        b.inputs['Emission Strength'].default_value = emit[1]
    return m


def ground_fade(m):
    """The cave floor round the board fades into the dark (as drawCaveFloor does): see-through
    beyond about 2.5 tiles from the board's edge."""
    nt = m.node_tree
    bsdf = principled(m)
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])

    def op(kind, a, b=None, v=None):
        n = nt.nodes.new('ShaderNodeMath')
        n.operation = kind
        for i, x in enumerate((a, b)):
            if x is None: continue
            if isinstance(x, (int, float)): n.inputs[i].default_value = x
            else: nt.links.new(x, n.inputs[i])
        return n.outputs[0]
    # how far outside the board square (X -0.5..N-0.5, Y -(N-0.5)..0.5), front sides only
    dx = op('MAXIMUM', op('SUBTRACT', sep.outputs['X'], N - 0.5), 0.0)
    dy = op('MAXIMUM', op('SUBTRACT', op('MULTIPLY', sep.outputs['Y'], -1.0), N - 0.5), 0.0)
    d = op('MAXIMUM', dx, dy)
    keep = op('POWER', op('MAXIMUM', op('SUBTRACT', 1.0, op('DIVIDE', d, 2.6)), 0.0), 1.6)
    mix = nt.nodes.new('ShaderNodeMixShader')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    nt.links.new(keep, mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(bsdf.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


MATS = {}


def make_materials():
    for kind, file in (('F', 'floor'), ('S', 'sand'), ('R', 'rubble'), ('G', 'sigil'), ('W', 'water')):
        for v in range(4):
            if kind == 'W':
                m = textured('top_W_%d' % v, 'cave_water_%d.jpg' % v, rough=0.12, bump=0.08, emit=0.25)
                b = principled(m)
                b.inputs['Coat Weight'].default_value = 0.6
            else:
                m = textured('top_%s_%d' % (kind, v), 'cave_%s_%d.jpg' % (file, v), bump=0.3 if kind != 'S' else 0.15)
            MATS['%s%d' % (kind, v)] = m
    MATS['ring'] = textured('top_ring', 'cave_sigilring.jpg', bump=0.4)
    MATS['side'] = textured('side_rock', 'cave_wall_lit.jpg', box=0.62, bump=0.5, tint=(0.82, 0.74, 0.66))
    MATS['wall'] = textured('wall_rock', 'cave_wall_dark.jpg', box=0.45, bump=0.6, tint=(0.75, 0.68, 0.6), zdark=(3 * LU, 9 * LU, 0.3))
    MATS['wallTop'] = textured('wall_top', 'cave_rubble_1.jpg', box=0.8, bump=0.5, tint=(0.45, 0.4, 0.36), zdark=(3 * LU, 9 * LU, 0.3))
    MATS['ledgeTop'] = textured('ledge_top', 'cave_floor_2.jpg', box=0.9, bump=0.3)
    MATS['rock'] = textured('prop_rock', 'cave_wall_lit.jpg', box=1.1, bump=0.8, tint=(0.95, 0.85, 0.72))
    MATS['floorOut'] = ground_fade(textured('floor_out', 'cave_rubble_0.jpg', box=0.9, bump=0.3, tint=(0.8, 0.74, 0.68)))
    MATS['wood'] = plain('wood', (0.36, 0.22, 0.12), rough=0.8)
    MATS['plank'] = plain('plank', (0.55, 0.36, 0.2), rough=0.75)
    MATS['iron'] = plain('iron', (0.16, 0.13, 0.11), rough=0.45, metal=0.8)
    MATS['clay'] = plain('clay', (0.62, 0.3, 0.14), rough=0.55)
    MATS['clayDark'] = plain('clay_dark', (0.24, 0.11, 0.06), rough=0.6)
    MATS['bone'] = plain('bone', (0.78, 0.68, 0.5), rough=0.55)
    MATS['ember'] = plain('ember', (0.3, 0.1, 0.02), rough=0.9, emit=((1.0, 0.38, 0.08), 1.6))
    MATS['stoneBowl'] = plain('stone_bowl', (0.32, 0.24, 0.17), rough=0.7)
    MATS['poolWater'] = MATS['W1']


# ---------------------------------------------------------------- geometry helpers
OBJS = []   # (object, tile id or 0)


def new_obj(name, bm, mats, tile=0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = False
    OBJS.append((ob, tile))
    return ob


def bevel(ob, w=0.02):
    md = ob.modifiers.new('bevel', 'BEVEL')
    md.width = w
    md.segments = 2
    md.limit_method = 'ANGLE'


def add_box(bm, x0, x1, y0, y1, z0, z1, top_mat=0, side_mat=1, top_uv=None, bottom=False):
    v = [bm.verts.new(p) for p in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                                   (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
    faces = []
    top = bm.faces.new((v[4], v[5], v[6], v[7]))
    top.material_index = top_mat
    for a, b in ((0, 1), (1, 2), (2, 3), (3, 0)):
        f = bm.faces.new((v[a], v[b], v[b + 4], v[a + 4]))
        f.material_index = side_mat
        faces.append(f)
    if bottom:
        f = bm.faces.new((v[3], v[2], v[1], v[0]))
        f.material_index = side_mat
    uv = bm.loops.layers.uv.verify()
    if top_uv:
        for loop in top.loops:
            loop[uv].uv = top_uv(loop.vert.co.x, loop.vert.co.y)
    return top


def lumpy_rock(bm, cx, cy, cz, sx, sy, sz, rng, subdiv=2):
    res = bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    for v in res['verts']:
        k = 1 + (rng.random() - 0.5) * 0.35
        v.co = Vector((cx + v.co.x * sx * k, cy + v.co.y * sy * k, cz + max(v.co.z, -0.3) * sz * k))
    return res['verts']


def spike(bm, cx, cy, z, r, h, rng, segs=9, rings=7):
    """A stalagmite: rings narrowing to a point, roughened."""
    prev = None
    lean = Vector(((rng.random() - 0.5) * 0.15 * h, (rng.random() - 0.5) * 0.15 * h, 0))
    ring_list = []
    for i in range(rings):
        t = i / rings
        rr = r * (1 - t) ** 1.25
        ring = []
        for s in range(segs):
            a = 2 * math.pi * s / segs
            k = 1 + (rng.random() - 0.5) * 0.4
            ring.append(bm.verts.new((cx + math.cos(a) * rr * k + lean.x * t * t, cy + math.sin(a) * rr * k + lean.y * t * t, z + h * t - (0.1 * r if i == 0 else 0))))
        ring_list.append(ring)
    tip = bm.verts.new((cx + lean.x, cy + lean.y, z + h))
    for a, b in zip(ring_list, ring_list[1:]):
        for s in range(segs):
            bm.faces.new((a[s], a[(s + 1) % segs], b[(s + 1) % segs], b[s]))
    last = ring_list[-1]
    for s in range(segs):
        bm.faces.new((last[s], last[(s + 1) % segs], tip))


def lathe(bm, cx, cy, z, profile, segs=20, mat=0):
    """profile: [(radius, height)] bottom to top (a pot)."""
    rings = []
    for r, h in profile:
        rings.append([bm.verts.new((cx + math.cos(2 * math.pi * s / segs) * r, cy + math.sin(2 * math.pi * s / segs) * r, z + h)) for s in range(segs)])
    out = []
    for a, b in zip(rings, rings[1:]):
        for s in range(segs):
            f = bm.faces.new((a[s], a[(s + 1) % segs], b[(s + 1) % segs], b[s]))
            f.material_index = mat
            f.smooth = True
            out.append(f)
    return out


def cylinder(bm, p0, p1, r, segs=8):
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0).normalized()
    a = d.orthogonal().normalized()
    b = d.cross(a)
    r0 = [bm.verts.new(p0 + (a * math.cos(2 * math.pi * s / segs) + b * math.sin(2 * math.pi * s / segs)) * r) for s in range(segs)]
    r1 = [bm.verts.new(p1 + (a * math.cos(2 * math.pi * s / segs) + b * math.sin(2 * math.pi * s / segs)) * r) for s in range(segs)]
    for s in range(segs):
        f = bm.faces.new((r0[s], r0[(s + 1) % segs], r1[(s + 1) % segs], r1[s]))
        f.smooth = True
    bm.faces.new(list(reversed(r0)))
    bm.faces.new(r1)


# ---------------------------------------------------------------- the board
def tile_uv(col, row, rot, ring=None):
    """UVs for a tile top, in MAP columns and rows, so the ground turns with the board."""
    def f(x, y):
        c, r = from_view(x, -y, rot)
        if ring:
            return ((c - ring[0] + 1.5) / 3, 1 - (r - ring[1] + 1.5) / 3)
        return (c - col + 0.5, 1 - (r - row + 0.5))
    return f


def build_board(rot, rng):
    ring = MAP.get('sigilCircle')
    tiles = {}
    for row in range(N):
        for col in range(N):
            vc, vr = to_view(col, row, rot)
            h = HEIGHTS[row][col]
            kind = TERRAIN[row][col]
            tid = row * N + col + 1
            tiles[tid] = (col, row)
            bm = bmesh.new()
            v = (col * 131 + row * 17 + 5) % 4
            x0, x1, y0, y1 = vc - 0.5, vc + 0.5, -vr - 0.5, -vr + 0.5
            if kind == 'B':
                # a bridge: the water underneath, and a deck of planks at the tile's height on posts
                add_box(bm, x0, x1, y0, y1, -BU, 0, 0, 1, tile_uv(col, row, rot))
                mats = [MATS['W%d' % v], MATS['side'], MATS['plank'], MATS['wood']]
                # the planks run across the gap: along whichever axis has water on both sides
                nb = [(col - 1, row), (col + 1, row)]
                across_x = all(0 <= c < N and TERRAIN[r][c] in 'WB' for c, r in nb)
                deck = h * LU
                planks = 6
                for i in range(planks):
                    t0 = -0.5 + i / planks + 0.012
                    t1 = -0.5 + (i + 1) / planks - 0.012
                    dz = (rng.random() - 0.5) * 0.02
                    # a plank lies across the walking direction: water on its map-column sides means
                    # it is long along the map's columns, which is the view's X when the turn is even
                    if across_x == (rot % 2 == 0):
                        add_box(bm, x0 - 0.02, x1 + 0.02, -vr + t0, -vr + t1, deck - 0.07 + dz, deck + dz, 2, 2)
                    else:
                        add_box(bm, vc + t0, vc + t1, y0 - 0.02, y1 + 0.02, deck - 0.07 + dz, deck + dz, 2, 2)
                for px, py in ((x0 + 0.08, y0 + 0.08), (x1 - 0.08, y0 + 0.08), (x0 + 0.08, y1 - 0.08), (x1 - 0.08, y1 - 0.08)):
                    cylinder(bm, (px, py, -BU), (px, py, deck + 0.06), 0.045, 6)
                ob = new_obj('tile_%d_%d' % (col, row), bm, mats, tid)
                for p in ob.data.polygons:
                    if p.material_index == 3: p.use_smooth = True
                continue
            if kind == 'G' and ring and abs(col - ring[0]) <= 1 and abs(row - ring[1]) <= 1:
                top_mat, uv = MATS['ring'], tile_uv(col, row, rot, ring)
            else:
                top_mat, uv = MATS['%s%d' % (kind, v)], tile_uv(col, row, rot)
            top_z = h * LU - (0.03 if kind == 'W' else 0)
            add_box(bm, x0, x1, y0, y1, -BU, top_z, 0, 1, uv)
            mats = [top_mat, MATS['side'], MATS['stoneBowl'], MATS['ember']]
            # a ritual lamp at the tile's outer corner (drawLamp)
            if [col, row] in MAP.get('lamps', []):
                cvc, cvr = to_view(ring[0], ring[1], rot)
                dvc = (vc > cvc) - (vc < cvc)
                dvr = (vr > cvr) - (vr < cvr)
                lx, ly = vc + dvc * 0.36, -(vr + dvr * 0.36)
                prof = [(0.07, 0), (0.1, 0.02), (0.12, 0.07), (0.1, 0.08), (0.08, 0.06)]
                for f in lathe(bm, lx, ly, top_z, prof, 14, 2): pass
                disk = bmesh.ops.create_circle(bm, cap_ends=True, radius=0.08, segments=12)
                for vv in disk['verts']: vv.co += Vector((lx, ly, top_z + 0.065))
                for f in disk['verts'][0].link_faces: f.material_index = 3
                FLAMES.append({'kind': 'lamp', 'col': col, 'row': row, 'X': lx, 'Y': ly, 'Z': top_z + 0.07, 'front': dvc + dvr > 0})
            ob = new_obj('tile_%d_%d' % (col, row), bm, mats, tid)
            bevel(ob, 0.018)
    return tiles


def build_surround(rng):
    s = MAP.get('surround', {})
    ledge, wall = s.get('ledgeHeight', 3), s.get('wallHeight', 9)
    # the rock walls round the far sides, reaching up out of view: layers of stone like his wall
    # painting, each layer stepping back a little and broken into slabs of uneven width
    bm = bmesh.new()

    def strata(along0, along1, back_arm):
        top = (wall + rng.random() * 1.2) * LU
        z, inset = -BU, 0.0
        while z < top:
            dz = 0.35 + rng.random() * 0.55
            inset = min(0.7, inset + rng.random() * 0.12 - 0.02)
            # cut each layer into 1 to 3 slabs, each sticking out a little differently
            cuts = sorted([along0, along1] + [along0 + rng.random() * (along1 - along0) for _ in range(rng.randrange(0, 3))])
            for u0, u1 in zip(cuts, cuts[1:]):
                if u1 - u0 < 0.08: continue
                f = inset + (rng.random() - 0.3) * 0.12
                if back_arm:   # the far wall: its face looks down the board (towards -Y)
                    add_box(bm, u0, u1, 1.5 + f, 3.5, z, z + dz, 0, 1)
                else:          # the left wall: its face looks towards +X
                    add_box(bm, -3.5, -1.5 - f, -u1, -u0, z, z + dz, 0, 1)
            z += dz
    for vc in range(-3, N + 1):
        strata(vc - 0.5, vc + 0.5, True)
    for vr in range(-1, N + 1):
        strata(vr - 0.5, vr + 0.5, False)
    ob = new_obj('walls', bm, [MATS['wallTop'], MATS['wall']])
    bevel(ob, 0.04)
    # fallen rocks along the foot of the wall
    bm = bmesh.new()
    for i in range(36):
        t = rng.random() * (N + 2) - 2
        if rng.random() < 0.5:
            lumpy_rock(bm, t, 1.42, ledge * LU, 0.12 + rng.random() * 0.12, 0.1, 0.08 + rng.random() * 0.1, rng, 1)
        else:
            lumpy_rock(bm, -1.42, -t, ledge * LU, 0.1, 0.12 + rng.random() * 0.12, 0.08 + rng.random() * 0.1, rng, 1)
    new_obj('wall_lumps', bm, [MATS['rock']])
    # the ledge one tile deep, at ledge height
    bm = bmesh.new()
    for vc in range(-1, N + 1):
        add_box(bm, vc - 0.5, vc + 0.5, 0.5, 1.5, -BU, ledge * LU, 0, 1)
    for vr in range(0, N + 1):
        add_box(bm, -1.5, -0.5, -vr - 0.5, -vr + 0.5, -BU, ledge * LU, 0, 1)
    ob = new_obj('ledge', bm, [MATS['ledgeTop'], MATS['side']])
    bevel(ob, 0.03)
    # the cave floor in front of the board (it fades into the dark)
    bm = bmesh.new()
    add_box(bm, -0.5, N + 3.5, -N - 3.5, 0.5, -BU - 0.01, -BU, 0, 0)
    new_obj('floor_out', bm, [MATS['floorOut']])
    # his props on the ledge
    for item in s.get('props', []):
        vc, vr = item['at']
        prop(item['prop'], vc + 0.18, -(vr + 0.18), ledge * LU, rng, flip=item.get('flip'))


def prop(kind, x, y, z, rng, flip=False):
    bm = bmesh.new()
    mats = [MATS['rock']]
    if kind in ('stalagmiteTall', 'stalagmiteShort'):
        big = kind == 'stalagmiteTall'
        spike(bm, x, y, z, 0.34 if big else 0.3, 3.2 if big else 1.9, rng)
        for i in range(6 if big else 5):
            a = rng.random() * 2 * math.pi
            d = 0.25 + rng.random() * 0.3
            spike(bm, x + math.cos(a) * d, y + math.sin(a) * d, z, 0.1 + rng.random() * 0.12, (0.5 + rng.random() * 0.9) * (1.4 if big else 1.0), rng)
        for i in range(5):
            a = rng.random() * 2 * math.pi
            lumpy_rock(bm, x + math.cos(a) * 0.5, y + math.sin(a) * 0.5, z, 0.12, 0.12, 0.08, rng, 1)
    elif kind == 'pillar':
        add_box(bm, x - 0.2, x + 0.2, y - 0.2, y + 0.2, z, z + 2.3, 0, 0)
        add_box(bm, x - 0.28, x + 0.28, y - 0.28, y + 0.28, z, z + 0.22, 0, 0)
        add_box(bm, x - 0.24, x + 0.24, y - 0.24, y + 0.24, z + 2.25, z + 2.42, 0, 0)
        for i in range(6):
            a = rng.random() * 2 * math.pi
            lumpy_rock(bm, x + math.cos(a) * 0.38, y + math.sin(a) * 0.38, z, 0.1, 0.1, 0.08, rng, 1)
        mats = [MATS['rock']]
    elif kind == 'rockPile':
        for i in range(6):
            a = rng.random() * 2 * math.pi
            d = 0 if i == 0 else 0.2 + rng.random() * 0.25
            s_ = 0.42 if i == 0 else 0.15 + rng.random() * 0.15
            lumpy_rock(bm, x + math.cos(a) * d, y + math.sin(a) * d, z + s_ * 0.5, s_, s_ * 0.9, s_ * (1.3 if i == 0 else 1), rng)
    elif kind == 'pots':
        mats = [MATS['clay'], MATS['clayDark']]
        big = [(0.12, 0), (0.2, 0.08), (0.25, 0.25), (0.22, 0.42), (0.12, 0.55), (0.1, 0.62), (0.13, 0.66), (0.1, 0.66), (0.08, 0.5)]
        small = [(0.08, 0), (0.14, 0.06), (0.16, 0.17), (0.12, 0.3), (0.07, 0.36), (0.09, 0.4), (0.06, 0.4), (0.05, 0.3)]
        fs = lathe(bm, x - 0.06, y + 0.06, z, big, 22)
        fs2 = lathe(bm, x + 0.24, y - 0.16, z, small, 18)
        # the necks and insides are dark
        for f in fs[-2 * 22:] + fs2[-2 * 18:]: f.material_index = 1
        # a dark painted band round the belly of the big pot
        for f in fs[2 * 22:3 * 22]: f.material_index = 1
    elif kind == 'brazier':
        mats = [MATS['wood'], MATS['iron'], MATS['ember']]
        top = z + 1.0
        for i in range(3):
            a = 2 * math.pi * i / 3 + 0.3
            cylinder(bm, (x + math.cos(a) * 0.26, y + math.sin(a) * 0.26, z), (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, top - 0.05), 0.03, 6)
        fs = lathe(bm, x, y, top - 0.1, [(0.08, 0), (0.16, 0.05), (0.2, 0.16), (0.21, 0.18), (0.18, 0.16)], 16, 1)
        disk = bmesh.ops.create_circle(bm, cap_ends=True, radius=0.18, segments=14)
        for v in disk['verts']: v.co += Vector((x, y, top + 0.05))
        for f in disk['verts'][0].link_faces: f.material_index = 2
        FLAMES.append({'kind': 'brazier', 'X': x, 'Y': y, 'Z': top + 0.1})
    elif kind == 'bones':
        mats = [MATS['bone'], MATS['clayDark']]
        res = bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=0.13)
        for v in res['verts']:
            v.co = Vector((x + v.co.x, y + v.co.y * 1.15, z + 0.12 + v.co.z * 0.9))
        for f in bm.faces: f.smooth = True
        # eye holes
        for dx in (-0.05, 0.05):
            e = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.035)
            for v in e['verts']: v.co += Vector((x + dx + 0.07, y - 0.1, z + 0.14))
            for f in {f for v in e['verts'] for f in v.link_faces}: f.material_index = 1
        for i in range(7):
            a = rng.random() * math.pi
            L = 0.25 + rng.random() * 0.25
            cx, cy = x + (rng.random() - 0.5) * 0.6, y + (rng.random() - 0.5) * 0.5
            p0 = (cx - math.cos(a) * L / 2, cy - math.sin(a) * L / 2, z + 0.03)
            p1 = (cx + math.cos(a) * L / 2, cy + math.sin(a) * L / 2, z + 0.03)
            cylinder(bm, p0, p1, 0.022, 6)
            for p in (p0, p1):
                k = bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=4, radius=0.04)
                for v in k['verts']: v.co += Vector(p)
    elif kind == 'rockPool':
        mats = [MATS['rock'], MATS['poolWater']]
        for i in range(11):
            a = 2 * math.pi * i / 11
            lumpy_rock(bm, x + math.cos(a) * 0.62, y + math.sin(a) * 0.45, z + 0.05, 0.16 + rng.random() * 0.08, 0.14, 0.12 + rng.random() * 0.1, rng, 1)
        disk = bmesh.ops.create_circle(bm, cap_ends=True, radius=0.6, segments=24)
        for v in disk['verts']: v.co = Vector((x + v.co.x, y + v.co.y * 0.75, z + 0.06))
        for f in disk['verts'][0].link_faces: f.material_index = 1
    else:
        bm.free()
        return
    ob = new_obj('prop_' + kind, bm, mats)
    if kind in ('stalagmiteTall', 'stalagmiteShort', 'rockPile', 'pillar'):
        bevel(ob, 0.015)


# ---------------------------------------------------------------- lights, camera
FLAMES = []


def build_lights():
    for i, f in enumerate(FLAMES):
        ld = bpy.data.lights.new('fire%d' % i, 'POINT')
        ld.color = (1.0, 0.52, 0.22)
        big = f['kind'] == 'brazier'
        ld.energy = 260 if big else 55
        ld.shadow_soft_size = 0.12 if big else 0.05
        ob = bpy.data.objects.new('fire%d' % i, ld)
        ob.location = (f['X'], f['Y'], f['Z'] + (0.45 if big else 0.3))
        bpy.context.scene.collection.objects.link(ob)
    # a soft warm fill from high above the far corner: the board must stay readable between fires
    ld = bpy.data.lights.new('fill', 'AREA')
    ld.shape = 'DISK'
    ld.size = 10
    ld.energy = 900
    ld.color = (1.0, 0.82, 0.62)
    ob = bpy.data.objects.new('fill', ld)
    ob.location = (2, 2, 12)
    ob.rotation_euler = (math.radians(25), math.radians(-25), 0)
    bpy.context.scene.collection.objects.link(ob)
    # and a faint cool bounce from the camera side, for the shadows
    ld = bpy.data.lights.new('bounce', 'AREA')
    ld.size = 14
    ld.energy = 160
    ld.color = (0.62, 0.72, 0.9)
    ob = bpy.data.objects.new('bounce', ld)
    ob.location = (N + 6, -N - 6, 8)
    ob.rotation_euler = Vector((-1, 1, 1.3)).to_track_quat('Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(ob)


def build_camera():
    a = 1 / math.sqrt(2)
    right = Vector((a, a, 0))
    up = Vector((-SIN * a, SIN * a, COS))
    fwd = Vector((-COS * a, COS * a, -SIN))
    cd = bpy.data.cameras.new('cam')
    cd.type = 'ORTHO'
    cd.ortho_scale = WG / S
    cd.clip_start = 0.1
    cd.clip_end = 300
    cam = bpy.data.objects.new('cam', cd)
    bpy.context.scene.collection.objects.link(cam)
    # the world point at the middle of the region (on Z = 0)
    gx, gy = X0 + WG / 2, Y0 + HG / 2
    p = (gx - CX) / 56.0
    q = (gy - TOPY) / 35.0
    centre = Vector(((p + q) / 2, (p - q) / 2, 0))
    cam.matrix_world = Matrix.Translation(centre - fwd * 60) @ Matrix((right, up, -fwd)).transposed().to_4x4()
    bpy.context.scene.camera = cam


def setup_render(scene):
    r = scene.render
    r.resolution_x = round(WG * K)
    r.resolution_y = round(HG * K)
    r.resolution_percentage = 100
    r.film_transparent = True
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.dither_intensity = 0
    try:
        scene.view_settings.view_transform = 'Standard'   # his colours as painted, no film curve
    except TypeError as e:
        print('view transform:', e)
    scene.view_settings.look = 'None'
    world = bpy.data.worlds.new('cave')
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.012, 0.008, 0.006, 1)
    scene.world = world


def render_beauty(scene, path):
    try:
        scene.render.engine = 'CYCLES'
    except TypeError as e:
        print(e)
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices: d.use = True
        scene.cycles.device = 'GPU'
    except Exception as e:
        print('GPU not available, using the CPU:', e)
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def id_colour(tid):
    # tile ids 1..121 in steps of 16 on red and green (blue marks "a tile"), sure to survive 8 bits
    return ((tid % 16) * 16 + 8, (tid // 16) * 16 + 8, 200)


def render_ids(scene, path):
    try:
        scene.render.engine = 'BLENDER_WORKBENCH'
    except TypeError as e:
        print(e)
    sh = scene.display.shading
    sh.light = 'FLAT'
    sh.color_type = 'OBJECT'
    sh.show_shadows = False
    sh.show_cavity = False
    sh.show_object_outline = False
    sh.show_specular_highlight = False
    scene.display.render_aa = 'OFF'
    for ob, tid in OBJS:
        if tid:
            c = id_colour(tid)
            ob.color = (srgb_lin(c[0] / 255), srgb_lin(c[1] / 255), srgb_lin(c[2] / 255), 1)
        else:
            ob.color = (0, 0, 0, 1)
    # the faded floor in front: in the id pass it is a plain black (not a tile)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def clear():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for me in list(bpy.data.meshes):
        bpy.data.meshes.remove(me)
    for l in list(bpy.data.lights):
        bpy.data.lights.remove(l)
    OBJS.clear()
    FLAMES.clear()


def main():
    scene = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    make_materials()
    setup_render(scene)
    meta_path = os.path.join(OUT, 'meta.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    meta.update({'region': [X0, Y0, WG, HG], 'k': K, 'size': [round(WG * K), round(HG * K)],
                 'ids': {str(t): list(id_colour(t)) for t in range(1, N * N + 1)}})
    meta.setdefault('flames', {})
    for rot in ROTS:
        clear()
        rng = random.Random(1234 + rot)
        build_board(rot, rng)
        build_surround(random.Random(99))   # the surround is the same from every side (it is in the view)
        build_lights()
        build_camera()
        flames = []
        for f in FLAMES:
            x, y = game_px(f['X'], f['Y'], f['Z'])
            e = {'kind': f['kind'], 'x': round(x, 1), 'y': round(y, 1)}
            if f['kind'] == 'lamp':
                e.update({'col': f['col'], 'row': f['row'], 'front': f['front']})
            else:
                e['depth'] = round((f['X'] - f['Y']) * 2 - 0.2, 2)
            flames.append(e)
        meta['flames'][str(rot)] = flames
        render_beauty(scene, os.path.join(OUT, 'beauty_r%d.png' % rot))
        render_ids(scene, os.path.join(OUT, 'ids_r%d.png' % rot))
        json.dump(meta, open(meta_path, 'w'), indent=1)
        print('ROTATION %d DONE' % rot)


main()
