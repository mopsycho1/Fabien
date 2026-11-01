# Writes a map file so it is easy to read and edit by hand: every list of
# numbers or short words on one line (a height grid reads as a grid).
import json

def dumps(v, ind=0):
    sp = '  ' * ind
    if isinstance(v, dict):
        items = [sp + '  ' + json.dumps(k) + ': ' + dumps(x, ind + 1).lstrip() for k, x in v.items()]
        return sp + '{\n' + ',\n'.join(items) + '\n' + sp + '}'
    if isinstance(v, list):
        if len(v) > 4 and all(isinstance(x, str) and 5 <= len(x) <= 16 for x in v):
            return sp + '[\n' + ',\n'.join(sp + '  ' + json.dumps(x) for x in v) + '\n' + sp + ']'  # a terrain grid: one row a line
        if all(not isinstance(x, (dict, list)) for x in v) or all(isinstance(x, list) and all(not isinstance(y, (dict, list)) for y in x) and len(x) <= 4 for x in v) and len(v) <= 12:
            return sp + json.dumps(v, ensure_ascii=False)
        if all(isinstance(x, dict) and len(json.dumps(x)) < 110 for x in v):
            return sp + '[\n' + ',\n'.join(sp + '  ' + json.dumps(x, ensure_ascii=False) for x in v) + '\n' + sp + ']'
        return sp + '[\n' + ',\n'.join(dumps(x, ind + 1) for x in v) + '\n' + sp + ']'
    return sp + json.dumps(v, ensure_ascii=False)

def write(path, data):
    open(path, 'w').write(dumps(data) + '\n')
