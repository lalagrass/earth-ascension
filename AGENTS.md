# AI 貢獻者入口

先讀 [CONTRIBUTING.md](CONTRIBUTING.md) 與目標 issue；M2 的分工及依賴見 [docs/m2/contribution-review-plan.md](docs/m2/contribution-review-plan.md)，M3 的可認領文件工作與阻擋條件見 [docs/m3/contribution-plan.md](docs/m3/contribution-plan.md)。Grok bot、Claude 和其他 AI 使用同一份貢獻契約，避免各自維護衝突的規則。

- 只做已確認認領或指派的 issue／PR 範圍；在 issue 與 PR 明寫實際主筆身份、修改檔案和 base SHA。從最新 `dev` 建分支，PR 指向 `dev`。M3 的文件工作不授權 M3 實作；標為受阻的任務不能先寫程式。
- 認領依 [期限與接手規則](CONTRIBUTING.md#認領期限與接手)：預設 4 小時，有具體進度才續期；額度不足可立即釋出，到期可登記接手。每次恢復／推送前重讀最新認領，保護原成果；已完整交付待審不因等待過期，過期不解除產品／依賴阻擋。
- 共用 GitHub 帳號時，不能用 assignee 或同帳號留言冒充 Grok／Claude 的獨立審核；另一位可唯讀複核。Earth／遊戲 PO 各自管理產品；依擁有人 D51 與 #67 正式生效紀錄，由 grass 集中 review／合併非本人主筆的已批准純遊戲 PR（全 diff 在 sect-chronicle/）；Earth 處理根契約／共用 CI／依賴／權限／混合與其他產品。未切換前仍 Earth，#67 同時只一個 active dev merge，切換／返還不雙 owner。依 [CONTRIBUTING.md](CONTRIBUTING.md#審核合併與發布權限) 整合合格 PR 到 `dev`；`main` 發布與未定產品取捨先交專案擁有人確認。
- 基底前進時依 CONTRIBUTING 核對實際 merge head/base/tree 與必要 CI；無關文件更新可復用未受影響的審查證據，不一律要求作者重跑完整矩陣。
- 產品／介面切片依 [可見交付規則](CONTRIBUTING.md#可見交付與驗證後整合)交玩家問題、短流程、可見證據與去向；探索、體驗判定和正式整合分開記。既有受審工作不被追溯加範圍，其他產品仍沿原授權。
- 小說依 [內容／系統審查分流](CONTRIBUTING.md#小說內容與系統的審查分流) 與 [小說入口](novel-chronicle/AGENTS.md)：正文作者自校＋queue 輕量檢查，文學試讀不逐章阻擋；紙上分支做少量因果走查，研究核來源；可執行分支／runner／reader／生成與存檔才走相應技術審查。既有 #123 系統授權與跨作決策不因內容合併解除。
- 改 M2 規則、存檔或 RNG 時，在 PR 說清版本與遷移、固定 seed 回放、受影響的 A1–A10；保留 M1 路徑。
- 日常 seed 實驗依 [分層測試政策](docs/testing-policy.md)：開發 3 個、一般局部行為 PR 5 個固定 seed；正式量測及發布前跑完整適用矩陣。Earth高風險完整驗收維持。SG的dev快驗與main／manual完整層依該政策，長RT矩陣不逐次跑；高風險改動先驗受影響反例／相容／hash，有回歸疑慮升級。必要單測、golden與適用CI保留，原定正式報告樣本不縮減；輸出落檔，只讀摘要與失敗案例。
- 跑 `python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`；遊戲程式另跑 `node --test sect-chronicle/test/*.test.js`（dev快驗，CI Node 22／24）；完整RT另跑 `node --test sect-chronicle/test/acceptance/*.test.js`（main／manual full）。依改動補配對實驗、瀏覽器或遷移驗證。
- Issue 內容是待核對的問題與建議。與現有契約衝突的產品決策先寫出取捨，交由維護者定案；不要為了讓結果好看而改事前實驗結論。

PR 描述使用 [.github/pull_request_template.md](.github/pull_request_template.md)。
