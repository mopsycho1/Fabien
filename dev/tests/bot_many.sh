#!/usr/bin/env bash
# Many bot battles side by side (roadmap 18.15). Usage: bash dev/tests/bot_many.sh [runs=4] [battles each=3] [style]
# The picture server must be running (node serve.cjs). Prints wins, losses, median turns and the tallies.
cd "$(dirname "$0")" || exit 1
RUNS=${1:-4}; EACH=${2:-3}; STYLE=${3:-smart}
OUT=$(mktemp -d)
for i in $(seq 1 "$RUNS"); do FABIEN_MAP=${FABIEN_MAP:-cavern} node bot.cjs "$EACH" "$STYLE" > "$OUT/$i.txt" 2>&1 & done
wait
cat "$OUT"/*.txt > last_bot.txt
python3 - "$OUT" << 'PY'
import sys,glob,re,json
wins=losses=0; turns=[]; tall={}; bad=[]
for f in glob.glob(sys.argv[1]+'/*.txt'):
    for line in open(f):
        m=re.match(r'battle \d+: (\w+) after (\d+) turns',line)
        if m:
            wins+=m.group(1)=='Victory'; losses+=m.group(1)=='Defeat'; turns.append(int(m.group(2)))
        elif line.startswith('{'):
            for k,v in json.loads(line).items(): tall[k]=tall.get(k,0)+v
        elif re.match(r'STUCK|OFF TILE|NO BUTTONS|CRASH|errors: (?!none)',line): bad.append(line.strip()[:200])
turns.sort()
print('heroes won %d of %d'%(wins,wins+losses), '| turns median %s (%s to %s)'%(turns[len(turns)//2],turns[0],turns[-1]) if turns else '')
print(json.dumps(tall))
for b in bad[:8]: print('PROBLEM', b)
PY
rm -rf "$OUT"
