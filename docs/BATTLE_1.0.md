# Battle System 1.0: the plan

Written 11 Nov 2026. Planning only: nothing in the game changed with this document.

**Lens: the Problem Statement** (Schell). Before building more, say exactly what a finished battle is and what stands between us and it. Then every batch solves a named problem instead of polishing at random.

**What "the battle system" covers here:** one full 3 v 3 fight in the Hidden Cavern with the current cast (Sudeen, Gaha, Layra against Rabdul, Tayo and the archer, the bull on the bench), from the first turn to the result screen, on an upright phone and on a desktop screen. Suleiman's ideas, characters and art style stay as they are.

**Not part of 1.0** (they stay in the roadmap for after): King Alagura (Phase 10; the first job after 1.0; the kings are Alagara the Lesser and Gadara), ramps (Phase 12), the wider cavern unless 4 v 4 needs it (14.2), the hub (Phase 15), finishers (Phase 7), new characters (6.21, 6.22, 6.31 and the male sage 6.25; Kofi 6.38 is the 4th hero, decided 12 Nov), arena runes and terrain damage (13.7, 13.13, 13.16, 13.19), the barrier (13.2), team load-outs (13.8), self-inserts and trained AI (13.32, 13.33).
- **Phase 10, the first job after 1.0 (decided 12 Nov).** Art each king already has (details in roadmap Phase 10):
  - Alagara the Lesser (Alagura in the roadmap): class sheet; battle, Swift, Fury and Earth front-on pictures and an iso neutral (in incoming, not yet in the game); clash banner cut.
  - Gadara: 8-direction turnaround, battle and attack iso, mask on (4 views), mask south-west and mask spell (in incoming); clash banner cut; six-stage gravity spell effect. Her ability sheet has not arrived.

## How this was checked

- Two full battles played by the test player in a real browser: phone (390 x 844) and desktop (1440 x 900). 65 and 76 screenshots, looked at on contact sheets. No page errors in either. They ran 60 and 97 turns.
- A ledge fall, a wall slam and a lethal fall forced in slow motion and shot frame by frame.
- Every character picture laid out at game scale on one sheet per character (about 370 pictures), feet on one line.
- Every effect flipbook measured for how far it drifts from frame to frame.
- The code behind falls, pushes, walking, Sonic Javelin and picture scaling read to find causes.
- The scripts are scratch copies (outside the repo). Milestones M1, M3 and M5 turn them into proper tools.

---

## Part 1. Definition of done

Battle 1.0 is done when every line below passes. Each line says how it is tested.

### A. Movement and bodies
- [ ] A1. No unit ever glides while standing still in its pose. Walking shows walk frames (or the code walk from M13) for all 6 fighters in all 4 directions. Test: browser sheet of a 3 tile walk per character per direction.
- [x] A2. A push off a ledge shows four clear beats: knocked back, in the air on a curve, landing with dust and a squash, getting up. It never travels in a straight line through a cliff face. Test: fall sheet for 1 and 2 levels, left and right; a jsdom test that the mid-flight point is above the straight line.
- [x] A3. A wall slam shows the body fly to the wall, flatten, bounce and stagger. Lethal and non-lethal look like the same event with different endings. Test: slam sheet, both kinds.
- [x] A4. All pushes (9 places in the code today) go through one function. Test: grep finds one caller of the slide and fall pair.
- [x] A5. No unit moves more than one tile in 80 ms except moves on a short named list (Sonic Javelin forms, Blitz, Husk). Test: the jump logger at 60 frames a second over one full battle prints nothing outside the list.

### B. One character, one look
- [x] B1. For each character, the head is the same size in every picture, within 8 percent. Test: the size audit tool passes with no picture outside 0.92 to 1.08. (12 Nov: `ruler.py audit` passes for Sudeen, Gaha, Layra, Tayo and Kofi, judged per picture set. Rabdul, the bull and the archer cannot be measured by the tool and were set by eye on their contact sheets.)
- [ ] B2. No old-style picture is left (different outfit, colours or painting style). Test: the list in Part 4, item ART3, is empty; one contact sheet per character signed off by Suleiman.
- [x] B3. (13 Nov: `ruler.py measure` finds the foot point of every picture, the middle of the weight of the legs, and writes it as "footX"; the game puts that point on the tile's middle. `ruler.py audit`: 440 still pictures, 0 more than 3 pixels out, where 298 were before; 13 moves, none starting off the tile. Seen on sheets for all 8 characters.) Feet stay on the same ground point when the picture changes. Test: the audit reports the foot point of every picture within 3 pixels of the tile middle at game scale.
- [ ] B4. Every fighter has every core pose: stand, battle, windup, attack, guard, dodge, hurt, airborne, down, get up, weak, victory, walk. Test: a pose table printed by the audit has no empty cell.

### C. Effects
- [x] C1. (13 Nov: 20 flipbooks have a named anchor in dev/tools/fx_anchors.json; 11 were re-cut on one canvas each; `align_fx.py audit` passes and runs inside n55.) No flipbook slides or jumps: its anchor point (base or centre, named per effect) stays within 3 percent of the frame width across frames. Test: the drift audit in the test suite.
- [x] C2. (13 Nov: n55. Fury, Stone, Swiftness, Slow, Enchant and Burning are all inside the unit's own container, walk with it and are gone when they end; 12 one-shot effects leave nothing behind.) An effect that belongs to a unit follows that unit while it moves, and nothing is left behind after its turn. Test: n46 style check that emitters and pictures are gone, plus a walk under each Verse on a sheet.
- [x] C3. (13 Nov: n56 and `node dev/browser/water.cjs`.) Water moves: the waterfalls play the v2 loop, with a splash ring in the pool. Test: phone and desktop shots of two frames that differ.
- [ ] C5. Every skill and status effect has a charge-up, an impact and a follow-through (M3b), and Baiyee signs off each one. Test: a slow-motion GIF per effect, before and after, sent to Baiyee.
- [ ] C4. Frame rate stays at 50 or more on a mid phone setting (4 times CPU slowdown in the browser) with 3 Verses and a clash on screen. Test: frame-rate log from the browser script.

### D. Reading the screen (phone, 390 x 844)
- [ ] D1. Nothing over a unit's head overlaps a neighbour's (17.2). Test: a script that checks the nameplate boxes of adjacent units do not intersect.
- [ ] D2. No floating word is cut by the screen edge or sits on another word (17.3). Test: every callout box inside the screen and no two intersect, logged over one battle.
- [ ] D3. No test labels on screen ("H1", "E1", "Enemy 3"). An unnamed unit (the archers are generic, Suleiman 11 Nov) shows its class name ("Archer"), with no name or portrait needed. Test: grep of all text objects during a battle; the archer's label reads "Archer".
- [ ] D4. All text is 11 real pixels tall or more; every button is 44 pixels tall or more (17.4, 17.5). Test: script measures text and hit boxes.
- [ ] D5. The action menu always opens in the same place (17.5). Test: its position logged at every opening is identical.
- [ ] D6. A fighter can be picked out from the floor at a glance (17.6). Test: Suleiman and Baiyee can name every unit's side on a still screenshot in 2 seconds; shadow and rim present on every figure.
- [ ] D7. Move and target tiles show the floor through them and show the path (17.11). Test: sheet.

### E. Desktop (1440 x 900)
- [ ] E1. A standing fighter is 90 pixels tall or more at rest. Today it is about 45. Test: measured in the browser.
- [ ] E2. The title, story box and result panel scale with the screen (no small box in a black field). Test: sheet.
- [ ] E3. Mouse hover shows the tile and unit under the pointer; keyboard: Esc cancels, Enter confirms, Space ends the turn. Test: Playwright key presses.

### F. Feel
- [ ] F1. Every hit: white flash on the target, hit stop, the HP bar keeps a pale chunk then drains, bigger numbers for bigger hits (17.13). Test: sheet of 3 frames of a hit.
- [ ] F2. Every turn starts with a short banner in the side's colour (17.15), skipped by a tap. Test: sheet; test that a tap ends it.
- [ ] F3. Victory and Defeat build up: slow last blow, dim board, word sweeps in, then turns, damage dealt, who fell (17.10). Test: sheet and a jsdom test of the numbers.
- [ ] F4. Sound: every action has a recorded sound (not a code beep), mixed under the music. Test: a list of actions against sound files, no gap.
- [ ] F5. The board does not end in a black void (17.14). Test: sheet.

### G. Rules, AI and pacing
- [ ] G1. A battle between two sensible players ends in 20 to 35 turns. Test: 20 bot battles, median inside the range. Today: 43, 60, 97 and 128 turns seen.
- [ ] G2. Bot against bot, each side wins 40 to 60 percent over 40 battles. Test: bot.cjs.
- [ ] G3. Enemies heal themselves and each other when it is the right call (13.25) and use every skill they own at least once in 10 battles. Test: bot log.
- [ ] G4. Every skill tells the player what it will do before they confirm, on the board (where the unit ends up, who is hit), not only in the small text box. Test: sheet per skill.
- [ ] G5. Enemy turns can be sped up; a full enemy round takes under 8 seconds at fast speed. Test: timed in the browser.

### H. Solid ground
- [x] H1. The full test suite passes 3 runs in a row with the same result. Test: run_all.sh three times.
- [ ] H2. Closing the page mid-battle and coming back resumes at the start of the current turn. Test: Playwright reload.
- [x] H3. No page error in 5 full battles on each screen size. Test: browser script.
- [ ] H4. First load on a phone connection shows a progress bar and reaches the title in under 10 seconds. Today the build is 42 MB (27 MB of pictures). Test: throttled load in the browser.

---

## Part 2. Gap list, worst first

"Cause" is what was found in the code or the pictures. "Seen" is where it showed up in today's check.

### 1. Characters look different from one pose to the next
The single biggest thing that makes it look unfinished, because it shows on every action.

- **Cause in code:** each unit gets ONE scale for all its pictures (BattleScene.js line 1282 to 1294, from its tallest standing picture). So every picture must be cut at exactly the same pixel scale. They were cut from different sheets at different scales, and nothing checks it. There is no per-picture scale in art.json.
- **Seen on the sheets, by character:**
  - Gaha (100 pictures): thrust and thrustUp frames are clearly smaller than his standing figure; sonicRelease, sonicClose and swift attack are small (figure box 0.45 to 0.6 of standing, more than a crouch explains); the sonicThrow frames are bigger and show him bare-chested with no cloak; the Stone look has a pale grey cloak; "knocked" is an old pale picture in another style; victory is in lighter colours.
  - Sudeen (62): "cast", "knocked" and "victory" are old-style, small and pale; Shield Ram frames look too small now (they were shrunk by 0.48 in 1.24); Furious Charge frames are small; his whole Fury set looks smaller than his base set.
  - Layra (21, the thinnest set): "knocked" shows her in a green cloak (old design); no dodge.
  - Rabdul (30): knocked, kneel and crumple are an older, darker blue set next to the newer cream one.
  - Tayo (66): "knocked" is old-style and small. Otherwise the most consistent set.
  - Archer (56): her source pictures are half the size of everyone else's (standing figure 112 pixels against 200 to 222), so she is drawn at 0.89 scale while the others are at about 0.5. On the closer phone view (17.1) she is softer than the rest. Dodge and one knocked picture are old-style.
  - Bull (37, benched): "knocked" is darker than the rest.
- **In a fall or death** the mismatch is worst: the body shrinks and turns pale as it cross-fades into the old "knocked" picture.
- Fix: M2 (code: size ruler and per-set scale) now; ART3 (redraws) later. DONE 12 Nov (roadmap 18.2): dev/tools/ruler.py, "ruler" in art.json, showFrame. New finding: Tayo was not the most consistent set; his punch, guard, block, weak and Earth Drive pictures had heads 1.3 to 1.6 times the standing head. The archer is recut at 300 pixels from the Email sheets (18.26).

### 2. Units do not move like living things (the skeleton or rig problem)
- **State:** a walking unit is its standing picture sliding 190 ms a tile with a 4 pixel bob. Only Gaha has walk frames (3 pictures, one direction, away from the camera). The only idle life is a 3.5 percent breathing stretch.
- **The rig:** three tests (S.1, S.2, and the Blender rigs v2 and v3 on 9 Nov). Result each time: good for breathing and small reactions; the walk reads as marching on the spot; three-quarter views need a parts sheet per facing with the cloak split up; a body that twists needs real 3D. S.3 is parked and Suleiman may bring schematics in January.
- **The real problem:** the roadmap has been waiting for the rig to give walking, and the rig cannot give it soon.
- **Decision proposed (best feasible):** stop waiting. 1.0 uses frame-by-frame walks from Suleiman (he already offered, S.4) and a code walk until they arrive. The rig stays an offline experiment for after 1.0. This removes the rig from the critical path.
- Fix: M13 (code walk now), ART1 (walk sheets).

### 3. Falls and slams look wrong
- **Cause found:** `slideAlong` (BattleScene.js line 4707) moves the pushed unit in a straight line, 170 ms a tile, in whatever picture it was showing, with a 4 pixel hop. When the next tile is lower, that straight line runs diagonally through the cliff. Then `showFall` (line 4249) adds a dust puff and "Fall -4". There is no time in the air, no landing picture, no getting up. The unit ends standing as if nothing happened.
- A non-lethal wall slam is a 14 pixel nudge for 70 ms.
- A lethal one goes through `playDefeat` (line 3632), which is better (arc, squash, slump) but uses the mismatched old pictures from gap 1.
- Drawing order changes at the start of each step, so the body can pop in front of or behind the ledge mid-move.
- The slide plus fall pair is copied in 9 places (lines 3041, 4511, 4685, 4943, 5076, 5172, 5466, 5712, 6380), each with its own timing. That is why they do not match each other.
- **Seen:** forced ledge fall, 12 frames: figure upright the whole way, text appears, done.
- Fix: M1 (code, no art needed). ART2 makes it better later. DONE 11 Nov (roadmap 18.1): one function in src/knockback.js; Gaha already uses his ART2 sheet.

### 4. Effects that slide or jump
- **Cause 1, the pictures:** 21 of the 25 effect flipbooks have frames of different sizes, placed by one fixed origin, so the effect shifts as it plays (the same cause as the flame bug 1.42). Measured drift of the base point across frames, as a share of frame width: enchant_sigil 19 percent, sj_spear 17, smoke_clear 14, spike (old) 12, spike_erupt 11 (and its foot gap changes 11), death 10 (no longer drawn), enchant_comet 9, enchant_ring 8, fury_cast 6, dust_ring 6, swift_trail 5, swift_swirl 5. sonic_trail's centre drifts 32 percent, smoke_cloud's 15, blast_orb's foot gap 15. Some of this is meant (a cloud that grows), so each one needs a look, but none has a named anchor today.
- **Cause 2, the code:** not yet confirmed. Effects spawned at a screen point (not attached to the unit) would stay behind when the unit or camera moves. M3 checks each one.
- Fix: M3 (code and re-cuts from the pictures we have, no new art).

### 5. Clutter and colliding text on the phone (17.2, 17.3, 17.4, 17.5, 17.7)
All five are still there in today's run.
- 17.2 Overhead clutter: bars, numbers, icons, stance words and badges stack and cover neighbours when units stand together.
- 17.3 Floating words: "H1 9 vs 20 E1" and "E1 19 vs 17 H1" still use test labels; "Aiming" and "Marked" are cut by the screen edge; "Relay!", "Slammed!" and "Disoriented" stack on each other at the left edge; "Thrown back" prints twice on itself.
- 17.4 The stat row is too small to read; the info box repeats the unit's name.
- 17.5 The action menu opened mid-board over the fight in one shot and bottom right in another.
- 17.7 The title line and the floating "Effects: Light" pill waste the top strip. Also seen: late in a battle the turn strip shows the same face 9 times.
- Fix: M6 and M7 (code).

### 6. Desktop is the phone layout stretched (new)
- Fighters are about 45 pixels tall on a 900 pixel screen, the same problem 17.1 fixed for the phone only.
- The title is small text in a black field; the story box is about 150 pixels wide in a 1440 pixel screen.
- No hover, no keyboard.
- Fix: M8 (code).

### 7. Battles run too long (13.34, 13.36)
- Seen: 60 and 97 turns today (a simple test player, both lost); 43 and 128 turns in real play.
- No fast speed for enemy turns apart from holding to skip.
- Fix: M11 (code; no fatigue rule, only dead time is cut).

### 8. Hits, turns and the ending lack weight (17.13, 17.15, 17.10)
- 17.13 The HP bar just gets shorter.
- 17.15 A new turn only changes a small text box; enemy turns look like yours.
- 17.10 Victory and Defeat are a small panel with one number. After the last blow there was still no panel 2.5 seconds later on desktop (the dissolve was still playing).
- Fix: M9, M12 (code).

### 9. Fighters melt into the floor; tiles hide the floor (17.6, 17.11)
- Still true: units, cave and props share one warm orange-brown.
- Move tiles are opaque blue slabs with no path line.
- Fix: M10 (code). Colour accents on clothes are art (ART7).

### 10. Skills do not show what they will do: bug 1.43, Gaha "teleporting"
- **Verdict: real to the eye, but not a position bug.** Under Swift, Spear Throw becomes Sonic Javelin, which has three forms picked by the game (`javelinForm`, line 5604): a throw at range; a "whirl" when the foe is close (he dashes at 85 ms a tile, more than twice walking speed); and a "sweep" when the foe is Off-Balance or Disoriented, where he fades out in 90 ms and is placed beside the foe (line 5830 to 5842). The sweep is a teleport by design. Suleiman expected a throw, tapped a close foe, and got one of the other two. The only warning is one line in the small text box.
- The jump logger over two battles found no move longer than two tiles in a frame, and all but a few were inside a running animation. The browser test ran at a low frame rate, so it cannot rule out small snaps. M5 reruns it at 60 frames a second.
- Fix: M4 (code): show the form's name and a ghost of where he will end before confirming, and draw the zip as a visible streak.

### 11. Waterfall v2 is not wired in (1.41)
- The cave still draws falls as pale streaked rectangles made in code (`drawWaterfall`, boardArt.js line 1350). They read as flat panels in every screenshot.
- The v2 frames exist in Fabien Blueprint/BLENDER TESTS/fire_water/: waterfall_tall (12 frames, 256 x 352), waterfall (12 frames, 256 x 224), splash_ring (12 frames, 272 x 168).
- Fix: M3 (it rides with the effects batch). No art needed.

### 12. Sound is made of code beeps (new)
- Every sound effect is built from waves and noise in audio.js. The two music tracks are real files. A studio game needs recorded hits, steps, voices of effort, UI clicks.
- Fix: M14. Needs a decision from Baiyee on where sounds come from (a licensed pack is the realistic answer).

### 13. Enemy play (13.25, 13.27)
- 13.27 is partly answered since it was logged: Rabdul has Double Hit and Enchant, Tayo has Earth Drive, Element Blast and the clap, the archer has Poison Arrow and Smoke Bomb.
- Still open: enemies healing each other (13.25), and whether the AI uses its kit well. Not measured yet.
- Fix: M11 measures; M15 fixes.

### 14. Nothing saves; loading is heavy (new)
- A page refresh loses the battle. On a phone, with battles this long, that will happen.
- 42 MB build, 1.5 MB of script in one file, no measured load time or frame rate on a real phone.
- Fix: M16.

### 15. The tests are slow and have wobbled before
- Today the full suite passed 48 of 48 in one run. It took more than 20 minutes on a busy machine.
- Earlier runs (roadmap status note, 5 Nov) gave failures that changed from run to run, and CLAUDE.md names sage-l and story-smoke as shaky under load. One clean run does not prove that is gone.
- Nothing in the suite checks the look: sizes, drift, text overlap, falls. Those checks are what this plan adds.
- Fix: M5.

### 16. The board ends in a void; placeholder enemy (17.14, 17.12)
- Black beyond the map edge on both screens.
- "Enemy 3" with a generic face is the archer's name in units.json.
- Fix: M17 (code fog and dust now; the archer shows her class name, no art needed for that; ART6 for the backdrop).

### 17. One 7,199 line file
- BattleScene.js holds turns, AI, every skill and every animation. It is why the push code is copied 9 times. Not a player-facing gap, but it slows every milestone.
- Fix: no big rewrite. Each milestone moves the part it touches into its own file (M1 moves knockback, M6 moves nameplates, and so on).

### 18. Small open design items that 1.0 should settle
- 13.37 rename Sonic Clap to Sonic Burst (rides with M4).
- 13.38 Sonic Burst makes Earth Drive rocks explode; 13.5 punch the rock (same idea, Suleiman's version taken). In M15.
- 13.1 Guard and Rest: Suleiman is unsure. Proposal: leave out of 1.0.
- 13.6 and 13.20 Tayo's repel prompt: waiting on his art. After 1.0.
- 13.9 Layra floats more, 13.10 channel-then-cast for more spells: in M13 (movement life), code only.
- 13.24 wounded and guarding attack pictures: after 1.0.
- 6.19 small Verse icons and a ROOTED icon: art ART8, used by M6.

### 19. Outside the battle (17.8, 17.9)
- Title screen and story scenes are plain text on a dark screen. They are the front door, not the battle, so they come last (M19) and wait on art (ART9).

---

## Part 3. Milestones, in order

One session each: build, test, tick the roadmap, push, stop. Roadmap numbers are 18.1 to 18.20 (Phase 18; 18.21 is the first item after 1.0): 18.4 is M4, and so on. M10b is 18.22 and M3b is 18.23. Letters A to H with a number (C1, D3) always mean a line of the Part 1 checklist; ART1 to ART10 are the art list in Part 4. "Done when" is the test.

| # | Milestone | Fixes | Done when | Art needed |
|---|---|---|---|---|
| M1 (done 11 Nov) | **One knockback.** All 9 push sites call one function in its own file. Knocked back in the hurt picture, a curved flight, a real drop at a ledge (speeding up), landing squash and dust, a held down or kneel picture, then get up. Wall slam: fly in, flatten, bounce, stagger. Drawing order follows the body. | Gap 3 | checklist A2, A3, A4 pass. Fall sheets (1 and 2 levels, both sides, lethal and not) looked at on phone and desktop. n47 updated. | None. Better with ART2. |
| M2 (done 12 Nov) | **Size ruler.** A tool that lays every picture of a character on a ruled sheet and records a scale and foot offset per picture set in art.json; `showFrame` uses them. Fix the worst sets first: Gaha thrust, sonic and swift attack; Sudeen ram, charge and Fury; the archer. Old-style pictures are swapped for the nearest new one (tilted hurt picture for "knocked") until redrawn. | Gap 1 | checklist B1, B3 pass for all 7 characters. Before and after sheets. Picture-count tests still pass. | None. ART3 finishes it. |
| M3 (done 13 Nov) | **Effects stay put, and the water moves.** Generalise align_flame.py: every flipbook on one canvas with a named anchor. Re-cut the drifting ones. Check each unit effect follows its unit. Wire waterfall v2 and the splash ring into `drawWaterfall` (flip for right faces). | Gaps 4, 11 | C1, C2, C3 pass. Drift audit added to run_all.sh. | None. |
| M3b | **Effects to studio quality** (added 12 Nov, Baiyee; Fable work; do not start before M5 is pushed). (1) Audit: every skill and status effect played in slow motion, one contact sheet or GIF per effect, compared against the standard of a modern tactics game. (2) Layers: each effect is built as anticipation or charge-up, a bright flash at the moment of impact, the main effect, particles, then smoke or embers that fade out; additive glow, plus light cast on the floor and on nearby units. (3) Impact feel: hit-stop, camera shake and zoom tuned to how strong each skill is. Small hits stay small, so the big ones feel big. (4) One colour language per element (fire, earth, sand, sound, poison), used the same way everywhere. (5) 16.4 clash burst: more boom, bigger, waves of energy (Baiyee's notes), using Suleiman's 1340 burst once he resends it on black. (6) Look again at the effects we rebuilt: Fury, Enchant, smoke, Sonic Burst, Element Blast, the spike. Rules: Suleiman's drawn effects stay the core; code adds glow, light and particles around them and never replaces his style. Respect the Full and Light effects setting and the frame-rate fallback, so phones stay smooth. | Gap 4 (the look, after M3 fixes the drift), 16.4, roadmap 18.23 | checklist C5 passes: a GIF per effect, before and after, sent to Baiyee and approved. C4 still passes. | None to start. The 1340 burst on black for the clash (16.4). |
| M4 | **Skills show what they will do.** Sonic Javelin: form name on the board, ghost at the end tile, a streak for the zip. Same preview for Blitz, Shield Ram, Fury Dive, Husk. Rename Sonic Clap to Sonic Burst. (1.43 is closed, 11 Nov: Suleiman likes the dash, it is a design choice. The landing spot is still shown.) | Gap 10, 13.37 | G4 passes. Suleiman plays Gaha under Swift and says it is clear. | None. |
| M5 (done 12 Nov) | **Steady tests.** Run the suite 3 times; fix anything that changes between runs (sage-l and story-smoke first) and cut the run time (it took over 20 minutes). Add the 60 frames a second jump logger and the page-error battle run to dev/browser. | Gap 15, rest of gap 10 | checklist H1, H3, A5 pass. | None. |
| M6 | **Nameplates and one callout lane.** One small plate per unit, 2 icons then "+2", stance word and pips only for the two in the clash. All floating words go through a queue in a lane under the turn strip, clamped to the screen. Real names in the score line. | 17.2, 17.3 | D1, D2, D3 pass. | ART8 helps (small icons). |
| M7 | **Card, menu, top strip.** Full-width card with 4 readable stats, rest behind a tap. Action menu fixed bottom right, 44 pixel rows. Title line gone, bigger turn faces with a "now" marker, no repeats of one face, Effects moved into a settings sheet. | 17.4, 17.5, 17.7 | D4, D5 pass. | None. |
| M8 | **Desktop layout.** Bigger figures at rest on wide screens, title, story and result scale with the screen, hover and keyboard. | Gap 6 | E1, E2, E3 pass. | None. |
| M9 | **Weight.** White flash, pale HP chunk that drains, number size by damage, turn banner in the side's colour. | 17.13, 17.15 | F1, F2 pass. | None. |
| M10 | **Reading the board.** Contact shadow and team-colour rim on every figure, floor a little darker under them. Soft tiles with a bright pulsing edge, path line to the finger, red targets in the same style. | 17.6 (code part), 17.11 | D6, D7 pass. | ART7 later. |
| M10b | **4 v 4.** A 4th fighter on each side (roadmap 14.1; 14.2, the wider cavern, only if 8 figures are too tight on the 9 by 9 board). It sits here so the pace and balance work in M11 and M15 is done once, for 4 v 4. Enemy side: the bull comes back (take him out of `sittingOut` in cavern.json; his art is complete and he already has a start tile). Hero side: **Kofi** (Baiyee, 12 Nov). His own kit arrived 12 Nov (roadmap 6.38), so the borrowed Sage kit is not needed; see "The 4th hero: art check" below. | Phase 14, roadmap 18.22 | A 4 v 4 battle plays to the end on phone and desktop with no figure covering another at the start; the 3 v 3 tests still pass; bot battles run 4 v 4. | Nothing blocks the first version. Kofi's kit is in; his missing pictures (listed below) finish him. |
| M11 | **Pace: measure, then cut.** 20 bot battles for a baseline (turns, who wins, skills used). Fast enemy turns and faster animations: cut dead time only (enemy thinking time, slow animations). No fatigue rule (Baiyee, 13 Nov): battle length should come from how well the player plays. | Gap 7 | G1, G5 pass.  | None. |
| M12 | **The ending.** Slow last blow, dim board, the word sweeps in with a music sting, then turns, damage, who fell, faces. | 17.10, 13.45 | F3 passes. Also: the result screen shows the turn count against a par for the battle, a rating, and a bonus for beating par (13.45, "Reward fast wins"). | ART6 optional (banner). |
| M13 | **Movement life in code.** A code walk for anyone without walk frames: two-beat step with lean, foot dust and a small squash, faster settle. Layra's walk is sand-driven (13.9, 13.41: she cannot walk unaided, sand and earth bound to her muscles move her, so sand gathers round her legs as she goes; not a plain float). Channel-then-cast pattern on the remaining spells (13.10). Any character's walk sheet drops in through `walkFrames` with no new code. | Gap 2 (code part), 13.9, 13.10 | Walk sheet for all 6: no one glides upright. | None. ART1 replaces the code walk per character. |
| M14 | **Sound pass.** Recorded sounds for hits, steps, casts, UI, falls, deaths, mixed under the music. | Gap 12 | F4 passes. | None from Suleiman. Baiyee picks the source first. |
| M15 | **Enemy play.** Healing self and allies (13.25), Sonic Burst and Earth Drive combo (13.38), AI fixes from the M11 log until both sides win 40 to 60 percent. | Gap 13 | G2, G3 pass. | ART10 optional (Sonic Burst frames). |
| M16 | **Save, load, speed.** Save at each turn start and resume; loading bar; measure load time and frame rate; shrink the biggest pictures if needed. | Gap 14 | H2, H4, C4 pass. | None. |
| M17 | **Edges and names.** Fog band and drifting dust below the board; the archer shown by her class name ("Archer"), no name or portrait. | 17.14, 17.12 | F5, D3 pass. | ART6 (backdrop). Code fog ships without it. ART5 dropped (11 Nov). |
| M18 | **Art drops.** One session per delivery: walk sheets (ART1), fall sets (ART2), redraws (ART3), the archer at full size (ART4). Cut with the M2 ruler so they land at the right size first time. | Gaps 1, 2, 3 (art part) | checklist B2, B4 pass; checklist A1 passes with real frames. | ART1 to ART4. |
| M19 | **Front door.** Title with key art, drift and embers; story scenes with pictures, portraits and fades. | 17.8, 17.9 | Sheet on both screens. | ART9. |
| M20 | **Release check.** Run the whole Part 1 checklist on phone and desktop; Baiyee and Suleiman each play 3 battles on their own phones; fix what they find. | All | Every box in Part 1 ticked. | None. |

**Note on M10, team colours (11 Nov, Suleiman, voice note 1348):** he suggests white for the enemy team, so it stands out from ours, and says we are free to experiment. Before the build, test white first against one or two other colours, on one contact sheet of the same battle screenshot. Show that sheet to Baiyee before choosing. ART7 is optional now (see Part 4).

Order logic: M1 to M4 are the named problems and need no art. M3b (effects to studio quality, added 12 Nov) sits right after M3 in the order, because M3 makes the flipbooks stay put first; it must not start before M5 is pushed. M5 comes before the big screen changes so they can be trusted. M6 to M10 are the Phase 17 code items. M10b (4 v 4, added 11 Nov because Suleiman asked when the 4th fighter comes) is before M11 so balancing is done once. M11 to M16 make it play like a finished game. M17 to M19 take art as it arrives. M18 can happen at any point after M2.

---

### The 4th hero: art check (11 Nov, for M10b)

**Decided 12 Nov (Baiyee): Kofi is the 4th hero.** He goes in at M10b. His own kit arrived 12 Nov, so he no longer borrows the Sage kit; the numbers in his kit are Suleiman's placeholders. The male sage stays in the roadmap for after 1.0 (6.25). Still to ask Suleiman: Kofi's spell kit and moveset in words, then the missing pictures listed at the end of this section.

Checked: every folder in Fabien Blueprint/INBOX (all chat exports, every picture sent after 8 Nov 15:35 on one contact sheet, every voice note transcript, the PDFs through Spotlight) and the rest of Fabien Blueprint. **Nothing about Kofi or the male sage arrived after 8 Nov 15:35.** Kofi's spell kit and moveset ("i'll send the rest alongside his spell kit once i'm back home", 8 Nov 15:34) have not been sent. There is no written moveset for either of them anywhere. Nothing was missing from the roadmap log.

| | Kofi the shaman (6.38) | Male sage (6.25) |
|---|---|---|
| **Have** | Standing, 4 views (1250). Battle-ready stance, 4 views (1251; 1252 and 1255 are more angles of it). Preparing a spell, 4 views (1254). All 1600 by 533, white background, about 400 pixels tall, painted floor shadow. | Standing, 4 views (1237 on a floor tile, 1238 the same on plain grey). Nothing else. |
| Walk | Missing | Missing |
| Attack | Missing (no strike or spell release picture) | Missing |
| Hurt | Missing | Missing |
| Fall (ART2) and down | Missing | Missing |
| Dodge, guard | Missing | Missing |
| Cast | Have the wind-up (1254). No release. | Missing |
| Portrait, hurt face, shout | Missing (a face can be cropped from view 3 or 4 of 1250) | Missing (crop from 1238) |
| Spell effects | None yet. Four summon sheets in 12 Nov (below) | None |
| Moveset and class | Kit in 12 Nov (roadmap 6.38). Needs a class in jobs.json. | None needed if he is a second Sage (6.25: male versions so players can choose). |
| Not cut, not in art.json | Yes | Yes |

**What we can do now with the art we have**
- The game already copes with missing pictures: no walk frames = the slide (the code walk in M13 covers everyone); no hurt picture = the standing picture with the white flash and recoil; no fall pictures = M1 leans the picture back; no down picture = the death topples the figure and dissolves it. So a fighter with only standing pictures can play a whole battle. It just looks plainer.
- **Kofi can go in now as a working first version** (best feasible pick): his three sets give standing, the alert stance when a foe is near, and a cast pose. As a caster his attack is a spell, so the cast pose plus an effect we already have (lightning, fire, the Verse auras) reads fine. Until his own kit arrives he borrows the Sage's numbers and a small set of existing spells, marked temporary in jobs.json.
- **The male sage can go in now only as a second Layra**: same Sage class and spells, standing picture for everything. Weaker to look at than Kofi (one pose), but needs no design.
- A third option on file: the male archer (6.31) has a near complete set (stance, aim, fire, dagger, guard) and could share the archer's class. He is not what Suleiman asked for, so only if both above are rejected.

**To make either of them finished (Kofi is the pick, so his list is the one to send):** Kofi: his spell kit and moveset in words, then spell release, hurt, dodge, the ART2 fall set, down, a portrait, and his spell effects on black. Male sage: everything except standing. Both: ART1 walk sheets, same as the others.

### 12 Nov update: Kofi's kit and missing pictures
- **Kit in** (roadmap 6.38), from Suleiman's Kofi_Ability_Sheet.pdf: Haunt, Spirit Bolt, Call Spirit, Infuse. Numbers are placeholders. The sheet gives no range for Haunt or Spirit Bolt; Infuse reaches an ally within 3 tiles; Call Spirit raises a spirit on an adjacent tile.
- **Still missing for Kofi:** walk; attack and spell release; hurt; dodge and guard; fall (ART2: in the air, on hands and knees, getting up); down; a portrait; a cast release (only the wind-up, 1254, is here); spell effects on black.
- **Summons in, not cut:** flame (Ember, 1398), tide (1399), earth (Stone, 1400), gale (1402). Against the Part 4 rules: the cells are 400 pixels wide, not 512 (fails); no ruler cell (fails); a floor diamond under each, to be removed in the cut; white background (treated like characters); the four are four different designs, not palette swaps as the sheet suggests. Earth is shortest (about 410 pixels; the others 458 to 477). Ask Suleiman for full-quality files; these are WhatsApp copies.
- **Swap the archer for Kofi:** settled 12 Nov. Kofi is the 4th hero; the archer stays an enemy.

## Part 4. Art needs (for Suleiman)

### Rules for every sheet (these fix the size and sliding problems at the source)
- **Characters:** plain white background. **Effects:** pure black background (13.35).
- **Equal cells.** Every frame in its own cell of the same size: 512 x 512 pixels for characters, with the feet on one ground line 32 pixels above the bottom of the cell and the body centred on the cell's middle.
- **A ruler in every sheet.** The first cell of every character sheet is that character's normal standing figure, drawn at the same scale as the rest of the sheet. This one habit lets us match size exactly every time.
- **Standing height 400 pixels or more** in the source (head to feet). The game stores about 200; the spare keeps close-ups sharp.
- **Views.** Two views at least: facing down-right (toward the camera) and up-right (away). We mirror them for the left. Four true views only for one-sided gear where the mirror looks wrong (Sudeen's shield, the archer's bow), if he has time.
- **Same outfit and colours as the character's current standing picture.** No bare chest, changed cloak or lighter palette unless the skill calls for it.
- **Effects come as a frame sequence** on pure black, in cells of the same size, centred on one point in every frame.
- Send originals as PNG where possible (HEIC and JPG are fine if not).

### What to draw

| # | What | For whom | Exact spec | Waiting on it | Without it |
|---|---|---|---|---|---|
| ART1 | **Walk cycle** | Gaha, Sudeen, Layra, Rabdul, Tayo, archer, in that order | 6 frames per view, 2 views (down-right, up-right), so 12 frames per character, 72 in all. Right leg and left leg both step. Layra's can be a float: 4 frames per view. White, 512 cells, ruler cell first. | M18 (and checklist A1) | M13's code walk: step, lean and dust on the standing picture. Good enough to ship if needed. |
| ART2 | **Fall set** | All 6, plus the bull. Gaha: one view in and in the game (11 Nov, sheet 1350); his second view (from behind) is still wanted. | 3 frames per view, 2 views: (1) in the air, thrown back, limbs loose; (2) landed, on hands and knees; (3) pushing up to stand. White, 512 cells, ruler cell first. Frame 1 replaces every old "knocked" picture. | M18 | M1 tilts the hurt picture in the air and uses the existing down and kneel pictures. |
| ART3 | **Redraws of old-style pictures** in the current isometric look | Gaha: victory, and the Sonic Javelin throw frames with his cloak on (6 frames). Sudeen: cast, victory. Layra: dodge (new; kept 11 Nov, Suleiman will draw it), and a check of her set against her newest look (6.24). Rabdul: kneel and crumple in his cream outfit. Archer: dodge. | 2 views each, white, 512 cells, ruler cell first. "Knocked" for everyone is covered by ART2. | M18 (checklist B2) | M2 swaps each for the nearest new picture, which is consistent but plainer. |
| ART4 | **The archer at full size** | Archer | First we check his originals in Fabien Blueprint: if they are 400 pixels or taller we re-cut and he draws nothing. Only if they are small: her standing, battle, aim and dagger pictures again at 400 pixels or more. | M18 | She stays a little soft on close-ups. |
| ART5 | **Not needed: the archer is a generic unit** | Archer | None. An unnamed unit shows its class name ("Archer") on screen, with no name or portrait (Suleiman, 11 Nov). | M17 | Nothing. The class name passes D3. |
| ART6 | **Cave depth backdrop**, and an optional Victory and Defeat lettering | Board | Backdrop: 2400 x 1400 or bigger, the cave falling away below and beside the arena (rock walls, mist, a few far lights), dark, nothing bright in the middle third where the board sits. Lettering: each word 1600 x 400 on black. | M17, M12 | Code fog, dust and a styled text banner. |
| ART7 | **Colour accent per enemy** | Rabdul, Tayo, archer, bull | Optional: Suleiman may send a curated version. | After M10 | Rim light and shadow from M10. |
| ART8 | **Small icons** (6.19) | Swift, Fury, Stone, Slow, Rooted, Blinded | 96 x 96 each, bold single shape, 2 or 3 colours, on black. Must read at 18 pixels. | M6 | Current icons, shrunk (a bit blurry). |
| ART9 | **Title and story art** | Front door | Title key art in two shapes: 1080 x 1920 (phone) and 1920 x 1080 (desktop), heroes and the logo lettering, with the logo also alone on black. Story: one picture per scene at 1920 x 1080 and a 512 x 512 speaker portrait per speaking character (the City of Chains shots 6.42 are the start). | M19 | Text screens stay as they are. |
| ART10 | **Sonic Burst effect** (13.39) | Tayo | 8 frames on black, 512 cells, the burst centred on the same point in every frame: fists meeting, flash, sound rings spreading. The shockwave ring (6.40) is already here. | M15 (optional) | The punch pictures (6.39) and the ring we have. |

**Most valuable first, if he can only do a little:** ART2 for Gaha and Sudeen, then ART1 for Gaha (toward the camera) and Sudeen, then ART3.

**Nothing in M1 to M16 is blocked by art.** Art makes M17 to M19 and lifts the look of M1, M2 and M13.

---

## After 1.0

**18.21 Generic version of every class (new 11 Nov, Suleiman, voice note 1348).** The archers are random units, not named characters. Fights will need a generic version of every class in jobs.json, each shown by its class name, with no name or portrait. Not part of 1.0. Art comes later and follows the Part 4 sheet rules.

---

## Decisions needed from Baiyee
0. DECIDED 12 Nov: the 4th hero is Kofi (M10b). His kit arrived 12 Nov (roadmap 6.38). Next: ask Suleiman for the missing pictures and the full-quality summons, listed in "12 Nov update" under the 4th hero section.
1. Agree that the rig is off the critical path for 1.0 (gap 2).
2. (Fatigue rule dropped 13 Nov.)
3. Where sounds come from for M14 (a licensed pack is proposed).
4. Guard and Rest (13.1) left out of 1.0: yes or no.

## Where we stopped (13 Nov, working through the queue)

The queue (Baiyee, 13 Nov), in order: 1 knockback gap 13.47; 2 three open rules in BATTLE_SYSTEMS.md; 3 clash dice; 4 high ground in a clash; 5 turn shape (act then move); 6 close M2's gaps (foot points B3, GIFs); 7 M3; 8 M3b (Blender allowed, see roadmap 18.23); 9 M4; 10 M13; 11 M10b (Kofi from the Email zip in INBOX/2026-11-13/Email); 12 enemies forage (13.48); then M11 and M15 if there is time.

- **Queue items 1 to 7 done.** 7 is M3 (roadmap 18.3): every flipbook has a named anchor and stays put, unit effects follow their unit, the waterfalls play the v2 loop with ripples. Next: queue item 8, M3b (effects to studio quality; Blender allowed under the rules logged 13 Nov in the roadmap's Files received; Suleiman's clash burst 1390 for 16.4; leave room for his buff effects 13.46; before and after GIFs into Fabien Blueprint/EFFECTS GIFS). (Items 1 to 6: 13.47 knockback gap; three open rules; clash dice 13.51; high ground 13.52; turn shape 13.53; M2's foot points and GIFs.)
- M2 still open after item 6: Rabdul, the bull and the archer's heads are sized by eye; old-style pictures wait for ART3; the archer's dagger, poison, smoke and flame pictures are the small soft ones. The GIFs were checked frame by frame at small size and by numbers (every move ends on its tile middle; the only big height change is Gaha's low crouch in the whirl and the sweep, which is drawn that way): Baiyee should still watch them once.

## Where we stopped before (12 Nov, after M2)

- Done: M1, M5 and M2. Next in the order: M3 (effects stay put, waterfall v2), M3b (effects to studio quality), M4.
- M2 left open, on purpose: (1) foot points (checklist B3): the game can use a ground line per picture, but only 3 sets have one and nothing measures the rest; (2) Rabdul, the bull and the archer are sized by eye, not by the tool; (3) old-style pictures that are sized but not redrawn: victory for Gaha and Sudeen, dodge for Tayo and the archer, Rabdul's fall set (ART3); (4) the archer's dagger, poison, smoke and flame pictures are still the small soft ones (no full-quality sheet); (5) the new sizes were checked on contact sheets and in still pictures on the phone board (`node dev/browser/sizes.cjs`), not yet watched move by move: play one battle by hand and watch Sonic Javelin, Shield Ram and Tayo's punch.
- Kofi: his 12 pictures are in art.json as h4 at the right size. M10b adds him to units.json with a class. His spirits wait for the full-quality files.
- To send Suleiman: the 8 sheets in Fabien Blueprint/SIZE RULER SHEETS 2026-11-12.
- Decided: Kofi is the 4th hero (M10b). Still open for Baiyee: decisions 1 to 4 above.
- Waiting on Suleiman: Kofi's missing pictures and full-quality summons (4th hero section); the art list in Part 4; full-quality archer sheets for dagger, poison arrow, smoke bomb and the flaming bow.

## Test results, 12 Nov (M2)

- Full suite (`bash dev/tests/run_all.sh`): passed 47 of 47 (46 before, plus the new ruler.cjs), 0 failed, 195 seconds.
- Real browser: `node dev/browser/battle.cjs phone 1`: one full phone battle, 64 turns, finished, 0 page errors. `node dev/browser/sizes.cjs <folder>` (new) photographs every fighter in 10 poses on the board: 0 page errors.
- `~/.fabien-tools/venv/bin/python dev/tools/ruler.py audit`: ALL PASSED (no measured picture set outside 0.92 to 1.08).

## Test results, 12 Nov (M5)

- Full suite: 46 tests (the old count of 48 and 49 ran nov6b, notes27 and notes27b twice). `bash dev/tests/steady.sh` runs it 3 times and compares: 46 of 46 each time, same result, 191 seconds a run (it was 989 seconds one test at a time, and over 20 minutes on a busy machine).
- What made it faster: 4 tests side by side (JOBS in run_all.sh), no double runs, and a 200-frame warm-up in boot.cjs in place of a fixed 8 second wait for a picture that no longer exists.
- What made it steady: (1) that warm-up. A test browser that has just started draws slowly for its first seconds, and tests that time an animation then miss frames; the warm-up is counted in frames, so it stretches by itself on a busy machine. (2) n37's size check measured figures while they breathe (up to 3.5 percent taller at a random moment); it now measures the resting size. (3) The start-up waits give up after 30 seconds, not 8. (4) A test that fails beside the others is run again alone and listed as SHAKY, so a wobble cannot hide. sage-l and story-smoke did not fail in any of 12 runs.
- Jump logger (`node dev/browser/jumps.cjs`): one full phone battle, 64 turns, 60 frames a second (0.7 percent slow frames), no figure moved more than one tile in 80 ms, 0 page errors. Its self-test (SELFTEST=1) catches a forced 3 tile shove. Known limit: the test player does not force every Sonic Javelin form, so the sweep (a teleport by design, on the allowed list) may not have been seen in that battle.
- Page-error run (`node dev/browser/battle.cjs both 5`): 5 full battles on the phone screen and 5 on the desktop screen, all played to the end, 63 to 93 turns each, 0 page errors in all 10.

## Test baseline, 11 Nov
- Full suite (bash dev/tests/run_all.sh), one run: passed 48 of 48, 0 failed. Run time over 20 minutes with two browser battles running beside it.
- Browser battles: phone 60 turns, desktop 97 turns, 0 page errors in both.

## Test results, 13 Nov (queue items 1 to 6)

- Full suite: 49 of 49 (47 on 12 Nov, plus n53 the push test and n54 the turn shape test), 234 seconds.
- `ruler.py audit`: ALL PASSED, heads (B1) and feet (B3).
- `node dev/browser/gifs.cjs <folder>` (new): 9 moves filmed in a real browser, each ends 0.0 pixels from its tile middle, 0 page errors.
- Bot battles on the cavern (`FABIEN_MAP=cavern node bot.cjs 3`): no figure off its tile (11 before the 13.47 fix), no stuck turn. The simple test player lost all of them, as before today's changes.
