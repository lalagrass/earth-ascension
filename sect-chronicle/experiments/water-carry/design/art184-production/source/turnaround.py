# 雙人同尺度對照：同一 display_scale×4，底線對齊腳底錨點
import json
from PIL import Image, ImageDraw, ImageFont
man=json.load(open('export/manifest.json')); Z=4
rows=[['hero_front_idle','hero_side_idle','hero_back_idle','hero_side_carry','hero_back_carry','hero_side_herb'],
      ['senior_front_idle','senior_side_idle','senior_back_idle','senior_side_carry','senior_back_carry','senior_side_herb']]
cw,ch=300,330; img=Image.new('RGB',(cw*6,ch*2+50),(236,232,220)); d=ImageDraw.Draw(img)
f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',18)
for r,row in enumerate(rows):
    base=50+r*ch+ch-30
    d.line((0,base,cw*6,base),fill=(150,140,120)); d.line((0,base-64*Z if r==0 else base-72*Z,cw*6,base-64*Z if r==0 else base-72*Z),fill=(200,180,170))
    for c,k in enumerate(row):
        v=man[k]; s=v['display_scale']*Z; im=Image.open(v['file']); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
        img.paste(im,(c*cw+cw//2-round(v['anchor'][0]*s), base-round(v['anchor'][1]*s)),im)
        d.text((c*cw+8,base+4),k,fill=(60,50,40),font=f)
d.text((10,10),'雙人關鍵姿態同尺度對照（×4；主角 64／熟手 72 場景單位；底線＝腳底錨點）— 概念、未接線',fill=(40,30,20),font=f)
img.save('export/duo-turnaround-scale-v2.png')
