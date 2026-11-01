# The Drenched icon (roadmap 11.4) in the style of his status icons: a dark
# square, one glowing symbol. A water drop over ripples, drawn big and shrunk.
# Run from dev/: python3 tools/make_drenched_icon.py <out png>
import sys, math
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1] if len(sys.argv) > 1 else '../public/art/icons/drenched.png'
S = 256
bg = Image.new('RGBA', (S, S), (8, 22, 28, 255))
# a soft teal glow behind
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((40, 30, 216, 220), fill=(40, 150, 170, 150))
bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(36)))
# the drop: a circle with a point on top
drop = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(drop)
cx, cy, r = 128, 140, 58
pts = [(cx, 26)]
for i in range(0, 181):
    a = math.radians(-30 + i * (240 / 180))
    pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
pts = [(cx, 26)] + [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(-28, 209, 2)]
d.polygon(pts, fill=(70, 190, 220, 255))
# shading: darker towards the bottom right
shade = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(shade).ellipse((cx - 20, cy - 10, cx + 90, cy + 90), fill=(10, 60, 90, 150))
drop_shaded = Image.alpha_composite(drop, Image.composite(shade.filter(ImageFilter.GaussianBlur(14)), Image.new('RGBA', (S, S)), drop.getchannel('A')))
# a bright highlight
hl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(hl).ellipse((cx - 38, cy - 34, cx - 12, cy + 6), fill=(230, 252, 255, 230))
drop_shaded.alpha_composite(hl.filter(ImageFilter.GaussianBlur(4)))
# its glowing edge
edge = drop.getchannel('A').filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(2))
rim = Image.new('RGBA', (S, S), (190, 245, 255, 0)); rim.putalpha(edge.point(lambda v: min(255, v * 3)))
bg.alpha_composite(drop_shaded)
bg.alpha_composite(rim)
# ripples under it and two small falling drops
rp = Image.new('RGBA', (S, S), (0, 0, 0, 0))
r2 = ImageDraw.Draw(rp)
for i, (w, a) in enumerate([(150, 200), (200, 130), (236, 70)]):
    r2.ellipse((128 - w / 2, 214 - w / 10, 128 + w / 2, 214 + w / 10), outline=(150, 230, 250, a), width=5)
for (x, y) in [(52, 70), (204, 96)]:
    r2.ellipse((x - 7, y - 10, x + 7, y + 10), fill=(140, 225, 245, 210))
bg.alpha_composite(rp.filter(ImageFilter.GaussianBlur(1.2)))
# a thin dark frame, like his
ImageDraw.Draw(bg).rectangle((0, 0, S - 1, S - 1), outline=(30, 20, 14, 255), width=6)
bg.resize((64, 64), Image.LANCZOS).save(out, optimize=True)
print('ok', out)
