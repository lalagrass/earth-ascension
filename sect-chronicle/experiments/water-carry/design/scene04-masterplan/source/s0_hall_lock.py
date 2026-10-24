# R1 fix: S0 main hall = the SAME S1/S2 hall (identical footprint, plinth, stairs, door), aged into a ruin.
# Run after compose.py (which writes out/S0-clean.jpg from the raw edit pass). Steps: 1) cover the old oversized
# S0-edit hall with generated wild-ground texture (raw/gen-s0-hall-ground.jpg, colour-matched to S0 grass);
# 2) paste the S1 hall silhouette, desaturated/darkened, with the two roof holes transplanted from the S0 edit.
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance
import numpy as np
import os
O=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
s0=Image.open(os.path.join(O,'out/S0-clean.jpg')).convert('RGB'); s1=Image.open(os.path.join(O,'out/S1-clean.jpg')).convert('RGB')
W,H=s0.size
def mask(poly,fe):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255); return m.filter(ImageFilter.GaussianBlur(fe))
# 1 ground fill over old oversized hall
g=Image.open(os.path.join(O,'raw/gen-s0-hall-ground.jpg')).convert('RGB').crop((240,240,820,660)).resize((340,246),Image.LANCZOS)
a=np.asarray(g).astype(float); ref=np.asarray(s0.crop((560,280,700,340))).astype(float)
a=(a-a.mean((0,1)))/a.std((0,1))*ref.std((0,1))*0.9+ref.mean((0,1))
g=Image.fromarray(np.clip(a,0,255).astype('uint8'))
fill=s0.copy(); fill.paste(g,(675,90))
old=[(690,160),(760,100),(800,92),(870,118),(998,182),(995,260),(990,300),(960,318),(870,330),(790,310),(725,305),(712,270),(700,220)]
out=Image.composite(fill,s0,mask(old,6))
# 2 same hall as S1/S2 (identical footprint/door), aged
hall=[(767,193),(790,182),(822,168),(898,141),(912,147),(955,178),(967,186),(960,203),(961,228),(969,236),(968,262),(925,277),(924,284),(884,286),(846,290),(836,282),(790,262),(776,250),(774,205)]
h=s1.copy(); h=ImageEnhance.Color(h).enhance(0.6); h=ImageEnhance.Brightness(h).enhance(0.88)
hn=np.asarray(h).astype(float); tint=np.array([95,85,60.]); hn=hn*0.85+tint*0.15; h=Image.fromarray(hn.astype('uint8'))
# roof holes transplanted from the original S0 ruin painting, scaled to new roof
src0=s0
d=ImageDraw.Draw(h)
for (box,dst) in [((758,135,802,172),(800,185)),((822,168,872,218),(880,160))]:
    p=src0.crop(box); p=p.resize((int(p.width*0.65),int(p.height*0.65)),Image.LANCZOS)
    pm=Image.new('L',p.size,0); ImageDraw.Draw(pm).ellipse((2,2,p.width-3,p.height-3),fill=255); pm=pm.filter(ImageFilter.GaussianBlur(2))
    h.paste(p,dst,pm)
hm=mask(hall,1.2)
out=Image.composite(h,out,hm)
out.save(os.path.join(O,'out/S0-clean.jpg'),quality=92)
