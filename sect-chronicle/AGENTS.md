# Coding agent 接手入口

先讀根目錄 [AGENTS.md](../AGENTS.md)、[CONTRIBUTING.md](../CONTRIBUTING.md) 與本資料夾 [README](README.md)。此處補充獨立遊戲契約，不覆蓋根目錄規則。

## 目前可以做什麼

專案擁有人已於 2026-10-18 在本對話批准 D1–D5 與 14 天切片 SG-01～SG-12，見 [批准紀錄](docs/DECISIONS_AND_SOURCES.md)。不得再次把這些任務標成「等待產品批准」。實際任務尚未認領；開始前完成 issue／主筆／base dev SHA 登記及依賴檢查。SG-13 真人試玩需後續安排，SG-14～17 與發布仍未授權。

- 實際主筆、issue、base dev SHA、修改檔案、依賴與驗收證據必須寫入 PR，採根目錄 PR 模板。
- 新程式限制於 `sect-chronicle/`。不要改 `earth_ascension/`、`guwu-game/`、`sect_ascension/`，不要將原型檔案整批搬入。
- 若來源檔不在你的 checkout，先讀 [來源紀錄](docs/DECISIONS_AND_SOURCES.md)；缺少的原型不是可以自行編造的實作。本次批准包含依新契約獨立實作，不必因原型未入庫重問授權；若需要移植原型程式，核對唯讀來源快照。
- 統一 JavaScript 純引擎與單一時段結算。不得同時啟動 Python tick 引擎或另一套月／週制引擎。
- UI 只能送指令與顯示引擎結果；動畫、預覽、倍率不能消耗 RNG 或修改世界。
- 不得把候選數值、範例 JSON、期望測試結果寫成已實測結果。不得事後改門檻讓報告變綠。
- 不自動呼叫其他 coding agent；若維護者安排多 agent，按任務檔案邊界分工，同檔採串行整合。

## 第一個接手工作包

1. 讀 README 與 [雙 agent 接手計畫](docs/PARALLEL_HANDOFF.md)，核對已批准的 14 天範圍。
2. 先讀 SG-00 #69 的最新完成紀錄，已完成的文件合併與工作區交接不要重做；核對最新 dev 並登記自己的 SG-01 issue／主筆；不是重新詢問 D1–D5。
3. 遊戲 agent 在獨立 worktree 從 SG-01 開始；Earth agent 留在自己的 checkout 做原本已認領任務。Gemini 本輪不參與，SG 任務沒有對 Gemini 的依賴。
4. 每任務獨立小 PR，前置合併後才開始依賴任務；不搶改另一位 agent 的檔案。

## 每個 PR 的回報

- 任務／issue、主筆身份、base SHA、修改檔案。
- 改前問題 → 改後行為；採用與捨棄方案。
- ruleVersion、schemaVersion、rngVersion 與舊檔影響。
- 實際命令、結果、失敗 seed、瀏覽器／遷移證據。
- 完成與未完成判準；不可只報測試數量。
- 下一個可認領任務、依賴與需產品判定的地方。

## 檢查

文件階段：相對連結、任務依賴、狀態與數值來源、`git diff --check`。程式階段另跑新增的 Node 測試與相關瀏覽器驗證，以及根目錄要求的 `python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。原型回歸可用 `node --test guwu-game/test/*.test.js`（Node 24 下不要使用目錄作為測試參數）。新增未追蹤文件仍需額外掃描空白，因為 git diff 不涵蓋它們。
