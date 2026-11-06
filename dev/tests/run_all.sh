#!/usr/bin/env bash
# Runs the full test suite with the right settings and prints only the
# failures and a final count. Usage (from anywhere):  bash dev/tests/run_all.sh
# It starts the picture server itself, bundles the code, then runs every test.
# n39 and n41 need the cavern map (see CLAUDE.md); everything else uses the
# plain old map. sage-l and story-smoke can fail under load: rerun them alone.

cd "$(dirname "$0")" || exit 1

node serve.cjs >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 2

if ! bash bundle.sh >/dev/null 2>&1; then
  echo "BUNDLE FAILED: run bash bundle.sh by hand to see why"
  exit 1
fi

# The tests that are not n*.cjs (the same list CLAUDE.md used to give).
EXTRA="nov6b notes27 notes27b poison echo signatures gaha three archer sage-l approach speed duel-rules duel-scene terrain engage-scene tap-behind tap-circles tap-acted story-smoke rotate"

pass=0
fail=0

# run_test <name> [VAR=value ...]: runs one test, counts it, prints failures only
run_test() {
  local name=$1
  shift
  local out
  # env -u clears the cavern settings so plain tests always get the old map
  out=$(env -u FABIEN_MAP -u FABIEN_BENCH "$@" timeout 300 node "$name.cjs" 2>&1)
  if echo "$out" | grep -q "ALL PASSED"; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    echo "FAIL $name"
    echo "$out" | grep "FAIL" | head -3
  fi
}

for f in n*.cjs; do
  name=${f%.cjs}
  case $name in
    n39) run_test n39 FABIEN_MAP=cavern FABIEN_BENCH=e1 ;;
    n41) run_test n41 FABIEN_MAP=cavern FABIEN_BENCH= ;;
    *)   run_test "$name" ;;
  esac
done
for name in $EXTRA; do
  run_test "$name"
done

echo "Passed $pass of $((pass + fail)) tests, $fail failed"
[ "$fail" -eq 0 ]
