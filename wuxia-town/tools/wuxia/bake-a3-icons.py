#!/usr/bin/env python3
# 武俠小鎮 A3（#574）：無言互動的 16px 圖示（純程式畫，不用 emoji 字型、無外部素材）。
# 輸出 public/wuxia/a3/icons.png：3 列 × 12 格，每格 16×16。
#   第 0 列 互動：寒暄 閒聊 打聽 說傳聞 吹噓 請教 指點 抱怨 安慰 道謝 道歉 挑釁
#   第 1 列 話題：武藝(⚔) 吃食(碗) 銀錢(錢) 野獸(山豬) 山賊(匕首) 心事(心) 家常(屋) 某人(人) 傳聞(卷軸)
#   第 2 列 反應：高興 生氣 難過 害羞 驚訝
# 順序與 src/wuxia/SocialLayer.tsx 的 ICON_COL 一致。重產：python3 tools/wuxia/bake-a3-icons.py
import os
from PIL import Image, ImageDraw

S = 8
C = 16 * S
INK = (43, 33, 25, 255)
PAPER = (250, 244, 228, 255)
RED = (179, 52, 42, 255)
GOLD = (201, 162, 39, 255)
TEAL = (47, 125, 115, 255)
BLUE = (60, 90, 150, 255)
GRAY = (120, 112, 100, 255)
PINK = (222, 120, 130, 255)
FACE = (246, 214, 120, 255)


def P(*xy):
    return [v * S for v in xy]


def badge(d, color):
    d.ellipse(P(0.6, 0.6, 15.4, 15.4), fill=color, outline=INK, width=S)


def lw(n=1.4):
    return int(n * S)


def ia(d, k):
    W = PAPER
    if k == 'greet':
        badge(d, TEAL)
        d.rectangle(P(6, 6, 10, 12), fill=W)
        for x in (6, 7.4, 8.8):
            d.rectangle(P(x, 3.5, x + 1.1, 7), fill=W)
        d.rectangle(P(10, 7, 11.4, 9.5), fill=W)
    elif k == 'chat':
        badge(d, TEAL)
        d.rounded_rectangle(P(2.8, 3.5, 10.5, 9), radius=2 * S, fill=W)
        d.polygon(P(4.5, 8.5, 4, 11, 7, 8.8), fill=W)
        d.rounded_rectangle(P(7.5, 7.5, 13.2, 12), radius=2 * S, fill=W, outline=INK, width=S // 2)
    elif k == 'inquire':
        badge(d, BLUE)
        d.arc(P(5, 3, 11, 9), 180, 90, fill=W, width=lw(1.8))
        d.line(P(8, 9, 8, 10.6), fill=W, width=lw(1.8))
        d.ellipse(P(7.1, 11.6, 8.9, 13.4), fill=W)
    elif k == 'rumor':
        badge(d, BLUE)
        d.ellipse(P(3.5, 4, 8.5, 12), outline=W, width=lw(1.4))
        for r in (2.2, 4.2):
            d.arc(P(8 - r, 8 - r, 8 + r + 2, 8 + r), -50, 50, fill=W, width=lw(1.1))
    elif k == 'boast':
        badge(d, GOLD)
        d.polygon(P(8, 2.6, 9.6, 6.6, 13.6, 6.8, 10.5, 9.4, 11.6, 13.4, 8, 11.1, 4.4, 13.4, 5.5, 9.4, 2.4, 6.8, 6.4, 6.6), fill=W)
    elif k == 'ask_advice':
        badge(d, BLUE)
        d.rectangle(P(3.5, 5, 12.5, 12), fill=W)
        d.line(P(8, 5, 8, 12), fill=INK, width=S // 2 + 1)
        d.arc(P(9, 1.6, 13, 5.6), 180, 70, fill=GOLD, width=lw(1.2))
    elif k == 'instruct':
        badge(d, RED)
        d.rectangle(P(7, 3, 9, 10), fill=W)
        d.ellipse(P(7, 11.4, 9, 13.4), fill=W)
    elif k == 'complain':
        badge(d, GRAY)
        for cx, cy, r in ((6, 8, 2.6), (9.5, 7, 3), (11.6, 9, 2)):
            d.ellipse(P(cx - r, cy - r, cx + r, cy + r), fill=W)
        d.line(P(6, 11, 7.5, 13, 9, 11.5, 10.5, 13.6), fill=INK, width=S)
    elif k == 'comfort':
        badge(d, PINK)
        d.ellipse(P(3.4, 4.4, 8.4, 9.4), fill=W)
        d.ellipse(P(7.6, 4.4, 12.6, 9.4), fill=W)
        d.polygon(P(3.8, 8, 12.2, 8, 8, 13), fill=W)
    elif k == 'thank':
        badge(d, GOLD)
        d.ellipse(P(4, 5.5, 9.5, 11), fill=W, outline=INK, width=S // 2)
        d.rectangle(P(8, 4.8, 12, 11.6), fill=W, outline=INK, width=S // 2)
    elif k == 'apologize':
        badge(d, GRAY)
        d.ellipse(P(5.6, 3, 10.4, 7.8), fill=W)
        d.polygon(P(4, 13.5, 12, 13.5, 10.4, 8.4, 5.6, 8.4), fill=W)
        d.line(P(4.2, 7.2, 3, 9.6), fill=W, width=S)
    elif k == 'provoke':
        badge(d, RED)
        d.polygon(P(9.5, 2.4, 4.4, 9, 7.6, 9, 6.4, 13.6, 11.8, 6.8, 8.6, 6.8), fill=GOLD, outline=W)


def topic(d, k):
    if k == 'art':
        d.line(P(3, 3, 13, 13), fill=GRAY, width=lw(1.6))
        d.line(P(13, 3, 3, 13), fill=GRAY, width=lw(1.6))
        d.line(P(2.5, 10.5, 5.5, 13.5), fill=INK, width=lw(1.6))
        d.line(P(13.5, 10.5, 10.5, 13.5), fill=INK, width=lw(1.6))
    elif k == 'food':
        d.pieslice(P(2.5, 3, 13.5, 14), 0, 180, fill=PAPER, outline=INK, width=S)
        d.ellipse(P(4, 5.6, 12, 9.6), fill=(255, 255, 255, 255), outline=INK, width=S // 2)
        d.line(P(9, 2, 12, 6.5), fill=INK, width=S)
    elif k == 'money':
        d.ellipse(P(2, 2, 14, 14), fill=GOLD, outline=INK, width=S)
        d.rectangle(P(6.4, 6.4, 9.6, 9.6), fill=PAPER, outline=INK, width=S // 2)
    elif k == 'beast':
        d.ellipse(P(2.5, 4, 13.5, 13.5), fill=(120, 84, 60, 255), outline=INK, width=S)
        d.polygon(P(3, 5.5, 4, 1.8, 6.4, 4.4), fill=(120, 84, 60, 255), outline=INK)
        d.polygon(P(13, 5.5, 12, 1.8, 9.6, 4.4), fill=(120, 84, 60, 255), outline=INK)
        d.ellipse(P(5.6, 9, 10.4, 12.6), fill=PINK, outline=INK, width=S // 2)
        d.line(P(5, 11, 3.6, 8.6), fill=PAPER, width=S)
        d.line(P(11, 11, 12.4, 8.6), fill=PAPER, width=S)
    elif k == 'bandit':
        d.polygon(P(8, 1.6, 10, 4, 9.2, 10, 6.8, 10, 6, 4), fill=(210, 210, 215, 255), outline=INK)
        d.rectangle(P(4.6, 10, 11.4, 11.4), fill=INK)
        d.rectangle(P(7, 11.4, 9, 14.6), fill=RED)
    elif k == 'love':
        d.ellipse(P(2.4, 3.4, 8.6, 9.6), fill=RED)
        d.ellipse(P(7.4, 3.4, 13.6, 9.6), fill=RED)
        d.polygon(P(2.9, 7.6, 13.1, 7.6, 8, 14), fill=RED)
    elif k == 'home':
        d.polygon(P(1.6, 8, 8, 2, 14.4, 8), fill=RED, outline=INK)
        d.rectangle(P(3.6, 8, 12.4, 14), fill=PAPER, outline=INK, width=S)
        d.rectangle(P(7, 10, 9, 14), fill=INK)
    elif k == 'person':
        d.ellipse(P(5.2, 2, 10.8, 7.6), fill=PAPER, outline=INK, width=S)
        d.pieslice(P(2.6, 8, 13.4, 19), 180, 360, fill=TEAL, outline=INK, width=S)
    elif k == 'rumor':
        d.rectangle(P(3.4, 3, 12.6, 13), fill=PAPER, outline=INK, width=S)
        d.ellipse(P(2, 2, 5, 5), fill=(160, 120, 70, 255), outline=INK, width=S // 2)
        d.ellipse(P(11, 11, 14, 14), fill=(160, 120, 70, 255), outline=INK, width=S // 2)
        for y in (6, 8, 10):
            d.line(P(5.4, y, 10.6, y), fill=INK, width=S // 2 + 1)


def face(d, k):
    col = {'angry': (238, 140, 110, 255), 'shy': FACE}.get(k, FACE)
    d.ellipse(P(1, 1, 15, 15), fill=col, outline=INK, width=S)
    eye = lambda x, y: d.ellipse(P(x - 0.9, y - 0.9, x + 0.9, y + 0.9), fill=INK)
    if k == 'happy':
        d.arc(P(4, 5, 7, 8), 180, 360, fill=INK, width=S)
        d.arc(P(9, 5, 12, 8), 180, 360, fill=INK, width=S)
        d.chord(P(4.5, 7.5, 11.5, 13), 0, 180, fill=INK)
    elif k == 'angry':
        d.line(P(4, 4.6, 7, 6.2), fill=INK, width=S)
        d.line(P(12, 4.6, 9, 6.2), fill=INK, width=S)
        eye(5.8, 7.4)
        eye(10.2, 7.4)
        d.arc(P(5, 10, 11, 14), 200, 340, fill=INK, width=S)
    elif k == 'sad':
        eye(5.6, 6.6)
        eye(10.4, 6.6)
        d.arc(P(5, 10, 11, 14.4), 200, 340, fill=INK, width=S)
        d.polygon(P(11, 8, 11.8, 10.4, 10.2, 10.4), fill=BLUE)
    elif k == 'shy':
        d.line(P(4.4, 6.6, 6.8, 6.6), fill=INK, width=S)
        d.line(P(9.2, 6.6, 11.6, 6.6), fill=INK, width=S)
        d.ellipse(P(2.6, 8, 5.4, 10), fill=PINK)
        d.ellipse(P(10.6, 8, 13.4, 10), fill=PINK)
        d.arc(P(6, 9, 10, 12), 20, 160, fill=INK, width=S)
    elif k == 'surprised':
        d.ellipse(P(4.4, 4.6, 7, 7.6), fill=PAPER, outline=INK, width=S // 2)
        d.ellipse(P(9, 4.6, 11.6, 7.6), fill=PAPER, outline=INK, width=S // 2)
        d.ellipse(P(6.6, 9.4, 9.4, 13), fill=INK)


ROWS = [
    ['greet', 'chat', 'inquire', 'rumor', 'boast', 'ask_advice', 'instruct', 'complain', 'comfort', 'thank', 'apologize', 'provoke'],
    ['art', 'food', 'money', 'beast', 'bandit', 'love', 'home', 'person', 'rumor'],
    ['happy', 'angry', 'sad', 'shy', 'surprised'],
]
FNS = [ia, topic, face]
sheet = Image.new('RGBA', (12 * 16, 3 * 16), (0, 0, 0, 0))
for r, row in enumerate(ROWS):
    for c, k in enumerate(row):
        big = Image.new('RGBA', (C, C), (0, 0, 0, 0))
        FNS[r](ImageDraw.Draw(big), k)
        sheet.paste(big.resize((16, 16), Image.LANCZOS), (c * 16, r * 16))
out = os.path.join(os.path.dirname(__file__), '../../public/wuxia/a3/icons.png')
sheet.save(out)
sheet.resize((12 * 64, 3 * 64), Image.NEAREST).save('/tmp/a3-icons-preview.png')
print('wrote', os.path.normpath(out))
