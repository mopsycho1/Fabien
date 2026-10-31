# Cuts the Gaha parts sheet (Suleiman, 29 Oct) into one PNG per part.
import sys, json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]
im = Image.open(SRC).convert('RGB')
BOX = {
 'ref': (5, 15, 300, 412),
 'head_front': (350, 100, 494, 276), 'head_left': (503, 100, 647, 276), 'head_right': (656, 100, 802, 276), 'head_back': (815, 100, 958, 276),
 'neck': (988, 136, 1114, 268), 'torso_front': (1136, 48, 1314, 285), 'torso_back': (1336, 48, 1514, 285),
 'hips_front': (1034, 352, 1276, 558), 'hips_back': (1290, 352, 1516, 558),
 'cape_back': (975, 600, 1248, 903), 'mantle': (1254, 598, 1520, 714),
 'skirt_front': (1247, 738, 1393, 893), 'skirt_back': (1397, 738, 1533, 893),
 'r_upper_out': (22, 434, 115, 588), 'r_upper_in': (145, 432, 218, 584), 'r_fore_out': (246, 468, 302, 568), 'r_fore_in': (330, 462, 395, 568), 'r_hand': (422, 484, 488, 588),
 'l_upper_out': (556, 424, 646, 586), 'l_upper_in': (671, 424, 744, 586), 'l_fore_out': (772, 472, 836, 584), 'l_fore_in': (856, 458, 939, 584), 'l_hand': (962, 476, 1018, 590),
 'r_thigh_out': (20, 680, 103, 848), 'r_thigh_in': (101, 664, 188, 848), 'r_shin_out': (202, 682, 271, 848), 'r_shin_in': (293, 685, 383, 843), 'r_foot': (394, 726, 498, 825),
 'l_thigh_out': (517, 670, 641, 848), 'l_thigh_in': (645, 664, 728, 848), 'l_shin_out': (737, 674, 803, 848), 'l_shin_in': (824, 679, 888, 848), 'l_foot': (894, 731, 965, 843),
 'spear': (8, 910, 1118, 1005),
}
def cutout(img, tol=30):
    a = np.array(img).astype(int)
    white = a.min(axis=2) > 255 - tol
    lab, n = ndimage.label(white)
    keep = set(np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]]))) - {0}
    solid = ~np.isin(lab, list(keep))
    # keep only the biggest piece and anything close to it (drops label text and neighbours' edges)
    l2, n2 = ndimage.label(solid)
    if n2 > 1:
        sizes = ndimage.sum(solid, l2, range(1, n2 + 1))
        big = int(np.argmax(sizes)) + 1
        near = ndimage.binary_dilation(l2 == big, iterations=6)
        keepl = {big} | {i + 1 for i in range(n2) if sizes[i] > 0.02 * sizes.max() and (near & (l2 == i + 1)).any()}
        solid = np.isin(l2, list(keepl))
    solid = ndimage.binary_erosion(solid, iterations=1)
    alpha = Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    out = Image.fromarray(a.astype(np.uint8)).convert('RGBA'); out.putalpha(alpha)
    bb = out.getbbox(); return out.crop(bb), bb
meta = {}
for k, box in BOX.items():
    part, bb = cutout(im.crop(box))
    part.save(OUT + '/' + k + '.png')
    meta[k] = {'w': part.width, 'h': part.height, 'sheetX': box[0] + bb[0], 'sheetY': box[1] + bb[1]}
json.dump(meta, open(OUT + '/meta.json', 'w'), indent=1)
print(len(meta), 'parts')
