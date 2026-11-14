#!/usr/bin/env bash
# Runs the full test suite with the right settings and prints only the
# failures and a final count. Usage (from anywhere):  bash dev/tests/run_all.sh
# It starts the picture server itself, bundles the code, then runs every test.
#
# Several tests run side by side (roadmap 18.5). Settings, all optional:
#   JOBS=4            how many tests run at once (JOBS=1 = one after another)
#   LOG=last_run.txt  where the per-test results go: one "PASS name seconds"
#                     or "FAIL name seconds" line per test, sorted by name
# A test that fails is run once more on its own at the end. If it passes then,
# it is counted as passed but listed as SHAKY so it does not hide.
# To check the suite is steady, run it 3 times: bash dev/tests/steady.sh

cd "$(dirname "$0")" || exit 1
JOBS=${JOBS:-4}
LOG=${LOG:-last_run.txt}
START=$(date +%s)

node serve.cjs >/dev/null 2>&1 &
SERVER=$!
disown $SERVER # no "Terminated" line when it is stopped at the end
RESULTS=$(mktemp -d)
trap 'kill $SERVER 2>/dev/null; rm -rf "$RESULTS"' EXIT
sleep 2

if ! bash bundle.sh >/dev/null 2>&1; then
  echo "BUNDLE FAILED: run bash bundle.sh by hand to see why"
  exit 1
fi

# The tests that are not n*.cjs (the same list CLAUDE.md used to give).
EXTRA="ruler nov6b notes27 notes27b poison echo signatures gaha three archer sage-l approach speed duel-rules duel-scene terrain engage-scene tap-behind tap-circles tap-acted story-smoke rotate"

# settings_for <name>: the map and bench settings a test needs (most need none).
# n39 and n41 to n45 need the cavern map (see CLAUDE.md).
settings_for() {
  case $1 in
    n39) echo "FABIEN_MAP=cavern FABIEN_BENCH=e1" ;;
    n41|n42|n43|n44|n45|n53|n54|n56|n58|n59|n64) echo "FABIEN_MAP=cavern FABIEN_BENCH=" ;;
    n50|n51) echo "FABIEN_BENCH=" ;;
    n62) echo "FABIEN_MAP=cavern" ;; # the map's own line-up: 4 against 4
  esac
}

# run_test <name>: runs one test and writes "PASS|FAIL name seconds" to
# $RESULTS/<name>, with its FAIL lines in $RESULTS/<name>.why
run_test() {
  local name=$1 t0 out word
  t0=$(date +%s)
  # env -u clears the cavern settings so plain tests always get the old map
  # shellcheck disable=SC2046
  out=$(env -u FABIEN_MAP -u FABIEN_BENCH $(settings_for "$name") timeout 300 node "$name.cjs" 2>&1)
  if echo "$out" | grep -q "ALL PASSED"; then word=PASS; else word=FAIL; fi
  echo "$word $name $(($(date +%s) - t0))" > "$RESULTS/$name"
  echo "$out" | grep "FAIL" | head -3 > "$RESULTS/$name.why"
}
export -f run_test settings_for
export RESULTS

# sort -u: nov6b, notes27 and notes27b match n*.cjs too, and used to run twice
NAMES=$( (for f in n*.cjs; do echo "${f%.cjs}"; done; for n in $EXTRA; do echo "$n"; done) | sort -u)
echo "$NAMES" | xargs -P "$JOBS" -I{} bash -c 'run_test {}'

# Second chance, alone, for anything that failed (tells shaky from broken)
shaky=""
for name in $NAMES; do
  if grep -q "^FAIL" "$RESULTS/$name"; then
    cp "$RESULTS/$name.why" "$RESULTS/$name.why1"
    run_test "$name"
    if grep -q "^PASS" "$RESULTS/$name"; then
      shaky="$shaky $name"
      echo "SHAKY $name (failed beside other tests, passed alone)"
      head -3 "$RESULTS/$name.why1"
    fi
  fi
done

pass=0
fail=0
: > "$LOG"
for name in $(echo "$NAMES" | sort); do
  cat "$RESULTS/$name" >> "$LOG"
  if grep -q "^PASS" "$RESULTS/$name"; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    echo "FAIL $name"
    cat "$RESULTS/$name.why"
  fi
done
for name in $shaky; do echo "SHAKY $name" >> "$LOG"; done

echo "Passed $pass of $((pass + fail)) tests, $fail failed, in $(($(date +%s) - START)) seconds"
[ "$fail" -eq 0 ]
