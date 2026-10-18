# 貢獻 Earth Ascension

這份指南供 Grok bot、Claude、人類貢獻者與審核者共用。產品現況、啟動及基本測試見 [README](README.md)；M2 的具體 issue 分組和審核順序見[貢獻計畫](docs/m2/contribution-review-plan.md)。[M3 協作與可認領任務](docs/m3/contribution-plan.md)已將文件工作與受阻的實作分開；M3 尚未獲得實作授權。

## 雙 PO 與共用合併佇列

專案擁有人於 2026-10-18 指定以下分工；[協調 issue #77](https://github.com/lalagrass/earth-ascension/issues/77)記錄本次指派，[共用佇列 #67](https://github.com/lalagrass/earth-ascension/issues/67)記錄目前交接。這是單一整合負責人的工作佇列，不代表啟用了 GitHub Merge Queue 功能。其他文件中既有「PO／Tech Lead 可合併」的描述，統一按本節交由共用 queue owner 執行。

| 角色 | 責任與權限 |
|---|---|
| Earth PO（Codex，本 PO 聊天） | 管理 Earth 的 issue、M2 驗收、M3 待決策；**兼任兩個專案共用合併佇列的唯一負責人**，安排整合並執行合格 PR 的 dev squash merge。 |
| Sect Chronicle 遊戲 PO（另一個 Astra 聊天） | 管理遊戲產品範圍、SG 任務、驗收與試玩；提交可審查的產品決策與 ready PR 給共用佇列，不直接執行 dev 合併。 |
| 作者與專用審查者 | 作者按單一 issue 交付；審查者檢查明確範圍並回報 head/base、證據及阻擋。共用帳號不冒充另一人的獨立 approval；審查通過後交 queue owner 整合。 |
| 專案擁有人 | 決定跨專案資源優先序、未批准玩法與數值、重大相容性選項、付費服務及 main 發布。既有批准照常有效，無需重問。 |

- 每個專案同時維持一個核心實作工作包；不碰相同契約的文件、唯讀量測及審查可平行。已認領任務不因本分工自動改派。
- Earth 與遊戲使用各自 worktree、短分支、測試資料、服務埠與存檔空間；檔案所有權見 [PARALLEL_HANDOFF](sect-chronicle/docs/PARALLEL_HANDOFF.md)。共用 CI、根目錄契約與依賴設定另開 issue，指定單一主筆。
- 兩位 PO 各自更新「已交付／下一交付／阻擋／需擁有人決策」；GitHub issue／PR 保存決策與驗證證據，聊天不是唯一紀錄。各自只指派所屬產品工作。
- 共用佇列依功能依賴、風險與同檔衝突排序，對一組 ready PR 逐份整合；每次 merge 後核對下一份的實際合併結果。另一 PO 需要插入高優先任務時，先在 #67 協調。

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

## 分層測試與成本

遵守 [分層測試政策](docs/testing-policy.md)：開發冒煙預設 3 個固定 seed，一般局部行為 PR 預設 5 個；高風險、正式分布／效能結論及原定實驗須在接受前完成完整樣本，發布前完成完整適用驗收。這不減少必要單測、golden 或 CI。文件變更不另跑世界 seed 實驗；證據復用與輸出摘要優先，不能縮小既有報告樣本或事後改門檻。

## 提交 PR 時附上

- 對應 issue、base `dev` SHA、問題的最小重現、採用的方案與捨棄方案。
- 改動檔案及影響的 [A1–A10 驗收](docs/m2/acceptance.md)；規則／schema／RNG、M1／M2 存檔與 canonical hash 的預期影響。
- 具體可重跑的測試命令與結果。基本檢查：`python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。這三項由 [CI](.github/workflows/test.yml) 在 Python 3.12／3.13／3.14 自動執行；另有 `game-test` 在 Node 22／24 執行 `node --test sect-chronicle/test/*.test.js`。SG-01 尚未合入且遊戲 `js/`、`test/` 都不存在時，CI 會明示 bootstrap 未交付，不宣稱遊戲測試通過；任一目錄出現後必須找到測試檔，缺測試或測試失敗即失敗。遊戲測試通過不代表其玩法驗收完成。`tests/test_golden.py` 鎖住固定 seed 的 canonical hash，若改動有意改變回放，PR 須說明原因並更新該檔常數。若改行為，提供固定 seed 配對、多 seed 結果及失敗 seed；若改 UI，附真實瀏覽器操作；若改儲存，附遷移及回放測試。
- 失敗條件、未解風險及需維護者決策的問題。大型原始輸出可連到可重跑腳本與摘要；是否將新大型資料納入 Git 先討論。

可用 [PR 模板](.github/pull_request_template.md)填寫。另一位貢獻者可複核；共用 GitHub 帳號下的自我留言不算平台上的獨立核准。審核結論為「可合併／須修改／等待產品決策」，附可重現證據；作者更新後按**新的 head** 重審。

## 審核、合併與發布權限

- **整合目標是 `dev`。** 作者分支或 draft PR 是討論與修正處，不另設一條長期共用的「待合併」分支。`main` 僅在整個 milestone 的驗收、已知風險與發布內容由專案擁有人確認後，另走發布 PR；日常貢獻者與審核者不得直接推 `main`。
- **各產品 PO／Tech Lead 準備審查，共用 queue owner 統一整合。** 先看依賴與同檔衝突，優先合併獨立 CI／驗收基礎，再合併已定契約的修復；相互依賴的 PR 依前置到後置排序。每次合併後重看其餘 PR 對最新 `dev` 的適用性。PR 綠燈不等於 M2／M3 milestone 通過。
- **可直接合併到 `dev` 的條件：** issue／認領與範圍清楚、非 draft、無未解阻擋意見或待定產品選項；審核者檢查完整 diff、實際 head、基底與合併結果；GitHub 顯示可合併；適用的 CI 通過，並依改動完成固定 seed、M1 回歸、遷移、多 seed 或瀏覽器驗證。文件 PR 須檢查連結、契約一致性與不夾帶程式。證據齊全時，由共用 queue owner（目前 Earth PO）代表維護流程以 **squash merge** 合入 `dev`，在 PR 留下判定與測試；合併時核對 head SHA，不用強制合併、跳過檢查或刪除作者分支。
- **先停下交由專案擁有人決策：** 新玩法或尚無事前規格的數值門檻、版本或舊檔語義改變而缺遷移選擇、M3 實作範圍、付費模型／外部服務、重大效能與資料風險，以及 `main` 發布。審核者先整理選項、代價與可執行證據；產品決策明確後才讓作者完成 PR。已寫入事前驗收的候選上限可作驗證防線，但仍標「待校準」，不能因此宣稱正式定值或 milestone 已驗收。
- **有阻擋就不合併。** CI 失敗、衝突、缺少最新合併結果的證據、缺少所需審核或未解阻擋意見，先修正並重新核對。若舊 PR 的 CI 尚未包含新加入的必要檢查，queue owner 安排更新分支或對當前合併結果重新執行，取得正確證據後才合併；不得把舊綠燈當成新 gate 通過。合併後確認遠端 `dev` SHA 與 CI；失敗時開修復或 revert PR，記錄原因，不以改寫共享歷史處理。

### 基底前進時如何復用審查

1. 每次整合記錄 PR head SHA、最新 dev SHA、實際合併 commit／tree 與 CI run。核對 merge ref 的父提交確實對應上述 head/base；GitHub API 的舊 base 欄位、過期 merge ref 或綠燈不能代替最新證據。
2. 比較自上次審查後的 head 差異、dev 差異及實際合併差異。若只有另一子專案的文件前進，受審程式、資料、規則與測試相同且無衝突，可以保留先前的瀏覽器、回放或多 seed 結論；在 PR 明列復用哪些證據及理由。
3. 作者分支未包含每一個最新 dev commit，本身不是內容阻擋。無須只為無關文件重複 merge dev 或重跑完整行為矩陣；但**當前合併結果的必要 CI／檢查仍須通過**。若無法證明 CI 覆蓋該結果，才安排同步／重跑。既有分支保護與必要審核一律保留，不使用 admin／force 繞過。
4. 同檔衝突、共用 API／資料／schema／RNG／依賴／測試工具變更或新 CI gate，須重新驗證受影響部分。新 head 仍須核對差異，但已確認不受影響的證據不需全部重做。queue owner 集中安排 ready PR 的同步時間，避免每次無關文件合併就要求所有作者更新。
5. 合併前再核對 head/base 未變，鎖定 head 執行 squash；若任一 SHA 前進，回到上述差異檢查。批次整合仍逐份合併、逐份記錄，不能一次跳過檢查。

PR 被合併後，下一位作者須基於新的 `dev` 重跑受影響的驗收。M3 目前僅可合併已認領的規劃文件；M3 程式仍受 [M3 進入條件](docs/m3/contribution-plan.md)阻擋。
