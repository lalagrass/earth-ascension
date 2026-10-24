# SCENE-03 地面烘焙（D37 bake.py 衍生）：geometry.json（權威路線＋296 最終接受巡山 LEAD/MAIN＋視覺佈局）＋貼圖 → 3200×2700 水彩地面（2×）。
# 用法（design/scene03）：node source/dump-geometry.mjs（於 water-carry 目錄）之後 python3 source/bake.py
# 新增：林谷山壁泉口濕痕匯流→上游溪→權威溪段→深潭→下游出圖；西坡巡山淡徑與坡面明暗；預留地村路。來源只讀：art184-watercolor/raw、art184-production/ground。
import json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd
G = json.load(open('geometry.json'))
S = G['BAKE_SCALE']; W, H = G['WORLD']['w'] * S, G['WORLD']['h'] * S
rng = np.random.default_rng(184)
OUT = '../../demo/assets/scene03/'
RAW = '../art184-watercolor/raw/'
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
def tile(tex, scale=1.0):
    t = Image.fromarray((tex * 255).astype(np.uint8)); t = t.resize((max(8, int(t.width * scale)), max(8, int(t.height * scale))), Image.LANCZOS)
    a = np.asarray(t).astype(np.float32) / 255
    m = np.concatenate([np.concatenate([a, a[:, ::-1]], 1), np.concatenate([a[::-1], a[::-1, ::-1]], 1)], 0)  # 鏡像拼，避免硬接縫
    reps = (H // m.shape[0] + 2, W // m.shape[1] + 2, 1)
    big = np.tile(m, reps); oy, ox = rng.integers(0, m.shape[0] // 2), rng.integers(0, m.shape[1] // 2)
    return big[oy:oy + H, ox:ox + W]
def noise(cell, amp=1.0):
    sm = rng.random((H // cell + 2, W // cell + 2)).astype(np.float32)
    n = np.asarray(Image.fromarray((sm * 255).astype(np.uint8)).resize((W + 2 * cell, H + 2 * cell), Image.BICUBIC)).astype(np.float32) / 255
    return (n[cell:cell + H, cell:cell + W] - 0.5) * 2 * amp
def pts(p): return [(x * S, y * S) for x, y in p]
def polym(poly):
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon(pts(poly), fill=255); return np.asarray(im).astype(np.float32) / 255
def linem(p, w):
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im); q = pts(p); r = w * S / 2
    d.line(q, fill=255, width=int(w * S), joint='curve')
    for x, y in q: d.ellipse((x - r, y - r, x + r, y + r), fill=255)
    return np.asarray(im).astype(np.float32) / 255
def ellm(x, y, rx, ry):
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).ellipse(((x - rx) * S, (y - ry) * S, (x + rx) * S, (y + ry) * S), fill=255); return np.asarray(im).astype(np.float32) / 255
def organic(m, blur=6, amp=0.35, cell=18, soft=0.18):
    s = nd.gaussian_filter(m, blur * S / 2) + noise(cell * S // 2, amp) * 0.5
    return np.clip((s - 0.5) / soft + 0.5, 0, 1)
def ink_edge(m): return np.clip(m * (1 - m) * 4, 0, 1)
def over(base, col, a): a = a[..., None]; return base * (1 - a) + col * a
def mul(base, k): return np.clip(base * k[..., None], 0, 1)
yy = (np.arange(H, dtype=np.float32)[:, None] / H) * np.ones((1, W), np.float32)

# 1 底：草坡（北暖亮、南冷深），大塊低頻起伏
meadow = tile(load(RAW + 'tex-meadow.jpg'), 0.9)
img = meadow * (1.0 + noise(220, 0.06)[..., None])
warm = np.array([1.04, 1.02, 0.92], np.float32); cool = np.array([0.86, 0.93, 0.90], np.float32)
img = np.clip(img * (warm * (1 - yy[..., None]) + cool * yy[..., None]), 0, 1)
hue = noise(160, 1.0)[..., None]
img = np.clip(img * (1 + 0.07 * hue * np.array([1.0, 0.4, -0.6], np.float32)), 0, 1)
# 2 林地鋪面、石坡
forest = load(RAW + 'tex-forest.jpg')[330:700, 330:700]
ft = tile(forest, 1.3) * np.array([0.86, 0.92, 0.84], np.float32)
for poly in G['FOREST']:
    fm = organic(polym(poly), 18, 0.5, 30, 0.35); img = mul(img, 1 - 0.18 * fm); img = over(img, ft, fm * 0.42)
rock = np.clip(tile(load('../art184-production/ground/flagstone-tile-256.png'), 1.6) * np.array([0.92, 0.92, 0.86]) + 0.06, 0, 1)
for poly in G['ROCKY']:
    rm = organic(polym(poly), 20, 0.6, 26, 0.4); img = mul(img, 1 - 0.1 * rm); img = over(img, rock * np.array([0.95, 0.93, 0.85]), rm * 0.22)
# 3 坡度明暗水洗
# SCENE-03 西坡（巡山段）坡面：上坡亮、坳底暗，泉口林谷陰面
for x, y, rx, ry, k in G['WASHES'] + [[300, 640, 260, 150, -0.07], [420, 560, 200, 80, 0.05], [360, 790, 120, 60, -0.08], [1000, 740, 110, 60, -0.14], [920, 800, 120, 60, -0.08]]:
    e = nd.gaussian_filter(ellm(x, y, rx, ry), 50 * S); img = mul(img, 1 + k * e / max(e.max(), 1e-6))
# 4 遠山（北緣）：霧中群山漸隱入院後草坡
mt = Image.open(RAW + 'far-mountains.jpg').convert('RGB').crop((0, 50, 1280, 470)).resize((W, 620), Image.LANCZOS)
mt = np.asarray(mt).astype(np.float32) / 255; band = np.zeros_like(img); band[:620] = mt
fa = np.clip(1 - (np.arange(H)[:, None] / S - 150) / 140, 0, 1) * np.ones((1, W)); fa = np.clip(fa + noise(60, 0.12) * (fa > 0.05), 0, 1)
fa[620:] = 0
img = over(img, band, fa.astype(np.float32))
# 5 院坪石板
flag = tile(load('../art184-production/ground/flagstone-tile-256.png'), 1.0)
ym = organic(polym(G['YARD_POLY']), 4, 0.25, 14, 0.15)
img = over(img, flag * np.array([1.0, 0.98, 0.93]), ym * 0.8); img = mul(img, 1 - 0.18 * ink_edge(ym))
# 6 路：土路（水路、採藥路、院門殘段）＋踩出的淡徑
dirt = tile(load('../art184-production/ground/dirt-path-tile-256.png'), 0.9)
P = G['paths']
def road(p, w, a=1.0, amp=0.35):
    global img
    m = organic(linem(p, w), 3, amp, 10, 0.2) * a
    img = over(img, dirt, m * 0.92); img = mul(img, 1 - 0.16 * ink_edge(m))
road(P['water'], 22); road(P['herb'], 18); road(G['DECOR_PATHS']['gate'], 18, 0.8)
for k in ('guard', 'funHero'): road(P[k][2:], 10, 0.45, 0.6)
for k in ('seatHero', 'seatCousin'): road(P[k][1:], 8, 0.5, 0.6)
road(P['boar'][1:], 12, 0.32, 0.7); road(P['exit'], 7, 0.3, 0.7)
# SCENE-03 西坡巡山淡徑（只讀 patrol-layout LEAD/MAIN）與預留地村路（純景觀）
road(P['patrolLead'][1:], 11, 0.5, 0.55); road(P['patrolMain'], 12, 0.62, 0.55)
road(G['DECOR_PATHS']['dorm'], 12, 0.5, 0.6); road(G['DECOR_PATHS']['shed'], 11, 0.45, 0.6)
# 防守點踏平草地、護欄根部
gx, gy = P['guard'][-1]; img = over(img, dirt, organic(ellm(gx, gy + 2, 16, 6), 2, 0.3, 6, 0.2) * 0.7)
f = G['fence']; img = over(img, dirt, organic(linem([[f['x1'], f['y1']], [f['x2'], f['y2']]], 10), 3, 0.5, 8, 0.25) * 0.4)
# 7 水：溪（權威段＋上下游視覺延伸）、深潭、舊泉池
water = tile(load(RAW + 'tex-water.jpg'), 0.6)
# SCENE-03 泉口：林谷苔濕地（濕痕匯水），先壓暗染苔綠再畫水
sm_ = G['SPRING_MOUTH']; wet = organic(ellm(sm_['x'] - 14, sm_['y'] + 6, 46, 22), 10, 0.5, 14, 0.3)
img = mul(img, 1 - 0.26 * wet); img = over(img, ft * np.array([0.8, 0.95, 0.82], np.float32), wet * 0.45)
wm = np.maximum.reduce([polym(G['stream']), polym(G['STREAM_UP']), polym(G['STREAM_DOWN']), polym(G['STREAM_OUT'])])
po = G['POOL']; pm = ellm(po['x'], po['y'], po['rx'], po['ry']); op = G['OLD_POND']; om = ellm(op['x'], op['y'], op['rx'], op['ry'])
allw = organic(np.maximum.reduce([wm, pm, om]), 3, 0.25, 10, 0.18)
bank = np.clip(nd.gaussian_filter(allw, 8 * S) * 1.6, 0, 1) * (1 - allw)
img = mul(img, 1 - 0.28 * bank)  # 濕岸
deep = nd.gaussian_filter(allw, 10 * S)
wcol = water * np.array([0.62, 0.80, 0.84], np.float32) * (0.62 + 0.30 * (1 - deep))[..., None]
img = over(img, wcol, allw); img = mul(img, 1 - 0.35 * ink_edge(allw))
hl = np.clip(nd.gaussian_filter(allw, 2 * S) - nd.gaussian_filter(allw, 5 * S), 0, 1) * 3
img = over(img, np.ones_like(img) * np.array([0.92, 0.96, 0.95]), np.clip(hl, 0, 0.35) * allw)
# 8 石階、泉台、坡口踏石（烘進地面，人物踩在上面）
st = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(st)
def slab(x, y, w, h, ang=0):
    c = [(x - w / 2, y - h / 2), (x + w / 2, y - h / 2), (x + w / 2, y + h / 2), (x - w / 2, y + h / 2)]
    ca, sa = np.cos(ang), np.sin(ang); q = [((x + (px - x) * ca - (py - y) * sa) * S, (y + (px - x) * sa + (py - y) * ca) * S) for px, py in c]
    d.polygon([(a, b + 3) for a, b in q], fill=(58, 54, 46, 200)); d.polygon(q, fill=(150, 144, 128, 255))
wp = P['water']
for i in range(1, 4):
    x, y = wp[i]; slab(x, y, 26, 9, 0.2)
(x1, y1), (x2, y2) = wp[12], wp[14]
ang = np.arctan2(y2 - y1, x2 - x1) + np.pi / 2
for k in range(12):
    u = k / 11; slab(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 28, 7, ang - np.pi / 2 + 0.0 if False else 0.42)
sp = G['spring']; slab(sp['x'] + 10, sp['y'] + 4, 40, 18, 0.05); slab(sp['x'] + 34, sp['y'] - 6, 18, 12, 0.3)
st = st.filter(ImageFilter.GaussianBlur(1.2)); sa_ = np.asarray(st).astype(np.float32) / 255
stex = np.clip(rock * sa_[..., :3] / 0.58, 0, 1)
img = over(img, stex, sa_[..., 3])
# 9 世界邊緣羽化：左右下三邊淡入「紙色＋淡草」（與執行期 skirt 襯底同色），鏡頭貼邊時沒有硬邊
paper = np.array([0xcf, 0xc8, 0xad], np.float32) / 255
xx = np.arange(W, dtype=np.float32)[None, :] / S * np.ones((H, 1), np.float32); yw = yy * G['WORLD']['h']
dist = np.minimum.reduce([xx, G['WORLD']['w'] - xx, G['WORLD']['h'] - yw]) + noise(30, 8)
img = over(img, meadow * 0.45 + paper * 0.55, np.clip(1 - dist / 46, 0, 1) * 0.9)
# 10 紙紋
img = mul(img, 1 + noise(3, 0.025) + noise(40, 0.03))
out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
out.save(OUT + 'ground.jpg', quality=86, optimize=True)
out.resize((W // 4, H // 4), Image.LANCZOS).save('out/ground-preview.jpg', quality=85)  # design/scene03/out
print('ground', out.size)
