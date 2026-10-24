# SCENE-03 執行期素材與唯一 manifest（demo/assets/scene03/manifest.json）。
# 用法（design/scene03）：python3 source/prep.py   （先跑 dump-geometry.mjs、uses.mjs、cut.py、bake.py）
# - 本包新件（sprites/ 由 raw/ 綠幕切出）依 layout 最大顯示高 ×2 縮圖寫入 demo/assets/scene03/。
# - D35／D37 既有執行期 PNG 不複製、不改：manifest 以相對路徑 ../art184-watercolor/ 直接沿用（溪橋仿射、角色外動物、水缸等）。
import json
from PIL import Image
OUT = '../../demo/assets/scene03/'
OLD = json.load(open('../../demo/assets/art184-watercolor/manifest.json'))
uses = json.load(open('uses.json'))
man = {}
for name, m in OLD.items():
    if name == 'ground': continue
    man[name] = dict(m, file='../art184-watercolor/' + m['file'], origin=m['origin'] + '；SCENE-03 原檔沿用')
for name, u in sorted(uses.items()):
    try: im = Image.open(f'sprites/{name}.png')
    except FileNotFoundError:
        assert name in man, f'{name} 沒有來源'
        continue
    h = max(u['h'], u['w'] * im.height / im.width)
    th = min(im.height, int(h * 2 * 1.05)); im = im.resize((round(im.width * th / im.height), th), Image.LANCZOS)
    im.save(OUT + f'{name}.png', optimize=True)
    raw = json.load(open('sprites/manifest-cut.json'))[name]['src']
    man[name] = {'file': f'{name}.png', 'px': list(im.size), 'src': f'design/scene03/sprites/{name}.png', 'raw': 'design/scene03/' + raw, 'origin': 'SCENE-03 補畫（GenerateImage 綠底→cut.py 去背）'}
missing = [k for k in uses if k not in man]
assert not missing, missing
man['ground'] = {'file': 'ground.jpg', 'px': [3200, 2700], 'world': [0, 0], 'src': 'design/scene03/source/bake.py', 'origin': 'SCENE-03 烘焙：D37 meadow/forest/water 補畫貼圖＋D35 dirt/flagstone＋權威路線／296 巡山淡徑＋泉口→溪→潭→出圖水系'}
json.dump(man, open(OUT + 'manifest.json', 'w'), ensure_ascii=False, indent=1)
print(len(man), 'new:', sorted(k for k, v in man.items() if not v['file'].startswith('../')))
