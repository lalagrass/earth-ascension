# 1) ground.jpg 切成兩張可平鋪地面材質（ground layer，不需 alpha）
# 2) 以真 alpha 素材做一張桌面概念合成（標「概念、未接線」）
import json, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
g = Image.open('raw/ground.jpg').convert('RGB'); W,H = g.size
def tileable(im):
    a = np.asarray(im).astype(float); h,w = a.shape[:2]
    s = np.roll(np.roll(a,h//2,0),w//2,1)
    yy,xx = np.mgrid[0:h,0:w]; m = np.minimum(np.minimum(xx,w-1-xx)/(w*0.25), np.minimum(yy,h-1-yy)/(h*0.25)).clip(0,1)[...,None]
    return Image.fromarray((a*m+s*(1-m)).astype(np.uint8))
flag = tileable(g.crop((0,0,int(W*0.38),H)).resize((256,256)))
dirt = tileable(g.crop((int(W*0.56),0,int(W*0.92),H)).resize((256,256)))
flag.save('ground/flagstone-tile-256.png'); dirt.save('ground/dirt-path-tile-256.png')
# 顯示尺度：場景單位高度（依 demo 腳底尺度，人物約 64 單位高；LP 肩點 -45.6）
TARGET = {'hero':64,'senior':72,'dojo_main_hall':190,'dojo_side_house':150,'dojo_gate':120,'court_wall':60,'water_vat':40,
 'stone_mill':40,'woodpile':40,'herb_rack':62,'pine_a':210,'pine_b':200,'bamboo_clump':190,'broadleaf_tree':190,'boulder_l':62,
 'boulder_m':46,'boulder_s':34,'path_edge_stones':22,'spring_pool':70,'creek_bank':62,'fern':40}
man = json.load(open('export/manifest-raw.json'))
idle_h = {'hero':man['hero_front_idle']['size'][1],'senior':man['senior_front_idle']['size'][1]}
for k,v in man.items():
    who = k.split('_')[0]
    if who in idle_h: sc = TARGET[who]*(0.6 if k.endswith('herb') else 1)/v['size'][1]  # 站姿頭頂到腳底＝角色高；蹲姿估 0.6 身高（原圖各姿態生成尺寸不同，需各自正規化）
    else: sc = TARGET[k]/v['size'][1]
    v['display_scale'] = round(sc,4); v['display_size'] = [round(v['size'][0]*sc,1), round(v['size'][1]*sc,1)]
json.dump(man, open('export/manifest.json','w'), ensure_ascii=False, indent=1)
# 合成：1600×900 桌面視窗，相機 zoom 1.5
Z=1.5; CW,CH=1600,900
rng=np.random.default_rng(7); n=rng.normal(0,1,(CH//4,CW//4))
base=Image.fromarray(np.dstack([110+n*6,128+n*8,82+n*5]).clip(0,255).astype(np.uint8)).resize((CW,CH),Image.BICUBIC).filter(ImageFilter.GaussianBlur(3))
def tiled(t): 
    out=Image.new('RGB',(CW,CH)); 
    for y in range(0,CH,t.height):
        for x in range(0,CW,t.width): out.paste(t,(x,y))
    return out
canvas=base.copy()
path=[(1600,820),(1250,760),(980,640),(760,600),(560,520),(470,430)]
m=Image.new('L',(CW,CH),0); ImageDraw.Draw(m).line(path,fill=255,width=70,joint='curve'); m=m.filter(ImageFilter.GaussianBlur(6))
canvas.paste(tiled(dirt),(0,0),m)
m=Image.new('L',(CW,CH),0); ImageDraw.Draw(m).rounded_rectangle((120,150,720,470),40,fill=255); m=m.filter(ImageFilter.GaussianBlur(4))
canvas.paste(tiled(flag),(0,0),m)
canvas=canvas.convert('RGBA')
P=[('dojo_main_hall',300,330),('dojo_side_house',620,300),('herb_rack',190,430),('water_vat',540,440),('stone_mill',640,450),('woodpile',700,380),
   ('court_wall',230,500),('dojo_gate',470,500),('court_wall',680,505),
   ('pine_a',80,560),('bamboo_clump',880,520),('boulder_l',760,700),('path_edge_stones',900,690),('fern',1040,720),('pine_b',1150,640),
   ('broadleaf_tree',1450,600),('boulder_m',1330,850),('boulder_s',1100,820),('creek_bank',1480,880),('spring_pool',1520,780),('bamboo_clump',1300,560),
   ('senior_side_carry',1060,690),('hero_side_carry',1230,770),('hero_side_herb',600,420),('senior_front_idle',400,440)]
P.sort(key=lambda p:p[2])  # y-sort：腳底越低越前
for k,x,y in P:
    v=man[k]; sc=v['display_scale']*Z
    im=Image.open(v['file']); im=im.resize((max(1,round(im.width*sc)),max(1,round(im.height*sc))),Image.LANCZOS)
    ax,ay=round(v['anchor'][0]*sc),round(v['anchor'][1]*sc)
    sh=Image.new('RGBA',canvas.size,(0,0,0,0)); ImageDraw.Draw(sh).ellipse((x-im.width*0.35,y-6,x+im.width*0.35,y+6),fill=(30,30,20,60))
    canvas=Image.alpha_composite(canvas,sh); canvas.alpha_composite(im,(x-ax,y-ay))
d=ImageDraw.Draw(canvas); f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',22)
d.rectangle((0,0,CW,40),fill=(0,0,0,150)); d.text((14,8),'D35 概念合成（concept, NOT wired）— 真 alpha 素材＋y-sort；zoom 1.5；非 runtime、非 1600×1350 實際地圖',fill='white',font=f)
canvas.convert('RGB').save('export/desktop-composite-concept-v2.png')
