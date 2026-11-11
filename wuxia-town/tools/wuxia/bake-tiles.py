#!/usr/bin/env python3
"""武俠小鎮 W1：烘焙「山腳古鎮」地圖（#553 範圍 1、3）。

做法跟本專案 sect-chronicle 的水彩場景一樣：用程式把地面、河、街道、房舍、樹石畫成一整張水彩底圖，
再切成 32px tile。每個 tile 只出現一次（48×36 張），tileset 就是底圖本身；Tiled 可以照常打開、改圖層。

輸入：
  - data/wuxia/places.json（地點的 rect，房舍與街道照它擺）
  - tools/wuxia/art-src/（本專案自製水彩素材的縮小副本，見 prep-art-src.py 與 SOURCES.json）
  - Noto Serif CJK（招牌字；系統字型，只用來把字畫進圖裡，不進 repo）
輸出：
  - public/wuxia/tiles/town.jpg               tileset（1536×1152）
  - data/wuxia/tiled/town-tiles.tsj           Tiled tileset
  - data/wuxia/tiled/town.tmj                 Tiled 地圖（圖層 bgtiles＝地面、objmap＝不能走的格子）
  - docs/wuxia/w01/bake-preview.jpg、bake-blocked.png  預覽（含不能走的格子）
之後用上游 data/convertMap.js 轉成 data/wuxia/town-map.js（tools/wuxia/build-map.sh 一次做完）。

需要 numpy、scipy、Pillow。固定亂數種子，同樣輸入產出同一張圖。
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "tools/wuxia/art-src")
TW, TH, T = 48, 36, 32
W, H = TW * T, TH * T
RNG = np.random.default_rng(553)

PLACES = {p["id"]: p for p in json.load(open(os.path.join(ROOT, "data/wuxia/places.json"), encoding="utf-8"))["places"]}

INK = (52, 44, 36, 255)
blocked = np.zeros((TW, TH), dtype=bool)  # [x][y]
walk_force = np.zeros((TW, TH), dtype=bool)  # 一定可以走（橋、城門通道）


def rect_px(pid):
    x, y, w, h = PLACES[pid]["rect"]
    return x * T, y * T, w * T, h * T


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGBA")


def font(size, bold=True):
    path = "/usr/share/fonts/opentype/noto/NotoSerifCJK-%s.ttc" % ("Bold" if bold else "Regular")
    for idx in range(8):
        try:
            f = ImageFont.truetype(path, size, index=idx)
        except OSError:
            break
        if "TC" in " ".join(f.getname()):
            return f
    return ImageFont.truetype(path, size)


def noise(sigma, seed_shift=0, shape=(H, W)):
    r = np.random.default_rng(553 + seed_shift).random(shape)
    n = gaussian_filter(r, sigma)
    n -= n.min()
    return n / max(1e-9, n.max())


def mirror_tile(img, scale=1.0):
    """把材質鏡射平鋪到整張畫布（鏡射沒有接縫）。"""
    im = img.convert("RGB")
    if scale != 1.0:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    a = np.concatenate([a, a[:, ::-1]], axis=1)
    a = np.concatenate([a, a[::-1]], axis=0)
    reps = (math.ceil(H / a.shape[0]), math.ceil(W / a.shape[1]), 1)
    return np.tile(a, reps)[:H, :W]


def blend(canvas, tex, mask):
    m = mask[..., None]
    return canvas * (1 - m) + tex * m


def soft_mask_from_draw(draw_fn, blur):
    im = Image.new("L", (W, H), 0)
    draw_fn(ImageDraw.Draw(im))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255


# ---------------------------------------------------------------- 地面
canvas = mirror_tile(load("tex-meadow.jpg"), 0.75)
# 青瓷綠 ↔ 赭黃 的大塊暈染
n1 = noise(90)[..., None]
celadon = np.array([0.55, 0.62, 0.43])
ochre = np.array([0.66, 0.60, 0.40])
canvas = canvas * 0.72 + (celadon * (1 - n1) + ochre * n1) * 0.28
canvas *= (0.92 + 0.12 * noise(25, 1))[..., None]

# 北邊鎮外：林下地面
forest = mirror_tile(load("tex-forest.jpg"), 0.5)
north = soft_mask_from_draw(lambda d: d.rectangle([0, 0, W, 8.3 * T]), 40) * (0.55 + 0.45 * noise(30, 2))
north[int(4 * T):, int(20 * T):int(28 * T)] *= 0.4
canvas = blend(canvas, forest * 0.92, np.clip(north, 0, 0.85))

# 遠山（最北兩排）
far = load("far-mountains.jpg").convert("RGB").resize((W, int(W * 540 / 960)), Image.LANCZOS)
fa = np.asarray(far).astype(np.float32)[int(0.16 * far.height): int(0.16 * far.height) + int(3.4 * T)] / 255
fm = np.zeros((H, W), np.float32)
grad = np.clip(1 - np.linspace(0, 1, fa.shape[0]) ** 1.6, 0, 1)
fm[: fa.shape[0]] = grad[:, None]
farfull = np.zeros_like(canvas)
farfull[: fa.shape[0]] = fa
canvas = blend(canvas, farfull, fm * 0.95)
for x in range(TW):
    blocked[x][0] = True
    blocked[x][1] = True

# 南門外田地（三排）
fields = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fields)
for i, (x0, x1) in enumerate([(1, 9), (10, 19), (29, 37), (38, 47)]):
    for r in range(6):
        y = int(33.2 * T + r * 9)
        col = (92, 128, 70, 150) if (r + i) % 2 else (128, 140, 78, 130)
        fd.rectangle([x0 * T, y, x1 * T, y + 5], fill=col)
fields = fields.filter(ImageFilter.GaussianBlur(1.2))
fa_ = np.asarray(fields).astype(np.float32) / 255
canvas = blend(canvas, fa_[..., :3], fa_[..., 3])

# ---------------------------------------------------------------- 土路（小巷、山腳小路、河岸路）
dirt = mirror_tile(load("dirt-path.png"), 0.5)


def draw_lanes(d):
    lw = int(1.6 * T)
    # 山腳小路：從橋往北蜿蜒出地圖
    pts = [(24 * T, 9 * T), (24.4 * T, 7 * T), (23.2 * T, 5 * T), (24.6 * T, 3 * T), (23.8 * T, 0)]
    d.line(pts, fill=255, width=lw, joint="curve")
    for p in pts:
        d.ellipse([p[0] - lw / 2, p[1] - lw / 2, p[0] + lw / 2, p[1] + lw / 2], fill=255)
    # 河岸路
    d.rectangle([0, 12.1 * T, W, 13.2 * T], fill=255)
    # 西巷（民居、茶館前）
    d.rectangle([2 * T, 19.9 * T, 19 * T, 21.4 * T], fill=255)
    d.rectangle([4.6 * T, 19 * T, 6.4 * T, 21 * T], fill=255)
    # 西南巷（民居二、鐵匠鋪）
    d.rectangle([2 * T, 30.0 * T, 22 * T, 31.0 * T], fill=255)
    d.rectangle([18.6 * T, 26.5 * T, 22 * T, 30.8 * T], fill=255)
    # 東巷：街到藥鋪、民居、武館門口
    d.rectangle([26 * T, 28.6 * T, 42 * T, 30.4 * T], fill=255)
    d.rectangle([29.4 * T, 27.6 * T, 31 * T, 29.5 * T], fill=255)
    # 城門外大路
    d.rectangle([21.5 * T, 33 * T, 26.5 * T, H], fill=255)


lane = soft_mask_from_draw(draw_lanes, 6) * (0.75 + 0.25 * noise(8, 3))
canvas = blend(canvas, dirt, np.clip(lane, 0, 1))

# ---------------------------------------------------------------- 石板主街、小廣場
flag = mirror_tile(load("flagstone.png"), 0.42)
flag = flag * 0.9 + np.array([0.80, 0.78, 0.70]) * 0.1


def draw_stone(d):
    x, y, w, h = rect_px("street")
    d.rectangle([x, 12.8 * T, x + w, 33.2 * T], fill=255)
    x, y, w, h = rect_px("plaza")
    d.rounded_rectangle([x, y, x + w, y + h], radius=20, fill=255)


stone = soft_mask_from_draw(draw_stone, 3)
canvas = blend(canvas, flag, stone)

# ---------------------------------------------------------------- 河
water = mirror_tile(load("tex-water.jpg"), 0.55)
xs = np.arange(W)
top = 9.0 * T + 9 * np.sin(xs / 97.0) + 6 * np.sin(xs / 41.0 + 1.3)
bot = 12.0 * T - 4 + 7 * np.sin(xs / 83.0 + 2.1) + 4 * np.sin(xs / 29.0)
yy = np.arange(H)[:, None]
river = ((yy >= top[None, :]) & (yy <= bot[None, :])).astype(np.float32)
river_soft = gaussian_filter(river, 2.0)
bank = np.clip(gaussian_filter(river, 7.0) - river_soft, 0, 1) * 2.2
canvas = blend(canvas, canvas * np.array([0.62, 0.58, 0.48]), np.clip(bank, 0, 0.7))
depth = gaussian_filter(river, 10.0)
canvas = blend(canvas, water * (0.82 + 0.18 * depth[..., None]), river_soft)
for x in range(TW):
    for y in range(8, 13):
        cell = river[y * T:(y + 1) * T, x * T:(x + 1) * T]
        if cell.mean() > 0.45:
            blocked[x][y] = True

# ---------------------------------------------------------------- 景物（腳底 y 排序後貼上）
sprites = []  # (bottom_y, image, x_left, y_top)


def put(img, cx, bottom, scale=1.0, flip=False, solid=None, tint=None):
    im = img
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if scale != 1.0:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    if tint is not None:
        im = tint(im)
    x0 = int(round(cx - im.width / 2))
    y0 = int(round(bottom - im.height))
    sprites.append((bottom, im, x0, y0))
    if solid == "base":  # 只擋樹幹／石腳那一格
        bx, by = int(cx // T), int((bottom - 4) // T)
        if 0 <= bx < TW and 0 <= by < TH:
            blocked[bx][by] = True
    elif solid == "alpha":  # 不透明部分覆蓋超過一半的格子
        a = np.asarray(im)[..., 3].astype(np.float32) / 255
        for gx in range(x0 // T, (x0 + im.width) // T + 1):
            for gy in range(y0 // T, (y0 + im.height) // T + 1):
                if not (0 <= gx < TW and 0 <= gy < TH):
                    continue
                sx0, sy0 = gx * T - x0, gy * T - y0
                sub = a[max(0, sy0):max(0, sy0 + T), max(0, sx0):max(0, sx0 + T)]
                if sub.size and sub.sum() / (T * T) > 0.5:
                    blocked[gx][gy] = True
    return im


def block_rect(x, y, w, h):
    for gx in range(x, x + w):
        for gy in range(y, y + h):
            blocked[gx][gy] = True


def worn(im, desat=0.5, dark=0.82):
    a = np.asarray(im).astype(np.float32)
    rgb = a[..., :3]
    g = rgb.mean(axis=2, keepdims=True)
    rgb = (rgb * (1 - desat) + g * desat) * dark + np.array([18, 14, 6]) * (1 - dark)
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def hue_tint(rgb_mul):
    def f(im):
        a = np.asarray(im).astype(np.float32)
        a[..., :3] = np.clip(a[..., :3] * np.array(rgb_mul), 0, 255)
        return Image.fromarray(a.astype(np.uint8), "RGBA")
    return f


def building(pid, img, flip=False, tint=None, extra_rows=1.0):
    x, y, w, h = rect_px(pid)
    s = min(w / img.width, (h + extra_rows * T) / img.height)
    put(img, x + w / 2, y + h + 2, s, flip=flip, tint=tint, solid="alpha")
    rx, ry, rw, rh = PLACES[pid]["rect"]
    block_rect(rx, ry, rw, rh)


hall = load("dojo_main_hall.png")
house = load("dojo_side_house.png")
gate_img = load("dojo_gate.png")
wall = load("court_wall.png")

# 茶館、藥鋪、鐵匠鋪、民居
building("teahouse", hall, tint=hue_tint([1.05, 1.0, 0.92]))
building("pharmacy", house, flip=True, tint=hue_tint([0.98, 1.02, 0.98]))
building("smithy", house, tint=hue_tint([0.84, 0.82, 0.80]))
building("home-west-1", house, flip=True, tint=hue_tint([1.02, 0.98, 0.92]))
building("home-west-2", house, tint=hue_tint([0.97, 0.97, 0.95]))
building("home-east", house, flip=True, tint=hue_tint([1.0, 0.97, 0.93]))

# 店前景物
bench = load("stone_bench.png")
put(bench, 14.5 * T, 21.3 * T, 0.42)  # 茶館前石凳（不擋路）
put(bench, 18.0 * T, 21.3 * T, 0.42)
put(load("herb_rack.png"), 33.4 * T, 20.0 * T, 0.5, solid="base")
put(load("herb_bed.png"), 30.6 * T, 21.2 * T, 0.38)
put(load("woodpile.png"), 19.6 * T, 27.4 * T, 0.48, solid="base")
put(load("water_vat.png"), 10.0 * T, 30.2 * T, 0.45, solid="base")
put(load("stone_mill.png"), 9.6 * T, 19.6 * T, 0.42, solid="base")
put(load("water_vat.png"), 33.6 * T, 28.0 * T, 0.4, solid="base")

# ---------------------------------------------------------------- 破舊武館（東）
dx, dy, dw, dh = PLACES["dojo"]["rect"]
# court_wall 取中段（不含兩端收頭）當連續牆面
wall_mid = wall.crop((int(wall.width * 0.22), 0, int(wall.width * 0.8), wall.height))


def hwall(x0, x1, bottom, height_px, img=None, gaps=()):
    """水平牆：把牆面中段沿 x 連續平鋪，底邊對齊 bottom。"""
    src = img or wall_mid
    s_ = height_px / src.height
    piece = src.resize((max(1, int(src.width * s_)), int(height_px)), Image.LANCZOS)
    strip = Image.new("RGBA", (int(x1 - x0), piece.height), (0, 0, 0, 0))
    k = 0
    while k * (piece.width - 2) < strip.width:
        strip.alpha_composite(piece, (int(k * (piece.width - 2)), 0))
        k += 1
    a = np.asarray(strip).copy()
    for g0, g1 in gaps:
        a[:, max(0, int(g0 - x0)):max(0, int(g1 - x0)), 3] = 0
    strip = Image.fromarray(a, "RGBA")
    sprites.append((bottom, strip, int(x0), int(bottom - piece.height)))


def vwall(x_center, y0, y1, width_px, color=(132, 124, 108), gaps=()):
    """垂直牆：俯視看到的是牆頂（瓦脊）加一側陰影。"""
    g = Image.new("RGBA", (int(width_px) + 8, int(y1 - y0) + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    d.rectangle([4, 4, 4 + width_px, 4 + (y1 - y0)], fill=color + (255,), outline=INK, width=2)
    d.rectangle([4, 4, 4 + width_px * 0.35, 4 + (y1 - y0)], fill=tuple(int(c * 0.78) for c in color) + (255,))
    for yy_ in range(6, int(y1 - y0), 9):
        d.line([5, 4 + yy_, 3 + width_px, 4 + yy_], fill=(96, 90, 80, 255), width=1)
    a = np.asarray(g).copy()
    for g0, g1 in gaps:
        a[max(0, int(g0 - y0)):max(0, int(g1 - y0)), :, 3] = 0
    sprites.append((y1, Image.fromarray(a, "RGBA"), int(x_center - width_px / 2 - 4), int(y0 - 4)))


wall_worn = worn(wall_mid, 0.55, 0.8)
put(worn(hall, 0.55, 0.78), (dx + dw / 2) * T, (dy + 7.2) * T, 0.95)
block_rect(dx + 1, dy, dw - 2, 7)
gx_mid = dx + dw / 2
# 北牆（被正殿擋住大半）、東西牆（西牆塌一段）、南牆（中間門樓）
hwall(dx * T, (dx + dw) * T, (dy + 1.0) * T, 40, wall_worn)
collapse = ((dy + 8) * T, (dy + 10) * T)
vwall(dx * T + 12, (dy + 0.6) * T, (dy + dh) * T, 18, (120, 112, 98), gaps=[collapse])
vwall((dx + dw) * T - 12, (dy + 0.6) * T, (dy + dh) * T, 18, (120, 112, 98))
hwall(dx * T, (dx + dw) * T, (dy + dh) * T + 6, 44, wall_worn, gaps=[((gx_mid - 1.6) * T, (gx_mid + 1.6) * T)])
# 塌牆的碎石
for k in range(5):
    put(boulders_s := load("boulder_s.png"), dx * T + RNG.uniform(4, 30), (dy + 8.3 + k * 0.35) * T, RNG.uniform(0.35, 0.55))
for gx in range(dx, dx + dw):
    blocked[gx][dy] = True
    blocked[gx][dy + dh - 1] = True
for gy in range(dy, dy + dh):
    blocked[dx + dw - 1][gy] = True
    if not (dy + 8 <= gy < dy + 10):
        blocked[dx][gy] = True
put(worn(gate_img, 0.5, 0.78), gx_mid * T, (dy + dh + 0.3) * T, 0.85)
for gx in range(int(gx_mid) - 2, int(gx_mid) + 2):
    blocked[gx][dy + dh - 1] = True  # 門封著，進不去（W4 才開）
    blocked[gx][dy + dh - 2] = True
# 院子裡的雜草
for _ in range(30):
    px = RNG.uniform(dx + 1.2, dx + dw - 1.2) * T
    py = RNG.uniform(dy + 7.6, dy + dh - 1.2) * T
    put(load("wild_grass.png" if RNG.random() < 0.6 else "fern.png"), px, py, RNG.uniform(0.45, 0.8))

# ---------------------------------------------------------------- 程式畫的：城牆、城門、石橋、井、招牌


def layer():
    return Image.new("RGBA", (W * 2, H * 2), (0, 0, 0, 0))


def finish(im):
    return im.resize((W, H), Image.LANCZOS)


# 城牆（court_wall 中段連續平鋪，城門兩側）
hwall(0, 20 * T + 4, 33.0 * T, 50)
hwall(28 * T - 4, W, 33.0 * T, 50)
for gx in list(range(0, 20)) + list(range(28, TW)):
    blocked[gx][32] = True

# 城門：兩座石墩＋木樑＋瓦頂＋匾額「山腳鎮」
g = layer()
d = ImageDraw.Draw(g)
S = 2
gx0, gy0 = 20 * T * S, 30.2 * T * S
stone_c = (150, 146, 134, 255)
for px in (gx0, gx0 + 6 * T * S):
    d.rectangle([px, gy0 + 40 * S, px + 2 * T * S, 34.6 * T * S], fill=stone_c, outline=INK, width=3)
    for r in range(8):
        yy_ = gy0 + 40 * S + r * 22 * S
        d.line([px, yy_, px + 2 * T * S, yy_], fill=(110, 104, 94, 255), width=2)
        off = 0 if r % 2 else 16 * S
        for c in range(4):
            xx_ = px + off + c * 32 * S
            if px < xx_ < px + 2 * T * S:
                d.line([xx_, yy_, xx_, yy_ + 22 * S], fill=(110, 104, 94, 255), width=2)
# 樑
d.rectangle([gx0 + 2 * T * S, gy0 + 46 * S, gx0 + 6 * T * S, gy0 + 60 * S], fill=(108, 62, 40, 255), outline=INK, width=3)
# 瓦頂（兩端起翹）
rx0, rx1 = gx0 - 18 * S, gx0 + 8 * T * S + 18 * S
ry = gy0 + 8 * S
d.polygon([(rx0 - 10 * S, ry - 6 * S), (rx0 + 30 * S, ry + 28 * S), (rx1 - 30 * S, ry + 28 * S), (rx1 + 10 * S, ry - 6 * S),
           (rx1 - 40 * S, ry + 4 * S), (rx0 + 40 * S, ry + 4 * S)], fill=(70, 72, 76, 255), outline=INK)
d.polygon([(rx0 + 30 * S, ry + 4 * S), (rx1 - 30 * S, ry + 4 * S), (rx1 - 60 * S, ry - 26 * S), (rx0 + 60 * S, ry - 26 * S)],
          fill=(84, 86, 90, 255), outline=INK)
for k in range(int((rx1 - rx0) / (10 * S))):
    xx_ = rx0 + 34 * S + k * 10 * S
    if xx_ < rx1 - 34 * S:
        d.line([xx_, ry - 22 * S, xx_ + (xx_ - (rx0 + rx1) / 2) * 0.05, ry + 26 * S], fill=(58, 60, 64, 255), width=2)
d.line([rx0 + 58 * S, ry - 27 * S, rx1 - 58 * S, ry - 27 * S], fill=INK, width=6)
# 匾額
px0, py0 = gx0 + 2.7 * T * S, gy0 + 30 * S
d.rectangle([px0, py0, px0 + 2.6 * T * S, py0 + 34 * S], fill=(46, 40, 36, 255), outline=(170, 140, 70, 255), width=4)
f = font(26 * S)
txt = "山腳鎮"
tw = d.textlength(txt, font=f)
d.text((px0 + (2.6 * T * S - tw) / 2, py0 - 3 * S), txt, font=f, fill=(222, 196, 120, 255))
gate_layer = finish(g)
sprites.append((34.6 * T, gate_layer, 0, 0))
block_rect(20, 31, 2, 4)
block_rect(26, 31, 2, 4)
for gx in range(22, 26):
    for gy in range(31, 36):
        walk_force[gx][gy] = True

# 石橋：石板橋面＋兩側石欄
g = layer()
d = ImageDraw.Draw(g)
bx0, bx1 = 21.8 * T * S, 26.2 * T * S
by0, by1 = 8.55 * T * S, 12.35 * T * S
d.rectangle([bx0 + 4 * S, by0 + 8 * S, bx1 + 4 * S, by1 + 10 * S], fill=(30, 50, 50, 90))  # 影子
d.rectangle([bx0, by0, bx1, by1], fill=(176, 170, 154, 255), outline=INK, width=3)
for r in range(int((by1 - by0) / (14 * S)) + 1):
    yy_ = by0 + r * 14 * S
    d.line([bx0, yy_, bx1, yy_], fill=(138, 132, 118, 255), width=2)
    off = 0 if r % 2 else 18 * S
    k = 0
    while True:
        xx_ = bx0 + off + k * 36 * S
        if xx_ >= bx1:
            break
        d.line([xx_, yy_, xx_, min(by1, yy_ + 14 * S)], fill=(138, 132, 118, 255), width=2)
        k += 1
for px in (bx0, bx1 - 8 * S):
    d.rectangle([px, by0 - 4 * S, px + 8 * S, by1 + 2 * S], fill=(128, 124, 112, 255), outline=INK, width=2)
    for k in range(5):
        yy_ = by0 + k * (by1 - by0) / 4
        d.rectangle([px - 3 * S, yy_ - 6 * S, px + 11 * S, yy_ + 6 * S], fill=(150, 146, 132, 255), outline=INK, width=2)
sprites.append((12.4 * T, finish(g), 0, 0))
for gx in range(22, 26):
    for gy in range(8, 13):
        blocked[gx][gy] = False
        walk_force[gx][gy] = True

# 井：石圈＋水面＋木架
g = layer()
d = ImageDraw.Draw(g)
wx, wy_ = 21.0 * T * S, 22.2 * T * S
r = 0.78 * T * S
d.ellipse([wx - r - 6 * S, wy_ - r * 0.7 + 10 * S, wx + r + 6 * S, wy_ + r * 0.7 + 14 * S], fill=(40, 40, 30, 70))
d.ellipse([wx - r, wy_ - r * 0.7, wx + r, wy_ + r * 0.7], fill=(150, 146, 134, 255), outline=INK, width=4)
d.ellipse([wx - r * 0.62, wy_ - r * 0.42, wx + r * 0.62, wy_ + r * 0.42], fill=(38, 62, 70, 255), outline=INK, width=3)
d.ellipse([wx - r * 0.3, wy_ - r * 0.2, wx + r * 0.05, wy_ - r * 0.02], fill=(120, 160, 170, 160))
for px in (wx - r * 0.9, wx + r * 0.9):
    d.rectangle([px - 4 * S, wy_ - r * 1.6, px + 4 * S, wy_ + 4 * S], fill=(104, 70, 44, 255), outline=INK, width=2)
d.rectangle([wx - r, wy_ - r * 1.66, wx + r, wy_ - r * 1.48], fill=(104, 70, 44, 255), outline=INK, width=2)
d.line([wx, wy_ - r * 1.5, wx, wy_ - r * 0.3], fill=INK, width=2)
d.rectangle([wx - 7 * S, wy_ - r * 0.5, wx + 7 * S, wy_ - r * 0.2], fill=(120, 84, 50, 255), outline=INK, width=2)
sprites.append((wy_ / S + r * 0.7 / S, finish(g), 0, 0))
block_rect(20, 21, 2, 2)

# 打鐵砧
g = layer()
d = ImageDraw.Draw(g)
ax, ay = 20.4 * T * S, 29.4 * T * S
d.rectangle([ax - 10 * S, ay - 6 * S, ax + 10 * S, ay + 10 * S], fill=(92, 70, 52, 255), outline=INK, width=2)
d.polygon([(ax - 22 * S, ay - 18 * S), (ax + 18 * S, ay - 18 * S), (ax + 26 * S, ay - 12 * S), (ax + 10 * S, ay - 6 * S), (ax - 14 * S, ay - 6 * S)],
          fill=(62, 64, 68, 255), outline=INK)
sprites.append((ay / S + 10, finish(g), 0, 0))
blocked[20][29] = True


# 招牌（布幌）
def banner(cx, top, text, color=(232, 222, 196, 255), pole=True):
    g = layer()
    d = ImageDraw.Draw(g)
    X, Y = cx * S, top * S
    if pole:
        d.rectangle([X - 2 * S, Y - 6 * S, X + 2 * S, Y + 64 * S], fill=(90, 62, 40, 255), outline=INK, width=1)
        d.line([X, Y, X + 26 * S, Y], fill=(90, 62, 40, 255), width=3 * S)
    d.rectangle([X + 6 * S, Y + 2 * S, X + 28 * S, Y + 42 * S], fill=color, outline=INK, width=2 * S)
    d.polygon([(X + 6 * S, Y + 42 * S), (X + 12 * S, Y + 50 * S), (X + 17 * S, Y + 42 * S), (X + 22 * S, Y + 50 * S), (X + 28 * S, Y + 42 * S)],
              fill=color, outline=INK)
    f = font(17 * S)
    tw = d.textlength(text, font=f)
    d.text((X + 17 * S - tw / 2, Y + 8 * S), text, font=f, fill=(150, 34, 28, 255))
    return finish(g)


for cx, top, text, bottom in [
    (21.0 * T, 15.0 * T, "茶", 17.0 * T),
    (26.0 * T, 15.2 * T, "藥", 17.2 * T),
    (19.2 * T, 25.4 * T, "鐵", 27.4 * T),
]:
    sprites.append((bottom, banner(cx, top, text), 0, 0))

# 茶館門前紅燈籠
g = layer()
d = ImageDraw.Draw(g)
tx, ty, tw_, th_ = rect_px("teahouse")
for lx in (tx + tw_ * 0.3, tx + tw_ * 0.7):
    X, Y = lx * S, (ty + th_ - 2.3 * T) * S
    d.line([X, Y - 10 * S, X, Y], fill=INK, width=2 * S)
    d.ellipse([X - 7 * S, Y, X + 7 * S, Y + 16 * S], fill=(196, 52, 38, 255), outline=INK, width=2)
    d.rectangle([X - 4 * S, Y + 15 * S, X + 4 * S, Y + 19 * S], fill=(210, 170, 60, 255))
sprites.append((ty + th_ + 3, finish(g), 0, 0))

# 武館匾額（舊、褪色、歪一點）
g = layer()
d = ImageDraw.Draw(g)
plx, ply = (gx_mid - 1.0) * T * S, (dy + dh - 1.85) * T * S
d.rectangle([plx, ply, plx + 2 * T * S, ply + 22 * S], fill=(70, 60, 50, 255), outline=(120, 104, 70, 255), width=3)
f = font(17 * S)
d.text((plx + 12 * S, ply - 2 * S), "武館", font=f, fill=(178, 160, 110, 255))
# 封條（交叉的白紙條）
cx_, cy_ = gx_mid * T * S, (dy + dh - 0.8) * T * S
for sgn in (-1, 1):
    d.line([cx_ - 24 * S, cy_ - 16 * S * sgn, cx_ + 24 * S, cy_ + 16 * S * sgn], fill=(236, 230, 214, 235), width=7 * S)
plaque = finish(g).rotate(-2.0, resample=Image.BICUBIC, center=(gx_mid * T, (dy + dh - 1.6) * T))
sprites.append(((dy + dh + 0.2) * T, plaque, 0, 0))

# ---------------------------------------------------------------- 樹、竹、石
trees = [load("pine_a.png"), load("pine_b.png"), load("broadleaf_tree.png")]
bamboo = load("bamboo_clump.png")
boulders = [load("boulder_l.png"), load("boulder_m.png"), load("boulder_s.png")]

# 竹林（西北）與東北林
bx, by, bw, bh = PLACES["bamboo"]["rect"]
for i in range(26):
    px = RNG.uniform(bx + 0.5, bx + bw - 0.5) * T
    py = RNG.uniform(by + 1.5, by + bh + 0.6) * T
    put(bamboo, px, py, RNG.uniform(0.48, 0.66), flip=RNG.random() < 0.5, solid="base")
for i in range(16):
    px = RNG.uniform(29.5, 46.5) * T
    py = RNG.uniform(3.8, 8.3) * T
    put(trees[i % 3], px, py, RNG.uniform(0.42, 0.56), flip=RNG.random() < 0.5, solid="base")
for i in range(9):
    px = RNG.uniform(1, 46) * T
    if 20.5 * T < px < 27.5 * T:
        continue
    put(boulders[i % 3], px, RNG.uniform(2.6, 3.4) * T, RNG.uniform(0.5, 0.8), solid="base")
# 河岸樹與草
for px, py, k in [(3.5, 13.9, 0), (10.2, 13.8, 2), (31.5, 13.7, 1), (38.0, 13.9, 2), (44.5, 13.8, 0), (16.5, 8.4, 2), (40.5, 8.5, 1)]:
    put(trees[k], px * T, py * T, 0.46, flip=px > 24, solid="base")
creek = load("creek_bank.png")
for i in range(14):
    px = RNG.uniform(0.5, 47.5) * T
    if 20.8 * T < px < 27.2 * T:
        continue
    put(creek, px, (12.25 + RNG.uniform(-0.1, 0.15)) * T, RNG.uniform(0.45, 0.6), flip=RNG.random() < 0.5)
# 鎮內點綴
for px, py, k in [(10.5, 23.6, 1), (32.2, 23.8, 2), (46.0, 30.8, 0), (1.0, 31.0, 2), (46.2, 20.0, 1), (1.0, 22.5, 0)]:
    put(trees[k], px * T, py * T, 0.42, solid="base")
for i in range(70):
    px, py = RNG.uniform(0.5, 47.5) * T, RNG.uniform(13.5, 35.5) * T
    gxi, gyi = int(px // T), int(py // T)
    if blocked[gxi][gyi] or stone[int(py) % H, int(px) % W] > 0.2 or lane[int(py) % H, int(px) % W] > 0.3:
        continue
    put(load(["wild_grass.png", "fern.png", "shrub_fern.png"][i % 3]), px, py, RNG.uniform(0.4, 0.7))

# 依腳底 y 排序貼上
img = Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
for bottom, im, x0, y0 in sorted(sprites, key=lambda s: s[0]):
    img.alpha_composite(im, (max(0, x0), max(0, y0)), (max(0, -x0), max(0, -y0)))

# 紙紋＋四角微暗（水墨淡彩）
arr = np.asarray(img.convert("RGB")).astype(np.float32) / 255
paper = 0.965 + 0.05 * noise(1.2, 9)
vy = np.linspace(-1, 1, H)[:, None]
vx = np.linspace(-1, 1, W)[None, :]
vig = 1 - 0.10 * np.clip((vx ** 2 + vy ** 2) - 0.35, 0, 1)
arr = arr * (paper * vig)[..., None]
arr = arr * 0.94 + np.array([0.93, 0.89, 0.80]) * 0.06
final = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGB")

# ---------------------------------------------------------------- 輸出
for gx in range(TW):
    for gy in range(TH):
        if walk_force[gx][gy]:
            blocked[gx][gy] = False

os.makedirs(os.path.join(ROOT, "public/wuxia/tiles"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "data/wuxia/tiled"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "docs/wuxia/w01"), exist_ok=True)
final.save(os.path.join(ROOT, "public/wuxia/tiles/town.jpg"), quality=90, optimize=True, progressive=False)

bg = [gy * TW + gx + 1 for gy in range(TH) for gx in range(TW)]
obj = [(gy * TW + gx + 1) if blocked[gx][gy] else 0 for gy in range(TH) for gx in range(TW)]
tsj = {
    "type": "tileset", "version": "1.10", "tiledversion": "1.10.2", "name": "town",
    "image": "../../../public/wuxia/tiles/town.jpg", "imagewidth": W, "imageheight": H,
    "tilewidth": T, "tileheight": T, "tilecount": TW * TH, "columns": TW, "margin": 0, "spacing": 0,
}
tmj = {
    "type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal",
    "renderorder": "right-down", "width": TW, "height": TH, "tilewidth": T, "tileheight": T,
    "infinite": False, "nextlayerid": 3, "nextobjectid": 1, "compressionlevel": -1,
    "tilesets": [{"firstgid": 1, "source": "town-tiles.tsj"}],
    "layers": [
        {"id": 1, "name": "bgtiles", "type": "tilelayer", "width": TW, "height": TH, "x": 0, "y": 0,
         "opacity": 1, "visible": True, "data": bg},
        {"id": 2, "name": "objmap", "type": "tilelayer", "width": TW, "height": TH, "x": 0, "y": 0,
         "opacity": 1, "visible": True, "data": obj},
    ],
}
json.dump(tsj, open(os.path.join(ROOT, "data/wuxia/tiled/town-tiles.tsj"), "w"), indent=1)
with open(os.path.join(ROOT, "data/wuxia/tiled/town.tmj"), "w") as fh:
    json.dump(tmj, fh, separators=(",", ":"))
    fh.write("\n")

prev = final.copy().convert("RGBA")
ov = Image.new("RGBA", prev.size, (0, 0, 0, 0))
od = ImageDraw.Draw(ov)
for gx in range(TW):
    for gy in range(TH):
        if blocked[gx][gy]:
            od.rectangle([gx * T + 1, gy * T + 1, gx * T + T - 2, gy * T + T - 2], fill=(200, 30, 30, 70), outline=(160, 20, 20, 140))
prev.alpha_composite(ov)
prev.convert("RGB").resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(ROOT, "docs/wuxia/w01/bake-blocked.jpg"), quality=82)
final.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(ROOT, "docs/wuxia/w01/bake-preview.jpg"), quality=85)
print(f"town.jpg {W}x{H}, tiles {TW * TH}, blocked {int(blocked.sum())}/{TW * TH}")
