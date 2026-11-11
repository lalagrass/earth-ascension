# public/wuxia 素材登記

規則（#549、#548）：只放自製或 CC0 素材，每個檔案一行：`路徑 | 來源 | 作者 | 授權`。
上游 AI Town 的美術、音樂、字型不進 repo（本機用 `tools/wuxia/fetch-upstream-assets.sh` 下載）。
`npm run wuxia:check` 會檢查本目錄每個檔案都有登記。

| 檔案 | 來源 | 作者 | 授權 |
|---|---|---|---|
| `tiles/town.jpg` | W1 程式烘焙：`tools/wuxia/bake-tiles.py`（`tools/wuxia/build-map.sh` 重產）。地面、河、街、城門、石橋、井、招牌、燈籠、封條為程式繪製；房舍、樹、竹、石、牆面、草、地面材質取自本專案自製水彩素材的縮小副本 `tools/wuxia/art-src/`（見下表） | earth-ascension 專案（Grok） | 本專案自製素材（與 repo 同一授權，非第三方） |
| `characters/folk.png` | W1 程式繪製：`tools/wuxia/bake-folk.py`（8 個古裝人物：布衣男、短打、布衣女、老人、少年、長衫、郎中、說書人；四方向各 3 格） | earth-ascension 專案（Grok） | 本專案自製（純程式產生，無外部素材） |
| `ui/` 下的 svg | W1 手寫 SVG（紙底、墨框、印章、按鈕圖示） | earth-ascension 專案（Grok） | 本專案自製 |

## `tools/wuxia/art-src/`（烘焙的輸入，不直接給前端用）

依 #562 W1 補充，取自本 repo 既有的自製水彩美術分支，由 `tools/wuxia/prep-art-src.py` 從 git 取出並縮小；逐檔來源路徑記在 `tools/wuxia/art-src/SOURCES.json`。

| 檔案 | 來源分支 @ commit | 原路徑 | 說明 |
|---|---|---|---|
| `tex-meadow.jpg`、`tex-forest.jpg`、`tex-water.jpg`、`far-mountains.jpg` | `codex/art184-watercolor-grok` @ `16e2892c` | `sect-chronicle/experiments/water-carry/design/art184-watercolor/raw/` | #184 D37 為本專案生成的草坡、林下、水面、遠山材質 |
| `dirt-path.png`、`flagstone.png` | `codex/art184-production-grok` @ `032f09a9` | `sect-chronicle/experiments/water-carry/design/art184-production/ground/` | #184 D35 土路、石板平鋪 |
| `bamboo_clump`、`boulder_l/m/s`、`broadleaf_tree`、`court_wall`、`creek_bank`、`dojo_gate`、`dojo_main_hall`、`dojo_side_house`、`fern`、`herb_bed`、`herb_rack`、`pine_a`、`pine_b`、`shrub_fern`、`stone_bench`、`stone_mill`、`water_vat`、`wild_grass`、`woodpile`（`.png`） | `codex/art184-watercolor-grok` @ `16e2892c` | `sect-chronicle/experiments/water-carry/demo/assets/art184-watercolor/` | #184 D35／D37 山居水彩景物 |

以上都是本專案（earth-ascension）先前為山門紀畫的水彩素材，由 Grok 在 #184 以影像生成工具產生後收錄進 repo；不是上游 AI Town 美術，也不是第三方素材。
招牌字（茶、藥、鐵、山腳鎮、武館）是烘焙時用系統的 Noto Serif CJK 字型（SIL OFL）畫進圖裡，字型檔本身不進 repo。
