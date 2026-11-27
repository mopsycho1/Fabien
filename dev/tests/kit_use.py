# Reads the bot outputs of kit_use.sh and prints, per fighter: turns, and each attack, skill and item per 10 turns,
# then the skills it owns that it never used (roadmap 13.69). Also who won each line-up (from the health left).
import sys, glob, re, json, os
jobs = json.load(open('../../src/data/jobs.json'))
units = json.load(open('../../src/data/units.json'))
job_of = {u['name']: u['job'] for u in units}
use = {}; wins = {}; bad = []
for f in sorted(glob.glob(sys.argv[1] + '/*.txt')):
    lineup = os.path.basename(f)[0]
    for line in open(f):
        m = re.match(r'battle \d+: \w+ after (\d+) turns \(([\d.]+) rounds\).*\| hp left (.*)$', line)
        if m:
            left = dict(x.split(':') for x in m.group(3).split())
            h = sum(1 for k, v in left.items() if k.startswith('H') and v != 'x')
            e = sum(1 for k, v in left.items() if k.startswith('E') and v != 'x')
            w = wins.setdefault(lineup, {'H side': 0, 'E side': 0, 'none': 0, 'turns': [], 'rounds': []}); w['rounds'].append(float(m.group(2)))
            w['H side' if h and not e else 'E side' if e and not h else 'none'] += 1
            w['turns'].append(int(m.group(1)))
        if line.startswith('skills and items used'):
            for part in line.split(': ', 1)[1].strip().split(', '):
                mm = re.match(r'(.+?): (.+) x(\d+)$', part)
                if mm: use.setdefault(mm.group(1), {}); use[mm.group(1)][mm.group(2)] = use[mm.group(1)].get(mm.group(2), 0) + int(mm.group(3))
        if re.match(r'STUCK|OFF TILE|CRASH|FROZEN|errors: (?!none)', line): bad.append(os.path.basename(f) + ' ' + line.strip()[:160])
for k, w in sorted(wins.items()):
    t = sorted(w['turns']); r = sorted(w['rounds']); print('line-up %s: H side won %d, E side won %d, unfinished %d, turns median %s, rounds median %s' % (k, w['H side'], w['E side'], w['none'], t[len(t) // 2] if t else '-', r[len(r) // 2] if r else '-'))
print()
for name in sorted(use):
    u = use[name]; turns = u.get('(turns)', 0) or 1
    acts = sorted(((k, v) for k, v in u.items() if k != '(turns)'), key=lambda kv: -kv[1])
    own = [s for s in jobs.get(job_of.get(name, ''), {}).get('spells', []) if s not in ('wardSwitch',)]
    never = [s for s in own if not any(k == s or k.startswith(s) for k in u)]
    acted = sum(v for k, v in acts)
    print('%-15s turns %3d, acted %3d%% | %s' % (name, turns, min(100, 100 * acted // turns), ', '.join('%s %.1f' % (k, 10 * v / turns) for k, v in acts)))
    if never: print('%-15s           never used: %s' % ('', ', '.join(never)))
print('\n(per 10 turns of that fighter)')
for x in bad[:20]: print('PROBLEM', x)
