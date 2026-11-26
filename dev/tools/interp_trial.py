# Frame interpolation trial (roadmap 18.60, Graphics 2.0, 26 Nov): can in-between pictures, made by a computer
# between two of Suleiman's poses, smooth a move without losing the painted look?
#
#   ~/.fabien-tools/venv/bin/python -I dev/tools/interp_trial.py <out folder>
#
# For Gaha's Lunge (battle stance -> leap -> thrust) and Layra's cast (chant -> cast), down-right, it makes 2
# in-betweens per change of pose with two-way optical flow (OpenCV DIS: each pose is pushed part of the way toward the
# other along the motion it finds, then the two are blended), and writes:
#   <move>_before.gif  the poses as the game swaps them now
#   <move>_after.gif   the same with the in-betweens (the same total time)
#   <move>_pair.gif    both side by side, <move>_frames.jpg every frame large, to judge the painted look
# Nothing here goes into the game: it is a trial to look at.
import os, sys
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, 'public/art')
BG = (58, 44, 32)  # a cave floor brown behind the figure
MOVES = {
    # name: [(picture, ms held)], the game's timing (castLunge: leap while it travels, then the thrust)
    'gaha_lunge': [('gaha_iso_battle_downRight.png', 260), ('gaha_n_leap_downRight.png', 340), ('gaha_n_lunge_downRight.png', 420)],
    'layra_cast': [('layra_n_chant_downRight.png', 420), ('layra_n_cast_downRight.png', 520)],
}
SCALE = 2  # drawn twice the game's size so the frames can be judged


def load_on_canvas(files):
    # every pose on one canvas, standing on its feet (bottom middle), as the game stands them
    ims = [Image.open(os.path.join(ART, f)).convert('RGBA') for f in files]
    W = max(i.width for i in ims) + 40
    H = max(i.height for i in ims) + 20
    out = []
    for im in ims:
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        c.paste(im, ((W - im.width) // 2, H - im.height - 6), im)
        out.append(np.asarray(c).astype(np.float32) / 255.0)
    return out


def flow(a, b):
    # motion from a to b, found on the figures over a flat grey (the see-through part would confuse it)
    def grey(x):
        rgb = x[..., :3] * x[..., 3:4] + 0.5 * (1 - x[..., 3:4])
        return cv2.cvtColor((rgb * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    return dis.calc(grey(a), grey(b), None)


def warp(img, f, t):
    # pull each pixel from where the motion says it was: x - t * flow
    h, w = img.shape[:2]
    gx, gy = np.meshgrid(np.arange(w), np.arange(h))
    mx = (gx - t * f[..., 0]).astype(np.float32)
    my = (gy - t * f[..., 1]).astype(np.float32)
    prem = img.copy(); prem[..., :3] *= prem[..., 3:4]
    out = cv2.remap(prem, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    return out


def between(a, b, t):
    fab, fba = flow(a, b), flow(b, a)
    A = warp(a, fab, t)          # a pushed forward t of the way
    B = warp(b, fba, 1 - t)      # b pulled back the rest
    m = (1 - t) * A + t * B
    alpha = np.clip(m[..., 3:4], 1e-4, 1)
    rgb = m[..., :3] / alpha
    return np.concatenate([np.clip(rgb, 0, 1), m[..., 3:4]], axis=-1)


def flat(x):
    rgb = x[..., :3] * x[..., 3:4] + np.array(BG, np.float32) / 255 * (1 - x[..., 3:4])
    im = Image.fromarray((rgb * 255).astype(np.uint8), 'RGB')
    return im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)


def gif(frames, path):
    ims = [f for f, _ in frames]
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=[d for _, d in frames], loop=0, disposal=2)


def main(out):
    os.makedirs(out, exist_ok=True)
    for name, steps in MOVES.items():
        poses = load_on_canvas([f for f, _ in steps])
        before, after, big = [], [], []
        for i, (p, (_, ms)) in enumerate(zip(poses, steps)):
            before.append((flat(p), ms))
            if i == 0:
                after.append((flat(p), ms)); big.append(flat(p))
                continue
            prev, prev_ms = poses[i - 1], steps[i - 1][1]
            # two in-betweens of 40 ms each, taken from the end of the hold before, so the move lasts as long as before
            mids = [between(prev, p, t) for t in (1 / 3, 2 / 3)]
            last_im, last_ms = after[-1]
            after[-1] = (last_im, max(60, last_ms - 80))
            for m in mids:
                after.append((flat(m), 40)); big.append(flat(m))
            after.append((flat(p), ms)); big.append(flat(p))
        gif(before, os.path.join(out, name + '_before.gif'))
        gif(after, os.path.join(out, name + '_after.gif'))
        # side by side, on a common 20 ms clock
        def timeline(frames):
            seq = []
            for im, ms in frames:
                seq += [im] * max(1, round(ms / 20))
            return seq
        tb, ta = timeline(before), timeline(after)
        n = max(len(tb), len(ta))
        tb += [tb[-1]] * (n - len(tb)); ta += [ta[-1]] * (n - len(ta))
        w, h = tb[0].size
        pair = []
        for x, y in zip(tb, ta):
            c = Image.new('RGB', (w * 2 + 8, h), (0, 0, 0)); c.paste(x, (0, 0)); c.paste(y, (w + 8, 0)); pair.append(c)
        pair[0].save(os.path.join(out, name + '_pair.gif'), save_all=True, append_images=pair[1:], duration=20, loop=0)
        w, h = big[0].size
        sheet = Image.new('RGB', (w * len(big), h), BG)
        for i, f in enumerate(big):
            sheet.paste(f, (i * w, 0))
        sheet.save(os.path.join(out, name + '_frames.jpg'), quality=90)
        print(name, ':', len(before), 'pictures before,', len(after), 'after ->', out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'interp_out')
