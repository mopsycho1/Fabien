"""The two kings' sheets (roadmap 6.74 Alagara, 6.75 Gadara): where each sheet is and how it is laid out.
Shared by make_kings.py. Every sheet has four figures: "row" = four in a row (2172 by 724 or 1600 wide),
"grid" = two rows of two (1536 by 1024 or 1448 by 1086, often with a compass label under each).
"""
import os
B = os.path.expanduser('~/Documents/Fabien Blueprint/')
I19 = B + 'INBOX/2026-11-19/email/'
ISO = B + 'NEW ISOMETRIC SHEETS AND OTHERS/'
OLD = B + 'INBOX/2026-11-06/'
GAD13 = B + 'INBOX/2026-11-13b/email/Gadara sheets/Gadara sheets/'
GADS = I19 + 'Gadara missing skill sheets/Gadara missing skill sheets/'
ALA = I19 + 'Alagara/Alagara/'
# his 20 Nov update (Alagara's sheets updated.7z) and 21 Nov email (Alagara sheet updates.7z): roadmap 6.83
A20 = B + "INBOX/2026-11-20b/Alagara's sheets updated/Alagara's sheets updated/"
FURY20 = A20 + 'Algara fury form sheets/'
SWIFT20 = A20 + 'Algara swift form sheets/'
A21 = B + 'INBOX/2026-11-21/email/unzipped/Alagara sheet updates/Alagara sheet updates/'

# name: (file, layout)
SHEETS = {
    # Gadara the Greater (enemy king, "e5")
    'gadara_stand':   (ISO + 'PHOTO-2026-10-31-09-34-09.jpg', 'row'),   # neutral, staff on the shoulder
    'gadara_battle':  (OLD + '00000806-PHOTO-2026-10-31-08-39-01.jpg', 'row'),   # battle crouch
    'gadara_guard':   (ISO + 'PHOTO-2026-10-31-10-38-03.jpg', 'row'),   # blocking
    'gadara_strike':  (OLD + '00000807-PHOTO-2026-10-31-08-44-39.jpg', 'row'),   # attacking (fork out)
    'gadara_mask':    (OLD + '00000808-PHOTO-2026-10-31-08-52-48.jpg', 'row'),   # mask on, hand over the face
    'gadara_unleash': (OLD + '00000812-PHOTO-2026-10-31-08-58-18.jpg', 'row'),   # staff raised (Singularity)
    'gadara_hurt':    (GAD13 + 'Gadara’s Four Hurt Reactions.png', 'row'),
    'gadara_weak':    (GAD13 + 'Gadara Injured Warrior Isometric Sprite Set.png', 'row'),
    'gadara_down':    (GAD13 + 'Defeated Gadara Isometric Turnaround.png', 'row'),
    'gadara_cleave_rear': (GADS + 'Heavy cleave/Rearing.png', 'grid'),
    'gadara_cleave_land': (GADS + 'Heavy cleave/Landing attack.png', 'grid'),
    'gadara_hook_reach':  (GADS + 'Snare hook/Reach.png', 'grid'),
    'gadara_hook_pull':   (GADS + 'Snare hook/Pull.png', 'grid'),
    'gadara_sunder_rear': (GADS + 'Sunder boon/Rearing.png', 'grid'),
    'gadara_sunder_slash': (GADS + 'Sunder boon/Slashing.png', 'grid'),
    # King Alagara (hero king, "h5")
    'alagara_stand':  (A21 + 'Alagara neutral turnaround sheet..png', 'grid'),   # 21 Nov: gold fastenings on the scarf
    'alagara_battle': (A21 + 'Alagara’s Ornate Saber Action Sheet.png', 'grid'),   # 21 Nov: his battle stance (08:45)
    'alagara_strike': (ISO + 'PHOTO-2026-10-31-10-27-30.jpg', 'row'),   # the drawn lunge (no attack sheet in the new look yet)
    'alagara_ready':  (ALA + 'Four-Panel Warrior Pose Study.png', 'row'),   # injured
    'alagara_guard':  (ALA + 'Alagara’s Four-View Guarding Stance.png', 'row'),
    'alagara_dodge':  (A20 + 'Alagara dodging.png', 'row'),   # 20 Nov
    'alagara_hurt':   (ALA + 'Four Views of a Recoiling Warrior.png', 'row'),
    'alagara_down':   (ALA + 'Fallen Warrior Isometric Study Sheet.png', 'row'),
    # Fury form, 20 Nov (the neutral sheet is named "Swift Warrior" but has his red Fury hair)
    'alagara_fury_stand':  (FURY20 + 'Swift Warrior_ Four-View Character Sheet.png', 'grid'),
    'alagara_fury_ready':  (FURY20 + 'Alagara infused with fury battle stance.jpeg', 'row'),
    'alagara_fury_windup': (FURY20 + 'Algara fury form preparing to attack.png', 'grid'),
    'alagara_fury':        (FURY20 + 'Algara attacking in fury state.png', 'row'),
    'alagara_fury_guard':  (FURY20 + 'Fury guard.png', 'row'),
    'alagara_fury_dodge':  (FURY20 + 'Alagara’s Fury Form_ Dodge Leaps.png', 'row'),
    # Swift form, 20 Nov (Stone uses the Swift design too: Suleiman 20 Nov 15:36)
    'alagara_swift_stand':  (SWIFT20 + 'Swift Form Warrior Turnaround.png', 'grid'),
    'alagara_swift_ready':  (SWIFT20 + 'Alagara infused with swift battle stance.jpeg', 'row'),
    'alagara_swift':        (SWIFT20 + 'Swift form attacking.png', 'grid'),
    'alagara_swift_guard':  (SWIFT20 + 'Alagara swift blocking.png', 'row'),
    'alagara_swift_dodge':  (SWIFT20 + 'Alagara swift form dodging.png', 'row'),
    'alagara_claim_reach': (ALA + 'Skill and Effects- claim/1-reach.png', 'grid'),
    'alagara_claim_snatch': (ALA + 'Skill and Effects- claim/2-snatch.png', 'grid'),
    'alagara_claim_store': (ALA + 'Skill and Effects- claim/3-store.png', 'grid'),
    'alagara_mantle_prep': (ALA + 'Skill and effects- mantle/Mantle- Preparing spell.png', 'grid'),
    'alagara_mantle_cast': (ALA + 'Skill and effects- mantle/Mantle- Casting spell.png', 'grid'),
    'alagara_mantle_swift': (ALA + 'Skill and effects- mantle/Swift- Mantle spell.png', 'row'),
    'alagara_gale':   (ALA + 'Skill and Effects-Gale Cut/King Alagura Gale Cut Pose Sheet.png', 'grid'),
    'alagara_gale_fury': (ALA + 'Skill and Effects-Gale Cut/Fury,Four-Way Gale Cut.png', 'grid'),
    'alagara_gale_swift': (ALA + 'Skill and Effects-Gale Cut/Swift Gale Cut Action Sheet.png', 'grid'),
}
