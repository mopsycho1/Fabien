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
- Tests (jsdom, in dev/tests): `cd dev/tests && npm install` once. Each run: start the picture server in another terminal, `cd public && python3 -m http.server 8800`, then `bash bundle.sh` after any code change, then `node <test>.cjs`.
  - Most tests use the old 8x8 map (yoba). Cavern tests: `FABIEN_MAP=cavern FABIEN_BENCH= node n41.cjs`, `FABIEN_MAP=cavern FABIEN_BENCH=e1 node n39.cjs`.
  - Full suite: loop over every `n*.cjs` plus notes27, notes27b, poison, echo, signatures, gaha, three, archer, sage-l, approach, speed, duel-rules, duel-scene, terrain, engage-scene, tap-behind, tap-circles, tap-acted, story-smoke, rotate. sage-l and story-smoke can fail under load: rerun alone.
  - Bot battles (balance): `FABIEN_MAP=cavern node bot.cjs 2`. FABIEN_BENCH=<ids> picks who sits out, NO_ENCHANT=1 turns Enchant off.
- Browser checks (Playwright): `node dev/browser/<name>.cjs <out dir>` with the preview running.
- Deploy: commit and push to main; check `gh run list --limit 1`.

## Where things live
- src/scenes/BattleScene.js: the battle (turns, moves, skills, enemy AI in enemyAttack, animations).
- src/data: jobs.json (classes, stats, skills), spells.json (every skill's numbers and text), units.json (who fights), art.json (every picture per character: standing, battle, poses, moves, "enchanted" looks), maps/cavern.json (the game's map) and maps/yoba.json (old map for tests), terrain.json, story.json, dialogue.json.
- src/status.js (buffs, statuses), src/combat.js (damage, line of sight), src/engagement.js (clashes), src/art.js (picks pictures), src/spellArt.js (effects), src/boardArt.js (map drawing, lights), src/enemyAi.js (where enemies walk).
- dev/tools: Python cutters that turn Suleiman's sheets into game pictures (make_*.py; fxcut.cut, iso31.clean and cells are the helpers). public/art: the pictures.
- HOW-TO-EDIT-THE-STORY.md: plain guide to the data files, one section per batch.

## Gotchas
- Never put `//` comments inside a one-line sed edit to test files: it swallows the rest of the line. Use `/* */`.
- When adding pictures to a character, tests that count its pictures (poison.cjs, echo.cjs, gaha.cjs) need the new count.
- Phaser Graphics scale from their own x,y: draw shapes at (0,0) and place the Graphics, or they slide when tweened.
- Enemies face the heroes with their upLeft/downLeft pictures; the other facings are mirrored.

## Suleiman's files (inbox)
- Originals go in Baiyee's "Fabien Blueprint" folder. New WhatsApp batches: export the chat with media into Fabien Blueprint/INBOX/<date>/.
- To process an inbox: unzip, read only the chat lines after the last date logged in the roadmap, rename media by send time, build one contact sheet to view pictures, transcribe voice notes locally if a transcriber is installed (whisper), then log everything in the roadmap and number new requests.
