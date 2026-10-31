# Cuts figures out of a character sheet with a plain white background.
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

def background_mask(rgb, tol=38):
    """True where the pixel is background: near-white AND connected to the sheet's edge."""
    a = rgb.astype(int)
    dist = np.sqrt(((255 - a) ** 2).sum(-1))
    near = dist < tol
    lab, n = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # soft grey ground shadows touching the background count as background too
    grey = (np.abs(a[..., 0] - a[..., 1]) < 14) & (np.abs(a[..., 1] - a[..., 2]) < 14) & (a.min(-1) > 170)
    lab2, _ = ndimage.label(bg | grey)
    edge2 = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]]))) - {0}
    return np.isin(lab2, list(edge2))

def components(path, min_area=2500):
    im = Image.open(path).convert('RGB')
    rgb = np.array(im)
    fg = ~background_mask(rgb)
    fg = ndimage.binary_opening(fg, iterations=1)
    lab, n = ndimage.label(fg)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        area = (lab[sl] == i + 1).sum()
        if area >= min_area:
            boxes.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, int(area)])
    boxes.sort(key=lambda b: (b[1] // 150, b[0]))
    return im, boxes

def overlay(path, out):
    im, boxes = components(path)
    d = ImageDraw.Draw(im)
    for i, (x0, y0, x1, y1, a) in enumerate(boxes):
        d.rectangle([x0, y0, x1, y1], outline=(255, 0, 0), width=3)
        d.text((x0 + 4, y0 + 4), str(i), fill=(0, 0, 255))
    im.thumbnail((1600, 1600)); im.save(out)
    return boxes

def cut(path, box, out, height=None, flip=False, scale=None, keep=0.15, erase=()):
    """Cut the figure inside box (x0,y0,x1,y1) to a transparent PNG. Returns originX."""
    im = Image.open(path).convert('RGB')
    rgb = np.array(im)
    bg = background_mask(rgb)
    for ex0, ey0, ex1, ey1 in erase:  # bits of a neighbouring figure, wiped by hand
        bg[ey0:ey1, ex0:ex1] = True
    x0, y0, x1, y1 = box[:4]
    # white holes enclosed by the figure (between spear and body) are background too
    a_ = rgb.astype(int); pure = np.sqrt(((255 - a_) ** 2).sum(-1)) < 20
    lab0, n0 = ndimage.label(pure & ~bg)
    if n0:
        sizes0 = ndimage.sum(np.ones_like(lab0), lab0, range(1, n0 + 1))
        big = [i + 1 for i, s0 in enumerate(sizes0) if s0 >= 25]
        bg = bg | np.isin(lab0, big)
    fgm = ndimage.binary_erosion(~bg, iterations=1)  # trim the white fringe
    alpha = fgm[y0:y1, x0:x1].astype(np.uint8) * 255
    # keep only the biggest connected piece plus anything big touching it (drops neighbours' spear tips)
    lab, n = ndimage.label(alpha > 0)
    if n > 1:
        sizes = ndimage.sum(alpha > 0, lab, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s >= max(sizes) * keep]
        alpha = np.where(np.isin(lab, keep), alpha, 0).astype(np.uint8)
    a = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.7))
    crop = im.crop((x0, y0, x1, y1)).convert('RGBA')
    crop.putalpha(a)
    bb = crop.getbbox(); crop = crop.crop(bb)
    if flip: crop = crop.transpose(Image.FLIP_LEFT_RIGHT)
    if scale:
        crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
    elif height and crop.height > height:
        w = round(crop.width * height / crop.height)
        crop = crop.resize((w, height), Image.LANCZOS)
    crop.save(out)
    # where the feet are: middle of the solid pixels in the bottom 8% of the picture
    # where the body stands: the weighted middle of the solid columns in the
    # lower half (thin columns, like a spear shaft, are left out)
    al = np.array(crop)[..., 3] > 128
    h = al.shape[0]; band = al[int(h * 0.55):int(h * 0.97)]
    counts = band.sum(0).astype(float)
    counts[counts < band.shape[0] * 0.25] = 0
    if counts.sum() == 0: counts = band.sum(0).astype(float)
    return round(float((np.arange(len(counts)) * counts).sum() / counts.sum()) / crop.width, 3)

if __name__ == '__main__':
    print(json.dumps(overlay(sys.argv[1], sys.argv[2])))
