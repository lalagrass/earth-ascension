# D37（#184）生活入口全場 Grok 山居水彩統一

整張可玩場景（院落 → 藥圃與藥架 → 全段長路 → 溪橋 → 泉眼）統一成 `art184-scene-trio/paint/scene-master.jpg` 的山居水彩調子。
概念全景只當風格參考、不是權威地圖；地面依權威路線重新烘焙，固定人物不烘進底圖（師父／師兄是獨立 sprite）。

## 採用表（先沿用，缺的才補畫）

| 用途 | 採用 | 來源 | 處理 |
|---|---|---|---|
| 正堂、側屋、院門、院牆 | dojo_main_hall／dojo_side_house／dojo_gate／court_wall | art184-production（D35） | 沿用，縮圖；正堂／側屋位置同 D35 |
| 水缸 | water_vat | art184-production | 沿用；缸口水面依 `view().vat` 三段另畫 |
| 石磨、柴堆、藥架（晾架） | stone_mill／woodpile／herb_rack | art184-production | 沿用；herb_rack 放藥圃邊當晾架景物，交藥藥架仍是 LP-16 動態份數 |
| 松、竹、闊葉樹、山石、蕨 | pine_a／pine_b／bamboo_clump／broadleaf_tree／boulder_l/m/s／fern | art184-production | 沿用；竹林 11 叢沿 LP-13 落點（兩叢根部原壓在水路上，南移避路） |
| 溪岸 | creek_bank | art184-production | 沿用為地面貼片 |
| 土路、院坪石板 | dirt-path-tile-256／flagstone-tile-256 | art184-production/ground | 沿用為烘焙貼圖 |
| 草坡、林下、水面紋理、遠山 | raw/tex-meadow／tex-forest／tex-water／far-mountains | **本輪補畫** | 烘焙用（無既有可用的大面積地面） |
| 溪橋 | raw/prop-bridge → bridge_deck／bridge_front | **本輪補畫** | 仿射對齊 `BRIDGE_DECK_POLY`；前欄拆層 z=1060 |
| 師父打坐、師兄掃地 | raw/chars-master-senior | **本輪補畫** | 舊 LP 像素小人換掉，位置不變 |
| 野豬走／衝、鼠嗅／跑 | raw/animals | **本輪補畫** | 取代向量圖；模式效果（步態、後坐、嗅草、揚塵、倒地、出界淡出）照舊只讀 view() |
| 石凳、藥畦、野草花、蕨叢 | raw/props-misc | **本輪補畫** | 石凳取代 Graphics；藥畦取代 LP-16 Graphics 藥圃 |
| spring_pool、path_edge_stones、boulder 舊 LP PNG | — | — | 不用：深潭形狀改烘進地面（要讓取水端點落在潭東緣石台上），路緣石試放後像浮貼片 |
| 竹護欄 | Graphics | app.mjs | 保留可損痕外觀的程式畫法，改竹色＋墨線 |
| 主角／熟手 sheet | hero.json／cousin.json | art184-production（D35） | 不動（腳底、掛點、動作契約原樣） |

## 管線（來源只讀；輸出到本目錄與 `demo/assets/art184-watercolor/`）

```sh
cd sect-chronicle/experiments/water-carry
node design/art184-watercolor/source/dump-geometry.mjs   # 權威路線＋layout → geometry.json；並列出壓在路上的景物
node design/art184-watercolor/source/uses.mjs            # 每張素材最大顯示尺寸 → uses.json
cd design/art184-watercolor
python3 source/cut.py    # raw 綠底 → sprites/*.png（沿用 D35 extract.py 綠幕算法）
python3 source/bake.py   # → ground.jpg（約 100 秒）＋ out/ground-preview.jpg
python3 source/prep.py   # → 執行期 PNG、溪橋仿射／前欄拆層、manifest.json
```

需要 numpy、scipy、Pillow。烘焙與遊戲截圖依序跑，不並行。

## 架構

- `demo/scene/layout.mjs`：純視覺資料（院坪、溪流上下游視覺延伸、深潭、林地／石坡、明暗、景物與貼片落點、地標快看）。不存權威狀態、不進存檔。
- `demo/scene/watercolor.mjs`：外圍淡草襯底 → 烘焙地面 → 貼片（藥畦、溪岸、橋板＋後欄） → `sorted`（腳底 y 排序）景物／NPC／溪橋前欄。`tick()` 只改透明度、竹影、水光；暫停時視覺時間不前進。
- 層位：橋面在人物腳下、前欄 z=1060（同 LP-13）；院牆 y≈590 在採藥小路北側，路不穿牆；所有高景物以 `dump-geometry.mjs` 檢查不壓路（唯一例外是石凳，本來就是座位）。

## 不變（逐項保留）

世界 1600×1350、挑水 1700.9／採藥 515.2 與原端點、速度／負重／腳力成長／精力／水／庫存／預約、工作／自主休息喝水／明確停工不自續、護院／整理／清鼠／掌法、單 tick 移動預算、手動存讀與讀後暫停；不新增時鐘、權威狀態或 saveVersion。

## 證據（shots/）

`overview`、`yard`、`herb`、`west-boar`（野豬撞欄）＋一次連續真實流程（4×、跟隨主角）中的 `follow-bamboo` → `follow-bridge` → `follow-spring`（取水）。
