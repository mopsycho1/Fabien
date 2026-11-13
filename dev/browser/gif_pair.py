"""Before and after, side by side, as one GIF per effect (roadmap 18.23, checklist C5).
usage: gif_pair.py <before folder> <after folder> <out folder>
Both play at game speed from their first frame; the shorter one holds its last frame."""
import sys, os, glob
from PIL import Image, ImageDraw, ImageSequence

before, after, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
def load(path):
    im = Image.open(path)
    frames = []; t = 0
    for fr in ImageSequence.Iterator(im):
        frames.append((t, fr.convert('RGB'))); t += fr.info.get('duration', 40)
    return frames, t
def at(frames, ms):
    pick = frames[0][1]
    for t, fr in frames:
        if t <= ms: pick = fr
        else: break
    return pick
for f in sorted(glob.glob(os.path.join(after, '*.gif'))):
    name = os.path.basename(f)
    b = os.path.join(before, name)
    if not os.path.exists(b): continue
    fa, ta = load(f); fb, tb = load(b)
    w, h = fa[0][1].size; bar = 22
    frames = []
    for ms in range(0, max(ta, tb), 50):
        sheet = Image.new('RGB', (w * 2 + 6, h + bar), (16, 14, 12)); d = ImageDraw.Draw(sheet)
        sheet.paste(at(fb, ms).resize((w, h)), (0, bar)); sheet.paste(at(fa, ms), (w + 6, bar))
        d.text((6, 5), 'BEFORE', fill=(230, 200, 150)); d.text((w + 12, 5), 'AFTER  ' + name[:-4].replace('_', ' '), fill=(255, 235, 150))
        frames.append(sheet)
    pal = frames[len(frames) // 3].quantize(colors=128, method=Image.MEDIANCUT)
    q = [fr.quantize(palette=pal, dither=Image.NONE) for fr in frames]
    q[0].save(os.path.join(out, name), save_all=True, append_images=q[1:], duration=50, loop=0, optimize=True)
print('pairs written to', out)
