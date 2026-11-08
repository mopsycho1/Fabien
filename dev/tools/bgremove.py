# Background removal with rembg (roadmap 1.35 tooling), as an option for the cutters.
# The old way is a colour threshold (each cutter's own rule: a plane fitted to the floor tile,
# the white page, a flood fill). This one asks the rembg model (u2net by default, installed in
# ~/.fabien-tools/venv) which pixels are the subject, and returns an RGBA picture.
#
# Use from a cutter:   from bgremove import rembg_rgba
#                      rgba = rembg_rgba(pil_image)          # PIL RGB or RGBA in, PIL RGBA out
# Or from the command line on one picture (for a quick look):
#   ~/.fabien-tools/venv/bin/python dev/tools/bgremove.py <in.png> <out.png> [model]
# The model is downloaded once to ~/.u2net on first use.
import sys
from PIL import Image

_session = {}

def _get(model):
    # one session per model, made the first time it is asked for
    if model not in _session:
        from rembg import new_session
        _session[model] = new_session(model)
    return _session[model]

def rembg_rgba(im, model='u2net'):
    """The picture with its background made transparent by rembg (RGBA in, RGBA out)."""
    from rembg import remove
    src = im.convert('RGBA')
    return remove(src, session=_get(model)).convert('RGBA')

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else 'u2net'
    rembg_rgba(Image.open(src), model).save(out)
    print('wrote', out, 'model', model)
