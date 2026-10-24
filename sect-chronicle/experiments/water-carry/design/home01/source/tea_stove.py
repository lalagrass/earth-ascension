# HOME-01：S0 茶座小件（石座＋陶爐＋鐵壺），水彩感手繪；決定性。只用於素材製作。
import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]; W, H = 120, 96
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.ellipse([8, 70, 112, 92], fill=(60, 52, 40, 70))  # 腳底陰影
d.ellipse([14, 58, 58, 80], fill=(150, 142, 126, 255)); d.ellipse([16, 56, 56, 72], fill=(176, 168, 150, 255))  # 石座
d.polygon([(66, 82), (100, 82), (96, 50), (70, 50)], fill=(156, 98, 64, 255))  # 陶爐
d.ellipse([68, 44, 98, 56], fill=(120, 74, 48, 255)); d.rectangle([78, 66, 88, 76], fill=(232, 140, 60, 255))  # 爐口火光
d.ellipse([70, 26, 96, 48], fill=(58, 56, 54, 255)); d.line([(94, 34), (104, 28)], fill=(58, 56, 54, 255), width=3)  # 鐵壺＋壺嘴
d.arc([74, 16, 92, 34], 200, 340, fill=(40, 38, 36, 255), width=2)
im = im.filter(ImageFilter.SMOOTH_MORE)
im.save(out); print('ok', out)
