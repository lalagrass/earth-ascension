# #372 P2 收尾與 PUBLIC-ADOPT-GPT-01：逐項規格與紀錄

開工比較基線 `9d7f62d`（M44 交付）；來源 `codex/solo-sect-gpt@ce4def8`（加上原樣提交的提示詞）。規劃 GPT / Codex（`CLAUDE-372-P2-CLOSURE-PROMPT.md`），實作主筆 Claude Opus 5.5（Anthropic），單一作者。**執行環境：擁有人 Mac 本機（擁有人 2026-10-28 明示例外），不是 Cloud。** 認領：#372 issuecomment-6468542990。

分兩類：**擁有人本次追加的三項 P2**（A、B、C），以及 **PO 原批准的 #372 套用**（健康遮罩、兩個 renderer）。每項先寫規格與修前反例，修好、驗證、commit 後才做下一項。

## P2-A 掌門簿收起時仍能獨立開導覽

- 玩家問題：新局預設收起掌門簿；按「導覽」後 `aria-expanded=true`、`hidden=false`、標記都在，但面板 `display:none`、尺寸 0——舊規則 `.panel-hidden aside{display:none}` 把場景裡的 `<aside id="nav-panel">` 也一起藏了。打開掌門簿才看得到。
- 檔案：`style.css`（只限縮那條規則到 `main` 直屬的側欄 `aside`）。不改 renderer、不讓導覽偷開掌門簿。
- 出口（Mac 本機正常 UI，1440×900、1280×800）：新局掌門簿收起→開導覽，面板實際有尺寸且在畫面內；導覽開著時開／收掌門簿，導覽不受影響；導覽自己開收、Escape 與焦點返回；鏡頭框跟著 Canvas CSS 寬度（側欄開收時寬度不同）刷新；這些操作在暫停中前後 world／RNG／命令紀錄不變。

紀錄（P2-A）：`style.css` 的 `.panel-hidden aside{display:none}` 改成 `.panel-hidden>aside{display:none}`（只藏 `main` 直屬的掌門簿側欄）。

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 修前 | ce4def8 上，新局（掌門簿收起）按導覽：`aria-expanded=true`、`hidden=false`，但 `display:none`、0×0；收起掌門簿後又消失；Escape 因面板不可見無法把焦點留在面板內 | 372-p2a-ui-before-fix-at-ce4def8-1440 |
| 修後 | 1440×900、1280×800（Mac 本機）：掌門簿收起時導覽有尺寸且在畫面內；開／收掌門簿導覽都在；鏡頭框高度＝Canvas CSS 高×span／Canvas CSS 寬，側欄開收時隨之改變；導覽自己開收、Escape 收起並把焦點還給按鈕；暫停中 world 快照不變；無頁面錯誤 | 372-p2a-ui-accepted-1440／1280 |
| 受影響重跑 | M43、M35 正常 UI 驅動通過 | m43-ui-372-recheck-1440、m35-ui-372-recheck-1440 |

驅動第一版把「鏡頭框跟著 Canvas 寬」寫成比寬度；框寬永遠等於 span，正確的可觀察量是框高，已改正並以修前版本重跑存證。

## P2-B 舊退場檔：讀入後第一個命令之前就截止

- 玩家問題：M41 只在 `jointTick` 截止。缺 `closedAt`／`bodyAt` 的舊格式 exiting 檔讀入後保持暫停、直接試拳，`world.command` 先扣精力，命令末尾的 `jointCut` 才截止，新消耗又算進演練（規劃者以 M41 測試同款舊形 fixture 重現：讀入時 8521、不試拳對照回顧 1414、讀入後直接試拳 8321、回顧 1614）。
- 權威與時點：在**成功讀檔的邊界**（`save.decode` 驗證通過、回傳世界之前）呼叫同一個 `jointCut`。演練不在 assembling／running 而還沒有 `closedAt` 時，此刻記 `closedAt` 與在場者 `bodyAt`——這是讀檔後最早可證的截止點，任何命令、step、自主行為都在它之後。讀檔前的消耗（舊檔存檔前那段）仍無法分辨，不反推；讀檔後的新消耗則一律不算。新格式檔（已有 `closedAt`）不覆寫；進行中（running）的演練沒有人離開就不動。不加欄位、不升版；讀檔失敗（校驗碼、版本、驗證）照舊在這之前就拋錯，原世界不變。
- 不在命令開頭做：那樣被拒絕的命令也會改世界（違反「拒絕的命令沒有副作用」）。
- 出口（模型）：舊形 exiting 檔→不 step 直接 attack、直接工作、不下命令直接續跑，三者回顧都＝開打－讀入時精力；被拒絕與重複的命令不改世界；新 M41 途中檔 `closedAt` 不變；M37、M41 斷言照過；壞檔仍被拒。正常 UI（Mac 本機）：匯入舊形 exiting 檔（標註 fixture：由 M44 途中檔刪去兩欄並重算校驗碼）→暫停中直接試拳→回顧不含試拳。

紀錄（P2-B）：`save.mjs` 的 `decode` 在驗證通過、回傳之前呼叫 `jointCut(w)`；M41 測試「舊形 exiting 檔在讀入後第一個 tick 截止」的斷言改成「在讀入時截止」（標明 #372 P2-B）。

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 修前 | 4e8f05f：舊形檔讀入後不 step 直接試拳，回顧 1617、不試拳對照 1417；正常 UI（Mac 本機）同樣：讀入 8518、試拳 8318、回顧 1617 | 372-p2-closure/p2b-before-fix-at-4e8f05f.log、372-p2b-ui-before-fix-at-4e8f05f-1440 |
| 修後模型 | 直接試拳＝對照＝開打－讀入時精力（1417）；讀入後直接採木、不下命令續跑也只算到讀入；被拒絕的命令不改 drill／people／jointDrill／random／tick；同 id 重送不再執行；M44 新途中檔的 `closedAt`／`bodyAt` 不變；校驗碼壞的檔仍被拒；讀兩次、存讀一次 hash 相同 | 372-p2-closure/p2b-model.json |
| 修後正常 UI | 1440×900、1280×800：匯入舊形 exiting 檔（標註 fixture），讀入即有 `closedAt`；暫停中直接試拳（同 tick、精力下降）；回顧 1417 | 372-p2b-ui-accepted-1440／1280 |
| 回歸 | 312 項全過；M44 相容驅動（壞檔、預覽取消、續玩、刷新）重跑通過 | 372-p2-closure/regression-p2b.log、m44-compat-ui-372-p2b-recheck-1440 |

限制：舊檔存檔前那段的消耗無法和演練內的消耗分辨，截止只能落在讀入時。

## P2-C 召回近院中斷後續走，與返院完成同一判定

- 玩家問題：M44 的續走條件只涵蓋離回院點 >48 DU，但沒有 v2 旅程時的返院完成條件是 <20 DU；20–48 DU 之間被打斷（例如在那裡下合法的試拳，核心清掉路徑）就永久停住（規劃者重現：阿木停在 42.3148 DU、phase return、path 0、storyBusy true；不試拳的對照組已返院）。
- 修正：`expedition.mjs` return 階段抽出每人的「已到家」判定（與返院完成用的同一條：<20 DU，v2 旅程另有 <48 且回院點被人占著），續走條件改成「沒到家」；全隊返院仍是每人都到家。v2 旅程照舊走 M10 的規則與 `rerouted` 紀錄。不改尋路、半徑、速度或交手。
- 出口（模型）：正常命令序列（M44 展示檔、標註休養 fixture、單派阿木往溪谷、1300 tick 後召回、走到 20–48 DU 之間時下合法 `attack`）修前停住、修後返院、交貨與 storyBusy 解除；不試拳對照返院；邊界 fixture（標註：把停下的阿木放在他真走過的軌跡上、距回院點 19.9／20.1／47.9／48.1 DU，路徑清空）都會返院；M44 營地／溪谷召回、M7、M10 測試照過；中途存讀雙軌相同。

紀錄（P2-C）：`expedition.mjs` return 階段抽出 `atHome(p)`（<20 DU，v2 旅程另加「<48 且回院點被占」），續走條件由「>48 DU」改成 `!atHome(p)`，全隊返院也用同一個 `atHome`。只用於沒有 v2 旅程的遠征（v2 旅程照舊走 M10）。

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 修前 | 23e544b：單派阿木往溪谷、1300 tick 後召回，走到離回院點 43.9 DU 時下合法 `attack`，核心清掉路徑後 2000 tick 仍是 return；放在 47.1 DU（標註 fixture）也停住 | 372-p2-closure/p2c-before-fix.log |
| 修後 | 試拳後續走、返院、storyBusy 解除、離回院點 <20；不試拳對照也返院；他真走過軌跡上 19.93／21.53／47.11／48.71 DU 的點（標註 fixture：放到該點、清路徑）都在 30 tick 內返院；停住後存讀，兩邊續跑 1500 tick hash 相同 | 372-p2-closure/p2c-model.json |
| 受影響 | M7、M10（含 v2 旅程 `rerouted`）、M44 召回反例照過；完整回歸 316 項全過 | 372-p2-closure/regression-p2c.log |

邊界測試第一版取「最接近目標值」的軌跡點，20.1 實際拿到 19.93（仍在 20 內），改成取「剛在界內／剛在界外」最近的真實軌跡點；修前紀錄是用第一版跑的。這項沒有另跑正常 UI：路線 B 的正常 UI（M44）已驗召回返院；20–48 DU 內的打斷由模型以正常命令序列重現與驗證。

## #372 健康資訊遮罩（PO 原批准）

- 問題：揭露政策只公開掌門的五項 stats（`public-view.disclosed`）；但 `makePerson` 的生命上限＝80＋5×體魄，非掌門的精確 hp／maxHp 直接把隱藏的體魄反算出來。之前公開快照 `state.hp` 帶 rawValue／current／max，人物頁寫「生命 64/80」、血條寬度是精確比例，野外觀察卡、返院報告、畫布上的交手血條也有。
- 修正：新增 `src/health-view.mjs`：`hpDisclosed`（與 stats 揭露同條件：掌門）、`healthBand`（完好／輕傷 ≥80%／帶傷 ≥50%／重傷／倒地，80% 對齊演練門檻）、`healthView`（掌門精確，其他人分類與固定寬度）、`maskHealthText`（顯示時把「某人生命 a/b」換成分類，只要同名的人有任何一位未揭露就遮）。套用處：`public-view.personSnapshot`（非掌門 `state.hp` 改 hidden、不帶任何原值，另加 known 的 `state.health` 分類）、`ui.mjs` 情境卡生命列與血條（文字、`aria-label`、寬度都用分類）、野外／教習觀察卡、返院報告、舊紀事與需留意清單、`person-view` 的「剛返院」行、`event-feed` 結果文字、`render.mjs` 交手血條寬度。核心 hp／maxHp、傷害、治療、門檻、RNG、存檔都不改；體魄仍是 hidden。`render.mjs` 改了，`assets/manifest.json` 對它的 sha256 隨之更新（55728465… → df836dbc…）。
- 不改的：掌門照舊精確；傷勢 0–100、精力原值本來就公開，不在本項。

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 修前 | e78b98b 正常 UI（Mac 本機）：沈禾（傷 70）人物頁「生命 10/100」、血條 10%；阿木「100/100」；切頁、播放重繪後都還有精確數字 | 372-health-ui-before-fix-at-e78b98b-1440 |
| 模型 | 兩位隱藏體魄不同（2 與 7，生命上限 90 與 115，標註 fixture）的人放在同一分類（滿、九成、六成、三成）：快照與公開卡的 hp 欄位 hidden、無 rawValue／current／max／base／effective、不含 maxHp；兩人的健康欄位與 `healthView` 完全相同；掌門照舊精確；阿木傷勢 0 仍是 known 0；體魄 hidden；報告文字遮罩與掌門不遮；遮罩讀取 400 tick 不改 hash／RNG | 372-p2-closure/health-model.json |
| 正常 UI | 1440×900、1280×800：沈禾「健康 重傷」、血條 30%；阿木「健康 完好」100%；掌門「生命 100/100」；側欄所有文字、title、aria、data-*、style 都找不到精確 hp/maxHp；切武學頁再回來、播放 200 tick 後仍沒有；人物、遠征、紀事、建設頁都沒有 | 372-health-ui-accepted-1440／1280 |
| 回歸 | 321 項全過；M28、M33、M41、M43 正常 UI 驅動重跑通過 | 372-p2-closure/regression-health.log、*-372h-recheck-1440 |

限制：分類界線（80%、50%）本身仍給出比例範圍，不是消除所有推測；存檔、開發 fixture 與 `window.__game` 遙測仍是原始世界資料，不是公開卡，本包不動。
