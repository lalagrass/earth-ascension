# SCENE-04 stage compositor: lock shared terrain from S2 master, take stage-specific plots from edit passes.
from PIL import Image, ImageDraw, ImageFilter
import json, sys
D = json.load(open(sys.argv[1]))  # masks.json
src = {k: Image.open(v).convert('RGB') for k, v in D['sources'].items()}
W, H = src['s2'].size
def mask(polys, feather):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for p in polys: d.polygon([tuple(q) for q in p], fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))
def build(stage):
    out = src['s2'].copy()
    for layer in D['stages'][stage]:
        out = Image.composite(src[layer['from']], out, mask(layer['polys'], layer.get('feather', 10)))
    return out
for st in D['stages']:
    build(st).save(D['out'][st], quality=92)
