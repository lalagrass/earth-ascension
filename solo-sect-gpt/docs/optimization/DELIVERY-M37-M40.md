# M37–M40 交付

2026-10-27；實際主筆 Claude Opus 5.5（Anthropic，經 Claude Code 在擁有人 Mac 上執行），單一作者、作者自校。規劃由 GPT / Codex 寫在 [M37–M40 計畫](M37-M40-PLAN.md)（原樣提交於 b43e375）。分支 `codex/solo-sect-gpt`，盤點 HEAD `fa001ce`（開工時未前進）；只改 `solo-sect-gpt/`，只有本機 commit，沒有 push、PR、merge 或部署。M1–M36 的文件、證據與標記都不改寫（兩處舊 M29 斷言依 M39 的綁定改寫，見 M39 文件）。完成 M40 即停止。

## 開啟

```sh
cd /Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension
python3 -m http.server 8879 --bind 127.0.0.1 --directory solo-sect-gpt
```

開 <http://127.0.0.1:8879/>。所有素材（包括兩張立繪）從本地載入，不需要網路。

## 展示檔與兩段路線

展示檔：`evidence/optimization/m40/showcase-m37-m40.save.json`（`chapter1-follow-1`）。從 M36 展示檔出發，全程用畫面按鈕做出（驅動 `test/optimization/m40-demo-ui.mjs`）：膳房卡派阿木做一鍋基礎餐並上桌（桌上 0→4）；師徒取消方向→改提學劍→林青答應→定向之約；兩翼包抄演練，開打後暫停，沈禾「自己退出」（精力 9946），同一個 tick 朝空地試拳（精力 9746），先手動保存途中檔 `drill-cut-midway.save.json`，再繼續、終止、回顧；最後遊戲內「手動保存」。

**A 新局**：開局對話框選郭靖、令狐沖，簡介上方有各自的立繪縮圖（標「公開立繪」）→ 以郭靖開局 → 人物頁頭像是同一張圖，簡介下方「展開立繪」顯示整幅 3:4，背景可展開。

**B 匯入展示檔**（「存檔」頁選檔「匯入 JSON」→確認；匯入後暫停）：
1. 建設頁→設施卡→膳房，派阿木「做基礎餐」，按繼續。
2. 阿木背著成品往餐桌走時，資源總覽的「餐」在途有數（說明寫「正在送來：阿木」）；上桌後在途 0、實存增加。
3. 人物頁→林青→「此人的近期紀事」：取消、提出學劍、答應與定向之約。
4. 遠征頁→上次回顧：沈禾（守線）耗精力 0——她在暫停中退出後同一 tick 試拳用掉的 200 沒有算進演練。

`m40-route-ui.mjs` 實走 A、B（1440×900、1280×800），驅動不停下閱讀；牆鐘約 31 秒（1440）／30 秒（1280），其中約 22 秒是等阿木做飯、5 秒等搬到餐桌；模擬約 1000 tick（201219→202235）；逐步記在 `m40-route-ui-accepted-*/summary.json` 的 `marks`。「5–10 分鐘」是給真人邊看邊讀的估計，沒有真人驗證。ring 500 筆的紀事邊界只在模型 fixture 驗，沒有放進路線。

## 三項 review 修補（M37）

| 反例 | 修補 | 驗收 |
| --- | --- | --- |
| 暫停中退出後同 tick 試拳被算進演練（退出 9609→試拳 9409，回顧記 200） | 每個命令處理完時做截止檢查（`jointCut`）：被命令移出演練的人，先併入截至此刻的紀錄，再記 `left`／`cut`／`bodyAt`；命令讓演練結束時記 `closedAt`。截止前同 tick 的出手照算、截止後的不算；step 內離開沿 M24。新欄位當階段加進存檔驗證，舊檔照讀 | 修前 7 項模型失敗、正常 UI 在 2acc64a 隔離快照重現（809 應為 609）；修後 practiceStop／stop／改派／切磋、先出拳再退、雙人同 tick、終止後試拳、退出後存讀、step 內倒地都正確；兩種尺寸正常 UI 通過；本批展示檔與途中檔再驗 |
| 一鍋飯在 `haulOutput` 搬運中，總覽在途 known 0 | 共用唯讀 `src/transit.mjs`：deliver（`dest:` 預約＋背包）、haulOutput（批次在搬運者背包的單位）、撿地面物資與收成搬運；受阻或不在搬運的人手上的貨列 held、不算在途；設施卡與總覽同一份 | 鍋內 0、背著時＝背包餐數、存讀相同、上桌後 0；停工中斷→0 並列出手上有貨的人；別人接手被擋→0；倉滿→0；正常 UI 在途 4 |
| 數字游標離開 ring 後，保留窗第一筆非數字事件被跳過（500 只收 499） | 有界 reader：記住上次讀到時 ring 裡的紀錄物件（上限＝ring 500），新紀錄＝目前 ring 中不在其中的，依 ring 順序 | 1＋499 收 500 且第一筆是師徒；同 id 多筆、整窗替換、超窗只收 ring 裡的、重讀 0（標註模型 fixture） |

## 兩張立繪（M38）與接入（M39）

| 本地 | 來源 | sha256 | 綁定 |
| --- | --- | --- | --- |
| `assets/shared/3079a03/guojing.png` 864×1152 RGB | 原作者 Grok Bot，原 `6760f21…:solo-sect/assets/portraits/v2/guojing-v2-b.png`（同一 blob），dev 接受 `3079a03…:sect-chronicle/assets/shared/portraits/1.1.0/guojing.png` | 9ca10bf0686f8efcb1f6a446025d47ed2a1622127403b655cc43a99cde1f326c | 開局模板 `gpt:guo` |
| `assets/shared/3079a03/linghuchong.png` 480×640 RGB | 原作者 Grok Bot，原 `6760f21…:solo-sect/assets/portraits/linghuchong.png`（同一 blob），dev 接受 `3079a03…:…/linghuchong.png` | 55a3e9e6abd9562bbe065b9dd0fe49613b73aa729f3dee36c268ad5401ad11e2 | 開局模板 `gpt:linghu` |

- 兩張都是上游「直接複用」的圖，不是本輪生成；權利照上游 `repository-research-reuse; third-party-rights-unverified`，作本私人原型既有模板的外觀，不宣稱 dev 已批准新開局或公開發布。
- 本地 manifest `gpt-local-1.1.0`（sha256 `bd0afa259aeec8ccf597b6fab3e931d79007c947a5d4c96ae5d0b1e60684d109`）：1.0.0 五筆原樣（hero、竹叢、兩塊石頭、缺女孩），兩筆新增並分記原作者來源／dev 接受／本地採用；`templates` 對照只有 `gpt:guo`、`gpt:linghu`。`pin-gpt-local.mjs` 改指 1.1.0；`gpt-local-1.0.0` 檔與 digest `a57ff4b0…feed` 保留可驗。`resolve.mjs` 採上游 `portrait` 標籤分流，加整圖矩形與模板對照檢查。
- 畫面：custom 照舊用 hero 裁切；郭靖、令狐沖用整幅立繪（縮圖 contain、可展開 3:4、依人物保存展開）；岳不群、小禾、阿木與所有訪客照舊文字回退；不按名字配圖。外觀不進世界或存檔。圖片缺失時寫「本地圖片缺失，使用文字代替。」，同頁不再重試。

## 各階段

| 階段 | 玩家可見改變 | spec | artifact | 標記 |
| --- | --- | --- | --- | --- |
| M37 | 暫停退出後的試拳不算進演練；搬運中的飯算在途；紀事保留窗第一筆不漏 | 2acc64a | f302d05 | optimization-m37.done.json |
| M38 | （素材包）兩張立繪可離線解析、來源可核 | a21cc8a | 13986b6 | optimization-m38.done.json |
| M39 | 開局與人物卡看得到郭靖、令狐沖 | 252884b | 3b2b7a4 | optimization-m39.done.json |
| M40 | 新展示檔、兩段路線、相容收尾、本文件 | 578cf93 | e3fbfbd | optimization-m40.done.json |

## 驗收摘要

- 回歸：最終一次全套 291 項全過（`evidence/optimization/m40/regression.log`；各階段：M37 279、M38 284、M39 288）。完整回歸會重寫 M2、M7、M13、M23 的報告；M37 起也會改 M20、M30 報告各一個 tick（命令造成的離開提早 1 tick），M38 起 M29 報告會列出兩張新圖與新 digest——每次都已還原，差異存在 `m37/`、`m38/`。
- 正常 UI（1440×900、1280×800）：每階段的 `mXX-ui-accepted-*`；舊驅動重跑在 `*-m37-recheck-1440`、`*-m39-recheck-1440`（只留 summary）。
- M40 相容收尾（`m40-compat-ui-*`）：新展示檔壞校驗碼被拒、預覽取消、確認續玩、刷新保留；讀壞檔保留展開與紀事、讀好檔重來；M30、M36 與新展示檔各續玩 600 tick 無頁面錯誤；新途中檔帶命令截止，終止後沈禾只算到退出；令狐沖圖 404（標註 UI fixture）時開局與卡片回退、遊戲照常；內容包缺失沿 M30 存讀驅動（`m30-saves-ui-m40-recheck-1440`）。模型：新展示檔與途中檔存讀雙軌續跑相同。

## 必須知道的結果與限制

- 截止時點從「下一個 tick」改到「命令當下」，舊報告裡命令造成的離開 tick 會早 1；舊測試照過。step 內的離開（倒地、被擊退）仍在下一次 `jointTick` 偵測。
- 撿地面物資與收成搬運的在途只有模型與程式碼層面，沒有正常 UI；ring 壓力只有模型 fixture。M31 的舊 ring 測試仍是寬鬆斷言（保留作歷史），嚴格版在 M37。
- 立繪只有郭靖、令狐沖兩位開局主角；岳不群、小禾（正式立繪仍缺）、阿木、成熟作客的經典人物仍是文字回退；地圖人物與動作不變。開局對話框縮圖小，看清楚要進局展開。
- 近期紀事「全部」仍會被行走與演練出手事件擠滿（M28 既有呈現），路線讀個人紀事。
- 舊 M16 驅動在演練回顧逾時（M35 已記，開工前就存在）。

## 沒做的事

真人試玩與趣味判斷、獨立審查、手機版、整體存檔升版、場景／角色動畫重製、新地圖、新可玩經典人物、其他 12 張研究立繪、公版上游修改、M41 之後的任何工作。
