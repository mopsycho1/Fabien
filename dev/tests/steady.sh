#!/usr/bin/env bash
# Steady check (roadmap 18.5, checklist H1): runs the full suite 3 times and
# says whether every run gave the same result. Usage: bash dev/tests/steady.sh
# The three result lists are kept as steady_1.txt to steady_3.txt (not in git).
cd "$(dirname "$0")" || exit 1
bad=0
for i in 1 2 3; do
  echo "Run $i:"
  LOG=steady_$i.txt bash run_all.sh || bad=1
done
# compare the PASS, FAIL and SHAKY words per test, not the seconds
for i in 1 2 3; do cut -d' ' -f1,2 steady_$i.txt > steady_$i.cmp; done
if cmp -s steady_1.cmp steady_2.cmp && cmp -s steady_1.cmp steady_3.cmp; then
  echo "STEADY: all 3 runs gave the same result"
else
  echo "NOT STEADY: these differ between runs"
  diff steady_1.cmp steady_2.cmp; diff steady_1.cmp steady_3.cmp
  bad=1
fi
if grep -q "^SHAKY" steady_1.txt steady_2.txt steady_3.txt; then
  echo "SHAKY tests (failed beside others, passed alone):"
  grep -h "^SHAKY" steady_1.txt steady_2.txt steady_3.txt | sort | uniq -c
  bad=1
fi
rm -f steady_?.cmp
exit $bad
