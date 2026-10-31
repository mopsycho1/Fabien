import sys; sys.path.insert(0, 'tools')
from cut import *
im = load('/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/38b2c735-image.png')
fg = foreground(im)
boxes = pieces(fg)
sp = [cutout(im, fg, b) for b in boxes]
import os; os.makedirs('cut_r', exist_ok=True)
for i, s in enumerate(sp): s.save(f'cut_r/R_{i}.png')
contact(sp, 'cut_r/R_pick.png', [f'{i} {b[3]-b[1]}x{b[2]-b[0]}' for i, b in enumerate(boxes)], cols=9)
print(len(sp), im.size)
