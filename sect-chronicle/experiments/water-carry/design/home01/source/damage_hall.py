# HOME-01：S0 破道館＝同一張正堂（同基座、同朝向、同石階入口），只畫出破損狀態：屋頂破洞露椽、瓦片缺落、
# 欄杆斷、牆面褪色、基座長苔。決定性（固定種子）；只用於素材製作。
import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W, H = im.size
rng = np.random.default_rng(3091)
a = im.split()[3]
rgb = im.convert('RGB')
rgb = ImageEnhance.Color(rgb).enhance(0.62)  # 褪色
rgb = Image.blend(rgb, Image.new('RGB', im.size, (176, 160, 128)), 0.12)  # 風化暖灰
d = ImageDraw.Draw(rgb)
def hole(cx, cy, rx, ry, seed):
    r = np.random.default_rng(seed)
    pts = [(cx + rx * math.cos(t) * r.uniform(.6, 1.15), cy + ry * math.sin(t) * r.uniform(.6, 1.15)) for t in np.linspace(0, 2 * math.pi, 14, endpoint=False)]
    d.polygon(pts, fill=(52, 40, 30))
    for k in range(4):  # 外露椽子
        x = cx - rx + (k + .5) * 2 * rx / 4
        d.line([(x - ry * .5, cy - ry * .9), (x + ry * .5, cy + ry * .9)], fill=(120, 88, 56), width=3)
    for k in range(10):  # 鬆脫瓦片
        x, y = cx + r.uniform(-rx * 1.6, rx * 1.6), cy + r.uniform(-ry * 1.4, ry * 1.6)
        d.rectangle([x, y, x + r.uniform(4, 8), y + 3], fill=(88, 86, 82))
hole(262, 92, 30, 18, 1); hole(330, 150, 22, 13, 2); hole(110, 160, 14, 9, 3)
# 斷欄杆：前廊右側欄杆缺一段（畫成地板色）
d.polygon([(330, 210), (372, 196), (372, 214), (330, 230)], fill=(118, 96, 70))
d.line([(336, 222), (352, 204)], fill=(92, 70, 48), width=3)
# 基座裂縫
for i in range(5):
    x, y = rng.uniform(40, 420), rng.uniform(250, 340); pts = [(x, y)]
    for k in range(5): x += rng.uniform(-6, 6); y += rng.uniform(3, 7); pts.append((x, y))
    d.line(pts, fill=(70, 62, 52), width=1)
# 基座苔痕
moss = Image.new('L', im.size, 0); dm = ImageDraw.Draw(moss)
for i in range(260):
    x, y = rng.uniform(10, W - 10), rng.uniform(300, H - 6); r = rng.uniform(3, 8)
    dm.ellipse([x - r, y - r * .6, x + r, y + r * .6], fill=int(rng.uniform(80, 200)))
moss = moss.filter(ImageFilter.GaussianBlur(2))
rgb = Image.composite(Image.new('RGB', im.size, (104, 120, 64)), rgb, moss)
out_im = rgb.convert('RGBA'); out_im.putalpha(a)
out_im.save(out)
print('ok', out, im.size)
