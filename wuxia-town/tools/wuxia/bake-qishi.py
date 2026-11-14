#!/usr/bin/env python3
# 武俠小鎮 A2（#575）：「起勢」2 格動畫（純程式畫：墨線小人，第 1 格雙手垂下、第 2 格雙臂平舉到肩高、微屈膝）。
# 輸出 public/wuxia/a2/qishi.png（2 格橫排，每格 32×40）。無外部素材。重產：python3 tools/wuxia/bake-qishi.py
import os
from PIL import Image, ImageDraw

S = 8  # 先畫 8 倍再縮小（反鋸齒）
W, H = 32, 40
INK = (46, 38, 31, 255)
ROBE = (236, 228, 205, 255)
SASH = (179, 52, 42, 255)


def frame(raised: bool) -> Image.Image:
    im = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lw = int(1.6 * S)
    cx = W * S // 2
    sink = 2 * S if raised else 0  # 第 2 格微微下沉（屈膝）
    # 頭
    hy = 7 * S + sink
    d.ellipse([cx - 4 * S, hy - 4 * S, cx + 4 * S, hy + 4 * S], fill=ROBE, outline=INK, width=lw)
    d.line([cx - 2 * S, hy - 4 * S, cx + 2 * S, hy - 6 * S], fill=INK, width=lw)  # 髮髻
    # 身（道袍梯形）
    top = 12 * S + sink
    bot = 30 * S + sink // 2
    d.polygon([(cx - 4 * S, top), (cx + 4 * S, top), (cx + 7 * S, bot), (cx - 7 * S, bot)], fill=ROBE, outline=INK)
    d.line([(cx - 4 * S, top), (cx - 7 * S, bot)], fill=INK, width=lw)
    d.line([(cx + 4 * S, top), (cx + 7 * S, bot)], fill=INK, width=lw)
    d.line([(cx - 7 * S, bot), (cx + 7 * S, bot)], fill=INK, width=lw)
    d.line([(cx - 4 * S, top + 7 * S), (cx + 5 * S, top + 7 * S)], fill=SASH, width=lw)  # 腰帶
    # 腿
    knee = 2 * S if raised else 0
    for sgn in (-1, 1):
        d.line([(cx + sgn * 3 * S, bot), (cx + sgn * (4 * S + knee), bot + 4 * S), (cx + sgn * 4 * S, 38 * S)], fill=INK, width=lw)
    # 手臂
    sh = top + 2 * S
    for sgn in (-1, 1):
        if raised:
            d.line([(cx + sgn * 4 * S, sh), (cx + sgn * 10 * S, sh + 1 * S), (cx + sgn * 13 * S, sh)], fill=INK, width=lw)
            d.ellipse([cx + sgn * 13 * S - S, sh - S, cx + sgn * 13 * S + S, sh + S], fill=INK)
        else:
            d.line([(cx + sgn * 4 * S, sh), (cx + sgn * 7 * S, sh + 8 * S), (cx + sgn * 7 * S, sh + 14 * S)], fill=INK, width=lw)
    return im.resize((W, H), Image.LANCZOS)


def main():
    out = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'wuxia', 'a2', 'qishi.png')
    sheet = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
    sheet.paste(frame(False), (0, 0))
    sheet.paste(frame(True), (W, 0))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out, optimize=True)
    print('wrote', os.path.normpath(out))


if __name__ == '__main__':
    main()
