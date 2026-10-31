# Developer tools (not part of the game)

- `tests/`: the automatic checks. Each `*.cjs` file plays parts of a battle in a fake browser and prints PASS or FAIL.
  - Setup once: `cd dev/tests && npm install`.
  - Before a run: `bash dev/tests/bundle.sh`, and serve the pictures with `cd public && python3 -m http.server 8800`.
  - Run one: `node dev/tests/n35.cjs`.
  - The test files are named after roadmap batches (`n35` = Phase 8, and so on).
- `tools/`: Python scripts that cut Suleiman's sheets into game pictures (`fxcut.py`, `make_status_art.py`, `make_verse_art.py`, `cut_clash.py`, and others). Each says what it cuts at the top.
- `browser/`: real-browser checks with Playwright on phone and laptop screen shapes (`phone.cjs`, `shapes.cjs`). They need `npx vite preview --port 4173` running.
