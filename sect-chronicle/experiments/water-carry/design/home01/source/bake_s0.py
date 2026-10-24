# HOME-01（#309）S0 全場水彩地面重繪（I3 方案 A）：只讀 runtime-geo.json（dump-geo.mjs 從權威模組倒出），
# 在 1600×1350 世界上以 2× 烘焙 3200×2700。路、水、院坪、林地都依真座標畫；不拉伸概念圖、不沿用舊地面加濾鏡。
# 決定性（固定種子）；Pillow＋NumPy 只用於素材製作。
import json, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
G = json.load(open(sys.argv[1])); OUT = sys.argv[2]
S = 2; W, H = G['world']['w'] * S, G['world']['h'] * S
rng = np.random.default_rng(309)

def noise(scale, octaves=4, seed=0):
    r = np.random.default_rng(1000 + seed); acc = np.zeros((H, W), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        cw, ch = max(2, int(W / scale * 2 ** o)), max(2, int(H / scale * 2 ** o))
        a = (r.random((ch, cw)) * 255).astype(np.uint8)
        acc += amp * np.asarray(Image.fromarray(a).resize((W, H), Image.BICUBIC), np.float32) / 255
        tot += amp; amp *= 0.5
    return acc / tot

def mask_poly(polys, blur=0, closed=True, width=0):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for p in polys:
        q = [(x * S, y * S) for x, y in p]
        if closed: d.polygon(q, fill=255)
        else:
            d.line(q, fill=255, width=int(width * S), joint='curve')
            r = width * S / 2
            for x, y in q: d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    if blur: m = m.filter(ImageFilter.GaussianBlur(blur * S))
    return np.asarray(m, np.float32) / 255

def ellipse_mask(e, blur=0):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    d.ellipse([(e['x'] - e['rx']) * S, (e['y'] - e['ry']) * S, (e['x'] + e['rx']) * S, (e['y'] + e['ry']) * S], fill=255)
    if blur: m = m.filter(ImageFilter.GaussianBlur(blur * S))
    return np.asarray(m, np.float32) / 255

def col(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
def lay(img, m, c, a=1.0):
    m = (m * a)[..., None]
    return img * (1 - m) + c * m

n1, n2, n3 = noise(260, 5, 1), noise(60, 4, 2), noise(14, 3, 3)
# 草地：暖黃綠三色依雜訊混合（S0 樣張的溫暖草坡）
g1, g2, g3, sand = col('#adb071'), col('#8d9a5a'), col('#c9c085'), col('#dcc48c')
t = np.clip((n1 - 0.35) * 2.2, 0, 1)[..., None]
img = g2 * (1 - t) + g1 * t
img = lay(img, np.clip((n2 - 0.6) * 3, 0, 1), g3, 0.55)
img *= (0.92 + 0.16 * n3)[..., None]

# 草叢筆觸：短斜筆、深淺兩色（水彩乾筆）
st = Image.new('L', (W, H), 0); st2 = Image.new('L', (W, H), 0); d1 = ImageDraw.Draw(st); d2 = ImageDraw.Draw(st2)
for i in range(60000):
    x, y = rng.uniform(0, W), rng.uniform(0, H); l = rng.uniform(5, 13); a = -math.pi / 2 + rng.uniform(-.5, .5)
    (d1 if i % 3 else d2).line([(x, y), (x + l * math.cos(a), y + l * math.sin(a))], fill=int(rng.uniform(90, 200)), width=2)
img = lay(img, np.asarray(st, np.float32) / 255, col('#6c7f40'), 0.45)
img = lay(img, np.asarray(st2, np.float32) / 255, col('#d6cf96'), 0.4)
# 山霧遠景（世界北緣，非可走區）
yy = np.arange(H, dtype=np.float32)[:, None] / S
for k, (base, amp, c, a) in enumerate([(120, 40, '#a9b7bf', 0.55), (160, 46, '#8fa3a6', 0.6), (205, 30, '#7d9478', 0.55)]):
    xs = np.arange(W) / S
    ridge = base + amp * np.sin(xs / (140 + 40 * k) + k) * 0.6 + amp * 0.4 * np.sin(xs / 53 + 2 * k)
    m = np.clip((yy - ridge[None, :]) / 6 + 1, 0, 1) * np.clip((ridge[None, :] + 60 - yy) / 60, 0, 1)
    img = lay(img, m * (0.6 + 0.4 * n2), col(c), a)
fog = np.clip((250 - yy) / 140, 0, 1) * (0.55 + 0.45 * n1)
img = lay(img, np.broadcast_to(fog, (H, W)), col('#efe9da'), 0.85)

# 林地與石坡
fm = mask_poly(G['forest'], blur=6)
img = lay(img, fm, col('#6d7f46'), 0.75)
# 林下：一團團樹冠陰影（圓斑疊色），只在林地內
can = Image.new('L', (W, H), 0); hi = Image.new('L', (W, H), 0); dc = ImageDraw.Draw(can); dh = ImageDraw.Draw(hi)
fy, fx = np.nonzero(fm[::8, ::8] > 0.5)
for i in rng.choice(len(fx), size=min(len(fx), 2600), replace=False):
    x, y, r = fx[i] * 8, fy[i] * 8, rng.uniform(14, 30)
    dc.ellipse([x - r, y - r * .8, x + r, y + r * .8], fill=int(rng.uniform(120, 230)))
    dh.ellipse([x - r * .7, y - r * .9, x + r * .3, y - r * .1], fill=int(rng.uniform(90, 180)))
can = np.asarray(can.filter(ImageFilter.GaussianBlur(2)), np.float32) / 255 * fm
img = lay(img, can, col('#4c6331'), 0.7)
img = lay(img, np.asarray(hi.filter(ImageFilter.GaussianBlur(2)), np.float32) / 255 * fm, col('#9aa765'), 0.45)
rm = mask_poly(G['rocky'], blur=10)
img = lay(img, rm * (0.6 + 0.4 * n3), col('#a39a86'), 0.85)
img = lay(img, rm * np.clip((n3 - 0.7) * 5, 0, 1), col('#6f675a'), 0.6)
# 泉口崖坡：崖頂苔、崖面暖灰
rim = G['bank']['rim']; drop = G['bank']['drop']
cliff = [*rim, *[(x, y + d) for (x, y), d in zip(rim[::-1], drop[::-1])]]
img = lay(img, mask_poly([cliff], blur=3) * (0.7 + 0.3 * n3), col('#8c8372'), 0.9)

# 院坪：破道館前夯土院，殘留碎石板（破損、缺塊）
ym = mask_poly([G['yard']], blur=4)
img = lay(img, ym * (0.8 + 0.2 * n2), col('#cdb07a'), 0.95)
img = lay(img, ym * np.clip((n2 - 0.55) * 3, 0, 1), col('#a99a6c'), 0.4)  # 夯土上冒草
slab = Image.new('L', (W, H), 0); sd = ImageDraw.Draw(slab)
yp = G['yard']; xs_ = [p[0] for p in yp]; ys_ = [p[1] for p in yp]
for i in range(900):
    x = rng.uniform(min(xs_), max(xs_)); y = rng.uniform(min(ys_), max(ys_))
    if rng.random() < 0.45: continue  # 缺塊
    s_ = rng.uniform(7, 13); a = rng.uniform(0, math.pi)
    pts = [((x + s_ * math.cos(a + j * math.pi / 2 + rng.uniform(-.25, .25)) * (1.0 if j % 2 else 0.7)) * S,
            (y + s_ * 0.55 * math.sin(a + j * math.pi / 2 + rng.uniform(-.25, .25))) * S) for j in range(4)]
    sd.polygon(pts, fill=int(rng.uniform(150, 255)))
sm = np.asarray(slab, np.float32) / 255 * mask_poly([G['yard']], blur=1)
img = lay(img, sm, col('#b7ad97'), 0.75)

# 土路：沿真路線（工作／休閒／防守／茶座／招呼／練功／巡山／清理通道／院門小路），主路寬、支路窄
main = ['water', 'herb', 'lead', 'main', 'guard']
for name, pts in G['paths'].items():
    minor = name not in main and name not in ('gate', 'shed', 'dorm')
    w = 20 if name in main else 13 if not minor else 8
    edge = mask_poly([pts], blur=2.5, closed=False, width=w + 5) * (0.55 + 0.45 * n2)
    core = mask_poly([pts], blur=2.0, closed=False, width=w)
    core = np.clip(core * (0.75 + 0.5 * n3), 0, 1)  # 邊緣不齊
    if minor: img = lay(img, core, col('#cdb581'), 0.5); continue  # 院內短支徑＝淡踩痕
    img = lay(img, edge, col('#a88a55'), 0.5)
    img = lay(img, core, sand, 0.92)
    img = lay(img, core * np.clip((n3 - 0.72) * 5, 0, 1), col('#e9d6a4'), 0.5)
# 獸路：野豬從林緣出來的淡踩痕（純景觀）
img = lay(img, mask_poly([G['boarPath']], blur=3, closed=False, width=9) * 0.5, col('#9c8d5a'), 0.6)

# 水：泉口上游、權威溪段、下游、深潭、舊泉池；石砌岸
water = np.maximum.reduce([mask_poly([G['streamUp'], G['stream'], G['streamDown'], G['streamOut']], blur=1.5), ellipse_mask(G['pool'], 1.5), ellipse_mask(G['oldPond'], 1.5)])
wb = Image.fromarray((water * 255).astype(np.uint8))
bank = np.asarray(wb.filter(ImageFilter.MaxFilter(13)), np.float32) / 255 - water
bank = np.clip(bank, 0, 1)
img = lay(img, bank * (0.7 + 0.3 * n3), col('#8e8878'), 0.95)
peb = Image.new('L', (W, H), 0); pd = ImageDraw.Draw(peb)
by, bx = np.nonzero(bank > 0.5)
for i in rng.choice(len(bx), size=min(len(bx), 9000), replace=False):
    r = rng.uniform(2, 5); x, y = bx[i], by[i]
    pd.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=int(rng.uniform(120, 255)))
img = lay(img, np.asarray(peb, np.float32) / 255, col('#c4bba6'), 0.7)
deep = np.asarray(wb.filter(ImageFilter.GaussianBlur(10 * S)), np.float32) / 255
wc = col('#8cc0c4') * (1 - deep[..., None]) + col('#4f8797') * deep[..., None]
img = img * (1 - water[..., None]) + (wc * (0.93 + 0.1 * n3[..., None])) * water[..., None]
img = lay(img, water * np.clip((n2 - 0.7) * 5, 0, 1), col('#dff0ec'), 0.45)
# 坡度明暗
for x, y, rx, ry, k in G['washes']:
    m = ellipse_mask({'x': x, 'y': y, 'rx': rx, 'ry': ry}, blur=60)
    img = lay(img, m, col('#fff6dc') if k > 0 else col('#2f3a22'), abs(k) * 1.6)

# 水彩質感：顏料邊緣沉積＋紙紋＋邊緣羽化
gray = img.mean(axis=2)
ed = np.abs(np.asarray(Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES), np.float32)) / 255
img *= (1 - 0.18 * np.clip(ed * 3, 0, 1))[..., None]
paper = noise(5, 2, 9)
img *= (0.95 + 0.08 * paper)[..., None]
yy2, xx2 = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.minimum.reduce([xx2, W - xx2, yy2, H - yy2]) / S
img = lay(img, np.clip(1 - d / 40, 0, 1) * (0.6 + 0.4 * n2), col('#ece4cf'), 0.9)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT, quality=90)
print('ok', OUT, W, H)
