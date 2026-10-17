# 貢獻 Earth Ascension

這份指南供 Grok bot、Claude、人類貢獻者與審核者共用。產品現況、啟動及基本測試見 [README](README.md)；M2 的具體 issue 分組和審核順序見[貢獻計畫](docs/m2/contribution-review-plan.md)。[M3 協作與可認領任務](docs/m3/contribution-plan.md)已將文件工作與受阻的實作分開；M3 尚未獲得實作授權。

## 開工前協調

1. 讀目標 issue 與最新 `dev`，確認問題在該版本可重現。Issue 的建議修法和新門檻先視為提案；涉及規則語義、存檔格式或產品取捨時，先在 issue 或 draft PR 列出選項與代價，等維護者決策後再定案。
2. 在 issue 留下**實際主筆身份**、預計處理的單一 PR 範圍、預計修改檔案、依賴與 base `dev` SHA，或開一個連到 issue 的 draft PR；確認沒有另一位主筆正在修改相同規則／資料契約後再動手。Grok bot 與 Claude 若使用同一 GitHub 帳號，assignee 不能區分實際主筆，PR 描述也須明寫身份。M2 #1／#8 是同一目標漏斗問題，#4／#9 有共同的計畫語義；避免重複修兩次。#10 的版本契約應先於改規則的 PR 討論。
3. 從最新 `dev` 建短分支，例如 `fix/issue-2-memory-retention`。每個 PR 指向 `dev` 並只處理一個可獨立驗收的改動；不要直接推 `dev`、改 `main`、force push 共享分支或部署。

M3 認領時先看[任務表與依賴](docs/m3/contribution-plan.md)：標為「可認領：文件」的工作只交研究、契約選項、驗收或畫面草圖；「受阻：不得實作」的項目須等 M2 前置驗收及維護者批准 M3 範圍。維護者可建立一個 M3 追蹤 issue 與獨立子 issue；issue 未建立或未確認認領，不代表表中姓名或代號已被指派。每個 issue 明列完成判準及哪些決策仍待維護者定案。

## 實作邊界

- 保留 M1 舊規則路徑與舊存檔；若改 M2 規則、schema 或 RNG，逐項交代版本、遷移、同 seed 重播及哪些 canonical hash 預期改變。未知版本不得默默當新版載入。
- 決策只能使用角色當時合理已知的資訊；新增事件須有來源與月份，不能為故事效果強迫成功。前端與 LLM 不能編造或修改世界事實；正式規則基線無付費模型呼叫。
- 同月競爭要檢查凍結快照、結算順序與身份交換；儲存改造要保留歷史來源及可回放性。不要以個別 seed 或單次速度代替分布。
- 既有 M2 P0 尚未完全驗收。不要因為測試綠燈就宣稱整個 milestone 完成，也不要把待校準的候選門檻改寫成事前已通過。

## 提交 PR 時附上

- 對應 issue、base `dev` SHA、問題的最小重現、採用的方案與捨棄方案。
- 改動檔案及影響的 [A1–A10 驗收](docs/m2/acceptance.md)；規則／schema／RNG、M1／M2 存檔與 canonical hash 的預期影響。
- 具體可重跑的測試命令與結果。基本檢查：`python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。這三項由 [CI](.github/workflows/test.yml) 在 Python 3.12／3.13／3.14 自動執行；`tests/test_golden.py` 鎖住固定 seed 的 canonical hash，若改動有意改變回放，PR 須說明原因並更新該檔常數。若改行為，提供固定 seed 配對、多 seed 結果及失敗 seed；若改 UI，附真實瀏覽器操作；若改儲存，附遷移及回放測試。
- 失敗條件、未解風險及需維護者決策的問題。大型原始輸出可連到可重跑腳本與摘要；是否將新大型資料納入 Git 先討論。

可用 [PR 模板](.github/pull_request_template.md)填寫。另一位貢獻者可複核，審核者逐項核對證據，回覆「可合併／須修改／等待產品決策」；作者更新後再審，最後由維護者決定是否合併。共用 GitHub 帳號下的自我留言不算平台上的獨立核准。PR 被合併後，下一個作者須基於新的 `dev` 重跑受影響的驗收。
