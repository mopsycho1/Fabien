"""One sheet of many GIFs: a row per GIF, N frames spread evenly over it (the effects audit, roadmap 18.23).
usage: gif_audit.py <folder of gifs> <out prefix> [frames per row] [rows per sheet] [name,name...]"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageSequence
folder, out = sys.argv[1], sys.argv[2]
per = int(sys.argv[3]) if len(sys.argv) > 3 else 9
rows_per = int(sys.argv[4]) if len(sys.argv) > 4 else 11
names = sys.argv[5].split(',') if len(sys.argv) > 5 else None
files = sorted(glob.glob(os.path.join(folder, '*.gif')))
if names: files = [f for f in files if os.path.basename(f)[:-4] in names]
W = 170
for s in range(0, len(files), rows_per):
    chunk = files[s:s + rows_per]
    sheet = Image.new('RGB', (per * W + 130, len(chunk) * W), (18, 18, 18)); d = ImageDraw.Draw(sheet)
    for r, f in enumerate(chunk):
        frames = [fr.convert('RGB') for fr in ImageSequence.Iterator(Image.open(f))]
        # skip the still moment at the start and the end: the middle 80 percent
        a, b = int(len(frames) * 0.1), int(len(frames) * 0.9)
        if os.environ.get('PEAK'):
            # the moment of the flash: the frame that is brightest against the first one, and its neighbours
            import numpy as np
            base = np.asarray(frames[0].convert('L')).astype(int)
            gain = [np.clip(np.asarray(fr.convert('L')).astype(int) - base, 0, 255).sum() for fr in frames]
            mid = int(np.argmax(gain)); start = max(0, min(len(frames) - per, mid - 2))
            pick = frames[start:start + per]
        else:
            pick = [frames[a + (b - a - 1) * i // (per - 1)] for i in range(per)]
        d.text((4, r * W + 6), os.path.basename(f)[:-4], fill=(255, 235, 150))
        for i, fr in enumerate(pick):
            sheet.paste(fr.resize((W, W), Image.LANCZOS), (130 + i * W, r * W))
    p = '%s_%d.jpg' % (out, s // rows_per + 1); sheet.save(p, quality=80); print(p, sheet.size)
