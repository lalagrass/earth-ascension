# Earth Ascension《靈氣紀元》v0.2 — M2 Living Characters

一個可以在本機瀏覽器操作的月度自主世界模擬。玩家配置人物的初始條件，之後人物依規則、性格、資源與世界狀態自行行動。無外部依賴、無 API key、無金流、無公開部署。

## 協作與貢獻

Grok bot、Claude 與其他貢獻者請先讀 [CONTRIBUTING.md](CONTRIBUTING.md)；AI 工具另讀 [AGENTS.md](AGENTS.md)，Claude 可從 [CLAUDE.md](CLAUDE.md) 進入同一套指引。從最新 `dev` 開短分支、以小型 PR 回到 `dev`；PO／Tech Lead 審核通過且證據齊全後可直接合併，`main` 僅在 milestone 驗收與發布決策後更新，詳見[合併規則](CONTRIBUTING.md#審核合併與發布權限)。M2 issue 的重複項、建議分工與審核順序見 [M2 貢獻計畫](docs/m2/contribution-review-plan.md)。Issue 的修法及數值門檻是待核對提案，PR 請附重現、版本／舊檔影響及對應驗收證據。[M3 協作任務表](docs/m3/contribution-plan.md)列出現在可認領的文件工作與受阻的實作；M3 尚未開工。

## 啟動

需要 Python 3.12 以上。在此目錄執行：

```sh
python3 -m earth_ascension.server --db world.sqlite3 --port 18765
```

瀏覽器開啟 <http://127.0.0.1:18765/>。關閉程式後再次使用相同 `--db` 路徑即可恢復。網頁只綁定 `127.0.0.1`。使用其他 port 可加 `--port`。

新資料庫使用 M2 0.2.0 規則；既有 M1 0.1.0 資料庫仍按原規則續玩。服務只在本機執行，不需要 LLM、網路連線或付費 API。

## M2 可操作內容

- 每人一個可追蹤的長期目標與四個月檢查的短計畫；完成目標保存在歷史，下一階段轉為穩定生活。
- 新人物選擇既有五類目標；只有從 M1 遷移的自訂目標保留原文與中性步驟。
- 研究發現、互動傳播的有限知識、有來源的關鍵記憶與定向信任關係。人物只在親自發現或交流後取得可修習基礎，最早下月用於決策。
- 社交及研究經歷可緩慢改變人格；決策 trace 保存當時目標、計畫、分數、波動、可行選項、記憶與結果事件。人物觀察頁可點選事件來源，跳往保存月份的歷史。
- 同月人物從共同凍結狀態決策；同區研究發現按獨立隨機流決勝，定向信任變化先合併再截斷。固定 seed、規則版本及每月 canonical state hash 支援同版重播。

## M1 仍可操作內容

- 世界總覽、人物創建、人物觀察、組織、世界編年史、生命歷程六個頁面。
- 100 名具名 NPC、五區、五組織；背景人口為固定統計數。最多三名玩家人物。
- 30／35／40 點能力測試模式；五項能力精確驗證；16 題原創情境題產生遊戲人格及價值偏好。
- 「推進一個月」執行完整規則模擬並原子保存。人物工作、學習、社交、休息、研究或試驗靈氣，承受資源或健康代價；死亡與發現有事件紀錄。
- 人物觀察頁顯示「為什麼他這樣做？」的目標、需求、已知資訊、行動基礎分數和結果。
- SQLite 月度快照、事件、固定 seed、規則版本及重複推進防護。歷史頁可讀取舊月份快照。

## 驗證

```sh
python3 -m unittest discover -s tests -v
```

M2 可重跑的多 seed 腳本是 `PYTHONPATH=. python3 artifacts/run_m2_experiments.py`，輸出見 [M2 實驗結果](artifacts/m2-experiments.md)。本機 HTTP 流程腳本為 `artifacts/run_m2_http_demo.py`，需另外啟動 port 18766 的全新服務。M1 的 `artifacts/run_demo.py`、`artifacts/12-month-example.md`、研究及回顧仍保留。

`artifacts/experiments.md` 收錄 20 個 seed 的人格偏好及 30／35／40 點測試，並有可重跑腳本。

`artifacts/ui-verification.md` 記錄 Chrome 實際操作與畫面截圖；原始完整需求保存在 `docs/PROJECT_GENESIS.md`，逐項摘要另見 `docs/PROJECT_GENESIS_SUMMARY.md`。

五項自動測試與瀏覽器驗證各自覆蓋的驗收條件見 `docs/acceptance-coverage.md`。

## M1 存檔遷移

原檔可繼續以 M1 規則開啟。若要在 M2 規則下續玩，明確建立**新檔**：

```sh
python3 -m earth_ascension.migrate old-m1.sqlite3 new-m2.sqlite3
python3 -m earth_ascension.server --db new-m2.sqlite3 --port 18765
```

遷移複製 SQLite，僅轉換最新快照；舊月份維持原版本可讀。原檔位元不變，目標檔若已存在則拒絕。舊版自訂目標保留原文、以中性步驟續行，玩家可在人物觀察頁明確重選；沒有可靠事件來源的舊記憶只作 `legacy_unstructured` 顯示。

## 範圍與限制

M2 仍是明確規則模擬；沒有 LLM、完整職涯與家庭系統、細緻經濟、動態背景人口或臨床人格量表。有限知識主要透過親自研究和一對一交流傳播。人物背景與初始人口是虛構參數，不宣稱代表真實台灣統計；規則結果不能推論真實社會。

產品假設、技術取捨、驗收門檻與尚待確認項目見 [M2 Living Characters 文件入口](docs/m2/README.md)。
