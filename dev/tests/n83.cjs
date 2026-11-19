// 1.64: figures facing the wrong way. dev/tools/facing_check.py checks every four-view set in art.json: a left view
// should be its right view flipped. It fails on any pair that faces one way and is not yet in facing_known.json
// (the 45 found on 19 Nov, to fix in 1.66), and its self test proves it catches such a pair.
// Needs the tools Python (~/.fabien-tools/venv). Run:  node n83.cjs
const { execFileSync } = require('child_process');
const os = require('os'), path = require('path');
const py = path.join(os.homedir(), '.fabien-tools/venv/bin/python');
const tool = path.join(__dirname, '../tools/facing_check.py');
let fails = 0;
for (const args of [['selftest'], []]) {
  let out = '', ok = true;
  try { out = execFileSync(py, ['-I', tool, ...args], { encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); ok = false; }
  for (const l of out.split('\n')) if (/^(PASS|FAIL|WRONG|ALL|\d+ sets)/.test(l)) console.log(l);
  if (!ok) fails++;
}
console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
