# SCENE-03 場景資產（Refs #182 #184）

主作者：Grok Bot 代 lalagrass（Yuying Chen）。基線 dev f78d190。

## 來源與工具
- `raw/*.jpg`：GenerateImage 生成的綠幕素材表（泉崖、瀑布、取水台、預留宿舍/工棚、晾架、岩階、路標、蘆葦、踏石）。本專案自行生成，無第三方素材，可隨倉庫授權使用。
- `source/cut.py`（Pillow/numpy）：綠幕去背 → `sprites/`、`manifest-cut.json`。
- `source/dump-geometry.mjs`、`uses.mjs`：從唯讀模型匯出路線/巡山/水道幾何並檢查道具壓路（僅剩既有 stone_bench 警告）。
- `source/bake.py`（numpy/scipy/Pillow，衍生自 D37）：烘焙 3200×2700 地面：泉口濕痕、上游溪、出水離圖、巡山小徑、預留地村路、西坡渲染；P2 修補 3b 段烘入泉口背後連續林谷崖坡（`layout.mjs` 的 `SPRING_BANK` 崖頂緣＋落差，獨立亂數，其餘地面逐像素不變）。約 2.3 分鐘。
- `source/prep.py`：輸出 `demo/assets/scene03/`（ground.jpg、10 張新 PNG、manifest 41 筆；沿用 D35/D37 檔以 `../art184-watercolor/` 引用）。

## 採用 / 暫緩
- 採用：泉口、上游與出水水道、取水台、預留宿舍與工棚（僅外觀，無功能）、晾架、巡山路標與岩階、西南瀑布、`泉口` 視角。
- 暫緩：預留建物的功能與名稱（屬產品決定）、夜間/季節版、行動版構圖。

## 驗證
桌面單流程（臨時埠、1440×900）：巡山至西坡、暫停穩定、表親過橋取水至泉口、巡山回報；console 0 錯誤。截圖見 `shots/`。

## P2 修補（泉口崖坡支撐）
- 純視覺：`SPRING_BANK`（西接竹林林地、經泉口、東收進院南坡草地）烘成崖頂林下苔坡→塊面岩壁→崖腳濕陰，泉口濕痕匯流保留；崖頂加松／闊葉樹與蕨叢，崖腳加 3 塊既有 `rock_ledge`。`spring_cliff` 圖檔、位置與一切路線／端點／世界幾何未動。
- 證據：`shots/09-spring-bank-p2.jpg`（同一遊戲實跑、4× 後切「泉口」視角暫停，1440×900，console 0 錯誤）。`shots/01`、`06` 為修補前畫面，保留作對照。
