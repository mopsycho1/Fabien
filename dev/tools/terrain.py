# Cuts the terrain sheet into the pictures the board uses.
import sys; sys.path.insert(0, 'tools')
import numpy as np, cv2
from PIL import Image
from cut import foreground, cutout
SRC = '/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/fee3b543-image.png'
OUT = '/home/claude/fabien/public/art/terrain/'
pil = Image.open(SRC).convert('RGB'); im = np.array(pil)
S = 160

def top(name, T, R, B, L, inset=0.05):
    pts = np.float32([T, R, B, L]); c = pts.mean(0); pts = c + (pts - c) * (1 - inset)
    # square corners: (0,0)=top, (S,0)=right, (S,S)=bottom, (0,S)=left (matches boardArt.js)
    M = cv2.getPerspectiveTransform(pts, np.float32([[0, 0], [S, 0], [S, S], [0, S]]))
    Image.fromarray(cv2.warpPerspective(im, M, (S, S), flags=cv2.INTER_AREA)).save(OUT + f'top_{name}.png')

r1 = dict(t=127, c=226, b=333); r2 = dict(t=443, c=546, b=650)
for name, (lx, rx, cx), r in [
    ('sand', (19, 317, 168), r1), ('dust', (344, 642, 493), r1), ('cracked', (669, 967, 818), r1),
    ('stone', (994, 1290, 1142), r1), ('rift', (18, 317, 167), r2), ('sigil', (344, 642, 493), r2)]:
    top(name, (cx, r['t']), (rx, r['c']), (cx, r['b']), (lx, r['c']))

def unshear(x0, x1, ybase0, slope, v0, v1):
    W = x1 - x0; out = np.zeros((v1 - v0, W, 3), np.uint8)
    for u in range(W):
        x = x0 + u; yb = int(round(ybase0 + u * slope))
        out[:, u] = im[yb - 300 + v0: yb - 300 + v1, x]
    return Image.fromarray(out)
# Cliff faces of the tall rock block, straightened into rectangles
unshear(22, 163, 996, 0.719, 0, 300).crop((14, 90, 140, 232)).save(OUT + 'face_left_rock.png')
unshear(167, 309, 1098, -0.71, 0, 300).crop((2, 95, 128, 238)).save(OUT + 'face_right_rock.png')
unshear(22, 163, 996, 0.719, 0, 300).crop((14, 240, 140, 297)).save(OUT + 'face_left_band.png')
unshear(167, 309, 1098, -0.71, 0, 300).crop((2, 243, 128, 297)).save(OUT + 'face_right_band.png')

# Whole blocks as props (white background removed)
fg = foreground(pil)
def prop(name, box):
    y0, x0, y1, x1 = box
    cutout(pil, fg, (y0, x0, y1, x1, 0), pad=2).save(OUT + f'prop_{name}.png')
prop('cliff_low', (410, 991, 712, 1298))
prop('cliff_high', (713, 14, 1106, 318))
prop('spire', (715, 341, 1124, 644))
prop('sandfall', (724, 667, 1122, 965))
prop('sigil_wall', (730, 991, 1121, 1297))
prop('thicket', (437, 665, 711, 973))
print('ok')
