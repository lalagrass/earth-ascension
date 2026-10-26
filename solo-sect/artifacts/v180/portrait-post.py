# PB-15/16/18 批次後製（不重畫）：去背→背景壓淡、人物提亮；人物外圍深色描邊；臉部頭像。
# 用法：/tmp/rb/bin/python artifacts/v180/portrait-post.py  （需 rembg；輸出 assets/portraits/v2/post/）
import sys, glob, os
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
from rembg import remove, new_session
SRC, OUT = 'assets/portraits', 'assets/portraits/v2/post'
os.makedirs(OUT, exist_ok=True)
ses = new_session('isnet-anime')
BG = (236, 226, 204)  # 門派宣紙底色
for f in sorted(glob.glob(f'{SRC}/*.png')):
    k = os.path.basename(f)[:-4]; im = Image.open(f).convert('RGB')
    a = remove(im, session=ses, only_mask=True).convert('L').point(lambda v: 255 if v > 110 else 0).filter(ImageFilter.MedianFilter(5))
    # PB-15：背景壓淡（灰階化＋與宣紙底混 70%）、人物提亮
    bg = Image.blend(ImageEnhance.Color(im).enhance(0.25), Image.new('RGB', im.size, BG), 0.7)
    fig = ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(1.08)).enhance(1.06)
    # PB-16：外圍描邊 5px
    ring = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(11)), a)
    out = Image.composite(fig, bg, a); out = Image.composite(Image.new('RGB', im.size, (38, 26, 18)), out, ring)
    out.save(f'{OUT}/{k}.png', optimize=True)
    # PB-18：臉部頭像——取人物輪廓最上方 40% 的寬度中心，正方形裁切
    bb = a.getbbox() or (0, 0, *im.size); x0, y0, x1, y1 = bb; h = y1 - y0
    band = a.crop((0, y0 + int(h * .03), im.size[0], y0 + int(h * .15))).getbbox()
    cx = (band[0] + band[2]) / 2 if band else (x0 + x1) / 2
    side = int(min(300, max(150, (band[2] - band[0]) * 1.7 if band else 220)))
    top = max(0, y0 - int(side * .04)); left = int(max(0, min(im.size[0] - side, cx - side / 2)))
    out.crop((left, top, left + side, top + side)).resize((128, 128), Image.LANCZOS).save(f'{OUT}/{k}-head.png', optimize=True)
    print(k, bb, side)
