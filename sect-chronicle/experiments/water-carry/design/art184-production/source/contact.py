# 聯絡表：每件素材放在棋盤格上（僅供檢視透明度；素材本身為真 alpha）
import json
from PIL import Image, ImageDraw, ImageFont
man = json.load(open('export/manifest-raw.json'))
cell = 220; cols = 8; rows = (len(man)+cols-1)//cols
sheet = Image.new('RGB',(cols*cell, rows*(cell+22)),'white')
font = ImageFont.load_default(14)
chk = Image.new('RGB',(cell,cell))
d = ImageDraw.Draw(chk)
for y in range(0,cell,16):
    for x in range(0,cell,16): d.rectangle([x,y,x+15,y+15], fill=(200,200,200) if (x+y)//16%2 else (240,240,240))
for i,(k,v) in enumerate(man.items()):
    im = Image.open(v['file']); im.thumbnail((cell-10,cell-10))
    c = chk.copy(); c.paste(im,((cell-im.width)//2,(cell-im.height)//2),im)
    x,y = i%cols*cell, i//cols*(cell+22)
    sheet.paste(c,(x,y)); ImageDraw.Draw(sheet).text((x+4,y+cell+3),f"{k} {v['size'][0]}x{v['size'][1]}",fill='black',font=font)
sheet.save('export/sprites-contact-sheet.png')
