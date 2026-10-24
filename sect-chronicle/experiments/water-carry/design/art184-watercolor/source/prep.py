# D37 執行期素材：依 layout 的最大顯示高 ×2 縮出 PNG（來源 sprites 不動），溪橋依橋面平行四邊形仿射變形並拆出前欄。
# 用法（本目錄）：python3 source/prep.py   （先跑 dump-geometry.mjs 與 uses.mjs）
import json, numpy as np
from PIL import Image
OUT = '../../demo/assets/art184-watercolor/'
uses = json.load(open('uses.json'))
uses.update({k: {'h': v, 'w': 0} for k, v in {'water_vat': 56, 'boar_walk': 46, 'boar_charge': 46, 'rat_sniff': 15, 'rat_run': 14}.items()})
PROD = '../art184-production/sprites/'
man = {}
for name, u in sorted(uses.items()):
    src = f'sprites/{name}.png'
    try: im = Image.open(src); origin = 'art184-watercolor（D37 補畫）'
    except FileNotFoundError: src = PROD + f'{name}.png'; im = Image.open(src); origin = 'art184-production（D35 沿用）'
    h = max(u['h'], u['w'] * im.height / im.width)
    th = min(im.height, int(h * 2 * 1.05)); im = im.resize((round(im.width * th / im.height), th), Image.LANCZOS)
    im.save(OUT + f'{name}.png', optimize=True)
    man[name] = {'file': f'{name}.png', 'px': list(im.size), 'src': src.replace('../', 'design/') if src.startswith('../') else 'design/art184-watercolor/' + src, 'origin': origin}
# 溪橋：圖上橋板四角 → 世界橋面四角（BRIDGE_DECK_POLY），輸出 2× 世界對齊圖；
g = json.load(open('geometry.json')); deck = g['deck']; S = 2
br = np.asarray(Image.open('sprites/bridge.png').convert('RGBA')).astype(np.float32)
c0, c1, r0, r1 = 88, 858, 45, 188  # 橋板在原圖的左右欄與上下列
(x0, y0), (x1, y1), _, (x3, y3) = deck  # 左上、右上、右下、左下
ax = (x1 - x0) / (c1 - c0); bx = (y1 - y0) / (c1 - c0); dy = (y3 - y0) / (r1 - r0)
def fwd(c, r): return x0 + (c - c0) * ax, y0 + (c - c0) * bx + (r - r0) * dy
hgt, wid = br.shape[:2]
corners = [fwd(c, r) for c, r in [(0, 0), (wid, 0), (0, hgt), (wid, hgt)]]
X0, Y0 = np.floor(min(p[0] for p in corners)), np.floor(min(p[1] for p in corners)); X1, Y1 = np.ceil(max(p[0] for p in corners)), np.ceil(max(p[1] for p in corners))
OW, OH = int((X1 - X0) * S), int((Y1 - Y0) * S)
oy, ox = np.mgrid[0:OH, 0:OW].astype(np.float32)
wx, wy = X0 + ox / S, Y0 + oy / S
c = (wx - x0) / ax + c0; r = (wy - y0 - (c - c0) * bx) / dy + r0
from scipy import ndimage as nd
warp = np.dstack([nd.map_coordinates(br[..., k], [r, c], order=1, cval=0) for k in range(4)])
# 前欄遮罩：原圖前欄兩根橫桿列＋六根柱（列 110–180），其餘（橋板、後欄、橋墩）放地面層
mask = np.zeros(br.shape[:2], np.float32)
mask[124:140, 70:885] = 1; mask[148:166, 70:885] = 1
for pc in (76, 201, 363, 531, 729, 871): mask[108:182, pc - 15:pc + 15] = 1
fm = nd.map_coordinates(mask, [r, c], order=1, cval=0)[..., None]
front = warp * np.concatenate([np.ones_like(fm)] * 3 + [fm], 2)
Image.fromarray(warp.clip(0, 255).astype(np.uint8), 'RGBA').save(OUT + 'bridge_deck.png', optimize=True)
Image.fromarray(front.clip(0, 255).astype(np.uint8), 'RGBA').save(OUT + 'bridge_front.png', optimize=True)
man['bridge_deck'] = {'file': 'bridge_deck.png', 'px': [OW, OH], 'world': [float(X0), float(Y0)], 'src': 'design/art184-watercolor/sprites/bridge.png', 'origin': 'art184-watercolor（D37 補畫，仿射對齊 BRIDGE_DECK_POLY）'}
man['bridge_front'] = dict(man['bridge_deck'], file='bridge_front.png', note='前欄（橫桿＋柱）拆層，z=1060 蓋人物腿')
Image.open('raw/tex-meadow.jpg').resize((512, 512), Image.LANCZOS).save(OUT + 'skirt.jpg', quality=80)
man['skirt'] = {'file': 'skirt.jpg', 'px': [512, 512], 'src': 'design/art184-watercolor/raw/tex-meadow.jpg', 'origin': '世界外圍淡色草地襯底（鏡頭到邊時不露空白）'}
man['ground'] = {'file': 'ground.jpg', 'px': [3200, 2700], 'world': [0, 0], 'src': 'design/art184-watercolor/source/bake.py', 'origin': '烘焙：meadow/forest/water 補畫貼圖＋D35 dirt/flagstone 地磚＋權威路線'}
json.dump(man, open(OUT + 'manifest.json', 'w'), ensure_ascii=False, indent=1)
print(len(man), OW, OH, X0, Y0)
