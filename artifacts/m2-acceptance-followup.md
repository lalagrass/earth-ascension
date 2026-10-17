# #12 A4／A6／A8 驗收補測（2026-10-17）

基底 `dev`：`f967158e7e93b314c04e5059528c5ca5a73df7cd`。只測既有 M2 0.2.0 規則；所有瀏覽器資料庫在 `/tmp`，無付費呼叫。這份補測不重定事前門檻，也不代表 M2 P0 全項通過。先前完整資料見[驗收缺口](m2-acceptance-gaps.md)、[UI 紀錄](m2-ui-verification.md)與[事前規格](../docs/m2/acceptance.md)。

## A4：分母與 Grok 量測邊界

原候選比較是 B（完整規則）相對 C（去計畫加分）的「連續至少四月同動作、各月無生計／技能／目標進度收益且未重規劃」率下降 ≥25%。為可重算，需分別列出：各組符合四月觀察條件的窗口數 `W`、無收益窗口數 `N`、率 `N/W`，以及每 seed 的配對值；死亡、切換動作、重規劃與不足四月的窗口如何處理都應固定。`W=0` 時該組率無定義；即使 `W>0`，若 C 的率為 0，相對降幅 `(rate_C-rate_B)/rate_C` 仍無定義。既有報告的 180,000 人月是總決策數，**不是已列明的四月窗口分母**；已知 B、C 的 `N` 均為 0，不能推導出「≥25% 已過」。`rate_B <= rate_C` 的非增條件與相對降幅也要分開判定。

Grok bot 的 [PR #25](https://github.com/lalagrass/earth-ascension/pull/25)已於審核後合入 `dev`（`12a809a`）：獨立重跑 60 個 B／C 最終 hash 斷言與完整生成表格一致，提供目標分布／延續的診斷證據，但**不是**原 25% 指標的替代通過線。本 PR 不重做其 30 seed 漏斗；原四月窗口分母與無定義候選線仍須由產品方處置。第 60 月 92–99／100 人集中於「穩定生活」的既有風險仍成立。

## A6：受控身份交換與知情時序

先唯讀重跑[原雙人研究競逐](run_m2_fairness_swap.py)的 30 筆原始 seed，正向與 ID 交換後結果逐筆等於[已存資料](m2-fairness-swap-raw.json)：30／30 一致，邏輯角色 A 獲得發現 15／30（seed 97–709）。沒有重寫原始 JSON。

新增[三人社交 probe](run_m2_fairness_multi.py)；從 seed 0 起掃描，僅依**同月三人都選社交**的決策條件取前 30 筆（seed 0–35，完整 seed 清單由腳本輸出），不按分享是否成功篩選。A、B、C 具相同能力、人格、資源及地區，預置 A→B、B→C、C→A 的定向信任；只讓 A 於月 0 知道 `practice_basis`。測試按邏輯身份鍵控抽樣，逐 seed 跑六種實體 ID 配置、兩個月，共 180 條受控路徑。這是刻意建的機制 fixture，不是自然人口樣本。

- 六種配置下，邏輯角色的同月行動、社交對象、基礎分數、選擇波動、行動結果、目標邊信任、當月結算後知識及下月決策前知識 **30／30 一致**。
- 30 筆中 A→B 分享成功 28 次；每次 B 的月 1 決策仍記錄不知情，月 2 決策的知情值與月 1 結算後相同。C 在月 1 結算後與月 2 決策前均未從 B 的同月互動憑空取得知識（30／30）。成功分享的來源事件確實鏈到 A 的發現。
- 這支持三人循環互動的公平與一月傳遞邊界，並補足原雙人競逐以外的機制證據；不能外推到所有多人拓樸、完整 100 NPC 自然世界或未測的資源衝突。原 35–65% 勝率仍是**待校準**候選，15／30 只是受控兩人條件樣本。

重跑：`PYTHONPATH=. python3 artifacts/run_m2_fairness_multi.py`。腳本只列摘要、不改遊戲或原始資料；任一配置不同、同月知識外洩或來源斷鏈即失敗。

## A8：Chrome 155 增量與現有 PR 審核

以隔離的 headless Chrome 155、實際 `earth_ascension.server`、暫存 SQLite 操作基底 `dev`。全新 M2 seed 2026 經頁面按鈕逐月推至第 60 月，觀察人物 1：頁面顯示探索 76%→77%、+1 個百分點及來源 `m2:39:4169`；點來源後進入第 39 月歷史且事件存在。保存第 60 月 hash 為 `89fbae5cd0fdf51fc07d996583787f681d98a2112cbb4b5d600b6741613a2867`，與快照 SHA-256 相同。[人格與來源截圖](m2-ui/a8-post16-drift.png)是 #5 UI 合併後新增的證據。

在這輪補測途中，[PR #27](https://github.com/lalagrass/earth-ascension/pull/27)認領已故標籤，[PR #28](https://github.com/lalagrass/earth-ascension/pull/28)認領遷移目標的 Chrome 流程；因此這兩項改為**獨立核對現有 PR**，不在本 PR 重複存截圖或修改他們的檔案：

- 基底 `dev` 的暫存高齡 fixture 經真正月結算死亡，人物 1 第 1 月 `alive=false`、死亡事件 `m2:1:0`，頁面仍同時顯示「已故」與 `active`／下次檢查，重現 #27 處理的舊問題。基底保存 hash `358acb61c2210f826a736c56aa594f6f29c4738baf1779cffaca251ee4a9c4f4`。高齡只在測試檔，不代表自然死亡率。審 #27 head `4a59a226` 另發現遷移的 M1 死亡事件只有 `subject`、沒有 `actor`，新來源查找會誤報缺失；已[請作者修正](https://github.com/lalagrass/earth-ascension/pull/27#issuecomment-6231642189)，不宣稱 #27 通過。
- 真實 M1 seed 23 暫存檔創建自訂目標玩家 101，推進至月 1，再複製遷移為 M2。Chrome 開觀察頁，用下拉與確認按鈕重選「探索靈氣」後，新步驟顯示正確，舊原文仍在 `goal_history`，事件 `m2:1:110` 可點。M1 來源 SHA-256 `58c9a2dc4c0b72e37de4d43905bb3949405bc937d77f910caf30b268a4d5f3ef` 不變；M2 第 1 月 hash `3a26f2b7da32fac6835baa156fb770f47ec3e1026aa53534fd5a69178ab26012` 與保存 state 相同。這與 #28 的結果方向一致，但其 head `c3e24823` 用內部 `selected=101; render()`／`load(0)` 代替點選人物與歷史月，已[請作者改成真實 UI 操作](https://github.com/lalagrass/earth-ascension/pull/28#issuecomment-6231645102)；本 PR 不替代 #28。

這是前次[Chrome 完整路徑](m2-ui-verification.md)之後的增量；M1 六頁及 M2 建人 12 月不在此重複聲稱。已故目標標籤是 [#12](https://github.com/lalagrass/earth-ascension/issues/12) 的已知問題，不建重複 issue。

另以同一暫存遷移檔在重選後執行 `Store.advance(1)`：玩家人物 101 的 `months_lived` 從 1 到 2，該月行動為「研究」、決策引用月 1 快照；月 1 原有 101 位在世人物，月 2 留有 101 筆從月 1 狀態做出的決策。這證明投入的玩家人物與 NPC 一同參與月結算，並不代表已讀取任何使用者正式存檔。

本分支另跑 `python3 -m unittest discover -s tests -v`（28／28 通過）、`node --check earth_ascension/static/m2.js`、`git diff --check`；既有雙人競逐 30 筆正反向結果逐筆重算一致。此 PR 的 diff 僅含驗收腳本、單份 Markdown 與一張人格來源截圖，無規則、schema、RNG 或正式資料檔變更。

## 交接給 Dot／貢獻者

- **Dot 可接下一輪驗收與問題歸因**：每個合併的 M2 修復 PR 後，在最新 `dev` 重跑受影響的固定 seed／舊檔與 Chrome 關鍵路徑；先審 #27／#28 的實際 head，再追蹤 #2、#8、#9 後的記憶來源、目標歷史、計畫與決策原因是否相符。每件發現附 base SHA、fixture、實際與預期、快照 event ID／hash、截圖及重現命令。
- **Grok／Claude 開 issue 的準則**：先查是否已由 #12 或既有 issue 涵蓋；只有新的、可重現的失敗另開小 issue。A6 本輪未見失敗；遷移重選與人格來源點擊通過，無需為通過案例開 bug。A4 漏斗與原 0／0 判定分開討論，不自行定新通過線。
- **待依賴**：#2 的滿額記憶逐出修正與長期效期設計要分別審；#8／#9 可能改目標行為，須重新鎖定版本、重跑 A1–A4 與 A7；M3 仍只做規劃。這些未解項不因本報告而視為驗收通過。
