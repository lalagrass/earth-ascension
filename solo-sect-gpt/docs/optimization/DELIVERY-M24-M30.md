# M24–M30 交付

2026-10-26；實際主筆 Claude Opus 5.5（Anthropic，經 Claude Code 在擁有人 Mac 上執行），單一作者、作者自校。規劃由 GPT / Codex 寫在 [M24–M30 計畫](M24-M30-PLAN.md)（原樣提交於 0a1a625）。分支 `codex/solo-sect-gpt`，盤點 HEAD `fa203b2`（開工時未前進）；只改 `solo-sect-gpt/`，只有本機 commit，沒有 push、PR、merge 或部署。M1–M23 的文件、證據與標記都不改寫。完成 M30 即停止。

## 開啟

```sh
cd /Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension
python3 -m http.server 8879 --bind 127.0.0.1 --directory solo-sect-gpt
```

開 <http://127.0.0.1:8879/>，按「開始」進新局後，到「存檔」頁選檔「匯入 JSON」→確認。所有素材從本地載入，不需要網路。

## 展示檔與 5–10 分鐘觀看路線

起點：`evidence/optimization/m30/showcase-m24-m30.save.json`（`chapter1-follow-1`）。從 M23 示範存檔出發、全程用畫面按鈕做出：在膳房卡派阿木做一鍋飯、跑一次兩翼包抄聯合演練（阿木前攔、林青守線；守住，林青在 x1349／1356 攔下南側來的兩名），再用遊戲內「手動保存」存下（驅動：`test/optimization/m30-demo-ui.mjs`）。匯入後是暫停狀態。

1. **人物卡**：人物頁→雲生（自創掌門）。卡首是公版素材的裁圖（「既有活動圖裁切，非新立繪」），旁邊「此刻動作」寫核心階段；阿木、小禾仍是色塊（小禾的正式立繪尚缺）。
2. **設施派工**：建設頁→設施卡→倉庫，派給林青→「採菜入倉」。卡上「正在送來：菜（林青）」。
3. **真實進展**：按繼續，林青實際採菜、搬進倉，倉內的菜增加；膳房卡可看到誰在灶前、缺什麼。
4. **近期紀事**：紀事頁上方「近期紀事」，按「林青 人物卡」回到人物；做飯的記錄有「相關設施」可開膳房卡。
5. **武學條件**：林青→武學成長→基礎拳→展開「條件四層（公版）」：入門（短打快拳未達前置）、承載（各招耗能對比現有精力）、控制（此刻的起手／收勢 tick）、特殊（持械、真授）。
6. **集合與分工**：遠征頁→聯合演練，阿木前攔、林青守線、來路「兩翼包抄」→甲站位集合→全員就位後開始。回顧寫出攔截位置：前攔在東側接住、守線在線上攔下南側來的對手。
7. **回生活**：阿木→開啟自主→恢復自主，人物卡回到日課並寫出目標來源。

驅動 `test/optimization/m30-route-ui.mjs` 實走過這 7 步（1440×900、1280×800）；驅動不停下閱讀，牆鐘約 1 分鐘多。「5–10 分鐘」是給真人邊看邊讀的估計，沒有真人驗證。

## 各階段

| 階段 | 玩家可見改變 | artifact | 標記 |
| --- | --- | --- | --- |
| M24 | 取消方向的談話真的取消；退出演練後的新切磋不被舊演練清掉；切磋兩端一起結束 | 6e7c8ab | optimization-m24.done.json |
| M25 | 聯合演練新來路「兩翼包抄」、前攔分頭攔截：一般隊伍讓新手守線少漏一名、深修隊伍不被削弱、單路時守線不划算；小禾不走到有人站的散步點；傷後三日內回到原指令 | 14d7d8a | optimization-m25.done.json |
| M26 | 公版人物卡／武學條目形狀接到目前核心；武學詳情「條件四層」 | d3d0eab | optimization-m26.done.json |
| M27 | 倉庫、膳房、外功場設施卡：在場／路途中／排隊、物資歸屬、受阻原因、合法派工；地圖「設」標 | 036e35b | optimization-m27.done.json |
| M28 | 近期紀事（有界、隱藏不洩漏、讀檔換 epoch），連到人物與設施 | 6e9e640 | optimization-m28.done.json |
| M29 | 掌門卡裁圖、家園竹叢與石頭（本地固定版本）、此刻動作讀核心階段 | 4f9bb88 | optimization-m29.done.json |
| M30 | 新展示檔、路線、存讀收尾、本文件 | 見總標記 | optimization-m30.done.json |

## 固定來源與本地採用

公版固定在遠端 dev `ef823ac277f48d9426cc3806f74468126a9cf91d`，以 `gh api` 按 SHA 讀取，沒有 merge dev、沒有執行時載入。完整清單（上游路徑、sha256、處理方式、依賴閉包、不採用的檔與理由）在 [`vendor/public/SOURCES.md`](../../vendor/public/SOURCES.md)：

- 採用（`vendor/public/ef823ac/`）：`character-card/contract.mjs`（加 `notApplicable`）、`martial-view/contract.mjs`、`martial-view/render.mjs`、`facility-view/contract.mjs`、`event-view/contract.mjs`、`event-view/render.mjs`，以及從 `character-card/render.mjs` 摘出的 `escape`／`valueText`。
- 素材（`assets/shared/`）：上游 `resolve.mjs`（改本地路徑前綴）、本地版本化 manifest `gpt-local-1.0.0`（`coreCommit` 寫本分支提交，不沿用 6cbd3e6）與 pin、原樣複製的 hero 圖集（只用 `idle-0`）、竹叢、兩塊石頭。權利照上游記錄：擁有人帳號生成、同 repository 使用有記錄；第三方權利未驗證；該提交沒有 repository 授權檔。
- 不採用：所有綁 6cbd3e6 舊核心的 GPT 轉接（`character-card/gpt.mjs`、`facility-view/gpt.mjs`、`event-view/adapters.mjs`）、`scene-shared/` 執行碼與舊核心快照、官方掌法規則與動作、其他版本的卡片版面。本地轉接分別在 `src/public-view.mjs`、`src/facility-view.mjs`、`src/event-feed.mjs`、`src/appearance.mjs`、`src/motion-view.mjs`，都綁目前核心。

## 驗收摘要

- 回歸：M30 最終一次全套 235 項全過（`evidence/optimization/m30/regression.log`）。
- 每階段的模型測試、正常 UI（1440×900、1280×800）與比較檔都在 `evidence/optimization/m24/`–`m30/` 與對應 `mXX-ui-*` 資料夾；舊證據沒有改寫（完整回歸會重寫 M2、M7、M13、M23 的模型報告，每次都已還原）。
- 存讀收尾（M30）：新展示檔的壞校驗碼拒絕、預覽取消、確認續玩、刷新保留；M16、M23 示範存檔與 GPT 開發時的 journey-03 舊存檔匯入後續玩；這批途中狀態（v1 演練的離開紀錄、進行中的兩翼包抄、帶方向世代的師徒談話）存讀雙軌相同；選中內容包招式後匯入沒有內容包的存檔會合法回退；近期紀事在讀檔失敗時保留、成功時重來。

## 必須知道的結果與限制

- M25 的守線用途來自新增的「兩翼包抄」來路（每波三名、交手距離 36）；原本三種來路下守線仍沒有減少漏過（M20 的結論不變）。正常 UI 第一次試兩翼包抄時兩人只休養到八成，以「失守」收場（漏過 0）；新展示檔那一次是「守住」。
- M27「過期派工」用重傷驗證：核心允許對演練中的人下一般工作（等於退出演練），不會拒絕。缺菜時做飯會先被核心受理、再在灶前等，卡片照核心寫受阻原因。
- M28 的隱藏判斷用「現在」的人物狀態做保守遮罩（journal 沒有可見性歷史）；這些事件原本就全部印在舊紀事頁，沒有新增揭露。
- M29 只有一張卡片裁圖與三件場景；地圖人物與出招仍是程序繪製；女孩立繪缺。
- M18 的老限制仍在：非掌門的體魄雖標隱藏，可由公開的生命上限推算。
- M30 為了讓兩翼包抄在有舊訓練對手站位的存檔裡能正常結束，把南側入口往下移、並讓 v2 演練的退場判定接受「在入口一個身寬內」；重跑 M25 的比較，E1–E5 仍全部成立（`evidence/optimization/m30/m25-drill-recheck.json`）。

## 沒做的事

真人試玩與主觀趣味評估（[PLAYTEST.md](PLAYTEST.md) 仍只有計畫）、獨立審查、手機版、完整素材庫與角色動畫、大型新遠征圖、公版上游修改（建議清單見 M24–M30 計畫末節，未代發）、M31 之後的任何工作。
