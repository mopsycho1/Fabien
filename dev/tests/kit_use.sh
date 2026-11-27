#!/usr/bin/env bash
# Kit use per fighter (roadmap 13.69): the game's AI plays BOTH sides (AI_BOTH=1), so every fighter's choices are the AI's.
# Three line-ups side by side, each RUNS times with EACH battles:
#   A  the 8 of the cavern (Sudeen, Gaha, Layra, Kofi v Rabdul, Tayo, the Bull, the Archer)
#   B  the same 8 with the sides swapped (to see the map's side does not decide it)
#   C  kings and new classes (Sudeen, Layra, Alagara, Leol v the Bull, the Archer, Gadara, the Thief)
# Usage: bash dev/tests/kit_use.sh [runs=2] [battles each=3] [out file]. The picture server must be running.
cd "$(dirname "$0")" || exit 1
RUNS=${1:-2}; EACH=${2:-3}; OUTF=${3:-last_kit_use.txt}
OUT=$(mktemp -d)
SWAP='{"h1":"enemy","h2":"enemy","h3":"enemy","h4":"enemy","e1":"hero","e2":"hero","e3":"hero","e4":"hero"}'
for i in $(seq 1 "$RUNS"); do
  FABIEN_MAP=cavern FABIEN_BENCH= AI_BOTH=1 node bot.cjs "$EACH" > "$OUT/A$i.txt" 2>&1 &
  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_SIDES="$SWAP" AI_BOTH=1 node bot.cjs "$EACH" > "$OUT/B$i.txt" 2>&1 &
  FABIEN_MAP=cavern FABIEN_KINGS=1 FABIEN_NEW=1 FABIEN_BENCH=h2,h4,e1,e4 AI_BOTH=1 node bot.cjs "$EACH" > "$OUT/C$i.txt" 2>&1 &
done
wait
rm -rf "${OUTF%.txt}_raw"; cp -r "$OUT" "${OUTF%.txt}_raw"   # the raw bot outputs, kept beside the summary
python3 kit_use.py "$OUT" | tee "$OUTF"
