# Renders a rig (bones -> parts) to a picture, to check the assembly.
# Each bone: part (PNG name), parent bone, pivot [x, y] = its joint in the part's
# picture, tip [x, y] = the far joint (the part is turned so pivot->tip points
# straight down; children usually hang there), at [x, y] = where the pivot sits
# in the PARENT's picture, angle (degrees, clockwise), flip, scale, z (draw order).
import sys, json, math
from PIL import Image, ImageDraw
def mul(a, b):
    return [a[0]*b[0]+a[1]*b[3], a[0]*b[1]+a[1]*b[4], a[0]*b[2]+a[1]*b[5]+a[2],
            a[3]*b[0]+a[4]*b[3], a[3]*b[1]+a[4]*b[4], a[3]*b[2]+a[4]*b[5]+a[5]]
def T(x, y): return [1, 0, x, 0, 1, y]
def R(deg):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r); return [c, -s, 0, s, c, 0]
def S(sx, sy): return [sx, 0, 0, 0, sy, 0]
def ap(m, p): return (m[0]*p[0] + m[1]*p[1] + m[2], m[3]*p[0] + m[4]*p[1] + m[5])
def part_matrix(b):
    # part picture -> bone frame (pivot at 0,0, pivot->tip pointing down)
    fx = -1 if b.get('flip') else 1
    c = 0
    if b.get('tip'):
        dx = (b['tip'][0] - b['pivot'][0]) * fx; dy = b['tip'][1] - b['pivot'][1]
        c = math.degrees(math.atan2(dx, dy))
    sc = b.get('scale', 1)
    return mul(S(sc, sc), mul(R(c), mul(S(fx, 1), T(-b['pivot'][0], -b['pivot'][1]))))
def world(rig, pose=None):
    pose = pose or {}
    bones = {b['name']: b for b in rig['bones']}
    W = {}; P = {b['name']: part_matrix(b) for b in rig['bones']}
    def get(n):
        if n in W: return W[n]
        b = bones[n]; p = pose.get(n, {})
        ang = b.get('angle', 0) + p.get('angle', 0); mv = p.get('move', [0, 0])
        if b.get('parent'):
            ax, ay = ap(P[b['parent']], b['at'])
            m = mul(get(b['parent']), T(ax + mv[0], ay + mv[1]))
        else:
            m = T(rig['origin'][0] + mv[0], rig['origin'][1] + mv[1])
        W[n] = mul(m, R(ang)); return W[n]
    for n in bones: get(n)
    return {n: mul(W[n], P[n]) for n in bones}, W
def render(rig, parts_dir, size, pose=None, overlay=False, bg=(70, 52, 40, 255)):
    D, W = world(rig, pose)
    canvas = Image.new('RGBA', size, bg)
    for b in sorted(rig['bones'], key=lambda b: b.get('z', 0)):
        img = Image.open(parts_dir + '/' + b['part'] + '.png').convert('RGBA')
        a, bb, c, d, e, f = D[b['name']]
        det = a * e - bb * d
        inv = [e / det, -bb / det, (bb * f - c * e) / det, -d / det, a / det, (c * d - a * f) / det]
        canvas.alpha_composite(img.transform(size, Image.AFFINE, inv, resample=Image.BICUBIC))
    if overlay:
        dr = ImageDraw.Draw(canvas)
        for b in rig['bones']:
            x, y = ap(W[b['name']], (0, 0))
            dr.ellipse((x-4, y-4, x+4, y+4), outline=(0, 255, 255), width=2)
            dr.text((x + 5, y - 5), b['name'], fill=(0, 255, 255))
    return canvas
if __name__ == '__main__':
    rig = json.load(open(sys.argv[1]))
    pose = json.load(open(sys.argv[4])) if len(sys.argv) > 4 and sys.argv[4] != '-' else None
    ov = len(sys.argv) > 5
    render(rig, sys.argv[2], tuple(rig['canvas']), pose, overlay=ov).convert('RGB').save(sys.argv[3], quality=88)
