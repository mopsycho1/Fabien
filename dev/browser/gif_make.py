"""Puts the frames filmed by gifs.cjs together.
usage: gif_make.py <frames dir> <out.gif> <strip.jpg>
The frames dir holds 0000.jpg, 0001.jpg ... and times.json (when each was taken, in
milliseconds). Each GIF frame is shown for the real time until the next one, so the
GIF plays at game speed."""
import sys, os, json
from PIL import Image

d, out_gif, out_strip = sys.argv[1:4]
times = json.load(open(os.path.join(d, 'times.json')))
frames = [Image.open(os.path.join(d, '%04d.jpg' % i)).convert('RGB') for i in range(len(times))]
gaps = [max(20, round((times[i + 1] - times[i]) / 10) * 10) for i in range(len(times) - 1)] + [600]
# one palette for the whole GIF (made from a few frames spread over it), so colours do not flicker
sample = Image.new('RGB', (frames[0].width * 4, frames[0].height))
for k in range(4):
    sample.paste(frames[min(len(frames) - 1, k * len(frames) // 4)], (k * frames[0].width, 0))
pal = sample.quantize(colors=128, method=Image.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]   # no dither: smaller files, and no crawling dots
q[0].save(out_gif, save_all=True, append_images=q[1:], duration=gaps, loop=0, optimize=True)
# the strip: every 3rd frame, small, in rows of 12
pick = frames[::2]; w = 200; per = 9
rows = (len(pick) + per - 1) // per
strip = Image.new('RGB', (per * w, rows * w), (20, 20, 20))
for i, f in enumerate(pick):
    strip.paste(f.resize((w, w), Image.LANCZOS), ((i % per) * w, (i // per) * w))
strip.save(out_strip, quality=85)
