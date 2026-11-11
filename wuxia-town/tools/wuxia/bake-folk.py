#!/usr/bin/env python3
"""武俠小鎮 W1：程式畫 8 個古裝人物走路圖（#553 範圍 3）。

格式同上游 data/spritesheets/f1.ts：每人 96×128（3 欄 × 4 列，32×32），列序 down、left、right、up。
8 人排成 4×2，輸出 public/wuxia/characters/folk.png（384×256）。
畫法：4 倍大小用多邊形／橢圓畫，外加一圈淡墨描邊（同本專案 STYLE-SCENE「人物描邊」），再縮成 32px。
全部原創，不描任何既有作品；只用 Pillow、numpy、scipy。
"""
import os

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
S = 4  # 放大倍數
F = 32 * S
INK = (46, 38, 32, 255)
SKIN = (238, 204, 170, 255)
SKIN_SH = (214, 172, 140, 255)

# id, 名稱, 外袍, 內衫/腰帶, 褲, 髮色, 髮型, 長袍?, 配件, 體型(0.85~1.05)
FOLK = [
    ("w1", "布衣男", (92, 108, 130), (196, 184, 160), (70, 72, 78), (36, 30, 28), "bun", False, None, 1.0),
    ("w2", "短打", (138, 96, 62), (210, 196, 170), (64, 58, 52), (30, 26, 24), "band", False, "sash", 1.02),
    ("w3", "布衣女", (126, 160, 150), (226, 214, 190), (110, 128, 120), (34, 28, 30), "lady", True, "pin", 0.95),
    ("w4", "老人", (128, 124, 116), (196, 190, 176), (96, 92, 86), (226, 224, 218), "bun", True, "beard", 0.97),
    ("w5", "少年", (196, 128, 70), (232, 220, 196), (90, 80, 70), (40, 32, 28), "tufts", False, None, 0.86),
    ("w6", "長衫", (214, 206, 182), (120, 140, 160), (120, 116, 104), (34, 30, 30), "cap", True, None, 1.0),
    ("w7", "郎中", (64, 98, 80), (210, 200, 176), (60, 66, 60), (36, 30, 28), "cap", True, "box", 1.0),
    ("w8", "說書人", (128, 52, 50), (220, 196, 150), (72, 50, 48), (44, 36, 34), "bun", True, "fan", 1.0),
]


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)


def draw_figure(spec, direction, step):
    _, _, robe, inner, pants, hair, style, long_robe, acc, size = spec
    im = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    robe, inner, pants, hair = (c + (255,) for c in (robe, inner, pants, hair))
    cx = F / 2
    foot = F - 1.6 * S
    k = size
    head_r = 6.1 * S * (0.94 + 0.06 * k)
    body_h = 9.2 * S * k
    leg_h = 3.6 * S * k
    hip_y = foot - leg_h
    sh_y = hip_y - body_h
    head_cy = sh_y - head_r * 0.82
    bob = -1 * S if step == 1 else 0  # 中間那格身體略高
    hip_y += bob
    sh_y += bob
    head_cy += bob
    side = direction in ("left", "right")
    sgn = -1 if direction == "left" else 1
    half_w = (5.6 if not side else 4.2) * S * k

    # 腿／腳
    swing = (-1, 0, 1)[step]
    if side:
        for s_, col in ((-swing, shade(pants, 0.8)), (swing, pants)):
            fx = cx + s_ * 2.6 * S * sgn
            d.rectangle([fx - 1.6 * S, hip_y - 1 * S, fx + 1.6 * S, foot - 1 * S], fill=col)
            d.ellipse([fx - 2.2 * S + sgn * 0.8 * S, foot - 2.2 * S, fx + 2.2 * S + sgn * 0.8 * S, foot + 0.6 * S], fill=INK)
    else:
        for i, lx in enumerate((-2.3, 2.3)):
            lift = (swing if i == 0 else -swing) * 1.4 * S
            fx = cx + lx * S
            d.rectangle([fx - 1.7 * S, hip_y - 1 * S, fx + 1.7 * S, foot - 1 * S - max(0, lift)], fill=pants)
            d.ellipse([fx - 2.1 * S, foot - 2.4 * S - max(0, lift), fx + 2.1 * S, foot + 0.4 * S - max(0, lift)], fill=INK)

    # 背後的配件（藥箱）
    if acc == "box" and direction in ("up", "left", "right"):
        bx = cx - sgn * 3.2 * S if side else cx
        d.rectangle([bx - 4 * S, sh_y + 1 * S, bx + 4 * S, sh_y + 8 * S], fill=(120, 82, 50, 255), outline=INK, width=S)

    # 身體（袍）
    hem = foot - (1.2 * S if long_robe else leg_h - 0.5 * S)
    flare = 1.4 * S if long_robe else 0.6 * S
    body = [(cx - half_w * 0.8, sh_y), (cx + half_w * 0.8, sh_y), (cx + half_w + flare, hem), (cx - half_w - flare, hem)]
    d.polygon(body, fill=robe)
    # 陰影一側
    d.polygon([(cx + half_w * 0.25, sh_y), (cx + half_w * 0.8, sh_y), (cx + half_w + flare, hem), (cx + half_w * 0.35, hem)], fill=shade(robe, 0.86))
    if direction == "down":
        # 交領
        d.polygon([(cx - 2.6 * S, sh_y), (cx + 2.6 * S, sh_y), (cx + 0.6 * S, sh_y + 5.4 * S)], fill=inner)
        d.line([(cx - 2.6 * S, sh_y), (cx + 1.2 * S, sh_y + 6.0 * S)], fill=shade(robe, 0.6), width=S)
    # 腰帶
    belt_y = sh_y + body_h * 0.52
    d.rectangle([cx - half_w - 0.2 * S, belt_y, cx + half_w + 0.2 * S, belt_y + 1.6 * S], fill=shade(inner, 0.7) if acc != "sash" else (178, 48, 40, 255))
    if acc == "sash" and direction != "up":
        d.polygon([(cx + 1 * S, belt_y + 1.4 * S), (cx + 3 * S, belt_y + 1.4 * S), (cx + 2.6 * S, belt_y + 5 * S)], fill=(178, 48, 40, 255))

    # 手臂（袖）
    arm = (swing * 1.6 * S)
    if side:
        ax = cx - sgn * 0.5 * S
        d.polygon([(ax - 1.8 * S, sh_y + 0.6 * S), (ax + 1.8 * S, sh_y + 0.6 * S), (ax + 2.2 * S + sgn * arm, sh_y + 8.6 * S), (ax - 2.0 * S + sgn * arm, sh_y + 8.6 * S)], fill=shade(robe, 0.92))
        d.ellipse([ax - 1.3 * S + sgn * arm, sh_y + 8.0 * S, ax + 1.5 * S + sgn * arm, sh_y + 10.4 * S], fill=SKIN)
    else:
        for i, sx in enumerate((-1, 1)):
            a = arm * (1 if i == 0 else -1) * 0.6
            x0 = cx + sx * (half_w * 0.8)
            d.polygon([(x0, sh_y + 0.4 * S), (x0 + sx * 2.4 * S, sh_y + 1.4 * S), (x0 + sx * 2.8 * S, sh_y + 8.4 * S + a), (x0 + sx * 0.4 * S, sh_y + 8.4 * S + a)], fill=shade(robe, 0.94))
            hx0, hx1 = sorted((x0 + sx * 0.6 * S, x0 + sx * 2.8 * S))
            d.ellipse([hx0, sh_y + 7.8 * S + a, hx1, sh_y + 10.0 * S + a], fill=SKIN)
    if acc == "fan" and direction != "up":
        fx = cx + (sgn * 3 * S if side else half_w + 1.5 * S)
        d.pieslice([fx - 4.5 * S, sh_y + 3 * S, fx + 4.5 * S, sh_y + 12 * S], 200, 340, fill=(236, 228, 206, 255), outline=INK, width=S)
    if acc == "box" and direction == "down":
        d.line([(cx - half_w * 0.6, sh_y), (cx + half_w * 0.5, belt_y)], fill=(120, 82, 50, 255), width=S)

    # 頭
    hx = cx + (sgn * 0.6 * S if side else 0)
    d.ellipse([hx - head_r, head_cy - head_r, hx + head_r, head_cy + head_r], fill=SKIN)
    # 頭髮
    if direction == "up":
        d.ellipse([hx - head_r, head_cy - head_r, hx + head_r, head_cy + head_r], fill=hair)
    elif side:
        d.chord([hx - head_r, head_cy - head_r, hx + head_r, head_cy + head_r * 0.1], 180, 360, fill=hair)
        back = hx - sgn * head_r * 0.45
        d.ellipse([back - head_r * 0.55, head_cy - head_r * 0.8, back + head_r * 0.55, head_cy + head_r * 0.45], fill=hair)
    else:
        d.chord([hx - head_r, head_cy - head_r, hx + head_r, head_cy + head_r * 0.2], 180, 360, fill=hair)
        d.polygon([(hx - head_r, head_cy - 1 * S), (hx - head_r * 0.55, head_cy - head_r * 0.6), (hx - head_r * 0.3, head_cy - 1.5 * S)], fill=hair)
        d.polygon([(hx + head_r, head_cy - 1 * S), (hx + head_r * 0.55, head_cy - head_r * 0.6), (hx + head_r * 0.3, head_cy - 1.5 * S)], fill=hair)
    # 髮型
    top = head_cy - head_r
    if style in ("bun", "lady"):
        bx = hx if not side else hx - sgn * 1.5 * S
        d.ellipse([bx - 3.0 * S, top - 3.4 * S, bx + 3.0 * S, top + 1.4 * S], fill=hair)
        if style == "lady":
            for sx in (-1, 1):
                if side and sx == sgn:
                    continue
                d.ellipse([hx + sx * head_r * 0.85 - 2.6 * S, head_cy - 2 * S, hx + sx * head_r * 0.85 + 2.6 * S, head_cy + 3 * S], fill=hair)
        if acc == "pin":
            d.line([(bx - 4.2 * S, top - 2.2 * S), (bx + 4.2 * S, top - 3.4 * S)], fill=(206, 168, 70, 255), width=S)
        if style == "bun" and spec[1] != "老人":
            d.rectangle([bx - 3.2 * S, top - 0.6 * S, bx + 3.2 * S, top + 0.6 * S], fill=shade(inner, 0.8))
    elif style == "band":
        d.rectangle([hx - head_r, top + head_r * 0.42, hx + head_r, top + head_r * 0.62], fill=(178, 48, 40, 255))
        d.ellipse([hx - 2.6 * S, top - 3.4 * S, hx + 2.6 * S, top + 1.2 * S], fill=hair)
    elif style == "tufts":
        for sx in (-1, 1):
            d.ellipse([hx + sx * 4.4 * S - 2.4 * S, top - 2.4 * S, hx + sx * 4.4 * S + 2.4 * S, top + 2.2 * S], fill=hair)
    elif style == "cap":
        d.chord([hx - head_r * 0.95, top - 2.8 * S, hx + head_r * 0.95, top + head_r * 0.95], 180, 360, fill=(40, 38, 44, 255))
        d.rectangle([hx - head_r * 0.95, top + head_r * 0.5, hx + head_r * 0.95, top + head_r * 0.62], fill=(40, 38, 44, 255))
    # 臉
    if direction == "down":
        ey = head_cy + 1.2 * S
        for sx in (-1, 1):
            d.ellipse([hx + sx * 2.5 * S - 1.0 * S, ey - 1.3 * S, hx + sx * 2.5 * S + 1.0 * S, ey + 1.3 * S], fill=INK)
            d.ellipse([hx + sx * 3.6 * S - 1.4 * S, ey + 2.0 * S, hx + sx * 3.6 * S + 1.4 * S, ey + 3.4 * S], fill=(236, 150, 130, 180))
        if acc == "beard":
            d.polygon([(hx - 3.6 * S, ey + 2.8 * S), (hx + 3.6 * S, ey + 2.8 * S), (hx, head_cy + head_r + 4.6 * S)], fill=(236, 234, 228, 255))
        if spec[1] == "說書人":
            d.line([(hx - 2.8 * S, ey + 3.4 * S), (hx + 2.8 * S, ey + 3.4 * S)], fill=hair, width=S)
    elif side:
        ex = hx + sgn * head_r * 0.55
        ey = head_cy + 1.2 * S
        d.ellipse([ex - 1.0 * S, ey - 1.3 * S, ex + 1.0 * S, ey + 1.3 * S], fill=INK)
        d.ellipse([ex - 0.4 * S - sgn * 1.2 * S, ey + 2.0 * S, ex + 2.0 * S - sgn * 1.2 * S, ey + 3.4 * S], fill=(236, 150, 130, 160))
        if acc == "beard":
            d.polygon([(hx + sgn * 1.0 * S, ey + 2.6 * S), (hx + sgn * head_r * 0.95, ey + 2.6 * S), (hx + sgn * head_r * 0.5, head_cy + head_r + 4.2 * S)], fill=(236, 234, 228, 255))

    # 淡墨描邊
    a = np.asarray(im)[..., 3] > 30
    ring = binary_dilation(a, iterations=int(1.1 * S)) & ~a
    arr = np.asarray(im).copy()
    arr[ring] = (70, 58, 48, 230)
    return Image.fromarray(arr, "RGBA").resize((32, 32), Image.LANCZOS)


def main():
    sheet = Image.new("RGBA", (384, 256), (0, 0, 0, 0))
    for i, spec in enumerate(FOLK):
        ox, oy = (i % 4) * 96, (i // 4) * 128
        for row, direction in enumerate(("down", "left", "right", "up")):
            for col in range(3):
                fr = draw_figure(spec, direction, col)
                sheet.alpha_composite(fr, (ox + col * 32, oy + row * 32))
    os.makedirs(os.path.join(ROOT, "public/wuxia/characters"), exist_ok=True)
    sheet.save(os.path.join(ROOT, "public/wuxia/characters/folk.png"), optimize=True)
    big = sheet.resize((384 * 3, 256 * 3), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (233, 223, 197, 255))
    bg.alpha_composite(big)
    os.makedirs(os.path.join(ROOT, "docs/wuxia/w01"), exist_ok=True)
    bg.convert("RGB").save(os.path.join(ROOT, "docs/wuxia/w01/folk-sheet-3x.png"), optimize=True)
    print("folk.png 384x256,", len(FOLK), "characters")


if __name__ == "__main__":
    main()
