# SCENE-04 annotation / overlay generator (Python3 + Pillow). Reads plan.json + out/S*-clean.jpg.
# Usage: python3 annotate.py [path/to/runtime-ground.jpg]   (ground optional; default = demo/assets/scene03/ground.jpg, read-only)
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'out')
P = json.load(open(os.path.join(HERE, 'plan.json')))
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'; FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
f = lambda s, b=False: ImageFont.truetype(FB if b else FONT, s, index=2)  # index 2 = TC
S = 2  # output scale (labels only; paint is 1280x720 upscaled)
STAGES = {'S0': '破道館（初始）', 'S1': '可居住・成長中', 'S2': '成熟小門派'}
COL = {'ruin': (170, 90, 40), 'basic': (150, 110, 30), 'repair': (200, 120, 0), 'built': (30, 90, 60), 'wild': (120, 120, 120)}
STL = {'ruin': '破損可用', 'basic': '簡陋可用', 'repair': '外殼修好・未啟用', 'built': '完成', 'wild': '未建・真地形'}
# 慢／快對照：只讀 demo/model.mjs RULES（Lv1 負重 base40；Lv5 空手 cap84），不改腳力規則
SLOW, FAST = 40.0, 84.0
plen = lambda pts: sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
K = 1700.9 / plen(P['routes']['water']['pts'])  # 設計估算：讓母版挑水路對到已接受 1700.9 長度

def up(im): return im.resize((im.width * S, im.height * S), Image.LANCZOS)
def tag(d, xy, text, color, size=22, anchor='la'):
    x, y = xy; fn = f(size, True); bb = d.textbbox((x, y), text, font=fn, anchor=anchor)
    d.rounded_rectangle((bb[0] - 6, bb[1] - 4, bb[2] + 6, bb[3] + 4), 6, fill=(255, 250, 238, 230), outline=color + (255,), width=2)
    d.text((x, y), text, font=fn, fill=color + (255,), anchor=anchor)
def dashed(d, pts, color, w=4, dash=14):
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b); n = max(1, int(L / dash))
        for i in range(0, n, 2):
            p = (a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n); q = (a[0] + (b[0] - a[0]) * min(n, i + 1) / n, a[1] + (b[1] - a[1]) * min(n, i + 1) / n)
            d.line([p, q], fill=color, width=w)
sc = lambda p: (p[0] * S, p[1] * S)

def stage_layer(st):
    lay = Image.new('RGBA', (1280 * S, 720 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i, fa in enumerate(P['facilities']):
        s = fa['stage'][st]; c = COL[s]
        if fa['box']:
            b = [v * S for v in fa['box']]
            if s == 'wild': dashed(d, [(b[0], b[1]), (b[2], b[1]), (b[2], b[3]), (b[0], b[3]), (b[0], b[1])], c + (220,), 3, 10)
            else: d.rectangle(b, outline=c + (230,), width=3)
        if fa.get('door') and s != 'wild':
            x, y = sc(fa['door']); d.ellipse((x - 8, y - 8, x + 8, y + 8), fill=(220, 40, 40, 255), outline=(255, 255, 255, 255), width=2)
        for k, v in (fa.get('stations') or {}).items():
            if isinstance(v, list) and s != 'wild':
                x, y = sc(v); d.rectangle((x - 6, y - 6, x + 6, y + 6), fill=(40, 90, 200, 255), outline=(255, 255, 255, 255), width=2)
        x, y = sc(fa['pos']); txt = f"{i + 1:02d} {fa['name']}" + ('' if s == 'built' else f"［{STL[s]}］")
        tag(d, (x, y), txt, c, 20, 'mm')
    # legend
    d.rounded_rectangle((20, 1440 - 150, 1180, 1440 - 20), 10, fill=(255, 250, 238, 235), outline=(90, 70, 40, 255), width=2)
    d.text((40, 1440 - 140), f"SCENE-04 {st}｜{STAGES[st]}｜同一母版 1280×720 MU（輸出 2×）｜設計候選，非 runtime／非已批准功能", font=f(24, True), fill=(60, 40, 20, 255))
    d.text((40, 1440 - 100), "實框＝已有建物（色＝階段）　虛框＝未建地塊（畫面為真地形／雜草）　紅點＝門口　藍方＝互動站位", font=f(22), fill=(60, 40, 20, 255))
    d.text((40, 1440 - 64), f"比例錨：母版挑水路 {plen(P['routes']['water']['pts']):.0f} MU ≈ 現行 1700.9 單位（k={K:.2f}）｜編號對照 README 設施表", font=f(22), fill=(60, 40, 20, 255))
    return lay

for st in STAGES:
    lay = stage_layer(st); lay.save(os.path.join(OUT, f'{st}-labels.png'))
    base = up(Image.open(os.path.join(OUT, f'{st}-clean.jpg')).convert('RGB')).convert('RGBA')
    Image.alpha_composite(base, lay).convert('RGB').save(os.path.join(OUT, f'{st}-annotated.jpg'), quality=90)

# compare strip
ims = [Image.open(os.path.join(OUT, f'{st}-clean.jpg')) for st in STAGES]
strip = Image.new('RGB', (1920, 360 + 60), (250, 245, 232)); d = ImageDraw.Draw(strip)
for i, (st, im) in enumerate(zip(STAGES, ims)):
    strip.paste(im.resize((640, 360)), (i * 640, 60)); d.text((i * 640 + 12, 12), f"{st} {STAGES[st]}", font=f(28, True), fill=(60, 40, 20))
strip.save(os.path.join(OUT, 'B-stage-compare.jpg'), quality=90)

# walking overlays on S2 (W1–W3) + W4 dorm inset
def walk(name, keys, title, notes, inset=None, stage='S2', bottom=False):
    base = up(Image.open(os.path.join(OUT, f'{stage}-clean.jpg')).convert('RGB')).convert('RGBA'); lay = Image.new('RGBA', base.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    cols = [(220, 60, 40), (40, 90, 200), (150, 40, 160), (20, 130, 90)]
    lines = []
    for (key, c) in zip(keys, cols):
        r = P['routes'][key]; pts = [sc(p) for p in r['pts']]
        d.line(pts, fill=(255, 255, 255, 200), width=12, joint='curve'); d.line(pts, fill=c + (255,), width=6, joint='curve')
        L = plen(r['pts']) * K
        for i in range(1, 4):  # 等距時間標記：慢者每 t 秒走到哪、快者走到哪
            pass
        x, y = pts[0]; d.ellipse((x - 10, y - 10, x + 10, y + 10), fill=c + (255,)); x, y = pts[-1]; d.polygon([(x - 12, y - 12), (x + 12, y - 12), (x, y + 12)], fill=c + (255,))
        lines.append((c, f"{r['label']}：母版 {plen(r['pts']):.0f} MU ≈ {L:.0f} 單位｜慢（Lv1 負重 40/s）{L / SLOW:.0f}s ／ 快（Lv5 空手 84/s）{L / FAST:.0f}s"))
    if inset: inset(d)
    h = 70 + 40 * (len(lines) + len(notes))
    T = 1440 - h - 20 if bottom else 20
    d.rounded_rectangle((20, T, 2540, T + h), 10, fill=(255, 250, 238, 238), outline=(90, 70, 40, 255), width=2)
    d.text((40, T + 10), title + "｜設計疊圖，未接模型；速度只作觀看對照，不改腳力規則", font=f(26, True), fill=(60, 40, 20, 255))
    y = T + 52
    for c, t in lines: d.rectangle((40, y + 8, 70, y + 22), fill=c + (255,)); d.text((80, y), t, font=f(22), fill=(40, 30, 20, 255)); y += 40
    for t in notes: d.text((40, y), "・" + t, font=f(22), fill=(60, 40, 20, 255)); y += 40
    Image.alpha_composite(base, lay).convert('RGB').save(os.path.join(OUT, name), quality=90)

def dorm_inset(d):
    # 宿舍甲平面接口草圖（沿 ROOM_BEDS_RESEARCH／C1）：門→通道→床側站位，bed-A 原位、bed-B 新增
    x0, y0, w, h = 1560, 720, 900, 560
    d.rounded_rectangle((x0 - 20, y0 - 60, x0 + w + 20, y0 + h + 20), 12, fill=(255, 250, 238, 245), outline=(90, 70, 40, 255), width=3)
    d.text((x0, y0 - 50), "fac.dorm.a 平面（S1 2 床→S2 6 床；不實作認領／睡眠／保存）", font=f(24, True), fill=(60, 40, 20, 255))
    d.rectangle((x0, y0, x0 + w, y0 + h), outline=(80, 60, 40, 255), width=6)
    door = (x0 + w // 2, y0 + h); d.rectangle((door[0] - 40, door[1] - 6, door[0] + 40, door[1] + 6), fill=(220, 40, 40, 255))
    d.text((door[0] + 50, door[1] + 8), "門 door", font=f(20), fill=(200, 30, 30, 255))
    d.rectangle((x0 + w // 2 - 60, y0 + 20, x0 + w // 2 + 60, y0 + h - 8), fill=(230, 220, 190, 255)); d.text((x0 + w // 2 - 40, y0 + h // 2), "通道", font=f(22), fill=(90, 70, 40, 255))
    beds = [('bed-A', 'S1', 0, 0), ('bed-B', 'S1', 0, 1), ('bed-C', 'S2', 0, 2), ('bed-D', 'S2', 1, 0), ('bed-E', 'S2', 1, 1), ('bed-F', 'S2', 1, 2)]
    for bid, st, side, row in beds:
        bx = x0 + 30 if side == 0 else x0 + w - 30 - 260; by = y0 + 30 + row * 170
        c = (30, 90, 60) if st == 'S1' else (150, 150, 150)
        d.rectangle((bx, by, bx + 260, by + 110), fill=(250, 240, 220, 255), outline=c + (255,), width=4)
        d.text((bx + 12, by + 10), f"{bid}（{st}）", font=f(22, True), fill=c + (255,))
        sx = bx + 260 + 20 if side == 0 else bx - 20
        d.rectangle((sx - 9, by + 46, sx + 9, by + 64), fill=(40, 90, 200, 255))
    d.text((x0 + 20, y0 + h - 34), "藍方＝床側站位（貼通道）；A 原位不動，B 新增，C–F 擴建", font=f(20), fill=(40, 60, 140, 255))

walk('W1-gather-supply-train.jpg', ['farherb', 'water', 'rest2train'], 'W1 採集→回院補給休息→練功', ['遠採藥路刻意過橋出西南圖外（遠藥坡另一景段），回程經潭邊坡上院；交倉→膳房缸補給→演練場', '出入院一律經院南口（木籬端與客舍之間土路）；挑水站在潭南石階頂層乾石、桶探北側潭面；母版挑水路校準 k'])
walk('W2-social-visit.jpg', ['social', 'village'], 'W2 生活／交流', ['宿舍→膳房→餐敘棚為短生活圈；堂弟住村，自東南村路沿菜圃南土路→院南口→前院（山門在東路上、不直通前院），不穿牆／後院宿舍', '女孩只用空間參照（靜室旁安靜角），不加 AI／不改 canon'])
def danger(d):
    x, y = sc((1150, 45)); d.regular_polygon((x, y, 26), 3, fill=(230, 60, 30, 255), outline=(255, 255, 255, 255)); tag(d, (x - 40, y + 40), '遇險點（候選空間，不定數值）→ 原路返院', (200, 40, 20), 22, 'ra')
walk('W3-patrol-return.jpg', ['patrol'], 'W3 巡山遇險→返院', ['演練場→院南口→南環路→東路→山門→望台→後山棲地邊界（只留空間，不定刷怪／數值）；原路返院', '與現行西坡 #290 巡山並存為候選第二景段，不取代已接受巡山'], inset=danger, bottom=True)
walk('W4-dorm-door-bedside.jpg', ['dorm'], 'W4 入宿舍→床側', ['大廳前→後院安靜徑→宿舍甲門；門→通道→床側全程不被床或練功區堵住'], inset=dorm_inset)

# D overlay: current runtime ground (read-only) with accepted routes + candidate correspondence
gp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../demo/assets/scene03/ground.jpg')
if os.path.exists(gp):
    g = Image.open(gp).convert('RGB').resize((1600, 1350)).convert('RGBA'); lay = Image.new('RGBA', g.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    RT = json.load(open(os.path.join(HERE, 'runtime-snapshot.json')))
    for k, c in [('water', (40, 90, 200)), ('herb', (30, 130, 60)), ('patrolLead', (150, 40, 160)), ('patrolMain', (150, 40, 160)), ('train', (220, 60, 40))]:
        d.line([tuple(p) for p in RT['paths'][k]], fill=c + (255,), width=6)
    d.rectangle((2, 2, 1597, 1347), outline=(220, 30, 30, 255), width=6)
    n = len(RT['anchors']); d.rounded_rectangle((20, 160, 1100, 180 + 34 * n), 10, fill=(255, 250, 238, 238), outline=(90, 70, 40, 255), width=2)
    for i, m in enumerate(RT['anchors']):
        x, y = m['runtime']; r = 15
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=3); d.text((x, y), str(i + 1), font=f(18, True), fill=(0, 0, 0, 255), anchor='mm')
        d.text((36, 170 + 34 * i), f"{i + 1}. {m['name']} ({m['runtime'][0]},{m['runtime'][1]}) → 母版 {m['master']}｜{m['verdict']}", font=f(20), fill=(60, 40, 20, 255))
    d.rounded_rectangle((20, 20, 1580, 150), 10, fill=(255, 250, 238, 238), outline=(90, 70, 40, 255), width=2)
    d.text((36, 30), f"D 現況 runtime（base {RT['base'][:7]}，1600×1350 紅框＝真邊界）＋已接受路線", font=f(26, True), fill=(60, 40, 20, 255))
    d.text((36, 74), "藍＝挑水 1700.9　綠＝採藥 515.2　紫＝巡山前導＋主路　紅＝練功站位　白點＝與母版對位錨（沿用／需搬／候選）", font=f(21), fill=(60, 40, 20, 255))
    d.text((36, 108), "母版是新候選構圖：橋→潭方向與院落朝向和現況不同，採用前須另 PR 重排路線並保 1700.9 長度", font=f(21), fill=(160, 40, 30, 255))
    Image.alpha_composite(g, lay).convert('RGB').save(os.path.join(OUT, 'D1-runtime-overlay.jpg'), quality=88)
print('k=%.3f water_mu=%.1f' % (K, plen(P['routes']['water']['pts'])))
