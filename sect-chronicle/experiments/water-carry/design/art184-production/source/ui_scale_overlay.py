"""D35 A 補修：在既有公開 LP16 桌面截圖上標出真 UI 占用區與人物建議尺寸（靜態概念，未接線）。
來源截圖：../lp16-integration/desktop-gather.png（dev 已合，1280×633）。在本目錄執行。"""
from PIL import Image, ImageDraw, ImageFont

SRC = "../lp16-integration/desktop-gather.png"
base = Image.open(SRC).convert("RGBA")
k = base.width / 1024  # 以 1024 寬量測後換算
ov = Image.new("RGBA", base.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
try:
    f = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 15)
except OSError:
    f = ImageFont.load_default()
# 目視量測的 UI 占用區（1024 寬座標）
UI = [("頂部 HUD", (0, 0, 1024, 58)), ("左側狀態列", (8, 70, 284, 96)),
      ("右側人物卡", (784, 72, 1016, 334)), ("底部人物卡", (8, 436, 304, 478)),
      ("底部說明列", (0, 470, 1024, 506))]
for name, (x0, y0, x1, y1) in UI:
    box = [int(v * k) for v in (x0, y0, x1, y1)]
    d.rectangle(box, fill=(220, 40, 40, 45), outline=(220, 40, 40, 255), width=2)
    d.text((box[0] + 4, box[3] - 18), "UI:" + name, fill=(200, 0, 0, 255), font=f)
# 現有主角（採藥中）頭頂約 y=210、腳底約 y=278（1024 座標）
cur_h = (278 - 210) * k
d.line([(int(500 * k), int(210 * k)), (int(500 * k), int(278 * k))], fill=(0, 90, 220, 255), width=3)
d.text((int(430 * k), int(282 * k) + 18), f"現有人物高≈{cur_h:.0f}px", fill=(0, 60, 200, 255), font=f)
# 新素材依 64:72 比例，以現有主角高為主角基準擺入空地（概念）
for name, h, x in (("hero_side_herb", cur_h * 0.6 / 1.0, 360), ("hero_side_idle", cur_h, 420),
                   ("senior_side_idle", cur_h * 72 / 64, 470)):
    im = Image.open(f"sprites/{name}.png")
    w = int(im.width * h / im.height)
    im = im.resize((w, int(h)), Image.LANCZOS)
    fx, fy = int(x * k), int(400 * k)
    ov.alpha_composite(im, (fx - w // 2, fy - int(h)))
    d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=(0, 160, 0, 255))
d.text((int(330 * k), int(404 * k)), "新素材建議尺寸（主角64:熟手72；蹲姿0.6）綠點=腳底", fill=(0, 110, 0, 255), font=f)
d.rectangle([0, base.height - 26, base.width, base.height], fill=(255, 255, 255, 220))
d.text((8, base.height - 23), "概念、未接線：靜態標示，非 runtime；掛點／幀對位待 B 適配。底圖=lp16-integration/desktop-gather.png", fill=(0, 0, 0, 255), font=f)
base.alpha_composite(ov)
base.convert("RGB").save("export/ui-scale-overlay-concept.png")
print("ok", base.size, round(cur_h, 1))
