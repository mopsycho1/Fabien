// Roadmaps 1.61 and 1.63: picture families whose head the ruler cannot read are checked by drawn size instead
// (dev/tools/size_check.py: Gaha's Sonic Javelin poses, the bull's flame set and Shield Toss throw).
// Needs the tools Python (~/.fabien-tools/venv). Run:  node n80.cjs
const { execFileSync } = require('child_process');
const os = require('os'), path = require('path');
const py = path.join(os.homedir(), '.fabien-tools/venv/bin/python');
let out = '', ok = true;
try { out = execFileSync(py, ['-I', path.join(__dirname, '../tools/size_check.py')], { encoding: 'utf8' }); }
catch (e) { out = (e.stdout || '') + (e.stderr || ''); ok = false; }
process.stdout.write(out.split('\n').filter((l) => /^(PASS|FAIL)/.test(l)).join('\n') + '\n');
console.log(ok ? 'ALL PASSED' : 'FAILED'); process.exit(ok ? 0 : 1);
