# SCENE-03 補件去背切件：raw/*.jpg（GenerateImage 純綠底）→ sprites/*.png（真 RGBA alpha）。沿用 D37 art184-watercolor/source/cut.py 綠幕算法；來源不覆寫。
# 用法（design/scene03）：python3 source/cut.py   需 numpy、scipy、Pillow
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
NAMES = {
 'water-sheet': ['spring_cliff', 'cascade', 'intake_platform'],
 'build-sheet': ['dorm_reserved', 'shed_reserved', 'drying_rack'],
 'slope-sheet': ['rock_ledge', 'trail_marker', 'reeds', 'step_stones'],
}
man = {}
for src, names in NAMES.items():
    im = np.asarray(Image.open(f'raw/{src}.jpg').convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    gdom = g - np.maximum(r, b)
    a = 1 - np.clip((gdom - 45) / (95 - 45), 0, 1)
    a = nd.median_filter(a, 3)
    edge = (a < 0.999) | nd.binary_dilation(a < 0.5, iterations=2)
    g2 = np.where(edge & (gdom > 8), np.maximum(r, b) + 8, g)
    rgba = np.dstack([r, g2, b, a * 255]).clip(0, 255).astype(np.uint8)
    solid = a > 0.5
    lab, n = nd.label(nd.binary_dilation(solid, iterations=10))
    objs = [(sl, i) for i, sl in enumerate(nd.find_objects(lab), 1) if ((lab[sl] == i) & solid[sl]).sum() >= 1500]
    objs.sort(key=lambda o: (o[0][1].start + o[0][1].stop) / 2)
    assert len(objs) == len(names), (src, len(objs))
    for (sl, li), name in zip(objs, names):
        crop = rgba[sl].copy(); crop[..., 3] = np.where(lab[sl] == li, crop[..., 3], 0)
        ys, xs = np.nonzero(crop[..., 3] > 16)
        crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(crop, 'RGBA').save(f'sprites/{name}.png', optimize=True)
        h, w = crop.shape[:2]
        man[name] = {'file': f'sprites/{name}.png', 'src': f'raw/{src}.jpg', 'size': [w, h], 'anchor': [round(w / 2), h - 1],
                     'corner_alpha': int(max(crop[0, 0, 3], crop[0, -1, 3], crop[-1, 0, 3], crop[-1, -1, 3]))}
json.dump(man, open('sprites/manifest-cut.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: v['size'] for k, v in man.items()}))
