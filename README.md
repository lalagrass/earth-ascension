# Earth Ascension《靈氣紀元》v0.1 — M1

一個可以在本機瀏覽器操作的月度自主世界模擬。玩家配置人物的初始條件，之後人物依規則、性格、資源與世界狀態自行行動。無外部依賴、無 API key、無金流、無公開部署。

## 啟動

需要 Python 3.12 以上。在此目錄執行：

```sh
python3 -m earth_ascension.server --db world.sqlite3 --port 18765
```

瀏覽器開啟 <http://127.0.0.1:18765/>。關閉程式後再次使用相同 `--db` 路徑即可恢復。網頁只綁定 `127.0.0.1`。使用其他 port 可加 `--port`。

## M1 可操作內容

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

`artifacts/12-month-example.md` 記載透過實際 HTTP 服務建立人物並逐月操作 12 個月的結果。`artifacts/run_demo.py` 可在全新資料庫和 port 18765 的服務下重做。`docs/research.md` 記錄資料來源與授權；`docs/review-retro.md` 記錄交付檢查。

`artifacts/experiments.md` 收錄 20 個 seed 的人格偏好及 30／35／40 點測試，並有可重跑腳本。

`artifacts/ui-verification.md` 記錄 Chrome 實際操作與畫面截圖；原始完整需求保存在 `docs/PROJECT_GENESIS.md`，逐項摘要另見 `docs/PROJECT_GENESIS_SUMMARY.md`。

五項自動測試與瀏覽器驗證各自覆蓋的驗收條件見 `docs/acceptance-coverage.md`。

## 範圍與限制

M1 使用簡化效用規則；尚無 LLM、跨人物知識傳播、完整職涯與家庭系統、細緻經濟、動態背景人口或臨床人格量表。人物背景與初始人口是虛構參數，不宣稱代表真實台灣統計。規則模型與歷史事件可觀察，但尚不能推論真實社會結果。
