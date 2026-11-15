"""Suleiman's spell effects as GIFs (15 Nov, "Spell effects.7z", roadmap 6.58, 6.50, 13.46). GIF is now the standard format
for his effects (CLAUDE.md). One folder per spell, 8 or 9 frames, one canvas (439 by 439), pure black ground, a frame delay
of his own in every GIF (110 to 180 ms), looping.

What this does for each GIF named in FILES:
  1. every frame is read with Pillow (frame delays are kept: they go into src/data/fxSlots.json as frameMs);
  2. the black ground becomes see-through ("colour to alpha": alpha = the brightest channel, colour = the pixel divided by
     it; the game draws these with ADD, so the result looks exactly like the picture on black) and the frame is shrunk to
     HALF size (220 px) so 80-odd pictures stay light to load (slot scale 1.0 = the old default of 0.5 on 439 pixels);
  3. the frames are saved as public/art/fx/<family>_<n>.png (255 colours with alpha);
  4. what the game needs to place them is measured and written to src/data/fxSlots.json: the frame delay, where the effect
     is anchored (originX, originY) and, for the two beams (the bolt and the lance), where the orb starts and how far
     the beam reaches, so the game can aim and stretch it at a target;
  5. dev/tools/fx_anchors.json gets a line for each family (the size ruler for effects, 18.3), then align_fx.py fix puts all
     frames of a family on one canvas with the anchor on one point (run it after this).

Families (and where the game uses them):
  buff_swiftness_loop   "Swift aura"                    round a unit while Swiftness lasts (fxSlots buffs.swiftness.loop)
  buff_swiftness_move   "swift aura while in motion"    on a unit while it walks under Swiftness (buffs.swiftness.move)
  buff_fury_loop        "Animated Fury Aura Flames"     round a unit while Fury lasts
  buff_fury_move        "Crimson Fury Aura in Motion"   on a unit while it walks under Fury
  buff_stone_loop       "Earth's Bulwark Orbit"         the default look of Earth's Bulwark (cast and while it lasts)
  buff_stone_rooted     "Earth's Bulwark Rock Dome"     Gaha standing his ground (Rooted) under Earth's Bulwark
  sfx_lightning_orb     "Lightning Orb Vortex"          Layra gathers Lightning at her hands
  sfx_lightning_bolt    "Purple Lightning Orb Spell"    the bolt from her hands to the target
  sfx_lightning_strike  "Lightning Strike Sequence"     the strike on the target
  sfx_wildfire_orb      "Fireball Formation"            Layra gathers Wildfire (Lightning under Fury)
  sfx_wildfire_lance    "Fireball Morphing Into a Fiery Lance"   the fire flying to the target
NOT used: the two Umbra GIFs (Gadara's spell; Gadara is not in the game and no spell in it is called Umbra).

Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_gif_fx.py [<Spell effects folder>]
then  ~/.fabien-tools/venv/bin/python dev/tools/align_fx.py fix <the new families>   (they are listed at the end)
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageSequence

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
FX = os.path.join(ROOT, 'public', 'art', 'fx') + '/'
SLOTS = os.path.join(ROOT, 'src', 'data', 'fxSlots.json')
ANCH = os.path.join(HERE, 'fx_anchors.json')
SRC = (sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Documents/Fabien Blueprint/INBOX/2026-11-15/Email/Spell effects/Spell effects")).rstrip('/') + '/'
HALF = 0.5

# family: (GIF, anchor kind, originX, originY). originY is where the anchor sits down the frame (0.9 = near the bottom:
# the unit's feet; 0.5 = the middle). "keep" = the frames are left as he drew them (one canvas, one camera): beams and the
# fast motion streaks, whose own shape is the point.
FILES = {
    'buff_swiftness_loop': ('Swift spell effects/Swift aura.gif', 'boxbase', 0.5, 0.9),
    'buff_swiftness_move': ('Swift spell effects/swift aura while in motion.gif', 'keep', 0.5, 0.5),
    'buff_fury_loop': ('Fury spell effects/Animated Fury Aura Flames.gif', 'boxbase', 0.5, 0.9),
    'buff_fury_move': ('Fury spell effects/Crimson Fury Aura in Motion.gif', 'keep', 0.5, 0.5),
    'buff_stone_loop': ("Earth's bulwark/Animated Earth’s Bulwark Orbit.gif", 'box', 0.5, 0.5),
    'buff_stone_rooted': ("Earth's bulwark/Animated Earth’s Bulwark Rock Dome.gif", 'boxbase', 0.5, 0.9),
    'sfx_lightning_orb': ('Lightning spell effects/Animated Lightning Orb Vortex.gif', 'core', 0.5, 0.5),
    'sfx_lightning_bolt': ('Lightning spell effects/Animated Purple Lightning Orb Spell.gif', 'keep', 0.5, 0.5),
    'sfx_lightning_strike': ('Lightning spell effects/Animated Lightning Strike Sequence.gif', 'keep', 0.5, 0.95),   # origin measured below (foot_point): the bolt grows from the top, so no per-frame anchor fits
    'sfx_wildfire_orb': ('Wild fire spell effects/Animated Fireball Formation.gif', 'core', 0.5, 0.5),
    'sfx_wildfire_lance': ('Wild fire spell effects/Animated Fireball Morphing Into a Fiery Lance.gif', 'keep', 0.5, 0.5),
}

def to_alpha(rgb):
    """Colour to alpha from black: how bright a pixel is is how solid it is."""
    a = rgb.astype(float)
    alpha = a.max(axis=2)
    safe = np.maximum(alpha, 1.0)[..., None]
    col = np.clip(a * 255.0 / safe, 0, 255)
    return np.dstack([col, alpha]).astype(np.uint8)

def frames_of(path):
    im = Image.open(path)
    out = []; ms = []
    for fr in ImageSequence.Iterator(im):
        out.append(fr.convert('RGB')); ms.append(fr.info.get('duration', 100))
    return out, ms

def beam_geometry(frames):
    """For a beam drawn from an orb at the left: where the orb is (the brightest tenth of the first frame) and how far the
    beam reaches (the furthest solid column over all frames), as shares of the frame."""
    a0 = np.asarray(frames[0].convert('RGBA')).astype(float)
    lum = a0[..., :3].max(axis=2) * a0[..., 3] / 255
    cut = np.percentile(lum[lum > 40], 90)
    ys, xs = np.nonzero(lum >= cut)
    ox, oy = xs.mean() / a0.shape[1], ys.mean() / a0.shape[0]
    reach = 0
    for f in frames:
        al = np.asarray(f.convert('RGBA'))[..., 3] > 60
        cols = np.nonzero(al.any(axis=0))[0]
        if len(cols): reach = max(reach, cols.max() / al.shape[1])
    return ox, oy, reach

def foot_point(frames):
    """Where a strike lands: the lowest bright row over all frames and the middle of the light along the bottom of that frame."""
    best = (0, 0.5, 0.95)
    for f in frames:
        a = np.asarray(f.convert('RGBA')).astype(float); lum = a[..., :3].max(axis=2) * a[..., 3] / 255
        rows = np.nonzero((lum > 60).sum(axis=1) >= 2)[0]
        if not len(rows): continue
        y = rows.max()
        seg = lum[max(0, y - 12):y + 1]
        x = (seg.sum(0) * np.arange(seg.shape[1])).sum() / max(seg.sum(), 1)
        if y > best[0]: best = (y, x / lum.shape[1], (y + 1) / lum.shape[0])
    return best[1], best[2]

def main():
    slots = json.load(open(SLOTS)); anch = json.load(open(ANCH)); fam = anch['families']
    slots.setdefault('spells', {})
    made = []
    for name, (gif, kind, ox, oy) in FILES.items():
        frs, ms = frames_of(SRC + gif)
        assert len(set(ms)) == 1, (name, ms)
        small = []
        for i, fr in enumerate(frs):
            sm = fr.resize((round(fr.width * HALF), round(fr.height * HALF)), Image.LANCZOS)
            rgba = Image.fromarray(to_alpha(np.asarray(sm)))
            q = rgba.quantize(255, method=Image.Quantize.FASTOCTREE)   # keeps the alpha
            q.save(FX + '%s_%d.png' % (name, i), optimize=True)
            small.append(Image.open(FX + '%s_%d.png' % (name, i)).convert('RGBA'))
        fam[name] = {'frames': len(frs), 'anchor': kind, 'originX': ox, 'originY': oy}
        info = {'frames': len(frs), 'frameMs': ms[0]}
        if name.startswith('sfx_'):
            if name in ('sfx_lightning_bolt', 'sfx_wildfire_lance'):
                bx, by, reach = beam_geometry(small)
                info.update({'originX': round(bx, 3), 'originY': round(by, 3), 'reach': round(reach, 3)})
            elif name == 'sfx_lightning_strike':
                fx_, fy_ = foot_point(small)
                ox, oy = round(fx_, 3), round(fy_, 3)
                fam[name].update({'originX': ox, 'originY': oy}); info.update({'originX': ox, 'originY': oy})
            else:
                info.update({'originX': ox, 'originY': oy})
            info['size'] = list(small[0].size)
            slots['spells'][name[4:]] = {**slots['spells'].get(name[4:], {}), **info}
        else:
            _, verse, part = name.split('_')
            vid = {'swiftness': 'swiftness', 'fury': 'fury', 'stone': 'stone'}[verse]
            slot = slots['buffs'][vid]
            slot[part] = len(frs); slot[part + 'Ms'] = ms[0]
        made.append(name)
        print(name, len(frs), 'frames', ms[0], 'ms', small[0].size)
    json.dump(fam and anch, open(ANCH, 'w'), indent=2, ensure_ascii=False); open(ANCH, 'a').write('\n')
    json.dump(slots, open(SLOTS, 'w'), indent=2, ensure_ascii=False); open(SLOTS, 'a').write('\n')
    print('now run: align_fx.py fix ' + ' '.join(made))

main()
