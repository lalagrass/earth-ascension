# HOME-02（#330／D49）：林緣枯木、柴捆、院倉柴堆、寢舍三階段（破損／施工中／可用）、床位與被褥。
# 決定性水彩感手繪（Pillow＋NumPy：濕邊、紙紋、暈染），只用於素材製作。用法：python3 home02_sprites.py <out_dir>
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(330)
S = 3  # 先放大畫再縮，邊緣柔

def canvas(w, h): return Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
def wash(im, alpha_jitter=0.18, edge=1.6):
    """水彩：顏料不均（低頻噪聲調亮度）、濕邊（alpha 邊緣加深）、紙紋。"""
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    n = rng.random((h // 24 + 2, w // 24 + 2)).astype(np.float32)
    n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float32) / 255
    paper = rng.random((h, w)).astype(np.float32)
    k = 1 + (n - 0.5) * 0.22 + (paper - 0.5) * 0.06
    a[..., :3] = np.clip(a[..., :3] * k[..., None], 0, 255)
    al = a[..., 3]
    blur = np.asarray(Image.fromarray(al.astype(np.uint8)).filter(ImageFilter.GaussianBlur(S * 1.5))).astype(np.float32)
    rim = np.clip((al - blur) / 255, 0, 1)  # 邊緣
    a[..., :3] = np.clip(a[..., :3] * (1 - rim[..., None] * 0.35 * edge), 0, 255)
    a[..., 3] = np.clip(al * (1 - alpha_jitter * (n - 0.5)), 0, 255)
    return Image.fromarray(a.astype(np.uint8))
def fin(im, name, w, h, meta):
    im = wash(im).filter(ImageFilter.SMOOTH)
    im = im.resize((w, h), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.png')); meta[name] = {'file': name + '.png', 'px': [w, h]}
def P(pts): return [(x * S, y * S) for x, y in pts]
def E(d, box, **k): d.ellipse([v * S for v in box], **k)
def L(d, pts, c, w): d.line(P(pts), fill=c, width=int(w * S), joint='curve')
meta = {}
BARK, BARK_D, BARK_L, WOODC = (112, 86, 60, 255), (78, 58, 40, 255), (150, 120, 86, 255), (214, 178, 128, 255)

# 1) 林緣枯木（倒木＋殘樁）：砍柴點
im = canvas(150, 80); d = ImageDraw.Draw(im)
E(d, [6, 58, 146, 78], fill=(50, 44, 30, 60))
d.polygon(P([(14, 50), (120, 34), (126, 48), (20, 66)]), fill=BARK)
L(d, [(20, 52), (118, 38)], BARK_L, 2); L(d, [(24, 60), (122, 46)], BARK_D, 2)
E(d, [114, 32, 134, 52], fill=WOODC); E(d, [118, 36, 130, 48], outline=BARK_D, width=S)
L(d, [(60, 44), (52, 22), (44, 14)], BARK_D, 4); L(d, [(86, 40), (96, 20)], BARK_D, 3)
d.polygon(P([(6, 66), (10, 36), (26, 34), (28, 66)]), fill=BARK_D); E(d, [8, 30, 28, 40], fill=WOODC)
fin(im, 'dead_log', 150, 80, meta)

# 2) 柴捆（扛在肩上）
im = canvas(56, 28); d = ImageDraw.Draw(im)
for i, y in enumerate([8, 13, 18]):
    d.rounded_rectangle([4 * S, y * S, 50 * S, (y + 7) * S], radius=3 * S, fill=BARK if i % 2 else BARK_L)
    E(d, [44, y, 52, y + 7], fill=WOODC)
L(d, [(18, 6), (18, 26)], (170, 140, 80, 255), 2); L(d, [(36, 6), (36, 26)], (170, 140, 80, 255), 2)
fin(im, 'wood_bundle', 56, 28, meta)

# 3) 院倉柴堆（0／一點／半／滿）：只是外觀分級，數字看面板
for lvl, n in [('woodpile_0', 0), ('woodpile_1', 3), ('woodpile_2', 7), ('woodpile_3', 12)]:
    im = canvas(90, 64); d = ImageDraw.Draw(im)
    E(d, [4, 48, 86, 62], fill=(50, 44, 30, 60))
    d.rectangle([8 * S, 46 * S, 82 * S, 54 * S], fill=(120, 110, 96, 255))  # 石墊
    L(d, [(10, 50), (10, 14)], BARK_D, 3); L(d, [(80, 50), (80, 14)], BARK_D, 3)  # 架柱
    k = 0
    for row in range(4):
        for col in range(3):
            if k >= n: break
            x, y = 14 + col * 22 + (row % 2) * 6, 38 - row * 9
            d.rounded_rectangle([x * S, y * S, (x + 18) * S, (y + 8) * S], radius=3 * S, fill=BARK if (row + col) % 2 else BARK_L)
            E(d, [x + 13, y, x + 19, y + 8], fill=WOODC); k += 1
    fin(im, lvl, 90, 64, meta)

# 4) 寢舍三階段
def hut(stage):
    W, H = 220, 170
    im = canvas(W, H); d = ImageDraw.Draw(im)
    E(d, [10, 146, 210, 168], fill=(50, 44, 30, 70))
    d.rectangle([20 * S, 140 * S, 200 * S, 154 * S], fill=(136, 126, 110, 255))  # 石基
    wall = (196, 176, 140, 255) if stage == 'done' else (170, 150, 118, 255)
    if stage == 'broken':
        d.polygon(P([(30, 140), (30, 84), (84, 70), (100, 96), (126, 66), (190, 84), (190, 140)]), fill=wall)
        d.polygon(P([(18, 88), (110, 40), (150, 60), (120, 64), (96, 92), (70, 74)]), fill=(120, 96, 66, 255))  # 塌半邊屋頂
        L(d, [(150, 60), (204, 90)], BARK_D, 4); L(d, [(120, 64), (176, 104)], BARK_D, 3)  # 斷樑
        d.rectangle([92 * S, 104 * S, 122 * S, 140 * S], fill=(60, 50, 40, 255))
        for x, y in [(44, 110), (160, 116)]: d.polygon(P([(x, y), (x + 14, y - 10), (x + 22, y + 6), (x + 8, y + 14)]), fill=(90, 74, 56, 255))  # 破洞
        L(d, [(40, 150), (70, 144)], BARK, 3); L(d, [(160, 152), (196, 146)], BARK, 3)  # 碎木
    else:
        d.rectangle([30 * S, 84 * S, 190 * S, 140 * S], fill=wall)
        for x in range(36, 190, 14): L(d, [(x, 86), (x, 138)], (150, 128, 96, 160), 1)
        roof = (104, 92, 78, 255) if stage == 'done' else (140, 116, 82, 255)
        d.polygon(P([(14, 90), (110, 36), (206, 90), (194, 96), (110, 50), (26, 96)]), fill=roof)
        if stage == 'done':
            d.polygon(P([(26, 96), (110, 50), (194, 96)]), fill=(122, 106, 88, 255))
            for i in range(8): L(d, [(30 + i * 21, 94), (110, 52)], (90, 80, 66, 200), 1)
            d.rectangle([94 * S, 102 * S, 124 * S, 140 * S], fill=(92, 66, 44, 255)); E(d, [116, 120, 120, 124], fill=(220, 190, 120, 255))
            d.rectangle([44 * S, 100 * S, 70 * S, 118 * S], fill=(236, 214, 160, 255)); L(d, [(57, 100), (57, 118)], BARK_D, 2)  # 窗燈紙
            d.rectangle([150 * S, 100 * S, 176 * S, 118 * S], fill=(236, 214, 160, 255)); L(d, [(163, 100), (163, 118)], BARK_D, 2)
        else:
            d.polygon(P([(26, 96), (110, 50), (150, 72), (150, 96)]), fill=(150, 126, 90, 255))  # 半鋪新茅
            for i in range(5): L(d, [(150 + i * 10, 96), (110 + i * 18, 52 + i * 9)], (184, 150, 100, 255), 2)  # 新椽外露
            d.rectangle([92 * S, 104 * S, 122 * S, 140 * S], fill=(70, 56, 42, 255))
            for x in (22, 198): L(d, [(x, 150), (x, 60)], (170, 140, 92, 255), 3)  # 鷹架
            for y in (120, 92, 66): L(d, [(18, y), (202, y)], (170, 140, 92, 255), 2)
            L(d, [(22, 150), (60, 60)], (170, 140, 92, 230), 2)
            d.rounded_rectangle([150 * S, 142 * S, 196 * S, 150 * S], radius=2 * S, fill=BARK_L)  # 新木料
    fin(im, 'dorm_' + stage, W, H, meta)
for st in ('broken', 'building', 'done'): hut(st)

# 5) 床位（矮木榻＋草蓆）與被褥（蓋在躺下的人身上）
for nm, col in [('bed', (176, 138, 92, 255))]:
    im = canvas(70, 34); d = ImageDraw.Draw(im)
    E(d, [2, 24, 68, 34], fill=(50, 44, 30, 60))
    d.rectangle([6 * S, 16 * S, 64 * S, 26 * S], fill=col); L(d, [(6, 26), (6, 31)], BARK_D, 2); L(d, [(64, 26), (64, 31)], BARK_D, 2)
    d.rectangle([8 * S, 12 * S, 62 * S, 18 * S], fill=(214, 196, 150, 255))  # 草蓆
    for x in range(10, 62, 6): L(d, [(x, 12), (x, 18)], (186, 168, 120, 200), 1)
    E(d, [8, 8, 22, 16], fill=(232, 224, 204, 255))  # 枕
    fin(im, nm, 70, 34, meta)
im = canvas(52, 18); d = ImageDraw.Draw(im)
d.rounded_rectangle([2 * S, 3 * S, 50 * S, 16 * S], radius=6 * S, fill=(92, 112, 138, 255))
for x in range(8, 48, 9): L(d, [(x, 4), (x - 3, 15)], (120, 140, 166, 220), 1)
fin(im, 'quilt', 52, 18, meta)
# 木屑
im = canvas(16, 10); d = ImageDraw.Draw(im); d.polygon(P([(1, 6), (9, 1), (15, 4), (6, 9)]), fill=WOODC); fin(im, 'chip', 16, 10, meta)

for v in meta.values(): v['src'] = 'design/home02/source/home02_sprites.py'; v['origin'] = 'HOME-02 新繪（Pillow＋NumPy 決定性水彩）'
json.dump(meta, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
print('ok', len(meta))
