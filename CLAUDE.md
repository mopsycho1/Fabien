# Fabien: Of Gods & Men

A Final Fantasy Tactics style tactics RPG in the browser. Baiyee (IT background, beginner at games) builds it with Claude; his cousin Suleiman designs it and draws the art. Live at https://mopsycho1.github.io/Fabien/ (GitHub Pages deploys on every push to main).

## How to work with Baiyee
- Plain language. No em dashes. Write ranges as "X to Y". Keep code commented and simple.
- Find the cause before fixing. Story and dialogue text stays in JSON (src/data).
- Before each batch, name one Jesse Schell lens (Art of Game Design) in 2 or 3 sentences and why.
- "The best feasible option wins": when a choice is open, pick what makes battles feel most premium and is realistic to build, and say what you picked.
- One batch at a time: build, test, tick the roadmap, push, then stop and wait.
- Keep replies short. Draft a WhatsApp update for Suleiman at the end of a batch when it helps.

## Roadmap (docs/ROADMAP.md)
- Read only the sections you need (grep for the item numbers). Every new request gets a number in the right phase; nothing is dropped quietly.
- Log every file received in "Files received" (bottom) the turn it arrives: date, time, what it is, which item.
- Tick items when built and tested, with a short "Built:" note.

## Save tokens
- Don't re-read big files whole: grep, then read the lines you need.
- Look at many pictures at once on one contact sheet (a small Python/PIL script), not one by one.
- Run only the tests for what changed; run the full suite once before pushing.
- Don't paste long logs back; filter to PASS/FAIL lines.

## Commands
- Play locally: `npm install` once, then `npm run dev` (or `npx vite build` and `npx vite preview --port 4173`).
- Tests (jsdom, in dev/tests): `cd dev/tests && npm install` once. Each run: start the picture server in another terminal, `node serve.cjs` (in dev/tests; the old python server drops pictures on Mac), then `bash bundle.sh` after any code change, then `node <test>.cjs`.
  - Most tests use the old 8x8 map (yoba). Cavern tests: `FABIEN_MAP=cavern FABIEN_BENCH= node n41.cjs` (n41 to n45, n53, n54, n56), `FABIEN_MAP=cavern FABIEN_BENCH=e1 node n39.cjs`.
  - Full suite: `bash dev/tests/run_all.sh` (starts the picture server, bundles, runs every test with its settings 4 at a time, prints only failures and a final count; about 3 to 4 minutes). A test that fails beside the others is rerun alone and listed as SHAKY. `JOBS=1` runs one at a time. Results per test land in dev/tests/last_run.txt.
  - Steady check: `bash dev/tests/steady.sh` runs the suite 3 times and says if the runs differ.
  - Bot battles (balance): `FABIEN_MAP=cavern node bot.cjs 2`. It also prints OFF TILE if a figure is left standing off the middle of its tile (13.47). FABIEN_BENCH=<ids> picks who sits out, NO_ENCHANT=1 turns Enchant off.
- Browser checks (Playwright): `node dev/browser/<name>.cjs <out dir>` with the preview running.
  - Whole battles played by a test player: `node dev/browser/battle.cjs [phone|desktop|both] [how many]` lists page errors; `node dev/browser/jumps.cjs [phone|desktop]` is the jump logger (a figure moving over one tile in 80 ms, at 60 frames a second). Both end with ALL PASSED or FAILED. `node dev/browser/sizes.cjs <out dir> [phone|desktop]` photographs every fighter in a list of poses (size ruler check). `node dev/browser/gifs.cjs <out dir> [phone|desktop] [names]` films moves as GIFs at game speed (the list of moves is at the top of the file).
- Size ruler (roadmap 18.2): `~/.fabien-tools/venv/bin/python dev/tools/ruler.py measure|audit|sheets <folder>`. It writes "ruler" (scale and ground line per picture) in art.json; hand values go in dev/tools/ruler_marks.json, head boxes in ruler_heads.json. Run `measure` after adding or recutting pictures. It also writes "footX" (where the feet are across each picture, checklist B3); `audit` checks heads and feet. `python dev/tools/feet_sheet.py out.jpg src/data/art.json <id>` draws every picture on a tile to check by eye.
- Effect flipbooks (roadmap 18.3): `~/.fabien-tools/venv/bin/python dev/tools/align_fx.py audit|sheet <out.jpg>|fix [family]`. A new flipbook gets a line in dev/tools/fx_anchors.json (its anchor and the origin the code uses), then `fix <family>`; n55 fails if an anchor moves more than 3 percent.
- Deploy: commit and push to main; check `gh run list --limit 1`.

## Where things live
- src/scenes/BattleScene.js: the battle (turns, moves, skills, enemy AI in enemyAttack, animations).
- src/data: jobs.json (classes, stats, skills), spells.json (every skill's numbers and text), units.json (who fights), art.json (every picture per character: standing, battle, poses, moves, "enchanted" looks), maps/cavern.json (the game's map) and maps/yoba.json (old map for tests), terrain.json, story.json, dialogue.json.
- src/status.js (buffs, statuses), src/combat.js (damage, line of sight), src/engagement.js (clashes), src/art.js (picks pictures), src/spellArt.js (effects), src/boardArt.js (map drawing, lights), src/enemyAi.js (where enemies walk).
- dev/tools: Python cutters that turn Suleiman's sheets into game pictures (make_*.py; fxcut.cut, iso31.clean and cells are the helpers). public/art: the pictures.
- HOW-TO-EDIT-THE-STORY.md: plain guide to the data files, one section per batch.

## Gotchas
- Background removal for new cuts: try rembg first (dev/tools/bgremove.py, installed in ~/.fabien-tools/venv; roadmap 1.36). It is clearly better on smoke and effect pictures on a plain background. Keep the colour-threshold cutters where a floor tile is in the picture (rembg keeps the tile): the sand impact cut. Check any cut on a contact sheet, old next to new.
- Tests must not measure a figure's drawn height directly: figures breathe (up to 3.5 percent taller at a random moment). Measure through the sideways scale (see n37). In background shell loops, never wait with `pgrep -f`: it matches its own command line and never ends.
- Never put `//` comments inside a one-line sed edit to test files: it swallows the rest of the line. Use `/* */`.
- When adding pictures to a character, tests that count its pictures (poison.cjs, echo.cjs, gaha.cjs) need the new count.
- A unit's pictures are not all drawn at one scale any more: `unit.baseScale` is its one size, `unit.artScale` is that times the ruler's scale for the picture shown now. Tests compare with `artScale`, read while breathing rests.
- Phaser Graphics scale from their own x,y: draw shapes at (0,0) and place the Graphics, or they slide when tweened.
- Enemies face the heroes with their upLeft/downLeft pictures; the other facings are mirrored.
- Tests must never make `Math.random` return a constant (or only tiny numbers): Phaser names text pictures with random numbers, and the next text crashes with "reading 'context'".
- An enemy that has acted may walk again with its leftover steps (13.53). A test that needs it to stay put sets `b.enemySecondWalk = false`.
- With `b.setSpeed` above 1, `knockUntil` still waits in real milliseconds (the scene clock is not scaled): tests wait on `unit.knock`, and M11's fast speed must scale it.

## Suleiman's files (inbox)
- Originals go in Baiyee's "Fabien Blueprint" folder. New WhatsApp batches: export the chat with media into Fabien Blueprint/INBOX/<date>/.
- To process an inbox: unzip, read only the chat lines after the last date logged in the roadmap, rename media by send time, build one contact sheet to view pictures, transcribe voice notes locally (see Voice-note transcriber below), then log everything in the roadmap and number new requests.
- Voice-note transcriber: faster-whisper 1.2.1 in a venv (Python 3.9) at `~/.fabien-tools/venv`. Don't reinstall it: run `~/.fabien-tools/venv/bin/python` with a short script that loads `WhisperModel("small", compute_type="int8")` and calls `transcribe(file, language="en")` on each .opus file. Model files are cached in `~/.cache/huggingface/hub`. If the venv is ever gone, make a new one with `/usr/bin/python3 -m venv ~/.fabien-tools/venv` and `pip install faster-whisper==1.2.1`.
