# M31–M36 交付

2026-10-27；實際主筆 Claude Opus 5.5（Anthropic，經 Claude Code 在擁有人 Mac 上執行），單一作者、作者自校。規劃由 GPT / Codex 寫在 [M31–M36 計畫](M31-M36-PLAN.md)（原樣提交於 9328d39）。分支 `codex/solo-sect-gpt`，盤點 HEAD `b0ca007`（開工時未前進）；只改 `solo-sect-gpt/`，只有本機 commit，沒有 push、PR、merge 或部署。M1–M30 的文件、證據與標記都不改寫。完成 M36 即停止。

## 開啟

```sh
cd /Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension
python3 -m http.server 8879 --bind 127.0.0.1 --directory solo-sect-gpt
```

開 <http://127.0.0.1:8879/>。所有素材從本地載入，不需要網路。

## 展示檔與閱讀路線（兩段）

展示檔：`evidence/optimization/m36/showcase-m31-m36.save.json`（`chapter1-follow-1`，tick 198837）。從 M30 展示檔出發，全程用畫面按鈕做出（驅動 `test/optimization/m36-demo-ui.mjs`）：阿木採木→勾「臨時一次」改採菜→交付後回採木；師徒取消方向→改提學棍→林青答應→定向之約；兩翼包抄演練，阿木前攔、沈禾守線，沈禾按「自己退出」（精力 9609），之後三次朝空地試招（精力降到 9009），再終止演練；最後遊戲內「手動保存」。同一次流程在沈禾退出後先手動保存一份途中檔 `drill-left-midway.save.json`。

**A 新局（約 1 分鐘）**：開局對話框切郭靖、令狐沖、岳不群、自創，看簡介、背景和「能力摘要」（讀表單目前配點）→ 選令狐沖開始 → 人物頁：頭像下方是同一份簡介，生活總覽的「工作目標／待辦與停工」→ 建設頁頂端的資源總覽。

**B 匯入展示檔**（「存檔」頁選檔「匯入 JSON」→確認；匯入後暫停）：
1. 人物頁→林青→「此人的近期紀事」：師徒的取消、提出、答應與定向之約。阿木的近期紀事按「生活」：回復原安排。
2. 建設頁資源總覽：木 0 → 按木列的「倉庫」開設施卡 → 派給林青「採木入倉」。
3. 按繼續：林青背著木頭回程時，總覽的木「在途」有數；交付後實存增加。
4. 人物頁→阿木→工作目標面板：既有工作目標、臨時工作（不適用，表示已回原安排）、目標來源。
5. 遠征頁→上次回顧：兩翼包抄、阿木前攔的攔截位置；沈禾（守線）耗精力 0——退出後試招用掉的 600 不算進演練。

`m36-route-ui.mjs` 實走兩段（1440×900、1280×800），驅動不停下閱讀，牆鐘約 45 秒（多數是等林青來回）。「5–10 分鐘」是給真人邊看邊讀的估計，沒有真人驗證。

## 三項 review 反例的對應（M31）

| 反例 | 修補 | 驗收 |
| --- | --- | --- |
| 師徒紀事遺漏（`mentor.*` 非數字 id 被游標略過） | 唯讀游標＝最後一筆 `event.N`＋其後已讀非數字筆數；adapter 自己的遞增序號組唯一 id；核心事件 id 不改 | M16 示範存檔師徒事件 2 筆都收到；改向後同 id 的第二筆另收；ring 捲過、同 tick、重讀不重收；修前同測試 9 項全失敗（`m31/before-fix-at-25240c9.log`）；本批展示檔的定向之約在近期紀事 |
| 退出後身體統計串場 | 離開的那個 tick 記 `bodyAt`；回顧對離開者用快照；舊途中檔缺快照寫 null（「退出前的消耗無法從舊存檔重建」）；存檔驗證新欄位 | 沈禾退出後三拳、工作、休息、受傷、存讀都只算到退出；本批展示檔與途中檔再驗一次（`m36-model.json`、`m36-compat-ui-*`） |
| 容量預留冒充在途 | 設施卡與資源總覽分「預留入庫容量」「已被預約取走」「正在送來」；在途只認送回階段＋背包實物 | 新局採木後 1 tick 在途空、預留木 4；回程時在途＝背包實數；交付後清空 |

舊 M30 marker 保留作歷史。M30 路線驅動有一步斷言的是 M31 修掉的舊口徑（背包一有貨就算在途），M33 時重跑失敗，已寫進 M33 文件；本批新路線取代它。

## 各階段

| 階段 | 玩家可見改變 | spec | artifact | 標記 |
| --- | --- | --- | --- | --- |
| M31 | 師徒紀事不再漏；演練退出者只算參與段；倉庫卡分清預留與在途 | 25240c9 | 621ad4d | optimization-m31.done.json |
| M32 | 建設頁頂端資源總覽（水、木、藥、菜、餐五欄），連回設施卡派工 | 53cd42c | b41522d | optimization-m32.done.json |
| M33 | 人物頁一個工作目標面板：原指令、臨時工作回哪裡、排程命令、停工、必要休養／自理、共享安排；按鈕送出前重驗 | 378a65b | 08f8a2b | optimization-m33.done.json |
| M34 | 開局對話框與人物卡共用公開簡介（四個開局、小禾、阿木） | 8af2d3c | fcd37d9 | optimization-m34.done.json |
| M35 | 值寫「是／否」；展開狀態跟著人物；重繪不丟焦點；空白鍵在按鈕上不暫停；公版紙墨樣式 | da20c73 | b8d6d17 | optimization-m35.done.json |
| M36 | 新展示檔、兩段路線、相容收尾、本文件 | 6ebbf68 | 見總標記 | optimization-m36.done.json |

## 新公版 6f959f5 採用清單

固定 `lalagrass/earth-ascension` 提交 `6f959f534e9a00994f1cea7c230b4110e60db8c6`，以 `gh api` 按 SHA 讀取；放在 `vendor/public/6f959f5/`，ef823ac 舊版保留不動、舊 import 照用。完整路徑、上游 sha256 與改寫說明在 [`vendor/public/SOURCES.md`](../../vendor/public/SOURCES.md)。

- 採用：`character-card/contract.mjs`（加 `notApplicable`，含 `sanitizeProfile`）、`public-ui/values.mjs`（加「不適用」；M35 再加布林「是／否」與清單呈現）、`public-ui/style.css`、`resource-view/{contract,render}.mjs`、`intent-view/{contract,render}.mjs`、從 `character-card/render.mjs` 摘出的 `profileHtml`（拿掉研究頁的「只供對照，不是可選開局」）。
- 借文字：`character-card/profiles.mjs` 的郭靖、令狐沖兩句短介（令狐沖刪去師門身分），背景為本版改寫。
- 借原則、不採檔：`public-fix/view-state.mjs`（每人物 scope、穩定 key、同人保留焦點，寫在 `ui.mjs`）。
- 不採用：所有 `gpt.mjs` 轉接（import `scene-shared/sources/gpt` 舊核心）、`preview-fixtures.mjs`、dev 研究目錄其餘人物與 `hero/cousin/girl` 綁定、PR #370 的立繪候選。本地轉接都讀目前 GPT 世界：`src/resource-view.mjs`、`src/intent-view.mjs`、`src/profiles.mjs`，以及沿用的 `public-view`、`facility-view`、`event-feed`。

## 驗收摘要

- 回歸：最終一次全套 266 項全過（`evidence/optimization/m36/regression.log`；各階段：M31 245、M32 250、M33 256、M34 262、M35 262）。完整回歸會重寫 M2、M7、M13、M23 的模型報告，每次都已還原。
- 每階段的模型測試、修前失敗紀錄、正常 UI（1440×900、1280×800）在 `evidence/optimization/m31/`–`m36/` 與對應 `mXX-ui-*` 資料夾。M35 另重跑 13 支舊驅動（`*-m35-recheck-1440`，只留 summary）。
- M36 相容收尾（`m36-compat-ui-*`）：新展示檔壞校驗碼被拒且原局與槽位不變、預覽取消不動、確認續玩 600 tick、刷新保留；讀壞檔時阿木的展開段與近期紀事 epoch 保留，讀好檔後收合、紀事重來；M23、M30 與新展示檔各匯入續玩 600 tick 無頁面錯誤；途中檔讀入後終止演練，沈禾耗精力＝退出時的值；資料包缺失沿 M30 存讀驅動重跑（`m30-saves-ui-m36-recheck-1440`）。模型：新展示檔與途中檔存讀雙軌續跑 600 tick hash 相同。

## 必須知道的結果與限制

- M33：受傷者在正常 UI 走的是「必要自理→回日課」；「必要休養後續原指令」只在模型（標註 fixture）驗，因為傷勢超過 60 時核心拒收新指令。自主政策的原因本核心沒有公開查詢，面板寫「不支援」。成熟宗師的停工／自主開關／叫回核心照收，面板照實可按。
- M33 曾讓舊名稱的按鈕重複（M35 發現並修掉）；倒地者「叫回」的預判落差在 M33 修掉。
- M34：郭靖、令狐沖、岳不群開局仍沒有核准外觀（色塊與首字）；小禾立繪仍缺；開局對話框的簡介沒有頭像；訪客沒有簡介。
- M35：沒做開發預覽頁、沒做手機版。舊 M16 驅動在聯合演練回顧逾時，在本批開工前的 b0ca007 上同樣逾時（隔離快照驗），未修。
- 近期紀事在「全部」時常被小禾的行走、演練中的出手事件擠滿（M28 的既有呈現）；路線用「此人」與「生活」篩選來讀。
- M18 的老限制仍在：非掌門的體魄雖標隱藏，可由公開的生命上限推算。

## 沒做的事

真人試玩與主觀趣味評估、獨立審查、手機版、存檔全面升版、正式立繪更新、公版上游修改、M36 之後的任何工作。
