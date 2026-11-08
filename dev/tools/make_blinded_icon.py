# A simple Blinded icon (roadmap 13.26), drawn here until Suleiman makes his own: a pale eye with a
# slash through it, in smoke grey, on the dark square his other status icons sit on.
# Run from the repo root:  python3 dev/tools/make_blinded_icon.py   (writes public/art/icons/blinded.png)
from PIL import Image, ImageDraw, ImageFilter
import math
S = 4  # draw 4 times bigger, then shrink for smooth edges
N = 64 * S
bg = Image.new('RGBA', (N, N), (20, 20, 26, 255))
d = ImageDraw.Draw(bg)
# a soft lighter glow in the middle, like the other icons
glow = Image.new('RGBA', (N, N), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((N * 0.15, N * 0.15, N * 0.85, N * 0.85), fill=(120, 112, 105, 90))
bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(N * 0.12)))
# the eye: two arcs meeting in points at left and right
cx, cy, w, h = N / 2, N * 0.46, N * 0.38, N * 0.23
top = [(cx + w * t, cy - h * (1 - t * t) * 1.0) for t in [i / 20 - 1 for i in range(41)]]
bot = [(cx + w * t, cy + h * (1 - t * t) * 1.0) for t in [1 - i / 20 for i in range(41)]]
eye = Image.new('RGBA', (N, N), (0, 0, 0, 0))
e = ImageDraw.Draw(eye)
e.polygon(top + bot, fill=(226, 218, 208, 255), outline=(250, 244, 236, 255))
e.ellipse((cx - h * 0.62, cy - h * 0.62, cx + h * 0.62, cy + h * 0.62), fill=(70, 64, 62, 255))   # the iris
e.ellipse((cx - h * 0.24, cy - h * 0.24, cx + h * 0.24, cy + h * 0.24), fill=(20, 18, 20, 255))   # the pupil
# smoke wisps over the eye
for k, (dx, dy, r) in enumerate([(-0.55, 1.35, 0.38), (0.05, 1.5, 0.45), (0.65, 1.3, 0.36)]):
    e.ellipse((cx + w * dx - h * r, cy + h * dy - h * r, cx + w * dx + h * r, cy + h * dy + h * r), fill=(168, 160, 154, 120))
bg.alpha_composite(eye)
# the slash, in the same red the "no" symbols use
sl = Image.new('RGBA', (N, N), (0, 0, 0, 0))
ImageDraw.Draw(sl).line((N * 0.2, N * 0.8, N * 0.8, N * 0.2), fill=(224, 70, 52, 255), width=int(N * 0.07))
bg.alpha_composite(sl.filter(ImageFilter.GaussianBlur(S * 0.4)))
# a thin border in the card's tone
ImageDraw.Draw(bg).rectangle((0, 0, N - 1, N - 1), outline=(70, 66, 70, 255), width=S)
bg.resize((64, 64), Image.LANCZOS).save('public/art/icons/blinded.png')
print('ok')
