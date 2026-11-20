# NEXT: everything open, in build order (20 Nov 2026)

One batch at a time: build, test, tick the roadmap, push, stop. Numbers point to docs/ROADMAP.md.
Model: **Sonnet** for clear jobs, **Opus** for design, new systems or "find the cause" work.
"Art" says whether we are missing pictures from Suleiman for that item.

## Batch 1: things that are broken now (DONE 19 Nov, plus 1.67 Break Away; 1.58 and 1.62 wait; 1.66 is new: fix the 45 wrong-facing pairs)
- **1.59** Gaha's Lunge shows "0" and the whole UI disappears afterwards. Art: none. **Opus** (find the cause; look at 13.55 in the same session).
- **13.55** "NO BUTTONS": every button off for a moment after an action (seen once in 40 bot battles). Art: none. **Opus**.
- **13.54** A figure left off its tile after a push (about 1 battle in 10). Art: none. **Opus**.
- **1.65** The Bull Commander heals while he is in a clash. Art: none. **Sonnet**.
- **1.60** Tayo's stone eruption is now just a punch. Art: none. **Sonnet** (find the cause first).
- **1.61** Gaha's north-east throw is too big under Swift. Art: none. **Sonnet** (pin a scale in the ruler).
- **1.63** Bull Commander is a different size in some states. Art: none. **Sonnet**.
- **1.57** Haunt: effect only at the cast, and Kofi must not play his plain attack. Art: none. **Sonnet**.
- **1.52** Infuse shows "+0 MP". Art: none. **Sonnet**.
- **1.64** Wrong-facing figures on mirrored sheets: add a facing check to the cutters. Art: none. **Sonnet**.
- **1.68** DONE 20 Nov. Knock-back: the figure vanishes and appears where it was sent. Art: none. **Opus** (find the cause; dev/browser/knock.cjs).
- **1.69** (new 20 Nov) An Herb cannot target an ally in a clash (the 1.65 fix probably blocks every heal on an engaged unit). Art: none. **Sonnet**.
- **1.70** (new 20 Nov) On a phone the skills list resets when a skill is picked. Art: none. **Sonnet**.
- **1.71** DONE 20 Nov (decided: the old look back, with 13.60). Haunt: he wants the original effect back (reverses 1.57). Art: none. **Sonnet** (answer Q22 first; with 13.60).
- **1.72** DONE 20 Nov (his 1 Nov calm Swift and Fury stances). Alagara in Swift shows his attack stance, not his neutral one. Art: maybe (a neutral Swift picture). **Sonnet**.
- **1.58** "Vertical and horizontal lightning again". Art: none. Ask Suleiman first (Q6), then **Sonnet**.
- **1.62** Sudeen's weapon missing in his battle stance. Art: yes, new Sudeen attack sheets from Suleiman. Wait.

## Batch 2: finish the screen (UI)
- **18.36** Skills list opens on the wrong side (his opens to the right). Art: none. **Sonnet**.
- **18.37** Menu text slightly bigger than his on a phone. Art: none. **Sonnet**.
- **18.38** Desktop skill panel goes bottom right. Art: none. **Sonnet**.
- **18.42** Clash meter only while a fighter in the clash is the active unit. Art: none. **Sonnet**.
- **18.41** Overhead items too invasive: move what is left into the card. Art: none. **Sonnet**.
- **18.40** Plain descriptions of every status on the card, for heroes and enemies. Art: none. **Sonnet**.
- **18.39** Victory screen: winners large in their victory poses on one side, score panel on the other. Art: none (Gaha and Sudeen victory redraws still open, ART3). **Opus** (layout on phone and desktop).
- **18.43** Main-menu rows for Dig up and Summon (emblems exist, no action yet). Art: none. **Sonnet** (Summon stays dead until Batch 6).

## Batch 3: loot, AI and sound
- **5.5** Random digs from a loot table (so the same side no longer wins the same heal). Art: none. **Sonnet**.
- **13.63** Enemy AI: stop wandering for pots and healing at the first chance. Art: none. **Sonnet**.
- **A.3** New battle track and cycling between tracks as a battle goes on. Art: no, the MP3 is here. **Sonnet**.
- **A.4** His fire, lightning and stone spell sounds. Art: no, three MP3s are here. **Sonnet**.
- **6.68** His slash, blunt and piercing hit flashes on every hit. Art: no, three GIFs are here (2 frames each). **Sonnet**.

## Batch 4: wire the art that already arrived
- **6.69** Layra's ten new sheets (replaces her whole set). Art: no. **Sonnet**.
- **6.70** Tayo's dodge, with an Enchanted one. Art: no. **Sonnet**.
- **6.71** Kofi's dodge. Art: no. **Sonnet**.
- **6.72** Gaha's new neutral and damaged stances, plus Lunge pictures and effects. Art: no. **Sonnet**.
- **6.79** Slow GIF now; the Gravity GIF waits for 13.65. Art: no. **Sonnet**.
- **6.80** Gaha and Bull clash GIF should play on the battlefield. Art: no. **Sonnet** (decided 19 Nov: over the two fighters on the board, no panel).

## Batch 5: teams and the character select
- **18.45** DONE 20 Nov. Any character on either side (one shared pool, a home-side tag on each card, a Test mode switch on the select itself; default teams back to the 4 v 4 with Kofi and the archer, the kings pickable). Test: swap_sides.cjs, n85.
- **18.46** DECIDED 20 Nov: waits for the male archer on the heroes, Kofi on the enemies and Leol. Five a side, default still four (he wants a full party with a king in it). Art: none. **Opus**, after 6.61 and the slinger (19.1).
- **18.30** DONE 19 Nov. Character select before each battle (he wants it early, for testing). Art: his bios are coming; portraits exist. **Sonnet**.
- **6.61** Male archer joins the heroes, Kofi moves to the enemies as support (needs Kofi's AI). Art: partly (the male archer's missing poses, 6.31). **Opus**.
- **18.32** Battle length on the 11 by 11 cavern (about 125 turns; his best is 63). Art: none. **Opus** (measure with the new teams).

## Batch 6: Kofi
- **13.60** DONE 20 Nov. Haunt as a hex: Disoriented, rolls against magic defense. Art: none. **Sonnet** (answer Q10 first).
- **6.38 / 6.49** Call Spirit: summon, swap places, the earth spirit tanks and clashes. Art: yes, the spirits' own attack animations and the earth spirit's clash pictures. **Opus**.
- **18.43** Wire the Summon row to Call Spirit. Art: none. **Sonnet**.

## Batch 7: new kits for the heroes and enemies we already have
- **19.3 + 13.68** Sudeen: Ward (shares damage), Shield Bash, ally Intercept; Ward off in a clash and switchable. Art: none. **Opus**.
- **19.4** Rabdul: Spear Ward (overwatch), Hold the Line, new passives, Verse variants. Art: none. **Opus** (new reaction system).
- **19.5** Bull Commander: Horn Charge, conditional Shield Toss stun, three toss variants. Art: no, charge sheets and impacts arrived (6.73). **Sonnet**.
- **19.6** Archer: Pinning Shot, Pinned status, Patient Hunter. Art: none. **Sonnet**.
- **6.73** Bull charge pictures and impact GIFs, wired with 19.5. Art: no. **Sonnet**.

## Kings fixes DONE 20 Nov (Suleiman's test): 10.32 Singularity goes off, 10.33 the mask while it charges, 10.34 Gale Cut in every form (his sheet's other gaps listed there), 10.35 the clash banners were already in (no clash pose sheets exist: ask him), 1.72, 1.68.

## Batch 8: the two kings (Suleiman wants these before the slinger; built 20 Nov, but OUT of the default teams because the heroes lost 10 of 10, 10.31; pick them on the select)
- **Phase 10 (10.17 to 10.22)** King Alagara: Active and Echo Verses, Claim, Mantle, Drawn Blade, Gale Cut, Rending Draw, Unmoved. Art: mostly here (6.74); missing Rending Draw, Unmoved and Crowned Cut poses. **Opus**.
- **Phase 10 (10.23 to 10.29)** Gadara: Fork and Blade, Snare Hook, Sunder Boon, Heavy Cleave, Mask Gauge, Singularity. Art: skill sheets here (6.75); missing Singularity, Reverse Grip and the Blade attack. **Opus**.
- **6.81** (new 20 Nov) Sudeen's new sheets (expressions, herb toss, slash poses, four-view with the scimitar showing, bash): cut and wire them; probably settles 1.62. Art: here. **Sonnet** (do with Batch 4).
- **6.74 / 6.75** Cut and wire their sheets and eleven GIFs, including the weapon aura. Art: no. **Sonnet** (do before the kit work).

## Batch 9: the new classes
- **19.1 / 6.76** Leol, the Slinger (Sling and Hammer stances, Barricade). Art: sheets here; missing walk, portrait, smoke and barricade animations. His stats are not given. **Opus**.
- **19.2 / 6.77** The Thief (Hide, Ambush, Trap, Bleeding). Art: sheets here; missing walk, hidden look, placed trap. His stats are not given. **Opus**.
- **6.78** The second lion warden. Art: sheet only; no name, class or kit yet. Wait for Suleiman.

## Batch 10: bigger rules
- **13.65 + 6.79** Echoed Slow becomes Gravity (and other echoes get names). Art: yes for Gravity's effect (here), numbers from Suleiman. **Sonnet** after his answer (Q7).
- **13.66** Critical hits, with the Lightning-from-above form. Art: none. **Sonnet** after his answer (Q8).
- **13.61** Gaha's spear throw pins when the target hits a wall (needs the Pinned status from 19.6 and Baiyee's yes). Art: none. **Sonnet**.
- **13.57** Team attacks with joint animations. Art: yes, he must draw them. **Opus** (design first).

## Waiting, not scheduled
- **11.9** The jungle map: needs his layout, heights and props. 13.64 difficulty by level and story. 18.33 sharper Layra, Sudeen and Gaha (he must send high-resolution files). 18.34 attack animations need work (ask which). 13.62 Poise to Stamina (he now says poise works well; ask).

## Questions only Suleiman can answer (Q numbers used above; full text in the roadmap, Questions)
1. DECIDED 19 Nov: Ward off in a clash, switchable on and off (free tap or toggle still open).
2. The second lion (6.78): name, hero or enemy, class, kit?
3. Leol and the Thief: HP, attack, defense, speed, move and clash profile? Hero or enemy? When is the female thief?
4. "Rejuvenate is op": which skill (Renewal or Herbs), and what should change?
5. DECIDED 19 Nov: yes, Kofi's spirits.
6. "The vertical and horizontal lightning issue again": what did he see?
7. PARTLY ANSWERED 20 Nov (Layra Gravity PDF: Kneeling, -2 Defense, a resistance roll with the higher of Defense and Magic Defense, 2 turns; see 13.65). Still open: do the other echoed Verses get names? Is the 3d6 roll acceptable, or should it be our usual hit roll?
8. Critical hits: wanted? How often, how big?
9. Poise: it "works well now". Is the stamina swap still wanted?
10. DECIDED 20 Nov: Disoriented hex against magic defense, the old look back (13.60, 1.71). Was: Haunt: any mark left on the target after the cast? Any number for the hex roll? (20 Nov: he still wants it a Disoriented hex with psychic damage over time, or else a plain poison; but on 19 Nov he also wants the old effect back, 1.71: which is it?)
11. The Gaha and Bull clash GIF "plays like its own cutscene": smaller, on the tile, or no frame?
12. Gadara: is the "already generated" Twin Prongs sheet coming, and how should the Blade basic attack be drawn?
13. Hit effects and spell sounds: are the 2 frame flashes and the 5 second sounds final?
14. Jungle map: will he send a layout, heights and prop list like THE CAVE sheet?
15. Character select: when do the bios come, and should the new lion and the thief be on it at once?
16. Mirrored sheets: which are true views and which are mirror copies?
17. Gadara's numbers to tune after play (10.29): the Blade's +2, Fork's second hit on an Off-Balance foe, Snare Hook's damage and range, once-a-battle Singularity, Sunder Boon on a foe with no blessing.
18. Alagara's numbers: his stats (the sheet gives only high, medium, low; ours are HP 34, attack 7, defense 2, evade 18, speed 11, move 4), is +50 percent on the Active Verse enough, is 75 percent and one more turn the right price for the Echo, are the Surges balanced?
19. Art still missing for the kings: Rending Draw and Unmoved poses, Crowned Cut, Reverse Grip, Singularity's own cast pose (we use the 31 Oct mask and staff-raised pictures), a Fork Strike sheet, and back views for Claim and Alagara's injured pose.
20. Who gives Alagara his Verses on the enemy side, where no Enchanter fights with him? (For now he Claims them from heroes.)
21. DECIDED 20 Nov: after 6.61 and the slinger. Was: Five a side (18.46): his voice note asks for Baiyee's thoughts. Do we go to 5 v 5 now, or after the slinger and Kofi's move (6.61)?
22. DECIDED 20 Nov: the whole old look comes back, cast picture too. Was: Haunt (1.71): the old effect lingers on the target for 3 turns. Does Kofi's plain-attack animation fix from 1.57 stay while the effect goes back?
23. Sudeen's new sheets (6.81): are they meant to replace his whole set (battle stance, attacks, Herb toss, faces), and are the bash sheets the same four frames as the 13 Nov ones?
