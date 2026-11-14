# public/wuxia 素材登記

規則（#549、#548）：只放自製或 CC0 素材，每個檔案一行：`路徑 | 來源 | 作者 | 授權`。
上游 AI Town 的美術、音樂、字型不進 repo（本機用 `tools/wuxia/fetch-upstream-assets.sh` 下載）。
`npm run wuxia:check` 會檢查本目錄每個檔案都有登記。

| 檔案 | 來源 | 作者 | 授權 |
|---|---|---|---|
| `tiles/town.jpg` | W1 程式烘焙：`tools/wuxia/bake-tiles.py`（`tools/wuxia/build-map.sh` 重產）。地面、河、街、城門、石橋、井、招牌、燈籠、封條為程式繪製；房舍、樹、竹、石、牆面、草、地面材質取自本專案自製水彩素材的縮小副本 `tools/wuxia/art-src/`（見下表） | earth-ascension 專案（Grok） | 本專案自製素材（與 repo 同一授權，非第三方） |
| `characters/folk.png` | W1 程式繪製：`tools/wuxia/bake-folk.py`（8 個古裝人物：布衣男、短打、布衣女、老人、少年、長衫、郎中、說書人；四方向各 3 格；W4 加第 5 列「打樁」2 格；W7 加第 6 列「跪拜」1 格，圖變成 384×384，前 5 列逐像素不變；同一支程式產生） | earth-ascension 專案（Grok） | 本專案自製（純程式產生，無外部素材） |
| `ui/about.svg` | W1 手寫 SVG（「關於」與網頁圖示：卷軸） | earth-ascension 專案（Grok） | 本專案自製 |
| `ui/close.svg` | W1 手寫 SVG（關閉：墨筆叉） | earth-ascension 專案（Grok） | 本專案自製 |
| `ui/join.svg` | W1 手寫 SVG（進鎮／離開：人形） | earth-ascension 專案（Grok） | 本專案自製 |
| `ui/pause.svg` | W1 手寫 SVG（暫停／繼續） | earth-ascension 專案（Grok） | 本專案自製 |
| `ui/music.svg` | W1 手寫 SVG（音樂鈕，只在關掉換皮時出現） | earth-ascension 專案（Grok） | 本專案自製 |
| `a2/qishi.png` | A2 程式繪製：`tools/wuxia/bake-qishi.py`（太極「起勢」2 格動畫：墨線小人，第 1 格雙手垂下、第 2 格雙臂平舉微屈膝；每格 32×40；畫面上大師示範、跟練的人慢半拍） | earth-ascension 專案（Grok） | 本專案自製（純程式產生，無外部素材） |

## `tools/wuxia/art-src/`（烘焙的輸入，不直接給前端用）

依 #562 W1 補充，取自本 repo 既有的自製水彩美術分支，由 `tools/wuxia/prep-art-src.py` 從 git 取出並縮小；逐檔來源路徑記在 `tools/wuxia/art-src/SOURCES.json`。

| 檔案 | 來源分支 @ commit | 原路徑 | 說明 |
|---|---|---|---|
| `tex-meadow.jpg`、`tex-forest.jpg`、`tex-water.jpg`、`far-mountains.jpg` | `codex/art184-watercolor-grok` @ `16e2892c` | `sect-chronicle/experiments/water-carry/design/art184-watercolor/raw/` | #184 D37 為本專案生成的草坡、林下、水面、遠山材質 |
| `dirt-path.png`、`flagstone.png` | `codex/art184-production-grok` @ `032f09a9` | `sect-chronicle/experiments/water-carry/design/art184-production/ground/` | #184 D35 土路、石板平鋪 |
| `bamboo_clump`、`boulder_l/m/s`、`broadleaf_tree`、`court_wall`、`creek_bank`、`dojo_gate`、`dojo_main_hall`、`dojo_side_house`、`fern`、`herb_bed`、`herb_rack`、`pine_a`、`pine_b`、`shrub_fern`、`stone_bench`、`stone_mill`、`water_vat`、`wild_grass`、`woodpile`（`.png`） | `codex/art184-watercolor-grok` @ `16e2892c` | `sect-chronicle/experiments/water-carry/demo/assets/art184-watercolor/` | #184 D35／D37 山居水彩景物 |

以上都是本專案（earth-ascension）先前為山門紀畫的水彩素材，由 Grok 在 #184 以影像生成工具產生後收錄進 repo；不是上游 AI Town 美術，也不是第三方素材。
招牌字（茶、藥、鐵、山腳鎮、武館）是烘焙時用系統的 Noto Serif CJK 字型（SIL OFL）畫進圖裡，字型檔本身不進 repo。

W4 的練功器具（`src/wuxia/DojoLayer.tsx`）與 W6 的切磋畫面（`src/wuxia/SparLayer.tsx`：勢點、擊中白光、「中！」、旁白框）都是 Pixi Graphics 程式畫的，沒有新增素材檔。W6 的 GIF 編碼用 devDependencies `gifenc`、`pngjs`（MIT，只在截圖工具裡用，不進前端）。

W7 的武館匾額（`src/wuxia/DojoLayer.tsx` 的 `drawPlaque`：木框、金邊、深底）是 Pixi Graphics 程式畫的，匾上的字用畫面字型即時排出；名號從 `data/wuxia/dojo-names.json`（自擬的 8 個名字）依 seed 選。關係分頁與武館面板只用 CSS，沒有新增素材檔。

A2 的傳承面板、武學分頁、角落提示只用 CSS／SVG；「顯示太極」的圈是 Pixi Graphics 程式畫的（`src/wuxia/A2Layer.tsx`）。新鎮民與張三丰沿用 `characters/folk.png` 既有的 8 個古裝人物圖（w1–w8），沒有新增人物圖。
