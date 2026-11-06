# 介面素材授權

| 本地檔案 | 來源與作者 | 授權 | 版本／取得日期 | 本專案修改 |
|---|---|---|---|---|
| `kenney/*.png` | [Kenney UI Pack: RPG Expansion](https://kenney.nl/assets/ui-pack-rpg-expansion)，圖檔由 [AuClairDeLune 的 Kenney 資產鏡像](https://github.com/Toramizu/AuClairDeLune/tree/main/Assets/Asset%20Packs/Kenney/Kenney%20UI%20Pack%20RPG%20Expansion) 取得 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 原版 1.0（2014）；2026-11-06 下載 | 未改圖檔；CSS 以九宮格邊框呈現與縮放 |
| `LXGWWenKai-subset.ttf`, `OFL-LXGWWenKai.txt` | [LXGW WenKai](https://github.com/lxgw/LxgwWenKai)，霞鶩文楷 | [SIL OFL 1.1](OFL-LXGWWenKai.txt) | `main`，2026-11-06 | 以 `pyftsubset` 僅保留介面中 815 個漢字；內文仍用系統黑體 |
| `icons/*.svg` | [game-icons/icons](https://github.com/game-icons/icons/tree/master/delapouite)，Delapouite | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | `master`，2026-11-06 | 移除全黑背景 path，將白色圖形改為深棕色；CSS 設寬高與色調。所用：`wood-pile`, `falling-rocks`, `coins`, `herbs-bundle`, `meal`, `medicines`, `full-wood-bucket`, `wood-beam`, `crystal-shrine` |

| `artifacts/round8/ui-candidates/rpgui-border-image.png`, `rpgui-button.png` | [RPGUI](https://github.com/RonenNess/RPGUI/tree/master/dist/img)，RonenNess | zlib | `master`，2026-11-06 | 僅三選一對照，未用於遊戲；九宮格顯示 |
| `artifacts/round8/ui-candidates/nes.min.css` | [NES.css v2.3.0](https://www.npmjs.com/package/nes.css/v/2.3.0) | MIT | 2.3.0，2026-11-06 | 僅三選一對照，未用於遊戲 |

圖示署名：**Delapouite / game-icons.net, CC BY 3.0**。這些圖示只作資源標記，不改資源數值或規則。

三選一外觀比較：Kenney 為 CC0；[RPGUI](https://github.com/RonenNess/RPGUI) 實際為 **zlib**（issue 舊稱 MIT）；[NES.css](https://github.com/nostalgic-css/NES.css) 為 MIT。最終採 Kenney。未載入 RPGUI，也未引入任何遠端字型。
