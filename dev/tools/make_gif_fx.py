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
Kofi's four (15 Nov, "Kofi's spell assets.7z", roadmap 6.63; run with ONLY=... and his folder, see below):
  buff_renewal_loop     "Animated Aqua Droplet Halo"           round a unit while Renewal (Infuse in Water) lasts
  buff_renewal_cast     "Animated Aqua Healing Spiral"         where Renewal lands and at each heal at the start of the unit's turn
  buff_haunt_loop       "Ghostly Teal-Violet Haunt Aura"       at the feet of a unit that is Haunted (also played once when Haunt lands)
  sfx_spirit_bolt       "Teal Spirit Projectile Animation"     Kofi's Tide Bolt (Water) and Haunt: the teal comet to the target
The two Umbra GIFs are Gadara's Singularity (Baiyee 16 Nov): sfx_umbra_orb (charge-up) and sfx_umbra_vortex (it resolves).

Run:  ~/.fabien-tools/venv/bin/python dev/tools/make_gif_fx.py [<Spell effects folder>]
      ONLY=buff_renewal_loop,buff_renewal_cast,buff_haunt_loop,sfx_spirit_bolt ~/.fabien-tools/venv/bin/python dev/tools/make_gif_fx.py "<Kofi's spell assets folder>"
      (ONLY= makes just those families; without it all are made again)
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
ONLY = [n for n in os.environ.get('ONLY', '').split(',') if n]   # make just these families

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
    # Kofi's (6.63): their GIFs sit loose in his own folder, so ONLY= and that folder as the first argument
    'buff_renewal_loop': ('Animated Aqua Droplet Halo.gif', 'box', 0.5, 0.5),
    'buff_renewal_cast': ('Animated Aqua Healing Spiral.gif', 'boxbase', 0.5, 0.9),
    'buff_haunt_loop': ('Ghostly Teal-Violet Haunt Aura.gif', 'boxbase', 0.5, 0.9),
    'sfx_spirit_bolt': ('Teal Spirit Projectile Animation.gif', 'keep', 0.5, 0.5),
    # The two kings (6.74, 6.75; Phase 10). Run with their 19 Nov email folder (INBOX/2026-11-19/email) as the first
    # argument and ONLY=<the families below>; the Umbra pair is in the 15 Nov folder (ONLY=sfx_umbra_orb,sfx_umbra_vortex).
    'buff_blade_loop': ('Heavy cleave/Heavy cleave/Dark Energy for weapon.gif', 'keep', 0.5, 0.5),         # Gadara's weapon aura (Blade mode)
    'sfx_cleave_impact': ('Heavy cleave/Heavy cleave/Purple Arc Impact Animation.gif', 'keep', 0.5, 0.85),  # Heavy Cleave landing
    'sfx_sunder_slash': ('Gadara missing skill sheets/Gadara missing skill sheets/Sunder boon/Sunderboon slash effect.gif', 'keep', 0.5, 0.6),
    'sfx_buff_strip': ('Gadara missing skill sheets/Gadara missing skill sheets/Sunder boon/buff being removed.gif', 'keep', 0.5, 0.5),
    'sfx_gale': ('Alagara/Alagara/Skill and Effects-Gale Cut/Gale cut.gif', 'keep', 0.5, 0.6),
    'sfx_gale_fury': ('Alagara/Alagara/Skill and Effects-Gale Cut/Furious Gale cut.gif', 'keep', 0.5, 0.6),
    'sfx_gale_swift': ('Alagara/Alagara/Skill and Effects-Gale Cut/Swift gale cut .gif', 'keep', 0.5, 0.6),
    # Mantle's crown (6.84, 20 Nov; replaces the gold cloak): run with INBOX/2026-11-20b as the folder and ONLY=sfx_mantle.
    # It forms from a ring (frames 0 to 5), then hovers (6 to 8): kingsScene loops the hover over each helped ally's head.
    'sfx_mantle': ("Alagara's sheets updated/Alagara's sheets updated/Skill and effects- mantle/Glowing Golden Crown Animation Grid.gif", 'keep', 0.5, 0.6),
    'sfx_claim_absorb': ('Alagara/Alagara/Skill and Effects- claim/Alagara absorning the enemies buff.gif', 'keep', 0.5, 0.5),
    'sfx_claim_take': ('Alagara/Alagara/Skill and Effects- claim/claim applying to enemy effect.gif', 'keep', 0.5, 0.5),
    'sfx_umbra_orb': ('Umbra (Gadara\'s spell)/Dark Orb Formation Animation.gif', 'keep', 0.5, 0.5),        # Singularity's charge-up
    # 21 Nov "New Effects" (6.88): folder INBOX/2026-11-21/email/unzipped, ONLY=sfx_empower,sfx_clash_shock
    'sfx_empower': ('New Effects/New Effects/Golden Empowerment Aura Animation.gif', 'keep', 0.5, 0.8),   # a clash Empower (9.6)
    'sfx_clash_shock': ('New Effects/New Effects/Shockwave for clash.gif', 'keep', 0.5, 0.5),             # the clash collision
    'sfx_umbra_vortex': ('Umbra (Gadara\'s spell)/Purple Gravitational Vortex Animation.gif', 'keep', 0.5, 0.75),  # Singularity resolves
    # Layra's Slow (6.79, 21 Nov): folder INBOX/2026-11-19/email, ONLY=buff_slow_cast. "Animated Purple Gravity Vortex" (the denser one) is Gravity: it waits for 13.65.
    'buff_slow_cast': ('Animated Purple Gravity Vortex/Glowing Purple Slow Spell Animation.gif', 'boxbase', 0.5, 0.9),   # a ring on the floor, a column of light rising
    # Gaha's Lunge (6.72, 21 Nov): folder INBOX/2026-11-19/email, ONLY=sfx_lunge_dust,sfx_lunge_impact
    'sfx_lunge_dust': ('Gaha updated character sheet/Gaha updated character sheet/Skill and Effect-Lunge/Dust from leap.gif', 'keep', 0.5, 0.85),       # where he leaves the ground
    'sfx_lunge_impact': ('Gaha updated character sheet/Gaha updated character sheet/Skill and Effect-Lunge/Attack impact animated.gif', 'keep', 0.5, 0.7),   # where the spear lands
    # The Bull's Horn Charge (6.73, 19.5; Batch 7, 21 Nov): folder INBOX/2026-11-19/email, ONLY=sfx_horn_dust,sfx_horn_fire.
    # A sweep of dust and stones where the charge lands (drawn to the right: the game flips it to the charge's way);
    # the fiery one for the enchanted charge.
    'sfx_horn_dust': ('Bull commander updated sheets/Bull commander updated sheets/Impact effects for normal charge and enchanted charge/Dust Charge Impact Animation.gif', 'keep', 0.5, 0.75),
    'sfx_horn_fire': ('Bull commander updated sheets/Bull commander updated sheets/Impact effects for normal charge and enchanted charge/Fiery Sweeping Impact Frames.gif', 'keep', 0.5, 0.75),
    # 22 Nov (6.90, 6.91): folder INBOX/2026-11-22/email, ONLY=sfx_aegis,sfx_rift,sfx_arcane_charge,sfx_orb_burst
    'sfx_aegis': ('Alagara update/Alagara update/Effects/Aegis.gif', 'keep', 0.506, 0.83),                 # Aegis's golden dome rising (1.98); frames 0 to 5 rise, 6 to 8 hold
    'sfx_rift': ('Alagara update/Alagara update/Effects/Nine-Frame Prismatic Energy Slash Animation.gif', 'keep', 0.5, 0.5),   # Radiant Rift's slash (10.52)
    'sfx_arcane_charge': ('Alagara update/Alagara update/Effects/Magical Arcane Charging Spiral.gif', 'keep', 0.502, 0.92),       # Radiant Rift's charge; tinted, Layra's channel (1.97)
    # 22 Nov (19.2): the Thief's trap, folder INBOX/2026-11-19/email, ONLY=sfx_trap_burst
    'sfx_trap_burst': ('Male Thief character sheets/Male Thief character sheets/skill effects/trap exploding.gif', 'keep', 0.5, 0.85),
    # 26 Nov (6.94): Rabdul's Kindle the Haft (his Fury Verse of Enchant), folder INBOX/2026-11-26/email, ONLY=buff_kindle_loop.
    # A flame streak rising from lower left to upper right, sparks round it: it burns on him while his spear is kindled.
    'buff_kindle_loop': ("Ward Ui and New Enchantment effect for Rabdul's spell/Animated Shango Flame Aura.gif", 'box', 0.5, 0.5),
    'sfx_orb_burst': ('Dark Magic Orb Explosion Animation/Dark Magic Orb Explosion Animation.gif', 'keep', 0.5, 0.92),         # Gadara's orb bursting (6.91)
    # 27 Nov (6.95, 10.53): Gadara's Shadow Passage, folder INBOX/2026-11-26/email, ONLY=sfx_shadow_cloak. A dark cloak that
    # swirls shut round him and opens again: SOLID (below), so it is drawn as cloth, not as light.
    'sfx_shadow_cloak': ("Gadara’s Swirling Shadow Cloak/Gadara’s Swirling Shadow Cloak.gif", 'keep', 0.5, 0.6),
}

# GIFs of SOLID things on black (dark cloth, not light): the black goes see-through by a short ramp (a pixel 18 or more bright
# in its brightest channel is fully solid) and the colour is kept as drawn. The game draws them with normal blending
# (fxSlots "solid": true), because ADD would turn dark cloth into a faint glow.
SOLID = {'sfx_shadow_cloak': 18.0}

def solid_alpha(rgb, ramp):
    a = rgb.astype(float)
    alpha = np.clip(a.max(axis=2) * 255.0 / ramp, 0, 255)
    return np.dstack([a, alpha]).astype(np.uint8)

# GIFs whose ground is a flat dark colour, not pure black: that colour is taken off first (6.88: the empower GIF is 12, 9, 6)
GROUND = {'sfx_empower': (12, 9, 6)}

def lift_ground(rgb, ground):
    g = np.array(ground, float)
    return np.clip((rgb.astype(float) - g) * 255.0 / (255.0 - g), 0, 255).astype(np.uint8)

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
        if ONLY and name not in ONLY:
            continue
        frs, ms = frames_of(SRC + gif)
        assert len(set(ms)) == 1, (name, ms)
        small = []
        for i, fr in enumerate(frs):
            sm = fr.resize((round(fr.width * HALF), round(fr.height * HALF)), Image.LANCZOS)
            px = np.asarray(sm)
            if name in GROUND: px = lift_ground(px, GROUND[name])
            rgba = Image.fromarray(solid_alpha(px, SOLID[name]) if name in SOLID else to_alpha(px))
            q = rgba.quantize(255, method=Image.Quantize.FASTOCTREE)   # keeps the alpha
            q.save(FX + '%s_%d.png' % (name, i), optimize=True)
            small.append(Image.open(FX + '%s_%d.png' % (name, i)).convert('RGBA'))
        fam[name] = {'frames': len(frs), 'anchor': kind, 'originX': ox, 'originY': oy}
        info = {'frames': len(frs), 'frameMs': ms[0]}
        if name.startswith('sfx_'):
            if name in ('sfx_lightning_bolt', 'sfx_wildfire_lance', 'sfx_spirit_bolt'):
                bx, by, reach = beam_geometry(small)
                info.update({'originX': round(bx, 3), 'originY': round(by, 3), 'reach': round(reach, 3)})
            elif name == 'sfx_lightning_strike':
                fx_, fy_ = foot_point(small)
                ox, oy = round(fx_, 3), round(fy_, 3)
                fam[name].update({'originX': ox, 'originY': oy}); info.update({'originX': ox, 'originY': oy})
            else:
                info.update({'originX': ox, 'originY': oy})
            info['size'] = list(small[0].size)
            if name in SOLID: info['solid'] = True
            slots['spells'][name[4:]] = {**slots['spells'].get(name[4:], {}), **info}
        else:
            _, verse, part = name.split('_')
            vid = {'swiftness': 'swiftness', 'fury': 'fury', 'stone': 'stone', 'renewal': 'renewal', 'haunt': 'haunt', 'blade': 'blade', 'slow': 'slow', 'kindle': 'kindle'}[verse]
            slot = slots['buffs'].setdefault(vid, {'cast': 0, 'loop': 0, 'frameMs': 80, 'scale': 0.5, 'feetY': 0.4})
            slot[part] = len(frs); slot[part + 'Ms'] = ms[0]
        made.append(name)
        print(name, len(frs), 'frames', ms[0], 'ms', small[0].size)
    json.dump(fam and anch, open(ANCH, 'w'), indent=2, ensure_ascii=False); open(ANCH, 'a').write('\n')
    json.dump(slots, open(SLOTS, 'w'), indent=2, ensure_ascii=False); open(SLOTS, 'a').write('\n')
    print('now run: align_fx.py fix ' + ' '.join(made))

main()
