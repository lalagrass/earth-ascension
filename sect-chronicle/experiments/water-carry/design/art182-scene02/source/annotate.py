#!/usr/bin/env python3
"""SCENE-02 標註合成：只讀 raw/ 生成圖與（選用）D37 烘焙地面，輸出 out/。用法：python3 source/annotate.py [D37 ground.jpg]"""
import sys, math, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / 'raw', ROOT / 'out'
OUT.mkdir(exist_ok=True)
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FONTB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def F(n, b=False):
    try: return ImageFont.truetype(FONTB if b else FONT, n, index=2)  # TC
    except OSError: return ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', n, index=2)
INK, PAPER = (40, 36, 30), (244, 238, 222)
ST = {'現有': (46, 125, 50), '已批待做': (30, 90, 170), '候選預留': (210, 110, 20), '純景觀': (110, 110, 110), '更後': (130, 60, 150)}
S = 2  # 1280 → 2560

def up(name):
    im = Image.open(RAW / name).convert('RGB')
    return im.resize((im.width * S, im.height * S), Image.LANCZOS)

def tag(d, x, y, text, col, size=26, anchor='lm'):
    f = F(size, True); b = d.textbbox((x, y), text, font=f, anchor=anchor)
    d.rounded_rectangle((b[0] - 8, b[1] - 5, b[2] + 8, b[3] + 5), 8, fill=(*PAPER, 235), outline=col, width=3)
    d.text((x, y), text, font=f, fill=col, anchor=anchor)

def dashed(d, pts, col, w=4, dash=18, gap=12):
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        L = math.hypot(x2 - x1, y2 - y1); n = max(1, int(L // (dash + gap)))
        for i in range(n + 1):
            a = i * (dash + gap) / L; b = min(1, a + dash / L)
            if a >= 1: break
            d.line([(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a), (x1 + (x2 - x1) * b, y1 + (y2 - y1) * b)], fill=col, width=w)

def arrow(d, pts, col, w=8, head=26):
    d.line(pts, fill=col, width=w, joint='curve')
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2; a = math.atan2(y2 - y1, x2 - x1)
        d.polygon([(mx + head * math.cos(a), my + head * math.sin(a)), (mx + head * .6 * math.cos(a + 2.4), my + head * .6 * math.sin(a + 2.4)),
                   (mx + head * .6 * math.cos(a - 2.4), my + head * .6 * math.sin(a - 2.4))], fill=col)

def wrap(text, font, width):
    """依實際字寬換行（CJK 逐字），回傳行列表。"""
    out, cur = [], ''
    for ch in text:
        if font.getlength(cur + ch) > width and cur:
            out.append(cur); cur = ch
        else:
            cur += ch
    return out + [cur] if cur else out

def legend_panel(min_h, title, rows, w=1000):
    """依內容算高度，不再固定裁切；回傳面板（高度≥min_h）。"""
    f, fb = F(25), F(28, True); items = []; y = 110
    for r in rows:
        if r[0] == '#':
            ls = wrap(r[1], fb, w - 80); items.append(('h', y, ls)); y += 40 * len(ls) + 10; continue
        n, st, txt = r; ls = wrap(f'［{st}］{txt}', f, w - 140); items.append(('r', y, (n, st, ls))); y += max(54, 36 * len(ls) + 18)
    p = Image.new('RGB', (w, max(min_h, y + 40)), PAPER); d = ImageDraw.Draw(p)
    d.text((40, 36), title, font=F(44, True), fill=INK)
    for k, y, v in items:
        if k == 'h':
            for i, t in enumerate(v): d.text((40, y + i * 40), t, font=fb, fill=INK)
            continue
        n, st, ls = v; col = ST[st]
        d.ellipse((40, y, 84, y + 44), fill=col); d.text((62, y + 22), str(n), font=F(24, True), fill='white', anchor='mm')
        for i, t in enumerate(ls): d.text((100, y + 22 + i * 36), t, font=f, fill=INK, anchor='lm')
    return p

# ---------- A 主景 ----------
pano = up('panorama.jpg'); pano.save(OUT / 'A1-panorama-master.jpg', quality=88)

MARK = [  # (n, x, y @1280, 狀態, 名稱＋issue/BL)；A1 v2（單一連續溪）
 (1, 898, 102, '現有', '正堂（D35/D37 素材）'), (2, 1039, 195, '現有', '側屋'), (3, 937, 258, '現有', '水缸（挑水交付端）'),
 (4, 1062, 335, '現有', '藥圃／採藥路終點'), (5, 1128, 300, '現有', '晾藥架（交藥藥架另在 runtime）'),
 (6, 700, 420, '現有', '長挑水路（1700.9，保留奔波觀賞性）'), (7, 419, 500, '現有', '溪橋（唯一橋；兩端接地、跨真河道）'),
 (8, 453, 600, '現有', '谷底取水潭（主溪在橋下游擴成，現名「泉眼」）'), (9, 531, 234, '現有', '西坡竹護欄（野豬來路／護院 LP-12）'),
 (10, 906, 236, '現有', '石凳／休閒（不以床取代）'), (11, 516, 330, '現有', '竹林（LP-13）'),
 (12, 470, 60, '已批待做', '#290 巡山口 S0→S1 竹坡（點位由 #290 定）'), (13, 492, 125, '已批待做', '#290 可見進退：同路回院'),
 (14, 875, 300, '候選預留', '宿舍（灰瓦木構；BL-S01／S03／S04，見 C 組）'), (15, 1000, 150, '候選預留', '廚房食堂（BL-L01；主稿僅留院東位）'),
 (16, 1170, 380, '候選預留', '菜圃（緊鄰廚房／藥圃，BL-L01）'), (17, 766, 255, '候選預留', '工坊（#188 生活偏好活動）'),
 (18, 742, 150, '候選預留', '柴房／柴林（BL-Q02）'), (19, 590, 205, '候選預留', '練功空地／師徒交流（#160／#170）'),
 (20, 1230, 380, '候選預留', '倉儲／藥房（藥圃旁，BL-S04）'), (21, 820, 205, '候選預留', '院內安靜角（女孩生活空間參照）'),
 (22, 520, 690, '候選預留', '潭出水口：取水棚／洗滌石台在下游（不加污染規則）'),
 (23, 1195, 210, '更後', '山門（訪客／求醫等候、安全控制 #105）'), (24, 1160, 520, '更後', '下山村路（堂弟住村偶爾上山）'),
 (25, 1190, 135, '純景觀', '山下村落（遠景）'), (26, 62, 470, '更後', '西林棲地／可發現鼠巢地貌（#219／#104，非全知）'),
 (27, 172, 160, '候選預留', '山壁泉口（唯一水源位置，見 B 組；≠取水潭）'),
]
lay = pano.copy(); d = ImageDraw.Draw(lay, 'RGBA')
dashed(d, [(125 * S, 112 * S), (1250 * S, 112 * S), (1250 * S, 716 * S), (125 * S, 716 * S), (125 * S, 112 * S)], (200, 30, 30), w=6)
tag(d, 140 * S, 128 * S, '目前 runtime 1600×1350 約略範圍（藝術透視，非座標；落位見 B2）', (200, 30, 30), 28)
for n, x, y, st, _ in MARK:
    col = ST[st]; X, Y = x * S, y * S
    d.ellipse((X - 24, Y - 24, X + 24, Y + 24), fill=(*col, 235), outline='white', width=4)
    d.text((X, Y), str(n), font=F(26, True), fill='white', anchor='mm')
rows = [('#', '狀態：綠 現有／藍 已批待做／橘 候選預留／灰 純景觀／紫 更後')] + [(n, st, t) for n, _, _, st, t in MARK]
lp = legend_panel(lay.height, 'A2 總配置（現有／已批／候選／景觀）', rows, 1150)
A2 = Image.new('RGB', (lay.width + lp.width, max(lay.height, lp.height)), PAPER); A2.paste(lay, (0, 0)); A2.paste(lp, (lay.width, 0))
A2.save(OUT / 'A2-layout-annotated.jpg', quality=86)

# ---------- B 水系 ----------
w = pano.copy(); d = ImageDraw.Draw(w, 'RGBA'); BLUE = (20, 90, 200)
creek = [(185, 285), (230, 335), (300, 400), (365, 460), (419, 500), (450, 560), (470, 640), (516, 715)]
arrow(d, [(x * S, y * S) for x, y in creek], (*BLUE, 230), 10, 34)
arrow(d, [(172 * S, 140 * S), (185 * S, 275 * S)], (*BLUE, 230), 10, 34)
for x, y, t, col in [(200, 120, '① 最高：山壁泉口→石槽（見右下）', BLUE), (250, 370, '② 林溪：單一連續河床、小階落差', BLUE),
                     (560, 430, '③ 右岸竹林坡', BLUE), (440, 470, '④ 溪橋（唯一）：跨真河道，兩端落在土路', BLUE),
                     (560, 600, '⑤ 谷底最低：同一主溪擴成取水潭（現名「泉眼」）', (20, 120, 60)),
                     (540, 700, '⑥ 潭出水→洗滌石台（候選）→下緣出圖', BLUE)]:
    tag(d, x * S, y * S, t, col, 26)
tag(d, 20, 520 * S, '取水站位：潭近岸石階台，桶及水面、腳不入水', (20, 120, 60), 24)
sp = Image.open(RAW / 'spring-source.jpg').convert('RGB'); sp.thumbnail((640, 480))
w.paste(sp, (w.width - sp.width - 30, w.height - sp.height - 30))
d.rectangle((w.width - sp.width - 34, w.height - sp.height - 34, w.width - 26, w.height - 26), outline=BLUE, width=6)
tag(d, w.width - 40, w.height - sp.height - 64, '泉口放大：岩縫出水→石槽匯水→溢流成溪（非孤石接截平河）', BLUE, 24, 'rm')
hp = Image.new('RGB', (900, w.height), PAPER); hd = ImageDraw.Draw(hp)
hd.text((40, 36), 'B1 高低與流向（示意剖面）', font=F(42, True), fill=INK)
prof = [(80, 260), (220, 360), (360, 500), (500, 640), (660, 840), (820, 900)]
hd.line(prof, fill=(120, 95, 60), width=8)
hd.polygon(prof + [(820, 1100), (80, 1100)], fill=(214, 198, 160))
for (x, y), t in zip(prof, ['泉口崖', '林溪', '竹坡', '溪橋', '谷底潭', '出口']):
    hd.ellipse((x - 12, y - 12, x + 12, y + 12), fill=BLUE); hd.text((x, y - 30), t, font=F(26, True), fill=INK, anchor='mb')
note = ['高低由岸線、坡、階地與落差讀出；', '不把螢幕 y 當海拔。', '院落在山肩台地（比溪橋高），', '長挑水路先下坡到潭、再滿桶上坡回院。',
        '飲用／取水在上游與潭東岸台；', '洗滌／排水留在潭出水下游。', '不做水文、污染、雨季模擬（較後可能）。']
hd.line([(380, 430), (860, 430)], fill=(120, 95, 60), width=6); hd.text((860, 420), '院落山肩台地（高於橋）', font=F(24, True), fill=INK, anchor='rb')
for i, t in enumerate(note): hd.text((40, 1120 + i * 44), t, font=F(27), fill=INK)
B1 = Image.new('RGB', (w.width + hp.width, w.height), PAPER); B1.paste(w, (0, 0)); B1.paste(hp, (w.width, 0)); B1.save(OUT / 'B1-waterflow-annotated.jpg', quality=86)

# ---------- B2 現況疊圖（D37 烘焙地面 + 權威路線，只讀） ----------
geo_p = Path(sys.argv[1]) if len(sys.argv) > 1 else None
G = json.loads((ROOT / 'source' / 'current-geometry.json').read_text())
if geo_p and geo_p.exists():
    base = Image.open(geo_p).convert('RGB').resize((1600 * S // 2 * 2, 1350 * S // 2 * 2))
else:
    base = Image.new('RGB', (3200, 2700), (200, 196, 170))
K = base.width / 1600
pad, padR = 820, 1180  # 依框外標籤實際寬度留白（左：西林；右：山門／廚房）
cv = Image.new('RGB', (base.width + pad + padR, base.height + 2 * 260 + 140), (225, 219, 200)); cv.paste(base, (pad, 260))
d = ImageDraw.Draw(cv, 'RGBA'); P = lambda x, y: (pad + x * K, 260 + y * K)
d.rectangle((*P(0, 0), *P(1600, 1350)), outline=(200, 30, 30), width=8)
tag(d, *P(10, -50), '目前 runtime 世界 1600×1350（權威，不改）', (200, 30, 30), 34)
for k, col in [('water', (20, 90, 200)), ('herb', (46, 125, 50)), ('guard', (120, 60, 20)), ('boar', (90, 50, 30))]:
    d.line([P(*q) for q in G['paths'][k]], fill=(*col, 220), width=10, joint='curve')
d.polygon([P(*q) for q in G['stream']], outline=(20, 90, 200), width=5)
d.polygon([P(*q) for q in G['deck']], outline=(120, 70, 20), width=6)
for x, y, t, col in [(962, 512, '水缸', ST['現有']), (1398, 772, '藥圃端點', ST['現有']), (352, 1245, '取水端點（現名泉眼）', ST['現有']),
                     (850, 1000, '溪橋', ST['現有']), (680, 430, '竹護欄', ST['現有']), (968, 420, '石凳', ST['現有'])]:
    X, Y = P(x, y); d.ellipse((X - 16, Y - 16, X + 16, Y + 16), fill=col, outline='white', width=4); tag(d, X + 26, Y, t, col, 28)
tag(d, *P(560, 1300), '長挑水 1700.9（藍）', (20, 90, 200), 30); tag(d, *P(1100, 720), '採藥 515.2（綠）', ST['現有'], 30)
O = (230, 120, 20)
diffs = [  # 候選差異：只是設計建議，不回寫座標
 ('a', [(770, 690), (800, 760), (850, 826)], '候選 a：泉口在竹坡外側林谷崖（與 A1/B1 同位）→林溪入現溪頭（取代孤石滲水）'),
 ('b', [(262, 1240), (130, 1290), (-120, 1300)], '候選 b：潭出水→洗滌石台→出圖西南'),
]
for k, pts, t in diffs:
    dashed(d, [P(*q) for q in pts], O, 10, 28, 16); tag(d, *P(*pts[len(pts) // 2]), t, O, 28)
for x, y, t, col in [(1450, -90, '宿舍 + 床位（需北擴；C 組）', O), (1590, 560, '廚房食堂', O), (1490, 700, '菜圃', O), (1460, 860, '倉儲／藥房', O),
                     (1180, 1010, '柴房工坊（林緣）', O), (1110, 820, '練功空地／師徒交流', O), (1480, 470, '院內安靜角', O),
                     (1700, 1220, '山門→下山村路（往東出框）', ST['更後']), (-180, 600, '西林棲地／鼠巢地貌（更後）', ST['更後']),
                     (380, 560, '#290 S0～S3 西坡（x100–620，y300–850；點由 #290 定）', ST['已批待做'])]:
    X, Y = P(x, y); d.rectangle((X - 18, Y - 18, X + 18, Y + 18), outline=col, width=6); tag(d, X + 28, Y, t, col, 28)
cv.save(OUT / 'B2-current-overlay.jpg', quality=84)

# ---------- C 宿舍三階 ----------
dm = up('dorm-triptych.jpg'); d = ImageDraw.Draw(dm, 'RGBA')
for (px, title) in [(0, '① 初始：一床 bed-A'), (845, '② 加床：A 原位＋新 bed-B'), (1650, '③ 擴房：A／B 原位＋延伸區')]:
    tag(d, px + 30, 50, title, INK, 30)
A, B, C = ST['現有'], (30, 90, 170), O
for x, y, t, col in [(238, 560, 'bed-A', A), (1038, 560, 'bed-A（同 ID）', A), (1412, 560, 'bed-B（新增）', B),
                     (1780, 560, 'bed-A（同 ID）', A), (2138, 560, 'bed-B', B), (2375, 760, '延伸區：預留床位／共用桌', C)]:
    tag(d, x, y, t, col, 28, 'mm')
for x in (412, 1212, 1942):
    arrow(d, [(x, 1060), (x, 700)], (200, 30, 30, 220), 8, 26); tag(d, x + 30, 1000, '門→通道（不被床堵）', (200, 30, 30), 22)
for x in (258, 1058, 1412, 1800, 2138):
    tag(d, x, 330, '床牌位（可選）', INK, 20, 'mm')
for x in (420, 1215, 1250, 1960, 1990):
    pass
for x, y in [(420, 660), (1215, 640), (1960, 640)]:
    tag(d, x, y, '床側站位', (20, 120, 60), 20, 'mm')
note = ['兩床＝兩名額、兩個真站位；不是同床擠兩人。改建保留房間 ID 與 bed-A／原主人引用，只新增 bed-B（參考 OpenKeeper 改建保留 lair 實體的思路，不搬程式／圖）。',
        '認領者／當前使用者／短時預約者分開；本包不新增睡眠、恢復率、缺床懲罰，也不取代石凳恢復。若搬床：原主人物品隨床遷移，使用中不得拆。']
lines = [l for t in note for l in wrap(t, F(27), dm.width - 80)]; bh = 40 + 44 * len(lines)
bar = Image.new('RGB', (dm.width, bh), PAPER); bd = ImageDraw.Draw(bar)
for i, t in enumerate(lines): bd.text((40, 20 + i * 44), t, font=F(27), fill=INK)
C1 = Image.new('RGB', (dm.width, dm.height + bh), PAPER); C1.paste(dm, (0, 0)); C1.paste(bar, (0, dm.height)); C1.save(OUT / 'C1-dorm-three-stages.jpg', quality=86)

# ---------- D 分鏡 ----------
SB = {'sb-water.jpg': ('D1 長路挑水', ['出院門、空桶下坡入竹林（腳在路上）', '過溪橋：在橋板上，前欄擋腿，不入水', '潭東石階：彎身取水，桶到水面、腳不濕']),
      'sb-patrol.jpg': ('D2 巡山進退（#290 已批，畫稿示意）', ['S0：竹護欄端點出巡、路標', '竹坡／石坳：先看見野豬與林鼠再應對', '同路回院才算完成（真回程）']),
      'sb-dorm.jpg': ('D3 院落入房（宿舍候選）', ['夜間穿院、經水缸往側屋宿舍；屋簷不吞人物', '門口台階推門，燈光', '房內雙床、走道通暢，站在自己床側（bed-A）'])}
for f, (title, caps) in SB.items():
    im = up(f); cw = im.width // 3 - 60
    tl = wrap(title + '（畫稿／示意，不是可玩版本）', F(32, True), im.width - 60)
    cl = [wrap(f'{i + 1}. {c}', F(25), cw) for i, c in enumerate(caps)]
    bh = 24 + 44 * len(tl) + 36 * max(map(len, cl)) + 20
    bar = Image.new('RGB', (im.width, bh), PAPER); bd = ImageDraw.Draw(bar)
    for j, t in enumerate(tl): bd.text((30, 14 + j * 44), t, font=F(32, True), fill=INK)
    for i, ls in enumerate(cl):
        for j, t in enumerate(ls): bd.text((30 + i * im.width // 3, 24 + 44 * len(tl) + j * 36), t, font=F(25), fill=INK)
    o = Image.new('RGB', (im.width, im.height + bh), PAPER); o.paste(im, (0, 0)); o.paste(bar, (0, im.height))
    o.save(OUT / f"{title.split()[0]}-{f.replace('.jpg', '')}.jpg", quality=84)
print('ok', sorted(p.name for p in OUT.iterdir()))
