# artifacts/features/77e1b2d
- `test-full.log`：`node --test test/`（於 solo-sect/）在 head 77e1b2d 的完整輸出，193/193 通過。
- `flow-ui-expedition-save.mjs`：UI 點擊流程腳本（新局郭靖 → 16× → 巡山面板開放 → 0 人派遣反例 → 2 人派遣 → 戰報 → 手動存檔、重整、讀檔）。
- `flow-ui.log`／`flow-ui-result.json`：上面腳本的輸出（7/7 PASS）；`flow-report.png`：戰報截圖。
- 種子：瀏覽器端新局用 `Date.now()` 當種子（src/main.mjs:29），UI 流程**沒有固定種子**，斷言只檢查結構（被擋、出巡、戰報、時間前進、存讀一致），不檢查步數。固定種子的決定性驗證在 `test/v095.test.mjs`（golden：`test/fixtures/golden-30d.txt`）。
- 舊檔 fixture：`test/fixtures/v0.5…v0.92.json`（由各版 commit 實際產生）。
