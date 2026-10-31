# Renders a rig next to its sheet's reference figure (scaled to the same height), to tune the assembly.
import sys, json
sys.path.insert(0, 'tools')
from rig_render import render
from PIL import Image
rig = json.load(open(sys.argv[1])); parts = sys.argv[2]; out = sys.argv[3]; k = float(sys.argv[4])
pose = json.load(open(sys.argv[5])) if len(sys.argv) > 5 else None
a = render(rig, parts, tuple(rig['canvas']), pose, overlay=True)
ref = Image.open(parts + '/ref.png').convert('RGBA')
ref = ref.resize((int(ref.width * k), int(ref.height * k)), Image.LANCZOS)
c = Image.new('RGBA', (a.width + ref.width + 20, max(a.height, ref.height)), (70, 52, 40, 255))
c.alpha_composite(a, (0, 0)); c.alpha_composite(ref, (a.width + 20, c.height - ref.height - (a.height - rig['feet']) if 'feet' in rig else 0))
c.convert('RGB').save(out, quality=86)
