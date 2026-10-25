"""Offline design drawings only; no game state, simulation, or runtime imports."""
from pathlib import Path
import json, math, html
P=Path(__file__).resolve().parent
fac=[
 ('hall','大廳／教學',1000,100,220,140,[1110,240],['ruin','basic','built'],0),
 ('dorm','宿舍甲 · 4 床',770,100,190,110,[865,210],['wild','built','built'],4),
 ('store','倉庫／備料',690,240,150,60,[800,300],['pile','basic','built'],0),
 ('kitchen','膳房／水缸',690,340,150,100,[800,440],['camp','basic','built'],0),
 ('dining','餐敘院 · 8 座',910,340,150,100,None,['camp','basic','built'],0),
 ('annex','側舍 · 4 床',1000,500,180,120,[1090,620],['wild','wild','built'],4),
 ('quiet','靜室／書架',1260,100,130,100,[1325,200],['wild','wild','built'],0),
 ('yard','外功場 · 4 位',1090,310,170,130,None,['basic','basic','built'],0),
 ('garden','菜園 · 2 位',1250,520,170,100,None,['wild','basic','built'],0),
 ('herb','藥園／晾架 · 2 位',1250,660,170,80,None,['wild','basic','built'],0),
]
fac=[dict(id=i,name=n,rect=[x,y,w,h],door=d,stages=dict(zip(['S0','S1','S2'],s)),beds=b,solid=i in ['hall','dorm','store','kitchen','annex','quiet']) for i,n,x,y,w,h,d,s,b in fac]
paths={
 'life':dict(name='生活：床→餐敘→練功',color='#2b826f',width=36,points=[[865,210],[865,225],[970,225],[970,280],[970,330],[990,360],[990,460],[1100,460],[1100,410]]),
 'haul':dict(name='搬運：潭→缸／倉→工地',color='#2779ad',width=32,points=[[600,920],[650,940],[700,890],[740,820],[800,760],[870,710],[920,650],[940,570],[900,500],[800,480],[800,440]]),
 'visitor':dict(name='訪客：村路→南口→接待',color='#b48725',width=48,points=[[1480,980],[1450,900],[1450,800],[1300,780],[1160,740],[1020,720],[940,680],[970,640],[970,470],[970,280],[1110,280],[1110,240]]),
 'enemy':dict(name='敵人：北棲地→外帶止追線',color='#b64b40',width=48,points=[[1480,80],[1530,160],[1550,230],[1540,450],[1480,500]]),
 'retreat':dict(name='撤退：守點→內院安全位',color='#7a64a7',width=48,points=[[1340,420],[1260,450],[1200,470],[890,470],[890,300],[940,300]]),
 'wood':dict(name='柴林→倉庫',color='#2779ad',width=32,points=[[430,160],[500,160],[560,220],[620,280],[680,320],[800,320],[800,300]]),
 'build':dict(name='倉庫→側舍料堆',color='#2779ad',width=36,points=[[800,300],[800,320],[680,320],[680,460],[900,460],[970,470],[970,640],[1090,640]]),
 'garden':dict(name='膳房→菜藥園',color='#2b826f',width=36,points=[[800,440],[800,460],[900,460],[970,470],[1200,470],[1220,570],[1220,700]]),
 'north':dict(name='院落→山門→遠征',color='#b48725',width=48,points=[[1110,280],[1240,280],[1240,225],[1430,225],[1450,160],[1480,100],[1480,0]]),
 'bridge':dict(name='橋→長路接點',color='#2779ad',width=32,points=[[280,760],[370,710],[540,710],[650,740],[800,760]]),
 'stone':dict(name='碎石→西採集支線',color='#2779ad',width=32,points=[[480,400],[540,400],[600,340],[620,280]]),
 'quiet':dict(name='院落→靜室',color='#2b826f',width=32,points=[[1110,280],[1240,280],[1240,225],[1325,225],[1325,200]]),
}
stations=[
 ('hall.teach',1110,270,'授課 1+4'),('hall.greet',1170,270,'接待 2'),('store.drop',800,315,'收料 1'),
 ('kitchen.cook',760,460,'灶 1'),('kitchen.vat',835,460,'缸 1'),('annex.drop',1090,640,'施工 1+1'),
 ('garden.work',1230,570,'菜 1'),('garden.work2',1230,600,'菜 2'),('herb.work',1230,700,'藥 1'),('herb.work2',1230,730,'藥 2'),('water.take',600,920,'取水 1'),
 ('guard.front',1340,420,'守點 A'),('guard.flank',1430,350,'守點 B'),('safe',940,300,'集合'),('quiet.read',1325,220,'研讀 1')]
for i,(x,y) in enumerate([(1100,345),(1190,345),(1100,410),(1190,410)],1):stations.append((f'yard.{i}',x,y,f'樁 {i}'))
for i,(x,y) in enumerate([(930,360),(960,360),(990,360),(1020,360),(930,420),(960,420),(990,420),(1020,420)],1):stations.append((f'dining.{i}',x,y,f'座 {i}'))
for bid,x0,y0 in [('dorm',790,130),('annex',1020,535)]:
 for i in range(4):stations.append((f'{bid}.bed.{i+1}',x0+i*40,y0,'床側'))
exp={
 'main':[[1480,800],[1510,720],[1490,630],[1580,560],[1660,520],[1740,480],[1830,460],[1870,440],[1940,440],[2000,400],[2070,300],[2150,230],[2200,150]],
 'side':[[1740,480],[1770,360],[1860,320],[1900,360],[1870,440]],
 'points':[dict(id='forest',pos=[1490,630],name='E1 林緣 · 棲地'),dict(id='camp',pos=[1660,520],name='休整點 · 運糧才補給'),dict(id='valley',pos=[1770,480],name='E2 溪谷 · 繞獸側路'),dict(id='bridge',pos=[1905,440],name='窄橋 · 單列共用'),dict(id='cave',pos=[2200,150],name='E3 古洞 · 救人／保糧')],
 'bridge':dict(rect=[1870,425,70,30],capacity=1,queues=[[1840,440],[1970,420]])}
data=dict(version='design-1',status='planning-only',units='DU; proposed 1 DU = 2 world units; no runtime coordinate compatibility',world=[2400,1800],home=dict(origin=[0,800],size=[1600,1000],facilities=fac,paths=paths,stations=[dict(id=i,pos=[x,y],label=n) for i,x,y,n in stations]),expedition=exp)
(P/'layout.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def e(s):return html.escape(str(s))
def poly(pts):return ' '.join(f'{x},{y}' for x,y in pts)
def text(x,y,t,size=17,fill='#293f3c',anchor='start'):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}">{e(t)}</text>'
def start(w,h,title):return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{e(title)}"><title>{e(title)}</title><style>text{{font-family:"PingFang TC","Noto Sans CJK TC",sans-serif}} .route{{fill:none;stroke-linejoin:round;stroke-linecap:round}} .station{{fill:#fffaf0;stroke:#425e54;stroke-width:2}}</style><rect width="100%" height="100%" fill="#f6f1e4"/>'''
def home(stage='S2',route=True,labels=True):
 a=['<g id="home-terrain">','<path d="M50 30 Q250 10 390 100 L560 350 L650 700 L580 960 L50 980Z" fill="#dce5cf"/>','<path d="M0 400 Q120 260 200 380 L300 650 L170 980 L0 1000Z" fill="#c5d6bd"/>','<path d="M170 80 Q235 160 200 340 T290 460 L350 570 L430 710 L500 810 L540 1000" fill="none" stroke="#9cc5c6" stroke-width="55"/>','<ellipse cx="500" cy="810" rx="155" ry="100" fill="#9cc5c6"/>','<path d="M50 40 L160 40 L250 180 L190 240 L80 200Z" fill="#ccc9b8"/>','<path d="M1030 790 L1130 830 L1220 930 L1030 960 L950 850Z" fill="#ccc9b8"/>','<rect x="675" y="60" width="740" height="595" rx="60" fill="#eae4ce"/>','<rect x="1280" y="250" width="290" height="210" rx="24" fill="#ecd5c4"/>']
 for r in paths.values():a.append(f'<polyline class="route" points="{poly(r["points"])}" stroke="#d7c7a7" stroke-width="{r["width"]}"/>')
 a+=['<path d="M370 710 L540 710" stroke="#926e48" stroke-width="30"/>','<path d="M370 710 L540 710" stroke="#d4b683" stroke-width="22"/>','<path d="M600 905 L600 935" stroke="#817e70" stroke-width="32"/>','</g>']
 a.append('<g id="facilities">')
 for f in fac:
  x,y,w,h=f['rect'];s=f['stages'][stage];col={'wild':'none','ruin':'#cfb498','camp':'#e7d5ae','pile':'#c9b996','basic':'#d1c49c','built':'#b7c9ac'}[s]
  a.append(f'<g id="{f["id"]}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{col}" stroke="#687f69" stroke-width="2" stroke-dasharray="{8 if s=="wild" else 0}"/>')
  if f['solid'] and s!='wild':a.append(f'<path d="M{x+8} {y+10} L{x+w-8} {y+10}" stroke="#607064" stroke-width="10"/>')
  if f['door']:
   dx,dy=f['door'];a.append(f'<path d="M{dx-14} {dy} H{dx+14}" stroke="#f6f1e4" stroke-width="6"/><path d="M{dx-14} {dy+5} H{dx+14}" stroke="#a16f40" stroke-width="3"/>')
  if labels:a.extend([text(x+w/2,y+h/2,f['name'],16,anchor='middle'),text(x+w/2,y+h/2+23,{'wild':'預留／草地','ruin':'破損 · 3 鋪位','camp':'露天','pile':'露天料堆','basic':'初建','built':'成形'}[s],13,anchor='middle')])
  a.append('</g>')
 a+=['</g>','<g id="routes">']
 if route:
  for k,r in paths.items():
   a.append(f'<g class="route-layer route-{k}"><polyline class="route" points="{poly(r["points"])}" stroke="{r["color"]}" stroke-width="4" stroke-dasharray="{0 if k in ["life","haul","visitor","enemy","retreat"] else 7}" opacity=".85"/></g>')
 a+=['</g>','<g id="stations">']
 for i,x,y,n in stations:
  a.append(f'<circle class="station" cx="{x}" cy="{y}" r="5"><title>{e(i+" · "+n)}</title></circle>')
 a.append('</g>')
 if labels:
  a += [text(45,52,'HOME · 生活核心與外圍防衛帶',28),text(45,86,stage+' · 同一幾何，依施工啟用',19),text(1470,35,'接 E1 林緣 ↑',17,anchor='middle'),text(1290,295,'演武外帶',19),text(1235,480,'撤退 → 內院',17),text(410,135,'枯木／竹林',18),text(180,300,'泉口 → 溪 → 潭',17),text(370,680,'溪橋 · 雙向錯身',17),text(360,820,'潭水',20),text(620,960,'取水乾石 · 單人',17),text(1400,955,'村路／義學接待',17,anchor='middle'),text(45,940,'虛線框＝未建；小圓＝站位；門缺口＝實際入口',17),text(45,970,'設計圖 ≠ 可用碰撞圖。所有尺寸、站位仍須 runtime 驗證。',16)]
 return ''.join(a)
def remote(labels=True):
 a=['<g id="expedition"><path d="M1220 0 L2400 0 L2400 790 L1580 790 L1410 800 L1350 600Z" fill="#d4dfc9"/>','<path d="M1790 70 L1860 220 L1900 350 L1905 440 L1930 570 L2050 740" fill="none" stroke="#8cb8be" stroke-width="45"/>','<path d="M2010 20 L2320 20 L2380 250 L2270 330 L2120 200Z" fill="#b8b9a5"/>','<ellipse cx="1460" cy="620" rx="100" ry="85" fill="#b9cfa9"/>','<path d="M2020 320 L2140 280 L2160 360 L2080 410Z" fill="#a8b79e"/>']
 for k in ['main','side']:
  a.append(f'<polyline class="route" points="{poly(exp[k])}" stroke="#d1bc94" stroke-width="{36 if k=="main" else 28}"/>')
  a.append(f'<polyline class="route" points="{poly(exp[k])}" stroke="{ "#b48725" if k=="main" else "#7a64a7"}" stroke-width="4" stroke-dasharray="{0 if k=="main" else 9}"/>')
 a+=['<rect x="1870" y="425" width="70" height="30" fill="#b59062" stroke="#785b3b" stroke-width="3"/>','<path d="M2170 155 Q2200 85 2230 155Z" fill="#59635a"/>','<rect x="1625" y="530" width="75" height="50" rx="8" fill="#efe0be"/>']
 for p in exp['points']:
  x,y=p['pos'];a.append(f'<circle cx="{x}" cy="{y}" r="8" fill="#fffaf0" stroke="#314c43" stroke-width="3"/>')
  if labels:
   lx,ly,anchor={'forest':(1370,595,'start'),'camp':(1570,605,'start'),'valley':(1730,530,'start'),'bridge':(1920,400,'start'),'cave':(2340,200,'end')}[p['id']]
   a.append(text(lx,ly,p['name'],19,anchor=anchor))
 if labels:a += [text(1250,70,'一條遠征 · 三段連續地形',29),text(1250,110,'同角色／同時間／同出招；全程可跟隨與叫回',19),text(1750,290,'側路：避獸，不繞過窄橋',17),text(2020,370,'岩塊遮視線',17),text(1400,765,'↓ 家園北口（同座標接縫）',18),text(2340,70,'未啟用山寨出口 →',17,anchor='end')]
 return ''.join(a)+'</g>'
for stage in ['S0','S1','S2']:(P/f'{stage}.svg').write_text(start(1600,1000,stage+' 家園配置')+home(stage)+'</svg>')
(P/'world.svg').write_text(start(2400,1800,'成熟全圖與唯一遠征路線')+remote()+'<g transform="translate(0 800)">'+home('S2')+'</g>'+text(50,300,'山居 · 第一章',56)+text(50,350,'成熟全圖反推破道館',30)+text(50,410,'8 常住 + 2 訪客｜3 遠征段｜1 個結局分歧',23)+text(50,460,'所有座標為可編輯設計單位 DU',23)+'</svg>')
(P/'expedition.svg').write_text(start(1280,860,'林緣、溪谷、窄橋與古洞')+'<g transform="translate(-1180 10)">'+remote()+'</g></svg>')
(P/'stages.svg').write_text(start(1600,1120,'S0 S1 S2 共用幾何對照')+text(45,55,'同一條路，慢慢成為家',34)+text(45,90,'外框／門位不漂移；施工完成才啟用容量與活動。',20)+''.join(f'<g transform="translate({40+(i%2)*780} {140+(i//2)*490}) scale(.47)">'+home(s,False)+'</g>' for i,s in enumerate(['S0','S1','S2']))+text(840,730,'S0：破廳 3 鋪位、露天灶、料堆',24)+text(840,785,'S1：修廳、宿舍 4 床、菜藥與兩樁',24)+text(840,840,'S2：8 床、餐敘 8 座、四樁與外帶',24)+text(840,910,'屋內通道與個別床側仍由 spec 詳定。',20)+text(840,950,'此圖是建設狀態對照，不是自動升級。',20)+'</svg>')
svg=(P/'S2.svg').read_text()
html_doc='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>山居 · 場景設計工作台</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f0e5;color:#293f3c;font:16px/1.6 system-ui,"PingFang TC",sans-serif}header,main{max-width:1440px;margin:auto;padding:24px 32px}header{border-bottom:1px solid #d2cbb8}small{color:#657568;letter-spacing:.12em}h1{font-size:38px;margin:8px 0}p{margin:8px 0}nav,fieldset{display:flex;gap:10px;flex-wrap:wrap;border:0;padding:0;margin:16px 0}button,a.tab{font:inherit;border:1px solid #819681;background:transparent;color:#293f3c;padding:8px 16px;border-radius:24px;cursor:pointer;text-decoration:none}button[aria-pressed=true]{background:#2e5849;color:white}.board{border:1px solid #c7cbb8;border-radius:16px;overflow:auto;background:#faf7ef}.board svg{width:100%;height:auto;display:block}label{margin-right:14px}section{margin-bottom:32px}.legend{display:flex;gap:20px;flex-wrap:wrap}.legend span{border-left:6px solid var(--c);padding-left:8px}footer{padding:24px;color:#607568}img{max-width:100%}.notes{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}@media(max-width:800px){.notes{grid-template-columns:1fr}header,main{padding:20px}h1{font-size:28px}}</style><header><small>SOLO SECT GPT · PLANNING / 2026.10.25</small><h1>從破道館，長出一個有人生活的門派</h1><p>成熟配置、三階段疊圖與一條完整外出路線。這是設計檢視器，不是遊戲。</p><nav><button data-stage="S0">S0 破道館</button><button data-stage="S1">S1 初建</button><button data-stage="S2" aria-pressed="true">S2 成形</button><a class="tab" href="#world">看完整世界</a><a class="tab" href="../../docs/SCENE_ATLAS.md">尺寸與素材契約</a></nav></header><main><section><fieldset><label><input type="checkbox" id="routes-toggle" checked> 路線疊圖</label><label><input type="checkbox" id="stations-toggle" checked> 互動站位</label><label><input type="checkbox" id="zoom-toggle"> 放大檢視（可橫捲）</label><label><input type="checkbox" id="ghost-toggle"> 疊上 S2 建築外框</label></fieldset><div class="legend"><span style="--c:#2b826f">生活</span><span style="--c:#2779ad">搬運</span><span style="--c:#b48725">訪客／遠征</span><span style="--c:#b64b40">敵人</span><span style="--c:#7a64a7">撤退</span></div><div class="board" id="board">SVG_HERE</div><p id="caption">S2 · 8 個常住床位、8 個餐位、4 個練功站位；2 名日訪客分時接待。</p></section><section class="notes"><article><h2>近生活，遠勞作</h2><p>睡覺、用餐和交談靠近。取水與採木保留長路，負重和腳力在路上看得出差異。</p></article><article><h2>外帶容納演武</h2><p>守點、側翼和撤退通道各有位置。可重複波次只用於演武；野獸回到有來源的棲地。</p></article><article><h2>遠征真走出去</h2><p>從北口進林緣，經溪谷、窄橋到古洞。鏡頭可切區，人物、時間與交手規則不換。</p></article></section><section id="world"><h2>成熟全圖／遠征接縫</h2><div class="board"><img src="world.svg" alt="成熟全圖與三段遠征"></div></section><section><h2>三階段共用幾何</h2><div class="board"><img src="stages.svg" alt="三階段對照"></div></section><footer>白圓為站位，虛線框為未建地塊。將滑鼠移到站位可見 ID。尺度與容量為第一版候選，未經玩家動線或 runtime 尋路驗證。未將 SCENE04 水彩背景當成碰撞資料。</footer></main><script>const stages=STAGES_JSON;let stage='S2';function draw(){document.getElementById('board').innerHTML=stages[stage];const svg=document.querySelector('#board svg');svg.style.minWidth=document.getElementById('zoom-toggle').checked?'1400px':'';svg.querySelector('#routes').style.display=document.getElementById('routes-toggle').checked?'':'none';svg.querySelector('#stations').style.display=document.getElementById('stations-toggle').checked?'':'none';if(document.getElementById('ghost-toggle').checked){const doc=new DOMParser().parseFromString(stages.S2,'image/svg+xml');const ghost=document.importNode(doc.getElementById('facilities'),true);ghost.id='s2-overlay';ghost.querySelectorAll('text,path').forEach(n=>n.remove());ghost.querySelectorAll('rect').forEach(n=>{n.setAttribute('fill','none');n.setAttribute('stroke','#a44239');n.setAttribute('stroke-dasharray','8');n.setAttribute('stroke-width','3')});svg.append(ghost)}document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stage===stage)));document.getElementById('caption').textContent={S0:'S0 · 3 人開局；破廳 3 鋪位、露天灶與料堆。成熟外框不自動提供功能。',S1:'S1 · 宿舍 4 床 + 大廳暫住 2 位；接納人口前先核空床與供餐。',S2:'S2 · 宿舍甲與側舍共 8 床、餐敘 8 座、練功 4 位；最多 2 名日訪客。'}[stage]}document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{stage=b.dataset.stage;draw()});document.querySelectorAll('input').forEach(n=>n.onchange=draw);draw();</script></html>'''
html_doc=html_doc.replace('SVG_HERE',svg).replace('STAGES_JSON',json.dumps({s:(P/f'{s}.svg').read_text() for s in ['S0','S1','S2']},ensure_ascii=False))
(P/'index.html').write_text(html_doc)
print('Wrote design layout, 6 SVGs, and local HTML viewer.')
