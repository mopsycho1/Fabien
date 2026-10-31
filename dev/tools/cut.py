import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image, ImageDraw

def load(path): return Image.open(path).convert('RGB')

def foreground(im, light_min=150, sat_max=30):
    a = np.array(im).astype(int); mx, mn = a.max(axis=2), a.min(axis=2)
    light = (mn >= light_min) & ((mx - mn) <= sat_max)
    lab, n = ndi.label(light)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    lab2, n2 = ndi.label(fg); sizes = ndi.sum(fg, lab2, range(1, n2 + 1))
    fg = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s >= 120])
    holes = (mn >= 228) & ((mx - mn) <= 20)
    lab3, n3 = ndi.label(holes); s3 = ndi.sum(holes, lab3, range(1, n3 + 1))
    return fg & ~np.isin(lab3, [i + 1 for i, s in enumerate(s3) if s >= 45])

def pieces(fg, merge=11, min_area=1500, rowband=90):
    d = cv2.dilate(fg.astype(np.uint8), np.ones((merge, merge), np.uint8)); lab, n = ndi.label(d); out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        area = int(fg[sl][lab[sl] == i + 1].sum())
        if area >= min_area: out.append((y0, x0, y1, x1, area))
    out.sort(key=lambda b: (round((b[0] + b[2]) / 2 / rowband), b[1])); return out

def cutout(im, fg, box, pad=4):
    y0, x0, y1, x1 = box[:4]; y0, x0 = max(0, y0 - pad), max(0, x0 - pad); y1, x1 = min(fg.shape[0], y1 + pad), min(fg.shape[1], x1 + pad)
    m = fg[y0:y1, x0:x1].astype(np.uint8) * 255
    n, lab, stats, _ = cv2.connectedComponentsWithStats((m > 0).astype(np.uint8), connectivity=8)
    keep = np.zeros_like(m)
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] > 90: keep[lab == k] = 255
    keep = cv2.erode(keep, np.ones((3, 3), np.uint8)); alpha = cv2.GaussianBlur(keep, (3, 3), 0)
    rgba = np.dstack([np.array(im)[y0:y1, x0:x1], alpha]); ys, xs = np.where(alpha > 20)
    return biggest_cluster(Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA'))

def biggest_cluster(img, merge=13):
    a = np.array(img); alpha = a[:, :, 3] > 30
    d = cv2.dilate(alpha.astype(np.uint8), np.ones((merge, merge), np.uint8)); lab, n = ndi.label(d)
    if n > 1:
        sizes = ndi.sum(alpha, lab, range(1, n + 1)); best = int(np.argmax(sizes)) + 1
        a[:, :, 3] = np.where((lab == best) & alpha, a[:, :, 3], 0)
        ys, xs = np.where(a[:, :, 3] > 20); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(a, 'RGBA')

def body_center_x(img):
    # where the body is across the picture (0 = left edge, 1 = right edge), from the lower half (legs and hips)
    alpha = np.array(img)[:, :, 3].astype(float); h = alpha.shape[0]
    cols = alpha[int(h * 0.55):].sum(axis=0); xs = np.arange(len(cols))
    return float((cols * xs).sum() / max(1.0, cols.sum()) / img.width)

def contact(sprites, path, labels=None, cols=8, cell=(190, 230), bg=(190, 150, 100)):
    rows = (len(sprites) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell[0], rows * cell[1]), bg); d = ImageDraw.Draw(sheet)
    for i, s in enumerate(sprites):
        sc = min((cell[0] - 10) / s.width, (cell[1] - 26) / s.height, 1.6)
        t = s.resize((max(1, int(s.width * sc)), max(1, int(s.height * sc))), Image.LANCZOS)
        cx, cy = (i % cols) * cell[0], (i // cols) * cell[1]
        sheet.paste(t, (cx + 5, cy + 22), t); d.text((cx + 6, cy + 4), labels[i] if labels else str(i), fill=(255, 255, 255))
    sheet.save(path)
