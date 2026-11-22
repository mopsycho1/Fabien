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
wins=losses=0; turns=[]; tall={}; bad=[]; dmg={}; rounds=[]; spent={}; first={}; fell={}; heal=[]; miss=[]
for f in glob.glob(sys.argv[1]+'/*.txt'):
    for line in open(f):
        m=re.match(r'battle \d+: (\w+) after (\d+) turns',line)
        if m:
            wins+=m.group(1)=='Victory'; losses+=m.group(1)=='Defeat'; turns.append(int(m.group(2)))
            sp=re.search(r'\| spent (\{.*?\}) \|',line)
            if sp:
                for k,v in json.loads(sp.group(1)).items(): spent[k]=spent.get(k,0)+v
            r=re.search(r'\(([\d.]+) rounds\)',line)
            if r: rounds.append(float(r.group(1)))
            f=re.search(r'\| fell (.*?) \| healed (\d+) \| misses (\d+)',line)
            if f:
                ds=[x.split('@')[0] for x in f.group(1).split()]
                if ds: first[ds[0]]=first.get(ds[0],0)+1
                for x in ds: fell[x]=fell.get(x,0)+1
                heal.append(int(f.group(2))); miss.append(int(f.group(3)))
            d=re.search(r'damage dealt (\{.*?\})',line)
            if d:
                for k,v in json.loads(d.group(1)).items(): dmg.setdefault(k,[]).append(v)
        elif line.startswith('{'):
            for k,v in json.loads(line).items(): tall[k]=tall.get(k,0)+v
        elif re.match(r'STUCK|OFF TILE|NO BUTTONS|CRASH|errors: (?!none)',line): bad.append(line.strip()[:200])
turns.sort()
print('heroes won %d of %d'%(wins,wins+losses), '| turns median %s (%s to %s)'%(turns[len(turns)//2],turns[0],turns[-1]) if turns else '')
rounds.sort()
if rounds: print('rounds median %.1f (%.1f to %.1f) | 8 to 15 rounds: %d of %d | longest battle %d turns'%(rounds[len(rounds)//2],rounds[0],rounds[-1],sum(8<=x<=15 for x in rounds),len(rounds),turns[-1] if turns else 0))
if heal: print('healing per battle %.1f | misses per battle %.1f'%(sum(heal)/len(heal),sum(miss)/len(miss)))
print('fell first:', ', '.join('%s %d'%kv for kv in sorted(first.items(),key=lambda kv:-kv[1])), '| fell at all:', ', '.join('%s %d'%kv for kv in sorted(fell.items(),key=lambda kv:-kv[1])))
if spent:
    for side in ('hero','enemy'):
        tot=sum(v for k,v in spent.items() if k.startswith(side))
        print(side+' turns spent:', ', '.join('%s %d%%'%(k.split(' ',1)[1],round(100*v/tot)) for k,v in sorted(spent.items(),key=lambda kv:-kv[1]) if k.startswith(side)))
print(json.dumps(tall))
print('average damage per battle:', ', '.join('%s %.1f'%(k,sum(v)/max(1,wins+losses)) for k,v in sorted(dmg.items())))
for b in bad[:8]: print('PROBLEM', b)
PY
rm -rf "$OUT"
